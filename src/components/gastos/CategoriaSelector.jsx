import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { normalizarNombre, sonIguales } from '../../utils/normalizarTexto'

const ICONOS_DISPONIBLES = [
  '💸', '⛽', '🔥', '⚡', '🚗', '🏢', '📦', '🧑‍💼', 
  '💼', '🏛️', '📋', '🍽️', '🎁', '📞', '🌐', '🛒',
  '🧹', '🔧', '💊', '📚', '🎓', '🏥', '✈️', '🏨'
]

const COLORES_DISPONIBLES = [
  { id: 'amber', label: 'Ámbar', class: 'bg-amber-500' },
  { id: 'red', label: 'Rojo', class: 'bg-red-500' },
  { id: 'yellow', label: 'Amarillo', class: 'bg-yellow-500' },
  { id: 'blue', label: 'Azul', class: 'bg-blue-500' },
  { id: 'purple', label: 'Morado', class: 'bg-purple-500' },
  { id: 'pink', label: 'Rosa', class: 'bg-pink-500' },
  { id: 'indigo', label: 'Índigo', class: 'bg-indigo-500' },
  { id: 'slate', label: 'Pizarra', class: 'bg-slate-500' },
  { id: 'green', label: 'Verde', class: 'bg-green-500' },
  { id: 'gray', label: 'Gris', class: 'bg-gray-500' },
]

