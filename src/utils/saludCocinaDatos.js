// src/utils/saludCocinaDatos.js
// Capa de datos de la Salud de la Cocina (SOLO LECTURA).
// Va a las tablas reales, recoge las "señales" y se las entrega
// al motor calcularSalud() de saludCocina.js. No escribe nada.

import { supabase } from '../supabaseClient'

export async function cargarSenalesSalud(empresaId) {
  const avisos = []
  const hoy0 = new Date(); hoy0.setHours(0, 0, 0, 0)
  const iso = (d) => d.toISOString().split('T')[0]
  const hace = (n) => { const d = new Date(hoy0); d.setDate(d.getDate() - n); return iso(d) }
  const diasDesde = (fecha) => {
    if (!fecha) return null
    const d = new Date(fecha); d.setHours(0, 0, 0, 0)
    return Math.round((hoy0 - d) / 86400000)
  }
  // días de clase esperados (lun–vie) en los últimos 14 días
  const diasClaseEsperadosUltimos14 = (() => {
    let c = 0
    for (let i = 0; i < 14; i++) {
      const d = new Date(hoy0); d.setDate(d.getDate() - i)
      const dow = d.getDay()
      if (dow >= 1 && dow <= 5) c++
    }
    return c
  })()

  // valores por defecto (si una fuente falla, queda neutro y se avisa)
  const s = {
    diasDesdeUltimoPesaje: null,
    diasDesdeUltimoDespacho: null,
    diasOperativosUltimos14: 0,
    diasClaseEsperadosUltimos14,
    diasDesdeUltimoGasto: null,
    comprasUltimoMes: 0,
    comprasConNcfUltimoMes: 0,
    reporteDgiiMesGenerado: null, // no hay tabla todavía → no medible
    empleadosConSueldo: 0,
    nominaUltimoPeriodoPagada: false,
    diasActivosUltimos7: 0,
    diasDesdeUltimaActividad: null,
    tieneEscuelas: false,
    tieneRecetas: false,
    ingredientesSinPrecio: 0,
    ingredientesTotal: 0,
  }

  // ── DESPACHOS Y PESAJE (despachos_componente) ──
  try {
    const { data, error } = await supabase
      .from('despachos_componente')
      .select('fecha, fue_pesado_real')
      .eq('empresa_id', empresaId)
      .gte('fecha', hace(30))
    if (error) throw error
    const rows = data || []
    const fechasDespacho = rows.map(r => r.fecha).filter(Boolean).sort()
    if (fechasDespacho.length) s.diasDesdeUltimoDespacho = diasDesde(fechasDespacho[fechasDespacho.length - 1])
    const fechasPesaje = rows.filter(r => r.fue_pesado_real).map(r => r.fecha).filter(Boolean).sort()
    if (fechasPesaje.length) s.diasDesdeUltimoPesaje = diasDesde(fechasPesaje[fechasPesaje.length - 1])
    const corte14 = hace(14)
    s.diasOperativosUltimos14 = new Set(rows.filter(r => r.fecha >= corte14).map(r => r.fecha)).size
  } catch (e) { avisos.push('despachos_componente: ' + (e?.message || 'sin acceso')) }

  // ── GASTOS ──
  try {
    const { data, error } = await supabase
      .from('gastos')
      .select('fecha')
      .eq('empresa_id', empresaId)
      .order('fecha', { ascending: false })
      .limit(1)
    if (error) throw error
    if (data?.[0]?.fecha) s.diasDesdeUltimoGasto = diasDesde(data[0].fecha)
  } catch (e) { avisos.push('gastos: ' + (e?.message || 'sin acceso')) }

  // ── COMPRAS (NCF del último mes) ──
  try {
    const { data, error } = await supabase
      .from('compras')
      .select('ncf')
      .eq('empresa_id', empresaId)
      .gte('fecha', hace(30))
    if (error) throw error
    const rows = data || []
    s.comprasUltimoMes = rows.length
    s.comprasConNcfUltimoMes = rows.filter(r => r.ncf && r.ncf.trim() !== '').length
  } catch (e) { avisos.push('compras: ' + (e?.message || 'sin acceso')) }

  // ── CONSTANCIA (historial_actividad) ──
  try {
    const { data, error } = await supabase
      .from('historial_actividad')
      .select('fecha_hora')
      .eq('empresa_id', empresaId)
      .gte('fecha_hora', hace(14))
      .order('fecha_hora', { ascending: false })
    if (error) throw error
    const rows = data || []
    if (rows[0]?.fecha_hora) s.diasDesdeUltimaActividad = diasDesde(rows[0].fecha_hora)
    const corte7 = hace(7)
    s.diasActivosUltimos7 = new Set(
      rows.filter(r => r.fecha_hora && r.fecha_hora.slice(0, 10) >= corte7)
          .map(r => r.fecha_hora.slice(0, 10))
    ).size
  } catch (e) { avisos.push('historial_actividad: ' + (e?.message || 'sin acceso')) }

  // ── EMPLEADOS CON SUELDO ──
  try {
    const { count, error } = await supabase
      .from('usuarios')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .neq('rol', 'propietario')
      .not('sueldo', 'is', null)
    if (error) throw error
    s.empleadosConSueldo = count || 0
  } catch (e) { avisos.push('usuarios: ' + (e?.message || 'sin acceso')) }

  // ── NÓMINA PAGADA RECIENTE ──
  try {
    const { data, error } = await supabase
      .from('pagos_nomina')
      .select('fecha_pago')
      .eq('empresa_id', empresaId)
      .eq('estado', 'pagado')
      .gte('fecha_pago', hace(35))
      .limit(1)
    if (error) throw error
    s.nominaUltimoPeriodoPagada = (data?.length || 0) > 0
  } catch (e) { avisos.push('pagos_nomina: ' + (e?.message || 'sin acceso')) }

  // ── ESCUELAS ──
  try {
    const { count, error } = await supabase
      .from('escuelas')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
    if (error) throw error
    s.tieneEscuelas = (count || 0) > 0
  } catch (e) { avisos.push('escuelas: ' + (e?.message || 'sin acceso')) }

  // ── RECETAS ──
  try {
    const { count, error } = await supabase
      .from('recetas')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
    if (error) throw error
    s.tieneRecetas = (count || 0) > 0
  } catch (e) { avisos.push('recetas: ' + (e?.message || 'sin acceso')) }

  // ── INGREDIENTES (precios completos) ──
  try {
    const { data, error } = await supabase
      .from('ingredientes')
      .select('precio_unitario')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
    if (error) throw error
    const rows = data || []
    s.ingredientesTotal = rows.length
    s.ingredientesSinPrecio = rows.filter(r => r.precio_unitario == null || Number(r.precio_unitario) <= 0).length
  } catch (e) { avisos.push('ingredientes: ' + (e?.message || 'sin acceso')) }

  s._avisos = avisos
  return s
}