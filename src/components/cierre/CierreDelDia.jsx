import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const ROLES_PUEDEN_FIRMAR = ['propietario', 'administrador']

function CierreDelDia({ usuario, empresaId, onVolver }) {
  const [empresa, setEmpresa] = useState(null)
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [recetas, setRecetas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [cerrando, setCerrando] = useState(false)
  const [firmandoMasivo, setFirmandoMasivo] = useState(false)
  const [notasCierre, setNotasCierre] = useState('')
  const [sobrantes, setSobrantes] = useState({})
  const [mostrarModalFirmas, setMostrarModalFirmas] = useState(false)

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const esTropical = tema === 'tropical'

  const fechaHoy = new Date().toISOString().split('T')[0]
  const fechaTexto = new Date().toLocaleDateString('es-DO', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  })

  useEffect(() => { cargarDatos() }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    const { data: empresaData } = await supabase.from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)
    const { data: escData } = await supabase.from('escuelas').select('*').eq('empresa_id', empresaId).eq('activa', true)
    setEscuelas(escData || [])
    const { data: opsData } = await supabase.from('operaciones_dia').select('*').eq('empresa_id', empresaId).eq('fecha', fechaHoy)
    setOperaciones(opsData || [])
    const sobrantesInicial = {}
    ;(opsData || []).forEach(op => {
      sobrantesInicial[op.id] = {
        peso: op.peso_sobrante_lb ? op.peso_sobrante_lb.toString() : '',
        notas: op.notas_pesaje_sobrante || ''
      }
    })
    setSobrantes(sobrantesInicial)
    const { data: recData } = await supabase.from('recetas').select('*').eq('empresa_id', empresaId)
    setRecetas(recData || [])
    setCargando(false)
  }

  function actualizarSobrante(opId, campo, valor) {
    setSobrantes(prev => ({ ...prev, [opId]: { ...prev[opId], [campo]: valor } }))
  }

  async function firmarTodosComoPropietario() {
    const opsListas = operaciones.filter(op => op.firma_imagen && !op.firma_propietario_at && op.estado !== 'sin_clase')
    if (opsListas.length === 0) {
      alert('No hay conduces listos para firmar.\n\nUn conduce está listo cuando:\n• El director ya firmó\n• El propietario aún no ha firmado')
      return
    }

    const confirmar = window.confirm(
      `¿Confirmas firmar ${opsListas.length} conduce(s) como ${empresa?.nombre_propietario || 'Propietario'}?\n\n` +
      opsListas.map(op => {
        const esc = escuelas.find(e => e.id === op.escuela_id)
        return `• Conduce ${op.numero_conduce} - ${esc?.nombre || 'Escuela'} (${op.raciones_planificadas} raciones)`
      }).join('\n') + `\n\nEsta acción quedará registrada con fecha y hora para auditoría INABIE.`
    )

    if (!confirmar) return
    setFirmandoMasivo(true)
    const ahora = new Date().toISOString()
    const nombreFirmante = usuario.nombre || usuario.email

    for (const op of opsListas) {
      await supabase.from('operaciones_dia').update({
        firma_propietario_at: ahora,
        firma_propietario_por_usuario_id: usuario.id,
        firma_propietario_por_nombre: nombreFirmante
      }).eq('id', op.id)
    }
    setFirmandoMasivo(false)
    alert(`✅ ${opsListas.length} conduce(s) firmado(s) exitosamente`)
    await cargarDatos()
  }

  function iniciarCierreDia() { setMostrarModalFirmas(true) }

  async function ejecutarCierreDia() {
    setMostrarModalFirmas(false)
    setCerrando(true)
    const opsConductos = operaciones.filter(op => op.estado !== 'sin_clase')
    const opsSinFirmaDirector = opsConductos.filter(op => !op.firma_imagen)
    const opsSinFirmaPropietario = opsConductos.filter(op => op.firma_imagen && !op.firma_propietario_at)
    
    let notasFinales = notasCierre || ''
    if (opsSinFirmaDirector.length > 0 || opsSinFirmaPropietario.length > 0) {
      const avisoAuditoria = `[CIERRE CON FIRMAS PENDIENTES] Director: ${opsSinFirmaDirector.length} sin firmar · Propietario: ${opsSinFirmaPropietario.length} sin firmar · Cerrado por ${usuario.nombre || 'Sistema'} el ${new Date().toISOString()}`
      notasFinales = notasFinales ? `${notasFinales}\n\n${avisoAuditoria}` : avisoAuditoria
    }

    const opsAbiertas = operaciones.filter(op => op.estado !== 'cerrada' && op.estado !== 'sin_clase')
    for (const op of opsAbiertas) {
      const sobranteOp = sobrantes[op.id] || {}
      const pesoNum = parseFloat(sobranteOp.peso)
      const datos = { estado: 'cerrada', notas_dia: notasFinales || op.notas_dia }
      if (pesoNum && pesoNum > 0) datos.peso_sobrante_lb = pesoNum
      if (sobranteOp.notas && sobranteOp.notas.trim()) datos.notas_pesaje_sobrante = sobranteOp.notas.trim()
      await supabase.from('operaciones_dia').update(datos).eq('id', op.id)
    }
    const opsSinClase = operaciones.filter(op => op.estado === 'sin_clase')
    for (const op of opsSinClase) {
      await supabase.from('operaciones_dia').update({ estado: 'cerrada' }).eq('id', op.id)
    }
    setCerrando(false)
    alert('✅ Día cerrado correctamente')
    cargarDatos()
  }

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando datos del día...</p>
      </div>
    )
  }

  // CÁLCULOS
  const opsEntregadas = operaciones.filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
  const opsPendientes = operaciones.filter(op => op.estado !== 'entregada' && op.estado !== 'cerrada' && op.estado !== 'sin_clase')
  const totalRacionesEntregadas = opsEntregadas.reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
  const facturacionDia = opsEntregadas.reduce((sum, op) => {
    const escuela = escuelas.find(e => e.id === op.escuela_id)
    return sum + ((op.raciones_planificadas || 0) * (parseFloat(escuela?.precio_racion) || 0))
  }, 0)
  const todasCerradas = operaciones.length > 0 && operaciones.every(op => op.estado === 'cerrada')
  const escuelasSinOperacion = escuelas.filter(e => !operaciones.find(o => o.escuela_id === e.id))
  const puedeCerrarDia = operaciones.length > 0 && opsPendientes.length === 0 && escuelasSinOperacion.length === 0 && !todasCerradas
  const horasInicio = operaciones.map(op => op.hora_inicio_preparacion).filter(Boolean)
  const horasEntrega = operaciones.map(op => op.hora_entrega).filter(Boolean)
  const horaInicioDia = horasInicio.length > 0 ? new Date(horasInicio.sort()[0]).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '—'
  const horaCierreDia = horasEntrega.length > 0 ? new Date(horasEntrega.sort().reverse()[0]).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' }) : '—'
  const operacionesParaSobrante = operaciones.filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
  const opsConductos = operaciones.filter(op => op.estado !== 'sin_clase')
  const opsDirectorFirmo = opsConductos.filter(op => !!op.firma_imagen)
  const opsPropietarioFirmo = opsConductos.filter(op => !!op.firma_propietario_at)
  const opsListasParaFirma = opsConductos.filter(op => op.firma_imagen && !op.firma_propietario_at)
  const opsSinFirmaDirector = opsConductos.filter(op => !op.firma_imagen)
  const usuarioPuedeFirmar = usuario && ROLES_PUEDEN_FIRMAR.includes(usuario.rol)
  const hayFirmasPendientes = opsListasParaFirma.length > 0 || opsSinFirmaDirector.length > 0

  // Colores según estado del día
  const colorTitulo = todasCerradas ? '#534AB7' : '#D85A30'
  const colorTituloBg = todasCerradas ? '#7F77DD' : '#E89042'
  const colorTituloDarker = todasCerradas ? '#3C3489' : '#7A2F12'
  const colorTituloClaro = todasCerradas ? '#EEEDFE' : '#FCE9DA'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <div style={toggleTemaStyle()}>
            <button onClick={() => setTema('oscuro')} style={tabTemaStyle(tema === 'oscuro')}>
              <span style={{ fontSize: '11px' }}>🌙</span>
              <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
            </button>
            <button onClick={() => setTema('tropical')} style={tabTemaStyle(tema === 'tropical')}>
              <span style={{ fontSize: '11px' }}>☀️</span>
              <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
            </button>
          </div>
        </div>

        {/* TÍTULO */}
        <div style={{
          background: esTropical ? `linear-gradient(135deg, ${colorTituloClaro} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${colorTitulo}25 0%, ${colorTitulo}10 100%)`,
          border: esTropical ? `1.5px solid ${colorTituloBg}` : `1px solid ${colorTitulo}55`,
          borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px',
          boxShadow: esTropical ? `0 2px 12px ${colorTitulo}15` : 'none',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: esTropical ? colorTitulo : `${colorTitulo}30`,
            display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
            boxShadow: esTropical ? `0 4px 12px ${colorTitulo}40` : 'none',
          }}>{todasCerradas ? '🔒' : '📋'}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '10px', color: esTropical ? colorTituloDarker : colorTitulo, opacity: 0.85, letterSpacing: '1.5px', fontWeight: 600 }}>
              {todasCerradas ? 'DÍA CERRADO' : 'CIERRE DEL DÍA'}
            </div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? colorTituloDarker : 'var(--color-text-primary)', marginTop: '2px', textTransform: 'capitalize' }}>
              {fechaTexto}
            </div>
          </div>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <KpiCard label="Escuelas" colorBorde="#378ADD">
            <span style={{ color: esTropical ? '#0C447C' : '#85B7EB' }}>{opsEntregadas.length}</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>/{escuelas.length}</span>
          </KpiCard>
          <KpiCard label="Raciones" valor={totalRacionesEntregadas.toLocaleString()} colorBorde="#1D9E75" colorTexto={esTropical ? '#04342C' : '#5DCAA5'} />
          <KpiCard label="Facturación" valor={`RD$ ${(facturacionDia / 1000).toFixed(1)}K`} colorBorde="#BA7517" colorTexto={esTropical ? '#854F0B' : '#FAC775'} />
          <KpiCard label="Horario" valor={`${horaInicioDia} → ${horaCierreDia}`} colorBorde="#7F77DD" />
        </div>

        {/* SECCIÓN FIRMAS */}
        {opsConductos.length > 0 && (
          <div style={{
            background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
            borderLeft: '4px solid #378ADD',
            borderRadius: '14px', padding: '20px', marginBottom: '20px',
            boxShadow: 'var(--modulo-sombra)',
          }}>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '11px', color: esTropical ? '#0C447C' : '#85B7EB', letterSpacing: '1.5px', fontWeight: 700 }}>
                🖊️ ESTADO DE FIRMAS
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                Resumen de firmas de los conduces del día
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
              <StatCardSmall label="Conduces del día" valor={opsConductos.length} color="#378ADD" />
              <StatCardSmall label="Director firmó" valor={`${opsDirectorFirmo.length}/${opsConductos.length}`} color="#1D9E75" />
              <StatCardSmall label="Propietario firmó" valor={`${opsPropietarioFirmo.length}/${opsConductos.length}`} color="#534AB7" />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {opsConductos.map(op => {
                const escuela = escuelas.find(e => e.id === op.escuela_id)
                const directorFirmo = !!op.firma_imagen
                const propietarioFirmo = !!op.firma_propietario_at
                return (
                  <div key={op.id} style={{
                    border: '1px solid var(--color-border-subtle)', borderRadius: '10px',
                    padding: '12px', background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '8px', flexWrap: 'wrap',
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        Conduce #{op.numero_conduce} - {escuela?.nombre || 'Escuela'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {op.raciones_planificadas} raciones
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <Pill ok={directorFirmo} label="Director" colorOk="#1D9E75" />
                      <Pill ok={propietarioFirmo} label="Propietario" colorOk="#534AB7" />
                    </div>
                  </div>
                )
              })}
            </div>

            {opsListasParaFirma.length > 0 && usuarioPuedeFirmar && (
              <div style={{
                background: `linear-gradient(135deg, #378ADD 0%, #185FA5 100%)`,
                borderRadius: '12px', padding: '20px', color: 'white',
                boxShadow: '0 4px 12px rgba(55, 138, 221, 0.3)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
                  <div>
                    <div style={{ fontSize: '11px', opacity: 0.8, letterSpacing: '1.5px', fontWeight: 600 }}>
                      ACCIÓN PENDIENTE
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: 600, marginTop: '4px' }}>
                      🖊️ Firma como Propietario
                    </div>
                    <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
                      {opsListasParaFirma.length} conduce(s) listo(s) para tu firma
                    </div>
                  </div>
                  <button
                    onClick={firmarTodosComoPropietario}
                    disabled={firmandoMasivo}
                    style={{
                      padding: '12px 20px', background: 'white',
                      border: 'none', borderRadius: '10px',
                      color: '#185FA5', fontSize: '13px', fontWeight: 600,
                      cursor: firmandoMasivo ? 'not-allowed' : 'pointer',
                      opacity: firmandoMasivo ? 0.6 : 1,
                      fontFamily: 'inherit', whiteSpace: 'nowrap',
                    }}
                  >
                    {firmandoMasivo ? '⏳ Firmando...' : `🖊️ Firmar ${opsListasParaFirma.length}`}
                  </button>
                </div>
                <div style={{ fontSize: '11px', opacity: 0.85, marginTop: '10px' }}>
                  Firmarás como: <strong>{empresa?.nombre_propietario || 'Propietario'}</strong> · Queda registrado con fecha y hora
                </div>
              </div>
            )}

            {opsListasParaFirma.length === 0 && opsConductos.length > 0 && (
              <div style={{
                background: opsPropietarioFirmo.length === opsConductos.length && opsDirectorFirmo.length === opsConductos.length
                  ? (esTropical ? '#E6F7EF' : 'rgba(29, 158, 117, 0.15)') : (esTropical ? '#F1EFE8' : 'var(--color-bg-elevated)'),
                border: opsPropietarioFirmo.length === opsConductos.length && opsDirectorFirmo.length === opsConductos.length
                  ? '1px solid #1D9E75' : '1px solid var(--color-border-subtle)',
                borderRadius: '10px', padding: '12px', textAlign: 'center', fontSize: '13px',
                color: opsPropietarioFirmo.length === opsConductos.length && opsDirectorFirmo.length === opsConductos.length
                  ? (esTropical ? '#04342C' : '#5DCAA5') : 'var(--color-text-secondary)',
                fontWeight: 500,
              }}>
                {opsPropietarioFirmo.length === opsConductos.length && opsDirectorFirmo.length === opsConductos.length
                  ? '✅ Todos los conduces tienen ambas firmas aplicadas'
                  : '⏳ Esperando que los directores firmen los conduces pendientes'}
              </div>
            )}
          </div>
        )}

        {/* ALERTAS */}
        {!todasCerradas && (opsPendientes.length > 0 || escuelasSinOperacion.length > 0) && (
          <div style={{
            background: esTropical ? '#FAF3E5' : 'rgba(250, 199, 117, 0.08)',
            border: '1px solid rgba(186, 117, 23, 0.3)',
            borderLeft: '4px solid #BA7517',
            borderRadius: '14px', padding: '16px 20px', marginBottom: '20px',
            boxShadow: 'var(--modulo-sombra)',
          }}>
            <div style={{ fontWeight: 600, color: esTropical ? '#854F0B' : '#FAC775', fontSize: '14px' }}>
              ⚠️ Hay operaciones sin completar
            </div>
            {opsPendientes.length > 0 && (
              <div style={{ fontSize: '12px', color: esTropical ? '#633806' : 'var(--color-text-secondary)', marginTop: '6px' }}>
                • {opsPendientes.length} escuela(s) en proceso (preparando/lista/en camino)
              </div>
            )}
            {escuelasSinOperacion.length > 0 && (
              <div style={{ fontSize: '12px', color: esTropical ? '#633806' : 'var(--color-text-secondary)', marginTop: '4px' }}>
                • {escuelasSinOperacion.length} escuela(s) sin iniciar todavía
              </div>
            )}
            <div style={{ fontSize: '12px', color: esTropical ? '#633806' : 'var(--color-text-muted)', marginTop: '8px' }}>
              No puedes cerrar el día hasta que todas las escuelas estén entregadas o marcadas como sin clase.
            </div>
          </div>
        )}

        {todasCerradas && (
          <div style={{
            background: esTropical ? '#EEEDFE' : 'rgba(127, 119, 221, 0.15)',
            border: '1px solid rgba(83, 74, 183, 0.3)',
            borderLeft: '4px solid #534AB7',
            borderRadius: '14px', padding: '16px 20px', marginBottom: '20px',
            boxShadow: 'var(--modulo-sombra)',
          }}>
            <div style={{ fontWeight: 600, color: esTropical ? '#3C3489' : '#AFA9EC', fontSize: '14px' }}>
              🎉 Día cerrado exitosamente
            </div>
            <div style={{ fontSize: '12px', color: esTropical ? '#3C3489' : 'var(--color-text-secondary)', marginTop: '4px' }}>
              Todas las operaciones quedaron cerradas. La data está lista para la facturación mensual.
            </div>
          </div>
        )}

        {/* DETALLE POR ESCUELA */}
        <div style={{
          background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
          borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '14px' }}>
            📋 DETALLE POR ESCUELA
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {escuelas.map(escuela => {
              const op = operaciones.find(o => o.escuela_id === escuela.id)
              const receta = op ? recetas.find(r => r.id === op.receta_id) : null
              const facturacion = op ? (op.raciones_planificadas || 0) * parseFloat(escuela.precio_racion || 0) : 0
              return (
                <div key={escuela.id} style={{
                  border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '14px',
                  background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '14px' }}>{escuela.nombre}</div>
                      {op ? (
                        <div style={{ marginTop: '6px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                          {receta && <div>{receta.emoji} {receta.nombre}</div>}
                          <div>🍽️ {op.raciones_planificadas} raciones · 💰 RD$ {facturacion.toFixed(0)}</div>
                          {op.hora_entrega && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                              🚚 Entregada: {new Date(op.hora_entrega).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                            </div>
                          )}
                          {op.peso_cocido_lb && (
                            <div style={{ fontSize: '11px', color: '#378ADD', fontWeight: 600, marginTop: '2px' }}>
                              ⚖️ Cocido: {op.peso_cocido_lb} lb
                            </div>
                          )}
                          {op.razon_no_clase && (
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '2px' }}>
                              📝 {op.razon_no_clase}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                          Sin operación registrada hoy
                        </div>
                      )}
                    </div>
                    <div>
                      {!op && <PillEstado color="#888780" emoji="" label="Sin iniciar" />}
                      {op?.estado === 'preparando' && <PillEstado color="#BA7517" emoji="🍳" label="Preparando" />}
                      {op?.estado === 'lista' && <PillEstado color="#378ADD" emoji="✅" label="Lista" />}
                      {op?.estado === 'despachando' && <PillEstado color="#D85A30" emoji="🚚" label="En camino" />}
                      {op?.estado === 'entregada' && <PillEstado color="#1D9E75" emoji="🎉" label="Entregada" />}
                      {op?.estado === 'cerrada' && <PillEstado color="#534AB7" emoji="🔒" label="Cerrada" />}
                      {op?.estado === 'sin_clase' && <PillEstado color="#888780" emoji="🚫" label="Sin clase" />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* PESAJE SOBRANTES */}
        {!todasCerradas && operacionesParaSobrante.length > 0 && (
          <div style={{
            background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
            borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)',
          }}>
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600 }}>
                ⚖️ PESAJE DE SOBRANTES (OPCIONAL)
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Registra cuánta comida sobró. Los datos alimentan la inteligencia operativa.
              </div>
            </div>

            <div style={{
              background: esTropical ? '#E6F1FB' : 'rgba(55, 138, 221, 0.1)',
              border: '1px solid rgba(55, 138, 221, 0.3)',
              borderLeft: '4px solid #378ADD',
              borderRadius: '10px', padding: '10px 14px', marginBottom: '14px',
              fontSize: '12px', color: esTropical ? '#0C447C' : '#85B7EB',
            }}>
              💡 <strong>Pesar es opcional pero recomendado.</strong> Saber cuánto sobró ayuda a ajustar las cantidades de los siguientes días y reducir la merma.
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {operacionesParaSobrante.map(op => {
                const escuela = escuelas.find(e => e.id === op.escuela_id)
                const datos = sobrantes[op.id] || { peso: '', notas: '' }
                const yaCerrada = op.estado === 'cerrada'
                return (
                  <div key={op.id} style={{
                    border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '14px',
                    background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap' }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {escuela?.nombre || 'Escuela'}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {op.raciones_planificadas} raciones planificadas
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '10px' }}>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                          Peso sobrante (lb)
                        </label>
                        <input
                          type="number" step="0.01" min="0"
                          value={datos.peso}
                          onChange={(e) => actualizarSobrante(op.id, 'peso', e.target.value)}
                          disabled={yaCerrada}
                          placeholder="0"
                          style={{
                            width: '100%', padding: '10px',
                            background: yaCerrada ? 'var(--color-bg-elevated)' : 'var(--color-bg-input)',
                            border: '1px solid var(--color-border-subtle)',
                            borderRadius: '8px', color: 'var(--color-text-primary)',
                            fontSize: '13px', fontWeight: 600, fontFamily: 'inherit', outline: 'none',
                          }}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: '11px', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '4px', display: 'block' }}>
                          Notas (opcional)
                        </label>
                        <input
                          type="text"
                          value={datos.notas}
                          onChange={(e) => actualizarSobrante(op.id, 'notas', e.target.value)}
                          disabled={yaCerrada}
                          placeholder="Ej: Sobró arroz, faltó pollo, etc."
                          style={{
                            width: '100%', padding: '10px',
                            background: yaCerrada ? 'var(--color-bg-elevated)' : 'var(--color-bg-input)',
                            border: '1px solid var(--color-border-subtle)',
                            borderRadius: '8px', color: 'var(--color-text-primary)',
                            fontSize: '13px', fontFamily: 'inherit', outline: 'none',
                          }}
                        />
                      </div>
                    </div>
                    {op.peso_cocido_lb && (
                      <div style={{ fontSize: '11px', color: '#378ADD', marginTop: '6px' }}>
                        ⚖️ Para referencia, se cocinó: <strong>{op.peso_cocido_lb} lb</strong>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* NOTAS CIERRE */}
        {!todasCerradas && (
          <div style={{
            background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
            borderRadius: '14px', padding: '18px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)',
          }}>
            <label style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '8px', display: 'block' }}>
              📝 NOTAS DEL CIERRE (OPCIONAL)
            </label>
            <textarea
              placeholder="Ej: Día normal. Hubo más demanda en Pedro Enriquez."
              value={notasCierre}
              onChange={(e) => setNotasCierre(e.target.value)}
              rows={3}
              style={{
                width: '100%', padding: '12px',
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '10px', color: 'var(--color-text-primary)',
                fontSize: '13px', fontFamily: 'inherit', outline: 'none', resize: 'vertical',
              }}
            />
          </div>
        )}

        {/* BANNER FIRMAS PENDIENTES */}
        {puedeCerrarDia && hayFirmasPendientes && (
          <div style={{
            background: esTropical ? '#FAF3E5' : 'rgba(250, 199, 117, 0.08)',
            border: '2px solid rgba(186, 117, 23, 0.4)',
            borderLeft: '4px solid #BA7517',
            borderRadius: '14px', padding: '16px 18px', marginBottom: '14px',
            boxShadow: 'var(--modulo-sombra)',
          }}>
            <div style={{ display: 'flex', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, color: esTropical ? '#854F0B' : '#FAC775', fontSize: '14px' }}>
                  Atención: Firmas pendientes detectadas
                </div>
                <div style={{ fontSize: '12px', color: esTropical ? '#633806' : 'var(--color-text-secondary)', marginTop: '6px' }}>
                  {opsSinFirmaDirector.length > 0 && (
                    <div>• {opsSinFirmaDirector.length} conduce(s) sin firma del Director del Centro</div>
                  )}
                  {opsListasParaFirma.length > 0 && (
                    <div>• {opsListasParaFirma.length} conduce(s) sin firma del Propietario</div>
                  )}
                </div>
                <div style={{ fontSize: '11px', color: esTropical ? '#633806' : 'var(--color-text-muted)', marginTop: '8px' }}>
                  Puedes cerrar el día de todas formas, pero quedará registrado para auditoría INABIE.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* BOTÓN CERRAR */}
        {puedeCerrarDia && (
          <button
            onClick={iniciarCierreDia}
            disabled={cerrando}
            style={{
              width: '100%', padding: '20px',
              background: 'linear-gradient(135deg, #534AB7 0%, #3C3489 100%)',
              border: 'none', borderRadius: '16px',
              color: 'white', fontSize: '18px', fontWeight: 600,
              cursor: cerrando ? 'not-allowed' : 'pointer',
              opacity: cerrando ? 0.6 : 1, fontFamily: 'inherit',
              boxShadow: '0 4px 16px rgba(83, 74, 183, 0.4)',
            }}
          >
            {cerrando ? '⏳ Cerrando día...' : '🔒 Cerrar día completo'}
          </button>
        )}
      </div>

      {/* MODAL DE FIRMAS */}
      {mostrarModalFirmas && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-modulo-border)',
            borderRadius: '18px',
            maxWidth: '520px', width: '100%',
            maxHeight: '90vh', overflow: 'hidden',
            display: 'flex', flexDirection: 'column',
          }}>
            <div style={{
              background: hayFirmasPendientes 
                ? 'linear-gradient(135deg, #BA7517 0%, #854F0B 100%)'
                : 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
              padding: '24px', textAlign: 'center', color: 'white',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '8px' }}>
                {hayFirmasPendientes ? '⚠️' : '✅'}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 600 }}>
                {hayFirmasPendientes ? '¿Cerrar día con firmas pendientes?' : '¿Cerrar el día?'}
              </div>
              <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '4px' }}>
                {hayFirmasPendientes ? 'Hay conduces sin firmar' : 'Todas las firmas están aplicadas'}
              </div>
            </div>

            <div style={{ padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ background: esTropical ? '#FBFAF6' : 'var(--color-bg-card)', borderRadius: '12px', padding: '14px' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '10px' }}>
                  📊 RESUMEN DEL DÍA
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '13px' }}>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Conduces:</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '16px' }}>{opsConductos.length}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Raciones:</div>
                    <div style={{ fontWeight: 600, color: '#378ADD', fontSize: '16px' }}>{totalRacionesEntregadas.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Facturación:</div>
                    <div style={{ fontWeight: 600, color: '#1D9E75', fontSize: '14px' }}>
                      RD$ {facturacionDia.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Horario:</div>
                    <div style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '13px' }}>{horaInicioDia} → {horaCierreDia}</div>
                  </div>
                </div>
              </div>

              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '8px' }}>
                  🖊️ ESTADO DE FIRMAS
                </div>
                <FirmaStatus 
                  completo={opsDirectorFirmo.length === opsConductos.length} 
                  label="Firma del Director del Centro"
                  detalle={`${opsDirectorFirmo.length} de ${opsConductos.length} conduces firmados`}
                  pendientes={opsSinFirmaDirector.length}
                  esTropical={esTropical}
                />
                <FirmaStatus 
                  completo={opsPropietarioFirmo.length === opsConductos.length}
                  label="Firma del Propietario"
                  detalle={`${opsPropietarioFirmo.length} de ${opsConductos.length} conduces firmados`}
                  pendientes={opsListasParaFirma.length}
                  pendientesLabel="listo(s) para tu firma"
                  esTropical={esTropical}
                />
              </div>

              {hayFirmasPendientes && (
                <div style={{
                  background: esTropical ? '#FAF3E5' : 'rgba(250, 199, 117, 0.08)',
                  border: '1px solid rgba(186, 117, 23, 0.4)',
                  borderRadius: '10px', padding: '12px',
                }}>
                  <div style={{ fontWeight: 600, fontSize: '12px', color: esTropical ? '#854F0B' : '#FAC775', marginBottom: '4px' }}>
                    ⚖️ Aviso de Auditoría INABIE
                  </div>
                  <div style={{ fontSize: '11px', color: esTropical ? '#633806' : 'var(--color-text-secondary)' }}>
                    Si cierras el día con firmas pendientes, se registrará una nota automática en el cierre indicando cuántas firmas faltaron y quién cerró el día.
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '8px' }}>
                {opsListasParaFirma.length > 0 && usuarioPuedeFirmar && (
                  <button
                    onClick={() => { setMostrarModalFirmas(false); firmarTodosComoPropietario() }}
                    disabled={cerrando || firmandoMasivo}
                    style={{
                      padding: '14px',
                      background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)',
                      border: 'none', borderRadius: '12px',
                      color: 'white', cursor: 'pointer', fontFamily: 'inherit',
                      textAlign: 'left',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <span style={{ fontSize: '22px' }}>🖊️</span>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>Firmar pendientes primero</div>
                        <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
                          Recomendado · Firma los {opsListasParaFirma.length} conduce(s) listos antes de cerrar
                        </div>
                      </div>
                    </div>
                  </button>
                )}

                <button
                  onClick={ejecutarCierreDia}
                  disabled={cerrando}
                  style={{
                    padding: '14px',
                    background: hayFirmasPendientes 
                      ? 'linear-gradient(135deg, #E24B4A 0%, #A32D2D 100%)'
                      : 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                    border: 'none', borderRadius: '12px',
                    color: 'white', cursor: 'pointer', fontFamily: 'inherit',
                    textAlign: 'left', opacity: cerrando ? 0.6 : 1,
                  }}
                >
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <span style={{ fontSize: '22px' }}>{hayFirmasPendientes ? '⚠️' : '🔒'}</span>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '13px' }}>
                        {hayFirmasPendientes ? 'Cerrar día con firmas pendientes' : 'Cerrar día completo'}
                      </div>
                      <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
                        {hayFirmasPendientes ? 'Tú asumes el riesgo · Registrado en auditoría' : 'Todas las firmas listas · Acción irreversible'}
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setMostrarModalFirmas(false)}
                  disabled={cerrando}
                  style={{
                    padding: '12px',
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '10px',
                    color: 'var(--color-text-secondary)',
                    fontSize: '13px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Sub-componentes
function KpiCard({ label, valor, sublabel, children, colorBorde, colorTexto }) {
  return (
    <div style={{
      background: 'var(--color-modulo-bg)',
      border: '1px solid var(--color-modulo-border)',
      borderLeft: `4px solid ${colorBorde}`,
      borderRadius: '12px', padding: '14px',
      boxShadow: 'var(--modulo-sombra)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 600, color: colorTexto || 'var(--color-text-primary)' }}>{valor || children}</div>
      {sublabel && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sublabel}</div>}
    </div>
  )
}

function StatCardSmall({ label, valor, color }) {
  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      border: '1px solid var(--color-border-subtle)',
      borderLeft: `4px solid ${color}`,
      borderRadius: '10px', padding: '10px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '20px', fontWeight: 600, color }}>{valor}</div>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{label}</div>
    </div>
  )
}

function Pill({ ok, label, colorOk }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 600,
      padding: '4px 10px', borderRadius: '10px',
      background: ok ? `${colorOk}25` : 'var(--color-bg-elevated)',
      color: ok ? colorOk : 'var(--color-text-muted)',
      border: `1px solid ${ok ? colorOk + '40' : 'var(--color-border-subtle)'}`,
    }}>
      {ok ? '✅' : '⏳'} {label}
    </span>
  )
}

