import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']

function ContabilidadAndamio({ tema: t, empresa, onVolver }) {
  const [paso, setPaso] = useState('clave')
  const [claveMando, setClaveMando] = useState('')
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')
  const [cocinas, setCocinas] = useState([])
  const [busqueda, setBusqueda] = useState('')

  // Resumen del mes
  const [anioSel, setAnioSel] = useState(new Date().getFullYear())
  const [mesSel, setMesSel] = useState(new Date().getMonth())
  const [resumen, setResumen] = useState(null)
  const [expandido, setExpandido] = useState(null) // 'facturado' | 'nuevas' | 'gratis' | null

  // Modal registrar/editar pago
  const [modalPago, setModalPago] = useState(null)
  const [pagoEditando, setPagoEditando] = useState(null)
  const [tipoPago, setTipoPago] = useState('mensualidad')
  const [montoPago, setMontoPago] = useState('')
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [notaPago, setNotaPago] = useState('')
  const [mesPago, setMesPago] = useState(new Date().getMonth())
  const [anioPago, setAnioPago] = useState(new Date().getFullYear())
  const [guardandoPago, setGuardandoPago] = useState(false)

  // Modal historial
  const [modalHistorial, setModalHistorial] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)

  // Modal mes gratis
  const [modalGratis, setModalGratis] = useState(null)
  const [motivoGratis, setMotivoGratis] = useState('referido')
  const [notaGratis, setNotaGratis] = useState('')

  async function verificarYCargar() {
    if (!claveMando.trim()) { setError('Ingresa tu clave de mando'); return }
    setError('')
    setCargando(true)
    const { data, error: err } = await supabase.rpc('listar_estado_cobros', {
      p_empresa_id_admin: empresa.id, p_clave: claveMando,
    })
    if (err) {
      setCargando(false)
      setError(err.message.includes('Clave de mando incorrecta') ? 'Clave de mando incorrecta' : 'Error: ' + err.message)
      return
    }
    setCocinas(data || [])
    await cargarResumen(claveMando, anioSel, mesSel)
    setCargando(false)
    setPaso('lista')
  }

  async function cargarResumen(clave, anio, mes) {
    const { data, error: err } = await supabase.rpc('resumen_mes', {
      p_empresa_id_admin: empresa.id, p_clave: clave, p_anio: anio, p_mes: mes + 1,
    })
    if (!err) setResumen(data)
  }

  function cambiarMes(delta) {
    let nuevoMes = mesSel + delta
    let nuevoAnio = anioSel
    if (nuevoMes < 0) { nuevoMes = 11; nuevoAnio-- }
    if (nuevoMes > 11) { nuevoMes = 0; nuevoAnio++ }
    setMesSel(nuevoMes)
    setAnioSel(nuevoAnio)
    setExpandido(null)
    cargarResumen(claveMando, nuevoAnio, nuevoMes)
  }

  async function recargarTodo() {
    const { data } = await supabase.rpc('listar_estado_cobros', {
      p_empresa_id_admin: empresa.id, p_clave: claveMando,
    })
    setCocinas(data || [])
    await cargarResumen(claveMando, anioSel, mesSel)
  }

  function abrirModalPago(cocina) {
    setModalPago(cocina); setPagoEditando(null); setTipoPago('mensualidad')
    setMontoPago(String(cocina.mensualidad || 6000)); setMetodoPago('efectivo'); setNotaPago('')
    setMesPago(new Date().getMonth()); setAnioPago(new Date().getFullYear())
  }

  function abrirEditarPago(cocina, pago) {
    setModalPago(cocina); setPagoEditando(pago); setTipoPago(pago.tipo)
    setMontoPago(String(pago.monto)); setMetodoPago(pago.metodo || 'efectivo'); setNotaPago(pago.nota || '')
    if (pago.mes_correspondiente) {
      const d = new Date(pago.mes_correspondiente)
      setMesPago(d.getMonth()); setAnioPago(d.getFullYear())
    }
    setModalHistorial(null)
  }

  async function confirmarPago() {
    if (!montoPago || Number(montoPago) < 0) { alert('Ingresa un monto válido'); return }
    setGuardandoPago(true)
    const mesCorrespondiente = `${anioPago}-${String(mesPago + 1).padStart(2, '0')}-01`
    let err
    if (pagoEditando) {
      const res = await supabase.rpc('editar_pago', {
        p_empresa_id_admin: empresa.id, p_clave: claveMando, p_pago_id: pagoEditando.id,
        p_tipo: tipoPago, p_monto: Number(montoPago), p_mes_correspondiente: mesCorrespondiente,
        p_metodo: metodoPago, p_nota: notaPago.trim() || null,
      })
      err = res.error
    } else {
      const res = await supabase.rpc('registrar_pago', {
        p_empresa_id_admin: empresa.id, p_clave: claveMando, p_cocina_id: modalPago.id,
        p_tipo: tipoPago, p_monto: Number(montoPago), p_mes_correspondiente: mesCorrespondiente,
        p_metodo: metodoPago, p_nota: notaPago.trim() || null,
      })
      err = res.error
    }
    setGuardandoPago(false)
    if (err) { alert('Error: ' + err.message); return }
    setModalPago(null); setPagoEditando(null)
    await recargarTodo()
  }

  async function abrirHistorial(cocina) {
    setModalHistorial(cocina); setCargandoHistorial(true)
    const { data, error: err } = await supabase.rpc('historial_pagos_cocina', {
      p_empresa_id_admin: empresa.id, p_clave: claveMando, p_cocina_id: cocina.id,
    })
    setCargandoHistorial(false)
    if (!err) setHistorial(data || [])
  }

  async function borrarPago(pagoId) {
    if (!window.confirm('¿Borrar este pago? Esta acción no se puede deshacer.')) return
    const { error: err } = await supabase.rpc('borrar_pago', {
      p_empresa_id_admin: empresa.id, p_clave: claveMando, p_pago_id: pagoId,
    })
    if (err) { alert('Error: ' + err.message); return }
    const { data } = await supabase.rpc('historial_pagos_cocina', {
      p_empresa_id_admin: empresa.id, p_clave: claveMando, p_cocina_id: modalHistorial.id,
    })
    setHistorial(data || [])
    await recargarTodo()
  }

  function abrirModalGratis(cocina) {
    setModalGratis(cocina); setMotivoGratis('referido'); setNotaGratis('')
  }

  async function confirmarMesGratis() {
    const motivoTexto = motivoGratis === 'referido' ? 'Por traer un referido.'
      : motivoGratis === 'cortesia' ? 'Cortesía de Andamio.'
      : motivoGratis === 'promocion' ? 'Promoción especial.'
      : (notaGratis.trim() || 'Mes gratis.')
    const { error: err } = await supabase.rpc('dar_mes_gratis', {
      p_empresa_id_admin: empresa.id, p_clave: claveMando, p_cocina_id: modalGratis.id, p_motivo: motivoTexto,
    })
    if (err) { alert('Error: ' + err.message); return }
    setModalGratis(null)
    await recargarTodo()
  }

  const cocinasFiltradas = cocinas.filter((c) => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))
  const cocinasAlDia = cocinas.filter((c) => c.pago_mes_actual).length
  const cocinasSinEnganche = cocinas.filter((c) => !c.enganche_pagado).length

  const inputStyle = {
    width: '100%', background: t.claro ? 'rgba(255,255,255,0.7)' : 'rgba(14,18,8,0.5)',
    border: `1px solid ${t.borde}`, borderRadius: '11px', padding: '12px 14px',
    color: t.textPrimary, fontSize: '14px', fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
  }

  function etiquetaTipo(tipo) {
    if (tipo === 'enganche') return { label: 'Enganche', color: '#D9A441' }
    if (tipo === 'reenganche') return { label: 'Re-enganche', color: '#C45B4A' }
    if (tipo === 'mes_gratis_otorgado') return { label: '🎁 Mes gratis', color: '#7F77DD' }
    return { label: 'Mensualidad', color: '#1D9E75' }
  }
  function fechaCorta(f) { return new Date(f).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) }
  function fechaSolo(f) { return new Date(f).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' }) }
  function estadoCobro(c) {
    const dias = c.dias_para_pago
    if (dias < 0) return { txt: `Vencido hace ${Math.abs(dias)} día(s)`, color: '#C45B4A' }
    if (dias === 0) return { txt: 'Vence hoy', color: '#C45B4A' }
    if (dias <= 5) return { txt: `Vence en ${dias} día(s)`, color: '#D9A441' }
    return { txt: `Próximo pago en ${dias} día(s)`, color: '#1D9E75' }
  }

  // ─── PANTALLA DE CLAVE ───
  if (paso === 'clave') {
    return (
      <div style={{ minHeight: '100vh', background: t.bgPanel, padding: '20px', fontFamily: 'inherit', position: 'relative' }}>
        <div style={{ position: 'absolute', inset: 0, backgroundImage: `${t.bgGlow1}, ${t.bgGlow2}`, pointerEvents: 'none' }} />
        <div style={{ position: 'relative', maxWidth: '420px', margin: '60px auto 0' }}>
          <button onClick={onVolver} style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderRadius: '20px', padding: '9px 15px', color: t.textSec, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', marginBottom: '24px' }}>← Volver</button>
          <div style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderRadius: '16px', padding: '28px' }}>
            <div style={{ width: '60px', height: '60px', margin: '0 auto 16px', borderRadius: '16px', background: t.logoGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px' }}>📊</div>
            <p style={{ margin: '0 0 6px', fontSize: '19px', fontWeight: 600, color: t.textPrimary, textAlign: 'center' }}>Contabilidad Andamio</p>
            <p style={{ margin: '0 0 22px', fontSize: '13px', color: t.textSec, textAlign: 'center', lineHeight: 1.5 }}>Cobros, ingresos y estado de pago de tus cocinas. Ingresa tu clave de mando.</p>
            {error && <div style={{ background: 'rgba(196,91,74,0.12)', border: '1px solid rgba(196,91,74,0.4)', borderRadius: '11px', padding: '12px', fontSize: '13px', color: '#E8A598', marginBottom: '14px' }}>⚠️ {error}</div>}
            <input type="password" style={inputStyle} value={claveMando} onChange={(e) => setClaveMando(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && verificarYCargar()} placeholder="🔐 Clave de mando" autoFocus />
            <button onClick={verificarYCargar} disabled={cargando} style={{ width: '100%', marginTop: '16px', padding: '14px', background: cargando ? `${t.acento}66` : t.logoGrad, border: 'none', borderRadius: '12px', color: t.claro ? '#fff' : '#0F1208', fontSize: '15px', fontWeight: 700, cursor: cargando ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{cargando ? 'Verificando...' : 'Entrar →'}</button>
          </div>
        </div>
      </div>
    )
  }

  const r = resumen || {}
  const detallePagos = r.detalle_pagos || []
  const detalleNuevas = r.detalle_nuevas || []
  const detalleGratis = r.detalle_gratis || []

  // ─── PANTALLA DE LISTA ───
  return (
    <div style={{ minHeight: '100vh', background: t.bgPanel, padding: '20px', fontFamily: 'inherit', position: 'relative' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `${t.bgGlow1}, ${t.bgGlow2}`, pointerEvents: 'none' }} />
      <div style={{ position: 'relative', maxWidth: '760px', margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '20px' }}>
          <button onClick={onVolver} style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderRadius: '20px', padding: '9px 15px', color: t.textSec, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
          <div>
            <p style={{ margin: 0, fontSize: '19px', fontWeight: 600, color: t.textPrimary }}>Contabilidad Andamio</p>
            <p style={{ margin: '2px 0 0', fontSize: '11px', color: t.textMuted }}>{cocinas.length} cocinas · {cocinasAlDia} al día este mes</p>
          </div>
        </div>

        {/* ─── RESUMEN DEL MES (con selector ◄ ►) ─── */}
        <div style={{ background: t.cardBg, border: `1px solid ${t.bordeFuerte}`, borderRadius: '16px', padding: '18px', marginBottom: '18px' }}>
          {/* Selector de mes */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <button onClick={() => cambiarMes(-1)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: `1px solid ${t.borde}`, color: t.textPrimary, fontSize: '16px', cursor: 'pointer', fontFamily: 'inherit' }}>◄</button>
            <p style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: t.textPrimary }}>{MESES[mesSel]} {anioSel}</p>
            <button onClick={() => cambiarMes(1)} style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'transparent', border: `1px solid ${t.borde}`, color: t.textPrimary, fontSize: '16px', cursor: 'pointer', fontFamily: 'inherit' }}>►</button>
          </div>

          {/* Facturado (expandible) */}
          <div onClick={() => setExpandido(expandido === 'facturado' ? null : 'facturado')} style={{ cursor: 'pointer', background: `${t.acento}10`, border: `1px solid ${t.acento}30`, borderRadius: '12px', padding: '16px', marginBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <p style={{ margin: '0 0 4px', fontSize: '11px', color: t.textSec, letterSpacing: '0.5px' }}>💰 FACTURADO ESTE MES</p>
                <p style={{ margin: 0, fontSize: '26px', fontWeight: 700, color: t.textPrimary }}>RD$ {Number(r.total_facturado || 0).toLocaleString()}</p>
              </div>
              <span style={{ color: t.textMuted, fontSize: '13px' }}>{expandido === 'facturado' ? '▲' : '▼'}</span>
            </div>
            {expandido === 'facturado' && (
              <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: `1px solid ${t.borde}` }}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: t.textSec }}>Mensualidades: <strong style={{ color: '#1D9E75' }}>RD$ {Number(r.total_mensualidades || 0).toLocaleString()}</strong> ({r.cantidad_mensualidades || 0})</span>
                  <span style={{ fontSize: '12px', color: t.textSec }}>Enganches: <strong style={{ color: '#D9A441' }}>RD$ {Number(r.total_enganches || 0).toLocaleString()}</strong> ({r.cantidad_enganches || 0})</span>
                </div>
                {detallePagos.length === 0 ? (
                  <p style={{ fontSize: '12px', color: t.textMuted, margin: 0 }}>Sin pagos este mes.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {detallePagos.map((d, i) => {
                      const et = etiquetaTipo(d.tipo)
                      return (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', padding: '6px 0' }}>
                          <span style={{ color: t.textPrimary }}><span style={{ color: et.color }}>●</span> {d.cocina} <span style={{ color: t.textMuted }}>· {et.label}</span></span>
                          <span style={{ fontWeight: 600, color: t.textPrimary }}>RD$ {Number(d.monto).toLocaleString()}</span>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Cocinas nuevas + Meses gratis (lado a lado, expandibles) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div onClick={() => setExpandido(expandido === 'nuevas' ? null : 'nuevas')} style={{ cursor: 'pointer', background: t.claro ? 'rgba(255,255,255,0.5)' : 'rgba(14,18,8,0.3)', border: `1px solid ${t.borde}`, borderRadius: '12px', padding: '14px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '10px', color: t.textSec, letterSpacing: '0.5px' }}>📈 COCINAS NUEVAS</p>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: t.textPrimary }}>{r.cocinas_nuevas || 0} <span style={{ fontSize: '11px', color: t.textMuted }}>{expandido === 'nuevas' ? '▲' : '▼'}</span></p>
            </div>
            <div onClick={() => setExpandido(expandido === 'gratis' ? null : 'gratis')} style={{ cursor: 'pointer', background: t.claro ? 'rgba(255,255,255,0.5)' : 'rgba(14,18,8,0.3)', border: `1px solid ${t.borde}`, borderRadius: '12px', padding: '14px' }}>
              <p style={{ margin: '0 0 4px', fontSize: '10px', color: t.textSec, letterSpacing: '0.5px' }}>🎁 MESES GRATIS DADOS</p>
              <p style={{ margin: 0, fontSize: '22px', fontWeight: 700, color: t.textPrimary }}>{r.meses_gratis_dados || 0} <span style={{ fontSize: '11px', color: t.textMuted }}>{expandido === 'gratis' ? '▲' : '▼'}</span></p>
            </div>
          </div>

          {expandido === 'nuevas' && (
            <div style={{ marginTop: '10px', background: t.claro ? 'rgba(255,255,255,0.5)' : 'rgba(14,18,8,0.3)', border: `1px solid ${t.borde}`, borderRadius: '12px', padding: '14px' }}>
              {detalleNuevas.length === 0 ? <p style={{ fontSize: '12px', color: t.textMuted, margin: 0 }}>Ninguna cocina nueva este mes.</p>
                : detalleNuevas.map((d, i) => <div key={i} style={{ fontSize: '12px', color: t.textPrimary, padding: '4px 0' }}>● {d.nombre} <span style={{ color: t.textMuted }}>· {fechaSolo(d.fecha)}</span></div>)}
            </div>
          )}
          {expandido === 'gratis' && (
            <div style={{ marginTop: '10px', background: t.claro ? 'rgba(255,255,255,0.5)' : 'rgba(14,18,8,0.3)', border: `1px solid ${t.borde}`, borderRadius: '12px', padding: '14px' }}>
              {detalleGratis.length === 0 ? <p style={{ fontSize: '12px', color: t.textMuted, margin: 0 }}>No diste meses gratis este mes.</p>
                : detalleGratis.map((d, i) => <div key={i} style={{ fontSize: '12px', color: t.textPrimary, padding: '4px 0' }}>🎁 {d.cocina} <span style={{ color: t.textMuted }}>· {d.motivo}</span></div>)}
            </div>
          )}

          {/* Histórico */}
          <div style={{ marginTop: '12px', textAlign: 'center' }}>
            <span style={{ fontSize: '11px', color: t.textMuted }}>Total histórico acumulado: <strong style={{ color: t.textSec }}>RD$ {Number(r.total_historico || 0).toLocaleString()}</strong></span>
          </div>
        </div>

        {/* KPIs de estado */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '18px' }}>
          <div style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderLeft: '4px solid #1D9E75', borderRadius: '12px', padding: '14px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '10px', color: t.textMuted, letterSpacing: '0.5px' }}>AL DÍA ESTE MES</p>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#1D9E75' }}>{cocinasAlDia} / {cocinas.length}</p>
          </div>
          <div style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderLeft: '4px solid #D9A441', borderRadius: '12px', padding: '14px' }}>
            <p style={{ margin: '0 0 6px', fontSize: '10px', color: t.textMuted, letterSpacing: '0.5px' }}>SIN ENGANCHE</p>
            <p style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#D9A441' }}>{cocinasSinEnganche}</p>
          </div>
        </div>

        <input style={{ ...inputStyle, marginBottom: '16px' }} value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="🔍 Buscar cocina..." />

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {cocinasFiltradas.map((c) => {
            const ec = estadoCobro(c)
            return (
              <div key={c.id} style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderLeft: `4px solid ${ec.color}`, borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '15px', fontWeight: 600, color: t.textPrimary }}>{c.nombre}</span>
                      {!c.enganche_pagado && <span style={{ fontSize: '9px', fontWeight: 700, color: '#C45B4A', background: 'rgba(196,91,74,0.12)', border: '1px solid rgba(196,91,74,0.4)', padding: '2px 8px', borderRadius: '8px' }}>SIN ENGANCHE</span>}
                      {c.meses_gratis_disponibles > 0 && <span style={{ fontSize: '9px', fontWeight: 700, color: '#7F77DD', background: 'rgba(127,119,221,0.12)', border: '1px solid rgba(127,119,221,0.4)', padding: '2px 8px', borderRadius: '8px' }}>🎁 {c.meses_gratis_disponibles} GRATIS</span>}
                    </div>
                    <div style={{ fontSize: '12px', color: ec.color, fontWeight: 600, marginBottom: '3px' }}>● {ec.txt}</div>
                    <div style={{ fontSize: '11px', color: t.textMuted }}>Paga el día {c.dia_cobro} · Próximo: {fechaSolo(c.proximo_pago)} · {c.meses_pagados} mes(es) pagados</div>
                    <div style={{ fontSize: '11px', color: t.textSec, marginTop: '2px' }}>Total: <strong style={{ color: t.textPrimary }}>RD$ {Number(c.total_pagado).toLocaleString()}</strong> · Mensualidad RD$ {Number(c.mensualidad).toLocaleString()}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    <button onClick={() => abrirModalGratis(c)} style={{ padding: '8px 11px', background: 'rgba(127,119,221,0.12)', border: '1px solid rgba(127,119,221,0.35)', borderRadius: '9px', color: '#9C95E8', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>🎁 Mes gratis</button>
                    <button onClick={() => abrirHistorial(c)} style={{ padding: '8px 11px', background: 'transparent', border: `1px solid ${t.borde}`, borderRadius: '9px', color: t.textSec, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>📜 Historial</button>
                    <button onClick={() => abrirModalPago(c)} style={{ padding: '8px 14px', background: t.logoGrad, border: 'none', borderRadius: '9px', color: t.claro ? '#fff' : '#0F1208', fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>💰 Pago</button>
                  </div>
                </div>
              </div>
            )
          })}
          {cocinasFiltradas.length === 0 && <p style={{ textAlign: 'center', color: t.textMuted, fontSize: '13px', padding: '30px' }}>No se encontraron cocinas.</p>}
        </div>
      </div>

      {/* MODAL REGISTRAR/EDITAR PAGO */}
      {modalPago && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: t.bgPanel, border: `1px solid ${t.bordeFuerte}`, borderRadius: '18px', padding: '24px', maxWidth: '440px', width: '100%', maxHeight: '88vh', overflowY: 'auto' }}>
            <p style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 600, color: t.textPrimary }}>{pagoEditando ? '✏️ Editar pago' : '💰 Registrar pago'}</p>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: t.textSec }}>{modalPago.nombre}</p>
            <label style={{ fontSize: '11px', letterSpacing: '0.5px', color: t.textSec, display: 'block', marginBottom: '6px' }}>TIPO DE PAGO</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
              {[['mensualidad', 'Mensualidad'], ['enganche', 'Enganche'], ['reenganche', 'Re-enganche']].map(([val, lbl]) => (
                <button key={val} onClick={() => setTipoPago(val)} style={{ flex: 1, padding: '9px', background: tipoPago === val ? t.logoGrad : 'transparent', border: `1px solid ${tipoPago === val ? 'transparent' : t.borde}`, borderRadius: '9px', color: tipoPago === val ? (t.claro ? '#fff' : '#0F1208') : t.textSec, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>{lbl}</button>
              ))}
            </div>
            {tipoPago === 'mensualidad' && (
              <>
                <label style={{ fontSize: '11px', letterSpacing: '0.5px', color: t.textSec, display: 'block', marginBottom: '6px' }}>¿DE QUÉ MES ES ESTE PAGO?</label>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <select value={mesPago} onChange={(e) => setMesPago(Number(e.target.value))} style={{ ...inputStyle, flex: 2 }}>
                    {MESES.map((m, i) => <option key={i} value={i}>{m}</option>)}
                  </select>
                  <select value={anioPago} onChange={(e) => setAnioPago(Number(e.target.value))} style={{ ...inputStyle, flex: 1 }}>
                    {[2025, 2026, 2027, 2028].map((y) => <option key={y} value={y}>{y}</option>)}
                  </select>
                </div>
              </>
            )}
            <label style={{ fontSize: '11px', letterSpacing: '0.5px', color: t.textSec, display: 'block', marginBottom: '6px' }}>MONTO (RD$)</label>
            <input style={inputStyle} value={montoPago} onChange={(e) => setMontoPago(e.target.value.replace(/[^\d.]/g, ''))} inputMode="decimal" autoFocus />
            <label style={{ fontSize: '11px', letterSpacing: '0.5px', color: t.textSec, display: 'block', marginBottom: '6px', marginTop: '14px' }}>MÉTODO</label>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
              {[['efectivo', 'Efectivo'], ['transferencia', 'Transferencia'], ['otro', 'Otro']].map(([val, lbl]) => (
                <button key={val} onClick={() => setMetodoPago(val)} style={{ flex: 1, padding: '9px', background: metodoPago === val ? t.logoGrad : 'transparent', border: `1px solid ${metodoPago === val ? 'transparent' : t.borde}`, borderRadius: '9px', color: metodoPago === val ? (t.claro ? '#fff' : '#0F1208') : t.textSec, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>{lbl}</button>
              ))}
            </div>
            <label style={{ fontSize: '11px', letterSpacing: '0.5px', color: t.textSec, display: 'block', marginBottom: '6px' }}>NOTA (opcional)</label>
            <input style={inputStyle} value={notaPago} onChange={(e) => setNotaPago(e.target.value)} placeholder="Ej: pagó tarde" />
            <div style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
              <button onClick={() => { setModalPago(null); setPagoEditando(null) }} style={{ flex: 1, padding: '13px', background: 'transparent', border: `1px solid ${t.borde}`, borderRadius: '11px', color: t.textSec, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={confirmarPago} disabled={guardandoPago} style={{ flex: 1, padding: '13px', background: guardandoPago ? `${t.acento}66` : t.logoGrad, border: 'none', borderRadius: '11px', color: t.claro ? '#fff' : '#0F1208', fontSize: '14px', fontWeight: 700, cursor: guardandoPago ? 'wait' : 'pointer', fontFamily: 'inherit' }}>{guardandoPago ? 'Guardando...' : (pagoEditando ? 'Guardar cambios' : 'Confirmar')}</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL MES GRATIS */}
      {modalGratis && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: t.bgPanel, border: `1px solid ${t.bordeFuerte}`, borderRadius: '18px', padding: '24px', maxWidth: '420px', width: '100%' }}>
            <p style={{ margin: '0 0 4px', fontSize: '17px', fontWeight: 600, color: t.textPrimary }}>🎁 Dar mes gratis</p>
            <p style={{ margin: '0 0 18px', fontSize: '13px', color: t.textSec }}>{modalGratis.nombre}</p>
            <label style={{ fontSize: '11px', letterSpacing: '0.5px', color: t.textSec, display: 'block', marginBottom: '6px' }}>MOTIVO</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '14px' }}>
              {[['referido', '👥 Por traer un referido'], ['cortesia', '🤝 Cortesía'], ['promocion', '🎉 Promoción'], ['otro', '✏️ Otro (escribir)']].map(([val, lbl]) => (
                <button key={val} onClick={() => setMotivoGratis(val)} style={{ padding: '11px 14px', background: motivoGratis === val ? `${t.acento}22` : 'transparent', border: `1px solid ${motivoGratis === val ? t.bordeFuerte : t.borde}`, borderRadius: '10px', color: motivoGratis === val ? t.textPrimary : t.textSec, fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>{lbl}</button>
              ))}
            </div>
            {motivoGratis === 'otro' && <input style={{ ...inputStyle, marginBottom: '14px' }} value={notaGratis} onChange={(e) => setNotaGratis(e.target.value)} placeholder="Escribe el motivo..." autoFocus />}
            <div style={{ background: `${t.acento}10`, border: `1px solid ${t.acento}30`, borderRadius: '10px', padding: '12px', marginBottom: '18px' }}>
              <p style={{ margin: 0, fontSize: '12px', color: t.textSec, lineHeight: 1.5 }}>Se le sumará <strong style={{ color: t.textPrimary }}>1 mes gratis</strong> disponible. Tiene {modalGratis.meses_gratis_disponibles || 0} actualmente.</p>
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => setModalGratis(null)} style={{ flex: 1, padding: '13px', background: 'transparent', border: `1px solid ${t.borde}`, borderRadius: '11px', color: t.textSec, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
              <button onClick={confirmarMesGratis} style={{ flex: 1, padding: '13px', background: t.logoGrad, border: 'none', borderRadius: '11px', color: t.claro ? '#fff' : '#0F1208', fontSize: '14px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>Dar mes gratis</button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL HISTORIAL */}
      {modalHistorial && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', backdropFilter: 'blur(8px)' }}>
          <div style={{ background: t.bgPanel, border: `1px solid ${t.bordeFuerte}`, borderRadius: '18px', padding: '24px', maxWidth: '500px', width: '100%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
              <p style={{ margin: 0, fontSize: '17px', fontWeight: 600, color: t.textPrimary }}>📜 Historial de pagos</p>
              <button onClick={() => setModalHistorial(null)} style={{ background: 'transparent', border: 'none', color: t.textSec, fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <p style={{ margin: '0 0 16px', fontSize: '13px', color: t.textSec }}>{modalHistorial.nombre}</p>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {cargandoHistorial ? <p style={{ textAlign: 'center', color: t.textMuted, fontSize: '13px', padding: '30px' }}>Cargando...</p>
                : historial.length === 0 ? <p style={{ textAlign: 'center', color: t.textMuted, fontSize: '13px', padding: '30px' }}>No hay pagos registrados.</p>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {historial.map((p) => {
                      const et = etiquetaTipo(p.tipo)
                      return (
                        <div key={p.id} style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderLeft: `3px solid ${et.color}`, borderRadius: '11px', padding: '12px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '3px', flexWrap: 'wrap' }}>
                              <span style={{ fontSize: '9px', fontWeight: 700, color: et.color, background: `${et.color}1A`, border: `1px solid ${et.color}55`, padding: '2px 7px', borderRadius: '6px' }}>{et.label}</span>
                              <span style={{ fontSize: '15px', fontWeight: 700, color: t.textPrimary }}>RD$ {Number(p.monto).toLocaleString()}</span>
                              {p.mes_correspondiente && p.tipo === 'mensualidad' && <span style={{ fontSize: '10px', color: t.textMuted }}>{MESES[new Date(p.mes_correspondiente).getMonth()]} {new Date(p.mes_correspondiente).getFullYear()}</span>}
                            </div>
                            <div style={{ fontSize: '11px', color: t.textMuted }}>{fechaCorta(p.created_at)} · {p.metodo}{p.nota ? ` · ${p.nota}` : ''}</div>
                          </div>
                          <div style={{ display: 'flex', gap: '6px' }}>
                            {p.tipo !== 'mes_gratis_otorgado' && <button onClick={() => abrirEditarPago(modalHistorial, p)} style={{ padding: '7px 10px', background: 'transparent', border: `1px solid ${t.borde}`, borderRadius: '8px', color: t.textSec, fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✏️</button>}
                            <button onClick={() => borrarPago(p.id)} style={{ padding: '7px 10px', background: 'rgba(196,91,74,0.12)', border: '1px solid rgba(196,91,74,0.4)', borderRadius: '8px', color: '#E8A598', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>🗑️</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
            </div>
            <button onClick={() => setModalHistorial(null)} style={{ width: '100%', marginTop: '16px', padding: '13px', background: 'transparent', border: `1px solid ${t.borde}`, borderRadius: '11px', color: t.textSec, fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>Cerrar</button>
          </div>
        </div>
      )}
    </div>
  )
}

export default ContabilidadAndamio