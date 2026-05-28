import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalNuevaCompra from './ModalNuevaCompra'

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
const COLOR_INV = '#EF9F27'
const COLOR_INV_BG = '#FAC775'
const COLOR_INV_DARKER = '#633806'
const COLOR_INV_CLARO = '#FAEEDA'

const METODOS_PAGO = {
  efectivo: { label: 'Efectivo', emoji: '💵' },
  transferencia: { label: 'Transferencia', emoji: '🏦' },
  cheque: { label: 'Cheque', emoji: '📝' },
  tarjeta: { label: 'Tarjeta', emoji: '💳' },
  credito: { label: 'Crédito', emoji: '⏰' },
}

function VistaCompras({ usuario, empresaId, onVolver }) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [compras, setCompras] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalNueva, setModalNueva] = useState(false)
  const [filtroProveedor, setFiltroProveedor] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('todas')
  const [filtroRNC, setFiltroRNC] = useState('todas')

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'

  useEffect(() => { if (empresaId) cargarDatos() }, [empresaId, mes, anio])

  async function cargarDatos() {
    setCargando(true)
    const { data: provData } = await supabase.from('proveedores').select('*').eq('empresa_id', empresaId).or('activo.eq.true,activo.is.null').order('nombre')
    setProveedores(provData || [])
    const inicioMes = new Date(anio, mes, 1).toISOString().split('T')[0]
    const finMes = new Date(anio, mes + 1, 0).toISOString().split('T')[0]
    const { data: comprasData } = await supabase.from('compras').select('*').eq('empresa_id', empresaId).gte('fecha', inicioMes).lte('fecha', finMes).order('fecha', { ascending: false }).order('created_at', { ascending: false })
    setCompras(comprasData || [])
    setCargando(false)
  }

  function getProveedor(pid) { return proveedores.find(p => p.id === pid) }

  const comprasFiltradas = compras.filter(c => {
    if (filtroProveedor && c.proveedor_id !== filtroProveedor) return false
    if (filtroEstado === 'pagadas' && !c.pagada) return false
    if (filtroEstado === 'pendientes' && c.pagada) return false
    if (filtroRNC === 'con_rnc' && !c.con_rnc) return false
    if (filtroRNC === 'sin_rnc' && c.con_rnc) return false
    return true
  })

  const totalMes = comprasFiltradas.reduce((sum, c) => sum + parseFloat(c.total || 0), 0)
  const totalPagado = comprasFiltradas.filter(c => c.pagada).reduce((sum, c) => sum + parseFloat(c.total || 0), 0)
  const totalPendiente = totalMes - totalPagado
  const totalConRNC = comprasFiltradas.filter(c => c.con_rnc).reduce((sum, c) => sum + parseFloat(c.total || 0), 0)

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        <Titulo emoji="📦" titulo="Compras a Proveedores" subtitulo={`${MESES[mes]} ${anio} · ${comprasFiltradas.length} compras`} color={COLOR_INV} colorBg={COLOR_INV_BG} colorDarker={COLOR_INV_DARKER} colorClaro={COLOR_INV_CLARO} esTropical={esTropical} accion={{ label: '➕ Nueva compra', onClick: () => setModalNueva(true) }} />

        <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))} style={selectStyle()}>
            {MESES.map((m, i) => (<option key={i} value={i}>{m}</option>))}
          </select>
          <select value={anio} onChange={(e) => setAnio(parseInt(e.target.value))} style={selectStyle()}>
            {[2024, 2025, 2026, 2027, 2028].map(a => (<option key={a} value={a}>{a}</option>))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <KpiCard label="TOTAL DEL MES" valor={`RD$ ${totalMes.toLocaleString('es-DO', { maximumFractionDigits: 0 })}`} sublabel={`${comprasFiltradas.length} compras`} colorBorde={COLOR_INV} colorTexto={esTropical ? COLOR_INV_DARKER : 'var(--color-text-primary)'} />
          <KpiCard label="PAGADAS" valor={`RD$ ${totalPagado.toLocaleString('es-DO', { maximumFractionDigits: 0 })}`} sublabel={`${comprasFiltradas.filter(c => c.pagada).length} pagadas`} colorBorde="#1D9E75" colorTexto={esTropical ? '#04342C' : '#5DCAA5'} />
          <KpiCard label="PENDIENTES" valor={`RD$ ${totalPendiente.toLocaleString('es-DO', { maximumFractionDigits: 0 })}`} sublabel={`${comprasFiltradas.filter(c => !c.pagada).length} pendientes`} colorBorde={totalPendiente > 0 ? '#BA7517' : '#888780'} colorTexto={totalPendiente > 0 ? (esTropical ? '#854F0B' : '#FAC775') : 'var(--color-text-muted)'} />
          <KpiCard label="CON RNC (DGII)" valor={`RD$ ${totalConRNC.toLocaleString('es-DO', { maximumFractionDigits: 0 })}`} sublabel={`${comprasFiltradas.filter(c => c.con_rnc).length} con RNC`} colorBorde="#534AB7" colorTexto={esTropical ? '#3C3489' : '#AFA9EC'} />
        </div>

        <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '12px', padding: '14px', marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', boxShadow: 'var(--modulo-sombra)' }}>
          <select value={filtroProveedor} onChange={(e) => setFiltroProveedor(e.target.value)} style={{ ...selectStyle(), flex: 1, minWidth: '200px' }}>
            <option value="">Todos los proveedores</option>
            {proveedores.map(p => (<option key={p.id} value={p.id}>{p.nombre}</option>))}
          </select>
          <select value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)} style={selectStyle()}>
            <option value="todas">Todas</option>
            <option value="pagadas">✅ Pagadas</option>
            <option value="pendientes">⏰ Pendientes</option>
          </select>
          <select value={filtroRNC} onChange={(e) => setFiltroRNC(e.target.value)} style={selectStyle()}>
            <option value="todas">Con y sin RNC</option>
            <option value="con_rnc">🧾 Solo con RNC</option>
            <option value="sin_rnc">Sin RNC</option>
          </select>
        </div>

        <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--modulo-sombra)' }}>
          {cargando ? (
            <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>⏳ Cargando compras...</div>
          ) : comprasFiltradas.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>📦</div>
              <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '6px' }}>Sin compras registradas</div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '16px' }}>No hay compras en {MESES[mes]} {anio} con los filtros aplicados.</div>
              <button onClick={() => setModalNueva(true)} style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${COLOR_INV} 0%, ${COLOR_INV_DARKER} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                ➕ Registrar primera compra
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <tr>
                    <Th>FECHA</Th><Th>PROVEEDOR</Th><Th>FACTURA / NCF</Th>
                    <Th align="center">MODO</Th><Th align="right">TOTAL</Th>
                    <Th align="center">ESTADO</Th><Th align="center">RNC</Th>
                  </tr>
                </thead>
                <tbody>
                  {comprasFiltradas.map(compra => {
                    const proveedor = getProveedor(compra.proveedor_id)
                    const metodo = compra.metodo_pago ? METODOS_PAGO[compra.metodo_pago] : null
                    return (
                      <tr key={compra.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <Td><span style={{ fontFamily: 'monospace' }}>{new Date(compra.fecha + 'T12:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'short' })}</span></Td>
                        <Td>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{proveedor?.nombre || 'Sin proveedor'}</div>
                          {compra.categoria && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{compra.categoria}</div>}
                        </Td>
                        <Td>
                          {compra.numero_factura
                            ? <div style={{ fontFamily: 'monospace', fontSize: '11px' }}>{compra.numero_factura}</div>
                            : <div style={{ color: 'var(--color-text-muted)', fontStyle: 'italic', fontSize: '11px' }}>Sin factura</div>}
                          {compra.ncf && <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#378ADD' }}>NCF: {compra.ncf}</div>}
                        </Td>
                        <Td align="center">
                          <BadgeStatus emoji={compra.modo === 'detallado' ? '📋' : '⚡'} label={compra.modo === 'detallado' ? 'Detallada' : 'Rápida'} color={compra.modo === 'detallado' ? '#534AB7' : '#888780'} />
                        </Td>
                        <Td align="right">
                          <div style={{ fontWeight: 600, fontFamily: 'monospace', color: 'var(--color-text-primary)' }}>
                            RD$ {parseFloat(compra.total || 0).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </div>
                          {parseFloat(compra.itbis || 0) > 0 && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>ITBIS: RD$ {parseFloat(compra.itbis).toFixed(2)}</div>}
                        </Td>
                        <Td align="center">
                          {compra.pagada ? (
                            <div>
                              <BadgeStatus emoji="✅" label="Pagada" color="#1D9E75" />
                              {metodo && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{metodo.emoji} {metodo.label}</div>}
                            </div>
                          ) : <BadgeStatus emoji="⏰" label="Pendiente" color="#BA7517" />}
                        </Td>
                        <Td align="center">
                          {compra.con_rnc
                            ? <BadgeStatus emoji="🧾" label="Sí" color="#378ADD" />
                            : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
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

      {modalNueva && (
        <ModalNuevaCompra empresaId={empresaId} usuario={usuario} proveedores={proveedores} onCerrar={() => setModalNueva(false)} onGuardado={() => { cargarDatos(); setModalNueva(false) }} />
      )}
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

function Titulo({ emoji, titulo, subtitulo, color, colorBg, colorDarker, colorClaro, esTropical, accion }) {
  return (
    <div style={{
      background: esTropical ? `linear-gradient(135deg, ${colorClaro} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`,
      border: esTropical ? `1.5px solid ${colorBg}` : `1px solid ${color}55`,
      borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
      display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between', flexWrap: 'wrap',
      boxShadow: esTropical ? `0 2px 12px ${color}15` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: esTropical ? color : `${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: esTropical ? `0 4px 12px ${color}40` : 'none' }}>{emoji}</div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? colorDarker : 'var(--color-text-primary)', lineHeight: 1.2 }}>{titulo}</div>
          <div style={{ fontSize: '12px', color: esTropical ? color : `${color}CC`, marginTop: '4px', fontWeight: 500 }}>{subtitulo}</div>
        </div>
      </div>
      {accion && (
        <button onClick={accion.onClick} style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${color} 0%, ${colorDarker} 100%)`, border: 'none', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 12px ${color}40` }}>
          {accion.label}
        </button>
      )}
    </div>
  )
}

function KpiCard({ label, valor, sublabel, colorBorde, colorTexto }) {
  return (
    <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderLeft: `4px solid ${colorBorde}`, borderRadius: '12px', padding: '14px', boxShadow: 'var(--modulo-sombra)' }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 600, letterSpacing: '1px' }}>{label}</div>
      <div style={{ fontSize: '20px', fontWeight: 600, color: colorTexto || 'var(--color-text-primary)' }}>{valor}</div>
      {sublabel && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{sublabel}</div>}
    </div>
  )
}

function Th({ children, align = 'left' }) {
  return <th style={{ padding: '12px 14px', textAlign: align, fontSize: '10px', fontWeight: 600, color: 'var(--color-text-muted)', letterSpacing: '1px' }}>{children}</th>
}

function Td({ children, align = 'left' }) {
  return <td style={{ padding: '12px 14px', textAlign: align, fontSize: '12px', color: 'var(--color-text-primary)' }}>{children}</td>
}

function BadgeStatus({ emoji, label, color }) {
  return (
    <span style={{ fontSize: '10px', fontWeight: 600, padding: '4px 8px', borderRadius: '8px', background: `${color}25`, color, whiteSpace: 'nowrap' }}>
      {emoji} {label}
    </span>
  )
}

function btnVolver() {
  return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
}

function selectStyle() {
  return { padding: '8px 12px', background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }
}

function tabTemaStyle(activo) {
  return { background: activo ? 'var(--gradient-toggle-active)' : 'transparent', border: 'none', borderRadius: '16px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }
}

export default VistaCompras