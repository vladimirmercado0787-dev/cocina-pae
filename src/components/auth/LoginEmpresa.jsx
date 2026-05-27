import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function LoginEmpresa({ onLoginExitoso }) {
  // ─── Estado del formulario ───
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [mantenerSesion, setMantenerSesion] = useState(true)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mostrarAyuda, setMostrarAyuda] = useState(false)

  // ─── Estado del tema (Oscuro Híbrido / Tropical Claro) ───
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('cocina_pae_tema') || 'oscuro'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const esTropical = tema === 'tropical'

  // ─── Lógica de login con Supabase Auth ───
  async function intentarLogin(e) {
    e?.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña')
      return
    }

    setCargando(true)
    setError('')

    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: password,
    })

    if (authError) {
      console.error('Error de autenticación:', authError)
      if (authError.message.includes('Invalid login credentials')) {
        setError('Correo o contraseña incorrectos')
      } else if (authError.message.includes('Email not confirmed')) {
        setError('Tu correo aún no está confirmado. Contacta a soporte.')
      } else {
        setError('Error al iniciar sesión. Intenta de nuevo.')
      }
      setCargando(false)
      return
    }

    if (!authData?.user) {
      setError('No se pudo iniciar sesión. Intenta de nuevo.')
      setCargando(false)
      return
    }

    const { data: empresa, error: errEmpresa } = await supabase
      .from('empresas')
      .select('*')
      .eq('auth_user_id', authData.user.id)
      .single()

    if (errEmpresa || !empresa) {
      console.error('Empresa no encontrada para este usuario:', errEmpresa)
      setError('Tu cuenta no está vinculada a ninguna empresa. Contacta a soporte.')
      await supabase.auth.signOut()
      setCargando(false)
      return
    }

    if (!mantenerSesion) {
      sessionStorage.setItem('cocina_pae_session_only', 'true')
    } else {
      sessionStorage.removeItem('cocina_pae_session_only')
    }

    setCargando(false)
    onLoginExitoso(empresa)
  }

  function cambiarTema(nuevoTema) {
    setTema(nuevoTema)
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        position: 'relative',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* ─── Resplandores radiales del fondo ─── */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
          pointerEvents: 'none',
        }}
      />

      {/* ─── HEADER: Logo Andamio (izq) + Toggle Tema (der) ─── */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '32px',
        }}
      >
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

        {/* Toggle de tema */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '20px',
            padding: '3px',
            gap: '2px',
            boxShadow: 'var(--modulo-sombra)',
          }}
        >
          <button
            type="button"
            onClick={() => cambiarTema('oscuro')}
            style={{
              background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
              border: 'none',
              borderRadius: '16px',
              padding: '7px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <span style={{ fontSize: '12px' }}>🌙</span>
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
            onClick={() => cambiarTema('tropical')}
            style={{
              background: tema === 'tropical' ? 'var(--gradient-toggle-active)' : 'transparent',
              border: 'none',
              borderRadius: '16px',
              padding: '7px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
            }}
          >
            <span style={{ fontSize: '12px' }}>☀️</span>
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
      </div>

      {/* ─── CONTENIDO CENTRAL ─── */}
      <div
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '12px 0',
        }}
      >
        {/* Logo grande */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            marginBottom: '24px',
          }}
        >
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '22px',
              background: 'var(--gradient-logo)',
              border: '1px solid var(--color-border-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              boxShadow: esTropical 
                ? '0 8px 24px rgba(15, 110, 86, 0.3), 0 2px 8px rgba(15, 110, 86, 0.15)' 
                : '0 4px 16px rgba(0, 0, 0, 0.3)',
            }}
          >
            <div style={{ fontSize: '44px', fontWeight: 500, color: '#FAC775', lineHeight: 1 }}>A</div>
            <div
              style={{
                position: 'absolute',
                top: '10px',
                right: '12px',
                width: '5px',
                height: '5px',
                borderRadius: '50%',
                background: '#FAC775',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '16px',
                right: '20px',
                width: '3px',
                height: '3px',
                borderRadius: '50%',
                background: '#5DCAA5',
              }}
            />
          </div>
        </div>

        {/* Título y subtítulo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '32px',
              fontWeight: 500,
              margin: '0 0 8px',
              letterSpacing: '-0.5px',
            }}
          >
            Cocina PAE
          </h1>
          <p style={{ 
            color: 'var(--color-text-secondary)', 
            fontSize: '14px', 
            margin: 0,
            fontWeight: 500,
          }}>
            Gestión integral para suplidores INABIE
          </p>
        </div>

        {/* ─── FORMULARIO ─── */}
        <form
          onSubmit={intentarLogin}
          style={{
            width: '100%',
            maxWidth: '380px',
            background: esTropical ? 'var(--color-bg-elevated)' : 'var(--color-bg-card)',
            border: esTropical 
              ? '1.5px solid var(--color-border-accent)' 
              : '1px solid var(--color-border-accent)',
            borderRadius: '18px',
            padding: '28px',
            boxShadow: esTropical 
              ? '0 8px 24px rgba(15, 110, 86, 0.08), 0 2px 8px rgba(15, 110, 86, 0.04)' 
              : 'none',
          }}
        >
          {/* Email */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '8px',
              }}
            >
              Correo de la empresa
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '15px',
                  opacity: 0.6,
                }}
              >
                ✉️
              </span>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (error) setError('')
                }}
                placeholder="elbabuffet21@gmail.com"
                autoComplete="username"
                autoFocus
                disabled={cargando}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '14px 14px 14px 42px',
                  background: 'var(--color-bg-input)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--color-text-primary)',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-text-accent)'
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${esTropical ? 'rgba(15, 110, 86, 0.1)' : 'rgba(250, 199, 117, 0.15)'}`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                fontWeight: 600,
                marginBottom: '8px',
              }}
            >
              Contraseña
            </label>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '15px',
                  opacity: 0.6,
                }}
              >
                🔒
              </span>
              <input
                type={verPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={cargando}
                style={{
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '14px 44px 14px 42px',
                  background: 'var(--color-bg-input)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--color-text-primary)',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  transition: 'border-color 0.2s, box-shadow 0.2s',
                }}
                onFocus={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-text-accent)'
                  e.currentTarget.style.boxShadow = `0 0 0 3px ${esTropical ? 'rgba(15, 110, 86, 0.1)' : 'rgba(250, 199, 117, 0.15)'}`
                }}
                onBlur={(e) => {
                  e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
              />
              <button
                type="button"
                onClick={() => setVerPassword(!verPassword)}
                style={{
                  position: 'absolute',
                  right: '14px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '15px',
                  opacity: 0.7,
                }}
              >
                {verPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* Mantener sesión + ¿Olvidaste? */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px',
            }}
          >
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={mantenerSesion}
                onChange={(e) => setMantenerSesion(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: '#BA7517', cursor: 'pointer' }}
              />
              <span style={{ 
                color: 'var(--color-text-secondary)', 
                fontSize: '13px',
                fontWeight: 500,
              }}>
                Mantener sesión iniciada
              </span>
            </label>
            <button
              type="button"
              onClick={() => setMostrarAyuda(!mostrarAyuda)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--color-text-accent)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              ¿Olvidaste?
            </button>
          </div>

          {/* Error */}
          {error && (
            <div
              style={{
                background: esTropical ? '#FCEBEB' : 'rgba(244, 67, 54, 0.1)',
                border: esTropical ? '1px solid #E24B4A' : '1px solid rgba(244, 67, 54, 0.3)',
                borderLeft: esTropical ? '4px solid #E24B4A' : '4px solid #E24B4A',
                borderRadius: '10px',
                padding: '12px 14px',
                marginBottom: '16px',
                color: esTropical ? '#A32D2D' : '#F4C0D1',
                fontSize: '13px',
                fontWeight: 500,
              }}
            >
              ⚠️ {error}
            </div>
          )}

          {/* Botón Entrar */}
          <button
            type="submit"
            disabled={cargando}
            style={{
              width: '100%',
              padding: '15px',
              background: 'var(--gradient-button)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '15px',
              fontWeight: 600,
              cursor: cargando ? 'not-allowed' : 'pointer',
              opacity: cargando ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'all 0.2s',
              fontFamily: 'inherit',
              boxShadow: esTropical 
                ? '0 4px 12px rgba(186, 117, 23, 0.3), 0 2px 4px rgba(186, 117, 23, 0.15)' 
                : 'none',
            }}
          >
            {cargando ? (
              <>
                <span>⏳</span> Verificando...
              </>
            ) : (
              <>
                <span>Entrar</span>
                <span>→</span>
              </>
            )}
          </button>

          {/* Ayuda */}
          {mostrarAyuda && (
            <div
              style={{
                marginTop: '16px',
                background: esTropical ? '#FAF3E5' : 'rgba(250, 199, 117, 0.08)',
                border: esTropical ? '1px solid rgba(186, 117, 23, 0.3)' : '1px solid rgba(250, 199, 117, 0.25)',
                borderLeft: esTropical ? '4px solid #BA7517' : '4px solid rgba(250, 199, 117, 0.5)',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '12px',
                color: esTropical ? '#633806' : 'var(--color-text-secondary)',
              }}
            >
              <p style={{ 
                margin: '0 0 8px', 
                fontWeight: 600, 
                color: esTropical ? '#633806' : 'var(--color-text-accent)',
                fontSize: '13px',
              }}>
                📞 Contacta a soporte
              </p>
              <p style={{ margin: '0 0 4px', fontWeight: 500 }}>📧 vladimirmercado0787@gmail.com</p>
              <p style={{ margin: 0, fontWeight: 500 }}>📱 WhatsApp: +1 (978) 414-7190</p>
            </div>
          )}
        </form>
      </div>

      {/* ─── FOOTER ─── */}
      <div
        style={{
          position: 'relative',
          paddingTop: '24px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '6px',
        }}
      >
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
        <span
          style={{
            color: 'var(--color-text-muted)',
            fontSize: '11px',
            letterSpacing: '0.3px',
            fontWeight: 500,
          }}
        >
          Materializamos ideas · Construimos posibilidades
        </span>
        <span style={{ 
          color: 'var(--color-text-disabled)', 
          fontSize: '10px',
          fontWeight: 500,
        }}>
          © 2026 Andamio · Cocina PAE v1.0
        </span>
      </div>
    </div>
  )
}

export default LoginEmpresa