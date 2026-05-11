import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalProveedor from './ModalProveedor'

function VistaProveedores({ usuario, empresaId, onVolver }) {
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroActivos, setFiltroActivos] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalProveedor, setModalProveedor] = useState(null)

  useEffect(() => {
    cargarProveedores()
  }, [empresaId, filtroActivos])

  async function cargarProveedores() {
    setCargando(true)
    
    let query = supabase
      .from('proveedores')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nombre', { ascending: true })

    if (filtroActivos) {
      query = query.or('activo.eq.true,activo.is.null')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error al cargar proveedores:', error)
      setCargando(false)
      return
    }

    setProveedores(data || [])
    setCargando(false)
  }

  // Filtro por búsqueda (nombre, contacto, RNC)
  const proveedoresFiltrados = proveedores.filter(p => {
    if (!busqueda.trim()) return true
    const termino = busqueda.toLowerCase()
    return (
      p.nombre?.toLowerCase().includes(termino) ||
      p.contacto_nombre?.toLowerCase().includes(termino) ||
      p.rnc?.toLowerCase().includes(termino) ||
      p.direccion?.toLowerCase().includes(termino)
    )
  })

  return (
    <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl overflow-hidden">
      
      {/* HEADER */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">🏭 Proveedores</h1>
            <p className="text-amber-100 text-sm mt-1">
              Gestiona a quién le compras tus insumos
            </p>
          </div>
          <button
            onClick={onVolver}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* BARRA DE BÚSQUEDA Y FILTROS */}
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center justify-between gap-4 mb-3">
          <div className="flex-1 max-w-md">
            <input
              type="text"
              placeholder="🔍 Buscar por nombre, contacto, RNC o dirección..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>
          <button
            className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2 whitespace-nowrap"
            onClick={() => setModalProveedor({})}
          >
            <span>+</span> Agregar proveedor
          </button>
        </div>
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={filtroActivos}
              onChange={(e) => setFiltroActivos(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            Solo activos
          </label>
          <span className="text-sm text-gray-500">
            {proveedoresFiltrados.length} {proveedoresFiltrados.length === 1 ? 'proveedor' : 'proveedores'}
            {busqueda && ` (de ${proveedores.length})`}
          </span>
        </div>
      </div>

      {/* LISTA DE PROVEEDORES */}
      <div className="p-6">
        {cargando ? (
          <p className="text-center text-gray-500 py-12">Cargando proveedores...</p>
        ) : proveedoresFiltrados.length === 0 ? (
          <div className="text-center py-12">
            {busqueda ? (
              <p className="text-gray-400 text-lg">No se encontraron proveedores con "{busqueda}"</p>
            ) : (
              <>
                <p className="text-5xl mb-3">🏭</p>
                <p className="text-gray-400 text-lg">No hay proveedores registrados todavía</p>
                <p className="text-gray-400 text-sm mt-2">
                  Haz click en "Agregar proveedor" para comenzar
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {proveedoresFiltrados.map((prov) => {
              const inactivo = prov.activo === false
              
              return (
                <div
                  key={prov.id}
                  className={`border-2 rounded-xl p-4 transition hover:shadow-md cursor-pointer ${
                    inactivo 
                      ? 'border-gray-200 bg-gray-50 opacity-60' 
                      : 'border-gray-200 bg-white hover:border-amber-300'
                  }`}
                  onClick={() => setModalProveedor(prov)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl">
                      🏭
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate">
                        {prov.nombre}
                      </p>
                      {inactivo && (
                        <span className="text-xs text-red-600 font-medium">
                          Inactivo
                        </span>
                      )}
                      {prov.rnc && (
                        <p className="text-xs text-gray-500 font-mono">
                          RNC: {prov.rnc}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-gray-600 mt-2">
                    {prov.contacto_nombre && (
                      <p>👤 {prov.contacto_nombre}</p>
                    )}
                    {prov.contacto_telefono && (
                      <p>📞 {prov.contacto_telefono}</p>
                    )}
                    {prov.direccion && (
                      <p className="truncate">📍 {prov.direccion}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL: Agregar o Editar proveedor */}
      {modalProveedor && (
        <ModalProveedor
          empresaId={empresaId}
          proveedorExistente={modalProveedor.id ? modalProveedor : null}
          onCerrar={() => setModalProveedor(null)}
          onGuardado={() => cargarProveedores()}
        />
      )}

    </div>
  )
}

export default VistaProveedores