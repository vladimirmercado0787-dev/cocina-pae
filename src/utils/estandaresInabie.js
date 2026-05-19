// src/utils/estandaresInabie.js
// ════════════════════════════════════════════════════
// 📐 ESTÁNDARES INABIE DE CONSUMO POR RACIÓN
// ════════════════════════════════════════════════════

export const ESTANDARES_INABIE = {
  // CEREALES Y GRANOS
  'Arroz Blanco': { cantidad: 50, unidad: 'g', categoria: 'cereales' },
  'Arroz': { cantidad: 50, unidad: 'g', categoria: 'cereales' },
  'Avena': { cantidad: 35, unidad: 'g', categoria: 'cereales' },
  'Harina de Maíz': { cantidad: 40, unidad: 'g', categoria: 'cereales' },
  'Harina de Trigo': { cantidad: 40, unidad: 'g', categoria: 'cereales' },
  'Pasta': { cantidad: 60, unidad: 'g', categoria: 'cereales' },
  'Espagueti': { cantidad: 60, unidad: 'g', categoria: 'cereales' },
  'Macarrones': { cantidad: 60, unidad: 'g', categoria: 'cereales' },
  'Maíz': { cantidad: 40, unidad: 'g', categoria: 'cereales' },

  // LEGUMBRES
  'Habichuelas Rojas': { cantidad: 60, unidad: 'g', categoria: 'legumbres' },
  'Habichuelas Negras': { cantidad: 60, unidad: 'g', categoria: 'legumbres' },
  'Habichuelas Blancas': { cantidad: 60, unidad: 'g', categoria: 'legumbres' },
  'Habichuelas': { cantidad: 60, unidad: 'g', categoria: 'legumbres' },
  'Lentejas': { cantidad: 55, unidad: 'g', categoria: 'legumbres' },
  'Garbanzos': { cantidad: 55, unidad: 'g', categoria: 'legumbres' },
  'Guandules': { cantidad: 60, unidad: 'g', categoria: 'legumbres' },
  'Gandules': { cantidad: 60, unidad: 'g', categoria: 'legumbres' },
  'Arvejas': { cantidad: 55, unidad: 'g', categoria: 'legumbres' },

  // PROTEÍNAS ANIMALES
  'Pollo': { cantidad: 50, unidad: 'g', categoria: 'proteina' },
  'Muslo de Pollo': { cantidad: 60, unidad: 'g', categoria: 'proteina' },
  'Pollo (Muslo con Hueso)': { cantidad: 60, unidad: 'g', categoria: 'proteina' },
  'Pechuga de Pollo': { cantidad: 50, unidad: 'g', categoria: 'proteina' },
  'Carne': { cantidad: 45, unidad: 'g', categoria: 'proteina' },
  'Carne de Res': { cantidad: 45, unidad: 'g', categoria: 'proteina' },
  'Carne de Res Molida': { cantidad: 45, unidad: 'g', categoria: 'proteina' },
  'Carne Molida': { cantidad: 45, unidad: 'g', categoria: 'proteina' },
  'Carne de Cerdo': { cantidad: 45, unidad: 'g', categoria: 'proteina' },
  'Cerdo': { cantidad: 45, unidad: 'g', categoria: 'proteina' },
  'Pescado': { cantidad: 55, unidad: 'g', categoria: 'proteina' },
  'Atún': { cantidad: 40, unidad: 'g', categoria: 'proteina' },
  'Sardinas Enlatadas': { cantidad: 40, unidad: 'g', categoria: 'proteina' },
  'Sardinas': { cantidad: 40, unidad: 'g', categoria: 'proteina' },
  'Salami': { cantidad: 30, unidad: 'g', categoria: 'proteina' },
  'Huevos': { cantidad: 1, unidad: 'unidad', categoria: 'proteina' },
  'Huevo': { cantidad: 1, unidad: 'unidad', categoria: 'proteina' },
  'Queso': { cantidad: 25, unidad: 'g', categoria: 'proteina' },

  // VEGETALES Y VERDURAS
  'Cebolla': { cantidad: 12, unidad: 'g', categoria: 'vegetal' },
  'Ajo': { cantidad: 3, unidad: 'g', categoria: 'vegetal' },
  'Ají Cubanela': { cantidad: 8, unidad: 'g', categoria: 'vegetal' },
  'Ají': { cantidad: 8, unidad: 'g', categoria: 'vegetal' },
  'Pimiento': { cantidad: 10, unidad: 'g', categoria: 'vegetal' },
  'Tomate': { cantidad: 20, unidad: 'g', categoria: 'vegetal' },
  'Lechuga': { cantidad: 20, unidad: 'g', categoria: 'vegetal' },
  'Repollo': { cantidad: 25, unidad: 'g', categoria: 'vegetal' },
  'Zanahoria': { cantidad: 30, unidad: 'g', categoria: 'vegetal' },
  'Auyama': { cantidad: 30, unidad: 'g', categoria: 'vegetal' },
  'Vainita': { cantidad: 45, unidad: 'g', categoria: 'vegetal' },
  'Berenjena': { cantidad: 35, unidad: 'g', categoria: 'vegetal' },
  'Calabacín': { cantidad: 35, unidad: 'g', categoria: 'vegetal' },
  'Pepino': { cantidad: 25, unidad: 'g', categoria: 'vegetal' },
  'Apio': { cantidad: 5, unidad: 'g', categoria: 'vegetal' },
  'Cilantro': { cantidad: 3, unidad: 'g', categoria: 'vegetal' },
  'Perejil': { cantidad: 2, unidad: 'g', categoria: 'vegetal' },
  'Cilantrico': { cantidad: 3, unidad: 'g', categoria: 'vegetal' },
  'Aguacate': { cantidad: 30, unidad: 'g', categoria: 'vegetal' },

  // VIVERES Y TUBÉRCULOS
  'Yuca': { cantidad: 80, unidad: 'g', categoria: 'viveres' },
  'Plátano': { cantidad: 80, unidad: 'g', categoria: 'viveres' },
  'Plátano Verde': { cantidad: 80, unidad: 'g', categoria: 'viveres' },
  'Plátano Maduro': { cantidad: 80, unidad: 'g', categoria: 'viveres' },
  'Papa': { cantidad: 70, unidad: 'g', categoria: 'viveres' },
  'Batata': { cantidad: 70, unidad: 'g', categoria: 'viveres' },
  'Ñame': { cantidad: 70, unidad: 'g', categoria: 'viveres' },
  'Yautía': { cantidad: 70, unidad: 'g', categoria: 'viveres' },

  // GRASAS Y ACEITES
  'Aceite Vegetal': { cantidad: 5, unidad: 'g', categoria: 'grasas' },
  'Aceite': { cantidad: 5, unidad: 'g', categoria: 'grasas' },
  'Aceite de Oliva': { cantidad: 4, unidad: 'g', categoria: 'grasas' },
  'Mantequilla': { cantidad: 5, unidad: 'g', categoria: 'grasas' },
  'Margarina': { cantidad: 5, unidad: 'g', categoria: 'grasas' },

  // CONDIMENTOS Y SAZONES
  'Sal': { cantidad: 3, unidad: 'g', categoria: 'condimentos' },
  'Sazón Completo': { cantidad: 4, unidad: 'g', categoria: 'condimentos' },
  'Sazón': { cantidad: 4, unidad: 'g', categoria: 'condimentos' },
  'Orégano': { cantidad: 1, unidad: 'g', categoria: 'condimentos' },
  'Pimienta': { cantidad: 0.5, unidad: 'g', categoria: 'condimentos' },
  'Comino': { cantidad: 0.5, unidad: 'g', categoria: 'condimentos' },
  'Vinagre': { cantidad: 3, unidad: 'g', categoria: 'condimentos' },
  'Salsa de Tomate': { cantidad: 10, unidad: 'g', categoria: 'condimentos' },
  'Salsa Inglesa': { cantidad: 2, unidad: 'g', categoria: 'condimentos' },
  'Adobo': { cantidad: 4, unidad: 'g', categoria: 'condimentos' },

  // LÁCTEOS
  'Leche': { cantidad: 200, unidad: 'ml', categoria: 'lacteos' },
  'Leche en Polvo': { cantidad: 25, unidad: 'g', categoria: 'lacteos' },
  'Yogurt': { cantidad: 100, unidad: 'g', categoria: 'lacteos' },

  // FRUTAS
  'Guineo': { cantidad: 1, unidad: 'unidad', categoria: 'frutas' },
  'Plátano de Comer': { cantidad: 1, unidad: 'unidad', categoria: 'frutas' },
  'Naranja': { cantidad: 1, unidad: 'unidad', categoria: 'frutas' },
  'Limón': { cantidad: 0.5, unidad: 'unidad', categoria: 'frutas' },
  'Manzana': { cantidad: 1, unidad: 'unidad', categoria: 'frutas' },

  // PANIFICADOS
  'Pan': { cantidad: 1, unidad: 'unidad', categoria: 'panificados' },
  'Galletas': { cantidad: 30, unidad: 'g', categoria: 'panificados' },

  // ENDULZANTES
  'Azúcar': { cantidad: 15, unidad: 'g', categoria: 'endulzantes' },
  'Sirope': { cantidad: 10, unidad: 'g', categoria: 'endulzantes' },

  // OTROS
  'Agua': { cantidad: 200, unidad: 'ml', categoria: 'otros' }
}

