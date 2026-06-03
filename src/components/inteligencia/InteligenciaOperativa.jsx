import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const COLOR_OP = '#7F77DD'
const COLOR_OP_BG = '#AFA9EC'
const COLOR_OP_DARKER = '#3C3489'
const COLOR_OP_CLARO = '#EEEDFE'

function num(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}
function pick(obj, nombres, fallback = undefined) {
  if (!obj) return fallback
  for (const n of nombres) {
    if (obj[n] !== undefined && obj[n] !== null) return obj[n]
  }
  return fallback
}

function InteligenciaOperativa({ usuario, empresaId, onVolver }) {
  const [empresa, setEmpresa] = useState(null)
  const [finanzas, setFinanzas] = useState(null)
  const [movimientosConsumo, setMovimientosConsumo] = useState([])
  const [pesajesOperacion, setPesajesOperacion] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [escuelas, setEscuelas] = useState([])
  const [recetas, setRecetas] = useState([])
  const [gastos, setGastos] = useState([])
  const [categoriasGasto, setCategoriasGasto] = useState([])
  const [cargando, setCargando] = useState(true)

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'

  useEffect(() => { if (empresaId) cargarDatos() }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    const hace30 = new Date()
    hace30.setDate(hace30.getDate() - 30)
    const hace30Str = hace30.toISOString().split('T')[0]

    const { data: empresaData } = await supabase.from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)
    const { data: finanzasData } = await supabase.from('finanzas').select('*').eq('empresa_id', empresaId).maybeSingle()
    setFinanzas(finanzasData)
    const { data: escuelasData } = await supabase.from('escuelas').select('*').eq('empresa_id', empresaId).eq('activa', true)
    setEscuelas(escuelasData || [])
    const { data: recetasData } = await supabase.from('recetas').select('*').eq('empresa_id', empresaId).eq('activa', true)
    setRecetas(recetasData || [])
    const { data: opsData } = await supabase.from('operaciones_dia').select('*').eq('empresa_id', empresaId).gte('fecha', hace30Str)
    setOperaciones(opsData || [])

    // FUENTE DE VERDAD DEL COSTO REAL (INT-008):
    // movimientos_inventario con origen='consumo_operacion'.
    const { data: movConsumoData } = await supabase
      .from('movimientos_inventario')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('origen', 'consumo_operacion')
      .gte('fecha', hace30Str)
    setMovimientosConsumo(movConsumoData || [])

    if (opsData && opsData.length > 0) {
      const opIds = opsData.map(op => op.id)
      const { data: pesajesOpData } = await supabase.from('pesajes_operacion').select('*').in('operacion_id', opIds)
      setPesajesOperacion(pesajesOpData || [])
    }
    const { data: gastosData } = await supabase.from('gastos').select('*, categorias_gasto(id, nombre, icono, color)').eq('empresa_id', empresaId).gte('fecha', hace30Str).order('fecha', { ascending: false })
    setGastos(gastosData || [])
    const { data: catsData } = await supabase.from('categorias_gasto').select('*').eq('empresa_id', empresaId)
    setCategoriasGasto(catsData || [])
    setCargando(false)
  }

  if (cargando) {
    return <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <p style={{ color: 'var(--color-text-muted)' }}>⏳ Calculando inteligencia...</p>
    </div>
  }

  const operacionesActivas = operaciones.filter(op => !op.no_hubo_clase && op.estado !== 'sin_clase')
  const totalOperacionesActivas = operacionesActivas.length
  const fechasConOps = [...new Set(operacionesActivas.map(op => op.fecha))]

  const fechasConConsumo = [...new Set(movimientosConsumo.map(m => m.fecha))]
  const totalDiasOperados = fechasConConsumo.length

  let costoTotalReal = 0
  let racionesTotalesReal = 0
  fechasConConsumo.forEach(fecha => {
    const movsDeLaFecha = movimientosConsumo.filter(m => m.fecha === fecha)
    const costoDelDia = movsDeLaFecha.reduce((sum, m) => sum + (num(m.cantidad) * num(m.precio_unitario)), 0)
    costoTotalReal += costoDelDia
    const racionesDelDia = operacionesActivas
      .filter(op => op.fecha === fecha)
      .reduce((sum, op) => sum + num(pick(op, ['raciones_planificadas', 'raciones'], 0)), 0)
    racionesTotalesReal += racionesDelDia
  })

  const costoObjetivo = num(pick(finanzas, ['costo_objetivo_racion'], 35))
  const costoRealPorRacion = racionesTotalesReal > 0 ? costoTotalReal / racionesTotalesReal : 0
  const ahorroProRacion = costoObjetivo - costoRealPorRacion
  const ahorro30dias = ahorroProRacion * racionesTotalesReal

  let motivoCostoCero = null
  if (totalDiasOperados > 0 && costoRealPorRacion === 0) {
    const movsSinPrecio = movimientosConsumo.filter(m => num(m.precio_unitario) === 0).length
    if (movimientosConsumo.length === 0) {
      motivoCostoCero = 'No hay movimientos de consumo registrados. Aprueba el pesaje crudo del día desde el dashboard.'
    } else if (movsSinPrecio === movimientosConsumo.length) {
      motivoCostoCero = 'Los ingredientes no tenían precio al momento del pesaje (precio_unitario en 0). Configura precios en Ingredientes y vuelve a aprobar el pesaje.'
    } else if (racionesTotalesReal === 0) {
      motivoCostoCero = 'Hay costo de ingredientes pero 0 raciones en las operaciones de esos días. Revisa que las escuelas se hayan iniciado con sus raciones.'
    } else {
      motivoCostoCero = 'Costo real en 0 por datos incompletos. Revisa precios de ingredientes y raciones del día.'
    }
  }

  const pesajesCocinado = pesajesOperacion.filter(p => p.tipo === 'cocinado').length
  const pesajesSobrante = pesajesOperacion.filter(p => p.tipo === 'retorno').length
  const tasaCocinado = totalOperacionesActivas > 0 ? Math.round((pesajesCocinado / totalOperacionesActivas) * 100) : 0
  const tasaSobrante = totalOperacionesActivas > 0 ? Math.round((pesajesSobrante / totalOperacionesActivas) * 100) : 0
  const tasaCrudo = fechasConOps.length > 0 ? Math.round((totalDiasOperados / fechasConOps.length) * 100) : 0
  const calidadDatos = Math.round((tasaCrudo * 0.5 + tasaCocinado * 0.3 + tasaSobrante * 0.2))

  const totalIngsPesados = movimientosConsumo.length

  const sobrantePorEscuela = {}
  pesajesOperacion.filter(p => p.tipo === 'retorno').forEach(p => {
    const op = operaciones.find(o => o.id === p.operacion_id)
    if (!op) return
    const escuela = escuelas.find(e => e.id === op.escuela_id)
    if (!escuela) return
    if (!sobrantePorEscuela[escuela.id]) {
      sobrantePorEscuela[escuela.id] = { nombre: escuela.nombre, totalSobrante: 0, totalCocinado: 0, muestras: 0 }
    }
    sobrantePorEscuela[escuela.id].totalSobrante += num(pick(p, ['peso', 'peso_real', 'peso_kg'], 0))
    const cocinado = pesajesOperacion.find(c => c.operacion_id === op.id && c.tipo === 'cocinado')
    if (cocinado) sobrantePorEscuela[escuela.id].totalCocinado += num(pick(cocinado, ['peso', 'peso_real', 'peso_kg'], 0))
    sobrantePorEscuela[escuela.id].muestras += 1
  })

  const escuelasOrdenadas = Object.values(sobrantePorEscuela).map(e => ({
    ...e,
    pctSobrante: e.totalCocinado > 0 ? (e.totalSobrante / e.totalCocinado * 100) : 0
  })).sort((a, b) => b.pctSobrante - a.pctSobrante)

  const opsSinClase = operaciones.filter(op => op.no_hubo_clase || op.estado === 'sin_clase').length

  const gastoTotal30dias = gastos.reduce((sum, g) => sum + num(pick(g, ['total', 'monto', 'total_gasto'], 0)), 0)
  const gastosPorCategoria = {}
  gastos.forEach(g => {
    const cat = g.categorias_gasto
    if (!cat) return
    if (!gastosPorCategoria[cat.id]) {
      gastosPorCategoria[cat.id] = { id: cat.id, nombre: cat.nombre, icono: cat.icono, color: cat.color, total: 0, cantidad: 0 }
    }
    gastosPorCategoria[cat.id].total += num(pick(g, ['total', 'monto', 'total_gasto'], 0))
    gastosPorCategoria[cat.id].cantidad += 1
  })
  const categoriasOrdenadas = Object.values(gastosPorCategoria).map(c => ({
    ...c, pct: gastoTotal30dias > 0 ? (c.total / gastoTotal30dias * 100) : 0
  })).sort((a, b) => b.total - a.total)

  const top3Gastos = [...gastos].sort((a, b) => num(pick(b, ['total', 'monto'], 0)) - num(pick(a, ['total', 'monto'], 0))).slice(0, 3)

  const facturacionReal30 = operaciones
    .filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
    .reduce((sum, op) => {
      const escuela = escuelas.find(e => e.id === op.escuela_id)
      return sum + (num(pick(op, ['raciones_planificadas', 'raciones'], 0)) * num(pick(escuela, ['precio_racion'], 0)))
    }, 0)

  const racionesEntregadas30 = operaciones
    .filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
    .reduce((sum, op) => sum + num(pick(op, ['raciones_planificadas', 'raciones'], 0)), 0)

  const margenReal = facturacionReal30 - gastoTotal30dias
  const margenRealPct = facturacionReal30 > 0 ? (margenReal / facturacionReal30 * 100) : 0
  const margenMinimoObjetivo = num(pick(finanzas, ['margen_minimo_porcentaje'], 25))
  const costoTotalPorRacion = racionesEntregadas30 > 0 ? gastoTotal30dias / racionesEntregadas30 : 0
  const costoNoIngredientes = costoTotalPorRacion - costoRealPorRacion

  const COLORES_HEX = {
    amber: '#EF9F27', orange: '#D85A30', red: '#E24B4A', rose: '#D4537E', pink: '#ED93B1',
    purple: '#7F77DD', blue: '#378ADD', green: '#1D9E75', emerald: '#0F6E56',
    teal: '#1D9E75', cyan: '#5DCAA5', gray: '#888780',
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        <div style={{
          background: esTropical ? `linear-gradient(135deg, ${COLOR_OP_CLARO} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${COLOR_OP}25 0%, ${COLOR_OP}10 100%)`,
          border: esTropical ? `1.5px solid ${COLOR_OP_BG}` : `1px solid ${COLOR_OP}55`,
          borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
          boxShadow: esTropical ? `0 2px 12px ${COLOR_OP}15` : 'none',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: esTropical ? COLOR_OP : `${COLOR_OP}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: esTropical ? `0 4px 12px ${COLOR_OP}40` : 'none' }}>🧠</div>
          <div>
            <div style={{ fontSize: '10px', color: esTropical ? COLOR_OP : `${COLOR_OP}CC`, letterSpacing: '1.5px', fontWeight: 600 }}>INTELIGENCIA</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? COLOR_OP_DARKER : 'var(--color-text-primary)', lineHeight: 1.2 }}>Inteligencia Operativa</div>
            <div style={{ fontSize: '12px', color: esTropical ? COLOR_OP : `${COLOR_OP}CC`, marginTop: '4px', fontWeight: 500 }}>Últimos 30 días · {empresa?.nombre}</div>
          </div>
        </div>

        {totalDiasOperados === 0 && totalOperacionesActivas === 0 && gastos.length === 0 ? (
          <div style={{
            background: esTropical ? '#FAF3E5' : 'rgba(250, 199, 117, 0.08)',
            border: '1px solid rgba(186, 117, 23, 0.3)', borderLeft: '4px solid #BA7517',
            borderRadius: '14px', padding: '40px', textAlign: 'center', boxShadow: 'var(--modulo-sombra)',
          }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>📊</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: esTropical ? '#854F0B' : '#FAC775', marginBottom: '8px' }}>
              Aún no hay datos suficientes
            </div>
            <p style={{ fontSize: '12px', color: esTropical ? '#633806' : 'var(--color-text-secondary)', maxWidth: '400px', margin: '0 auto' }}>
              Cuando empieces a aprobar pesajes en el día a día, esta pantalla se llenará con inteligencia real sobre tu operación.
            </p>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '12px' }}>
              💡 Empieza por aprobar el pesaje crudo de hoy en el dashboard.
            </p>
          </div>
        ) : (
          <>
            <div style={{
              background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
              borderLeft: `4px solid ${COLOR_OP}`,
              borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '8px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: COLOR_OP, letterSpacing: '1.5px', fontWeight: 600 }}>💼 VISIÓN FINANCIERA REAL</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Todo lo que entra, todo lo que sale · últimos 30 días</div>
                </div>
                <span style={{ background: esTropical ? COLOR_OP : `${COLOR_OP}25`, color: esTropical ? '#ffffff' : COLOR_OP, padding: '4px 12px', borderRadius: '12px', fontSize: '10px', fontWeight: 600 }}>
                  ECOSISTEMA COMPLETO
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', marginBottom: '16px' }}>
                <KpiCardCompacto label="FACTURACIÓN" valor={`RD$ ${(facturacionReal30 / 1000).toFixed(0)}K`} sublabel={`${racionesEntregadas30.toLocaleString()} raciones entregadas`} colorBorde="#1D9E75" colorTexto={esTropical ? '#04342C' : '#5DCAA5'} />
                <KpiCardCompacto label="GASTOS TOTALES" valor={`RD$ ${(gastoTotal30dias / 1000).toFixed(0)}K`} sublabel={`${gastos.length} gastos registrados`} colorBorde="#E24B4A" colorTexto={esTropical ? '#A32D2D' : '#F4C0D1'} />
                <KpiCardCompacto label={margenReal >= 0 ? 'MARGEN NETO' : '⚠️ PÉRDIDA'} valor={`RD$ ${(Math.abs(margenReal) / 1000).toFixed(0)}K`} sublabel={`${margenRealPct.toFixed(1)}% de facturación`} colorBorde={margenReal >= 0 ? '#378ADD' : '#BA7517'} colorTexto={margenReal >= 0 ? (esTropical ? '#0C447C' : '#85B7EB') : (esTropical ? '#854F0B' : '#FAC775')} />
                <KpiCardCompacto label="COSTO TOTAL/RACIÓN" valor={`RD$ ${costoTotalPorRacion.toFixed(2)}`} sublabel="Incluye todos los gastos" colorBorde={COLOR_OP} colorTexto={esTropical ? COLOR_OP_DARKER : COLOR_OP_BG} />
              </div>

              {costoRealPorRacion > 0 && costoTotalPorRacion > 0 && (
                <div style={{ background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)', borderRadius: '10px', padding: '14px', marginBottom: '14px', border: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ fontSize: '10px', color: COLOR_OP, fontWeight: 600, letterSpacing: '0.5px', marginBottom: '10px' }}>
                    🔍 ¿DE QUÉ ESTÁ COMPUESTO TU COSTO POR RACIÓN?
                  </div>
                  <BarraComposicion label="Ingredientes" valor={costoRealPorRacion} total={costoTotalPorRacion} color="#1D9E75" />
                  <BarraComposicion label="Resto del negocio" valor={costoNoIngredientes} total={costoTotalPorRacion} color="#D4537E" />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '10px', borderTop: '1px solid var(--color-border-subtle)' }}>
                    <div style={{ width: '120px', fontSize: '12px', fontWeight: 700, color: esTropical ? COLOR_OP_DARKER : COLOR_OP_BG }}>TOTAL</div>
                    <div style={{ flex: 1, textAlign: 'right', fontSize: '15px', fontWeight: 700, color: esTropical ? COLOR_OP_DARKER : 'var(--color-text-primary)' }}>
                      RD$ {costoTotalPorRacion.toFixed(2)} por ración
                    </div>
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '8px', fontStyle: 'italic' }}>
                    💡 Nómina, gas, limpieza y demás suman <strong>RD$ {costoNoIngredientes.toFixed(2)}</strong> al costo real.
                  </div>
                </div>
              )}

              {facturacionReal30 > 0 && margenRealPct < margenMinimoObjetivo && (
                <div style={{
                  background: margenReal < 0 ? (esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.12)') : (esTropical ? '#FAF3E5' : 'rgba(186, 117, 23, 0.12)'),
                  border: margenReal < 0 ? '1px solid rgba(226, 75, 74, 0.4)' : '1px solid rgba(186, 117, 23, 0.4)',
                  borderLeft: margenReal < 0 ? '4px solid #E24B4A' : '4px solid #BA7517',
                  borderRadius: '10px', padding: '12px 14px', marginBottom: '14px',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 700, color: margenReal < 0 ? (esTropical ? '#A32D2D' : '#F4C0D1') : (esTropical ? '#854F0B' : '#FAC775') }}>
                    {margenReal < 0 ? '🚨 ALERTA: Estás operando con pérdida' : `⚠️ Margen por debajo del objetivo (${margenMinimoObjetivo}%)`}
                  </div>
                  <div style={{ fontSize: '11px', color: margenReal < 0 ? (esTropical ? '#A32D2D' : '#F4C0D1') : (esTropical ? '#854F0B' : '#FAC775'), marginTop: '4px', opacity: 0.85 }}>
                    Tu margen real es {margenRealPct.toFixed(1)}%. Revisa gastos o ajusta operación.
                  </div>
                </div>
              )}

              {categoriasOrdenadas.length > 0 && (
                <div style={{ background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)', borderRadius: '10px', padding: '14px', marginBottom: '12px', border: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '12px' }}>
                    📊 GASTOS POR CATEGORÍA
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {categoriasOrdenadas.map(cat => (
                      <div key={cat.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                          <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
                            {cat.icono} {cat.nombre}
                            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: '6px' }}>
                              ({cat.cantidad} gasto{cat.cantidad !== 1 ? 's' : ''})
                            </span>
                          </div>
                          <div style={{ textAlign: 'right' }}>
                            <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                              RD$ {cat.total.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                            </span>
                            <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginLeft: '6px' }}>
                              {cat.pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div style={{ width: '100%', background: esTropical ? '#E5E3DC' : 'rgba(255,255,255,0.05)', borderRadius: '8px', height: '6px', overflow: 'hidden' }}>
                          <div style={{ background: COLORES_HEX[cat.color] || '#888780', height: '6px', width: `${Math.min(cat.pct, 100)}%`, borderRadius: '8px' }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {top3Gastos.length > 0 && (
                <div style={{ background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)', borderRadius: '10px', padding: '14px', border: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '10px' }}>
                    🏆 TOP 3 GASTOS DEL PERÍODO
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {top3Gastos.map((g, idx) => {
                      const cat = g.categorias_gasto
                      const colorRank = idx === 0 ? '#FAC775' : idx === 1 ? '#C5C5BE' : '#BA7517'
                      return (
                        <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', background: esTropical ? '#F1EFE8' : 'rgba(255,255,255,0.03)', borderRadius: '8px', padding: '10px 12px' }}>
                          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: colorRank, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '12px', flexShrink: 0 }}>{idx + 1}</div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {cat?.icono} {g.descripcion || 'Sin descripción'}
                            </div>
                            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                              {cat?.nombre} · {new Date(g.fecha).toLocaleDateString('es-DO')}
                            </div>
                          </div>
                          <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                            RD$ {num(pick(g, ['total', 'monto'], 0)).toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {gastos.length === 0 && (
                <div style={{ background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)', borderRadius: '10px', padding: '20px', textAlign: 'center', border: '1px solid var(--color-border-subtle)' }}>
                  <div style={{ fontSize: '36px', marginBottom: '8px' }}>💸</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Aún no hay gastos registrados</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Empieza a capturar gastos para ver tu costo total real y margen neto.</div>
                </div>
              )}
            </div>

            <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderLeft: '4px solid #1D9E75', borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)' }}>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '14px' }}>
                📊 SALUD DEL SISTEMA
              </div>
              <BarraSalud label="Pesaje crudo del día" pct={tasaCrudo} count={totalDiasOperados} total={fechasConOps.length} color="#1D9E75" esTropical={esTropical} />
              <BarraSalud label="Pesaje cocinado por escuela" pct={tasaCocinado} count={pesajesCocinado} total={totalOperacionesActivas} color="#D85A30" esTropical={esTropical} />
              <BarraSalud label="Pesaje sobrante por escuela" pct={tasaSobrante} count={pesajesSobrante} total={totalOperacionesActivas} color={COLOR_OP} esTropical={esTropical} />

              <div style={{ marginTop: '18px', paddingTop: '14px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '1px', fontWeight: 600 }}>⭐ CALIDAD DE DATOS</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Mientras más pesajes registres, mejor afina el sistema</div>
                </div>
                <div style={{
                  padding: '12px 24px', borderRadius: '12px', fontSize: '20px', fontWeight: 700,
                  background: calidadDatos >= 75 ? (esTropical ? '#D7F0DD' : 'rgba(29, 158, 117, 0.2)')
                    : calidadDatos >= 40 ? (esTropical ? '#FAF3E5' : 'rgba(186, 117, 23, 0.2)')
                    : (esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.2)'),
                  color: calidadDatos >= 75 ? (esTropical ? '#04342C' : '#5DCAA5')
                    : calidadDatos >= 40 ? (esTropical ? '#854F0B' : '#FAC775')
                    : (esTropical ? '#A32D2D' : '#F4C0D1'),
                }}>
                  {calidadDatos}%
                </div>
              </div>
            </div>

            <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderLeft: '4px solid #EF9F27', borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)' }}>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '14px' }}>
                🥕 COSTO INGREDIENTES VS OBJETIVO
              </div>
              {totalDiasOperados === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px', fontSize: '13px', color: 'var(--color-text-muted)' }}>
                  Aprueba al menos un pesaje crudo para ver el costo real
                </div>
              ) : motivoCostoCero ? (
                <div style={{
                  background: esTropical ? '#FAF3E5' : 'rgba(186, 117, 23, 0.08)',
                  border: '1px solid rgba(186, 117, 23, 0.3)', borderLeft: '4px solid #BA7517',
                  borderRadius: '10px', padding: '16px 18px',
                }}>
                  <div style={{ fontSize: '12px', fontWeight: 700, color: esTropical ? '#854F0B' : '#FAC775', marginBottom: '6px' }}>
                    ⚠️ El costo real salió en RD$ 0.00
                  </div>
                  <div style={{ fontSize: '12px', color: esTropical ? '#633806' : 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                    {motivoCostoCero}
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '10px', fontFamily: 'monospace' }}>
                    Movimientos consumo: {movimientosConsumo.length} · días con consumo: {totalDiasOperados} · raciones: {racionesTotalesReal}
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                    <KpiMini label="OBJETIVO" valor={`RD$ ${costoObjetivo.toFixed(2)}`} sublabel="por ración" esTropical={esTropical} color="#888780" />
                    <KpiMini label="COSTO REAL"
                      valor={`RD$ ${costoRealPorRacion.toFixed(2)}`}
                      sublabel="solo ingredientes"
                      esTropical={esTropical}
                      color={costoRealPorRacion <= costoObjetivo ? '#1D9E75' : '#E24B4A'} />
                    <KpiMini label={ahorroProRacion >= 0 ? 'AHORRO' : 'EXCESO'}
                      valor={`RD$ ${Math.abs(ahorroProRacion).toFixed(2)}`}
                      sublabel="por ración"
                      esTropical={esTropical}
                      color={ahorroProRacion >= 0 ? '#378ADD' : '#BA7517'} />
                  </div>

                  <div style={{
                    marginTop: '14px', padding: '14px',
                    background: esTropical ? COLOR_OP_CLARO : `${COLOR_OP}15`,
                    border: `1px solid ${COLOR_OP}40`, borderRadius: '10px',
                  }}>
                    <div style={{ fontSize: '10px', color: esTropical ? COLOR_OP_DARKER : COLOR_OP, fontWeight: 600, letterSpacing: '0.5px' }}>
                      💡 IMPACTO ACUMULADO (30 días)
                    </div>
                    <div style={{ fontSize: '22px', fontWeight: 700, color: esTropical ? COLOR_OP_DARKER : 'var(--color-text-primary)', marginTop: '4px' }}>
                      RD$ {Math.abs(ahorro30dias).toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                      <span style={{ fontSize: '12px', fontWeight: 400, marginLeft: '6px', opacity: 0.85 }}>
                        {ahorro30dias >= 0 ? '✅ ahorrados' : '⚠️ sobre-costo'}
                      </span>
                    </div>
                    <div style={{ fontSize: '11px', color: esTropical ? COLOR_OP : `${COLOR_OP}CC`, marginTop: '4px' }}>
                      Basado en {racionesTotalesReal.toLocaleString()} raciones en {totalDiasOperados} día(s) con pesaje
                    </div>
                  </div>
                </>
              )}
            </div>

            {totalIngsPesados > 0 && (
              <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderLeft: '4px solid #BA7517', borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '14px' }}>
                  🥘 INGREDIENTES PESADOS
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{totalIngsPesados}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Movimientos de consumo</div>
                  </div>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: esTropical ? '#04342C' : '#5DCAA5' }}>RD$ {costoTotalReal.toLocaleString('es-DO', { maximumFractionDigits: 0 })}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Costo total ingredientes</div>
                  </div>
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '14px', fontStyle: 'italic' }}>
                  💡 Calculado desde los pesajes crudos aprobados en los últimos 30 días.
                </div>
              </div>
            )}

            {escuelasOrdenadas.length > 0 && (
              <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderLeft: '4px solid #D85A30', borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '14px' }}>
                  🏫 SOBRANTE POR ESCUELA
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {escuelasOrdenadas.map((e, idx) => {
                    const colorRank = e.pctSobrante > 15 ? '#E24B4A' : e.pctSobrante > 8 ? '#BA7517' : '#1D9E75'
                    return (
                      <div key={e.nombre} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: esTropical ? `${colorRank}20` : `${colorRank}30`, color: colorRank, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                          {idx + 1}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{e.nombre}</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{e.muestras} pesajes registrados</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: 700, color: colorRank }}>{e.pctSobrante.toFixed(1)}%</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>{e.totalSobrante.toFixed(0)} lb total</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            {opsSinClase > 0 && (
              <div style={{
                background: esTropical ? '#FAF3E5' : 'rgba(186, 117, 23, 0.08)',
                border: '1px solid rgba(186, 117, 23, 0.3)', borderLeft: '4px solid #BA7517',
                borderRadius: '14px', padding: '18px 20px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)',
              }}>
                <div style={{ fontSize: '10px', color: esTropical ? '#854F0B' : '#FAC775', letterSpacing: '1.5px', fontWeight: 600 }}>
                  🚫 DÍAS SIN CLASE (30 días)
                </div>
                <div style={{ fontSize: '20px', fontWeight: 700, color: esTropical ? '#854F0B' : 'var(--color-text-primary)', marginTop: '4px' }}>
                  {opsSinClase} operaciones canceladas
                </div>
                <div style={{ fontSize: '11px', color: esTropical ? '#633806' : 'var(--color-text-muted)', marginTop: '4px' }}>
                  Por lluvia, paros u otras razones. Estas no se facturaron.
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function KpiCardCompacto({ label, valor, sublabel, colorBorde, colorTexto }) {
  return (
    <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderLeft: `4px solid ${colorBorde}`, borderRadius: '10px', padding: '12px' }}>
      <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '1px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: colorTexto, marginTop: '6px' }}>{valor}</div>
      {sublabel && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sublabel}</div>}
    </div>
  )
}

function KpiMini({ label, valor, sublabel, color, esTropical }) {
  return (
    <div style={{
      background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderLeft: `4px solid ${color}`,
      borderRadius: '10px', padding: '14px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '1px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 700, color: color, marginTop: '6px' }}>{valor}</div>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sublabel}</div>
    </div>
  )
}

function BarraSalud({ label, pct, count, total, color, esTropical }) {
  return (
    <div style={{ marginBottom: '14px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
        <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{label}</div>
        <div style={{ fontSize: '12px', fontWeight: 700, color }}>
          {pct}% <span style={{ fontWeight: 400, color: 'var(--color-text-muted)' }}>({count} de {total})</span>
        </div>
      </div>
      <div style={{ width: '100%', background: esTropical ? '#E5E3DC' : 'rgba(255,255,255,0.06)', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
        <div style={{ background: color, height: '8px', width: `${Math.min(pct, 100)}%`, borderRadius: '8px' }} />
      </div>
    </div>
  )
}

function BarraComposicion({ label, valor, total, color }) {
  const pct = total > 0 ? (valor / total * 100) : 0
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
      <div style={{ width: '120px', fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{label}</div>
      <div style={{ flex: 1, background: 'rgba(0,0,0,0.05)', borderRadius: '12px', height: '24px', position: 'relative', overflow: 'hidden' }}>
        <div style={{
          background: color, height: '24px', borderRadius: '12px',
          width: `${Math.min(pct, 100)}%`,
          display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
          paddingRight: '8px',
        }}>
          <span style={{ fontSize: '11px', fontWeight: 700, color: 'white' }}>RD$ {valor.toFixed(2)}</span>
        </div>
      </div>
    </div>
  )
}

function ToggleTema({ tema, setTema }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '3px', gap: '2px' }}>
      <button onClick={() => setTema('oscuro')} style={tabTemaStyle(tema === 'oscuro')}>
        <span style={{ fontSize: '11px' }}>🌙</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
      </button>
      <button onClick={() => setTema('tropical')} style={tabTemaStyle(tema === 'tropical')}>
        <span style={{ fontSize: '11px' }}>☀️</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
      </button>
    </div>
  )
}

function btnVolver() {
  return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
}

function tabTemaStyle(activo) {
  return { background: activo ? 'var(--gradient-toggle-active)' : 'transparent', border: 'none', borderRadius: '16px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }
}

export default InteligenciaOperativa