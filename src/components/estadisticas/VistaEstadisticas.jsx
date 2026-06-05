import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const MORADO = { c: '#534AB7', bg: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' }
const VERDE = '#1D9E75'
const AMBAR = '#EF9F27'
const ROJO = '#E24B4A'
const AZUL = '#378ADD'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const INICIALES_DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S']

const ESTADOS_OPERATIVOS = ['preparando', 'lista', 'despachando', 'entregada', 'cerrada']

function fmt(n) {
  return Math.round(n).toLocaleString('es-DO')
}
function fmtMiles(n) {
  if (n >= 1000) return `RD$ ${(n / 1000).toFixed(0)}K`
  return `RD$ ${Math.round(n)}`
}

function VistaEstadisticas({ usuario, empresaId, onVolver }) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [tab, setTab] = useState('produccion')
  const [cargando, setCargando] = useState(true)

  // Datos crudos
  const [operaciones, setOperaciones] = useState([])
  const [escuelas, setEscuelas] = useState([])
  const [recetas, setRecetas] = useState([])
  const [pesajes, setPesajes] = useState([])
  const [pesajeIngred, setPesajeIngred] = useState([])
  const [ingredientes, setIngredientes] = useState([])

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'

  useEffect(() => { if (empresaId) cargarDatos() }, [empresaId, mes, anio])

  async function cargarDatos() {
    setCargando(true)

    const primerDia = `${anio}-${String(mes + 1).padStart(2, '0')}-01`
    const ultimoDiaNum = new Date(anio, mes + 1, 0).getDate()
    const ultimoDia = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`

    const { data: ops } = await supabase
      .from('operaciones_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia)
    setOperaciones(ops || [])

    const { data: esc } = await supabase
      .from('escuelas')
      .select('id, nombre, precio_racion')
      .eq('empresa_id', empresaId)
    setEscuelas(esc || [])

    const { data: rec } = await supabase
      .from('recetas')
      .select('id, nombre, emoji')
      .eq('empresa_id', empresaId)
    setRecetas(rec || [])

    // Pesajes del mes (para costo por menú)
    const { data: pes } = await supabase
      .from('pesajes_dia')
      .select('id, fecha, receta_id, total_raciones')
      .eq('empresa_id', empresaId)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia)
    setPesajes(pes || [])

    // Ingredientes pesados (bajan de los pesajes del mes)
    const pesajeIds = (pes || []).map(p => p.id)
    if (pesajeIds.length > 0) {
      const { data: pIng } = await supabase
        .from('pesajes_dia_ingredientes')
        .select('pesaje_dia_id, ingrediente_id, peso_real')
        .in('pesaje_dia_id', pesajeIds)
      setPesajeIngred(pIng || [])
    } else {
      setPesajeIngred([])
    }

    // Catálogo de ingredientes con precio
    const { data: ing } = await supabase
      .from('ingredientes')
      .select('id, nombre, precio_unitario')
      .eq('empresa_id', empresaId)
    setIngredientes(ing || [])

    setCargando(false)
  }

  // ════════ CÁLCULOS DE PRODUCCIÓN ════════

  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const diasArray = Array.from({ length: diasEnMes }, (_, i) => i + 1)

  function precioEscuela(escuelaId) {
    const e = escuelas.find(x => x.id === escuelaId)
    return parseFloat(e?.precio_racion) || 0
  }
  function nombreReceta(recetaId) {
    const r = recetas.find(x => x.id === recetaId)
    return r ? { nombre: r.nombre, emoji: r.emoji || '🍽️' } : { nombre: 'Sin menú asignado', emoji: '🍽️' }
  }

  // Operaciones que de verdad operaron (no sin_clase)
  const opsReales = operaciones.filter(op => ESTADOS_OPERATIVOS.includes(op.estado))

  // Raciones por día (entregadas; si 0, planificadas)
  function racionesDeOp(op) {
    return (op.raciones_entregadas && op.raciones_entregadas > 0)
      ? op.raciones_entregadas
      : (op.raciones_planificadas || 0)
  }

  const racionesPorDia = diasArray.map(d => {
    const fecha = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const total = opsReales
      .filter(op => op.fecha === fecha)
      .reduce((s, op) => s + racionesDeOp(op), 0)
    return { dia: d, raciones: total, finde: [0, 6].includes(new Date(anio, mes, d).getDay()) }
  })
  const maxRaciones = Math.max(1, ...racionesPorDia.map(r => r.raciones))
  const totalRacionesMes = racionesPorDia.reduce((s, r) => s + r.raciones, 0)
  const diasOperados = racionesPorDia.filter(r => r.raciones > 0).length

  // Costo de ingredientes por cada pesaje_dia
  function precioIngrediente(ingId) {
    const i = ingredientes.find(x => x.id === ingId)
    return parseFloat(i?.precio_unitario) || 0
  }
  function costoDePesaje(pesajeId) {
    return pesajeIngred
      .filter(pi => pi.pesaje_dia_id === pesajeId)
      .reduce((s, pi) => s + (parseFloat(pi.peso_real) || 0) * precioIngrediente(pi.ingrediente_id), 0)
  }

  // ── ANÁLISIS POR MENÚ ──
  // Agrupamos las operaciones reales por receta
  const menuMap = {}
  opsReales.forEach(op => {
    const rid = op.receta_id_override || op.receta_id
    if (!rid) return
    if (!menuMap[rid]) menuMap[rid] = { recetaId: rid, veces: 0, raciones: 0, facturacion: 0 }
    menuMap[rid].veces += 1
    const rac = racionesDeOp(op)
    menuMap[rid].raciones += rac
    menuMap[rid].facturacion += rac * precioEscuela(op.escuela_id)
  })
  // Costo por receta: sumamos el costo de los pesajes de esa receta en el mes
  pesajes.forEach(p => {
    const rid = p.receta_id
    if (!rid || !menuMap[rid]) return
    if (!menuMap[rid].costo) menuMap[rid].costo = 0
    menuMap[rid].costo += costoDePesaje(p.id)
  })

  const analisisMenu = Object.values(menuMap).map(m => {
    const costo = m.costo || 0
    const margen = m.facturacion - costo
    const margenPct = m.facturacion > 0 ? Math.round((margen / m.facturacion) * 100) : 0
    const costoRacion = m.raciones > 0 ? costo / m.raciones : 0
    const info = nombreReceta(m.recetaId)
    return { ...m, costo, margen, margenPct, costoRacion, ...info }
  }).sort((a, b) => b.margenPct - a.margenPct)

  // ── SOBRANTE POR SEMANA ──
  // Agrupamos peso_cocido y peso_sobrante por semana del mes
  function semanaDelMes(dia) {
    return Math.ceil(dia / 7) // 1..5
  }
  const semanas = {}
  opsReales.forEach(op => {
    const dia = parseInt(op.fecha.split('-')[2], 10)
    const sem = semanaDelMes(dia)
    if (!semanas[sem]) semanas[sem] = { cocido: 0, sobrante: 0 }
    semanas[sem].cocido += parseFloat(op.peso_cocido_lb) || 0
    semanas[sem].sobrante += parseFloat(op.peso_sobrante_lb) || 0
  })
  const sobrantePorSemana = Object.keys(semanas).sort().map(s => {
    const { cocido, sobrante } = semanas[s]
    const pct = cocido > 0 ? (sobrante / cocido) * 100 : 0
    return { semana: s, cocido, sobrante, pct }
  })
  const maxSobrantePct = Math.max(1, ...sobrantePorSemana.map(s => s.pct))

  function cambiarMes(delta) {
    let nuevoMes = mes + delta, nuevoAnio = anio
    if (nuevoMes < 0) { nuevoMes = 11; nuevoAnio-- }
    if (nuevoMes > 11) { nuevoMes = 0; nuevoAnio++ }
    setMes(nuevoMes); setAnio(nuevoAnio)
  }

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando estadísticas...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        {/* TÍTULO */}
        <div style={{
          background: esTropical ? `linear-gradient(135deg, ${MORADO.claro} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${MORADO.bg}25 0%, ${MORADO.bg}10 100%)`,
          border: esTropical ? `1.5px solid ${MORADO.bg}` : `1px solid ${MORADO.bg}55`,
          borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: esTropical ? MORADO.bg : `${MORADO.bg}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>📊</div>
          <div>
            <div style={{ fontSize: '10px', color: esTropical ? MORADO.c : `${MORADO.bg}CC`, letterSpacing: '1.5px', fontWeight: 600 }}>ANÁLISIS</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? MORADO.dark : 'var(--color-text-primary)', lineHeight: 1.2 }}>Estadísticas</div>
            <div style={{ fontSize: '12px', color: esTropical ? MORADO.c : `${MORADO.bg}CC`, marginTop: '4px', fontWeight: 500 }}>En qué pie estamos parados</div>
          </div>
        </div>

        {/* SELECTOR DE MES */}
        <div style={{
          background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
          borderRadius: '14px', padding: '14px 20px', marginBottom: '16px', boxShadow: 'var(--modulo-sombra)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
        }}>
          <button onClick={() => cambiarMes(-1)} style={btnFlecha()}>←</button>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', minWidth: '160px', textAlign: 'center' }}>
            {MESES[mes]} {anio}
          </span>
          <button onClick={() => cambiarMes(1)} style={btnFlecha()}>→</button>
        </div>

        {/* PESTAÑAS */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <Pestana activa={tab === 'produccion'} onClick={() => setTab('produccion')} emoji="🍽️" texto="Producción" />
          <Pestana activa={tab === 'finanzas'} onClick={() => setTab('finanzas')} emoji="💰" texto="Finanzas" />
          <Pestana activa={tab === 'personal'} onClick={() => setTab('personal')} emoji="👥" texto="Personal" />
        </div>

        {/* ════ CONTENIDO ════ */}
        {tab === 'produccion' && (
          <div>
            {/* KPIs producción */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <KpiCard label="Raciones del mes" valor={fmt(totalRacionesMes)} colorBorde={VERDE} />
              <KpiCard label="Días operados" valor={diasOperados} sublabel="con producción" colorBorde={MORADO.bg} />
              <KpiCard label="Menús distintos" valor={analisisMenu.length} sublabel="cocinados" colorBorde={AZUL} />
            </div>

            {/* Producción por día */}
            <Seccion titulo="Producción por día" badge="por día">
              {totalRacionesMes === 0 ? (
                <Vacio texto="No hay producción registrada este mes." />
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '3px', height: '160px', paddingTop: '20px', overflowX: 'auto' }}>
                  {racionesPorDia.map(r => (
                    <div key={r.dia} style={{ flex: '1 0 auto', minWidth: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', height: '100%' }}>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%' }}>
                        <div
                          title={`${r.dia}: ${fmt(r.raciones)} raciones`}
                          style={{
                            width: '100%',
                            height: `${(r.raciones / maxRaciones) * 100}%`,
                            minHeight: r.raciones > 0 ? '3px' : '0',
                            background: r.raciones > 0 ? MORADO.bg : 'transparent',
                            borderRadius: '3px 3px 0 0',
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '8px', color: r.finde ? 'var(--color-text-muted)' : 'var(--color-text-secondary)' }}>{r.dia}</span>
                    </div>
                  ))}
                </div>
              )}
            </Seccion>

            {/* Análisis por menú */}
            <Seccion titulo="Análisis por menú" badge="lo más importante" badgeColor={MORADO}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
                Cada menú usa ingredientes distintos. Aquí ves cuál te deja más ganancia y cuál te cuesta más.
              </p>
              {analisisMenu.length === 0 ? (
                <Vacio texto="No hay menús con producción este mes." />
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {analisisMenu.map(m => {
                    const colorMargen = m.margenPct >= 30 ? VERDE : m.margenPct >= 20 ? AMBAR : ROJO
                    return (
                      <div key={m.recetaId} style={{
                        background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
                        borderRadius: '12px', padding: '14px 16px',
                        display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                      }}>
                        <div style={{ fontSize: '26px' }}>{m.emoji}</div>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{m.nombre}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            cocinado {m.veces} {m.veces === 1 ? 'vez' : 'veces'} · {fmt(m.raciones)} raciones · costo RD$ {m.costoRacion.toFixed(2)}/ración
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '110px' }}>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: colorMargen }}>{m.margenPct}% margen</div>
                          <div style={{ width: '100px', height: '5px', background: 'var(--color-border-subtle)', borderRadius: '3px', marginTop: '5px', marginLeft: 'auto', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.max(0, Math.min(100, m.margenPct))}%`, height: '100%', background: colorMargen }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Seccion>

            {/* Sobrante por semana */}
            <Seccion titulo="Sobrante / merma" badge="por semana">
              {sobrantePorSemana.length === 0 || sobrantePorSemana.every(s => s.cocido === 0) ? (
                <Vacio texto="No hay datos de pesaje cocido/sobrante este mes." />
              ) : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '150px', paddingTop: '10px' }}>
                  {sobrantePorSemana.map(s => {
                    const color = s.pct >= 5 ? ROJO : s.pct >= 4 ? AMBAR : VERDE
                    return (
                      <div key={s.semana} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', maxWidth: '60px' }}>
                          <div
                            title={`Semana ${s.semana}: ${s.sobrante.toFixed(1)} lb sobrante de ${s.cocido.toFixed(1)} lb`}
                            style={{ width: '100%', height: `${(s.pct / maxSobrantePct) * 100}%`, minHeight: '4px', background: color, borderRadius: '4px 4px 0 0' }}
                          />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>
                          S{s.semana}<br />{s.pct.toFixed(1)}%
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Seccion>
          </div>
        )}

        {tab === 'finanzas' && (
          <ProximamenteTab emoji="💰" texto="Finanzas" detalle="Facturación vs gastos, margen neto, gasto por categoría y cobros INABIE." />
        )}

        {tab === 'personal' && (
          <ProximamenteTab emoji="👥" texto="Personal" detalle="Asistencia por empleado, faltas y costo de nómina." />
        )}

      </div>
    </div>
  )
}

// ─── Subcomponentes ───

function Pestana({ activa, onClick, emoji, texto }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '7px',
      padding: '10px 18px', borderRadius: '12px',
      background: activa ? MORADO.bg : 'var(--color-bg-elevated)',
      border: activa ? 'none' : '1px solid var(--color-border-subtle)',
      color: activa ? '#fff' : 'var(--color-text-secondary)',
      fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
    }}>
      <span>{emoji}</span> {texto}
    </button>
  )
}

function Seccion({ titulo, badge, badgeColor, children }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
        <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{titulo}</span>
        {badge && (
          <span style={{
            fontSize: '11px', padding: '3px 9px', borderRadius: '8px',
            background: badgeColor ? badgeColor.claro : 'var(--color-bg-elevated)',
            color: badgeColor ? badgeColor.dark : 'var(--color-text-muted)',
            fontWeight: 500,
          }}>{badge}</span>
        )}
      </div>
      <div style={{
        background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
        borderRadius: '14px', padding: '18px', boxShadow: 'var(--modulo-sombra)',
      }}>
        {children}
      </div>
    </div>
  )
}

function KpiCard({ label, valor, sublabel, colorBorde }) {
  return (
    <div style={{
      background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
      borderLeft: `4px solid ${colorBorde}`, borderRadius: '12px', padding: '14px', boxShadow: 'var(--modulo-sombra)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{valor}</div>
      {sublabel && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sublabel}</div>}
    </div>
  )
}

function Vacio({ texto }) {
  return (
    <div style={{ textAlign: 'center', padding: '24px' }}>
      <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📭</div>
      <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>{texto}</p>
    </div>
  )
}

function ProximamenteTab({ emoji, texto, detalle }) {
  return (
    <div style={{
      background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
      borderRadius: '14px', padding: '48px 24px', textAlign: 'center', boxShadow: 'var(--modulo-sombra)',
    }}>
      <div style={{ fontSize: '48px', marginBottom: '12px' }}>{emoji}</div>
      <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>{texto}</h3>
      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 auto', maxWidth: '360px', lineHeight: 1.5 }}>
        {detalle}
      </p>
      <div style={{ marginTop: '14px', fontSize: '11px', color: MORADO.bg, fontWeight: 600, letterSpacing: '0.5px' }}>PRÓXIMAMENTE</div>
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
function btnFlecha() {
  return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', padding: '8px 16px', color: 'var(--color-text-primary)', fontSize: '16px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
}
function tabTemaStyle(activo) {
  return { background: activo ? 'var(--gradient-toggle-active)' : 'transparent', border: 'none', borderRadius: '16px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }
}

export default VistaEstadisticas