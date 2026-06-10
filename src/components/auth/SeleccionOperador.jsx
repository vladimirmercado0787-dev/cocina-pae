import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalEmpleado from '../empleados/ModalEmpleado'

// ─── Información visual por rol ───
const ROL_INFO = {
  propietario:   { emoji: '👑', label: 'Propietario',     color: '#BA7517', colorBg: '#FAC775', colorDarker: '#633806', bgClaro: 'rgba(250, 199, 117, 0.15)' },
  administrador: { emoji: '💼', label: 'Administrador',   color: '#185FA5', colorBg: '#85B7EB', colorDarker: '#0C447C', bgClaro: 'rgba(24, 95, 165, 0.10)' },
  secretaria:    { emoji: '📋', label: 'Secretaria',      color: '#D4537E', colorBg: '#ED93B1', colorDarker: '#72243E', bgClaro: 'rgba(212, 83, 126, 0.10)' },
  jefa_cocina:   { emoji: '👩‍🍳', label: 'Jefa de cocina',  color: '#D4537E', colorBg: '#ED93B1', colorDarker: '#72243E', bgClaro: 'rgba(237, 147, 177, 0.10)' },
  despachador:   { emoji: '🚚', label: 'Despachador',     color: '#D85A30', colorBg: '#E89042', colorDarker: '#7A2F12', bgClaro: 'rgba(232, 144, 66, 0.10)' },
  ayudante:      { emoji: '👨‍🍳', label: 'Ayudante',        color: '#0F6E56', colorBg: '#1D9E75', colorDarker: '#04342C', bgClaro: 'rgba(29, 158, 117, 0.10)' },
  contador:      { emoji: '🧮', label: 'Contador',        color: '#534AB7', colorBg: '#7F77DD', colorDarker: '#3C3489', bgClaro: 'rgba(83, 74, 183, 0.10)' },
}

const ASIST = { c: '#0F6E56', bg: '#1D9E75', claro: 'rgba(29, 158, 117, 0.12)' }

