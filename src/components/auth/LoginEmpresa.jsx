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

  // ─── Lógica de login con Supabase Auth ───
  async function intentarLogin(e) {
    e?.preventDefault()

    if (!email.trim() || !password.trim()) {
      setError('Ingresa tu correo y contraseña')
      return
    }

    setCargando(true)
    setError('')

    // Paso 1: autenticar con Supabase Auth
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

    // Paso 2: obtener el objeto empresa vinculado a este auth user
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

    // Si el usuario NO marcó "mantener sesión", limpiamos al cerrar pestaña
    if (!mantenerSesion) {
      sessionStorage.setItem('cocina_pae_session_only', 'true')
    } else {
      sessionStorage.removeItem('cocina_pae_session_only')
    }

    setCargando(false)
    onLoginExitoso(empresa)
  }

  // ─── Toggle de tema ───
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

        {/* Toggle de tema */}
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
            onClick={() => cambiarTema('oscuro')}
            style={{
              background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
              border: 'none',
              borderRadius: '16px',
              padding: '6px 12px',
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
              padding: '6px 12px',
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
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'var(--gradient-logo)',
              border: '0.5px solid var(--color-border-accent)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
            }}
          >
            <div style={{ fontSize: '40px', fontWeight: 500, color: '#FAC775', lineHeight: 1 }}>A</div>
            <div
              style={{
                position: 'absolute',
                top: '8px',
                right: '10px',
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: '#FAC775',
              }}
            />
            <div
              style={{
                position: 'absolute',
                top: '14px',
                right: '18px',
                width: '2px',
                height: '2px',
                borderRadius: '50%',
                background: '#5DCAA5',
              }}
            />
          </div>
        </div>

        {/* Título y subtítulo */}
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '28px',
              fontWeight: 500,
              margin: '0 0 8px',
              letterSpacing: '-0.5px',
            }}
          >
            Cocina PAE
          </h1>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '13px', margin: 0 }}>
            Gestión integral para suplidores INABIE
          </p>
        </div>

        {/* ─── FORMULARIO ─── */}
        <form
          onSubmit={intentarLogin}
          style={{
            width: '100%',
            maxWidth: '360px',
            background: 'var(--color-bg-card)',
            border: '0.5px solid var(--color-border-accent)',
            borderRadius: '16px',
            padding: '28px',
          }}
        >
          {/* Email */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--color-text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
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
                  fontSize: '14px',
                  opacity: 0.5,
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
                  padding: '13px 14px 13px 40px',
                  background: 'var(--color-bg-input)',
                  border: '0.5px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Password */}
          <div style={{ marginBottom: '18px' }}>
            <label
              style={{
                display: 'block',
                color: 'var(--color-text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
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
                  fontSize: '14px',
                  opacity: 0.5,
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
                  padding: '13px 44px 13px 40px',
                  background: 'var(--color-bg-input)',
                  border: '0.5px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--color-text-primary)',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  outline: 'none',
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
                  fontSize: '14px',
                  opacity: 0.6,
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
              <span style={{ color: 'var(--color-text-secondary)', fontSize: '12px' }}>
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
                fontSize: '12px',
                fontWeight: 500,
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
                background: 'rgba(244, 67, 54, 0.1)',
                border: '0.5px solid rgba(244, 67, 54, 0.3)',
                borderRadius: '10px',
                padding: '10px 12px',
                marginBottom: '16px',
                color: '#F4C0D1',
                fontSize: '12px',
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
              padding: '14px',
              background: 'var(--gradient-button)',
              border: 'none',
              borderRadius: '10px',
              color: 'white',
              fontSize: '14px',
              fontWeight: 500,
              cursor: cargando ? 'not-allowed' : 'pointer',
              opacity: cargando ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              transition: 'opacity 0.2s',
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
                background: 'rgba(250, 199, 117, 0.08)',
                border: '0.5px solid rgba(250, 199, 117, 0.25)',
                borderRadius: '10px',
                padding: '14px',
                fontSize: '11px',
                color: 'var(--color-text-secondary)',
              }}
            >
              <p style={{ margin: '0 0 8px', fontWeight: 500, color: 'var(--color-text-accent)' }}>
                📞 Contacta a soporte
              </p>
              <p style={{ margin: '0 0 4px' }}>📧 vladimirmercado0787@gmail.com</p>
              <p style={{ margin: 0 }}>📱 WhatsApp: +1 (978) 414-7190</p>
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
              opacity: 0.6,
              fontSize: '11px',
              fontWeight: 500,
              letterSpacing: '0.5px',
            }}
          >
            Hecho en República Dominicana
          </span>
        </div>
        <span
          style={{
            color: 'var(--color-text-disabled)',
            fontSize: '10px',
            letterSpacing: '0.3px',
          }}
        >
          Materializamos ideas · Construimos posibilidades
        </span>
        <span style={{ color: 'var(--color-text-disabled)', fontSize: '10px' }}>
          © 2026 Andamio · Cocina PAE v1.0
        </span>
      </div>
    </div>
  )
}

export default LoginEmpresa