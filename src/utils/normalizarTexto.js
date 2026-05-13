/**
 * Normaliza un nombre para almacenamiento consistente.
 * - Quita espacios al inicio/final
 * - Colapsa espacios múltiples a uno solo
 * - Aplica Title Case (Primera Letra Mayúscula)
 * 
 * Ejemplos:
 *   "arroz blanco"      → "Arroz Blanco"
 *   "  POLLO  "         → "Pollo"
 *   "aceite vegetal"    → "Aceite Vegetal"
 *   "cebolla   morada"  → "Cebolla Morada"
 */
export function normalizarNombre(texto) {
  if (!texto) return ''
  
  return texto
    .trim()                              // Quita espacios al inicio/final
    .replace(/\s+/g, ' ')                // Colapsa espacios múltiples
    .toLowerCase()                       // Todo minúscula primero
    .split(' ')                          // Divide en palabras
    .map(palabra => 
      palabra.charAt(0).toUpperCase() + palabra.slice(1)
    )                                    // Capitaliza cada palabra
    .join(' ')                           // Une de nuevo
}

/**
 * Compara dos nombres ignorando mayúsculas y espacios.
 * Útil para detectar duplicados similares.
 * 
 * Ejemplos:
 *   sonIguales("arroz blanco", "Arroz Blanco")    → true
 *   sonIguales("POLLO", " pollo ")                → true
 *   sonIguales("Arroz", "Arroz Blanco")           → false
 */
export function sonIguales(textoA, textoB) {
  if (!textoA || !textoB) return false
  return normalizarNombre(textoA).toLowerCase() === normalizarNombre(textoB).toLowerCase()
}

/**
 * Busca nombres similares en una lista.
 * Devuelve el array de items cuyos nombres son IGUALES (ignorando mayúsculas/espacios).
 */
export function encontrarSimilares(textoBuscar, lista, campoNombre = 'nombre') {
  if (!textoBuscar || !lista) return []
  const normalizado = normalizarNombre(textoBuscar).toLowerCase()
  return lista.filter(item => 
    normalizarNombre(item[campoNombre] || '').toLowerCase() === normalizado
  )
}