// ════════════════════════════════════════════════════
// 🔢 CONVERSIONES Y PESOS TÍPICOS
// ════════════════════════════════════════════════════

export const CONVERSIONES = {
  GRAMOS_POR_LIBRA: 453.592,
  ONZAS_POR_LIBRA: 16,
  GRAMOS_POR_ONZA: 28.3495,
  ML_POR_GALON: 3785.41,
  ML_POR_LITRO: 1000,
  GRAMOS_POR_KILO: 1000
}

/**
 * Peso típico de productos vendidos por "unidad".
 * Permite convertir desde gramos a unidades estimadas.
 */
export const PESO_TIPICO_POR_UNIDAD = {
  // FRUTAS Y VEGETALES (gramos por unidad)
  'Plátano Verde': 200,
  'Plátano': 200,
  'Plátano Maduro': 200,
  'Plátano de Comer': 150,
  'Aguacate': 250,
  'Guineo': 120,
  'Naranja': 150,
  'Limón': 60,
  'Manzana': 180,
  
  // PANIFICADOS
  'Pan': 80,
  
  // HUEVOS (caso especial - se cuenta como unidad real)
  'Huevos': null, // null = no convertir, usar directamente como unidad
  'Huevo': null
}

/**
 * Busca el peso típico de un ingrediente vendido por unidad.
 */
