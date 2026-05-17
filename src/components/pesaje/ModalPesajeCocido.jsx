// src/components/pesaje/ModalPesajeCocido.jsx
// Modal de Pesaje COCIDO — Cocina PAE
// Refactor 16-may-2026: ahora trabaja con COMPONENTES (platos), no ingredientes individuales

import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function ModalPesajeCocido({ 
  empresaId, 
  usuario, 
  onCerrar, 
  onAprobado 
}) {
  const [componentes, setComponentes] = useState([])
  const [recetaInfo, setRecetaInfo] = useState(null)
  const [racionesHoy, setRacionesHoy] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)
  const [notasGenerales, setNotasGenerales] = useState('')

  useEffect(() => {
    cargarDatos()
  }, [])

  async function cargarDatos() {
    try {
      setCargando(true)
      setError(null)

      const fechaHoy = new Date().toISOString().split('T')[0]

      // 1. Calcular raciones totales del día
      const { data: operaciones, error: errOps } = await supabase
        .from('operaciones_dia')
        .select('raciones_planificadas, estado')
        .eq('empresa_id', empresaId)
        .eq('fecha', fechaHoy)

      if (errOps) throw errOps
      
      const totalRaciones = (operaciones || [])
        .filter(op => op.estado !== 'sin_clase')
        .reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)

      if (totalRaciones === 0) {
        throw new Error('No hay raciones planificadas hoy. Inicia primero las escuelas.')
      }

      setRacionesHoy(totalRaciones)

      // 2. Detectar receta del día por el día de la semana
      const diasSemana = ['domingo','lunes','martes','miercoles','jueves','viernes','sabado']
      const diaSemanaHoy = diasSemana[new Date().getDay()]

      let receta = null
      
      const { data: recetaData } = await supabase
        .from('recetas')
        .select('id, nombre, dia_semana')
        .eq('empresa_id', empresaId)
        .eq('dia_semana', diaSemanaHoy)
        .eq('activa', true)
        .maybeSingle()

      if (recetaData) {
        receta = recetaData
      } else {
        // Fallback: cualquier receta activa
        const { data: cualquierReceta } = await supabase
          .from('recetas')
          .select('id, nombre, dia_semana')
          .eq('empresa_id', empresaId)
          .eq('activa', true)
          .limit(1)
          .maybeSingle()
        if (cualquierReceta) receta = cualquierReceta
      }

      if (!receta) {
        throw new Error('No se encontró ninguna receta activa para esta empresa.')
      }

      setRecetaInfo(receta)

      // 3. Cargar componentes de la receta con sus ingredientes
      const { data: componentesData, error: errComp } = await supabase
        .from('componentes_receta')
        .select(`
          id,
          nombre,
          emoji,
          orden,
          unidad,
          factor_ajuste,
          componentes_ingredientes (
            ingrediente_id,
            ingredientes (
              id,
              nombre,
              factor_rendimiento
            )
          )
        `)
        .eq('receta_id', receta.id)
        .order('orden', { ascending: true })

      if (errComp) throw errComp
      if (!componentesData || componentesData.length === 0) {
        throw new Error(`La receta "${receta.nombre}" no tiene componentes definidos.`)
      }

      // 4. Cargar cantidades crudas por ración
      const { data: cantidadesCrudo, error: errCant } = await supabase
        .from('recetas_ingredientes')
        .select('ingrediente_id, cantidad_crudo_por_racion')
        .eq('receta_id', receta.id)

      if (errCant) throw errCant

      const mapaCrudo = {}
      ;(cantidadesCrudo || []).forEach(c => {
        mapaCrudo[c.ingrediente_id] = Number(c.cantidad_crudo_por_racion) || 0
      })

      // 5. Calcular sugerencias por componente
      const lista = componentesData.map(comp => {
        const ingredientes = (comp.componentes_ingredientes || [])
          .map(ci => ci.ingredientes)
          .filter(Boolean)
        
        let pesoCrudoTotal = 0
        let pesoCocidoSugerido = 0

        ingredientes.forEach(ing => {
          const cantidadCrudoPorRacion = mapaCrudo[ing.id] || 0
          const factorRendimiento = Number(ing.factor_rendimiento) || 1
          const pesoCrudoIngrediente = cantidadCrudoPorRacion * totalRaciones
          const pesoCocidoIngrediente = pesoCrudoIngrediente * factorRendimiento

          pesoCrudoTotal += pesoCrudoIngrediente
          pesoCocidoSugerido += pesoCocidoIngrediente
        })

        const factorAjuste = Number(comp.factor_ajuste) || 1
        pesoCocidoSugerido *= factorAjuste

        return {
          componente_id: comp.id,
          nombre: comp.nombre,
          emoji: comp.emoji,
          unidad: comp.unidad,
          factor_ajuste: factorAjuste,
          ingredientes_nombres: ingredientes.map(i => i.nombre),
          peso_crudo_total: pesoCrudoTotal,
          peso_cocido_sugerido: pesoCocidoSugerido,
          peso_cocido_real: pesoCocidoSugerido,
          fue_pesado_real: false,
        }
      })

      setComponentes(lista)
    } catch (err) {
      console.error('Error cargando componentes cocido:', err)
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function editarPeso(componente_id, valorNuevo) {
    const valor = parseFloat(valorNuevo) || 0
    setComponentes(prev => prev.map(c => 
      c.componente_id === componente_id
        ? { 
            ...c, 
            peso_cocido_real: valor,
            fue_pesado_real: Math.abs(valor - c.peso_cocido_sugerido) > 0.001
          }
        : c
    ))
  }

  function aceptarSugerencia(componente_id) {
    setComponentes(prev => prev.map(c => 
      c.componente_id === componente_id
        ? { ...c, peso_cocido_real: c.peso_cocido_sugerido, fue_pesado_real: false }
        : c
    ))
  }

  async function aprobarPesajeCocido() {
    if (componentes.length === 0) {
      alert('No hay componentes para registrar')
      return
    }

    const pesadosReales = componentes.filter(c => c.fue_pesado_real).length
    const asumidos = componentes.length - pesadosReales

    const confirmar = window.confirm(
      `¿Confirmas el pesaje cocido?\n\n` +
      `🍲 ${pesadosReales} plato(s) pesados de verdad\n` +
      `🤖 ${asumidos} plato(s) asumidos por el sistema\n\n` +
      `Esto alimenta la inteligencia para futuras sugerencias.`
    )
    if (!confirmar) return

    setProcesando(true)
    setError(null)

    try {
      const fechaHoy = new Date().toISOString().split('T')[0]

      const registros = componentes.map(c => ({
        empresa_id: empresaId,
        fecha: fechaHoy,
        componente_id: c.componente_id,
        peso_crudo_total: c.peso_crudo_total,
        peso_cocido_sugerido: c.peso_cocido_sugerido,
        peso_cocido_real: c.peso_cocido_real,
        factor_aplicado: c.factor_ajuste,
        fue_pesado_real: c.fue_pesado_real,
        notas: notasGenerales || null,
        created_by: usuario.id
      }))

      const { error: errInsert } = await supabase
        .from('pesajes_cocido')
        .insert(registros)

      if (errInsert) throw errInsert

      alert(`✅ Pesaje cocido aprobado\n\n${componentes.length} plato(s) registrados\n${pesadosReales} pesados, ${asumidos} asumidos`)
      if (onAprobado) onAprobado()
    } catch (err) {
      console.error('Error aprobando pesaje cocido:', err)
      setError(err.message)
    } finally {
      setProcesando(false)
    }
  }

  // Cálculos en vivo
  const totalCrudo = componentes.reduce((sum, c) => sum + c.peso_crudo_total, 0)
  const totalCocido = componentes.reduce((sum, c) => sum + c.peso_cocido_real, 0)
  const pesadosReales = componentes.filter(c => c.fue_pesado_real).length
  const asumidos = componentes.length - pesadosReales

  if (cargando) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4 animate-pulse">🍲</div>
          <p className="text-gray-700 font-medium">Cargando platos del día...</p>
        </div>
      </div>
    )
  }

  if (error && componentes.length === 0) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-rose-500 to-pink-600 rounded-t-2xl p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-rose-100 text-xs font-semibold tracking-wider">PESAJE COCIDO · POR PLATO</p>
              <h2 className="text-2xl font-bold mt-1 flex items-center gap-2">
                <span className="text-3xl">🍲</span>
                Después de cocinar
              </h2>
              <p className="text-rose-50 text-sm mt-1">
                {recetaInfo?.nombre} · {racionesHoy.toLocaleString()} raciones
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
            Se pesa cada <strong>plato completo</strong> (no ingredientes sueltos, porque al cocinar se mezclan). 
            El sistema sugiere el peso usando los factores de rendimiento. 
            Si pesas de verdad → mejor inteligencia futura. Si aceptas la sugerencia → el sistema asume.
          </p>
        </div>

        {/* Lista de componentes */}
        <div className="p-6">
          <p className="text-xs font-bold text-gray-700 uppercase mb-4">
            🍽️ Platos del día ({componentes.length})
          </p>
          
          <div className="space-y-3">
            {componentes.map((c) => (
              <div
                key={c.componente_id}
                className={`border-2 rounded-xl p-4 ${
                  c.fue_pesado_real
                    ? 'border-emerald-300 bg-emerald-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{c.emoji}</span>
                      <p className="font-bold text-gray-900 text-lg">{c.nombre}</p>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      <strong>Ingredientes:</strong> {c.ingredientes_nombres.join(', ')}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      Crudo total: <strong>{c.peso_crudo_total.toFixed(2)} lb</strong>
                      {' · '}
                      Sugerencia cocido: <strong>{c.peso_cocido_sugerido.toFixed(2)} {c.unidad}</strong>
                    </p>
                  </div>

                  <div className="flex flex-col items-end">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={c.peso_cocido_real}
                      onChange={(e) => editarPeso(c.componente_id, e.target.value)}
                      disabled={procesando}
                      className={`w-28 px-2 py-2 border-2 rounded-lg text-right font-bold text-lg ${
                        c.fue_pesado_real
                          ? 'border-emerald-400 text-emerald-900 bg-white'
                          : 'border-gray-300'
                      }`}
                    />
                    <span className="text-xs text-gray-500 mt-0.5">{c.unidad}</span>
                    {c.fue_pesado_real ? (
                      <span className="text-xs text-emerald-700 font-semibold mt-1">
                        ✓ Pesado real
                      </span>
                    ) : (
                      <button
                        onClick={() => aceptarSugerencia(c.componente_id)}
                        className="text-xs text-gray-500 mt-1 italic hover:text-gray-700"
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
            placeholder="Ej: Las habichuelas rindieron más de lo esperado..."
            disabled={procesando}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Footer: resumen + botones */}
        <div className="bg-gray-50 rounded-b-2xl p-6 border-t border-gray-200">
          
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