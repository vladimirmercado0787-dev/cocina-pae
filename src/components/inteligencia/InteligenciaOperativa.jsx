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
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    
    // Calcular fecha de hace 30 días
    const hace30 = new Date()
    hace30.setDate(hace30.getDate() - 30)
    const hace30Str = hace30.toISOString().split('T')[0]
    
    // 1) Empresa y finanzas
    const { data: empresaData } = await supabase
      .from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)
    
    const { data: finanzasData } = await supabase
      .from('finanzas').select('*').eq('empresa_id', empresaId).maybeSingle()
    setFinanzas(finanzasData)
    
    // 2) Escuelas
    const { data: escuelasData } = await supabase
      .from('escuelas').select('*').eq('empresa_id', empresaId).eq('activa', true)
    setEscuelas(escuelasData || [])
    
    // 3) Recetas
    const { data: recetasData } = await supabase
      .from('recetas').select('*').eq('empresa_id', empresaId).eq('activa', true)
    setRecetas(recetasData || [])
    
    // 4) Operaciones últimos 30 días
    const { data: opsData } = await supabase
      .from('operaciones_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('fecha', hace30Str)
    setOperaciones(opsData || [])
    
    // 5) Pesajes del día (crudos) últimos 30 días
    const { data: pesajesDiaData } = await supabase
      .from('pesajes_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('fecha', hace30Str)
    setPesajesDia(pesajesDiaData || [])
    
    // 6) Pesajes ingredientes (con sugerido vs real)
    if (pesajesDiaData && pesajesDiaData.length > 0) {
      const pesajeIds = pesajesDiaData.map(p => p.id)
      const { data: ingsData } = await supabase
        .from('pesajes_dia_ingredientes')
        .select('*, ingredientes(*)')
        .in('pesaje_dia_id', pesajeIds)
      setPesajesIngs(ingsData || [])
    }
    
    // 7) Pesajes de operación (cocinado/sobrante)
    if (opsData && opsData.length > 0) {
      const opIds = opsData.map(op => op.id)
      const { data: pesajesOpData } = await supabase
        .from('pesajes_operacion')
        .select('*')
        .in('operacion_id', opIds)
      setPesajesOperacion(pesajesOpData || [])
    }
    
    setCargando(false)
  }

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Calculando inteligencia...</div>
  }

  // ═══════════════════════════════════════════════════════
  // CÁLCULOS
  // ═══════════════════════════════════════════════════════
  
  // ─── 1) SALUD DEL SISTEMA ────────────────────────────
  const totalDiasOperados = pesajesDia.length // días con pesaje crudo aprobado
  const totalOperacionesActivas = operaciones.filter(op => !op.no_hubo_clase).length
  
  const pesajesCocinado = pesajesOperacion.filter(p => p.tipo === 'cocinado').length
  const pesajesSobrante = pesajesOperacion.filter(p => p.tipo === 'retorno').length
  
  const tasaCocinado = totalOperacionesActivas > 0 
    ? Math.round((pesajesCocinado / totalOperacionesActivas) * 100) 
    : 0
  const tasaSobrante = totalOperacionesActivas > 0 
    ? Math.round((pesajesSobrante / totalOperacionesActivas) * 100) 
    : 0
  
  // El crudo siempre es 100% si se aprobó (por días con pesaje)
  // Calculamos % de días pesados respecto a días con operaciones
  const fechasConOps = [...new Set(operaciones.filter(op => !op.no_hubo_clase).map(op => op.fecha))]
  const tasaCrudo = fechasConOps.length > 0
    ? Math.round((totalDiasOperados / fechasConOps.length) * 100)
    : 0
  
  // Calidad de datos (promedio ponderado)
  const calidadDatos = Math.round((tasaCrudo * 0.5 + tasaCocinado * 0.3 + tasaSobrante * 0.2))
  
  // ─── 2) COSTO REAL ───────────────────────────────────
  const costoObjetivo = parseFloat(finanzas?.costo_objetivo_racion || 35)
  
  // Calcular costo real basado en pesajes reales
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
  
  // ─── 3) ANÁLISIS DE EDICIONES ────────────────────────
  const ingsEditados = pesajesIngs.filter(pi => pi.fue_editado).length
  const totalIngsPesados = pesajesIngs.length
  const tasaEdicion = totalIngsPesados > 0 
    ? Math.round((ingsEditados / totalIngsPesados) * 100) 
    : 0
  
  // ─── 4) ESCUELAS QUE MÁS DEVUELVEN ───────────────────
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
    
    // Buscar el cocinado correspondiente
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
  
  // ─── 5) DÍAS SIN CLASE ───────────────────────────────
  const opsSinClase = operaciones.filter(op => op.no_hubo_clase).length
  
  return (
    <div className="w-full max-w-6xl">
      
      {/* Header */}
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

      {/* SI NO HAY DATOS */}
      {totalDiasOperados === 0 && totalOperacionesActivas === 0 ? (
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

          {/* ─── COSTO REAL VS OBJETIVO ─── */}
          <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
              💰 COSTO REAL VS OBJETIVO
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
                    }`}>promedio real</p>
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

          {/* ─── EDICIONES (TRACKING) ─── */}
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

          {/* ─── ESCUELAS QUE MÁS DEVUELVEN ─── */}
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

          {/* ─── DÍAS SIN CLASE ─── */}
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

// Componente auxiliar: barra de salud
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