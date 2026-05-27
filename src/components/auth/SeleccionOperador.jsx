import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

// ─── Información visual por rol ───
const ROL_INFO = {
  propietario:   { emoji: '👑', label: 'Propietario',     color: '#FAC775', bgGlow: 'rgba(250, 199, 117, 0.15)' },
  administrador: { emoji: '💼', label: 'Administrador',   color: '#185FA5', bgGlow: 'rgba(24, 95, 165, 0.15)' },
  secretaria:    { emoji: '📋', label: 'Secretaria',      color: '#D4537E', bgGlow: 'rgba(212, 83, 126, 0.15)' },
  jefa_cocina:   { emoji: '👩‍🍳', label: 'Jefa de cocina',  color: '#ED93B1', bgGlow: 'rgba(237, 147, 177, 0.15)' },
  despachador:   { emoji: '🚚', label: 'Despachador',     color: '#E89042', bgGlow: 'rgba(232, 144, 66, 0.15)' },
  ayudante:      { emoji: '👨‍🍳', label: 'Ayudante',        color: '#0F6E56', bgGlow: 'rgba(15, 110, 86, 0.15)' },
  contador:      { emoji: '🧮', label: 'Contador',        color: '#534AB7', bgGlow: 'rgba(83, 74, 183, 0.15)' },
}

