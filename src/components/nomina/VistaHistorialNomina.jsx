import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function VistaHistorialNomina({ empresaId, onVolver }) {
  const [pagos, setPagos] = useState([])
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear())
  const [añosDisponibles, setAñosDisponibles] = useState([])
  const [pagoDetalle, setPagoDetalle] = useState(null)
  const [detallesPago, setDetallesPago] = useState([])
  const [cargando, setCargando] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  useEffect(() => {
    if (empresaId) cargarAños()
  }, [empresaId])

  useEffect(() => {
    if (empresaId && añoSeleccionado) cargarPagos()
  }, [añoSeleccionado, empresaId])

  async function cargarAños() {
    const { data } = await supabase
      .from('pagos_nomina').select('año').eq('empresa_id', empresaId).order('año', { ascending: false })
    const años = [...new Set((data || []).map(p => p.año))]
    if (años.length === 0) años.push(new Date().getFullYear())
    setAñosDisponibles(años)
    if (!años.includes(añoSeleccionado)) setAñoSeleccionado(años[0])
  }

  async function cargarPagos() {
    setCargando(true)
    const { data } = await supabase
      .from('pagos_nomina').select('*')
      .eq('empresa_id', empresaId).eq('año', añoSeleccionado)
      .order('mes', { ascending: false }).order('tipo_periodo', { ascending: false })
    setPagos(data || [])
    setCargando(false)
  }

  async function abrirDetalle(pago) {
    setPagoDetalle(pago)
    setCargandoDetalle(true)
    const { data } = await supabase
      .from('pagos_nomina_detalle').select('*').eq('pago_nomina_id', pago.id).order('empleado_nombre')
    setDetallesPago(data || [])
    setCargandoDetalle(false)
  }

  function cerrarDetalle() {
    setPagoDetalle(null)
    setDetallesPago([])
  }

  function nombreMes(mes) {
    const nombres = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    return nombres[mes - 1] || ''
  }

  function labelPeriodo(pago) {
    if (pago.tipo_periodo === 'quincenal_1') return `1ra quincena de ${nombreMes(pago.mes)} ${pago.año}`
    if (pago.tipo_periodo === 'quincenal_2') return `2da quincena de ${nombreMes(pago.mes)} ${pago.año}`
    if (pago.tipo_periodo === 'mensual') return `${nombreMes(pago.mes)} ${pago.año}`
    if (pago.tipo_periodo === 'semanal') return `Semana ${pago.semana} de ${nombreMes(pago.mes)} ${pago.año}`
    return `${nombreMes(pago.mes)} ${pago.año}`
  }

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function formatearFecha(fecha) {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const totalAño = pagos.reduce((s, p) => s + parseFloat(p.total_neto || 0), 0)
  const totalBrutoAño = pagos.reduce((s, p) => s + parseFloat(p.total_bruto || 0), 0)
  const promedioPago = pagos.length > 0 ? totalAño / pagos.length : 0

  // ─── ESTILOS ───
  const panel = {
    background: 'var(--color-modulo-bg)',
    border: '1px solid var(--color-modulo-border)',
    borderRadius: '14px', padding: '20px',
    boxShadow: 'var(--modulo-sombra)',
  }
  const sectionTitle = {
    fontSize: '11px', color: 'var(--color-text-muted)',
    letterSpacing: '1.5px', fontWeight: 600, marginBottom: '14px',
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg-primary)',
      position: 'relative', padding: '20px', color: 'var(--color-text-primary)',
    }}>
      <style>{`
        @keyframes vhSlideTop { 0% { opacity: 0; transform: translateY(-18px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes vhFadeUp { 0% { opacity: 0; transform: translateY(22px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* MODAL DETALLE */}
      {pagoDetalle && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 95,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
          padding: '20px', overflowY: 'auto',
        }}>
          <div style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border-accent)',
            borderRadius: '16px', maxWidth: '720px', width: '100%',
          }}>
            <div style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '20px 24px',
              borderBottom: '1px solid var(--color-border-subtle)',
              flexWrap: 'wrap', gap: '12px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <div style={{
                  width: '44px', height: '44px', borderRadius: '12px',
                  background: 'rgba(29, 158, 117, 0.18)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>💰</div>
                <div>
                  <div style={{ fontSize: '10px', color: '#1D9E75', letterSpacing: '1.5px', fontWeight: 600 }}>
                    RECIBO DE PAGO
                  </div>
                  <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                    {labelPeriodo(pagoDetalle)}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    Pagado el {formatearFecha(pagoDetalle.fecha_pago)}
                  </div>
                </div>
              </div>

              <button onClick={cerrarDetalle} style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '20px', padding: '7px 14px',
                color: 'var(--color-text-secondary)', fontSize: '12px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>✖ Cerrar</button>
            </div>

            <div style={{ padding: '20px 24px' }}>
              {/* Info del pago */}
              <div style={{ ...panel, marginBottom: '14px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Período</div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {formatearFecha(pagoDetalle.fecha_inicio)} - {formatearFecha(pagoDetalle.fecha_fin)}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Estado</div>
                    <div style={{ fontWeight: 500, color: '#1D9E75', textTransform: 'capitalize' }}>✅ {pagoDetalle.estado}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Empleados</div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{pagoDetalle.cantidad_empleados}</div>
                  </div>
                </div>
                {pagoDetalle.notas && (
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '4px' }}>📝 Notas</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontStyle: 'italic' }}>{pagoDetalle.notas}</div>
                  </div>
                )}
              </div>

              {/* Totales */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                <KpiMini label="NETO PAGADO" valor={pagoDetalle.total_neto} color="#1D9E75" formatear={formatearMoneda} />
                <KpiMini label="COSTO BRUTO" valor={pagoDetalle.total_bruto} color="#378ADD" formatear={formatearMoneda} />
                <KpiMini label="APORTES" valor={pagoDetalle.total_aportes} color="#7F77DD" formatear={formatearMoneda} />
                <KpiMini label="BONOS EXTRA" valor={pagoDetalle.total_bonos} color="#EF9F27" formatear={formatearMoneda} />
              </div>

              {/* Detalle por empleado */}
              <div style={{ ...sectionTitle, marginBottom: '10px' }}>
                👥 DETALLE POR EMPLEADO ({detallesPago.length})
              </div>

              {cargandoDetalle ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>⏳ Cargando detalle...</div>
              ) : detallesPago.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', color: 'var(--color-text-muted)' }}>No hay detalle disponible</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {detallesPago.map(d => (
                    <div key={d.id} style={{
                      background: 'var(--color-bg-input)',
                      border: '1px solid var(--color-border-subtle)',
                      borderLeft: '4px solid #1D9E75',
                      borderRadius: '10px', padding: '12px 14px',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', flexWrap: 'wrap', marginBottom: '8px' }}>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{d.empleado_nombre}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{d.empleado_rol?.replace('_', ' ')}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Total pagado</div>
                          <div style={{ fontSize: '17px', fontWeight: 600, color: '#1D9E75' }}>RD$ {formatearMoneda(d.total_pagado)}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px', fontSize: '11px', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
                        <div>
                          <div style={{ color: 'var(--color-text-muted)' }}>Neto base</div>
                          <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>RD$ {formatearMoneda(d.salario_neto)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--color-text-muted)' }}>Bruto</div>
                          <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>RD$ {formatearMoneda(d.salario_bruto)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--color-text-muted)' }}>TSS+AFP</div>
                          <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>RD$ {formatearMoneda(d.aporte_tss_afp)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--color-text-muted)' }}>Bono extra</div>
                          <div style={{ fontWeight: 500, color: '#EF9F27' }}>RD$ {formatearMoneda(d.bono_extra)}</div>
                        </div>
                      </div>

                      {(parseFloat(d.ajuste_positivo) > 0 || parseFloat(d.ajuste_negativo) > 0) && (
                        <div style={{ marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)', fontSize: '11px' }}>
                          {parseFloat(d.ajuste_positivo) > 0 && (
                            <div style={{ color: '#1D9E75' }}>
                              ➕ Ajuste positivo: RD$ {formatearMoneda(d.ajuste_positivo)}
                              {d.ajuste_razon && ` · ${d.ajuste_razon}`}
                            </div>
                          )}
                          {parseFloat(d.ajuste_negativo) > 0 && (
                            <div style={{ color: '#F4C0D1' }}>
                              ➖ Ajuste negativo: RD$ {formatearMoneda(d.ajuste_negativo)}
                              {d.ajuste_razon && ` · ${d.ajuste_razon}`}
                            </div>
                          )}
                        </div>
                      )}

                      {d.bono_descripcion && (
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '6px' }}>
                          🎁 {d.bono_descripcion}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
        opacity: 0, animation: 'vhSlideTop 0.5s ease forwards',
      }}>
        <button onClick={onVolver} style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '20px', padding: '7px 14px',
          color: 'var(--color-text-secondary)', fontSize: '12px',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>← Volver</button>

        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '20px', padding: '3px', gap: '2px',
        }}>
          <button type="button" onClick={() => setTema('oscuro')} style={{
            background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
            border: 'none', borderRadius: '16px', padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
          }}>
            <span style={{ fontSize: '11px' }}>🌙</span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
          </button>
          <button type="button" onClick={() => setTema('tropical')} style={{
            background: tema === 'tropical' ? 'var(--gradient-toggle-active)' : 'transparent',
            border: 'none', borderRadius: '16px', padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
          }}>
            <span style={{ fontSize: '11px' }}>☀️</span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
          </button>
        </div>
      </div>

      {/* TÍTULO */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--color-modulo-bg)',
        border: '1px solid var(--color-modulo-border)',
        borderLeft: '4px solid #7F77DD',
        borderRadius: '14px', padding: '20px',
        marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '16px',
        boxShadow: 'var(--modulo-sombra)',
        opacity: 0, animation: 'vhFadeUp 0.5s ease 0.1s forwards',
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'rgba(127, 119, 221, 0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px',
        }}>📜</div>
        <div>
          <div style={{ fontSize: '10px', color: '#7F77DD', letterSpacing: '1.5px', fontWeight: 600 }}>
            HISTORIAL DE PAGOS
          </div>
          <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
            Historial de Nómina
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Todos los pagos procesados ordenados del más reciente
          </div>
        </div>
      </div>

      {/* RESUMEN AÑO */}
      <div style={{
        position: 'relative', zIndex: 1, marginBottom: '20px',
        opacity: 0, animation: 'vhFadeUp 0.5s ease 0.15s forwards',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div style={sectionTitle}>📊 RESUMEN AÑO {añoSeleccionado}</div>
          <select value={añoSeleccionado} onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '10px', padding: '7px 12px',
              color: 'var(--color-text-primary)',
              fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer',
            }}>
            {añosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          <KpiResumen label="TOTAL PAGADO" valor={`RD$ ${formatearMoneda(totalAño)}`} sub="neto a empleados" color="#1D9E75" />
          <KpiResumen label="COSTO TOTAL" valor={`RD$ ${formatearMoneda(totalBrutoAño)}`} sub="incluye aportes" color="#378ADD" />
          <KpiResumen label="PAGOS" valor={pagos.length} sub="períodos procesados" color="#7F77DD" />
          <KpiResumen label="PROMEDIO" valor={`RD$ ${formatearMoneda(promedioPago)}`} sub="por pago" color="#EF9F27" />
        </div>
      </div>

      {/* LISTA DE PAGOS */}
      <div style={{
        position: 'relative', zIndex: 1, marginBottom: '20px',
        opacity: 0, animation: 'vhFadeUp 0.5s ease 0.2s forwards',
      }}>
        <div style={sectionTitle}>🗓️ PAGOS DE {añoSeleccionado}</div>

        {cargando ? (
          <div style={{ ...panel, textAlign: 'center', color: 'var(--color-text-muted)' }}>⏳ Cargando pagos...</div>
        ) : pagos.length === 0 ? (
          <div style={{ ...panel, textAlign: 'center' }}>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📭</div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
              No hay pagos registrados en {añoSeleccionado}
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              Los pagos aparecerán aquí cuando proceses una quincena.
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {pagos.map(pago => (
              <div key={pago.id}
                onClick={() => abrirDetalle(pago)}
                style={{
                  background: 'var(--color-modulo-bg)',
                  border: '1px solid var(--color-modulo-border)',
                  borderLeft: '4px solid #1D9E75',
                  borderRadius: '12px', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '12px', flexWrap: 'wrap', cursor: 'pointer',
                  boxShadow: 'var(--modulo-sombra)',
                  transition: 'all 0.15s ease',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-1px)' }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'none' }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '200px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '10px',
                    background: 'rgba(29, 158, 117, 0.18)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px',
                  }}>✅</div>
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{labelPeriodo(pago)}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Pagado el {formatearFecha(pago.fecha_pago)} · {pago.cantidad_empleados} empleado(s)
                      {parseFloat(pago.total_bonos) > 0 && ` · 🎁 RD$ ${formatearMoneda(pago.total_bonos)} en bonos`}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Total pagado</div>
                    <div style={{ fontSize: '16px', fontWeight: 600, color: '#1D9E75' }}>RD$ {formatearMoneda(pago.total_neto)}</div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); abrirDetalle(pago) }}
                    style={{
                      padding: '7px 12px',
                      background: 'rgba(127, 119, 221, 0.18)',
                      border: '1px solid rgba(127, 119, 221, 0.4)',
                      borderRadius: '8px',
                      color: '#7F77DD', fontSize: '11px', fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}
                  >👁️ Ver detalle</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function KpiResumen({ label, valor, sub, color }) {
  return (
    <div style={{
      background: 'var(--color-modulo-bg)',
      border: '1px solid var(--color-modulo-border)',
      borderLeft: `4px solid ${color}`,
      borderRadius: '12px', padding: '14px',
      boxShadow: 'var(--modulo-sombra)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '17px', fontWeight: 600, color: color, marginTop: '6px' }}>{valor}</div>
      {sub && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

function KpiMini({ label, valor, color, formatear }) {
  return (
    <div style={{
      background: 'var(--color-bg-input)',
      border: '1px solid var(--color-border-subtle)',
      borderLeft: `4px solid ${color}`,
      borderRadius: '10px', padding: '10px 12px',
    }}>
      <div style={{ fontSize: '9px', color: color, letterSpacing: '0.5px', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '4px' }}>
        RD$ {formatear(valor)}
      </div>
    </div>
  )
}

export default VistaHistorialNomina