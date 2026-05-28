import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalNuevoIngrediente from './ModalNuevoIngrediente'
import VistaListaCompras from './VistaListaCompras'
import { obtenerListaCompras } from '../../utils/calculosCompras'

const COLOR_INV = '#EF9F27'
const COLOR_INV_BG = '#FAC775'
const COLOR_INV_DARKER = '#633806'
const COLOR_INV_CLARO = '#FAEEDA'

function VistaIngredientes({ usuario, empresaId, onVolver }) {
  const [ingredientes, setIngredientes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [empresa, setEmpresa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [filtroStock, setFiltroStock] = useState('todos')
  const [modalNuevo, setModalNuevo] = useState(false)
  const [ingredienteEditando, setIngredienteEditando] = useState(null)
  const [mostrarListaCompras, setMostrarListaCompras] = useState(false)
  const [resumenCompras, setResumenCompras] = useState({ urgentes: 0, proximos: 0 })

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'

  useEffect(() => { if (empresaId) cargarDatos() }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    const { data: empData } = await supabase.from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empData)
    const { data: ingData } = await supabase.from('ingredientes').select('*').eq('empresa_id', empresaId).order('nombre')
    setIngredientes(ingData || [])
    const { data: provData } = await supabase.from('proveedores').select('*').eq('empresa_id', empresaId)
    setProveedores(provData || [])
    try {
      const { items } = await obtenerListaCompras(empresaId, 5, empData?.raciones_diarias_total || 1230)
      const urgentes = items.filter(i => i.urgencia === 'urgente').length
      const proximos = items.filter(i => i.urgencia === 'proximo').length
      setResumenCompras({ urgentes, proximos })
    } catch (err) { console.error('Error calculando resumen:', err) }
    setCargando(false)
  }

  function getProveedor(pid) { return proveedores.find(p => p.id === pid) }
  function getEstadoStock(ing) {
    const actual = parseFloat(ing.stock_actual || 0)
    const minimo = parseFloat(ing.stock_minimo || 0)
    if (actual <= 0) return 'sin_stock'
    if (minimo > 0 && actual <= minimo) return 'bajo'
    return 'con_stock'
  }

  const ingredientesFiltrados = ingredientes.filter(ing => {
    if (busqueda.trim() && !ing.nombre.toLowerCase().includes(busqueda.toLowerCase())) return false
    const estado = getEstadoStock(ing)
    if (filtroStock === 'bajo' && estado !== 'bajo') return false
    if (filtroStock === 'sin' && estado !== 'sin_stock') return false
    if (filtroStock === 'con' && estado !== 'con_stock') return false
    return true
  })

  const totalIngredientes = ingredientes.length
  const sinStock = ingredientes.filter(i => getEstadoStock(i) === 'sin_stock').length
  const stockBajo = ingredientes.filter(i => getEstadoStock(i) === 'bajo').length
  const valorInventario = ingredientes.reduce((sum, i) => sum + (parseFloat(i.stock_actual || 0) * parseFloat(i.ultimo_costo || 0)), 0)
  const totalAlertas = resumenCompras.urgentes + resumenCompras.proximos

  if (cargando) {
    return <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando ingredientes...</p></div>
  }

  if (mostrarListaCompras) {
    return <VistaListaCompras empresaId={empresaId} empresa={empresa} onVolver={() => { setMostrarListaCompras(false); cargarDatos() }} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        {/* TÍTULO + BOTONES */}
        <div style={{
          background: esTropical ? `linear-gradient(135deg, ${COLOR_INV_CLARO} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${COLOR_INV}25 0%, ${COLOR_INV}10 100%)`,
          border: esTropical ? `1.5px solid ${COLOR_INV_BG}` : `1px solid ${COLOR_INV}55`,
          borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
          boxShadow: esTropical ? `0 2px 12px ${COLOR_INV}15` : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: esTropical ? COLOR_INV : `${COLOR_INV}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: esTropical ? `0 4px 12px ${COLOR_INV}40` : 'none' }}>🥕</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? COLOR_INV_DARKER : 'var(--color-text-primary)', lineHeight: 1.2 }}>Inventario de Ingredientes</div>
                <div style={{ fontSize: '12px', color: esTropical ? COLOR_INV : `${COLOR_INV}CC`, marginTop: '4px', fontWeight: 500 }}>{totalIngredientes} ingredientes registrados</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              <button onClick={() => setMostrarListaCompras(true)}
                style={{
                  padding: '12px 20px',
                  background: resumenCompras.urgentes > 0
                    ? 'linear-gradient(135deg, #E24B4A 0%, #A32D2D 100%)'
                    : totalAlertas > 0
                      ? 'linear-gradient(135deg, #BA7517 0%, #854F0B 100%)'
                      : `linear-gradient(135deg, ${COLOR_INV} 0%, ${COLOR_INV_DARKER} 100%)`,
                  border: 'none', borderRadius: '12px', color: 'white',
                  fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  position: 'relative',
                  boxShadow: `0 4px 12px ${resumenCompras.urgentes > 0 ? 'rgba(226, 75, 74, 0.4)' : `${COLOR_INV}40`}`,
                  animation: resumenCompras.urgentes > 0 ? 'pulse 2s infinite' : 'none',
                }}>
                📦 Lista de Compras
                {totalAlertas > 0 && (
                  <span style={{ marginLeft: '8px', background: 'white', color: '#E24B4A', padding: '2px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 700 }}>
                    {resumenCompras.urgentes > 0 && '🚨 '}{totalAlertas}
                  </span>
                )}
              </button>
              <button onClick={() => { setIngredienteEditando(null); setModalNuevo(true); }}
                style={{ padding: '12px 20px', background: `linear-gradient(135deg, ${COLOR_INV} 0%, ${COLOR_INV_DARKER} 100%)`, border: 'none', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 12px ${COLOR_INV}40` }}>
                ➕ Nuevo ingrediente
              </button>
            </div>
          </div>

          {resumenCompras.urgentes > 0 && (
            <div style={{
              marginTop: '14px',
              background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.15)',
              border: '1px solid rgba(226, 75, 74, 0.4)',
              borderLeft: '4px solid #E24B4A',
              borderRadius: '12px', padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: esTropical ? '#A32D2D' : '#F4C0D1', fontWeight: 600 }}>
                <span style={{ fontSize: '20px' }}>🚨</span>
                <span>ATENCIÓN: {resumenCompras.urgentes} ingrediente{resumenCompras.urgentes > 1 ? 's' : ''} se {resumenCompras.urgentes > 1 ? 'acaban' : 'acaba'} en menos de 2 días</span>
              </div>
              <button onClick={() => setMostrarListaCompras(true)}
                style={{ padding: '6px 14px', background: 'linear-gradient(135deg, #E24B4A 0%, #A32D2D 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Ver lista →
              </button>
            </div>
          )}
        </div>

        {/* STATS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '20px' }}>
          <KpiCard label="TOTAL" valor={totalIngredientes} sublabel="ingredientes" colorBorde="#888780" />
          <KpiCard label="VALOR INVENTARIO" valor={`RD$ ${valorInventario.toLocaleString('es-DO', { maximumFractionDigits: 0 })}`} sublabel="stock × último costo" colorBorde="#1D9E75" colorTexto={esTropical ? '#04342C' : '#5DCAA5'} />
          <KpiCard label="STOCK BAJO" valor={stockBajo} sublabel={stockBajo > 0 ? '⚠️ requieren reposición' : 'sin alertas'} colorBorde={stockBajo > 0 ? '#BA7517' : '#888780'} colorTexto={stockBajo > 0 ? (esTropical ? '#854F0B' : '#FAC775') : 'var(--color-text-muted)'} />
          <KpiCard label="SIN STOCK" valor={sinStock} sublabel={sinStock > 0 ? '🔴 agotados' : 'todos disponibles'} colorBorde={sinStock > 0 ? '#E24B4A' : '#888780'} colorTexto={sinStock > 0 ? (esTropical ? '#A32D2D' : '#F4C0D1') : 'var(--color-text-muted)'} />
        </div>

        {/* FILTROS */}
        <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '12px', padding: '14px', marginBottom: '12px', display: 'flex', flexWrap: 'wrap', gap: '10px', boxShadow: 'var(--modulo-sombra)' }}>
          <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="🔍 Buscar ingrediente..."
            style={{ flex: 1, minWidth: '200px', padding: '8px 12px', background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
          <select value={filtroStock} onChange={(e) => setFiltroStock(e.target.value)} style={selectStyle()}>
            <option value="todos">Todos los ingredientes</option>
            <option value="con">📦 Con stock</option>
            <option value="bajo">⚠️ Stock bajo</option>
            <option value="sin">🔴 Sin stock</option>
          </select>
        </div>

        {/* TABLA */}
        <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--modulo-sombra)' }}>
          {ingredientesFiltrados.length === 0 ? (
            <div style={{ padding: '48px 24px', textAlign: 'center' }}>
              <div style={{ fontSize: '56px', marginBottom: '12px' }}>🥕</div>
              <p style={{ color: 'var(--color-text-primary)', fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>
                {ingredientes.length === 0 ? 'Sin ingredientes' : 'Sin resultados'}
              </p>
              <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginBottom: '16px' }}>
                {ingredientes.length === 0 ? 'Comienza agregando los ingredientes que usas en tus recetas.' : 'Ajusta los filtros para ver más ingredientes.'}
              </p>
              {ingredientes.length === 0 && (
                <button onClick={() => { setIngredienteEditando(null); setModalNuevo(true); }}
                  style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${COLOR_INV} 0%, ${COLOR_INV_DARKER} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ➕ Crear primer ingrediente
                </button>
              )}
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead style={{ background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)', borderBottom: '1px solid var(--color-border-subtle)' }}>
                  <tr>
                    <Th>INGREDIENTE</Th><Th align="right">STOCK ACTUAL</Th><Th align="right">STOCK MÍN</Th>
                    <Th align="right">ÚLT. COSTO</Th><Th>PROVEEDOR</Th><Th align="center">VALOR</Th>
                    <Th align="center">ESTADO</Th><Th></Th>
                  </tr>
                </thead>
                <tbody>
                  {ingredientesFiltrados.map(ing => {
                    const stock = parseFloat(ing.stock_actual || 0)
                    const minimo = parseFloat(ing.stock_minimo || 0)
                    const costo = parseFloat(ing.ultimo_costo || 0)
                    const valor = stock * costo
                    const estado = getEstadoStock(ing)
                    const proveedor = getProveedor(ing.ultimo_proveedor_id)
                    return (
                      <tr key={ing.id} style={{ borderBottom: '1px solid var(--color-border-subtle)' }}>
                        <Td>
                          <div style={{ fontWeight: 600, color: 'var(--color-text-primary)' }}>{ing.nombre}</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Unidad: {ing.unidad_stock || 'lb'}</div>
                        </Td>
                        <Td align="right">
                          <div style={{ fontWeight: 600, fontFamily: 'monospace', color: estado === 'sin_stock' ? '#E24B4A' : estado === 'bajo' ? '#BA7517' : 'var(--color-text-primary)' }}>
                            {stock.toFixed(1)} {ing.unidad_stock || 'lb'}
                          </div>
                        </Td>
                        <Td align="right">
                          {minimo > 0 ? <span style={{ fontFamily: 'monospace', color: 'var(--color-text-secondary)' }}>{minimo.toFixed(1)} {ing.unidad_stock || 'lb'}</span> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </Td>
                        <Td align="right">
                          {costo > 0 ? <span style={{ fontFamily: 'monospace' }}>RD$ {costo.toFixed(2)}</span> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </Td>
                        <Td>
                          {proveedor ? <span style={{ fontSize: '11px' }}>{proveedor.nombre}</span> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </Td>
                        <Td align="center">
                          {valor > 0 ? <span style={{ fontWeight: 600, fontFamily: 'monospace', color: esTropical ? '#04342C' : '#5DCAA5' }}>RD$ {valor.toLocaleString('es-DO', { maximumFractionDigits: 0 })}</span> : <span style={{ color: 'var(--color-text-muted)' }}>—</span>}
                        </Td>
                        <Td align="center">
                          {estado === 'sin_stock' && <BadgeStatus emoji="🔴" label="Sin stock" color="#E24B4A" />}
                          {estado === 'bajo' && <BadgeStatus emoji="⚠️" label="Bajo" color="#BA7517" />}
                          {estado === 'con_stock' && <BadgeStatus emoji="✅" label="OK" color="#1D9E75" />}
                        </Td>
                        <Td align="center">
                          <button onClick={() => { setIngredienteEditando(ing); setModalNuevo(true); }}
                            style={{ fontSize: '11px', color: '#378ADD', background: esTropical ? '#E6F1FB' : 'rgba(55, 138, 221, 0.15)', border: 'none', borderRadius: '6px', padding: '4px 8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}>
                            ✏️ Editar
                          </button>
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

      {modalNuevo && (
        <ModalNuevoIngrediente empresaId={empresaId} ingredienteEditando={ingredienteEditando} onCerrar={() => setModalNuevo(false)} onGuardado={() => { cargarDatos(); setModalNuevo(false) }} />
      )}

      <style>{`@keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.85 } }`}</style>
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
  return <span style={{ fontSize: '10px', fontWeight: 600, padding: '4px 8px', borderRadius: '8px', background: `${color}25`, color, whiteSpace: 'nowrap' }}>{emoji} {label}</span>
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

export default VistaIngredientes