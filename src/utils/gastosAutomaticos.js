// ═══════════════════════════════════════════════════════════
// 📌 gastosAutomaticos.js
// ───────────────────────────────────────────────────────────
// Helper para crear gastos automáticos desde otros módulos
// del ecosistema (Nómina, Bonificaciones, Compras, etc.)
//
// FILOSOFÍA:
// "Si me rompo el pie derecho, cojeo y camino con el izquierdo.
//  Una acción debe traer consecuencias en todo el ecosistema."
//
// Bloque 6D — INT-001: Pago Nómina → Gasto automático
// Bloque 6D — INT-002: Bonificación → Gasto automático
// ═══════════════════════════════════════════════════════════

import { supabase } from '../supabaseClient';

// ───────────────────────────────────────────────────────────
// 🔑 CONSTANTES — IDs de categorías de nómina
// (creadas en migración SQL del 25-mayo-2026)
// ───────────────────────────────────────────────────────────
export const CATEGORIA_SUELDOS_ID = '6061ddf7-9a4b-432c-9070-3aa509754e77';
export const CATEGORIA_APORTES_ID = 'dcdd8b77-4518-42f9-bd4a-76e0758aa2a4';

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
// 🏷️ ETIQUETAS DESCRIPTIVAS DE TIPOS DE BONO
// ───────────────────────────────────────────────────────────
const ETIQUETAS_TIPO_BONO = {
  navideño: 'Bono Navideño',
  cumpleaños: 'Bono de Cumpleaños',
  productividad: 'Bono de Productividad',
  reconocimiento: 'Bono de Reconocimiento',
  otro: 'Bonificación Extra',
};

// ═══════════════════════════════════════════════════════════
// 💰 crearGastosDesdeNomina  (INT-001)
// ───────────────────────────────────────────────────────────
// Crea 2 gastos automáticos cuando se paga una quincena:
//   1) Sueldos y Salarios (NETO pagado a empleados)
//   2) Aportes Patronales (TSS + AFP — costo del patrono)
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
  // ─── Validaciones básicas ───
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

  // ─── Construir los 2 gastos ───
  const gastosACrear = [];

  // Gasto 1: Sueldos y Salarios (NETO)
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

  // Gasto 2: Aportes Patronales (TSS + AFP)
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
// ───────────────────────────────────────────────────────────
// Crea 1 gasto automático cuando se registra una bonificación
// extra fuera del ciclo de quincena (Navidad, cumpleaños,
// productividad, reconocimiento, etc.)
//
// Va a la categoría "Sueldos y Salarios" porque contablemente
// es el mismo bucket, pero con origen "nomina_bonificacion"
// para trazabilidad y filtrado.
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
  // ─── Validaciones básicas ───
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

  // ─── Construir descripción legible ───
  const etiquetaTipo = ETIQUETAS_TIPO_BONO[tipo] || 'Bonificación Extra';
  const tituloLimpio = titulo?.trim() || etiquetaTipo;
  
  const cantidadTexto = cantidadEmpleados === 1 
    ? '1 empleado' 
    : `${cantidadEmpleados} empleados`;

  const descripcion = `${tituloLimpio} (${cantidadTexto})`;

  // ─── Insertar gasto ───
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
    pagado: true, // las bonificaciones se registran ya pagadas
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
// 🔍 buscarGastosPorReferencia
// ───────────────────────────────────────────────────────────
// Útil para mostrar "este pago/bono generó estos gastos"
// o para revertir/eliminar gastos cuando se anula.
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
// ───────────────────────────────────────────────────────────
// Para cuando se anula un pago/bono: borrar los gastos
// automáticos que se habían generado.
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