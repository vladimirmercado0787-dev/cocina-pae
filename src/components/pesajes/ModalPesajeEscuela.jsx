import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function ModalPesajeEscuela({ 
  empresaId, 
  usuario, 
  operacion,    // operación del día de esta escuela
  escuela,      // info de la escuela
  receta,       // info de la receta del día
  onCerrar, 
  onGuardado 
}) {
  const [pesajesExistentes, setPesajesExistentes] = useState([])
  const [pesoCocinado, setPesoCocinado] = useState('')
  const [pesoSobrante, setPesoSobrante] = useState('')
  const [notasCocinado, setNotasCocinado] = useState('')
  const [notasSobrante, setNotasSobrante] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  
  // Calculado: peso esperado por ración para esta receta
  const [pesoEsperadoCocido, setPesoEsperadoCocido] = useState(0)

  useEffect(() => {
    cargarDatos()
  }, [operacion?.id])

  async function cargarDatos() {
    setCargando(true)
    
    // 1) Cargar pesajes existentes de esta operación
    const { data: pesajes } = await supabase
      .from('pesajes_operacion')
      .select('*')
      .eq('operacion_id', operacion.id)
    
    setPesajesExistentes(pesajes || [])
    
    // Pre-llenar inputs con valores existentes
    const cocinadoExist = pesajes?.find(p => p.tipo === 'cocinado')
    const sobranteExist = pesajes?.find(p => p.tipo === 'retorno')
    
    if (cocinadoExist) {
      setPesoCocinado(cocinadoExist.peso || '')
      setNotasCocinado(cocinadoExist.notas || '')
    }
    if (sobranteExist) {
      setPesoSobrante(sobranteExist.peso || '')
      setNotasSobrante(sobranteExist.notas || '')
    }
    
    // 2) Cargar ingredientes de la receta para calcular esperado COCIDO
    if (receta?.id) {
      const { data: ings } = await supabase
        .from('recetas_ingredientes')
        .select('*, ingredientes(*)')
        .eq('receta_id', receta.id)
      
      // Calcular peso COCIDO esperado para las raciones de esta escuela
      const pesoCocidoTotal = (ings || []).reduce((sum, ri) => {
        const ing = ri.ingredientes
        if (!ing) return sum
        const factor = parseFloat(ing.factor_rendimiento || 1)
        const cantidadCrudoRacion = parseFloat(ri.cantidad_crudo_por_racion)
        return sum + (cantidadCrudoRacion * factor * (operacion.raciones_planificadas || 0))
      }, 0)
      
      setPesoEsperadoCocido(pesoCocidoTotal)
    }
    
    setCargando(false)
  }

  async function guardarPesaje(tipo, peso, notas) {
    if (!peso || parseFloat(peso) <= 0) return null
    
    const pesajeExistente = pesajesExistentes.find(p => p.tipo === tipo)
    const datos = {
      operacion_id: operacion.id,
      tipo: tipo,
      peso: parseFloat(peso),
      unidad: 'lb',
      registrado_por: usuario.id,
      hora_pesaje: new Date().toISOString(),
      notas: notas,
    }
    
    if (pesajeExistente) {
      // Actualizar
      const { error } = await supabase
        .from('pesajes_operacion')
        .update(datos)
        .eq('id', pesajeExistente.id)
      if (error) throw error
    } else {
      // Insertar
      const { error } = await supabase
        .from('pesajes_operacion')
        .insert([datos])
      if (error) throw error
    }
  }

  async function guardar() {
    setGuardando(true)
    try {
      // Guardar solo los que tienen valor
      if (pesoCocinado && parseFloat(pesoCocinado) > 0) {
        await guardarPesaje('cocinado', pesoCocinado, notasCocinado)
      }
      if (pesoSobrante && parseFloat(pesoSobrante) > 0) {
        await guardarPesaje('retorno', pesoSobrante, notasSobrante)
      }
      
      onGuardado && onGuardado()
      onCerrar()
    } catch (err) {
      alert('Error: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  // Cálculos
  const pesoCocinadoNum = parseFloat(pesoCocinado) || 0
  const pesoSobranteNum = parseFloat(pesoSobrante) || 0
  const pesoConsumido = pesoCocinadoNum - pesoSobranteNum
  const pctSobrante = pesoCocinadoNum > 0 
    ? (pesoSobranteNum / pesoCocinadoNum * 100) 
    : 0
  
  const racionesEntregadas = operacion.raciones_planificadas || 0
  const pesoPorRacionReal = racionesEntregadas > 0 && pesoConsumido > 0
    ? pesoConsumido / racionesEntregadas
    : 0
  
  // Variación cocinado vs esperado
  const variacionCocinado = pesoEsperadoCocido > 0 && pesoCocinadoNum > 0
    ? ((pesoCocinadoNum - pesoEsperadoCocido) / pesoEsperadoCocido * 100)
    : 0

  if (cargando) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8">
          <p className="text-gray-500">Cargando...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold tracking-wider opacity-80">
                ⚖️ PESAJES — POR ESCUELA
              </p>
              <h2 className="text-2xl font-bold mt-1">
                🏫 {escuela?.nombre}
              </h2>
              <p className="text-sm opacity-90 mt-1">
                {receta?.emoji} {receta?.nombre} · {racionesEntregadas} raciones
              </p>
            </div>
            <button
              onClick={onCerrar}
              className="text-white opacity-70 hover:opacity-100 text-2xl"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Cuerpo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          {/* Mensaje informativo */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-900">
            💡 Ambos pesajes son <strong>opcionales</strong>. Llena solo los que tengas. Mientras más datos, mejor afinará el sistema.
          </div>

          {/* Esperado de la receta (referencia) */}
          {pesoEsperadoCocido > 0 && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-sm">
              <p className="text-xs text-purple-700 font-semibold tracking-wider mb-1">
                📊 ESPERADO SEGÚN RECETA
              </p>
              <p className="text-purple-900">
                <strong>{pesoEsperadoCocido.toFixed(1)} lb</strong> cocinado para {racionesEntregadas} raciones
                <span className="text-xs text-purple-600 ml-2">
                  ({(pesoEsperadoCocido / racionesEntregadas).toFixed(3)} lb/ración)
                </span>
              </p>
            </div>
          )}

          {/* PESAJE 1: COCINADO */}
          <div className="border-2 border-orange-300 rounded-xl p-4 bg-orange-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-orange-900">🍳 PESAJE COCINADO</p>
                <p className="text-xs text-orange-700">Peso despachado a esta escuela</p>
              </div>
              {pesajesExistentes.find(p => p.tipo === 'cocinado') && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                  ✅ Registrado
                </span>
              )}
            </div>
            
            <div className="flex gap-2 items-center">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={pesoCocinado}
                onChange={(e) => setPesoCocinado(e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-orange-300 rounded-lg text-2xl font-bold text-center focus:border-orange-500 outline-none bg-white"
              />
              <span className="font-bold text-orange-700 text-lg">lb</span>
            </div>
            
            <input
              type="text"
              placeholder="Notas (opcional)"
              value={notasCocinado}
              onChange={(e) => setNotasCocinado(e.target.value)}
              className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm mt-2 bg-white"
            />
            
            {/* Análisis automático */}
            {pesoCocinadoNum > 0 && pesoEsperadoCocido > 0 && (
              <div className={`mt-3 p-2 rounded-lg text-xs font-semibold ${
                Math.abs(variacionCocinado) > 10
                  ? 'bg-red-100 text-red-900'
                  : Math.abs(variacionCocinado) > 5
                    ? 'bg-yellow-100 text-yellow-900'
                    : 'bg-green-100 text-green-900'
              }`}>
                {Math.abs(variacionCocinado) > 10 && '⚠️ '}
                {Math.abs(variacionCocinado) <= 5 && '✅ '}
                Variación vs receta: {variacionCocinado > 0 ? '+' : ''}{variacionCocinado.toFixed(1)}%
                ({(pesoCocinadoNum - pesoEsperadoCocido).toFixed(1)} lb {pesoCocinadoNum > pesoEsperadoCocido ? 'más' : 'menos'})
              </div>
            )}
          </div>

          {/* PESAJE 2: SOBRANTE */}
          <div className="border-2 border-purple-300 rounded-xl p-4 bg-purple-50">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="font-bold text-purple-900">🔄 PESAJE SOBRANTE</p>
                <p className="text-xs text-purple-700">Peso que regresó de la escuela</p>
              </div>
              {pesajesExistentes.find(p => p.tipo === 'retorno') && (
                <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">
                  ✅ Registrado
                </span>
              )}
            </div>
            
            <div className="flex gap-2 items-center">
              <input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={pesoSobrante}
                onChange={(e) => setPesoSobrante(e.target.value)}
                className="flex-1 px-4 py-3 border-2 border-purple-300 rounded-lg text-2xl font-bold text-center focus:border-purple-500 outline-none bg-white"
              />
              <span className="font-bold text-purple-700 text-lg">lb</span>
            </div>
            
            <input
              type="text"
              placeholder="Notas (opcional)"
              value={notasSobrante}
              onChange={(e) => setNotasSobrante(e.target.value)}
              className="w-full px-3 py-2 border border-purple-200 rounded-lg text-sm mt-2 bg-white"
            />
            
            {/* Análisis automático */}
            {pesoSobranteNum > 0 && pesoCocinadoNum > 0 && (
              <div className={`mt-3 p-2 rounded-lg text-xs font-semibold ${
                pctSobrante > 15
                  ? 'bg-red-100 text-red-900'
                  : pctSobrante > 8
                    ? 'bg-yellow-100 text-yellow-900'
                    : 'bg-green-100 text-green-900'
              }`}>
                {pctSobrante > 15 && '⚠️ '}
                {pctSobrante <= 8 && '✅ '}
                Sobrante: {pctSobrante.toFixed(1)}% del cocinado
                {pctSobrante > 15 && ' (demasiado alto, considerar reducir raciones)'}
                {pctSobrante > 8 && pctSobrante <= 15 && ' (aceptable, monitorear)'}
                {pctSobrante <= 8 && ' (muy bueno)'}
              </div>
            )}
          </div>

          {/* Resumen calculado */}
          {pesoCocinadoNum > 0 && pesoSobranteNum > 0 && (
            <div className="bg-gray-900 text-white rounded-xl p-4">
              <p className="text-xs font-semibold tracking-wider opacity-80 mb-2">
                📊 ANÁLISIS REAL
              </p>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="opacity-70 text-xs">Consumido real</p>
                  <p className="text-xl font-bold">{pesoConsumido.toFixed(1)} lb</p>
                </div>
                <div>
                  <p className="opacity-70 text-xs">lb por ración real</p>
                  <p className="text-xl font-bold">{pesoPorRacionReal.toFixed(3)} lb</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex gap-2">
          <button
            onClick={onCerrar}
            disabled={guardando}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl"
          >
            Cancelar
          </button>
          <button
            onClick={guardar}
            disabled={guardando || (!pesoCocinado && !pesoSobrante)}
            className="flex-1 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg disabled:opacity-50"
          >
            {guardando ? 'Guardando...' : '💾 Guardar pesajes'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default ModalPesajeEscuela