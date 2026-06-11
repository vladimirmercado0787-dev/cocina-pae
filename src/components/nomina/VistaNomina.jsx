import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalPagarQuincena from './ModalPagarQuincena'
import VistaHistorialNomina from './VistaHistorialNomina'
import VistaBonificaciones from './VistaBonificaciones'
import VistaRegaliaPascual from './VistaRegaliaPascual'
import CalculadoraLiquidacion from './CalculadoraLiquidacion'

const COLOR_PERS = '#D4537E'
const COLOR_PERS_BG = '#ED93B1'
const COLOR_PERS_DARKER = '#72243E'
const COLOR_PERS_CLARO = '#FBEAF0'

function VistaNomina({ usuario, empresaId, onVolver }) {
  const [empresa, setEmpresa] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [pagosMesActual, setPagosMesActual] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false)
  const [verHistorial, setVerHistorial] = useState(false)
  const [verBonificaciones, setVerBonificaciones] = useState(false)
  const [verRegalia, setVerRegalia] = useState(false)
  const [verLiquidacion, setVerLiquidacion] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'

  useEffect(() => { if (empresaId) cargarDatos() }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    const { data: empresaData } = await supabase.from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)
    const { data: empleadosData } = await supabase.from('usuarios').select('*').eq('empresa_id', empresaId).eq('activo', true).neq('rol', 'propietario').not('sueldo', 'is', null).order('nombre')
    setEmpleados(empleadosData || [])
    const ahora = new Date()
    const { data: pagosData } = await supabase.from('pagos_nomina').select('*').eq('empresa_id', empresaId).eq('año', ahora.getFullYear()).eq('mes', ahora.getMonth() + 1).order('fecha_pago', { ascending: false })
    setPagosMesActual(pagosData || [])
    setCargando(false)
  }

  function mostrarExito(msg) { setMensajeExito(msg); setTimeout(() => setMensajeExito(''), 4000) }
  function onPagoExitoso() { setModalPagoAbierto(false); mostrarExito('✅ Pago procesado correctamente'); cargarDatos() }

  function salarioNetoQuincenal(emp) {
    const sueldo = parseFloat(emp.sueldo || 0)
    const f = emp.frecuencia_pago
    if (f === 'mes') return sueldo / 2
    if (f === 'quincena') return sueldo
    if (f === 'semana') return sueldo * 2.165
    if (f === 'dia') return sueldo * 11
    return sueldo
  }

  function calcularBruto(neto, pct) {
    const factor = 1 - (parseFloat(pct || 5.74) / 100)
    if (factor <= 0) return neto
    return Math.round((neto / factor) * 100) / 100
  }

  function calcularProximoPeriodo() {
    if (!empresa) return null
    const hoy = new Date()
    const dia = hoy.getDate()
    const mes = hoy.getMonth() + 1
    const año = hoy.getFullYear()
    const frecuencia = empresa.nomina_frecuencia || 'quincenal'

    if (frecuencia === 'quincenal') {
      const dia1 = empresa.nomina_dia_pago_1 || 15
      const dia2 = empresa.nomina_dia_pago_2 || 30
      if (dia <= dia1) return { tipo_periodo: 'quincenal_1', año, mes, label: `1ra quincena de ${nombreMes(mes)} ${año}`, fecha_inicio: new Date(año, mes - 1, 1), fecha_fin: new Date(año, mes - 1, 15), fecha_pago: new Date(año, mes - 1, dia1) }
      if (dia <= dia2) return { tipo_periodo: 'quincenal_2', año, mes, label: `2da quincena de ${nombreMes(mes)} ${año}`, fecha_inicio: new Date(año, mes - 1, 16), fecha_fin: new Date(año, mes, 0), fecha_pago: new Date(año, mes - 1, dia2) }
      const mesSig = mes === 12 ? 1 : mes + 1
      const añoSig = mes === 12 ? año + 1 : año
      return { tipo_periodo: 'quincenal_1', año: añoSig, mes: mesSig, label: `1ra quincena de ${nombreMes(mesSig)} ${añoSig}`, fecha_inicio: new Date(añoSig, mesSig - 1, 1), fecha_fin: new Date(añoSig, mesSig - 1, 15), fecha_pago: new Date(añoSig, mesSig - 1, dia1) }
    }
    if (frecuencia === 'mensual') {
      const diaP = empresa.nomina_dia_pago_1 || 30
      if (dia <= diaP) return { tipo_periodo: 'mensual', año, mes, label: `${nombreMes(mes)} ${año}`, fecha_inicio: new Date(año, mes - 1, 1), fecha_fin: new Date(año, mes, 0), fecha_pago: new Date(año, mes - 1, diaP) }
      const mesSig = mes === 12 ? 1 : mes + 1
      const añoSig = mes === 12 ? año + 1 : año
      return { tipo_periodo: 'mensual', año: añoSig, mes: mesSig, label: `${nombreMes(mesSig)} ${añoSig}`, fecha_inicio: new Date(añoSig, mesSig - 1, 1), fecha_fin: new Date(añoSig, mesSig, 0), fecha_pago: new Date(añoSig, mesSig - 1, diaP) }
    }
    if (frecuencia === 'semanal') {
      const pv = new Date(hoy)
      const dh = (5 - hoy.getDay() + 7) % 7 || 7
      pv.setDate(hoy.getDate() + dh)
      return { tipo_periodo: 'semanal', año: pv.getFullYear(), mes: pv.getMonth() + 1, label: `Semana del ${pv.getDate()} de ${nombreMes(pv.getMonth() + 1)}`, fecha_inicio: new Date(pv.getTime() - 6 * 86400000), fecha_fin: pv, fecha_pago: pv }
    }
    return null
  }

  function nombreMes(m) {
    return ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'][m - 1] || ''
  }
  function diasFaltantes(fp) { const h = new Date(); h.setHours(0,0,0,0); const p = new Date(fp); p.setHours(0,0,0,0); return Math.ceil((p - h) / 86400000) }
  function formatearFecha(f) { return new Date(f).toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) }
  function formatearMoneda(m) { return Number(m || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }
  function fechaISO(f) { return f ? new Date(f).toISOString().split('T')[0] : null }
  function obtenerAvatar(emp) { if (emp.foto_url) return null; if (emp.sexo === 'hombre') return '👨'; if (emp.sexo === 'mujer') return '👩'; return emp.nombre?.charAt(0)?.toUpperCase() || '?' }

  const proximoPeriodo = empresa ? calcularProximoPeriodo() : null
  const descuentoPct = parseFloat(empresa?.nomina_descuento_porcentaje || 5.74)
  const periodoYaPagado = proximoPeriodo ? pagosMesActual.some(p => p.tipo_periodo === proximoPeriodo.tipo_periodo && p.año === proximoPeriodo.año && p.mes === proximoPeriodo.mes && p.estado === 'pagado') : false
  const totalNetoProximo = empleados.reduce((s, e) => s + salarioNetoQuincenal(e), 0)
  const totalBrutoProximo = empleados.reduce((s, e) => s + calcularBruto(salarioNetoQuincenal(e), descuentoPct), 0)
  const totalAportes = totalBrutoProximo - totalNetoProximo
  const multiplicador = empresa?.nomina_frecuencia === 'quincenal' ? 2 : empresa?.nomina_frecuencia === 'semanal' ? 4.33 : empresa?.nomina_frecuencia === 'mensual' ? 1 : 2
  const totalMensualNeto = totalNetoProximo * multiplicador
  const totalMensualBruto = totalBrutoProximo * multiplicador
  const totalMensualAportes = totalAportes * multiplicador

  if (verHistorial) return <VistaHistorialNomina empresaId={empresaId} onVolver={() => setVerHistorial(false)} />
  if (verBonificaciones) return <VistaBonificaciones empresaId={empresaId} usuarioActual={usuario} onVolver={() => setVerBonificaciones(false)} />
  if (verRegalia) return <VistaRegaliaPascual empresaId={empresaId} usuarioActual={usuario} onVolver={() => setVerRegalia(false)} />
  if (verLiquidacion) return <CalculadoraLiquidacion empresaId={empresaId} usuarioActual={usuario} onVolver={() => setVerLiquidacion(false)} />

  if (cargando) {
    return <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando nómina...</p></div>
  }

  const labelF = empresa?.nomina_frecuencia === 'quincenal' ? 'quincena' : empresa?.nomina_frecuencia === 'semanal' ? 'semana' : empresa?.nomina_frecuencia === 'mensual' ? 'mes' : 'período'

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />

      {mensajeExito && (
        <div style={{ position: 'fixed', top: '20px', right: '20px', background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)', color: 'white', padding: '12px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, zIndex: 100, boxShadow: '0 4px 16px rgba(29, 158, 117, 0.4)' }}>
          {mensajeExito}
        </div>
      )}

      {modalPagoAbierto && proximoPeriodo && (
        <ModalPagarQuincena
          empresaId={empresaId}
          usuarioActual={usuario}
          periodoPagar={{
            tipo: proximoPeriodo.tipo_periodo,
            año: proximoPeriodo.año,
            mes: proximoPeriodo.mes,
            semana: proximoPeriodo.semana || null,
            fechaInicio: fechaISO(proximoPeriodo.fecha_inicio),
            fechaFin: fechaISO(proximoPeriodo.fecha_fin),
          }}
          onCerrar={() => setModalPagoAbierto(false)}
          onPagado={onPagoExitoso}
        />
      )}

      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        <Titulo emoji="💰" titulo="Nómina" subtitulo={`${empresa?.nombre} · ${nombreMes(new Date().getMonth() + 1)} ${new Date().getFullYear()}`} color={COLOR_PERS} colorBg={COLOR_PERS_BG} colorDarker={COLOR_PERS_DARKER} colorClaro={COLOR_PERS_CLARO} esTropical={esTropical} />

        {empleados.length === 0 && (
          <div style={{
            background: esTropical ? '#FAF3E5' : 'rgba(250, 199, 117, 0.08)',
            border: '1px solid rgba(186, 117, 23, 0.3)',
            borderLeft: '4px solid #BA7517',
            borderRadius: '14px', padding: '24px', marginBottom: '20px', textAlign: 'center',
            boxShadow: 'var(--modulo-sombra)',
          }}>
            <div style={{ fontSize: '36px', marginBottom: '8px' }}>⚠️</div>
            <div style={{ fontWeight: 600, color: esTropical ? '#854F0B' : '#FAC775', fontSize: '15px', marginBottom: '6px' }}>
              No hay empleados con sueldo configurado
            </div>
            <div style={{ color: esTropical ? '#633806' : 'var(--color-text-secondary)', fontSize: '12px', marginBottom: '8px' }}>
              Para usar el módulo de nómina, primero registra empleados activos con sueldo y frecuencia.
            </div>
            <div style={{ color: esTropical ? '#633806' : 'var(--color-text-muted)', fontSize: '11px' }}>
              💡 Ve a Empleados → editar empleado → configurar sueldo y frecuencia.
            </div>
          </div>
        )}

        {empleados.length > 0 && (
          <>
            {/* PRÓXIMA QUINCENA */}
            {proximoPeriodo && (
              <div style={{
                background: periodoYaPagado
                  ? 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)'
                  : 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)',
                borderRadius: '18px', padding: '24px', marginBottom: '20px', color: 'white',
                boxShadow: periodoYaPagado ? '0 4px 16px rgba(29, 158, 117, 0.3)' : '0 4px 16px rgba(55, 138, 221, 0.3)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                  <div style={{ flex: 1, minWidth: '280px' }}>
                    <div style={{ fontSize: '10px', opacity: 0.8, letterSpacing: '1.5px', fontWeight: 600, marginBottom: '4px' }}>
                      {periodoYaPagado ? '✅ ÚLTIMO PAGO PROCESADO' : '📅 PRÓXIMA QUINCENA A PAGAR'}
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 600 }}>{proximoPeriodo.label}</div>
                    <div style={{ fontSize: '13px', opacity: 0.9, marginTop: '6px' }}>
                      📆 Fecha de pago: {formatearFecha(proximoPeriodo.fecha_pago)}
                    </div>
                    {!periodoYaPagado && (
                      <div style={{ display: 'inline-block', marginTop: '8px', background: 'rgba(255,255,255,0.2)', padding: '4px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                        ⏰ Faltan {diasFaltantes(proximoPeriodo.fecha_pago)} días
                      </div>
                    )}
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '10px', opacity: 0.8, marginBottom: '4px' }}>TOTAL NETO</div>
                    <div style={{ fontSize: '28px', fontWeight: 600 }}>RD$ {formatearMoneda(totalNetoProximo)}</div>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>Bruto: RD$ {formatearMoneda(totalBrutoProximo)}</div>
                    <div style={{ fontSize: '11px', opacity: 0.9 }}>{empleados.length} empleado{empleados.length > 1 ? 's' : ''}</div>
                  </div>
                </div>
                {!periodoYaPagado && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.2)' }}>
                    <button onClick={() => setModalPagoAbierto(true)}
                      style={{ padding: '12px 24px', background: 'white', border: 'none', borderRadius: '12px', color: '#185FA5', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                      💸 Pagar esta {labelF}
                    </button>
                  </div>
                )}
                {periodoYaPagado && (
                  <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid rgba(255,255,255,0.2)', fontSize: '13px', opacity: 0.9 }}>
                    ✅ Este período ya fue procesado y pagado.
                  </div>
                )}
              </div>
            )}

            {/* RESUMEN MENSUAL */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px' }}>📊</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600 }}>
                  RESUMEN MENSUAL ESTIMADO
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <KpiCard label="TOTAL NETO" valor={`RD$ ${formatearMoneda(totalMensualNeto)}`} sublabel="a empleados" colorBorde="#1D9E75" colorTexto={esTropical ? '#04342C' : '#5DCAA5'} />
                <KpiCard label="TOTAL BRUTO" valor={`RD$ ${formatearMoneda(totalMensualBruto)}`} sublabel="incluye aportes" colorBorde="#378ADD" colorTexto={esTropical ? '#0C447C' : '#85B7EB'} />
                <KpiCard label="APORTES" valor={`RD$ ${formatearMoneda(totalMensualAportes)}`} sublabel={`TSS + AFP (${descuentoPct}%)`} colorBorde="#534AB7" colorTexto={esTropical ? '#3C3489' : '#AFA9EC'} />
                <KpiCard label="EMPLEADOS" valor={empleados.length} sublabel="en nómina activa" colorBorde={COLOR_PERS} colorTexto={esTropical ? COLOR_PERS_DARKER : COLOR_PERS_BG} />
              </div>
            </div>

            {/* EMPLEADOS EN NÓMINA */}
            <div style={{ marginBottom: '20px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px' }}>👥</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600 }}>
                  EMPLEADOS EN NÓMINA
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {empleados.map(emp => {
                  const netoQ = salarioNetoQuincenal(emp)
                  const brutoQ = calcularBruto(netoQ, descuentoPct)
                  const aporteQ = brutoQ - netoQ
                  return (
                    <div key={emp.id} style={{
                      background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
                      borderLeft: `4px solid ${COLOR_PERS}`,
                      borderRadius: '12px', padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
                      boxShadow: 'var(--modulo-sombra)',
                    }}>
                      <div style={{ width: '44px', height: '44px', borderRadius: '50%', background: esTropical ? `${COLOR_PERS}15` : `${COLOR_PERS}30`, border: `2px solid ${COLOR_PERS}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', flexShrink: 0 }}>
                        {emp.foto_url ? <img src={emp.foto_url} alt="" style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} /> : obtenerAvatar(emp)}
                      </div>
                      <div style={{ flex: 1, minWidth: '180px' }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{emp.nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                          {emp.rol?.replace('_', ' ')}
                          {emp.frecuencia_pago && ` · pago ${emp.frecuencia_pago}`}
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Neto/{labelF}</div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: esTropical ? '#04342C' : '#5DCAA5' }}>
                          RD$ {formatearMoneda(netoQ)}
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                          Bruto: RD$ {formatearMoneda(brutoQ)} · Aporte: RD$ {formatearMoneda(aporteQ)}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* HERRAMIENTAS */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px' }}>⚖️</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600 }}>
                  HERRAMIENTAS
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
                <HerramientaCard emoji="📜" label="Historial de pagos" descripcion="Ver pagos anteriores" color="#888780" onClick={() => setVerHistorial(true)} />
                <HerramientaCard emoji="🎁" label="Bonificaciones extra" descripcion="Bonos navideños, productividad..." color="#BA7517" onClick={() => setVerBonificaciones(true)} />
                <HerramientaCard emoji="🎄" label="Regalía Pascual" descripcion="Proyección de Diciembre" color="#E24B4A" onClick={() => setVerRegalia(true)} />
                <HerramientaCard emoji="⚖️" label="Calculadora de Liquidación" descripcion="Para terminaciones de contrato" color="#534AB7" onClick={() => setVerLiquidacion(true)} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function HerramientaCard({ emoji, label, descripcion, color, onClick }) {
  return (
    <button onClick={onClick} style={{
      background: 'var(--color-modulo-bg)',
      border: '1px solid var(--color-modulo-border)',
      borderLeft: `4px solid ${color}`,
      borderRadius: '12px', padding: '14px 16px',
      cursor: 'pointer', textAlign: 'left',
      display: 'flex', alignItems: 'center', gap: '12px',
      fontFamily: 'inherit', boxShadow: 'var(--modulo-sombra)',
    }}>
      <span style={{ fontSize: '28px' }}>{emoji}</span>
      <div>
        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{label}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{descripcion}</div>
      </div>
    </button>
  )
}

function ToggleTema({ tema, setTema }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '3px', gap: '2px' }}>
      <button onClick={() => setTema('oscuro')} style={tabTemaStyle(tema === 'oscuro')}>
        <span style={{ fontSize: '11px' }}>🌙</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
      </button>
      <button onClick={() => setTema('tropical')} style={tabTemaStyle(tema === 'tropical')}>
        <span style={{ fontSize: '11px' }}>☀️</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
      </button>
    </div>
  )
}

function Titulo({ emoji, titulo, subtitulo, color, colorBg, colorDarker, colorClaro, esTropical }) {
  return (
    <div style={{
      background: esTropical ? `linear-gradient(135deg, ${colorClaro} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`,
      border: esTropical ? `1.5px solid ${colorBg}` : `1px solid ${color}55`,
      borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
      display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: esTropical ? `0 2px 12px ${color}15` : 'none',
    }}>
      <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: esTropical ? color : `${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: esTropical ? `0 4px 12px ${color}40` : 'none' }}>{emoji}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? colorDarker : 'var(--color-text-primary)', lineHeight: 1.2 }}>{titulo}</div>
        <div style={{ fontSize: '12px', color: esTropical ? color : `${color}CC`, marginTop: '4px', fontWeight: 500 }}>{subtitulo}</div>
      </div>
    </div>
  )
}

function KpiCard({ label, valor, sublabel, colorBorde, colorTexto }) {
  return (
    <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderLeft: `4px solid ${colorBorde}`, borderRadius: '12px', padding: '14px', boxShadow: 'var(--modulo-sombra)' }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '1px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 600, color: colorTexto || 'var(--color-text-primary)' }}>{valor}</div>
      {sublabel && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sublabel}</div>}
    </div>
  )
}

function btnVolver() {
  return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
}

function tabTemaStyle(activo) {
  return { background: activo ? 'var(--gradient-toggle-active)' : 'transparent', border: 'none', borderRadius: '16px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }
}

export default VistaNomina