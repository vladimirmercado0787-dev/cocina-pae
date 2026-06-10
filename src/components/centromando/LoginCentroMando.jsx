import { useState } from 'react'
import { supabase } from '../../supabaseClient'

function LoginCentroMando({ empresa, onAcceso, onVolver }) {
  const [clave, setClave] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [error, setError] = useState('')
  const [verificando, setVerificando] = useState(false)

  async function intentarAcceso(e) {
    if (e) e.preventDefault()
    if (!clave.trim()) {
      setError('Ingresa tu clave de mando')
      return
    }
    setVerificando(true)
    setError('')

    const { data, error: rpcError } = await supabase.rpc('verificar_clave_mando', {
      p_empresa_id: empresa.id,
      p_clave: clave,
    })

    setVerificando(false)

    if (rpcError) {
      setError('Error al verificar. Intenta de nuevo.')
      return
    }

    if (data === true) {
      onAcceso()
    } else {
      setError('Clave de mando incorrecta')
      setClave('')
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        background:
          'radial-gradient(ellipse at 50% 0%, #2A3318 0%, #1A2011 55%, #0F1208 100%)',
        fontFamily: 'inherit',
      }}
    >
      <style>{`
        @keyframes cmEntradaShield {
          0% { opacity: 0; transform: translateY(20px) scale(0.8); }
          60% { opacity: 1; transform: translateY(-4px) scale(1.05); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes cmEntradaUp {
          0% { opacity: 0; transform: translateY(18px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes cmEntradaGlow {
          0% { opacity: 0; transform: scale(0.6); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes cmShieldGlow {
          0%, 100% { box-shadow: 0 0 26px rgba(163,181,86,0.45); }
          50% { box-shadow: 0 0 42px rgba(163,181,86,0.7); }
        }
        @keyframes cmErrShake {
          0%,100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        .cm-input::placeholder { color: #5E6B42; }
        .cm-input:focus { border-color: rgba(163,181,86,0.6) !important; }
      `}</style>

      {/* Resplandor superior */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: '50%',
          transform: 'translateX(-50%)',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(163,181,86,0.18), transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none',
          opacity: 0,
          animation: 'cmEntradaGlow 1.4s ease 0.1s forwards',
        }}
      />

      {/* Botón volver */}
      <button
        onClick={onVolver}
        style={{
          position: 'absolute',
          top: '24px',
          left: '24px',
          background: 'rgba(40,49,26,0.5)',
          border: '1px solid rgba(163,181,86,0.25)',
          borderRadius: '20px',
          padding: '9px 16px',
          color: '#B8C77A',
          fontSize: '12px',
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          zIndex: 5,
        }}
      >
        ← Volver
      </button>

      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: '380px',
          textAlign: 'center',
          zIndex: 2,
        }}
      >
        {/* Escudo */}
        <div
          style={{
            width: '72px',
            height: '72px',
            margin: '0 auto 22px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, #A3B556, #5E7029)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '36px',
            opacity: 0,
            animation: 'cmEntradaShield 0.9s cubic-bezier(0.34,1.56,0.64,1) 0.2s forwards, cmShieldGlow 3s ease-in-out 1.2s infinite',
          }}
        >
          🛡️
        </div>

        <p
          style={{
            margin: '0 0 4px',
            fontSize: '12px',
            letterSpacing: '4px',
            color: '#8A9663',
            opacity: 0,
            animation: 'cmEntradaUp 0.6s ease 0.4s forwards',
          }}
        >
          ANDAMIO
        </p>
        <h1
          style={{
            margin: '0 0 8px',
            fontSize: '26px',
            fontWeight: 600,
            color: '#EDF1DD',
            letterSpacing: '0.3px',
            opacity: 0,
            animation: 'cmEntradaUp 0.6s ease 0.5s forwards',
          }}
        >
          Centro de Mando
        </h1>
        <p
          style={{
            margin: '0 0 32px',
            fontSize: '13px',
            color: '#6E7857',
            opacity: 0,
            animation: 'cmEntradaUp 0.6s ease 0.6s forwards',
          }}
        >
          Plataforma Cocina PAE · acceso restringido
        </p>

        <form onSubmit={intentarAcceso}>
          {/* Correo (solo visual, ya viene de la empresa logueada) */}
          <div
            style={{
              textAlign: 'left',
              marginBottom: '16px',
              opacity: 0,
              animation: 'cmEntradaUp 0.6s ease 0.7s forwards',
            }}
          >
            <label style={{ fontSize: '11px', letterSpacing: '1px', color: '#6E7857', display: 'block', marginBottom: '6px' }}>
              CUENTA
            </label>
            <div
              style={{
                background: 'rgba(14,18,8,0.6)',
                border: '1px solid rgba(163,181,86,0.18)',
                borderRadius: '12px',
                padding: '13px 15px',
                color: '#8FA06B',
                fontSize: '14px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              <span style={{ fontSize: '15px' }}>🏢</span>
              {empresa?.nombre || 'Mi cuenta'}
            </div>
          </div>

          {/* Clave de mando */}
          <div
            style={{
              textAlign: 'left',
              marginBottom: '20px',
              opacity: 0,
              animation: 'cmEntradaUp 0.6s ease 0.8s forwards',
            }}
          >
            <label style={{ fontSize: '11px', letterSpacing: '1px', color: '#6E7857', display: 'block', marginBottom: '6px' }}>
              CLAVE DE MANDO
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="cm-input"
                type={verClave ? 'text' : 'password'}
                value={clave}
                onChange={(e) => { setClave(e.target.value); if (error) setError('') }}
                placeholder="••••••••"
                autoFocus
                style={{
                  width: '100%',
                  background: 'rgba(14,18,8,0.6)',
                  border: `1px solid ${error ? '#C45B4A' : 'rgba(163,181,86,0.25)'}`,
                  borderRadius: '12px',
                  padding: '13px 44px 13px 15px',
                  color: '#EDF1DD',
                  fontSize: '15px',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.2s ease',
                  animation: error ? 'cmErrShake 0.4s ease' : 'none',
                }}
              />
              <button
                type="button"
                onClick={() => setVerClave(!verClave)}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px',
                  opacity: 0.6,
                }}
              >
                {verClave ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {error && (
            <div
              style={{
                background: 'rgba(196,91,74,0.12)',
                border: '1px solid rgba(196,91,74,0.4)',
                borderRadius: '10px',
                padding: '10px 12px',
                fontSize: '12px',
                color: '#E8A598',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <button
            type="submit"
            disabled={verificando}
            style={{
              width: '100%',
              padding: '14px',
              background: verificando
                ? 'rgba(163,181,86,0.4)'
                : 'linear-gradient(135deg, #A3B556, #5E7029)',
              border: 'none',
              borderRadius: '12px',
              color: '#0F1208',
              fontSize: '15px',
              fontWeight: 700,
              cursor: verificando ? 'wait' : 'pointer',
              fontFamily: 'inherit',
              letterSpacing: '0.3px',
              opacity: 0,
              animation: 'cmEntradaUp 0.6s ease 0.9s forwards',
              transition: 'transform 0.15s ease',
            }}
            onMouseDown={(e) => { if (!verificando) e.currentTarget.style.transform = 'scale(0.98)' }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {verificando ? 'Verificando...' : 'Entrar al Centro de Mando'}
          </button>
        </form>

        <p
          style={{
            margin: '24px 0 0',
            fontSize: '11px',
            color: '#4E5838',
            opacity: 0,
            animation: 'cmEntradaUp 0.6s ease 1s forwards',
          }}
        >
          🔒 Solo personal autorizado
        </p>
      </div>
    </div>
  )
}

export default LoginCentroMando