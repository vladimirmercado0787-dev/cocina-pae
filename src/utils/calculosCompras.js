// src/utils/calculosCompras.js
// ════════════════════════════════════════════════════
// 🧠 INTELIGENCIA DE LISTA DE COMPRAS
// ════════════════════════════════════════════════════

import { supabase } from '../supabaseClient'
import {
  buscarEstandarInabie,
  calcularConsumoSemanalInabie
} from './estandaresInabie'

// CONSTANTES
export const DIAS_COCINA_POR_SEMANA = 5
export const SEMANAS_HISTORICO_MINIMO = 4
export const DIAS_HISTORICO = 28
export const UMBRAL_ALERTA_DIAS = 5
export const MARGEN_DEFAULT_PORCENTAJE = 0

// HELPERS
export function redondear(numero, decimales = 2) {
  const factor = Math.pow(10, decimales)
  return Math.round(numero * factor) / factor
}

export function formatearRD(monto) {
  return `RD$${redondear(monto, 0).toLocaleString('es-DO')}`
}

export function contarDiasCocinaEnRango(fechaInicio, fechaFin) {
  let dias = 0
  const actual = new Date(fechaInicio)
  const fin = new Date(fechaFin)
  
  while (actual <= fin) {
    const dia = actual.getDay()
    if (dia >= 1 && dia <= 5) dias++
    actual.setDate(actual.getDate() + 1)
  }
  
  return dias
}

export function convertirADiasCocina(valor, tipo = 'dias') {
  if (tipo === 'semanas') return valor * DIAS_COCINA_POR_SEMANA
  if (tipo === 'meses') return valor * 4 * DIAS_COCINA_POR_SEMANA
  return valor
}

// CÁLCULO DEL CONSUMO APRENDIDO (REAL)
export async function calcularConsumoAprendido(empresaId) {
  const fechaFin = new Date()
  const fechaInicio = new Date()
  fechaInicio.setDate(fechaInicio.getDate() - DIAS_HISTORICO)
  
  const diasCocinaRango = contarDiasCocinaEnRango(fechaInicio, fechaFin)
  
  const { data: movimientos, error } = await supabase
    .from('movimientos_inventario')
    .select('ingrediente_id, cantidad, fecha')
    .eq('empresa_id', empresaId)
    .eq('origen', 'consumo_operacion')
    .gte('fecha', fechaInicio.toISOString().split('T')[0])
    .lte('fecha', fechaFin.toISOString().split('T')[0])
  
  if (error) {
    console.error('Error obteniendo movimientos:', error)
    return {}
  }
  
  const consumoPorIngrediente = {}
  
  movimientos?.forEach(m => {
    const id = m.ingrediente_id
    if (!consumoPorIngrediente[id]) {
      consumoPorIngrediente[id] = {
        totalConsumido: 0,
        diasConConsumo: new Set(),
        totalMovimientos: 0
      }
    }
    consumoPorIngrediente[id].totalConsumido += Math.abs(Number(m.cantidad))
    consumoPorIngrediente[id].diasConConsumo.add(m.fecha)
    consumoPorIngrediente[id].totalMovimientos++
  })
  
  const resultado = {}
  Object.keys(consumoPorIngrediente).forEach(id => {
    const data = consumoPorIngrediente[id]
    
    const promedioDiarioCocina = diasCocinaRango > 0 
      ? data.totalConsumido / diasCocinaRango 
      : 0
    
    const consumoSemanal = promedioDiarioCocina * DIAS_COCINA_POR_SEMANA
    
    resultado[id] = {
      consumoSemanal: redondear(consumoSemanal, 2),
      promedioDiarioCocina: redondear(promedioDiarioCocina, 3),
      diasConConsumo: data.diasConConsumo.size,
      totalMovimientos: data.totalMovimientos,
      esConfiable: data.diasConConsumo.size >= 10,
      esParcial: data.diasConConsumo.size >= 2 && data.diasConConsumo.size < 10
    }
  })
  
  return resultado
}

// CÁLCULO INABIE
export function calcularConsumoTeoricoInabie(ingrediente, racionesPromedio = 1230) {
  if (!ingrediente?.nombre) return 0
  
  const unidadDestino = ingrediente.unidad_stock === 'unidad' 
    ? 'unidad' 
    : 'lb'
  
  return calcularConsumoSemanalInabie(
    ingrediente.nombre,
    racionesPromedio,
    DIAS_COCINA_POR_SEMANA,
    unidadDestino
  )
}

