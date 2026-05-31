import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { crearGastoDesdeLiquidacion } from '../../utils/gastosAutomaticos'

const TIPOS_CONTRATO_INFO = {
  'indefinido':     { label: 'Indefinido',                 icon: '∞',  color: '#378ADD' },
  'obra_servicio':  { label: 'Obra/Servicio Determinado',  icon: '📑', color: '#EF9F27' },
  'estacional':     { label: 'Estacional',                 icon: '🍂', color: '#D85A30' },
}

const RAZONES_SALIDA = [
  { value: 'terminacion_natural',     label: '✅ Terminación natural del contrato',     descripcion: 'El contrato llegó a su fecha fin pactada' },
  { value: 'renuncia',                label: '👋 Renuncia voluntaria (Art. 87)',         descripcion: 'El empleado decide dejar el trabajo' },
  { value: 'despido_justa',           label: '⚠️ Despido con causa justa',               descripcion: 'Despido por falta grave del empleado' },
  { value: 'despido_sin_causa',       label: '🚨 Despido sin causa (Art. 75 - Desahucio)', descripcion: 'Empleador termina sin razón justificada' },
  { value: 'despido_anticipado_obra', label: '🚨 Despido anticipado en obra/servicio',   descripcion: 'Termina obra/servicio ANTES de la fecha fin (¡puede ser caro!)' },
  { value: 'mutuo_acuerdo',           label: '🤝 Mutuo acuerdo',                          descripcion: 'Ambas partes acuerdan terminar' },
]

