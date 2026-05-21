import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { registrar, TIPOS_ACCION } from '../../utils/historial'
import ModalPesajeCrudo from '../pesaje/ModalPesajeCrudo'

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
  onIrContratos,
  onIrMiContrato,
  onIrCompras,
  onIrIngredientes,
  onIrGastos,
  onIrCatalogo,
  onIrHistorial,
  onVerComoSecretaria 
}) {
  const [empresa, setEmpresa] = useState(null)
  const [escuelas, setEscuelas] = useState([])
  const [operacionesHoy, setOperacionesHoy] = useState([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [modalSinClase, setModalSinClase] = useState(null)
  const [razonSinClase, setRazonSinClase] = useState('')
  const [yaSePesoHoy, setYaSePesoHoy] = useState(false)
  const [modalPesajeAbierto, setModalPesajeAbierto] = useState(false)
  const [modoEdicionCrudo, setModoEdicionCrudo] = useState(false)

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

    // Detectar si ya se pesó crudo hoy
    const { count: countCrudo } = await supabase
      .from('movimientos_inventario')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('fecha', fechaHoy)
      .eq('origen', 'consumo_operacion')
    setYaSePesoHoy((countCrudo || 0) > 0)

    setCargando(false)
  }

  function confirmarCerrarSesion() {
    const confirmar = window.confirm('¿Estás seguro de cerrar sesión? Tendrás que ingresar las credenciales de la empresa nuevamente.')
    if (confirmar && onCerrarSesion) {
      onCerrarSesion()
    }
  }

  async function iniciarEscuela(escuela) {
    setProcesando(true)
    const fechaHoy = new Date().toISOString().split('T')[0]
    
    const nuevaOp = {
      empresa_id: empresaId,
      escuela_id: escuela.id,
      fecha: fechaHoy,
      raciones_planificadas: escuela.raciones_contractuales || 0,
      estado: 'preparando',
      hora_inicio_preparacion: new Date().toISOString(),
      despachador_id: usuario.id,
    }

    const { data: opCreada, error } = await supabase
      .from('operaciones_dia')
      .insert([nuevaOp])
      .select()
      .single()

    if (error) {
      alert('Error al iniciar la escuela: ' + error.message)
      setProcesando(false)
      return
    }

    await registrar({
      empresaId,
      usuario,
      tipoAccion: TIPOS_ACCION.ESCUELA_INICIADA,
      descripcion: `Inició preparación de ${escuela.nombre} (${escuela.raciones_contractuales || 0} raciones)`,
      entidad: 'operacion_dia',
      entidadId: opCreada?.id,
      detallesExtra: {
        escuela_nombre: escuela.nombre,
        escuela_id: escuela.id,
        raciones: escuela.raciones_contractuales || 0
      }
    })

    await cargarDatos()
    setProcesando(false)
  }

  async function iniciarTodas() {
    const escuelasPendientes = escuelas.filter(e => {
      const op = operacionesHoy.find(o => o.escuela_id === e.id)
      return !op
    })

    if (escuelasPendientes.length === 0) {
      alert('No hay escuelas pendientes para iniciar')
      return
    }

    const confirmar = window.confirm(
      `¿Iniciar la preparación para ${escuelasPendientes.length} escuela(s)?\n\n` +
      escuelasPendientes.map(e => `• ${e.nombre} (${e.raciones_contractuales} raciones)`).join('\n')
    )

    if (!confirmar) return

    setProcesando(true)
    const fechaHoy = new Date().toISOString().split('T')[0]
    const ahora = new Date().toISOString()

    const operacionesNuevas = escuelasPendientes.map(escuela => ({
      empresa_id: empresaId,
      escuela_id: escuela.id,
      fecha: fechaHoy,
      raciones_planificadas: escuela.raciones_contractuales || 0,
      estado: 'preparando',
      hora_inicio_preparacion: ahora,
      despachador_id: usuario.id,
    }))

    const { data: opsCreadas, error } = await supabase
      .from('operaciones_dia')
      .insert(operacionesNuevas)
      .select()

    if (error) {
      alert('Error al iniciar las escuelas: ' + error.message)
      setProcesando(false)
      return
    }

    const totalRaciones = escuelasPendientes.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0)
    
    await registrar({
      empresaId,
      usuario,
      tipoAccion: TIPOS_ACCION.ESCUELA_INICIADA,
      descripcion: `🚀 Inició día completo: ${escuelasPendientes.length} escuela(s) · ${totalRaciones.toLocaleString()} raciones totales`,
      entidad: 'operacion_dia',
      detallesExtra: {
        escuelas: escuelasPendientes.map(e => ({
          id: e.id,
          nombre: e.nombre,
          raciones: e.raciones_contractuales || 0
        })),
        total_raciones: totalRaciones,
        cantidad_escuelas: escuelasPendientes.length
      }
    })

    await cargarDatos()
    setProcesando(false)
  }

  async function marcarLista(operacion) {
    setProcesando(true)
    
    const escuela = escuelas.find(e => e.id === operacion.escuela_id)
    const nombreEscuela = escuela?.nombre || 'Escuela'
    
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

    await registrar({
      empresaId,
      usuario,
      tipoAccion: TIPOS_ACCION.ESCUELA_LISTA,
      descripcion: `Marcó comida lista para ${nombreEscuela}`,
      entidad: 'operacion_dia',
      entidadId: operacion.id,
      detallesExtra: {
        escuela_nombre: nombreEscuela,
        escuela_id: operacion.escuela_id,
        raciones: operacion.raciones_planificadas
      }
    })

    await cargarDatos()
    setProcesando(false)
  }

  function abrirModalSinClase(escuela) {
    setModalSinClase(escuela)
    setRazonSinClase('')
  }

  async function confirmarSinClase() {
    if (!modalSinClase) return
    if (!razonSinClase.trim()) {
      alert('Por favor indica la razón por la cual no hay clase')
      return
    }

    setProcesando(true)
    const fechaHoy = new Date().toISOString().split('T')[0]

    const nuevaOp = {
      empresa_id: empresaId,
      escuela_id: modalSinClase.id,
      fecha: fechaHoy,
      raciones_planificadas: 0,
      estado: 'sin_clase',
      razon_no_clase: razonSinClase.trim(),
      despachador_id: usuario.id,
    }

    const { data: opCreada, error } = await supabase
      .from('operaciones_dia')
      .insert([nuevaOp])
      .select()
      .single()

    if (error) {
      alert('Error al marcar sin clase: ' + error.message)
      setProcesando(false)
      return
    }

    await registrar({
      empresaId,
      usuario,
      tipoAccion: TIPOS_ACCION.ESCUELA_SIN_CLASE,
      descripcion: `🚫 Marcó ${modalSinClase.nombre} como SIN CLASE: "${razonSinClase.trim()}"`,
      entidad: 'operacion_dia',
      entidadId: opCreada?.id,
      detallesExtra: {
        escuela_nombre: modalSinClase.nombre,
        escuela_id: modalSinClase.id,
        razon: razonSinClase.trim()
      }
    })

    setModalSinClase(null)
    setRazonSinClase('')
    await cargarDatos()
    setProcesando(false)
  }

  async function pesajeAprobado() {
    setModalPesajeAbierto(false)
    setModoEdicionCrudo(false)
    await cargarDatos()
  }

  const totalRacionesHoy = operacionesHoy
    .filter(op => op.estado !== 'sin_clase')
    .reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)

  const facturacionHoy = operacionesHoy.reduce((sum, op) => {
    if (op.estado === 'sin_clase') return sum
    const escuela = escuelas.find(e => e.id === op.escuela_id)
    return sum + ((op.raciones_planificadas || 0) * (parseFloat(escuela?.precio_racion) || 0))
  }, 0)

  const escuelasAtendidas = operacionesHoy.filter(op => 
    op.estado === 'entregada' || op.estado === 'cerrada'
  ).length

  const escuelasPendientesCount = escuelas.filter(e => {
    const op = operacionesHoy.find(o => o.escuela_id === e.id)
    return !op
  }).length

  const operacionesPreparando = operacionesHoy.filter(op => 
    op.estado === 'preparando' || op.estado === 'lista' || op.estado === 'despachando' || op.estado === 'entregada' || op.estado === 'cerrada'
  )
  const todasDecididas = escuelasPendientesCount === 0
  const hayEscuelasIniciadas = operacionesPreparando.length > 0
  const mostrarBotonPesaje = todasDecididas && hayEscuelasIniciadas && !yaSePesoHoy

  const escuelasEntregadas = operacionesHoy.filter(op => 
    op.estado === 'entregada' || op.estado === 'cerrada'
  ).length
  const escuelasEnCamino = operacionesHoy.filter(op => op.estado === 'despachando').length
  const escuelasOperativas = escuelas.length - operacionesHoy.filter(op => op.estado === 'sin_clase').length
  const todasEntregadas = escuelasOperativas > 0 && escuelasEntregadas >= escuelasOperativas
  const mostrarBotonDespacho = yaSePesoHoy && hayEscuelasIniciadas && !todasEntregadas

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando dashboard...</div>
  }

  const fechaHoyTexto = new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div className="w-full max-w-5xl">
      
      {modalSinClase && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              🚫 Sin clase hoy
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Marcar <strong>{modalSinClase.nombre}</strong> como sin clase hoy.
              No se facturará a INABIE.
            </p>
            <label className="block text-xs font-semibold text-gray-700 mb-1">
              Razón (obligatoria)
            </label>
            <textarea
              value={razonSinClase}
              onChange={(e) => setRazonSinClase(e.target.value)}
              placeholder="Ej: Día feriado, suspensión por lluvia, evento escolar, etc."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none mb-4"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={confirmarSinClase}
                disabled={procesando}
                className="flex-1 bg-gray-700 hover:bg-gray-800 text-white font-bold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                {procesando ? 'Guardando...' : '🚫 Confirmar sin clase'}
              </button>
              <button
                onClick={() => { setModalSinClase(null); setRazonSinClase('') }}
                disabled={procesando}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg disabled:opacity-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalPesajeAbierto && (
        <ModalPesajeCrudo
          empresaId={empresaId}
          usuario={usuario}
          operacionesPreparando={operacionesPreparando}
          escuelas={escuelas}
          modoEdicion={modoEdicionCrudo}
          onCerrar={() => {
            setModalPesajeAbierto(false)
            setModoEdicionCrudo(false)
          }}
          onAprobado={pesajeAprobado}
        />
      )}

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
              <button onClick={onVerComoSecretaria} className="bg-pink-500 hover:bg-pink-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md">
                📋 Ver como Secretaria
              </button>
            )}
            {onIrDespacho && (
              <button onClick={onIrDespacho} className="bg-orange-500 hover:bg-orange-600 text-white text-sm px-4 py-2 rounded-lg font-bold">
                🚚 Modo Despacho
              </button>
            )}
            {onIrInteligencia && (
              <button onClick={onIrInteligencia} className="bg-purple-600 hover:bg-purple-700 text-white text-sm px-4 py-2 rounded-lg">
                🧠 Inteligencia
              </button>
            )}
            {onIrEmpleados && (
              <button onClick={onIrEmpleados} className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white text-sm px-4 py-2 rounded-lg">
                👥 Empleados
              </button>
            )}
            {onIrContratos && (
              <button onClick={onIrContratos} className="bg-cyan-600 hover:bg-cyan-700 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md">
                📄 Contratos
              </button>
            )}
            {onIrMiContrato && (
              <button onClick={onIrMiContrato} className="bg-cyan-500 hover:bg-cyan-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md">
                📋 Mi Contrato
              </button>
            )}
            {onIrCatalogo && (
              <button onClick={onIrCatalogo} className="bg-teal-600 hover:bg-teal-700 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md">
                📋 Catálogo
              </button>
            )}
            {onIrHistorial && (
              <button onClick={onIrHistorial} className="bg-slate-700 hover:bg-slate-800 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md">
                📜 Historial
              </button>
            )}
            {onIrIngredientes && (
              <button onClick={onIrIngredientes} className="bg-green-500 hover:bg-green-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md">
                🥕 Ingredientes
              </button>
            )}
            {onIrCompras && (
              <button onClick={onIrCompras} className="bg-amber-500 hover:bg-amber-600 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md">
                📦 Compras
              </button>
            )}
            {onIrGastos && (
              <button onClick={onIrGastos} className="bg-rose-600 hover:bg-rose-700 text-white text-sm px-4 py-2 rounded-lg font-bold shadow-md">
                💸 Gastos
              </button>
            )}
            {onIrCalculadora && (
              <button onClick={onIrCalculadora} className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm px-4 py-2 rounded-lg">
                📐 Calculadora
              </button>
            )}
            {onIrCierre && (
              <button onClick={onIrCierre} className="bg-blue-700 hover:bg-blue-900 text-white text-sm px-4 py-2 rounded-lg">
                📊 Cierre del día
              </button>
            )}
            {onIrConfiguracion && (
              <button onClick={onIrConfiguracion} className="bg-blue-700 hover:bg-blue-900 text-white text-sm px-4 py-2 rounded-lg">
                ⚙️ Configuración
              </button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button onClick={onCambiarUsuario} className="bg-blue-500 hover:bg-blue-700 text-white text-sm px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2">
            🔄 Cambiar usuario
          </button>
          <button onClick={confirmarCerrarSesion} className="bg-red-600 hover:bg-red-700 text-white text-sm px-4 py-2 rounded-lg font-semibold transition flex items-center justify-center gap-2">
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

      {escuelasPendientesCount > 0 && (
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-emerald-100 text-xs font-semibold tracking-wider">ACCIÓN DEL DÍA</p>
              <h3 className="text-2xl font-bold mt-1">
                🚀 Iniciar día completo
              </h3>
              <p className="text-emerald-100 text-sm mt-1">
                {escuelasPendientesCount} escuela(s) pendiente(s) · Inicia preparación de todas a la vez
              </p>
            </div>
            <button
              onClick={iniciarTodas}
              disabled={procesando}
              className="bg-white hover:bg-emerald-50 text-emerald-700 font-bold px-6 py-3 rounded-xl shadow-lg disabled:opacity-50 whitespace-nowrap"
            >
              {procesando ? 'Iniciando...' : `🚀 Iniciar ${escuelasPendientesCount} escuela(s)`}
            </button>
          </div>
        </div>
      )}

      {mostrarBotonPesaje && (
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-amber-100 text-xs font-semibold tracking-wider">SIGUIENTE PASO</p>
              <h3 className="text-2xl font-bold mt-1">
                🥘 Iniciar Pesaje
              </h3>
              <p className="text-amber-100 text-sm mt-1">
                {operacionesPreparando.length} escuela(s) · {totalRacionesHoy.toLocaleString()} raciones · Pesa todos los ingredientes crudos
              </p>
            </div>
            <button
              onClick={() => {
                setModoEdicionCrudo(false)
                setModalPesajeAbierto(true)
              }}
              disabled={procesando}
              className="bg-white hover:bg-amber-50 text-orange-700 font-bold px-6 py-3 rounded-xl shadow-lg disabled:opacity-50 whitespace-nowrap"
            >
              🥘 Pesar ingredientes
            </button>
          </div>
        </div>
      )}

      {yaSePesoHoy && hayEscuelasIniciadas && (
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl shadow-md p-4 mb-6 text-white">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-3xl">✅</span>
              <div>
                <p className="font-bold">Pesaje crudo aprobado</p>
                <p className="text-emerald-100 text-sm">Ingredientes ya descontados del inventario · {totalRacionesHoy.toLocaleString()} raciones</p>
              </div>
            </div>
            <button
              onClick={() => {
                setModoEdicionCrudo(true)
                setModalPesajeAbierto(true)
              }}
              className="bg-white/20 hover:bg-white/30 text-white text-sm font-bold px-4 py-2 rounded-lg border border-white/30 whitespace-nowrap"
            >
              ✏️ Editar
            </button>
          </div>
        </div>
      )}

      {mostrarBotonDespacho && (
        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl shadow-xl p-6 mb-6 text-white">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <p className="text-orange-100 text-xs font-semibold tracking-wider">SIGUIENTE PASO</p>
              <h3 className="text-2xl font-bold mt-1">
                🚚 Despachar y Entregar
              </h3>
              <p className="text-orange-100 text-sm mt-1">
                {escuelasEntregadas} de {escuelasOperativas} entregadas
                {escuelasEnCamino > 0 && ` · ${escuelasEnCamino} en camino`}
                {' '}· Pesa cocido por escuela, despacha y firma conduces
              </p>
            </div>
            <button
              onClick={onIrDespacho}
              disabled={procesando}
              className="bg-white hover:bg-orange-50 text-red-700 font-bold px-6 py-3 rounded-xl shadow-lg disabled:opacity-50 whitespace-nowrap"
            >
              🚚 Ir a Modo Despacho
            </button>
          </div>
        </div>
      )}

      {todasEntregadas && (
        <div className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl shadow-md p-4 mb-6 text-white">
          <div className="flex items-center gap-3">
            <span className="text-3xl">🏆</span>
            <div>
              <p className="font-bold">Todas las escuelas entregadas y firmadas</p>
              <p className="text-green-100 text-sm">{escuelasEntregadas} conduce(s) firmado(s) por los directores · Día completado</p>
            </div>
          </div>
        </div>
      )}

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
                <div key={escuela.id} className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition">
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[200px]">
                      <p className="font-bold text-gray-900">{escuela.nombre}</p>
                      <p className="text-xs text-gray-500">
                        {escuela.raciones_contractuales} raciones · RD$ {escuela.precio_racion}/ración
                      </p>
                      {op?.razon_no_clase && (
                        <p className="text-xs text-gray-600 mt-1 italic">
                          📝 {op.razon_no_clase}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {estado === 'entregada' || estado === 'cerrada' ? (
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                          ✅ Entregada
                        </span>
                      ) : estado === 'despachando' ? (
                        <span className="bg-orange-100 text-orange-800 text-xs font-bold px-3 py-1 rounded-full">
                          🚚 En camino
                        </span>
                      ) : estado === 'lista' ? (
                        <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full">
                          ✅ Lista
                        </span>
                      ) : estado === 'preparando' ? (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-3 py-1 rounded-full">
                          👨‍🍳 Preparando
                        </span>
                      ) : estado === 'sin_clase' ? (
                        <span className="bg-gray-200 text-gray-600 text-xs font-bold px-3 py-1 rounded-full">
                          🚫 Sin clase
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1 rounded-full">
                          ⏰ Pendiente
                        </span>
                      )}

                      {!op && (
                        <>
                          <button
                            onClick={() => iniciarEscuela(escuela)}
                            disabled={procesando}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            ▶️ Iniciar
                          </button>
                          <button
                            onClick={() => abrirModalSinClase(escuela)}
                            disabled={procesando}
                            className="bg-gray-500 hover:bg-gray-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                          >
                            🚫 Sin clase
                          </button>
                        </>
                      )}

                      {op?.estado === 'preparando' && (
                        <button
                          onClick={() => marcarLista(op)}
                          disabled={procesando}
                          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                        >
                          ✅ Marcar lista
                        </button>
                      )}
                    </div>
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