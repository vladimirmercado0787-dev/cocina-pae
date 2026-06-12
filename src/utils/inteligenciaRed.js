// src/utils/inteligenciaRed.js
// Capa de datos del Laboratorio · Inteligencia de la Red (SOLO LECTURA).
// Llama a las funciones SQL maestras (con clave de mando) que pasan
// por encima del RLS y devuelven el análisis ya masticado.

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