import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function Paso4Recetas({ empresaId }) {
  const [recetas, setRecetas] = useState([])
  const [recetaActiva, setRecetaActiva] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  
  const [datos, setDatos] = useState({
    tiempo_preparacion_min: '',
    personas_requeridas: '2',
    preparacion_dia_anterior: false,
    notas_operativas: '',
    nivel_complejidad: 'normal'
  })

  useEffect(() => {
    if (empresaId) cargarRecetas()
  }, [empresaId])

  async function cargarRecetas() {
    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('empresa_id', empresaId)
      .neq('dia_semana', 'extra')
      .order('created_at', { ascending: true })
    
    if (!error) {
      setRecetas(data)
    }
  }

  function abrirEdicion(receta) {
    setRecetaActiva(receta.id)
    setDatos({
      tiempo_preparacion_min: receta.tiempo_preparacion_min?.toString() || '',
      personas_requeridas: receta.personas_requeridas?.toString() || '2',
      preparacion_dia_anterior: receta.preparacion_dia_anterior || false,
      notas_operativas: receta.notas_operativas || '',
      nivel_complejidad: receta.nivel_complejidad || 'normal'
    })
    setMensaje(null)
  }

  function cerrarEdicion() {
    setRecetaActiva(null)
    setMensaje(null)
  }

  function actualizarCampo(campo, valor) {
    setDatos({ ...datos, [campo]: valor })
  }

  async function guardarReceta(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)

    try {
      const datosParaGuardar = {
        tiempo_preparacion_min: datos.tiempo_preparacion_min ? parseInt(datos.tiempo_preparacion_min) : null,
        personas_requeridas: parseInt(datos.personas_requeridas) || 2,
        preparacion_dia_anterior: datos.preparacion_dia_anterior,
        notas_operativas: datos.notas_operativas || null,
        nivel_complejidad: datos.nivel_complejidad,
        updated_at: new Date().toISOString()
      }

      const { error } = await supabase
        .from('recetas')
        .update(datosParaGuardar)
        .eq('id', recetaActiva)

      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + error.message })
      } else {
        setMensaje({ tipo: 'exito', texto: 'Detalles guardados' })
        cargarRecetas()
        setTimeout(() => cerrarEdicion(), 1000)
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + err.message })
    } finally {
      setGuardando(false)
    }
  }

  function formatearTiempo(min) {
    if (!min) return null
    if (min < 60) return `${min} min`
    const horas = Math.floor(min / 60)
    const mins = min % 60
    return mins === 0 ? `${horas}h` : `${horas}h ${mins}min`
  }

  function emojiComplejidad(nivel) {
    if (nivel === 'facil') return '🟢'
    if (nivel === 'complicado') return '🔴'
    return '🟡'
  }

  if (!empresaId) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-8 max-w-3xl w-full">
        <p className="text-yellow-800">Primero registra tu cocina en el Paso 1</p>
      </div>
    )
  }

  if (recetas.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-8 max-w-3xl w-full">
        <p className="text-yellow-800">Primero asigna los platos del menu en el Paso 3</p>
      </div>
    )
  }

  const recetasConDetalles = recetas.filter(r => r.tiempo_preparacion_min || r.notas_operativas).length

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl w-full">
      
      <div className="mb-6">
        <p className="text-xs text-orange-600 font-semibold tracking-wider mb-1">
          PASO 4 DE 6 · ESTIMADO 10 MIN · OPCIONAL EN MODO APRENDIZAJE
        </p>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          📖 Recetas detalladas
        </h2>
        <p className="text-gray-600">
          Detalles operativos de cada plato del menu
        </p>
      </div>

      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-green-900">
          🌱 <strong>Estas en modo Aprendizaje</strong> — este paso es OPCIONAL.
          Puedes llenar los detalles ahora o dejar que la app aprenda observando
          tu operacion durante 3-4 semanas.
        </p>
      </div>

      <div className="bg-gray-50 rounded-lg p-4 mb-6 flex justify-between items-center">
        <div>
          <p className="text-xs text-gray-500 font-semibold tracking-wider">PROGRESO</p>
          <p className="text-xl font-bold text-gray-900">
            {recetasConDetalles} de {recetas.length} platos con detalles
          </p>
        </div>
        <div className="text-3xl font-bold text-gray-400">
          {Math.round((recetasConDetalles / recetas.length) * 100)}%
        </div>
      </div>

      <div className="space-y-3">
        {recetas.map((receta) => {
          const enEdicion = recetaActiva === receta.id
          const tieneDetalles = receta.tiempo_preparacion_min || receta.notas_operativas

          if (enEdicion) {
            return (
              <div key={receta.id} className="bg-blue-50 border-2 border-blue-400 rounded-lg p-5">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl">{receta.emoji}</span>
                  <div>
                    <h4 className="font-bold text-gray-900">{receta.nombre}</h4>
                    <p className="text-xs text-gray-500 capitalize">{receta.dia_semana}</p>
                  </div>
                </div>

                <form onSubmit={guardarReceta} className="space-y-4">
                  
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      ⏱️ Tiempo de preparacion
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[
                        { min: 30, label: '30min' },
                        { min: 60, label: '1h' },
                        { min: 120, label: '2h' },
                        { min: 180, label: '3h' },
                        { min: 240, label: '4h+' }
                      ].map((opt) => (
                        <button
                          key={opt.min}
                          type="button"
                          onClick={() => actualizarCampo('tiempo_preparacion_min', opt.min.toString())}
                          className={`p-2 rounded-lg text-sm font-semibold border-2 ${
                            parseInt(datos.tiempo_preparacion_min) === opt.min
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      👥 Personas necesarias para cocinarlo
                    </label>
                    <div className="grid grid-cols-5 gap-2">
                      {[1, 2, 3, 4, 5].map((num) => (
                        <button
                          key={num}
                          type="button"
                          onClick={() => actualizarCampo('personas_requeridas', num.toString())}
                          className={`p-2 rounded-lg text-sm font-semibold border-2 ${
                            parseInt(datos.personas_requeridas) === num
                              ? 'border-blue-500 bg-blue-100 text-blue-700'
                              : 'border-gray-200 bg-white text-gray-600'
                          }`}
                        >
                          {num}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      🎯 Nivel de complejidad
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => actualizarCampo('nivel_complejidad', 'facil')}
                        className={`p-3 rounded-lg text-sm font-semibold border-2 ${
                          datos.nivel_complejidad === 'facil'
                            ? 'border-green-500 bg-green-50 text-green-700'
                            : 'border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        🟢 Facil
                      </button>
                      <button
                        type="button"
                        onClick={() => actualizarCampo('nivel_complejidad', 'normal')}
                        className={`p-3 rounded-lg text-sm font-semibold border-2 ${
                          datos.nivel_complejidad === 'normal'
                            ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                            : 'border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        🟡 Normal
                      </button>
                      <button
                        type="button"
                        onClick={() => actualizarCampo('nivel_complejidad', 'complicado')}
                        className={`p-3 rounded-lg text-sm font-semibold border-2 ${
                          datos.nivel_complejidad === 'complicado'
                            ? 'border-red-500 bg-red-50 text-red-700'
                            : 'border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        🔴 Complicado
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="flex items-center gap-3 cursor-pointer p-3 bg-white border-2 border-gray-200 rounded-lg">
                      <input
                        type="checkbox"
                        checked={datos.preparacion_dia_anterior}
                        onChange={(e) => actualizarCampo('preparacion_dia_anterior', e.target.checked)}
                        className="w-5 h-5"
                      />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">📅 Requiere preparacion el dia anterior</p>
                        <p className="text-xs text-gray-500">Ej: licuar sazon, marinar, picar verduras</p>
                      </div>
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      📝 Notas operativas
                    </label>
                    <textarea
                      value={datos.notas_operativas}
                      onChange={(e) => actualizarCampo('notas_operativas', e.target.value)}
                      placeholder="Ej: Empezar a las 6 AM. Sazon listo desde la noche anterior."
                      rows="3"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                    />
                  </div>

                  {mensaje && (
                    <div className={`p-3 rounded-lg text-sm ${mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {mensaje.texto}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={cerrarEdicion}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={guardando}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg"
                    >
                      {guardando ? 'Guardando...' : 'Guardar detalles'}
                    </button>
                  </div>
                </form>
              </div>
            )
          }

          return (
            <button
              key={receta.id}
              onClick={() => abrirEdicion(receta)}
              className={`w-full text-left p-4 rounded-lg border-2 transition-all ${
                tieneDetalles 
                  ? 'bg-green-50 border-green-200 hover:border-green-400'
                  : 'bg-white border-gray-200 hover:border-blue-400'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="text-3xl">{receta.emoji}</span>
                <div className="flex-1">
                  <p className="font-bold text-gray-900">{receta.nombre}</p>
                  <p className="text-xs text-gray-500 capitalize mb-1">{receta.dia_semana}</p>
                  {tieneDetalles ? (
                    <div className="flex flex-wrap gap-2 text-xs">
                      {receta.tiempo_preparacion_min && (
                        <span className="px-2 py-1 bg-white border border-gray-200 rounded">
                          ⏱️ {formatearTiempo(receta.tiempo_preparacion_min)}
                        </span>
                      )}
                      {receta.personas_requeridas && (
                        <span className="px-2 py-1 bg-white border border-gray-200 rounded">
                          👥 {receta.personas_requeridas} personas
                        </span>
                      )}
                      <span className="px-2 py-1 bg-white border border-gray-200 rounded">
                        {emojiComplejidad(receta.nivel_complejidad)} {receta.nivel_complejidad}
                      </span>
                      {receta.preparacion_dia_anterior && (
                        <span className="px-2 py-1 bg-orange-50 border border-orange-200 rounded text-orange-700">
                          📅 Prep. dia anterior
                        </span>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Click para agregar detalles</p>
                  )}
                </div>
                <div className="text-gray-400">
                  {tieneDetalles ? '✓' : '+'}
                </div>
              </div>
            </button>
          )
        })}
      </div>

    </div>
  )
}

export default Paso4Recetas