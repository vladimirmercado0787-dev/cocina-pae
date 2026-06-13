// src/utils/inteligenciaRed.js
// Capa de datos del Laboratorio · Inteligencia de la Red (SOLO LECTURA).

import { supabase } from '../supabaseClient'

// Resumen nacional (o por provincia si se pasa una).
export async function cargarResumenRed(empresaIdAdmin, claveMando, provincia = null) {
  const { data, error } = await supabase.rpc('inteligencia_resumen', {
    p_empresa_id_admin: empresaIdAdmin,
    p_clave: claveMando,
    p_provincia: provincia,
  })

  if (error) {
    return { resumen: null, error: error.message }
  }

  const r = (data && data[0]) || {}
  const pesados = Number(r.despachos_pesados || 0)
  const totales = Number(r.despachos_totales || 0)

  return {
    resumen: {
      totalEventos: Number(r.total_eventos || 0),
      totalRaciones: Number(r.total_raciones || 0),
      totalEscuelas: Number(r.total_escuelas || 0),
      totalCocinas: Number(r.total_cocinas || 0),
      despachosPesados: pesados,
      despachosTotales: totales,
      porcentajePesaje: totales > 0 ? Math.round((pesados / totales) * 100) : 0,
      sobranteTotal: Number(r.sobrante_total || 0),
    },
    error: null,
  }
}

// Datos agrupados por provincia (para el mapa).
// Devuelve un objeto { "Valverde": {...}, "Santiago": {...} } indexado por nombre de provincia.
export async function cargarPorProvincia(empresaIdAdmin, claveMando) {
  const { data, error } = await supabase.rpc('inteligencia_por_provincia', {
    p_empresa_id_admin: empresaIdAdmin,
    p_clave: claveMando,
  })

  if (error) {
    return { porProvincia: {}, error: error.message }
  }

  const porProvincia = {}
  for (const r of data || []) {
    porProvincia[r.provincia] = {
      raciones: Number(r.total_raciones || 0),
      escuelas: Number(r.total_escuelas || 0),
      cocinas: Number(r.total_cocinas || 0),
      despachosPesados: Number(r.despachos_pesados || 0),
      despachosTotales: Number(r.despachos_totales || 0),
      pctPesaje: Number(r.pct_pesaje || 0),
      sobrante: Number(r.sobrante_total || 0),
    }
  }

  return { porProvincia, error: null }
}