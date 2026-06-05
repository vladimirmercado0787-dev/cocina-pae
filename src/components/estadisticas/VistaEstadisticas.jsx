import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

const MORADO = { c: '#534AB7', bg: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' }
const VERDE = '#1D9E75'
const AMBAR = '#EF9F27'
const ROJO = '#E24B4A'
const AZUL = '#378ADD'
const PALETA_DONA = ['#7F77DD', '#378ADD', '#1D9E75', '#EF9F27', '#D4537E', '#D85A30', '#534AB7', '#0F6E56']

const COLORES_NOMBRE = {
  amber: '#EF9F27', red: '#E24B4A', yellow: '#FAC775', blue: '#378ADD',
  green: '#1D9E75', slate: '#64748B', indigo: '#534AB7', purple: '#7F77DD',
  gray: '#94A3B8', orange: '#D85A30', pink: '#D4537E', teal: '#0F9E8E',
}

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const ESTADOS_OPERATIVOS = ['preparando', 'lista', 'despachando', 'entregada', 'cerrada']

function fmt(n) { return Math.round(n).toLocaleString('es-DO') }
function fmtRD(n) { return `RD$ ${Math.round(n).toLocaleString('es-DO')}` }

// Contenedor que mide su ancho (para las gráficas Recharts)
function Grafica({ alto = 220, children }) {
  const ref = useRef(null)
  const [ancho, setAncho] = useState(0)
  useEffect(() => {
    function medir() { if (ref.current) setAncho(ref.current.offsetWidth) }
    medir()
    window.addEventListener('resize', medir)
    const t = setTimeout(medir, 100)
    return () => { window.removeEventListener('resize', medir); clearTimeout(t) }
  }, [])
  return (
    <div ref={ref} style={{ width: '100%', height: alto }}>
      {ancho > 0 && children(ancho, alto)}
    </div>
  )
}

function VistaEstadisticas({ usuario, empresaId, onVolver }) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [tab, setTab] = useState('produccion')
  const [cargando, setCargando] = useState(true)

  const [operaciones, setOperaciones] = useState([])
  const [escuelas, setEscuelas] = useState([])
  const [recetas, setRecetas] = useState([])
  const [pesajes, setPesajes] = useState([])
  const [pesajeIngred, setPesajeIngred] = useState([])
  const [ingredientes, setIngredientes] = useState([])
  const [gastos, setGastos] = useState([])
  const [categoriasGasto, setCategoriasGasto] = useState([])
  const [empleados, setEmpleados] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [justificaciones, setJustificaciones] = useState([])
  const [pagosNomina, setPagosNomina] = useState([])

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'
  const colorEje = esTropical ? '#9A8F80' : '#8A8499'
  const colorGrid = esTropical ? '#E5DFD3' : 'rgba(255,255,255,0.06)'

  useEffect(() => { if (empresaId) cargarDatos() }, [empresaId, mes, anio])

  async function cargarDatos() {
    setCargando(true)
    const primerDia = `${anio}-${String(mes + 1).padStart(2, '0')}-01`
    const ultimoDiaNum = new Date(anio, mes + 1, 0).getDate()
    const ultimoDia = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`

    const { data: ops } = await supabase.from('operaciones_dia').select('*')
      .eq('empresa_id', empresaId).gte('fecha', primerDia).lte('fecha', ultimoDia)
    setOperaciones(ops || [])

    const { data: esc } = await supabase.from('escuelas').select('id, nombre, precio_racion').eq('empresa_id', empresaId)
    setEscuelas(esc || [])

    const { data: rec } = await supabase.from('recetas').select('id, nombre, emoji').eq('empresa_id', empresaId)
    setRecetas(rec || [])

    const { data: pes } = await supabase.from('pesajes_dia').select('id, fecha, receta_id, total_raciones')
      .eq('empresa_id', empresaId).gte('fecha', primerDia).lte('fecha', ultimoDia)
    setPesajes(pes || [])

    const pesajeIds = (pes || []).map(p => p.id)
    if (pesajeIds.length > 0) {
      const { data: pIng } = await supabase.from('pesajes_dia_ingredientes')
        .select('pesaje_dia_id, ingrediente_id, peso_real').in('pesaje_dia_id', pesajeIds)
      setPesajeIngred(pIng || [])
    } else { setPesajeIngred([]) }

    const { data: ing } = await supabase.from('ingredientes').select('id, nombre, precio_unitario').eq('empresa_id', empresaId)
    setIngredientes(ing || [])

    const { data: gas } = await supabase.from('gastos').select('id, fecha, total, categoria_id')
      .eq('empresa_id', empresaId).gte('fecha', primerDia).lte('fecha', ultimoDia)
    setGastos(gas || [])

    const { data: cats } = await supabase.from('categorias_gasto').select('id, nombre, icono, color').eq('empresa_id', empresaId)
    setCategoriasGasto(cats || [])

    const { data: emps } = await supabase.from('usuarios').select('id, nombre, rol').eq('empresa_id', empresaId).eq('activo', true)
    const ordenados = (emps || []).sort((a, b) => {
      if (a.rol === 'propietario') return -1
      if (b.rol === 'propietario') return 1
      return a.nombre.localeCompare(b.nombre)
    })
    setEmpleados(ordenados)

    const { data: asis } = await supabase.from('asistencias').select('usuario_id, fecha')
      .eq('empresa_id', empresaId).gte('fecha', primerDia).lte('fecha', ultimoDia)
    setAsistencias(asis || [])

    const { data: justif } = await supabase.from('asistencia_justificaciones').select('usuario_id, fecha')
      .eq('empresa_id', empresaId).gte('fecha', primerDia).lte('fecha', ultimoDia)
    setJustificaciones(justif || [])

    const { data: nom } = await supabase.from('pagos_nomina').select('total_bruto, total_neto, fecha_pago, cantidad_empleados, estado')
      .eq('empresa_id', empresaId).gte('fecha_pago', primerDia).lte('fecha_pago', ultimoDia)
    setPagosNomina(nom || [])

    setCargando(false)
  }

  // ════════ CÁLCULOS ════════
  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const diasArray = Array.from({ length: diasEnMes }, (_, i) => i + 1)

  function precioEscuela(id) { const e = escuelas.find(x => x.id === id); return parseFloat(e?.precio_racion) || 0 }
  function nombreReceta(id) { const r = recetas.find(x => x.id === id); return r ? { nombre: r.nombre, emoji: r.emoji || '🍽️' } : { nombre: 'Sin menú asignado', emoji: '🍽️' } }

  const opsReales = operaciones.filter(op => ESTADOS_OPERATIVOS.includes(op.estado))
  function racionesDeOp(op) {
    return (op.raciones_entregadas && op.raciones_entregadas > 0) ? op.raciones_entregadas : (op.raciones_planificadas || 0)
  }

  // PRODUCCIÓN
  const racionesPorDia = diasArray.map(d => {
    const fecha = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    const total = opsReales.filter(op => op.fecha === fecha).reduce((s, op) => s + racionesDeOp(op), 0)
    return { dia: d, raciones: total }
  })
  const totalRacionesMes = racionesPorDia.reduce((s, r) => s + r.raciones, 0)
  const diasOperados = racionesPorDia.filter(r => r.raciones > 0).length

  function precioIngrediente(id) { const i = ingredientes.find(x => x.id === id); return parseFloat(i?.precio_unitario) || 0 }
  function costoDePesaje(pid) {
    return pesajeIngred.filter(pi => pi.pesaje_dia_id === pid)
      .reduce((s, pi) => s + (parseFloat(pi.peso_real) || 0) * precioIngrediente(pi.ingrediente_id), 0)
  }

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
    return { ...m, costo, margen, margenPct, costoRacion, ...nombreReceta(m.recetaId) }
  }).sort((a, b) => b.margenPct - a.margenPct)

  const semanas = {}
  opsReales.forEach(op => {
    const dia = parseInt(op.fecha.split('-')[2], 10)
    const sem = Math.ceil(dia / 7)
    if (!semanas[sem]) semanas[sem] = { cocido: 0, sobrante: 0 }
    semanas[sem].cocido += parseFloat(op.peso_cocido_lb) || 0
    semanas[sem].sobrante += parseFloat(op.peso_sobrante_lb) || 0
  })
  const sobrantePorSemana = Object.keys(semanas).sort().map(s => {
    const { cocido, sobrante } = semanas[s]
    const pct = cocido > 0 ? (sobrante / cocido) * 100 : 0
    return { semana: `Sem ${s}`, pct: parseFloat(pct.toFixed(1)), sobrante: parseFloat(sobrante.toFixed(1)), cocido: parseFloat(cocido.toFixed(1)) }
  })

  // FINANZAS
  const facturacionMes = opsReales.filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
    .reduce((s, op) => s + racionesDeOp(op) * precioEscuela(op.escuela_id), 0)
  const gastoMes = gastos.reduce((s, g) => s + (parseFloat(g.total) || 0), 0)
  const margenNeto = facturacionMes - gastoMes
  const margenNetoPct = facturacionMes > 0 ? Math.round((margenNeto / facturacionMes) * 100) : 0

  function colorReal(c) {
    if (!c) return null
    if (c.startsWith('#')) return c
    return COLORES_NOMBRE[c.toLowerCase()] || null
  }
  function infoCategoria(catId) {
    const c = categoriasGasto.find(x => String(x.id) === String(catId))
    return c ? { nombre: c.nombre || 'Sin nombre', icono: c.icono || '📦', color: colorReal(c.color) }
             : { nombre: 'Sin categoría', icono: '📦', color: null }
  }
  const gastoCatMap = {}
  gastos.forEach(g => {
    const cid = g.categoria_id || 'sin'
    if (!gastoCatMap[cid]) gastoCatMap[cid] = 0
    gastoCatMap[cid] += parseFloat(g.total) || 0
  })
  const gastoPorCategoria = Object.keys(gastoCatMap).map((cid, idx) => {
    const info = cid === 'sin' ? { nombre: 'Sin categoría', icono: '📦', color: null } : infoCategoria(cid)
    const monto = gastoCatMap[cid]
    const pct = gastoMes > 0 ? Math.round((monto / gastoMes) * 100) : 0
    return { cid, monto, pct, name: info.nombre, value: parseFloat(monto.toFixed(2)), icono: info.icono, color: info.color || PALETA_DONA[idx % PALETA_DONA.length] }
  }).sort((a, b) => b.monto - a.monto)

  // PERSONAL
  const diasConTrabajo = new Set()
  operaciones.forEach(op => { if (op.estado !== 'sin_clase') diasConTrabajo.add(op.fecha) })
  const totalDiasTrabajo = diasConTrabajo.size
  const setAsis = new Set(asistencias.map(a => `${a.usuario_id}|${a.fecha}`))
  const setJustif = new Set(justificaciones.map(j => `${j.usuario_id}|${j.fecha}`))
  const fechasTrabajo = Array.from(diasConTrabajo)
  const asistenciaPorEmpleado = empleados.map(emp => {
    let vino = 0, falto = 0, justificada = 0
    fechasTrabajo.forEach(fecha => {
      const key = `${emp.id}|${fecha}`
      if (setAsis.has(key)) vino++
      else if (setJustif.has(key)) justificada++
      else falto++
    })
    const pct = totalDiasTrabajo > 0 ? Math.round((vino / totalDiasTrabajo) * 100) : 0
    return { id: emp.id, nombre: emp.nombre, primerNombre: emp.nombre.split(' ')[0], vino, falto, justificada, pct }
  }).sort((a, b) => b.pct - a.pct)
  const pctEquipo = asistenciaPorEmpleado.length > 0
    ? Math.round(asistenciaPorEmpleado.reduce((s, e) => s + e.pct, 0) / asistenciaPorEmpleado.length) : 0
  const totalFaltas = asistenciaPorEmpleado.reduce((s, e) => s + e.falto, 0)
  const costoNominaMes = pagosNomina.reduce((s, p) => s + (parseFloat(p.total_bruto) || 0), 0)
  const pagosRealizados = pagosNomina.length

  const maxSobrante = Math.max(1, ...sobrantePorSemana.map(s => s.pct))
  const maxEntroSalio = Math.max(1, facturacionMes, gastoMes)

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

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        <div style={{
          background: esTropical ? `linear-gradient(135deg, ${MORADO.claro} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${MORADO.bg}25 0%, ${MORADO.bg}10 100%)`,
          border: esTropical ? `1.5px solid ${MORADO.bg}` : `1px solid ${MORADO.bg}55`,
          borderRadius: '18px', padding: '20px 24px', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: esTropical ? MORADO.bg : `${MORADO.bg}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>📊</div>
          <div>
            <div style={{ fontSize: '10px', color: esTropical ? MORADO.c : `${MORADO.bg}CC`, letterSpacing: '1.5px', fontWeight: 600 }}>ANÁLISIS</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? MORADO.dark : 'var(--color-text-primary)', lineHeight: 1.2 }}>Estadísticas</div>
            <div style={{ fontSize: '12px', color: esTropical ? MORADO.c : `${MORADO.bg}CC`, marginTop: '4px', fontWeight: 500 }}>En qué pie estamos parados</div>
          </div>
        </div>

        <div style={{
          background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
          borderRadius: '14px', padding: '14px 20px', marginBottom: '16px', boxShadow: 'var(--modulo-sombra)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
        }}>
          <button onClick={() => cambiarMes(-1)} style={btnFlecha()}>←</button>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', minWidth: '160px', textAlign: 'center' }}>{MESES[mes]} {anio}</span>
          <button onClick={() => cambiarMes(1)} style={btnFlecha()}>→</button>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <Pestana activa={tab === 'produccion'} onClick={() => setTab('produccion')} emoji="🍽️" texto="Producción" />
          <Pestana activa={tab === 'finanzas'} onClick={() => setTab('finanzas')} emoji="💰" texto="Finanzas" />
          <Pestana activa={tab === 'personal'} onClick={() => setTab('personal')} emoji="👥" texto="Personal" />
        </div>

        {/* PRODUCCIÓN */}
        {tab === 'produccion' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <KpiCard label="Raciones del mes" valor={fmt(totalRacionesMes)} colorBorde={VERDE} />
              <KpiCard label="Días operados" valor={diasOperados} sublabel="con producción" colorBorde={MORADO.bg} />
              <KpiCard label="Menús distintos" valor={analisisMenu.length} sublabel="cocinados" colorBorde={AZUL} />
            </div>

            <Seccion titulo="Producción por día" badge="por día">
              {totalRacionesMes === 0 ? <Vacio texto="No hay producción registrada este mes." /> : (
                <Grafica alto={220}>
                  {(w, h) => (
                    <AreaChart width={w} height={h} data={racionesPorDia} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gradRaciones" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={MORADO.bg} stopOpacity={0.8} />
                          <stop offset="100%" stopColor={MORADO.bg} stopOpacity={0.05} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={colorGrid} vertical={false} />
                      <XAxis dataKey="dia" stroke={colorEje} fontSize={11} tickLine={false} axisLine={false} />
                      <YAxis stroke={colorEje} fontSize={11} tickLine={false} axisLine={false} width={40} />
                      <Tooltip content={<TooltipRaciones />} />
                      <Area type="monotone" dataKey="raciones" stroke={MORADO.bg} strokeWidth={2.5} fill="url(#gradRaciones)" />
                    </AreaChart>
                  )}
                </Grafica>
              )}
            </Seccion>

            <Seccion titulo="Análisis por menú" badge="lo más importante" badgeColor={MORADO}>
              <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 16px', lineHeight: 1.5 }}>
                Cada menú usa ingredientes distintos. Aquí ves cuál te deja más ganancia y cuál te cuesta más.
              </p>
              {analisisMenu.length === 0 ? <Vacio texto="No hay menús con producción este mes." /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {analisisMenu.map(m => {
                    const c = m.margenPct >= 30 ? VERDE : m.margenPct >= 20 ? AMBAR : ROJO
                    return (
                      <div key={m.recetaId} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                        <div style={{ fontSize: '26px' }}>{m.emoji}</div>
                        <div style={{ flex: 1, minWidth: '160px' }}>
                          <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{m.nombre}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            cocinado {m.veces} {m.veces === 1 ? 'vez' : 'veces'} · {fmt(m.raciones)} raciones · costo RD$ {m.costoRacion.toFixed(2)}/ración
                          </div>
                        </div>
                        <div style={{ textAlign: 'right', minWidth: '110px' }}>
                          <div style={{ fontSize: '15px', fontWeight: 600, color: c }}>{m.margenPct}% margen</div>
                          <div style={{ width: '100px', height: '5px', background: 'var(--color-border-subtle)', borderRadius: '3px', marginTop: '5px', marginLeft: 'auto', overflow: 'hidden' }}>
                            <div style={{ width: `${Math.max(0, Math.min(100, m.margenPct))}%`, height: '100%', background: c }} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Seccion>

            <Seccion titulo="Sobrante / merma" badge="por semana">
              {sobrantePorSemana.length === 0 || sobrantePorSemana.every(s => s.cocido === 0) ? <Vacio texto="No hay datos de pesaje cocido/sobrante este mes." /> : (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', height: '170px', paddingTop: '10px' }}>
                  {sobrantePorSemana.map(s => {
                    const color = s.pct >= 5 ? ROJO : s.pct >= 4 ? AMBAR : VERDE
                    return (
                      <div key={s.semana} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', height: '100%' }}>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', maxWidth: '60px' }}>
                          <div title={`${s.semana}: ${s.sobrante} lb de ${s.cocido} lb`}
                            style={{ width: '100%', height: `${(s.pct / maxSobrante) * 100}%`, minHeight: '4px', background: color, borderRadius: '6px 6px 0 0', transition: 'height 0.5s ease' }} />
                        </div>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)', textAlign: 'center' }}>{s.semana}<br /><strong style={{ color }}>{s.pct}%</strong></span>
                      </div>
                    )
                  })}
                </div>
              )}
            </Seccion>
          </div>
        )}

        {/* FINANZAS */}
        {tab === 'finanzas' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <KpiCard label="Entró (facturado)" valor={fmtRD(facturacionMes)} sublabel="ventas a INABIE" colorBorde={VERDE} colorTexto={esTropical ? '#04342C' : '#5DCAA5'} />
              <KpiCard label="Salió (gastos)" valor={fmtRD(gastoMes)} sublabel="gastos del mes" colorBorde={ROJO} colorTexto={esTropical ? '#A32D2D' : '#F4C0D1'} />
              <KpiCard label="Quedó (neto)" valor={fmtRD(margenNeto)} sublabel={`${margenNetoPct}% de lo facturado`} colorBorde={margenNeto >= 0 ? MORADO.bg : ROJO} colorTexto={margenNeto >= 0 ? (esTropical ? MORADO.dark : MORADO.bg) : (esTropical ? '#A32D2D' : '#F4C0D1')} />
            </div>

            <Seccion titulo="Entró vs Salió" badge="este mes">
              {facturacionMes === 0 && gastoMes === 0 ? <Vacio texto="No hay movimientos financieros este mes." /> : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '40px', height: '180px', paddingTop: '10px' }}>
                    <BarraVertical label="Entró" monto={facturacionMes} max={maxEntroSalio} color={VERDE} />
                    <BarraVertical label="Salió" monto={gastoMes} max={maxEntroSalio} color={ROJO} />
                  </div>
                  <div style={{ borderTop: '1px solid var(--color-border-subtle)', paddingTop: '14px', marginTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{margenNeto >= 0 ? '✅ Ganancia neta' : '⚠️ Pérdida neta'}</span>
                    <span style={{ fontSize: '18px', fontWeight: 700, color: margenNeto >= 0 ? VERDE : ROJO }}>{fmtRD(margenNeto)}</span>
                  </div>
                </>
              )}
            </Seccion>

            <Seccion titulo="¿En qué se va el dinero?" badge="gasto por categoría" badgeColor={MORADO}>
              {gastoPorCategoria.length === 0 ? <Vacio texto="No hay gastos registrados este mes." /> : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <div style={{ width: 200, height: 200 }}>
                    <PieChart width={200} height={200}>
                      <Pie data={gastoPorCategoria} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={2}>
                        {gastoPorCategoria.map((c, i) => <Cell key={i} fill={c.color} />)}
                      </Pie>
                      <Tooltip content={<TooltipRD />} />
                    </PieChart>
                  </div>
                  <div style={{ flex: 1, minWidth: '220px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {gastoPorCategoria.map(c => (
                      <div key={c.cid} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <span style={{ width: '12px', height: '12px', borderRadius: '3px', background: c.color, flexShrink: 0 }} />
                        <span style={{ fontSize: '13px', color: 'var(--color-text-primary)', flex: 1 }}>{c.icono} {c.name}</span>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{fmtRD(c.monto)}</span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', minWidth: '34px', textAlign: 'right' }}>{c.pct}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Seccion>

            {facturacionMes > 0 && gastoMes > 0 && (
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.6, padding: '0 4px' }}>
                💡 De cada RD$ 100 que facturaste, gastaste RD$ {Math.round((gastoMes / facturacionMes) * 100)} y te quedaron RD$ {Math.round((margenNeto / facturacionMes) * 100)}.
              </div>
            )}
          </div>
        )}

        {/* PERSONAL */}
        {tab === 'personal' && (
          <div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <KpiCard label="Asistencia del equipo" valor={`${pctEquipo}%`} sublabel="promedio del mes" colorBorde={pctEquipo >= 90 ? VERDE : pctEquipo >= 75 ? AMBAR : ROJO} colorTexto={pctEquipo >= 90 ? (esTropical ? '#04342C' : '#5DCAA5') : pctEquipo >= 75 ? (esTropical ? '#854F0B' : '#FAC775') : (esTropical ? '#A32D2D' : '#F4C0D1')} />
              <KpiCard label="Faltas del mes" valor={fmt(totalFaltas)} sublabel="sin justificar" colorBorde={ROJO} />
              <KpiCard label="Días con trabajo" valor={totalDiasTrabajo} sublabel="se esperó asistencia" colorBorde={MORADO.bg} />
            </div>

            <Seccion titulo="Asistencia por empleado" badge="este mes" badgeColor={MORADO}>
              {totalDiasTrabajo === 0 ? <Vacio texto="No hubo días de trabajo registrados este mes." />
                : asistenciaPorEmpleado.length === 0 ? <Vacio texto="No hay empleados activos." /> : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {asistenciaPorEmpleado.map(e => {
                    const color = e.pct >= 90 ? VERDE : e.pct >= 75 ? AMBAR : ROJO
                    return (
                      <div key={e.id}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{e.primerNombre}</span>
                          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                            {e.vino} vino{e.falto > 0 && <span style={{ color: ROJO }}> · {e.falto} faltó</span>}{e.justificada > 0 && <span style={{ color: AMBAR }}> · {e.justificada} just.</span>}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{ flex: 1, height: '12px', background: 'var(--color-border-subtle)', borderRadius: '6px', overflow: 'hidden' }}>
                            <div style={{ width: `${e.pct}%`, height: '100%', background: color, borderRadius: '6px', transition: 'width 0.5s ease' }} />
                          </div>
                          <span style={{ fontSize: '13px', fontWeight: 600, color, minWidth: '42px', textAlign: 'right' }}>{e.pct}%</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </Seccion>

            <Seccion titulo="Costo de nómina" badge="pagado este mes">
              {pagosRealizados === 0 ? <Vacio texto="No hay pagos de nómina registrados este mes." /> : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{fmtRD(costoNominaMes)}</div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>en {pagosRealizados} {pagosRealizados === 1 ? 'pago' : 'pagos'} de nómina este mes</div>
                  </div>
                  {facturacionMes > 0 && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '20px', fontWeight: 600, color: MORADO.bg }}>{Math.round((costoNominaMes / facturacionMes) * 100)}%</div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>de lo facturado</div>
                    </div>
                  )}
                </div>
              )}
            </Seccion>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── Barra vertical a mano (para Entró vs Salió) ───
function BarraVertical({ label, monto, max, color }) {
  const pct = max > 0 ? (monto / max) * 100 : 0
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', height: '100%', flex: 1, maxWidth: '120px' }}>
      <div style={{ fontSize: '13px', fontWeight: 700, color }}>{fmtRD(monto)}</div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', width: '100%', maxWidth: '90px' }}>
        <div style={{ width: '100%', height: `${pct}%`, minHeight: '6px', background: color, borderRadius: '8px 8px 0 0', transition: 'height 0.6s ease' }} />
      </div>
      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-secondary)' }}>{label}</span>
    </div>
  )
}

