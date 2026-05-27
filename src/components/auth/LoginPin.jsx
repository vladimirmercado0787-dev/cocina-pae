import { useState, useEffect } from 'react'

// ─── Información visual por rol ───
const ROL_INFO = {
  propietario:   { emoji: '👑', label: 'Propietario',     color: '#BA7517', bgClaro: 'rgba(250, 199, 117, 0.15)', bgClaroBorde: 'rgba(250, 199, 117, 0.4)' },
  administrador: { emoji: '💼', label: 'Administrador',   color: '#185FA5', bgClaro: 'rgba(133, 183, 235, 0.15)', bgClaroBorde: 'rgba(133, 183, 235, 0.4)' },
  secretaria:    { emoji: '📋', label: 'Secretaria',      color: '#D4537E', bgClaro: 'rgba(237, 147, 177, 0.15)', bgClaroBorde: 'rgba(237, 147, 177, 0.4)' },
  jefa_cocina:   { emoji: '👩‍🍳', label: 'Jefa de cocina',  color: '#D4537E', bgClaro: 'rgba(237, 147, 177, 0.15)', bgClaroBorde: 'rgba(237, 147, 177, 0.4)' },
  despachador:   { emoji: '🚚', label: 'Despachador',     color: '#D85A30', bgClaro: 'rgba(232, 144, 66, 0.15)',  bgClaroBorde: 'rgba(232, 144, 66, 0.4)' },
  ayudante:      { emoji: '👨‍🍳', label: 'Ayudante',        color: '#0F6E56', bgClaro: 'rgba(29, 158, 117, 0.15)',  bgClaroBorde: 'rgba(29, 158, 117, 0.4)' },
  contador:      { emoji: '🧮', label: 'Contador',        color: '#534AB7', bgClaro: 'rgba(127, 119, 221, 0.15)', bgClaroBorde: 'rgba(127, 119, 221, 0.4)' },
}

function LoginPin({ usuario, onCancelar, onLoginExitoso }) {
  const [pinIngresado, setPinIngresado] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const [tema, setTema] = useState(() => {
    return localStorage.getItem('cocina_pae_tema') || 'oscuro'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const esTropical = tema === 'tropical'
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
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '20px',
            padding: '8px 16px',
            color: 'var(--color-text-secondary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontFamily: 'inherit',
            boxShadow: esTropical ? '0 1px 3px rgba(15, 110, 86, 0.05)' : 'none',
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
          gap: '28px',
        }}
      >
        {/* ─── Avatar circular + nombre + rol (sin card) ─── */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px',
            position: 'relative',
          }}
        >
          {esPropietario && (
            <div
              style={{
                position: 'absolute',
                top: '-8px',
                right: '-36px',
                background: 'var(--gradient-button)',
                color: 'white',
                fontSize: '9px',
                fontWeight: 700,
                padding: '4px 10px',
                borderRadius: '8px',
                letterSpacing: '0.8px',
                boxShadow: esTropical ? '0 2px 4px rgba(186, 117, 23, 0.2)' : 'none',
              }}
            >
              DUEÑA
            </div>
          )}

          {/* Avatar circular minimalista */}
          <div
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: info.bgClaro,
              border: `2px solid ${info.bgClaroBorde}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '44px',
              lineHeight: 1,
            }}
          >
            {info.emoji}
          </div>

          {/* Nombre + Rol (sin card) */}
          <div style={{ textAlign: 'center' }}>
            <div
              style={{
                color: 'var(--color-text-primary)',
                fontSize: '22px',
                fontWeight: 600,
                letterSpacing: '-0.3px',
              }}
            >
              {usuario.nombre}
            </div>
            <div
              style={{
                color: info.color,
                fontSize: '11px',
                fontWeight: 600,
                letterSpacing: '1.5px',
                marginTop: '6px',
                textTransform: 'uppercase',
              }}
            >
              {info.label}
            </div>
          </div>
        </div>

        {/* ─── Display del PIN ─── */}
        <div style={{ textAlign: 'center', marginTop: '8px' }}>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '13px',
              fontWeight: 500,
              margin: '0 0 14px',
              letterSpacing: '0.3px',
            }}
          >
            Ingresa tu PIN
          </p>
          <div
            className={shake ? 'pin-shake' : ''}
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '16px',
            }}
          >
            {[0, 1, 2, 3].map((i) => {
              const lleno = pinIngresado.length > i
              return (
                <div
                  key={i}
                  style={{
                    width: '14px',
                    height: '14px',
                    borderRadius: '50%',
                    border: error
                      ? `2px solid ${esTropical ? '#E24B4A' : '#F44336'}`
                      : lleno
                        ? `2px solid ${info.color}`
                        : '2px solid var(--color-border-strong)',
                    background: error
                      ? (esTropical ? '#E24B4A' : '#F44336')
                      : lleno
                        ? info.color
                        : 'transparent',
                    transition: 'all 0.2s ease',
                  }}
                />
              )
            })}
          </div>
          {error && (
            <p
              style={{
                color: esTropical ? '#A32D2D' : '#F4C0D1',
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

        {/* ─── Teclado numérico minimalista ─── */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 72px)',
            gap: '12px',
            marginTop: '8px',
          }}
        >
          {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
            <button
              key={num}
              onClick={() => agregarDigito(num.toString())}
              style={{
                background: 'var(--color-modulo-bg)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '14px',
                padding: '18px 0',
                fontSize: '24px',
                fontWeight: 500,
                color: 'var(--color-text-primary)',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.15s ease',
                boxShadow: esTropical ? '0 1px 3px rgba(15, 110, 86, 0.05)' : 'none',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'var(--color-bg-hover)'
                e.currentTarget.style.borderColor = 'var(--color-border-accent)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'var(--color-modulo-bg)'
                e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
              }}
            >
              {num}
            </button>
          ))}

          {/* Botón C - Limpiar todo (transparente) */}
          <button
            onClick={limpiarTodo}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '14px',
              padding: '18px 0',
              fontSize: '18px',
              fontWeight: 600,
              color: 'var(--color-text-muted)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = esTropical ? '#A32D2D' : '#F4C0D1'
              e.currentTarget.style.borderColor = esTropical ? '#E24B4A' : 'rgba(244, 67, 54, 0.4)'
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
              background: 'var(--color-modulo-bg)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '14px',
              padding: '18px 0',
              fontSize: '24px',
              fontWeight: 500,
              color: 'var(--color-text-primary)',
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.15s ease',
              boxShadow: esTropical ? '0 1px 3px rgba(15, 110, 86, 0.05)' : 'none',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--color-bg-hover)'
              e.currentTarget.style.borderColor = 'var(--color-border-accent)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'var(--color-modulo-bg)'
              e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
            }}
          >
            0
          </button>

          {/* Botón backspace (transparente) */}
          <button
            onClick={borrarDigito}
            style={{
              background: 'transparent',
              border: '1px solid var(--color-border-subtle)',
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