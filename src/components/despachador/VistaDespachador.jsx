import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalEntregarYFirmar from './ModalEntregarYFirmar'
import ModalPesarYDespachar from './ModalPesarYDespachar'
import ModalPesarSobrante from './ModalPesarSobrante'

const ESTADOS_DESPACHADOR = {
  pendiente:    { label: 'Pendiente',     color: 'bg-gray-100 text-gray-700', emoji: '⏳' },
  preparando:   { label: 'En cocina',     color: 'bg-yellow-100 text-yellow-800', emoji: '🍳' },
  lista:        { label: 'Lista',          color: 'bg-blue-100 text-blue-800', emoji: '✅' },
  despachando:  { label: 'En camino',     color: 'bg-orange-100 text-orange-800', emoji: '🚚' },
  entregada:    { label: 'Entregada',     color: 'bg-green-100 text-green-800', emoji: '🎉' },
  cerrada:      { label: 'Cerrada',       color: 'bg-purple-100 text-purple-800', emoji: '🔒' },
  sin_clase:    { label: 'Sin clase',     color: 'bg-gray-200 text-gray-600', emoji: '🚫' }
}

function VistaDespachador({ usuario, empresaId, onCerrarSesion, onCambiarUsuario, onVolver }) {
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [recetaHoy, setRecetaHoy] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [horaActual, setHoraActual] = useState(new Date())
  const [empresa, setEmpresa] = useState(null)
  const [modalFirma, setModalFirma] = useState(null)
  const [modalPesaje, setModalPesaje] = useState(null)
  const [modalSobrante, setModalSobrante] = useState(null)
  const [procesando, setProcesando] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setHoraActual(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

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

  async function marcarLista(operacion) {
    setProcesando(true)
    const { error } = await supabase
      .from('operaciones_dia')
      .update({
        estado: 'lista',
        hora_lista: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', operacion.id)

    if (error) {
      alert('Error al marcar como lista: ' + error.message)
      setProcesando(false)
      return
    }
    await cargarDatos()
    setProcesando(false)
  }

  function getOperacion(escuelaId) {
    return operaciones.find(op => op.escuela_id === escuelaId)
  }

  function confirmarCerrarSesion() {
    const confirmar = window.confirm('¿Estás seguro de cerrar sesión? Tendrás que ingresar las credenciales de la empresa nuevamente.')
    if (confirmar && onCerrarSesion) {
      onCerrarSesion()
    }
  }

  const entregadas = operaciones.filter(op => op.estado === 'entregada' || op.estado === 'cerrada').length
  const enCamino = operaciones.filter(op => op.estado === 'despachando').length
  const sinClaseCount = operaciones.filter(op => op.estado === 'sin_clase').length
  const pendientes = escuelas.length - entregadas - enCamino - sinClaseCount

  const horaFormateada = horaActual.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando...</div>
  }

  return (
    <div className="w-full max-w-md mx-auto">
      
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

        {onVolver && (
          <button
            onClick={onVolver}
            className="w-full bg-orange-700 hover:bg-orange-900 text-white text-xs px-3 py-2 rounded-lg font-semibold mb-2"
          >
            ← Volver al dashboard
          </button>
        )}

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCambiarUsuario}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-1"
          >
            🔄 Cambiar usuario
          </button>
          <button
            onClick={confirmarCerrarSesion}
            className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-1"
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </div>

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

      <div className="space-y-3">
        <p className="text-xs text-gray-500 font-semibold tracking-wider px-2">
          🏫 TUS ENTREGAS DE HOY
        </p>
        
        {escuelas.map((escuela, i) => {
          const op = getOperacion(escuela.id)
          const estado = op ? ESTADOS_DESPACHADOR[op.estado] : ESTADOS_DESPACHADOR.pendiente

          return (
            <div key={escuela.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
              
              <div className="p-4 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-xl flex-shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-base">{escuela.nombre}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-sm font-semibold text-blue-700">
                        {escuela.raciones_contractuales} raciones
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full font-semibold ${estado.color}`}>
                        {estado.emoji} {estado.label}
                      </span>
                    </div>
                  </div>
                </div>

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

                {op?.razon_no_clase && (
                  <div className="mt-2 text-xs text-gray-600 italic bg-gray-50 rounded-lg px-2 py-1">
                    📝 {op.razon_no_clase}
                  </div>
                )}

                {op?.peso_cocido_lb && (
                  <div className="mt-2 text-xs text-blue-700 font-semibold bg-blue-50 rounded-lg px-2 py-1">
                    ⚖️ Pesaje cocido: {op.peso_cocido_lb} lb
                  </div>
                )}
              </div>

              <div className="p-3 bg-gray-50">
                {!op && (
                  <div className="text-center py-2 text-xs text-gray-500">
                    Aún no se ha iniciado esta operación
                  </div>
                )}

                {op?.estado === 'preparando' && (
                  <button
                    onClick={() => marcarLista(op)}
                    disabled={procesando}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl text-base disabled:opacity-50"
                  >
                    ✅ Marcar como Lista para Despachar
                  </button>
                )}

                {op?.estado === 'lista' && (
                  <button
                    onClick={() => setModalPesaje({ operacion: op, escuela })}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 rounded-xl text-base"
                  >
                    ⚖️ Pesar y Despachar
                  </button>
                )}

                {op?.estado === 'despachando' && (
                  <button
                    onClick={() => setModalFirma({ operacion: op, escuela })}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl text-base"
                  >
                    📍 Llegué - Mostrar conduce y firmar
                  </button>
                )}

                {op?.estado === 'entregada' && (
                  <>
                    <div className="text-center py-2 mb-2">
                      <p className="text-green-700 font-bold text-sm">
                        🎉 Entregada exitosamente
                      </p>
                      {op.hora_entrega && (
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(op.hora_entrega).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                          {op.director_firma && ' · ✍️ Director firmó'}
                        </p>
                      )}
                      {op.firmado_por_nombre && (
                        <p className="text-xs text-gray-600 mt-1">
                          Recibido por: <strong>{op.firmado_por_nombre}</strong>
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setModalSobrante({ operacion: op, escuela })}
                      className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl text-base"
                    >
                      🍱 Pesar sobrante y cerrar día
                    </button>
                  </>
                )}

                {op?.estado === 'cerrada' && (
                  <div className="text-center py-2">
                    <p className="text-purple-700 font-bold text-sm">
                      🔒 Día cerrado
                    </p>
                    {op.hora_regreso && (
                      <p className="text-xs text-gray-500 mt-1">
                        Cierre: {new Date(op.hora_regreso).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    )}
                    {op.firmado_por_nombre && (
                      <p className="text-xs text-gray-600 mt-1">
                        Recibido por: <strong>{op.firmado_por_nombre}</strong>
                      </p>
                    )}
                  </div>
                )}

                {op?.estado === 'sin_clase' && (
                  <div className="text-center py-2 text-xs text-gray-600 font-semibold bg-gray-100 rounded-lg">
                    🚫 Sin clase hoy
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {entregadas === escuelas.length && escuelas.length > 0 && (
        <div className="mt-4 bg-green-50 border border-green-300 rounded-2xl p-5 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <p className="font-bold text-green-900">¡Todas las entregas completadas!</p>
          <p className="text-sm text-green-700 mt-1">Excelente trabajo {usuario.nombre.split(' ')[0]} 💪</p>
        </div>
      )}

      {/* Modal de pesaje y despacho */}
      {modalPesaje && (
        <ModalPesarYDespachar
          operacion={modalPesaje.operacion}
          empresaId={empresaId}
          usuario={usuario}
          onCerrar={() => setModalPesaje(null)}
          onDespachado={() => {
            cargarDatos()
            setModalPesaje(null)
          }}
        />
      )}

      {/* Modal de firma */}
      {modalFirma && (
        <ModalEntregarYFirmar
          operacion={modalFirma.operacion}
          escuela={modalFirma.escuela}
          recetaHoy={recetaHoy}
          empresa={empresa}
          usuario={usuario}
          onCerrar={() => setModalFirma(null)}
          onGuardado={() => {
            cargarDatos()
            setModalFirma(null)
          }}
        />
      )}

      {/* Modal de pesar sobrante y cerrar día */}
      {modalSobrante && (
        <ModalPesarSobrante
          operacion={modalSobrante.operacion}
          empresaId={empresaId}
          usuario={usuario}
          onCerrar={() => setModalSobrante(null)}
          onCerrado={() => {
            cargarDatos()
            setModalSobrante(null)
          }}
        />
      )}

    </div>
  )
}

export default VistaDespachador