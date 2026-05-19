import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalNuevoIngrediente from './ModalNuevoIngrediente'
import VistaListaCompras from './VistaListaCompras'
import { obtenerListaCompras } from '../../utils/calculosCompras'

const UNIDADES = [
  'lb', 'kg', 'oz', 'unidad', 'docena', 'gal', 'litro', 
  'paquete', 'saco', 'caja', 'botella', 'lata'
]

function VistaIngredientes({ usuario, empresaId, onVolver }) {
  const [ingredientes, setIngredientes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [empresa, setEmpresa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroStock, setFiltroStock] = useState('todos') // todos | bajo | sin | con
  const [modalNuevo, setModalNuevo] = useState(false)
  const [ingredienteEditando, setIngredienteEditando] = useState(null)
  
  // 🆕 Lista de Compras
  const [mostrarListaCompras, setMostrarListaCompras] = useState(false)
  const [resumenCompras, setResumenCompras] = useState({ urgentes: 0, proximos: 0 })

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)

    // Cargar empresa
    const { data: empData } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single()
    setEmpresa(empData)

    const { data: ingData } = await supabase
      .from('ingredientes')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nombre')
    setIngredientes(ingData || [])

    const { data: provData } = await supabase
      .from('proveedores')
      .select('*')
      .eq('empresa_id', empresaId)
    setProveedores(provData || [])

    // 🆕 Calcular cuántos urgentes/próximos para el badge
    try {
      const { items } = await obtenerListaCompras(
        empresaId,
        5, // default 1 semana
        empData?.raciones_diarias_total || 1230
      )
      const urgentes = items.filter(i => i.urgencia === 'urgente').length
      const proximos = items.filter(i => i.urgencia === 'proximo').length
      setResumenCompras({ urgentes, proximos })
    } catch (err) {
      console.error('Error calculando resumen compras:', err)
    }

    setCargando(false)
  }

  function getProveedor(proveedorId) {
    return proveedores.find(p => p.id === proveedorId)
  }

  // Determinar estado de stock
  function getEstadoStock(ing) {
    const actual = parseFloat(ing.stock_actual || 0)
    const minimo = parseFloat(ing.stock_minimo || 0)

    if (actual <= 0) return 'sin_stock'
    if (minimo > 0 && actual <= minimo) return 'bajo'
    return 'con_stock'
  }

  // Filtros aplicados
  const ingredientesFiltrados = ingredientes.filter(ing => {
    if (busqueda.trim()) {
      const q = busqueda.toLowerCase()
      if (!ing.nombre.toLowerCase().includes(q)) return false
    }

    const estado = getEstadoStock(ing)
    if (filtroStock === 'bajo' && estado !== 'bajo') return false
    if (filtroStock === 'sin' && estado !== 'sin_stock') return false
    if (filtroStock === 'con' && estado !== 'con_stock') return false

    return true
  })

  // Estadísticas
  const totalIngredientes = ingredientes.length
  const sinStock = ingredientes.filter(i => getEstadoStock(i) === 'sin_stock').length
  const stockBajo = ingredientes.filter(i => getEstadoStock(i) === 'bajo').length
  
  const valorInventario = ingredientes.reduce((sum, i) => {
    const stock = parseFloat(i.stock_actual || 0)
    const costo = parseFloat(i.ultimo_costo || 0)
    return sum + (stock * costo)
  }, 0)

  // 🆕 Total alertas para el badge
  const totalAlertas = resumenCompras.urgentes + resumenCompras.proximos

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando ingredientes...</div>
  }

  // 🆕 Si está abierta la lista de compras, mostrarla en lugar de la vista principal
  if (mostrarListaCompras) {
    return (
      <VistaListaCompras
        empresaId={empresaId}
        empresa={empresa}
        onVolver={() => {
          setMostrarListaCompras(false)
          cargarDatos() // Recargar al volver por si cambió algo
        }}
      />
    )
  }

  return (
    <div className="w-full max-w-6xl">
      
      {/* HEADER */}
      <div className="bg-gradient-to-br from-green-600 to-emerald-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start mb-4 flex-wrap gap-3">
          <div>
            <p className="text-green-100 text-xs font-semibold tracking-wider">MÓDULO INGREDIENTES</p>
            <h2 className="text-3xl font-bold mt-1">🥕 Inventario de Ingredientes</h2>
            <p className="text-green-200 mt-1">{totalIngredientes} ingredientes registrados</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            
            {/* 🆕 BOTÓN LISTA DE COMPRAS CON BADGE */}
            <button
              onClick={() => setMostrarListaCompras(true)}
              className={`relative font-bold px-5 py-3 rounded-xl shadow-lg transition-all ${
                resumenCompras.urgentes > 0
                  ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                  : totalAlertas > 0
                    ? 'bg-orange-500 hover:bg-orange-600 text-white'
                    : 'bg-white text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              📦 Lista de Compras
              {totalAlertas > 0 && (
                <span className="ml-2 inline-flex items-center justify-center px-2 py-0.5 text-xs font-bold rounded-full bg-white text-red-600 shadow-md">
                  {resumenCompras.urgentes > 0 && '🚨 '}
                  {totalAlertas}
                </span>
              )}
            </button>
            
            <button
              onClick={() => { setIngredienteEditando(null); setModalNuevo(true); }}
              className="bg-white text-green-700 hover:bg-green-50 font-bold px-5 py-3 rounded-xl shadow-lg"
            >
              ➕ Nuevo ingrediente
            </button>
            <button
              onClick={onVolver}
              className="bg-green-700 hover:bg-green-900 text-white text-sm px-4 py-2 rounded-lg"
            >
              ← Volver
            </button>
          </div>
        </div>

        {/* 🆕 BANNER DE ALERTA SI HAY URGENTES (anunciar el valor) */}
        {resumenCompras.urgentes > 0 && (
          <div className="bg-red-500/30 border-2 border-red-300 rounded-xl p-3 mt-3 backdrop-blur-sm">
            <p className="text-white font-bold flex items-center gap-2">
              🚨 ATENCIÓN: {resumenCompras.urgentes} ingrediente{resumenCompras.urgentes > 1 ? 's' : ''} se {resumenCompras.urgentes > 1 ? 'acaban' : 'acaba'} en menos de 2 días
              <button
                onClick={() => setMostrarListaCompras(true)}
                className="ml-auto bg-white text-red-700 px-3 py-1 rounded-lg text-sm hover:bg-red-50"
              >
                Ver lista →
              </button>
            </p>
          </div>
        )}
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">TOTAL</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{totalIngredientes}</p>
          <p className="text-xs text-gray-500 mt-1">ingredientes</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <p className="text-xs text-green-700 font-semibold tracking-wider">VALOR INVENTARIO</p>
          <p className="text-2xl font-bold text-green-900 mt-1">
            RD$ {valorInventario.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-green-600 mt-1">stock × último costo</p>
        </div>
        <div className={`border rounded-xl p-4 ${stockBajo > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs font-semibold tracking-wider ${stockBajo > 0 ? 'text-orange-700' : 'text-gray-500'}`}>STOCK BAJO</p>
          <p className={`text-2xl font-bold mt-1 ${stockBajo > 0 ? 'text-orange-900' : 'text-gray-900'}`}>{stockBajo}</p>
          <p className={`text-xs mt-1 ${stockBajo > 0 ? 'text-orange-600' : 'text-gray-500'}`}>
            {stockBajo > 0 ? '⚠️ requieren reposición' : 'sin alertas'}
          </p>
        </div>
        <div className={`border rounded-xl p-4 ${sinStock > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
          <p className={`text-xs font-semibold tracking-wider ${sinStock > 0 ? 'text-red-700' : 'text-gray-500'}`}>SIN STOCK</p>
          <p className={`text-2xl font-bold mt-1 ${sinStock > 0 ? 'text-red-900' : 'text-gray-900'}`}>{sinStock}</p>
          <p className={`text-xs mt-1 ${sinStock > 0 ? 'text-red-600' : 'text-gray-500'}`}>
            {sinStock > 0 ? '🔴 agotados' : 'todos disponibles'}
          </p>
        </div>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-xl shadow-sm p-4 mb-4 flex flex-wrap gap-3">
        <input
          type="text"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          placeholder="🔍 Buscar ingrediente..."
          className="flex-1 min-w-[200px] px-3 py-2 border border-gray-300 rounded-lg text-sm"
        />
        <select
          value={filtroStock}
          onChange={(e) => setFiltroStock(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
        >
          <option value="todos">Todos los ingredientes</option>
          <option value="con">📦 Con stock</option>
          <option value="bajo">⚠️ Stock bajo</option>
          <option value="sin">🔴 Sin stock</option>
        </select>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        {ingredientesFiltrados.length === 0 ? (
          <div className="p-12 text-center">
            <p className="text-6xl mb-3">🥕</p>
            <p className="text-gray-900 font-bold text-lg mb-2">
              {ingredientes.length === 0 ? 'Sin ingredientes' : 'Sin resultados'}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              {ingredientes.length === 0 
                ? 'Comienza agregando los ingredientes que usas en tus recetas.' 
                : 'Ajusta los filtros para ver más ingredientes.'}
            </p>
            {ingredientes.length === 0 && (
              <button
                onClick={() => { setIngredienteEditando(null); setModalNuevo(true); }}
                className="bg-green-600 hover:bg-green-700 text-white font-bold px-6 py-3 rounded-lg"
              >
                ➕ Crear primer ingrediente
              </button>
            )}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">INGREDIENTE</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 tracking-wider">STOCK ACTUAL</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 tracking-wider">STOCK MÍNIMO</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 tracking-wider">ÚLTIMO COSTO</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 tracking-wider">ÚLTIMO PROVEEDOR</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 tracking-wider">VALOR</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 tracking-wider">ESTADO</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {ingredientesFiltrados.map(ing => {
                const stock = parseFloat(ing.stock_actual || 0)
                const minimo = parseFloat(ing.stock_minimo || 0)
                const costo = parseFloat(ing.ultimo_costo || 0)
                const valor = stock * costo
                const estado = getEstadoStock(ing)
                const proveedor = getProveedor(ing.ultimo_proveedor_id)

                return (
                  <tr key={ing.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <p className="font-bold text-gray-900 text-sm">{ing.nombre}</p>
                      <p className="text-xs text-gray-500">Unidad: {ing.unidad_stock || 'lb'}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className={`font-bold font-mono ${
                        estado === 'sin_stock' ? 'text-red-700' : 
                        estado === 'bajo' ? 'text-orange-700' : 
                        'text-gray-900'
                      }`}>
                        {stock.toFixed(1)} {ing.unidad_stock || 'lb'}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      {minimo > 0 ? (
                        <p className="text-sm text-gray-600 font-mono">
                          {minimo.toFixed(1)} {ing.unidad_stock || 'lb'}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {costo > 0 ? (
                        <p className="text-sm text-gray-900 font-mono">
                          RD$ {costo.toFixed(2)}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {proveedor ? (
                        <p className="text-xs text-gray-700">{proveedor.nombre}</p>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {valor > 0 ? (
                        <p className="text-sm font-bold text-green-700 font-mono">
                          RD$ {valor.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                        </p>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {estado === 'sin_stock' ? (
                        <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full font-semibold">
                          🔴 Sin stock
                        </span>
                      ) : estado === 'bajo' ? (
                        <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded-full font-semibold">
                          ⚠️ Bajo
                        </span>
                      ) : (
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-semibold">
                          ✅ OK
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => { setIngredienteEditando(ing); setModalNuevo(true); }}
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
      {modalNuevo && (
        <ModalNuevoIngrediente
          empresaId={empresaId}
          ingredienteEditando={ingredienteEditando}
          onCerrar={() => setModalNuevo(false)}
          onGuardado={() => {
            cargarDatos()
            setModalNuevo(false)
          }}
        />
      )}

    </div>
  )
}

export default VistaIngredientes