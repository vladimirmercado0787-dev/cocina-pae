import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const COLOR_OP = '#7F77DD'
const COLOR_OP_BG = '#AFA9EC'
const COLOR_OP_DARKER = '#3C3489'
const COLOR_OP_CLARO = '#EEEDFE'

const ICONOS_POR_TIPO = {
  pesaje_crudo_aprobado: '🥣', pesaje_crudo_editado: '✏️',
  pesaje_cocido_aprobado: '🍲', pesaje_cocido_editado: '✏️',
  pesaje_sobrante_aprobado: '🍱', pesaje_sobrante_editado: '✏️',
  escuela_iniciada: '🏫', escuela_sin_clase: '🚫', escuela_lista: '✅',
  escuela_despachada: '🚚', escuela_entregada: '📦',
  conduce_firmado: '✍️', dia_cerrado: '🔒',
  empleado_creado: '👤', empleado_editado: '✏️', empleado_eliminado: '🗑️',
  escuela_creada: '🏫', escuela_editada: '✏️', escuela_desactivada: '🚫',
  receta_creada: '🍽️', receta_editada: '✏️',
  ingrediente_creado: '🥕', ingrediente_editado: '✏️',
  precio_ingrediente_cambiado: '💲',
  componente_creado: '🍛', componente_editado: '✏️',
  config_empresa_editada: '⚙️', permisos_cambiados: '🔐',
  gasto_registrado: '💸', gasto_editado: '✏️', gasto_eliminado: '🗑️',
  proveedor_creado: '🏪', proveedor_editado: '✏️',
  stock_ajustado: '📦',
  factura_generada: '🧾', factura_anulada: '❌', ncf_asignado: '🔢',
  pago_nomina_registrado: '💰', pago_nomina_editado: '✏️',
  login: '🔓', logout: '🔒', cambio_password: '🔑', cambio_usuario: '🔄',
}

const COLOR_POR_CATEGORIA = {
  operativa: { bg: '#378ADD', light: '#85B7EB', dark: '#0C447C', claro: '#E6F1FB' },
  sensible:  { bg: '#BA7517', light: '#FAC775', dark: '#633806', claro: '#FAEEDA' },
  critica:   { bg: '#E24B4A', light: '#F4C0D1', dark: '#A32D2D', claro: '#FCEBEB' },
  sistema:   { bg: '#888780', light: '#C5C5BE', dark: '#3D3D38', claro: '#F1EFE8' },
}

const LABEL_CATEGORIA = {
  operativa: 'Operativa', sensible: 'Sensible', critica: 'Crítica', sistema: 'Sistema',
}

