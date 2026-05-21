import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function VistaAdministrador({ usuario, empresaId, onCerrarSesion, onCambiarUsuario, onIrConfiguracion, onIrFactura, onIrCalculadora, onIrInteligencia, onIrDespacho, onIrEmpleados, onIrContratos, onIrProveedores, onIrCompras, onIrIngredientes, onVerComoSecretaria, onIrGastos }) {
  const [empresa, setEmpresa] = useState(null)
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [finanzas, setFinanzas] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)

    const { data: empresaData } = await supabase
      .from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)

    const { data: escuelasData } = await supabase
      .from('escuelas').select('*').eq('empresa_id', empresaId).eq('activa', true)
    setEscuelas(escuelasData || [])

    const inicioMes = new Date()
    inicioMes.setDate(1)
    const inicioMesStr = inicioMes.toISOString().split('T')[0]
    
    const { data: opsData } = await supabase
      .from('operaciones_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('fecha', inicioMesStr)

    setOperaciones(opsData || [])

    const { data: finanzasData } = await supabase
      .from('finanzas').select('*').eq('empresa_id', empresaId).maybeSingle()
    setFinanzas(finanzasData)

    const { data: usuariosData } = await supabase
      .from('usuarios').select('*').eq('empresa_id', empresaId).eq('activo', true)
    setUsuarios(usuariosData || [])

    setCargando(false)
  }

  function confirmarCerrarSesion() {
    const confirmar = window.confirm('¿Estás seguro de cerrar sesión? Tendrás que ingresar las credenciales de la empresa nuevamente.')
    if (confirmar && onCerrarSesion) {
      onCerrarSesion()
    }
  }

  const totalRacionesDia = escuelas.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0)
  const facturacionDiaria = escuelas.reduce((sum, e) => sum + ((e.raciones_contractuales || 0) * (parseFloat(e.precio_racion) || 0)), 0)
  const facturacionMensual = facturacionDiaria * 22

  const anticipoPct = parseFloat(finanzas?.anticipo_porcentaje || 20)
  const anticipoMonto = facturacionMensual * (anticipoPct / 100)
  const pendienteCobrar = facturacionMensual - anticipoMonto
  const diasPago = finanzas?.dias_pago_promedio || 90

  const racionesEntregadasMes = operaciones
    .filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
    .reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)

  const facturacionRealMes = operaciones
    .filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
    .reduce((sum, op) => {
      const escuela = escuelas.find(e => e.id === op.escuela_id)
      return sum + ((op.raciones_planificadas || 0) * (parseFloat(escuela?.precio_racion) || 0))
    }, 0)

  const fechaHoy = new Date().toISOString().split('T')[0]
  const opsHoy = operaciones.filter(op => op.fecha === fechaHoy)
  const racionesHoy = opsHoy.reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
  const facturacionHoy = opsHoy.reduce((sum, op) => {
    const escuela = escuelas.find(e => e.id === op.escuela_id)
    return sum + ((op.raciones_planificadas || 0) * (parseFloat(escuela?.precio_racion) || 0))
  }, 0)

  const costoObjetivo = parseFloat(finanzas?.costo_objetivo_racion || 35)
  const costoTotalDiarioObjetivo = totalRacionesDia * costoObjetivo
  const margenDiarioObjetivo = facturacionDiaria - costoTotalDiarioObjetivo
  const margenPct = facturacionDiaria > 0 ? Math.round((margenDiarioObjetivo / facturacionDiaria) * 100) : 0

  const mesNombre = new Date().toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando finanzas...</div>
  }

  return (
    <div className="w-full max-w-5xl">
      
      <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-green-100 text-xs font-semibold tracking-wider">
              VISTA ADMINISTRADOR
            </p>
            <h2 className="text-3xl font-bold mt-1">
              💼 {usuario.nombre.split(' ')[0]}
            </h2>
            <p className="text-green-200 mt-1">
              {empresa?.nombre} · {mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {onVerComoSecretaria && (
              <button
                onClick={onVerComoSecretaria}
                className="bg-pink-500 hover:bg-pink-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md"
              >
                📋 Ver como Secretaria
              </button>
            )}
            {onIrDespacho && (
              <button
                onClick={onIrDespacho}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg font-bold"
              >
                🚚 Modo Despacho
              </button>
            )}
            {onIrInteligencia && (
              <button
                onClick={onIrInteligencia}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                🧠 Inteligencia
              </button>
            )}
            {onIrEmpleados && (
              <button
                onClick={onIrEmpleados}
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                👥 Empleados
              </button>
            )}
            {onIrContratos && (
              <button
                onClick={onIrContratos}
                className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md"
              >
                📄 Contratos
              </button>
            )}
            {onIrIngredientes && (
              <button
                onClick={onIrIngredientes}
                className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md"
              >
                🥕 Ingredientes
              </button>
            )}
            {onIrProveedores && (
              <button
                onClick={onIrProveedores}
                className="bg-amber-700 hover:bg-amber-800 text-white text-sm px-4 py-2 rounded-lg"
              >
                🏭 Proveedores
              </button>
            )}
            {onIrCompras && (
              <button
                onClick={onIrCompras}
                className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md"
              >
                📦 Compras
              </button>
            )}
            {onIrGastos && (
              <button
                onClick={onIrGastos}
                className="bg-rose-500 hover:bg-rose-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md"
              >
                💰 Gastos
              </button>
            )}
            {onIrCalculadora && (
              <button
                onClick={onIrCalculadora}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                📐 Calculadora
              </button>
            )}
            {onIrFactura && (
              <button
                onClick={onIrFactura}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                📄 Factura INABIE
              </button>
            )}
            {onIrConfiguracion && (
              <button
                onClick={onIrConfiguracion}
                className="bg-green-700 hover:bg-green-900 text-white text-sm px-4 py-2 rounded-lg"
              >
                ⚙️ Configuración
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCambiarUsuario}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            🔄 Cambiar usuario
          </button>
          <button
            onClick={confirmarCerrarSesion}
            className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
          📊 PROYECCIÓN MENSUAL
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-700 font-semibold tracking-wider mb-1">FACTURACIÓN</p>
            <p className="text-2xl font-bold text-blue-900">
              RD$ {(facturacionMensual / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-blue-600 mt-1">22 días hábiles</p>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-700 font-semibold tracking-wider mb-1">ANTICIPO INABIE</p>
            <p className="text-2xl font-bold text-green-900">
              RD$ {(anticipoMonto / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-green-600 mt-1">{anticipoPct}% del total</p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-xs text-orange-700 font-semibold tracking-wider mb-1">PENDIENTE</p>
            <p className="text-2xl font-bold text-orange-900">
              RD$ {(pendienteCobrar / 1000).toFixed(0)}K
            </p>
            <p className="text-xs text-orange-600 mt-1">en {diasPago} días</p>
          </div>

          <div className={`border rounded-xl p-4 ${margenPct < 25 ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-200'}`}>
            <p className={`text-xs font-semibold tracking-wider mb-1 ${margenPct < 25 ? 'text-red-700' : 'text-purple-700'}`}>MARGEN OBJ.</p>
            <p className={`text-2xl font-bold ${margenPct < 25 ? 'text-red-900' : 'text-purple-900'}`}>
              {margenPct}%
            </p>
            <p className={`text-xs mt-1 ${margenPct < 25 ? 'text-red-600' : 'text-purple-600'}`}>
              RD$ {(margenDiarioObjetivo / 1000).toFixed(0)}K/día
            </p>
          </div>

        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
          📅 OPERACIONES DE HOY
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-3xl font-bold text-gray-900">{racionesHoy.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-1">Raciones planificadas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-green-600">{opsHoy.filter(op => op.estado === 'entregada' || op.estado === 'cerrada').length}/{escuelas.length}</p>
            <p className="text-xs text-gray-500 mt-1">Escuelas atendidas</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-orange-600">RD$ {(facturacionHoy / 1000).toFixed(1)}K</p>
            <p className="text-xs text-gray-500 mt-1">Facturación del día</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
          📈 MES EN CURSO ({operaciones.length} operaciones)
        </p>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-600 font-semibold mb-1">Raciones entregadas</p>
            <p className="text-2xl font-bold text-gray-900">{racionesEntregadasMes.toLocaleString()}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-600 font-semibold mb-1">Facturación real</p>
            <p className="text-2xl font-bold text-gray-900">RD$ {(facturacionRealMes / 1000).toFixed(0)}K</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
          👥 EQUIPO ACTIVO
        </p>
        <div className="flex flex-wrap gap-2">
          {usuarios.map((u) => (
            <span key={u.id} className="px-3 py-1 bg-gray-100 rounded-full text-xs font-semibold text-gray-700">
              {u.nombre} · {u.rol}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
        <p className="text-xs text-yellow-800 font-semibold tracking-wider mb-3">
          🚨 ALERTAS Y RECORDATORIOS
        </p>
        <div className="space-y-2">
          {finanzas?.contador_externo && (
            <div className="flex items-center gap-3 text-sm text-yellow-900">
              <span>🧮</span>
              <span>Pago contador <strong>{finanzas.contador_nombre}</strong>: RD$ {finanzas.contador_iguala_mensual} (mensual)</span>
            </div>
          )}
          {finanzas?.frecuencia_pago_empleados && (
            <div className="flex items-center gap-3 text-sm text-yellow-900">
              <span>👥</span>
              <span>Pago empleados: <strong>{finanzas.frecuencia_pago_empleados}</strong></span>
            </div>
          )}
          {margenPct < 25 && (
            <div className="flex items-center gap-3 text-sm text-red-900 font-semibold">
              <span>⚠️</span>
              <span>Margen ({margenPct}%) por debajo del mínimo ({finanzas?.margen_minimo_porcentaje || 25}%)</span>
            </div>
          )}
        </div>
      </div>

    </div>
  )
}

export default VistaAdministrador