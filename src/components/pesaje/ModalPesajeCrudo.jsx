// src/components/pesaje/ModalPesajeCrudo.jsx
// Modal de Pesaje Crudo — Cocina PAE
// Decisión 15-may-2026
//
// Flujo:
// 1. Detecta receta del día (por dia_semana)
// 2. Suma raciones de escuelas en estado 'preparando'
// 3. Calcula sugerencia de cada ingrediente: cantidad_por_racion × total_raciones
// 4. Permite editar raciones totales (recalcula todo)
// 5. Permite editar cantidad individual de cada ingrediente
// 6. Al aprobar: inserta N filas en movimientos_inventario (tipo='salida', origen='consumo_operacion')
//    Cada inserción actualiza stock automáticamente vía trigger o cálculo manual

import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']

export default function ModalPesajeCrudo({ 
  empresaId, 
  usuario, 
  operacionesPreparando,  // array de operaciones_dia en estado 'preparando'
  escuelas,                // array de escuelas (para calcular raciones)
  onCerrar, 
  onAprobado 
}) {
  const [receta, setReceta] = useState(null)
  const [ingredientes, setIngredientes] = useState([]) // [{id, nombre, categoria, unidad, cantidad_sugerida, cantidad_real, stock_actual, factor_rendimiento}]
  const [racionesTotales, setRacionesTotales] = useState(0)
  const [racionesEditables, setRacionesEditables] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)
  const [notas, setNotas] = useState('')

  // ─── Cargar receta + ingredientes al abrir ──────────────────
  useEffect(() => {
    cargarRecetaDelDia()
  }, [])

  // ─── Recalcular sugerencias cuando cambian las raciones ─────
  useEffect(() => {
    if (receta && racionesEditables > 0) {
      recalcularSugerencias()
    }
  }, [racionesEditables])

  async function cargarRecetaDelDia() {
    try {
      setCargando(true)
      setError(null)

      // 1. Calcular raciones totales de escuelas en 'preparando'
      const totalRaciones = operacionesPreparando.reduce((sum, op) => {
        return sum + (op.raciones_planificadas || 0)
      }, 0)
      setRacionesTotales(totalRaciones)
      setRacionesEditables(totalRaciones)

      // 2. Detectar día de la semana
      const hoy = new Date()
      const diaSemana = DIAS_SEMANA[hoy.getDay()]

      // 3. Buscar receta del día
      const { data: recetaData, error: errReceta } = await supabase
        .from('recetas')
        .select(`
          id,
          nombre,
          emoji,
          dia_semana,
          notas_operativas,
          recetas_ingredientes (
            id,
            cantidad_crudo_por_racion,
            unidad,
            notas,
            ingredientes (
              id,
              nombre,
              categoria,
              unidad_compra,
              factor_rendimiento,
              stock_actual,
              precio_unitario
            )
          )
        `)
        .eq('empresa_id', empresaId)
        .eq('activa', true)
        .eq('dia_semana', diaSemana)
        .single()

      if (errReceta) throw errReceta
      if (!recetaData) throw new Error(`No hay receta configurada para ${diaSemana}`)

      setReceta(recetaData)

      // 4. Construir lista de ingredientes con sugerencias
      const lista = (recetaData.recetas_ingredientes || []).map(ri => {
        const ing = ri.ingredientes
        const sugerida = Number(ri.cantidad_crudo_por_racion) * totalRaciones
        return {
          ingrediente_id: ing.id,
          nombre: ing.nombre,
          categoria: ing.categoria,
          unidad: ri.unidad || 'lb',
          cantidad_por_racion: Number(ri.cantidad_crudo_por_racion),
          cantidad_sugerida: sugerida,
          cantidad_real: sugerida, // editable, default = sugerida
          stock_actual: Number(ing.stock_actual || 0),
          precio_unitario: Number(ing.precio_unitario || 0),
          factor_rendimiento: Number(ing.factor_rendimiento || 1),
          notas: ri.notas || ''
        }
      })

      setIngredientes(lista)
    } catch (err) {
      console.error('Error cargando receta:', err)
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function recalcularSugerencias() {
    setIngredientes(prev => prev.map(ing => {
      const nuevaSugerencia = ing.cantidad_por_racion * racionesEditables
      return {
        ...ing,
        cantidad_sugerida: nuevaSugerencia,
        cantidad_real: nuevaSugerencia // resetea a la sugerencia cuando cambia raciones
      }
    }))
  }

  function editarCantidad(ingrediente_id, valorNuevo) {
    const valor = parseFloat(valorNuevo) || 0
    setIngredientes(prev => prev.map(ing => 
      ing.ingrediente_id === ingrediente_id
        ? { ...ing, cantidad_real: valor }
        : ing
    ))
  }

  function resetearAIndividual(ingrediente_id) {
    setIngredientes(prev => prev.map(ing => 
      ing.ingrediente_id === ingrediente_id
        ? { ...ing, cantidad_real: ing.cantidad_sugerida }
        : ing
    ))
  }

  // ─── Aprobar pesaje: insertar filas en movimientos_inventario ───
  async function aprobarPesaje() {
    if (racionesEditables <= 0) {
      alert('Las raciones totales deben ser mayor a 0')
      return
    }

    const ingredientesAGuardar = ingredientes.filter(ing => ing.cantidad_real > 0)
    if (ingredientesAGuardar.length === 0) {
      alert('Debes registrar al menos un ingrediente')
      return
    }

    const confirmar = window.confirm(
      `¿Confirmas el pesaje?\n\n` +
      `📊 ${racionesEditables.toLocaleString()} raciones\n` +
      `🥘 ${ingredientesAGuardar.length} ingredientes a sacar del inventario\n\n` +
      `Esta acción NO se puede deshacer fácilmente.`
    )
    if (!confirmar) return

    setProcesando(true)
    setError(null)

    try {
      const fechaHoy = new Date().toISOString().split('T')[0]
      const origenId = operacionesPreparando[0]?.id || null // primera operación del día como referencia

      // Construir las N filas para movimientos_inventario
      const movimientos = ingredientesAGuardar.map(ing => ({
        empresa_id: empresaId,
        ingrediente_id: ing.ingrediente_id,
        tipo: 'salida',
        origen: 'consumo_operacion',
        origen_id: origenId,
        cantidad: ing.cantidad_real,
        unidad: ing.unidad,
        precio_unitario: ing.precio_unitario,
        stock_antes: ing.stock_actual,
        stock_despues: ing.stock_actual - ing.cantidad_real,
        fecha: fechaHoy,
        notas: `Pesaje crudo · ${receta.nombre} · ${racionesEditables} raciones${notas ? ' · ' + notas : ''}`,
        created_by: usuario.id
      }))

      // Insertar todas las filas
      const { error: errInsert } = await supabase
        .from('movimientos_inventario')
        .insert(movimientos)

      if (errInsert) throw errInsert

      // Actualizar stock_actual de cada ingrediente
      // (idealmente esto sería un trigger en BD, por ahora lo hacemos manual)
      for (const ing of ingredientesAGuardar) {
        const nuevoStock = ing.stock_actual - ing.cantidad_real
        await supabase
          .from('ingredientes')
          .update({ stock_actual: nuevoStock })
          .eq('id', ing.ingrediente_id)
      }

      // ✅ Listo, cerrar modal
      alert(`✅ Pesaje aprobado\n\n${ingredientesAGuardar.length} ingredientes registrados\n${racionesEditables} raciones`)
      if (onAprobado) onAprobado()
    } catch (err) {
      console.error('Error aprobando pesaje:', err)
      setError(err.message)
    } finally {
      setProcesando(false)
    }
  }

  // ─── Cálculos en vivo ────────────────────────────────────────
  const costoTotal = ingredientes.reduce((sum, ing) => {
    return sum + (ing.cantidad_real * ing.precio_unitario)
  }, 0)

  const hayStockInsuficiente = ingredientes.some(ing => 
    ing.cantidad_real > ing.stock_actual && ing.stock_actual > 0
  )

  // ─── Render: Loading ─────────────────────────────────────────
  if (cargando) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-12 text-center">
          <div className="text-6xl mb-4 animate-pulse">🥘</div>
          <p className="text-gray-700 font-medium">Cargando receta del día...</p>
        </div>
      </div>
    )
  }

  // ─── Render: Error ───────────────────────────────────────────
  if (error && !receta) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-red-700 mb-2">❌ Error</h3>
          <p className="text-gray-700 mb-4">{error}</p>
          <button onClick={onCerrar} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold px-4 py-2 rounded-lg">
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  // ─── Render: Modal completo ──────────────────────────────────
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full my-8 shadow-2xl">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-600 rounded-t-2xl p-6 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-amber-100 text-xs font-semibold tracking-wider">PESAJE CRUDO</p>
              <h2 className="text-2xl font-bold mt-1 flex items-center gap-2">
                <span className="text-3xl">{receta?.emoji || '🥘'}</span>
                {receta?.nombre}
              </h2>
              <p className="text-amber-50 text-sm mt-1">
                {operacionesPreparando.length} escuela(s) · Pesa todo de un solo cocinazo
              </p>
            </div>
            <button
              onClick={onCerrar}
              disabled={procesando}
              className="text-white/80 hover:text-white text-2xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Notas operativas de la receta */}
        {receta?.notas_operativas && (
          <div className="bg-amber-50 border-b border-amber-200 p-4">
            <p className="text-xs font-semibold text-amber-800 uppercase mb-1">⚙️ Notas operativas</p>
            <p className="text-sm text-gray-700">{receta.notas_operativas}</p>
          </div>
        )}

        {/* Editor de raciones totales */}
        <div className="p-6 border-b border-gray-200 bg-gray-50">
          <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
            Total de raciones a cocinar
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="1"
              value={racionesEditables}
              onChange={(e) => setRacionesEditables(parseInt(e.target.value) || 0)}
              disabled={procesando}
              className="w-32 px-3 py-2 border-2 border-amber-400 rounded-lg text-2xl font-bold text-center"
            />
            <div className="text-sm text-gray-600">
              <p>Sugerencia: <strong>{racionesTotales.toLocaleString()}</strong> raciones</p>
              <p className="text-xs text-gray-500">(suma de escuelas iniciadas)</p>
            </div>
            {racionesEditables !== racionesTotales && (
              <button
                onClick={() => setRacionesEditables(racionesTotales)}
                disabled={procesando}
                className="ml-auto text-xs text-amber-700 underline hover:text-amber-900"
              >
                ↺ Restaurar sugerencia
              </button>
            )}
          </div>
        </div>

        {/* Lista de ingredientes */}
        <div className="p-6">
          <p className="text-xs font-bold text-gray-700 uppercase mb-4">
            🥘 Ingredientes ({ingredientes.length})
          </p>
          
          <div className="space-y-2">
            {ingredientes.map((ing) => {
              const editada = Math.abs(ing.cantidad_real - ing.cantidad_sugerida) > 0.001
              const sinStock = ing.cantidad_real > ing.stock_actual && ing.stock_actual > 0
              const stockCero = ing.stock_actual === 0

              return (
                <div
                  key={ing.ingrediente_id}
                  className={`border-2 rounded-xl p-3 ${
                    sinStock || stockCero
                      ? 'border-red-300 bg-red-50'
                      : editada
                      ? 'border-amber-300 bg-amber-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Nombre y categoría */}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-900 truncate">{ing.nombre}</p>
                      <p className="text-xs text-gray-500">{ing.categoria}</p>
                      {ing.notas && (
                        <p className="text-xs text-amber-700 italic mt-0.5">💡 {ing.notas}</p>
                      )}
                    </div>

                    {/* Stock actual */}
                    <div className="text-right text-xs">
                      <p className="text-gray-500">Stock</p>
                      <p className={`font-bold ${stockCero ? 'text-red-600' : 'text-gray-700'}`}>
                        {ing.stock_actual.toFixed(2)} {ing.unidad}
                      </p>
                    </div>

                    {/* Input editable */}
                    <div className="flex flex-col items-end">
                      <input
                        type="number"
                        min="0"
                        step="0.001"
                        value={ing.cantidad_real}
                        onChange={(e) => editarCantidad(ing.ingrediente_id, e.target.value)}
                        disabled={procesando}
                        className={`w-24 px-2 py-1.5 border-2 rounded-lg text-right font-bold ${
                          sinStock || stockCero
                            ? 'border-red-400 text-red-700'
                            : editada
                            ? 'border-amber-400 text-amber-900'
                            : 'border-gray-300'
                        }`}
                      />
                      <span className="text-xs text-gray-500 mt-0.5">{ing.unidad}</span>
                      {editada && (
                        <button
                          onClick={() => resetearAIndividual(ing.ingrediente_id)}
                          className="text-xs text-amber-700 underline mt-1"
                        >
                          ↺ {ing.cantidad_sugerida.toFixed(3)}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Advertencia de stock */}
                  {(sinStock || stockCero) && (
                    <p className="text-xs text-red-700 font-semibold mt-2">
                      ⚠️ {stockCero ? 'Sin stock registrado' : 'Cantidad mayor al stock disponible'} — verifica antes de aprobar
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Notas del pesaje */}
        <div className="px-6 pb-4">
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
            Notas del pesaje (opcional)
          </label>
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: Habichuelas un poco viejas, faltó cebolla..."
            disabled={procesando}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* Footer: resumen + botones */}
        <div className="bg-gray-50 rounded-b-2xl p-6 border-t border-gray-200">
          
          {/* Resumen */}
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Raciones</p>
              <p className="text-xl font-bold text-amber-700">{racionesEditables.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Ingredientes</p>
              <p className="text-xl font-bold text-gray-800">{ingredientes.length}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Costo estimado</p>
              <p className="text-xl font-bold text-emerald-700">
                RD$ {costoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
          </div>

          {hayStockInsuficiente && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800 font-semibold">
                ⚠️ Algunos ingredientes tienen cantidad mayor al stock. Puedes continuar igual (el inventario se ajustará).
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-red-800">❌ {error}</p>
            </div>
          )}

          {/* Botones */}
          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              disabled={procesando}
              className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={aprobarPesaje}
              disabled={procesando || racionesEditables <= 0}
              className="flex-1 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold px-6 py-3 rounded-xl shadow-lg disabled:opacity-50"
            >
              {procesando ? 'Guardando pesaje...' : '✅ Aprobar pesaje y sacar del inventario'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}