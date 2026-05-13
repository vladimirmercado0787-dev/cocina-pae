import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'

const UNIDADES_COMUNES = [
  { id: 'lb', label: 'Libras (lb)' },
  { id: 'kg', label: 'Kilogramos (kg)' },
  { id: 'oz', label: 'Onzas (oz)' },
  { id: 'unidad', label: 'Unidades' },
  { id: 'docena', label: 'Docenas' },
  { id: 'gal', label: 'Galones' },
  { id: 'litro', label: 'Litros' },
  { id: 'paquete', label: 'Paquetes' },
  { id: 'saco', label: 'Sacos' },
  { id: 'caja', label: 'Cajas' },
  { id: 'botella', label: 'Botellas' },
  { id: 'lata', label: 'Latas' },
]

function IngredienteSelector({ 
  empresaId, 
  ingredientes, 
  ingredienteSeleccionado,
  itemLibreNombre,
  onSeleccionarIngrediente,
  onItemLibre,
  onIngredienteCreado,
  disabled = false 
}) {
  const [busqueda, setBusqueda] = useState('')
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [modoCrear, setModoCrear] = useState(false)
  const [modoLibre, setModoLibre] = useState(false)
  
  // Form de nuevo ingrediente
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaUnidad, setNuevaUnidad] = useState('lb')
  const [nuevoStockMinimo, setNuevoStockMinimo] = useState('')
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')

  // Form de item libre
  const [nombreLibre, setNombreLibre] = useState('')

  const containerRef = useRef(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (!modoCrear && !modoLibre) {
          setMostrarDropdown(false)
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [modoCrear, modoLibre])

  // Filtrar
  const ingredientesFiltrados = busqueda.trim()
    ? ingredientes.filter(i => 
        i.nombre.toLowerCase().includes(busqueda.toLowerCase())
      )
    : ingredientes

  function seleccionar(ing) {
    onSeleccionarIngrediente(ing)
    setBusqueda('')
    setMostrarDropdown(false)
    setModoCrear(false)
    setModoLibre(false)
  }

  function quitarSeleccion() {
    onSeleccionarIngrediente(null)
    if (onItemLibre) onItemLibre('')
    setBusqueda('')
    setMostrarDropdown(false)
  }

  function iniciarCreacion() {
    setNuevoNombre(busqueda.trim())
    setNuevaUnidad('lb')
    setNuevoStockMinimo('')
    setErrorCrear('')
    setModoCrear(true)
  }

  function cancelarCreacion() {
    setModoCrear(false)
    setNuevoNombre('')
    setErrorCrear('')
  }

  function iniciarLibre() {
    setNombreLibre(busqueda.trim())
    setModoLibre(true)
    setMostrarDropdown(false)
  }

  function cancelarLibre() {
    setModoLibre(false)
    setNombreLibre('')
  }

  function confirmarLibre() {
    if (!nombreLibre.trim()) return
    if (onItemLibre) onItemLibre(nombreLibre.trim())
    setModoLibre(false)
  }

  async function guardarNuevoIngrediente() {
    setErrorCrear('')

    if (!nuevoNombre.trim()) {
      setErrorCrear('El nombre es obligatorio')
      return
    }

    const existe = ingredientes.some(i => 
      i.nombre.toLowerCase() === nuevoNombre.trim().toLowerCase()
    )
    if (existe) {
      setErrorCrear('Ya existe un ingrediente con ese nombre')
      return
    }

    setCreando(true)

    const nuevoIng = {
      empresa_id: empresaId,
      nombre: nuevoNombre.trim(),
      unidad_stock: nuevaUnidad,
      stock_actual: 0,
      stock_minimo: parseFloat(nuevoStockMinimo) || 0,
    }

    const { data, error } = await supabase
      .from('ingredientes')
      .insert([nuevoIng])
      .select()
      .single()

    setCreando(false)

    if (error) {
      setErrorCrear('Error: ' + error.message)
      return
    }

    if (onIngredienteCreado) onIngredienteCreado(data)
    onSeleccionarIngrediente(data)
    
    setBusqueda('')
    setMostrarDropdown(false)
    setModoCrear(false)
  }

  // === RENDER ===

  // MODO CREAR
  if (modoCrear) {
    return (
      <div ref={containerRef} className="relative">
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-3 space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-green-700 font-bold tracking-wider">
              ➕ NUEVO INGREDIENTE
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

          <div>
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Nombre del ingrediente"
              autoFocus
              disabled={creando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <select
              value={nuevaUnidad}
              onChange={(e) => setNuevaUnidad(e.target.value)}
              disabled={creando}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              {UNIDADES_COMUNES.map(u => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
            <input
              type="number"
              step="0.1"
              min="0"
              value={nuevoStockMinimo}
              onChange={(e) => setNuevoStockMinimo(e.target.value)}
              placeholder="Stock mínimo (opcional)"
              disabled={creando}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {errorCrear && (
            <p className="text-xs text-red-700">⚠️ {errorCrear}</p>
          )}

          <button
            type="button"
            onClick={guardarNuevoIngrediente}
            disabled={creando}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50"
          >
            {creando ? '⏳ Creando...' : '✅ Crear y seleccionar'}
          </button>
        </div>
      </div>
    )
  }

  // MODO ITEM LIBRE
  if (modoLibre) {
    return (
      <div ref={containerRef} className="relative">
        <div className="bg-orange-50 border-2 border-orange-300 rounded-xl p-3 space-y-2">
          <div className="flex justify-between items-center">
            <p className="text-xs text-orange-700 font-bold tracking-wider">
              📝 ITEM LIBRE (no afecta stock)
            </p>
            <button
              type="button"
              onClick={cancelarLibre}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Cancelar
            </button>
          </div>

          <input
            type="text"
            value={nombreLibre}
            onChange={(e) => setNombreLibre(e.target.value)}
            placeholder="Ej: Sazón Goya, Refresco de naranja..."
            autoFocus
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />

          <p className="text-xs text-orange-700">
            ℹ️ Este item registra el gasto pero NO actualiza inventario
          </p>

          <button
            type="button"
            onClick={confirmarLibre}
            disabled={!nombreLibre.trim()}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-2 rounded-lg font-bold text-sm disabled:opacity-50"
          >
            ✅ Usar item libre
          </button>
        </div>
      </div>
    )
  }

  // MODO SELECCIONADO (ingrediente)
  if (ingredienteSeleccionado) {
    return (
      <div ref={containerRef} className="relative">
        <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-300 rounded-lg p-2">
          <div className="flex-1">
            <p className="font-bold text-blue-900 text-sm">{ingredienteSeleccionado.nombre}</p>
            <p className="text-xs text-blue-700">
              📦 Stock: {parseFloat(ingredienteSeleccionado.stock_actual || 0).toFixed(1)} {ingredienteSeleccionado.unidad_stock}
              {ingredienteSeleccionado.ultimo_costo && (
                <span className="ml-2">· Último: RD$ {parseFloat(ingredienteSeleccionado.ultimo_costo).toFixed(2)}</span>
              )}
            </p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={quitarSeleccion}
              className="text-blue-700 hover:text-red-600 text-xs font-semibold px-2 py-1 rounded"
            >
              ✕
            </button>
          )}
        </div>
      </div>
    )
  }

  // MODO SELECCIONADO (item libre)
  if (itemLibreNombre) {
    return (
      <div ref={containerRef} className="relative">
        <div className="flex items-center gap-2 bg-orange-50 border-2 border-orange-300 rounded-lg p-2">
          <div className="flex-1">
            <p className="font-bold text-orange-900 text-sm">📝 {itemLibreNombre}</p>
            <p className="text-xs text-orange-700">Item libre (no afecta stock)</p>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={quitarSeleccion}
              className="text-orange-700 hover:text-red-600 text-xs font-semibold px-2 py-1 rounded"
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
        placeholder="🔍 Buscar ingrediente..."
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
      />

      {mostrarDropdown && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
          
          {ingredientesFiltrados.length > 0 && (
            <div className="py-1">
              {ingredientesFiltrados.slice(0, 8).map(ing => (
                <button
                  key={ing.id}
                  type="button"
                  onClick={() => seleccionar(ing)}
                  className="w-full text-left px-3 py-2 hover:bg-amber-50 border-b border-gray-100"
                >
                  <p className="font-semibold text-gray-900 text-sm">{ing.nombre}</p>
                  <p className="text-xs text-gray-500">
                    📦 Stock: {parseFloat(ing.stock_actual || 0).toFixed(1)} {ing.unidad_stock}
                    {ing.ultimo_costo && (
                      <span className="ml-2">· Último: RD$ {parseFloat(ing.ultimo_costo).toFixed(2)}</span>
                    )}
                  </p>
                </button>
              ))}
              {ingredientesFiltrados.length > 8 && (
                <p className="text-xs text-gray-500 px-3 py-1 text-center">
                  + {ingredientesFiltrados.length - 8} más...
                </p>
              )}
            </div>
          )}

          {ingredientesFiltrados.length === 0 && busqueda.trim() && (
            <div className="p-2 text-center">
              <p className="text-xs text-gray-600">
                No se encontró "<strong>{busqueda}</strong>"
              </p>
            </div>
          )}

          {/* Botón crear nuevo ingrediente */}
          <button
            type="button"
            onClick={iniciarCreacion}
            className="w-full text-left px-3 py-2 bg-green-50 hover:bg-green-100 border-t-2 border-green-200 flex items-center gap-2"
          >
            <span className="text-lg">➕</span>
            <div>
              <p className="font-bold text-green-900 text-xs">
                Crear nuevo ingrediente
                {busqueda.trim() && (
                  <span className="text-green-700"> "{busqueda.trim()}"</span>
                )}
              </p>
              <p className="text-xs text-green-700">Se guarda en tu lista y aparecerá en stock</p>
            </div>
          </button>

          {/* Botón item libre */}
          <button
            type="button"
            onClick={iniciarLibre}
            className="w-full text-left px-3 py-2 bg-orange-50 hover:bg-orange-100 border-t border-orange-200 flex items-center gap-2"
          >
            <span className="text-lg">📝</span>
            <div>
              <p className="font-bold text-orange-900 text-xs">
                Usar como item libre
                {busqueda.trim() && (
                  <span className="text-orange-700"> "{busqueda.trim()}"</span>
                )}
              </p>
              <p className="text-xs text-orange-700">Solo registra el gasto, NO afecta stock</p>
            </div>
          </button>

          {ingredientesFiltrados.length === 0 && !busqueda.trim() && (
            <div className="p-3 text-center text-xs text-gray-500">
              Empieza a escribir el nombre del ingrediente
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default IngredienteSelector