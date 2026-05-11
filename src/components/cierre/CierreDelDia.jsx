import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function CierreDelDia({ usuario, empresaId, onVolver }) {
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [recetas, setRecetas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [cerrando, setCerrando] = useState(false)
  const [notasCierre, setNotasCierre] = useState('')

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

    const { data: recData } = await supabase
      .from('recetas')
      .select('*')
      .eq('empresa_id', empresaId)
    setRecetas(recData || [])

    setCargando(false)
  }

  async function cerrarDia() {
    if (!confirm('¿Cerrar el día completo? Esto marcará todas las operaciones como cerradas. No podrá deshacerse.')) {
      return
    }

    setCerrando(true)

    // Cerrar todas las operaciones del día que no estén ya cerradas
    const opsAbiertas = operaciones.filter(op => op.estado !== 'cerrada')
    
    for (const op of opsAbiertas) {
      await supabase
        .from('operaciones_dia')
        .update({ 
          estado: 'cerrada',
          notas_dia: notasCierre || op.notas_dia
        })
        .eq('id', op.id)
    }

    setCerrando(false)
    alert('✅ Día cerrado correctamente')
    cargarDatos()
  }

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando datos del día...</div>
  }

  // Cálculos
  const opsEntregadas = operaciones.filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
  const opsCerradas = operaciones.filter(op => op.estado === 'cerrada')
  const opsPendientes = operaciones.filter(op => op.estado !== 'entregada' && op.estado !== 'cerrada')
  
  const totalRacionesEntregadas = opsEntregadas.reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
  const facturacionDia = opsEntregadas.reduce((sum, op) => {
    const escuela = escuelas.find(e => e.id === op.escuela_id)
    return sum + ((op.raciones_planificadas || 0) * (parseFloat(escuela?.precio_racion) || 0))
  }, 0)

  const todasCerradas = operaciones.length > 0 && opsCerradas.length === operaciones.length
  const puedeCerrarDia = operaciones.length > 0 && opsPendientes.length === 0 && !todasCerradas

  // Hora más temprana de inicio y más tardía de cierre
  const horasInicio = operaciones.map(op => op.hora_inicio_preparacion).filter(Boolean)
  const horasEntrega = operaciones.map(op => op.hora_entrega).filter(Boolean)
  
  const horaInicioDia = horasInicio.length > 0 
    ? new Date(horasInicio.sort()[0]).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
    : '—'
  const horaCierreDia = horasEntrega.length > 0
    ? new Date(horasEntrega.sort().reverse()[0]).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
    : '—'

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

      {/* Estado del cierre */}
      {!todasCerradas && opsPendientes.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4 mb-6">
          <p className="font-bold text-yellow-900">⚠️ Hay {opsPendientes.length} escuela(s) sin completar</p>
          <p className="text-sm text-yellow-700 mt-1">
            No puedes cerrar el día hasta que todas las escuelas estén entregadas.
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
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

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

      {/* Botón gigante de cerrar */}
      {puedeCerrarDia && (
        <button
          onClick={cerrarDia}
          disabled={cerrando}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-bold text-xl py-5 rounded-2xl shadow-xl"
        >
          {cerrando ? '⏳ Cerrando día...' : '🔒 Cerrar día completo'}
        </button>
      )}

    </div>
  )
}

export default CierreDelDia