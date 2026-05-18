// src/utils/historial.js
// Helper reutilizable para registrar TODO lo que pasa en la app
// Filosofía: una sola línea por acción → queda registrada

import { supabase } from '../supabaseClient'

/**
 * Registra una actividad en el historial
 * 
 * @param {Object} params
 * @param {string} params.empresaId - UUID de la empresa
 * @param {Object} params.usuario - { id, nombre, rol }
 * @param {string} params.categoria - 'operativa' | 'sensible' | 'critica' | 'sistema'
 * @param {string} params.tipoAccion - identificador único (ej: 'pesaje_crudo_aprobado')
 * @param {string} params.descripcion - texto amigable (ej: "Aprobó pesaje crudo de 1230 raciones")
 * @param {string} [params.entidad] - tipo de entidad afectada (ej: 'pesaje_cocido', 'empleado')
 * @param {string} [params.entidadId] - UUID del registro afectado
 * @param {Object} [params.cambiosAntes] - estado previo (solo en ediciones)
 * @param {Object} [params.cambiosDespues] - estado nuevo (solo en ediciones)
 * @param {Object} [params.detallesExtra] - contexto adicional
 */
export async function registrarActividad({
  empresaId,
  usuario,
  categoria,
  tipoAccion,
  descripcion,
  entidad = null,
  entidadId = null,
  cambiosAntes = null,
  cambiosDespues = null,
  detallesExtra = null,
}) {
  try {
    // Validación mínima — no queremos romper la app si falla el historial
    if (!empresaId || !usuario?.id || !categoria || !tipoAccion || !descripcion) {
      console.warn('[Historial] Falta data para registrar actividad:', { empresaId, usuario, categoria, tipoAccion })
      return null
    }

    const registro = {
      empresa_id: empresaId,
      user_id: usuario.id,
      user_nombre: usuario.nombre || 'Desconocido',
      user_rol: usuario.rol || 'sin_rol',
      categoria,
      tipo_accion: tipoAccion,
      descripcion,
      entidad,
      entidad_id: entidadId,
      cambios_antes: cambiosAntes,
      cambios_despues: cambiosDespues,
      detalles_extra: detallesExtra,
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      // ip_address: lo dejamos null en cliente, se puede llenar desde edge function futura
    }

    const { error } = await supabase
      .from('historial_actividad')
      .insert([registro])

    if (error) {
      // NO lanzar error — el historial NUNCA debe romper la operación principal
      console.error('[Historial] Error guardando registro:', error)
      return null
    }

    return true
  } catch (err) {
    console.error('[Historial] Excepción guardando registro:', err)
    return null
  }
}

/**
 * Catálogo de tipos de acción
 * Centralizado aquí para evitar typos y mantener consistencia
 */
export const TIPOS_ACCION = {
  // ─── OPERATIVAS (día a día) ─────────────────────────────────
  PESAJE_CRUDO_APROBADO: 'pesaje_crudo_aprobado',
  PESAJE_CRUDO_EDITADO: 'pesaje_crudo_editado',
  PESAJE_COCIDO_APROBADO: 'pesaje_cocido_aprobado',
  PESAJE_COCIDO_EDITADO: 'pesaje_cocido_editado',
  PESAJE_SOBRANTE_APROBADO: 'pesaje_sobrante_aprobado',
  PESAJE_SOBRANTE_EDITADO: 'pesaje_sobrante_editado',
  ESCUELA_INICIADA: 'escuela_iniciada',
  ESCUELA_SIN_CLASE: 'escuela_sin_clase',
  ESCUELA_LISTA: 'escuela_lista',
  ESCUELA_DESPACHADA: 'escuela_despachada',
  ESCUELA_ENTREGADA: 'escuela_entregada',
  CONDUCE_FIRMADO: 'conduce_firmado',
  DIA_CERRADO: 'dia_cerrado',
  
  // ─── SENSIBLES (cambios administrativos) ────────────────────
  EMPLEADO_CREADO: 'empleado_creado',
  EMPLEADO_EDITADO: 'empleado_editado',
  EMPLEADO_ELIMINADO: 'empleado_eliminado',
  ESCUELA_CREADA: 'escuela_creada',
  ESCUELA_EDITADA: 'escuela_editada',
  ESCUELA_DESACTIVADA: 'escuela_desactivada',
  RECETA_CREADA: 'receta_creada',
  RECETA_EDITADA: 'receta_editada',
  INGREDIENTE_CREADO: 'ingrediente_creado',
  INGREDIENTE_EDITADO: 'ingrediente_editado',
  PRECIO_INGREDIENTE_CAMBIADO: 'precio_ingrediente_cambiado',
  COMPONENTE_CREADO: 'componente_creado',
  COMPONENTE_EDITADO: 'componente_editado',
  CONFIG_EMPRESA_EDITADA: 'config_empresa_editada',
  PERMISOS_CAMBIADOS: 'permisos_cambiados',
  GASTO_REGISTRADO: 'gasto_registrado',
  GASTO_EDITADO: 'gasto_editado',
  GASTO_ELIMINADO: 'gasto_eliminado',
  PROVEEDOR_CREADO: 'proveedor_creado',
  PROVEEDOR_EDITADO: 'proveedor_editado',
  STOCK_AJUSTADO: 'stock_ajustado',
  
  // ─── CRÍTICAS (auditables — financiero) ─────────────────────
  FACTURA_GENERADA: 'factura_generada',
  FACTURA_ANULADA: 'factura_anulada',
  NCF_ASIGNADO: 'ncf_asignado',
  PAGO_NOMINA_REGISTRADO: 'pago_nomina_registrado',
  PAGO_NOMINA_EDITADO: 'pago_nomina_editado',
  
  // ─── SISTEMA (autenticación) ────────────────────────────────
  LOGIN: 'login',
  LOGOUT: 'logout',
  CAMBIO_PASSWORD: 'cambio_password',
  CAMBIO_USUARIO: 'cambio_usuario',
}

