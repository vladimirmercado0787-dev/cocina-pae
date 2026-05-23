import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalPagarQuincena from './ModalPagarQuincena'
import VistaHistorialNomina from './VistaHistorialNomina'

function VistaNomina({ usuario, empresaId, onVolver }) {
  const [empresa, setEmpresa] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [pagosMesActual, setPagosMesActual] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalPagoAbierto, setModalPagoAbierto] = useState(false)
  const [verHistorial, setVerHistorial] = useState(false)
  const [mensajeExito, setMensajeExito] = useState('')

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)

    const { data: empresaData } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single()
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

    const ahora = new Date()
    const año = ahora.getFullYear()
    const mes = ahora.getMonth() + 1

    const { data: pagosData } = await supabase
      .from('pagos_nomina')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('año', año)
      .eq('mes', mes)
      .order('fecha_pago', { ascending: false })
    setPagosMesActual(pagosData || [])

    setCargando(false)
  }

  function mostrarExito(msg) {
    setMensajeExito(msg)
    setTimeout(() => setMensajeExito(''), 4000)
  }

  function onPagoExitoso() {
    setModalPagoAbierto(false)
    mostrarExito('✅ Pago procesado correctamente y registrado en el historial')
    cargarDatos()
  }

  // ═══════════════════════════════════════════════════
  // 🧮 HELPERS DE CÁLCULO
  // ═══════════════════════════════════════════════════

  function salarioNetoQuincenal(empleado) {
    const sueldo = parseFloat(empleado.sueldo || 0)
    const freq = empleado.frecuencia_pago
    if (freq === 'mes') return sueldo / 2
    if (freq === 'quincena') return sueldo
    if (freq === 'semana') return sueldo * 2.165
    if (freq === 'dia') return sueldo * 11
    return sueldo
  }

  function calcularBruto(neto, porcentajeDescuento) {
    const factor = 1 - (parseFloat(porcentajeDescuento || 5.74) / 100)
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

      if (dia <= dia1) {
        const fechaPago = new Date(año, mes - 1, dia1)
        return {
          tipo_periodo: 'quincenal_1',
          año, mes,
          label: `1ra quincena de ${nombreMes(mes)} ${año}`,
          fecha_inicio: new Date(año, mes - 1, 1),
          fecha_fin: new Date(año, mes - 1, 15),
          fecha_pago: fechaPago,
        }
      }

      if (dia <= dia2) {
        const fechaPago = new Date(año, mes - 1, dia2)
        return {
          tipo_periodo: 'quincenal_2',
          año, mes,
          label: `2da quincena de ${nombreMes(mes)} ${año}`,
          fecha_inicio: new Date(año, mes - 1, 16),
          fecha_fin: new Date(año, mes, 0),
          fecha_pago: fechaPago,
        }
      }

      const mesSig = mes === 12 ? 1 : mes + 1
      const añoSig = mes === 12 ? año + 1 : año
      const fechaPago = new Date(añoSig, mesSig - 1, dia1)
      return {
        tipo_periodo: 'quincenal_1',
        año: añoSig, mes: mesSig,
        label: `1ra quincena de ${nombreMes(mesSig)} ${añoSig}`,
        fecha_inicio: new Date(añoSig, mesSig - 1, 1),
        fecha_fin: new Date(añoSig, mesSig - 1, 15),
        fecha_pago: fechaPago,
      }
    }

    if (frecuencia === 'mensual') {
      const diaP = empresa.nomina_dia_pago_1 || 30
      if (dia <= diaP) {
        const fechaPago = new Date(año, mes - 1, diaP)
        return {
          tipo_periodo: 'mensual',
          año, mes,
          label: `${nombreMes(mes)} ${año}`,
          fecha_inicio: new Date(año, mes - 1, 1),
          fecha_fin: new Date(año, mes, 0),
          fecha_pago: fechaPago,
        }
      }
      const mesSig = mes === 12 ? 1 : mes + 1
      const añoSig = mes === 12 ? año + 1 : año
      const fechaPago = new Date(añoSig, mesSig - 1, diaP)
      return {
        tipo_periodo: 'mensual',
        año: añoSig, mes: mesSig,
        label: `${nombreMes(mesSig)} ${añoSig}`,
        fecha_inicio: new Date(añoSig, mesSig - 1, 1),
        fecha_fin: new Date(añoSig, mesSig, 0),
        fecha_pago: fechaPago,
      }
    }

    if (frecuencia === 'semanal') {
      const proximoViernes = new Date(hoy)
      const diasHastaViernes = (5 - hoy.getDay() + 7) % 7 || 7
      proximoViernes.setDate(hoy.getDate() + diasHastaViernes)
      return {
        tipo_periodo: 'semanal',
        año: proximoViernes.getFullYear(),
        mes: proximoViernes.getMonth() + 1,
        label: `Semana del ${proximoViernes.getDate()} de ${nombreMes(proximoViernes.getMonth() + 1)}`,
        fecha_inicio: new Date(proximoViernes.getTime() - 6 * 86400000),
        fecha_fin: proximoViernes,
        fecha_pago: proximoViernes,
      }
    }

    return null
  }

  function nombreMes(mes) {
    const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return nombres[mes - 1] || ''
  }

  function diasFaltantes(fechaPago) {
    const hoy = new Date()
    hoy.setHours(0, 0, 0, 0)
    const pago = new Date(fechaPago)
    pago.setHours(0, 0, 0, 0)
    const diffMs = pago - hoy
    const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24))
    return dias
  }

  function formatearFecha(fecha) {
    return new Date(fecha).toLocaleDateString('es-DO', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    })
  }

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', { 
      minimumFractionDigits: 2, maximumFractionDigits: 2 
    })
  }

  function obtenerAvatar(emp) {
    if (emp.foto_url) return null
    if (emp.sexo === 'hombre') return '👨'
    if (emp.sexo === 'mujer') return '👩'
    return emp.nombre?.charAt(0)?.toUpperCase() || '?'
  }

  function avisarProximamente(funcion) {
    alert(`⏳ ${funcion}\n\nEsta funcionalidad se construirá en la próxima fase del módulo.`)
  }

  // ═══════════════════════════════════════════════════
  // 🧮 CÁLCULOS PARA UI
  // ═══════════════════════════════════════════════════

  const proximoPeriodo = empresa ? calcularProximoPeriodo() : null
  const descuentoPct = parseFloat(empresa?.nomina_descuento_porcentaje || 5.74)

  const periodoYaPagado = proximoPeriodo 
    ? pagosMesActual.some(p => 
        p.tipo_periodo === proximoPeriodo.tipo_periodo &&
        p.año === proximoPeriodo.año &&
        p.mes === proximoPeriodo.mes &&
        p.estado === 'pagado'
      )
    : false

  const totalNetoProximo = empleados.reduce((sum, emp) => 
    sum + salarioNetoQuincenal(emp), 0)
  
  const totalBrutoProximo = empleados.reduce((sum, emp) => {
    const neto = salarioNetoQuincenal(emp)
    return sum + calcularBruto(neto, descuentoPct)
  }, 0)

  const totalAportes = totalBrutoProximo - totalNetoProximo

  const multiplicadorMes = empresa?.nomina_frecuencia === 'quincenal' ? 2 :
                          empresa?.nomina_frecuencia === 'semanal' ? 4.33 :
                          empresa?.nomina_frecuencia === 'mensual' ? 1 : 2
  const totalMensualNeto = totalNetoProximo * multiplicadorMes
  const totalMensualBruto = totalBrutoProximo * multiplicadorMes
  const totalMensualAportes = totalAportes * multiplicadorMes

  // ═══════════════════════════════════════════════════
  // 🎨 RENDER
  // ═══════════════════════════════════════════════════

  // Si está viendo el historial, mostramos esa vista
  if (verHistorial) {
    return (
      <VistaHistorialNomina 
        empresaId={empresaId}
        onVolver={() => setVerHistorial(false)}
      />
    )
  }

  if (cargando) {
    return (
      <div className="w-full max-w-5xl">
        <div className="text-center py-12 text-gray-500">⏳ Cargando nómina...</div>
      </div>
    )
  }

  const labelFrecuencia = empresa?.nomina_frecuencia === 'quincenal' ? 'quincena' :
                         empresa?.nomina_frecuencia === 'semanal' ? 'semana' :
                         empresa?.nomina_frecuencia === 'mensual' ? 'mes' : 'período'

  return (
    <div className="w-full max-w-5xl">

      {/* Toast de éxito */}
      {mensajeExito && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl z-[60] animate-pulse">
          {mensajeExito}
        </div>
      )}

      {/* Modal de Pagar Quincena */}
      {modalPagoAbierto && proximoPeriodo && (
        <ModalPagarQuincena
          empresa={empresa}
          empleados={empleados}
          periodo={proximoPeriodo}
          usuarioActual={usuario}
          onCerrar={() => setModalPagoAbierto(false)}
          onPagoExitoso={onPagoExitoso}
        />
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-br from-pink-600 to-rose-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-pink-100 text-xs font-semibold tracking-wider">
              GESTIÓN DE NÓMINA
            </p>
            <h2 className="text-3xl font-bold mt-1">
              💰 Nómina
            </h2>
            <p className="text-pink-200 mt-1">
              {empresa?.nombre} · {nombreMes(new Date().getMonth() + 1)} {new Date().getFullYear()}
            </p>
          </div>
          <button
            onClick={onVolver}
            className="bg-pink-800 hover:bg-pink-900 text-white text-sm px-4 py-2 rounded-lg"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* ALERTA: SI NO HAY EMPLEADOS */}
      {empleados.length === 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6 mb-6 text-center">
          <p className="text-4xl mb-2">⚠️</p>
          <h3 className="font-bold text-yellow-900 text-lg mb-2">
            No hay empleados con sueldo configurado
          </h3>
          <p className="text-yellow-800 text-sm mb-3">
            Para usar el módulo de nómina, primero debes registrar empleados activos 
            y configurar su sueldo en el módulo de Empleados.
          </p>
          <p className="text-xs text-yellow-700">
            💡 Ve a Empleados → editar empleado → configurar sueldo y frecuencia.
          </p>
        </div>
      )}

      {empleados.length > 0 && (
        <>
          {/* PRÓXIMA QUINCENA */}
          {proximoPeriodo && (
            <div className={`rounded-2xl p-6 mb-6 text-white shadow-xl ${
              periodoYaPagado 
                ? 'bg-gradient-to-br from-green-500 to-emerald-600'
                : 'bg-gradient-to-br from-blue-600 to-indigo-700'
            }`}>
              <div className="flex justify-between items-start flex-wrap gap-4">
                <div className="flex-1 min-w-[280px]">
                  <p className="text-xs opacity-80 tracking-wider mb-1">
                    {periodoYaPagado ? '✅ ÚLTIMO PAGO PROCESADO' : '📅 PRÓXIMA QUINCENA A PAGAR'}
                  </p>
                  <h3 className="text-2xl font-bold">
                    {proximoPeriodo.label}
                  </h3>
                  <p className="text-sm opacity-90 mt-1">
                    📆 Fecha de pago: {formatearFecha(proximoPeriodo.fecha_pago)}
                  </p>
                  {!periodoYaPagado && (
                    <p className="text-sm font-bold mt-2 bg-white/20 inline-block px-3 py-1 rounded-full">
                      ⏰ Faltan {diasFaltantes(proximoPeriodo.fecha_pago)} días
                    </p>
                  )}
                </div>
                
                <div className="text-right">
                  <p className="text-xs opacity-80 mb-1">TOTAL NETO</p>
                  <p className="text-3xl font-bold">
                    RD$ {formatearMoneda(totalNetoProximo)}
                  </p>
                  <p className="text-xs opacity-90 mt-1">
                    Bruto: RD$ {formatearMoneda(totalBrutoProximo)}
                  </p>
                  <p className="text-xs opacity-90">
                    {empleados.length} empleado{empleados.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>

              {!periodoYaPagado && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <button
                    onClick={() => setModalPagoAbierto(true)}
                    className="bg-white hover:bg-gray-100 text-blue-700 font-bold px-6 py-3 rounded-xl shadow-lg w-full md:w-auto"
                  >
                    💸 Pagar esta {labelFrecuencia}
                  </button>
                </div>
              )}

              {periodoYaPagado && (
                <div className="mt-4 pt-4 border-t border-white/20">
                  <p className="text-sm text-white/90">
                    ✅ Este período ya fue procesado y pagado.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* RESUMEN MENSUAL */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
              📊 RESUMEN MENSUAL ESTIMADO
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-xs text-green-700 font-semibold tracking-wider mb-1">TOTAL NETO</p>
                <p className="text-xl font-bold text-green-900">
                  RD$ {formatearMoneda(totalMensualNeto)}
                </p>
                <p className="text-xs text-green-600 mt-1">a empleados</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-700 font-semibold tracking-wider mb-1">TOTAL BRUTO</p>
                <p className="text-xl font-bold text-blue-900">
                  RD$ {formatearMoneda(totalMensualBruto)}
                </p>
                <p className="text-xs text-blue-600 mt-1">incluye aportes</p>
              </div>

              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
                <p className="text-xs text-purple-700 font-semibold tracking-wider mb-1">APORTES</p>
                <p className="text-xl font-bold text-purple-900">
                  RD$ {formatearMoneda(totalMensualAportes)}
                </p>
                <p className="text-xs text-purple-600 mt-1">TSS + AFP ({descuentoPct}%)</p>
              </div>

              <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                <p className="text-xs text-pink-700 font-semibold tracking-wider mb-1">EMPLEADOS</p>
                <p className="text-xl font-bold text-pink-900">
                  {empleados.length}
                </p>
                <p className="text-xs text-pink-600 mt-1">en nómina activa</p>
              </div>

            </div>
          </div>

          {/* LISTA DE EMPLEADOS */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
              👥 EMPLEADOS EN NÓMINA
            </p>
            <div className="space-y-2">
              {empleados.map(emp => {
                const netoQ = salarioNetoQuincenal(emp)
                const brutoQ = calcularBruto(netoQ, descuentoPct)
                const aporteQ = brutoQ - netoQ

                return (
                  <div 
                    key={emp.id} 
                    className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition flex items-center gap-4"
                  >
                    <div className="w-12 h-12 rounded-full bg-pink-100 flex items-center justify-center text-2xl flex-shrink-0">
                      {emp.foto_url ? (
                        <img src={emp.foto_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                      ) : (
                        obtenerAvatar(emp)
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900">{emp.nombre}</p>
                      <p className="text-xs text-gray-600 capitalize">
                        {emp.rol?.replace('_', ' ')}
                        {emp.frecuencia_pago && ` · pago ${emp.frecuencia_pago}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        Neto/{labelFrecuencia}
                      </p>
                      <p className="text-lg font-bold text-green-700">
                        RD$ {formatearMoneda(netoQ)}
                      </p>
                      <p className="text-xs text-gray-500">
                        Bruto: RD$ {formatearMoneda(brutoQ)} · 
                        Aporte: RD$ {formatearMoneda(aporteQ)}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {/* HERRAMIENTAS */}
          <div className="bg-white rounded-2xl shadow-xl p-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
              ⚖️ HERRAMIENTAS
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              
              <button
                onClick={() => setVerHistorial(true)}
                className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold px-4 py-3 rounded-xl flex items-center gap-3 border border-slate-200"
              >
                <span className="text-2xl">📜</span>
                <div className="text-left">
                  <p className="font-bold">Historial de pagos</p>
                  <p className="text-xs text-slate-600">Ver pagos anteriores</p>
                </div>
              </button>

              <button
                onClick={() => avisarProximamente('Bonificaciones Extra')}
                className="bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold px-4 py-3 rounded-xl flex items-center gap-3 border border-amber-200"
              >
                <span className="text-2xl">🎁</span>
                <div className="text-left">
                  <p className="font-bold">Bonificaciones extra</p>
                  <p className="text-xs">Bonos navideños, productividad...</p>
                </div>
              </button>

              <button
                onClick={() => avisarProximamente('Proyección de Regalía Pascual')}
                className="bg-red-50 hover:bg-red-100 text-red-900 font-bold px-4 py-3 rounded-xl flex items-center gap-3 border border-red-200"
              >
                <span className="text-2xl">🎄</span>
                <div className="text-left">
                  <p className="font-bold">Regalía Pascual</p>
                  <p className="text-xs">Proyección de Diciembre</p>
                </div>
              </button>

              <button
                onClick={() => avisarProximamente('Calculadora de Liquidación')}
                className="bg-purple-50 hover:bg-purple-100 text-purple-900 font-bold px-4 py-3 rounded-xl flex items-center gap-3 border border-purple-200"
              >
                <span className="text-2xl">⚖️</span>
                <div className="text-left">
                  <p className="font-bold">Calculadora de Liquidación</p>
                  <p className="text-xs">Para terminaciones de contrato</p>
                </div>
              </button>

            </div>
          </div>
        </>
      )}

    </div>
  )
}

export default VistaNomina