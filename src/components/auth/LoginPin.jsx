import { useState, useEffect } from 'react'

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

function LoginPin({ usuario, onCancelar, onLoginExitoso }) {
  const [pinIngresado, setPinIngresado] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  // ─── Tema (persiste de pantallas anteriores) ───
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('cocina_pae_tema') || 'oscuro'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const info = ROL_INFO[usuario.rol] || ROL_INFO.ayudante
  const esPropietario = usuario.rol === 'propietario'

  function agregarDigito(digito) {
    if (pinIngresado.length >= 4) return

    const nuevoPin = pinIngresado + digito
    setPinIngresado(nuevoPin)
    setError(false)

    if (nuevoPin.length === 4) {
      setTimeout(() => verificarPin(nuevoPin), 200)
    }
  }

  function borrarDigito() {
    setPinIngresado(pinIngresado.slice(0, -1))
    setError(false)
  }

  function limpiarTodo() {
    setPinIngresado('')
    setError(false)
  }

  function verificarPin(pin) {
    if (pin === usuario.pin) {
      onLoginExitoso(usuario)
    } else {
      setError(true)
      setShake(true)
      setTimeout(() => {
        setPinIngresado('')
        setShake(false)
      }, 600)
    }
  }

  // ─── Soporte para teclado físico ───
  useEffect(() => {
    function manejarTecla(evento) {
      if (evento.key >= '0' && evento.key <= '9') {
        agregarDigito(evento.key)
      } else if (evento.key === 'Backspace' || evento.key === 'Delete') {
        borrarDigito()
      } else if (evento.key === 'Escape') {
        if (onCancelar) onCancelar()
      } else if (evento.key === 'c' || evento.key === 'C') {
        limpiarTodo()
      }
    }

    window.addEventListener('keydown', manejarTecla)
    return () => {
      window.removeEventListener('keydown', manejarTecla)
    }
  }, [pinIngresado])

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
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px',
        }}
      >
        {/* Botón Volver izquierda */}
        <button
          type="button"
          onClick={onCancelar}
          style={{
            background: 'var(--color-bg-elevated)',
            border: '0.5px solid var(--color-border-subtle)',
            borderRadius: '20px',
            padding: '8px 14px',
            color: 'var(--color-text-secondary)',
            fontSize: '12px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'inherit',
          }}
        >
          <span>←</span>
          <span>Cambiar usuario</span>
        </button>

        {/* Toggle de tema derecha */}
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
          gap: '24px',
        }}
      >
        {/* ─── Card del usuario ─── */}
        <div
          style={{
            background: esPropietario
              ? `linear-gradient(135deg, ${info.bgGlow} 0%, rgba(250, 199, 117, 0.05) 100%)`
              : 'var(--color-bg-card)',
            border: esPropietario
              ? `1px solid ${info.color}80`
              : `0.5px solid ${info.color}40`,
            borderRadius: '16px',
            padding: '24px 36px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '8px',
            position: 'relative',
            minWidth: '260px',
          }}
        >
          {esPropietario && (
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                right: '14px',
                background: 'var(--gradient-button)',
                color: 'white',
                fontSize: '9px',
                fontWeight: 600,
                padding: '3px 9px',
                borderRadius: '8px',
                letterSpacing: '0.5px',
              }}
            >
              DUEÑA
            </div>
          )}

          <div style={{ fontSize: '52px', lineHeight: 1 }}>{info.emoji}</div>

          <p
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '20px',
              fontWeight: 600,
              margin: 0,
              textAlign: 'center',
            }}
          >
            {usuario.nombre}
          </p>

          <p
            style={{
              color: info.color,
              fontSize: '10px',
              fontWeight: 600,
              margin: 0,
              letterSpacing: '1px',
              textTransform: 'uppercase',
            }}
          >
            {info.label}
          </p>
        </div>

        {/* ─── Display del PIN ─── */}
        <div style={{ textAlign: 'center' }}>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '12px',
              fontWeight: 500,
              margin: '0 0 14px',
              letterSpacing: '0.5px',
            }}
          >
            Ingresa tu PIN
          </p>
          <div
            className={shake ? 'pin-shake' : ''}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '14px',
            }}
          >
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  width: '16px',
                  height: '16px',
                  borderRadius: '50%',
                  border: error
                    ? '1.5px solid #F44336'
                    : pinIngresado.length > i
                      ? '1.5px solid #FAC775'
                      : '1.5px solid var(--color-border-strong)',
                  background: error
                    ? '#F44336'
                    : pinIngresado.length > i
                      ? '#FAC775'
                      : 'transparent',
                  transition: 'all 0.2s ease',
                }}
              />
            ))}
          </div>
          {error && (
            <p
              style={{
                color: '#F4C0D1',
                fontSize: '12px',
                fontWeight: 500,
                marginTop: '12px',
                marginBottom: 0,
              }}
            >
              ⚠️ PIN incorrecto, intenta de nuevo
            </p>
          )}
        </div>

        {/* ─── Teclado numérico ─── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 70px)',
            gap: '12px',
            marginTop: '8px',
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => agregarDigito(num.toString())}
              style={{
                background: 'var(--color-bg-card)',
                border: '0.5px solid var(--color-border-subtle)',
                borderRadius: '14px',
                padding: '18px 0',
                fontSize: '24px',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-hover)'
                e.currentTarget.style.borderColor = 'var(--color-border-accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-card)'
                e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
              }}
            >
              {num}
            </button>
          ))}

          {/* Botón C - Limpiar todo */}
          <button
            onClick={limpiarTodo}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '0.5px solid var(--color-border-subtle)',
              borderRadius: '14px',
              padding: '18px 0',
              fontSize: '20px',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#F4C0D1'
              e.currentTarget.style.borderColor = 'rgba(244, 67, 54, 0.4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)'
              e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
            }}
          >
            C
          </button>

          {/* Botón 0 */}
          <button
            onClick={() => agregarDigito('0')}
            style={{
              background: 'var(--color-bg-card)',
              border: '0.5px solid var(--color-border-subtle)',
              borderRadius: '14px',
              padding: '18px 0',
              fontSize: '24px',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-hover)'
              e.currentTarget.style.borderColor = 'var(--color-border-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-card)'
              e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
            }}
          >
            0
          </button>

          {/* Botón backspace */}
          <button
            onClick={borrarDigito}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '0.5px solid var(--color-border-subtle)',
              borderRadius: '14px',
              padding: '18px 0',
              fontSize: '20px',
              fontWeight: 500,
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = 'var(--color-text-accent)'
              e.currentTarget.style.borderColor = 'var(--color-border-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = 'var(--color-text-muted)'
              e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
            }}
          >
            ⌫
          </button>
        </div>
      </div>

      {/* ─── FOOTER ─── */}
      <div
        style={{
          position: 'relative',
          paddingTop: '20px',
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
      </div>

      {/* Animación shake */}
      <style>{`
        @keyframes pin-shake-anim {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .pin-shake {
          animation: pin-shake-anim 0.4s ease-in-out;
        }
      `}</style>
    </div>
  )
}

export default LoginPin