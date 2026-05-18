// src/components/historial/VistaHistorial.jsx
// Vista de Historial de Actividades — Cocina PAE
// Filosofía: "¿Quién hizo qué y cuándo?"

import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

// Iconos por tipo de acción
const ICONOS_POR_TIPO = {
  // Operativas
  pesaje_crudo_aprobado: '🥣',
  pesaje_crudo_editado: '✏️',
  pesaje_cocido_aprobado: '🍲',
  pesaje_cocido_editado: '✏️',
  pesaje_sobrante_aprobado: '🍱',
  pesaje_sobrante_editado: '✏️',
  escuela_iniciada: '🏫',
  escuela_sin_clase: '🚫',
  escuela_lista: '✅',
  escuela_despachada: '🚚',
  escuela_entregada: '📦',
  conduce_firmado: '✍️',
  dia_cerrado: '🔒',
  // Sensibles
  empleado_creado: '👤',
  empleado_editado: '✏️',
  empleado_eliminado: '🗑️',
  escuela_creada: '🏫',
  escuela_editada: '✏️',
  escuela_desactivada: '🚫',
  receta_creada: '🍽️',
  receta_editada: '✏️',
  ingrediente_creado: '🥕',
  ingrediente_editado: '✏️',
  precio_ingrediente_cambiado: '💲',
  componente_creado: '🍛',
  componente_editado: '✏️',
  config_empresa_editada: '⚙️',
  permisos_cambiados: '🔐',
  gasto_registrado: '💸',
  gasto_editado: '✏️',
  gasto_eliminado: '🗑️',
  proveedor_creado: '🏭',
  proveedor_editado: '✏️',
  stock_ajustado: '📦',
  // Críticas
  factura_generada: '🧾',
  factura_anulada: '❌',
  ncf_asignado: '🔢',
  pago_nomina_registrado: '💰',
  pago_nomina_editado: '✏️',
  // Sistema
  login: '🔓',
  logout: '🔒',
  cambio_password: '🔑',
  cambio_usuario: '🔄',
}

const COLOR_POR_CATEGORIA = {
  operativa: 'bg-blue-100 text-blue-800 border-blue-300',
  sensible: 'bg-amber-100 text-amber-800 border-amber-300',
  critica: 'bg-red-100 text-red-800 border-red-300',
  sistema: 'bg-gray-100 text-gray-700 border-gray-300',
}

const LABEL_CATEGORIA = {
  operativa: 'Operativa',
  sensible: 'Sensible',
  critica: 'Crítica',
  sistema: 'Sistema',
}

