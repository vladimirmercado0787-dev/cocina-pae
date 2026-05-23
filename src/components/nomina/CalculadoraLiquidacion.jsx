import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const TIPOS_CONTRATO_INFO = {
  'indefinido': { 
    label: 'Indefinido', 
    icon: '∞',
    color: 'blue',
    explicacion: 'El contrato dura indefinidamente hasta que una de las partes lo termine'
  },
  'obra_servicio': { 
    label: 'Obra/Servicio Determinado', 
    icon: '📑',
    color: 'amber',
    explicacion: 'Contrato con fecha fija de fin (típico en PAE: año escolar)'
  },
  'estacional': { 
    label: 'Estacional', 
    icon: '🍂',
    color: 'orange',
    explicacion: 'Trabajo por temporadas específicas'
  },
}

const RAZONES_SALIDA = [
  { 
    value: 'terminacion_natural', 
    label: '✅ Terminación natural del contrato',
    descripcion: 'El contrato llegó a su fecha fin pactada'
  },
  { 
    value: 'renuncia', 
    label: '👋 Renuncia voluntaria (Art. 87)',
    descripcion: 'El empleado decide dejar el trabajo'
  },
  { 
    value: 'despido_justa', 
    label: '⚠️ Despido con causa justa',
    descripcion: 'Despido por falta grave del empleado'
  },
  { 
    value: 'despido_sin_causa', 
    label: '🚨 Despido sin causa (Art. 75 - Desahucio)',
    descripcion: 'Empleador termina sin razón justificada'
  },
  { 
    value: 'despido_anticipado_obra', 
    label: '🚨 Despido anticipado en obra/servicio',
    descripcion: 'Termina obra/servicio ANTES de la fecha fin (¡puede ser caro!)'
  },
  { 
    value: 'mutuo_acuerdo', 
    label: '🤝 Mutuo acuerdo',
    descripcion: 'Ambas partes acuerdan terminar'
  },
]

