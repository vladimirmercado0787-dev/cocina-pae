// ═══════════════════════════════════════════════════════════
// 📌 gastosAutomaticos.js
// ───────────────────────────────────────────────────────────
// Helper para crear gastos automáticos desde otros módulos
// del ecosistema (Nómina, Bonificaciones, Liquidaciones, Compras)
//
// FILOSOFÍA:
// "Si me rompo el pie derecho, cojeo y camino con el izquierdo.
//  Una acción debe traer consecuencias en todo el ecosistema."
//
// Bloque 6D — INT-001: Pago Nómina → Gasto automático
// Bloque 6D — INT-002: Bonificación → Gasto automático
// Bloque 6D — INT-003: Liquidación → Gasto automático
// Bloque 6C — INT-004: Compra → Gasto automático
// ═══════════════════════════════════════════════════════════

import { supabase } from '../supabaseClient';

// ───────────────────────────────────────────────────────────
// 🔑 CONSTANTES — IDs de categorías
// (creadas en migraciones SQL del 25 y 26-mayo-2026)
// ───────────────────────────────────────────────────────────
export const CATEGORIA_SUELDOS_ID = '6061ddf7-9a4b-432c-9070-3aa509754e77';
export const CATEGORIA_APORTES_ID = 'dcdd8b77-4518-42f9-bd4a-76e0758aa2a4';

// INT-004: Nuevas categorías para compras
export const CATEGORIA_INSUMOS_INVENTARIABLES_ID = '8a750d3f-37fb-46ba-8f93-b638b0066e81';
export const CATEGORIA_LIMPIEZA_ID = '47ebfd86-2a5c-4936-8d4b-bd7a04a6c2b9';
export const CATEGORIA_GAS_ID = '8e47dee7-05d8-418e-90df-8e334b8c6584';
export const CATEGORIA_INSUMOS_NO_INVENTARIABLES_ID = 'f5d260a6-bccf-4d59-9203-1bf996c41ef3';
export const CATEGORIA_OTROS_ID = '14fb8b21-37df-40a2-9565-0781ea783301';

// ───────────────────────────────────────────────────────────
// 🏷️ ORIGENES VÁLIDOS (deben coincidir con BD)
// ───────────────────────────────────────────────────────────
export const ORIGEN = {
  MANUAL: 'manual',
  NOMINA_PAGO: 'nomina_pago',
  NOMINA_BONIFICACION: 'nomina_bonificacion',
  NOMINA_LIQUIDACION: 'nomina_liquidacion',
  COMPRA_INVENTARIO: 'compra_inventario',
};

// ───────────────────────────────────────────────────────────
// 🗺️ MAPEO: Categoría de Compra → Categoría de Gasto (INT-004)
// ───────────────────────────────────────────────────────────
const MAPEO_CATEGORIA_COMPRA = {
  viveres: CATEGORIA_INSUMOS_INVENTARIABLES_ID,
  carnes: CATEGORIA_INSUMOS_INVENTARIABLES_ID,
  vegetales: CATEGORIA_INSUMOS_INVENTARIABLES_ID,
  lacteos: CATEGORIA_INSUMOS_INVENTARIABLES_ID,
  condimentos: CATEGORIA_INSUMOS_INVENTARIABLES_ID,
  gas: CATEGORIA_GAS_ID,
  limpieza: CATEGORIA_LIMPIEZA_ID,
  utiles: CATEGORIA_INSUMOS_NO_INVENTARIABLES_ID,
  otros: CATEGORIA_OTROS_ID,
};

// ───────────────────────────────────────────────────────────
// 🏷️ ETIQUETAS DESCRIPTIVAS DE CATEGORÍAS DE COMPRA
// ───────────────────────────────────────────────────────────
const ETIQUETAS_CATEGORIA_COMPRA = {
  viveres: 'Víveres',
  carnes: 'Carnes',
  vegetales: 'Vegetales',
  lacteos: 'Lácteos',
  condimentos: 'Condimentos',
  gas: 'Gas',
  limpieza: 'Limpieza',
  utiles: 'Útiles',
  otros: 'Otros',
};

