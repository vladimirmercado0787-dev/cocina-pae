import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { crearGastosDesdeNomina } from '../../utils/gastosAutomaticos'

function ModalPagarQuincena({ empresaId, usuarioActual, periodoPagar, onCerrar, onPagado }) {
  const [empleados, setEmpleados] = useState([])
  const [detallePagos, setDetallePagos] = useState([])
  const [ajustes, setAjustes] = useState({})
  const [bonosExtra, setBonosExtra] = useState({})
  const [notas, setNotas] = useState('')
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [confirmar, setConfirmar] = useState(false)

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .neq('rol', 'propietario')
      .not('sueldo', 'is', null)
      .order('nombre')

    const emps = data || []
    setEmpleados(emps)

    const detalles = emps.map(emp => {
      const salarioNeto = calcularSalarioNetoPeriodo(emp)
      const salarioBruto = salarioNeto / 0.9426
      const aporteTSS = salarioBruto - salarioNeto
      return {
        usuario_id: emp.id,
        nombre: emp.nombre,
        rol: emp.rol,
        frecuencia: emp.frecuencia_pago,
        salario_neto: salarioNeto,
        salario_bruto: salarioBruto,
        aporte_tss_afp: aporteTSS,
      }
    })
    setDetallePagos(detalles)
    setCargando(false)
  }

  function calcularSalarioNetoPeriodo(emp) {
    const sueldo = parseFloat(emp.sueldo || 0)
    const freq = emp.frecuencia_pago
    if (!periodoPagar) return sueldo

    if (periodoPagar.tipo === 'quincenal_1' || periodoPagar.tipo === 'quincenal_2') {
      if (freq === 'mes') return sueldo / 2
      if (freq === 'quincena') return sueldo
      if (freq === 'semana') return sueldo * 2
      if (freq === 'dia') return sueldo * 11
      return sueldo / 2
    }
    if (periodoPagar.tipo === 'mensual') {
      if (freq === 'mes') return sueldo
      if (freq === 'quincena') return sueldo * 2
      if (freq === 'semana') return sueldo * 4.33
      if (freq === 'dia') return sueldo * 22
      return sueldo
    }
    return sueldo
  }

  function ajusteEmpleado(id) {
    const a = ajustes[id] || {}
    return {
      positivo: parseFloat(a.positivo || 0),
      negativo: parseFloat(a.negativo || 0),
      razon: a.razon || '',
    }
  }

  function bonoEmpleado(id) {
    const b = bonosExtra[id] || {}
    return {
      monto: parseFloat(b.monto || 0),
      descripcion: b.descripcion || '',
    }
  }

  function totalEmpleado(d) {
    const aj = ajusteEmpleado(d.usuario_id)
    const bono = bonoEmpleado(d.usuario_id)
    return d.salario_neto + aj.positivo - aj.negativo + bono.monto
  }

  const totales = detallePagos.reduce((acc, d) => {
    const aj = ajusteEmpleado(d.usuario_id)
    const bono = bonoEmpleado(d.usuario_id)
    acc.neto += d.salario_neto + aj.positivo - aj.negativo + bono.monto
    acc.bruto += d.salario_bruto + aj.positivo - aj.negativo + bono.monto
    acc.aportes += d.aporte_tss_afp
    acc.bonos += bono.monto
    return acc
  }, { neto: 0, bruto: 0, aportes: 0, bonos: 0 })

  async function procesarPago() {
    setError('')
    setProcesando(true)
    try {
      const nuevoPago = {
        empresa_id: empresaId,
        año: periodoPagar.año,
        mes: periodoPagar.mes,
        semana: periodoPagar.semana || null,
        tipo_periodo: periodoPagar.tipo,
        fecha_inicio: periodoPagar.fechaInicio,
        fecha_fin: periodoPagar.fechaFin,
        fecha_pago: new Date().toISOString().split('T')[0],
        cantidad_empleados: detallePagos.length,
        total_neto: totales.neto,
        total_bruto: totales.bruto,
        total_aportes: totales.aportes,
        total_bonos: totales.bonos,
        estado: 'pagado',
        notas: notas.trim() || null,
        creado_por_usuario_id: usuarioActual?.id || null,
      }

      const { data: pagoCreado, error: errPago } = await supabase
        .from('pagos_nomina').insert([nuevoPago]).select().single()
      if (errPago) throw new Error(errPago.message)

      const detallesInsert = detallePagos.map(d => {
        const aj = ajusteEmpleado(d.usuario_id)
        const bono = bonoEmpleado(d.usuario_id)
        return {
          pago_nomina_id: pagoCreado.id,
          empresa_id: empresaId,
          usuario_id: d.usuario_id,
          empleado_nombre: d.nombre,
          empleado_rol: d.rol,
          salario_neto: d.salario_neto,
          salario_bruto: d.salario_bruto,
          aporte_tss_afp: d.aporte_tss_afp,
          ajuste_positivo: aj.positivo,
          ajuste_negativo: aj.negativo,
          ajuste_razon: aj.razon || null,
          bono_extra: bono.monto,
          bono_descripcion: bono.descripcion || null,
          total_pagado: totalEmpleado(d),
        }
      })

      const { error: errDet } = await supabase
        .from('pagos_nomina_detalle').insert(detallesInsert)
      if (errDet) {
        // Si el detalle falla, revertimos el pago para no dejar un registro
        // huérfano que bloquee reintentar. Best-effort: si el borrado falla, seguimos.
        await supabase.from('pagos_nomina').delete().eq('id', pagoCreado.id)
        throw new Error(errDet.message)
      }

      // El gasto automático es SECUNDARIO: el pago ya está hecho.
      // Lo aislamos en su propio try/catch para que NUNCA congele ni
      // impida que el modal se cierre y la pantalla se refresque.
      try {
        const resGasto = await crearGastosDesdeNomina?.({
          empresaId,
          pagoNominaId: pagoCreado.id,
          periodo: periodoPagar,
          totalNeto: totales.neto,
          totalAportes: totales.aportes,
          totalBonos: totales.bonos,
          registradoPor: usuarioActual?.id,
          registradoPorNombre: usuarioActual?.nombre || 'Sistema',
        })
        if (resGasto && !resGasto.success) console.warn('Pago OK pero falló gasto automático:', resGasto.error)
      } catch (gastoErr) {
        console.warn('Pago OK pero el gasto automático lanzó error:', gastoErr?.message)
      }

      // Éxito: cerrar la confirmación, avisar al padre (refresca) y cerrar el modal.
      setProcesando(false)
      setConfirmar(false)
      if (onPagado) onPagado(pagoCreado)
      onCerrar()
    } catch (e) {
      // Falla real: cerramos la ventana de confirmación para que el error
      // quede VISIBLE y nunca se sienta como "no pasó nada".
      setError(e.message || 'No se pudo procesar el pago.')
      setProcesando(false)
      setConfirmar(false)
    }
  }

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function labelPeriodo() {
    if (!periodoPagar) return ''
    const meses = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre']
    if (periodoPagar.tipo === 'quincenal_1') return `1ra quincena de ${meses[periodoPagar.mes - 1]} ${periodoPagar.año}`
    if (periodoPagar.tipo === 'quincenal_2') return `2da quincena de ${meses[periodoPagar.mes - 1]} ${periodoPagar.año}`
    if (periodoPagar.tipo === 'mensual') return `${meses[periodoPagar.mes - 1]} ${periodoPagar.año}`
    if (periodoPagar.tipo === 'semanal') return `Semana ${periodoPagar.semana} de ${meses[periodoPagar.mes - 1]} ${periodoPagar.año}`
    return ''
  }

  // ─── ESTILOS ───
  const input = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px', padding: '7px 10px',
    color: 'var(--color-text-primary)',
    fontSize: '12px', fontFamily: 'inherit', outline: 'none',
  }
  const labelStyle = {
    display: 'block', fontSize: '10px', fontWeight: 500,
    color: 'var(--color-text-muted)', marginBottom: '4px',
    letterSpacing: '0.5px', textTransform: 'uppercase',
  }
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
    <>
    {/* ─── MODAL PRINCIPAL (largo, con scroll) ─── */}
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px', overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-accent)',
        borderRadius: '16px',
        maxWidth: '880px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* HEADER del modal */}
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
            }}>💵</div>
            <div>
              <div style={{ fontSize: '10px', color: '#1D9E75', letterSpacing: '1.5px', fontWeight: 600 }}>
                PROCESAR PAGO
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                {labelPeriodo()}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
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
            <button onClick={onCerrar} disabled={procesando} style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '20px', padding: '7px 14px',
              color: 'var(--color-text-secondary)', fontSize: '12px',
              cursor: procesando ? 'not-allowed' : 'pointer',
              opacity: procesando ? 0.6 : 1, fontFamily: 'inherit',
            }}>✖ Cerrar</button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: '20px 24px' }}>
          {cargando ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>⏳ Cargando empleados...</div>
          ) : (
            <>
              {/* RESUMEN TOTALES */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(29, 158, 117, 0.18) 0%, rgba(15, 110, 86, 0.08) 100%)',
                border: '1px solid rgba(29, 158, 117, 0.4)',
                borderLeft: '4px solid #1D9E75',
                borderRadius: '14px', padding: '16px 20px', marginBottom: '16px',
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '14px',
              }}>
                <ResumenItem label="TOTAL NETO" valor={totales.neto} color="#1D9E75" sub={`${detallePagos.length} empleados`} formatear={formatearMoneda} grande />
                <ResumenItem label="TOTAL BRUTO" valor={totales.bruto} color="#378ADD" sub="incluye aportes" formatear={formatearMoneda} />
                <ResumenItem label="APORTES" valor={totales.aportes} color="#7F77DD" sub="TSS + AFP" formatear={formatearMoneda} />
                {totales.bonos > 0 && (
                  <ResumenItem label="BONOS EXTRA" valor={totales.bonos} color="#EF9F27" sub="adicionales" formatear={formatearMoneda} />
                )}
              </div>

              {/* DETALLE POR EMPLEADO */}
              <div style={{ ...panel, marginBottom: '16px' }}>
                <div style={sectionTitle}>👥 DETALLE POR EMPLEADO ({detallePagos.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {detallePagos.map(d => {
                    const aj = ajusteEmpleado(d.usuario_id)
                    const bono = bonoEmpleado(d.usuario_id)
                    const total = totalEmpleado(d)
                    return (
                      <div key={d.usuario_id} style={{
                        background: 'var(--color-bg-input)',
                        border: '1px solid var(--color-border-subtle)',
                        borderLeft: '4px solid #1D9E75',
                        borderRadius: '10px', padding: '12px 14px',
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                          <div>
                            <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{d.nombre}</div>
                            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                              {d.rol?.replace('_', ' ')} · Pago {d.frecuencia}
                            </div>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Total a pagar</div>
                            <div style={{ fontSize: '18px', fontWeight: 600, color: '#1D9E75' }}>RD$ {formatearMoneda(total)}</div>
                          </div>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '11px', marginBottom: '10px' }}>
                          <div>
                            <div style={{ color: 'var(--color-text-muted)' }}>Neto base</div>
                            <div style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>RD$ {formatearMoneda(d.salario_neto)}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--color-text-muted)' }}>Bruto</div>
                            <div style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>RD$ {formatearMoneda(d.salario_bruto)}</div>
                          </div>
                          <div>
                            <div style={{ color: 'var(--color-text-muted)' }}>Aporte TSS+AFP</div>
                            <div style={{ color: 'var(--color-text-primary)', fontWeight: 500 }}>RD$ {formatearMoneda(d.aporte_tss_afp)}</div>
                          </div>
                        </div>

                        {/* Ajustes y bono */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
                          <div>
                            <label style={labelStyle}>➕ Ajuste +</label>
                            <input type="number" placeholder="0.00" value={aj.positivo || ''}
                              onChange={(e) => setAjustes({ ...ajustes, [d.usuario_id]: { ...aj, positivo: e.target.value } })}
                              style={input} />
                          </div>
                          <div>
                            <label style={labelStyle}>➖ Ajuste −</label>
                            <input type="number" placeholder="0.00" value={aj.negativo || ''}
                              onChange={(e) => setAjustes({ ...ajustes, [d.usuario_id]: { ...aj, negativo: e.target.value } })}
                              style={input} />
                          </div>
                          <div>
                            <label style={labelStyle}>🎁 Bono extra</label>
                            <input type="number" placeholder="0.00" value={bono.monto || ''}
                              onChange={(e) => setBonosExtra({ ...bonosExtra, [d.usuario_id]: { ...bono, monto: e.target.value } })}
                              style={input} />
                          </div>
                          {(aj.positivo > 0 || aj.negativo > 0) && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={labelStyle}>Razón del ajuste</label>
                              <input type="text" placeholder="Ej: Hora extra, descuento..."
                                value={aj.razon || ''}
                                onChange={(e) => setAjustes({ ...ajustes, [d.usuario_id]: { ...aj, razon: e.target.value } })}
                                style={input} />
                            </div>
                          )}
                          {bono.monto > 0 && (
                            <div style={{ gridColumn: '1 / -1' }}>
                              <label style={labelStyle}>Descripción del bono</label>
                              <input type="text" placeholder="Ej: Bono productividad..."
                                value={bono.descripcion || ''}
                                onChange={(e) => setBonosExtra({ ...bonosExtra, [d.usuario_id]: { ...bono, descripcion: e.target.value } })}
                                style={input} />
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* NOTAS */}
              <div style={{ ...panel, marginBottom: '16px' }}>
                <label style={labelStyle}>📝 Notas del período (opcional)</label>
                <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2}
                  placeholder="Cualquier comentario sobre este pago..."
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '10px', padding: '10px 12px',
                    color: 'var(--color-text-primary)', fontSize: '13px',
                    fontFamily: 'inherit', resize: 'none', outline: 'none',
                  }} />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  borderRadius: '10px', padding: '12px',
                  fontSize: '12px', color: '#F4C0D1', marginBottom: '12px',
                }}>⚠️ {error}</div>
              )}

              {/* BOTONES */}
              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={onCerrar} disabled={procesando} style={{
                  flex: 1, minWidth: '140px', padding: '14px',
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px', fontWeight: 500,
                  cursor: procesando ? 'not-allowed' : 'pointer',
                  opacity: procesando ? 0.6 : 1, fontFamily: 'inherit',
                }}>Cancelar</button>
                <button onClick={() => setConfirmar(true)} disabled={procesando} style={{
                  flex: 2, minWidth: '200px', padding: '14px',
                  background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                  border: 'none', borderRadius: '10px',
                  color: 'white', fontSize: '13px', fontWeight: 600,
                  cursor: procesando ? 'not-allowed' : 'pointer',
                  opacity: procesando ? 0.6 : 1, fontFamily: 'inherit',
                }}>💰 Procesar pago — RD$ {formatearMoneda(totales.neto)}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>

    {/* ─── VENTANA DE CONFIRMACIÓN — fuera del modal largo, fija a la PANTALLA ─── */}
    {confirmar && (
      <div style={{
        position: 'fixed', inset: 0, zIndex: 110,
        background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px', overflowY: 'auto',
      }}>
        <div style={{
          background: 'var(--color-bg-elevated)',
          border: '0.5px solid var(--color-border-accent)',
          borderRadius: '16px', maxWidth: '420px', width: '100%',
          overflow: 'hidden',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
            padding: '24px', textAlign: 'center', color: 'white',
          }}>
            <div style={{ fontSize: '40px', marginBottom: '6px' }}>💰</div>
            <div style={{ fontSize: '18px', fontWeight: 600 }}>¿Confirmar pago?</div>
            <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>{labelPeriodo()}</div>
          </div>
          <div style={{ padding: '20px' }}>
            <div style={{
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '10px', padding: '14px',
              fontSize: '13px', textAlign: 'center', marginBottom: '14px',
            }}>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.5px' }}>TOTAL A PAGAR</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#1D9E75', marginTop: '4px' }}>
                RD$ {formatearMoneda(totales.neto)}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                a {detallePagos.length} empleado(s)
              </div>
            </div>

            <div style={{
              background: 'rgba(239, 159, 39, 0.12)',
              border: '1px solid rgba(239, 159, 39, 0.35)',
              borderRadius: '10px', padding: '10px 12px',
              fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '14px',
            }}>
              <div style={{ fontWeight: 600, color: '#EF9F27', marginBottom: '4px' }}>Al confirmar:</div>
              📝 Se guarda el pago en el histórico de nómina<br />
              💰 Se crea gasto automático en módulo Gastos<br />
              📊 Aparece en reportes y dashboard
            </div>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={() => setConfirmar(false)} disabled={procesando} style={{
                flex: 1, padding: '12px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '10px',
                color: 'var(--color-text-secondary)',
                fontSize: '13px', fontWeight: 500,
                cursor: procesando ? 'not-allowed' : 'pointer',
                opacity: procesando ? 0.6 : 1, fontFamily: 'inherit',
              }}>Cancelar</button>
              <button onClick={procesarPago} disabled={procesando} style={{
                flex: 1, padding: '12px',
                background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 600,
                cursor: procesando ? 'not-allowed' : 'pointer',
                opacity: procesando ? 0.6 : 1, fontFamily: 'inherit',
              }}>{procesando ? '⏳ Procesando...' : '✓ CONFIRMAR'}</button>
            </div>
          </div>
        </div>
      </div>
    )}
    </>
  )
}

function ResumenItem({ label, valor, color, sub, formatear, grande }) {
  return (
    <div>
      <div style={{ fontSize: '10px', color: color, letterSpacing: '0.5px', fontWeight: 600 }}>{label}</div>
      <div style={{ fontSize: grande ? '20px' : '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '4px' }}>
        RD$ {formatear(valor)}
      </div>
      {sub && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{sub}</div>}
    </div>
  )
}

export default ModalPagarQuincena