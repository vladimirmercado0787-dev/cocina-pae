import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { normalizarNombre, sonIguales } from '../../utils/normalizarTexto'

const ICONOS_DISPONIBLES = [
  '💸', '⛽', '🔥', '⚡', '🚗', '🏢', '📦', '🧑‍💼',
  '💼', '🏛️', '📋', '🍽️', '🎁', '📞', '🌐', '🛒',
  '🧹', '🔧', '💊', '📚', '🎓', '🏥', '✈️', '🏨'
]

const COLORES_DISPONIBLES = [
  { id: 'amber',  label: 'Ámbar',    hex: '#EF9F27' },
  { id: 'red',    label: 'Rojo',     hex: '#E24B4A' },
  { id: 'yellow', label: 'Amarillo', hex: '#FAC775' },
  { id: 'blue',   label: 'Azul',     hex: '#378ADD' },
  { id: 'purple', label: 'Morado',   hex: '#7F77DD' },
  { id: 'pink',   label: 'Rosa',     hex: '#D4537E' },
  { id: 'indigo', label: 'Índigo',   hex: '#534AB7' },
  { id: 'slate',  label: 'Pizarra',  hex: '#64748B' },
  { id: 'green',  label: 'Verde',    hex: '#1D9E75' },
  { id: 'gray',   label: 'Gris',     hex: '#9CA3AF' },
]

