// src/utils/permisos.js
// Sistema de 3 niveles de permisos — Cocina PAE
// Decisión 15-may-2026

// 🛡️ NIVEL 1 — CONFIGURACIÓN
// CRUD escuelas, empleados, recetas, ingredientes, datos empresa
export const ROLES_CONFIGURACION = ['propietario', 'administrador']

// 🔒 NIVEL 2 — FINANCIERO  
// Facturas, gastos, compras, nómina, reportes DGII
export const ROLES_FINANCIERO = ['propietario', 'administrador', 'secretaria', 'contador']

// 🌍 NIVEL 3 — OPERATIVO
// VER recetas, VER ingredientes, VER stock, HACER pesajes, USAR modo despacho
// Todos los empleados tienen acceso

/**
 * ¿Puede acceder a configuración del sistema?
 * (escuelas, empleados, recetas, ingredientes)
 */
export function puedeConfigurar(rol) {
  return ROLES_CONFIGURACION.includes(rol)
}

/**
 * ¿Puede ver/manejar finanzas?
 * (facturas, gastos, compras, nómina)
 */
export function puedeVerFinanzas(rol) {
  return ROLES_FINANCIERO.includes(rol)
}

/**
 * ¿Puede ver operaciones del día?
 * (catálogo recetas, pesajes, despacho)
 * Todos los empleados pueden.
 */
export function puedeVerOperaciones(rol) {
  return true
}

/**
 * Etiqueta visual del rol para mostrar en UI
 */
export function etiquetaRol(rol) {
  const etiquetas = {
    propietario: '👑 Propietario',
    administrador: '🛡️ Administrador',
    contador: '📊 Contador',
    secretaria: '🌸 Secretaria',
    jefa_cocina: '🍳 Jefa de Cocina',
    ayudante: '👥 Ayudante',
    despachador: '🚚 Despachador'
  }
  return etiquetas[rol] || rol
}