function buscarPesoTipico(nombreIngrediente) {
  if (!nombreIngrediente) return null
  
  const nombreLower = nombreIngrediente.trim().toLowerCase()
  const claves = Object.keys(PESO_TIPICO_POR_UNIDAD)
  
  const match = claves.find(k => {
    const kLower = k.toLowerCase()
    return nombreLower === kLower || 
           nombreLower.includes(kLower) || 
           kLower.includes(nombreLower)
  })
  
  return match !== undefined ? PESO_TIPICO_POR_UNIDAD[match] : undefined
}

// ════════════════════════════════════════════════════
// 🔍 BÚSQUEDA EN CATÁLOGO
// ════════════════════════════════════════════════════

/**
 * Busca un ingrediente en el catálogo INABIE de forma flexible.
 */
export function buscarEstandarInabie(nombreIngrediente) {
  if (!nombreIngrediente) return null
  
  const nombreNormalizado = nombreIngrediente.trim().toLowerCase()
  const claves = Object.keys(ESTANDARES_INABIE)
  
  // 1. Match exacto case-insensitive
  let match = claves.find(k => k.toLowerCase() === nombreNormalizado)
  if (match) return ESTANDARES_INABIE[match]
  
  // 2. Match donde uno contiene al otro
  match = claves.find(k => {
    const claveLower = k.toLowerCase()
    return nombreNormalizado.includes(claveLower) || claveLower.includes(nombreNormalizado)
  })
  if (match) return ESTANDARES_INABIE[match]
  
  // 3. Match por palabras significativas (>3 caracteres)
  const palabrasIngrediente = nombreNormalizado.split(' ').filter(p => p.length > 3)
  if (palabrasIngrediente.length > 0) {
    match = claves.find(k => {
      const palabrasClave = k.toLowerCase().split(' ')
      return palabrasIngrediente.some(p => 
        palabrasClave.some(c => c.includes(p) || p.includes(c))
      )
    })
    if (match) return ESTANDARES_INABIE[match]
  }
  
  return null
}

// ════════════════════════════════════════════════════
// 🧮 CÁLCULO INTELIGENTE DE CONSUMO SEMANAL
// ════════════════════════════════════════════════════

