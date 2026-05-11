import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function WizardCompletado({ empresaId, onIrAlDashboard, onEditarConfig }) {
  const [stats, setStats] = useState({
    empresas: 0,
    escuelas: 0,
    raciones: 0,
    facturacion: 0,
    recetas: 0,
    usuarios: 0,
    finanzasConfigurada: false
  })
  const [empresa, setEmpresa] = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (empresaId) cargarStats()
  }, [empresaId])

  async function cargarStats() {
    setCargando(true)

    const { data: empresaData } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single()
    
    const { data: escuelas } = await supabase
      .from('escuelas')
      .select('raciones_contractuales, precio_racion')
      .eq('empresa_id', empresaId)
    
    const { data: recetas } = await supabase
      .from('recetas')
      .select('id')
      .eq('empresa_id', empresaId)
    
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id')
      .eq('empresa_id', empresaId)
    
    const { data: finanzas } = await supabase
      .from('finanzas')
      .select('id')
      .eq('empresa_id', empresaId)
      .single()

    const totalRaciones = escuelas?.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0) || 0
    const facturacionDiaria = escuelas?.reduce((sum, e) => sum + ((e.raciones_contractuales || 0) * (parseFloat(e.precio_racion) || 0)), 0) || 0
    const facturacionMensual = facturacionDiaria * 22

    setEmpresa(empresaData)
    setStats({
      empresas: 1,
      escuelas: escuelas?.length || 0,
      raciones: totalRaciones,
      facturacion: facturacionMensual,
      recetas: recetas?.length || 0,
      usuarios: usuarios?.length || 0,
      finanzasConfigurada: !!finanzas
    })
    setCargando(false)
  }

  if (cargando) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-12 max-w-3xl w-full text-center">
        <p className="text-gray-500">Cargando resumen...</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl w-full">
      
      {/* Celebración */}
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-4xl font-bold text-gray-900 mb-2">
          ¡Configuración completa!
        </h2>
        <p className="text-lg text-gray-600">
          Tu cocina <span className="font-bold text-blue-700">{empresa?.nombre}</span> está lista para operar
        </p>
      </div>

      {/* Resumen visual con grid de stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
          <div className="text-3xl mb-2">🏫</div>
          <p className="text-3xl font-bold text-blue-900">{stats.escuelas}</p>
          <p className="text-sm text-blue-700 font-semibold">
            {stats.escuelas === 1 ? 'Escuela' : 'Escuelas'} registrada{stats.escuelas === 1 ? '' : 's'}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-xl p-5">
          <div className="text-3xl mb-2">🍽️</div>
          <p className="text-3xl font-bold text-green-900">{stats.raciones.toLocaleString()}</p>
          <p className="text-sm text-green-700 font-semibold">
            Raciones por día
          </p>
        </div>

        <div className="bg-orange-50 border border-orange-200 rounded-xl p-5">
          <div className="text-3xl mb-2">💰</div>
          <p className="text-3xl font-bold text-orange-900">
            RD$ {(stats.facturacion / 1000).toFixed(0)}K
          </p>
          <p className="text-sm text-orange-700 font-semibold">
            Facturación proyectada/mes
          </p>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
          <div className="text-3xl mb-2">👥</div>
          <p className="text-3xl font-bold text-purple-900">{stats.usuarios}</p>
          <p className="text-sm text-purple-700 font-semibold">
            {stats.usuarios === 1 ? 'Persona' : 'Personas'} en el equipo
          </p>
        </div>

      </div>

      {/* Checklist de pasos completados */}
      <div className="bg-gray-50 rounded-xl p-5 mb-8">
        <p className="text-xs font-bold text-gray-500 mb-3 tracking-wider">
          CONFIGURACIÓN COMPLETADA:
        </p>
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-green-600 font-bold">✓</span>
            <span className="text-sm text-gray-700">Cocina registrada con RNC</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 font-bold">✓</span>
            <span className="text-sm text-gray-700">{stats.escuelas} escuelas con sus directores</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 font-bold">✓</span>
            <span className="text-sm text-gray-700">Menú semanal de {stats.recetas} platos</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-green-600 font-bold">✓</span>
            <span className="text-sm text-gray-700">{stats.usuarios} personas con PINs únicos</span>
          </div>
          <div className="flex items-center gap-3">
            <span className={stats.finanzasConfigurada ? 'text-green-600 font-bold' : 'text-gray-400'}>
              {stats.finanzasConfigurada ? '✓' : '○'}
            </span>
            <span className="text-sm text-gray-700">
              Configuración financiera {stats.finanzasConfigurada ? 'completa' : 'pendiente'}
            </span>
          </div>
        </div>
      </div>

      {/* Modo de operación */}
      <div className={`border-2 rounded-xl p-5 mb-8 ${
        empresa?.modo_operacion === 'aprendizaje' 
          ? 'bg-green-50 border-green-300'
          : 'bg-blue-50 border-blue-300'
      }`}>
        <p className="text-xs font-bold text-gray-500 mb-2 tracking-wider">
          MODO DE OPERACIÓN:
        </p>
        <p className="text-lg font-bold text-gray-900 mb-1">
          {empresa?.modo_operacion === 'aprendizaje' ? '🌱 Modo Aprendizaje' : '📊 Modo Detallado'}
        </p>
        <p className="text-sm text-gray-600">
          {empresa?.modo_operacion === 'aprendizaje' 
            ? 'La app va a observar tu operación durante 3-4 semanas y aprender tus patrones automáticamente.'
            : 'La app va a usar las cantidades exactas que cargues para calcular costos y márgenes.'}
        </p>
      </div>

      {/* Botones de acción */}
      <div className="space-y-3">
        <button
          onClick={onIrAlDashboard}
          className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-4 px-6 rounded-xl transition-colors text-lg"
        >
          🚀 Ir al Dashboard
        </button>

        <button
          onClick={onEditarConfig}
          className="w-full bg-white hover:bg-gray-50 text-gray-700 font-semibold py-3 px-6 rounded-xl border-2 border-gray-200 transition-colors"
        >
          ✏️ Editar configuración
        </button>
      </div>

    </div>
  )
}

export default WizardCompletado