/**
 * Mapeo de tipo_accion → categoría
 * Útil para asignar la categoría automáticamente
 */
export const CATEGORIA_POR_TIPO = {
  [TIPOS_ACCION.PESAJE_CRUDO_APROBADO]: 'operativa',
  [TIPOS_ACCION.PESAJE_CRUDO_EDITADO]: 'operativa',
  [TIPOS_ACCION.PESAJE_COCIDO_APROBADO]: 'operativa',
  [TIPOS_ACCION.PESAJE_COCIDO_EDITADO]: 'operativa',
  [TIPOS_ACCION.PESAJE_SOBRANTE_APROBADO]: 'operativa',
  [TIPOS_ACCION.PESAJE_SOBRANTE_EDITADO]: 'operativa',
  [TIPOS_ACCION.ESCUELA_INICIADA]: 'operativa',
  [TIPOS_ACCION.ESCUELA_SIN_CLASE]: 'operativa',
  [TIPOS_ACCION.ESCUELA_LISTA]: 'operativa',
  [TIPOS_ACCION.ESCUELA_DESPACHADA]: 'operativa',
  [TIPOS_ACCION.ESCUELA_ENTREGADA]: 'operativa',
  [TIPOS_ACCION.CONDUCE_FIRMADO]: 'operativa',
  [TIPOS_ACCION.DIA_CERRADO]: 'operativa',
  
  [TIPOS_ACCION.EMPLEADO_CREADO]: 'sensible',
  [TIPOS_ACCION.EMPLEADO_EDITADO]: 'sensible',
  [TIPOS_ACCION.EMPLEADO_ELIMINADO]: 'sensible',
  [TIPOS_ACCION.ESCUELA_CREADA]: 'sensible',
  [TIPOS_ACCION.ESCUELA_EDITADA]: 'sensible',
  [TIPOS_ACCION.ESCUELA_DESACTIVADA]: 'sensible',
  [TIPOS_ACCION.RECETA_CREADA]: 'sensible',
  [TIPOS_ACCION.RECETA_EDITADA]: 'sensible',
  [TIPOS_ACCION.INGREDIENTE_CREADO]: 'sensible',
  [TIPOS_ACCION.INGREDIENTE_EDITADO]: 'sensible',
  [TIPOS_ACCION.PRECIO_INGREDIENTE_CAMBIADO]: 'sensible',
  [TIPOS_ACCION.COMPONENTE_CREADO]: 'sensible',
  [TIPOS_ACCION.COMPONENTE_EDITADO]: 'sensible',
  [TIPOS_ACCION.CONFIG_EMPRESA_EDITADA]: 'sensible',
  [TIPOS_ACCION.PERMISOS_CAMBIADOS]: 'sensible',
  [TIPOS_ACCION.GASTO_REGISTRADO]: 'sensible',
  [TIPOS_ACCION.GASTO_EDITADO]: 'sensible',
  [TIPOS_ACCION.GASTO_ELIMINADO]: 'sensible',
  [TIPOS_ACCION.PROVEEDOR_CREADO]: 'sensible',
  [TIPOS_ACCION.PROVEEDOR_EDITADO]: 'sensible',
  [TIPOS_ACCION.STOCK_AJUSTADO]: 'sensible',
  
  [TIPOS_ACCION.FACTURA_GENERADA]: 'critica',
  [TIPOS_ACCION.FACTURA_ANULADA]: 'critica',
  [TIPOS_ACCION.NCF_ASIGNADO]: 'critica',
  [TIPOS_ACCION.PAGO_NOMINA_REGISTRADO]: 'critica',
  [TIPOS_ACCION.PAGO_NOMINA_EDITADO]: 'critica',
  
  [TIPOS_ACCION.LOGIN]: 'sistema',
  [TIPOS_ACCION.LOGOUT]: 'sistema',
  [TIPOS_ACCION.CAMBIO_PASSWORD]: 'sistema',
  [TIPOS_ACCION.CAMBIO_USUARIO]: 'sistema',
}

/**
 * Helper rápido que detecta la categoría automáticamente
 * Solo necesitas pasar el tipoAccion y deduce la categoría
 */
export async function registrar({
  empresaId,
  usuario,
  tipoAccion,
  descripcion,
  entidad = null,
  entidadId = null,
  cambiosAntes = null,
  cambiosDespues = null,
  detallesExtra = null,
}) {
  const categoria = CATEGORIA_POR_TIPO[tipoAccion] || 'operativa'
  
  return registrarActividad({
    empresaId,
    usuario,
    categoria,
    tipoAccion,
    descripcion,
    entidad,
    entidadId,
    cambiosAntes,
    cambiosDespues,
    detallesExtra,
  })
}