import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const DIAS = [
  { id: 'lunes', nombre: 'Lunes', emoji: '📅' },
  { id: 'martes', nombre: 'Martes', emoji: '📅' },
  { id: 'miercoles', nombre: 'Miércoles', emoji: '📅' },
  { id: 'jueves', nombre: 'Jueves', emoji: '📅' },
  { id: 'viernes', nombre: 'Viernes', emoji: '📅' }
]

const PLATOS_SUGERIDOS = [
  { nombre: 'Locrio de pollo', emoji: '🍗' },
  { nombre: 'Habichuelas guisadas con arroz', emoji: '🫘' },
  { nombre: 'Carne guisada con arroz', emoji: '🥩' },
  { nombre: 'Sancocho', emoji: '🍲' },
  { nombre: 'Espagueti con sardinas', emoji: '🍝' },
  { nombre: 'Pollo guisado con arroz', emoji: '🍗' },
  { nombre: 'Pescado guisado con arroz', emoji: '🐟' },
  { nombre: 'Asopao de pollo', emoji: '🥣' },
  { nombre: 'Mondongo', emoji: '🍲' },
  { nombre: 'Moro de habichuelas', emoji: '🍚' }
]

function Paso3MenuInabie({ empresaId }) {
  const [recetas, setRecetas] = useState([])
  const [diaActivo, setDiaActivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  
  const [datos, setDatos] = useState({
    nombre: '',
    emoji: '🍽️',
    popularidad: 'normal',
    notas: ''
  })

  useEffect(() => {
    if (empresaId) cargarRecetas()
  }, [empresaId])

  async function cargarRecetas() {
    const { data, error } = await supabase
      .from('recetas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: true })
    
    if (!error) {
      setRecetas(data)
    }
  }

  function actualizarCampo(campo, valor) {
    setDatos({ ...datos, [campo]: valor })
  }

  function resetFormulario() {
    setDatos({
      nombre: '',
      emoji: '🍽️',
      popularidad: 'normal',
      notas: ''
    })
    setMensaje(null)
  }

  function usarSugerencia(plato) {
    setDatos({
      ...datos,
      nombre: plato.nombre,
      emoji: plato.emoji
    })
  }

  async function agregarReceta(e) {
    e.preventDefault()
    
    if (!datos.nombre) {
      setMensaje({ tipo: 'error', texto: 'El nombre del plato es obligatorio' })
      return
    }

    setGuardando(true)
    setMensaje(null)

    try {
      const recetaParaGuardar = {
        empresa_id: empresaId,
        nombre: datos.nombre,
        emoji: datos.emoji,
        dia_semana: diaActivo,
        popularidad: datos.popularidad,
        notas: datos.notas || null
      }

      const { error } = await supabase
        .from('recetas')
        .insert([recetaParaGuardar])
        .select()

      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + error.message })
      } else {
        setMensaje({ tipo: 'exito', texto: '✅ Plato agregado' })
        resetFormulario()
        setDiaActivo(null)
        cargarRecetas()
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + err.message })
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarReceta(id) {
    const { error } = await supabase
      .from('recetas')
      .delete()
      .eq('id', id)
    
    if (!error) {
      cargarRecetas()
    }
  }

  // Encontrar la receta de cada día
  function recetaDelDia(dia) {
    return recetas.find(r => r.dia_semana === dia)
  }

  const recetasExtras = recetas.filter(r => r.dia_semana === 'extra')

  if (!empresaId) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-8 max-w-3xl w-full">
        <p className="text-yellow-800">
          ⚠️ Primero debes registrar tu cocina en el Paso 1
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl w-full">
      
      <div className="mb-6">
        <p className="text-xs text-orange-600 font-semibold tracking-wider mb-1">
          PASO 3 DE 6 · ESTIMADO 5 MIN
        </p>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🍽️ Menú INABIE
        </h2>
        <p className="text-gray-600">
          Asigna un plato a cada día de la semana
        </p>
      </div>

      {/* Tip educativo */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-900">
          💡 <strong>Tip:</strong> El menú INABIE estándar son 5 platos que rotan 
          cada semana. Agrégalos uno por día. Después podrás añadir platos extras 
          para días especiales.
        </p>
      </div>

      {/* Lista de los 5 días */}
      <div className="space-y-3 mb-6">
        {DIAS.map((dia) => {
          const receta = recetaDelDia(dia.id)
          const seleccionado = diaActivo === dia.id

          return (
            <div key={dia.id}>
              {receta ? (
                // Día con receta asignada
                <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center font-bold text-green-700">
                    {dia.nombre.substring(0, 3)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      <span className="text-2xl mr-2">{receta.emoji}</span>
                      {receta.nombre}
                    </p>
                    {receta.popularidad === 'baja' && (
                      <p className="text-xs text-orange-700">⚠️ Popularidad baja (suelen sobrar)</p>
                    )}
                    {receta.popularidad === 'alta' && (
                      <p className="text-xs text-green-700">⭐ Plato favorito</p>
                    )}
                  </div>
                  <button
                    onClick={() => eliminarReceta(receta.id)}
                    className="text-red-500 hover:text-red-700 px-3 py-1 text-sm"
                  >
                    Cambiar
                  </button>
                </div>
              ) : seleccionado ? (
                // Formulario inline para asignar plato
                <div className="bg-gray-50 border-2 border-blue-400 rounded-lg p-5 space-y-4">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center font-bold text-blue-700">
                      {dia.nombre.substring(0, 3)}
                    </div>
                    <h4 className="font-semibold text-gray-900">¿Qué se cocina los {dia.nombre.toLowerCase()}?</h4>
                  </div>

                  {/* Sugerencias rápidas */}
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-2 tracking-wider">
                      SUGERENCIAS RÁPIDAS:
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {PLATOS_SUGERIDOS.slice(0, 6).map((plato) => (
                        <button
                          key={plato.nombre}
                          type="button"
                          onClick={() => usarSugerencia(plato)}
                          className="px-3 py-1 bg-white border border-gray-300 rounded-full text-sm hover:bg-gray-50"
                        >
                          {plato.emoji} {plato.nombre}
                        </button>
                      ))}
                    </div>
                  </div>

                  <form onSubmit={agregarReceta} className="space-y-3">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={datos.emoji}
                        onChange={(e) => actualizarCampo('emoji', e.target.value)}
                        className="w-16 px-3 py-2 border border-gray-300 rounded-lg text-center text-xl bg-white"
                      />
                      <input
                        type="text"
                        value={datos.nombre}
                        onChange={(e) => actualizarCampo('nombre', e.target.value)}
                        placeholder="Nombre del plato"
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        ¿Cómo es la popularidad de este plato?
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        <button
                          type="button"
                          onClick={() => actualizarCampo('popularidad', 'alta')}
                          className={`p-2 rounded-lg text-sm font-semibold border-2 ${
                            datos.popularidad === 'alta' 
                              ? 'border-green-500 bg-green-50 text-green-700' 
                              : 'border-gray-200 bg-white text-gray-600'
                          }`}
                        >
                          ⭐ Favorito
                        </button>
                        <button
                          type="button"
                          onClick={() => actualizarCampo('popularidad', 'normal')}
                          className={`p-2 rounded-lg text-sm font-semibold border-2 ${
                            datos.popularidad === 'normal' 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-200 bg-white text-gray-600'
                          }`}
                        >
                          😊 Normal
                        </button>
                        <button
                          type="button"
                          onClick={() => actualizarCampo('popularidad', 'baja')}
                          className={`p-2 rounded-lg text-sm font-semibold border-2 ${
                            datos.popularidad === 'baja' 
                              ? 'border-orange-500 bg-orange-50 text-orange-700' 
                              : 'border-gray-200 bg-white text-gray-600'
                          }`}
                        >
                          ⚠️ Suele sobrar
                        </button>
                      </div>
                    </div>

                    {mensaje && (
                      <div className={`p-2 rounded-lg text-sm ${mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {mensaje.texto}
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setDiaActivo(null)
                          resetFormulario()
                        }}
                        className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 rounded-lg"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        disabled={guardando}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 rounded-lg"
                      >
                        {guardando ? 'Guardando...' : 'Asignar plato'}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                // Día sin receta - botón para agregar
                <button
                  onClick={() => {
                    setDiaActivo(dia.id)
                    resetFormulario()
                  }}
                  className="w-full flex items-center gap-4 p-4 border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 rounded-lg transition-colors text-left"
                >
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center font-bold text-gray-500">
                    {dia.nombre.substring(0, 3)}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-700">{dia.nombre}</p>
                    <p className="text-sm text-gray-400">+ Asignar plato</p>
                  </div>
                </button>
              )}
            </div>
          )
        })}
      </div>

      {/* Resumen */}
      {recetas.filter(r => r.dia_semana !== 'extra').length === 5 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
          <p className="font-semibold text-green-900">
            ✅ ¡Menú semanal completo!
          </p>
          <p className="text-sm text-green-700 mt-1">
            Tu cocina ya tiene los 5 platos rotativos asignados
          </p>
        </div>
      )}

    </div>
  )
}

export default Paso3MenuInabie