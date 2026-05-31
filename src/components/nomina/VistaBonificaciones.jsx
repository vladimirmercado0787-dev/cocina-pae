import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalBonificacion from './ModalBonificacion'

const TIPOS_BONO_INFO = {
  navideño:        { label: 'Navideño',        icon: '🎄', color: '#1D9E75' },
  cumpleaños:      { label: 'Cumpleaños',      icon: '🎂', color: '#D4537E' },
  productividad:   { label: 'Productividad',   icon: '🏆', color: '#EF9F27' },
  reconocimiento:  { label: 'Reconocimiento',  icon: '⭐', color: '#7F77DD' },
  otro:            { label: 'Otro',            icon: '🎁', color: '#378ADD' },
}

function VistaBonificaciones({ empresaId, usuarioActual, onVolver }) {
  const [bonificaciones, setBonificaciones] = useState([])
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear())
  const [añosDisponibles, setAñosDisponibles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [bonoEditando, setBonoEditando] = useState(null)
  const [bonoVerDetalle, setBonoVerDetalle] = useState(null)

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  useEffect(() => {
    if (empresaId) cargarAños()
  }, [empresaId])

  useEffect(() => {
    if (empresaId && añoSeleccionado) cargarBonos()
  }, [empresaId, añoSeleccionado])

  async function cargarAños() {
    const { data } = await supabase
      .from('bonificaciones_extra')
      .select('año')
      .eq('empresa_id', empresaId)
      .order('año', { ascending: false })

    const años = [...new Set((data || []).map(b => b.año))]
    if (!años.includes(new Date().getFullYear())) años.push(new Date().getFullYear())
    setAñosDisponibles(años.sort((a, b) => b - a))
  }

  async function cargarBonos() {
    setCargando(true)
    const { data } = await supabase
      .from('bonificaciones_extra')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('año', añoSeleccionado)
      .order('fecha_pago', { ascending: false })
    setBonificaciones(data || [])
    setCargando(false)
  }

  function bonosPorTipo(tipo) {
    return bonificaciones
      .filter(b => b.tipo === tipo)
      .reduce((sum, b) => sum + parseFloat(b.monto_total || 0), 0)
  }

  const totalAño = bonificaciones.reduce((sum, b) => sum + parseFloat(b.monto_total || 0), 0)

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function formatearFecha(fecha) {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function abrirNuevo() {
    setBonoEditando(null)
    setModalAbierto(true)
  }

  function alGuardado() {
    setModalAbierto(false)
    setBonoEditando(null)
    cargarBonos()
    cargarAños()
  }

  // ─── ESTILOS ───
  const panel = {
    background: 'var(--color-modulo-bg)',
    border: '1px solid var(--color-modulo-border)',
    borderRadius: '14px', padding: '20px',
    boxShadow: 'var(--modulo-sombra)',
  }
  const sectionTitle = {
    fontSize: '11px', color: 'var(--color-text-muted)',
    letterSpacing: '1.5px', fontWeight: 600, marginBottom: '14px',
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg-primary)',
      position: 'relative', padding: '20px', color: 'var(--color-text-primary)',
    }}>
      <style>{`
        @keyframes vbSlideTop { 0% { opacity: 0; transform: translateY(-18px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes vbFadeUp { 0% { opacity: 0; transform: translateY(22px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* MODAL DE BONIFICACIÓN */}
      {modalAbierto && (
        <ModalBonificacion
          empresaId={empresaId}
          usuarioActual={usuarioActual}
          bonificacionExistente={bonoEditando}
          onCerrar={() => { setModalAbierto(false); setBonoEditando(null) }}
          onGuardado={alGuardado}
        />
      )}

      {/* MODAL DE DETALLE */}
      {bonoVerDetalle && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 95,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
        }}>
          <div style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border-accent)',
            borderRadius: '16px', maxWidth: '560px', width: '100%',
            maxHeight: '85vh', overflowY: 'auto',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px', borderBottom: '1px solid var(--color-border-subtle)',
            }}>
              <div>
                <div style={{ fontSize: '10px', color: TIPOS_BONO_INFO[bonoVerDetalle.tipo]?.color || '#1D9E75', letterSpacing: '1.5px', fontWeight: 600 }}>
                  {TIPOS_BONO_INFO[bonoVerDetalle.tipo]?.icon} {TIPOS_BONO_INFO[bonoVerDetalle.tipo]?.label?.toUpperCase()}
                </div>
                <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {bonoVerDetalle.titulo}
                </div>
              </div>
              <button onClick={() => setBonoVerDetalle(null)} style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '20px', padding: '7px 14px',
                color: 'var(--color-text-secondary)', fontSize: '12px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>✖ Cerrar</button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <div style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '10px', padding: '14px',
                fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Fecha de pago:</span>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{formatearFecha(bonoVerDetalle.fecha_pago)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--color-text-muted)' }}>Empleados:</span>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>{bonoVerDetalle.cantidad_empleados}</span>
                </div>
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)',
                  fontSize: '14px',
                }}>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 600 }}>Total:</span>
                  <span style={{ color: '#1D9E75', fontWeight: 600 }}>RD$ {formatearMoneda(bonoVerDetalle.monto_total)}</span>
                </div>
              </div>

              {bonoVerDetalle.descripcion && (
                <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>
                  📝 {bonoVerDetalle.descripcion}
                </div>
              )}

              <div style={{ marginTop: '16px' }}>
                <div style={{ ...sectionTitle, marginBottom: '10px' }}>👥 EMPLEADOS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(bonoVerDetalle.detalle || []).map((d, i) => (
                    <div key={i} style={{
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      padding: '10px 12px',
                      background: 'var(--color-bg-input)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: '10px',
                    }}>
                      <div>
                        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{d.nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{d.rol?.replace('_', ' ')}</div>
                      </div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#1D9E75' }}>
                        RD$ {formatearMoneda(d.monto)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
        opacity: 0, animation: 'vbSlideTop 0.5s ease forwards',
      }}>
        <button onClick={onVolver} style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '20px', padding: '7px 14px',
          color: 'var(--color-text-secondary)', fontSize: '12px',
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>← Volver</button>

        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '20px', padding: '3px', gap: '2px',
        }}>
          <button type="button" onClick={() => setTema('oscuro')} style={{
            background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
            border: 'none', borderRadius: '16px', padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
          }}>
            <span style={{ fontSize: '11px' }}>🌙</span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
          </button>
          <button type="button" onClick={() => setTema('tropical')} style={{
            background: tema === 'tropical' ? 'var(--gradient-toggle-active)' : 'transparent',
            border: 'none', borderRadius: '16px', padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
          }}>
            <span style={{ fontSize: '11px' }}>☀️</span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
          </button>
        </div>
      </div>

      {/* TÍTULO */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--color-modulo-bg)',
        border: '1px solid var(--color-modulo-border)',
        borderLeft: '4px solid #EF9F27',
        borderRadius: '14px', padding: '20px',
        marginBottom: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '16px', flexWrap: 'wrap',
        boxShadow: 'var(--modulo-sombra)',
        opacity: 0, animation: 'vbFadeUp 0.5s ease 0.1s forwards',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'rgba(239, 159, 39, 0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px',
          }}>🎁</div>
          <div>
            <div style={{ fontSize: '10px', color: '#EF9F27', letterSpacing: '1.5px', fontWeight: 600 }}>
              BONIFICACIONES EXTRA
            </div>
            <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              Bonos Especiales
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Bonos fuera de la nómina regular
            </div>
          </div>
        </div>

        <button onClick={abrirNuevo} style={{
          padding: '12px 18px',
          background: 'linear-gradient(135deg, #EF9F27 0%, #BA7517 100%)',
          border: 'none', borderRadius: '10px',
          color: 'white', fontSize: '13px', fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', gap: '6px',
        }}>+ Nueva bonificación</button>
      </div>

      {/* RESUMEN AÑO */}
      <div style={{
        position: 'relative', zIndex: 1, marginBottom: '20px',
        opacity: 0, animation: 'vbFadeUp 0.5s ease 0.15s forwards',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div style={sectionTitle}>📊 RESUMEN AÑO {añoSeleccionado}</div>
          <select
            value={añoSeleccionado}
            onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '10px', padding: '7px 12px',
              color: 'var(--color-text-primary)',
              fontSize: '12px', fontFamily: 'inherit',
              cursor: 'pointer',
            }}
          >
            {añosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
          <KpiTipo label="TOTAL" valor={totalAño} sub={`${bonificaciones.length} bonos`} color="#FAC775" formatear={formatearMoneda} />
          {Object.entries(TIPOS_BONO_INFO).map(([key, info]) => (
            <KpiTipo key={key} label={`${info.icon} ${info.label.toUpperCase()}`} valor={bonosPorTipo(key)} color={info.color} formatear={formatearMoneda} />
          ))}
        </div>
      </div>

      {/* LISTA DE BONIFICACIONES */}
      <div style={{
        position: 'relative', zIndex: 1, marginBottom: '20px',
        opacity: 0, animation: 'vbFadeUp 0.5s ease 0.2s forwards',
      }}>
        <div style={sectionTitle}>🎁 BONIFICACIONES DEL AÑO</div>

        {cargando ? (
          <div style={{ ...panel, textAlign: 'center', color: 'var(--color-text-muted)' }}>⏳ Cargando bonificaciones...</div>
        ) : bonificaciones.length === 0 ? (
          <div style={{ ...panel, textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              No hay bonificaciones en {añoSeleccionado}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Toca "+ Nueva bonificación" para agregar la primera.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {bonificaciones.map(b => {
              const info = TIPOS_BONO_INFO[b.tipo] || TIPOS_BONO_INFO.otro
              return (
                <div key={b.id} style={{
                  background: 'var(--color-modulo-bg)',
                  border: '1px solid var(--color-modulo-border)',
                  borderLeft: `4px solid ${info.color}`,
                  borderRadius: '12px', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '12px', flexWrap: 'wrap',
                  boxShadow: 'var(--modulo-sombra)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px' }}>
                    <div style={{
                      width: '40px', height: '40px', borderRadius: '10px',
                      background: `${info.color}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '20px',
                    }}>{info.icon}</div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{b.titulo}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                        {formatearFecha(b.fecha_pago)} · {b.cantidad_empleados} empleado(s) · {info.label}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Total</div>
                      <div style={{ fontSize: '16px', fontWeight: 600, color: info.color }}>RD$ {formatearMoneda(b.monto_total)}</div>
                    </div>
                    <button onClick={() => setBonoVerDetalle(b)} style={{
                      padding: '7px 12px',
                      background: `${info.color}25`,
                      border: `1px solid ${info.color}50`,
                      borderRadius: '8px',
                      color: info.color,
                      fontSize: '11px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>👁️ Ver</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiTipo({ label, valor, sub, color, formatear }) {
  return (
    <div style={{
      background: 'var(--color-modulo-bg)',
      border: '1px solid var(--color-modulo-border)',
      borderLeft: `4px solid ${color}`,
      borderRadius: '12px', padding: '12px 14px',
      boxShadow: 'var(--modulo-sombra)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '6px', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '15px', fontWeight: 600, color: color }}>RD$ {formatear(valor)}</div>
      {sub && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

export default VistaBonificaciones