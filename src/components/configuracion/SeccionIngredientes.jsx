import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const CATEGORIAS = [
  { id: 'cereales',   emoji: '🌾', label: 'Cereales' },
  { id: 'proteinas',  emoji: '🍗', label: 'Proteínas' },
  { id: 'vegetales',  emoji: '🥬', label: 'Vegetales' },
  { id: 'sazones',    emoji: '🧂', label: 'Sazones' },
  { id: 'aceites',    emoji: '🫒', label: 'Aceites/grasas' },
  { id: 'otros',      emoji: '📦', label: 'Otros' },
]

const NIVELES = [
  { id: 'principal',  emoji: '⚖️', label: 'Principal',  desc: 'Se pesa siempre' },
  { id: 'sazonador',  emoji: '📏', label: 'Sazonador',  desc: 'Se estima' },
  { id: 'condimento', emoji: '🤏', label: 'Condimento', desc: 'Al gusto' },
]

const UNIDADES = ['lb', 'kg', 'oz', 'unidad', 'galon']

const FACTORES_SUGERIDOS = {
  'arroz': 3.0, 'arroz blanco': 3.0, 'habichuela': 2.5, 'habichuelas': 2.5,
  'frijol': 2.5, 'pollo': 0.7, 'pollo deshuesado': 0.7, 'carne': 0.75,
  'carne molida': 0.75, 'res': 0.75, 'cerdo': 0.7, 'pescado': 0.85,
  'sardina': 1.0, 'espagueti': 3.0, 'pasta': 3.0, 'fideo': 3.0,
  'plátano': 0.95, 'platano': 0.95, 'papa': 0.95, 'yuca': 0.9,
  'cebolla': 0.9, 'pimiento': 0.9, 'ajo': 1.0, 'aceite': 1.0,
  'sal': 1.0, 'orégano': 1.0, 'oregano': 1.0,
}

const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }

function SeccionIngredientes({ empresaId, mostrarExito }) {
  const [ingredientes, setIngredientes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [datosForm, setDatosForm] = useState({
    nombre: '', categoria: 'cereales', unidad_compra: 'lb',
    factor_rendimiento: 1.0, precio_unitario: 0, proveedor_id: '',
    nivel_importancia: 'principal', notas: '',
  })

  const [esTropical, setEsTropical] = useState(
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-tema') === 'tropical'
  )
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setEsTropical(document.documentElement.getAttribute('data-tema') === 'tropical')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => { cargarDatos() }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    const { data: ingsData } = await supabase.from('ingredientes').select('*').eq('empresa_id', empresaId).eq('activo', true).order('nombre')
    setIngredientes(ingsData || [])
    const { data: provData } = await supabase.from('proveedores').select('*').eq('empresa_id', empresaId).eq('activo', true)
    setProveedores(provData || [])
    setCargando(false)
  }

  function sugerirFactor(nombre) {
    const nombreLower = nombre.toLowerCase().trim()
    if (FACTORES_SUGERIDOS[nombreLower]) return FACTORES_SUGERIDOS[nombreLower]
    for (const [key, valor] of Object.entries(FACTORES_SUGERIDOS)) {
      if (nombreLower.includes(key) || key.includes(nombreLower)) return valor
    }
    return 1.0
  }

  function actualizarNombre(nombre) {
    setDatosForm({ ...datosForm, nombre: nombre, factor_rendimiento: sugerirFactor(nombre) })
  }

  function iniciarEdicion(ing) {
    setEditando(ing.id)
    setAgregando(false)
    setDatosForm({
      nombre: ing.nombre || '', categoria: ing.categoria || 'cereales',
      unidad_compra: ing.unidad_compra || 'lb', factor_rendimiento: ing.factor_rendimiento || 1.0,
      precio_unitario: ing.precio_unitario || 0, proveedor_id: ing.proveedor_id || '',
      nivel_importancia: ing.nivel_importancia || 'principal', notas: ing.notas || '',
    })
  }

  function iniciarAgregado() {
    setAgregando(true)
    setEditando(null)
    setDatosForm({
      nombre: '', categoria: 'cereales', unidad_compra: 'lb', factor_rendimiento: 1.0,
      precio_unitario: 0, proveedor_id: '', nivel_importancia: 'principal', notas: '',
    })
  }

  function cancelar() { setEditando(null); setAgregando(false) }

  async function guardar() {
    if (!datosForm.nombre.trim()) { alert('El nombre es obligatorio'); return }
    const datosLimpios = {
      ...datosForm, proveedor_id: datosForm.proveedor_id || null,
      factor_rendimiento: parseFloat(datosForm.factor_rendimiento) || 1.0,
      precio_unitario: parseFloat(datosForm.precio_unitario) || 0,
    }
    if (editando) {
      const { error } = await supabase.from('ingredientes').update(datosLimpios).eq('id', editando)
      if (error) { alert('Error: ' + error.message); return }
      mostrarExito('Ingrediente actualizado')
    } else {
      const { error } = await supabase.from('ingredientes').insert([{ ...datosLimpios, empresa_id: empresaId, activo: true }])
      if (error) { alert('Error: ' + error.message); return }
      mostrarExito('Ingrediente agregado')
    }
    cancelar()
    cargarDatos()
  }

  async function desactivar(ing) {
    if (!confirm(`¿Quitar "${ing.nombre}" del catálogo?`)) return
    await supabase.from('ingredientes').update({ activo: false }).eq('id', ing.id)
    mostrarExito('Ingrediente quitado')
    cargarDatos()
  }

  if (cargando) return <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>⏳ Cargando ingredientes...</div>

  const ingredientesFiltrados = filtroCategoria === 'todos' ? ingredientes : ingredientes.filter(i => i.categoria === filtroCategoria)
  const ingredientesPorCategoria = {}
  ingredientesFiltrados.forEach(ing => {
    const cat = ing.categoria || 'otros'
    if (!ingredientesPorCategoria[cat]) ingredientesPorCategoria[cat] = []
    ingredientesPorCategoria[cat].push(ing)
  })
  const ingredienteEditando = editando ? ingredientes.find(i => i.id === editando) : null

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>🥕 Ingredientes</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{ingredientes.length} ingredientes activos</p>
        </div>
        {!agregando && !editando && (
          <button onClick={iniciarAgregado} style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ➕ Agregar ingrediente
          </button>
        )}
      </div>

      {!agregando && !editando && ingredientes.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
          <button onClick={() => setFiltroCategoria('todos')} style={chipStyle(filtroCategoria === 'todos', esTropical)}>Todos</button>
          {CATEGORIAS.map(cat => (
            <button key={cat.id} onClick={() => setFiltroCategoria(cat.id)} style={chipStyle(filtroCategoria === cat.id, esTropical)}>
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      )}

      {(agregando || editando) && (
        <div style={{ background: esTropical ? AZUL.claro : `${AZUL.c}15`, border: `1px solid ${AZUL.c}${esTropical ? '50' : '40'}`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: esTropical ? AZUL.dark : AZUL.c, margin: '0 0 16px' }}>
            {agregando ? '➕ Nuevo ingrediente' : `✏️ Editando: ${ingredienteEditando?.nombre}`}
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <label style={labelStyle()}>NOMBRE</label>
              <input type="text" placeholder="Ej: Arroz blanco, Pollo deshuesado" value={datosForm.nombre} onChange={(e) => actualizarNombre(e.target.value)} style={inputStyle()} />
            </div>

            <div>
              <label style={labelStyle()}>CATEGORÍA</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: '8px' }}>
                {CATEGORIAS.map(cat => (
                  <button key={cat.id} onClick={() => setDatosForm({ ...datosForm, categoria: cat.id })} style={selectorStyle(datosForm.categoria === cat.id, esTropical)}>
                    <div style={{ fontSize: '18px' }}>{cat.emoji}</div>
                    <div>{cat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={labelStyle()}>NIVEL DE IMPORTANCIA</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {NIVELES.map(n => (
                  <button key={n.id} onClick={() => setDatosForm({ ...datosForm, nivel_importancia: n.id })} style={{ ...selectorStyle(datosForm.nivel_importancia === n.id, esTropical), textAlign: 'left' }}>
                    <div style={{ fontSize: '12px', fontWeight: 700 }}>{n.emoji} {n.label}</div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{n.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle()}>UNIDAD COMPRA</label>
                <select value={datosForm.unidad_compra} onChange={(e) => setDatosForm({ ...datosForm, unidad_compra: e.target.value })} style={inputStyle()}>
                  {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle()}>PRECIO/UNIDAD (RD$)</label>
                <input type="number" step="0.01" value={datosForm.precio_unitario} onChange={(e) => setDatosForm({ ...datosForm, precio_unitario: e.target.value })} style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle()}>FACTOR RENDIMIENTO</label>
                <input type="number" step="0.05" value={datosForm.factor_rendimiento} onChange={(e) => setDatosForm({ ...datosForm, factor_rendimiento: e.target.value })} style={inputStyle()} />
              </div>
            </div>

            <div style={{ background: esTropical ? '#FFF8E6' : 'rgba(239, 159, 39, 0.12)', border: '1px solid rgba(239, 159, 39, 0.35)', borderRadius: '10px', padding: '12px', fontSize: '11px', color: esTropical ? '#7A5410' : '#FAC775' }}>
              💡 <strong>Factor de rendimiento:</strong> cuánto cambia el peso al cocinarse. Ej: 1 lb de arroz crudo → 3 lb cocido (factor 3.0). 1 lb de pollo crudo → 0.7 lb cocido (factor 0.7).
              {datosForm.factor_rendimiento != 1.0 && (
                <span style={{ display: 'block', marginTop: '4px', fontWeight: 700 }}>Sugerencia auto: {datosForm.factor_rendimiento}x (puedes ajustar)</span>
              )}
            </div>

            {proveedores.length > 0 && (
              <div>
                <label style={labelStyle()}>PROVEEDOR (opcional)</label>
                <select value={datosForm.proveedor_id} onChange={(e) => setDatosForm({ ...datosForm, proveedor_id: e.target.value })} style={inputStyle()}>
                  <option value="">Sin proveedor asignado</option>
                  {proveedores.map(p => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </div>
            )}

            <textarea placeholder="Notas (opcional)" value={datosForm.notas} onChange={(e) => setDatosForm({ ...datosForm, notas: e.target.value })} rows={2} style={{ ...inputStyle(), resize: 'none' }} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={guardar} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>💾 Guardar</button>
            <button onClick={cancelar} style={{ padding: '10px 20px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', color: 'var(--color-text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          </div>
        </div>
      )}

      {ingredientes.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '64px 16px', background: 'var(--color-bg-card)', borderRadius: '12px', border: '1px dashed var(--color-border-subtle)' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🥕</div>
          <h4 style={{ fontWeight: 600, color: 'var(--color-text-secondary)', margin: 0 }}>No hay ingredientes aún</h4>
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '8px' }}>Agrega los ingredientes principales que usas en tus recetas.</p>
          <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>Ejemplos: Arroz, Pollo, Habichuelas, Aceite, Cebolla...</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {Object.entries(ingredientesPorCategoria).map(([catId, items]) => {
            const cat = CATEGORIAS.find(c => c.id === catId) || CATEGORIAS[5]
            return (
              <div key={catId}>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '8px' }}>
                  {cat.emoji} {cat.label.toUpperCase()} ({items.length})
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {items.map(ing => {
                    const nivel = NIVELES.find(n => n.id === ing.nivel_importancia) || NIVELES[0]
                    return (
                      <div key={ing.id} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '12px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                              <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '13px', margin: 0 }}>{ing.nombre}</p>
                              <span style={{ fontSize: '10px', background: esTropical ? AZUL.claro : `${AZUL.c}25`, color: esTropical ? AZUL.dark : AZUL.c, padding: '2px 8px', borderRadius: '10px' }}>
                                {nivel.emoji} {nivel.label}
                              </span>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                              <span>📦 {ing.unidad_compra}</span>
                              <span>💰 RD$ {parseFloat(ing.precio_unitario || 0).toFixed(2)}/{ing.unidad_compra}</span>
                              <span>⚖️ Factor: {parseFloat(ing.factor_rendimiento || 1).toFixed(2)}x</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => iniciarEdicion(ing)} style={{ padding: '6px 10px', background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✏️</button>
                            <button onClick={() => desactivar(ing)} style={{ padding: '6px 10px', background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.15)', border: '1px solid rgba(226, 75, 74, 0.3)', borderRadius: '8px', color: esTropical ? '#A32D2D' : '#F4C0D1', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>🗑️</button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function chipStyle(activo, esTropical) {
  return {
    padding: '6px 12px', borderRadius: '20px', fontSize: '11px', fontWeight: 600,
    whiteSpace: 'nowrap', cursor: 'pointer', fontFamily: 'inherit', border: 'none',
    background: activo ? 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)' : 'var(--color-bg-card)',
    color: activo ? 'white' : 'var(--color-text-secondary)',
  }
}

function selectorStyle(activo, esTropical) {
  return {
    padding: '8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
    color: 'var(--color-text-primary)',
    border: activo ? '2px solid #378ADD' : '2px solid var(--color-border-subtle)',
    background: activo ? (esTropical ? '#E6F1FB' : 'rgba(55, 138, 221, 0.18)') : 'var(--color-bg-input)',
  }
}

function labelStyle() {
  return { display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  }
}

export default SeccionIngredientes