// GENERAR LISTA DE COMPRAS
export async function obtenerListaCompras(
  empresaId,
  diasObjetivo = DIAS_COCINA_POR_SEMANA,
  racionesPromedio = 1230
) {
  const { data: ingredientes, error: errorIng } = await supabase
    .from('ingredientes')
    .select(`
      *,
      proveedores:ultimo_proveedor_id (
        id,
        nombre,
        contacto_telefono,
        contacto_nombre
      )
    `)
    .eq('empresa_id', empresaId)
    .eq('activo', true)
    .order('nombre')
  
  if (errorIng) {
    console.error('Error obteniendo ingredientes:', errorIng)
    return { items: [], error: errorIng }
  }
  
  const consumoAprendido = await calcularConsumoAprendido(empresaId)
  
  const items = ingredientes.map(ing => {
    const datosAprendidos = consumoAprendido[ing.id]
    const consumoEsperadoConfigurado = Number(ing.consumo_semanal_esperado) || 0
    const consumoInabie = calcularConsumoTeoricoInabie(ing, racionesPromedio)
    
    let consumoSemanal = 0
    let fuente = 'sin_dato'
    let etiquetaFuente = '⚠️ Sin datos'
    
    if (datosAprendidos?.esConfiable) {
      consumoSemanal = datosAprendidos.consumoSemanal
      fuente = 'aprendido'
      etiquetaFuente = `📊 Aprendido (${datosAprendidos.diasConConsumo} días)`
    } else if (consumoEsperadoConfigurado > 0) {
      consumoSemanal = consumoEsperadoConfigurado
      fuente = 'manual'
      etiquetaFuente = '✏️ Configurado'
    } else if (consumoInabie > 0) {
      consumoSemanal = consumoInabie
      fuente = 'inabie'
      etiquetaFuente = '📐 Estándar INABIE'
    } else if (datosAprendidos?.esParcial) {
      // Si hay datos pero son pocos días, usarlos con advertencia
      consumoSemanal = datosAprendidos.consumoSemanal
      fuente = 'parcial'
      etiquetaFuente = `📊 Parcial (${datosAprendidos.diasConConsumo} días)`
    }
    
    // Si NO hay forma de calcular, igual mostrar el ingrediente
    const sinDatos = consumoSemanal === 0
    
    const consumoPorDiaCocina = consumoSemanal / DIAS_COCINA_POR_SEMANA
    const stockActual = Number(ing.stock_actual) || 0
    const diasCocinaRestantes = consumoPorDiaCocina > 0 
      ? stockActual / consumoPorDiaCocina 
      : Infinity
    
    const cantidadObjetivo = consumoPorDiaCocina * diasObjetivo
    const cantidadSugerida = Math.max(0, cantidadObjetivo - stockActual)
    
    // Determinar urgencia
    let urgencia = 'suficiente'
    let etiquetaUrgencia = '✅ Suficiente'
    
    if (sinDatos) {
      urgencia = 'sin_dato'
      etiquetaUrgencia = '⚙️ Configurar'
    } else if (diasCocinaRestantes < 2) {
      urgencia = 'urgente'
      etiquetaUrgencia = '🚨 Urgente'
    } else if (diasCocinaRestantes < UMBRAL_ALERTA_DIAS) {
      urgencia = 'proximo'
      etiquetaUrgencia = '⚠️ Próximo'
    }
    
    const precioUnitario = Number(ing.ultimo_costo) || Number(ing.precio_unitario) || 0
    const costoEstimado = cantidadSugerida * precioUnitario
    
    const proveedorNormalizado = ing.proveedores ? {
      id: ing.proveedores.id,
      nombre: ing.proveedores.nombre,
      telefono: ing.proveedores.contacto_telefono || '',
      contacto: ing.proveedores.contacto_nombre || ''
    } : null
    
    return {
      id: ing.id,
      nombre: ing.nombre,
      categoria: ing.categoria,
      unidadStock: ing.unidad_stock,
      stockActual,
      stockMinimo: Number(ing.stock_minimo) || 0,
      
      consumoSemanal: redondear(consumoSemanal, 2),
      consumoPorDiaCocina: redondear(consumoPorDiaCocina, 3),
      diasCocinaRestantes: redondear(diasCocinaRestantes, 1),
      fuente,
      etiquetaFuente,
      sinDatos,
      
      cantidadObjetivo: redondear(cantidadObjetivo, 2),
      cantidadSugerida: redondear(cantidadSugerida, 2),
      diasObjetivo,
      
      urgencia,
      etiquetaUrgencia,
      
      precioUnitario: redondear(precioUnitario, 2),
      costoEstimado: redondear(costoEstimado, 2),
      costoEstimadoFormateado: formatearRD(costoEstimado),
      
      proveedor: proveedorNormalizado,
      tieneProveedor: !!proveedorNormalizado
    }
  })
  
  // Ordenar: urgentes → próximos → sin_dato → suficientes
  const ordenUrgencia = { urgente: 0, proximo: 1, sin_dato: 2, suficiente: 3 }
  items.sort((a, b) => {
    if (ordenUrgencia[a.urgencia] !== ordenUrgencia[b.urgencia]) {
      return ordenUrgencia[a.urgencia] - ordenUrgencia[b.urgencia]
    }
    return a.diasCocinaRestantes - b.diasCocinaRestantes
  })
  
  return { items, error: null }
}