// ───────────────────────────────────────────────────────────
// 🏷️ ETIQUETAS DESCRIPTIVAS DE TIPOS DE BONO
// ───────────────────────────────────────────────────────────
const ETIQUETAS_TIPO_BONO = {
  navideño: 'Bono Navideño',
  cumpleaños: 'Bono de Cumpleaños',
  productividad: 'Bono de Productividad',
  reconocimiento: 'Bono de Reconocimiento',
  otro: 'Bonificación Extra',
};

// ───────────────────────────────────────────────────────────
// 🏷️ ETIQUETAS DESCRIPTIVAS DE RAZONES DE LIQUIDACIÓN
// ───────────────────────────────────────────────────────────
const ETIQUETAS_RAZON_LIQUIDACION = {
  terminacion_natural: 'Terminación natural del contrato',
  renuncia: 'Renuncia voluntaria',
  despido_justa: 'Despido con causa justa',
  despido_sin_causa: 'Despido sin causa (desahucio)',
  despido_anticipado_obra: 'Despido anticipado en obra/servicio',
  mutuo_acuerdo: 'Mutuo acuerdo',
};

// ═══════════════════════════════════════════════════════════
// 💰 crearGastosDesdeNomina  (INT-001)
// ═══════════════════════════════════════════════════════════
export async function crearGastosDesdeNomina({
  empresaId,
  pagoNominaId,
  fechaPago,
  totalNeto,
  totalAportes,
  descripcionPeriodo,
  registradoPor,
  registradoPorNombre,
}) {
  if (!empresaId || !pagoNominaId || !fechaPago) {
    return {
      success: false,
      error: 'Faltan datos requeridos (empresaId, pagoNominaId, fechaPago)',
    };
  }

  if (totalNeto == null || totalNeto < 0) {
    return { success: false, error: 'totalNeto inválido' };
  }

  if (totalAportes == null || totalAportes < 0) {
    return { success: false, error: 'totalAportes inválido' };
  }

  const gastosACrear = [];

  if (totalNeto > 0) {
    gastosACrear.push({
      empresa_id: empresaId,
      categoria_id: CATEGORIA_SUELDOS_ID,
      descripcion: `Pago nómina — ${descripcionPeriodo}`,
      fecha: fechaPago,
      subtotal: totalNeto,
      aplica_itbis: false,
      itbis: 0,
      total: totalNeto,
      forma_pago: 'efectivo',
      pagado: true,
      notas: 'Generado automáticamente desde módulo de Nómina',
      registrado_por: registradoPor || null,
      registrado_por_nombre: registradoPorNombre || 'Sistema',
      origen: ORIGEN.NOMINA_PAGO,
      referencia_id: pagoNominaId,
    });
  }

  if (totalAportes > 0) {
    gastosACrear.push({
      empresa_id: empresaId,
      categoria_id: CATEGORIA_APORTES_ID,
      descripcion: `Aportes patronales (TSS+AFP) — ${descripcionPeriodo}`,
      fecha: fechaPago,
      subtotal: totalAportes,
      aplica_itbis: false,
      itbis: 0,
      total: totalAportes,
      forma_pago: 'transferencia',
      pagado: false,
      notas: 'Generado automáticamente desde módulo de Nómina',
      registrado_por: registradoPor || null,
      registrado_por_nombre: registradoPorNombre || 'Sistema',
      origen: ORIGEN.NOMINA_PAGO,
      referencia_id: pagoNominaId,
    });
  }

  if (gastosACrear.length === 0) {
    return {
      success: true,
      gastos: [],
      mensaje: 'No se crearon gastos (montos en cero)',
    };
  }

  const { data, error } = await supabase
    .from('gastos')
    .insert(gastosACrear)
    .select();

  if (error) {
    console.error('❌ Error creando gastos automáticos:', error);
    return { success: false, error: error.message };
  }

  console.log(`✅ ${data.length} gasto(s) automático(s) creado(s) desde nómina:`, data);
  return { success: true, gastos: data };
}

