import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const ROSA = { c: '#D4537E', claro: '#FBEAF0', dark: '#72243E' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }
const MORADO = { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' }
const ROJO = { c: '#E24B4A', claro: '#FCEBEB', dark: '#7A1F1E' }

function MisRecibos({ usuario, empresaId, onVolver }) {
  const [recibos, setRecibos] = useState([])
  const [periodos, setPeriodos] = useState({})
  const [cargando, setCargando] = useState(true)
  const [reciboSeleccionado, setReciboSeleccionado] = useState(null)

  const [tema, setTema] = useState(() => {
    if (typeof document === 'undefined') return 'oscuro'
    return localStorage.getItem('cocina_pae_tema') || 'oscuro'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const esTropical = tema === 'tropical'

  useEffect(() => { if (usuario?.id && empresaId) cargarMisRecibos() }, [usuario, empresaId])

  async function cargarMisRecibos() {
    setCargando(true)
    const { data: detalles, error } = await supabase
      .from('pagos_nomina_detalle').select('*')
      .eq('empresa_id', empresaId).eq('usuario_id', usuario.id)
      .order('created_at', { ascending: false })
    if (error) { console.error('Error cargando recibos:', error); setCargando(false); return }
    setRecibos(detalles || [])
    const periodoIds = [...new Set((detalles || []).map(d => d.pago_nomina_id))]
    if (periodoIds.length > 0) {
      const { data: periodosData } = await supabase.from('pagos_nomina').select('*').in('id', periodoIds)
      const periodosMap = {}
      ;(periodosData || []).forEach(p => { periodosMap[p.id] = p })
      setPeriodos(periodosMap)
    }
    setCargando(false)
  }

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  function formatearFecha(fecha) {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  function descripcionPeriodo(periodo) {
    if (!periodo) return 'Sin período'
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const mesNombre = meses[(periodo.mes || 1) - 1]
    if (periodo.tipo_periodo === 'mensual') return `${mesNombre} ${periodo.año}`
    if (periodo.tipo_periodo === 'quincenal') {
      const qStr = periodo.semana === 1 ? '1ra Quincena' : '2da Quincena'
      return `${qStr} ${mesNombre} ${periodo.año}`
    }
    if (periodo.tipo_periodo === 'semanal') return `Semana ${periodo.semana} de ${mesNombre} ${periodo.año}`
    return `${formatearFecha(periodo.fecha_inicio)} - ${formatearFecha(periodo.fecha_fin)}`
  }

  // ═══════ VISTA DETALLE ═══════
  if (reciboSeleccionado) {
    const periodo = periodos[reciboSeleccionado.pago_nomina_id]
    const r = reciboSeleccionado
    const totalDevengado = parseFloat(r.salario_neto || 0) + parseFloat(r.bono_extra || 0) + parseFloat(r.ajuste_positivo || 0)
    const totalDeducciones = parseFloat(r.ajuste_negativo || 0)

    return (
      <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '20px' }}>
        
        {/* TOGGLE DE TEMA */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
          <div style={toggleContenedorStyle()}>
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

        {/* HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
          borderRadius: '16px', padding: '24px', marginBottom: '20px', color: 'white',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', opacity: 0.85, margin: 0 }}>RECIBO DE PAGO</p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0' }}>{descripcionPeriodo(periodo)}</h2>
              <p style={{ fontSize: '13px', opacity: 0.85, margin: 0 }}>Pagado: {formatearFecha(r.fecha_pagado)}</p>
            </div>
            <button onClick={() => setReciboSeleccionado(null)}
              style={{
                background: 'rgba(0,0,0,0.25)', color: 'white', border: 'none',
                borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>← Volver a mis recibos</button>
          </div>
        </div>

        {/* EMPLEADO */}
        <div style={{ ...tarjetaStyle(), padding: '18px', marginBottom: '14px' }}>
          <p style={labelStyle()}>👤 EMPLEADO</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>Nombre:</p>
              <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: '2px 0 0' }}>{r.empleado_nombre}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: 0 }}>Rol:</p>
              <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: '2px 0 0', textTransform: 'capitalize' }}>
                {r.empleado_rol?.replace('_', ' ') || '—'}
              </p>
            </div>
          </div>
        </div>

        {/* DESGLOSE */}
        <div style={{ ...tarjetaStyle(), padding: '18px', marginBottom: '14px' }}>
          <p style={labelStyle()}>💰 DESGLOSE DEL PAGO</p>

          {/* DEVENGADO */}
          <div style={{ marginBottom: '16px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: VERDE.c, marginBottom: '10px' }}>+ DEVENGADO</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <FilaPago label="Salario neto" valor={`RD$ ${formatearMoneda(r.salario_neto)}`} />
              {r.bono_extra > 0 && (
                <FilaPagoColor color={MORADO} esTropical={esTropical}
                  label="🎁 Bonificación" subLabel={r.bono_descripcion}
                  valor={`RD$ ${formatearMoneda(r.bono_extra)}`} />
              )}
              {r.ajuste_positivo > 0 && (
                <FilaPagoColor color={AZUL} esTropical={esTropical}
                  label="➕ Ajuste positivo" subLabel={r.ajuste_razon}
                  valor={`RD$ ${formatearMoneda(r.ajuste_positivo)}`} />
              )}
            </div>
            <div style={{
              borderTop: `1px solid ${VERDE.c}40`, marginTop: '10px', paddingTop: '10px',
              display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700,
              color: VERDE.c,
            }}>
              <span>Total devengado:</span>
              <span style={{ fontFamily: 'monospace' }}>RD$ {formatearMoneda(totalDevengado)}</span>
            </div>
          </div>

          {/* DEDUCCIONES */}
          {totalDeducciones > 0 && (
            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '11px', fontWeight: 700, color: ROJO.c, marginBottom: '10px' }}>− DEDUCCIONES</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {r.ajuste_negativo > 0 && (
                  <FilaPagoColor color={ROJO} esTropical={esTropical}
                    label="➖ Ajuste negativo" subLabel={r.ajuste_razon}
                    valor={`RD$ ${formatearMoneda(r.ajuste_negativo)}`} />
                )}
              </div>
              <div style={{
                borderTop: `1px solid ${ROJO.c}40`, marginTop: '10px', paddingTop: '10px',
                display: 'flex', justifyContent: 'space-between', fontSize: '14px', fontWeight: 700,
                color: ROJO.c,
              }}>
                <span>Total deducciones:</span>
                <span style={{ fontFamily: 'monospace' }}>RD$ {formatearMoneda(totalDeducciones)}</span>
              </div>
            </div>
          )}

          {/* TOTAL FINAL */}
          <div style={{
            background: esTropical 
              ? 'linear-gradient(135deg, #D7F0DD 0%, #BFE8C9 100%)' 
              : `linear-gradient(135deg, ${VERDE.c}25 0%, ${VERDE.c}15 100%)`,
            border: `2px solid ${VERDE.c}50`, borderRadius: '12px', padding: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '17px', fontWeight: 700, color: esTropical ? VERDE.dark : VERDE.c, margin: 0 }}>
                TOTAL RECIBIDO:
              </p>
              <p style={{ fontSize: '24px', fontWeight: 700, color: esTropical ? VERDE.dark : VERDE.c, margin: 0, fontFamily: 'monospace' }}>
                RD$ {formatearMoneda(r.total_pagado)}
              </p>
            </div>
          </div>
        </div>

        {/* APORTES PATRONALES */}
        {r.aporte_tss_afp > 0 && (
          <div style={{
            background: esTropical ? AZUL.claro : `${AZUL.c}12`,
            border: `1px solid ${AZUL.c}40`, borderRadius: '12px',
            padding: '14px', marginBottom: '14px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: esTropical ? AZUL.dark : AZUL.c, letterSpacing: '0.5px', marginBottom: '8px' }}>
              ℹ️ APORTES PATRONALES (pagados por la empresa, NO se descuentan a ti)
            </p>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
              <span style={{ color: 'var(--color-text-secondary)' }}>TSS + AFP:</span>
              <span style={{ fontFamily: 'monospace', fontWeight: 700, color: esTropical ? AZUL.dark : AZUL.c }}>
                RD$ {formatearMoneda(r.aporte_tss_afp)}
              </span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
              Estos aportes los paga la empresa directamente al gobierno por tu beneficio (seguro de salud + pensión).
            </p>
          </div>
        )}

        {/* FIRMA */}
        {r.firma_empleado_at && (
          <div style={{
            background: esTropical ? VERDE.claro : `${VERDE.c}15`,
            border: `1px solid ${VERDE.c}40`, borderRadius: '12px', padding: '14px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: esTropical ? VERDE.dark : VERDE.c, letterSpacing: '0.5px', marginBottom: '6px' }}>
              ✅ FIRMA APLICADA
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
              Confirmaste haber recibido este pago el {formatearFecha(r.firma_empleado_at)}
            </p>
          </div>
        )}

        {!r.firma_empleado_at && r.estado === 'pagado' && (
          <div style={{
            background: esTropical ? AMBAR.claro : `${AMBAR.c}15`,
            border: `1px solid ${AMBAR.c}40`, borderRadius: '12px', padding: '14px',
          }}>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
              ⏳ Aún no has firmado este recibo. Habla con tu supervisor para confirmar la recepción.
            </p>
          </div>
        )}
      </div>
    )
  }

  // ═══════ VISTA LISTA ═══════
  return (
    <div style={{ width: '100%', maxWidth: '960px', margin: '0 auto', padding: '20px' }}>
      
      {/* TOGGLE DE TEMA */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <div style={toggleContenedorStyle()}>
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

      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
        borderRadius: '16px', padding: '24px', marginBottom: '24px', color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', opacity: 0.85, margin: 0 }}>MIS RECIBOS DE PAGO</p>
            <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '4px 0' }}>💰 Historial de Pagos</h2>
            <p style={{ fontSize: '13px', opacity: 0.85, margin: 0 }}>{usuario.nombre} · {recibos.length} recibo(s)</p>
          </div>
          <button onClick={onVolver}
            style={{
              background: 'rgba(0,0,0,0.25)', color: 'white', border: 'none',
              borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>← Volver</button>
        </div>
      </div>

      {/* STATS */}
      {recibos.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px', marginBottom: '24px' }}>
          <KpiCard label="TOTAL RECIBOS" valor={recibos.length} color="var(--color-text-primary)" />
          <KpiCard label="PAGADOS" valor={recibos.filter(r => r.estado === 'pagado').length} color={VERDE.c} />
          <KpiCard label="FIRMADOS" valor={recibos.filter(r => r.firma_empleado_at).length} color={MORADO.c} />
        </div>
      )}

      {/* LISTA */}
      {cargando ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>Cargando tus recibos...</div>
      ) : recibos.length === 0 ? (
        <div style={{ ...tarjetaStyle(), padding: '48px', textAlign: 'center' }}>
          <p style={{ fontSize: '52px', marginBottom: '12px' }}>📭</p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-secondary)', margin: 0 }}>Aún no tienes recibos</p>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '8px' }}>
            Tus pagos de nómina aparecerán aquí cuando tu empleador los procese.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recibos.map(r => {
            const periodo = periodos[r.pago_nomina_id]
            const firmado = !!r.firma_empleado_at
            const pagado = r.estado === 'pagado'

            return (
              <button key={r.id} onClick={() => setReciboSeleccionado(r)}
                style={{
                  width: '100%', textAlign: 'left',
                  background: 'var(--color-bg-elevated)', border: '2px solid var(--color-border-subtle)',
                  borderRadius: '16px', padding: '18px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)', cursor: 'pointer',
                  fontFamily: 'inherit', transition: 'all 0.15s',
                }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '17px', margin: 0 }}>
                      {descripcionPeriodo(periodo)}
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                      Pagado: {formatearFecha(r.fecha_pagado)}
                    </p>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px', flexWrap: 'wrap' }}>
                      {pagado && <Pill color={VERDE} esTropical={esTropical} texto="✅ Pagado" />}
                      {firmado ? <Pill color={MORADO} esTropical={esTropical} texto="✍️ Firmado" />
                        : pagado && <Pill color={AMBAR} esTropical={esTropical} texto="⏳ Sin firmar" />}
                      {r.bono_extra > 0 && <Pill color={ROSA} esTropical={esTropical} texto="🎁 Con bono" />}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>Total</p>
                    <p style={{ fontSize: '22px', fontWeight: 700, color: VERDE.c, margin: '4px 0 0', fontFamily: 'monospace' }}>
                      RD$ {formatearMoneda(r.total_pagado)}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FilaPago({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-text-primary)' }}>{valor}</span>
    </div>
  )
}

function FilaPagoColor({ color, esTropical, label, subLabel, valor }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      background: esTropical ? color.claro : `${color.c}15`,
      padding: '8px 12px', borderRadius: '8px', fontSize: '13px',
      border: `1px solid ${color.c}30`,
    }}>
      <div>
        <span style={{ color: esTropical ? color.dark : color.c, fontWeight: 600 }}>{label}</span>
        {subLabel && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{subLabel}</p>}
      </div>
      <span style={{ fontFamily: 'monospace', fontWeight: 700, color: esTropical ? color.dark : color.c }}>{valor}</span>
    </div>
  )
}

function KpiCard({ label, valor, color }) {
  return (
    <div style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
      borderRadius: '12px', padding: '16px', textAlign: 'center',
      boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
    }}>
      <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.5px', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '24px', fontWeight: 700, color, margin: '6px 0 0' }}>{valor}</p>
    </div>
  )
}

function Pill({ color, esTropical, texto }) {
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
      background: esTropical ? color.claro : `${color.c}15`,
      border: `1px solid ${color.c}40`,
      color: esTropical ? color.dark : color.c,
    }}>
      {texto}
    </span>
  )
}

function toggleContenedorStyle() {
  return {
    display: 'inline-flex',
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '20px',
    padding: '3px',
    gap: '2px',
  }
}

function tabTemaStyle(activo) {
  return {
    background: activo ? 'var(--gradient-toggle-active)' : 'transparent',
    border: 'none', borderRadius: '16px', padding: '6px 10px',
    display: 'flex', alignItems: 'center', gap: '5px',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

function tarjetaStyle() {
  return {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '16px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  }
}

function labelStyle() {
  return { fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.5px', marginBottom: '14px' }
}

export default MisRecibos