import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

// ─── Información visual por rol ───
const ROL_INFO = {
  propietario:   { emoji: '👑', label: 'Propietario',     color: '#BA7517', colorBg: '#FAC775', colorDarker: '#633806', bgClaro: 'rgba(250, 199, 117, 0.15)' },
  administrador: { emoji: '💼', label: 'Administrador',   color: '#185FA5', colorBg: '#85B7EB', colorDarker: '#0C447C', bgClaro: 'rgba(24, 95, 165, 0.10)' },
  secretaria:    { emoji: '📋', label: 'Secretaria',      color: '#D4537E', colorBg: '#ED93B1', colorDarker: '#72243E', bgClaro: 'rgba(212, 83, 126, 0.10)' },
  jefa_cocina:   { emoji: '👩‍🍳', label: 'Jefa de cocina',  color: '#D4537E', colorBg: '#ED93B1', colorDarker: '#72243E', bgClaro: 'rgba(237, 147, 177, 0.10)' },
  despachador:   { emoji: '🚚', label: 'Despachador',     color: '#D85A30', colorBg: '#E89042', colorDarker: '#7A2F12', bgClaro: 'rgba(232, 144, 66, 0.10)' },
  ayudante:      { emoji: '👨‍🍳', label: 'Ayudante',        color: '#0F6E56', colorBg: '#1D9E75', colorDarker: '#04342C', bgClaro: 'rgba(29, 158, 117, 0.10)' },
  contador:      { emoji: '🧮', label: 'Contador',        color: '#534AB7', colorBg: '#7F77DD', colorDarker: '#3C3489', bgClaro: 'rgba(83, 74, 183, 0.10)' },
}

