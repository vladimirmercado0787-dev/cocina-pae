import { useEffect } from 'react'

function IntroAndamio({ onTerminada }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onTerminada()
    }, 5500) // 5.5 segundos total
    return () => clearTimeout(timer)
  }, [onTerminada])

  return (
    <div style={estilos.contenedor}>
      
      {/* PARTÍCULAS DORADAS DE FONDO */}
      <div style={estilos.particulasBg}>
        <div style={{ ...estilos.particula, top: '20%', left: '15%', animationDelay: '0s' }}></div>
        <div style={{ ...estilos.particula, top: '70%', left: '80%', animationDelay: '0.5s' }}></div>
        <div style={{ ...estilos.particula, top: '40%', left: '85%', animationDelay: '1s' }}></div>
        <div style={{ ...estilos.particula, top: '80%', left: '25%', animationDelay: '1.5s' }}></div>
        <div style={{ ...estilos.particula, top: '30%', left: '70%', animationDelay: '0.3s' }}></div>
        <div style={{ ...estilos.particula, top: '60%', left: '10%', animationDelay: '0.8s' }}></div>
        <div style={{ ...estilos.particula, top: '15%', left: '50%', animationDelay: '1.2s', width: '5px', height: '5px' }}></div>
        <div style={{ ...estilos.particula, top: '85%', left: '60%', animationDelay: '0.6s', width: '3px', height: '3px' }}></div>
      </div>

      {/* LOGO ANDAMIO CON GLOW */}
      <div style={estilos.logoWrap}>
        <div style={estilos.logoGlow}></div>
        <div style={estilos.logoBox}>A</div>
      </div>

      {/* TÍTULO */}
      <h1 style={estilos.titulo}>ANDAMIO</h1>

      {/* SEPARADOR DORADO */}
      <div style={estilos.separador}></div>

      {/* TAGLINE */}
      <p style={estilos.tagline}>
        MATERIALIZAMOS IDEAS · CONSTRUIMOS POSIBILIDADES
      </p>

      {/* VERSIÓN */}
      <p style={estilos.version}>COCINA PAE · v1.0</p>

      {/* KEYFRAMES INLINE */}
      <style>{`
        @keyframes introLogoEntra {
          0% { opacity: 0; transform: scale(0.3) rotate(-180deg); }
          100% { opacity: 1; transform: scale(1) rotate(0deg); }
        }
        @keyframes introGlowPulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        @keyframes introSubeDesdeAbajo {
          0% { opacity: 0; transform: translateY(30px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes introExpandirLinea {
          0% { width: 0; }
          100% { width: 140px; }
        }
        @keyframes introFloaty {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.5; }
          50% { transform: translateY(-15px) translateX(5px); opacity: 1; }
        }
        @keyframes introFadeOut {
          0% { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(0.95); }
        }
        .intro-saliendo {
          animation: introFadeOut 0.8s ease 4.7s forwards;
        }
      `}</style>
    </div>
  )
}

const estilos = {
  contenedor: {
    position: 'fixed',
    inset: 0,
    background: 'linear-gradient(145deg, #0F6E56 0%, #04342C 60%, #02201A 100%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '28px',
    zIndex: 9999,
    animation: 'introFadeOut 0.8s ease 4.7s forwards',
    overflow: 'hidden',
  },
  particulasBg: {
    position: 'absolute',
    inset: 0,
    pointerEvents: 'none',
    opacity: 0,
    animation: 'fadeIn 1.5s ease 0.2s forwards',
  },
  particula: {
    position: 'absolute',
    width: '4px',
    height: '4px',
    background: '#FAC775',
    borderRadius: '50%',
    boxShadow: '0 0 8px #FAC775',
    animation: 'introFloaty 4s ease-in-out infinite',
  },
  logoWrap: {
    position: 'relative',
    opacity: 0,
    animation: 'introLogoEntra 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s forwards',
    zIndex: 2,
  },
  logoGlow: {
    position: 'absolute',
    inset: '-25px',
    background: 'radial-gradient(circle, rgba(250, 199, 117, 0.4) 0%, transparent 70%)',
    borderRadius: '50%',
    opacity: 0,
    animation: 'introGlowPulse 2s ease-in-out infinite 1.6s',
  },
  logoBox: {
    position: 'relative',
    width: '140px',
    height: '140px',
    background: 'linear-gradient(135deg, #FAC775 0%, #BA7517 100%)',
    borderRadius: '28px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '84px',
    fontWeight: 500,
    color: '#04342C',
    boxShadow: '0 0 80px rgba(250, 199, 117, 0.5)',
    fontFamily: 'inherit',
  },
  titulo: {
    opacity: 0,
    color: 'white',
    fontSize: '42px',
    fontWeight: 500,
    letterSpacing: '0.4em',
    margin: 0,
    animation: 'introSubeDesdeAbajo 0.8s ease 1.7s forwards',
    zIndex: 2,
  },
  separador: {
    height: '2px',
    background: '#FAC775',
    opacity: 0.6,
    width: 0,
    animation: 'introExpandirLinea 0.6s ease 2.2s forwards',
    zIndex: 2,
  },
  tagline: {
    opacity: 0,
    color: 'rgba(255,255,255,0.8)',
    fontSize: '13px',
    letterSpacing: '0.2em',
    margin: 0,
    textAlign: 'center',
    animation: 'introSubeDesdeAbajo 0.7s ease 2.6s forwards',
    zIndex: 2,
    padding: '0 20px',
  },
  version: {
    opacity: 0,
    position: 'absolute',
    bottom: '32px',
    color: 'rgba(255,255,255,0.4)',
    fontSize: '11px',
    letterSpacing: '0.15em',
    margin: 0,
    animation: 'fadeIn 0.6s ease 3.4s forwards',
    zIndex: 2,
  },
}

export default IntroAndamio