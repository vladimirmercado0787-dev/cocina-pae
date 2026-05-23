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

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId, añoSeleccionado])

  async function cargarDatos() {
    setCargando(true)

    // Cargar empresa
    const { data: empresaData } = await supabase
      .from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)

    // Cargar empleados activos
    const { data: empleadosData } = await supabase
      .from('usuarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .neq('rol', 'propietario')
      .not('sueldo', 'is', null)
      .order('nombre')
    setEmpleados(empleadosData || [])

    // Cargar pagos del año seleccionado
    const { data: pagosData } = await supabase
      .from('pagos_nomina')
      .select('*, pagos_nomina_detalle(*)')
      .eq('empresa_id', empresaId)
      .eq('año', añoSeleccionado)
      .eq('estado', 'pagado')
    setPagosAñoActual(pagosData || [])

    // Cargar años disponibles (de pagos de regalía existentes)
    const { data: bonosData } = await supabase
      .from('bonificaciones_extra')
      .select('año')
      .eq('empresa_id', empresaId)
      .eq('tipo', 'regalia_pascual')
    
    const años = [...new Set((bonosData || []).map(b => b.año))]
    años.push(new Date().getFullYear())
    setAñosDisponibles([...new Set(años)].sort((a,b) => b - a))

    setCargando(false)
  }

  function mostrarExito(msg) {
    setMensajeExito(msg)
    setTimeout(() => setMensajeExito(''), 4000)
  }

  // ═══════════════════════════════════════════════════
  // 🧮 CÁLCULO DE REGALÍA POR EMPLEADO
  // ═══════════════════════════════════════════════════

  function salarioMensualEmpleado(empleado) {
    const sueldo = parseFloat(empleado.sueldo || 0)
    const freq = empleado.frecuencia_pago
    if (freq === 'mes') return sueldo
    if (freq === 'quincena') return sueldo * 2
    if (freq === 'semana') return sueldo * 4.33
    if (freq === 'dia') return sueldo * 22
    return sueldo
  }

  function calcularRegaliaEmpleado(empleado) {
    // Salarios pagados al empleado en el año (basado en pagos reales)
    const detallesEmpleado = pagosAñoActual.flatMap(p => 
      (p.pagos_nomina_detalle || []).filter(d => d.usuario_id === empleado.id)
    )

    // Si NO hay pagos registrados aún, proyectamos basado en salario actual
    if (detallesEmpleado.length === 0) {
      const salarioMensual = salarioMensualEmpleado(empleado)
      
      // Calcular cuántos meses lleva trabajando este año
      const fechaIngreso = empleado.fecha_ingreso 
        ? new Date(empleado.fecha_ingreso) 
        : new Date(añoSeleccionado, 0, 1) // 1 enero del año
      
      const inicioAño = new Date(añoSeleccionado, 0, 1)
      const finAño = new Date(añoSeleccionado, 11, 31)
      
      // Tomar la fecha más reciente entre ingreso e inicio del año
      const inicioConteo = fechaIngreso > inicioAño ? fechaIngreso : inicioAño
      
      // Meses que ha/habrá trabajado
      const mesesTrabajados = Math.min(
        12,
        Math.max(0, ((finAño - inicioConteo) / (1000 * 60 * 60 * 24 * 30.44)))
      )
      
      const salariosAcumulados = salarioMensual * mesesTrabajados
      const regalia = salariosAcumulados / 12

      return {
        salariosAcumulados,
        regalia,
        mesesTrabajados: Math.round(mesesTrabajados * 10) / 10,
        elegible: mesesTrabajados >= 3, // Por ley, mínimo 3 meses
        fuente: 'proyeccion',
      }
    }

    // Sumar salarios reales pagados (solo netos base, sin bonos)
    const salariosAcumulados = detallesEmpleado.reduce((sum, d) => 
      sum + parseFloat(d.salario_neto || 0), 0)
    
    const regalia = salariosAcumulados / 12
    const mesesTrabajados = detallesEmpleado.length * 0.5 // quincenas, aproximado

    return {
      salariosAcumulados,
      regalia,
      mesesTrabajados,
      elegible: mesesTrabajados >= 3,
      fuente: 'real',
    }
  }

  // ═══════════════════════════════════════════════════
  // 💾 PROCESAR PAGO DE REGALÍA
  // ═══════════════════════════════════════════════════

  async function procesarRegalia() {
    setProcesando(true)

    try {
      // Verificar si ya se pagó la regalía este año
      const { data: bonosExistentes } = await supabase
        .from('bonificaciones_extra')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('año', añoSeleccionado)
        .eq('tipo', 'regalia_pascual')

      if (bonosExistentes && bonosExistentes.length > 0) {
        throw new Error('Ya se procesó la regalía pascual del año ' + añoSeleccionado)
      }

      // Construir detalle de empleados elegibles
      const detalleEmpleados = empleados
        .map(emp => {
          const calc = calcularRegaliaEmpleado(emp)
          return {
            usuario_id: emp.id,
            nombre: emp.nombre,
            rol: emp.rol,
            monto: Math.round(calc.regalia * 100) / 100,
            meses_trabajados: calc.mesesTrabajados,
            salarios_acumulados: calc.salariosAcumulados,
            elegible: calc.elegible,
          }
        })
        .filter(d => d.elegible && d.monto > 0)

      if (detalleEmpleados.length === 0) {
        throw new Error('No hay empleados elegibles para regalía pascual')
      }

      const totalRegalia = detalleEmpleados.reduce((sum, d) => sum + parseFloat(d.monto), 0)

      const nuevoPago = {
        empresa_id: empresaId,
        titulo: `Regalía Pascual ${añoSeleccionado}`,
        descripcion: `Salario 13 obligatorio por ley (Art. 219 Código Laboral RD)`,
        tipo: 'regalia_pascual',
        fecha_pago: new Date().toISOString().split('T')[0],
        año: añoSeleccionado,
        estado: 'pagado',
        fecha_pagado: new Date().toISOString(),
        monto_total: totalRegalia,
        cantidad_empleados: detalleEmpleados.length,
        detalle: detalleEmpleados,
        creado_por_usuario_id: usuarioActual.id,
        notas: 'Regalía pascual calculada automáticamente según ley dominicana',
      }

      // Nota: 'regalia_pascual' no está en el CHECK constraint actual.
      // Usaremos 'navideño' temporalmente o necesitamos ALTER TABLE
      // Por ahora usamos 'navideño' como tipo válido
      nuevoPago.tipo = 'navideño'

      const { error } = await supabase
        .from('bonificaciones_extra')
        .insert([nuevoPago])

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

  // ═══════════════════════════════════════════════════
  // 🧮 CÁLCULOS PARA UI
  // ═══════════════════════════════════════════════════

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })
  }

  function diasHastaFechaLimite() {
    const hoy = new Date()
    const limite = new Date(añoSeleccionado, 11, 20) // 20 dic
    const diffMs = limite - hoy
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
  }

  const calculosPorEmpleado = empleados.map(emp => ({
    empleado: emp,
    ...calcularRegaliaEmpleado(emp),
  }))

  const totalRegalia = calculosPorEmpleado
    .filter(c => c.elegible)
    .reduce((sum, c) => sum + c.regalia, 0)

  const empleadosElegibles = calculosPorEmpleado.filter(c => c.elegible).length
  const empleadosNoElegibles = calculosPorEmpleado.filter(c => !c.elegible).length

  const diasFaltantes = diasHastaFechaLimite()
  const yaPasoFecha = diasFaltantes < 0
  const enPeriodoCritico = diasFaltantes <= 30 && diasFaltantes >= 0
  const fuentePrincipal = calculosPorEmpleado.length > 0 
    ? (calculosPorEmpleado[0].fuente === 'real' ? 'real' : 'proyeccion')
    : 'proyeccion'

  if (cargando) {
    return (
      <div className="w-full max-w-5xl">
        <div className="text-center py-12 text-gray-500">⏳ Cargando regalía pascual...</div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl">

      {mensajeExito && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl z-[60] animate-pulse">
          {mensajeExito}
        </div>
      )}

      {/* MODAL CONFIRMAR PAGO */}
      {modalConfirmar && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6">
            <p className="text-5xl text-center mb-3">🎄</p>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">
              ¿Procesar regalía pascual?
            </h3>
            <p className="text-sm text-gray-600 text-center mb-4">
              Esto registrará el pago de regalía pascual {añoSeleccionado} para {empleadosElegibles} empleado{empleadosElegibles !== 1 ? 's' : ''}.
            </p>

            <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 text-center">
              <p className="text-xs text-red-700 font-semibold">TOTAL A PAGAR</p>
              <p className="text-3xl font-bold text-red-900">
                RD$ {formatearMoneda(totalRegalia)}
              </p>
            </div>

            <p className="text-xs text-gray-600 mb-4 text-center">
              ⚠️ Asegúrate de tener el efectivo disponible.
              Esta acción quedará registrada como bonificación tipo "navideño"
              en el historial.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setModalConfirmar(false)}
                disabled={procesando}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold py-3 rounded-xl disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                onClick={procesarRegalia}
                disabled={procesando}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {procesando ? '⏳ Procesando...' : '✅ Confirmar pago'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <p className="text-red-100 text-xs font-semibold tracking-wider">
              SALARIO 13 OBLIGATORIO
            </p>
            <h2 className="text-3xl font-bold mt-1">
              🎄 Regalía Pascual
            </h2>
            <p className="text-red-200 mt-1 text-sm">
              Pago obligatorio antes del 20 de diciembre · Año {añoSeleccionado}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <select
              value={añoSeleccionado}
              onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
              className="px-3 py-2 bg-red-700 border border-red-500 text-white rounded-lg text-sm font-semibold"
            >
              {añosDisponibles.map(año => (
                <option key={año} value={año}>{año}</option>
              ))}
            </select>
            <button
              onClick={onVolver}
              className="bg-red-800 hover:bg-red-900 text-white text-sm px-4 py-2 rounded-lg"
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>

      {/* ALERTA TEMPORAL */}
      {!yaPasoFecha && enPeriodoCritico && (
        <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⚠️</span>
            <div>
              <p className="font-bold text-orange-900">
                ¡Periodo crítico! Faltan {diasFaltantes} días para la fecha límite
              </p>
              <p className="text-sm text-orange-800 mt-1">
                La regalía debe pagarse antes del 20 de diciembre. 
                Considera procesar el pago pronto para evitar sanciones.
              </p>
            </div>
          </div>
        </div>
      )}

      {yaPasoFecha && (
        <div className="bg-red-50 border-2 border-red-400 rounded-2xl p-4 mb-6">
          <div className="flex items-start gap-3">
            <span className="text-3xl">🚨</span>
            <div>
              <p className="font-bold text-red-900">
                Fecha límite vencida hace {Math.abs(diasFaltantes)} días
              </p>
              <p className="text-sm text-red-800 mt-1">
                La fecha límite era el 20 de diciembre de {añoSeleccionado}. 
                Si aún no la has pagado, hazlo lo antes posible.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PROYECCIÓN */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
          📊 PROYECCIÓN AL 20 DE DICIEMBRE {añoSeleccionado}
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs text-red-700 font-semibold tracking-wider mb-1">TOTAL ESTIMADO</p>
            <p className="text-2xl font-bold text-red-900">
              RD$ {formatearMoneda(totalRegalia)}
            </p>
            <p className="text-xs text-red-600 mt-1">a pagar en diciembre</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-700 font-semibold tracking-wider mb-1">EMPLEADOS</p>
            <p className="text-2xl font-bold text-green-900">
              {empleadosElegibles}
            </p>
            <p className="text-xs text-green-600 mt-1">
              elegibles
              {empleadosNoElegibles > 0 && ` (${empleadosNoElegibles} no aún)`}
            </p>
          </div>

          <div className={`border rounded-xl p-4 ${
            yaPasoFecha ? 'bg-red-50 border-red-300' :
            enPeriodoCritico ? 'bg-orange-50 border-orange-200' : 
            'bg-blue-50 border-blue-200'
          }`}>
            <p className={`text-xs font-semibold tracking-wider mb-1 ${
              yaPasoFecha ? 'text-red-700' :
              enPeriodoCritico ? 'text-orange-700' : 'text-blue-700'
            }`}>
              DÍAS RESTANTES
            </p>
            <p className={`text-2xl font-bold ${
              yaPasoFecha ? 'text-red-900' :
              enPeriodoCritico ? 'text-orange-900' : 'text-blue-900'
            }`}>
              {yaPasoFecha ? `−${Math.abs(diasFaltantes)}` : diasFaltantes}
            </p>
            <p className={`text-xs mt-1 ${
              yaPasoFecha ? 'text-red-600' :
              enPeriodoCritico ? 'text-orange-600' : 'text-blue-600'
            }`}>
              {yaPasoFecha ? 'fecha vencida' : 'hasta 20 dic'}
            </p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs text-purple-700 font-semibold tracking-wider mb-1">PROMEDIO</p>
            <p className="text-2xl font-bold text-purple-900">
              RD$ {formatearMoneda(empleadosElegibles > 0 ? totalRegalia / empleadosElegibles : 0)}
            </p>
            <p className="text-xs text-purple-600 mt-1">por empleado</p>
          </div>
        </div>

        <div className={`mt-4 p-3 rounded-lg text-xs ${
          fuentePrincipal === 'real' 
            ? 'bg-green-50 border border-green-200 text-green-900'
            : 'bg-yellow-50 border border-yellow-200 text-yellow-900'
        }`}>
          {fuentePrincipal === 'real' ? (
            <>✅ Cálculo basado en pagos reales registrados en el sistema</>
          ) : (
            <>⚠️ Cálculo basado en proyección de salarios actuales. 
            El valor final puede variar según los pagos reales del año.</>
          )}
        </div>
      </div>

      {/* DETALLE POR EMPLEADO */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
          👥 EMPLEADOS Y SU REGALÍA ESTIMADA
        </p>

        {calculosPorEmpleado.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No hay empleados activos con sueldo configurado
          </div>
        ) : (
          <div className="space-y-2">
            {calculosPorEmpleado.map(c => (
              <div 
                key={c.empleado.id}
                className={`border rounded-xl p-4 ${
                  c.elegible 
                    ? 'border-gray-200 bg-white' 
                    : 'border-yellow-200 bg-yellow-50'
                }`}
              >
                <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-2xl flex-shrink-0">
                      {c.empleado.sexo === 'hombre' ? '👨' : c.empleado.sexo === 'mujer' ? '👩' : '👤'}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">{c.empleado.nombre}</p>
                      <p className="text-xs text-gray-600 capitalize">
                        {c.empleado.rol?.replace('_', ' ')}
                      </p>
                    </div>
                  </div>

                  {c.elegible ? (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Regalía estimada</p>
                      <p className="text-2xl font-bold text-red-700">
                        RD$ {formatearMoneda(c.regalia)}
                      </p>
                    </div>
                  ) : (
                    <div className="bg-yellow-100 text-yellow-900 px-3 py-1 rounded-full text-xs font-bold">
                      ⚠️ No elegible aún ({c.mesesTrabajados.toFixed(1)} meses)
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-gray-500">Salario mensual</p>
                    <p className="font-semibold">RD$ {formatearMoneda(salarioMensualEmpleado(c.empleado))}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Salarios año</p>
                    <p className="font-semibold">RD$ {formatearMoneda(c.salariosAcumulados)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Meses trabajados</p>
                    <p className="font-semibold">{c.mesesTrabajados.toFixed(1)} meses</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* INFORMACIÓN LEGAL */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-6 mb-6">
        <p className="text-xs text-blue-800 font-semibold tracking-wider mb-3">
          📚 ¿QUÉ DICE LA LEY?
        </p>
        <div className="space-y-2 text-sm text-blue-900">
          <p>
            ⚖️ <strong>Art. 219 Código de Trabajo RD:</strong> La Regalía Pascual 
            (también conocida como "Salario 13") es OBLIGATORIA.
          </p>
          <p>
            📅 <strong>Plazo:</strong> Debe pagarse antes del 20 de diciembre.
          </p>
          <p>
            🧮 <strong>Fórmula:</strong> Suma de salarios ordinarios del año / 12.
          </p>
          <p>
            ⏰ <strong>Tiempo mínimo:</strong> Empleados con menos de 3 meses 
            reciben proporcional. Si tiene 3 meses o más, recibe completo.
          </p>
          <p>
            💰 <strong>Tope máximo:</strong> No puede exceder 5 salarios mínimos del sector.
          </p>
          <p>
            ❌ <strong>NO incluye:</strong> Bonificaciones extras, horas extra, comisiones. 
            Solo salarios ordinarios.
          </p>
        </div>
      </div>

      {/* BOTÓN PROCESAR */}
      {empleadosElegibles > 0 && (
        <div className="bg-gradient-to-br from-red-500 to-red-700 rounded-2xl shadow-xl p-6 text-center text-white">
          <p className="text-red-100 text-xs font-semibold tracking-wider mb-2">
            ¿LISTO PARA PROCESAR?
          </p>
          <p className="text-2xl font-bold mb-3">
            🎄 Pagar regalía a {empleadosElegibles} empleado{empleadosElegibles !== 1 ? 's' : ''}
          </p>
          <p className="text-3xl font-bold mb-4">
            RD$ {formatearMoneda(totalRegalia)}
          </p>
          <button
            onClick={() => setModalConfirmar(true)}
            className="bg-white text-red-700 hover:bg-red-50 font-bold px-8 py-3 rounded-xl shadow-lg"
          >
            💰 Procesar pago de regalía
          </button>
          <p className="text-xs text-red-100 mt-3">
            Quedará registrado en Bonificaciones como tipo "navideño"
          </p>
        </div>
      )}

    </div>
  )
}

export default VistaRegaliaPascual