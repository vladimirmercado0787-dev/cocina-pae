// src/components/pesaje/ModalPesajeSobrante.jsx
// Modal de Pesaje SOBRANTE — Cocina PAE
// Refactor 16-may-2026: ahora trabaja con COMPONENTES (platos), no ingredientes individuales

import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

export default function ModalPesajeSobrante({ 
  empresaId, 
  usuario, 
  onCerrar, 
  onAprobado 
}) {
  const [pesajes, setPesajes] = useState([])
  const [recetaInfo, setRecetaInfo] = useState(null)
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

      // 1. Buscar pesajes cocidos de hoy con su componente y receta
      const { data: pesajesHoy, error: errPesajes } = await supabase
        .from('pesajes_cocido')
        .select(`
          id,
          componente_id,
          peso_crudo_total,
          peso_cocido_sugerido,
          peso_cocido_real,
          peso_sobrante_lb,
          componentes_receta (
            id,
            nombre,
            emoji,
            orden,
            unidad,
            receta_id,
            recetas (
              id,
              nombre
            )
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('fecha', fechaHoy)

      if (errPesajes) throw errPesajes
      if (!pesajesHoy || pesajesHoy.length === 0) {
        throw new Error('No hay pesajes cocidos registrados hoy. Primero hay que aprobar el pesaje cocido.')
      }

      // Tomar el nombre de la receta del primer pesaje
      const primerPesaje = pesajesHoy[0]
      const nombreReceta = primerPesaje.componentes_receta?.recetas?.nombre || 'Receta del día'
      setRecetaInfo({ nombre: nombreReceta })

      // 2. Armar lista de componentes con default 0 (no sobró)
      const lista = pesajesHoy
        .map(p => ({
          pesaje_id: p.id,
          componente_id: p.componente_id,
          nombre: p.componentes_receta?.nombre || 'Componente',
          emoji: p.componentes_receta?.emoji || '🍽️',
          unidad: p.componentes_receta?.unidad || 'lb',
          orden: p.componentes_receta?.orden || 999,
          peso_cocido_real: Number(p.peso_cocido_real) || 0,
          peso_sobrante_lb: p.peso_sobrante_lb !== null ? Number(p.peso_sobrante_lb) : 0,
          fue_pesado_sobrante_real: false,
        }))
        .sort((a, b) => a.orden - b.orden)

      setPesajes(lista)
    } catch (err) {
      console.error('Error cargando datos sobrante:', err)
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function editarSobrante(pesaje_id, valorNuevo) {
    const valor = parseFloat(valorNuevo) || 0
    setPesajes(prev => prev.map(p => 
      p.pesaje_id === pesaje_id
        ? { 
            ...p, 
            peso_sobrante_lb: valor,
            fue_pesado_sobrante_real: valor > 0
          }
        : p
    ))
  }

  async function aprobarPesajeSobrante() {
    if (pesajes.length === 0) {
      alert('No hay componentes para registrar sobrante')
      return
    }

    const conSobrante = pesajes.filter(p => p.peso_sobrante_lb > 0).length
    const sinSobrante = pesajes.length - conSobrante

    const confirmar = window.confirm(
      `¿Confirmas el pesaje sobrante?\n\n` +
      `🍱 ${conSobrante} plato(s) con sobrante\n` +
      `✅ ${sinSobrante} plato(s) sin sobrante (se consumió todo)\n\n` +
      `Esto cierra el ciclo del día y alimenta la inteligencia.`
    )
    if (!confirmar) return

    setProcesando(true)
    setError(null)

    try {
      // Actualizar cada fila de pesajes_cocido con el sobrante
      const promesas = pesajes.map(p => 
        supabase
          .from('pesajes_cocido')
          .update({
            peso_sobrante_lb: p.peso_sobrante_lb,
            fue_pesado_sobrante_real: p.fue_pesado_sobrante_real,
            notas_sobrante: notasGenerales || null,
          })
          .eq('id', p.pesaje_id)
      )

      const resultados = await Promise.all(promesas)
      
      // Revisar si hubo algún error
      const errores = resultados.filter(r => r.error)
      if (errores.length > 0) {
        throw new Error(`${errores.length} de ${pesajes.length} actualizaciones fallaron`)
      }

      alert(`✅ Pesaje sobrante aprobado\n\n${conSobrante} con sobrante, ${sinSobrante} sin sobrante\n\nCiclo del día completo 🎉`)
      if (onAprobado) onAprobado()
    } catch (err) {
      console.error('Error aprobando pesaje sobrante:', err)
      setError(err.message)
    } finally {
      setProcesando(false)
    }
  }

  // Cálculos en vivo
  const totalCocido = pesajes.reduce((sum, p) => sum + p.peso_cocido_real, 0)
  const totalSobrante = pesajes.reduce((sum, p) => sum + p.peso_sobrante_lb, 0)
  const totalConsumido = totalCocido - totalSobrante
  const conSobrante = pesajes.filter(p => p.peso_sobrante_lb > 0).length

  if (cargando) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4 animate-pulse">🍱</div>
          <p className="text-gray-700 font-medium">Cargando platos del día...</p>
        </div>
      </div>
    )
  }

  if (error && pesajes.length === 0) {
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
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-t-2xl p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-indigo-100 text-xs font-semibold tracking-wider">PESAJE SOBRANTE · POR PLATO</p>
              <h2 className="text-2xl font-bold mt-1 flex items-center gap-2">
                <span className="text-3xl">🍱</span>
                Lo que regresó de las escuelas
              </h2>
              <p className="text-indigo-50 text-sm mt-1">
                {recetaInfo?.nombre} · Cierre del ciclo
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
            Por defecto, todos los platos están en <strong>0</strong> (asumiendo que se consumió todo). 
            Solo edita los platos que sí regresaron sobrantes. Esta información ayuda a calcular el 
            consumo real y ajustar las cantidades futuras.
          </p>
        </div>

        {/* Lista de componentes */}
        <div className="p-6">
          <p className="text-xs font-bold text-gray-700 uppercase mb-4">
            🍽️ Platos del día ({pesajes.length})
          </p>
          
          <div className="space-y-3">
            {pesajes.map((p) => (
              <div
                key={p.pesaje_id}
                className={`border-2 rounded-xl p-4 ${
                  p.peso_sobrante_lb > 0
                    ? 'border-purple-300 bg-purple-50'
                    : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{p.emoji}</span>
                      <p className="font-bold text-gray-900 text-lg">{p.nombre}</p>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      Cocido: <strong>{p.peso_cocido_real.toFixed(2)} {p.unidad}</strong>
                    </p>
                  </div>

                  <div className="flex flex-col items-end">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={p.peso_sobrante_lb}
                      onChange={(e) => editarSobrante(p.pesaje_id, e.target.value)}
                      disabled={procesando}
                      className={`w-28 px-2 py-2 border-2 rounded-lg text-right font-bold text-lg ${
                        p.peso_sobrante_lb > 0
                          ? 'border-purple-400 text-purple-900 bg-white'
                          : 'border-gray-300'
                      }`}
                    />
                    <span className="text-xs text-gray-500 mt-0.5">{p.unidad} sobró</span>
                    {p.peso_sobrante_lb > 0 ? (
                      <span className="text-xs text-purple-700 font-semibold mt-1">
                        ✓ Con sobrante
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 mt-1 italic">
                        Se consumió todo
                      </span>
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
            Notas del pesaje sobrante (opcional)
          </label>
          <input
            type="text"
            value={notasGenerales}
            onChange={(e) => setNotasGenerales(e.target.value)}
            placeholder="Ej: La escuela X devolvió bastante arroz..."
            disabled={procesando}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Footer: resumen + botones */}
        <div className="bg-gray-50 rounded-b-2xl p-6 border-t border-gray-200">
          
          <div className="grid grid-cols-4 gap-3 mb-4 text-center">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Total cocido</p>
              <p className="text-lg font-bold text-rose-700">
                {totalCocido.toFixed(1)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-purple-200">
              <p className="text-xs text-gray-500">Sobrante</p>
              <p className="text-lg font-bold text-purple-700">
                {totalSobrante.toFixed(1)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-emerald-200">
              <p className="text-xs text-gray-500">Consumido real</p>
              <p className="text-lg font-bold text-emerald-700">
                {totalConsumido.toFixed(1)}
              </p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Con sobrante</p>
              <p className="text-lg font-bold text-gray-700">{conSobrante} / {pesajes.length}</p>
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
              onClick={aprobarPesajeSobrante}
              disabled={procesando}
              className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg disabled:opacity-50"
            >
              {procesando ? 'Guardando pesaje sobrante...' : '✅ Aprobar pesaje sobrante'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}