// Fecha local del dispositivo en formato AAAA-MM-DD (para que el reinicio a medianoche sea correcto)
function fechaLocal(d) {
  const a = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${a}-${m}-${dia}`
}

function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function SeleccionOperador({ empresaId, onSeleccionar, onCerrarSesion, onAbrirCentroMando }) {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)

  // ─── Flujo agregar empleado con autorización por PIN ───
  const [pasoAutorizacion, setPasoAutorizacion] = useState(null) // null | 'seleccionar' | 'pin' | 'crear'
  const [autorizadorSeleccionado, setAutorizadorSeleccionado] = useState(null)
  const [pinIngresado, setPinIngresado] = useState('')
  const [errorPin, setErrorPin] = useState('')

  // ─── Flujo marcar asistencia ───
  const [pasoAsistencia, setPasoAsistencia] = useState(null) // null | 'seleccionar' | 'pin' | 'resultado'
  const [empleadoAsistencia, setEmpleadoAsistencia] = useState(null)
  const [pinAsistencia, setPinAsistencia] = useState('')
  const [errorPinAsistencia, setErrorPinAsistencia] = useState('')
  const [guardandoAsistencia, setGuardandoAsistencia] = useState(false)
  const [resultadoAsistencia, setResultadoAsistencia] = useState(null) // { tipo, nombre, hora, mensaje }

  const [tema, setTema] = useState(() => {
    return localStorage.getItem('cocina_pae_tema') || 'oscuro'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const esTropical = tema === 'tropical'

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

  // 🔐 ¿Esta cocina tiene un súper-admin? → mostrar acceso al Centro de Mando
  const hayCentroMando = usuarios.some(u => u.es_super_admin === true)

  // ─── FLUJO AUTORIZACIÓN ───
  function manejarAgregarEmpleado() {
    setPasoAutorizacion('seleccionar')
    setAutorizadorSeleccionado(null)
    setPinIngresado('')
    setErrorPin('')
  }

  function seleccionarAutorizador(usuario) {
    setAutorizadorSeleccionado(usuario)
    setPinIngresado('')
    setErrorPin('')
    setPasoAutorizacion('pin')
  }

  function presionarTecla(digito) {
    if (pinIngresado.length >= 4) return
    const nuevoPin = pinIngresado + digito
    setPinIngresado(nuevoPin)
    if (errorPin) setErrorPin('')

    if (nuevoPin.length === 4) {
      setTimeout(() => validarPinDirecto(nuevoPin), 150)
    }
  }

  function borrarTecla() {
    setPinIngresado(pinIngresado.slice(0, -1))
    if (errorPin) setErrorPin('')
  }

  function limpiarPin() {
    setPinIngresado('')
    if (errorPin) setErrorPin('')
  }

  function validarPinDirecto(pin) {
    if (!autorizadorSeleccionado) return
    if (pin !== autorizadorSeleccionado.pin) {
      setErrorPin('PIN incorrecto. Intenta de nuevo.')
      setPinIngresado('')
      return
    }
    setErrorPin('')
    setPasoAutorizacion('crear')
  }

  function cerrarFlujoAutorizacion() {
    setPasoAutorizacion(null)
    setAutorizadorSeleccionado(null)
    setPinIngresado('')
    setErrorPin('')
  }

  async function empleadoCreado() {
    cerrarFlujoAutorizacion()
    await cargarUsuarios()
  }

  // ─── FLUJO MARCAR ASISTENCIA ───
  function manejarMarcarAsistencia() {
    setPasoAsistencia('seleccionar')
    setEmpleadoAsistencia(null)
    setPinAsistencia('')
    setErrorPinAsistencia('')
    setResultadoAsistencia(null)
  }

  function seleccionarEmpleadoAsistencia(usuario) {
    setEmpleadoAsistencia(usuario)
    setPinAsistencia('')
    setErrorPinAsistencia('')
    setPasoAsistencia('pin')
  }

  function presionarTeclaAsistencia(digito) {
    if (pinAsistencia.length >= 4) return
    const nuevoPin = pinAsistencia + digito
    setPinAsistencia(nuevoPin)
    if (errorPinAsistencia) setErrorPinAsistencia('')

    if (nuevoPin.length === 4) {
      setTimeout(() => validarPinAsistencia(nuevoPin), 150)
    }
  }

  function borrarTeclaAsistencia() {
    setPinAsistencia(pinAsistencia.slice(0, -1))
    if (errorPinAsistencia) setErrorPinAsistencia('')
  }

  function limpiarPinAsistencia() {
    setPinAsistencia('')
    if (errorPinAsistencia) setErrorPinAsistencia('')
  }

  function validarPinAsistencia(pin) {
    if (!empleadoAsistencia) return
    if (pin !== empleadoAsistencia.pin) {
      setErrorPinAsistencia('PIN incorrecto. Intenta de nuevo.')
      setPinAsistencia('')
      return
    }
    setErrorPinAsistencia('')
    registrarAsistencia(empleadoAsistencia)
  }

  async function registrarAsistencia(u) {
    setGuardandoAsistencia(true)
    const ahora = new Date()
    const hoy = fechaLocal(ahora)

    // ¿Ya marcó hoy?
    const { data: existente } = await supabase
      .from('asistencias')
      .select('hora_entrada')
      .eq('usuario_id', u.id)
      .eq('fecha', hoy)
      .maybeSingle()

    if (existente) {
      setResultadoAsistencia({ tipo: 'ya', nombre: u.nombre, hora: formatHora(existente.hora_entrada) })
      setPasoAsistencia('resultado')
      setGuardandoAsistencia(false)
      return
    }

    const { error } = await supabase.from('asistencias').insert([{
      empresa_id: empresaId,
      usuario_id: u.id,
      usuario_nombre: u.nombre,
      fecha: hoy,
      hora_entrada: ahora.toISOString(),
      origen: 'pin_tablet',
    }])

    setGuardandoAsistencia(false)

    if (error) {
      // Si por alguna razón ya existía (doble toque rápido), tratarlo como "ya marcó"
      if (error.code === '23505') {
        setResultadoAsistencia({ tipo: 'ya', nombre: u.nombre, hora: formatHora(ahora.toISOString()) })
      } else {
        setResultadoAsistencia({ tipo: 'error', nombre: u.nombre, mensaje: error.message })
      }
      setPasoAsistencia('resultado')
      return
    }

    setResultadoAsistencia({ tipo: 'exito', nombre: u.nombre, hora: formatHora(ahora.toISOString()) })
    setPasoAsistencia('resultado')
  }

  function cerrarFlujoAsistencia() {
    setPasoAsistencia(null)
    setEmpleadoAsistencia(null)
    setPinAsistencia('')
    setErrorPinAsistencia('')
    setResultadoAsistencia(null)
  }

  // Filtrar solo Propietario y Administrador para autorización
  const autorizadoresValidos = usuarios.filter(u =>
    u.rol === 'propietario' || u.rol === 'administrador'
  )

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
      <style>{`
        @keyframes selOpSlideFromTop {
          0% { opacity: 0; transform: translateY(-20px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes selOpFadeInUp {
          0% { opacity: 0; transform: translateY(15px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes selOpBounceIn {
          0% { opacity: 0; transform: translateY(30px) scale(0.85); }
          60% { opacity: 1; transform: translateY(-4px) scale(1.02); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes selOpFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes selOpAvatarPop {
          0% { transform: scale(0); }
          70% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes modalFadeIn {
          0% { opacity: 0; }
          100% { opacity: 1; }
        }
        @keyframes modalSlideUp {
          0% { opacity: 0; transform: translateY(20px) scale(0.96); }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes pinDotPulse {
          0% { transform: scale(0.5); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
        @keyframes pinShake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-8px); }
          75% { transform: translateX(8px); }
        }
        @keyframes exitoPop {
          0% { transform: scale(0); }
          60% { transform: scale(1.15); }
          100% { transform: scale(1); }
        }
        @keyframes cmGlowPulse {
          0%, 100% { box-shadow: 0 0 20px rgba(163,181,86,0.25), inset 0 0 0 1px rgba(163,181,86,0.2); }
          50% { box-shadow: 0 0 32px rgba(163,181,86,0.45), inset 0 0 0 1px rgba(163,181,86,0.35); }
        }
      `}</style>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
          pointerEvents: 'none',
          opacity: 0,
          animation: 'selOpFadeIn 1.2s ease 0.1s forwards',
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
          opacity: 0,
          animation: 'selOpSlideFromTop 0.6s ease 0.1s forwards',
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

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
              <span style={{ fontSize: '11px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>
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
              <span style={{ fontSize: '11px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>
                Claro
              </span>
            </button>
          </div>

          {onCerrarSesion && (
            <button
              type="button"
              onClick={onCerrarSesion}
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '20px',
                padding: '8px 16px',
                color: 'var(--color-text-secondary)',
                fontSize: '12px',
                fontWeight: 500,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.3s ease',
                boxShadow: esTropical ? '0 1px 3px rgba(15, 110, 86, 0.05)' : 'none',
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
        <div style={{ textAlign: 'center', marginBottom: '28px', maxWidth: '600px' }}>
          <h1
            style={{
              color: 'var(--color-text-primary)',
              fontSize: '32px',
              fontWeight: 500,
              margin: '0 0 10px',
              letterSpacing: '-0.5px',
              opacity: 0,
              animation: 'selOpFadeInUp 0.7s ease 0.4s forwards',
            }}
          >
            ¿Quién está usando la app?
          </h1>
          <p
            style={{
              color: 'var(--color-text-secondary)',
              fontSize: '14px',
              margin: 0,
              fontWeight: 500,
              opacity: 0,
              animation: 'selOpFadeInUp 0.6s ease 0.6s forwards',
            }}
          >
            Selecciona tu nombre y luego ingresa tu PIN
          </p>
        </div>

        {/* ─── 🔐 ACCESO CENTRO DE MANDO (solo si hay súper-admin) ─── */}
        {!cargando && hayCentroMando && onAbrirCentroMando && (
          <div
            style={{
              width: '100%',
              maxWidth: '1000px',
              padding: '0 12px',
              marginBottom: '20px',
              opacity: 0,
              animation: 'selOpFadeInUp 0.6s ease 0.65s forwards',
            }}
          >
            <button
              onClick={onAbrirCentroMando}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '18px 22px',
                background: 'linear-gradient(135deg, rgba(163,181,86,0.16) 0%, rgba(40,49,26,0.4) 100%)',
                border: '1px solid rgba(163,181,86,0.4)',
                borderLeft: '5px solid #A3B556',
                borderRadius: '16px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.25s ease',
                animation: 'cmGlowPulse 3s ease-in-out infinite',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #A3B556, #5E7029)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  flexShrink: 0,
                }}
              >
                🛡️
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: '10px', letterSpacing: '2px', color: '#A3B556', fontWeight: 700, marginBottom: '2px' }}>
                  ACCESO RESTRINGIDO
                </div>
                <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Centro de Mando
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Plataforma Cocina PAE · todas las cocinas
                </div>
              </div>
              <div style={{ fontSize: '20px', color: '#A3B556' }}>→</div>
            </button>
          </div>
        )}

        {/* ─── CUADRO MARCAR ASISTENCIA ─── */}
        {!cargando && usuarios.length > 0 && (
          <div
            style={{
              width: '100%',
              maxWidth: '1000px',
              padding: '0 12px',
              marginBottom: '28px',
              opacity: 0,
              animation: 'selOpFadeInUp 0.6s ease 0.7s forwards',
            }}
          >
            <button
              onClick={manejarMarcarAsistencia}
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '18px 22px',
                background: esTropical
                  ? `linear-gradient(135deg, ${ASIST.claro} 0%, var(--color-bg-elevated) 100%)`
                  : `linear-gradient(135deg, rgba(29, 158, 117, 0.18) 0%, rgba(15, 110, 86, 0.06) 100%)`,
                border: `1px solid ${ASIST.bg}55`,
                borderLeft: `5px solid ${ASIST.bg}`,
                borderRadius: '16px',
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 8px 20px ${ASIST.bg}25`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '14px',
                  background: ASIST.bg,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '26px',
                  flexShrink: 0,
                }}
              >
                ✅
              </div>
              <div style={{ flex: 1, textAlign: 'left' }}>
                <div style={{ fontSize: '17px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                  Marcar asistencia
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                  Toca aquí para registrar tu entrada del día con tu PIN
                </div>
              </div>
              <div style={{ fontSize: '20px', color: ASIST.bg }}>→</div>
            </button>
          </div>
        )}

        {cargando && (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
              ⏳ Cargando equipo...
            </p>
          </div>
        )}

        {!cargando && usuarios.length === 0 && (
          <div
            style={{
              background: esTropical ? '#FAF3E5' : 'rgba(250, 199, 117, 0.08)',
              border: esTropical ? '1px solid rgba(186, 117, 23, 0.3)' : '1px solid var(--color-border-accent)',
              borderLeft: esTropical ? '4px solid #BA7517' : '1px solid var(--color-border-accent)',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '500px',
              textAlign: 'center',
              opacity: 0,
              animation: 'selOpFadeInUp 0.6s ease 0.7s forwards',
            }}
          >
            <p style={{ color: esTropical ? '#633806' : 'var(--color-text-accent)', fontSize: '14px', margin: 0, fontWeight: 500 }}>
              ⚠️ No hay personas registradas. Completa el Paso 5 del Wizard primero.
            </p>
          </div>
        )}

        {!cargando && usuarios.length > 0 && (
          <div
            style={{
              width: '100%',
              maxWidth: '1000px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
              gap: '16px',
              padding: '0 12px',
            }}
          >
            {usuarios.map((usuario, index) => {
              const info = getInfo(usuario.rol)
              const esPropietario = usuario.rol === 'propietario'
              const delayCascada = 0.8 + (index * 0.12)
              return (
                <button
                  key={usuario.id}
                  onClick={() => onSeleccionar(usuario)}
                  style={{
                    position: 'relative',
                    background: esTropical
                      ? (esPropietario
                          ? `linear-gradient(135deg, ${info.bgClaro} 0%, var(--color-bg-elevated) 100%)`
                          : 'var(--color-bg-elevated)')
                      : (esPropietario
                          ? `linear-gradient(135deg, ${info.bgClaro} 0%, rgba(250, 199, 117, 0.05) 100%)`
                          : 'var(--color-bg-card)'),
                    border: esTropical
                      ? `1px solid ${info.color}25`
                      : (esPropietario
                          ? `1px solid ${info.color}80`
                          : `1px solid ${info.color}40`),
                    borderLeft: `4px solid ${info.color}`,
                    borderRadius: '14px',
                    padding: '22px 16px',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '10px',
                    transition: 'all 0.25s ease',
                    fontFamily: 'inherit',
                    boxShadow: esTropical ? `0 2px 8px ${info.color}10` : 'none',
                    opacity: 0,
                    animation: `selOpBounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${delayCascada}s forwards`,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)'
                    e.currentTarget.style.borderColor = info.color
                    e.currentTarget.style.boxShadow = esTropical
                      ? `0 8px 20px ${info.color}25, 0 4px 8px ${info.color}15`
                      : `0 8px 20px ${info.color}30`
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)'
                    e.currentTarget.style.borderColor = esTropical
                      ? `${info.color}25`
                      : (esPropietario ? `${info.color}80` : `${info.color}40`)
                    e.currentTarget.style.boxShadow = esTropical ? `0 2px 8px ${info.color}10` : 'none'
                  }}
                >
                  {esPropietario && (
                    <div
                      style={{
                        position: 'absolute',
                        top: '-8px',
                        right: '12px',
                        background: 'var(--gradient-button)',
                        color: 'white',
                        fontSize: '9px',
                        fontWeight: 700,
                        padding: '4px 10px',
                        borderRadius: '8px',
                        letterSpacing: '0.8px',
                        boxShadow: esTropical ? '0 2px 6px rgba(186, 117, 23, 0.3)' : 'none',
                      }}
                    >
                      DUEÑA
                    </div>
                  )}

                  <div
                    style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: esTropical ? `${info.color}15` : `${info.color}25`,
                      border: `2px solid ${info.color}40`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '32px',
                      lineHeight: 1,
                      animation: `selOpAvatarPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) ${delayCascada + 0.2}s backwards`,
                    }}
                  >
                    {info.emoji}
                  </div>

                  <p
                    style={{
                      color: esTropical ? info.colorDarker : 'var(--color-text-primary)',
                      fontSize: '15px',
                      fontWeight: 600,
                      margin: 0,
                      textAlign: 'center',
                      lineHeight: 1.2,
                      letterSpacing: '-0.2px',
                    }}
                  >
                    {usuario.nombre}
                  </p>

                  <span
                    style={{
                      color: esTropical ? '#ffffff' : info.color,
                      background: esTropical ? info.color : `${info.color}20`,
                      fontSize: '10px',
                      fontWeight: 700,
                      padding: '4px 10px',
                      borderRadius: '8px',
                      letterSpacing: '0.8px',
                      textTransform: 'uppercase',
                    }}
                  >
                    {info.label}
                  </span>
                </button>
              )
            })}

            {/* Tarjeta "+ Agregar empleado" */}
            <button
              onClick={manejarAgregarEmpleado}
              style={{
                background: 'transparent',
                border: '2px dashed var(--color-border-strong)',
                borderRadius: '14px',
                padding: '22px 16px',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                minHeight: '160px',
                transition: 'all 0.25s ease',
                fontFamily: 'inherit',
                opacity: 0,
                animation: `selOpBounceIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) ${0.8 + (usuarios.length * 0.12)}s forwards`,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-text-accent)'
                e.currentTarget.style.background = esTropical
                  ? 'rgba(15, 110, 86, 0.04)'
                  : 'rgba(250, 199, 117, 0.05)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = 'var(--color-border-strong)'
                e.currentTarget.style.background = 'transparent'
              }}
            >
              <div
                style={{
                  width: '52px',
                  height: '52px',
                  borderRadius: '50%',
                  background: 'var(--color-bg-elevated)',
                  border: '1px dashed var(--color-border-strong)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '28px',
                  lineHeight: 1,
                  color: 'var(--color-text-muted)',
                  fontWeight: 300,
                }}
              >
                +
              </div>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600, margin: 0, textAlign: 'center' }}>
                Agregar empleado
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '10px', margin: 0, textAlign: 'center', letterSpacing: '0.3px', fontWeight: 500 }}>
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
          opacity: 0,
          animation: `selOpFadeInUp 0.7s ease ${1.2 + (usuarios.length * 0.12)}s forwards`,
        }}
      >
        {!cargando && usuarios.length > 0 && (
          <p style={{ color: 'var(--color-text-muted)', fontSize: '11px', marginBottom: '8px', fontWeight: 500 }}>
            {usuarios.length} {usuarios.length === 1 ? 'persona activa' : 'personas activas'}
          </p>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🇩🇴</span>
          <span style={{ color: 'var(--color-text-accent)', opacity: 0.85, fontSize: '11px', fontWeight: 600, letterSpacing: '0.5px' }}>
            Hecho en República Dominicana
          </span>
        </div>
      </div>

      {/* ════════════════════════════════════════════════
          MODAL: PASO 1 — ¿QUIÉN AUTORIZA?
          ════════════════════════════════════════════════ */}
      {pasoAutorizacion === 'seleccionar' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
          animation: 'modalFadeIn 0.2s ease forwards',
        }}>
          <div style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border-accent)',
            borderRadius: '16px',
            maxWidth: '520px', width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'modalSlideUp 0.3s ease forwards',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'rgba(127, 119, 221, 0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>🔐</div>
                <div>
                  <div style={{ fontSize: '10px', color: '#7F77DD', letterSpacing: '1.5px', fontWeight: 600 }}>
                    AUTORIZACIÓN REQUERIDA
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    ¿Quién autoriza?
                  </div>
                </div>
              </div>
              <button onClick={cerrarFlujoAutorizacion} style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '20px', padding: '7px 14px',
                color: 'var(--color-text-secondary)', fontSize: '12px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>✖ Cancelar</button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              <p style={{
                fontSize: '12px', color: 'var(--color-text-secondary)',
                margin: '0 0 16px', lineHeight: 1.5,
              }}>
                Para agregar un empleado nuevo se requiere autorización del Propietario o Administrador. Selecciona tu usuario para validar tu PIN.
              </p>

              {autorizadoresValidos.length === 0 ? (
                <div style={{
                  background: 'rgba(244, 67, 54, 0.12)',
                  border: '1px solid rgba(244, 67, 54, 0.35)',
                  borderRadius: '10px', padding: '12px',
                  fontSize: '12px', color: '#F4C0D1',
                }}>
                  ⚠️ No hay propietario o administrador registrado para autorizar.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {autorizadoresValidos.map(u => {
                    const info = getInfo(u.rol)
                    return (
                      <button
                        key={u.id}
                        onClick={() => seleccionarAutorizador(u)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: '14px',
                          padding: '14px',
                          background: 'var(--color-bg-elevated)',
                          border: `1px solid ${info.color}40`,
                          borderLeft: `4px solid ${info.color}`,
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                          transition: 'all 0.2s ease',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = esTropical ? info.bgClaro : `${info.color}15`
                          e.currentTarget.style.transform = 'translateX(2px)'
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'var(--color-bg-elevated)'
                          e.currentTarget.style.transform = 'translateX(0)'
                        }}
                      >
                        <div style={{
                          width: '46px', height: '46px', borderRadius: '50%',
                          background: `${info.color}20`,
                          border: `2px solid ${info.color}40`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '24px', flexShrink: 0,
                        }}>{info.emoji}</div>
                        <div style={{ flex: 1, textAlign: 'left' }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {u.nombre}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {info.label}
                          </div>
                        </div>
                        <div style={{ color: 'var(--color-text-muted)', fontSize: '16px' }}>→</div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          MODAL: PASO 2 — INGRESAR PIN (TECLADO TOUCH)
          ════════════════════════════════════════════════ */}
      {pasoAutorizacion === 'pin' && autorizadorSeleccionado && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', overflowY: 'auto',
          animation: 'modalFadeIn 0.2s ease forwards',
        }}>
          <div style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border-accent)',
            borderRadius: '16px',
            maxWidth: '420px', width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'modalSlideUp 0.3s ease forwards',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: `${getInfo(autorizadorSeleccionado.rol).color}25`,
                  border: `2px solid ${getInfo(autorizadorSeleccionado.rol).color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>{getInfo(autorizadorSeleccionado.rol).emoji}</div>
                <div>
                  <div style={{ fontSize: '10px', color: getInfo(autorizadorSeleccionado.rol).color, letterSpacing: '1.5px', fontWeight: 600 }}>
                    PIN DE ACCESO
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    {autorizadorSeleccionado.nombre}
                  </div>
                </div>
              </div>
              <button onClick={() => setPasoAutorizacion('seleccionar')} style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '20px', padding: '7px 12px',
                color: 'var(--color-text-secondary)', fontSize: '11px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>← Atrás</button>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{
                fontSize: '12px', color: 'var(--color-text-secondary)',
                margin: '0 0 20px', textAlign: 'center',
              }}>
                Ingresa tu PIN de 4 dígitos
              </p>

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '14px',
                marginBottom: '20px',
                animation: errorPin ? 'pinShake 0.4s ease' : 'none',
              }}>
                {[0, 1, 2, 3].map((idx) => {
                  const lleno = pinIngresado.length > idx
                  return (
                    <div
                      key={idx}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: lleno
                          ? (errorPin ? '#E24B4A' : 'var(--color-text-accent)')
                          : 'transparent',
                        border: `2px solid ${errorPin ? '#E24B4A' : (lleno ? 'var(--color-text-accent)' : 'var(--color-border-strong)')}`,
                        transition: 'all 0.2s ease',
                        animation: lleno ? `pinDotPulse 0.3s ease ${idx * 0.05}s` : 'none',
                      }}
                    />
                  )
                })}
              </div>

              {errorPin && (
                <div style={{
                  background: 'rgba(244, 67, 54, 0.12)',
                  border: '1px solid rgba(244, 67, 54, 0.35)',
                  borderRadius: '10px', padding: '10px 12px',
                  fontSize: '12px', color: '#F4C0D1',
                  marginBottom: '16px', textAlign: 'center',
                }}>⚠️ {errorPin}</div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
              }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <BotonTecla
                    key={num}
                    digito={num}
                    onClick={() => presionarTecla(String(num))}
                    esTropical={esTropical}
                  />
                ))}

                <BotonAccion
                  onClick={limpiarPin}
                  esTropical={esTropical}
                  disabled={pinIngresado.length === 0}
                >
                  ✖
                </BotonAccion>

                <BotonTecla
                  digito={0}
                  onClick={() => presionarTecla('0')}
                  esTropical={esTropical}
                />

                <BotonAccion
                  onClick={borrarTecla}
                  esTropical={esTropical}
                  disabled={pinIngresado.length === 0}
                >
                  ⌫
                </BotonAccion>
              </div>

              <p style={{
                fontSize: '11px',
                color: 'var(--color-text-muted)',
                textAlign: 'center',
                margin: '16px 0 0',
              }}>
                Se valida automáticamente al completar 4 dígitos
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          MODAL: PASO 3 — CREAR EMPLEADO
          ════════════════════════════════════════════════ */}
      {pasoAutorizacion === 'crear' && (
        <ModalEmpleado
          empresaId={empresaId}
          empleadoExistente={null}
          onCerrar={cerrarFlujoAutorizacion}
          onGuardado={empleadoCreado}
        />
      )}

      {/* ════════════════════════════════════════════════
          MODAL ASISTENCIA: PASO 1 — ¿QUIÉN MARCA?
          ════════════════════════════════════════════════ */}
      {pasoAsistencia === 'seleccionar' && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', overflowY: 'auto',
          animation: 'modalFadeIn 0.2s ease forwards',
        }}>
          <div style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border-accent)',
            borderRadius: '16px',
            maxWidth: '560px', width: '100%',
            maxHeight: '90vh',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'modalSlideUp 0.3s ease forwards',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: ASIST.claro,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>✅</div>
                <div>
                  <div style={{ fontSize: '10px', color: ASIST.bg, letterSpacing: '1.5px', fontWeight: 600 }}>
                    MARCAR ASISTENCIA
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    ¿Quién está marcando?
                  </div>
                </div>
              </div>
              <button onClick={cerrarFlujoAsistencia} style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '20px', padding: '7px 14px',
                color: 'var(--color-text-secondary)', fontSize: '12px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>✖ Cancelar</button>
            </div>

            <div style={{ padding: '20px 24px', overflowY: 'auto' }}>
              <p style={{
                fontSize: '12px', color: 'var(--color-text-secondary)',
                margin: '0 0 16px', lineHeight: 1.5,
              }}>
                Toca tu nombre y luego pon tu PIN para registrar tu entrada de hoy.
              </p>

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                gap: '12px',
              }}>
                {usuarios.map(u => {
                  const info = getInfo(u.rol)
                  return (
                    <button
                      key={u.id}
                      onClick={() => seleccionarEmpleadoAsistencia(u)}
                      style={{
                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px',
                        padding: '16px 12px',
                        background: 'var(--color-bg-elevated)',
                        border: `1px solid ${info.color}40`,
                        borderLeft: `4px solid ${info.color}`,
                        borderRadius: '12px',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = esTropical ? info.bgClaro : `${info.color}15`
                        e.currentTarget.style.transform = 'translateY(-2px)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--color-bg-elevated)'
                        e.currentTarget.style.transform = 'translateY(0)'
                      }}
                    >
                      <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: `${info.color}20`,
                        border: `2px solid ${info.color}40`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '26px',
                      }}>{info.emoji}</div>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', textAlign: 'center', lineHeight: 1.2 }}>
                        {u.nombre}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          MODAL ASISTENCIA: PASO 2 — PIN
          ════════════════════════════════════════════════ */}
      {pasoAsistencia === 'pin' && empleadoAsistencia && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px', overflowY: 'auto',
          animation: 'modalFadeIn 0.2s ease forwards',
        }}>
          <div style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border-accent)',
            borderRadius: '16px',
            maxWidth: '420px', width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
            animation: 'modalSlideUp 0.3s ease forwards',
          }}>
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border-subtle)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '50%',
                  background: `${getInfo(empleadoAsistencia.rol).color}25`,
                  border: `2px solid ${getInfo(empleadoAsistencia.rol).color}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>{getInfo(empleadoAsistencia.rol).emoji}</div>
                <div>
                  <div style={{ fontSize: '10px', color: ASIST.bg, letterSpacing: '1.5px', fontWeight: 600 }}>
                    CONFIRMA TU PIN
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    {empleadoAsistencia.nombre}
                  </div>
                </div>
              </div>
              <button onClick={() => setPasoAsistencia('seleccionar')} disabled={guardandoAsistencia} style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '20px', padding: '7px 12px',
                color: 'var(--color-text-secondary)', fontSize: '11px',
                cursor: guardandoAsistencia ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: guardandoAsistencia ? 0.5 : 1,
              }}>← Atrás</button>
            </div>

            <div style={{ padding: '24px' }}>
              <p style={{
                fontSize: '12px', color: 'var(--color-text-secondary)',
                margin: '0 0 20px', textAlign: 'center',
              }}>
                {guardandoAsistencia ? 'Registrando...' : 'Ingresa tu PIN de 4 dígitos'}
              </p>

              <div style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '14px',
                marginBottom: '20px',
                animation: errorPinAsistencia ? 'pinShake 0.4s ease' : 'none',
              }}>
                {[0, 1, 2, 3].map((idx) => {
                  const lleno = pinAsistencia.length > idx
                  return (
                    <div
                      key={idx}
                      style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: lleno
                          ? (errorPinAsistencia ? '#E24B4A' : ASIST.bg)
                          : 'transparent',
                        border: `2px solid ${errorPinAsistencia ? '#E24B4A' : (lleno ? ASIST.bg : 'var(--color-border-strong)')}`,
                        transition: 'all 0.2s ease',
                        animation: lleno ? `pinDotPulse 0.3s ease ${idx * 0.05}s` : 'none',
                      }}
                    />
                  )
                })}
              </div>

              {errorPinAsistencia && (
                <div style={{
                  background: 'rgba(244, 67, 54, 0.12)',
                  border: '1px solid rgba(244, 67, 54, 0.35)',
                  borderRadius: '10px', padding: '10px 12px',
                  fontSize: '12px', color: '#F4C0D1',
                  marginBottom: '16px', textAlign: 'center',
                }}>⚠️ {errorPinAsistencia}</div>
              )}

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '10px',
                opacity: guardandoAsistencia ? 0.5 : 1,
                pointerEvents: guardandoAsistencia ? 'none' : 'auto',
              }}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <BotonTecla
                    key={num}
                    digito={num}
                    onClick={() => presionarTeclaAsistencia(String(num))}
                    esTropical={esTropical}
                  />
                ))}

                <BotonAccion
                  onClick={limpiarPinAsistencia}
                  esTropical={esTropical}
                  disabled={pinAsistencia.length === 0}
                >
                  ✖
                </BotonAccion>

                <BotonTecla
                  digito={0}
                  onClick={() => presionarTeclaAsistencia('0')}
                  esTropical={esTropical}
                />

                <BotonAccion
                  onClick={borrarTeclaAsistencia}
                  esTropical={esTropical}
                  disabled={pinAsistencia.length === 0}
                >
                  ⌫
                </BotonAccion>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════
          MODAL ASISTENCIA: PASO 3 — RESULTADO
          ════════════════════════════════════════════════ */}
      {pasoAsistencia === 'resultado' && resultadoAsistencia && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 90,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: '20px',
          animation: 'modalFadeIn 0.2s ease forwards',
        }}>
          <div style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border-accent)',
            borderRadius: '16px',
            maxWidth: '420px', width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
            padding: '36px 28px',
            textAlign: 'center',
            animation: 'modalSlideUp 0.3s ease forwards',
          }}>
            {resultadoAsistencia.tipo === 'exito' && (
              <>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: ASIST.claro,
                  border: `2px solid ${ASIST.bg}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '44px', margin: '0 auto 20px',
                  animation: 'exitoPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>✅</div>
                <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
                  ¡Listo, {resultadoAsistencia.nombre.split(' ')[0]}!
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>
                  Tu asistencia quedó registrada
                </p>
                <p style={{ fontSize: '18px', fontWeight: 600, color: ASIST.bg, margin: '0 0 24px' }}>
                  🕐 {resultadoAsistencia.hora}
                </p>
              </>
            )}

            {resultadoAsistencia.tipo === 'ya' && (
              <>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: 'rgba(186, 117, 23, 0.12)',
                  border: '2px solid #BA7517',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '44px', margin: '0 auto 20px',
                  animation: 'exitoPop 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>👍</div>
                <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
                  Ya marcaste hoy
                </h3>
                <p style={{ fontSize: '14px', color: 'var(--color-text-secondary)', margin: '0 0 4px' }}>
                  {resultadoAsistencia.nombre.split(' ')[0]}, tu entrada de hoy ya estaba registrada
                </p>
                <p style={{ fontSize: '18px', fontWeight: 600, color: '#BA7517', margin: '0 0 24px' }}>
                  🕐 {resultadoAsistencia.hora}
                </p>
              </>
            )}

            {resultadoAsistencia.tipo === 'error' && (
              <>
                <div style={{
                  width: '80px', height: '80px', borderRadius: '50%',
                  background: 'rgba(244, 67, 54, 0.12)',
                  border: '2px solid #E24B4A',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '44px', margin: '0 auto 20px',
                }}>⚠️</div>
                <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
                  No se pudo registrar
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 24px' }}>
                  {resultadoAsistencia.mensaje || 'Intenta de nuevo en un momento.'}
                </p>
              </>
            )}

            <button
              onClick={cerrarFlujoAsistencia}
              style={{
                width: '100%', padding: '14px',
                background: resultadoAsistencia.tipo === 'exito'
                  ? `linear-gradient(135deg, ${ASIST.bg} 0%, ${ASIST.c} 100%)`
                  : 'var(--color-bg-elevated)',
                border: resultadoAsistencia.tipo === 'exito' ? 'none' : '1px solid var(--color-border-subtle)',
                borderRadius: '12px',
                color: resultadoAsistencia.tipo === 'exito' ? 'white' : 'var(--color-text-primary)',
                fontSize: '14px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              {resultadoAsistencia.tipo === 'exito' ? '¡Perfecto!' : 'Entendido'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── COMPONENTES DEL TECLADO TOUCH ───

function BotonTecla({ digito, onClick, esTropical }) {
  return (
    <button
      onClick={onClick}
      style={{
        aspectRatio: '1 / 1',
        background: esTropical
          ? 'var(--color-bg-elevated)'
          : 'var(--color-bg-card)',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '14px',
        color: 'var(--color-text-primary)',
        fontSize: '28px',
        fontWeight: 500,
        cursor: 'pointer',
        fontFamily: 'inherit',
        transition: 'all 0.1s ease',
        userSelect: 'none',
      }}
      onMouseDown={(e) => {
        e.currentTarget.style.transform = 'scale(0.94)'
        e.currentTarget.style.background = esTropical
          ? 'rgba(15, 110, 86, 0.08)'
          : 'rgba(250, 199, 117, 0.1)'
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.background = esTropical
          ? 'var(--color-bg-elevated)'
          : 'var(--color-bg-card)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.background = esTropical
          ? 'var(--color-bg-elevated)'
          : 'var(--color-bg-card)'
      }}
      onTouchStart={(e) => {
        e.currentTarget.style.transform = 'scale(0.94)'
        e.currentTarget.style.background = esTropical
          ? 'rgba(15, 110, 86, 0.08)'
          : 'rgba(250, 199, 117, 0.1)'
      }}
      onTouchEnd={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.background = esTropical
          ? 'var(--color-bg-elevated)'
          : 'var(--color-bg-card)'
      }}
    >
      {digito}
    </button>
  )
}

function BotonAccion({ onClick, children, esTropical, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        aspectRatio: '1 / 1',
        background: 'transparent',
        border: '1px solid var(--color-border-subtle)',
        borderRadius: '14px',
        color: disabled ? 'var(--color-text-muted)' : 'var(--color-text-secondary)',
        fontSize: '22px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'inherit',
        opacity: disabled ? 0.4 : 1,
        transition: 'all 0.1s ease',
        userSelect: 'none',
      }}
      onMouseDown={(e) => {
        if (disabled) return
        e.currentTarget.style.transform = 'scale(0.94)'
        e.currentTarget.style.background = 'rgba(244, 67, 54, 0.08)'
      }}
      onMouseUp={(e) => {
        if (disabled) return
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.background = 'transparent'
      }}
      onMouseLeave={(e) => {
        if (disabled) return
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.background = 'transparent'
      }}
      onTouchStart={(e) => {
        if (disabled) return
        e.currentTarget.style.transform = 'scale(0.94)'
        e.currentTarget.style.background = 'rgba(244, 67, 54, 0.08)'
      }}
      onTouchEnd={(e) => {
        if (disabled) return
        e.currentTarget.style.transform = 'scale(1)'
        e.currentTarget.style.background = 'transparent'
      }}
    >
      {children}
    </button>
  )
}

export default SeleccionOperador