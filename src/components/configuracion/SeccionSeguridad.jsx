import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const GRIS = { c: '#888780', claro: '#F1EFE8', dark: '#3D3D38' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }

function SeccionSeguridad({ empresa, onActualizado, mostrarExito }) {
  const [emailLogin, setEmailLogin] = useState('')
  const [cargandoEmail, setCargandoEmail] = useState(true)

  // Cambio de contraseña
  const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false)
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [errorPassword, setErrorPassword] = useState('')
  const [guardandoPassword, setGuardandoPassword] = useState(false)

  // Enviar enlace de recuperación
  const [enviandoEnlace, setEnviandoEnlace] = useState(false)
  const [enlaceEnviado, setEnlaceEnviado] = useState(false)
  const [errorEnlace, setErrorEnlace] = useState('')

  const [esTropical, setEsTropical] = useState(
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-tema') === 'tropical'
  )
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setEsTropical(document.documentElement.getAttribute('data-tema') === 'tropical')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] })
    return () => obs.disconnect()
  }, [])

  // Cargar el email real de Supabase Auth
  useEffect(() => {
    async function cargarEmail() {
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) setEmailLogin(user.email)
      setCargandoEmail(false)
    }
    cargarEmail()
  }, [])

  function cancelarCambio() {
    setMostrarCambioPassword(false)
    setPasswordActual('')
    setPasswordNueva('')
    setPasswordConfirmar('')
    setErrorPassword('')
  }

  async function cambiarPassword() {
    setErrorPassword('')
    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
      setErrorPassword('Llena todos los campos'); return
    }
    if (passwordNueva.length < 6) {
      setErrorPassword('La nueva contraseña debe tener al menos 6 caracteres'); return
    }
    if (passwordNueva !== passwordConfirmar) {
      setErrorPassword('La confirmación no coincide'); return
    }
    if (passwordNueva === passwordActual) {
      setErrorPassword('La nueva contraseña no puede ser igual a la actual'); return
    }

    setGuardandoPassword(true)

    // Paso 1: verificar contraseña actual re-autenticando
    const { error: errAuth } = await supabase.auth.signInWithPassword({
      email: emailLogin,
      password: passwordActual,
    })

    if (errAuth) {
      setErrorPassword('La contraseña actual es incorrecta')
      setGuardandoPassword(false)
      return
    }

    // Paso 2: actualizar a la nueva contraseña
    const { error: errUpdate } = await supabase.auth.updateUser({
      password: passwordNueva
    })

    setGuardandoPassword(false)

    if (errUpdate) {
      console.error('Error al actualizar:', errUpdate)
      setErrorPassword('Error al guardar: ' + errUpdate.message)
      return
    }

    mostrarExito('Contraseña actualizada correctamente')
    cancelarCambio()
    if (onActualizado) onActualizado()
  }

  async function enviarEnlaceRecuperacion() {
    setErrorEnlace('')
    setEnviandoEnlace(true)

    const { error } = await supabase.auth.resetPasswordForEmail(emailLogin, {
      redirectTo: window.location.origin + '/reset-password'
    })

    setEnviandoEnlace(false)

    if (error) {
      console.error('Error al enviar enlace:', error)
      setErrorEnlace('Error al enviar el enlace: ' + error.message)
      return
    }

    setEnlaceEnviado(true)
    // Resetear el estado después de 5 segundos
    setTimeout(() => setEnlaceEnviado(false), 5000)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>
          🔐 Seguridad
        </h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Credenciales de acceso de tu empresa
        </p>
      </div>

      {/* EMAIL DE LOGIN (READ-ONLY) */}
      <Bloque sec={GRIS} esTropical={esTropical} titulo="📧 EMAIL DE LOGIN">
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>
          Correo de la empresa
        </label>
        <input
          type="email"
          value={cargandoEmail ? 'Cargando...' : emailLogin}
          readOnly
          style={{ ...inputStyle(), fontFamily: 'monospace', opacity: 0.7, cursor: 'not-allowed' }}
        />
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px', lineHeight: 1.5 }}>
          Este es el email con el que tu empresa inicia sesión. Si necesitas cambiarlo, contacta soporte.
        </p>
      </Bloque>

      {/* CAMBIAR CONTRASEÑA */}
      <Bloque sec={GRIS} esTropical={esTropical} titulo="🔑 CONTRASEÑA">
        {!mostrarCambioPassword ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                Cambia tu contraseña si quieres una nueva.
              </p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Necesitas saber la contraseña actual. Si no la recuerdas, usa el enlace de recuperación abajo.
              </p>
            </div>
            <button onClick={() => setMostrarCambioPassword(true)} style={{
              padding: '10px 16px',
              background: `linear-gradient(135deg, ${AMBAR.c} 0%, ${AMBAR.dark} 100%)`,
              border: 'none', borderRadius: '8px',
              color: 'white', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>
              🔑 Cambiar contraseña
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle()}>Contraseña actual</label>
              <input type={verPassword ? 'text' : 'password'} value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                placeholder="••••••••" disabled={guardandoPassword}
                style={inputStyle()} />
            </div>
            <div>
              <label style={labelStyle()}>
                Nueva contraseña{' '}
                <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(mínimo 6 caracteres)</span>
              </label>
              <input type={verPassword ? 'text' : 'password'} value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                placeholder="••••••••" disabled={guardandoPassword}
                style={inputStyle()} />
            </div>
            <div>
              <label style={labelStyle()}>Confirmar nueva contraseña</label>
              <input type={verPassword ? 'text' : 'password'} value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
                placeholder="••••••••" disabled={guardandoPassword}
                style={inputStyle()} />
            </div>
            <label style={{
              display: 'flex', alignItems: 'center', gap: '8px',
              fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer',
            }}>
              <input type="checkbox" checked={verPassword}
                onChange={(e) => setVerPassword(e.target.checked)}
                style={{ width: '16px', height: '16px' }} />
              👁️ Mostrar contraseñas
            </label>

            {errorPassword && (
              <div style={{
                background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.15)',
                border: '1px solid rgba(226, 75, 74, 0.3)',
                borderRadius: '8px', padding: '12px',
                fontSize: '13px', color: esTropical ? '#A32D2D' : '#F4C0D1',
              }}>
                ⚠️ {errorPassword}
              </div>
            )}

            <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
              <button onClick={cancelarCambio} disabled={guardandoPassword} style={{
                flex: 1, padding: '10px',
                background: 'var(--color-bg-card)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '8px',
                color: 'var(--color-text-secondary)',
                fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancelar</button>
              <button onClick={cambiarPassword} disabled={guardandoPassword} style={{
                flex: 1, padding: '10px',
                background: guardandoPassword
                  ? 'var(--color-bg-card)'
                  : `linear-gradient(135deg, ${AMBAR.c} 0%, ${AMBAR.dark} 100%)`,
                border: 'none', borderRadius: '8px',
                color: 'white', fontSize: '13px', fontWeight: 700,
                cursor: guardandoPassword ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>
                {guardandoPassword ? '⏳ Guardando...' : '💾 Guardar contraseña'}
              </button>
            </div>
          </div>
        )}
      </Bloque>

      {/* RECUPERACIÓN DE CONTRASEÑA */}
      <Bloque sec={GRIS} esTropical={esTropical} titulo="❓ ¿OLVIDASTE TU CONTRASEÑA?">
        {!enlaceEnviado ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Si no recuerdas tu contraseña actual, te enviaremos un enlace al correo{' '}
              <strong style={{ color: 'var(--color-text-primary)' }}>{emailLogin}</strong>{' '}
              para que crees una nueva.
            </p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.5 }}>
              💡 El enlace es válido por 1 hora. Si no lo recibes, revisa tu carpeta de spam.
            </p>

            {errorEnlace && (
              <div style={{
                background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.15)',
                border: '1px solid rgba(226, 75, 74, 0.3)',
                borderRadius: '8px', padding: '12px',
                fontSize: '13px', color: esTropical ? '#A32D2D' : '#F4C0D1',
              }}>⚠️ {errorEnlace}</div>
            )}

            <button onClick={enviarEnlaceRecuperacion} disabled={enviandoEnlace || !emailLogin} style={{
              padding: '10px 16px',
              background: (enviandoEnlace || !emailLogin)
                ? 'var(--color-bg-card)'
                : `linear-gradient(135deg, ${AZUL.c} 0%, ${AZUL.dark} 100%)`,
              border: 'none', borderRadius: '8px',
              color: 'white', fontSize: '13px', fontWeight: 600,
              cursor: (enviandoEnlace || !emailLogin) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit', whiteSpace: 'nowrap', alignSelf: 'flex-start',
            }}>
              {enviandoEnlace ? '⏳ Enviando...' : '📨 Enviar enlace de recuperación'}
            </button>
          </div>
        ) : (
          <div style={{
            background: esTropical ? VERDE.claro : 'rgba(29, 158, 117, 0.12)',
            border: '1px solid rgba(29, 158, 117, 0.4)',
            borderLeft: '4px solid #1D9E75',
            borderRadius: '10px', padding: '16px',
          }}>
            <p style={{ fontSize: '14px', fontWeight: 700, color: '#1D9E75', margin: '0 0 6px' }}>
              ✅ Enlace enviado
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
              Te enviamos un enlace a <strong>{emailLogin}</strong>. Revisa tu bandeja de entrada (y spam) en los próximos minutos.
            </p>
          </div>
        )}
      </Bloque>

      {/* INFO DE SEGURIDAD */}
      <div style={{
        background: esTropical ? AZUL.claro : `${AZUL.c}15`,
        border: `1px solid ${AZUL.c}${esTropical ? '50' : '40'}`,
        borderLeft: `4px solid ${AZUL.c}`,
        borderRadius: '12px', padding: '16px',
        fontSize: '13px', color: esTropical ? AZUL.dark : '#A9CFF2',
      }}>
        <p style={{ fontWeight: 600, marginBottom: '8px' }}>🔒 Información de seguridad</p>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>Tu contraseña se guarda cifrada usando estándares de Supabase Auth (mismo nivel bancario).</li>
          <li>Ni siquiera nosotros podemos verla en texto plano.</li>
          <li>Si olvidas tu contraseña, usa el enlace de recuperación arriba.</li>
          <li>Recomendamos usar al menos 8 caracteres con números y letras.</li>
        </ul>
      </div>
    </div>
  )
}

function Bloque({ sec, esTropical, titulo, children }) {
  return (
    <div style={{
      background: esTropical ? sec.claro : 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: '12px', padding: '20px',
    }}>
      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px', margin: '0 0 12px' }}>
        {titulo}
      </p>
      {children}
    </div>
  )
}

function labelStyle() {
  return {
    display: 'block', fontSize: '13px', fontWeight: 600,
    color: 'var(--color-text-secondary)', marginBottom: '4px',
  }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px', color: 'var(--color-text-primary)',
    fontSize: '13px', fontFamily: 'inherit', outline: 'none',
  }
}

export default SeccionSeguridad