import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function DashboardDelDia({ 
  usuario, 
  empresaId, 
  onCerrarSesion, 
  onCambiarUsuario,
  onIrConfiguracion, 
  onIrCierre, 
  onIrCalculadora, 
  onIrInteligencia, 
  onIrDespacho, 
  onIrEmpleados,
  onIrCompras,
  onIrIngredientes,
  onVerComoSecretaria 
}) {
  const [empresa, setEmpresa] = useState(null)
  const [escuelas, setEscuelas] = useState([])
  const [operacionesHoy, setOperacionesHoy] = useState([])
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

    const fechaHoy = new Date().toISOString().split('T')[0]
    const { data: opsData } = await supabase
      .from('operaciones_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('fecha', fechaHoy)
    setOperacionesHoy(opsData || [])

    setCargando(false)
  }

  function confirmarCerrarSesion() {
    const confirmar = window.confirm('¿Estás seguro de cerrar sesión? Tendrás que ingresar las credenciales de la empresa nuevamente.')
    if (confirmar && onCerrarSesion) {
      onCerrarSesion()
    }
  }

  const totalRacionesHoy = operacionesHoy.reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
  const facturacionHoy = operacionesHoy.reduce((sum, op) => {
    const escuela = escuelas.find(e => e.id === op.escuela_id)
    return sum + ((op.raciones_planificadas || 0) * (parseFloat(escuela?.precio_racion) || 0))
  }, 0)
  const escuelasAtendidas = operacionesHoy.filter(op => op.estado === 'entregada' || op.estado === 'cerrada').length

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando dashboard...</div>
  }

  const fechaHoyTexto = new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="w-full max-w-5xl">
      
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-blue-100 text-xs font-semibold tracking-wider">
              PANEL DEL DÍA
            </p>
            <h2 className="text-3xl font-bold mt-1">
              👋 Hola, {usuario.nombre.split(' ')[0]}
            </h2>
            <p className="text-blue-200 mt-1 capitalize">
              {empresa?.nombre} · {fechaHoyTexto}
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
            {onIrIngredientes && (
              <button
                onClick={onIrIngredientes}
                className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md"
              >
                🥕 Ingredientes
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
            {onIrCalculadora && (
              <button
                onClick={onIrCalculadora}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg"
              >
                📐 Calculadora
              </button>
            )}
            {onIrCierre && (
              <button
                onClick={onIrCierre}
                className="bg-blue-700 hover:bg-blue-900 text-white text-sm px-4 py-2 rounded-lg"
              >
                📊 Cierre del día
              </button>
            )}
            {onIrConfiguracion && (
              <button
                onClick={onIrConfiguracion}
                className="bg-blue-700 hover:bg-blue-900 text-white text-sm px-4 py-2 rounded-lg"
              >
                ⚙️ Configuración
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCambiarUsuario}
            className="bg-blue-500 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
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
          📅 OPERACIONES DE HOY
        </p>
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-blue-900">{totalRacionesHoy.toLocaleString()}</p>
            <p className="text-xs text-blue-600 mt-1">Raciones planificadas</p>
          </div>
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-green-900">{escuelasAtendidas}/{escuelas.length}</p>
            <p className="text-xs text-green-600 mt-1">Escuelas atendidas</p>
          </div>
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold text-orange-900">
              RD$ {(facturacionHoy / 1000).toFixed(1)}K
            </p>
            <p className="text-xs text-orange-600 mt-1">Facturación del día</p>
          </div>
        </div>
      </div>

      {escuelas.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6">
          <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
            🏫 ESCUELAS DEL DÍA
          </p>
          <div className="space-y-2">
            {escuelas.map(escuela => {
              const op = operacionesHoy.find(o => o.escuela_id === escuela.id)
              const estado = op?.estado || 'pendiente'

              return (
                <div key={escuela.id} className="flex items-center justify-between border border-gray-200 rounded-xl p-3 hover:bg-gray-50">
                  <div>
                    <p className="font-bold text-gray-900">{escuela.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {escuela.raciones_contractuales} raciones · RD$ {escuela.precio_racion}/ración
                    </p>
                  </div>
                  <div>
                    {estado === 'entregada' || estado === 'cerrada' ? (
                      <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                        ✅ Entregada
                      </span>
                    ) : estado === 'en_camino' ? (
                      <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">
                        🚚 En camino
                      </span>
                    ) : (
                      <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                        ⏰ Pendiente
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

    </div>
  )
}

export default DashboardDelDia