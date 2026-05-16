// src/components/pesaje/ModalPesajeCocido.jsx
// Modal de Pesaje Cocido — Cocina PAE
// Decisión 16-may-2026
//
// Flujo:
// 1. Busca los pesajes crudos de hoy (movimientos_inventario con origen='consumo_operacion')
// 2. Por cada ingrediente sugiere: peso_crudo × factor_rendimiento = peso_cocido_sugerido
// 3. Doña Elba puede pesar REAL o aceptar la sugerencia (asume)
// 4. Al aprobar: inserta N filas en pesajes_cocido (1 por ingrediente)
//    fue_pesado_real = true si pesó, false si asumió

import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function ModalPesajeCocido({ 
  empresaId, 
  usuario, 
  onCerrar, 
  onAprobado 
}) {
  const [ingredientes, setIngredientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)
  const [notasGenerales, setNotasGenerales] = useState('')

  // ─── Cargar pesajes crudos de hoy ──────────────────────────
  useEffect(() => {
    cargarPesajesCrudo()
  }, [])

  async function cargarPesajesCrudo() {
    try {
      setCargando(true)
      setError(null)

      const fechaHoy = new Date().toISOString().split('T')[0]

      // 1. Buscar todos los movimientos de hoy (crudo)
      const { data: movimientos, error: errMov } = await supabase
        .from('movimientos_inventario')
        .select(`
          id,
          ingrediente_id,
          cantidad,
          unidad,
          ingredientes (
            id,
            nombre,
            categoria,
            factor_rendimiento
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('fecha', fechaHoy)
        .eq('origen', 'consumo_operacion')
        .order('created_at', { ascending: true })

      if (errMov) throw errMov
      if (!movimientos || movimientos.length === 0) {
        throw new Error('No hay pesajes crudos registrados hoy. Primero pesa los ingredientes crudos.')
      }

      // 2. Construir lista de ingredientes con sugerencias
      const lista = movimientos.map(mov => {
        const ing = mov.ingredientes
        const pesoCrudo = Number(mov.cantidad)
        const factor = Number(ing.factor_rendimiento || 1)
        const sugerencia = pesoCrudo * factor

        return {
          ingrediente_id: ing.id,
          nombre: ing.nombre,
          categoria: ing.categoria,
          unidad: mov.unidad,
          peso_crudo: pesoCrudo,
          factor_rendimiento: factor,
          peso_cocido_sugerido: sugerencia,
          peso_cocido_real: sugerencia, // editable, default = sugerencia
          fue_pesado_real: false, // se marca true si Doña Elba lo edita
          notas: ''
        }
      })

      setIngredientes(lista)
    } catch (err) {
      console.error('Error cargando pesajes crudos:', err)
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function editarCantidad(ingrediente_id, valorNuevo) {
    const valor = parseFloat(valorNuevo) || 0
    setIngredientes(prev => prev.map(ing => 
      ing.ingrediente_id === ingrediente_id
        ? { 
            ...ing, 
            peso_cocido_real: valor,
            // Si cambió respecto a la sugerencia, marcar como pesado_real
            fue_pesado_real: Math.abs(valor - ing.peso_cocido_sugerido) > 0.001
          }
        : ing
    ))
  }

  function aceptarSugerencia(ingrediente_id) {
    // Marcar explícitamente que esta sugerencia se asumió (no se pesó)
    setIngredientes(prev => prev.map(ing => 
      ing.ingrediente_id === ingrediente_id
        ? { ...ing, peso_cocido_real: ing.peso_cocido_sugerido, fue_pesado_real: false }
        : ing
    ))
  }

  // ─── Aprobar pesaje cocido ──────────────────────────────────
  async function aprobarPesajeCocido() {
    if (ingredientes.length === 0) {
      alert('No hay ingredientes para registrar')
      return
    }

    const pesadosReales = ingredientes.filter(i => i.fue_pesado_real).length
    const asumidos = ingredientes.length - pesadosReales

    const confirmar = window.confirm(
      `¿Confirmas el pesaje cocido?\n\n` +
      `🍲 ${pesadosReales} ingrediente(s) pesados de verdad\n` +
      `🤖 ${asumidos} ingrediente(s) asumidos por el sistema\n\n` +
      `Esto se usa para alimentar la inteligencia.`
    )
    if (!confirmar) return

    setProcesando(true)
    setError(null)

    try {
      const fechaHoy = new Date().toISOString().split('T')[0]

      const registros = ingredientes.map(ing => ({
        empresa_id: empresaId,
        fecha: fechaHoy,
        ingrediente_id: ing.ingrediente_id,
        peso_crudo_lb: ing.peso_crudo,
        peso_cocido_sugerido: ing.peso_cocido_sugerido,
        peso_cocido_real: ing.peso_cocido_real,
        factor_aplicado: ing.factor_rendimiento,
        fue_pesado_real: ing.fue_pesado_real,
        notas: ing.notas || (notasGenerales ? notasGenerales : null),
        created_by: usuario.id
      }))

      const { error: errInsert } = await supabase
        .from('pesajes_cocido')
        .insert(registros)

      if (errInsert) throw errInsert

      alert(`✅ Pesaje cocido aprobado\n\n${ingredientes.length} ingredientes registrados\n${pesadosReales} pesados, ${asumidos} asumidos`)
      if (onAprobado) onAprobado()
    } catch (err) {
      console.error('Error aprobando pesaje cocido:', err)
      setError(err.message)
    } finally {
      setProcesando(false)
    }
  }

  // ─── Cálculos en vivo ────────────────────────────────────────
  const totalCrudo = ingredientes.reduce((sum, ing) => sum + ing.peso_crudo, 0)
  const totalCocido = ingredientes.reduce((sum, ing) => sum + ing.peso_cocido_real, 0)
  const pesadosReales = ingredientes.filter(i => i.fue_pesado_real).length
  const asumidos = ingredientes.length - pesadosReales

  // ─── Render: Loading ─────────────────────────────────────────
  if (cargando) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4 animate-pulse">🍲</div>
          <p className="text-gray-700 font-medium">Cargando pesajes crudos...</p>
        </div>
      </div>
    )
  }

  // ─── Render: Error ───────────────────────────────────────────
  if (error && ingredientes.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-red-700 mb-2">❌ Error</h3>
          <p className="text-gray-700 mb-4">{error}</p>
          <button onClick={onCerrar} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold px-4 py-2 rounded-lg">
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  // ─── Render: Modal completo ──────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-t-2xl p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-rose-100 text-xs font-semibold tracking-wider">PESAJE COCIDO</p>
              <h2 className="text-2xl font-bold mt-1 flex items-center gap-2">
                <span className="text-3xl">🍲</span>
                Después de cocinar
              </h2>
              <p className="text-rose-50 text-sm mt-1">
                Pesa cada ingrediente cocinado o acepta la sugerencia del sistema
              </p>
            </div>
            <button
              onClick={onCerrar}
              disabled={procesando}
              className="text-white/80 hover:text-white text-2xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Nota informativa */}
        <div className="bg-blue-50 border-b border-blue-200 p-4">
          <p className="text-xs font-semibold text-blue-800 uppercase mb-1">💡 Cómo funciona</p>
          <p className="text-sm text-gray-700">
            El sistema sugiere el peso cocido usando el factor de rendimiento de cada ingrediente. 
            Si pesas de verdad → mejor inteligencia futura. Si aceptas la sugerencia → el sistema asume.
          </p>
        </div>

        {/* Lista de ingredientes */}
        <div className="p-6">
          <p className="text-xs font-bold text-gray-700 uppercase mb-4">
            🥘 Ingredientes pesados crudos ({ingredientes.length})
          </p>
          
          <div className="space-y-2">
            {ingredientes.map((ing) => (
              <div
                key={ing.ingrediente_id}
                className={`border-2 rounded-xl p-3 ${
                  ing.fue_pesado_real
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  {/* Nombre y categoría */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{ing.nombre}</p>
                    <p className="text-xs text-gray-500">{ing.categoria}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Crudo: <strong>{ing.peso_crudo.toFixed(3)} {ing.unidad}</strong>
                      <span className="text-gray-400"> · Factor: ×{ing.factor_rendimiento.toFixed(2)}</span>
                    </p>
                  </div>

                  {/* Sugerencia visual */}
                  <div className="text-right text-xs">
                    <p className="text-gray-500">Sugerencia</p>
                    <p className="font-bold text-gray-700">
                      {ing.peso_cocido_sugerido.toFixed(3)} {ing.unidad}
                    </p>
                  </div>

                  {/* Input editable */}
                  <div className="flex flex-col items-end">
                    <input
                      type="number"
                      min="0"
                      step="0.001"
                      value={ing.peso_cocido_real}
                      onChange={(e) => editarCantidad(ing.ingrediente_id, e.target.value)}
                      disabled={procesando}
                      className={`w-24 px-2 py-1.5 border-2 rounded-lg text-right font-bold ${
                        ing.fue_pesado_real
                          ? 'border-emerald-400 text-emerald-900'
                          : 'border-gray-300'
                      }`}
                    />
                    <span className="text-xs text-gray-500 mt-0.5">{ing.unidad}</span>
                    {ing.fue_pesado_real ? (
                      <span className="text-xs text-emerald-700 font-semibold mt-1">
                        ✓ Pesado real
                      </span>
                    ) : (
                      <button
                        onClick={() => aceptarSugerencia(ing.ingrediente_id)}
                        className="text-xs text-gray-500 mt-1 italic"
                      >
                        Sugerencia asumida
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Notas del pesaje */}
        <div className="px-6 pb-4">
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
            Notas del pesaje cocido (opcional)
          </label>
          <input
            type="text"
            value={notasGenerales}
            onChange={(e) => setNotasGenerales(e.target.value)}
            placeholder="Ej: La carne rindió más de lo esperado..."
            disabled={procesando}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Footer: resumen + botones */}
        <div className="bg-gray-50 rounded-b-2xl p-6 border-t border-gray-200">
          
          {/* Resumen */}
          <div className="grid grid-cols-4 gap-3 mb-4 text-center">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Total crudo</p>
              <p className="text-lg font-bold text-orange-700">
                {totalCrudo.toFixed(1)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Total cocido</p>
              <p className="text-lg font-bold text-rose-700">
                {totalCocido.toFixed(1)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-200">
              <p className="text-xs text-gray-500">✓ Pesados</p>
              <p className="text-lg font-bold text-emerald-700">{pesadosReales}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">🤖 Asumidos</p>
              <p className="text-lg font-bold text-gray-700">{asumidos}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">❌ {error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              disabled={procesando}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={aprobarPesajeCocido}
              disabled={procesando}
              className="flex-1 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg disabled:opacity-50"
            >
              {procesando ? 'Guardando pesaje cocido...' : '✅ Aprobar pesaje cocido'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}