function CalculadoraLiquidacion({ empresaId, usuarioActual, onVolver, empleadoPreseleccionado = null }) {
  const [empresa, setEmpresa] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null)
  const [razonSalida, setRazonSalida] = useState('')
  const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().split('T')[0])
  const [tipoContrato, setTipoContrato] = useState('indefinido')
  const [fechaInicioContrato, setFechaInicioContrato] = useState('')
  const [fechaFinContrato, setFechaFinContrato] = useState('')
  const [notasLiquidacion, setNotasLiquidacion] = useState('')
  const [cargando, setCargando] = useState(true)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [liquidacionExitosa, setLiquidacionExitosa] = useState(null)

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('cocina_pae_tema') || 'oscuro'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  useEffect(() => {
    if (empleadoPreseleccionado && empleados.length > 0) {
      const emp = empleados.find(e => e.id === empleadoPreseleccionado.id)
      if (emp) onEmpleadoChange(empleadoPreseleccionado.id)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empleadoPreseleccionado, empleados])

  async function cargarDatos() {
    setCargando(true)
    const { data: empresaData } = await supabase
      .from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)

    const { data: empleadosData } = await supabase
      .from('usuarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .neq('rol', 'propietario')
      .not('sueldo', 'is', null)
      .order('nombre')
    setEmpleados(empleadosData || [])
    setCargando(false)
  }

  async function onEmpleadoChange(empleadoId) {
    if (!empleadoId) { setEmpleadoSeleccionado(null); return }
    const emp = empleados.find(e => e.id === empleadoId)
    setEmpleadoSeleccionado(emp)

    const { data: contratoData } = await supabase
      .from('contratos').select('*').eq('usuario_id', empleadoId).eq('estado', 'activo')
      .order('created_at', { ascending: false }).limit(1).maybeSingle()

    if (contratoData) {
      setTipoContrato(contratoData.tipo_contrato || 'indefinido')
      setFechaInicioContrato(contratoData.fecha_inicio || '')
      setFechaFinContrato(contratoData.fecha_fin || '')
    } else {
      setTipoContrato('indefinido')
      setFechaInicioContrato(emp.fecha_ingreso || emp.fecha_contratacion || '')
      setFechaFinContrato('')
    }
  }

  function salarioMensual(emp) {
    if (!emp) return 0
    const sueldo = parseFloat(emp.sueldo || 0)
    const freq = emp.frecuencia_pago
    if (freq === 'mes') return sueldo
    if (freq === 'quincena') return sueldo * 2
    if (freq === 'semana') return sueldo * 4.33
    if (freq === 'dia') return sueldo * 22
    return sueldo
  }

  function salarioDiario(emp) { return salarioMensual(emp) / 23.83 }

  function calcularTiempo() {
    if (!fechaInicioContrato || !fechaSalida) return { años: 0, meses: 0, dias: 0, totalDias: 0, totalMeses: 0 }
    const inicio = new Date(fechaInicioContrato)
    const fin = new Date(fechaSalida)
    const totalMs = fin - inicio
    const totalDias = Math.floor(totalMs / (1000 * 60 * 60 * 24))
    if (totalDias < 0) return { años: 0, meses: 0, dias: 0, totalDias: 0, totalMeses: 0 }
    const años = Math.floor(totalDias / 365.25)
    const restoDias1 = totalDias - Math.floor(años * 365.25)
    const meses = Math.floor(restoDias1 / 30.44)
    const dias = Math.floor(restoDias1 - (meses * 30.44))
    const totalMeses = totalDias / 30.44
    return { años, meses, dias, totalDias, totalMeses }
  }

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  function formatearFecha(fecha) {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function calcularLiquidacion() {
    if (!empleadoSeleccionado || !razonSalida || !fechaInicioContrato) return null
    const tiempo = calcularTiempo()
    const salDiario = salarioDiario(empleadoSeleccionado)
    const salMensual = salarioMensual(empleadoSeleccionado)

    let result = {
      tiempo, salariosDiario: salDiario, salariosMensual: salMensual,
      salariosPendientes: 0, regaliaProporcional: 0, vacaciones: 0,
      preaviso: 0, cesantia: 0, salariosFaltantes: 0,
      diasPreaviso: 0, diasCesantia: 0, diasVacaciones: 0,
      total: 0, mesesParaSalariosFaltantes: 0, alertas: [],
      aplica: { salariosPendientes: false, regalia: false, vacaciones: false, preaviso: false, cesantia: false, salariosFaltantes: false }
    }

    result.salariosPendientes = salDiario * 5
    result.aplica.salariosPendientes = true

    const inicioAñoActual = new Date(new Date(fechaSalida).getFullYear(), 0, 1)
    const inicioConteo = new Date(fechaInicioContrato) > inicioAñoActual
      ? new Date(fechaInicioContrato) : inicioAñoActual
    const mesesEsteAño = Math.max(0, (new Date(fechaSalida) - inicioConteo) / (1000 * 60 * 60 * 24 * 30.44))

    if (mesesEsteAño >= 3 || tiempo.totalMeses >= 3) {
      const salariosAñoActual = salMensual * mesesEsteAño
      result.regaliaProporcional = salariosAñoActual / 12
      result.aplica.regalia = true
    } else {
      result.alertas.push('⚠️ Empleado con menos de 3 meses este año: no aplica regalía')
    }

    if (tiempo.años >= 1 && tipoContrato === 'indefinido') {
      if (tiempo.años >= 10) result.diasVacaciones = 24
      else if (tiempo.años >= 5) result.diasVacaciones = 18
      else result.diasVacaciones = 14
      result.vacaciones = salDiario * result.diasVacaciones
      result.aplica.vacaciones = true
    } else if (tipoContrato !== 'indefinido') {
      result.alertas.push('ℹ️ Vacaciones legales no aplican en contratos obra/servicio')
    } else {
      result.alertas.push('ℹ️ Vacaciones requieren mínimo 1 año trabajando')
    }

    if (tipoContrato === 'indefinido' && razonSalida === 'despido_sin_causa') {
      if (tiempo.totalDias >= 30 && tiempo.totalDias < 180) result.diasPreaviso = 7
      else if (tiempo.totalDias >= 180 && tiempo.totalDias < 365) result.diasPreaviso = 14
      else if (tiempo.totalDias >= 365) result.diasPreaviso = 28
      result.preaviso = salDiario * result.diasPreaviso
      result.aplica.preaviso = true
    }

    if (tipoContrato === 'indefinido' && razonSalida === 'despido_sin_causa') {
      if (tiempo.totalDias >= 90 && tiempo.totalDias < 180) result.diasCesantia = 6
      else if (tiempo.totalDias >= 180 && tiempo.totalDias < 365) result.diasCesantia = 13
      else if (tiempo.años >= 1 && tiempo.años < 5) result.diasCesantia = 21 * tiempo.años
      else if (tiempo.años >= 5) result.diasCesantia = 23 * tiempo.años
      result.cesantia = salDiario * result.diasCesantia
      result.aplica.cesantia = true
    }

    if (tipoContrato === 'obra_servicio' && razonSalida === 'despido_anticipado_obra' && fechaFinContrato) {
      const finContrato = new Date(fechaFinContrato)
      const salida = new Date(fechaSalida)
      if (salida < finContrato) {
        const diffMs = finContrato - salida
        const mesesFaltantes = diffMs / (1000 * 60 * 60 * 24 * 30.44)
        result.mesesParaSalariosFaltantes = Math.round(mesesFaltantes * 10) / 10
        result.salariosFaltantes = salMensual * mesesFaltantes
        result.aplica.salariosFaltantes = true
        result.alertas.push(`🚨 ALERTA: Debes pagar ${result.mesesParaSalariosFaltantes} meses de salario por terminar el contrato anticipadamente (Art. 95)`)
      }
    }

    result.total = result.salariosPendientes + result.regaliaProporcional + result.vacaciones + result.preaviso + result.cesantia + result.salariosFaltantes

    if (razonSalida === 'renuncia') result.alertas.push('ℹ️ En renuncia voluntaria solo aplica regalía proporcional y vacaciones acumuladas')
    if (razonSalida === 'despido_justa') result.alertas.push('ℹ️ Despido con causa justa: solo aplican prestaciones mínimas (regalía y vacaciones acumuladas)')
    if (razonSalida === 'terminacion_natural' && tipoContrato === 'obra_servicio') {
      result.alertas.push('✅ Terminación natural de obra/servicio: NO genera cesantía ni preaviso. Buena planificación.')
    }

    return result
  }

  function generarCartaLiquidacion(liq) {
    const empleadoNombre = empleadoSeleccionado.nombre
    const empresaNombre = empresa?.nombre || 'La Empresa'
    const fechaHoy = new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })
    const razonTexto = RAZONES_SALIDA.find(r => r.value === razonSalida)?.label || ''

    const carta = `
═══════════════════════════════════════════
CARTA DE LIQUIDACIÓN LABORAL
═══════════════════════════════════════════

${empresaNombre}
${fechaHoy}

A: ${empleadoNombre}

Por medio de la presente, se hace constar la liquidación 
laboral correspondiente a la terminación de la relación 
laboral, bajo los siguientes términos:

DATOS DE LA RELACIÓN:
- Tipo de contrato: ${TIPOS_CONTRATO_INFO[tipoContrato]?.label}
- Fecha de inicio: ${formatearFecha(fechaInicioContrato)}
- Fecha de salida: ${formatearFecha(fechaSalida)}
- Tiempo trabajado: ${liq.tiempo.años} años, ${liq.tiempo.meses} meses, ${liq.tiempo.dias} días
- Razón de la salida: ${razonTexto}

CONCEPTOS DE LIQUIDACIÓN:

1. Salarios pendientes:     RD$ ${formatearMoneda(liq.salariosPendientes)}
2. Regalía proporcional:    RD$ ${formatearMoneda(liq.regaliaProporcional)}
3. Vacaciones:              RD$ ${formatearMoneda(liq.vacaciones)}
4. Preaviso:                RD$ ${formatearMoneda(liq.preaviso)}
5. Cesantía:                RD$ ${formatearMoneda(liq.cesantia)}
6. Salarios faltantes:      RD$ ${formatearMoneda(liq.salariosFaltantes)}
─────────────────────────────────────────
TOTAL A PAGAR:              RD$ ${formatearMoneda(liq.total)}

─────────────────────────────────────────

Recibí conforme:


_____________________________
${empleadoNombre}
Empleado


_____________________________
${empresa?.propietario_nombre || 'Propietario'}
${empresaNombre}

═══════════════════════════════════════════
Generado por Cocina PAE - Andamio
${new Date().toLocaleString('es-DO')}
═══════════════════════════════════════════
`

    const ventana = window.open('', '_blank')
    ventana.document.write(`
      <html>
        <head>
          <title>Carta de Liquidación - ${empleadoNombre}</title>
          <style>
            body { font-family: 'Courier New', monospace; padding: 40px; max-width: 700px; margin: 0 auto; }
            pre { white-space: pre-wrap; font-size: 14px; line-height: 1.6; }
            @media print { body { padding: 20px; } }
          </style>
        </head>
        <body>
          <pre>${carta}</pre>
          <div style="text-align: center; margin-top: 20px;" class="no-print">
            <button onclick="window.print()" style="padding: 10px 30px; background: #1D9E75; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
              🖨️ Imprimir carta
            </button>
          </div>
        </body>
      </html>
    `)
  }

  async function procesarLiquidacion() {
    setError('')
    setProcesando(true)
    const liq = calcularLiquidacion()
    if (!liq) { setError('No se puede procesar: datos incompletos'); setProcesando(false); return }

    try {
      const nuevaLiquidacion = {
        empresa_id: empresaId,
        usuario_id: empleadoSeleccionado.id,
        empleado_nombre: empleadoSeleccionado.nombre,
        empleado_cedula: empleadoSeleccionado.cedula || null,
        empleado_rol: empleadoSeleccionado.rol || null,
        empleado_sueldo: parseFloat(empleadoSeleccionado.sueldo || 0),
        empleado_frecuencia_pago: empleadoSeleccionado.frecuencia_pago || null,
        empleado_fecha_contratacion: fechaInicioContrato || null,
        fecha_terminacion: fechaSalida,
        razon_terminacion: razonSalida,
        razon_descripcion: RAZONES_SALIDA.find(r => r.value === razonSalida)?.label || null,
        años_servicio: liq.tiempo.años + (liq.tiempo.meses / 12),
        meses_servicio: Math.round(liq.tiempo.totalMeses),
        dias_servicio: liq.tiempo.totalDias,
        monto_salarios_pendientes: liq.salariosPendientes,
        monto_regalia_proporcional: liq.regaliaProporcional,
        monto_vacaciones: liq.vacaciones,
        monto_preaviso: liq.preaviso,
        monto_cesantia: liq.cesantia,
        monto_salarios_faltantes: liq.salariosFaltantes,
        detalle_calculo: {
          tipo_contrato: tipoContrato,
          fecha_inicio: fechaInicioContrato,
          fecha_fin: fechaFinContrato || null,
          salario_diario: liq.salariosDiario,
          salario_mensual: liq.salariosMensual,
          dias_vacaciones: liq.diasVacaciones,
          dias_preaviso: liq.diasPreaviso,
          dias_cesantia: liq.diasCesantia,
          meses_salarios_faltantes: liq.mesesParaSalariosFaltantes,
          aplica: liq.aplica,
          alertas: liq.alertas,
        },
        monto_total: liq.total,
        estado: 'pagada',
        forma_pago: 'efectivo',
        notas: notasLiquidacion?.trim() || null,
        procesado_por_usuario_id: usuarioActual?.id || null,
        procesado_por_nombre: usuarioActual?.nombre || 'Sistema',
      }

      const { data: liqCreada, error: errorLiq } = await supabase
        .from('liquidaciones').insert([nuevaLiquidacion]).select().single()
      if (errorLiq) throw new Error('Error al guardar liquidación: ' + errorLiq.message)

      const { error: errorEmpleado } = await supabase
        .from('usuarios').update({ activo: false, fecha_salida: fechaSalida }).eq('id', empleadoSeleccionado.id)
      if (errorEmpleado) console.warn('⚠️ Liquidación guardada pero falló desactivar empleado:', errorEmpleado.message)

      const resultadoGasto = await crearGastoDesdeLiquidacion({
        empresaId: empresaId,
        liquidacionId: liqCreada.id,
        fechaTerminacion: fechaSalida,
        empleadoNombre: empleadoSeleccionado.nombre,
        razonTerminacion: razonSalida,
        montoTotal: liq.total,
        registradoPor: usuarioActual?.id,
        registradoPorNombre: usuarioActual?.nombre || 'Sistema',
      })
      if (!resultadoGasto.success) console.warn('⚠️ Liquidación OK pero falló crear gasto automático:', resultadoGasto.error)

      setLiquidacionExitosa({ ...liqCreada, liquidacionCalculada: liq })
      setMostrarConfirmacion(false)
      setProcesando(false)
    } catch (e) {
      console.error('❌ Error procesando liquidación:', e)
      setError(e.message)
      setProcesando(false)
    }
  }

  const liquidacion = empleadoSeleccionado && razonSalida ? calcularLiquidacion() : null

  // ─── ESTILOS BASE ───
  const panel = {
    background: 'var(--color-modulo-bg)',
    border: '1px solid var(--color-modulo-border)',
    borderRadius: '14px',
    padding: '20px',
    boxShadow: 'var(--modulo-sombra)',
  }
  const input = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px',
    padding: '10px 12px',
    color: 'var(--color-text-primary)',
    fontSize: '13px',
    fontFamily: 'inherit',
    outline: 'none',
  }
  const labelStyle = {
    display: 'block', fontSize: '10px', fontWeight: 500,
    color: 'var(--color-text-muted)', marginBottom: '6px',
    letterSpacing: '0.5px', textTransform: 'uppercase',
  }
  const sectionTitle = {
    fontSize: '11px', color: 'var(--color-text-muted)',
    letterSpacing: '1.5px', fontWeight: 600, marginBottom: '14px',
    display: 'flex', alignItems: 'center', gap: '8px',
  }

  if (cargando) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando calculadora...</p>
      </div>
    )
  }

  // ─── PANTALLA DE ÉXITO ───
  if (liquidacionExitosa) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg-primary)',
        position: 'relative', padding: '20px', color: 'var(--color-text-primary)',
      }}>
        <div style={{
          position: 'fixed', inset: 0,
          backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
          pointerEvents: 'none', zIndex: 0,
        }} />
        <div style={{ position: 'relative', zIndex: 1, maxWidth: '700px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <button
              onClick={onVolver}
              style={{
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '20px', padding: '7px 14px',
                color: 'var(--color-text-secondary)', fontSize: '12px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ← Volver
            </button>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, rgba(29, 158, 117, 0.18) 0%, rgba(15, 110, 86, 0.08) 100%)',
            border: '1px solid rgba(29, 158, 117, 0.4)',
            borderLeft: '4px solid #1D9E75',
            borderRadius: '14px', padding: '28px', marginBottom: '20px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>✅</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
              Liquidación Procesada
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
              {liquidacionExitosa.empleado_nombre} ha sido liquidado(a) exitosamente
            </div>
          </div>

          <div style={panel}>
            <div style={sectionTitle}>📋 RESUMEN DEL PROCESO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <PasoCheck color="#378ADD" emoji="📝" titulo="Liquidación registrada" sub="Guardada en histórico para auditoría legal" />
              <PasoCheck color="#EF9F27" emoji="🔒" titulo="Empleado desactivado" sub={`${liquidacionExitosa.empleado_nombre} ya no aparece en la lista activa`} />
              <PasoCheck color="#1D9E75" emoji="🔗" titulo="Gasto automático creado" sub={`RD$ ${formatearMoneda(liquidacionExitosa.monto_total)} registrado en módulo de Gastos`} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '10px', marginTop: '16px', flexWrap: 'wrap' }}>
            <button
              onClick={() => generarCartaLiquidacion(liquidacionExitosa.liquidacionCalculada)}
              style={{
                flex: 1, minWidth: '200px', padding: '14px',
                background: 'var(--gradient-button)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              📄 Imprimir carta de liquidación
            </button>
            <button
              onClick={onVolver}
              style={{
                flex: 1, minWidth: '200px', padding: '14px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '10px',
                color: 'var(--color-text-secondary)',
                fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ← Volver al panel
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── PANTALLA PRINCIPAL ───
  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg-primary)',
      position: 'relative', padding: '20px', color: 'var(--color-text-primary)',
    }}>
      <style>{`
        @keyframes calcSlideTop { 0% { opacity: 0; transform: translateY(-18px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes calcFadeUp { 0% { opacity: 0; transform: translateY(22px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* HEADER */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
        opacity: 0, animation: 'calcSlideTop 0.5s ease forwards',
      }}>
        <button
          onClick={onVolver}
          style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '20px', padding: '7px 14px',
            color: 'var(--color-text-secondary)', fontSize: '12px',
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}
        >
          ← Volver
        </button>

        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '20px', padding: '3px', gap: '2px',
        }}>
          <button
            type="button"
            onClick={() => setTema('oscuro')}
            style={{
              background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
              border: 'none', borderRadius: '16px', padding: '6px 10px',
              display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
            }}
          >
            <span style={{ fontSize: '11px' }}>🌙</span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
          </button>
          <button
            type="button"
            onClick={() => setTema('tropical')}
            style={{
              background: tema === 'tropical' ? 'var(--gradient-toggle-active)' : 'transparent',
              border: 'none', borderRadius: '16px', padding: '6px 10px',
              display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
            }}
          >
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
        borderLeft: '4px solid #D4537E',
        borderRadius: '14px', padding: '20px',
        marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '16px',
        boxShadow: 'var(--modulo-sombra)',
        opacity: 0, animation: 'calcFadeUp 0.5s ease 0.1s forwards',
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'rgba(212, 83, 126, 0.18)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px',
        }}>⚖️</div>
        <div>
          <div style={{ fontSize: '10px', color: '#D4537E', letterSpacing: '1.5px', fontWeight: 600 }}>
            CALCULADORA LEGAL
          </div>
          <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
            Liquidación de Empleado
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Calcula y procesa prestaciones laborales según ley dominicana
          </div>
        </div>
      </div>

      {/* AVISO si viene desde Empleados */}
      {empleadoPreseleccionado && (
        <div style={{
          position: 'relative', zIndex: 1,
          background: 'rgba(55, 138, 221, 0.12)',
          border: '1px solid rgba(55, 138, 221, 0.35)',
          borderLeft: '4px solid #378ADD',
          borderRadius: '12px', padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex', alignItems: 'flex-start', gap: '12px',
          opacity: 0, animation: 'calcFadeUp 0.5s ease 0.15s forwards',
        }}>
          <span style={{ fontSize: '20px' }}>🔗</span>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              Vienes desde "Dar de baja" en Empleados
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              <strong>{empleadoPreseleccionado.nombre}</strong> fue preseleccionado automáticamente. Completa los pasos para procesar su liquidación.
            </div>
          </div>
        </div>
      )}

      {/* AVISO LEGAL */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'rgba(239, 159, 39, 0.12)',
        border: '1px solid rgba(239, 159, 39, 0.35)',
        borderLeft: '4px solid #EF9F27',
        borderRadius: '12px', padding: '14px 16px',
        marginBottom: '20px',
        display: 'flex', alignItems: 'flex-start', gap: '12px',
        opacity: 0, animation: 'calcFadeUp 0.5s ease 0.2s forwards',
      }}>
        <span style={{ fontSize: '20px' }}>⚠️</span>
        <div>
          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            IMPORTANTE: Esta es una calculadora orientativa
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
            Los cálculos son aproximados según la ley dominicana. Para liquidaciones reales se recomienda consultar con un abogado laboral.
          </div>
        </div>
      </div>

      {/* PASO 1 — EMPLEADO */}
      <div style={{ ...panel, marginBottom: '16px', position: 'relative', zIndex: 1, opacity: 0, animation: 'calcFadeUp 0.5s ease 0.25s forwards' }}>
        <div style={sectionTitle}>PASO 1 — SELECCIONAR EMPLEADO</div>
        <select
          value={empleadoSeleccionado?.id || ''}
          onChange={(e) => onEmpleadoChange(e.target.value)}
          style={{ ...input, fontWeight: 500 }}
        >
          <option value="">-- Selecciona un empleado --</option>
          {empleados.map(e => (
            <option key={e.id} value={e.id}>{e.nombre} - {e.rol?.replace('_', ' ')}</option>
          ))}
        </select>

        {empleadoSeleccionado && (
          <div style={{ marginTop: '14px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label style={labelStyle}>Tipo de contrato</label>
              <select value={tipoContrato} onChange={(e) => setTipoContrato(e.target.value)} style={input}>
                <option value="indefinido">∞ Indefinido</option>
                <option value="obra_servicio">📑 Obra/Servicio</option>
                <option value="estacional">🍂 Estacional</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Sueldo mensual</label>
              <div style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '10px', padding: '10px 12px',
                fontSize: '13px', fontWeight: 600,
                color: 'var(--color-text-primary)',
              }}>
                RD$ {formatearMoneda(salarioMensual(empleadoSeleccionado))}
              </div>
            </div>
            <div>
              <label style={labelStyle}>Fecha inicio contrato</label>
              <input type="date" value={fechaInicioContrato} onChange={(e) => setFechaInicioContrato(e.target.value)} style={input} />
            </div>
            {tipoContrato === 'obra_servicio' && (
              <div>
                <label style={labelStyle}>Fecha fin contrato</label>
                <input type="date" value={fechaFinContrato} onChange={(e) => setFechaFinContrato(e.target.value)} style={input} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* PASO 2 — RAZÓN */}
      {empleadoSeleccionado && (
        <div style={{ ...panel, marginBottom: '16px', position: 'relative', zIndex: 1, opacity: 0, animation: 'calcFadeUp 0.5s ease 0.3s forwards' }}>
          <div style={sectionTitle}>PASO 2 — RAZÓN DE LA SALIDA</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {RAZONES_SALIDA.map(r => (
              <label
                key={r.value}
                style={{
                  display: 'flex', alignItems: 'flex-start', gap: '12px',
                  padding: '12px 14px', cursor: 'pointer',
                  background: razonSalida === r.value ? 'rgba(212, 83, 126, 0.12)' : 'var(--color-bg-input)',
                  border: razonSalida === r.value ? '1px solid rgba(212, 83, 126, 0.5)' : '1px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  transition: 'all 0.15s ease',
                }}
              >
                <input
                  type="radio" name="razon" value={r.value}
                  checked={razonSalida === r.value}
                  onChange={(e) => setRazonSalida(e.target.value)}
                  style={{ marginTop: '3px' }}
                />
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{r.label}</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{r.descripcion}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* PASO 3 — FECHA Y NOTAS */}
      {razonSalida && (
        <div style={{ ...panel, marginBottom: '16px', position: 'relative', zIndex: 1, opacity: 0, animation: 'calcFadeUp 0.5s ease 0.35s forwards' }}>
          <div style={sectionTitle}>PASO 3 — FECHA Y NOTAS</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
            <div>
              <label style={labelStyle}>Fecha de salida</label>
              <input type="date" value={fechaSalida} onChange={(e) => setFechaSalida(e.target.value)} style={{ ...input, fontWeight: 500 }} />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notas adicionales (opcional)</label>
            <textarea
              value={notasLiquidacion}
              onChange={(e) => setNotasLiquidacion(e.target.value)}
              rows={2}
              style={{ ...input, resize: 'none' }}
              placeholder="Cualquier comentario sobre esta liquidación..."
            />
          </div>
        </div>
      )}

      {/* RESULTADO */}
      {liquidacion && (
        <>
          <div style={{
            position: 'relative', zIndex: 1, marginBottom: '16px',
            background: 'linear-gradient(135deg, rgba(212, 83, 126, 0.18) 0%, rgba(153, 53, 86, 0.08) 100%)',
            border: '1px solid rgba(212, 83, 126, 0.4)',
            borderLeft: '4px solid #D4537E',
            borderRadius: '14px', padding: '20px',
            opacity: 0, animation: 'calcFadeUp 0.5s ease 0.4s forwards',
          }}>
            <div style={{ fontSize: '11px', color: '#D4537E', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '12px' }}>
              💰 RESUMEN DE LIQUIDACIÓN
            </div>

            <div style={{
              background: 'rgba(0,0,0,0.15)', borderRadius: '10px',
              padding: '12px', marginBottom: '14px', fontSize: '12px',
              color: 'var(--color-text-secondary)',
            }}>
              <div><strong style={{ color: 'var(--color-text-primary)' }}>Tiempo trabajado:</strong> {liquidacion.tiempo.años} años, {liquidacion.tiempo.meses} meses, {liquidacion.tiempo.dias} días ({liquidacion.tiempo.totalDias} días totales)</div>
              <div style={{ marginTop: '4px' }}><strong style={{ color: 'var(--color-text-primary)' }}>Salario diario:</strong> RD$ {formatearMoneda(liquidacion.salariosDiario)}</div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <LineaResumen aplica={liquidacion.aplica.salariosPendientes} label="1. Salarios pendientes (5 días estimados)" monto={liquidacion.salariosPendientes} />
              <LineaResumen aplica={liquidacion.aplica.regalia} label="2. Regalía proporcional" monto={liquidacion.regaliaProporcional} />
              <LineaResumen aplica={liquidacion.aplica.vacaciones} label={`3. Vacaciones (${liquidacion.diasVacaciones} días)`} monto={liquidacion.vacaciones} />
              <LineaResumen aplica={liquidacion.aplica.preaviso} label={`4. Preaviso (${liquidacion.diasPreaviso} días)`} monto={liquidacion.preaviso} />
              <LineaResumen aplica={liquidacion.aplica.cesantia} label={`5. Cesantía (${liquidacion.diasCesantia} días)`} monto={liquidacion.cesantia} />
              {liquidacion.salariosFaltantes > 0 && (
                <LineaResumen aplica alerta label={`🚨 6. Salarios faltantes (${liquidacion.mesesParaSalariosFaltantes} meses)`} monto={liquidacion.salariosFaltantes} />
              )}
            </div>

            <div style={{
              marginTop: '14px', paddingTop: '14px',
              borderTop: '1px solid rgba(212, 83, 126, 0.3)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            }}>
              <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>TOTAL A PAGAR:</div>
              <div style={{ fontSize: '24px', fontWeight: 600, color: '#D4537E' }}>RD$ {formatearMoneda(liquidacion.total)}</div>
            </div>
          </div>

          {liquidacion.alertas.length > 0 && (
            <div style={{
              position: 'relative', zIndex: 1, marginBottom: '16px',
              background: 'rgba(55, 138, 221, 0.12)',
              border: '1px solid rgba(55, 138, 221, 0.35)',
              borderLeft: '4px solid #378ADD',
              borderRadius: '12px', padding: '14px 16px',
            }}>
              <div style={{ fontSize: '11px', color: '#378ADD', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '8px' }}>
                📋 NOTAS Y ALERTAS
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {liquidacion.alertas.map((alerta, i) => (
                  <div key={i} style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{alerta}</div>
                ))}
              </div>
            </div>
          )}

          <div style={{
            position: 'relative', zIndex: 1, marginBottom: '16px',
            background: 'rgba(239, 159, 39, 0.12)',
            border: '1px solid rgba(239, 159, 39, 0.4)',
            borderLeft: '4px solid #EF9F27',
            borderRadius: '12px', padding: '14px 16px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              🔗 Al procesar esta liquidación se ejecutarán 3 acciones:
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.6 }}>
              📝 <strong>Registrar liquidación</strong> en el histórico legal<br />
              🔒 <strong>Desactivar al empleado</strong> (soft-delete, queda en histórico)<br />
              💰 <strong>Crear gasto automático</strong> de RD$ {formatearMoneda(liquidacion.total)} en Sueldos y Salarios
            </div>
          </div>

          <div style={{
            position: 'relative', zIndex: 1, marginBottom: '16px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '10px',
          }}>
            <button
              onClick={() => generarCartaLiquidacion(liquidacion)}
              style={{
                padding: '14px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '10px',
                color: 'var(--color-text-secondary)',
                fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              📄 Vista previa de carta
            </button>
            <button
              onClick={() => setMostrarConfirmacion(true)}
              style={{
                padding: '14px',
                background: 'linear-gradient(135deg, #D4537E 0%, #993556 100%)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ⚖️ Procesar liquidación
            </button>
          </div>
        </>
      )}

      {/* MODAL DE CONFIRMACIÓN */}
      {mostrarConfirmacion && liquidacion && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'var(--color-bg-elevated)',
            backdropFilter: 'blur(20px)',
            border: '0.5px solid var(--color-border-accent)',
            borderRadius: '16px',
            maxWidth: '440px', width: '100%',
            overflow: 'hidden',
          }}>
            <div style={{
              background: 'linear-gradient(135deg, #D4537E 0%, #993556 100%)',
              padding: '24px', textAlign: 'center', color: 'white',
            }}>
              <div style={{ fontSize: '40px', marginBottom: '6px' }}>⚠️</div>
              <div style={{ fontSize: '18px', fontWeight: 600 }}>¿Confirmar liquidación?</div>
              <div style={{ fontSize: '11px', opacity: 0.9, marginTop: '2px' }}>Esta acción es irreversible</div>
            </div>

            <div style={{ padding: '20px' }}>
              <div style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '10px', padding: '14px',
                fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <FilaConfirma label="Empleado:" valor={empleadoSeleccionado.nombre} />
                <FilaConfirma label="Razón:" valor={RAZONES_SALIDA.find(r => r.value === razonSalida)?.label.replace(/^\W+\s/, '')} />
                <FilaConfirma label="Fecha salida:" valor={formatearFecha(fechaSalida)} />
                <div style={{
                  display: 'flex', justifyContent: 'space-between',
                  paddingTop: '8px', marginTop: '4px',
                  borderTop: '1px solid var(--color-border-subtle)',
                  fontSize: '14px',
                }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>TOTAL:</span>
                  <span style={{ fontWeight: 600, color: '#1D9E75' }}>RD$ {formatearMoneda(liquidacion.total)}</span>
                </div>
              </div>

              <div style={{
                marginTop: '14px',
                background: 'rgba(239, 159, 39, 0.12)',
                border: '1px solid rgba(239, 159, 39, 0.35)',
                borderRadius: '10px', padding: '10px 12px',
                fontSize: '11px', color: 'var(--color-text-secondary)',
              }}>
                <div style={{ fontWeight: 600, color: '#EF9F27', marginBottom: '4px' }}>Al confirmar:</div>
                📝 Se guarda en histórico de liquidaciones<br />
                🔒 {empleadoSeleccionado.nombre} queda desactivado<br />
                💰 Se crea gasto automático en módulo Gastos
              </div>

              {error && (
                <div style={{
                  marginTop: '12px',
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  borderRadius: '10px', padding: '10px 12px',
                  fontSize: '12px', color: '#F4C0D1',
                }}>
                  ⚠️ {error}
                </div>
              )}

              <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                <button
                  onClick={() => { setMostrarConfirmacion(false); setError('') }}
                  disabled={procesando}
                  style={{
                    flex: 1, padding: '12px',
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '10px',
                    color: 'var(--color-text-secondary)',
                    fontSize: '13px', fontWeight: 500,
                    cursor: procesando ? 'not-allowed' : 'pointer',
                    opacity: procesando ? 0.6 : 1, fontFamily: 'inherit',
                  }}
                >
                  Cancelar
                </button>
                <button
                  onClick={procesarLiquidacion}
                  disabled={procesando}
                  style={{
                    flex: 1, padding: '12px',
                    background: 'linear-gradient(135deg, #D4537E 0%, #993556 100%)',
                    border: 'none', borderRadius: '10px',
                    color: 'white', fontSize: '13px', fontWeight: 600,
                    cursor: procesando ? 'not-allowed' : 'pointer',
                    opacity: procesando ? 0.6 : 1, fontFamily: 'inherit',
                  }}
                >
                  {procesando ? '⏳ Procesando...' : '✓ CONFIRMAR'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function PasoCheck({ color, emoji, titulo, sub }) {
  return (
    <div style={{
      background: 'var(--color-bg-input)',
      border: '1px solid var(--color-border-subtle)',
      borderLeft: `4px solid ${color}`,
      borderRadius: '10px', padding: '12px 14px',
      display: 'flex', alignItems: 'flex-start', gap: '10px',
    }}>
      <span style={{ fontSize: '20px' }}>{emoji}</span>
      <div>
        <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{titulo}</div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{sub}</div>
      </div>
    </div>
  )
}

function LineaResumen({ aplica, alerta, label, monto }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      padding: '8px 10px', borderRadius: '8px',
      background: alerta ? 'rgba(244, 67, 54, 0.15)' : 'rgba(0,0,0,0.15)',
      opacity: aplica ? 1 : 0.4,
      fontSize: '12px',
    }}>
      <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
      <span style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>RD$ {Number(monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
    </div>
  )
}

function FilaConfirma({ label, valor }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px' }}>
      <span style={{ color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontWeight: 500, color: 'var(--color-text-primary)', textAlign: 'right' }}>{valor}</span>
    </div>
  )
}

export default CalculadoraLiquidacion