function SeleccionOperador({ empresaId, onSeleccionar, onCerrarSesion }) {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)

  // ─── Tema (persiste de LoginEmpresa via localStorage) ───
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('cocina_pae_tema') || 'oscuro'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

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
      // Ordenar: propietario primero, luego el resto
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
    // Por ahora muestra un alert. En FASE 10 conectamos el Modal de Autorización
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
      {/* Resplandores radiales del fondo */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
          pointerEvents: 'none',
        }}
      />

      {/* ─── HEADER ─── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Logo Andamio izquierda */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '6px',
              background: 'var(--gradient-logo)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '13px',
              fontWeight: 500,
              color: '#FAC775',
            }}
          >
            A
          </div>
          <span
            style={{
              color: 'var(--color-text-accent)',
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '1.5px',
            }}
          >
            ANDAMIO
          </span>
        </div>

        {/* Toggle de tema + botón Cambiar empresa */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Toggle tema */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              background: 'var(--color-bg-elevated)',
              border: '0.5px solid var(--color-border-subtle)',
              borderRadius: '20px',
              padding: '3px',
              gap: '2px',
            }}
          >
            <button
              type="button"
              onClick={() => setTema('oscuro')}
              style={{
                background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
                border: 'none',
                borderRadius: '16px',
                padding: '6px 10px',
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
                  fontSize: '10px',
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
                padding: '6px 10px',
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
                  fontSize: '10px',
                  fontWeight: 500,
                  color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)',
                }}
              >
                Claro
              </span>
            </button>
          </div>

          {/* Botón Cambiar empresa */}
          {onCerrarSesion && (
            <button
              type="button"
              onClick={onCerrarSesion}
              style={{
                background: 'var(--color-bg-elevated)',
                border: '0.5px solid var(--color-border-subtle)',
                borderRadius: '20px',
                padding: '8px 14px',
                color: 'var(--color-text-secondary)',
                fontSize: '11px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.3s ease',
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
        {/* Título */}
        <div style={{ textAlign: 'center', marginBottom: '40px', maxWidth: '600px' }}>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '32px',
              fontWeight: 500,
              margin: '0 0 10px',
              letterSpacing: '-0.5px',
            }}
          >
            ¿Quién está usando la app?
          </h1>
          <p
            style={{
              color: 'var(--color-text-muted)',
              fontSize: '14px',
              margin: 0,
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
              background: 'rgba(250, 199, 117, 0.08)',
              border: '0.5px solid var(--color-border-accent)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              textAlign: 'center',
            }}
          >
            <p
              style={{
                color: 'var(--color-text-accent)',
                fontSize: '14px',
                margin: 0,
              }}
            >
              ⚠️ No hay personas registradas. Completa el Paso 5 del Wizard primero.
            </p>
          </div>
        )}

        {/* ─── GRID DE TARJETAS ─── */}
        {!cargando && usuarios.length > 0 && (
          <div
            style={{
              width: '100%',
              maxWidth: '900px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
              gap: '14px',
              padding: '0 12px',
            }}
          >
            {usuarios.map((usuario) => {
              const info = getInfo(usuario.rol)
              const esPropietario = usuario.rol === 'propietario'
              return (
                <button
                  key={usuario.id}
                  onClick={() => onSeleccionar(usuario)}
                  style={{
                    position: 'relative',
                    background: esPropietario
                      ? `linear-gradient(135deg, ${info.bgGlow} 0%, rgba(250, 199, 117, 0.05) 100%)`
                      : 'var(--color-bg-card)',
                    border: esPropietario
                      ? `1px solid ${info.color}80`
                      : `0.5px solid ${info.color}40`,
                    borderRadius: '14px',
                    padding: '20px 14px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.25s ease',
                    fontFamily: 'inherit',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)'
                    e.currentTarget.style.borderColor = info.color
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = esPropietario
                      ? `${info.color}80`
                      : `${info.color}40`
                  }}
                >
                  {/* Badge DUEÑA si es propietario */}
                  {esPropietario && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-7px',
                        right: '10px',
                        background: 'var(--gradient-button)',
                        color: 'white',
                        fontSize: '8px',
                        fontWeight: 600,
                        padding: '3px 8px',
                        borderRadius: '8px',
                        letterSpacing: '0.5px',
                      }}
                    >
                      DUEÑA
                    </div>
                  )}

                  {/* Emoji grande */}
                  <div style={{ fontSize: '38px', lineHeight: 1 }}>{info.emoji}</div>

                  {/* Nombre */}
                  <p
                    style={{
                      color: 'var(--color-text-primary)',
                      fontSize: '14px',
                      fontWeight: 600,
                      margin: 0,
                      textAlign: 'center',
                      lineHeight: 1.2,
                    }}
                  >
                    {usuario.nombre}
                  </p>

                  {/* Rol */}
                  <p
                    style={{
                      color: info.color,
                      fontSize: '9px',
                      fontWeight: 600,
                      margin: 0,
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {info.label}
                  </p>
                </button>
              )
            })}

            {/* Tarjeta "+ Agregar empleado" */}
            <button
              onClick={manejarAgregarEmpleado}
              style={{
                background: 'transparent',
                border: '1.5px dashed var(--color-border-strong)',
                borderRadius: '14px',
                padding: '20px 14px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '120px',
                transition: 'all 0.25s ease',
                fontFamily: 'inherit',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-text-accent)'
                e.currentTarget.style.background = 'rgba(250, 199, 117, 0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div
                style={{
                  fontSize: '32px',
                  lineHeight: 1,
                  color: 'var(--color-text-muted)',
                }}
              >
                +
              </div>
              <p
                style={{
                  color: 'var(--color-text-muted)',
                  fontSize: '12px',
                  fontWeight: 500,
                  margin: 0,
                  textAlign: 'center',
                }}
              >
                Agregar empleado
              </p>
              <p
                style={{
                  color: 'var(--color-text-disabled)',
                  fontSize: '9px',
                  margin: 0,
                  textAlign: 'center',
                  letterSpacing: '0.3px',
                }}
              >
                🔒 Requiere autorización
              </p>
            </button>
          </div>
        )}
      </div>

      {/* ─── FOOTER ─── */}
      <div
        style={{
          position: 'relative',
          paddingTop: '32px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}
      >
        {!cargando && usuarios.length > 0 && (
          <p
            style={{
              color: 'var(--color-text-disabled)',
              fontSize: '10px',
              marginBottom: '8px',
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
              opacity: 0.6,
              fontSize: '11px',
              fontWeight: 500,
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