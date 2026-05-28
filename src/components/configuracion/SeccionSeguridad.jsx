import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import bcrypt from 'bcryptjs'

const GRIS = { c: '#888780', claro: '#F1EFE8', dark: '#3D3D38' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }

function SeccionSeguridad({ empresa, onActualizado, mostrarExito }) {
  const [emailContacto, setEmailContacto] = useState(empresa?.email_contacto || '')
  const [guardandoEmail, setGuardandoEmail] = useState(false)
  const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false)
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [errorPassword, setErrorPassword] = useState('')
  const [guardandoPassword, setGuardandoPassword] = useState(false)

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

  async function guardarEmail() {
    if (!emailContacto.trim()) return
    setGuardandoEmail(true)
    const { error } = await supabase.from('empresas').update({ email_contacto: emailContacto.trim().toLowerCase() }).eq('id', empresa.id)
    setGuardandoEmail(false)
    if (error) { console.error('Error al guardar email:', error); return }
    mostrarExito('Email de contacto actualizado')
    onActualizado()
  }

  function cancelarCambio() {
    setMostrarCambioPassword(false)
    setPasswordActual('')
    setPasswordNueva('')
    setPasswordConfirmar('')
    setErrorPassword('')
  }

  async function cambiarPassword() {
    setErrorPassword('')
    if (!passwordActual || !passwordNueva || !passwordConfirmar) { setErrorPassword('Llena todos los campos'); return }
    if (passwordNueva.length < 6) { setErrorPassword('La nueva contraseña debe tener al menos 6 caracteres'); return }
    if (passwordNueva !== passwordConfirmar) { setErrorPassword('La confirmación no coincide'); return }
    if (passwordNueva === passwordActual) { setErrorPassword('La nueva contraseña no puede ser igual a la actual'); return }

    setGuardandoPassword(true)
    let passwordActualCorrecta = false
    if (empresa.password_hash === 'TEMPORAL_SIN_HASH') {
      passwordActualCorrecta = (passwordActual === 'temporal2026')
    } else if (empresa.password_hash) {
      try {
        passwordActualCorrecta = await bcrypt.compare(passwordActual, empresa.password_hash)
      } catch (err) {
        console.error('Error al comparar:', err)
        passwordActualCorrecta = false
      }
    }

    if (!passwordActualCorrecta) { setErrorPassword('La contraseña actual es incorrecta'); setGuardandoPassword(false); return }

    let nuevoHash = ''
    try {
      const salt = await bcrypt.genSalt(10)
      nuevoHash = await bcrypt.hash(passwordNueva, salt)
    } catch (err) {
      console.error('Error al hashear:', err)
      setErrorPassword('Error al procesar la nueva contraseña')
      setGuardandoPassword(false)
      return
    }

    const { error } = await supabase.from('empresas').update({ password_hash: nuevoHash }).eq('id', empresa.id)
    setGuardandoPassword(false)
    if (error) { console.error('Error al guardar:', error); setErrorPassword('Error al guardar la contraseña: ' + error.message); return }
    mostrarExito('Contraseña actualizada correctamente')
    cancelarCambio()
    onActualizado()
  }

  const usandoPasswordTemporal = empresa?.password_hash === 'TEMPORAL_SIN_HASH'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>🔐 Seguridad</h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Credenciales de acceso de tu empresa</p>
      </div>

      {usandoPasswordTemporal && (
        <div style={{ background: esTropical ? '#FFF8E6' : 'rgba(239, 159, 39, 0.12)', border: '2px solid rgba(239, 159, 39, 0.4)', borderRadius: '12px', padding: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>⚠️</span>
            <div>
              <p style={{ fontWeight: 700, color: esTropical ? '#7A5410' : '#FAC775', margin: 0 }}>Estás usando una contraseña temporal</p>
              <p style={{ fontSize: '13px', color: esTropical ? '#7A5410' : '#FAC775', marginTop: '4px' }}>
                Por seguridad, te recomendamos cambiar la contraseña con el botón de abajo. La temporal actual es: <code style={{ background: 'rgba(0,0,0,0.15)', padding: '2px 6px', borderRadius: '4px', fontFamily: 'monospace', fontSize: '11px' }}>temporal2026</code>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* USUARIO */}
      <Bloque sec={GRIS} esTropical={esTropical} titulo="👤 USUARIO DE EMPRESA">
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Usuario de login</label>
        <input type="text" value={empresa?.usuario || ''} readOnly style={{ ...inputStyle(), fontFamily: 'monospace', opacity: 0.6, cursor: 'not-allowed' }} />
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>El usuario no se puede cambiar. Si necesitas otro, contacta soporte.</p>
      </Bloque>

      {/* EMAIL */}
      <Bloque sec={GRIS} esTropical={esTropical} titulo="📧 EMAIL DE CONTACTO">
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }}>Email para recuperación de contraseña</label>
        <div style={{ display: 'flex', gap: '8px' }}>
          <input type="email" value={emailContacto} onChange={(e) => setEmailContacto(e.target.value)} placeholder="email@ejemplo.com" style={{ ...inputStyle(), flex: 1 }} />
          <button onClick={guardarEmail} disabled={guardandoEmail || emailContacto === empresa?.email_contacto} style={{ padding: '9px 16px', background: (guardandoEmail || emailContacto === empresa?.email_contacto) ? 'var(--color-bg-card)' : 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap', opacity: (guardandoEmail || emailContacto === empresa?.email_contacto) ? 0.5 : 1 }}>
            {guardandoEmail ? '⏳' : '💾 Guardar'}
          </button>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Este email se usará para enviarte un enlace de recuperación si olvidas tu contraseña.</p>
      </Bloque>

      {/* CONTRASEÑA */}
      <Bloque sec={GRIS} esTropical={esTropical} titulo="🔑 CONTRASEÑA">
        {!mostrarCambioPassword ? (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: '200px' }}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>Tu contraseña está cifrada con <strong>bcrypt</strong> (estándar bancario).</p>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                Última actualización: {empresa?.updated_at ? new Date(empresa.updated_at).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' }) : 'desconocida'}
              </p>
            </div>
            <button onClick={() => setMostrarCambioPassword(true)} style={{ padding: '10px 16px', background: `linear-gradient(135deg, ${AMBAR.c} 0%, ${AMBAR.dark} 100%)`, border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              🔑 Cambiar contraseña
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle()}>Contraseña actual</label>
              <input type={verPassword ? 'text' : 'password'} value={passwordActual} onChange={(e) => setPasswordActual(e.target.value)} placeholder="••••••••" disabled={guardandoPassword} style={inputStyle()} />
            </div>
            <div>
              <label style={labelStyle()}>Nueva contraseña <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>(mínimo 6 caracteres)</span></label>
              <input type={verPassword ? 'text' : 'password'} value={passwordNueva} onChange={(e) => setPasswordNueva(e.target.value)} placeholder="••••••••" disabled={guardandoPassword} style={inputStyle()} />
            </div>
            <div>
              <label style={labelStyle()}>Confirmar nueva contraseña</label>
              <input type={verPassword ? 'text' : 'password'} value={passwordConfirmar} onChange={(e) => setPasswordConfirmar(e.target.value)} placeholder="••••••••" disabled={guardandoPassword} style={inputStyle()} />
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--color-text-secondary)', cursor: 'pointer' }}>
              <input type="checkbox" checked={verPassword} onChange={(e) => setVerPassword(e.target.checked)} style={{ width: '16px', height: '16px' }} />
              👁️ Mostrar contraseñas
            </label>
            {errorPassword && (
              <div style={{ background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.15)', border: '1px solid rgba(226, 75, 74, 0.3)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: esTropical ? '#A32D2D' : '#F4C0D1' }}>
                ⚠️ {errorPassword}
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', paddingTop: '4px' }}>
              <button onClick={cancelarCambio} disabled={guardandoPassword} style={{ flex: 1, padding: '10px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={cambiarPassword} disabled={guardandoPassword} style={{ flex: 1, padding: '10px', background: guardandoPassword ? 'var(--color-bg-card)' : `linear-gradient(135deg, ${AMBAR.c} 0%, ${AMBAR.dark} 100%)`, border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                {guardandoPassword ? '⏳ Guardando...' : '💾 Guardar contraseña'}
              </button>
            </div>
          </div>
        )}
      </Bloque>

      {/* INFO */}
      <div style={{ background: esTropical ? AZUL.claro : `${AZUL.c}15`, border: `1px solid ${AZUL.c}${esTropical ? '50' : '40'}`, borderLeft: `4px solid ${AZUL.c}`, borderRadius: '12px', padding: '16px', fontSize: '13px', color: esTropical ? AZUL.dark : '#A9CFF2' }}>
        <p style={{ fontWeight: 600, marginBottom: '8px' }}>🔒 Información de seguridad</p>
        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '11px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <li>Tu contraseña se guarda cifrada con bcrypt (el mismo estándar que usan los bancos).</li>
          <li>Ni siquiera nosotros podemos verla en texto plano.</li>
          <li>Si la olvidas, deberá ser regenerada con un enlace al email de contacto.</li>
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
      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px', margin: '0 0 12px' }}>{titulo}</p>
      {children}
    </div>
  )
}

function labelStyle() {
  return { display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '4px' }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  }
}

export default SeccionSeguridad