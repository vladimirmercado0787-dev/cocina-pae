import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalProveedor from './ModalProveedor'

const COLOR_INV = '#EF9F27'
const COLOR_INV_BG = '#FAC775'
const COLOR_INV_DARKER = '#633806'
const COLOR_INV_CLARO = '#FAEEDA'

function VistaProveedores({ usuario, empresaId, onVolver }) {
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroActivos, setFiltroActivos] = useState(true)
  const [busqueda, setBusqueda] = useState('')
  const [modalProveedor, setModalProveedor] = useState(null)

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'

  useEffect(() => { cargarProveedores() }, [empresaId, filtroActivos])

  async function cargarProveedores() {
    setCargando(true)
    let query = supabase.from('proveedores').select('*').eq('empresa_id', empresaId).order('nombre', { ascending: true })
    if (filtroActivos) query = query.or('activo.eq.true,activo.is.null')
    const { data, error } = await query
    if (error) { console.error(error); setCargando(false); return }
    setProveedores(data || [])
    setCargando(false)
  }

  const proveedoresFiltrados = proveedores.filter(p => {
    if (!busqueda.trim()) return true
    const t = busqueda.toLowerCase()
    return (p.nombre?.toLowerCase().includes(t) || p.contacto_nombre?.toLowerCase().includes(t) || p.rnc?.toLowerCase().includes(t) || p.direccion?.toLowerCase().includes(t))
  })

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        <Titulo emoji="🏪" titulo="Proveedores" subtitulo="Gestiona a quién le compras tus insumos" color={COLOR_INV} colorBg={COLOR_INV_BG} colorDarker={COLOR_INV_DARKER} colorClaro={COLOR_INV_CLARO} esTropical={esTropical} accion={{ label: '➕ Agregar proveedor', onClick: () => setModalProveedor({}) }} />

        <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '12px', padding: '14px', marginBottom: '16px', boxShadow: 'var(--modulo-sombra)' }}>
          <div style={{ display: 'flex', gap: '12px', marginBottom: '10px', flexWrap: 'wrap' }}>
            <input type="text" placeholder="🔍 Buscar por nombre, contacto, RNC o dirección..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
              style={{ flex: 1, minWidth: '250px', padding: '10px 14px', background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '13px', fontFamily: 'inherit', outline: 'none' }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
              <input type="checkbox" checked={filtroActivos} onChange={(e) => setFiltroActivos(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              Solo activos
            </label>
            <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
              {proveedoresFiltrados.length} {proveedoresFiltrados.length === 1 ? 'proveedor' : 'proveedores'}
              {busqueda && ` (de ${proveedores.length})`}
            </span>
          </div>
        </div>

        {cargando ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>⏳ Cargando proveedores...</div>
        ) : proveedoresFiltrados.length === 0 ? (
          <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '14px', padding: '48px', textAlign: 'center', boxShadow: 'var(--modulo-sombra)' }}>
            {busqueda ? (
              <p style={{ color: 'var(--color-text-muted)', fontSize: '15px' }}>No se encontraron proveedores con "{busqueda}"</p>
            ) : (
              <>
                <div style={{ fontSize: '56px', marginBottom: '12px' }}>🏪</div>
                <p style={{ color: 'var(--color-text-primary)', fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No hay proveedores registrados todavía</p>
                <p style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Haz click en "Agregar proveedor" para comenzar</p>
              </>
            )}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '14px' }}>
            {proveedoresFiltrados.map(prov => {
              const inactivo = prov.activo === false
              return (
                <button key={prov.id} onClick={() => setModalProveedor(prov)}
                  style={{
                    background: 'var(--color-modulo-bg)',
                    border: '1px solid var(--color-modulo-border)',
                    borderLeft: `4px solid ${inactivo ? '#888780' : COLOR_INV}`,
                    borderRadius: '14px', padding: '16px',
                    cursor: 'pointer', textAlign: 'left',
                    opacity: inactivo ? 0.6 : 1, fontFamily: 'inherit',
                    boxShadow: 'var(--modulo-sombra)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: esTropical ? COLOR_INV : `${COLOR_INV}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', boxShadow: esTropical ? `0 2px 8px ${COLOR_INV}40` : 'none' }}>🏪</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{prov.nombre}</div>
                      {inactivo && <div style={{ fontSize: '10px', color: '#E24B4A', fontWeight: 600 }}>Inactivo</div>}
                      {prov.rnc && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontFamily: 'monospace' }}>RNC: {prov.rnc}</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    {prov.contacto_nombre && <div>👤 {prov.contacto_nombre}</div>}
                    {prov.contacto_telefono && <div>📞 {prov.contacto_telefono}</div>}
                    {prov.direccion && <div style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>📍 {prov.direccion}</div>}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {modalProveedor && (
        <ModalProveedor empresaId={empresaId} proveedorExistente={modalProveedor.id ? modalProveedor : null} onCerrar={() => setModalProveedor(null)} onGuardado={() => cargarProveedores()} />
      )}
    </div>
  )
}

// Sub-componentes idénticos a VistaCompras
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

function btnVolver() {
  return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
}

function tabTemaStyle(activo) {
  return { background: activo ? 'var(--gradient-toggle-active)' : 'transparent', border: 'none', borderRadius: '16px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }
}

export default VistaProveedores