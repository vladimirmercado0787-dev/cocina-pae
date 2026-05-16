// src/components/catalogo/VistaCatalogoRecetas.jsx
// Catálogo read-only de recetas oficiales INABIE
// Accesible para TODOS los roles operativos
// Decisión 15-may-2026

import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']

const DIAS_LABEL = {
  lunes: 'Lunes',
  martes: 'Martes',
  miercoles: 'Miércoles',
  jueves: 'Jueves',
  viernes: 'Viernes',
  sabado: 'Sábado',
  domingo: 'Domingo'
}

export default function VistaCatalogoRecetas({ empresa_id, onVolver }) {
  const [recetas, setRecetas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [expandida, setExpandida] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargarRecetas()
  }, [empresa_id])

  async function cargarRecetas() {
    try {
      setCargando(true)
      setError(null)

      const { data, error: errRecetas } = await supabase
        .from('recetas')
        .select(`
          id,
          nombre,
          emoji,
          dia_semana,
          popularidad,
          notas,
          tiempo_preparacion_min,
          personas_requeridas,
          preparacion_dia_anterior,
          notas_operativas,
          nivel_complejidad,
          recetas_ingredientes (
            id,
            cantidad_crudo_por_racion,
            unidad,
            notas,
            ingredientes (
              id,
              nombre,
              categoria,
              unidad_compra,
              factor_rendimiento
            )
          )
        `)
        .eq('empresa_id', empresa_id)
        .eq('activa', true)

      if (errRecetas) throw errRecetas

      const ordenadas = (data || []).sort((a, b) => {
        const idxA = DIAS_ORDEN.indexOf(a.dia_semana)
        const idxB = DIAS_ORDEN.indexOf(b.dia_semana)
        return idxA - idxB
      })

      setRecetas(ordenadas)
    } catch (err) {
      console.error('Error cargando recetas:', err)
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function toggleExpandir(id) {
    setExpandida(expandida === id ? null : id)
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 p-4 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-pulse">📋</div>
          <p className="text-teal-700 font-medium">Cargando recetas...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 p-4">
        <div className="max-w-5xl mx-auto bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <p className="text-red-700 font-medium">❌ Error: {error}</p>
          <button
            onClick={onVolver}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 to-emerald-50 p-4">
      <div className="max-w-5xl mx-auto">
        
        <div className="bg-gradient-to-r from-teal-600 to-emerald-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between mb-2">
            <button
              onClick={onVolver}
              className="text-white/90 hover:text-white text-sm font-medium flex items-center gap-2"
            >
              ← Volver
            </button>
            <span className="bg-white/20 px-3 py-1 rounded-full text-xs font-medium">
              {recetas.length} {recetas.length === 1 ? 'receta' : 'recetas'}
            </span>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            📋 Catálogo de Recetas
          </h1>
          <p className="text-teal-50 text-sm mt-1">
            Recetas oficiales INABIE — Solo lectura
          </p>
        </div>

        {recetas.length === 0 && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <div className="text-6xl mb-4">🍽️</div>
            <p className="text-gray-600 font-medium">
              No hay recetas activas todavía
            </p>
            <p className="text-gray-400 text-sm mt-2">
              El administrador debe agregar recetas en Configuración
            </p>
          </div>
        )}

        <div className="space-y-4">
          {recetas.map((receta) => {
            const estaExpandida = expandida === receta.id
            const ingredientes = receta.recetas_ingredientes || []

            return (
              <div
                key={receta.id}
                className="bg-white rounded-2xl shadow-xl overflow-hidden border-2 border-teal-100 hover:border-teal-300 transition-colors"
              >
                <button
                  onClick={() => toggleExpandir(receta.id)}
                  className="w-full p-5 flex items-center justify-between hover:bg-teal-50 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <span className="text-5xl">{receta.emoji || '🍽️'}</span>
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="bg-teal-100 text-teal-700 px-2 py-0.5 rounded text-xs font-semibold uppercase">
                          {DIAS_LABEL[receta.dia_semana]}
                        </span>
                        {receta.preparacion_dia_anterior && (
                          <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-semibold">
                            ⏰ Prep. día anterior
                          </span>
                        )}
                      </div>
                      <h2 className="text-xl font-bold text-gray-800">
                        {receta.nombre}
                      </h2>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {ingredientes.length} {ingredientes.length === 1 ? 'ingrediente' : 'ingredientes'}
                        {receta.tiempo_preparacion_min && ` • ${receta.tiempo_preparacion_min} min`}
                        {receta.personas_requeridas && ` • ${receta.personas_requeridas} ${receta.personas_requeridas === 1 ? 'persona' : 'personas'}`}
                      </p>
                    </div>
                  </div>
                  <span className="text-2xl text-teal-600">
                    {estaExpandida ? '▼' : '▶'}
                  </span>
                </button>

                {estaExpandida && (
                  <div className="border-t-2 border-teal-100 bg-gradient-to-br from-teal-50/50 to-emerald-50/50 p-5">
                    
                    {receta.notas && (
                      <div className="mb-4 p-3 bg-white rounded-lg border border-teal-200">
                        <p className="text-xs font-semibold text-teal-700 uppercase mb-1">📝 Notas</p>
                        <p className="text-sm text-gray-700">{receta.notas}</p>
                      </div>
                    )}

                    {receta.notas_operativas && (
                      <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200">
                        <p className="text-xs font-semibold text-amber-700 uppercase mb-1">⚙️ Notas operativas</p>
                        <p className="text-sm text-gray-700">{receta.notas_operativas}</p>
                      </div>
                    )}

                    <div className="bg-white rounded-lg overflow-hidden border border-teal-200">
                      <div className="bg-teal-600 text-white px-4 py-2">
                        <p className="font-semibold text-sm">🥘 Ingredientes por ración (en libras)</p>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {ingredientes.length === 0 ? (
                          <p className="p-4 text-sm text-gray-500 text-center">
                            Sin ingredientes registrados
                          </p>
                        ) : (
                          ingredientes.map((ri) => (
                            <div
                              key={ri.id}
                              className="px-4 py-3 flex items-center justify-between hover:bg-teal-50/50"
                            >
                              <div className="flex-1">
                                <p className="font-medium text-gray-800">
                                  {ri.ingredientes?.nombre || 'Ingrediente eliminado'}
                                </p>
                                {ri.ingredientes?.categoria && (
                                  <p className="text-xs text-gray-500 mt-0.5">
                                    {ri.ingredientes.categoria}
                                  </p>
                                )}
                                {ri.notas && (
                                  <p className="text-xs text-amber-600 mt-1 italic">
                                    💡 {ri.notas}
                                  </p>
                                )}
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-teal-700">
                                  {Number(ri.cantidad_crudo_por_racion).toFixed(3)} {ri.unidad || 'lb'}
                                </p>
                                <p className="text-xs text-gray-400">por ración</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      {receta.nivel_complejidad && (
                        <span className="bg-white px-2 py-1 rounded border border-gray-200 text-gray-600">
                          Complejidad: <strong className="capitalize">{receta.nivel_complejidad}</strong>
                        </span>
                      )}
                      {receta.popularidad && (
                        <span className="bg-white px-2 py-1 rounded border border-gray-200 text-gray-600">
                          Popularidad: <strong className="capitalize">{receta.popularidad}</strong>
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <div className="mt-8 text-center text-xs text-gray-500">
          <p>🍽️ Vista de solo lectura • Las recetas se editan desde Configuración</p>
        </div>

      </div>
    </div>
  )
}