function CategoriaSelector({
  empresaId,
  categorias,
  categoriaSeleccionada,
  onSeleccionar,
  onCategoriaCreada,
  disabled = false
}) {
  const [busqueda, setBusqueda] = useState('')
  const [mostrarDropdown, setMostrarDropdown] = useState(false)
  const [modoCrear, setModoCrear] = useState(false)
  const [nuevoNombre, setNuevoNombre] = useState('')
  const [nuevoIcono, setNuevoIcono] = useState('💸')
  const [nuevoColor, setNuevoColor] = useState('gray')
  const [creando, setCreando] = useState(false)
  const [errorCrear, setErrorCrear] = useState('')

  const containerRef = useRef(null)

  // Cerrar dropdown al hacer click fuera
  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        if (!modoCrear) setMostrarDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [modoCrear])

  const categoriasActivas = categorias.filter(c => c.activa)
  const categoriasFiltradas = busqueda.trim()
    ? categoriasActivas.filter(c => c.nombre.toLowerCase().includes(busqueda.toLowerCase()))
    : categoriasActivas

  const categoriaSimilar = busqueda.trim()
    ? categoriasActivas.find(c => sonIguales(c.nombre, busqueda))
    : null

  function seleccionar(cat) {
    onSeleccionar(cat)
    setBusqueda('')
    setMostrarDropdown(false)
    setModoCrear(false)
  }

  function quitar() {
    onSeleccionar(null)
    setBusqueda('')
    setMostrarDropdown(false)
  }

  function iniciarCreacion() {
    if (categoriaSimilar) { seleccionar(categoriaSimilar); return }
    setNuevoNombre(normalizarNombre(busqueda.trim()))
    setNuevoIcono('💸')
    setNuevoColor('gray')
    setErrorCrear('')
    setModoCrear(true)
  }

  function cancelarCreacion() {
    setModoCrear(false)
    setNuevoNombre('')
    setErrorCrear('')
  }

  async function guardarNuevaCategoria() {
    setErrorCrear('')
    const nombreNormalizado = normalizarNombre(nuevoNombre)
    if (!nombreNormalizado) { setErrorCrear('El nombre es obligatorio'); return }

    const existeIgual = categoriasActivas.find(c => sonIguales(c.nombre, nombreNormalizado))
    if (existeIgual) {
      setErrorCrear(`Ya existe "${existeIgual.nombre}"`)
      setTimeout(() => seleccionar(existeIgual), 1500)
      return
    }

    setCreando(true)
    const maxOrden = Math.max(0, ...categorias.map(c => c.orden || 0))
    const nueva = {
      empresa_id: empresaId,
      nombre: nombreNormalizado,
      icono: nuevoIcono,
      color: nuevoColor,
      es_default: false,
      activa: true,
      orden: maxOrden + 1
    }

    const { data, error } = await supabase.from('categorias_gasto').insert([nueva]).select().single()
    setCreando(false)
    if (error) { setErrorCrear('Error: ' + error.message); return }

    if (onCategoriaCreada) onCategoriaCreada(data)
    onSeleccionar(data)
    setBusqueda('')
    setMostrarDropdown(false)
    setModoCrear(false)
  }

  // ─── ESTILOS BASE ───
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
              ➕ NUEVA CATEGORÍA
            </div>
            <button type="button" onClick={cancelarCreacion} disabled={creando} style={{
              background: 'transparent', border: 'none',
              color: 'var(--color-text-muted)', fontSize: '11px',
              cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline',
            }}>Cancelar</button>
          </div>

          <div>
            <input
              type="text"
              value={nuevoNombre}
              onChange={(e) => setNuevoNombre(e.target.value)}
              onBlur={(e) => setNuevoNombre(normalizarNombre(e.target.value))}
              placeholder="Nombre de la categoría"
              autoFocus disabled={creando}
              style={inputStyle}
            />
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
              💡 Se guardará como: <strong style={{ color: 'var(--color-text-primary)' }}>{normalizarNombre(nuevoNombre) || '(escribe el nombre)'}</strong>
            </div>
          </div>

          {/* Selector de ícono */}
          <div>
            <label style={labelStyle}>Ícono</label>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: '4px',
              padding: '8px', maxHeight: '92px', overflowY: 'auto',
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '8px',
            }}>
              {ICONOS_DISPONIBLES.map(icono => (
                <button key={icono} type="button" onClick={() => setNuevoIcono(icono)} style={{
                  fontSize: '18px', padding: '4px',
                  background: nuevoIcono === icono ? 'rgba(239, 159, 39, 0.25)' : 'transparent',
                  border: nuevoIcono === icono ? '1px solid #EF9F27' : '1px solid transparent',
                  borderRadius: '6px', cursor: 'pointer', fontFamily: 'inherit',
                }}>{icono}</button>
              ))}
            </div>
          </div>

          {/* Selector de color */}
          <div>
            <label style={labelStyle}>Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {COLORES_DISPONIBLES.map(c => (
                <button key={c.id} type="button" onClick={() => setNuevoColor(c.id)} title={c.label}
                  style={{
                    width: '26px', height: '26px', borderRadius: '50%',
                    background: c.hex,
                    border: nuevoColor === c.id ? '2px solid var(--color-text-primary)' : '2px solid transparent',
                    boxShadow: nuevoColor === c.id ? '0 0 0 2px var(--color-bg-input)' : 'none',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>

          {errorCrear && (
            <div style={{ fontSize: '11px', color: '#EF9F27' }}>⚠️ {errorCrear}</div>
          )}

          <button type="button" onClick={guardarNuevaCategoria} disabled={creando} style={{
            width: '100%', padding: '12px',
            background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
            border: 'none', borderRadius: '10px',
            color: 'white', fontSize: '13px', fontWeight: 600,
            cursor: creando ? 'not-allowed' : 'pointer',
            opacity: creando ? 0.6 : 1, fontFamily: 'inherit',
          }}>
            {creando ? '⏳ Creando...' : `✅ Crear "${nuevoIcono} ${normalizarNombre(nuevoNombre)}"`}
          </button>
        </div>
      </div>
    )
  }

  // ═══ MODO SELECCIONADO ═══
  if (categoriaSeleccionada) {
    return (
      <div ref={containerRef} style={{ position: 'relative' }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: '10px',
          background: 'rgba(55, 138, 221, 0.12)',
          border: '1px solid rgba(55, 138, 221, 0.4)',
          borderLeft: '4px solid #378ADD',
          borderRadius: '10px', padding: '10px 12px',
        }}>
          <span style={{ fontSize: '22px' }}>{categoriaSeleccionada.icono}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
              {categoriaSeleccionada.nombre}
            </div>
            {categoriaSeleccionada.es_default && (
              <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Categoría por defecto</div>
            )}
          </div>
          {!disabled && (
            <button type="button" onClick={quitar} style={{
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
      <input
        type="text"
        value={busqueda}
        onChange={(e) => { setBusqueda(e.target.value); setMostrarDropdown(true) }}
        onFocus={() => setMostrarDropdown(true)}
        placeholder="🔍 Buscar o crear categoría..."
        disabled={disabled}
        style={inputStyle}
      />

      {mostrarDropdown && (
        <div style={{
          position: 'absolute', zIndex: 50, left: 0, right: 0,
          marginTop: '4px',
          background: 'var(--color-bg-elevated)',
          backdropFilter: 'blur(20px)',
          border: '1px solid var(--color-border-accent)',
          borderRadius: '12px',
          maxHeight: '300px', overflowY: 'auto',
          boxShadow: '0 12px 32px rgba(0,0,0,0.3)',
        }}>

          {/* Banner si hay similar */}
          {categoriaSimilar && (
            <div style={{
              background: 'rgba(239, 159, 39, 0.15)',
              borderBottom: '1px solid rgba(239, 159, 39, 0.3)',
              padding: '10px 12px',
            }}>
              <div style={{ fontSize: '10px', color: '#EF9F27', fontWeight: 600, marginBottom: '6px', letterSpacing: '0.5px' }}>
                ⚠️ YA EXISTE UNA CATEGORÍA SIMILAR
              </div>
              <button type="button" onClick={() => seleccionar(categoriaSimilar)} style={{
                width: '100%', textAlign: 'left',
                background: 'rgba(239, 159, 39, 0.12)',
                border: '1px solid rgba(239, 159, 39, 0.3)',
                borderRadius: '8px', padding: '8px 10px',
                display: 'flex', alignItems: 'center', gap: '10px',
                cursor: 'pointer', fontFamily: 'inherit',
              }}>
                <span style={{ fontSize: '20px' }}>{categoriaSimilar.icono}</span>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{categoriaSimilar.nombre}</div>
                  <div style={{ fontSize: '10px', color: '#EF9F27' }}>→ Usar esta (recomendado)</div>
                </div>
              </button>
            </div>
          )}

          {/* Lista de categorías */}
          {categoriasFiltradas.length > 0 && (
            <div style={{ padding: '4px 0' }}>
              {categoriasFiltradas.map(cat => (
                <button key={cat.id} type="button" onClick={() => seleccionar(cat)} style={{
                  width: '100%', textAlign: 'left',
                  padding: '10px 12px',
                  background: 'transparent',
                  border: 'none',
                  borderBottom: '1px solid var(--color-border-subtle)',
                  display: 'flex', alignItems: 'center', gap: '10px',
                  cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'background 0.15s ease',
                }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--color-bg-input)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{ fontSize: '20px' }}>{cat.icono}</span>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{cat.nombre}</div>
                    {cat.es_default && (
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Por defecto</div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {categoriasFiltradas.length === 0 && busqueda.trim() && !categoriaSimilar && (
            <div style={{ padding: '12px', textAlign: 'center' }}>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                No se encontró "<strong style={{ color: 'var(--color-text-primary)' }}>{busqueda}</strong>"
              </div>
            </div>
          )}

          {/* Botón crear nueva */}
          {!categoriaSimilar && (
            <button type="button" onClick={iniciarCreacion} style={{
              width: '100%', textAlign: 'left',
              padding: '10px 12px',
              background: 'rgba(29, 158, 117, 0.10)',
              border: 'none',
              borderTop: '1px solid rgba(29, 158, 117, 0.3)',
              display: 'flex', alignItems: 'center', gap: '10px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              <span style={{ fontSize: '18px' }}>➕</span>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: '#1D9E75' }}>
                  Crear nueva categoría
                  {busqueda.trim() && (
                    <span> "{normalizarNombre(busqueda.trim())}"</span>
                  )}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Personaliza ícono y color</div>
              </div>
            </button>
          )}

          {categoriasFiltradas.length === 0 && !busqueda.trim() && (
            <div style={{ padding: '14px', textAlign: 'center', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              Empieza a escribir o selecciona una categoría
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default CategoriaSelector