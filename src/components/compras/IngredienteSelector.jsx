import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'

const UNIDADES_COMUNES = [
  { id: 'lb', label: 'Libras (lb)' },
  { id: 'kg', label: 'Kilogramos (kg)' },
  { id: 'oz', label: 'Onzas (oz)' },
  { id: 'unidad', label: 'Unidades' },
  { id: 'docena', label: 'Docenas' },
  { id: 'gal', label: 'Galones' },
  { id: 'litro', label: 'Litros' },
  { id: 'paquete', label: 'Paquetes' },
  { id: 'saco', label: 'Sacos' },
  { id: 'caja', label: 'Cajas' },
  { id: 'botella', label: 'Botellas' },
  { id: 'lata', label: 'Latas' },
]

function IngredienteSelector({
  empresaId,
  ingredientes,
  ingredienteSeleccionado,
  itemLibreNombre,
  onSeleccionarIngrediente,
  onItemLibre,
  onIngredienteCreado,
  disabled = false
}) {
  const [busqueda, setBusqueda] = useState('')
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [modoCrear, setModoCrear] = useState(false)
  const [modoLibre, setModoLibre] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevaUnidad, setNuevaUnidad] = useState('lb')
  const [nuevoStockMinimo, setNuevoStockMinimo] = useState('')
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')
  const [nombreLibre, setNombreLibre] = useState('')

  const containerRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (!modoCrear && !modoLibre) setMostrarDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [modoCrear, modoLibre])

  const ingredientesFiltrados = busqueda.trim()
    ? ingredientes.filter(i => i.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : ingredientes

  function seleccionar(ing) {
    onSeleccionarIngrediente(ing)
    setBusqueda(''); setMostrarDropdown(false); setModoCrear(false); setModoLibre(false)
  }

  function quitarSeleccion() {
    onSeleccionarIngrediente(null)
    if (onItemLibre) onItemLibre('')
    setBusqueda(''); setMostrarDropdown(false)
  }

  function iniciarCreacion() {
    setNuevoNombre(busqueda.trim()); setNuevaUnidad('lb'); setNuevoStockMinimo('')
    setErrorCrear(''); setModoCrear(true)
  }

  function cancelarCreacion() {
    setModoCrear(false); setNuevoNombre(''); setErrorCrear('')
  }

  function iniciarLibre() {
    setNombreLibre(busqueda.trim()); setModoLibre(true); setMostrarDropdown(false)
  }

  function cancelarLibre() {
    setModoLibre(false); setNombreLibre('')
  }

  function confirmarLibre() {
    if (!nombreLibre.trim()) return
    if (onItemLibre) onItemLibre(nombreLibre.trim())
    setModoLibre(false)
  }

  async function guardarNuevoIngrediente() {
    setErrorCrear('')
    if (!nuevoNombre.trim()) { setErrorCrear('El nombre es obligatorio'); return }

    const existe = ingredientes.some(i => i.nombre.toLowerCase() === nuevoNombre.trim().toLowerCase())
    if (existe) { setErrorCrear('Ya existe un ingrediente con ese nombre'); return }

    setCreando(true)
    const nuevoIng = {
      empresa_id: empresaId,
      nombre: nuevoNombre.trim(),
      unidad_stock: nuevaUnidad,
      stock_actual: 0,
      stock_minimo: parseFloat(nuevoStockMinimo) || 0,
    }

    const { data, error } = await supabase.from('ingredientes').insert([nuevoIng]).select().single()
    setCreando(false)
    if (error) { setErrorCrear('Error: ' + error.message); return }

    if (onIngredienteCreado) onIngredienteCreado(data)
    onSeleccionarIngrediente(data)
    setBusqueda(''); setMostrarDropdown(false); setModoCrear(false)
  }

  // ─── ESTILOS ───
  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', padding: '10px 12px',
    color: 'var(--color-text-primary)',
    fontSize: '13px', fontFamily: 'inherit', outline: 'none',
  }
  const labelStyle = {
    fontSize: '11px', letterSpacing: '1.5px', fontWeight: 600,
  }

  // ═══ MODO CREAR ═══
  if (modoCrear) {
    return (
      <div ref={containerRef} style={{ position: 'relative' }}>
        <div style={{
          background: 'rgba(29, 158, 117, 0.12)',
          border: '1px solid rgba(29, 158, 117, 0.4)',
          borderLeft: '4px solid #1D9E75',
          borderRadius: '12px', padding: '14px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...labelStyle, color: '#1D9E75' }}>➕ NUEVO INGREDIENTE</div>
            <button type="button" onClick={cancelarCreacion} disabled={creando} style={{
              background: 'transparent', border: 'none',
              color: 'var(--color-text-muted)', fontSize: '11px',
              cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
            }}>Cancelar</button>
          </div>

          <input type="text" value={nuevoNombre}
            onChange={(e) => setNuevoNombre(e.target.value)}
            placeholder="Nombre del ingrediente"
            autoFocus disabled={creando}
            style={inputStyle} />

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
            <select value={nuevaUnidad} onChange={(e) => setNuevaUnidad(e.target.value)} disabled={creando} style={inputStyle}>
              {UNIDADES_COMUNES.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
            <input type="number" step="0.1" min="0" value={nuevoStockMinimo}
              onChange={(e) => setNuevoStockMinimo(e.target.value)}
              placeholder="Stock mínimo (opcional)"
              disabled={creando}
              style={{ ...inputStyle, fontFamily: 'monospace' }} />
          </div>

          {errorCrear && (
            <div style={{ fontSize: '11px', color: '#F4C0D1' }}>⚠️ {errorCrear}</div>
          )}

          <button type="button" onClick={guardarNuevoIngrediente} disabled={creando} style={{
            width: '100%', padding: '11px',
            background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
            border: 'none', borderRadius: '10px',
            color: 'white', fontSize: '13px', fontWeight: 600,
            cursor: creando ? 'not-allowed' : 'pointer',
            opacity: creando ? 0.6 : 1, fontFamily: 'inherit',
          }}>
            {creando ? '⏳ Creando...' : '✅ Crear y seleccionar'}
          </button>
        </div>
      </div>
    )
  }

  // ═══ MODO ITEM LIBRE ═══
  if (modoLibre) {
    return (
      <div ref={containerRef} style={{ position: 'relative' }}>
        <div style={{
          background: 'rgba(239, 159, 39, 0.12)',
          border: '1px solid rgba(239, 159, 39, 0.4)',
          borderLeft: '4px solid #EF9F27',
          borderRadius: '12px', padding: '14px',
          display: 'flex', flexDirection: 'column', gap: '10px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ ...labelStyle, color: '#EF9F27' }}>📝 ITEM LIBRE (no afecta stock)</div>
            <button type="button" onClick={cancelarLibre} style={{
              background: 'transparent', border: 'none',
              color: 'var(--color-text-muted)', fontSize: '11px',
              cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
            }}>Cancelar</button>
          </div>

          <input type="text" value={nombreLibre}
            onChange={(e) => setNombreLibre(e.target.value)}
            placeholder="Ej: Sazón Goya, Refresco de naranja..."
            autoFocus style={inputStyle} />

          <div style={{ fontSize: '10px', color: '#EF9F27' }}>
            ℹ️ Este item registra el gasto pero NO actualiza inventario
          </div>

          <button type="button" onClick={confirmarLibre} disabled={!nombreLibre.trim()} style={{
            width: '100%', padding: '11px',
            background: 'linear-gradient(135deg, #EF9F27 0%, #C77C13 100%)',
            border: 'none', borderRadius: '10px',
            color: 'white', fontSize: '13px', fontWeight: 600,
            cursor: !nombreLibre.trim() ? 'not-allowed' : 'pointer',
            opacity: !nombreLibre.trim() ? 0.6 : 1, fontFamily: 'inherit',
          }}>✅ Usar item libre</button>
        </div>
      </div>
    )
  }

  // ═══ MODO SELECCIONADO (ingrediente) ═══
  if (ingredienteSeleccionado) {
    return (
      <div ref={containerRef} style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(55, 138, 221, 0.12)',
          border: '1px solid rgba(55, 138, 221, 0.4)',
          borderLeft: '4px solid #378ADD',
          borderRadius: '10px', padding: '10px 12px',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {ingredienteSeleccionado.nombre}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
              📦 Stock: {parseFloat(ingredienteSeleccionado.stock_actual || 0).toFixed(1)} {ingredienteSeleccionado.unidad_stock}
              {ingredienteSeleccionado.ultimo_costo && (
                <span style={{ marginLeft: '8px' }}>· Último: RD$ {parseFloat(ingredienteSeleccionado.ultimo_costo).toFixed(2)}</span>
              )}
            </div>
          </div>
          {!disabled && (
            <button type="button" onClick={quitarSeleccion} style={{
              background: 'transparent', border: 'none',
              color: 'var(--color-text-secondary)', fontSize: '13px',
              cursor: 'pointer', padding: '4px 8px', borderRadius: '6px',
              fontFamily: 'inherit',
            }}>✕</button>
          )}
        </div>
      </div>
    )
  }

  // ═══ MODO SELECCIONADO (item libre) ═══
  if (itemLibreNombre) {
    return (
      <div ref={containerRef} style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(239, 159, 39, 0.12)',
          border: '1px solid rgba(239, 159, 39, 0.4)',
          borderLeft: '4px solid #EF9F27',
          borderRadius: '10px', padding: '10px 12px',
        }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              📝 {itemLibreNombre}
            </div>
            <div style={{ fontSize: '10px', color: '#EF9F27', marginTop: '3px' }}>
              Item libre (no afecta stock)
            </div>
          </div>
          {!disabled && (
            <button type="button" onClick={quitarSeleccion} style={{
              background: 'transparent', border: 'none',
              color: 'var(--color-text-secondary)', fontSize: '13px',
              cursor: 'pointer', padding: '4px 8px', borderRadius: '6px',
              fontFamily: 'inherit',
            }}>✕</button>
          )}
        </div>
      </div>
    )
  }

  // ═══ MODO BÚSQUEDA ═══
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input type="text" value={busqueda}
        onChange={(e) => { setBusqueda(e.target.value); setMostrarDropdown(true) }}
        onFocus={() => setMostrarDropdown(true)}
        placeholder="🔍 Buscar ingrediente..."
        disabled={disabled}
        style={inputStyle} />

      {mostrarDropdown && (
        <div style={{
          position: 'absolute', zIndex: 50, left: 0, right: 0,
          marginTop: '4px',
          background: 'var(--color-bg-elevated)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--color-border-accent)',
          borderRadius: '12px',
          maxHeight: '270px', overflowY: 'auto',
          boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
        }}>

          {ingredientesFiltrados.length > 0 && (
            <div style={{ padding: '4px 0' }}>
              {ingredientesFiltrados.slice(0, 8).map(ing => (
                <button key={ing.id} type="button" onClick={() => seleccionar(ing)} style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s ease',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-input)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{ing.nombre}</div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                    📦 Stock: {parseFloat(ing.stock_actual || 0).toFixed(1)} {ing.unidad_stock}
                    {ing.ultimo_costo && (
                      <span style={{ marginLeft: '8px' }}>· Último: RD$ {parseFloat(ing.ultimo_costo).toFixed(2)}</span>
                    )}
                  </div>
                </button>
              ))}
              {ingredientesFiltrados.length > 8 && (
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', padding: '6px 14px', textAlign: 'center' }}>
                  + {ingredientesFiltrados.length - 8} más...
                </div>
              )}
            </div>
          )}

          {ingredientesFiltrados.length === 0 && busqueda.trim() && (
            <div style={{ padding: '10px', textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              No se encontró "<strong style={{ color: 'var(--color-text-primary)' }}>{busqueda}</strong>"
            </div>
          )}

          {/* Crear nuevo ingrediente */}
          <button type="button" onClick={iniciarCreacion} style={{
            width: '100%', textAlign: 'left',
            padding: '10px 14px',
            background: 'rgba(29, 158, 117, 0.10)',
            border: 'none',
            borderTop: '1px solid rgba(29, 158, 117, 0.3)',
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: '18px' }}>➕</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#1D9E75' }}>
                Crear nuevo ingrediente
                {busqueda.trim() && <span> "{busqueda.trim()}"</span>}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Se guarda en tu lista y aparecerá en stock
              </div>
            </div>
          </button>

          {/* Item libre */}
          <button type="button" onClick={iniciarLibre} style={{
            width: '100%', textAlign: 'left',
            padding: '10px 14px',
            background: 'rgba(239, 159, 39, 0.10)',
            border: 'none',
            borderTop: '1px solid rgba(239, 159, 39, 0.3)',
            display: 'flex', alignItems: 'center', gap: '10px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: '18px' }}>📝</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#EF9F27' }}>
                Usar como item libre
                {busqueda.trim() && <span> "{busqueda.trim()}"</span>}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Solo registra el gasto, NO afecta stock
              </div>
            </div>
          </button>

          {ingredientesFiltrados.length === 0 && !busqueda.trim() && (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Empieza a escribir el nombre del ingrediente
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default IngredienteSelector