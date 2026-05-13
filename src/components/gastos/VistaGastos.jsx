import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalNuevoGasto from './ModalNuevoGasto'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function VistaGastos({ usuario, empresaId, onVolver }) {
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  
  // Filtros
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [filtroPagado, setFiltroPagado] = useState('todos') // todos | pagado | pendiente
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [gastoEditando, setGastoEditando] = useState(null)

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId, mes, anio])

  async function cargarDatos() {
    setCargando(true)

    // Fechas del mes seleccionado
    const inicioMes = new Date(anio, mes, 1).toISOString().split('T')[0]
    const finMes = new Date(anio, mes + 1, 0).toISOString().split('T')[0]
    
    const [gastosRes, catRes, provRes] = await Promise.all([
      supabase
        .from('gastos')
        .select('*')
        .eq('empresa_id', empresaId)
        .gte('fecha', inicioMes)
        .lte('fecha', finMes)
        .order('fecha', { ascending: false }),
      supabase
        .from('categorias_gasto')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('activa', true)
        .order('orden'),
      supabase
        .from('proveedores')
        .select('*')
        .eq('empresa_id', empresaId)
    ])
    
    setGastos(gastosRes.data || [])
    setCategorias(catRes.data || [])
    setProveedores(provRes.data || [])
    setCargando(false)
  }

  function getCategoria(catId) {
    return categorias.find(c => c.id === catId)
  }

  function getProveedor(provId) {
    return proveedores.find(p => p.id === provId)
  }

  // Filtros aplicados
  const gastosFiltrados = gastos.filter(g => {
    if (filtroCategoria && g.categoria_id !== filtroCategoria) return false
    if (filtroPagado === 'pagado' && !g.pagado) return false
    if (filtroPagado === 'pendiente' && g.pagado) return false
    
    if (filtroBusqueda.trim()) {
      const q = filtroBusqueda.toLowerCase()
      const enDescripcion = g.descripcion?.toLowerCase().includes(q)
      const enProveedor = g.proveedor_nombre?.toLowerCase().includes(q)
      const prov = getProveedor(g.proveedor_id)
      const enProveedorBD = prov?.nombre?.toLowerCase().includes(q)
      const enRnc = g.rnc?.toLowerCase().includes(q)
      if (!enDescripcion && !enProveedor && !enProveedorBD && !enRnc) return false
    }
    
    return true
  })

  // Estadísticas
  const totalMes = gastosFiltrados.reduce((sum, g) => sum + parseFloat(g.total || 0), 0)
  const totalPagado = gastosFiltrados.filter(g => g.pagado).reduce((sum, g) => sum + parseFloat(g.total || 0), 0)
  const totalPendiente = totalMes - totalPagado
  const cantidadGastos = gastosFiltrados.length
  const conRncCount = gastosFiltrados.filter(g => g.con_rnc).length

  // Agregaciones por categoría
  const gastosPorCategoria = categorias.map(cat => {
    const items = gastosFiltrados.filter(g => g.categoria_id === cat.id)
    const total = items.reduce((sum, g) => sum + parseFloat(g.total || 0), 0)
    return {
      ...cat,
      cantidad: items.length,
      total
    }
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando gastos...</div>
  }

  return (
    <div className="w-full max-w-6xl">
      
      {/* HEADER */}
      <div className="bg-gradient-to-br from-rose-600 to-pink-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-pink-100 text-xs font-semibold tracking-wider">MÓDULO GASTOS</p>
            <h2 className="text-3xl font-bold mt-1">💸 Gastos Operativos</h2>
            <p className="text-pink-200 mt-1">{MESES[mes]} de {anio} · {cantidadGastos} registros</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => { setGastoEditando(null); setModalAbierto(true); }}
              className="bg-white text-rose-700 hover:bg-rose-50 font-bold px-5 py-3 rounded-xl shadow-lg"
            >
              ➕ Nuevo gasto
            </button>
            <button
              onClick={onVolver}
              className="bg-rose-800 hover:bg-rose-900 text-white text-sm px-4 py-2 rounded-lg"
            >
              ← Volver
            </button>
          </div>
        </div>

        {/* Selector de mes */}
        <div className="grid grid-cols-2 gap-2 mt-4">
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
            className="px-3 py-2 bg-white/20 backdrop-blur text-white rounded-lg text-sm font-semibold border border-white/30"
          >
            {MESES.map((m, i) => (
              <option key={i} value={i} className="text-gray-900">{m}</option>
            ))}
          </select>
          <select
            value={anio}
            onChange={(e) => setAnio(parseInt(e.target.value))}
            className="px-3 py-2 bg-white/20 backdrop-blur text-white rounded-lg text-sm font-semibold border border-white/30"
          >
            {[2025, 2026, 2027, 2028].map(a => (
              <option key={a} value={a} className="text-gray-900">{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">TOTAL MES</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            RD$ {totalMes.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">{cantidadGastos} gastos</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-700 font-semibold tracking-wider">PAGADO</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            RD$ {totalPagado.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-green-600 mt-1">ya saldado</p>
        </div>
        <div className={`border rounded-xl p-4 ${totalPendiente > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs font-semibold tracking-wider ${totalPendiente > 0 ? 'text-orange-700' : 'text-gray-500'}`}>PENDIENTE</p>
          <p className={`text-2xl font-bold mt-1 ${totalPendiente > 0 ? 'text-orange-900' : 'text-gray-900'}`}>
            RD$ {totalPendiente.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
          </p>
          <p className={`text-xs mt-1 ${totalPendiente > 0 ? 'text-orange-600' : 'text-gray-500'}`}>por pagar</p>
        </div>
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <p className="text-xs text-purple-700 font-semibold tracking-wider">CON RNC</p>
          <p className="text-2xl font-bold text-purple-900 mt-1">{conRncCount}</p>
          <p className="text-xs text-purple-600 mt-1">para 606 DGII</p>
        </div>
      </div>

      {/* DESGLOSE POR CATEGORÍA */}
      {gastosPorCategoria.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm p-6 mb-6">
          <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
            📊 DESGLOSE POR CATEGORÍA
          </p>
          <div className="space-y-2">
            {gastosPorCategoria.map(cat => {
              const porcentaje = totalMes > 0 ? (cat.total / totalMes) * 100 : 0
              return (
                <div key={cat.id} className="flex items-center gap-3">
                  <span className="text-xl w-8">{cat.icono}</span>
                  <div className="flex-1">
                    <div className="flex justify-between items-center mb-1">
                      <p className="font-semibold text-sm text-gray-900">{cat.nombre}</p>
                      <p className="text-sm font-bold text-gray-900 font-mono">
                        RD$ {cat.total.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-2">
                        <div 
                          className="bg-rose-500 h-2 rounded-full" 
                          style={{ width: `${porcentaje}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500 w-12 text-right">{porcentaje.toFixed(0)}%</p>
                      <p className="text-xs text-gray-500 w-16 text-right">{cat.cantidad} items</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* FILTROS */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          value={filtroBusqueda}
          onChange={(e) => setFiltroBusqueda(e.target.value)}
          placeholder="🔍 Buscar gasto..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <select
          value={filtroCategoria}
          onChange={(e) => setFiltroCategoria(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Todas las categorías</option>
          {categorias.map(c => (
            <option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>
          ))}
        </select>
        <select
          value={filtroPagado}
          onChange={(e) => setFiltroPagado(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="todos">Todos</option>
          <option value="pagado">✅ Pagados</option>
          <option value="pendiente">⏰ Pendientes</option>
        </select>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {gastosFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-6xl mb-3">💸</p>
            <p className="text-gray-900 font-bold text-lg mb-2">
              {gastos.length === 0 ? 'Sin gastos en este mes' : 'Sin resultados'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {gastos.length === 0 
                ? 'Comienza registrando los gastos operativos del mes.' 
                : 'Ajusta los filtros para ver más gastos.'}
            </p>
            {gastos.length === 0 && (
              <button
                onClick={() => { setGastoEditando(null); setModalAbierto(true); }}
                className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-6 py-3 rounded-lg"
              >
                ➕ Registrar primer gasto
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">FECHA</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">CATEGORÍA</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">DESCRIPCIÓN</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">PROVEEDOR</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 tracking-wider">MONTO</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 tracking-wider">RNC</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 tracking-wider">ESTADO</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {gastosFiltrados.map(g => {
                const cat = getCategoria(g.categoria_id)
                const prov = getProveedor(g.proveedor_id)
                const fechaFormat = new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })

                return (
                  <tr key={g.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900 font-mono">{fechaFormat}</p>
                    </td>
                    <td className="px-4 py-3">
                      {cat ? (
                        <span className="text-sm">
                          {cat.icono} {cat.nombre}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">Sin categoría</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{g.descripcion}</p>
                      {g.notas && (
                        <p className="text-xs text-gray-500 truncate max-w-xs">{g.notas}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {prov ? (
                        <p className="text-xs text-gray-700">{prov.nombre}</p>
                      ) : g.proveedor_nombre ? (
                        <p className="text-xs text-gray-600 italic">{g.proveedor_nombre}</p>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="text-sm font-bold text-gray-900 font-mono">
                        RD$ {parseFloat(g.total).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </p>
                      {g.aplica_itbis && (
                        <p className="text-xs text-amber-600">incl. ITBIS</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {g.con_rnc ? (
                        <div>
                          <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full font-semibold">
                            🧾 {g.tipo_ncf}
                          </span>
                          <p className="text-xs text-gray-500 mt-1 font-mono">{g.rnc}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {g.pagado ? (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                          ✅ Pagado
                        </span>
                      ) : (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-semibold">
                          ⏰ Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => { setGastoEditando(g); setModalAbierto(true); }}
                        className="text-xs text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-2 py-1 rounded font-semibold"
                      >
                        ✏️ Editar
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL */}
      {modalAbierto && (
        <ModalNuevoGasto
          empresaId={empresaId}
          usuario={usuario}
          categorias={categorias}
          proveedores={proveedores}
          gastoEditando={gastoEditando}
          onCerrar={() => setModalAbierto(false)}
          onGuardado={() => {
            cargarDatos()
            setModalAbierto(false)
          }}
          onCategoriaCreada={(nueva) => {
            setCategorias([...categorias, nueva])
          }}
          onProveedorCreado={(nuevo) => {
            setProveedores([...proveedores, nuevo])
          }}
        />
      )}

    </div>
  )
}

export default VistaGastos