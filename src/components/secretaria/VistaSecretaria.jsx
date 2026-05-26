import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function VistaSecretaria({ usuario, empresaId, onCerrarSesion, onCambiarUsuario, onIrCalculadora, onIrInteligencia, onIrDespacho, onIrFactura, onIrProveedores, onIrCompras, onIrGastos, onIrIngredientes, onIrEmpleados, onIrMiContrato, onIrMisRecibos, onVolverAlPanel, modoAdmin = false }) {
  const [empresa, setEmpresa] = useState(null)
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [finanzas, setFinanzas] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [tabActivo, setTabActivo] = useState('resumen')

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

    const { data: empleadosData } = await supabase
      .from('usuarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .or('activo.eq.true,activo.is.null')
    setEmpleados(empleadosData || [])

    setCargando(false)
  }

  const totalRacionesDia = escuelas.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0)
  const facturacionDiaria = escuelas.reduce((sum, e) => sum + ((e.raciones_contractuales || 0) * (parseFloat(e.precio_racion) || 0)), 0)
  const facturacionMensual = facturacionDiaria * 22
  const anticipoPct = parseFloat(finanzas?.anticipo_porcentaje || 20)
  const anticipoMonto = facturacionMensual * (anticipoPct / 100)
  const pendienteCobrar = facturacionMensual - anticipoMonto

  const fechaHoy = new Date().toISOString().split('T')[0]
  const opsHoy = operaciones.filter(op => op.fecha === fechaHoy)
  const racionesHoy = opsHoy.reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
  const entregadasHoy = opsHoy.filter(op => op.estado === 'entregada' || op.estado === 'cerrada').length

  const nominaMensual = empleados.reduce((sum, emp) => {
    if (!emp.sueldo || !emp.frecuencia_pago) return sum
    const sueldo = parseFloat(emp.sueldo)
    let mensual = 0
    if (emp.frecuencia_pago === 'mes') mensual = sueldo
    else if (emp.frecuencia_pago === 'quincena') mensual = sueldo * 2
    else if (emp.frecuencia_pago === 'semana') mensual = sueldo * 4.33
    else if (emp.frecuencia_pago === 'dia') mensual = sueldo * 22
    return sum + mensual
  }, 0)

  const mesNombre = new Date().toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })

  function confirmarCerrarSesion() {
    const confirmar = window.confirm('¿Estás seguro de cerrar sesión? Tendrás que ingresar las credenciales de la empresa nuevamente.')
    if (confirmar && onCerrarSesion) {
      onCerrarSesion()
    }
  }

  const TABS = [
    { id: 'resumen', label: 'Resumen', emoji: '📊' },
    { id: 'facturacion', label: 'Facturación', emoji: '📄' },
    { id: 'gastos', label: 'Gastos', emoji: '💸' },
    { id: 'nomina', label: 'Nómina', emoji: '💰' },
    { id: 'compras', label: 'Compras', emoji: '📦' },
    { id: 'reportes', label: 'Reportes', emoji: '📈' },
  ]

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando vista secretaria...</div>
  }

  const tituloEncabezado = modoAdmin ? 'VISTA SECRETARIA (modo admin)' : 'VISTA SECRETARIA'
  const subtituloVista = modoAdmin 
    ? `${usuario.nombre.split(' ')[0]} viendo como secretaria` 
    : usuario.nombre.split(' ')[0]

  return (
    <div className="w-full max-w-6xl">
      
      {modoAdmin && (
        <div className="bg-blue-100 border-2 border-blue-300 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">👁️</span>
            <div>
              <p className="text-sm font-bold text-blue-900">
                Estás viendo el panel de la secretaria
              </p>
              <p className="text-xs text-blue-700">
                Acceso completo · todas las acciones quedan registradas con tu usuario
              </p>
            </div>
          </div>
          {onVolverAlPanel && (
            <button
              onClick={onVolverAlPanel}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-bold text-sm whitespace-nowrap"
            >
              ← Volver al panel admin
            </button>
          )}
        </div>
      )}

      <div className="bg-gradient-to-br from-pink-600 to-rose-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-pink-100 text-xs font-semibold tracking-wider">
              {tituloEncabezado}
            </p>
            <h2 className="text-3xl font-bold mt-1">
              📋 {subtituloVista}
            </h2>
            <p className="text-pink-200 mt-1">
              {empresa?.nombre} · {mesNombre.charAt(0).toUpperCase() + mesNombre.slice(1)}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
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
            {onIrMiContrato && (
              <button
                onClick={onIrMiContrato}
                className="bg-cyan-500 hover:bg-cyan-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md"
              >
                📋 Mi Contrato
              </button>
            )}
            {onIrMisRecibos && (
              <button
                onClick={onIrMisRecibos}
                className="bg-emerald-500 hover:bg-emerald-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md"
              >
                💰 Mis Recibos
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
          </div>
        </div>

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

      <div className="bg-white rounded-2xl shadow-xl overflow-hidden mb-6">
        <div className="border-b border-gray-200 bg-gray-50 overflow-x-auto">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab.id}
                onClick={() => setTabActivo(tab.id)}
                className={`px-5 py-4 text-sm font-semibold whitespace-nowrap transition border-b-2 ${
                  tabActivo === tab.id
                    ? 'border-pink-600 text-pink-700 bg-white'
                    : 'border-transparent text-gray-600 hover:text-pink-600 hover:bg-pink-50'
                }`}
              >
                {tab.emoji} {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          
          {tabActivo === 'resumen' && (
            <div className="space-y-6">
              <div>
                <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
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
                    <p className="text-xs text-green-700 font-semibold tracking-wider mb-1">ANTICIPO</p>
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
                    <p className="text-xs text-orange-600 mt-1">por cobrar</p>
                  </div>
                  <div className="bg-pink-50 border border-pink-200 rounded-xl p-4">
                    <p className="text-xs text-pink-700 font-semibold tracking-wider mb-1">NÓMINA</p>
                    <p className="text-2xl font-bold text-pink-900">
                      RD$ {(nominaMensual / 1000).toFixed(0)}K
                    </p>
                    <p className="text-xs text-pink-600 mt-1">{empleados.length} empleados</p>
                  </div>
                </div>
              </div>

              <div>
                <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
                  📅 HOY
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-gray-900">{racionesHoy.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 mt-1">Raciones planificadas</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-green-600">{entregadasHoy}/{escuelas.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Escuelas atendidas</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-gray-900">{operaciones.length}</p>
                    <p className="text-xs text-gray-500 mt-1">Operaciones del mes</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-5">
                <p className="text-xs text-yellow-800 font-semibold tracking-wider mb-3">
                  🚨 PENDIENTES DEL DÍA
                </p>
                <div className="space-y-2 text-sm text-yellow-900">
                  <p>• Revisar conduces de entregas</p>
                  <p>• Validar pagos pendientes</p>
                  <p>• Capturar facturas de proveedores con RNC</p>
                </div>
              </div>
            </div>
          )}

          {tabActivo === 'facturacion' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 font-semibold tracking-wider">
                📄 FACTURACIÓN INABIE Y CONDUCES
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 text-center">
                <p className="text-5xl mb-3">📄</p>
                <p className="text-blue-900 font-bold text-lg mb-2">Factura INABIE</p>
                <p className="text-sm text-blue-700 mb-4">
                  Genera, imprime y gestiona las facturas mensuales para INABIE
                </p>
                {onIrFactura && (
                  <button
                    onClick={onIrFactura}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-bold transition"
                  >
                    📄 Abrir Factura INABIE
                  </button>
                )}
              </div>
            </div>
          )}

          {tabActivo === 'gastos' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 font-semibold tracking-wider">
                💰 GASTOS OPERATIVOS
              </p>
              <div className="bg-rose-50 border border-rose-200 rounded-xl p-6 text-center">
                <p className="text-5xl mb-3">💰</p>
                <p className="text-rose-900 font-bold text-lg mb-2">Gastos del negocio</p>
                <p className="text-sm text-rose-700 mb-4">
                  Captura gastos con RNC, NCF, categorías y formas de pago
                </p>
                {onIrGastos && (
                  <button
                    onClick={onIrGastos}
                    className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-3 rounded-lg font-bold transition"
                  >
                    💰 Abrir Gastos
                  </button>
                )}
              </div>
            </div>
          )}

          {tabActivo === 'nomina' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 font-semibold tracking-wider">
                💰 NÓMINA DEL MES
              </p>
              <div className="bg-pink-50 border border-pink-200 rounded-xl p-5">
                <div className="flex justify-between items-center mb-2">
                  <p className="text-sm text-pink-700 font-semibold">Total a pagar este mes</p>
                  <p className="text-3xl font-bold text-pink-900">
                    RD$ {nominaMensual.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                  </p>
                </div>
                <p className="text-xs text-pink-600">{empleados.filter(e => e.sueldo).length} empleados con sueldo configurado</p>
              </div>

              <div className="space-y-2">
                {empleados.filter(e => e.sueldo).map(emp => {
                  const sueldo = parseFloat(emp.sueldo)
                  let mensual = 0
                  if (emp.frecuencia_pago === 'mes') mensual = sueldo
                  else if (emp.frecuencia_pago === 'quincena') mensual = sueldo * 2
                  else if (emp.frecuencia_pago === 'semana') mensual = sueldo * 4.33
                  else if (emp.frecuencia_pago === 'dia') mensual = sueldo * 22

                  return (
                    <div key={emp.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="font-semibold text-gray-900">{emp.nombre}</p>
                        <p className="text-xs text-gray-500">{emp.rol} · {emp.frecuencia_pago}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-gray-900">RD$ {mensual.toLocaleString('es-DO', { maximumFractionDigits: 0 })}</p>
                        <p className="text-xs text-gray-500">/mes</p>
                      </div>
                    </div>
                  )
                })}
              </div>

              {onIrEmpleados && (
                <div className="text-center pt-2">
                  <button
                    onClick={onIrEmpleados}
                    className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white px-5 py-2 rounded-lg font-bold text-sm transition"
                  >
                    👥 Gestionar Empleados
                  </button>
                </div>
              )}

              <div className="text-center py-4 text-xs text-gray-500">
                <span className="inline-block bg-gray-100 px-3 py-1 rounded-full font-semibold">
                  Pagos y anticipos: próximamente (Bloque 6D)
                </span>
              </div>
            </div>
          )}

          {tabActivo === 'compras' && (
            <div className="space-y-4">
              <p className="text-xs text-gray-500 font-semibold tracking-wider">
                📦 COMPRAS, PROVEEDORES E INVENTARIO
              </p>
              
              {onIrCompras && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">📦</div>
                      <div>
                        <p className="text-amber-900 font-bold text-lg">Compras</p>
                        <p className="text-sm text-amber-700">
                          Registra compras, facturas, recepción de mercancía
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onIrCompras}
                      className="bg-amber-500 hover:bg-amber-600 text-white px-6 py-3 rounded-lg font-bold transition whitespace-nowrap"
                    >
                      Abrir →
                    </button>
                  </div>
                </div>
              )}

              {onIrProveedores && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">🏭</div>
                      <div>
                        <p className="text-amber-900 font-bold text-lg">Proveedores</p>
                        <p className="text-sm text-amber-700">
                          Gestiona a quién le compras tus insumos
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onIrProveedores}
                      className="bg-amber-700 hover:bg-amber-800 text-white px-6 py-3 rounded-lg font-bold transition whitespace-nowrap"
                    >
                      Abrir →
                    </button>
                  </div>
                </div>
              )}

              {onIrIngredientes && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-5xl">🥕</div>
                      <div>
                        <p className="text-green-900 font-bold text-lg">Ingredientes e Inventario</p>
                        <p className="text-sm text-green-700">
                          Consulta el stock disponible y los ingredientes registrados
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={onIrIngredientes}
                      className="bg-green-500 hover:bg-green-600 text-white px-6 py-3 rounded-lg font-bold transition whitespace-nowrap"
                    >
                      Abrir →
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {tabActivo === 'reportes' && (
            <div className="text-center py-12">
              <p className="text-5xl mb-3">📈</p>
              <p className="text-gray-900 font-bold text-lg mb-2">Reportes Mensuales</p>
              <p className="text-sm text-gray-600 mb-4">
                Próximamente: P&amp;L, formularios 606/607 DGII, estado INABIE, export Excel/PDF
              </p>
              <span className="inline-block bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-xs font-semibold">
                BLOQUE 6E
              </span>
            </div>
          )}

        </div>
      </div>

    </div>
  )
}

export default VistaSecretaria