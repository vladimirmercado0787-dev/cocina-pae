import { useState } from 'react'
import { supabase } from '../../supabaseClient'

function ModuloNuevaCocina({ tema: t, empresa, onVolver }) {
  const [paso, setPaso] = useState(1) // 1: formulario, 2: listo
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [pasoTexto, setPasoTexto] = useState('')

  // Datos de la cocina
  const [nombreCocina, setNombreCocina] = useState('')
  const [rnc, setRnc] = useState('')
  const [nombrePropietario, setNombrePropietario] = useState('')
  const [pinPropietario, setPinPropietario] = useState('')
  const [nombreEscuela, setNombreEscuela] = useState('')
  const [raciones, setRaciones] = useState('')
  const [precioRacion, setPrecioRacion] = useState('')

  // Datos del catálogo de la primera escuela
  const [escCat, setEscCat] = useState({
    codigo_centro: '', regional_distrito: '', provincia: '', municipio: '',
    cat_escuela_codigo: null, regional_codigo: null, distrito_codigo: null,
    latitud: null, longitud: null, sector: null, nivel: null, matricula: null,
  })

  // Buscador de catálogo
  const [provincias, setProvincias] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [provinciaSel, setProvinciaSel] = useState('')
  const [municipioSel, setMunicipioSel] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscandoCat, setBuscandoCat] = useState(false)
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [escuelaCatSel, setEscuelaCatSel] = useState(null)
  const [provinciasCargadas, setProvinciasCargadas] = useState(false)

  // Login de la cocina
  const [emailLogin, setEmailLogin] = useState('')
  const [passwordLogin, setPasswordLogin] = useState('')

  // Clave de mando
  const [claveMando, setClaveMando] = useState('')

  // Resultado
  const [empresaCreadaNombre, setEmpresaCreadaNombre] = useState('')

  async function cargarProvincias() {
    if (provinciasCargadas) return
    const { data } = await supabase.rpc('listar_provincias_catalogo')
    setProvincias((data || []).map(d => d.provincia))
    setProvinciasCargadas(true)
  }

  async function alElegirProvincia(prov) {
    setProvinciaSel(prov)
    setMunicipioSel(''); setMunicipios([]); setResultados([]); setEscuelaCatSel(null)
    if (!prov) return
    const { data } = await supabase.rpc('listar_municipios_catalogo', { p_provincia: prov })
    setMunicipios((data || []).map(d => d.municipio))
  }

  async function alElegirMunicipio(mun) {
    setMunicipioSel(mun); setEscuelaCatSel(null)
    if (!mun) { setResultados([]); return }
    buscarEnCatalogo(provinciaSel, mun, textoBusqueda)
  }

  async function buscarEnCatalogo(prov, mun, texto) {
    setBuscandoCat(true)
    const { data, error: err } = await supabase.rpc('buscar_escuelas_catalogo', {
      p_texto: texto?.trim() || null,
      p_provincia: prov || null,
      p_municipio: mun || null,
      p_regional: null,
      p_limite: 100,
    })
    setBuscandoCat(false)
    if (!err) setResultados(data || [])
  }

  function elegirEscuelaCatalogo(esc) {
    setEscuelaCatSel(esc)
    setNombreEscuela(esc.nombre || '')
    setEscCat({
      codigo_centro: esc.codigo || '',
      regional_distrito: `${esc.regional_codigo || ''}${esc.distrito_codigo ? '-' + esc.distrito_codigo.slice(-2) : ''}`,
      provincia: esc.provincia || '',
      municipio: esc.municipio || '',
      cat_escuela_codigo: esc.codigo || null,
      regional_codigo: esc.regional_codigo || null,
      distrito_codigo: esc.distrito_codigo || null,
      latitud: esc.latitud || null,
      longitud: esc.longitud || null,
      sector: esc.sector || null,
      nivel: esc.nivel || null,
      matricula: esc.matricula || null,
    })
  }

  function limpiarSeleccionEscuela() {
    setEscuelaCatSel(null)
    setNombreEscuela('')
    setEscCat({
      codigo_centro: '', regional_distrito: '', provincia: '', municipio: '',
      cat_escuela_codigo: null, regional_codigo: null, distrito_codigo: null,
      latitud: null, longitud: null, sector: null, nivel: null, matricula: null,
    })
  }

  function validar() {
    if (!nombreCocina.trim()) return 'Escribe el nombre de la cocina'
    if (!nombrePropietario.trim()) return 'Escribe el nombre del propietario'
    if (!/^\d{4}$/.test(pinPropietario)) return 'El PIN debe ser de 4 dígitos'
    if (!nombreEscuela.trim()) return 'Elige o escribe el nombre de la primera escuela'
    if (!raciones || Number(raciones) <= 0) return 'Escribe las raciones contractuales'
    if (!emailLogin.trim() || !emailLogin.includes('@')) return 'Escribe un correo válido para el login'
    if (!passwordLogin || passwordLogin.length < 6) return 'La contraseña debe tener al menos 6 caracteres'
    if (!claveMando.trim()) return 'Ingresa tu clave de mando para confirmar'
    return null
  }

  async function crearTodo() {
    const err = validar()
    if (err) { setError(err); return }
    setError('')
    setGuardando(true)

    // ─── PASO 1: Crear la cocina + propietario + escuela ───
    setPasoTexto('Creando la cocina...')
    const { data: nuevaEmpresaId, error: rpcError } = await supabase.rpc('crear_cocina_completa', {
      p_empresa_id_admin: empresa.id,
      p_clave: claveMando,
      p_nombre_cocina: nombreCocina.trim(),
      p_rnc: rnc.trim(),
      p_precio_racion: precioRacion ? Number(precioRacion) : null,
      p_nombre_propietario: nombrePropietario.trim(),
      p_pin_propietario: pinPropietario,
      p_nombre_escuela: nombreEscuela.trim(),
      p_raciones: Number(raciones),
      p_codigo_centro: escCat.codigo_centro || null,
      p_regional_distrito: escCat.regional_distrito || null,
      p_provincia: escCat.provincia || null,
      p_municipio: escCat.municipio || null,
      p_cat_escuela_codigo: escCat.cat_escuela_codigo || null,
      p_regional_codigo: escCat.regional_codigo || null,
      p_distrito_codigo: escCat.distrito_codigo || null,
      p_latitud: escCat.latitud || null,
      p_longitud: escCat.longitud || null,
      p_sector: escCat.sector || null,
      p_nivel: escCat.nivel || null,
      p_matricula: escCat.matricula || null,
    })

    if (rpcError) {
      setGuardando(false)
      setPasoTexto('')
      if (rpcError.message && rpcError.message.includes('Clave de mando incorrecta')) {
        setError('Clave de mando incorrecta. No se creó nada.')
      } else {
        setError('Error al crear la cocina: ' + (rpcError.message || 'desconocido'))
      }
      return
    }

    // ─── PASO 2: Crear el login (Edge Function) ───
    setPasoTexto('Creando el acceso (login)...')
    const { data: sessionData } = await supabase.auth.getSession()
    const token = sessionData?.session?.access_token

    let uidCreado = null
    try {
      const resp = await fetch(
        `https://gcivvxofvzfytnfswopu.supabase.co/functions/v1/crear-login-cocina`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({
            email: emailLogin.trim().toLowerCase(),
            password: passwordLogin,
            empresa_id_admin: empresa.id,
            clave: claveMando,
          }),
        }
      )
      const result = await resp.json()

      if (!resp.ok || result.error) {
        setGuardando(false)
        setPasoTexto('')
        setEmpresaCreadaNombre(nombreCocina.trim())
        setError('La cocina se creó, pero el login falló: ' + (result.error || 'error desconocido') + '. Puedes vincular el login después desde Gestión de Cocinas.')
        setPaso(2)
        return
      }
      uidCreado = result.uid
    } catch (e) {
      setGuardando(false)
      setPasoTexto('')
      setEmpresaCreadaNombre(nombreCocina.trim())
      setError('La cocina se creó, pero hubo un error de conexión con el login. Vincúlalo después desde Gestión de Cocinas.')
      setPaso(2)
      return
    }

    // ─── PASO 3: Vincular el login a la cocina ───
    setPasoTexto('Vinculando el acceso...')
    const { error: errVincular } = await supabase.rpc('vincular_login_cocina', {
      p_empresa_id_admin: empresa.id,
      p_clave: claveMando,
      p_cocina_id: nuevaEmpresaId,
      p_auth_uid: uidCreado,
    })

    setGuardando(false)
    setPasoTexto('')

    if (errVincular) {
      setEmpresaCreadaNombre(nombreCocina.trim())
      setError('La cocina y el login se crearon, pero falló la vinculación: ' + errVincular.message)
      setPaso(2)
      return
    }

    setEmpresaCreadaNombre(nombreCocina.trim())
    setPaso(2)
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
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textMuted }}>Dar de alta un cliente nuevo</p>
          </div>
        </div>

        {error && (
          <div style={{ background: 'rgba(196,91,74,0.12)', border: '1px solid rgba(196,91,74,0.4)', borderRadius: '11px', padding: '12px 14px', fontSize: '13px', color: '#E8A598', marginBottom: '16px', lineHeight: 1.5 }}>
            ⚠️ {error}
          </div>
        )}

        {/* ─── PASO 1: FORMULARIO ─── */}
        {paso === 1 && (
          <div style={{ background: t.cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${t.borde}`, borderRadius: '16px', padding: '22px', opacity: 0, animation: 'nuevaUp 0.5s ease 0.2s forwards' }}>
            <p style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 600, color: t.textPrimary }}>Datos de la cocina</p>
            <p style={{ margin: '0 0 8px', fontSize: '12px', color: t.textSec }}>Se crea todo automático: cocina, propietario, escuela y su acceso.</p>

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

            {/* ─── PRIMERA ESCUELA con buscador ─── */}
            <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: t.textPrimary }}>🏫 Primera escuela</p>

            {!escuelaCatSel ? (
              <div style={{ background: `${t.acento2 || t.acento}10`, border: `1px solid ${t.acento2 || t.acento}30`, borderRadius: '11px', padding: '14px', marginTop: '8px' }}>
                <p style={{ margin: '0 0 10px', fontSize: '11px', color: t.textMuted, lineHeight: 1.5 }}>
                  🔍 Búscala en el catálogo oficial: elige provincia y municipio.
                </p>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, marginTop: 0 }}>PROVINCIA</label>
                    <select className="nueva-input" style={inputStyle} value={provinciaSel} onFocus={cargarProvincias} onChange={(e) => alElegirProvincia(e.target.value)}>
                      <option value="">— Provincia —</option>
                      {provincias.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ ...labelStyle, marginTop: 0 }}>MUNICIPIO</label>
                    <select className="nueva-input" style={inputStyle} value={municipioSel} onChange={(e) => alElegirMunicipio(e.target.value)} disabled={!provinciaSel}>
                      <option value="">— Municipio —</option>
                      {municipios.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>

                {municipioSel && (
                  <input className="nueva-input" style={{ ...inputStyle, marginTop: '10px' }} placeholder="🔎 Filtrar por nombre..." value={textoBusqueda}
                    onChange={(e) => { setTextoBusqueda(e.target.value); buscarEnCatalogo(provinciaSel, municipioSel, e.target.value) }} />
                )}

                {buscandoCat && <p style={{ fontSize: '12px', color: t.textMuted, textAlign: 'center', padding: '10px' }}>Buscando...</p>}

                {!buscandoCat && municipioSel && resultados.length === 0 && (
                  <p style={{ fontSize: '12px', color: t.textMuted, textAlign: 'center', padding: '10px' }}>No se encontraron escuelas.</p>
                )}

                {!buscandoCat && resultados.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto', marginTop: '10px' }}>
                    {resultados.map(esc => (
                      <button type="button" key={esc.codigo} onClick={() => elegirEscuelaCatalogo(esc)}
                        style={{ textAlign: 'left', padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit', background: t.claro ? 'rgba(255,255,255,0.6)' : 'rgba(14,18,8,0.4)', border: `1px solid ${t.borde}`, borderRadius: '9px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: t.textPrimary }}>{esc.nombre}</span>
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: t.textSec, whiteSpace: 'nowrap' }}>Cód: {esc.codigo}</span>
                        </div>
                        <div style={{ fontSize: '10px', color: t.textMuted, marginTop: '3px' }}>
                          {esc.sector} · {esc.nivel || 'Sin nivel'} · 🍽️ {esc.matricula || 0}{esc.latitud ? ' · 📍 GPS' : ''}
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                <div style={{ marginTop: '12px', textAlign: 'center' }}>
                  <button type="button" onClick={() => { setEscuelaCatSel({ manual: true }); }} style={{ background: 'none', border: 'none', color: t.acento, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                    ¿No está? Escribir manualmente →
                  </button>
                </div>
              </div>
            ) : (
              <div style={{ marginTop: '8px' }}>
                {!escuelaCatSel.manual && (
                  <div style={{ background: `${t.acento}12`, border: `1px solid ${t.acento}30`, borderRadius: '11px', padding: '10px 12px', marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                    <span style={{ fontSize: '12px', color: t.textPrimary }}>✅ <strong>{escuelaCatSel.nombre}</strong>{escCat.codigo_centro ? ` · Cód: ${escCat.codigo_centro}` : ''}</span>
                    <button type="button" onClick={limpiarSeleccionEscuela} style={{ background: 'none', border: 'none', color: t.textSec, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', whiteSpace: 'nowrap' }}>Cambiar</button>
                  </div>
                )}
                <label style={{ ...labelStyle, marginTop: 0 }}>NOMBRE DE LA ESCUELA *</label>
                <input className="nueva-input" style={inputStyle} value={nombreEscuela} onChange={(e) => setNombreEscuela(e.target.value)} placeholder="Ej: Escuela Primaria Las Flores" />
                {escuelaCatSel.manual && (
                  <button type="button" onClick={limpiarSeleccionEscuela} style={{ background: 'none', border: 'none', color: t.acento, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline', marginTop: '8px' }}>
                    ← Volver al buscador
                  </button>
                )}
                <p style={{ margin: '8px 0 0', fontSize: '11px', color: t.textMuted, lineHeight: 1.5 }}>
                  💡 El director y demás datos se completan después en la sección Escuelas.
                </p>
              </div>
            )}

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

            <div style={{ height: '1px', background: t.borde, margin: '20px 0' }} />

            {/* Login de la cocina */}
            <div style={{ background: `${t.acento2}10`, border: `1px solid ${t.acento2}30`, borderRadius: '11px', padding: '14px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '13px', fontWeight: 600, color: t.textPrimary }}>🔑 Acceso de la cocina</p>
              <p style={{ margin: '0 0 6px', fontSize: '11px', color: t.textMuted, lineHeight: 1.5 }}>
                El correo y contraseña con que esta cocina entrará a la app. Se crea automático.
              </p>

              <label style={labelStyle}>CORREO DE ACCESO *</label>
              <input className="nueva-input" style={inputStyle} value={emailLogin} onChange={(e) => setEmailLogin(e.target.value)} placeholder="cocina@ejemplo.com" inputMode="email" />

              <label style={labelStyle}>CONTRASEÑA (mín. 6 caracteres) *</label>
              <input className="nueva-input" style={inputStyle} value={passwordLogin} onChange={(e) => setPasswordLogin(e.target.value)} placeholder="Contraseña inicial" />
            </div>

            <div style={{ height: '1px', background: t.borde, margin: '20px 0' }} />

            {/* Clave de mando */}
            <div style={{ background: `${t.acento}10`, border: `1px solid ${t.acento}30`, borderRadius: '11px', padding: '14px' }}>
              <label style={{ ...labelStyle, marginTop: 0 }}>🔐 CLAVE DE MANDO (para confirmar) *</label>
              <input className="nueva-input" type="password" style={inputStyle} value={claveMando} onChange={(e) => setClaveMando(e.target.value)} placeholder="Tu clave de mando" />
            </div>

            <button onClick={crearTodo} disabled={guardando} style={{ width: '100%', marginTop: '24px', padding: '14px', background: guardando ? `${t.acento}66` : t.logoGrad, border: 'none', borderRadius: '12px', color: t.claro ? '#fff' : '#0F1208', fontSize: '15px', fontWeight: 700, cursor: guardando ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              {guardando ? (pasoTexto || 'Creando...') : 'Crear cocina completa →'}
            </button>
          </div>
        )}

        {/* ─── PASO 2: LISTO ─── */}
        {paso === 2 && (
          <div style={{ background: t.cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${t.borde}`, borderRadius: '16px', padding: '32px 22px', textAlign: 'center', opacity: 0, animation: 'nuevaUp 0.5s ease 0.1s forwards' }}>
            <div style={{ width: '72px', height: '72px', margin: '0 auto 18px', borderRadius: '20px', background: t.logoGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px' }}>🎉</div>
            <p style={{ margin: '0 0 6px', fontSize: '20px', fontWeight: 600, color: t.textPrimary }}>¡Cocina creada!</p>
            <p style={{ margin: '0 0 8px', fontSize: '13px', color: t.textSec, lineHeight: 1.6 }}>
              "{empresaCreadaNombre}" quedó lista con su propietario, primera escuela{!error ? ' y su acceso ya vinculado.' : '.'}
            </p>
            {!error && (
              <div style={{ background: `${t.acento}12`, border: `1px solid ${t.acento}30`, borderRadius: '11px', padding: '12px', margin: '0 0 20px', textAlign: 'left' }}>
                <p style={{ margin: 0, fontSize: '12px', color: t.textSec, lineHeight: 1.6 }}>
                  Entrégale al cliente:<br/>
                  📧 Correo: <strong style={{ color: t.textPrimary }}>{emailLogin.trim().toLowerCase()}</strong><br/>
                  🔑 Contraseña: <strong style={{ color: t.textPrimary }}>{passwordLogin}</strong>
                </p>
              </div>
            )}
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