// ═══════════════════════════════════════════════════════════
// 🎁 crearGastoDesdeBonificacion  (INT-002)
// ═══════════════════════════════════════════════════════════
export async function crearGastoDesdeBonificacion({
  empresaId,
  bonificacionId,
  fechaPago,
  titulo,
  tipo,
  montoTotal,
  cantidadEmpleados,
  registradoPor,
  registradoPorNombre,
}) {
  if (!empresaId || !bonificacionId || !fechaPago) {
    return {
      success: false,
      error: 'Faltan datos requeridos (empresaId, bonificacionId, fechaPago)',
    };
  }

  if (montoTotal == null || montoTotal <= 0) {
    return {
      success: false,
      error: 'montoTotal debe ser mayor a cero',
    };
  }

  const etiquetaTipo = ETIQUETAS_TIPO_BONO[tipo] || 'Bonificación Extra';
  const tituloLimpio = titulo?.trim() || etiquetaTipo;
  
  const cantidadTexto = cantidadEmpleados === 1 
    ? '1 empleado' 
    : `${cantidadEmpleados} empleados`;

  const descripcion = `${tituloLimpio} (${cantidadTexto})`;

  const nuevoGasto = {
    empresa_id: empresaId,
    categoria_id: CATEGORIA_SUELDOS_ID,
    descripcion: descripcion,
    fecha: fechaPago,
    subtotal: montoTotal,
    aplica_itbis: false,
    itbis: 0,
    total: montoTotal,
    forma_pago: 'efectivo',
    pagado: true,
    notas: `Generado automáticamente desde módulo de Bonificaciones (tipo: ${tipo})`,
    registrado_por: registradoPor || null,
    registrado_por_nombre: registradoPorNombre || 'Sistema',
    origen: ORIGEN.NOMINA_BONIFICACION,
    referencia_id: bonificacionId,
  };

  const { data, error } = await supabase
    .from('gastos')
    .insert([nuevoGasto])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creando gasto desde bonificación:', error);
    return { success: false, error: error.message };
  }

  console.log('✅ Gasto automático creado desde bonificación:', data);
  return { success: true, gasto: data };
}

// ═══════════════════════════════════════════════════════════
// ⚖️ crearGastoDesdeLiquidacion  (INT-003)
// ───────────────────────────────────────────────────────────
// Crea 1 gasto automático cuando se procesa una liquidación.
// Va a "Sueldos y Salarios" (bucket contable nominal) con
// origen "nomina_liquidacion" para diferenciación visual.
// ═══════════════════════════════════════════════════════════
export async function crearGastoDesdeLiquidacion({
  empresaId,
  liquidacionId,
  fechaTerminacion,
  empleadoNombre,
  razonTerminacion,
  montoTotal,
  registradoPor,
  registradoPorNombre,
}) {
  if (!empresaId || !liquidacionId || !fechaTerminacion) {
    return {
      success: false,
      error: 'Faltan datos requeridos (empresaId, liquidacionId, fechaTerminacion)',
    };
  }

  if (montoTotal == null || montoTotal <= 0) {
    return {
      success: false,
      error: 'montoTotal debe ser mayor a cero',
    };
  }

  if (!empleadoNombre) {
    return {
      success: false,
      error: 'empleadoNombre es requerido',
    };
  }

  const razonTexto = ETIQUETAS_RAZON_LIQUIDACION[razonTerminacion] || 'Liquidación laboral';
  const descripcion = `Liquidación: ${empleadoNombre} — ${razonTexto}`;

  const nuevoGasto = {
    empresa_id: empresaId,
    categoria_id: CATEGORIA_SUELDOS_ID,
    descripcion: descripcion,
    fecha: fechaTerminacion,
    subtotal: montoTotal,
    aplica_itbis: false,
    itbis: 0,
    total: montoTotal,
    forma_pago: 'efectivo',
    pagado: true,
    notas: `Generado automáticamente desde Calculadora de Liquidación. Razón: ${razonTexto}`,
    registrado_por: registradoPor || null,
    registrado_por_nombre: registradoPorNombre || 'Sistema',
    origen: ORIGEN.NOMINA_LIQUIDACION,
    referencia_id: liquidacionId,
  };

  const { data, error } = await supabase
    .from('gastos')
    .insert([nuevoGasto])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creando gasto desde liquidación:', error);
    return { success: false, error: error.message };
  }

  console.log('✅ Gasto automático creado desde liquidación:', data);
  return { success: true, gasto: data };
}