function SeleccionOperador({ empresaId, onSeleccionar, onCerrarSesion }) {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)

  const [tema, setTema] = useState(() => {
    return localStorage.getItem('cocina_pae_tema') || 'oscuro'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const esTropical = tema === 'tropical'

  useEffect(() => {
    if (empresaId) cargarUsuarios()
  }, [empresaId])

  async function cargarUsuarios() {
    setCargando(true)
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('rol', { ascending: true })

    if (!error) {
      const ordenados = (data || []).sort((a, b) => {
        if (a.rol === 'propietario') return -1
        if (b.rol === 'propietario') return 1
        return 0
      })
      setUsuarios(ordenados)
    }
    setCargando(false)
  }

  function getInfo(rol) {
    return ROL_INFO[rol] || ROL_INFO.ayudante
  }

  function manejarAgregarEmpleado() {
    alert('🚧 Próximamente: Modal de autorización (PIN propietario/admin)')
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        position: 'relative',
        padding: '20px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ═══════════════════════════════════════════════════
          KEYFRAMES DE ANIMACIÓN
          ═══════════════════════════════════════════════════ */}
      <style>{`
        @keyframes selOpSlideFromTop {
          0% { opacity: 0; transform: translateY(-20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes selOpFadeInUp {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes selOpBounceIn {
          0% { opacity: 0; transform: translateY(30px) scale(0.85); }
          60% { opacity: 1; transform: translateY(-4px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes selOpFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes selOpAvatarPop {
          0% { transform: scale(0); }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
      `}</style>

      {/* Resplandores radiales del fondo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
          pointerEvents: 'none',
          opacity: 0,
          animation: 'selOpFadeIn 1.2s ease 0.1s forwards',
        }}
      />

      {/* ─── HEADER (entra desde arriba) ─── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '12px',
          opacity: 0,
          animation: 'selOpSlideFromTop 0.6s ease 0.1s forwards',
        }}
      >
        {/* Logo Andamio izquierda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--gradient-logo)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '15px',
              fontWeight: 500,
              color: '#FAC775',
              boxShadow: esTropical ? '0 4px 12px rgba(15, 110, 86, 0.25)' : 'none',
            }}
          >
            A
          </div>
          <span
            style={{
              color: 'var(--color-text-accent)',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '1.5px',
              opacity: 0.85,
            }}
          >
            ANDAMIO
          </span>
        </div>

        {/* Toggle de tema + botón Cambiar empresa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '20px',
              padding: '3px',
              gap: '2px',
              boxShadow: esTropical ? '0 1px 3px rgba(15, 110, 86, 0.05)' : 'none',
            }}
          >
            <button
              type="button"
              onClick={() => setTema('oscuro')}
              style={{
                background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
                border: 'none',
                borderRadius: '16px',
                padding: '7px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: '11px' }}>🌙</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)',
                }}
              >
                Oscuro
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTema('tropical')}
              style={{
                background: tema === 'tropical' ? 'var(--gradient-toggle-active)' : 'transparent',
                border: 'none',
                borderRadius: '16px',
                padding: '7px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: '11px' }}>☀️</span>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)',
                }}
              >
                Claro
              </span>
            </button>
          </div>

          {onCerrarSesion && (
            <button
              type="button"
              onClick={onCerrarSesion}
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: 'var(--color-text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.3s ease',
                boxShadow: esTropical ? '0 1px 3px rgba(15, 110, 86, 0.05)' : 'none',
              }}
            >
              <span>🚪</span>
              <span>Cambiar empresa</span>
            </button>
          )}
        </div>
      </div>

      {/* ─── CONTENIDO ─── */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          paddingTop: '20px',
        }}
      >
        {/* Título (fade in + sube) */}
        <div style={{ textAlign: 'center', marginBottom: '40px', maxWidth: '600px' }}>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '32px',
              fontWeight: 500,
              margin: '0 0 10px',
              letterSpacing: '-0.5px',
              opacity: 0,
              animation: 'selOpFadeInUp 0.7s ease 0.4s forwards',
            }}
          >
            ¿Quién está usando la app?
          </h1>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              margin: 0,
              fontWeight: 500,
              opacity: 0,
              animation: 'selOpFadeInUp 0.6s ease 0.6s forwards',
            }}
          >
            Selecciona tu nombre y luego ingresa tu PIN
          </p>
        </div>

        {/* Loading */}
        {cargando && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
              ⏳ Cargando equipo...
            </p>
          </div>
        )}

        {/* Empty state */}
        {!cargando && usuarios.length === 0 && (
          <div
            style={{
              background: esTropical ? '#FAF3E5' : 'rgba(250, 199, 117, 0.08)',
              border: esTropical ? '1px solid rgba(186, 117, 23, 0.3)' : '1px solid var(--color-border-accent)',
              borderLeft: esTropical ? '4px solid #BA7517' : '1px solid var(--color-border-accent)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              textAlign: 'center',
              opacity: 0,
              animation: 'selOpFadeInUp 0.6s ease 0.7s forwards',
            }}
          >
            <p
              style={{
                color: esTropical ? '#633806' : 'var(--color-text-accent)',
                fontSize: '14px',
                margin: 0,
                fontWeight: 500,
              }}
            >
              ⚠️ No hay personas registradas. Completa el Paso 5 del Wizard primero.
            </p>
          </div>
        )}

        {/* ─── GRID DE TARJETAS (cascada) ─── */}
        {!cargando && usuarios.length > 0 && (
          <div
            style={{
              width: '100%',
              maxWidth: '1000px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '16px',
              padding: '0 12px',
            }}
          >
            {usuarios.map((usuario, index) => {
              const info = getInfo(usuario.rol)
              const esPropietario = usuario.rol === 'propietario'
              // Cada tarjeta entra 120ms después de la anterior, empezando a los 0.8s
              const delayCascada = 0.8 + (index * 0.12)
              return (
                <button
                  key={usuario.id}
                  onClick={() => onSeleccionar(usuario)}
                  style={{
                    position: 'relative',
                    background: esTropical
                      ? (esPropietario 
                          ? `linear-gradient(135deg, ${info.bgClaro} 0%, var(--color-bg-elevated) 100%)`
                          : 'var(--color-bg-elevated)')
                      : (esPropietario
                          ? `linear-gradient(135deg, ${info.bgClaro} 0%, rgba(250, 199, 117, 0.05) 100%)`
                          : 'var(--color-bg-card)'),
                    border: esTropical 
                      ? `1px solid ${info.color}25`
                      : (esPropietario 
                          ? `1px solid ${info.color}80`
                          : `1px solid ${info.color}40`),
                    borderLeft: `4px solid ${info.color}`,
                    borderRadius: '14px',
                    padding: '22px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.25s ease',
                    fontFamily: 'inherit',
                    boxShadow: esTropical 
                      ? `0 2px 8px ${info.color}10` 
                      : 'none',
                    opacity: 0,
                    animation: `selOpBounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delayCascada}s forwards`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)'
                    e.currentTarget.style.borderColor = info.color
                    e.currentTarget.style.boxShadow = esTropical
                      ? `0 8px 20px ${info.color}25, 0 4px 8px ${info.color}15`
                      : `0 8px 20px ${info.color}30`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = esTropical 
                      ? `${info.color}25`
                      : (esPropietario ? `${info.color}80` : `${info.color}40`)
                    e.currentTarget.style.boxShadow = esTropical 
                      ? `0 2px 8px ${info.color}10` 
                      : 'none'
                  }}
                >
                  {/* Badge DUEÑA si es propietario */}
                  {esPropietario && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '12px',
                        background: 'var(--gradient-button)',
                        color: 'white',
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        letterSpacing: '0.8px',
                        boxShadow: esTropical ? '0 2px 6px rgba(186, 117, 23, 0.3)' : 'none',
                      }}
                    >
                      DUEÑA
                    </div>
                  )}

                  {/* Avatar circular con color del rol (mini pop) */}
                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: esTropical 
                        ? `${info.color}15`
                        : `${info.color}25`,
                      border: `2px solid ${info.color}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      lineHeight: 1,
                      animation: `selOpAvatarPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delayCascada + 0.2}s backwards`,
                    }}
                  >
                    {info.emoji}
                  </div>

                  {/* Nombre */}
                  <p
                    style={{
                      color: esTropical ? info.colorDarker : 'var(--color-text-primary)',
                      fontSize: '15px',
                      fontWeight: 600,
                      margin: 0,
                      textAlign: 'center',
                      lineHeight: 1.2,
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {usuario.nombre}
                  </p>

                  {/* Rol como badge */}
                  <span
                    style={{
                      color: esTropical ? '#ffffff' : info.color,
                      background: esTropical ? info.color : `${info.color}20`,
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {info.label}
                  </span>
                </button>
              )
            })}

            {/* Tarjeta "+ Agregar empleado" (entra al final) */}
            <button
              onClick={manejarAgregarEmpleado}
              style={{
                background: 'transparent',
                border: '2px dashed var(--color-border-strong)',
                borderRadius: '14px',
                padding: '22px 16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '160px',
                transition: 'all 0.25s ease',
                fontFamily: 'inherit',
                opacity: 0,
                animation: `selOpBounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.8 + (usuarios.length * 0.12)}s forwards`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-text-accent)'
                e.currentTarget.style.background = esTropical 
                  ? 'rgba(15, 110, 86, 0.04)' 
                  : 'rgba(250, 199, 117, 0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--color-bg-elevated)',
                  border: '1px dashed var(--color-border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  lineHeight: 1,
                  color: 'var(--color-text-muted)',
                  fontWeight: 300,
                }}
              >
                +
              </div>
              <p
                style={{
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px',
                  fontWeight: 600,
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                Agregar empleado
              </p>
              <p
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '10px',
                  margin: 0,
                  textAlign: 'center',
                  letterSpacing: '0.3px',
                  fontWeight: 500,
                }}
              >
                🔒 Requiere autorización
              </p>
            </button>
          </div>
        )}
      </div>

      {/* ─── FOOTER (fade-in al final) ─── */}
      <div
        style={{
          position: 'relative',
          paddingTop: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
          opacity: 0,
          animation: `selOpFadeInUp 0.7s ease ${1.2 + (usuarios.length * 0.12)}s forwards`,
        }}
      >
        {!cargando && usuarios.length > 0 && (
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '11px',
              marginBottom: '8px',
              fontWeight: 500,
            }}
          >
            {usuarios.length} {usuarios.length === 1 ? 'persona activa' : 'personas activas'}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🇩🇴</span>
          <span
            style={{
              color: 'var(--color-text-accent)',
              opacity: 0.85,
              fontSize: '11px',
              fontWeight: 600,
              letterSpacing: '0.5px',
            }}
          >
            Hecho en República Dominicana
          </span>
        </div>
      </div>
    </div>
  )
}

export default SeleccionOperador