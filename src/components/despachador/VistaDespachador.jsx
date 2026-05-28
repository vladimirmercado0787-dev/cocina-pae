import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalEntregarYFirmar from './ModalEntregarYFirmar'
import ModalPesarYDespachar from './ModalPesarYDespachar'
import ModalPesarSobrante from './ModalPesarSobrante'

const COLOR_DESPACHADOR = '#D85A30'
const COLOR_DESPACHADOR_BG = '#E89042'
const COLOR_DESPACHADOR_DARKER = '#7A2F12'
const COLOR_DESPACHADOR_CLARO = '#FCE9DA'

const ESTADOS_DESPACHADOR = {
  pendiente:    { label: 'Pendiente',   color: '#888780', bg: 'rgba(136, 135, 128, 0.15)', emoji: '⏳' },
  preparando:   { label: 'En cocina',   color: '#BA7517', bg: 'rgba(186, 117, 23, 0.15)',   emoji: '🍳' },
  lista:        { label: 'Lista',        color: '#378ADD', bg: 'rgba(55, 138, 221, 0.15)',  emoji: '✅' },
  despachando:  { label: 'En camino',   color: '#D85A30', bg: 'rgba(216, 90, 48, 0.15)',   emoji: '🚚' },
  entregada:    { label: 'Entregada',   color: '#1D9E75', bg: 'rgba(29, 158, 117, 0.15)',  emoji: '🎉' },
  cerrada:      { label: 'Cerrada',     color: '#534AB7', bg: 'rgba(83, 74, 183, 0.15)',   emoji: '🔒' },
  sin_clase:    { label: 'Sin clase',   color: '#888780', bg: 'rgba(136, 135, 128, 0.15)', emoji: '🚫' }
}