function CalculadoraLiquidacion({ empresaId, usuarioActual, onVolver }) {
  const [empresa, setEmpresa] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(null)
  const [razonSalida, setRazonSalida] = useState('')
  const [fechaSalida, setFechaSalida] = useState(new Date().toISOString().split('T')[0])
  const [tipoContrato, setTipoContrato] = useState('indefinido')
  const [fechaInicioContrato, setFechaInicioContrato] = useState('')
  const [fechaFinContrato, setFechaFinContrato] = useState('')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

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
    if (!empleadoId) {
      setEmpleadoSeleccionado(null)
      return
    }
    const emp = empleados.find(e => e.id === empleadoId)
    setEmpleadoSeleccionado(emp)
    
    // Cargar contrato del empleado si tiene
    const { data: contratoData } = await supabase
      .from('contratos')
      .select('*')
      .eq('usuario_id', empleadoId)
      .eq('estado', 'activo')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    
    if (contratoData) {
      setTipoContrato(contratoData.tipo_contrato || 'indefinido')
      setFechaInicioContrato(contratoData.fecha_inicio || '')
      setFechaFinContrato(contratoData.fecha_fin || '')
    } else {
      // Sin contrato digital, usar valores por defecto
      setTipoContrato('indefinido')
      setFechaInicioContrato(emp.fecha_ingreso || '')
      setFechaFinContrato('')
    }
  }

  // ═══════════════════════════════════════════════════
  // 🧮 HELPERS
  // ═══════════════════════════════════════════════════

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

  function salarioDiario(emp) {
    return salarioMensual(emp) / 23.83 // promedio días laborables/mes
  }

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
    return Number(monto || 0).toLocaleString('es-DO', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })
  }

  function formatearFecha(fecha) {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-DO', {
      day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  // ═══════════════════════════════════════════════════
  // ⚖️ CÁLCULOS DE LIQUIDACIÓN
  // ═══════════════════════════════════════════════════

  function calcularLiquidacion() {
    if (!empleadoSeleccionado || !razonSalida || !fechaInicioContrato) {
      return null
    }

    const tiempo = calcularTiempo()
    const salDiario = salarioDiario(empleadoSeleccionado)
    const salMensual = salarioMensual(empleadoSeleccionado)
    
    let result = {
      tiempo,
      salariosDiario: salDiario,
      salariosPendientes: 0,
      regaliaProporcional: 0,
      vacaciones: 0,
      preaviso: 0,
      cesantia: 0,
      salariosFaltantes: 0,
      diasPreaviso: 0,
      diasCesantia: 0,
      diasVacaciones: 0,
      total: 0,
      mesesParaSalariosFaltantes: 0,
      alertas: [],
      aplica: {
        salariosPendientes: false,
        regalia: false,
        vacaciones: false,
        preaviso: false,
        cesantia: false,
        salariosFaltantes: false,
      }
    }

    // ─── 1. SALARIOS PENDIENTES (siempre aplican) ───
    result.salariosPendientes = salDiario * 5 // estimado de 5 días pendientes
    result.aplica.salariosPendientes = true

    // ─── 2. REGALÍA PROPORCIONAL (siempre, si tiene 3+ meses año actual) ───
    const inicioAñoActual = new Date(new Date(fechaSalida).getFullYear(), 0, 1)
    const inicioConteo = new Date(fechaInicioContrato) > inicioAñoActual 
      ? new Date(fechaInicioContrato) 
      : inicioAñoActual
    const mesesEsteAño = Math.max(0, 
      (new Date(fechaSalida) - inicioConteo) / (1000 * 60 * 60 * 24 * 30.44))
    
    if (mesesEsteAño >= 3 || tiempo.totalMeses >= 3) {
      const salariosAñoActual = salMensual * mesesEsteAño
      result.regaliaProporcional = salariosAñoActual / 12
      result.aplica.regalia = true
    } else {
      result.alertas.push('⚠️ Empleado con menos de 3 meses este año: no aplica regalía')
    }

    // ─── 3. VACACIONES (solo si tiene 1+ año) ───
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

    // ─── 4. PREAVISO (solo indefinido + despido sin causa) ───
    if (tipoContrato === 'indefinido' && razonSalida === 'despido_sin_causa') {
      if (tiempo.totalDias >= 30 && tiempo.totalDias < 180) {
        result.diasPreaviso = 7
      } else if (tiempo.totalDias >= 180 && tiempo.totalDias < 365) {
        result.diasPreaviso = 14
      } else if (tiempo.totalDias >= 365) {
        result.diasPreaviso = 28
      }
      result.preaviso = salDiario * result.diasPreaviso
      result.aplica.preaviso = true
    }

    // ─── 5. CESANTÍA (solo indefinido + despido sin causa) ───
    if (tipoContrato === 'indefinido' && razonSalida === 'despido_sin_causa') {
      if (tiempo.totalDias >= 90 && tiempo.totalDias < 180) {
        result.diasCesantia = 6
      } else if (tiempo.totalDias >= 180 && tiempo.totalDias < 365) {
        result.diasCesantia = 13
      } else if (tiempo.años >= 1 && tiempo.años < 5) {
        result.diasCesantia = 21 * tiempo.años
      } else if (tiempo.años >= 5) {
        result.diasCesantia = 23 * tiempo.años
      }
      result.cesantia = salDiario * result.diasCesantia
      result.aplica.cesantia = true
    }

    // ─── 6. SALARIOS FALTANTES (Art. 95 - obra/servicio con despido anticipado) ───
    if (tipoContrato === 'obra_servicio' && razonSalida === 'despido_anticipado_obra' && fechaFinContrato) {
      const finContrato = new Date(fechaFinContrato)
      const salida = new Date(fechaSalida)
      
      if (salida < finContrato) {
        const diffMs = finContrato - salida
        const mesesFaltantes = diffMs / (1000 * 60 * 60 * 24 * 30.44)
        result.mesesParaSalariosFaltantes = Math.round(mesesFaltantes * 10) / 10
        result.salariosFaltantes = salMensual * mesesFaltantes
        result.aplica.salariosFaltantes = true
        result.alertas.push(
          `🚨 ALERTA: Debes pagar ${result.mesesParaSalariosFaltantes} meses de salario por terminar el contrato anticipadamente (Art. 95)`
        )
      }
    }

    // Total
    result.total = result.salariosPendientes + 
                  result.regaliaProporcional + 
                  result.vacaciones + 
                  result.preaviso + 
                  result.cesantia + 
                  result.salariosFaltantes

    // Alertas adicionales según razón
    if (razonSalida === 'renuncia') {
      result.alertas.push('ℹ️ En renuncia voluntaria solo aplica regalía proporcional y vacaciones acumuladas')
    }
    if (razonSalida === 'despido_justa') {
      result.alertas.push('ℹ️ Despido con causa justa: solo aplican prestaciones mínimas (regalía y vacaciones acumuladas)')
    }
    if (razonSalida === 'terminacion_natural' && tipoContrato === 'obra_servicio') {
      result.alertas.push('✅ Terminación natural de obra/servicio: NO genera cesantía ni preaviso. Buena planificación.')
    }

    return result
  }

  function generarCartaLiquidacion() {
    const liq = calcularLiquidacion()
    if (!liq) {
      alert('Completa todos los datos primero')
      return
    }

    const empleadoNombre = empleadoSeleccionado.nombre
    const empresaNombre = empresa?.nombre || 'La Empresa'
    const fechaHoy = new Date().toLocaleDateString('es-DO', {
      day: 'numeric', month: 'long', year: 'numeric'
    })

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

    // Abrir nueva ventana con la carta
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
            <button onclick="window.print()" style="padding: 10px 30px; background: #DC2626; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: bold;">
              🖨️ Imprimir carta
            </button>
          </div>
        </body>
      </html>
    `)
  }

  const liquidacion = empleadoSeleccionado && razonSalida ? calcularLiquidacion() : null

  if (cargando) {
    return (
      <div className="w-full max-w-5xl">
        <div className="text-center py-12 text-gray-500">⏳ Cargando calculadora...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl">

      {/* HEADER */}
      <div className="bg-gradient-to-br from-purple-700 to-purple-900 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <p className="text-purple-200 text-xs font-semibold tracking-wider">
              CALCULADORA LEGAL
            </p>
            <h2 className="text-3xl font-bold mt-1">
              ⚖️ Liquidación de Empleado
            </h2>
            <p className="text-purple-200 mt-1 text-sm">
              Calcula prestaciones laborales según ley dominicana
            </p>
          </div>
          <button
            onClick={onVolver}
            className="bg-purple-800 hover:bg-purple-900 text-white text-sm px-4 py-2 rounded-lg"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* AVISO LEGAL */}
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-4 mb-6">
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚠️</span>
          <div>
            <p className="font-bold text-yellow-900 text-sm">
              IMPORTANTE: Esta es una calculadora orientativa
            </p>
            <p className="text-xs text-yellow-800 mt-1">
              Los cálculos son aproximados según la ley dominicana. Para liquidaciones 
              reales se recomienda consultar con un abogado laboral. Los montos pueden 
              variar según situaciones específicas.
            </p>
          </div>
        </div>
      </div>

      {/* PASO 1: SELECCIONAR EMPLEADO */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
          PASO 1 — SELECCIONAR EMPLEADO
        </p>
        
        <select
          value={empleadoSeleccionado?.id || ''}
          onChange={(e) => onEmpleadoChange(e.target.value)}
          className="w-full px-3 py-3 border border-gray-300 rounded-lg text-base font-semibold"
        >
          <option value="">-- Selecciona un empleado --</option>
          {empleados.map(e => (
            <option key={e.id} value={e.id}>
              {e.nombre} - {e.rol?.replace('_', ' ')}
            </option>
          ))}
        </select>

        {empleadoSeleccionado && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Tipo de contrato
              </label>
              <select
                value={tipoContrato}
                onChange={(e) => setTipoContrato(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="indefinido">∞ Indefinido</option>
                <option value="obra_servicio">📑 Obra/Servicio</option>
                <option value="estacional">🍂 Estacional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Sueldo mensual
              </label>
              <p className="px-3 py-2 bg-gray-100 rounded-lg text-sm font-bold">
                RD$ {formatearMoneda(salarioMensual(empleadoSeleccionado))}
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Fecha inicio contrato
              </label>
              <input
                type="date"
                value={fechaInicioContrato}
                onChange={(e) => setFechaInicioContrato(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            {tipoContrato === 'obra_servicio' && (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Fecha fin contrato
                </label>
                <input
                  type="date"
                  value={fechaFinContrato}
                  onChange={(e) => setFechaFinContrato(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* PASO 2: RAZÓN DE SALIDA */}
      {empleadoSeleccionado && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
            PASO 2 — RAZÓN DE LA SALIDA
          </p>
          
          <div className="space-y-2">
            {RAZONES_SALIDA.map(r => (
              <label 
                key={r.value}
                className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition border-2 ${
                  razonSalida === r.value 
                    ? 'bg-purple-50 border-purple-500' 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="razon"
                  value={r.value}
                  checked={razonSalida === r.value}
                  onChange={(e) => setRazonSalida(e.target.value)}
                  className="mt-1"
                />
                <div>
                  <p className="font-bold text-gray-900 text-sm">{r.label}</p>
                  <p className="text-xs text-gray-600">{r.descripcion}</p>
                </div>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* PASO 3: FECHA SALIDA */}
      {razonSalida && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
            PASO 3 — FECHA DE SALIDA
          </p>
          
          <input
            type="date"
            value={fechaSalida}
            onChange={(e) => setFechaSalida(e.target.value)}
            className="w-full md:w-auto px-3 py-2 border border-gray-300 rounded-lg text-base font-semibold"
          />
        </div>
      )}

      {/* RESULTADO */}
      {liquidacion && (
        <>
          <div className="bg-gradient-to-br from-purple-600 to-purple-800 rounded-2xl shadow-xl p-6 mb-6 text-white">
            <p className="text-xs text-purple-200 font-semibold tracking-wider mb-3">
              💰 RESUMEN DE LIQUIDACIÓN
            </p>
            
            <div className="bg-white/10 rounded-xl p-3 mb-4 text-sm">
              <p>
                <strong>Tiempo trabajado:</strong> {liquidacion.tiempo.años} años, 
                {' '}{liquidacion.tiempo.meses} meses, {liquidacion.tiempo.dias} días
                {' '}({liquidacion.tiempo.totalDias} días totales)
              </p>
              <p>
                <strong>Salario diario:</strong> RD$ {formatearMoneda(liquidacion.salariosDiario)}
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <div className={`flex justify-between p-2 rounded ${liquidacion.aplica.salariosPendientes ? 'bg-white/10' : 'opacity-50'}`}>
                <span>1. Salarios pendientes (5 días estimados)</span>
                <span className="font-bold">RD$ {formatearMoneda(liquidacion.salariosPendientes)}</span>
              </div>
              <div className={`flex justify-between p-2 rounded ${liquidacion.aplica.regalia ? 'bg-white/10' : 'opacity-50'}`}>
                <span>2. Regalía proporcional</span>
                <span className="font-bold">RD$ {formatearMoneda(liquidacion.regaliaProporcional)}</span>
              </div>
              <div className={`flex justify-between p-2 rounded ${liquidacion.aplica.vacaciones ? 'bg-white/10' : 'opacity-50'}`}>
                <span>3. Vacaciones ({liquidacion.diasVacaciones} días)</span>
                <span className="font-bold">RD$ {formatearMoneda(liquidacion.vacaciones)}</span>
              </div>
              <div className={`flex justify-between p-2 rounded ${liquidacion.aplica.preaviso ? 'bg-white/10' : 'opacity-50'}`}>
                <span>4. Preaviso ({liquidacion.diasPreaviso} días)</span>
                <span className="font-bold">RD$ {formatearMoneda(liquidacion.preaviso)}</span>
              </div>
              <div className={`flex justify-between p-2 rounded ${liquidacion.aplica.cesantia ? 'bg-white/10' : 'opacity-50'}`}>
                <span>5. Cesantía ({liquidacion.diasCesantia} días)</span>
                <span className="font-bold">RD$ {formatearMoneda(liquidacion.cesantia)}</span>
              </div>
              {liquidacion.salariosFaltantes > 0 && (
                <div className="flex justify-between p-2 rounded bg-red-500/30">
                  <span>🚨 6. Salarios faltantes ({liquidacion.mesesParaSalariosFaltantes} meses)</span>
                  <span className="font-bold">RD$ {formatearMoneda(liquidacion.salariosFaltantes)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 pt-4 border-t-2 border-white/30">
              <div className="flex justify-between items-center">
                <p className="text-lg font-bold">TOTAL A PAGAR:</p>
                <p className="text-3xl font-bold">RD$ {formatearMoneda(liquidacion.total)}</p>
              </div>
            </div>
          </div>

          {/* ALERTAS */}
          {liquidacion.alertas.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-6">
              <p className="text-xs text-blue-800 font-semibold tracking-wider mb-2">
                📋 NOTAS Y ALERTAS
              </p>
              <div className="space-y-1 text-sm text-blue-900">
                {liquidacion.alertas.map((alerta, i) => (
                  <p key={i}>{alerta}</p>
                ))}
              </div>
            </div>
          )}

          {/* BOTÓN GENERAR CARTA */}
          <div className="text-center">
            <button
              onClick={generarCartaLiquidacion}
              className="bg-purple-700 hover:bg-purple-800 text-white font-bold px-8 py-4 rounded-xl shadow-lg text-lg"
            >
              📄 Generar carta de liquidación
            </button>
            <p className="text-xs text-gray-500 mt-2">
              Abre en nueva ventana para imprimir
            </p>
          </div>
        </>
      )}

    </div>
  )
}

export default CalculadoraLiquidacion