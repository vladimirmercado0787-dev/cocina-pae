import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function ResetPasswordPage({ onTerminado }) {
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [exito, setExito] = useState(false)

  // Estado para validar que el link es legítimo
  const [sesionLista, setSesionLista] = useState(false)
  const [errorSesion, setErrorSesion] = useState('')

  // Tema
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  // 🎯 ARREGLO CLAVE: Al cargar, intercambiar el ?code= por una sesión válida
  useEffect(() => {
    async function inicializarSesion() {
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      // Si hay code en la URL (flujo PKCE moderno)
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) {
          console.error('Error al intercambiar code:', error)
          setErrorSesion('El enlace de recuperación expiró o no es válido. Pide uno nuevo.')
          return
        }
        if (data?.session) {
          setSesionLista(true)
          // Limpiar el code de la URL por seguridad
          window.history.replaceState({}, document.title, '/reset-password')
          return
        }
      }

      // Si NO hay code pero sí hay hash (flujo antiguo)
      if (window.location.hash.includes('type=recovery')) {
        // Supabase procesa el hash automáticamente
        setTimeout(async () => {
          const { data: { session } } = await supabase.auth.getSession()
          if (session) {
            setSesionLista(true)
          } else {
            setErrorSesion('El enlace de recuperación expiró o no es válido. Pide uno nuevo.')
          }
        }, 500)
        return
      }

      // Si no hay ni code ni hash, verificar si ya hay sesión activa de recovery
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        setSesionLista(true)
      } else {
        setErrorSesion('No se detectó un enlace de recuperación válido. Solicita uno nuevo desde la app.')
      }
    }

    inicializarSesion()
  }, [])

  async function actualizarPassword() {
    setError('')

    if (!passwordNueva || !passwordConfirmar) {
      setError('Llena ambos campos')
      return
    }
    if (passwordNueva.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }
    if (passwordNueva !== passwordConfirmar) {
      setError('Las contraseñas no coinciden')
      return
    }

    setGuardando(true)

    const { error: errSupa } = await supabase.auth.updateUser({
      password: passwordNueva
    })

    setGuardando(false)

    if (errSupa) {
      console.error('Error al actualizar contraseña:', errSupa)
      setError('Error al guardar: ' + errSupa.message)
      return
    }

    setExito(true)

    // Después de 3 segundos, cerrar sesión y volver al login
    setTimeout(async () => {
      await supabase.auth.signOut()
      window.history.replaceState({}, document.title, '/')
      if (onTerminado) onTerminado()
    }, 3000)
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      position: 'relative',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      {/* Glow */}
      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* Toggle de tema */}
      <div style={{
        position: 'absolute',
        top: '20px', right: '20px',
        display: 'flex', alignItems: 'center',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '20px', padding: '3px', gap: '2px',
        zIndex: 1,
      }}>
        <button onClick={() => setTema('oscuro')} style={{
          background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
          border: 'none', borderRadius: '16px', padding: '6px 10px',
          display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
        }}>
          <span style={{ fontSize: '11px' }}>🌙</span>
          <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
        </button>
        <button onClick={() => setTema('tropical')} style={{
          background: tema === 'tropical' ? 'var(--gradient-toggle-active)' : 'transparent',
          border: 'none', borderRadius: '16px', padding: '6px 10px',
          display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
        }}>
          <span style={{ fontSize: '11px' }}>☀️</span>
          <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
        </button>
      </div>

      {/* Logo Andamio */}
      <div style={{
        position: 'absolute', top: '20px', left: '20px',
        display: 'flex', alignItems: 'center', gap: '12px', zIndex: 1,
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '8px',
          background: 'var(--gradient-logo)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', fontWeight: 500, color: '#FAC775',
        }}>A</div>
        <span style={{
          color: 'var(--color-text-accent)', fontSize: '12px',
          fontWeight: 600, letterSpacing: '1.5px', opacity: 0.85,
        }}>ANDAMIO</span>
      </div>

      {/* Contenido principal */}
      <div style={{
        position: 'relative', zIndex: 1,
        maxWidth: '440px', width: '100%',
        background: 'var(--color-bg-elevated)',
        border: '1px solid var(--color-border-accent)',
        borderRadius: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        overflow: 'hidden',
      }}>

        {/* CASO 1: Error de sesión (link inválido o expirado) */}
        {errorSesion && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(244, 67, 54, 0.18)',
              border: '2px solid rgba(244, 67, 54, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 16px',
            }}>⚠️</div>
            <h2 style={{
              fontSize: '20px', fontWeight: 500,
              color: 'var(--color-text-primary)',
              margin: '0 0 8px',
            }}>Enlace no válido</h2>
            <p style={{
              fontSize: '13px', color: 'var(--color-text-secondary)',
              margin: '0 0 20px', lineHeight: 1.5,
            }}>
              {errorSesion}
            </p>
            <button onClick={() => {
              window.history.replaceState({}, document.title, '/')
              if (onTerminado) onTerminado()
            }} style={{
              padding: '10px 20px',
              background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>← Volver al login</button>
          </div>
        )}

        {/* CASO 2: Cargando sesión */}
        {!sesionLista && !errorSesion && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '12px' }}>⏳</div>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
              Validando enlace...
            </p>
          </div>
        )}

        {/* CASO 3: Sesión lista, mostrar formulario */}
        {sesionLista && !exito && (
          <>
            <div style={{
              padding: '24px',
              borderBottom: '1px solid var(--color-border-subtle)',
              textAlign: 'center',
            }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'rgba(127, 119, 221, 0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '28px',
                margin: '0 auto 12px',
              }}>🔑</div>
              <h1 style={{
                fontSize: '22px', fontWeight: 500,
                color: 'var(--color-text-primary)',
                margin: '0 0 6px',
              }}>Crea tu nueva contraseña</h1>
              <p style={{
                fontSize: '13px', color: 'var(--color-text-secondary)',
                margin: 0,
              }}>
                Elige una contraseña segura y guárdala en un lugar seguro
              </p>
            </div>

            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle()}>Nueva contraseña</label>
                <input
                  type={verPassword ? 'text' : 'password'}
                  value={passwordNueva}
                  onChange={(e) => setPasswordNueva(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  disabled={guardando}
                  autoFocus
                  style={inputStyle()}
                />
              </div>

              <div>
                <label style={labelStyle()}>Confirmar contraseña</label>
                <input
                  type={verPassword ? 'text' : 'password'}
                  value={passwordConfirmar}
                  onChange={(e) => setPasswordConfirmar(e.target.value)}
                  placeholder="Repite la contraseña"
                  disabled={guardando}
                  onKeyDown={(e) => { if (e.key === 'Enter') actualizarPassword() }}
                  style={inputStyle()}
                />
              </div>

              <label style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                fontSize: '13px', color: 'var(--color-text-secondary)',
                cursor: 'pointer',
              }}>
                <input
                  type="checkbox"
                  checked={verPassword}
                  onChange={(e) => setVerPassword(e.target.checked)}
                  style={{ width: '16px', height: '16px' }}
                />
                👁️ Mostrar contraseñas
              </label>

              {error && (
                <div style={{
                  background: 'rgba(244, 67, 54, 0.12)',
                  border: '1px solid rgba(244, 67, 54, 0.35)',
                  borderRadius: '10px', padding: '12px',
                  fontSize: '13px', color: '#F4C0D1',
                }}>⚠️ {error}</div>
              )}

              <button
                onClick={actualizarPassword}
                disabled={guardando || !passwordNueva || !passwordConfirmar}
                style={{
                  width: '100%', padding: '14px',
                  background: (guardando || !passwordNueva || !passwordConfirmar)
                    ? 'var(--color-bg-input)'
                    : 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                  border: (guardando || !passwordNueva || !passwordConfirmar)
                    ? '1px solid var(--color-border-subtle)'
                    : 'none',
                  borderRadius: '12px',
                  color: (guardando || !passwordNueva || !passwordConfirmar)
                    ? 'var(--color-text-muted)'
                    : 'white',
                  fontSize: '13px', fontWeight: 600,
                  cursor: (guardando || !passwordNueva || !passwordConfirmar) ? 'not-allowed' : 'pointer',
                  fontFamily: 'inherit',
                  marginTop: '8px',
                }}
              >
                {guardando ? '⏳ Guardando...' : '✅ Guardar nueva contraseña'}
              </button>
            </div>
          </>
        )}

        {/* CASO 4: Éxito */}
        {exito && (
          <div style={{ padding: '40px 24px', textAlign: 'center' }}>
            <div style={{
              width: '64px', height: '64px', borderRadius: '50%',
              background: 'rgba(29, 158, 117, 0.18)',
              border: '2px solid rgba(29, 158, 117, 0.4)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '32px',
              margin: '0 auto 16px',
            }}>✅</div>
            <h2 style={{
              fontSize: '20px', fontWeight: 500,
              color: 'var(--color-text-primary)',
              margin: '0 0 8px',
            }}>¡Contraseña actualizada!</h2>
            <p style={{
              fontSize: '13px', color: 'var(--color-text-secondary)',
              margin: '0 0 20px', lineHeight: 1.5,
            }}>
              Tu contraseña ha sido cambiada exitosamente.<br />
              Te llevaremos al login en un momento...
            </p>
            <div style={{ fontSize: '24px' }}>⏳</div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        position: 'absolute', bottom: '20px', left: '0', right: '0',
        textAlign: 'center', fontSize: '11px',
        color: 'var(--color-text-accent)',
        opacity: 0.85, fontWeight: 600, letterSpacing: '0.5px',
      }}>
        🇩🇴 Hecho en República Dominicana
      </div>
    </div>
  )
}

function labelStyle() {
  return {
    display: 'block', fontSize: '12px', fontWeight: 600,
    color: 'var(--color-text-secondary)', marginBottom: '6px',
  }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', padding: '12px 14px',
    color: 'var(--color-text-primary)',
    fontSize: '14px', fontFamily: 'inherit',
    outline: 'none',
  }
}

export default ResetPasswordPage