import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'

function ProveedorSelector({
  empresaId,
  proveedores,
  proveedorSeleccionado,
  onSeleccionar,
  onProveedorCreado,
  disabled = false
}) {
  const [busqueda, setBusqueda] = useState('')
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [modoCrear, setModoCrear] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoRnc, setNuevoRnc] = useState('')
  const [nuevoTelefono, setNuevoTelefono] = useState('')
  const [nuevaCategoria, setNuevaCategoria] = useState('')
  const [creandoProveedor, setCreandoProveedor] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')

  const containerRef = useRef(null)
  const inputRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (!modoCrear) setMostrarDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [modoCrear])

  const proveedoresFiltrados = busqueda.trim()
    ? proveedores.filter(p =>
        p.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
        (p.rnc && p.rnc.includes(busqueda))
      )
    : proveedores

  function seleccionarProveedor(prov) {
    onSeleccionar(prov)
    setBusqueda('')
    setMostrarDropdown(false)
    setModoCrear(false)
  }

  function quitarSeleccion() {
    onSeleccionar(null)
    setBusqueda('')
    setMostrarDropdown(false)
  }

  function iniciarCreacion() {
    setNuevoNombre(busqueda.trim())
    setNuevoRnc(''); setNuevoTelefono(''); setNuevaCategoria('')
    setErrorCrear('')
    setModoCrear(true)
  }

  function cancelarCreacion() {
    setModoCrear(false)
    setNuevoNombre(''); setNuevoRnc(''); setNuevoTelefono(''); setNuevaCategoria('')
    setErrorCrear('')
  }

  async function guardarNuevoProveedor() {
    setErrorCrear('')
    if (!nuevoNombre.trim()) { setErrorCrear('El nombre del proveedor es obligatorio'); return }

    const nombreExiste = proveedores.some(p => p.nombre.toLowerCase() === nuevoNombre.trim().toLowerCase())
    if (nombreExiste) { setErrorCrear('Ya existe un proveedor con ese nombre'); return }

    if (nuevoRnc.trim()) {
      const rncExiste = proveedores.some(p => p.rnc === nuevoRnc.trim())
      if (rncExiste) { setErrorCrear('Ya existe un proveedor con ese RNC'); return }
    }

    setCreandoProveedor(true)
    const nuevoProv = {
      empresa_id: empresaId,
      nombre: nuevoNombre.trim(),
      rnc: nuevoRnc.trim() || null,
      telefono: nuevoTelefono.trim() || null,
      categoria: nuevaCategoria.trim() || null,
      activo: true,
    }

    const { data, error } = await supabase.from('proveedores').insert([nuevoProv]).select().single()
    setCreandoProveedor(false)
    if (error) { console.error(error); setErrorCrear('Error al crear: ' + error.message); return }

    if (onProveedorCreado) onProveedorCreado(data)
    onSeleccionar(data)
    setBusqueda(''); setMostrarDropdown(false); setModoCrear(false)
    setNuevoNombre(''); setNuevoRnc(''); setNuevoTelefono(''); setNuevaCategoria('')
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
    display: 'block', fontSize: '10px', fontWeight: 500,
    color: 'var(--color-text-muted)', marginBottom: '6px',
    letterSpacing: '0.5px', textTransform: 'uppercase',
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
          display: 'flex', flexDirection: 'column', gap: '12px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ fontSize: '11px', color: '#1D9E75', letterSpacing: '1.5px', fontWeight: 600 }}>
              ➕ NUEVO PROVEEDOR
            </div>
            <button type="button" onClick={cancelarCreacion} disabled={creandoProveedor} style={{
              background: 'transparent', border: 'none',
              color: 'var(--color-text-muted)', fontSize: '11px',
              cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
            }}>Cancelar</button>
          </div>

          <div>
            <label style={labelStyle}>
              Nombre del proveedor <span style={{ color: '#E24B4A' }}>*</span>
            </label>
            <input type="text" value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              placeholder="Ej: Supermercado El Bohío"
              autoFocus disabled={creandoProveedor}
              style={inputStyle} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
            <div>
              <label style={labelStyle}>RNC (opcional)</label>
              <input type="text" value={nuevoRnc}
                onChange={(e) => setNuevoRnc(e.target.value)}
                placeholder="1-31-12345-6"
                disabled={creandoProveedor}
                style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={labelStyle}>Teléfono (opcional)</label>
              <input type="text" value={nuevoTelefono}
                onChange={(e) => setNuevoTelefono(e.target.value)}
                placeholder="809-555-1234"
                disabled={creandoProveedor}
                style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Categoría (opcional)</label>
            <input type="text" value={nuevaCategoria}
              onChange={(e) => setNuevaCategoria(e.target.value)}
              placeholder="Ej: Víveres, Carnes, Limpieza..."
              disabled={creandoProveedor}
              style={inputStyle} />
          </div>

          {errorCrear && (
            <div style={{
              background: 'rgba(244, 67, 54, 0.12)',
              border: '1px solid rgba(244, 67, 54, 0.35)',
              borderRadius: '8px', padding: '8px 10px',
              fontSize: '11px', color: '#F4C0D1',
            }}>⚠️ {errorCrear}</div>
          )}

          <button type="button" onClick={guardarNuevoProveedor} disabled={creandoProveedor} style={{
            width: '100%', padding: '12px',
            background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
            border: 'none', borderRadius: '10px',
            color: 'white', fontSize: '13px', fontWeight: 600,
            cursor: creandoProveedor ? 'not-allowed' : 'pointer',
            opacity: creandoProveedor ? 0.6 : 1, fontFamily: 'inherit',
          }}>
            {creandoProveedor ? '⏳ Creando...' : '✅ Crear proveedor y continuar'}
          </button>

          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', textAlign: 'center' }}>
            ℹ️ El proveedor se guarda en tu lista para próximas compras
          </div>
        </div>
      </div>
    )
  }

  // ═══ MODO SELECCIONADO ═══
  if (proveedorSeleccionado) {
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
              {proveedorSeleccionado.nombre}
            </div>
            <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '4px', fontSize: '10px', color: 'var(--color-text-muted)' }}>
              {proveedorSeleccionado.rnc && <span>📋 RNC: {proveedorSeleccionado.rnc}</span>}
              {proveedorSeleccionado.telefono && <span>📞 {proveedorSeleccionado.telefono}</span>}
              {proveedorSeleccionado.categoria && <span>🏷️ {proveedorSeleccionado.categoria}</span>}
            </div>
          </div>
          {!disabled && (
            <button type="button" onClick={quitarSeleccion} style={{
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '8px', padding: '6px 10px',
              color: 'var(--color-text-secondary)', fontSize: '11px', fontWeight: 500,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>✕ Cambiar</button>
          )}
        </div>
      </div>
    )
  }

  // ═══ MODO BÚSQUEDA ═══
  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <input ref={inputRef} type="text" value={busqueda}
        onChange={(e) => { setBusqueda(e.target.value); setMostrarDropdown(true) }}
        onFocus={() => setMostrarDropdown(true)}
        placeholder="🔍 Buscar proveedor por nombre o RNC..."
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

          {proveedoresFiltrados.length > 0 && (
            <div style={{ padding: '4px 0' }}>
              {proveedoresFiltrados.slice(0, 10).map(prov => (
                <button key={prov.id} type="button" onClick={() => seleccionarProveedor(prov)} style={{
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
                  <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{prov.nombre}</div>
                  <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', marginTop: '3px', fontSize: '10px', color: 'var(--color-text-muted)' }}>
                    {prov.rnc && <span>📋 {prov.rnc}</span>}
                    {prov.telefono && <span>📞 {prov.telefono}</span>}
                    {prov.categoria && <span>🏷️ {prov.categoria}</span>}
                  </div>
                </button>
              ))}
              {proveedoresFiltrados.length > 10 && (
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', padding: '8px 14px', textAlign: 'center' }}>
                  + {proveedoresFiltrados.length - 10} más... refina la búsqueda
                </div>
              )}
            </div>
          )}

          {proveedoresFiltrados.length === 0 && busqueda.trim() && (
            <div style={{ padding: '12px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>
              No se encontró "<strong style={{ color: 'var(--color-text-primary)' }}>{busqueda}</strong>"
            </div>
          )}

          {/* Botón crear nuevo */}
          <button type="button" onClick={iniciarCreacion} style={{
            width: '100%', textAlign: 'left',
            padding: '12px 14px',
            background: 'rgba(29, 158, 117, 0.10)',
            border: 'none',
            borderTop: '1px solid rgba(29, 158, 117, 0.3)',
            display: 'flex', alignItems: 'center', gap: '12px',
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <span style={{ fontSize: '20px' }}>➕</span>
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#1D9E75' }}>
                Crear nuevo proveedor
                {busqueda.trim() && <span> "{busqueda.trim()}"</span>}
              </div>
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Se guardará en tu lista para próximas compras
              </div>
            </div>
          </button>

          {proveedoresFiltrados.length === 0 && !busqueda.trim() && (
            <div style={{ padding: '14px', textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Empieza a escribir el nombre o RNC del proveedor
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ProveedorSelector