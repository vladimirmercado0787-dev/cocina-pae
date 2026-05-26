import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const ROLES_PUEDEN_FIRMAR = ['propietario', 'administrador']

function CierreDelDia({ usuario, empresaId, onVolver }) {
  const [empresa, setEmpresa] = useState(null)
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [recetas, setRecetas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [cerrando, setCerrando] = useState(false)
  const [firmandoMasivo, setFirmandoMasivo] = useState(false)
  const [notasCierre, setNotasCierre] = useState('')
  const [sobrantes, setSobrantes] = useState({})
  
  // 🆕 INT-006: Modal de validación de firmas
  const [mostrarModalFirmas, setMostrarModalFirmas] = useState(false)

  const fechaHoy = new Date().toISOString().split('T')[0]
  const fechaTexto = new Date().toLocaleDateString('es-DO', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })

  useEffect(() => {
    cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    
    const { data: empresaData } = await supabase
      .from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)

    const { data: escData } = await supabase
      .from('escuelas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activa', true)
    setEscuelas(escData || [])

    const { data: opsData } = await supabase
      .from('operaciones_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('fecha', fechaHoy)
    setOperaciones(opsData || [])

    const sobrantesInicial = {}
    ;(opsData || []).forEach(op => {
      sobrantesInicial[op.id] = {
        peso: op.peso_sobrante_lb ? op.peso_sobrante_lb.toString() : '',
        notas: op.notas_pesaje_sobrante || ''
      }
    })
    setSobrantes(sobrantesInicial)

    const { data: recData } = await supabase
      .from('recetas')
      .select('*')
      .eq('empresa_id', empresaId)
    setRecetas(recData || [])

    setCargando(false)
  }

  function actualizarSobrante(opId, campo, valor) {
    setSobrantes(prev => ({
      ...prev,
      [opId]: {
        ...prev[opId],
        [campo]: valor
      }
    }))
  }

  // 🆕 Firmar TODOS los conduces listos como propietario
  async function firmarTodosComoPropietario() {
    const opsListas = operaciones.filter(op => 
      op.firma_imagen &&                  // Director ya firmó
      !op.firma_propietario_at &&          // Propietario NO ha firmado
      op.estado !== 'sin_clase'            // No es día sin clase
    )

    if (opsListas.length === 0) {
      alert('No hay conduces listos para firmar.\n\nUn conduce está listo cuando:\n• El director ya firmó\n• El propietario aún no ha firmado')
      return
    }

    const confirmar = window.confirm(
      `¿Confirmas firmar ${opsListas.length} conduce(s) como ${empresa?.nombre_propietario || 'Propietario'}?\n\n` +
      opsListas.map(op => {
        const esc = escuelas.find(e => e.id === op.escuela_id)
        return `• Conduce ${op.numero_conduce} - ${esc?.nombre || 'Escuela'} (${op.raciones_planificadas} raciones)`
      }).join('\n') +
      `\n\nEsta acción quedará registrada con fecha y hora para auditoría INABIE.`
    )

    if (!confirmar) return

    setFirmandoMasivo(true)
    const ahora = new Date().toISOString()
    const nombreFirmante = usuario.nombre || usuario.email

    // UPDATE en lote para todas las operaciones listas
    for (const op of opsListas) {
      await supabase
        .from('operaciones_dia')
        .update({
          firma_propietario_at: ahora,
          firma_propietario_por_usuario_id: usuario.id,
          firma_propietario_por_nombre: nombreFirmante
        })
        .eq('id', op.id)
    }

    setFirmandoMasivo(false)
    alert(`✅ ${opsListas.length} conduce(s) firmado(s) exitosamente como ${empresa?.nombre_propietario || 'Propietario'}`)
    await cargarDatos()
  }

  // 🆕 INT-006: Click en "Cerrar día" → muestra modal de validación
  function iniciarCierreDia() {
    setMostrarModalFirmas(true)
  }

  // 🆕 INT-006: Confirmación final del cierre (desde el modal)
  async function ejecutarCierreDia() {
    setMostrarModalFirmas(false)
    setCerrando(true)

    // Calcular conduces con firmas pendientes para el log
    const opsConductos = operaciones.filter(op => op.estado !== 'sin_clase')
    const opsSinFirmaDirector = opsConductos.filter(op => !op.firma_imagen)
    const opsSinFirmaPropietario = opsConductos.filter(op => 
      op.firma_imagen && !op.firma_propietario_at
    )
    
    // Construir nota automática con info de firmas pendientes
    let notasFinales = notasCierre || ''
    if (opsSinFirmaDirector.length > 0 || opsSinFirmaPropietario.length > 0) {
      const avisoAuditoria = `[CIERRE CON FIRMAS PENDIENTES] ` +
        `Director: ${opsSinFirmaDirector.length} sin firmar · ` +
        `Propietario: ${opsSinFirmaPropietario.length} sin firmar · ` +
        `Cerrado por ${usuario.nombre || 'Sistema'} el ${new Date().toISOString()}`
      notasFinales = notasFinales 
        ? `${notasFinales}\n\n${avisoAuditoria}`
        : avisoAuditoria
    }

    const opsAbiertas = operaciones.filter(op => op.estado !== 'cerrada' && op.estado !== 'sin_clase')
    
    for (const op of opsAbiertas) {
      const sobranteOp = sobrantes[op.id] || {}
      const pesoNum = parseFloat(sobranteOp.peso)

      const datos = { 
        estado: 'cerrada',
        notas_dia: notasFinales || op.notas_dia
      }

      if (pesoNum && pesoNum > 0) {
        datos.peso_sobrante_lb = pesoNum
      }
      if (sobranteOp.notas && sobranteOp.notas.trim()) {
        datos.notas_pesaje_sobrante = sobranteOp.notas.trim()
      }

      await supabase
        .from('operaciones_dia')
        .update(datos)
        .eq('id', op.id)
    }

    const opsSinClase = operaciones.filter(op => op.estado === 'sin_clase')
    for (const op of opsSinClase) {
      await supabase
        .from('operaciones_dia')
        .update({ estado: 'cerrada' })
        .eq('id', op.id)
    }

    setCerrando(false)
    alert('✅ Día cerrado correctamente')
    cargarDatos()
  }

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando datos del día...</div>
  }

  // Cálculos generales
  const opsEntregadas = operaciones.filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
  const opsPendientes = operaciones.filter(op => 
    op.estado !== 'entregada' && 
    op.estado !== 'cerrada' && 
    op.estado !== 'sin_clase'
  )
  
  const totalRacionesEntregadas = opsEntregadas.reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
  const facturacionDia = opsEntregadas.reduce((sum, op) => {
    const escuela = escuelas.find(e => e.id === op.escuela_id)
    return sum + ((op.raciones_planificadas || 0) * (parseFloat(escuela?.precio_racion) || 0))
  }, 0)

  const todasCerradas = operaciones.length > 0 && 
    operaciones.every(op => op.estado === 'cerrada')

  const escuelasSinOperacion = escuelas.filter(e => !operaciones.find(o => o.escuela_id === e.id))

  const puedeCerrarDia = operaciones.length > 0 && 
    opsPendientes.length === 0 && 
    escuelasSinOperacion.length === 0 &&
    !todasCerradas

  const horasInicio = operaciones.map(op => op.hora_inicio_preparacion).filter(Boolean)
  const horasEntrega = operaciones.map(op => op.hora_entrega).filter(Boolean)
  
  const horaInicioDia = horasInicio.length > 0 
    ? new Date(horasInicio.sort()[0]).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
    : '—'
  const horaCierreDia = horasEntrega.length > 0
    ? new Date(horasEntrega.sort().reverse()[0]).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
    : '—'

  const operacionesParaSobrante = operaciones.filter(op => 
    op.estado === 'entregada' || op.estado === 'cerrada'
  )

  // Cálculos de firmas (existentes + INT-006)
  const opsConductos = operaciones.filter(op => op.estado !== 'sin_clase')
  const opsDirectorFirmo = opsConductos.filter(op => !!op.firma_imagen)
  const opsPropietarioFirmo = opsConductos.filter(op => !!op.firma_propietario_at)
  const opsListasParaFirma = opsConductos.filter(op => 
    op.firma_imagen && !op.firma_propietario_at
  )
  const opsSinFirmaDirector = opsConductos.filter(op => !op.firma_imagen)
  const usuarioPuedeFirmar = usuario && ROLES_PUEDEN_FIRMAR.includes(usuario.rol)
  
  // 🆕 INT-006: ¿Hay firmas pendientes en total?
  const hayFirmasPendientes = opsListasParaFirma.length > 0 || opsSinFirmaDirector.length > 0

  return (
    <div className="w-full max-w-5xl">
      
      {/* Header */}
      <div className={`bg-gradient-to-br ${todasCerradas ? 'from-purple-600 to-purple-800' : 'from-orange-600 to-orange-800'} rounded-2xl p-6 mb-6 text-white`}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-orange-100 text-xs font-semibold tracking-wider">
              {todasCerradas ? '🔒 DÍA CERRADO' : '📋 CIERRE DEL DÍA'}
            </p>
            <h2 className="text-3xl font-bold mt-1 capitalize">
              {fechaTexto}
            </h2>
          </div>
          <button
            onClick={onVolver}
            className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-lg"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Stats principales */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">ESCUELAS</p>
          <p className="text-3xl font-bold text-gray-900">{opsEntregadas.length}/{escuelas.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">RACIONES</p>
          <p className="text-3xl font-bold text-blue-600">{totalRacionesEntregadas.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">FACTURACIÓN</p>
          <p className="text-2xl font-bold text-green-600">RD$ {(facturacionDia / 1000).toFixed(1)}K</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 text-center">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">HORARIO</p>
          <p className="text-sm font-bold text-gray-900 mt-1">{horaInicioDia} → {horaCierreDia}</p>
        </div>
      </div>

      {/* SECCIÓN DE FIRMAS - Solo si hay conduces */}
      {opsConductos.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6 border-2 border-blue-200">
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="text-xs text-blue-600 font-semibold tracking-wider">
                🖊️ ESTADO DE FIRMAS
              </p>
              <p className="text-sm text-gray-600 mt-1">
                Resumen de firmas de los conduces del día
              </p>
            </div>
          </div>

          {/* Stats de firmas */}
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-blue-900">{opsConductos.length}</p>
              <p className="text-xs text-blue-700 mt-1">Conduces del día</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-green-900">
                {opsDirectorFirmo.length}/{opsConductos.length}
              </p>
              <p className="text-xs text-green-700 mt-1">Director firmó</p>
            </div>
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-bold text-purple-900">
                {opsPropietarioFirmo.length}/{opsConductos.length}
              </p>
              <p className="text-xs text-purple-700 mt-1">Propietario firmó</p>
            </div>
          </div>

          {/* Lista de conduces con estado de firmas */}
          <div className="space-y-2 mb-4">
            {opsConductos.map(op => {
              const escuela = escuelas.find(e => e.id === op.escuela_id)
              const directorFirmo = !!op.firma_imagen
              const propietarioFirmo = !!op.firma_propietario_at

              return (
                <div key={op.id} className="border border-gray-200 rounded-xl p-3">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 text-sm">
                        Conduce #{op.numero_conduce} - {escuela?.nombre || 'Escuela'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {op.raciones_planificadas} raciones
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {directorFirmo ? (
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                          ✅ Director
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-full">
                          ⏳ Director
                        </span>
                      )}
                      {propietarioFirmo ? (
                        <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">
                          ✅ Propietario
                        </span>
                      ) : (
                        <span className="bg-gray-100 text-gray-500 text-xs font-bold px-2 py-1 rounded-full">
                          ⏳ Propietario
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Botón de firma masiva */}
          {opsListasParaFirma.length > 0 && usuarioPuedeFirmar && (
            <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-5 text-white">
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <p className="text-blue-100 text-xs font-semibold tracking-wider">
                    ACCIÓN PENDIENTE
                  </p>
                  <h4 className="text-xl font-bold mt-1">
                    🖊️ Firma como Propietario
                  </h4>
                  <p className="text-blue-100 text-sm mt-1">
                    {opsListasParaFirma.length} conduce(s) listo(s) para tu firma
                  </p>
                </div>
                <button
                  onClick={firmarTodosComoPropietario}
                  disabled={firmandoMasivo}
                  className="bg-white hover:bg-blue-50 text-indigo-700 font-bold px-6 py-3 rounded-xl shadow-lg disabled:opacity-50 whitespace-nowrap"
                >
                  {firmandoMasivo 
                    ? '⏳ Firmando...' 
                    : `🖊️ Firmar ${opsListasParaFirma.length} conduce(s)`}
                </button>
              </div>
              <p className="text-xs text-blue-100 mt-3">
                Firmarás como: <strong>{empresa?.nombre_propietario || 'Propietario'}</strong> · 
                Quedará registrado con fecha y hora para auditoría INABIE
              </p>
            </div>
          )}

          {opsListasParaFirma.length === 0 && opsConductos.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              {opsPropietarioFirmo.length === opsConductos.length && opsDirectorFirmo.length === opsConductos.length ? (
                <p className="text-sm text-green-800 font-bold">
                  ✅ Todos los conduces tienen ambas firmas aplicadas
                </p>
              ) : (
                <p className="text-sm text-gray-700">
                  ⏳ Esperando que los directores firmen los conduces pendientes
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Estado del cierre */}
      {!todasCerradas && (opsPendientes.length > 0 || escuelasSinOperacion.length > 0) && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 mb-6">
          <p className="font-bold text-yellow-900">⚠️ Hay operaciones sin completar</p>
          {opsPendientes.length > 0 && (
            <p className="text-sm text-yellow-700 mt-1">
              • {opsPendientes.length} escuela(s) en proceso (preparando/lista/en camino)
            </p>
          )}
          {escuelasSinOperacion.length > 0 && (
            <p className="text-sm text-yellow-700 mt-1">
              • {escuelasSinOperacion.length} escuela(s) sin iniciar todavía
            </p>
          )}
          <p className="text-sm text-yellow-700 mt-2">
            No puedes cerrar el día hasta que todas las escuelas estén entregadas o marcadas como sin clase.
          </p>
        </div>
      )}

      {todasCerradas && (
        <div className="bg-purple-50 border border-purple-300 rounded-2xl p-4 mb-6">
          <p className="font-bold text-purple-900">🎉 Día cerrado exitosamente</p>
          <p className="text-sm text-purple-700 mt-1">
            Todas las operaciones quedaron cerradas. La data está lista para la facturación mensual.
          </p>
        </div>
      )}

      {/* Detalle por escuela */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
          📋 DETALLE POR ESCUELA
        </p>
        <div className="space-y-3">
          {escuelas.map(escuela => {
            const op = operaciones.find(o => o.escuela_id === escuela.id)
            const receta = op ? recetas.find(r => r.id === op.receta_id) : null
            const facturacion = op ? (op.raciones_planificadas || 0) * parseFloat(escuela.precio_racion || 0) : 0
            
            return (
              <div key={escuela.id} className="border border-gray-200 rounded-xl p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">{escuela.nombre}</p>
                    {op ? (
                      <div className="mt-2 text-sm text-gray-600 space-y-1">
                        {receta && <p>{receta.emoji} {receta.nombre}</p>}
                        <p>🍽️ {op.raciones_planificadas} raciones · 💰 RD$ {facturacion.toFixed(0)}</p>
                        {op.hora_entrega && (
                          <p className="text-xs text-gray-500">
                            🚚 Entregada: {new Date(op.hora_entrega).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {op.peso_cocido_lb && (
                          <p className="text-xs text-blue-700 font-semibold">
                            ⚖️ Cocido: {op.peso_cocido_lb} lb
                          </p>
                        )}
                        {op.razon_no_clase && (
                          <p className="text-xs text-gray-600 italic">
                            📝 {op.razon_no_clase}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-400 mt-2">Sin operación registrada hoy</p>
                    )}
                  </div>
                  <div className="ml-4">
                    {!op && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">Sin iniciar</span>}
                    {op?.estado === 'preparando' && <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">🍳 Preparando</span>}
                    {op?.estado === 'lista' && <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">✅ Lista</span>}
                    {op?.estado === 'despachando' && <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">🚚 En camino</span>}
                    {op?.estado === 'entregada' && <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">🎉 Entregada</span>}
                    {op?.estado === 'cerrada' && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded">🔒 Cerrada</span>}
                    {op?.estado === 'sin_clase' && <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">🚫 Sin clase</span>}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* SECCIÓN PESAJE DE SOBRANTES */}
      {!todasCerradas && operacionesParaSobrante.length > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500 font-semibold tracking-wider">
                ⚖️ PESAJE DE SOBRANTES (OPCIONAL)
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Registra cuánta comida sobró en cada escuela. Los datos alimentan la inteligencia operativa.
              </p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-blue-800">
              💡 <strong>Pesar es opcional pero recomendado.</strong> Saber cuánto sobró ayuda a ajustar 
              las cantidades de los siguientes días y reducir la merma.
            </p>
          </div>

          <div className="space-y-3">
            {operacionesParaSobrante.map(op => {
              const escuela = escuelas.find(e => e.id === op.escuela_id)
              const datos = sobrantes[op.id] || { peso: '', notas: '' }
              const yaCerrada = op.estado === 'cerrada'

              return (
                <div key={op.id} className="border border-gray-200 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-bold text-gray-900 text-sm">
                      {escuela?.nombre || 'Escuela'}
                    </p>
                    <p className="text-xs text-gray-500">
                      {op.raciones_planificadas} raciones planificadas
                    </p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="md:col-span-1">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Peso sobrante (lb)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={datos.peso}
                          onChange={(e) => actualizarSobrante(op.id, 'peso', e.target.value)}
                          disabled={yaCerrada}
                          placeholder="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-bold pr-10 disabled:bg-gray-100"
                        />
                        <span className="absolute right-3 top-2 text-gray-500 text-xs font-semibold">lb</span>
                      </div>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Notas (opcional)
                      </label>
                      <input
                        type="text"
                        value={datos.notas}
                        onChange={(e) => actualizarSobrante(op.id, 'notas', e.target.value)}
                        disabled={yaCerrada}
                        placeholder="Ej: Sobró arroz, faltó pollo, etc."
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:bg-gray-100"
                      />
                    </div>
                  </div>

                  {op.peso_cocido_lb && (
                    <p className="text-xs text-blue-600 mt-2">
                      ⚖️ Para referencia, se cocinó: <strong>{op.peso_cocido_lb} lb</strong>
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Notas del cierre */}
      {!todasCerradas && (
        <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
          <label className="block text-xs text-gray-500 font-semibold tracking-wider mb-2">
            📝 NOTAS DEL CIERRE (OPCIONAL)
          </label>
          <textarea
            placeholder="Ej: Día normal. Hubo más demanda en Pedro Enriquez. Se quedó comida en Salomé Ureña."
            value={notasCierre}
            onChange={(e) => setNotasCierre(e.target.value)}
            rows={3}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl text-sm"
          />
        </div>
      )}

      {/* 🆕 INT-006: Banner amarillo si hay firmas pendientes */}
      {puedeCerrarDia && hayFirmasPendientes && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 mb-4">
          <div className="flex items-start gap-3">
            <span className="text-3xl">⚠️</span>
            <div className="flex-1">
              <p className="font-bold text-amber-900">
                Atención: Firmas pendientes detectadas
              </p>
              <div className="text-sm text-amber-800 mt-1 space-y-0.5">
                {opsSinFirmaDirector.length > 0 && (
                  <p>• {opsSinFirmaDirector.length} conduce(s) sin firma del Director del Centro</p>
                )}
                {opsListasParaFirma.length > 0 && (
                  <p>• {opsListasParaFirma.length} conduce(s) sin firma del Propietario</p>
                )}
              </div>
              <p className="text-xs text-amber-700 mt-2">
                Puedes cerrar el día de todas formas, pero quedará registrado para auditoría INABIE.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Botón gigante de cerrar */}
      {puedeCerrarDia && (
        <button
          onClick={iniciarCierreDia}
          disabled={cerrando}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold text-xl py-5 rounded-2xl shadow-xl"
        >
          {cerrando ? '⏳ Cerrando día...' : '🔒 Cerrar día completo'}
        </button>
      )}

      {/* 🆕 INT-006: MODAL DE VALIDACIÓN DE FIRMAS AL CERRAR DÍA */}
      {mostrarModalFirmas && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-hidden flex flex-col">
            
            {/* HEADER del modal */}
            <div className={`text-white rounded-t-2xl p-6 text-center ${
              hayFirmasPendientes 
                ? 'bg-gradient-to-br from-amber-500 to-orange-600' 
                : 'bg-gradient-to-br from-green-600 to-emerald-700'
            }`}>
              <p className="text-5xl mb-2">
                {hayFirmasPendientes ? '⚠️' : '✅'}
              </p>
              <h3 className="text-2xl font-bold">
                {hayFirmasPendientes 
                  ? '¿Cerrar día con firmas pendientes?' 
                  : '¿Cerrar el día?'}
              </h3>
              <p className="text-white/80 text-sm mt-1">
                {hayFirmasPendientes 
                  ? 'Hay conduces sin firmar' 
                  : 'Todas las firmas están aplicadas'}
              </p>
            </div>

            {/* BODY del modal */}
            <div className="p-6 space-y-4 overflow-y-auto">
              
              {/* Resumen visual */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <p className="text-xs text-gray-500 font-semibold tracking-wider">
                  📊 RESUMEN DEL DÍA
                </p>
                
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-600">Conduces:</p>
                    <p className="text-lg font-bold text-gray-900">{opsConductos.length}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Raciones:</p>
                    <p className="text-lg font-bold text-blue-600">{totalRacionesEntregadas.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Facturación:</p>
                    <p className="text-lg font-bold text-green-600">RD$ {facturacionDia.toLocaleString('es-DO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Horario:</p>
                    <p className="text-sm font-bold text-gray-900">{horaInicioDia} → {horaCierreDia}</p>
                  </div>
                </div>
              </div>

              {/* Estado de firmas */}
              <div className="space-y-2">
                <p className="text-xs text-gray-500 font-semibold tracking-wider">
                  🖊️ ESTADO DE FIRMAS
                </p>
                
                <div className={`flex items-start gap-3 p-3 rounded-lg ${
                  opsDirectorFirmo.length === opsConductos.length 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <span className="text-xl">
                    {opsDirectorFirmo.length === opsConductos.length ? '✅' : '⚠️'}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-sm">
                      Firma del Director del Centro
                    </p>
                    <p className="text-xs text-gray-700">
                      {opsDirectorFirmo.length} de {opsConductos.length} conduces firmados
                    </p>
                    {opsSinFirmaDirector.length > 0 && (
                      <p className="text-xs text-amber-800 mt-1 font-medium">
                        {opsSinFirmaDirector.length} pendiente(s) por firmar
                      </p>
                    )}
                  </div>
                </div>
                
                <div className={`flex items-start gap-3 p-3 rounded-lg ${
                  opsPropietarioFirmo.length === opsConductos.length 
                    ? 'bg-green-50 border border-green-200' 
                    : 'bg-amber-50 border border-amber-200'
                }`}>
                  <span className="text-xl">
                    {opsPropietarioFirmo.length === opsConductos.length ? '✅' : '⚠️'}
                  </span>
                  <div className="flex-1">
                    <p className="font-bold text-sm">
                      Firma del Propietario
                    </p>
                    <p className="text-xs text-gray-700">
                      {opsPropietarioFirmo.length} de {opsConductos.length} conduces firmados
                    </p>
                    {opsListasParaFirma.length > 0 && (
                      <p className="text-xs text-amber-800 mt-1 font-medium">
                        {opsListasParaFirma.length} listo(s) para tu firma
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Aviso de auditoría si hay pendientes */}
              {hayFirmasPendientes && (
                <div className="bg-amber-50 border border-amber-300 rounded-lg p-3">
                  <p className="text-xs font-bold text-amber-900 mb-1">
                    ⚖️ Aviso de Auditoría INABIE
                  </p>
                  <p className="text-xs text-amber-800">
                    Si cierras el día con firmas pendientes, se registrará una nota 
                    automática en el cierre indicando cuántas firmas faltaron y quién 
                    cerró el día. Esto queda para auditoría.
                  </p>
                </div>
              )}

              {/* BOTONES */}
              <div className="space-y-2 pt-2">
                {/* Si hay firmas pendientes Y el usuario puede firmar */}
                {opsListasParaFirma.length > 0 && usuarioPuedeFirmar && (
                  <button
                    onClick={() => {
                      setMostrarModalFirmas(false)
                      firmarTodosComoPropietario()
                    }}
                    disabled={cerrando || firmandoMasivo}
                    className="w-full p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition disabled:opacity-50 text-left"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">🖊️</span>
                      <div>
                        <p className="font-bold">Firmar pendientes primero</p>
                        <p className="text-xs font-normal text-blue-100 mt-1">
                          Recomendado · Firma los {opsListasParaFirma.length} conduce(s) listos antes de cerrar
                        </p>
                      </div>
                    </div>
                  </button>
                )}

                {/* Botón principal: Cerrar día */}
                <button
                  onClick={ejecutarCierreDia}
                  disabled={cerrando}
                  className={`w-full p-3 rounded-xl font-bold text-sm transition disabled:opacity-50 text-left text-white ${
                    hayFirmasPendientes 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">
                      {hayFirmasPendientes ? '⚠️' : '🔒'}
                    </span>
                    <div>
                      <p className="font-bold">
                        {hayFirmasPendientes 
                          ? 'Cerrar día con firmas pendientes' 
                          : 'Cerrar día completo'}
                      </p>
                      <p className={`text-xs font-normal mt-1 ${
                        hayFirmasPendientes ? 'text-red-100' : 'text-green-100'
                      }`}>
                        {hayFirmasPendientes 
                          ? 'Tú asumes el riesgo · Queda registrado en auditoría' 
                          : 'Todas las firmas listas · Acción irreversible'}
                      </p>
                    </div>
                  </div>
                </button>

                {/* Botón cancelar */}
                <button
                  onClick={() => setMostrarModalFirmas(false)}
                  disabled={cerrando}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl text-gray-700 font-medium hover:bg-gray-100 disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}

export default CierreDelDia