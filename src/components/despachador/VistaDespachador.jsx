import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const ESTADOS_DESPACHADOR = {
  pendiente:    { label: 'Pendiente',     color: 'bg-gray-100 text-gray-700', emoji: '⏳' },
  preparando:   { label: 'En cocina',     color: 'bg-yellow-100 text-yellow-800', emoji: '🍳' },
  lista:        { label: 'Lista',          color: 'bg-blue-100 text-blue-800', emoji: '✅' },
  despachando:  { label: 'En camino',     color: 'bg-orange-100 text-orange-800', emoji: '🚚' },
  entregada:    { label: 'Entregada',     color: 'bg-green-100 text-green-800', emoji: '🎉' },
  cerrada:      { label: 'Cerrada',       color: 'bg-purple-100 text-purple-800', emoji: '🔒' }
}

function VistaDespachador({ usuario, empresaId, onCerrarSesion, onVolver }) {
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [recetaHoy, setRecetaHoy] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [horaActual, setHoraActual] = useState(new Date())

  useEffect(() => {
    const interval = setInterval(() => setHoraActual(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)

    const DIAS = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
    const diaSemana = DIAS[new Date().getDay()]

    const { data: receta } = await supabase
      .from('recetas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('dia_semana', diaSemana)
      .maybeSingle()

    setRecetaHoy(receta)

    const { data: escuelasData } = await supabase
      .from('escuelas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activa', true)
      .order('nombre', { ascending: true })

    setEscuelas(escuelasData || [])

    const fechaHoy = new Date().toISOString().split('T')[0]
    const { data: opsData } = await supabase
      .from('operaciones_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('fecha', fechaHoy)

    setOperaciones(opsData || [])
    setCargando(false)
  }

  async function marcarLlegada(operacion) {
    if (operacion.estado !== 'lista' && operacion.estado !== 'despachando') {
      alert('Esta escuela aún no está lista para entrega')
      return
    }

    const { error } = await supabase
      .from('operaciones_dia')
      .update({
        estado: 'despachando',
        despachado_por: usuario.id,
        hora_salida: operacion.hora_salida || new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', operacion.id)

    if (!error) cargarDatos()
  }

  async function confirmarEntrega(operacion) {
    const confirmar = window.confirm('¿Confirmar entrega y firma del director?')
    if (!confirmar) return

    const { error } = await supabase
      .from('operaciones_dia')
      .update({
        estado: 'entregada',
        director_firma: true,
        entregado_por: usuario.id,
        hora_entrega: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', operacion.id)

    if (!error) cargarDatos()
  }

  function getOperacion(escuelaId) {
    return operaciones.find(op => op.escuela_id === escuelaId)
  }

  // Stats del despachador
  const entregadas = operaciones.filter(op => op.estado === 'entregada' || op.estado === 'cerrada').length
  const enCamino = operaciones.filter(op => op.estado === 'despachando').length
  const pendientes = escuelas.length - entregadas - enCamino

  const horaFormateada = horaActual.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando...</div>
  }

  return (
    <div className="w-full max-w-md mx-auto">
      
      {/* Header naranja del despachador */}
      <div className="bg-gradient-to-br from-orange-500 to-orange-700 rounded-2xl p-5 mb-4 text-white">
        <div className="flex justify-between items-start mb-3">
          <div>
            <p className="text-orange-100 text-xs font-semibold tracking-wider">
              MODO DESPACHO
            </p>
            <h2 className="text-2xl font-bold mt-1">
              🚚 Hola, {usuario.nombre.split(' ')[0]}
            </h2>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{horaFormateada}</p>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          {onVolver && (
            <button
              onClick={onVolver}
              className="flex-1 bg-orange-700 hover:bg-orange-900 text-white text-xs px-3 py-2 rounded-lg font-semibold"
            >
              ← Volver al dashboard
            </button>
          )}
          <button
            onClick={onCerrarSesion}
            className="flex-1 bg-orange-700 hover:bg-orange-900 text-white text-xs px-3 py-2 rounded-lg"
          >
            Cerrar sesión
          </button>
        </div>
      </div>

      {/* Stats compactas */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-white rounded-xl shadow-sm p-3 text-center">
          <p className="text-xs text-gray-500 font-semibold">PENDIENTES</p>
          <p className="text-2xl font-bold text-gray-900">{pendientes}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 text-center">
          <p className="text-xs text-orange-600 font-semibold">EN CAMINO</p>
          <p className="text-2xl font-bold text-orange-700">{enCamino}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-3 text-center">
          <p className="text-xs text-green-600 font-semibold">ENTREGADAS</p>
          <p className="text-2xl font-bold text-green-700">{entregadas}</p>
        </div>
      </div>

      {/* Plato del día */}
      {recetaHoy && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <p className="text-xs text-gray-500 font-semibold tracking-wider mb-1">
            🍽️ HOY ENTREGAS
          </p>
          <div className="flex items-center gap-3">
            <span className="text-4xl">{recetaHoy.emoji}</span>
            <div>
              <p className="font-bold text-gray-900">{recetaHoy.nombre}</p>
            </div>
          </div>
        </div>
      )}

      {/* Lista de escuelas */}
      <div className="space-y-3">
        <p className="text-xs text-gray-500 font-semibold tracking-wider px-2">
          🏫 TUS ENTREGAS DE HOY
        </p>
        
        {escuelas.map((escuela, i) => {
          const op = getOperacion(escuela.id)
          const estado = op ? ESTADOS_DESPACHADOR[op.estado] : ESTADOS_DESPACHADOR.pendiente

          return (
            <div key={escuela.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              
              {/* Cabecera de la escuela */}
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-base">{escuela.nombre}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-semibold text-blue-700">
                        {escuela.raciones_contractuales} raciones
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${estado.color}`}>
                        {estado.emoji} {estado.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Director */}
                {escuela.director_nombre && (
                  <div className="mt-3 flex items-center gap-2 text-xs text-gray-600">
                    <span>👤</span>
                    <span className="font-semibold">{escuela.director_nombre}</span>
                    {escuela.director_telefono && (
                      <a 
                        href={`tel:${escuela.director_telefono}`}
                        className="ml-auto bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-semibold"
                      >
                        📞 Llamar
                      </a>
                    )}
                  </div>
                )}

                {/* Dirección */}
                {escuela.direccion && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-600">
                    <span>📍</span>
                    <span>{escuela.direccion}</span>
                    {escuela.distancia_km && (
                      <span className="ml-auto text-blue-700 font-semibold">
                        {escuela.distancia_km} km
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Acciones según estado */}
              <div className="p-3 bg-gray-50">
                {!op && (
                  <div className="text-center py-2 text-xs text-gray-500">
                    Esperando que la cocina marque como lista
                  </div>
                )}

                {op?.estado === 'preparando' && (
                  <div className="text-center py-2 text-xs text-yellow-700 font-semibold bg-yellow-50 rounded-lg">
                    🍳 Cocina aún preparando este pedido
                  </div>
                )}

                {op?.estado === 'lista' && (
                  <button
                    onClick={() => marcarLlegada(op)}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl text-base"
                  >
                    🚚 Salir hacia la escuela
                  </button>
                )}

                {op?.estado === 'despachando' && (
                  <button
                    onClick={() => confirmarEntrega(op)}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-base"
                  >
                    📍 Llegué - Confirmar entrega
                  </button>
                )}

                {(op?.estado === 'entregada' || op?.estado === 'cerrada') && (
                  <div className="text-center py-2">
                    <p className="text-green-700 font-bold text-sm">
                      🎉 Entregada exitosamente
                    </p>
                    {op.hora_entrega && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(op.hora_entrega).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                        {op.director_firma && ' · ✍️ Director firmó'}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer motivacional */}
      {entregadas === escuelas.length && escuelas.length > 0 && (
        <div className="mt-4 bg-green-50 border border-green-300 rounded-2xl p-5 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <p className="font-bold text-green-900">¡Todas las entregas completadas!</p>
          <p className="text-sm text-green-700 mt-1">Excelente trabajo {usuario.nombre.split(' ')[0]} 💪</p>
        </div>
      )}

    </div>
  )
}

export default VistaDespachador