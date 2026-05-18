// src/utils/calculosInteligencia.js
// Cerebro matemático de Cocina PAE
// Filosofía: "La matemática no puede fallar"
//
// Maneja:
// 1. Cálculo de sugerencias cocido POR ESCUELA POR COMPONENTE
// 2. Aprendizaje del factor de rendimiento (crudo → cocido)
// 3. Aprendizaje del consumo real por ración

import { supabase } from '../supabaseClient'

// ─── CONSTANTES ──────────────────────────────────────────────
const VENTANA_APRENDIZAJE_DIAS = 30  // últimos 30 días para promedio
const FACTOR_RENDIMIENTO_DEFAULT = 2.5  // INABIE por defecto si no hay historia

// ════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL: Calcular sugerencias para una escuela
// ════════════════════════════════════════════════════════════

/**
 * Calcula las sugerencias de cocido por componente para UNA escuela específica.
 * 
 * Lógica:
 *   1. Lee el crudo aprobado del día (de movimientos_inventario)
 *   2. Por cada componente de la receta:
 *      a) Suma cuánto crudo se usó para ese componente (sus ingredientes)
 *      b) Aplica el factor de rendimiento aprendido (o default INABIE)
 *      c) Multiplica por proporción de raciones de esta escuela
 *   3. Retorna lista de componentes con sugerencias
 * 
 * @param {Object} params
 * @param {string} params.empresaId
 * @param {string} params.escuelaId
 * @param {number} params.racionesEscuela  - raciones de ESTA escuela
 * @param {number} params.racionesDiaTotal - raciones TOTALES del día (todas las escuelas no sin_clase)
 * @param {string} params.recetaId         - receta del día
 * @param {string} params.fecha            - YYYY-MM-DD
 * @returns {Promise<Array>} lista de componentes con sugerencias
 */
export async function calcularSugerenciasCocidoPorEscuela({
  empresaId,
  escuelaId,
  racionesEscuela,
  racionesDiaTotal,
  recetaId,
  fecha,
}) {
  if (racionesDiaTotal <= 0) {
    return { error: 'No hay raciones del día para calcular' }
  }

  // 1. Cargar componentes de la receta con sus ingredientes
  const { data: componentes, error: errComp } = await supabase
    .from('componentes_receta')
    .select(`
      id, nombre, emoji, orden, unidad, factor_ajuste,
      componentes_ingredientes (
        ingrediente_id,
        ingredientes (id, nombre, factor_rendimiento)
      )
    `)
    .eq('empresa_id', empresaId)
    .eq('receta_id', recetaId)
    .order('orden')

  if (errComp) return { error: errComp.message }
  if (!componentes || componentes.length === 0) {
    return { error: 'La receta no tiene componentes configurados' }
  }

  // 2. Leer crudo aprobado del día (todos los movimientos)
  const { data: movimientos, error: errMov } = await supabase
    .from('movimientos_inventario')
    .select('ingrediente_id, cantidad')
    .eq('empresa_id', empresaId)
    .eq('fecha', fecha)
    .eq('origen', 'consumo_operacion')

  if (errMov) return { error: errMov.message }
  
  // Mapa: ingrediente_id → cantidad crudo total
  const crudoPorIngrediente = {}
  ;(movimientos || []).forEach(m => {
    crudoPorIngrediente[m.ingrediente_id] = 
      (crudoPorIngrediente[m.ingrediente_id] || 0) + Number(m.cantidad)
  })

  // 3. Proporción de esta escuela en el día total
  const proporcionEscuela = racionesEscuela / racionesDiaTotal

  // 4. Por cada componente: calcular sugerencia
  const sugerencias = await Promise.all(componentes.map(async (comp) => {
    // 4a. Sumar crudo de todos los ingredientes de este componente
    let crudoTotalComponente = 0
    let factorRendimientoIngrediente = FACTOR_RENDIMIENTO_DEFAULT
    let ingredientePrincipal = null

    const ingredientesDelComp = comp.componentes_ingredientes || []
    
    ingredientesDelComp.forEach(ci => {
      const cantidad = crudoPorIngrediente[ci.ingrediente_id] || 0
      crudoTotalComponente += cantidad
      
      // Tomamos el factor del primer ingrediente con mayor cantidad como referencia
      if (!ingredientePrincipal || cantidad > (crudoPorIngrediente[ingredientePrincipal.ingrediente_id] || 0)) {
        ingredientePrincipal = ci
        if (ci.ingredientes?.factor_rendimiento) {
          factorRendimientoIngrediente = Number(ci.ingredientes.factor_rendimiento)
        }
      }
    })

    // 4b. Intentar mejorar factor con aprendizaje histórico (componente específico)
    const factorAprendido = await obtenerFactorAprendidoComponente({
      empresaId,
      componenteId: comp.id,
      fechaActual: fecha,
    })
    
    const factorFinal = factorAprendido.factor || factorRendimientoIngrediente
    const factorAjuste = Number(comp.factor_ajuste || 1.0)
    
    // 4c. Cálculo final
    const cocidoEsperadoTotalDia = crudoTotalComponente * factorFinal * factorAjuste
    const sugerenciaEscuela = cocidoEsperadoTotalDia * proporcionEscuela
    
    return {
      componente_id: comp.id,
      nombre: comp.nombre,
      emoji: comp.emoji,
      orden: comp.orden,
      unidad: comp.unidad || 'lb',
      
      // Datos del cálculo (para mostrar transparencia)
      crudo_total_componente: redondear(crudoTotalComponente, 2),
      factor_rendimiento_usado: redondear(factorFinal, 2),
      factor_ajuste_componente: redondear(factorAjuste, 2),
      raciones_escuela: racionesEscuela,
      raciones_dia_total: racionesDiaTotal,
      proporcion: redondear(proporcionEscuela, 4),
      
      // Sugerencia final (lo que importa)
      peso_cocido_sugerido: redondear(sugerenciaEscuela, 1),
      
      // Aprendizaje
      dias_aprendidos: factorAprendido.diasAprendidos,
      fuente_factor: factorAprendido.factor ? 'aprendido' : 'default',
      
      // Texto explicativo para mostrar al usuario
      formula_texto: `${redondear(crudoTotalComponente, 1)} lb crudo × ${redondear(factorFinal, 2)}x factor × (${racionesEscuela}/${racionesDiaTotal} raciones) = ${redondear(sugerenciaEscuela, 1)} ${comp.unidad || 'lb'}`,
    }
  }))

  return { 
    success: true, 
    sugerencias,
    contexto: {
      raciones_escuela: racionesEscuela,
      raciones_dia_total: racionesDiaTotal,
      proporcion: redondear(proporcionEscuela, 4),
      fecha,
    }
  }
}