// ─── Tooltips (solo para área y dona) ───
function cajaTooltip(children) {
  return <div style={{ background: 'rgba(20,18,38,0.95)', border: '1px solid rgba(127,119,221,0.4)', borderRadius: '10px', padding: '10px 12px', fontSize: '12px', color: '#fff' }}>{children}</div>
}
function TooltipRaciones({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return cajaTooltip(<><div style={{ fontWeight: 600 }}>Día {label}</div><div>{fmt(payload[0].value)} raciones</div></>)
}
function TooltipRD({ active, payload }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return cajaTooltip(<><div style={{ fontWeight: 600 }}>{d.name}</div><div>{fmtRD(d.monto ?? d.value)}</div>{d.pct != null && <div style={{ opacity: 0.7 }}>{d.pct}% del total</div>}</>)
}

// ─── Subcomponentes ───
function Pestana({ activa, onClick, emoji, texto }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', alignItems: 'center', gap: '7px', padding: '10px 18px', borderRadius: '12px',
      background: activa ? MORADO.bg : 'var(--color-bg-elevated)', border: activa ? 'none' : '1px solid var(--color-border-subtle)',
      color: activa ? '#fff' : 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
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
        {badge && <span style={{ fontSize: '11px', padding: '3px 9px', borderRadius: '8px', background: badgeColor ? badgeColor.claro : 'var(--color-bg-elevated)', color: badgeColor ? badgeColor.dark : 'var(--color-text-muted)', fontWeight: 500 }}>{badge}</span>}
      </div>
      <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '14px', padding: '18px', boxShadow: 'var(--modulo-sombra)' }}>
        {children}
      </div>
    </div>
  )
}
function KpiCard({ label, valor, sublabel, colorBorde, colorTexto }) {
  return (
    <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderLeft: `4px solid ${colorBorde}`, borderRadius: '12px', padding: '14px', boxShadow: 'var(--modulo-sombra)' }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '24px', fontWeight: 600, color: colorTexto || 'var(--color-text-primary)' }}>{valor}</div>
      {sublabel && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sublabel}</div>}
    </div>
  )
}
function Vacio({ texto }) {
  return <div style={{ textAlign: 'center', padding: '24px' }}><div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>📭</div><p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>{texto}</p></div>
}
function ToggleTema({ tema, setTema }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '3px', gap: '2px' }}>
      <button onClick={() => setTema('oscuro')} style={tabTemaStyle(tema === 'oscuro')}><span style={{ fontSize: '11px' }}>🌙</span><span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span></button>
      <button onClick={() => setTema('tropical')} style={tabTemaStyle(tema === 'tropical')}><span style={{ fontSize: '11px' }}>☀️</span><span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span></button>
    </div>
  )
}
function btnVolver() { return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' } }
function btnFlecha() { return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', padding: '8px 16px', color: 'var(--color-text-primary)', fontSize: '16px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' } }
function tabTemaStyle(activo) { return { background: activo ? 'var(--gradient-toggle-active)' : 'transparent', border: 'none', borderRadius: '16px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' } }

export default VistaEstadisticas