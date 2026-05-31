import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function VistaRegaliaPascual({ empresaId, usuarioActual, onVolver }) {
  const [empresa, setEmpresa] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [pagosAñoActual, setPagosAñoActual] = useState([])
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear())
  const [añosDisponibles, setAñosDisponibles] = useState([])
  const [cargando, setCargando] = useState(true)
  const [mensajeExito, setMensajeExito] = useState('')
  const [modalConfirmar, setModalConfirmar] = useState(false)
  const [procesando, setProcesando] = useState(false)

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId, añoSeleccionado])

  async function cargarDatos() {
    setCargando(true)

    const { data: empresaData } = await supabase
      .from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)

    const { data: empleadosData } = await supabase
      .from('usuarios').select('*')
      .eq('empresa_id', empresaId).eq('activo', true)
      .neq('rol', 'propietario').not('sueldo', 'is', null)
      .order('nombre')
    setEmpleados(empleadosData || [])

    const { data: pagosData } = await supabase
      .from('pagos_nomina').select('*, pagos_nomina_detalle(*)')
      .eq('empresa_id', empresaId).eq('año', añoSeleccionado).eq('estado', 'pagado')
    setPagosAñoActual(pagosData || [])

    const { data: bonosData } = await supabase
      .from('bonificaciones_extra').select('año')
      .eq('empresa_id', empresaId).eq('tipo', 'navideño')

    const años = [...new Set((bonosData || []).map(b => b.año))]
    años.push(new Date().getFullYear())
    setAñosDisponibles([...new Set(años)].sort((a, b) => b - a))

    setCargando(false)
  }

  function mostrarExito(msg) {
    setMensajeExito(msg)
    setTimeout(() => setMensajeExito(''), 4000)
  }

  function salarioMensualEmpleado(emp) {
    const sueldo = parseFloat(emp.sueldo || 0)
    const freq = emp.frecuencia_pago
    if (freq === 'mes') return sueldo
    if (freq === 'quincena') return sueldo * 2
    if (freq === 'semana') return sueldo * 4.33
    if (freq === 'dia') return sueldo * 22
    return sueldo
  }

  function calcularRegaliaEmpleado(emp) {
    const detallesEmpleado = pagosAñoActual.flatMap(p =>
      (p.pagos_nomina_detalle || []).filter(d => d.usuario_id === emp.id)
    )

    if (detallesEmpleado.length === 0) {
      const salarioMensual = salarioMensualEmpleado(emp)
      const fechaIngreso = emp.fecha_ingreso ? new Date(emp.fecha_ingreso) : new Date(añoSeleccionado, 0, 1)
      const inicioAño = new Date(añoSeleccionado, 0, 1)
      const finAño = new Date(añoSeleccionado, 11, 31)
      const inicioConteo = fechaIngreso > inicioAño ? fechaIngreso : inicioAño
      const mesesTrabajados = Math.min(12, Math.max(0, ((finAño - inicioConteo) / (1000 * 60 * 60 * 24 * 30.44))))
      const salariosAcumulados = salarioMensual * mesesTrabajados
      const regalia = salariosAcumulados / 12

      return {
        salariosAcumulados, regalia,
        mesesTrabajados: Math.round(mesesTrabajados * 10) / 10,
        elegible: mesesTrabajados >= 3,
        fuente: 'proyeccion',
      }
    }

    const salariosAcumulados = detallesEmpleado.reduce((s, d) => s + parseFloat(d.salario_neto || 0), 0)
    const regalia = salariosAcumulados / 12
    const mesesTrabajados = detallesEmpleado.length * 0.5

    return {
      salariosAcumulados, regalia, mesesTrabajados,
      elegible: mesesTrabajados >= 3,
      fuente: 'real',
    }
  }

  async function procesarRegalia() {
    setProcesando(true)
    try {
      const { data: bonosExistentes } = await supabase
        .from('bonificaciones_extra').select('id')
        .eq('empresa_id', empresaId).eq('año', añoSeleccionado).eq('tipo', 'navideño')

      if (bonosExistentes && bonosExistentes.length > 0) {
        throw new Error('Ya se procesó la regalía pascual del año ' + añoSeleccionado)
      }

      const detalleEmpleados = empleados.map(emp => {
        const calc = calcularRegaliaEmpleado(emp)
        return {
          usuario_id: emp.id, nombre: emp.nombre, rol: emp.rol,
          monto: Math.round(calc.regalia * 100) / 100,
          meses_trabajados: calc.mesesTrabajados,
          salarios_acumulados: calc.salariosAcumulados,
          elegible: calc.elegible,
        }
      }).filter(d => d.elegible && d.monto > 0)

      if (detalleEmpleados.length === 0) throw new Error('No hay empleados elegibles para regalía pascual')

      const totalCalc = detalleEmpleados.reduce((s, d) => s + parseFloat(d.monto), 0)

      const nuevoPago = {
        empresa_id: empresaId,
        titulo: `Regalía Pascual ${añoSeleccionado}`,
        descripcion: `Salario 13 obligatorio por ley (Art. 219 Código Laboral RD)`,
        tipo: 'navideño',
        fecha_pago: new Date().toISOString().split('T')[0],
        año: añoSeleccionado,
        estado: 'pagado',
        fecha_pagado: new Date().toISOString(),
        monto_total: totalCalc,
        cantidad_empleados: detalleEmpleados.length,
        detalle: detalleEmpleados,
        creado_por_usuario_id: usuarioActual?.id || null,
        notas: 'Regalía pascual calculada automáticamente según ley dominicana',
      }

      const { error } = await supabase.from('bonificaciones_extra').insert([nuevoPago])
      if (error) throw new Error(error.message)

      setProcesando(false)
      setModalConfirmar(false)
      mostrarExito('✅ Regalía pascual procesada correctamente')
      cargarDatos()
    } catch (e) {
      alert('❌ Error: ' + e.message)
      setProcesando(false)
    }
  }

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function diasHastaFechaLimite() {
    const hoy = new Date()
    const limite = new Date(añoSeleccionado, 11, 20)
    return Math.ceil((limite - hoy) / (1000 * 60 * 60 * 24))
  }

  const calculosPorEmpleado = empleados.map(emp => ({
    empleado: emp,
    ...calcularRegaliaEmpleado(emp),
  }))

  const totalRegalia = calculosPorEmpleado.filter(c => c.elegible).reduce((s, c) => s + c.regalia, 0)
  const empleadosElegibles = calculosPorEmpleado.filter(c => c.elegible).length
  const empleadosNoElegibles = calculosPorEmpleado.filter(c => !c.elegible).length

  const diasFaltantes = diasHastaFechaLimite()
  const yaPasoFecha = diasFaltantes < 0
  const enPeriodoCritico = diasFaltantes <= 30 && diasFaltantes >= 0
  const fuentePrincipal = calculosPorEmpleado.length > 0
    ? (calculosPorEmpleado[0].fuente === 'real' ? 'real' : 'proyeccion')
    : 'proyeccion'

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

  if (cargando) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando regalía pascual...</p>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg-primary)',
      position: 'relative', padding: '20px', color: 'var(--color-text-primary)',
    }}>
      <style>{`
        @keyframes vrSlideTop { 0% { opacity: 0; transform: translateY(-18px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes vrFadeUp { 0% { opacity: 0; transform: translateY(22px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* TOAST DE ÉXITO */}
      {mensajeExito && (
        <div style={{
          position: 'fixed', top: '20px', right: '20px', zIndex: 110,
          background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
          color: 'white', padding: '12px 18px', borderRadius: '12px',
          fontSize: '13px', fontWeight: 500,
          boxShadow: '0 8px 24px rgba(29, 158, 117, 0.4)',
        }}>{mensajeExito}</div>
      )}

      {/* MODAL CONFIRMAR */}
      {modalConfirmar && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'var(--color-bg-elevated)',
            border: '0.5px solid var(--color-border-accent)',
            borderRadius: '16px', maxWidth: '420px', width: '100%',
            overflow: 'hidden',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #D85A30 0%, #993C1D 100%)',
              padding: '24px', textAlign: 'center', color: 'white',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '6px' }}>🎄</div>
              <div style={{ fontSize: '18px', fontWeight: 600 }}>¿Procesar regalía pascual?</div>
              <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>
                Regalía Pascual {añoSeleccionado} para {empleadosElegibles} empleado(s)
              </div>
            </div>
            <div style={{ padding: '20px' }}>
              <div style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '10px', padding: '14px',
                textAlign: 'center', marginBottom: '14px',
              }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.5px' }}>TOTAL A PAGAR</div>
                <div style={{ fontSize: '26px', fontWeight: 600, color: '#D85A30', marginTop: '4px' }}>
                  RD$ {formatearMoneda(totalRegalia)}
                </div>
              </div>

              <div style={{
                background: 'rgba(239, 159, 39, 0.12)',
                border: '1px solid rgba(239, 159, 39, 0.35)',
                borderRadius: '10px', padding: '10px 12px',
                fontSize: '11px', color: 'var(--color-text-secondary)', marginBottom: '14px',
              }}>
                ⚠️ Asegúrate de tener el efectivo disponible.<br />
                Esta acción quedará registrada como bonificación tipo "navideño" en el historial.
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setModalConfirmar(false)} disabled={procesando} style={{
                  flex: 1, padding: '12px',
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px', fontWeight: 500,
                  cursor: procesando ? 'not-allowed' : 'pointer',
                  opacity: procesando ? 0.6 : 1, fontFamily: 'inherit',
                }}>Cancelar</button>
                <button onClick={procesarRegalia} disabled={procesando} style={{
                  flex: 1, padding: '12px',
                  background: 'linear-gradient(135deg, #D85A30 0%, #993C1D 100%)',
                  border: 'none', borderRadius: '10px',
                  color: 'white', fontSize: '13px', fontWeight: 600,
                  cursor: procesando ? 'not-allowed' : 'pointer',
                  opacity: procesando ? 0.6 : 1, fontFamily: 'inherit',
                }}>{procesando ? '⏳ Procesando...' : '✓ Confirmar'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
        opacity: 0, animation: 'vrSlideTop 0.5s ease forwards',
      }}>
        <button onClick={onVolver} style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '20px', padding: '7px 14px',
          color: 'var(--color-text-secondary)', fontSize: '12px',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>← Volver</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <select value={añoSeleccionado} onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
            style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '20px', padding: '7px 12px',
              color: 'var(--color-text-primary)',
              fontSize: '12px', fontFamily: 'inherit', cursor: 'pointer',
            }}>
            {añosDisponibles.map(a => <option key={a} value={a}>{a}</option>)}
          </select>

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
      </div>

      {/* TÍTULO */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--color-modulo-bg)',
        border: '1px solid var(--color-modulo-border)',
        borderLeft: '4px solid #D85A30',
        borderRadius: '14px', padding: '20px',
        marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '16px',
        boxShadow: 'var(--modulo-sombra)',
        opacity: 0, animation: 'vrFadeUp 0.5s ease 0.1s forwards',
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'rgba(216, 90, 48, 0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px',
        }}>🎄</div>
        <div>
          <div style={{ fontSize: '10px', color: '#D85A30', letterSpacing: '1.5px', fontWeight: 600 }}>
            SALARIO 13 OBLIGATORIO
          </div>
          <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
            Regalía Pascual {añoSeleccionado}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Pago obligatorio antes del 20 de diciembre
          </div>
        </div>
      </div>

      {/* ALERTA TEMPORAL */}
      {!yaPasoFecha && enPeriodoCritico && (
        <div style={{
          position: 'relative', zIndex: 1, marginBottom: '16px',
          background: 'rgba(239, 159, 39, 0.15)',
          border: '1px solid rgba(239, 159, 39, 0.45)',
          borderLeft: '4px solid #EF9F27',
          borderRadius: '12px', padding: '14px 16px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          opacity: 0, animation: 'vrFadeUp 0.5s ease 0.15s forwards',
        }}>
          <span style={{ fontSize: '24px' }}>⚠️</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              ¡Periodo crítico! Faltan {diasFaltantes} días para la fecha límite
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              La regalía debe pagarse antes del 20 de diciembre. Considera procesar el pago pronto para evitar sanciones.
            </div>
          </div>
        </div>
      )}

      {yaPasoFecha && (
        <div style={{
          position: 'relative', zIndex: 1, marginBottom: '16px',
          background: 'rgba(244, 67, 54, 0.15)',
          border: '1px solid rgba(244, 67, 54, 0.45)',
          borderLeft: '4px solid #E24B4A',
          borderRadius: '12px', padding: '14px 16px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          opacity: 0, animation: 'vrFadeUp 0.5s ease 0.15s forwards',
        }}>
          <span style={{ fontSize: '24px' }}>🚨</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              Fecha límite vencida hace {Math.abs(diasFaltantes)} días
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              La fecha límite era el 20 de diciembre de {añoSeleccionado}. Si aún no la has pagado, hazlo lo antes posible.
            </div>
          </div>
        </div>
      )}

      {/* PROYECCIÓN */}
      <div style={{
        position: 'relative', zIndex: 1, marginBottom: '20px',
        opacity: 0, animation: 'vrFadeUp 0.5s ease 0.2s forwards',
      }}>
        <div style={sectionTitle}>📊 PROYECCIÓN AL 20 DE DICIEMBRE {añoSeleccionado}</div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px', marginBottom: '12px' }}>
          <KpiCard label="TOTAL ESTIMADO" valor={`RD$ ${formatearMoneda(totalRegalia)}`} sub="a pagar en diciembre" color="#D85A30" />
          <KpiCard label="EMPLEADOS" valor={empleadosElegibles} sub={`elegibles${empleadosNoElegibles > 0 ? ` (${empleadosNoElegibles} no aún)` : ''}`} color="#1D9E75" />
          <KpiCard
            label="DÍAS RESTANTES"
            valor={yaPasoFecha ? `−${Math.abs(diasFaltantes)}` : diasFaltantes}
            sub={yaPasoFecha ? 'fecha vencida' : 'hasta 20 dic'}
            color={yaPasoFecha ? '#E24B4A' : enPeriodoCritico ? '#EF9F27' : '#378ADD'}
          />
          <KpiCard
            label="PROMEDIO"
            valor={`RD$ ${formatearMoneda(empleadosElegibles > 0 ? totalRegalia / empleadosElegibles : 0)}`}
            sub="por empleado"
            color="#7F77DD"
          />
        </div>

        <div style={{
          background: fuentePrincipal === 'real' ? 'rgba(29, 158, 117, 0.15)' : 'rgba(239, 159, 39, 0.15)',
          border: fuentePrincipal === 'real' ? '1px solid rgba(29, 158, 117, 0.35)' : '1px solid rgba(239, 159, 39, 0.35)',
          borderRadius: '10px', padding: '10px 14px',
          fontSize: '12px',
          color: fuentePrincipal === 'real' ? '#1D9E75' : '#EF9F27',
        }}>
          {fuentePrincipal === 'real'
            ? '✅ Cálculo basado en pagos reales registrados en el sistema'
            : '⚠️ Cálculo basado en proyección de salarios actuales. El valor final puede variar según los pagos reales del año.'}
        </div>
      </div>

      {/* DETALLE POR EMPLEADO */}
      <div style={{
        position: 'relative', zIndex: 1, marginBottom: '20px',
        opacity: 0, animation: 'vrFadeUp 0.5s ease 0.25s forwards',
      }}>
        <div style={sectionTitle}>👥 EMPLEADOS Y SU REGALÍA ESTIMADA</div>

        {calculosPorEmpleado.length === 0 ? (
          <div style={{ ...panel, textAlign: 'center', color: 'var(--color-text-muted)' }}>
            No hay empleados activos con sueldo configurado
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {calculosPorEmpleado.map(c => (
              <div key={c.empleado.id} style={{
                background: 'var(--color-modulo-bg)',
                border: '1px solid var(--color-modulo-border)',
                borderLeft: c.elegible ? '4px solid #D85A30' : '4px solid #EF9F27',
                borderRadius: '12px', padding: '14px 16px',
                boxShadow: 'var(--modulo-sombra)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap', marginBottom: '10px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '44px', height: '44px', borderRadius: '12px',
                      background: c.elegible ? 'rgba(216, 90, 48, 0.18)' : 'rgba(239, 159, 39, 0.18)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px',
                    }}>
                      {c.empleado.sexo === 'hombre' ? '👨' : c.empleado.sexo === 'mujer' ? '👩' : '👤'}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{c.empleado.nombre}</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{c.empleado.rol?.replace('_', ' ')}</div>
                    </div>
                  </div>

                  {c.elegible ? (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Regalía estimada</div>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: '#D85A30' }}>RD$ {formatearMoneda(c.regalia)}</div>
                    </div>
                  ) : (
                    <div style={{
                      padding: '5px 12px',
                      background: 'rgba(239, 159, 39, 0.18)',
                      border: '1px solid rgba(239, 159, 39, 0.4)',
                      borderRadius: '14px',
                      fontSize: '11px', fontWeight: 600, color: '#EF9F27',
                    }}>
                      ⚠️ No elegible aún ({c.mesesTrabajados.toFixed(1)} meses)
                    </div>
                  )}
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '8px', fontSize: '11px', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Salario mensual</div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>RD$ {formatearMoneda(salarioMensualEmpleado(c.empleado))}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Salarios año</div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>RD$ {formatearMoneda(c.salariosAcumulados)}</div>
                  </div>
                  <div>
                    <div style={{ color: 'var(--color-text-muted)' }}>Meses trabajados</div>
                    <div style={{ fontWeight: 500, color: 'var(--color-text-primary)' }}>{c.mesesTrabajados.toFixed(1)} meses</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INFORMACIÓN LEGAL */}
      <div style={{
        position: 'relative', zIndex: 1, marginBottom: '20px',
        background: 'rgba(55, 138, 221, 0.12)',
        border: '1px solid rgba(55, 138, 221, 0.35)',
        borderLeft: '4px solid #378ADD',
        borderRadius: '14px', padding: '20px',
        opacity: 0, animation: 'vrFadeUp 0.5s ease 0.3s forwards',
      }}>
        <div style={{ fontSize: '11px', color: '#378ADD', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '12px' }}>
          📚 ¿QUÉ DICE LA LEY?
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          <div>⚖️ <strong style={{ color: 'var(--color-text-primary)' }}>Art. 219 Código de Trabajo RD:</strong> La Regalía Pascual (Salario 13) es OBLIGATORIA.</div>
          <div>📅 <strong style={{ color: 'var(--color-text-primary)' }}>Plazo:</strong> Debe pagarse antes del 20 de diciembre.</div>
          <div>🧮 <strong style={{ color: 'var(--color-text-primary)' }}>Fórmula:</strong> Suma de salarios ordinarios del año / 12.</div>
          <div>⏰ <strong style={{ color: 'var(--color-text-primary)' }}>Tiempo mínimo:</strong> Empleados con menos de 3 meses reciben proporcional. Si tiene 3 meses o más, recibe completo.</div>
          <div>💰 <strong style={{ color: 'var(--color-text-primary)' }}>Tope máximo:</strong> No puede exceder 5 salarios mínimos del sector.</div>
          <div>❌ <strong style={{ color: 'var(--color-text-primary)' }}>NO incluye:</strong> Bonificaciones extras, horas extra, comisiones. Solo salarios ordinarios.</div>
        </div>
      </div>

      {/* BOTÓN PROCESAR */}
      {empleadosElegibles > 0 && (
        <div style={{
          position: 'relative', zIndex: 1, marginBottom: '20px',
          background: 'linear-gradient(135deg, #D85A30 0%, #993C1D 100%)',
          borderRadius: '14px', padding: '20px',
          color: 'white', textAlign: 'center',
          opacity: 0, animation: 'vrFadeUp 0.5s ease 0.35s forwards',
        }}>
          <div style={{ fontSize: '10px', opacity: 0.9, letterSpacing: '1.5px', fontWeight: 600, marginBottom: '6px' }}>
            ¿LISTO PARA PROCESAR?
          </div>
          <div style={{ fontSize: '17px', fontWeight: 500, marginBottom: '10px' }}>
            🎄 Pagar regalía a {empleadosElegibles} empleado(s)
          </div>
          <div style={{ fontSize: '26px', fontWeight: 600, marginBottom: '14px' }}>
            RD$ {formatearMoneda(totalRegalia)}
          </div>
          <button onClick={() => setModalConfirmar(true)} style={{
            background: 'white', color: '#993C1D',
            border: 'none', borderRadius: '10px',
            padding: '12px 28px',
            fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
          }}>💰 Procesar pago de regalía</button>
          <div style={{ fontSize: '10px', opacity: 0.85, marginTop: '10px' }}>
            Quedará registrado en Bonificaciones como tipo "navideño"
          </div>
        </div>
      )}
    </div>
  )
}

function KpiCard({ label, valor, sub, color }) {
  return (
    <div style={{
      background: 'var(--color-modulo-bg)',
      border: '1px solid var(--color-modulo-border)',
      borderLeft: `4px solid ${color}`,
      borderRadius: '12px', padding: '14px',
      boxShadow: 'var(--modulo-sombra)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.5px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 600, color: color, marginTop: '6px' }}>{valor}</div>
      {sub && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sub}</div>}
    </div>
  )
}

export default VistaRegaliaPascual