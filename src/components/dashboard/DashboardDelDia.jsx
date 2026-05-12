import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalPesajeCrudo from '../pesajes/ModalPesajeCrudo'
import ModalPesajeEscuela from '../pesajes/ModalPesajeEscuela'

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

const ROL_INFO = {
  propietario:    { emoji: '👑', label: 'Propietario' },
  administrador:  { emoji: '💼', label: 'Administrador' },
  jefa_cocina:    { emoji: '👩‍🍳', label: 'Jefa de cocina' },
  despachador:    { emoji: '🚚', label: 'Despachador' },
  ayudante:       { emoji: '👨‍🍳', label: 'Ayudante' },
  contador:       { emoji: '🧮', label: 'Contador' },
  secretaria:     { emoji: '📋', label: 'Secretaria' }
}

const ESTADOS = {
  pendiente:    { label: 'Pendiente',    color: 'bg-gray-100 text-gray-700 border-gray-300', emoji: '⏳' },
  preparando:   { label: 'Preparando',   color: 'bg-yellow-100 text-yellow-800 border-yellow-300', emoji: '🍳' },
  lista:        { label: 'Lista',        color: 'bg-blue-100 text-blue-800 border-blue-300', emoji: '✅' },
  despachando:  { label: 'Despachando',  color: 'bg-orange-100 text-orange-800 border-orange-300', emoji: '🚚' },
  entregada:    { label: 'Entregada',    color: 'bg-green-100 text-green-800 border-green-300', emoji: '🎉' },
  cerrada:      { label: 'Cerrada',      color: 'bg-purple-100 text-purple-800 border-purple-300', emoji: '🔒' }
}

