// src/components/ingredientes/VistaListaCompras.jsx
import { useState, useEffect, useMemo } from 'react'
import {
  obtenerListaCompras,
  agruparPorProveedor,
  calcularResumenEconomico,
  formatearRD,
  redondear,
  DIAS_COCINA_POR_SEMANA
} from '../../utils/calculosCompras'
import ModalListaGenerada from './ModalListaGenerada'

// ════════════════════════════════════════════════════
// 📅 PRESETS DE PERÍODO
// ════════════════════════════════════════════════════
const PRESETS = [
  { label: '1 día', dias: 1, descripcion: '1 día de cocina' },
  { label: '3 días', dias: 3, descripcion: '3 días de cocina' },
  { label: '1 semana', dias: 5, descripcion: '1 semana INABIE', destacado: true },
  { label: '2 semanas', dias: 10, descripcion: '2 semanas' },
  { label: '1 mes', dias: 20, descripcion: '~4 semanas' }
]

export default function VistaListaCompras({ empresaId, empresa, onVolver }) {
  // ════════════════════════════════════════════════════
  // 🎯 ESTADO
  // ════════════════════════════════════════════════════
  const [cargando, setCargando] = useState(true)
  const [items, setItems] = useState([])
  const [diasObjetivo, setDiasObjetivo] = useState(DIAS_COCINA_POR_SEMANA)
  const [customDias, setCustomDias] = useState('')
  const [tipoCustom, setTipoCustom] = useState('dias')
  
  // Selección y edición
  const [seleccionados, setSeleccionados] = useState({})
  const [cantidadesEditadas, setCantidadesEditadas] = useState({})
  
  // Colapsables
  const [mostrarSuficientes, setMostrarSuficientes] = useState(false)
  const [mostrarSinDato, setMostrarSinDato] = useState(false)
  
  // Modal
  const [modalAbierto, setModalAbierto] = useState(false)
  const [datosLista, setDatosLista] = useState(null)
  
  const racionesPromedio = empresa?.raciones_diarias_total || 1230
  
  // ════════════════════════════════════════════════════
  // 🔄 CARGAR LISTA
  // ════════════════════════════════════════════════════
  async function cargarLista() {
    setCargando(true)
    const { items: itemsCargados, error } = await obtenerListaCompras(
      empresaId,
      diasObjetivo,
      racionesPromedio
    )
    
    if (error) {
      alert('Error cargando lista: ' + error.message)
      setCargando(false)
      return
    }
    
    setItems(itemsCargados)
    
    // Auto-seleccionar urgentes y próximos
    const autoSeleccionados = {}
    itemsCargados.forEach(item => {
      if (item.urgencia === 'urgente' || item.urgencia === 'proximo') {
        autoSeleccionados[item.id] = true
      }
    })
    setSeleccionados(autoSeleccionados)
    setCargando(false)
  }
  
  useEffect(() => {
    cargarLista()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, diasObjetivo])
  
  // ════════════════════════════════════════════════════
  // 🎯 HANDLERS
  // ════════════════════════════════════════════════════
  function aplicarPreset(dias) {
    setDiasObjetivo(dias)
    setCustomDias('')
    setCantidadesEditadas({})
  }
  
  function aplicarCustom() {
    const valor = parseInt(customDias)
    if (isNaN(valor) || valor < 1 || valor > 365) {
      alert('Ingresa un número entre 1 y 365')
      return
    }
    const diasFinales = tipoCustom === 'semanas' 
      ? valor * DIAS_COCINA_POR_SEMANA 
      : valor
    setDiasObjetivo(diasFinales)
    setCantidadesEditadas({})
  }
  
  function toggleSeleccion(itemId) {
    setSeleccionados(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }))
  }
  
  function seleccionarTodos(filtro = null) {
    const nuevos = { ...seleccionados }
    items.forEach(item => {
      if (!filtro || item.urgencia === filtro) {
        nuevos[item.id] = true
      }
    })
    setSeleccionados(nuevos)
  }
  
  function deseleccionarTodos() {
    setSeleccionados({})
  }
  
  function editarCantidad(itemId, nuevaCantidad) {
    const valor = parseFloat(nuevaCantidad)
    if (isNaN(valor) || valor < 0) {
      setCantidadesEditadas(prev => {
        const nuevo = { ...prev }
        delete nuevo[itemId]
        return nuevo
      })
      return
    }
    setCantidadesEditadas(prev => ({
      ...prev,
      [itemId]: valor
    }))
  }
  
  function resetearEdicion(itemId) {
    setCantidadesEditadas(prev => {
      const nuevo = { ...prev }
      delete nuevo[itemId]
      return nuevo
    })
  }
  
  function generarLista() {
    const itemsConCantidad = items
      .filter(item => seleccionados[item.id])
      .map(item => ({
        ...item,
        cantidadSugerida: cantidadesEditadas[item.id] !== undefined
          ? cantidadesEditadas[item.id]
          : item.cantidadSugerida,
        costoEstimado: cantidadesEditadas[item.id] !== undefined
          ? cantidadesEditadas[item.id] * item.precioUnitario
          : item.costoEstimado
      }))
      .filter(item => item.cantidadSugerida > 0)
    
    if (itemsConCantidad.length === 0) {
      alert('⚠️ No hay items seleccionados con cantidad mayor a 0')
      return
    }
    
    itemsConCantidad.forEach(item => {
      item.costoEstimadoFormateado = formatearRD(item.costoEstimado)
    })
    
    const agrupado = agruparPorProveedor(itemsConCantidad)
    setDatosLista({
      items: itemsConCantidad,
      agrupado,
      empresa
    })
    setModalAbierto(true)
  }
  
  // ════════════════════════════════════════════════════
  // 📊 CÁLCULOS DERIVADOS
  // ════════════════════════════════════════════════════
  const resumen = useMemo(() => calcularResumenEconomico(items), [items])
  
  const itemsUrgentes = items.filter(i => i.urgencia === 'urgente')
  const itemsProximos = items.filter(i => i.urgencia === 'proximo')
  const itemsSinDato = items.filter(i => i.urgencia === 'sin_dato')
  const itemsSuficientes = items.filter(i => i.urgencia === 'suficiente')
  
  const totalSeleccionado = useMemo(() => {
    let count = 0
    let costo = 0
    items.forEach(item => {
      if (seleccionados[item.id]) {
        const cantidad = cantidadesEditadas[item.id] !== undefined
          ? cantidadesEditadas[item.id]
          : item.cantidadSugerida
        if (cantidad > 0) {
          count++
          costo += cantidad * item.precioUnitario
        }
      }
    })
    return { count, costo, costoFormateado: formatearRD(costo) }
  }, [items, seleccionados, cantidadesEditadas])
  
  // ════════════════════════════════════════════════════
  // 🎨 RENDER
  // ════════════════════════════════════════════════════
  if (cargando) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-green-50">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">📦</div>
          <p className="text-emerald-800 font-bold text-xl">Analizando inventario...</p>
          <p className="text-emerald-600 text-sm mt-2">Calculando consumo aprendido</p>
        </div>
      </div>
    )
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-green-50 pb-32">
      {/* HEADER */}
      <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-6 shadow-lg">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div>
            <button
              onClick={onVolver}
              className="text-emerald-100 hover:text-white text-sm mb-2 flex items-center gap-1"
            >
              ← Volver a Ingredientes
            </button>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              📦 Lista de Compras
            </h1>
            <p className="text-emerald-100 mt-1">
              Inteligencia de inventario · Sugerencias automáticas
            </p>
          </div>
          <div className="text-right">
            <div className="text-emerald-100 text-sm">Empresa</div>
            <div className="font-bold text-lg">{empresa?.nombre}</div>
            <div className="text-emerald-100 text-xs mt-1">
              {racionesPromedio.toLocaleString('es-DO')} raciones diarias
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        
        {/* 💎 BANNER DE VALOR */}
        {resumen.totalItems > 0 && (
          <div className="bg-white rounded-2xl shadow-lg border-2 border-emerald-200 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-green-500 text-white p-4">
              <h2 className="font-bold text-lg flex items-center gap-2">
                💎 ANÁLISIS DE INVENTARIO
              </h2>
              <p className="text-emerald-100 text-sm">
                La aplicación analizó {resumen.totalItems} ingredientes activos
              </p>
            </div>
            
            <div className="p-5 grid grid-cols-2 md:grid-cols-5 gap-3">
              {/* Urgentes */}
              <div className={`rounded-xl p-3 ${
                resumen.cantidadUrgentes > 0 
                  ? 'bg-red-50 border-2 border-red-300' 
                  : 'bg-gray-50'
              }`}>
                <div className="text-2xl mb-1">
                  {resumen.cantidadUrgentes > 0 ? '🚨' : '✅'}
                </div>
                <div className={`text-xl font-bold ${
                  resumen.cantidadUrgentes > 0 ? 'text-red-600' : 'text-gray-400'
                }`}>
                  {resumen.cantidadUrgentes}
                </div>
                <div className="text-xs text-gray-600 font-semibold">
                  URGENTES
                </div>
              </div>
              
              {/* Próximos */}
              <div className={`rounded-xl p-3 ${
                resumen.cantidadProximos > 0 
                  ? 'bg-orange-50 border-2 border-orange-300' 
                  : 'bg-gray-50'
              }`}>
                <div className="text-2xl mb-1">
                  {resumen.cantidadProximos > 0 ? '⚠️' : '✅'}
                </div>
                <div className={`text-xl font-bold ${
                  resumen.cantidadProximos > 0 ? 'text-orange-600' : 'text-gray-400'
                }`}>
                  {resumen.cantidadProximos}
                </div>
                <div className="text-xs text-gray-600 font-semibold">
                  PRÓXIMOS
                </div>
              </div>
              
              {/* Suficientes */}
              <div className="bg-emerald-50 border-2 border-emerald-300 rounded-xl p-3">
                <div className="text-2xl mb-1">✅</div>
                <div className="text-xl font-bold text-emerald-600">
                  {resumen.cantidadSuficientes}
                </div>
                <div className="text-xs text-gray-600 font-semibold">
                  SUFICIENTES
                </div>
              </div>
              
              {/* Sin datos */}
              <div className={`rounded-xl p-3 ${
                resumen.cantidadSinDato > 0
                  ? 'bg-yellow-50 border-2 border-yellow-300'
                  : 'bg-gray-50'
              }`}>
                <div className="text-2xl mb-1">⚙️</div>
                <div className={`text-xl font-bold ${
                  resumen.cantidadSinDato > 0 ? 'text-yellow-600' : 'text-gray-400'
                }`}>
                  {resumen.cantidadSinDato}
                </div>
                <div className="text-xs text-gray-600 font-semibold">
                  SIN CONFIG
                </div>
              </div>
              
              {/* Inversión total */}
              <div className="bg-blue-50 border-2 border-blue-300 rounded-xl p-3">
                <div className="text-2xl mb-1">💰</div>
                <div className="text-base font-bold text-blue-600 leading-tight">
                  {resumen.inversionTotalFormateada}
                </div>
                <div className="text-xs text-gray-600 font-semibold">
                  INVERSIÓN
                </div>
              </div>
            </div>
            
            {/* Mensaje de riesgo */}
            {resumen.riesgoOperacional && (
              <div className="bg-red-50 border-t-2 border-red-200 p-3 text-center">
                <p className="text-red-700 font-bold text-sm">
                  {resumen.mensajeRiesgo} · 
                  <span className="text-red-600 ml-1">
                    ¡La operación está en riesgo!
                  </span>
                </p>
              </div>
            )}
            
            {/* Sin proveedor */}
            {resumen.cantidadSinProveedor > 0 && (
              <div className="bg-yellow-50 border-t-2 border-yellow-200 p-3 text-center">
                <p className="text-yellow-700 font-bold text-sm">
                  ⚠️ {resumen.cantidadSinProveedor} ingrediente{resumen.cantidadSinProveedor > 1 ? 's' : ''} sin proveedor asignado
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* 📅 SELECTOR DE PERÍODO */}
        <div className="bg-white rounded-2xl shadow border-2 border-emerald-100 p-5">
          <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
            📅 Reponer para cuántos días de cocina:
          </h3>
          
          <div className="flex flex-wrap gap-2 mb-3">
            {PRESETS.map(preset => (
              <button
                key={preset.dias}
                onClick={() => aplicarPreset(preset.dias)}
                className={`px-4 py-2 rounded-lg font-bold transition-all ${
                  diasObjetivo === preset.dias
                    ? 'bg-emerald-600 text-white shadow-lg scale-105'
                    : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                } ${preset.destacado && diasObjetivo !== preset.dias ? 'ring-2 ring-emerald-300' : ''}`}
              >
                {preset.label}
                {preset.destacado && diasObjetivo !== preset.dias && (
                  <span className="ml-1 text-xs">⭐</span>
                )}
              </button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
            <span className="text-sm text-gray-600 font-semibold">O custom:</span>
            <input
              type="number"
              min="1"
              max="365"
              value={customDias}
              onChange={e => setCustomDias(e.target.value)}
              placeholder="Cantidad"
              className="w-24 px-3 py-2 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none"
            />
            <select
              value={tipoCustom}
              onChange={e => setTipoCustom(e.target.value)}
              className="px-3 py-2 border-2 border-emerald-200 rounded-lg focus:border-emerald-500 outline-none font-semibold"
            >
              <option value="dias">días</option>
              <option value="semanas">semanas</option>
            </select>
            <button
              onClick={aplicarCustom}
              disabled={!customDias}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-bold disabled:bg-gray-300 disabled:cursor-not-allowed hover:bg-emerald-700"
            >
              Aplicar
            </button>
          </div>
          
          <p className="text-xs text-gray-500 mt-2">
            💡 Período actual: <span className="font-bold text-emerald-700">{diasObjetivo} días de cocina</span>
            {' '}({redondear(diasObjetivo / DIAS_COCINA_POR_SEMANA, 1)} semana{diasObjetivo > 5 ? 's' : ''})
          </p>
        </div>
        
        {/* 🎯 ACCIONES DE SELECCIÓN */}
        {items.length > 0 && (itemsUrgentes.length > 0 || itemsProximos.length > 0) && (
          <div className="bg-white rounded-xl shadow border border-gray-200 p-3 flex flex-wrap gap-2 text-sm">
            <button
              onClick={() => seleccionarTodos()}
              className="px-3 py-1 bg-emerald-100 text-emerald-700 rounded font-semibold hover:bg-emerald-200"
            >
              ☑️ Seleccionar todos
            </button>
            {itemsUrgentes.length > 0 && (
              <button
                onClick={() => seleccionarTodos('urgente')}
                className="px-3 py-1 bg-red-100 text-red-700 rounded font-semibold hover:bg-red-200"
              >
                🚨 Solo urgentes
              </button>
            )}
            {itemsProximos.length > 0 && (
              <button
                onClick={() => seleccionarTodos('proximo')}
                className="px-3 py-1 bg-orange-100 text-orange-700 rounded font-semibold hover:bg-orange-200"
              >
                ⚠️ Solo próximos
              </button>
            )}
            <button
              onClick={deseleccionarTodos}
              className="px-3 py-1 bg-gray-100 text-gray-700 rounded font-semibold hover:bg-gray-200"
            >
              ☐ Deseleccionar
            </button>
          </div>
        )}
        
        {/* 🚨 SECCIÓN URGENTES */}
        {itemsUrgentes.length > 0 && (
          <SeccionItems
            titulo="🚨 URGENTES"
            descripcion="Se acaban en menos de 2 días"
            color="red"
            items={itemsUrgentes}
            seleccionados={seleccionados}
            cantidadesEditadas={cantidadesEditadas}
            onToggle={toggleSeleccion}
            onEditarCantidad={editarCantidad}
            onResetearEdicion={resetearEdicion}
          />
        )}
        
        {/* ⚠️ SECCIÓN PRÓXIMOS */}
        {itemsProximos.length > 0 && (
          <SeccionItems
            titulo="⚠️ PRÓXIMOS A AGOTARSE"
            descripcion="Te quedan entre 2 y 5 días de cocina"
            color="orange"
            items={itemsProximos}
            seleccionados={seleccionados}
            cantidadesEditadas={cantidadesEditadas}
            onToggle={toggleSeleccion}
            onEditarCantidad={editarCantidad}
            onResetearEdicion={resetearEdicion}
          />
        )}
        
        {/* ⚙️ SECCIÓN SIN DATOS (colapsable) */}
        {itemsSinDato.length > 0 && (
          <div className="bg-white rounded-2xl shadow border-2 border-yellow-200">
            <button
              onClick={() => setMostrarSinDato(!mostrarSinDato)}
              className="w-full p-4 text-left hover:bg-yellow-50 flex items-center justify-between"
            >
              <div>
                <h3 className="font-bold text-yellow-700">
                  ⚙️ SIN CONFIGURAR ({itemsSinDato.length})
                </h3>
                <p className="text-sm text-gray-500">
                  Sin historial ni estándar INABIE · Configurar consumo manualmente
                </p>
              </div>
              <span className="text-2xl">
                {mostrarSinDato ? '▼' : '▶'}
              </span>
            </button>
            
            {mostrarSinDato && (
              <div className="border-t border-yellow-100 p-4 space-y-2 bg-yellow-50">
                <div className="bg-white border border-yellow-300 rounded-lg p-3 mb-3">
                  <p className="text-sm text-yellow-800">
                    💡 <strong>¿Por qué aparecen aquí?</strong> Estos ingredientes no están en el catálogo INABIE estándar y aún no tienen historial de consumo suficiente. Edita cada uno en el módulo de Ingredientes y configura su "Consumo semanal esperado".
                  </p>
                </div>
                {itemsSinDato.map(item => (
                  <div key={item.id} className="border border-yellow-200 rounded-lg p-3 flex items-center justify-between flex-wrap gap-2 bg-white">
                    <div className="flex-1">
                      <div className="font-semibold text-gray-800">{item.nombre}</div>
                      <div className="text-xs text-gray-500 mt-1">
                        Stock actual: <span className="font-bold">{item.stockActual} {item.unidadStock}</span>
                        {item.precioUnitario > 0 && (
                          <span> · Último costo: <span className="font-bold">{formatearRD(item.precioUnitario)}</span></span>
                        )}
                      </div>
                    </div>
                    <span className="text-xs px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full font-bold border border-yellow-300">
                      💡 Configurar
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* ✅ SECCIÓN SUFICIENTES (colapsable) */}
        {itemsSuficientes.length > 0 && (
          <div className="bg-white rounded-2xl shadow border border-gray-200">
            <button
              onClick={() => setMostrarSuficientes(!mostrarSuficientes)}
              className="w-full p-4 text-left hover:bg-gray-50 flex items-center justify-between"
            >
              <div>
                <h3 className="font-bold text-emerald-700">
                  ✅ SUFICIENTES ({itemsSuficientes.length})
                </h3>
                <p className="text-sm text-gray-500">
                  Stock adecuado · No requieren compra urgente
                </p>
              </div>
              <span className="text-2xl">
                {mostrarSuficientes ? '▼' : '▶'}
              </span>
            </button>
            
            {mostrarSuficientes && (
              <div className="border-t border-gray-100 p-4 space-y-2">
                {itemsSuficientes.map(item => (
                  <ItemCompra
                    key={item.id}
                    item={item}
                    seleccionado={seleccionados[item.id] || false}
                    cantidadEditada={cantidadesEditadas[item.id]}
                    color="emerald"
                    onToggle={() => toggleSeleccion(item.id)}
                    onEditarCantidad={(cant) => editarCantidad(item.id, cant)}
                    onResetearEdicion={() => resetearEdicion(item.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* MENSAJE SI NO HAY ITEMS */}
        {items.length === 0 && !cargando && (
          <div className="bg-white rounded-2xl shadow p-8 text-center">
            <div className="text-6xl mb-3">📦</div>
            <h3 className="font-bold text-xl text-gray-800 mb-2">
              No hay ingredientes activos
            </h3>
            <p className="text-gray-600 max-w-md mx-auto">
              Agrega ingredientes en el módulo de Ingredientes para que aparezcan aquí.
            </p>
          </div>
        )}
      </div>
      
      {/* BARRA DE ACCIÓN FLOTANTE */}
      {totalSeleccionado.count > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t-2 border-emerald-200 shadow-2xl p-4 z-50">
          <div className="max-w-5xl mx-auto flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="font-bold text-emerald-700 text-lg">
                {totalSeleccionado.count} ingrediente{totalSeleccionado.count > 1 ? 's' : ''} seleccionado{totalSeleccionado.count > 1 ? 's' : ''}
              </div>
              <div className="text-sm text-gray-600">
                Inversión: <span className="font-bold text-blue-600">{totalSeleccionado.costoFormateado}</span>
              </div>
            </div>
            <button
              onClick={generarLista}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-green-600 text-white font-bold rounded-xl shadow-lg hover:from-emerald-700 hover:to-green-700 transition-all flex items-center gap-2"
            >
              📋 Generar Lista
            </button>
          </div>
        </div>
      )}
      
      {/* MODAL LISTA GENERADA */}
      {modalAbierto && datosLista && (
        <ModalListaGenerada
          datos={datosLista}
          onCerrar={() => setModalAbierto(false)}
        />
      )}
    </div>
  )
}

// ════════════════════════════════════════════════════
// 🎨 SUB-COMPONENTE: Sección de items
// ════════════════════════════════════════════════════
function SeccionItems({ 
  titulo, descripcion, color, items, 
  seleccionados, cantidadesEditadas,
  onToggle, onEditarCantidad, onResetearEdicion 
}) {
  const colorClases = {
    red: 'border-red-300 bg-red-50',
    orange: 'border-orange-300 bg-orange-50',
    emerald: 'border-emerald-300 bg-emerald-50'
  }
  
  const colorTitulo = {
    red: 'text-red-700',
    orange: 'text-orange-700',
    emerald: 'text-emerald-700'
  }
  
  return (
    <div className={`rounded-2xl shadow border-2 ${colorClases[color]}`}>
      <div className="p-4 border-b border-gray-200">
        <h3 className={`font-bold text-lg ${colorTitulo[color]}`}>
          {titulo} ({items.length})
        </h3>
        <p className="text-sm text-gray-600">{descripcion}</p>
      </div>
      
      <div className="p-4 space-y-3 bg-white rounded-b-2xl">
        {items.map(item => (
          <ItemCompra
            key={item.id}
            item={item}
            seleccionado={seleccionados[item.id] || false}
            cantidadEditada={cantidadesEditadas[item.id]}
            color={color}
            onToggle={() => onToggle(item.id)}
            onEditarCantidad={(cant) => onEditarCantidad(item.id, cant)}
            onResetearEdicion={() => onResetearEdicion(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

// ════════════════════════════════════════════════════
// 🎨 SUB-COMPONENTE: Item individual
// ════════════════════════════════════════════════════
function ItemCompra({ 
  item, seleccionado, cantidadEditada, color,
  onToggle, onEditarCantidad, onResetearEdicion 
}) {
  const cantidadFinal = cantidadEditada !== undefined 
    ? cantidadEditada 
    : item.cantidadSugerida
  
  const costoFinal = cantidadFinal * item.precioUnitario
  const fueEditado = cantidadEditada !== undefined
  
  const colorBorde = {
    red: seleccionado ? 'border-red-400 bg-red-50' : 'border-red-200',
    orange: seleccionado ? 'border-orange-400 bg-orange-50' : 'border-orange-200',
    emerald: seleccionado ? 'border-emerald-400 bg-emerald-50' : 'border-emerald-200'
  }
  
  return (
    <div className={`border-2 rounded-xl p-4 transition-all ${colorBorde[color]}`}>
      <div className="flex items-start gap-3">
        <button
          onClick={onToggle}
          className={`mt-1 w-6 h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-all ${
            seleccionado
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'border-gray-300 hover:border-emerald-400'
          }`}
        >
          {seleccionado && '✓'}
        </button>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h4 className="font-bold text-gray-800">{item.nombre}</h4>
            <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
              {item.etiquetaFuente}
            </span>
            {!item.tieneProveedor && (
              <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded-full font-bold">
                ⚠️ Sin proveedor
              </span>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm mb-3">
            <div>
              <span className="text-gray-500">Stock:</span>{' '}
              <span className="font-semibold">{item.stockActual} {item.unidadStock}</span>
            </div>
            <div>
              <span className="text-gray-500">Consumo/semana:</span>{' '}
              <span className="font-semibold">{item.consumoSemanal} {item.unidadStock}</span>
            </div>
            <div>
              <span className="text-gray-500">Quedan:</span>{' '}
              <span className={`font-bold ${
                item.diasCocinaRestantes < 2 ? 'text-red-600' :
                item.diasCocinaRestantes < 5 ? 'text-orange-600' :
                'text-emerald-600'
              }`}>
                {item.diasCocinaRestantes === Infinity ? '∞' : `${item.diasCocinaRestantes} días`}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3 mb-2">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">💡 Comprar:</span>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={cantidadFinal}
                  onChange={e => onEditarCantidad(e.target.value)}
                  className={`w-24 px-2 py-1 border-2 rounded font-bold text-center ${
                    fueEditado 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-300'
                  }`}
                />
                <span className="text-sm font-semibold text-gray-600">{item.unidadStock}</span>
                {fueEditado && (
                  <button
                    onClick={onResetearEdicion}
                    className="text-xs text-blue-600 hover:text-blue-800 underline"
                    title="Volver a la sugerencia automática"
                  >
                    ↺ Resetear
                  </button>
                )}
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500">Costo estimado:</div>
                <div className="font-bold text-blue-600">{formatearRD(costoFinal)}</div>
              </div>
            </div>
          </div>
          
          {item.tieneProveedor && (
            <div className="text-sm text-gray-600 flex items-center gap-2">
              🏪 <span className="font-semibold">{item.proveedor.nombre}</span>
              {item.proveedor.telefono && (
                <a 
                  href={`tel:${item.proveedor.telefono}`}
                  className="text-emerald-600 hover:text-emerald-800 text-xs"
                >
                  📞 {item.proveedor.telefono}
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}