function VistaDespachador({ usuario, empresaId, onCerrarSesion, onCambiarUsuario, onVolver }) {
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [recetaHoy, setRecetaHoy] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [horaActual, setHoraActual] = useState(new Date())
  const [empresa, setEmpresa] = useState(null)
  const [modalFirma, setModalFirma] = useState(null)
  const [modalPesaje, setModalPesaje] = useState(null)
  const [modalSobrante, setModalSobrante] = useState(null)
  const [procesando, setProcesando] = useState(false)

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const esTropical = tema === 'tropical'

  useEffect(() => {
    const interval = setInterval(() => setHoraActual(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    const { data: empresaData } = await supabase.from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)
    const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const diaSemana = DIAS[new Date().getDay()]
    const { data: receta } = await supabase.from('recetas').select('*').eq('empresa_id', empresaId).eq('dia_semana', diaSemana).maybeSingle()
    setRecetaHoy(receta)
    const { data: escuelasData } = await supabase.from('escuelas').select('*').eq('empresa_id', empresaId).eq('activa', true).order('nombre', { ascending: true })
    setEscuelas(escuelasData || [])
    const fechaHoy = new Date().toISOString().split('T')[0]
    const { data: opsData } = await supabase.from('operaciones_dia').select('*').eq('empresa_id', empresaId).eq('fecha', fechaHoy)
    setOperaciones(opsData || [])
    setCargando(false)
  }

  async function marcarLista(operacion) {
    setProcesando(true)
    const { error } = await supabase.from('operaciones_dia').update({
      estado: 'lista', hora_lista: new Date().toISOString(), updated_at: new Date().toISOString()
    }).eq('id', operacion.id)
    if (error) { alert('Error: ' + error.message); setProcesando(false); return }
    await cargarDatos()
    setProcesando(false)
  }

  function getOperacion(escuelaId) { return operaciones.find(op => op.escuela_id === escuelaId) }

  function confirmarCerrarSesion() {
    const confirmar = window.confirm('¿Estás seguro de cerrar sesión?')
    if (confirmar && onCerrarSesion) onCerrarSesion()
  }

  const entregadas = operaciones.filter(op => op.estado === 'entregada' || op.estado === 'cerrada').length
  const enCamino = operaciones.filter(op => op.estado === 'despachando').length
  const sinClaseCount = operaciones.filter(op => op.estado === 'sin_clase').length
  const pendientes = escuelas.length - entregadas - enCamino - sinClaseCount
  const horaFormateada = horaActual.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '16px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: '480px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
          <button onClick={onVolver} style={{
            background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
            borderRadius: '20px', padding: '8px 14px',
            color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            ← Dashboard
          </button>
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
        </div>

        {/* TÍTULO MODO DESPACHO */}
        <div style={{
          background: esTropical ? `linear-gradient(135deg, ${COLOR_DESPACHADOR_CLARO} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${COLOR_DESPACHADOR}25 0%, ${COLOR_DESPACHADOR}10 100%)`,
          border: esTropical ? `1.5px solid ${COLOR_DESPACHADOR_BG}` : `1px solid ${COLOR_DESPACHADOR}55`,
          borderRadius: '18px', padding: '18px 20px', marginBottom: '16px',
          display: 'flex', alignItems: 'center', gap: '14px', justifyContent: 'space-between',
          boxShadow: esTropical ? `0 2px 12px ${COLOR_DESPACHADOR}15` : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              background: esTropical ? COLOR_DESPACHADOR : `${COLOR_DESPACHADOR}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px',
              boxShadow: esTropical ? `0 4px 12px ${COLOR_DESPACHADOR}40` : 'none',
            }}>🚚</div>
            <div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: esTropical ? COLOR_DESPACHADOR_DARKER : 'var(--color-text-primary)', lineHeight: 1.2 }}>
                Hola, {usuario.nombre.split(' ')[0]}
              </div>
              <div style={{ fontSize: '11px', color: esTropical ? COLOR_DESPACHADOR : `${COLOR_DESPACHADOR}CC`, marginTop: '2px', fontWeight: 600 }}>
                MODO DESPACHO
              </div>
            </div>
          </div>
          <div style={{ fontSize: '24px', fontWeight: 600, color: esTropical ? COLOR_DESPACHADOR_DARKER : 'var(--color-text-primary)', fontFamily: 'monospace' }}>
            {horaFormateada}
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: '16px' }}>
          <StatCard label="PENDIENTES" valor={pendientes} color="#888780" />
          <StatCard label="EN CAMINO" valor={enCamino} color={COLOR_DESPACHADOR} />
          <StatCard label="ENTREGADAS" valor={entregadas} color="#1D9E75" />
        </div>

        {/* RECETA HOY */}
        {recetaHoy && (
          <div style={{
            background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
            borderLeft: `4px solid ${COLOR_DESPACHADOR}`,
            borderRadius: '12px', padding: '14px 16px', marginBottom: '16px',
            display: 'flex', alignItems: 'center', gap: '12px', boxShadow: 'var(--modulo-sombra)',
          }}>
            <span style={{ fontSize: '38px' }}>{recetaHoy.emoji}</span>
            <div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '1px' }}>HOY ENTREGAS</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '2px' }}>{recetaHoy.nombre}</div>
            </div>
          </div>
        )}

        {/* ENTREGAS */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px', paddingLeft: '4px' }}>
          <span style={{ fontSize: '14px' }}>🏫</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600 }}>
            TUS ENTREGAS DE HOY
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {escuelas.map((escuela, i) => {
            const op = getOperacion(escuela.id)
            const estado = op ? ESTADOS_DESPACHADOR[op.estado] : ESTADOS_DESPACHADOR.pendiente

            return (
              <div key={escuela.id} style={{
                background: 'var(--color-modulo-bg)',
                border: '1px solid var(--color-modulo-border)',
                borderRadius: '14px', overflow: 'hidden',
                boxShadow: 'var(--modulo-sombra)',
              }}>
                <div style={{ padding: '16px', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '50%',
                      background: esTropical ? 'rgba(55, 138, 221, 0.15)' : 'rgba(55, 138, 221, 0.2)',
                      color: '#378ADD',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '15px', fontWeight: 600, flexShrink: 0,
                    }}>{i + 1}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
                        {escuela.nombre}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: '#378ADD' }}>
                          {escuela.raciones_contractuales} raciones
                        </span>
                        <span style={{
                          fontSize: '10px', padding: '3px 8px', borderRadius: '10px',
                          background: estado.bg, color: estado.color, fontWeight: 600,
                        }}>
                          {estado.emoji} {estado.label}
                        </span>
                      </div>
                    </div>
                  </div>

                  {escuela.director_nombre && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '10px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      <span>👤</span>
                      <span style={{ fontWeight: 500 }}>{escuela.director_nombre}</span>
                      {escuela.director_telefono && (
                        <a href={`tel:${escuela.director_telefono}`} style={{
                          marginLeft: 'auto',
                          background: 'rgba(29, 158, 117, 0.15)', color: '#1D9E75',
                          padding: '4px 10px', borderRadius: '10px',
                          fontSize: '10px', fontWeight: 600, textDecoration: 'none',
                        }}>
                          📞 Llamar
                        </a>
                      )}
                    </div>
                  )}

                  {escuela.direccion && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '6px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                      <span>📍</span>
                      <span>{escuela.direccion}</span>
                      {escuela.distancia_km && (
                        <span style={{ marginLeft: 'auto', color: '#378ADD', fontWeight: 600 }}>{escuela.distancia_km} km</span>
                      )}
                    </div>
                  )}

                  {op?.razon_no_clase && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--color-text-muted)', background: 'var(--color-bg-elevated)', padding: '6px 10px', borderRadius: '8px', fontStyle: 'italic' }}>
                      📝 {op.razon_no_clase}
                    </div>
                  )}

                  {op?.peso_cocido_lb && (
                    <div style={{ marginTop: '8px', fontSize: '11px', color: '#378ADD', fontWeight: 600, background: esTropical ? '#E6F1FB' : 'rgba(55, 138, 221, 0.1)', padding: '6px 10px', borderRadius: '8px' }}>
                      ⚖️ Pesaje cocido: {op.peso_cocido_lb} lb
                    </div>
                  )}
                </div>

                <div style={{ padding: '12px 16px', background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)' }}>
                  {!op && (
                    <div style={{ textAlign: 'center', padding: '6px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
                      Aún no se ha iniciado esta operación
                    </div>
                  )}

                  {op?.estado === 'preparando' && (
                    <button onClick={() => marcarLista(op)} disabled={procesando} style={botonAccion('#378ADD', esTropical)}>
                      ✅ Marcar como Lista para Despachar
                    </button>
                  )}

                  {op?.estado === 'lista' && (
                    <button onClick={() => setModalPesaje({ operacion: op, escuela })} style={botonAccion(COLOR_DESPACHADOR, esTropical)}>
                      ⚖️ Pesar y Despachar
                    </button>
                  )}

                  {op?.estado === 'despachando' && (
                    <button onClick={() => setModalFirma({ operacion: op, escuela })} style={botonAccion('#1D9E75', esTropical)}>
                      📍 Llegué - Firmar conduce
                    </button>
                  )}

                  {op?.estado === 'entregada' && (
                    <>
                      <div style={{ textAlign: 'center', padding: '6px', marginBottom: '8px' }}>
                        <p style={{ color: '#1D9E75', fontWeight: 600, fontSize: '13px', margin: 0 }}>🎉 Entregada exitosamente</p>
                        {op.hora_entrega && (
                          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                            {new Date(op.hora_entrega).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                            {op.director_firma && ' · ✍️ Director firmó'}
                          </p>
                        )}
                        {op.firmado_por_nombre && (
                          <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                            Recibido por: <strong>{op.firmado_por_nombre}</strong>
                          </p>
                        )}
                      </div>
                      <button onClick={() => setModalSobrante({ operacion: op, escuela })} style={botonAccion('#534AB7', esTropical)}>
                        🍱 Pesar sobrante y cerrar
                      </button>
                    </>
                  )}

                  {op?.estado === 'cerrada' && (
                    <div style={{ textAlign: 'center', padding: '8px' }}>
                      <p style={{ color: '#534AB7', fontWeight: 600, fontSize: '13px', margin: 0 }}>🔒 Día cerrado</p>
                      {op.hora_regreso && (
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          Cierre: {new Date(op.hora_regreso).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      )}
                      {op.firmado_por_nombre && (
                        <p style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                          Recibido por: <strong>{op.firmado_por_nombre}</strong>
                        </p>
                      )}
                    </div>
                  )}

                  {op?.estado === 'sin_clase' && (
                    <div style={{ textAlign: 'center', padding: '8px', background: 'rgba(136, 135, 128, 0.1)', borderRadius: '8px', fontSize: '12px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                      🚫 Sin clase hoy
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {entregadas === escuelas.length && escuelas.length > 0 && (
          <div style={{
            marginTop: '16px',
            background: esTropical ? '#E6F7EF' : 'rgba(29, 158, 117, 0.15)',
            border: esTropical ? '1px solid #1D9E75' : '1px solid rgba(29, 158, 117, 0.4)',
            borderLeft: '4px solid #1D9E75',
            borderRadius: '14px', padding: '20px', textAlign: 'center',
            boxShadow: 'var(--modulo-sombra)',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>🏆</div>
            <p style={{ fontWeight: 600, color: esTropical ? '#04342C' : '#5DCAA5', fontSize: '15px', margin: 0 }}>
              ¡Todas las entregas completadas!
            </p>
            <p style={{ fontSize: '12px', color: esTropical ? '#0F6E56' : 'var(--color-text-secondary)', marginTop: '4px' }}>
              Excelente trabajo {usuario.nombre.split(' ')[0]} 💪
            </p>
          </div>
        )}

        {/* FOOTER */}
        <div style={{
          marginTop: '20px', paddingTop: '16px',
          borderTop: '1px solid var(--color-border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '8px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '12px' }}>🇩🇴</span>
            <span style={{ color: 'var(--color-text-accent)', opacity: 0.85, fontSize: '10px', fontWeight: 600 }}>
              Andamio · Despacho
            </span>
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={onCambiarUsuario} style={btnFooter()}>🔄 Cambiar</button>
            <button onClick={confirmarCerrarSesion} style={btnFooterRed(esTropical)}>🚪 Cerrar</button>
          </div>
        </div>
      </div>

      {/* Modales */}
      {modalPesaje && (
        <ModalPesarYDespachar operacion={modalPesaje.operacion} empresaId={empresaId} usuario={usuario}
          onCerrar={() => setModalPesaje(null)} onDespachado={() => { cargarDatos(); setModalPesaje(null) }} />
      )}
      {modalFirma && (
        <ModalEntregarYFirmar operacion={modalFirma.operacion} escuela={modalFirma.escuela} recetaHoy={recetaHoy}
          empresa={empresa} usuario={usuario} onCerrar={() => setModalFirma(null)}
          onGuardado={() => { cargarDatos(); setModalFirma(null) }} />
      )}
      {modalSobrante && (
        <ModalPesarSobrante operacion={modalSobrante.operacion} empresaId={empresaId} usuario={usuario}
          onCerrar={() => setModalSobrante(null)} onCerrado={() => { cargarDatos(); setModalSobrante(null) }} />
      )}
    </div>
  )
}

function StatCard({ label, valor, color }) {
  return (
    <div style={{
      background: 'var(--color-modulo-bg)',
      border: '1px solid var(--color-modulo-border)',
      borderLeft: `4px solid ${color}`,
      borderRadius: '12px', padding: '10px', textAlign: 'center',
      boxShadow: 'var(--modulo-sombra)',
    }}>
      <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '1px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 600, color, marginTop: '4px' }}>{valor}</div>
    </div>
  )
}

function botonAccion(color, esTropical) {
  return {
    width: '100%', padding: '14px',
    background: `linear-gradient(135deg, ${color} 0%, ${color}DD 100%)`,
    border: 'none', borderRadius: '12px',
    color: 'white', fontSize: '14px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
    boxShadow: esTropical ? `0 4px 12px ${color}40` : 'none',
  }
}

function tabTemaStyle(activo) {
  return {
    background: activo ? 'var(--gradient-toggle-active)' : 'transparent',
    border: 'none', borderRadius: '16px', padding: '6px 10px',
    display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
  }
}

function btnFooter() {
  return {
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '14px', padding: '6px 12px',
    color: 'var(--color-text-secondary)',
    fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
  }
}

function btnFooterRed(esTropical) {
  return {
    background: esTropical ? '#FCEBEB' : 'rgba(244, 67, 54, 0.1)',
    border: esTropical ? '1px solid #E24B4A' : '1px solid rgba(244, 67, 54, 0.3)',
    borderRadius: '14px', padding: '6px 12px',
    color: esTropical ? '#A32D2D' : '#F4C0D1',
    fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500,
  }
}

export default VistaDespachador