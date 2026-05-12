import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'

function ProveedorSelector({ 
  empresaId, 
  proveedores, 
  proveedorSeleccionado, 
  onSeleccionar, 
  onProveedorCreado,
  disabled = false 
}) {
  const [busqueda, setBusqueda] = useState('')
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [modoCrear, setModoCrear] = useState(false)
  
  // Form de nuevo proveedor
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoRnc, setNuevoRnc] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [creandoProveedor, setCreandoProveedor] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')

  const containerRef = useRef(null)
  const inputRef = useRef(null)

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

  // Filtrar proveedores por búsqueda
  const proveedoresFiltrados = busqueda.trim()
    ? proveedores.filter(p => 
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.rnc && p.rnc.includes(busqueda))
      )
    : proveedores

  function seleccionarProveedor(prov) {
    onSeleccionar(prov)
    setBusqueda('')
    setMostrarDropdown(false)
    setModoCrear(false)
  }

  function quitarSeleccion() {
    onSeleccionar(null)
    setBusqueda('')
    setMostrarDropdown(false)
  }

  function iniciarCreacion() {
    setNuevoNombre(busqueda.trim()) // pre-llena con lo que escribió
    setNuevoRnc('')
    setNuevoTelefono('')
    setNuevaCategoria('')
    setErrorCrear('')
    setModoCrear(true)
  }

  function cancelarCreacion() {
    setModoCrear(false)
    setNuevoNombre('')
    setNuevoRnc('')
    setNuevoTelefono('')
    setNuevaCategoria('')
    setErrorCrear('')
  }

  async function guardarNuevoProveedor() {
    setErrorCrear('')

    if (!nuevoNombre.trim()) {
      setErrorCrear('El nombre del proveedor es obligatorio')
      return
    }

    // Verificar duplicados por nombre o RNC
    const nombreExiste = proveedores.some(p => 
      p.nombre.toLowerCase() === nuevoNombre.trim().toLowerCase()
    )
    if (nombreExiste) {
      setErrorCrear('Ya existe un proveedor con ese nombre')
      return
    }

    if (nuevoRnc.trim()) {
      const rncExiste = proveedores.some(p => p.rnc === nuevoRnc.trim())
      if (rncExiste) {
        setErrorCrear('Ya existe un proveedor con ese RNC')
        return
      }
    }

    setCreandoProveedor(true)

    const nuevoProv = {
      empresa_id: empresaId,
      nombre: nuevoNombre.trim(),
      rnc: nuevoRnc.trim() || null,
      telefono: nuevoTelefono.trim() || null,
      categoria: nuevaCategoria.trim() || null,
      activo: true,
    }

    const { data, error } = await supabase
      .from('proveedores')
      .insert([nuevoProv])
      .select()
      .single()

    setCreandoProveedor(false)

    if (error) {
      console.error('Error al crear proveedor:', error)
      setErrorCrear('Error al crear: ' + error.message)
      return
    }

    // Notificar al padre que se creó un proveedor (para recargar lista)
    if (onProveedorCreado) {
      onProveedorCreado(data)
    }

    // Seleccionarlo automáticamente
    onSeleccionar(data)
    
    // Cerrar todo
    setBusqueda('')
    setMostrarDropdown(false)
    setModoCrear(false)
    setNuevoNombre('')
    setNuevoRnc('')
    setNuevoTelefono('')
    setNuevaCategoria('')
  }

  // === RENDER ===

  // MODO CREAR — Form expandible
  if (modoCrear) {
    return (
      <div ref={containerRef} className="relative">
        <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-xs text-green-700 font-bold tracking-wider">
              ➕ NUEVO PROVEEDOR
            </p>
            <button
              type="button"
              onClick={cancelarCreacion}
              disabled={creandoProveedor}
              className="text-xs text-gray-500 hover:text-gray-700 underline"
            >
              Cancelar
            </button>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Nombre del proveedor <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej: Supermercado El Bohío"
              autoFocus
              disabled={creandoProveedor}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                RNC (opcional)
              </label>
              <input
                type="text"
                value={nuevoRnc}
                onChange={(e) => setNuevoRnc(e.target.value)}
                placeholder="1-31-12345-6"
                disabled={creandoProveedor}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Teléfono (opcional)
              </label>
              <input
                type="text"
                value={nuevoTelefono}
                onChange={(e) => setNuevoTelefono(e.target.value)}
                placeholder="809-555-1234"
                disabled={creandoProveedor}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Categoría (opcional)
            </label>
            <input
              type="text"
              value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              placeholder="Ej: Víveres, Carnes, Limpieza..."
              disabled={creandoProveedor}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>

          {errorCrear && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-800">
              ⚠️ {errorCrear}
            </div>
          )}

          <button
            type="button"
            onClick={guardarNuevoProveedor}
            disabled={creandoProveedor}
            className="w-full bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-bold text-sm transition disabled:opacity-50"
          >
            {creandoProveedor ? '⏳ Creando...' : '✅ Crear proveedor y continuar'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            ℹ️ El proveedor se guarda en tu lista para próximas compras
          </p>
        </div>
      </div>
    )
  }

  // MODO PROVEEDOR SELECCIONADO
  if (proveedorSeleccionado) {
    return (
      <div ref={containerRef} className="relative">
        <div className="flex items-center gap-2 bg-blue-50 border-2 border-blue-300 rounded-lg p-3">
          <div className="flex-1">
            <p className="font-bold text-blue-900">{proveedorSeleccionado.nombre}</p>
            <div className="flex gap-3 text-xs text-blue-700 mt-1">
              {proveedorSeleccionado.rnc && (
                <span>📋 RNC: {proveedorSeleccionado.rnc}</span>
              )}
              {proveedorSeleccionado.telefono && (
                <span>📞 {proveedorSeleccionado.telefono}</span>
              )}
              {proveedorSeleccionado.categoria && (
                <span>🏷️ {proveedorSeleccionado.categoria}</span>
              )}
            </div>
          </div>
          {!disabled && (
            <button
              type="button"
              onClick={quitarSeleccion}
              className="text-blue-700 hover:text-red-600 text-sm font-semibold px-3 py-1 rounded hover:bg-red-50"
            >
              ✕ Cambiar
            </button>
          )}
        </div>
      </div>
    )
  }

  // MODO BÚSQUEDA — Input + dropdown
  return (
    <div ref={containerRef} className="relative">
      <input
        ref={inputRef}
        type="text"
        value={busqueda}
        onChange={(e) => {
          setBusqueda(e.target.value)
          setMostrarDropdown(true)
        }}
        onFocus={() => setMostrarDropdown(true)}
        placeholder="🔍 Buscar proveedor por nombre o RNC..."
        disabled={disabled}
        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-base"
      />

      {mostrarDropdown && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white border-2 border-gray-200 rounded-lg shadow-2xl max-h-64 overflow-y-auto">
          
          {proveedoresFiltrados.length > 0 && (
            <div className="py-1">
              {proveedoresFiltrados.slice(0, 10).map(prov => (
                <button
                  key={prov.id}
                  type="button"
                  onClick={() => seleccionarProveedor(prov)}
                  className="w-full text-left px-4 py-2 hover:bg-amber-50 transition border-b border-gray-100"
                >
                  <p className="font-semibold text-gray-900 text-sm">{prov.nombre}</p>
                  <div className="flex gap-3 text-xs text-gray-500 mt-0.5">
                    {prov.rnc && <span>📋 {prov.rnc}</span>}
                    {prov.telefono && <span>📞 {prov.telefono}</span>}
                    {prov.categoria && <span>🏷️ {prov.categoria}</span>}
                  </div>
                </button>
              ))}
              {proveedoresFiltrados.length > 10 && (
                <p className="text-xs text-gray-500 px-4 py-2 text-center">
                  + {proveedoresFiltrados.length - 10} más... refina la búsqueda
                </p>
              )}
            </div>
          )}

          {proveedoresFiltrados.length === 0 && busqueda.trim() && (
            <div className="p-3 text-center">
              <p className="text-sm text-gray-600 mb-1">
                No se encontró "<strong>{busqueda}</strong>"
              </p>
            </div>
          )}

          {/* Botón crear nuevo - SIEMPRE visible */}
          <button
            type="button"
            onClick={iniciarCreacion}
            className="w-full text-left px-4 py-3 bg-green-50 hover:bg-green-100 border-t-2 border-green-200 transition flex items-center gap-2"
          >
            <span className="text-2xl">➕</span>
            <div>
              <p className="font-bold text-green-900 text-sm">
                Crear nuevo proveedor
                {busqueda.trim() && (
                  <span className="text-green-700"> "{busqueda.trim()}"</span>
                )}
              </p>
              <p className="text-xs text-green-700">
                Se guardará en tu lista para próximas compras
              </p>
            </div>
          </button>

          {proveedoresFiltrados.length === 0 && !busqueda.trim() && (
            <div className="p-4 text-center text-sm text-gray-500">
              Empieza a escribir el nombre o RNC del proveedor
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProveedorSelector