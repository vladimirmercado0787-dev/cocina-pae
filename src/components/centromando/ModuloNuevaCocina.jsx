import { useState } from 'react'
import { supabase } from '../../supabaseClient'

function ModuloNuevaCocina({ tema: t, onVolver }) {
  const [paso, setPaso] = useState(1) // 1: datos cocina, 2: vincular login, 3: listo
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Datos de la cocina
  const [nombreCocina, setNombreCocina] = useState('')
  const [rnc, setRnc] = useState('')
  const [nombrePropietario, setNombrePropietario] = useState('')
  const [pinPropietario, setPinPropietario] = useState('')
  const [nombreEscuela, setNombreEscuela] = useState('')
  const [raciones, setRaciones] = useState('')
  const [precioRacion, setPrecioRacion] = useState('')

  // Datos generados
  const [empresaCreada, setEmpresaCreada] = useState(null)
  const [authUid, setAuthUid] = useState('')

  function validarPaso1() {
    if (!nombreCocina.trim()) return 'Escribe el nombre de la cocina'
    if (!nombrePropietario.trim()) return 'Escribe el nombre del propietario'
    if (!/^\d{4}$/.test(pinPropietario)) return 'El PIN debe ser de 4 dígitos'
    if (!nombreEscuela.trim()) return 'Escribe el nombre de la primera escuela'
    if (!raciones || Number(raciones) <= 0) return 'Escribe las raciones contractuales'
    return null
  }

  async function crearCocina() {
    const err = validarPaso1()
    if (err) { setError(err); return }
    setError('')
    setGuardando(true)

    // 1. Crear la empresa
    const { data: emp, error: errEmp } = await supabase
      .from('empresas')
      .insert([{
        nombre: nombreCocina.trim(),
        rnc: rnc.trim() || null,
        precio_racion_default: precioRacion ? Number(precioRacion) : null,
      }])
      .select()
      .single()

    if (errEmp || !emp) {
      setGuardando(false)
      setError('Error al crear la cocina: ' + (errEmp?.message || 'desconocido'))
      return
    }

    // 2. Crear el usuario propietario
    const { error: errUser } = await supabase
      .from('usuarios')
      .insert([{
        empresa_id: emp.id,
        nombre: nombrePropietario.trim(),
        rol: 'propietario',
        pin: pinPropietario,
        activo: true,
      }])

    if (errUser) {
      setGuardando(false)
      setError('Cocina creada pero falló el propietario: ' + errUser.message)
      return
    }

    // 3. Crear la primera escuela
    const { error: errEsc } = await supabase
      .from('escuelas')
      .insert([{
        empresa_id: emp.id,
        nombre: nombreEscuela.trim(),
        raciones_contractuales: Number(raciones),
        precio_racion: precioRacion ? Number(precioRacion) : null,
        activa: true,
      }])

    if (errEsc) {
      setGuardando(false)
      setError('Cocina y propietario creados, pero falló la escuela: ' + errEsc.message)
      return
    }

    setEmpresaCreada(emp)
    setGuardando(false)
    setPaso(2)
  }

  async function vincularLogin() {
    if (!/^[0-9a-fA-F-]{36}$/.test(authUid.trim())) {
      setError('El UID no parece válido (debe ser un código largo con guiones)')
      return
    }
    setError('')
    setGuardando(true)

    const { error: errLink } = await supabase
      .from('empresas')
      .update({ auth_user_id: authUid.trim() })
      .eq('id', empresaCreada.id)

    setGuardando(false)

    if (errLink) {
      setError('Error al vincular el login: ' + errLink.message)
      return
    }

    setPaso(3)
  }

  const inputStyle = {
    width: '100%',
    background: t.claro ? 'rgba(255,255,255,0.7)' : 'rgba(14,18,8,0.5)',
    border: `1px solid ${t.borde}`,
    borderRadius: '11px',
    padding: '12px 14px',
    color: t.textPrimary,
    fontSize: '14px',
    fontFamily: 'inherit',
    outline: 'none',
    boxSizing: 'border-box',
  }
  const labelStyle = { fontSize: '11px', letterSpacing: '1px', color: t.textSec, display: 'block', marginBottom: '6px', marginTop: '14px' }

  return (
    <div style={{ minHeight: '100vh', position: 'relative', overflow: 'hidden', background: t.bgPanel, padding: '20px', fontFamily: 'inherit' }}>
      <style>{`
        @keyframes nuevaFade { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes nuevaUp { 0% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } }
        .nueva-input:focus { border-color: ${t.bordeFuerte} !important; }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, backgroundImage: `${t.bgGlow1}, ${t.bgGlow2}`, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: '560px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '26px', opacity: 0, animation: 'nuevaUp 0.5s ease 0.1s forwards' }}>
          <button onClick={onVolver} style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderRadius: '20px', padding: '9px 15px', color: t.textSec, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Volver
          </button>
          <div>
            <p style={{ margin: 0, fontSize: '19px', fontWeight: 600, color: t.textPrimary }}>Nueva Cocina</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textMuted }}>Dar de alta un cliente · paso {paso} de 3</p>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(196,91,74,0.12)', border: '1px solid rgba(196,91,74,0.4)', borderRadius: '11px', padding: '12px 14px', fontSize: '13px', color: '#E8A598', marginBottom: '16px' }}>
            ⚠️ {error}
          </div>
        )}

        {/* ─── PASO 1: DATOS ─── */}
        {paso === 1 && (
          <div style={{ background: t.cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${t.borde}`, borderRadius: '16px', padding: '22px', opacity: 0, animation: 'nuevaUp 0.5s ease 0.2s forwards' }}>
            <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: t.textPrimary }}>Datos de la cocina</p>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: t.textSec }}>Lo básico para arrancar. El resto se configura después en el wizard.</p>

            <label style={labelStyle}>NOMBRE DE LA COCINA *</label>
            <input className="nueva-input" style={inputStyle} value={nombreCocina} onChange={(e) => setNombreCocina(e.target.value)} placeholder="Ej: Cocina del Hermano" />

            <label style={labelStyle}>RNC (opcional)</label>
            <input className="nueva-input" style={inputStyle} value={rnc} onChange={(e) => setRnc(e.target.value)} placeholder="Ej: 131000000" />

            <div style={{ height: '1px', background: t.borde, margin: '20px 0' }} />

            <label style={labelStyle}>NOMBRE DEL PROPIETARIO *</label>
            <input className="nueva-input" style={inputStyle} value={nombrePropietario} onChange={(e) => setNombrePropietario(e.target.value)} placeholder="Ej: Juan Pérez" />

            <label style={labelStyle}>PIN DEL PROPIETARIO (4 dígitos) *</label>
            <input className="nueva-input" style={inputStyle} value={pinPropietario} onChange={(e) => setPinPropietario(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="Ej: 1234" inputMode="numeric" />

            <div style={{ height: '1px', background: t.borde, margin: '20px 0' }} />

            <label style={labelStyle}>PRIMERA ESCUELA *</label>
            <input className="nueva-input" style={inputStyle} value={nombreEscuela} onChange={(e) => setNombreEscuela(e.target.value)} placeholder="Ej: Escuela Primaria Las Flores" />

            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>RACIONES *</label>
                <input className="nueva-input" style={inputStyle} value={raciones} onChange={(e) => setRaciones(e.target.value.replace(/\D/g, ''))} placeholder="Ej: 250" inputMode="numeric" />
              </div>
              <div style={{ flex: 1 }}>
                <label style={labelStyle}>PRECIO RACIÓN</label>
                <input className="nueva-input" style={inputStyle} value={precioRacion} onChange={(e) => setPrecioRacion(e.target.value.replace(/[^\d.]/g, ''))} placeholder="Ej: 35" inputMode="decimal" />
              </div>
            </div>

            <button onClick={crearCocina} disabled={guardando} style={{ width: '100%', marginTop: '24px', padding: '14px', background: guardando ? `${t.acento}66` : t.logoGrad, border: 'none', borderRadius: '12px', color: t.claro ? '#fff' : '#0F1208', fontSize: '15px', fontWeight: 700, cursor: guardando ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Creando...' : 'Crear cocina →'}
            </button>
          </div>
        )}

        {/* ─── PASO 2: VINCULAR LOGIN ─── */}
        {paso === 2 && empresaCreada && (
          <div style={{ background: t.cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${t.borde}`, borderRadius: '16px', padding: '22px', opacity: 0, animation: 'nuevaUp 0.5s ease 0.1s forwards' }}>
            <div style={{ background: `${t.acento}1A`, border: `1px solid ${t.acento}40`, borderRadius: '11px', padding: '12px 14px', marginBottom: '18px' }}>
              <p style={{ margin: 0, fontSize: '13px', color: t.textPrimary, fontWeight: 600 }}>✅ Cocina "{empresaCreada.nombre}" creada</p>
              <p style={{ margin: '4px 0 0', fontSize: '12px', color: t.textSec }}>Ahora falta crear su login de acceso.</p>
            </div>

            <p style={{ margin: '0 0 10px', fontSize: '13px', fontWeight: 600, color: t.textPrimary }}>Crear el login en Supabase</p>
            <ol style={{ margin: '0 0 18px', paddingLeft: '18px', fontSize: '12px', color: t.textSec, lineHeight: 1.7 }}>
              <li>En Supabase → Authentication → Users → Add user</li>
              <li>Pon el correo y contraseña de esta cocina</li>
              <li>Marca "Auto Confirm User" y créalo</li>
              <li>Copia el UID que aparece y pégalo aquí abajo</li>
            </ol>

            <label style={labelStyle}>UID DEL LOGIN (de Supabase Auth)</label>
            <input className="nueva-input" style={inputStyle} value={authUid} onChange={(e) => setAuthUid(e.target.value)} placeholder="Ej: 040ba6cd-76f5-4458-..." />

            <button onClick={vincularLogin} disabled={guardando} style={{ width: '100%', marginTop: '20px', padding: '14px', background: guardando ? `${t.acento}66` : t.logoGrad, border: 'none', borderRadius: '12px', color: t.claro ? '#fff' : '#0F1208', fontSize: '15px', fontWeight: 700, cursor: guardando ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              {guardando ? 'Vinculando...' : 'Vincular login y terminar →'}
            </button>

            <button onClick={() => setPaso(3)} style={{ width: '100%', marginTop: '10px', padding: '12px', background: 'transparent', border: `1px solid ${t.borde}`, borderRadius: '12px', color: t.textSec, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              Vincular el login después
            </button>
          </div>
        )}

        {/* ─── PASO 3: LISTO ─── */}
        {paso === 3 && empresaCreada && (
          <div style={{ background: t.cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${t.borde}`, borderRadius: '16px', padding: '32px 22px', textAlign: 'center', opacity: 0, animation: 'nuevaUp 0.5s ease 0.1s forwards' }}>
            <div style={{ width: '72px', height: '72px', margin: '0 auto 18px', borderRadius: '20px', background: t.logoGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px' }}>🎉</div>
            <p style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 600, color: t.textPrimary }}>¡Cocina creada!</p>
            <p style={{ margin: '0 0 24px', fontSize: '13px', color: t.textSec, lineHeight: 1.6 }}>
              "{empresaCreada.nombre}" ya existe en el sistema con su propietario y primera escuela.
              {authUid ? ' El login quedó vinculado.' : ' Recuerda vincular su login cuando puedas.'}
            </p>
            <button onClick={onVolver} style={{ width: '100%', padding: '14px', background: t.logoGrad, border: 'none', borderRadius: '12px', color: t.claro ? '#fff' : '#0F1208', fontSize: '15px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              Volver al Centro de Mando
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default ModuloNuevaCocina