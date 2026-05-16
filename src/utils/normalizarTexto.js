// src/utils/normalizarTexto.js
// Sistema anti-duplicado de 3 capas — Cocina PAE
// Decisión 13-mayo-2026
//
// Estandariza nombres de ingredientes, categorías, etc:
// - Trim espacios al inicio/fin
// - Colapsa espacios múltiples a uno solo
// - Convierte a Title Case (primera letra de cada palabra mayúscula)
//
// Funciones:
// - normalizarNombre(texto): devuelve nombre limpio en Title Case
// - sonIguales(nombre1, nombre2): compara dos nombres ignorando case, espacios y acentos
// - quitarAcentos(texto): helper interno para comparación insensible a tildes

/**
 * Quita acentos/tildes de un texto.
 * "Habichuelas" → "Habichuelas"
 * "Mañana" → "Manana"
 * "Café" → "Cafe"
 */
function quitarAcentos(texto) {
  if (!texto) return ''
  return texto
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

/**
 * Normaliza un nombre para guardarlo en BD:
 * - Trim espacios al inicio/fin
 * - Colapsa espacios múltiples a uno solo
 * - Title Case (primera letra de cada palabra en mayúscula)
 *
 * Ejemplos:
 *   "  habichuelas   rojas  " → "Habichuelas Rojas"
 *   "ACEITE de oliva"         → "Aceite De Oliva"
 *   "arroz"                   → "Arroz"
 *   ""                        → ""
 */
export function normalizarNombre(texto) {
  if (!texto || typeof texto !== 'string') return ''

  // Trim + colapsar espacios múltiples
  const limpio = texto.trim().replace(/\s+/g, ' ')

  if (!limpio) return ''

  // Title Case: cada palabra con primera letra mayúscula
  return limpio
    .toLowerCase()
    .split(' ')
    .map(palabra => {
      if (palabra.length === 0) return ''
      return palabra.charAt(0).toUpperCase() + palabra.slice(1)
    })
    .join(' ')
}

/**
 * Compara dos nombres para detectar duplicados.
 * Ignora:
 *   - Diferencias de mayúscula/minúscula
 *   - Espacios extras
 *   - Acentos/tildes
 *
 * Ejemplos:
 *   sonIguales("Habichuelas", "  habichuelas  ")  → true
 *   sonIguales("Café", "cafe")                    → true
 *   sonIguales("Arroz", "Maíz")                   → false
 *   sonIguales("", "Arroz")                       → false
 */
export function sonIguales(nombre1, nombre2) {
  if (!nombre1 || !nombre2) return false

  const norm1 = quitarAcentos(normalizarNombre(nombre1)).toLowerCase()
  const norm2 = quitarAcentos(normalizarNombre(nombre2)).toLowerCase()

  if (!norm1 || !norm2) return false

  return norm1 === norm2
}