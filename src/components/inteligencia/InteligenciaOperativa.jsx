import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function InteligenciaOperativa({ usuario, empresaId, onVolver }) {
  const [empresa, setEmpresa] = useState(null)
  const [finanzas, setFinanzas] = useState(null)
  const [pesajesDia, setPesajesDia] = useState([])
  const [pesajesIngs, setPesajesIngs] = useState([])
  const [pesajesOperacion, setPesajesOperacion] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [escuelas, setEscuelas] = useState([])
  const [recetas, setRecetas] = useState([])
  const [gastos, setGastos] = useState([])
  const [categoriasGasto, setCategoriasGasto] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    
    const hace30 = new Date()
    hace30.setDate(hace30.getDate() - 30)
    const hace30Str = hace30.toISOString().split('T')[0]
    
    const { data: empresaData } = await supabase
      .from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)
    
    const { data: finanzasData } = await supabase
      .from('finanzas').select('*').eq('empresa_id', empresaId).maybeSingle()
    setFinanzas(finanzasData)
    
    const { data: escuelasData } = await supabase
      .from('escuelas').select('*').eq('empresa_id', empresaId).eq('activa', true)
    setEscuelas(escuelasData || [])
    
    const { data: recetasData } = await supabase
      .from('recetas').select('*').eq('empresa_id', empresaId).eq('activa', true)
    setRecetas(recetasData || [])
    
    const { data: opsData } = await supabase
      .from('operaciones_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('fecha', hace30Str)
    setOperaciones(opsData || [])
    
    const { data: pesajesDiaData } = await supabase
      .from('pesajes_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('fecha', hace30Str)
    setPesajesDia(pesajesDiaData || [])
    
    if (pesajesDiaData && pesajesDiaData.length > 0) {
      const pesajeIds = pesajesDiaData.map(p => p.id)
      const { data: ingsData } = await supabase
        .from('pesajes_dia_ingredientes')
        .select('*, ingredientes(*)')
        .in('pesaje_dia_id', pesajeIds)
      setPesajesIngs(ingsData || [])
    }
    
    if (opsData && opsData.length > 0) {
      const opIds = opsData.map(op => op.id)
      const { data: pesajesOpData } = await supabase
        .from('pesajes_operacion')
        .select('*')
        .in('operacion_id', opIds)
      setPesajesOperacion(pesajesOpData || [])
    }

    // 🆕 INT-008: Cargar gastos últimos 30 días
    const { data: gastosData } = await supabase
      .from('gastos')
      .select('*, categorias_gasto(id, nombre, icono, color)')
      .eq('empresa_id', empresaId)
      .gte('fecha', hace30Str)
      .order('fecha', { ascending: false })
    setGastos(gastosData || [])

    // 🆕 INT-008: Cargar todas las categorías
    const { data: catsData } = await supabase
      .from('categorias_gasto')
      .select('*')
      .eq('empresa_id', empresaId)
    setCategoriasGasto(catsData || [])
    
    setCargando(false)
  }

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Calculando inteligencia...</div>
  }

  // ═══════════════════════════════════════════════════════
  // CÁLCULOS
  // ═══════════════════════════════════════════════════════
  
  const totalDiasOperados = pesajesDia.length
  const totalOperacionesActivas = operaciones.filter(op => !op.no_hubo_clase).length
  
  const pesajesCocinado = pesajesOperacion.filter(p => p.tipo === 'cocinado').length
  const pesajesSobrante = pesajesOperacion.filter(p => p.tipo === 'retorno').length
  
  const tasaCocinado = totalOperacionesActivas > 0 
    ? Math.round((pesajesCocinado / totalOperacionesActivas) * 100) 
    : 0
  const tasaSobrante = totalOperacionesActivas > 0 
    ? Math.round((pesajesSobrante / totalOperacionesActivas) * 100) 
    : 0
  
  const fechasConOps = [...new Set(operaciones.filter(op => !op.no_hubo_clase).map(op => op.fecha))]
  const tasaCrudo = fechasConOps.length > 0
    ? Math.round((totalDiasOperados / fechasConOps.length) * 100)
    : 0
  
  const calidadDatos = Math.round((tasaCrudo * 0.5 + tasaCocinado * 0.3 + tasaSobrante * 0.2))
  
  const costoObjetivo = parseFloat(finanzas?.costo_objetivo_racion || 35)
  
  let costoTotalReal = 0
  let racionesTotalesReal = 0
  
  pesajesDia.forEach(pd => {
    const ingsDePesaje = pesajesIngs.filter(pi => pi.pesaje_dia_id === pd.id)
    const costoDelDia = ingsDePesaje.reduce((sum, pi) => {
      const ing = pi.ingredientes
      if (!ing) return sum
      return sum + (parseFloat(pi.peso_real) * parseFloat(ing.precio_unitario || 0))
    }, 0)
    costoTotalReal += costoDelDia
    racionesTotalesReal += pd.total_raciones || 0
  })
  
  const costoRealPorRacion = racionesTotalesReal > 0 
    ? costoTotalReal / racionesTotalesReal 
    : 0
  
  const ahorroProRacion = costoObjetivo - costoRealPorRacion
  const ahorro30dias = ahorroProRacion * racionesTotalesReal
  
  const ingsEditados = pesajesIngs.filter(pi => pi.fue_editado).length
  const totalIngsPesados = pesajesIngs.length
  const tasaEdicion = totalIngsPesados > 0 
    ? Math.round((ingsEditados / totalIngsPesados) * 100) 
    : 0
  
  const sobrantePorEscuela = {}
  pesajesOperacion.filter(p => p.tipo === 'retorno').forEach(p => {
    const op = operaciones.find(o => o.id === p.operacion_id)
    if (!op) return
    const escuela = escuelas.find(e => e.id === op.escuela_id)
    if (!escuela) return
    if (!sobrantePorEscuela[escuela.id]) {
      sobrantePorEscuela[escuela.id] = { 
        nombre: escuela.nombre, 
        totalSobrante: 0,
        totalCocinado: 0,
        muestras: 0,
      }
    }
    sobrantePorEscuela[escuela.id].totalSobrante += parseFloat(p.peso || 0)
    
    const cocinado = pesajesOperacion.find(c => c.operacion_id === op.id && c.tipo === 'cocinado')
    if (cocinado) {
      sobrantePorEscuela[escuela.id].totalCocinado += parseFloat(cocinado.peso || 0)
    }
    sobrantePorEscuela[escuela.id].muestras += 1
  })
  
  const escuelasOrdenadas = Object.values(sobrantePorEscuela)
    .map(e => ({
      ...e,
      pctSobrante: e.totalCocinado > 0 ? (e.totalSobrante / e.totalCocinado * 100) : 0
    }))
    .sort((a, b) => b.pctSobrante - a.pctSobrante)
  
  const opsSinClase = operaciones.filter(op => op.no_hubo_clase).length

  // ═══════════════════════════════════════════════════════
  // 🆕 INT-008: CÁLCULOS DE GASTOS Y MARGEN REAL
  // ═══════════════════════════════════════════════════════

  // Gasto total últimos 30 días
  const gastoTotal30dias = gastos.reduce((sum, g) => sum + parseFloat(g.total || 0), 0)

  // Desglose por categoría
  const gastosPorCategoria = {}
  gastos.forEach(g => {
    const cat = g.categorias_gasto
    if (!cat) return
    if (!gastosPorCategoria[cat.id]) {
      gastosPorCategoria[cat.id] = {
        id: cat.id,
        nombre: cat.nombre,
        icono: cat.icono,
        color: cat.color,
        total: 0,
        cantidad: 0,
      }
    }
    gastosPorCategoria[cat.id].total += parseFloat(g.total || 0)
    gastosPorCategoria[cat.id].cantidad += 1
  })

  const categoriasOrdenadas = Object.values(gastosPorCategoria)
    .map(c => ({
      ...c,
      pct: gastoTotal30dias > 0 ? (c.total / gastoTotal30dias * 100) : 0
    }))
    .sort((a, b) => b.total - a.total)

  // Top 3 gastos individuales
  const top3Gastos = [...gastos]
    .sort((a, b) => parseFloat(b.total || 0) - parseFloat(a.total || 0))
    .slice(0, 3)

  // Facturación real del mes (de operaciones entregadas)
  const facturacionReal30 = operaciones
    .filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
    .reduce((sum, op) => {
      const escuela = escuelas.find(e => e.id === op.escuela_id)
      return sum + ((op.raciones_planificadas || 0) * (parseFloat(escuela?.precio_racion) || 0))
    }, 0)

  const racionesEntregadas30 = operaciones
    .filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
    .reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)

  // Margen real
  const margenReal = facturacionReal30 - gastoTotal30dias
  const margenRealPct = facturacionReal30 > 0 ? (margenReal / facturacionReal30 * 100) : 0
  const margenMinimoObjetivo = parseFloat(finanzas?.margen_minimo_porcentaje || 25)

  // Costo total por ración (todos los gastos)
  const costoTotalPorRacion = racionesEntregadas30 > 0 
    ? gastoTotal30dias / racionesEntregadas30 
    : 0

  // Diferencia entre costo total y costo de ingredientes
  const costoNoIngredientes = costoTotalPorRacion - costoRealPorRacion

  // Colores para categorías
  const COLORES_TW = {
    amber: 'bg-amber-500',
    orange: 'bg-orange-500',
    red: 'bg-red-500',
    rose: 'bg-rose-500',
    pink: 'bg-pink-500',
    purple: 'bg-purple-500',
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    emerald: 'bg-emerald-500',
    teal: 'bg-teal-500',
    cyan: 'bg-cyan-500',
    gray: 'bg-gray-500',
  }
  
  return (
    <div className="w-full max-w-6xl">
      
      <div className="bg-gradient-to-br from-indigo-600 to-purple-800 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-indigo-100 text-xs font-semibold tracking-wider">INTELIGENCIA</p>
            <h2 className="text-3xl font-bold mt-1">🧠 Inteligencia Operativa</h2>
            <p className="text-indigo-200 mt-1">Últimos 30 días · {empresa?.nombre}</p>
          </div>
          <button
            onClick={onVolver}
            className="bg-indigo-700 hover:bg-indigo-900 text-white text-sm px-4 py-2 rounded-lg"
          >
            ← Volver
          </button>
        </div>
      </div>

      {totalDiasOperados === 0 && totalOperacionesActivas === 0 && gastos.length === 0 ? (
        <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-12 text-center">
          <p className="text-6xl mb-4">📊</p>
          <h3 className="font-bold text-yellow-900 text-lg">Aún no hay datos suficientes</h3>
          <p className="text-sm text-yellow-700 mt-2 max-w-md mx-auto">
            Cuando empieces a aprobar pesajes en el día a día, esta pantalla se llenará con 
            inteligencia real sobre tu operación.
          </p>
          <p className="text-xs text-yellow-600 mt-4">
            💡 Empieza por aprobar el pesaje crudo de hoy en el dashboard.
          </p>
        </div>
      ) : (
        <>
          {/* ─────────────────────────────────────────────── */}
          {/* 🆕 INT-008: SECCIÓN VISIÓN FINANCIERA COMPLETA */}
          {/* ─────────────────────────────────────────────── */}
          <div className="bg-gradient-to-br from-slate-50 to-indigo-50 border-2 border-indigo-200 rounded-2xl shadow-xl p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-indigo-700 font-semibold tracking-wider">
                  💼 VISIÓN FINANCIERA REAL
                </p>
                <p className="text-xs text-indigo-600 mt-1">
                  Todo lo que entra, todo lo que sale · últimos 30 días
                </p>
              </div>
              <span className="bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full">
                ECOSISTEMA COMPLETO
              </span>
            </div>

            {/* 4 KPIs PRINCIPALES */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-white rounded-xl p-4 border-2 border-green-200">
                <p className="text-xs text-green-700 font-bold tracking-wider">FACTURACIÓN</p>
                <p className="text-2xl font-bold text-green-900 mt-1">
                  RD$ {(facturacionReal30 / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-green-600 mt-1">
                  {racionesEntregadas30.toLocaleString()} raciones entregadas
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 border-2 border-red-200">
                <p className="text-xs text-red-700 font-bold tracking-wider">GASTOS TOTALES</p>
                <p className="text-2xl font-bold text-red-900 mt-1">
                  RD$ {(gastoTotal30dias / 1000).toFixed(0)}K
                </p>
                <p className="text-xs text-red-600 mt-1">
                  {gastos.length} gastos registrados
                </p>
              </div>

              <div className={`bg-white rounded-xl p-4 border-2 ${
                margenReal >= 0 ? 'border-blue-200' : 'border-orange-300'
              }`}>
                <p className={`text-xs font-bold tracking-wider ${
                  margenReal >= 0 ? 'text-blue-700' : 'text-orange-700'
                }`}>
                  {margenReal >= 0 ? 'MARGEN NETO' : '⚠️ PÉRDIDA'}
                </p>
                <p className={`text-2xl font-bold mt-1 ${
                  margenReal >= 0 ? 'text-blue-900' : 'text-orange-900'
                }`}>
                  RD$ {(Math.abs(margenReal) / 1000).toFixed(0)}K
                </p>
                <p className={`text-xs mt-1 ${
                  margenReal >= 0 ? 'text-blue-600' : 'text-orange-600'
                }`}>
                  {margenRealPct.toFixed(1)}% de facturación
                </p>
              </div>

              <div className="bg-white rounded-xl p-4 border-2 border-purple-200">
                <p className="text-xs text-purple-700 font-bold tracking-wider">COSTO TOTAL/RACIÓN</p>
                <p className="text-2xl font-bold text-purple-900 mt-1">
                  RD$ {costoTotalPorRacion.toFixed(2)}
                </p>
                <p className="text-xs text-purple-600 mt-1">
                  Incluye todos los gastos
                </p>
              </div>
            </div>

            {/* COMPARATIVA INGREDIENTES VS TOTAL */}
            {costoRealPorRacion > 0 && costoTotalPorRacion > 0 && (
              <div className="bg-white rounded-xl p-4 mb-5 border border-indigo-200">
                <p className="text-xs text-indigo-700 font-semibold tracking-wider mb-3">
                  🔍 ¿DE QUÉ ESTÁ COMPUESTO TU COSTO POR RACIÓN?
                </p>
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <div className="w-32 text-sm font-semibold text-gray-700">Ingredientes</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-6 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${Math.min((costoRealPorRacion / costoTotalPorRacion * 100), 100)}%` }}
                      >
                        <span className="text-xs font-bold text-white">
                          RD$ {costoRealPorRacion.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-32 text-sm font-semibold text-gray-700">Resto del negocio</div>
                    <div className="flex-1 bg-gray-100 rounded-full h-6 relative overflow-hidden">
                      <div 
                        className="bg-rose-500 h-6 rounded-full flex items-center justify-end pr-2"
                        style={{ width: `${Math.min((costoNoIngredientes / costoTotalPorRacion * 100), 100)}%` }}
                      >
                        <span className="text-xs font-bold text-white">
                          RD$ {costoNoIngredientes.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
                    <div className="w-32 text-sm font-bold text-indigo-900">TOTAL</div>
                    <div className="flex-1 text-right">
                      <span className="text-lg font-bold text-indigo-900">
                        RD$ {costoTotalPorRacion.toFixed(2)} por ración
                      </span>
                    </div>
                  </div>
                </div>
                <p className="text-xs text-gray-600 mt-3 italic">
                  💡 Nómina, gas, limpieza, contador y demás suman <strong>RD$ {costoNoIngredientes.toFixed(2)}</strong> al costo real de cada ración.
                </p>
              </div>
            )}

            {/* ALERTA SI MARGEN BAJO */}
            {facturacionReal30 > 0 && margenRealPct < margenMinimoObjetivo && (
              <div className={`rounded-xl p-4 mb-5 ${
                margenReal < 0 
                  ? 'bg-red-50 border-2 border-red-300'
                  : 'bg-orange-50 border-2 border-orange-300'
              }`}>
                <p className={`text-sm font-bold ${
                  margenReal < 0 ? 'text-red-900' : 'text-orange-900'
                }`}>
                  {margenReal < 0 
                    ? '🚨 ALERTA: Estás operando con pérdida'
                    : `⚠️ Margen por debajo del objetivo (${margenMinimoObjetivo}%)`}
                </p>
                <p className={`text-xs mt-1 ${
                  margenReal < 0 ? 'text-red-700' : 'text-orange-700'
                }`}>
                  Tu margen real es {margenRealPct.toFixed(1)}%. Revisa gastos o ajusta operación.
                </p>
              </div>
            )}

            {/* DESGLOSE POR CATEGORÍA */}
            {categoriasOrdenadas.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-indigo-200 mb-4">
                <p className="text-xs text-gray-700 font-semibold tracking-wider mb-3">
                  📊 GASTOS POR CATEGORÍA
                </p>
                <div className="space-y-3">
                  {categoriasOrdenadas.map(cat => (
                    <div key={cat.id}>
                      <div className="flex justify-between items-center mb-1">
                        <p className="text-sm font-semibold text-gray-700">
                          {cat.icono} {cat.nombre}
                          <span className="text-xs text-gray-500 font-normal ml-2">
                            ({cat.cantidad} gasto{cat.cantidad !== 1 ? 's' : ''})
                          </span>
                        </p>
                        <div className="text-right">
                          <span className="text-sm font-bold text-gray-900">
                            RD$ {cat.total.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                          </span>
                          <span className="text-xs text-gray-500 ml-2">
                            {cat.pct.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div 
                          className={`${COLORES_TW[cat.color] || 'bg-gray-400'} h-2 rounded-full transition-all`}
                          style={{ width: `${Math.min(cat.pct, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* TOP 3 GASTOS INDIVIDUALES */}
            {top3Gastos.length > 0 && (
              <div className="bg-white rounded-xl p-4 border border-indigo-200">
                <p className="text-xs text-gray-700 font-semibold tracking-wider mb-3">
                  🏆 TOP 3 GASTOS DEL PERÍODO
                </p>
                <div className="space-y-2">
                  {top3Gastos.map((g, idx) => {
                    const cat = g.categorias_gasto
                    return (
                      <div key={g.id} className="flex items-center gap-3 bg-gray-50 rounded-lg p-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${
                          idx === 0 ? 'bg-yellow-500' : idx === 1 ? 'bg-gray-400' : 'bg-amber-700'
                        }`}>
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {cat?.icono} {g.descripcion || 'Sin descripción'}
                          </p>
                          <p className="text-xs text-gray-500">
                            {cat?.nombre} · {new Date(g.fecha).toLocaleDateString('es-DO')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-lg font-bold text-gray-900">
                            RD$ {parseFloat(g.total).toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {gastos.length === 0 && (
              <div className="bg-white rounded-xl p-6 text-center border border-indigo-200">
                <p className="text-4xl mb-2">💸</p>
                <p className="text-sm font-bold text-gray-700">Aún no hay gastos registrados</p>
                <p className="text-xs text-gray-500 mt-1">
                  Empieza a capturar gastos para ver tu costo total real y margen neto.
                </p>
              </div>
            )}
          </div>

          {/* ─── SALUD DEL SISTEMA ─── */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
              📊 SALUD DEL SISTEMA
            </p>
            
            <div className="space-y-4">
              <BarraSalud
                label="Pesaje crudo del día"
                pct={tasaCrudo}
                count={totalDiasOperados}
                total={fechasConOps.length}
                color="emerald"
              />
              <BarraSalud
                label="Pesaje cocinado por escuela"
                pct={tasaCocinado}
                count={pesajesCocinado}
                total={totalOperacionesActivas}
                color="orange"
              />
              <BarraSalud
                label="Pesaje sobrante por escuela"
                pct={tasaSobrante}
                count={pesajesSobrante}
                total={totalOperacionesActivas}
                color="purple"
              />
            </div>
            
            <div className="mt-6 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs text-gray-500 font-semibold tracking-wider">⭐ CALIDAD DE DATOS</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Mientras más pesajes registres, mejor afina el sistema
                  </p>
                </div>
                <div className={`px-6 py-3 rounded-xl font-bold text-lg ${
                  calidadDatos >= 75 ? 'bg-green-100 text-green-900' :
                  calidadDatos >= 40 ? 'bg-yellow-100 text-yellow-900' :
                  'bg-red-100 text-red-900'
                }`}>
                  {calidadDatos}%
                </div>
              </div>
            </div>
          </div>

          {/* ─── COSTO INGREDIENTES VS OBJETIVO ─── */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
              🥕 COSTO INGREDIENTES VS OBJETIVO
            </p>
            
            {totalDiasOperados === 0 ? (
              <div className="text-center py-8 text-gray-500 text-sm">
                <p>Aprueba al menos un pesaje crudo para ver el costo real</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gray-50 rounded-xl p-4 text-center">
                    <p className="text-xs text-gray-600 font-semibold tracking-wider">OBJETIVO</p>
                    <p className="text-2xl font-bold text-gray-900 mt-1">
                      RD$ {costoObjetivo.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">por ración</p>
                  </div>
                  <div className={`rounded-xl p-4 text-center border ${
                    costoRealPorRacion <= costoObjetivo 
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}>
                    <p className={`text-xs font-semibold tracking-wider ${
                      costoRealPorRacion <= costoObjetivo ? 'text-green-700' : 'text-red-700'
                    }`}>COSTO REAL</p>
                    <p className={`text-2xl font-bold mt-1 ${
                      costoRealPorRacion <= costoObjetivo ? 'text-green-900' : 'text-red-900'
                    }`}>
                      RD$ {costoRealPorRacion.toFixed(2)}
                    </p>
                    <p className={`text-xs ${
                      costoRealPorRacion <= costoObjetivo ? 'text-green-600' : 'text-red-600'
                    }`}>solo ingredientes</p>
                  </div>
                  <div className={`rounded-xl p-4 text-center border ${
                    ahorroProRacion >= 0
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-orange-50 border-orange-200'
                  }`}>
                    <p className={`text-xs font-semibold tracking-wider ${
                      ahorroProRacion >= 0 ? 'text-blue-700' : 'text-orange-700'
                    }`}>{ahorroProRacion >= 0 ? 'AHORRO' : 'EXCESO'}</p>
                    <p className={`text-2xl font-bold mt-1 ${
                      ahorroProRacion >= 0 ? 'text-blue-900' : 'text-orange-900'
                    }`}>
                      RD$ {Math.abs(ahorroProRacion).toFixed(2)}
                    </p>
                    <p className={`text-xs ${
                      ahorroProRacion >= 0 ? 'text-blue-600' : 'text-orange-600'
                    }`}>por ración</p>
                  </div>
                </div>
                
                <div className="mt-4 p-4 bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl">
                  <p className="text-xs text-indigo-700 font-semibold tracking-wider">
                    💡 IMPACTO ACUMULADO (30 días)
                  </p>
                  <p className="text-2xl font-bold text-indigo-900 mt-1">
                    RD$ {Math.abs(ahorro30dias).toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                    <span className="text-sm font-normal ml-2">
                      {ahorro30dias >= 0 ? '✅ ahorrados' : '⚠️ sobre-costo'}
                    </span>
                  </p>
                  <p className="text-xs text-indigo-600 mt-1">
                    Basado en {racionesTotalesReal.toLocaleString()} raciones pesadas en {totalDiasOperados} días
                  </p>
                </div>
              </>
            )}
          </div>

          {totalIngsPesados > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
                ✏️ AJUSTES MANUALES
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <p className="text-3xl font-bold text-gray-900">{totalIngsPesados}</p>
                  <p className="text-xs text-gray-500 mt-1">Ingredientes pesados</p>
                </div>
                <div className="text-center">
                  <p className="text-3xl font-bold text-orange-600">{ingsEditados}</p>
                  <p className="text-xs text-gray-500 mt-1">Fueron editados</p>
                </div>
                <div className="text-center">
                  <p className={`text-3xl font-bold ${
                    tasaEdicion < 20 ? 'text-green-600' : 
                    tasaEdicion < 50 ? 'text-yellow-600' : 'text-red-600'
                  }`}>{tasaEdicion}%</p>
                  <p className="text-xs text-gray-500 mt-1">Tasa de edición</p>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-4 italic">
                💡 Si la tasa es alta, puede que las recetas necesiten ajuste. Mientras más uses la app, mejor afinarán los valores sugeridos.
              </p>
            </div>
          )}

          {escuelasOrdenadas.length > 0 && (
            <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
              <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
                🏫 SOBRANTE POR ESCUELA
              </p>
              <div className="space-y-3">
                {escuelasOrdenadas.map((e, idx) => (
                  <div key={e.nombre} className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                      e.pctSobrante > 15 ? 'bg-red-100 text-red-700' :
                      e.pctSobrante > 8 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-green-100 text-green-700'
                    }`}>
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold text-sm">{e.nombre}</p>
                      <p className="text-xs text-gray-500">{e.muestras} pesajes registrados</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-xl font-bold ${
                        e.pctSobrante > 15 ? 'text-red-700' :
                        e.pctSobrante > 8 ? 'text-yellow-700' :
                        'text-green-700'
                      }`}>{e.pctSobrante.toFixed(1)}%</p>
                      <p className="text-xs text-gray-500">{e.totalSobrante.toFixed(0)} lb total</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {opsSinClase > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl p-6 mb-6">
              <p className="text-xs text-orange-700 font-semibold tracking-wider mb-2">
                🚫 DÍAS SIN CLASE (30 días)
              </p>
              <p className="text-2xl font-bold text-orange-900">{opsSinClase} operaciones canceladas</p>
              <p className="text-xs text-orange-600 mt-1">
                Por lluvia, paros u otras razones. Estas no se facturaron.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function BarraSalud({ label, pct, count, total, color }) {
  const colores = {
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-700' },
    orange:  { bg: 'bg-orange-500',  text: 'text-orange-700' },
    purple:  { bg: 'bg-purple-500',  text: 'text-purple-700' },
  }
  const c = colores[color] || colores.emerald
  
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <p className="text-sm font-semibold text-gray-700">{label}</p>
        <p className={`text-sm font-bold ${c.text}`}>
          {pct}% <span className="text-xs font-normal text-gray-500">({count} de {total})</span>
        </p>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3">
        <div 
          className={`${c.bg} h-3 rounded-full transition-all`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  )
}

export default InteligenciaOperativa