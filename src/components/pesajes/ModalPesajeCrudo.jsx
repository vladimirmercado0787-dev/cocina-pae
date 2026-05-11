import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function ModalPesajeCrudo({ 
  empresaId, 
  usuario, 
  receta, 
  totalRaciones, 
  fecha,
  modoPreAprobacion = false, // si es true, es para mañana
  onCerrar, 
  onAprobado 
}) {
  const [ingredientes, setIngredientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [editando, setEditando] = useState(false)

  useEffect(() => {
    cargarIngredientesReceta()
  }, [receta?.id, totalRaciones])

  async function cargarIngredientesReceta() {
    if (!receta?.id) {
      setCargando(false)
      return
    }
    
    setCargando(true)
    
    const { data } = await supabase
      .from('recetas_ingredientes')
      .select('*, ingredientes(*)')
      .eq('receta_id', receta.id)
    
    // Calcular pesaje sugerido para cada ingrediente
    const ingredientesConSugerencia = (data || []).map(ri => {
      const ing = ri.ingredientes
      const cantidadSugerida = parseFloat(ri.cantidad_crudo_por_racion) * totalRaciones
      
      return {
        ingrediente_id: ing.id,
        nombre: ing.nombre,
        emoji: getEmojiCategoria(ing.categoria),
        unidad: ri.unidad || 'lb',
        nivel: ing.nivel_importancia,
        peso_sugerido: cantidadSugerida,
        peso_real: cantidadSugerida, // por defecto igual al sugerido
        fue_editado: false,
        precio_unitario: parseFloat(ing.precio_unitario || 0),
        notas: '',
      }
    })
    
    setIngredientes(ingredientesConSugerencia)
    setCargando(false)
  }

  function getEmojiCategoria(cat) {
    const map = {
      'cereales': '🌾',
      'proteinas': '🍗',
      'vegetales': '🥬',
      'sazones': '🧂',
      'aceites': '🫒',
      'otros': '📦'
    }
    return map[cat] || '📦'
  }

  function actualizarPeso(idx, nuevoPeso) {
    const nuevos = [...ingredientes]
    const pesoFloat = parseFloat(nuevoPeso) || 0
    nuevos[idx].peso_real = pesoFloat
    nuevos[idx].fue_editado = pesoFloat !== nuevos[idx].peso_sugerido
    setIngredientes(nuevos)
  }

  function resetearAEsperado() {
    if (!confirm('¿Resetear todos los valores al sugerido?')) return
    cargarIngredientesReceta()
    setEditando(false)
  }

  async function aprobar() {
    if (!receta?.id) {
      alert('No hay receta para hoy')
      return
    }

    setGuardando(true)

    try {
      // 1) Crear/actualizar el registro en pesajes_dia
      const datosCabecera = {
        empresa_id: empresaId,
        fecha: fecha,
        receta_id: receta.id,
        total_raciones: totalRaciones,
        estado: modoPreAprobacion ? 'pre_aprobado' : 'aprobado',
        aprobado_por: usuario.id,
        hora_aprobacion: new Date().toISOString(),
        fue_pre_aprobado: modoPreAprobacion,
      }

      // Verificar si ya existe (upsert)
      const { data: existente } = await supabase
        .from('pesajes_dia')
        .select('id')
        .eq('empresa_id', empresaId)
        .eq('fecha', fecha)
        .maybeSingle()

      let pesajeDiaId

      if (existente) {
        // Actualizar
        const { error } = await supabase
          .from('pesajes_dia')
          .update(datosCabecera)
          .eq('id', existente.id)
        if (error) throw error
        pesajeDiaId = existente.id

        // Borrar ingredientes anteriores para insertar de nuevo
        await supabase
          .from('pesajes_dia_ingredientes')
          .delete()
          .eq('pesaje_dia_id', pesajeDiaId)
      } else {
        // Insertar nuevo
        const { data: nuevo, error } = await supabase
          .from('pesajes_dia')
          .insert([datosCabecera])
          .select()
          .single()
        if (error) throw error
        pesajeDiaId = nuevo.id
      }

      // 2) Insertar todos los ingredientes con tracking
      const detalles = ingredientes.map(ing => ({
        pesaje_dia_id: pesajeDiaId,
        ingrediente_id: ing.ingrediente_id,
        peso_sugerido: ing.peso_sugerido,
        peso_real: ing.peso_real,
        fue_editado: ing.fue_editado,
        unidad: ing.unidad,
        notas: ing.notas,
      }))

      const { error: errIngs } = await supabase
        .from('pesajes_dia_ingredientes')
        .insert(detalles)
      
      if (errIngs) throw errIngs

      // Listo
      onAprobado && onAprobado()
      onCerrar()
    } catch (err) {
      alert('Error al guardar: ' + err.message)
    } finally {
      setGuardando(false)
    }
  }

  // Cálculos
  const costoTotal = ingredientes.reduce((sum, ing) => 
    sum + (ing.peso_real * ing.precio_unitario), 0)
  
  const ingredientesEditados = ingredientes.filter(i => i.fue_editado).length
  const totalPesoCrudo = ingredientes.reduce((sum, ing) => sum + ing.peso_real, 0)

  if (cargando) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md">
          <p className="text-gray-500">Cargando ingredientes...</p>
        </div>
      </div>
    )
  }

  if (!receta) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md">
          <p className="text-red-600 font-bold">⚠️ No hay receta asignada</p>
          <button onClick={onCerrar} className="mt-4 px-4 py-2 bg-gray-200 rounded-lg">
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  if (ingredientes.length === 0) {
    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-8 max-w-md">
          <p className="text-orange-600 font-bold text-lg mb-2">⚠️ Receta sin ingredientes</p>
          <p className="text-sm text-gray-700 mb-4">
            La receta "{receta.nombre}" no tiene ingredientes asociados. Ve a Configuración → Menús y Recetas → Editar para agregarlos.
          </p>
          <button onClick={onCerrar} className="w-full px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg">
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className={`p-6 text-white ${
          modoPreAprobacion 
            ? 'bg-gradient-to-br from-purple-600 to-purple-800'
            : 'bg-gradient-to-br from-emerald-600 to-emerald-800'
        }`}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-semibold tracking-wider opacity-80">
                {modoPreAprobacion ? '🌙 PRE-PESAJE PARA MAÑANA' : '⚖️ PESAJE CRUDO DEL DÍA'}
              </p>
              <h2 className="text-2xl font-bold mt-1">
                {receta.emoji} {receta.nombre}
              </h2>
              <p className="text-sm opacity-90 mt-1">
                {totalRaciones.toLocaleString()} raciones · {fecha}
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

        {/* Cuerpo (scrollable) */}
        <div className="flex-1 overflow-y-auto p-6">
          
          {/* Mensaje informativo */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-sm text-blue-900">
            💡 La app calculó el pesaje sugerido. Revisa, edita si necesario, y aprueba.
            {modoPreAprobacion && (
              <span className="block mt-1 font-semibold">
                🌙 Este pesaje quedará listo para mañana. Mañana podrás editarlo si algo cambia.
              </span>
            )}
          </div>

          {/* Lista de ingredientes */}
          <div className="space-y-2">
            {ingredientes.map((ing, idx) => (
              <div 
                key={ing.ingrediente_id} 
                className={`border-2 rounded-xl p-3 ${
                  ing.fue_editado ? 'border-orange-400 bg-orange-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ing.emoji}</span>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900 text-sm">{ing.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {ing.nivel === 'principal' && '⚖️ Principal'}
                      {ing.nivel === 'sazonador' && '📏 Sazonador'}
                      {ing.nivel === 'condimento' && '🤏 Condimento'}
                      {' · '}
                      Sugerido: <strong>{ing.peso_sugerido.toFixed(2)}</strong> {ing.unidad}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={ing.peso_real}
                      onChange={(e) => actualizarPeso(idx, e.target.value)}
                      className={`w-24 px-2 py-1 border rounded-lg text-right font-mono font-bold ${
                        ing.fue_editado ? 'border-orange-400 bg-white' : 'border-gray-300'
                      }`}
                    />
                    <span className="text-sm text-gray-500 w-8">{ing.unidad}</span>
                  </div>
                </div>
                {ing.fue_editado && (
                  <p className="text-xs text-orange-700 font-semibold mt-2 ml-9">
                    ✏️ Editado: {(ing.peso_real - ing.peso_sugerido > 0 ? '+' : '')}
                    {(ing.peso_real - ing.peso_sugerido).toFixed(2)} {ing.unidad}
                    ({((ing.peso_real / ing.peso_sugerido - 1) * 100).toFixed(1)}%)
                  </p>
                )}
              </div>
            ))}
          </div>

          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3 mt-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
              <p className="text-xs text-blue-700 font-semibold tracking-wider">PESO CRUDO TOTAL</p>
              <p className="text-xl font-bold text-blue-900 mt-1">{totalPesoCrudo.toFixed(1)} lb</p>
            </div>
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
              <p className="text-xs text-green-700 font-semibold tracking-wider">COSTO ESTIMADO</p>
              <p className="text-xl font-bold text-green-900 mt-1">RD$ {costoTotal.toFixed(0)}</p>
            </div>
            <div className={`border rounded-xl p-3 text-center ${
              ingredientesEditados > 0 
                ? 'bg-orange-50 border-orange-200'
                : 'bg-gray-50 border-gray-200'
            }`}>
              <p className={`text-xs font-semibold tracking-wider ${
                ingredientesEditados > 0 ? 'text-orange-700' : 'text-gray-700'
              }`}>EDITADOS</p>
              <p className={`text-xl font-bold mt-1 ${
                ingredientesEditados > 0 ? 'text-orange-900' : 'text-gray-900'
              }`}>{ingredientesEditados} / {ingredientes.length}</p>
            </div>
          </div>

          {ingredientesEditados > 0 && (
            <button
              onClick={resetearAEsperado}
              className="mt-3 text-xs text-blue-600 hover:underline"
            >
              ↺ Resetear todos al sugerido
            </button>
          )}
        </div>

        {/* Footer (siempre visible) */}
        <div className="border-t border-gray-200 p-4 bg-gray-50 flex gap-2">
          <button
            onClick={onCerrar}
            disabled={guardando}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold rounded-xl"
          >
            Cancelar
          </button>
          <button
            onClick={aprobar}
            disabled={guardando}
            className={`flex-1 px-6 py-3 text-white font-bold rounded-xl shadow-lg ${
              modoPreAprobacion
                ? 'bg-purple-600 hover:bg-purple-700'
                : 'bg-emerald-600 hover:bg-emerald-700'
            } disabled:opacity-50`}
          >
            {guardando 
              ? 'Guardando...' 
              : modoPreAprobacion
                ? '🌙 Pre-Aprobar para mañana'
                : ingredientesEditados > 0 
                  ? `✅ Aprobar con ${ingredientesEditados} edición(es)`
                  : '✅ Aprobar tal cual'
            }
          </button>
        </div>

      </div>
    </div>
  )
}

export default ModalPesajeCrudo