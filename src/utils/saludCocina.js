// src/utils/saludCocina.js
// Motor de Salud de la Cocina — Andamio / Cocina PAE
// PURO: recibe las señales ya recogidas y devuelve la nota 1–10,
// el desglose por área y los consejos. No toca la base de datos.

export const PESOS = {
  operacion: 0.35,
  financiera: 0.25,
  gente: 0.15,
  constancia: 0.15,
  completitud: 0.10,
}

function frescura(dias, [optimo, bueno, regular, malo]) {
  if (dias === null || dias === undefined) return 0
  if (dias <= optimo) return 1
  if (dias <= bueno) return 0.7
  if (dias <= regular) return 0.4
  if (dias <= malo) return 0.2
  return 0
}
function clamp01(n) { return Math.max(0, Math.min(1, n)) }
function sev(s) { return s === 'alta' ? 3 : s === 'media' ? 2 : 1 }

// Promedio ponderado que IGNORA señales no medibles (null) y renormaliza.
function mezcla(pares) {
  let suma = 0, peso = 0
  for (const [p, v] of pares) {
    if (v === null || v === undefined) continue
    suma += p * v; peso += p
  }
  return peso > 0 ? suma / peso : 0
}

export function calcularSalud(s) {
  const consejos = []

  // ── 1. OPERACIÓN DIARIA ──
  const pPesaje = frescura(s.diasDesdeUltimoPesaje, [1, 2, 3, 5])
  const pDespacho = frescura(s.diasDesdeUltimoDespacho, [1, 2, 3, 5])
  const pRegularidad = clamp01((s.diasOperativosUltimos14 || 0) / Math.max(s.diasClaseEsperadosUltimos14 || 10, 1))
  const aOperacion = mezcla([[0.35, pPesaje], [0.35, pDespacho], [0.30, pRegularidad]])

  if (pPesaje < 0.5) consejos.push({ area: 'operacion', paraQuien: 'cliente', severidad: 'alta',
    texto: 'Tus empleados no están pesando la comida todos los días. Sin el pesaje, la app no puede calcular tu costo real ni cuánto despachar. Pídeles que pesen cada día.' })
  if (pDespacho < 0.5) consejos.push({ area: 'operacion', paraQuien: 'cliente', severidad: 'alta',
    texto: 'No se están registrando los despachos a las escuelas. El despacho es el corazón de la operación — regístralo en cada entrega.' })

  // ── 2. SALUD FINANCIERA ──
  const pGasto = frescura(s.diasDesdeUltimoGasto, [7, 15, 30, 45])
  const pNcf = (s.comprasUltimoMes > 0) ? clamp01(s.comprasConNcfUltimoMes / s.comprasUltimoMes) : null
  const pDgii = (s.reporteDgiiMesGenerado === null || s.reporteDgiiMesGenerado === undefined)
    ? null : (s.reporteDgiiMesGenerado ? 1 : 0)
  const aFinanciera = mezcla([[0.40, pGasto], [0.30, pNcf], [0.30, pDgii]])

  if (s.reporteDgiiMesGenerado === false) consejos.push({ area: 'financiera', paraQuien: 'cliente', severidad: 'media', ahorro: 'contable',
    texto: 'No estás generando tus reportes 606/607 aquí. Genéralos en la app y ahórrate lo que le pagas a un contable por fuera.' })
  if (pNcf !== null && pNcf < 0.5) consejos.push({ area: 'financiera', paraQuien: 'cliente', severidad: 'media',
    texto: 'Muchas compras van sin NCF. Pide la factura con NCF: te da crédito de ITBIS y te protege en una auditoría de la DGII.' })
  if (pGasto < 0.4) consejos.push({ area: 'financiera', paraQuien: 'cliente', severidad: 'media',
    texto: 'Hace tiempo no registras gastos. Si los llevas aquí, sabes tu ganancia real y tienes todo listo para la DGII.' })

  // ── 3. GENTE / NÓMINA ──
  const pEmpleados = (s.empleadosConSueldo || 0) > 0 ? 1 : 0
  const pNomina = s.nominaUltimoPeriodoPagada ? 1 : 0
  const aGente = mezcla([[0.5, pEmpleados], [0.5, pNomina]])

  if (!pEmpleados) consejos.push({ area: 'gente', paraQuien: 'cliente', severidad: 'baja',
    texto: 'No tienes empleados con sueldo configurado. Cárgalos para llevar la nómina y los aportes de TSS desde la app.' })
  else if (!pNomina) consejos.push({ area: 'gente', paraQuien: 'cliente', severidad: 'baja',
    texto: 'No has procesado la nómina del último período aquí. Llévala en la app y ten los recibos y el respaldo legal listos, sin cuadernos.' })

  // ── 4. CONSTANCIA / ACTIVIDAD ──
  const pActivos = clamp01((s.diasActivosUltimos7 || 0) / 5)
  const pFuga = frescura(s.diasDesdeUltimaActividad, [1, 3, 6, 10])
  const aConstancia = mezcla([[0.5, pActivos], [0.5, pFuga]])

  if (pFuga < 0.4) consejos.push({ area: 'constancia', paraQuien: 'andamio', severidad: 'alta',
    texto: `Esta cocina no registra actividad hace ${s.diasDesdeUltimaActividad ?? 'varios'} días. Posible fuga — contáctala antes de que cancele.` })

  // ── 5. COMPLETITUD DE DATOS ──
  const pEscuelas = s.tieneEscuelas ? 1 : 0
  const pRecetas = s.tieneRecetas ? 1 : 0
  const pPrecios = (s.ingredientesTotal || 0) > 0
    ? clamp01((s.ingredientesTotal - (s.ingredientesSinPrecio || 0)) / s.ingredientesTotal) : null
  const aCompletitud = mezcla([[1, pEscuelas], [1, pRecetas], [1, pPrecios]])

  if (!pEscuelas) consejos.push({ area: 'completitud', paraQuien: 'cliente', severidad: 'media',
    texto: 'Aún no tienes tus escuelas configuradas. Sin escuelas no puedes despachar — configúralas para arrancar.' })
  if (pPrecios !== null && pPrecios < 0.8 && (s.ingredientesTotal || 0) > 0) consejos.push({ area: 'completitud', paraQuien: 'cliente', severidad: 'baja',
    texto: `Tienes ${s.ingredientesSinPrecio} ingrediente(s) sin precio. Sin precio, tu costo por ración sale mal. Complétalos.` })

  // ── NOTA FINAL (0.0 – 10.0) ──
  const total = mezcla([
    [PESOS.operacion, aOperacion],
    [PESOS.financiera, aFinanciera],
    [PESOS.gente, aGente],
    [PESOS.constancia, aConstancia],
    [PESOS.completitud, aCompletitud],
  ])
  const puntuacion = Math.round(total * 100) / 10

  return {
    puntuacion,
    nivel: puntuacion >= 8 ? 'sana' : puntuacion >= 5 ? 'atencion' : 'riesgo',
    areas: {
      operacion: Math.round(aOperacion * 100),
      financiera: Math.round(aFinanciera * 100),
      gente: Math.round(aGente * 100),
      constancia: Math.round(aConstancia * 100),
      completitud: Math.round(aCompletitud * 100),
    },
    consejos: consejos.sort((a, b) => sev(b.severidad) - sev(a.severidad)),
  }
}