/**
 * Calcula consumo semanal estimado según estándar INABIE,
 * convirtiendo CORRECTAMENTE según la unidad de stock del ingrediente.
 * 
 * @param {string} nombreIngrediente - Nombre del ingrediente
 * @param {number} raciones - Raciones diarias totales
 * @param {number} diasUso - Días que se cocina por semana (default 5)
 * @param {string} unidadDestino - Unidad del stock ('lb', 'kg', 'oz', 'gal', 'litro', 'unidad', etc.)
 * @returns {number} Consumo semanal en la unidad destino
 */
export function calcularConsumoSemanalInabie(
  nombreIngrediente,
  raciones,
  diasUso = 5,
  unidadDestino = 'lb'
) {
  const estandar = buscarEstandarInabie(nombreIngrediente)
  if (!estandar) return 0
  
  // Total semanal en la unidad ORIGINAL del estándar (g, ml, unidad)
  const consumoSemanalOrigen = estandar.cantidad * raciones * diasUso
  
  // ─────────────────────────────────────────────────
  // CASO 1: Estándar en UNIDADES (huevos, panes, etc.)
  // ─────────────────────────────────────────────────
  if (estandar.unidad === 'unidad') {
    // Si el stock también es unidad, devolver directo
    if (unidadDestino === 'unidad') return consumoSemanalOrigen
    
    // Si el stock es libras, intentar convertir con peso típico
    const pesoTipico = buscarPesoTipico(nombreIngrediente)
    if (pesoTipico && unidadDestino === 'lb') {
      const gramosTotales = consumoSemanalOrigen * pesoTipico
      return gramosTotales / CONVERSIONES.GRAMOS_POR_LIBRA
    }
    
    return consumoSemanalOrigen // fallback
  }
  
  // ─────────────────────────────────────────────────
  // CASO 2: Estándar en GRAMOS
  // ─────────────────────────────────────────────────
  if (estandar.unidad === 'g') {
    const gramosTotales = consumoSemanalOrigen
    
    // Si el stock es UNIDADES, convertir gramos → unidades con peso típico
    if (unidadDestino === 'unidad') {
      const pesoTipico = buscarPesoTipico(nombreIngrediente)
      if (pesoTipico) {
        return gramosTotales / pesoTipico
      }
      // Si no hay peso típico conocido, usar 100g por defecto (estimado)
      return gramosTotales / 100
    }
    
    // Conversiones estándar de gramos
    if (unidadDestino === 'lb' || unidadDestino === 'libra') {
      return gramosTotales / CONVERSIONES.GRAMOS_POR_LIBRA
    }
    if (unidadDestino === 'kg') {
      return gramosTotales / CONVERSIONES.GRAMOS_POR_KILO
    }
    if (unidadDestino === 'oz') {
      return gramosTotales / CONVERSIONES.GRAMOS_POR_ONZA
    }
    
    return gramosTotales // fallback en gramos
  }
  
  // ─────────────────────────────────────────────────
  // CASO 3: Estándar en ML (agua, leche, líquidos)
  // ─────────────────────────────────────────────────
  if (estandar.unidad === 'ml') {
    const mlTotales = consumoSemanalOrigen
    
    if (unidadDestino === 'gal' || unidadDestino === 'galon') {
      return mlTotales / CONVERSIONES.ML_POR_GALON
    }
    if (unidadDestino === 'litro' || unidadDestino === 'l') {
      return mlTotales / CONVERSIONES.ML_POR_LITRO
    }
    if (unidadDestino === 'oz') {
      // 1 oz líquida ≈ 29.5735 ml
      return mlTotales / 29.5735
    }
    if (unidadDestino === 'lb') {
      // Aproximar densidad ≈ agua (1 ml = 1 g)
      return mlTotales / CONVERSIONES.GRAMOS_POR_LIBRA
    }
    
    return mlTotales
  }
  
  return 0
}

/**
 * Lista todos los ingredientes del catálogo.
 */
export function listarIngredientesCatalogo() {
  return Object.entries(ESTANDARES_INABIE).map(([nombre, data]) => ({
    nombre,
    ...data
  })).sort((a, b) => {
    if (a.categoria !== b.categoria) {
      return a.categoria.localeCompare(b.categoria)
    }
    return a.nombre.localeCompare(b.nombre)
  })
}