export default function VistaHistorial({ usuario, empresaId, onVolver }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  
  // Filtros
  const [filtroFecha, setFiltroFecha] = useState('hoy') // hoy, 7dias, 30dias, todo
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroUsuario, setFiltroUsuario] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [usuariosLista, setUsuariosLista] = useState([])
  
  // Detección de permiso (admin/propietario ven TODO)
  const esAdmin = usuario?.rol === 'propietario' || usuario?.rol === 'administrador'

  useEffect(() => {
    cargarHistorial()
    cargarUsuarios()
  }, [filtroFecha, filtroCategoria, filtroUsuario])

  async function cargarUsuarios() {
    // Solo admins ven la lista para filtrar
    if (!esAdmin) return
    
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre')
      .eq('empresa_id', empresaId)
      .order('nombre')
    
    setUsuariosLista(data || [])
  }

  async function cargarHistorial() {
    try {
      setCargando(true)
      setError(null)

      let query = supabase
        .from('historial_actividad')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('fecha_hora', { ascending: false })
        .limit(500)

      // Si NO es admin → solo sus propias acciones
      if (!esAdmin) {
        query = query.eq('user_id', usuario.id)
      }

      // Filtro de fecha
      if (filtroFecha !== 'todo') {
        const ahora = new Date()
        let desde = new Date()
        if (filtroFecha === 'hoy') {
          desde.setHours(0, 0, 0, 0)
        } else if (filtroFecha === '7dias') {
          desde.setDate(ahora.getDate() - 7)
        } else if (filtroFecha === '30dias') {
          desde.setDate(ahora.getDate() - 30)
        }
        query = query.gte('fecha_hora', desde.toISOString())
      }

      // Filtro de categoría
      if (filtroCategoria !== 'todas') {
        query = query.eq('categoria', filtroCategoria)
      }

      // Filtro de usuario (solo admin)
      if (esAdmin && filtroUsuario !== 'todos') {
        query = query.eq('user_id', filtroUsuario)
      }

      const { data, error: errQuery } = await query

      if (errQuery) throw errQuery
      setRegistros(data || [])
    } catch (err) {
      console.error('Error cargando historial:', err)
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  // Filtro por búsqueda (en cliente)
  const registrosFiltrados = registros.filter(r => {
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (
      r.descripcion?.toLowerCase().includes(q) ||
      r.user_nombre?.toLowerCase().includes(q) ||
      r.tipo_accion?.toLowerCase().includes(q) ||
      r.entidad?.toLowerCase().includes(q)
    )
  })

  // Agrupar por fecha
  const registrosAgrupados = registrosFiltrados.reduce((acc, r) => {
    const fecha = new Date(r.fecha_hora).toLocaleDateString('es-DO', { 
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
    })
    if (!acc[fecha]) acc[fecha] = []
    acc[fecha].push(r)
    return acc
  }, {})

  function formatearHora(fechaHora) {
    return new Date(fechaHora).toLocaleTimeString('es-DO', { 
      hour: '2-digit', minute: '2-digit' 
    })
  }

  // Estadísticas
  const totalRegistros = registrosFiltrados.length
  const porCategoria = registrosFiltrados.reduce((acc, r) => {
    acc[r.categoria] = (acc[r.categoria] || 0) + 1
    return acc
  }, {})

  return (
    <div className="w-full max-w-5xl">
      
      {/* Header */}
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <p className="text-slate-300 text-xs font-semibold tracking-wider">AUDITORÍA</p>
            <h2 className="text-3xl font-bold mt-1 flex items-center gap-2">
              📜 Historial de Actividades
            </h2>
            <p className="text-slate-300 text-sm mt-1">
              {esAdmin 
                ? '🔓 Modo administrador · Viendo todas las acciones de la empresa' 
                : '🔒 Viendo solo tus propias acciones'
              }
            </p>
          </div>
          {onVolver && (
            <button 
              onClick={onVolver}
              className="bg-white/20 hover:bg-white/30 text-white text-sm font-bold px-4 py-2 rounded-lg border border-white/30"
            >
              ← Volver
            </button>
          )}
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
          🔍 FILTROS
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
          
          {/* Filtro fecha */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Período</label>
            <select
              value={filtroFecha}
              onChange={(e) => setFiltroFecha(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="hoy">Hoy</option>
              <option value="7dias">Últimos 7 días</option>
              <option value="30dias">Últimos 30 días</option>
              <option value="todo">Todo el historial</option>
            </select>
          </div>

          {/* Filtro categoría */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Categoría</label>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            >
              <option value="todas">Todas</option>
              <option value="operativa">🔵 Operativa</option>
              <option value="sensible">🟡 Sensible</option>
              <option value="critica">🔴 Crítica</option>
              <option value="sistema">⚙️ Sistema</option>
            </select>
          </div>

          {/* Filtro usuario (solo admin) */}
          {esAdmin && (
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Usuario</label>
              <select
                value={filtroUsuario}
                onChange={(e) => setFiltroUsuario(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="todos">Todos los usuarios</option>
                {usuariosLista.map(u => (
                  <option key={u.id} value={u.id}>{u.nombre}</option>
                ))}
              </select>
            </div>
          )}

          {/* Búsqueda */}
          <div className={esAdmin ? '' : 'md:col-span-2'}>
            <label className="block text-xs font-semibold text-gray-700 mb-1">Buscar</label>
            <input
              type="text"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por descripción, usuario..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>
        </div>

        {/* Resumen de filtros */}
        <div className="flex gap-2 flex-wrap items-center">
          <span className="text-xs text-gray-500">📊 Mostrando:</span>
          <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
            {totalRegistros} registro(s)
          </span>
          {Object.entries(porCategoria).map(([cat, count]) => (
            <span key={cat} className={`text-xs font-bold px-3 py-1 rounded-full border ${COLOR_POR_CATEGORIA[cat]}`}>
              {LABEL_CATEGORIA[cat]}: {count}
            </span>
          ))}
        </div>
      </div>

      {/* Lista de registros */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        {cargando ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-3 animate-pulse">📜</div>
            <p>Cargando historial...</p>
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-center">
            <p className="text-red-800 font-bold">❌ Error: {error}</p>
          </div>
        ) : registrosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <div className="text-6xl mb-3">📭</div>
            <p className="font-bold text-gray-700">No hay actividad registrada</p>
            <p className="text-sm text-gray-500 mt-1">
              {busqueda 
                ? 'Prueba con otros términos de búsqueda' 
                : 'Las acciones de hoy aparecerán aquí'
              }
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(registrosAgrupados).map(([fecha, items]) => (
              <div key={fecha}>
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 sticky top-0 bg-white py-2 border-b">
                  📅 {fecha} <span className="text-gray-400">· {items.length} acción(es)</span>
                </h3>
                <div className="space-y-2">
                  {items.map(r => {
                    const icono = ICONOS_POR_TIPO[r.tipo_accion] || '📝'
                    return (
                      <div 
                        key={r.id}
                        className="border border-gray-200 rounded-xl p-3 hover:bg-gray-50 transition"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl flex-shrink-0">{icono}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="font-bold text-gray-900 text-sm">{r.descripcion}</p>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${COLOR_POR_CATEGORIA[r.categoria] || 'bg-gray-100'}`}>
                                {LABEL_CATEGORIA[r.categoria]}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-gray-500 flex-wrap">
                              <span>🕐 {formatearHora(r.fecha_hora)}</span>
                              <span>·</span>
                              <span>👤 <strong>{r.user_nombre}</strong> ({r.user_rol})</span>
                              {r.entidad && (
                                <>
                                  <span>·</span>
                                  <span className="text-gray-400">{r.entidad}</span>
                                </>
                              )}
                            </div>
                            
                            {/* Mostrar cambios si los hay */}
                            {(r.cambios_antes || r.cambios_despues) && (
                              <details className="mt-2">
                                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                                  Ver detalles de cambios
                                </summary>
                                <div className="mt-2 text-xs bg-gray-50 rounded p-2 font-mono">
                                  {r.cambios_antes && (
                                    <div className="text-red-600">
                                      <strong>Antes:</strong> {JSON.stringify(r.cambios_antes)}
                                    </div>
                                  )}
                                  {r.cambios_despues && (
                                    <div className="text-green-600 mt-1">
                                      <strong>Después:</strong> {JSON.stringify(r.cambios_despues)}
                                    </div>
                                  )}
                                </div>
                              </details>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}