export default function VistaHistorial({ usuario, empresaId, onVolver }) {
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [filtroFecha, setFiltroFecha] = useState('hoy')
  const [filtroCategoria, setFiltroCategoria] = useState('todas')
  const [filtroUsuario, setFiltroUsuario] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  const [usuariosLista, setUsuariosLista] = useState([])

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'

  const esAdmin = usuario?.rol === 'propietario' || usuario?.rol === 'administrador'

  useEffect(() => {
    cargarHistorial()
    cargarUsuarios()
  }, [filtroFecha, filtroCategoria, filtroUsuario])

  async function cargarUsuarios() {
    if (!esAdmin) return
    const { data } = await supabase.from('usuarios').select('id, nombre').eq('empresa_id', empresaId).order('nombre')
    setUsuariosLista(data || [])
  }

  async function cargarHistorial() {
    try {
      setCargando(true)
      setError(null)
      let query = supabase.from('historial_actividad').select('*').eq('empresa_id', empresaId).order('fecha_hora', { ascending: false }).limit(500)
      if (!esAdmin) query = query.eq('user_id', usuario.id)
      if (filtroFecha !== 'todo') {
        const ahora = new Date()
        let desde = new Date()
        if (filtroFecha === 'hoy') desde.setHours(0, 0, 0, 0)
        else if (filtroFecha === '7dias') desde.setDate(ahora.getDate() - 7)
        else if (filtroFecha === '30dias') desde.setDate(ahora.getDate() - 30)
        query = query.gte('fecha_hora', desde.toISOString())
      }
      if (filtroCategoria !== 'todas') query = query.eq('categoria', filtroCategoria)
      if (esAdmin && filtroUsuario !== 'todos') query = query.eq('user_id', filtroUsuario)
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

  const registrosFiltrados = registros.filter(r => {
    if (!busqueda.trim()) return true
    const q = busqueda.toLowerCase()
    return (r.descripcion?.toLowerCase().includes(q) || r.user_nombre?.toLowerCase().includes(q) || r.tipo_accion?.toLowerCase().includes(q) || r.entidad?.toLowerCase().includes(q))
  })

  const registrosAgrupados = registrosFiltrados.reduce((acc, r) => {
    const fecha = new Date(r.fecha_hora).toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    if (!acc[fecha]) acc[fecha] = []
    acc[fecha].push(r)
    return acc
  }, {})

  function formatearHora(fh) { return new Date(fh).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) }

  const totalRegistros = registrosFiltrados.length
  const porCategoria = registrosFiltrados.reduce((acc, r) => { acc[r.categoria] = (acc[r.categoria] || 0) + 1; return acc }, {})

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        <div style={{
          background: esTropical ? `linear-gradient(135deg, ${COLOR_OP_CLARO} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${COLOR_OP}25 0%, ${COLOR_OP}10 100%)`,
          border: esTropical ? `1.5px solid ${COLOR_OP_BG}` : `1px solid ${COLOR_OP}55`,
          borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
          boxShadow: esTropical ? `0 2px 12px ${COLOR_OP}15` : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: esTropical ? COLOR_OP : `${COLOR_OP}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: esTropical ? `0 4px 12px ${COLOR_OP}40` : 'none' }}>📜</div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '10px', color: esTropical ? COLOR_OP : `${COLOR_OP}CC`, letterSpacing: '1.5px', fontWeight: 600 }}>AUDITORÍA</div>
              <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? COLOR_OP_DARKER : 'var(--color-text-primary)', lineHeight: 1.2 }}>Historial de Actividades</div>
              <div style={{ fontSize: '12px', color: esTropical ? COLOR_OP : `${COLOR_OP}CC`, marginTop: '4px', fontWeight: 500 }}>
                {esAdmin ? '🔓 Modo administrador · Viendo todas las acciones' : '🔒 Viendo solo tus propias acciones'}
              </div>
            </div>
          </div>
        </div>

        {/* FILTROS */}
        <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '14px', padding: '16px', marginBottom: '16px', boxShadow: 'var(--modulo-sombra)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <span style={{ fontSize: '14px' }}>🔍</span>
            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600 }}>FILTROS</span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>PERÍODO</label>
              <select value={filtroFecha} onChange={(e) => setFiltroFecha(e.target.value)} style={selectStyle()}>
                <option value="hoy">Hoy</option>
                <option value="7dias">Últimos 7 días</option>
                <option value="30dias">Últimos 30 días</option>
                <option value="todo">Todo el historial</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>CATEGORÍA</label>
              <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={selectStyle()}>
                <option value="todas">Todas</option>
                <option value="operativa">🔵 Operativa</option>
                <option value="sensible">🟡 Sensible</option>
                <option value="critica">🔴 Crítica</option>
                <option value="sistema">⚙️ Sistema</option>
              </select>
            </div>
            {esAdmin && (
              <div>
                <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>USUARIO</label>
                <select value={filtroUsuario} onChange={(e) => setFiltroUsuario(e.target.value)} style={selectStyle()}>
                  <option value="todos">Todos</option>
                  {usuariosLista.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                </select>
              </div>
            )}
            <div>
              <label style={{ display: 'block', fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }}>BUSCAR</label>
              <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Descripción, usuario..."
                style={{ width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--color-border-subtle)' }}>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>📊 Mostrando:</span>
            <span style={{ background: esTropical ? '#F1EFE8' : 'var(--color-bg-elevated)', color: 'var(--color-text-secondary)', padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600 }}>
              {totalRegistros} registro(s)
            </span>
            {Object.entries(porCategoria).map(([cat, count]) => {
              const c = COLOR_POR_CATEGORIA[cat]
              return (
                <span key={cat} style={{ background: esTropical ? c.claro : `${c.bg}25`, color: esTropical ? c.dark : c.light, padding: '4px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: `1px solid ${c.bg}40` }}>
                  {LABEL_CATEGORIA[cat]}: {count}
                </span>
              )
            })}
          </div>
        </div>

        {/* LISTA */}
        <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '14px', padding: '16px', boxShadow: 'var(--modulo-sombra)' }}>
          {cargando ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>📜</div>
              <p>Cargando historial...</p>
            </div>
          ) : error ? (
            <div style={{ background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.12)', border: '1px solid rgba(226, 75, 74, 0.4)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
              <p style={{ color: esTropical ? '#A32D2D' : '#F4C0D1', fontWeight: 600 }}>❌ Error: {error}</p>
            </div>
          ) : registrosFiltrados.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>📭</div>
              <p style={{ color: 'var(--color-text-primary)', fontSize: '15px', fontWeight: 600 }}>No hay actividad registrada</p>
              <p style={{ fontSize: '12px', marginTop: '4px' }}>
                {busqueda ? 'Prueba con otros términos' : 'Las acciones aparecerán aquí'}
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {Object.entries(registrosAgrupados).map(([fecha, items]) => (
                <div key={fecha}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px', paddingBottom: '8px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                    📅 {fecha} <span style={{ opacity: 0.6 }}>· {items.length} acción(es)</span>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {items.map(r => {
                      const icono = ICONOS_POR_TIPO[r.tipo_accion] || '📝'
                      const c = COLOR_POR_CATEGORIA[r.categoria] || COLOR_POR_CATEGORIA.sistema
                      return (
                        <div key={r.id} style={{
                          background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)',
                          border: '1px solid var(--color-border-subtle)',
                          borderLeft: `4px solid ${c.bg}`,
                          borderRadius: '10px', padding: '12px 14px',
                        }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                            <div style={{ fontSize: '22px', flexShrink: 0 }}>{icono}</div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{r.descripcion}</span>
                                <span style={{ background: esTropical ? c.claro : `${c.bg}25`, color: esTropical ? c.dark : c.light, padding: '3px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 600, border: `1px solid ${c.bg}40` }}>
                                  {LABEL_CATEGORIA[r.categoria]}
                                </span>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', fontSize: '11px', color: 'var(--color-text-muted)', flexWrap: 'wrap' }}>
                                <span>🕐 {formatearHora(r.fecha_hora)}</span>
                                <span>·</span>
                                <span>👤 <strong style={{ color: 'var(--color-text-secondary)' }}>{r.user_nombre}</strong> ({r.user_rol})</span>
                                {r.entidad && (<><span>·</span><span style={{ opacity: 0.7 }}>{r.entidad}</span></>)}
                              </div>
                              {(r.cambios_antes || r.cambios_despues) && (
                                <details style={{ marginTop: '6px' }}>
                                  <summary style={{ fontSize: '11px', color: 'var(--color-text-muted)', cursor: 'pointer' }}>Ver detalles de cambios</summary>
                                  <div style={{ marginTop: '6px', fontSize: '10px', background: esTropical ? '#F1EFE8' : 'var(--color-bg-card)', borderRadius: '6px', padding: '8px', fontFamily: 'monospace' }}>
                                    {r.cambios_antes && (
                                      <div style={{ color: esTropical ? '#A32D2D' : '#F4C0D1' }}>
                                        <strong>Antes:</strong> {JSON.stringify(r.cambios_antes)}
                                      </div>
                                    )}
                                    {r.cambios_despues && (
                                      <div style={{ color: esTropical ? '#04342C' : '#5DCAA5', marginTop: '4px' }}>
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
    </div>
  )
}

function ToggleTema({ tema, setTema }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '3px', gap: '2px' }}>
      <button onClick={() => setTema('oscuro')} style={tabTemaStyle(tema === 'oscuro')}>
        <span style={{ fontSize: '11px' }}>🌙</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
      </button>
      <button onClick={() => setTema('tropical')} style={tabTemaStyle(tema === 'tropical')}>
        <span style={{ fontSize: '11px' }}>☀️</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
      </button>
    </div>
  )
}

function btnVolver() {
  return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
}

function selectStyle() {
  return { width: '100%', boxSizing: 'border-box', padding: '8px 12px', background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }
}

function tabTemaStyle(activo) {
  return { background: activo ? 'var(--gradient-toggle-active)' : 'transparent', border: 'none', borderRadius: '16px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }
}