function DashboardDelDia({ usuario, empresaId, onCerrarSesion, onCambiarUsuario, onIrConfiguracion, onIrCierre, onIrCalculadora, onIrInteligencia, onIrDespacho, onIrEmpleados, onVerComoSecretaria }) {
  const [recetaHoy, setRecetaHoy] = useState(null)
  const [todasLasRecetas, setTodasLasRecetas] = useState([])
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [pesajeDia, setPesajeDia] = useState(null)
  const [pesajesEscuelas, setPesajesEscuelas] = useState({})
  const [cargando, setCargando] = useState(true)
  const [horaActual, setHoraActual] = useState(new Date())
  
  const [modalPesajeCrudo, setModalPesajeCrudo] = useState(false)
  const [modalPrePesaje, setModalPrePesaje] = useState(false)
  const [modalPesajeEscuela, setModalPesajeEscuela] = useState(null)
  const [modalCambiarPlato, setModalCambiarPlato] = useState(false)

  useEffect(() => {
    const interval = setInterval(() => setHoraActual(new Date()), 60000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)

    const fechaHoy = new Date().toISOString().split('T')[0]
    const diaSemana = DIAS_SEMANA[horaActual.getDay()]

    const { data: recetasData } = await supabase
      .from('recetas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activa', true)
      .order('dia_semana')
    setTodasLasRecetas(recetasData || [])

    const { data: pesajeDiaData } = await supabase
      .from('pesajes_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('fecha', fechaHoy)
      .maybeSingle()
    setPesajeDia(pesajeDiaData)

    let recetaActiva = null
    if (pesajeDiaData?.receta_id) {
      recetaActiva = recetasData?.find(r => r.id === pesajeDiaData.receta_id)
    } else {
      recetaActiva = recetasData?.find(r => r.dia_semana === diaSemana) || null
    }
    setRecetaHoy(recetaActiva)

    const { data: escuelasData } = await supabase
      .from('escuelas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activa', true)
      .order('nombre', { ascending: true })
    setEscuelas(escuelasData || [])

    const { data: opsData } = await supabase
      .from('operaciones_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('fecha', fechaHoy)
    setOperaciones(opsData || [])

    if (opsData && opsData.length > 0) {
      const opIds = opsData.map(op => op.id)
      const { data: pesajes } = await supabase
        .from('pesajes_operacion')
        .select('*')
        .in('operacion_id', opIds)
      
      const pesajesPorOp = {}
      ;(pesajes || []).forEach(p => {
        if (!pesajesPorOp[p.operacion_id]) pesajesPorOp[p.operacion_id] = []
        pesajesPorOp[p.operacion_id].push(p)
      })
      setPesajesEscuelas(pesajesPorOp)
    }

    setCargando(false)
  }

  // Confirmar cerrar sesión total
  function confirmarCerrarSesion() {
    const confirmar = window.confirm('¿Estás seguro de cerrar sesión? Tendrás que ingresar las credenciales de la empresa nuevamente.')
    if (confirmar && onCerrarSesion) {
      onCerrarSesion()
    }
  }

  async function iniciarDiaParaEscuela(escuela) {
    if (!recetaHoy) {
      alert('Primero debes asignar un plato para hoy en el menú')
      return
    }

    const fechaHoy = new Date().toISOString().split('T')[0]
    
    const { data, error } = await supabase
      .from('operaciones_dia')
      .insert([{
        empresa_id: empresaId,
        escuela_id: escuela.id,
        receta_id: recetaHoy.id,
        fecha: fechaHoy,
        raciones_planificadas: escuela.raciones_contractuales,
        estado: 'preparando',
        hora_inicio_preparacion: new Date().toISOString()
      }])
      .select()

    if (!error) {
      cargarDatos()
    } else {
      alert('Error: ' + error.message)
    }
  }

  async function cambiarEstado(operacion, nuevoEstado) {
    const updates = { estado: nuevoEstado, updated_at: new Date().toISOString() }
    
    if (nuevoEstado === 'lista') updates.hora_lista = new Date().toISOString()
    if (nuevoEstado === 'despachando') updates.hora_salida = new Date().toISOString()
    if (nuevoEstado === 'entregada') updates.hora_entrega = new Date().toISOString()

    const { error } = await supabase
      .from('operaciones_dia')
      .update(updates)
      .eq('id', operacion.id)

    if (!error) cargarDatos()
  }

  async function marcarSinClase(escuela) {
    const razon = prompt(`¿Razón por la que ${escuela.nombre} no tuvo clase hoy?\n(Ej: lluvia, paro, evento...)`)
    if (razon === null) return
    
    const fechaHoy = new Date().toISOString().split('T')[0]
    const op = getOperacionDeEscuela(escuela.id)
    
    if (op) {
      await supabase
        .from('operaciones_dia')
        .update({
          no_hubo_clase: true,
          razon_no_clase: razon || 'Sin especificar',
          estado: 'cerrada',
          raciones_planificadas: 0,
        })
        .eq('id', op.id)
    } else {
      await supabase
        .from('operaciones_dia')
        .insert([{
          empresa_id: empresaId,
          escuela_id: escuela.id,
          receta_id: recetaHoy?.id,
          fecha: fechaHoy,
          raciones_planificadas: 0,
          estado: 'cerrada',
          no_hubo_clase: true,
          razon_no_clase: razon || 'Sin especificar',
        }])
    }
    
    cargarDatos()
  }

  async function reactivarEscuela(op) {
    if (!confirm('¿Reactivar esta escuela? Volverá al estado pendiente.')) return
    
    await supabase
      .from('operaciones_dia')
      .delete()
      .eq('id', op.id)
    
    cargarDatos()
  }

  async function cambiarReceta(nuevaReceta) {
    if (!pesajeDia) {
      setRecetaHoy(nuevaReceta)
      setModalCambiarPlato(false)
      return
    }
    
    if (!confirm('Ya hay un pesaje aprobado con la receta anterior. Cambiar la receta REQUIERE re-pesar. ¿Continuar?')) {
      return
    }
    
    await supabase
      .from('pesajes_dia_ingredientes')
      .delete()
      .eq('pesaje_dia_id', pesajeDia.id)
    
    await supabase
      .from('pesajes_dia')
      .delete()
      .eq('id', pesajeDia.id)
    
    setRecetaHoy(nuevaReceta)
    setPesajeDia(null)
    setModalCambiarPlato(false)
    cargarDatos()
  }

  function getOperacionDeEscuela(escuelaId) {
    return operaciones.find(op => op.escuela_id === escuelaId)
  }

  function getPesajesDeOperacion(operacionId) {
    return pesajesEscuelas[operacionId] || []
  }

  const hora = horaActual.getHours()
  const saludo = hora < 12 ? 'Buenos días' : hora < 18 ? 'Buenas tardes' : 'Buenas noches'
  
  const diaTexto = DIAS_SEMANA[horaActual.getDay()].charAt(0).toUpperCase() + DIAS_SEMANA[horaActual.getDay()].slice(1)
  const horaFormateada = horaActual.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
  const fechaFormateada = horaActual.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })

  const escuelasConClase = escuelas.filter(e => {
    const op = getOperacionDeEscuela(e.id)
    return !op || !op.no_hubo_clase
  })
  const totalRaciones = escuelasConClase.reduce((sum, e) => {
    const op = getOperacionDeEscuela(e.id)
    if (op?.no_hubo_clase) return sum
    return sum + (e.raciones_contractuales || 0)
  }, 0)
  const escuelasCompletadas = operaciones.filter(op => 
    (op.estado === 'entregada' || op.estado === 'cerrada') && !op.no_hubo_clase
  ).length
  const escuelasSinClase = operaciones.filter(op => op.no_hubo_clase).length
  const totalEscuelasActivas = escuelas.length - escuelasSinClase
  const progreso = totalEscuelasActivas > 0 ? Math.round((escuelasCompletadas / totalEscuelasActivas) * 100) : 0
  
  const todasCerradas = escuelas.length > 0 && escuelas.every(e => {
    const op = getOperacionDeEscuela(e.id)
    return op && (op.estado === 'cerrada' || op.no_hubo_clase)
  })

  const fechaManana = new Date(horaActual)
  fechaManana.setDate(fechaManana.getDate() + 1)
  const diaSemanaManana = DIAS_SEMANA[fechaManana.getDay()]
  const recetaManana = todasLasRecetas.find(r => r.dia_semana === diaSemanaManana)
  const fechaMananaStr = fechaManana.toISOString().split('T')[0]
  const racionesManana = escuelas.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0)

  const info = ROL_INFO[usuario?.rol] || ROL_INFO.ayudante

  const puedeConfigurar = usuario?.rol === 'propietario' || usuario?.rol === 'administrador'

  if (cargando) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cargando dashboard...</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-6xl">
      
      <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-blue-100 text-sm font-semibold tracking-wider">
              {fechaFormateada.toUpperCase()}
            </p>
            <h2 className="text-3xl font-bold mt-1">
              {saludo}, {usuario?.nombre.split(' ')[0]} {info.emoji}
            </h2>
            <p className="text-blue-200 mt-1">
              Hoy es {diaTexto}
            </p>
          </div>
          <div className="text-right">
            <p className="text-5xl font-bold">{horaFormateada}</p>
            <div className="flex gap-2 mt-2 justify-end flex-wrap">
              {onVerComoSecretaria && (
                <button
                  onClick={onVerComoSecretaria}
                  className="bg-pink-500 hover:bg-pink-600 text-white text-xs px-3 py-1 rounded-lg font-bold"
                >
                  📋 Ver como Secretaria
                </button>
              )}
              {onIrDespacho && (
                <button
                  onClick={onIrDespacho}
                  className="bg-orange-500 hover:bg-orange-600 text-white text-xs px-3 py-1 rounded-lg font-bold"
                >
                  🚚 Modo Despacho
                </button>
              )}
              {onIrInteligencia && (
                <button
                  onClick={onIrInteligencia}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 rounded-lg"
                >
                  🧠 Inteligencia
                </button>
              )}
              {onIrEmpleados && (
                <button
                  onClick={onIrEmpleados}
                  className="bg-pink-600 hover:bg-pink-700 text-white text-xs px-3 py-1 rounded-lg"
                >
                  👥 Empleados
                </button>
              )}
              {onIrCalculadora && (
                <button
                  onClick={onIrCalculadora}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3 py-1 rounded-lg"
                >
                  📐 Calculadora
                </button>
              )}
              {onIrCierre && (
                <button
                  onClick={onIrCierre}
                  className="bg-purple-600 hover:bg-purple-700 text-white text-xs px-3 py-1 rounded-lg"
                >
                  🔒 Cierre del día
                </button>
              )}
              {puedeConfigurar && onIrConfiguracion && (
                <button
                  onClick={onIrConfiguracion}
                  className="bg-blue-700 hover:bg-blue-900 text-white text-xs px-3 py-1 rounded-lg"
                >
                  ⚙️ Configuración
                </button>
              )}
            </div>
          </div>
        </div>

        {/* 🆕 BOTONES DE SESIÓN: Cambiar usuario + Cerrar sesión */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={onCambiarUsuario}
            className="bg-blue-500 hover:bg-blue-400 text-white text-sm px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2"
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

      {recetaHoy ? (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex justify-between items-start mb-2">
            <p className="text-xs text-gray-500 font-semibold tracking-wider">
              🍽️ PLATO DE HOY
            </p>
            <button
              onClick={() => setModalCambiarPlato(true)}
              className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-1 rounded-lg"
            >
              ✏️ Cambiar plato
            </button>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-6xl">{recetaHoy.emoji}</span>
            <div className="flex-1">
              <h3 className="text-2xl font-bold text-gray-900">{recetaHoy.nombre}</h3>
              <div className="flex flex-wrap gap-2 mt-2">
                {recetaHoy.tiempo_preparacion_min && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    ⏱️ {recetaHoy.tiempo_preparacion_min < 60 ? `${recetaHoy.tiempo_preparacion_min}min` : `${Math.floor(recetaHoy.tiempo_preparacion_min / 60)}h`}
                  </span>
                )}
                {recetaHoy.personas_requeridas && (
                  <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                    👥 {recetaHoy.personas_requeridas} personas
                  </span>
                )}
                {recetaHoy.popularidad === 'baja' && (
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded font-semibold">
                    ⚠️ Suele sobrar
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-6 mb-6 flex justify-between items-center">
          <div>
            <p className="text-yellow-800 font-semibold">
              ⚠️ No hay plato asignado para hoy ({diaTexto})
            </p>
            <p className="text-sm text-yellow-700 mt-1">
              Selecciona una receta del menú para arrancar el día
            </p>
          </div>
          <button
            onClick={() => setModalCambiarPlato(true)}
            className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-5 py-3 rounded-xl shadow-lg whitespace-nowrap"
          >
            ✏️ Asignar receta
          </button>
        </div>
      )}

      {recetaHoy && totalRaciones > 0 && (
        <div className={`rounded-2xl p-5 mb-6 ${
          pesajeDia 
            ? 'bg-green-50 border-2 border-green-300' 
            : 'bg-gradient-to-br from-emerald-500 to-emerald-700 text-white'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex-1">
              {pesajeDia ? (
                <>
                  <p className="text-xs text-green-700 font-semibold tracking-wider">
                    ✅ PESAJE DEL DÍA APROBADO
                  </p>
                  <p className="text-lg font-bold text-green-900 mt-1">
                    {pesajeDia.fue_pre_aprobado && '🌙 '}
                    Pesado y listo · {pesajeDia.total_raciones} raciones
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {pesajeDia.fue_pre_aprobado 
                      ? 'Pre-aprobado el día anterior' 
                      : `Aprobado a las ${new Date(pesajeDia.hora_aprobacion).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}`
                    }
                  </p>
                </>
              ) : (
                <>
                  <p className="text-xs opacity-80 font-semibold tracking-wider">
                    ⚖️ PESAJE CRUDO DEL DÍA
                  </p>
                  <p className="text-xl font-bold mt-1">
                    Aprueba el pesaje sugerido para iniciar
                  </p>
                  <p className="text-sm opacity-90 mt-1">
                    {totalRaciones.toLocaleString()} raciones de {recetaHoy.nombre}
                  </p>
                </>
              )}
            </div>
            <button
              onClick={() => setModalPesajeCrudo(true)}
              className={`px-6 py-3 font-bold rounded-xl shadow-lg ${
                pesajeDia
                  ? 'bg-white border border-green-300 text-green-700 hover:bg-green-100'
                  : 'bg-white text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              {pesajeDia ? '✏️ Editar' : '⚖️ Aprobar pesaje'}
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">ESCUELAS</p>
          <p className="text-3xl font-bold text-gray-900">
            {totalEscuelasActivas}
            {escuelasSinClase > 0 && (
              <span className="text-sm text-orange-600 ml-1">/ {escuelas.length}</span>
            )}
          </p>
          {escuelasSinClase > 0 && (
            <p className="text-xs text-orange-600">{escuelasSinClase} sin clase</p>
          )}
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">RACIONES</p>
          <p className="text-3xl font-bold text-gray-900">{totalRaciones.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">PROGRESO</p>
          <p className="text-3xl font-bold text-green-600">{progreso}%</p>
        </div>
      </div>

      <div>
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
          🏫 ESCUELAS DE HOY
        </p>
        <div className="space-y-3">
          {escuelas.map((escuela) => {
            const op = getOperacionDeEscuela(escuela.id)
            const estado = op ? ESTADOS[op.estado] : null
            const sinClase = op?.no_hubo_clase
            const pesajesOp = op ? getPesajesDeOperacion(op.id) : []
            const tienePesajeCocinado = pesajesOp.some(p => p.tipo === 'cocinado')
            const tienePesajeSobrante = pesajesOp.some(p => p.tipo === 'retorno')

            return (
              <div 
                key={escuela.id} 
                className={`rounded-2xl shadow-sm p-5 ${
                  sinClase ? 'bg-gray-100 border border-gray-300' : 'bg-white'
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    sinClase ? 'bg-gray-200' : 'bg-blue-100'
                  }`}>
                    {sinClase ? '🚫' : '🏫'}
                  </div>
                  <div className="flex-1">
                    <p className={`font-bold ${sinClase ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                      {escuela.nombre}
                    </p>
                    {sinClase ? (
                      <p className="text-sm text-orange-700 font-semibold">
                        🚫 Sin clase: {op.razon_no_clase}
                      </p>
                    ) : (
                      <p className="text-sm text-gray-500">
                        {escuela.raciones_contractuales} raciones
                        {escuela.director_nombre && ` · ${escuela.director_nombre}`}
                      </p>
                    )}
                  </div>
                  
                  {sinClase ? (
                    <button
                      onClick={() => reactivarEscuela(op)}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold px-3 py-2 rounded-lg"
                    >
                      ↺ Reactivar
                    </button>
                  ) : estado ? (
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold border ${estado.color}`}>
                      {estado.emoji} {estado.label}
                    </span>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => marcarSinClase(escuela)}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-semibold px-3 py-2 rounded-lg"
                        title="Marcar que no hubo clase"
                      >
                        🚫 Sin clase
                      </button>
                      <button
                        onClick={() => iniciarDiaParaEscuela(escuela)}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
                      >
                        🚀 Iniciar día
                      </button>
                    </div>
                  )}
                </div>

                {op && !sinClase && (
                  <div className="flex gap-2 mt-4 flex-wrap">
                    {op.estado === 'preparando' && (
                      <button
                        onClick={() => cambiarEstado(op, 'lista')}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-2 rounded-lg"
                      >
                        ✅ Marcar como lista
                      </button>
                    )}
                    {op.estado === 'lista' && (
                      <button
                        onClick={() => cambiarEstado(op, 'despachando')}
                        className="bg-orange-600 hover:bg-orange-700 text-white text-xs font-semibold px-3 py-2 rounded-lg"
                      >
                        🚚 Despachar
                      </button>
                    )}
                    {op.estado === 'despachando' && (
                      <button
                        onClick={() => cambiarEstado(op, 'entregada')}
                        className="bg-green-600 hover:bg-green-700 text-white text-xs font-semibold px-3 py-2 rounded-lg"
                      >
                        🎉 Marcar entregada
                      </button>
                    )}
                    {op.estado === 'entregada' && (
                      <button
                        onClick={() => cambiarEstado(op, 'cerrada')}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold px-3 py-2 rounded-lg"
                      >
                        🔒 Cerrar día
                      </button>
                    )}
                    
                    <button
                      onClick={() => setModalPesajeEscuela(op)}
                      className={`text-xs font-semibold px-3 py-2 rounded-lg ${
                        tienePesajeCocinado || tienePesajeSobrante
                          ? 'bg-blue-100 hover:bg-blue-200 text-blue-700 border border-blue-300'
                          : 'bg-blue-600 hover:bg-blue-700 text-white'
                      }`}
                    >
                      ⚖️ Pesar 
                      {(tienePesajeCocinado || tienePesajeSobrante) && (
                        <span className="ml-1">
                          ({(tienePesajeCocinado ? 1 : 0) + (tienePesajeSobrante ? 1 : 0)}/2)
                        </span>
                      )}
                    </button>
                    
                    {op.hora_inicio_preparacion && (
                      <span className="text-xs text-gray-500 self-center">
                        Iniciado: {new Date(op.hora_inicio_preparacion).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {todasCerradas && recetaManana && (
        <div className="fixed bottom-6 right-6 z-40">
          <button
            onClick={() => setModalPrePesaje(true)}
            className="bg-gradient-to-br from-purple-600 to-purple-800 hover:from-purple-700 hover:to-purple-900 text-white font-bold px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3"
          >
            <span className="text-3xl">🌙</span>
            <div className="text-left">
              <p className="text-xs opacity-80">DÍA TERMINADO</p>
              <p className="font-bold">Pesar para mañana</p>
              <p className="text-xs opacity-80">{recetaManana.emoji} {recetaManana.nombre}</p>
            </div>
          </button>
        </div>
      )}

      {modalCambiarPlato && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="bg-gray-900 text-white p-6">
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs opacity-80 tracking-wider">
                    {recetaHoy ? 'CAMBIAR PLATO DEL DÍA' : 'ASIGNAR RECETA'}
                  </p>
                  <h2 className="text-2xl font-bold mt-1">🍽️ Selecciona la receta</h2>
                  <p className="text-sm opacity-90 mt-1">
                    Hoy es {diaTexto}
                    {recetaHoy && ` · Actual: ${recetaHoy.nombre}`}
                  </p>
                </div>
                <button onClick={() => setModalCambiarPlato(false)} className="text-2xl opacity-70 hover:opacity-100">
                  ✕
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 space-y-2">
              {todasLasRecetas.map(r => (
                <button
                  key={r.id}
                  onClick={() => cambiarReceta(r)}
                  className={`w-full p-3 rounded-xl border-2 text-left transition-colors ${
                    recetaHoy?.id === r.id
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-400 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{r.emoji}</span>
                    <div className="flex-1">
                      <p className="font-bold">{r.nombre}</p>
                      <p className="text-xs text-gray-500 capitalize">📅 {r.dia_semana}</p>
                    </div>
                    {recetaHoy?.id === r.id && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-semibold">
                        ✅ Activa
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalPesajeCrudo && recetaHoy && (
        <ModalPesajeCrudo
          empresaId={empresaId}
          usuario={usuario}
          receta={recetaHoy}
          totalRaciones={totalRaciones}
          fecha={new Date().toISOString().split('T')[0]}
          modoPreAprobacion={false}
          onCerrar={() => setModalPesajeCrudo(false)}
          onAprobado={() => cargarDatos()}
        />
      )}

      {modalPrePesaje && recetaManana && (
        <ModalPesajeCrudo
          empresaId={empresaId}
          usuario={usuario}
          receta={recetaManana}
          totalRaciones={racionesManana}
          fecha={fechaMananaStr}
          modoPreAprobacion={true}
          onCerrar={() => setModalPrePesaje(false)}
          onAprobado={() => cargarDatos()}
        />
      )}

      {modalPesajeEscuela && (
        <ModalPesajeEscuela
          empresaId={empresaId}
          usuario={usuario}
          operacion={modalPesajeEscuela}
          escuela={escuelas.find(e => e.id === modalPesajeEscuela.escuela_id)}
          receta={recetaHoy}
          onCerrar={() => setModalPesajeEscuela(null)}
          onGuardado={() => cargarDatos()}
        />
      )}

    </div>
  )
}

export default DashboardDelDia