function PillEstado({ color, emoji, label }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 600,
      padding: '4px 10px', borderRadius: '10px',
      background: `${color}25`, color, whiteSpace: 'nowrap',
    }}>
      {emoji} {label}
    </span>
  )
}

function FirmaStatus({ completo, label, detalle, pendientes, pendientesLabel = 'pendiente(s) por firmar', esTropical }) {
  const bg = completo 
    ? (esTropical ? '#E6F7EF' : 'rgba(29, 158, 117, 0.12)')
    : (esTropical ? '#FAF3E5' : 'rgba(250, 199, 117, 0.08)')
  const border = completo 
    ? '1px solid rgba(29, 158, 117, 0.4)' 
    : '1px solid rgba(186, 117, 23, 0.4)'
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '10px',
      padding: '10px 12px', borderRadius: '10px',
      background: bg, border, marginBottom: '6px',
    }}>
      <span style={{ fontSize: '18px' }}>{completo ? '✅' : '⚠️'}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '12px', color: 'var(--color-text-primary)' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>{detalle}</div>
        {pendientes > 0 && (
          <div style={{ fontSize: '11px', color: esTropical ? '#854F0B' : '#FAC775', fontWeight: 600, marginTop: '2px' }}>
            {pendientes} {pendientesLabel}
          </div>
        )}
      </div>
    </div>
  )
}

function btnVolver() {
  return {
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '20px', padding: '8px 16px',
    color: 'var(--color-text-secondary)',
    fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
  }
}

function toggleTemaStyle() {
  return {
    display: 'flex', alignItems: 'center',
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '20px', padding: '3px', gap: '2px',
  }
}

function tabTemaStyle(activo) {
  return {
    background: activo ? 'var(--gradient-toggle-active)' : 'transparent',
    border: 'none', borderRadius: '16px', padding: '6px 10px',
    display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
  }
}

export default CierreDelDia