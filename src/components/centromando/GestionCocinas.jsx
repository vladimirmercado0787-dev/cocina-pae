import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function GestionCocinas({ tema: t, empresa, onVolver }) {
  const [cocinas, setCocinas] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [necesitaClave, setNecesitaClave] = useState(true)
  const [clave, setClave] = useState('')
  const [busqueda, setBusqueda] = useState('')

  const [accion, setAccion] = useState(null)
  const [motivoSusp, setMotivoSusp] = useState('')
  const [motivoGracia, setMotivoGracia] = useState('')
  const [uidVincular, setUidVincular] = useState('')
  const [claveAccion, setClaveAccion] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [errorAccion, setErrorAccion] = useState('')

  async function cargarCocinas(claveUsada) {
    setCargando(true)
    setError('')
    const { data, error: rpcError } = await supabase.rpc('listar_cocinas', {
      p_empresa_id_admin: empresa.id,
      p_clave: claveUsada,
    })

    if (rpcError) {
      if (rpcError.message && rpcError.message.includes('Clave de mando incorrecta')) {
        setError('Clave de mando incorrecta')
      } else {
        setError('Error al cargar: ' + rpcError.message)
      }
      setCargando(false)
      setNecesitaClave(true)
      return
    }

    setCocinas(data || [])
    setNecesitaClave(false)
    setCargando(false)
  }

  function confirmarClave() {
    if (!clave.trim()) { setError('Ingresa tu clave de mando'); return }
    cargarCocinas(clave)
  }

  async function ejecutarAccion() {
    if (!claveAccion.trim()) { setErrorAccion('Ingresa tu clave de mando'); return }
    setProcesando(true)
    setErrorAccion('')

    let rpcCall
    if (accion.tipo === 'suspender') {
      rpcCall = supabase.rpc('suspender_cocina', {
        p_empresa_id_admin: empresa.id, p_clave: claveAccion,
        p_cocina_id: accion.cocina.id, p_motivo: motivoSusp.trim() || 'Sin motivo especificado',
      })
    } else if (accion.tipo === 'reactivar') {
      rpcCall = supabase.rpc('reactivar_cocina', {
        p_empresa_id_admin: empresa.id, p_clave: claveAccion, p_cocina_id: accion.cocina.id,
      })
    } else if (accion.tipo === 'aviso') {
      rpcCall = supabase.rpc('dar_aviso_pago', {
        p_empresa_id_admin: empresa.id, p_clave: claveAccion,
        p_cocina_id: accion.cocina.id, p_dias: 5, p_motivo: motivoGracia.trim() || 'Pago pendiente',
      })
    } else if (accion.tipo === 'quitar_aviso') {
      rpcCall = supabase.rpc('quitar_aviso_pago', {
        p_empresa_id_admin: empresa.id, p_clave: claveAccion, p_cocina_id: accion.cocina.id,
      })
    } else if (accion.tipo === 'vincular') {
      const uidLimpio = uidVincular.trim().toLowerCase()
      const formatoUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      if (!formatoUuid.test(uidLimpio)) {
        setErrorAccion('El UID no tiene el formato correcto')
        setProcesando(false)
        return
      }
      rpcCall = supabase.rpc('vincular_login_cocina', {
        p_empresa_id_admin: empresa.id, p_clave: claveAccion,
        p_cocina_id: accion.cocina.id, p_auth_uid: uidLimpio,
      })
    }

    const { error: rpcError } = await rpcCall
    setProcesando(false)

    if (rpcError) {
      if (rpcError.message && rpcError.message.includes('Clave de mando incorrecta')) {
        setErrorAccion('Clave de mando incorrecta')
      } else {
        setErrorAccion('Error: ' + rpcError.message)
      }
      return
    }

    cerrarAccion()
    cargarCocinas(clave)
  }

  function abrirAccion(tipo, cocina) {
    setAccion({ tipo, cocina })
    setMotivoSusp('')
    setMotivoGracia('')
    setUidVincular('')
    setClaveAccion('')
    setErrorAccion('')
  }

  function cerrarAccion() {
    setAccion(null)
    setMotivoSusp('')
    setMotivoGracia('')
    setUidVincular('')
    setClaveAccion('')
    setErrorAccion('')
  }

  // Calcular días restantes de gracia
  function diasRestantes(fechaLimite) {
    if (!fechaLimite) return null
    const ahora = new Date()
    const limite = new Date(fechaLimite)
    const diff = limite - ahora
    if (diff <= 0) return 0
    return Math.ceil(diff / (1000 * 60 * 60 * 24))
  }

  const cocinasFiltradas = cocinas.filter((c) => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return true
    return (c.nombre || '').toLowerCase().includes(q) || (c.rnc || '').toLowerCase().includes(q)
  })

  const totalActivas = cocinas.filter((c) => c.estado === 'activa').length
  const totalGracia = cocinas.filter((c) => c.estado === 'gracia').length
  const totalSuspendidas = cocinas.filter((c) => c.estado === 'suspendida').length

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

  if (necesitaClave) {
    return (
      <div style={{ minHeight: '100vh', background: t.bgPanel, padding: '20px', fontFamily: 'inherit', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `${t.bgGlow1}, ${t.bgGlow2}`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '420px', margin: '60px auto 0' }}>
          <button onClick={onVolver} style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderRadius: '20px', padding: '9px 15px', color: t.textSec, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '24px' }}>
            ← Volver
          </button>
          <div style={{ background: t.cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${t.borde}`, borderRadius: '16px', padding: '28px', textAlign: 'center' }}>
            <div style={{ width: '60px', height: '60px', margin: '0 auto 16px', borderRadius: '16px', background: t.logoGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>🏢</div>
            <p style={{ margin: '0 0 6px', fontSize: '18px', fontWeight: 600, color: t.textPrimary }}>Gestión de Cocinas</p>
            <p style={{ margin: '0 0 20px', fontSize: '12px', color: t.textSec }}>Confirma tu clave de mando para ver todas las cocinas</p>
            <input
              type="password" value={clave}
              onChange={(e) => { setClave(e.target.value); if (error) setError('') }}
              onKeyDown={(e) => { if (e.key === 'Enter') confirmarClave() }}
              placeholder="Clave de mando" autoFocus
              style={{ ...inputStyle, textAlign: 'center', marginBottom: '14px' }}
            />
            {error && (
              <div style={{ background: 'rgba(196,91,74,0.12)', border: '1px solid rgba(196,91,74,0.4)', borderRadius: '10px', padding: '10px', fontSize: '12px', color: '#E8A598', marginBottom: '14px' }}>
                ⚠️ {error}
              </div>
            )}
            <button onClick={confirmarClave} disabled={cargando} style={{ width: '100%', padding: '13px', background: cargando ? `${t.acento}66` : t.logoGrad, border: 'none', borderRadius: '12px', color: t.claro ? '#fff' : '#0F1208', fontSize: '14px', fontWeight: 700, cursor: cargando ? 'wait' : 'pointer', fontFamily: 'inherit' }}>
              {cargando ? 'Verificando...' : 'Ver cocinas'}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: t.bgPanel, padding: '20px', fontFamily: 'inherit', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @keyframes gcUp { 0% { opacity: 0; transform: translateY(14px); } 100% { opacity: 1; transform: translateY(0); } }
        .gc-search:focus { border-color: ${t.bordeFuerte} !important; }
      `}</style>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `${t.bgGlow1}, ${t.bgGlow2}`, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: '920px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <button onClick={onVolver} style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderRadius: '20px', padding: '9px 15px', color: t.textSec, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Volver
          </button>
          <div>
            <p style={{ margin: 0, fontSize: '19px', fontWeight: 600, color: t.textPrimary }}>Gestión de Cocinas</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textMuted }}>
              {cocinas.length} cocina{cocinas.length !== 1 ? 's' : ''} · {totalActivas} activa{totalActivas !== 1 ? 's' : ''}{totalGracia > 0 ? ` · ${totalGracia} en gracia` : ''}{totalSuspendidas > 0 ? ` · ${totalSuspendidas} suspendida${totalSuspendidas !== 1 ? 's' : ''}` : ''}
            </p>
          </div>
        </div>

        {/* Buscador */}
        <div style={{ position: 'relative', marginBottom: '18px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '15px', opacity: 0.6 }}>🔍</span>
          <input
            className="gc-search"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o RNC..."
            style={{ ...inputStyle, paddingLeft: '40px' }}
          />
          {busqueda && (
            <button onClick={() => setBusqueda('')} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'transparent', border: 'none', color: t.textSec, fontSize: '16px', cursor: 'pointer', padding: '4px' }}>
              ✕
            </button>
          )}
        </div>

        {cocinasFiltradas.length === 0 && (
          <div style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderRadius: '14px', padding: '30px', textAlign: 'center' }}>
            <p style={{ margin: 0, fontSize: '13px', color: t.textSec }}>
              {busqueda ? `No se encontraron cocinas con "${busqueda}"` : 'No hay cocinas registradas'}
            </p>
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {cocinasFiltradas.map((c, idx) => {
            const suspendida = c.estado === 'suspendida'
            const enGracia = c.estado === 'gracia'
            const sinLogin = !c.auth_user_id
            const dias = enGracia ? diasRestantes(c.fecha_limite_gracia) : null

            let colorBorde = t.acento
            if (suspendida) colorBorde = '#C45B4A'
            else if (enGracia) colorBorde = '#D9A441'

            return (
              <div key={c.id} style={{
                background: t.cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                border: `1px solid ${suspendida ? 'rgba(196,91,74,0.4)' : enGracia ? 'rgba(217,164,65,0.4)' : t.borde}`,
                borderLeft: `4px solid ${colorBorde}`,
                borderRadius: '14px', padding: '16px 18px',
                opacity: 0, animation: `gcUp 0.4s ease ${idx * 0.05}s forwards`,
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <p style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: t.textPrimary }}>{c.nombre}</p>
                      {suspendida && (
                        <span style={{ background: 'rgba(196,91,74,0.18)', border: '1px solid rgba(196,91,74,0.5)', color: '#E8A598', fontSize: '9px', fontWeight: 700, letterSpacing: '1px', padding: '3px 8px', borderRadius: '6px' }}>SUSPENDIDA</span>
                      )}
                      {enGracia && (
                        <span style={{ background: 'rgba(217,164,65,0.18)', border: '1px solid rgba(217,164,65,0.5)', color: '#E8C97A', fontSize: '9px', fontWeight: 700, letterSpacing: '1px', padding: '3px 8px', borderRadius: '6px' }}>
                          ⏳ {dias > 0 ? `${dias} DÍA${dias !== 1 ? 'S' : ''}` : 'VENCIDA'}
                        </span>
                      )}
                      {!suspendida && !enGracia && (
                        <span style={{ background: `${t.acento}22`, border: `1px solid ${t.acento}50`, color: t.acento, fontSize: '9px', fontWeight: 700, letterSpacing: '1px', padding: '3px 8px', borderRadius: '6px' }}>ACTIVA</span>
                      )}
                      {sinLogin && (
                        <span style={{ background: `${t.acento2}22`, border: `1px solid ${t.acento2}50`, color: t.acento2, fontSize: '9px', fontWeight: 700, letterSpacing: '1px', padding: '3px 8px', borderRadius: '6px' }}>SIN LOGIN</span>
                      )}
                    </div>
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: t.textSec }}>
                      🏫 {c.total_escuelas} escuela{c.total_escuelas != 1 ? 's' : ''} · 👥 {c.total_usuarios} usuario{c.total_usuarios != 1 ? 's' : ''}
                      {c.rnc ? ` · RNC ${c.rnc}` : ''}
                    </p>
                    {suspendida && c.motivo_suspension && (
                      <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#E8A598' }}>Motivo: {c.motivo_suspension}</p>
                    )}
                    {enGracia && (
                      <p style={{ margin: '6px 0 0', fontSize: '11px', color: '#E8C97A' }}>
                        ⏳ {c.motivo_gracia || 'Pago pendiente'} {dias > 0 ? `· se suspende en ${dias} día${dias !== 1 ? 's' : ''}` : '· plazo vencido, se suspenderá al abrir'}
                      </p>
                    )}
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {sinLogin && (
                      <button onClick={() => abrirAccion('vincular', c)} style={{ background: `${t.acento2}22`, border: `1px solid ${t.acento2}50`, borderRadius: '10px', padding: '8px 13px', color: t.acento2, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        🔗 Vincular login
                      </button>
                    )}

                    {/* Botón dar aviso (solo si está activa) */}
                    {!suspendida && !enGracia && (
                      <button onClick={() => abrirAccion('aviso', c)} style={{ background: 'rgba(217,164,65,0.15)', border: '1px solid rgba(217,164,65,0.4)', borderRadius: '10px', padding: '8px 13px', color: '#E8C97A', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ⏳ Dar aviso
                      </button>
                    )}

                    {/* Botón quitar aviso (solo si está en gracia) */}
                    {enGracia && (
                      <button onClick={() => abrirAccion('quitar_aviso', c)} style={{ background: `${t.acento}22`, border: `1px solid ${t.acento}50`, borderRadius: '10px', padding: '8px 13px', color: t.acento, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ✓ Quitar aviso
                      </button>
                    )}

                    {/* Suspender / Reactivar */}
                    {suspendida ? (
                      <button onClick={() => abrirAccion('reactivar', c)} style={{ background: `${t.acento}22`, border: `1px solid ${t.acento}50`, borderRadius: '10px', padding: '8px 13px', color: t.acento, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ✓ Reactivar
                      </button>
                    ) : (
                      <button onClick={() => abrirAccion('suspender', c)} style={{ background: 'rgba(196,91,74,0.15)', border: '1px solid rgba(196,91,74,0.4)', borderRadius: '10px', padding: '8px 13px', color: '#E8A598', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                        ⊘ Suspender
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {accion && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
          <div style={{ background: t.bgPanel, border: `1px solid ${t.borde}`, borderRadius: '16px', maxWidth: '440px', width: '100%', padding: '24px', boxShadow: '0 20px 60px rgba(0,0,0,0.5)' }}>
            <p style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 600, color: t.textPrimary }}>
              {accion.tipo === 'suspender' && '⊘ Suspender cocina'}
              {accion.tipo === 'reactivar' && '✓ Reactivar cocina'}
              {accion.tipo === 'aviso' && '⏳ Dar aviso de pago (5 días)'}
              {accion.tipo === 'quitar_aviso' && '✓ Quitar aviso de pago'}
              {accion.tipo === 'vincular' && '🔗 Vincular login'}
            </p>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: t.textSec }}>{accion.cocina.nombre}</p>

            {accion.tipo === 'aviso' && (
              <>
                <div style={{ background: 'rgba(217,164,65,0.1)', border: '1px solid rgba(217,164,65,0.3)', borderRadius: '10px', padding: '12px', marginBottom: '14px' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#E8C97A', lineHeight: 1.5 }}>
                    La cocina seguirá trabajando, pero verá un aviso de que su servicio se suspenderá en 5 días. Si no paga, se suspende automáticamente.
                  </p>
                </div>
                <label style={{ fontSize: '11px', letterSpacing: '1px', color: t.textSec, display: 'block', marginBottom: '6px' }}>MOTIVO (opcional)</label>
                <input style={{ ...inputStyle, marginBottom: '14px' }} value={motivoGracia} onChange={(e) => setMotivoGracia(e.target.value)} placeholder="Ej: Pago de junio pendiente" />
              </>
            )}

            {accion.tipo === 'suspender' && (
              <>
                <label style={{ fontSize: '11px', letterSpacing: '1px', color: t.textSec, display: 'block', marginBottom: '6px' }}>MOTIVO (opcional)</label>
                <input style={{ ...inputStyle, marginBottom: '14px' }} value={motivoSusp} onChange={(e) => setMotivoSusp(e.target.value)} placeholder="Ej: Falta de pago de junio" />
              </>
            )}

            {accion.tipo === 'vincular' && (
              <>
                <label style={{ fontSize: '11px', letterSpacing: '1px', color: t.textSec, display: 'block', marginBottom: '6px' }}>UID DEL LOGIN (de Supabase Auth)</label>
                <input style={{ ...inputStyle, marginBottom: '14px' }} value={uidVincular} onChange={(e) => setUidVincular(e.target.value)} placeholder="8419f510-8056-4c80-..." />
              </>
            )}

            <label style={{ fontSize: '11px', letterSpacing: '1px', color: t.textSec, display: 'block', marginBottom: '6px' }}>🔐 CLAVE DE MANDO</label>
            <input type="password" style={{ ...inputStyle, marginBottom: '14px' }} value={claveAccion} onChange={(e) => setClaveAccion(e.target.value)} placeholder="Confirma tu clave" autoFocus />

            {errorAccion && (
              <div style={{ background: 'rgba(196,91,74,0.12)', border: '1px solid rgba(196,91,74,0.4)', borderRadius: '10px', padding: '10px', fontSize: '12px', color: '#E8A598', marginBottom: '14px' }}>
                ⚠️ {errorAccion}
              </div>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={cerrarAccion} style={{ flex: 1, padding: '12px', background: 'transparent', border: `1px solid ${t.borde}`, borderRadius: '11px', color: t.textSec, fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Cancelar
              </button>
              <button onClick={ejecutarAccion} disabled={procesando} style={{
                flex: 1, padding: '12px',
                background: accion.tipo === 'suspender' ? 'linear-gradient(135deg, #C45B4A, #9A3F32)' : accion.tipo === 'aviso' ? 'linear-gradient(135deg, #D9A441, #B0862C)' : t.logoGrad,
                border: 'none', borderRadius: '11px',
                color: (accion.tipo === 'suspender' || accion.tipo === 'aviso') ? '#fff' : (t.claro ? '#fff' : '#0F1208'),
                fontSize: '13px', fontWeight: 700, cursor: procesando ? 'wait' : 'pointer', fontFamily: 'inherit',
              }}>
                {procesando ? 'Procesando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default GestionCocinas