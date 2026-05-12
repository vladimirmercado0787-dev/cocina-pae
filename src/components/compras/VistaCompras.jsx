import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalNuevaCompra from './ModalNuevaCompra'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

const METODOS_PAGO = {
  efectivo: { label: 'Efectivo', emoji: '💵' },
  transferencia: { label: 'Transferencia', emoji: '🏦' },
  cheque: { label: 'Cheque', emoji: '📝' },
  tarjeta: { label: 'Tarjeta', emoji: '💳' },
  credito: { label: 'Crédito', emoji: '⏰' },
}

function VistaCompras({ usuario, empresaId, onVolver }) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [compras, setCompras] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalNueva, setModalNueva] = useState(false)
  const [filtroProveedor, setFiltroProveedor] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas') // todas | pagadas | pendientes
  const [filtroRNC, setFiltroRNC] = useState('todas') // todas | con_rnc | sin_rnc

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId, mes, anio])

  async function cargarDatos() {
    setCargando(true)

    // Proveedores
    const { data: provData } = await supabase
      .from('proveedores')
      .select('*')
      .eq('empresa_id', empresaId)
      .or('activo.eq.true,activo.is.null')
      .order('nombre')
    setProveedores(provData || [])

    // Compras del mes
    const inicioMes = new Date(anio, mes, 1).toISOString().split('T')[0]
    const finMes = new Date(anio, mes + 1, 0).toISOString().split('T')[0]

    const { data: comprasData } = await supabase
      .from('compras')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)
      .order('fecha', { ascending: false })
      .order('created_at', { ascending: false })
    setCompras(comprasData || [])

    setCargando(false)
  }

  function getProveedor(proveedorId) {
    return proveedores.find(p => p.id === proveedorId)
  }

  // Filtros aplicados
  const comprasFiltradas = compras.filter(c => {
    if (filtroProveedor && c.proveedor_id !== filtroProveedor) return false
    if (filtroEstado === 'pagadas' && !c.pagada) return false
    if (filtroEstado === 'pendientes' && c.pagada) return false
    if (filtroRNC === 'con_rnc' && !c.con_rnc) return false
    if (filtroRNC === 'sin_rnc' && c.con_rnc) return false
    return true
  })

  // Totales
  const totalMes = comprasFiltradas.reduce((sum, c) => sum + parseFloat(c.total || 0), 0)
  const totalPagado = comprasFiltradas.filter(c => c.pagada).reduce((sum, c) => sum + parseFloat(c.total || 0), 0)
  const totalPendiente = totalMes - totalPagado
  const totalConRNC = comprasFiltradas.filter(c => c.con_rnc).reduce((sum, c) => sum + parseFloat(c.total || 0), 0)

  return (
    <div className="w-full max-w-6xl">
      
      {/* HEADER */}
      <div className="bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-amber-100 text-xs font-semibold tracking-wider">MÓDULO COMPRAS</p>
            <h2 className="text-3xl font-bold mt-1">📦 Compras a Proveedores</h2>
            <p className="text-amber-200 mt-1">{MESES[mes]} {anio}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setModalNueva(true)}
              className="bg-white text-amber-700 hover:bg-amber-50 font-bold px-5 py-3 rounded-xl shadow-lg"
            >
              ➕ Nueva compra
            </button>
            <button
              onClick={onVolver}
              className="bg-amber-700 hover:bg-amber-900 text-white text-sm px-4 py-2 rounded-lg"
            >
              ← Volver
            </button>
          </div>
        </div>

        {/* Selectores de período */}
        <div className="flex gap-3 flex-wrap">
          <select
            value={mes}
            onChange={(e) => setMes(parseInt(e.target.value))}
            className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            {MESES.map((m, i) => (
              <option key={i} value={i}>{m}</option>
            ))}
          </select>
          <select
            value={anio}
            onChange={(e) => setAnio(parseInt(e.target.value))}
            className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold"
          >
            {[2024, 2025, 2026, 2027, 2028].map(a => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
      </div>

      {/* STATS DEL MES */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">TOTAL DEL MES</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            RD$ {totalMes.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-gray-500 mt-1">{comprasFiltradas.length} compras</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-700 font-semibold tracking-wider">PAGADAS</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            RD$ {totalPagado.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-green-600 mt-1">
            {comprasFiltradas.filter(c => c.pagada).length} pagadas
          </p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs text-orange-700 font-semibold tracking-wider">PENDIENTES</p>
          <p className="text-2xl font-bold text-orange-900 mt-1">
            RD$ {totalPendiente.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-orange-600 mt-1">
            {comprasFiltradas.filter(c => !c.pagada).length} pendientes
          </p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="text-xs text-blue-700 font-semibold tracking-wider">CON RNC (DGII)</p>
          <p className="text-2xl font-bold text-blue-900 mt-1">
            RD$ {totalConRNC.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-blue-600 mt-1">
            {comprasFiltradas.filter(c => c.con_rnc).length} con RNC
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <select
          value={filtroProveedor}
          onChange={(e) => setFiltroProveedor(e.target.value)}
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="">Todos los proveedores</option>
          {proveedores.map(p => (
            <option key={p.id} value={p.id}>{p.nombre}</option>
          ))}
        </select>
        <select
          value={filtroEstado}
          onChange={(e) => setFiltroEstado(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="todas">Todas</option>
          <option value="pagadas">✅ Pagadas</option>
          <option value="pendientes">⏰ Pendientes</option>
        </select>
        <select
          value={filtroRNC}
          onChange={(e) => setFiltroRNC(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="todas">Con y sin RNC</option>
          <option value="con_rnc">🧾 Solo con RNC</option>
          <option value="sin_rnc">Sin RNC</option>
        </select>
      </div>

      {/* LISTA DE COMPRAS */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {cargando ? (
          <div className="p-12 text-center text-gray-500">Cargando compras...</div>
        ) : comprasFiltradas.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-6xl mb-3">📦</p>
            <p className="text-gray-900 font-bold text-lg mb-2">Sin compras registradas</p>
            <p className="text-sm text-gray-500 mb-4">
              No hay compras en {MESES[mes]} {anio} con los filtros aplicados.
            </p>
            <button
              onClick={() => setModalNueva(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-lg"
            >
              ➕ Registrar primera compra
            </button>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">FECHA</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">PROVEEDOR</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">FACTURA / NCF</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 tracking-wider">MODO</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 tracking-wider">TOTAL</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 tracking-wider">ESTADO</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 tracking-wider">RNC</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {comprasFiltradas.map(compra => {
                const proveedor = getProveedor(compra.proveedor_id)
                const metodo = compra.metodo_pago ? METODOS_PAGO[compra.metodo_pago] : null

                return (
                  <tr key={compra.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(compra.fecha + 'T12:00:00').toLocaleDateString('es-DO', { 
                        day: 'numeric', month: 'short' 
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900 text-sm">
                        {proveedor?.nombre || 'Sin proveedor'}
                      </p>
                      {compra.categoria && (
                        <p className="text-xs text-gray-500">{compra.categoria}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {compra.numero_factura ? (
                        <p className="text-gray-900 font-mono text-xs">{compra.numero_factura}</p>
                      ) : (
                        <p className="text-gray-400 italic text-xs">Sin factura</p>
                      )}
                      {compra.ncf && (
                        <p className="text-xs text-blue-700 font-mono">NCF: {compra.ncf}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                        compra.modo === 'detallado' 
                          ? 'bg-purple-100 text-purple-800' 
                          : 'bg-gray-100 text-gray-700'
                      }`}>
                        {compra.modo === 'detallado' ? '📋 Detallada' : '⚡ Rápida'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className="font-bold text-gray-900 font-mono">
                        RD$ {parseFloat(compra.total || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </p>
                      {parseFloat(compra.itbis || 0) > 0 && (
                        <p className="text-xs text-gray-500">ITBIS: RD$ {parseFloat(compra.itbis).toFixed(2)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {compra.pagada ? (
                        <div>
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                            ✅ Pagada
                          </span>
                          {metodo && (
                            <p className="text-xs text-gray-500 mt-1">
                              {metodo.emoji} {metodo.label}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-semibold">
                          ⏰ Pendiente
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {compra.con_rnc ? (
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full font-semibold">
                          🧾 Sí
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* MODAL Nueva Compra */}
      {modalNueva && (
        <ModalNuevaCompra
          empresaId={empresaId}
          usuario={usuario}
          proveedores={proveedores}
          onCerrar={() => setModalNueva(false)}
          onGuardado={() => {
            cargarDatos()
            setModalNueva(false)
          }}
        />
      )}

    </div>
  )
}

export default VistaCompras