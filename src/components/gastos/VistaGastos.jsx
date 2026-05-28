import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalNuevoGasto from './ModalNuevoGasto'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const COLOR_GASTOS = '#D4537E'
const COLOR_GASTOS_BG = '#ED93B1'
const COLOR_GASTOS_DARKER = '#72243E'
const COLOR_GASTOS_CLARO = '#FBEAF0'

const ORIGENES_INFO = {
  manual: { emoji: '✋', label: 'Manual', color: '#888780', descripcion: 'Registrado manualmente' },
  nomina_pago: { emoji: '💸', label: 'Nómina', color: '#378ADD', descripcion: 'Generado desde pago de nómina' },
  nomina_bonificacion: { emoji: '🎁', label: 'Bonificación', color: '#7F77DD', descripcion: 'Generado desde bonificación' },
  nomina_liquidacion: { emoji: '📋', label: 'Liquidación', color: '#534AB7', descripcion: 'Generado desde liquidación de empleado' },
  compra_inventario: { emoji: '📦', label: 'Compra', color: '#EF9F27', descripcion: 'Generado desde compra de inventario' },
}

function VistaGastos({ usuario, empresaId, onVolver }) {
  const [gastos, setGastos] = useState([])
  const [categorias, setCategorias] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroBusqueda, setFiltroBusqueda] = useState('')
  const [filtroPagado, setFiltroPagado] = useState('todos')
  const [filtroOrigen, setFiltroOrigen] = useState('todos')
  const [modalAbierto, setModalAbierto] = useState(false)
  const [gastoEditando, setGastoEditando] = useState(null)

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const esTropical = tema === 'tropical'

  useEffect(() => { if (empresaId) cargarDatos() }, [empresaId, mes, anio])

  async function cargarDatos() {
    setCargando(true)
    const inicioMes = new Date(anio, mes, 1).toISOString().split('T')[0]
    const finMes = new Date(anio, mes + 1, 0).toISOString().split('T')[0]
    const [gastosRes, catRes, provRes] = await Promise.all([
      supabase.from('gastos').select('*').eq('empresa_id', empresaId).gte('fecha', inicioMes).lte('fecha', finMes).order('fecha', { ascending: false }),
      supabase.from('categorias_gasto').select('*').eq('empresa_id', empresaId).eq('activa', true).order('orden'),
      supabase.from('proveedores').select('*').eq('empresa_id', empresaId)
    ])
    setGastos(gastosRes.data || [])
    setCategorias(catRes.data || [])
    setProveedores(provRes.data || [])
    setCargando(false)
  }

  function getCategoria(catId) { return categorias.find(c => c.id === catId) }
  function getProveedor(provId) { return proveedores.find(p => p.id === provId) }
  function esAutomatico(gasto) { return gasto.origen && gasto.origen !== 'manual' && gasto.origen !== null }
  function getOrigenInfo(gasto) {
    const origen = gasto.origen || 'manual'
    return ORIGENES_INFO[origen] || ORIGENES_INFO.manual
  }

  const gastosFiltrados = gastos.filter(g => {
    if (filtroCategoria && g.categoria_id !== filtroCategoria) return false
    if (filtroPagado === 'pagado' && !g.pagado) return false
    if (filtroPagado === 'pendiente' && g.pagado) return false
    if (filtroOrigen === 'manual' && esAutomatico(g)) return false
    if (filtroOrigen === 'automatico' && !esAutomatico(g)) return false
    if (filtroBusqueda.trim()) {
      const q = filtroBusqueda.toLowerCase()
      const enDescripcion = g.descripcion?.toLowerCase().includes(q)
      const enProveedor = g.proveedor_nombre?.toLowerCase().includes(q)
      const prov = getProveedor(g.proveedor_id)
      const enProveedorBD = prov?.nombre?.toLowerCase().includes(q)
      const enRnc = g.rnc?.toLowerCase().includes(q)
      if (!enDescripcion && !enProveedor && !enProveedorBD && !enRnc) return false
    }
    return true
  })

  const totalMes = gastosFiltrados.reduce((sum, g) => sum + parseFloat(g.total || 0), 0)
  const totalPagado = gastosFiltrados.filter(g => g.pagado).reduce((sum, g) => sum + parseFloat(g.total || 0), 0)
  const totalPendiente = totalMes - totalPagado
  const cantidadGastos = gastosFiltrados.length
  const conRncCount = gastosFiltrados.filter(g => g.con_rnc).length
  const automaticosCount = gastosFiltrados.filter(g => esAutomatico(g)).length
  const automaticosMonto = gastosFiltrados.filter(g => esAutomatico(g)).reduce((sum, g) => sum + parseFloat(g.total || 0), 0)

  const gastosPorCategoria = categorias.map(cat => {
    const items = gastosFiltrados.filter(g => g.categoria_id === cat.id)
    const total = items.reduce((sum, g) => sum + parseFloat(g.total || 0), 0)
    return { ...cat, cantidad: items.length, total }
  }).filter(c => c.total > 0).sort((a, b) => b.total - a.total)

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando gastos...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
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
        </div>

        {/* TÍTULO */}
        <div style={{
          background: esTropical ? `linear-gradient(135deg, ${COLOR_GASTOS_CLARO} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${COLOR_GASTOS}25 0%, ${COLOR_GASTOS}10 100%)`,
          border: esTropical ? `1.5px solid ${COLOR_GASTOS_BG}` : `1px solid ${COLOR_GASTOS}55`,
          borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between', flexWrap: 'wrap',
          boxShadow: esTropical ? `0 2px 12px ${COLOR_GASTOS}15` : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px',
              background: esTropical ? COLOR_GASTOS : `${COLOR_GASTOS}30`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
              boxShadow: esTropical ? `0 4px 12px ${COLOR_GASTOS}40` : 'none',
            }}>💸</div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? COLOR_GASTOS_DARKER : 'var(--color-text-primary)', lineHeight: 1.2 }}>
                Gastos Operativos
              </div>
              <div style={{ fontSize: '12px', color: esTropical ? COLOR_GASTOS : `${COLOR_GASTOS}CC`, marginTop: '4px', fontWeight: 500 }}>
                {MESES[mes]} {anio} · {cantidadGastos} registros
              </div>
            </div>
          </div>
          <button
            onClick={() => { setGastoEditando(null); setModalAbierto(true); }}
            style={{
              padding: '12px 24px',
              background: `linear-gradient(135deg, ${COLOR_GASTOS} 0%, ${COLOR_GASTOS_DARKER} 100%)`,
              border: 'none', borderRadius: '12px',
              color: 'white', fontSize: '14px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              boxShadow: `0 4px 12px ${COLOR_GASTOS}40`,
            }}
          >
            ➕ Nuevo gasto
          </button>
        </div>

        {/* SELECTORES MES/AÑO */}
        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))} style={selectStyle()}>
            {MESES.map((m, i) => (<option key={i} value={i}>{m}</option>))}
          </select>
          <select value={anio} onChange={(e) => setAnio(parseInt(e.target.value))} style={selectStyle()}>
            {[2025, 2026, 2027, 2028].map(a => (<option key={a} value={a}>{a}</option>))}
          </select>
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <KpiCard label="TOTAL MES" valor={`RD$ ${totalMes.toLocaleString('es-DO', { maximumFractionDigits: 0 })}`} sublabel={`${cantidadGastos} gastos`} colorBorde={COLOR_GASTOS} colorTexto={esTropical ? COLOR_GASTOS_DARKER : 'var(--color-text-primary)'} />
          <KpiCard label="PAGADO" valor={`RD$ ${totalPagado.toLocaleString('es-DO', { maximumFractionDigits: 0 })}`} sublabel="ya saldado" colorBorde="#1D9E75" colorTexto={esTropical ? '#04342C' : '#5DCAA5'} />
          <KpiCard label="PENDIENTE" valor={`RD$ ${totalPendiente.toLocaleString('es-DO', { maximumFractionDigits: 0 })}`} sublabel="por pagar" colorBorde={totalPendiente > 0 ? '#BA7517' : '#888780'} colorTexto={totalPendiente > 0 ? (esTropical ? '#854F0B' : '#FAC775') : 'var(--color-text-muted)'} />
          <KpiCard label="CON RNC" valor={conRncCount} sublabel="para 606 DGII" colorBorde="#534AB7" colorTexto={esTropical ? '#3C3489' : '#AFA9EC'} />
          <KpiCard label="🔗 AUTOMÁTICOS" valor={automaticosCount} sublabel={`RD$ ${automaticosMonto.toLocaleString('es-DO', { maximumFractionDigits: 0 })}`} colorBorde="#378ADD" colorTexto={esTropical ? '#0C447C' : '#85B7EB'} />
        </div>

        {/* DESGLOSE POR CATEGORÍA */}
        {gastosPorCategoria.length > 0 && (
          <div style={{
            background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
            borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '14px' }}>
              📊 DESGLOSE POR CATEGORÍA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {gastosPorCategoria.map(cat => {
                const porcentaje = totalMes > 0 ? (cat.total / totalMes) * 100 : 0
                return (
                  <div key={cat.id} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '22px', width: '32px' }}>{cat.icono}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{cat.nombre}</div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)', fontFamily: 'monospace' }}>
                          RD$ {cat.total.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ flex: 1, background: 'var(--color-bg-elevated)', borderRadius: '8px', height: '6px', overflow: 'hidden' }}>
                          <div style={{ background: COLOR_GASTOS, height: '100%', width: `${porcentaje}%` }} />
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', width: '40px', textAlign: 'right' }}>{porcentaje.toFixed(0)}%</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', width: '60px', textAlign: 'right' }}>{cat.cantidad} items</div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* FILTROS */}
        <div style={{
          background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
          borderRadius: '12px', padding: '14px', marginBottom: '12px',
          display: 'flex', flexWrap: 'wrap', gap: '10px',
          boxShadow: 'var(--modulo-sombra)',
        }}>
          <input
            type="text" value={filtroBusqueda} onChange={(e) => setFiltroBusqueda(e.target.value)}
            placeholder="🔍 Buscar gasto..."
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }}
          />
          <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={selectStyle()}>
            <option value="">Todas las categorías</option>
            {categorias.map(c => (<option key={c.id} value={c.id}>{c.icono} {c.nombre}</option>))}
          </select>
          <select value={filtroPagado} onChange={(e) => setFiltroPagado(e.target.value)} style={selectStyle()}>
            <option value="todos">Todos los estados</option>
            <option value="pagado">✅ Pagados</option>
            <option value="pendiente">⏰ Pendientes</option>
          </select>
          <select value={filtroOrigen} onChange={(e) => setFiltroOrigen(e.target.value)} style={selectStyle()}>
            <option value="todos">Todos los orígenes</option>
            <option value="manual">✋ Solo manuales</option>
            <option value="automatico">🔗 Solo automáticos</option>
          </select>
        </div>

        {/* TABLA */}
        <div style={{
          background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
          borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--modulo-sombra)',
        }}>
          {gastosFiltrados.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>💸</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
                {gastos.length === 0 ? 'Sin gastos en este mes' : 'Sin resultados'}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>
                {gastos.length === 0 ? 'Comienza registrando los gastos operativos del mes.' : 'Ajusta los filtros para ver más gastos.'}
              </div>
              {gastos.length === 0 && (
                <button
                  onClick={() => { setGastoEditando(null); setModalAbierto(true); }}
                  style={{
                    padding: '12px 24px',
                    background: `linear-gradient(135deg, ${COLOR_GASTOS} 0%, ${COLOR_GASTOS_DARKER} 100%)`,
                    border: 'none', borderRadius: '10px',
                    color: 'white', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  ➕ Registrar primer gasto
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <tr>
                    <Th>FECHA</Th>
                    <Th>CATEGORÍA</Th>
                    <Th>DESCRIPCIÓN</Th>
                    <Th>PROVEEDOR</Th>
                    <Th align="right">MONTO</Th>
                    <Th align="center">RNC</Th>
                    <Th align="center">ORIGEN</Th>
                    <Th align="center">ESTADO</Th>
                    <Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {gastosFiltrados.map(g => {
                    const cat = getCategoria(g.categoria_id)
                    const prov = getProveedor(g.proveedor_id)
                    const fechaFormat = new Date(g.fecha + 'T12:00:00').toLocaleDateString('es-DO', { day: '2-digit', month: 'short' })
                    const auto = esAutomatico(g)
                    const origenInfo = getOrigenInfo(g)
                    return (
                      <tr key={g.id} style={{
                        background: auto ? (esTropical ? '#F0F7FE' : 'rgba(55, 138, 221, 0.05)') : 'transparent',
                        borderBottom: '1px solid var(--color-border-subtle)',
                      }}>
                        <Td><span style={{ fontFamily: 'monospace' }}>{fechaFormat}</span></Td>
                        <Td>{cat ? <span>{cat.icono} {cat.nombre}</span> : <span style={{ color: 'var(--color-text-muted)', fontSize: '11px' }}>Sin categoría</span>}</Td>
                        <Td>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{g.descripcion}</div>
                          {g.notas && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{g.notas}</div>}
                        </Td>
                        <Td>
                          {prov ? <span style={{ fontSize: '12px' }}>{prov.nombre}</span>
                            : g.proveedor_nombre ? <span style={{ fontSize: '12px', fontStyle: 'italic', color: 'var(--color-text-secondary)' }}>{g.proveedor_nombre}</span>
                            : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </Td>
                        <Td align="right">
                          <div style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                            RD$ {parseFloat(g.total).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </div>
                          {g.aplica_itbis && <div style={{ fontSize: '10px', color: '#BA7517' }}>incl. ITBIS</div>}
                        </Td>
                        <Td align="center">
                          {g.con_rnc ? (
                            <div>
                              <BadgeStatus emoji="🧾" label={g.tipo_ncf} color="#534AB7" />
                              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px', fontFamily: 'monospace' }}>{g.rnc}</div>
                            </div>
                          ) : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </Td>
                        <Td align="center">
                          {auto ? <BadgeStatus emoji="🔗" label={origenInfo.label} color={origenInfo.color} />
                            : <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>✋ Manual</span>}
                        </Td>
                        <Td align="center">
                          {g.pagado
                            ? <BadgeStatus emoji="✅" label="Pagado" color="#1D9E75" />
                            : <BadgeStatus emoji="⏰" label="Pendiente" color="#BA7517" />}
                        </Td>
                        <Td align="center">
                          {auto ? (
                            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }} title="Generado automáticamente">🔒 Auto</span>
                          ) : (
                            <button
                              onClick={() => { setGastoEditando(g); setModalAbierto(true); }}
                              style={{
                                fontSize: '11px', color: '#378ADD',
                                background: esTropical ? '#E6F1FB' : 'rgba(55, 138, 221, 0.15)',
                                border: 'none', borderRadius: '6px',
                                padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600,
                              }}
                            >
                              ✏️ Editar
                            </button>
                          )}
                        </Td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {modalAbierto && (
        <ModalNuevoGasto
          empresaId={empresaId} usuario={usuario}
          categorias={categorias} proveedores={proveedores}
          gastoEditando={gastoEditando}
          onCerrar={() => setModalAbierto(false)}
          onGuardado={() => { cargarDatos(); setModalAbierto(false) }}
          onCategoriaCreada={(nueva) => setCategorias([...categorias, nueva])}
          onProveedorCreado={(nuevo) => setProveedores([...proveedores, nuevo])}
        />
      )}
    </div>
  )
}

function KpiCard({ label, valor, sublabel, colorBorde, colorTexto }) {
  return (
    <div style={{
      background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
      borderLeft: `4px solid ${colorBorde}`,
      borderRadius: '12px', padding: '14px', boxShadow: 'var(--modulo-sombra)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '1px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 600, color: colorTexto || 'var(--color-text-primary)' }}>{valor}</div>
      {sublabel && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sublabel}</div>}
    </div>
  )
}

function Th({ children, align = 'left' }) {
  return (
    <th style={{
      padding: '12px 14px', textAlign: align,
      fontSize: '10px', fontWeight: 600,
      color: 'var(--color-text-muted)',
      letterSpacing: '1px',
    }}>{children}</th>
  )
}

function Td({ children, align = 'left' }) {
  return (
    <td style={{ padding: '12px 14px', textAlign: align, fontSize: '12px', color: 'var(--color-text-primary)' }}>{children}</td>
  )
}

function BadgeStatus({ emoji, label, color }) {
  return (
    <span style={{
      fontSize: '10px', fontWeight: 600,
      padding: '4px 8px', borderRadius: '8px',
      background: `${color}25`, color,
      whiteSpace: 'nowrap',
    }}>
      {emoji} {label}
    </span>
  )
}

function selectStyle() {
  return {
    padding: '8px 12px',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px', color: 'var(--color-text-primary)',
    fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
  }
}

function tabTemaStyle(activo) {
  return {
    background: activo ? 'var(--gradient-toggle-active)' : 'transparent',
    border: 'none', borderRadius: '16px', padding: '6px 10px',
    display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
  }
}

export default VistaGastos