function CategoriaSelector({ 
  empresaId, 
  categorias, 
  categoriaSeleccionada,
  onSeleccionar,
  onCategoriaCreada,
  disabled = false 
}) {
  const [busqueda, setBusqueda] = useState('')
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [modoCrear, setModoCrear] = useState(false)

  // Form nueva categoría
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoIcono, setNuevoIcono] = useState('💸')
  const [nuevoColor, setNuevoColor] = useState('gray')
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')

  const containerRef = useRef(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (!modoCrear) {
          setMostrarDropdown(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [modoCrear])

  // Filtrado
  const categoriasActivas = categorias.filter(c => c.activa)
  const categoriasFiltradas = busqueda.trim()
    ? categoriasActivas.filter(c => 
        c.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
    : categoriasActivas

  // Detectar similar
  const categoriaSimilar = busqueda.trim()
    ? categoriasActivas.find(c => sonIguales(c.nombre, busqueda))
    : null

  function seleccionar(cat) {
    onSeleccionar(cat)
    setBusqueda('')
    setMostrarDropdown(false)
    setModoCrear(false)
  }

  function quitar() {
    onSeleccionar(null)
    setBusqueda('')
    setMostrarDropdown(false)
  }

  function iniciarCreacion() {
    if (categoriaSimilar) {
      seleccionar(categoriaSimilar)
      return
    }
    setNuevoNombre(normalizarNombre(busqueda.trim()))
    setNuevoIcono('💸')
    setNuevoColor('gray')
    setErrorCrear('')
    setModoCrear(true)
  }

  function cancelarCreacion() {
    setModoCrear(false)
    setNuevoNombre('')
    setErrorCrear('')
  }

  async function guardarNuevaCategoria() {
    setErrorCrear('')
    const nombreNormalizado = normalizarNombre(nuevoNombre)

    if (!nombreNormalizado) {
      setErrorCrear('El nombre es obligatorio')
      return
    }

    const existeIgual = categoriasActivas.find(c => sonIguales(c.nombre, nombreNormalizado))
    if (existeIgual) {
      setErrorCrear(`Ya existe "${existeIgual.nombre}"`)
      setTimeout(() => seleccionar(existeIgual), 1500)
      return
    }

    setCreando(true)

    // Calcular siguiente orden
    const maxOrden = Math.max(0, ...categorias.map(c => c.orden || 0))

    const nueva = {
      empresa_id: empresaId,
      nombre: nombreNormalizado,
      icono: nuevoIcono,
      color: nuevoColor,
      es_default: false,
      activa: true,
      orden: maxOrden + 1
    }

    const { data, error } = await supabase
      .from('categorias_gasto')
      .insert([nueva])
      .select()
      .single()

    setCreando(false)

    if (error) {
      setErrorCrear('Error: ' + error.message)
      return
    }

    if (onCategoriaCreada) onCategoriaCreada(data)
    onSeleccionar(data)
    
    setBusqueda('')
    setMostrarDropdown(false)
    setModoCrear(false)
  }

  // MODO CREAR
  if (modoCrear) {
    return (
      <div ref={containerRef} className="relative">
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-green-700 font-bold tracking-wider">
              ➕ NUEVA CATEGORÍA
            </p>
            <button
              type="button"
              onClick={cancelarCreacion}
              disabled={creando}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Cancelar
            </button>
          </div>

          {/* Nombre */}
          <div>
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onBlur={(e) => setNuevoNombre(normalizarNombre(e.target.value))}
              placeholder="Nombre de la categoría"
              autoFocus
              disabled={creando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <p className="text-xs text-gray-500 mt-1">
              💡 Se guardará como: <strong>{normalizarNombre(nuevoNombre) || '(escribe el nombre)'}</strong>
            </p>
          </div>

          {/* Selector de ícono */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Ícono</label>
            <div className="grid grid-cols-8 gap-1 max-h-20 overflow-y-auto p-2 bg-white rounded border">
              {ICONOS_DISPONIBLES.map(icono => (
                <button
                  key={icono}
                  type="button"
                  onClick={() => setNuevoIcono(icono)}
                  className={`text-lg p-1 rounded hover:bg-amber-100 ${
                    nuevoIcono === icono ? 'bg-amber-200 ring-2 ring-amber-500' : ''
                  }`}
                >
                  {icono}
                </button>
              ))}
            </div>
          </div>

          {/* Selector de color */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Color</label>
            <div className="flex flex-wrap gap-1">
              {COLORES_DISPONIBLES.map(c => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNuevoColor(c.id)}
                  className={`w-6 h-6 rounded-full ${c.class} ${
                    nuevoColor === c.id ? 'ring-2 ring-offset-2 ring-gray-700' : ''
                  }`}
                  title={c.label}
                />
              ))}
            </div>
          </div>

          {errorCrear && (
            <p className="text-xs text-orange-700">⚠️ {errorCrear}</p>
          )}

          <button
            type="button"
            onClick={guardarNuevaCategoria}
            disabled={creando}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50"
          >
            {creando ? '⏳ Creando...' : `✅ Crear "${nuevoIcono} ${normalizarNombre(nuevoNombre)}"`}
          </button>
        </div>
      </div>
    )
  }

  // MODO SELECCIONADO
  if (categoriaSeleccionada) {
    return (
      <div ref={containerRef} className="relative">
        <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-300 rounded-lg p-2">
          <span className="text-2xl">{categoriaSeleccionada.icono}</span>
          <div className="flex-1">
            <p className="font-bold text-blue-900 text-sm">{categoriaSeleccionada.nombre}</p>
            {categoriaSeleccionada.es_default && (
              <p className="text-xs text-blue-600">Categoría por defecto</p>
            )}
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={quitar}
              className="text-blue-700 hover:text-red-600 text-xs font-semibold px-2 py-1 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    )
  }

  // MODO BÚSQUEDA
  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value)
          setMostrarDropdown(true)
        }}
        onFocus={() => setMostrarDropdown(true)}
        placeholder="🔍 Buscar o crear categoría..."
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
      />

      {mostrarDropdown && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-2xl max-h-72 overflow-y-auto">
          
          {/* Banner si hay similar */}
          {categoriaSimilar && (
            <div className="bg-yellow-50 border-b-2 border-yellow-300 p-2">
              <p className="text-xs text-yellow-900 font-bold mb-1">
                ⚠️ Ya existe una categoría similar:
              </p>
              <button
                type="button"
                onClick={() => seleccionar(categoriaSimilar)}
                className="w-full text-left bg-yellow-100 hover:bg-yellow-200 p-2 rounded text-sm flex items-center gap-2"
              >
                <span className="text-xl">{categoriaSimilar.icono}</span>
                <div>
                  <p className="font-bold text-yellow-900">{categoriaSimilar.nombre}</p>
                  <p className="text-xs text-yellow-700">→ Usar esta (recomendado)</p>
                </div>
              </button>
            </div>
          )}

          {/* Lista de categorías */}
          {categoriasFiltradas.length > 0 && (
            <div className="py-1">
              {categoriasFiltradas.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => seleccionar(cat)}
                  className="w-full text-left px-3 py-2 hover:bg-amber-50 border-b border-gray-100 flex items-center gap-2"
                >
                  <span className="text-xl">{cat.icono}</span>
                  <div>
                    <p className="font-semibold text-gray-900 text-sm">{cat.nombre}</p>
                    {cat.es_default && (
                      <p className="text-xs text-gray-500">Por defecto</p>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {categoriasFiltradas.length === 0 && busqueda.trim() && !categoriaSimilar && (
            <div className="p-2 text-center">
              <p className="text-xs text-gray-600">
                No se encontró "<strong>{busqueda}</strong>"
              </p>
            </div>
          )}

          {/* Botón crear nueva */}
          {!categoriaSimilar && (
            <button
              type="button"
              onClick={iniciarCreacion}
              className="w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 border-t-2 border-green-200 flex items-center gap-2"
            >
              <span className="text-lg">➕</span>
              <div>
                <p className="font-bold text-green-900 text-xs">
                  Crear nueva categoría
                  {busqueda.trim() && (
                    <span className="text-green-700"> "{normalizarNombre(busqueda.trim())}"</span>
                  )}
                </p>
                <p className="text-xs text-green-700">Personaliza ícono y color</p>
              </div>
            </button>
          )}

          {categoriasFiltradas.length === 0 && !busqueda.trim() && (
            <div className="p-3 text-center text-xs text-gray-500">
              Empieza a escribir o selecciona una categoría
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CategoriaSelector