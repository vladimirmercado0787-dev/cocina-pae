import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function CalculadoraProduccion({ usuario, empresaId, onVolver }) {
  const [recetas, setRecetas] = useState([])
  const [escuelas, setEscuelas] = useState([])
  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null)
  const [ingredientesReceta, setIngredientesReceta] = useState([])
  const [racionesObjetivo, setRacionesObjetivo] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [cargandoIngredientes, setCargandoIngredientes] = useState(false)
  const [modoSeleccion, setModoSeleccion] = useState('manual') // 'manual' | 'escuelas'
  const [escuelasSeleccionadas, setEscuelasSeleccionadas] = useState([])

  useEffect(() => {
    cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    
    const { data: recetasData } = await supabase
      .from('recetas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activa', true)
      .order('dia_semana')
    setRecetas(recetasData || [])
    
    const { data: escuelasData } = await supabase
      .from('escuelas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activa', true)
      .order('nombre')
    setEscuelas(escuelasData || [])
    
    setCargando(false)
  }

  async function seleccionarReceta(receta) {
    setRecetaSeleccionada(receta)
    setCargandoIngredientes(true)
    
    const { data } = await supabase
      .from('recetas_ingredientes')
      .select('*, ingredientes(*)')
      .eq('receta_id', receta.id)
    
    setIngredientesReceta(data || [])
    setCargandoIngredientes(false)
  }

  function toggleEscuela(escuela) {
    if (escuelasSeleccionadas.find(e => e.id === escuela.id)) {
      setEscuelasSeleccionadas(escuelasSeleccionadas.filter(e => e.id !== escuela.id))
    } else {
      setEscuelasSeleccionadas([...escuelasSeleccionadas, escuela])
    }
  }

  function seleccionarTodasEscuelas() {
    setEscuelasSeleccionadas(escuelas)
  }

  function deseleccionarEscuelas() {
    setEscuelasSeleccionadas([])
  }

  function imprimir() {
    window.print()
  }

  // Cálculo de raciones según modo
  const racionesCalculadas = modoSeleccion === 'manual'
    ? parseInt(racionesObjetivo) || 0
    : escuelasSeleccionadas.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0)

  // Cálculo de ingredientes escalados
  const ingredientesCalculados = ingredientesReceta.map(ri => {
    const ing = ri.ingredientes
    const cantidadCrudoTotal = parseFloat(ri.cantidad_crudo_por_racion) * racionesCalculadas
    const factor = parseFloat(ing?.factor_rendimiento || 1)
    const cantidadCocidoTotal = cantidadCrudoTotal * factor
    const precioUnit = parseFloat(ing?.precio_unitario || 0)
    const subtotal = cantidadCrudoTotal * precioUnit

    return {
      id: ri.id,
      nombre: ing?.nombre || '?',
      categoria: ing?.categoria || 'otros',
      nivel: ing?.nivel_importancia || 'principal',
      unidad: ri.unidad,
      cantidadCrudo: cantidadCrudoTotal,
      cantidadCocido: cantidadCocidoTotal,
      factor,
      precioUnit,
      subtotal,
      notas: ri.notas,
    }
  })

  // Totales
  const costoTotal = ingredientesCalculados.reduce((sum, i) => sum + i.subtotal, 0)
  const costoPorRacion = racionesCalculadas > 0 ? costoTotal / racionesCalculadas : 0
  const pesoCrudoTotal = ingredientesCalculados.reduce((sum, i) => sum + i.cantidadCrudo, 0)
  const pesoCocidoTotal = ingredientesCalculados.reduce((sum, i) => sum + i.cantidadCocido, 0)

  // Precio promedio de venta (si tiene escuelas seleccionadas)
  const facturacionEsperada = modoSeleccion === 'escuelas'
    ? escuelasSeleccionadas.reduce((sum, e) => sum + ((e.raciones_contractuales || 0) * parseFloat(e.precio_racion || 0)), 0)
    : 0
  
  const margenTotal = facturacionEsperada - costoTotal
  const margenPct = facturacionEsperada > 0 ? Math.round((margenTotal / facturacionEsperada) * 100) : 0

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando...</div>
  }

  return (
    <div className="w-full max-w-6xl">
      
      {/* Header (no se imprime) */}
      <div className="print:hidden bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-emerald-100 text-xs font-semibold tracking-wider">CALCULADORA</p>
            <h2 className="text-3xl font-bold mt-1">📐 Producción del Día</h2>
            <p className="text-emerald-200 mt-1">Calcula ingredientes y costos automáticamente</p>
          </div>
          <button
            onClick={onVolver}
            className="bg-emerald-700 hover:bg-emerald-900 text-white text-sm px-4 py-2 rounded-lg"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* Selector de receta */}
      <div className="print:hidden bg-white rounded-2xl shadow-xl p-6 mb-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
          1️⃣ SELECCIONA LA RECETA
        </p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {recetas.map(r => (
            <button
              key={r.id}
              onClick={() => seleccionarReceta(r)}
              className={`p-3 rounded-xl border-2 text-left transition-colors ${
                recetaSeleccionada?.id === r.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 bg-white hover:border-gray-300'
              }`}
            >
              <div className="text-2xl">{r.emoji}</div>
              <div className="font-bold text-gray-900 text-sm mt-1">{r.nombre}</div>
              <div className="text-xs text-gray-500 capitalize mt-1">📅 {r.dia_semana}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Selector de raciones */}
      {recetaSeleccionada && (
        <div className="print:hidden bg-white rounded-2xl shadow-xl p-6 mb-6">
          <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
            2️⃣ ¿CUÁNTAS RACIONES VAS A PRODUCIR?
          </p>
          
          {/* Toggle de modo */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setModoSeleccion('manual')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                modoSeleccion === 'manual'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              ✍️ Cantidad manual
            </button>
            <button
              onClick={() => setModoSeleccion('escuelas')}
              className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
                modoSeleccion === 'escuelas'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              🏫 Por escuelas ({escuelas.length})
            </button>
          </div>

          {modoSeleccion === 'manual' ? (
            <input
              type="number"
              placeholder="Ej: 1230"
              value={racionesObjetivo}
              onChange={(e) => setRacionesObjetivo(e.target.value)}
              className="w-full px-4 py-4 border-2 border-gray-300 rounded-xl text-2xl font-bold text-center focus:border-emerald-500 outline-none"
            />
          ) : (
            <div>
              <div className="flex gap-2 mb-3">
                <button
                  onClick={seleccionarTodasEscuelas}
                  className="text-xs bg-blue-100 hover:bg-blue-200 text-blue-700 font-semibold px-3 py-1 rounded-lg"
                >
                  ✅ Todas
                </button>
                <button
                  onClick={deseleccionarEscuelas}
                  className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold px-3 py-1 rounded-lg"
                >
                  ❌ Ninguna
                </button>
              </div>
              <div className="space-y-2">
                {escuelas.map(e => {
                  const seleccionada = escuelasSeleccionadas.find(s => s.id === e.id)
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleEscuela(e)}
                      className={`w-full p-3 rounded-xl border-2 text-left transition-colors ${
                        seleccionada
                          ? 'border-emerald-500 bg-emerald-50'
                          : 'border-gray-200 bg-white hover:border-gray-300'
                      }`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-bold text-gray-900 text-sm">
                            {seleccionada ? '✅' : '⬜'} {e.nombre}
                          </p>
                          <p className="text-xs text-gray-500">
                            {e.raciones_contractuales} raciones · RD$ {e.precio_racion}/ración
                          </p>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resultado / Documento imprimible */}
      {recetaSeleccionada && racionesCalculadas > 0 && (
        <div className="bg-white rounded-2xl shadow-xl p-8 print:shadow-none print:p-4">
          
          {/* Header del documento */}
          <div className="border-b-2 border-gray-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📋 Lista de Producción</h1>
                <p className="text-sm text-gray-600 mt-1">
                  {recetaSeleccionada.emoji} {recetaSeleccionada.nombre}
                </p>
                <p className="text-xs text-gray-500 mt-1 capitalize">
                  📅 {recetaSeleccionada.dia_semana} · {new Date().toLocaleDateString('es-DO')}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold tracking-wider">RACIONES</p>
                <p className="text-4xl font-bold text-emerald-600">
                  {racionesCalculadas.toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          {/* Estado de carga */}
          {cargandoIngredientes ? (
            <div className="text-center py-12 text-gray-500">Cargando ingredientes...</div>
          ) : ingredientesReceta.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-2xl mb-2">⚠️</p>
              <p className="font-bold text-yellow-900">Esta receta no tiene ingredientes asociados</p>
              <p className="text-sm text-yellow-700 mt-2">
                Ve a Configuración → Menús y Recetas → Editar esta receta para agregar ingredientes.
              </p>
            </div>
          ) : (
            <>
              {/* Tabla de ingredientes */}
              <div className="mb-6">
                <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
                  📦 LISTA DE COMPRAS
                </p>
                <table className="w-full">
                  <thead className="border-b-2 border-gray-300">
                    <tr className="text-left">
                      <th className="py-2 text-xs text-gray-600 font-semibold tracking-wider">INGREDIENTE</th>
                      <th className="py-2 text-xs text-gray-600 font-semibold tracking-wider text-right">CANTIDAD CRUDA</th>
                      <th className="py-2 text-xs text-gray-600 font-semibold tracking-wider text-right">PRECIO/UNIDAD</th>
                      <th className="py-2 text-xs text-gray-600 font-semibold tracking-wider text-right">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredientesCalculados.map(ing => (
                      <tr key={ing.id} className="border-b border-gray-200">
                        <td className="py-3">
                          <p className="font-semibold text-gray-900 text-sm">{ing.nombre}</p>
                          {ing.notas && (
                            <p className="text-xs text-gray-500 italic">"{ing.notas}"</p>
                          )}
                          <p className="text-xs text-gray-400 mt-1">
                            {ing.nivel === 'principal' && '⚖️ Principal'}
                            {ing.nivel === 'sazonador' && '📏 Sazonador'}
                            {ing.nivel === 'condimento' && '🤏 Condimento'}
                          </p>
                        </td>
                        <td className="py-3 text-right text-sm font-mono">
                          <span className="font-bold">{ing.cantidadCrudo.toFixed(2)}</span> {ing.unidad}
                          <p className="text-xs text-gray-400">→ {ing.cantidadCocido.toFixed(2)} {ing.unidad} cocido</p>
                        </td>
                        <td className="py-3 text-right text-sm font-mono">
                          RD$ {ing.precioUnit.toFixed(2)}
                        </td>
                        <td className="py-3 text-right text-sm font-mono font-bold">
                          RD$ {ing.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-900">
                    <tr>
                      <td colSpan={3} className="py-3 text-right text-sm font-bold">COSTO TOTAL:</td>
                      <td className="py-3 text-right font-mono text-lg font-bold text-emerald-700">
                        RD$ {costoTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Resumen financiero */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-700 font-semibold tracking-wider">PESO CRUDO</p>
                  <p className="text-lg font-bold text-blue-900 mt-1">
                    {pesoCrudoTotal.toFixed(1)} lb
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-orange-700 font-semibold tracking-wider">PESO COCIDO</p>
                  <p className="text-lg font-bold text-orange-900 mt-1">
                    {pesoCocidoTotal.toFixed(1)} lb
                  </p>
                  <p className="text-xs text-orange-600">estimado</p>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-emerald-700 font-semibold tracking-wider">COSTO/RACIÓN</p>
                  <p className="text-lg font-bold text-emerald-900 mt-1">
                    RD$ {costoPorRacion.toFixed(2)}
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-purple-700 font-semibold tracking-wider">TOTAL</p>
                  <p className="text-lg font-bold text-purple-900 mt-1">
                    RD$ {(costoTotal / 1000).toFixed(1)}K
                  </p>
                </div>
              </div>

              {/* Análisis de margen (si seleccionó por escuelas) */}
              {modoSeleccion === 'escuelas' && escuelasSeleccionadas.length > 0 && (
                <div className={`rounded-xl p-4 mb-6 border ${
                  margenPct < 25 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'
                }`}>
                  <p className={`text-xs font-semibold tracking-wider mb-3 ${
                    margenPct < 25 ? 'text-red-700' : 'text-green-700'
                  }`}>
                    💰 ANÁLISIS DE GANANCIA
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Facturación esperada</p>
                      <p className="text-lg font-bold text-gray-900">
                        RD$ {facturacionEsperada.toLocaleString('es-DO')}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Costo de producción</p>
                      <p className="text-lg font-bold text-gray-900">
                        RD$ {costoTotal.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Margen ({margenPct}%)</p>
                      <p className={`text-lg font-bold ${margenPct < 25 ? 'text-red-700' : 'text-green-700'}`}>
                        RD$ {margenTotal.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                  {margenPct < 25 && (
                    <p className="text-xs text-red-700 mt-3 font-semibold">
                      ⚠️ Margen bajo el mínimo recomendado (25%)
                    </p>
                  )}
                </div>
              )}

              {/* Detalle por escuela (si aplica) */}
              {modoSeleccion === 'escuelas' && escuelasSeleccionadas.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
                    🏫 DISTRIBUCIÓN POR ESCUELA
                  </p>
                  <div className="space-y-2">
                    {escuelasSeleccionadas.map(e => (
                      <div key={e.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                        <div>
                          <p className="font-semibold text-sm">{e.nombre}</p>
                          <p className="text-xs text-gray-500">
                            {e.raciones_contractuales} raciones × RD$ {e.precio_racion}
                          </p>
                        </div>
                        <p className="font-mono font-bold text-sm">
                          RD$ {((e.raciones_contractuales || 0) * parseFloat(e.precio_racion || 0)).toLocaleString('es-DO')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Botón imprimir */}
              <div className="print:hidden flex justify-center pt-4 border-t border-gray-200">
                <button
                  onClick={imprimir}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl"
                >
                  🖨️ Imprimir Lista de Compras
                </button>
              </div>

              {/* Footer */}
              <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
                <p>Generado por Cocina PAE · {new Date().toLocaleString('es-DO')}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body { background: white !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>

    </div>
  )
}

export default CalculadoraProduccion