// AGRUPAR POR PROVEEDOR
export function agruparPorProveedor(itemsSeleccionados) {
  const grupos = {}
  let totalGeneral = 0
  
  itemsSeleccionados.forEach(item => {
    const proveedorId = item.proveedor?.id || 'sin_proveedor'
    const proveedorNombre = item.proveedor?.nombre || 'Sin proveedor asignado'
    const proveedorTelefono = item.proveedor?.telefono || ''
    
    if (!grupos[proveedorId]) {
      grupos[proveedorId] = {
        id: proveedorId,
        nombre: proveedorNombre,
        telefono: proveedorTelefono,
        items: [],
        totalCosto: 0,
        tieneProveedor: proveedorId !== 'sin_proveedor'
      }
    }
    
    grupos[proveedorId].items.push(item)
    grupos[proveedorId].totalCosto += item.costoEstimado
    totalGeneral += item.costoEstimado
  })
  
  const gruposArray = Object.values(grupos).map(g => ({
    ...g,
    totalCosto: redondear(g.totalCosto, 2),
    totalCostoFormateado: formatearRD(g.totalCosto)
  }))
  
  gruposArray.sort((a, b) => {
    if (a.tieneProveedor && !b.tieneProveedor) return -1
    if (!a.tieneProveedor && b.tieneProveedor) return 1
    return a.nombre.localeCompare(b.nombre)
  })
  
  return {
    grupos: gruposArray,
    totalGeneral: redondear(totalGeneral, 2),
    totalGeneralFormateado: formatearRD(totalGeneral)
  }
}

// FORMATEAR WHATSAPP
export function formatearListaWhatsApp(gruposAgrupados, datosEmpresa = {}) {
  const fechaHoy = new Date().toLocaleDateString('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  
  let texto = `*🛒 LISTA DE COMPRAS*\n`
  texto += `_${datosEmpresa.nombre || 'Cocina PAE'}_\n`
  texto += `📅 ${fechaHoy}\n`
  texto += `━━━━━━━━━━━━━━━━━━━━\n\n`
  
  gruposAgrupados.grupos.forEach((grupo, idx) => {
    if (grupo.tieneProveedor) {
      texto += `*🏪 ${grupo.nombre.toUpperCase()}*\n`
      if (grupo.telefono) texto += `📞 ${grupo.telefono}\n`
    } else {
      texto += `*⚠️ SIN PROVEEDOR ASIGNADO*\n`
    }
    texto += `\n`
    
    grupo.items.forEach(item => {
      const cantidad = item.cantidadSugerida
      const unidad = item.unidadStock
      texto += `• ${item.nombre}: ${cantidad} ${unidad}\n`
      if (item.costoEstimado > 0) {
        texto += `  _≈ ${item.costoEstimadoFormateado}_\n`
      }
    })
    
    if (grupo.totalCosto > 0) {
      texto += `\n*Subtotal: ${grupo.totalCostoFormateado}*\n`
    }
    
    if (idx < gruposAgrupados.grupos.length - 1) {
      texto += `\n━━━━━━━━━━━━━━━━━━━━\n\n`
    }
  })
  
  if (gruposAgrupados.totalGeneral > 0) {
    texto += `\n━━━━━━━━━━━━━━━━━━━━\n`
    texto += `*💰 TOTAL ESTIMADO: ${gruposAgrupados.totalGeneralFormateado}*\n`
  }
  
  texto += `\n_Generado por Cocina PAE_ 🇩🇴`
  
  return texto
}

// RESUMEN ECONÓMICO
export function calcularResumenEconomico(items) {
  const urgentes = items.filter(i => i.urgencia === 'urgente')
  const proximos = items.filter(i => i.urgencia === 'proximo')
  const sinDato = items.filter(i => i.urgencia === 'sin_dato')
  const suficientes = items.filter(i => i.urgencia === 'suficiente')
  
  const totalUrgente = urgentes.reduce((sum, i) => sum + i.costoEstimado, 0)
  const totalProximo = proximos.reduce((sum, i) => sum + i.costoEstimado, 0)
  const totalGeneral = items.reduce((sum, i) => sum + i.costoEstimado, 0)
  
  const sinProveedor = items.filter(i => 
    (i.urgencia === 'urgente' || i.urgencia === 'proximo') && !i.tieneProveedor
  )
  
  return {
    totalItems: items.length,
    cantidadUrgentes: urgentes.length,
    cantidadProximos: proximos.length,
    cantidadSinDato: sinDato.length,
    cantidadSuficientes: suficientes.length,
    cantidadSinProveedor: sinProveedor.length,
    
    inversionUrgente: redondear(totalUrgente, 2),
    inversionUrgenteFormateada: formatearRD(totalUrgente),
    inversionProximo: redondear(totalProximo, 2),
    inversionProximoFormateada: formatearRD(totalProximo),
    inversionTotal: redondear(totalGeneral, 2),
    inversionTotalFormateada: formatearRD(totalGeneral),
    
    riesgoOperacional: urgentes.length > 0,
    mensajeRiesgo: urgentes.length > 0
      ? `🚨 ${urgentes.length} ingrediente${urgentes.length > 1 ? 's' : ''} se acaban en menos de 2 días`
      : null
  }
}