// ═══════════════════════════════════════════════════════════
// 🛒 crearGastoDesdeCompra  (INT-004) — FIX: sin fecha_pago
// ───────────────────────────────────────────────────────────
// Crea 1 gasto automático cuando se registra una compra
// (rápida o detallada). Mapea la categoría de compra a la
// categoría de gasto correspondiente.
// ═══════════════════════════════════════════════════════════
export async function crearGastoDesdeCompra({
  empresaId,
  compraId,
  fechaCompra,
  categoriaCompra,
  proveedorNombre,
  numeroFactura,
  ncf,
  conRNC,
  subtotal,
  itbis,
  total,
  aplicaItbis,
  pagada,
  fechaPago,
  metodoPago,
  registradoPor,
  registradoPorNombre,
}) {
  if (!empresaId || !compraId || !fechaCompra) {
    return {
      success: false,
      error: 'Faltan datos requeridos (empresaId, compraId, fechaCompra)',
    };
  }

  if (total == null || total <= 0) {
    return {
      success: false,
      error: 'total debe ser mayor a cero',
    };
  }

  // Mapear categoría de compra → categoría de gasto
  const categoriaGastoId = MAPEO_CATEGORIA_COMPRA[categoriaCompra] || CATEGORIA_OTROS_ID;
  const etiquetaCategoria = ETIQUETAS_CATEGORIA_COMPRA[categoriaCompra] || 'Otros';

  // Construir descripción inteligente
  let descripcion = `Compra ${etiquetaCategoria}`;
  if (proveedorNombre) {
    descripcion += ` — ${proveedorNombre}`;
  }
  if (numeroFactura) {
    descripcion += ` (Fact. ${numeroFactura})`;
  }

  // Construir notas con detalles
  const notasArr = [
    'Generado automáticamente desde módulo de Compras',
    `Categoría de compra: ${etiquetaCategoria}`,
  ];
  if (ncf) notasArr.push(`NCF: ${ncf}`);
  if (conRNC) notasArr.push('Compra con RNC (válida para 606)');
  if (pagada !== false && fechaPago && fechaPago !== fechaCompra) {
    notasArr.push(`Fecha de pago: ${fechaPago}`);
  }

  const nuevoGasto = {
    empresa_id: empresaId,
    categoria_id: categoriaGastoId,
    descripcion: descripcion,
    fecha: fechaCompra,
    subtotal: subtotal || total,
    aplica_itbis: aplicaItbis || false,
    itbis: itbis || 0,
    total: total,
    forma_pago: metodoPago || 'efectivo',
    pagado: pagada !== false,
    notas: notasArr.join(' · '),
    registrado_por: registradoPor || null,
    registrado_por_nombre: registradoPorNombre || 'Sistema',
    origen: ORIGEN.COMPRA_INVENTARIO,
    referencia_id: compraId,
  };

  const { data, error } = await supabase
    .from('gastos')
    .insert([nuevoGasto])
    .select()
    .single();

  if (error) {
    console.error('❌ Error creando gasto desde compra:', error);
    return { success: false, error: error.message };
  }

  console.log('✅ Gasto automático creado desde compra:', data);
  return { success: true, gasto: data };
}

// ═══════════════════════════════════════════════════════════
// 🔍 buscarGastosPorReferencia
// ═══════════════════════════════════════════════════════════
export async function buscarGastosPorReferencia(referenciaId) {
  if (!referenciaId) {
    return { success: false, error: 'referenciaId requerido', gastos: [] };
  }

  const { data, error } = await supabase
    .from('gastos')
    .select('*')
    .eq('referencia_id', referenciaId)
    .order('created_at', { ascending: true });

  if (error) {
    return { success: false, error: error.message, gastos: [] };
  }

  return { success: true, gastos: data || [] };
}

// ═══════════════════════════════════════════════════════════
// 🗑️ eliminarGastosPorReferencia
// ═══════════════════════════════════════════════════════════
export async function eliminarGastosPorReferencia(referenciaId) {
  if (!referenciaId) {
    return { success: false, error: 'referenciaId requerido' };
  }

  const { data, error } = await supabase
    .from('gastos')
    .delete()
    .eq('referencia_id', referenciaId)
    .select();

  if (error) {
    console.error('❌ Error eliminando gastos automáticos:', error);
    return { success: false, error: error.message };
  }

  console.log(`🗑️ ${data?.length || 0} gasto(s) automático(s) eliminado(s)`);
  return { success: true, eliminados: data?.length || 0 };
}