// ════════════════════════════════════════════════════════════
// FUNCIÓN: Obtener factor de rendimiento aprendido por componente
// ════════════════════════════════════════════════════════════

/**
 * Calcula el promedio del factor de rendimiento aprendido para un componente.
 * Usa los últimos N días de despachos_componente.
 * 
 * factor_real = peso_cocido_real / crudo_aprobado_dia (por componente)
 */
export async function obtenerFactorAprendidoComponente({
  empresaId,
  componenteId,
  fechaActual,
}) {
  const fechaDesde = new Date(fechaActual)
  fechaDesde.setDate(fechaDesde.getDate() - VENTANA_APRENDIZAJE_DIAS)
  const fechaDesdeStr = fechaDesde.toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('despachos_componente')
    .select('peso_cocido_real, crudo_aprobado_dia, factor_rendimiento_usado, raciones_escuela, raciones_dia_total')
    .eq('empresa_id', empresaId)
    .eq('componente_id', componenteId)
    .gte('fecha', fechaDesdeStr)
    .lt('fecha', fechaActual)
    .not('peso_cocido_real', 'is', null)
    .not('crudo_aprobado_dia', 'is', null)

  if (error || !data || data.length === 0) {
    return { factor: null, diasAprendidos: 0 }
  }

  // Calcular factor real de cada registro
  // factor_dia = (peso_cocido_real / proporcion_escuela) / crudo_aprobado_dia
  //            = peso_cocido_real * raciones_dia / (raciones_escuela * crudo_aprobado_dia)
  
  const factoresValidos = data
    .map(r => {
      const proporcion = Number(r.raciones_escuela) / Number(r.raciones_dia_total)
      const cocidoTotalReconstruido = Number(r.peso_cocido_real) / proporcion
      const factor = cocidoTotalReconstruido / Number(r.crudo_aprobado_dia)
      return isFinite(factor) && factor > 0 ? factor : null
    })
    .filter(f => f !== null)

  if (factoresValidos.length === 0) {
    return { factor: null, diasAprendidos: 0 }
  }

  const promedio = factoresValidos.reduce((a, b) => a + b, 0) / factoresValidos.length

  return {
    factor: promedio,
    diasAprendidos: factoresValidos.length,
  }
}

// ════════════════════════════════════════════════════════════
// FUNCIÓN: Crudo sugerido para el día (aprendido)
// ════════════════════════════════════════════════════════════

/**
 * Sugiere cantidad de cada ingrediente crudo basado en historia real.
 * Si hay 3+ días de historia, usa promedio. Si no, usa INABIE.
 */
export async function obtenerLibrasPorRacionAprendidas({
  empresaId,
  ingredienteId,
  fechaActual,
}) {
  const fechaDesde = new Date(fechaActual)
  fechaDesde.setDate(fechaDesde.getDate() - VENTANA_APRENDIZAJE_DIAS)
  const fechaDesdeStr = fechaDesde.toISOString().split('T')[0]

  // Leer movimientos + raciones del día
  const { data, error } = await supabase
    .from('movimientos_inventario')
    .select(`
      cantidad, fecha,
      operaciones_dia!inner (raciones_planificadas, estado)
    `)
    .eq('empresa_id', empresaId)
    .eq('ingrediente_id', ingredienteId)
    .eq('origen', 'consumo_operacion')
    .gte('fecha', fechaDesdeStr)
    .lt('fecha', fechaActual)

  if (error || !data || data.length === 0) {
    return { libPorRacion: null, diasAprendidos: 0 }
  }

  // Necesitamos sumar por día (crudo_total / raciones_total)
  // Esto requeriría una query más compleja. Por ahora retornamos null
  // y se calculará con INABIE en el wizard. Lo dejamos como TODO.
  
  return { libPorRacion: null, diasAprendidos: 0 }
}

// ════════════════════════════════════════════════════════════
// UTILITIES
// ════════════════════════════════════════════════════════════

function redondear(num, decimales = 2) {
  if (!isFinite(num)) return 0
  const factor = Math.pow(10, decimales)
  return Math.round(num * factor) / factor
}

export { redondear, VENTANA_APRENDIZAJE_DIAS, FACTOR_RENDIMIENTO_DEFAULT }