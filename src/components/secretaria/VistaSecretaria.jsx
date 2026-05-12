import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function VistaSecretaria({ 
  usuario, 
  empresaId, 
  onCerrarSesion, 
  onCambiarUsuario,
  onIrFactura, 
  onIrCalculadora, 
  onIrInteligencia, 
  onIrDespacho, 
  onIrProveedores,
  onIrCompras,
  onVolverAlPanel,
  modoAdmin = false 
}) {
  const [empresa, setEmpresa] = useState(null)
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [tabActiva, setTabActiva] = useState('resumen')

  const hoy = new Date()
  const mesActual = hoy.getMonth()
  const anioActual = hoy.getFullYear()

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

    const inicioMes = new Date(anioActual, mesActual, 1).toISOString().split('T')[0]
    const finMes = new Date(anioActual, mesActual + 1, 0).toISOString().split('T')[0]
    
    const { data: opsData } = await supabase
      .from('operaciones_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('fecha', inicioMes)
      .lte('fecha', finMes)
    setOperaciones(opsData || [])

    const { data: empleadosData } = await supabase
      .from('empleados')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
    setEmpleados(empleadosData || [])

    setCargando(false)
  }

  function confirmarCerrarSesion() {
    const confirmar = window.confirm('¿Estás seguro de cerrar sesión? Tendrás que ingresar las credenciales de la empresa nuevamente.')
    if (confirmar && onCerrarSesion) {
      onCerrarSesion()
    }
  }

  // Cálculos
  const totalRacionesDia = escuelas.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0)
  const facturacionDiaria = escuelas.reduce((sum, e) => sum + ((e.raciones_contractuales || 0) * (parseFloat(e.precio_racion) || 0)), 0)
  const facturacionMensualEstimada = facturacionDiaria * 22

  const anticipoEstimado = facturacionMensualEstimada * 0.20
  const pendienteCobrar = facturacionMensualEstimada - anticipoEstimado

  const nominaTotal = empleados.reduce((sum, e) => sum + (parseFloat(e.salario_mensual) || 0), 0)

  const fechaHoy = new Date().toISOString().split('T')[0]
  const opsHoy = operaciones.filter(op => op.fecha === fechaHoy)
  const racionesHoy = opsHoy.reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
  const escuelasAtendidasHoy = opsHoy.filter(op => op.estado === 'entregada' || op.estado === 'cerrada').length

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando vista secretaria...</div>
  }

  return (
    <div className="w-full max-w-5xl">
      
      {/* HEADER */}
      <div className="bg-gradient-to-br from-pink-600 to-rose-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-pink-100 text-xs font-semibold tracking-wider">
              {modoAdmin ? '👁️ VISTA SECRETARIA (modo administrador)' : 'VISTA SECRETARIA'}
            </p>
            <h2 className="text-3xl font-bold mt-1">
              📋 {usuario.nombre.split(' ')[0].toUpperCase()}
            </h2>
            <p className="text-pink-200 mt-1">
              {empresa?.nombre} · {MESES[mesActual]} de {anioActual}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            {modoAdmin && onVolverAlPanel && (
              <button
                onClick={onVolverAlPanel}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg font-bold"
              >
                ← Volver al panel admin
              </button>
            )}
            {onIrDespacho && !modoAdmin && (
              <button
                onClick={onIrDespacho}
                className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg font-bold"
              >
                🚚 Modo Despacho
              </button>
            )}
            {onIrInteligencia && !modoAdmin && (
              <button
                onClick={onIrInteligencia}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                🧠 Inteligencia
              </button>
            )}
            {onIrCalculadora && !modoAdmin && (
              <button
                onClick={onIrCalculadora}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                📐 Calculadora
              </button>
            )}
            {onIrFactura && !modoAdmin && (
              <button
                onClick={onIrFactura}
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                📄 Factura INABIE
              </button>
            )}
            {onIrProveedores && !modoAdmin && (
              <button
                onClick={onIrProveedores}
                className="bg-amber-700 hover:bg-amber-800 text-white text-sm px-4 py-2 rounded-lg"
              >
                🏭 Proveedores
              </button>
            )}
            {onIrCompras && !modoAdmin && (
              <button
                onClick={onIrCompras}
                className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md"
              >
                📦 Compras
              </button>
            )}
          </div>
        </div>

        {/* BOTONES DE SESIÓN: Cambiar usuario + Cerrar sesión (NO mostrar en modo admin) */}
        {!modoAdmin && (
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
        )}
      </div>

      {/* TABS */}
      <div className="bg-white rounded-xl shadow-sm mb-6 px-2 py-2">
        <div className="flex gap-1 overflow-x-auto">
          {[
            { id: 'resumen', label: '📊 Resumen' },
            { id: 'facturacion', label: '📄 Facturación' },
            { id: 'gastos', label: '💸 Gastos' },
            { id: 'nomina', label: '💰 Nómina' },
            { id: 'compras', label: '📦 Compras' },
            { id: 'reportes', label: '📈 Reportes' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setTabActiva(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition whitespace-nowrap ${
                tabActiva === tab.id
                  ? 'bg-pink-100 text-pink-900 border-b-2 border-pink-600'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENIDO DEL TAB ACTIVO */}
      {tabActiva === 'resumen' && (
        <>
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
              📊 PROYECCIÓN MENSUAL
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                <p className="text-xs text-blue-700 font-semibold tracking-wider mb-1">FACTURACIÓN</p>
                <p className="text-2xl font-bold text-blue-900">
                  RD$ {(facturacionMensualEstimada / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-blue-600 mt-1">22 días hábiles</p>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-xs text-green-700 font-semibold tracking-wider mb-1">ANTICIPO</p>
                <p className="text-2xl font-bold text-green-900">
                  RD$ {(anticipoEstimado / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-green-600 mt-1">20% del total</p>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <p className="text-xs text-orange-700 font-semibold tracking-wider mb-1">PENDIENTE</p>
                <p className="text-2xl font-bold text-orange-900">
                  RD$ {(pendienteCobrar / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-orange-600 mt-1">por cobrar</p>
              </div>

              <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                <p className="text-xs text-pink-700 font-semibold tracking-wider mb-1">NÓMINA</p>
                <p className="text-2xl font-bold text-pink-900">
                  RD$ {(nominaTotal / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-pink-600 mt-1">{empleados.length} empleados</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">📅 HOY</p>
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{racionesHoy.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-1">Raciones planificadas</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-green-600">{escuelasAtendidasHoy}/{escuelas.length}</p>
                <p className="text-xs text-gray-500 mt-1">Escuelas atendidas</p>
              </div>
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <p className="text-3xl font-bold text-gray-900">{operaciones.length}</p>
                <p className="text-xs text-gray-500 mt-1">Operaciones del mes</p>
              </div>
            </div>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-6">
            <p className="text-xs text-yellow-800 font-semibold tracking-wider mb-3">
              📋 PENDIENTES DEL DÍA
            </p>
            <div className="space-y-2 text-sm text-yellow-900">
              <p>• Revisar conduces de entregas</p>
              <p>• Validar pagos pendientes</p>
              <p>• Capturar facturas de proveedores con RNC</p>
              <p>• Actualizar registros INABIE</p>
            </div>
          </div>
        </>
      )}

      {tabActiva === 'facturacion' && (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <p className="text-6xl mb-4">📄</p>
          <p className="text-gray-900 font-bold text-lg mb-2">Módulo Facturación</p>
          <p className="text-sm text-gray-500 mb-4">
            Usa el botón "📄 Factura INABIE" en el header para acceder al módulo completo.
          </p>
          {onIrFactura && !modoAdmin && (
            <button
              onClick={onIrFactura}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-6 py-3 rounded-lg"
            >
              📄 Ir a Factura INABIE
            </button>
          )}
        </div>
      )}

      {tabActiva === 'gastos' && (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <p className="text-6xl mb-4">💸</p>
          <p className="text-gray-900 font-bold text-lg mb-2">Módulo Gastos</p>
          <p className="text-sm text-gray-500">
            Próximamente: registro de gastos operativos (combustible, gas, servicios).
          </p>
        </div>
      )}

      {tabActiva === 'nomina' && (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <p className="text-6xl mb-4">💰</p>
          <p className="text-gray-900 font-bold text-lg mb-2">Módulo Nómina</p>
          <p className="text-sm text-gray-500 mb-4">
            Próximamente: pagos quincenales/mensuales, anticipos, deducciones.
          </p>
          <p className="text-xs text-gray-500">
            Total nómina actual: <strong>RD$ {nominaTotal.toLocaleString('es-DO')}</strong> ({empleados.length} empleados)
          </p>
        </div>
      )}

      {tabActiva === 'compras' && (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <p className="text-6xl mb-4">📦</p>
          <p className="text-gray-900 font-bold text-lg mb-2">Módulo Compras</p>
          <p className="text-sm text-gray-500 mb-4">
            Registra compras a proveedores, controla pagos pendientes y captura facturas con RNC para reportes DGII.
          </p>
          {onIrCompras && !modoAdmin && (
            <button
              onClick={onIrCompras}
              className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-6 py-3 rounded-lg shadow-md"
            >
              📦 Ir a Compras
            </button>
          )}
        </div>
      )}

      {tabActiva === 'reportes' && (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <p className="text-6xl mb-4">📈</p>
          <p className="text-gray-900 font-bold text-lg mb-2">Módulo Reportes</p>
          <p className="text-sm text-gray-500">
            Próximamente: reporte 606 (compras DGII), 607 (ventas), P&L mensual, flujo de caja.
          </p>
        </div>
      )}

    </div>
  )
}

export default VistaSecretaria