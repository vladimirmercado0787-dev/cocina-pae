import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const DIAS = [
  { id: 'lunes',     label: 'Lunes' },
  { id: 'martes',    label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' },
  { id: 'jueves',    label: 'Jueves' },
  { id: 'viernes',   label: 'Viernes' },
  { id: 'extra',     label: 'Extra' },
]

const EMOJIS_COMIDA = ['🍗', '🫘', '🍲', '🍝', '🍚', '🥘', '🍛', '🥣', '🍖', '🥗', '🍤', '🍳']

const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const NARANJA = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }

function SeccionMenusRecetas({ empresaId, mostrarExito }) {
  const [recetas, setRecetas] = useState([])
  const [ingredientesCatalogo, setIngredientesCatalogo] = useState([])
  const [ingredientesReceta, setIngredientesReceta] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [datosForm, setDatosForm] = useState({
    nombre: '', emoji: '🍗', dia_semana: 'lunes', popularidad: 'normal',
    tiempo_preparacion_min: 120, personas_requeridas: 2, nivel_complejidad: 'normal',
    preparacion_dia_anterior: false, notas_operativas: '',
  })

  const [busquedaIng, setBusquedaIng] = useState('')
  const [ingSeleccionadoId, setIngSeleccionadoId] = useState('')
  const [cantidadCrudoRacion, setCantidadCrudoRacion] = useState('')
  const [unidadIng, setUnidadIng] = useState('lb')
  const [notasIng, setNotasIng] = useState('')

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

  useEffect(() => { cargarTodo() }, [empresaId])

  async function cargarTodo() {
    setCargando(true)
    const { data: recetasData } = await supabase.from('recetas').select('*').eq('empresa_id', empresaId).eq('activa', true)
    setRecetas(recetasData || [])
    const { data: ingsData } = await supabase.from('ingredientes').select('*').eq('empresa_id', empresaId).eq('activo', true).order('nombre')
    setIngredientesCatalogo(ingsData || [])
    setCargando(false)
  }

  async function cargarIngredientesDeReceta(recetaId) {
    const { data } = await supabase.from('recetas_ingredientes').select('*, ingredientes(*)').eq('receta_id', recetaId)
    setIngredientesReceta(data || [])
  }

  function iniciarEdicion(receta) {
    setEditando(receta.id)
    setAgregando(false)
    setDatosForm({
      nombre: receta.nombre || '', emoji: receta.emoji || '🍗',
      dia_semana: receta.dia_semana || 'lunes', popularidad: receta.popularidad || 'normal',
      tiempo_preparacion_min: receta.tiempo_preparacion_min || 120,
      personas_requeridas: receta.personas_requeridas || 2,
      nivel_complejidad: receta.nivel_complejidad || 'normal',
      preparacion_dia_anterior: receta.preparacion_dia_anterior || false,
      notas_operativas: receta.notas_operativas || '',
    })
    cargarIngredientesDeReceta(receta.id)
    resetearFormIng()
  }

  function iniciarAgregado() {
    setAgregando(true)
    setEditando(null)
    setIngredientesReceta([])
    setDatosForm({
      nombre: '', emoji: '🍗', dia_semana: 'lunes', popularidad: 'normal',
      tiempo_preparacion_min: 120, personas_requeridas: 2, nivel_complejidad: 'normal',
      preparacion_dia_anterior: false, notas_operativas: '',
    })
    resetearFormIng()
  }

  function cancelar() { setEditando(null); setAgregando(false); setIngredientesReceta([]) }

  function resetearFormIng() {
    setBusquedaIng('')
    setIngSeleccionadoId('')
    setCantidadCrudoRacion('')
    setUnidadIng('lb')
    setNotasIng('')
  }

  async function guardarReceta() {
    if (!datosForm.nombre.trim()) { alert('El nombre es obligatorio'); return }
    if (editando) {
      const { error } = await supabase.from('recetas').update(datosForm).eq('id', editando)
      if (error) { alert('Error: ' + error.message); return }
      mostrarExito('Receta actualizada')
      cancelar()
      cargarTodo()
    } else {
      const { data, error } = await supabase.from('recetas').insert([{ ...datosForm, empresa_id: empresaId, activa: true }]).select()
      if (error) { alert('Error: ' + error.message); return }
      mostrarExito('Receta agregada. Ahora edítala para agregar ingredientes.')
      cancelar()
      cargarTodo()
    }
  }

  async function agregarIngredienteAReceta() {
    if (!editando) { alert('Primero guarda la receta, luego edita para agregar ingredientes'); return }
    if (!ingSeleccionadoId) { alert('Selecciona un ingrediente'); return }
    if (!cantidadCrudoRacion || parseFloat(cantidadCrudoRacion) <= 0) { alert('Ingresa una cantidad válida'); return }
    const yaExiste = ingredientesReceta.some(ri => ri.ingrediente_id === ingSeleccionadoId)
    if (yaExiste) { alert('Este ingrediente ya está asociado a la receta'); return }
    const { error } = await supabase.from('recetas_ingredientes').insert([{
      receta_id: editando, ingrediente_id: ingSeleccionadoId,
      cantidad_crudo_por_racion: parseFloat(cantidadCrudoRacion), unidad: unidadIng, notas: notasIng,
    }])
    if (error) { alert('Error: ' + error.message); return }
    mostrarExito('Ingrediente añadido a la receta')
    cargarIngredientesDeReceta(editando)
    resetearFormIng()
  }

  async function quitarIngredienteDeReceta(ri) {
    if (!confirm(`¿Quitar "${ri.ingredientes?.nombre}" de la receta?`)) return
    await supabase.from('recetas_ingredientes').delete().eq('id', ri.id)
    mostrarExito('Ingrediente quitado')
    cargarIngredientesDeReceta(editando)
  }

  async function desactivarReceta(receta) {
    if (!confirm(`¿Quitar "${receta.nombre}" del menú?`)) return
    await supabase.from('recetas').update({ activa: false }).eq('id', receta.id)
    mostrarExito('Receta quitada')
    cargarTodo()
  }

  if (cargando) return <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>⏳ Cargando menús...</div>

  const recetaEditando = editando ? recetas.find(r => r.id === editando) : null

  const ingredientesFiltrados = ingredientesCatalogo.filter(ing => {
    const yaAsociado = ingredientesReceta.some(ri => ri.ingrediente_id === ing.id)
    if (yaAsociado) return false
    if (!busquedaIng) return true
    return ing.nombre.toLowerCase().includes(busquedaIng.toLowerCase())
  })

  const costoTotalRacion = ingredientesReceta.reduce((sum, ri) => {
    const ing = ri.ingredientes
    if (!ing) return sum
    return sum + (parseFloat(ri.cantidad_crudo_por_racion) * parseFloat(ing.precio_unitario || 0))
  }, 0)

  const pesoCrudoTotalRacion = ingredientesReceta.reduce((sum, ri) => sum + parseFloat(ri.cantidad_crudo_por_racion || 0), 0)

  const pesoCocidoEstimadoRacion = ingredientesReceta.reduce((sum, ri) => {
    const ing = ri.ingredientes
    if (!ing) return sum
    return sum + (parseFloat(ri.cantidad_crudo_por_racion) * parseFloat(ing.factor_rendimiento || 1))
  }, 0)

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>🍽️ Menús y Recetas</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{recetas.length} recetas activas</p>
        </div>
        {!agregando && !editando && (
          <button onClick={iniciarAgregado} style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ➕ Agregar receta
          </button>
        )}
      </div>

      {(agregando || editando) && (
        <div style={{ background: esTropical ? AZUL.claro : `${AZUL.c}15`, border: `1px solid ${AZUL.c}${esTropical ? '50' : '40'}`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: esTropical ? AZUL.dark : AZUL.c, margin: '0 0 16px' }}>
            {agregando ? '➕ Nueva receta' : `✏️ Editando: ${recetaEditando?.nombre}`}
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle()}>Emoji</label>
                <select value={datosForm.emoji} onChange={(e) => setDatosForm({ ...datosForm, emoji: e.target.value })} style={{ ...inputStyle(), fontSize: '22px', textAlign: 'center' }}>
                  {EMOJIS_COMIDA.map(e => <option key={e} value={e}>{e}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle()}>Nombre del plato</label>
                <input type="text" placeholder="Ej: Locrio de pollo" value={datosForm.nombre} onChange={(e) => setDatosForm({ ...datosForm, nombre: e.target.value })} style={inputStyle()} />
              </div>
            </div>

            <div>
              <label style={labelStyle()}>Día de la semana</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '6px' }}>
                {DIAS.map(d => (
                  <button key={d.id} onClick={() => setDatosForm({ ...datosForm, dia_semana: d.id })} style={selectorStyle(datosForm.dia_semana === d.id, esTropical)}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle()}>Tiempo (min)</label>
                <input type="number" value={datosForm.tiempo_preparacion_min} onChange={(e) => setDatosForm({ ...datosForm, tiempo_preparacion_min: parseInt(e.target.value) })} style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle()}>Personas</label>
                <input type="number" value={datosForm.personas_requeridas} onChange={(e) => setDatosForm({ ...datosForm, personas_requeridas: parseInt(e.target.value) })} style={inputStyle()} />
              </div>
              <div>
                <label style={labelStyle()}>Complejidad</label>
                <select value={datosForm.nivel_complejidad} onChange={(e) => setDatosForm({ ...datosForm, nivel_complejidad: e.target.value })} style={inputStyle()}>
                  <option value="facil">Fácil</option>
                  <option value="normal">Normal</option>
                  <option value="complicado">Complicado</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle()}>Popularidad</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {[
                  { id: 'alta',   label: '⭐ Favorito' },
                  { id: 'normal', label: '👍 Normal' },
                  { id: 'baja',   label: '⚠️ Suele sobrar' },
                ].map(p => (
                  <button key={p.id} onClick={() => setDatosForm({ ...datosForm, popularidad: p.id })} style={selectorStyle(datosForm.popularidad === p.id, esTropical)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={datosForm.preparacion_dia_anterior} onChange={(e) => setDatosForm({ ...datosForm, preparacion_dia_anterior: e.target.checked })} style={{ width: '16px', height: '16px' }} />
              <span style={{ fontSize: '13px', color: 'var(--color-text-primary)' }}>Requiere preparación el día anterior</span>
            </label>

            <textarea placeholder="Notas operativas (opcional)" value={datosForm.notas_operativas} onChange={(e) => setDatosForm({ ...datosForm, notas_operativas: e.target.value })} rows={2} style={{ ...inputStyle(), resize: 'none' }} />
          </div>

          {/* PANEL DE INGREDIENTES (solo al editar) */}
          {editando && (
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: `2px solid ${AZUL.c}40` }}>
              <h5 style={{ fontSize: '14px', fontWeight: 600, color: esTropical ? AZUL.dark : AZUL.c, margin: '0 0 12px' }}>🥕 INGREDIENTES DE LA RECETA</h5>

              {ingredientesReceta.length > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                  <KpiMini sec={VERDE} esTropical={esTropical} label="COSTO/RACIÓN" valor={`RD$ ${costoTotalRacion.toFixed(2)}`} />
                  <KpiMini sec={AZUL} esTropical={esTropical} label="PESO CRUDO" valor={`${pesoCrudoTotalRacion.toFixed(3)} lb`} sub="por ración" />
                  <KpiMini sec={NARANJA} esTropical={esTropical} label="PESO COCIDO" valor={`${pesoCocidoEstimadoRacion.toFixed(3)} lb`} sub="estimado" />
                </div>
              )}

              {ingredientesReceta.length === 0 ? (
                <div style={{ background: esTropical ? '#FFF8E6' : 'rgba(239, 159, 39, 0.12)', border: '1px solid rgba(239, 159, 39, 0.35)', borderRadius: '12px', padding: '16px', marginBottom: '16px', textAlign: 'center' }}>
                  <p style={{ fontSize: '13px', color: esTropical ? '#7A5410' : '#FAC775', margin: 0 }}>
                    Esta receta aún no tiene ingredientes. Agrega los principales abajo.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                  {ingredientesReceta.map(ri => {
                    const ing = ri.ingredientes
                    if (!ing) return null
                    const cantidadCrudo = parseFloat(ri.cantidad_crudo_por_racion)
                    const factor = parseFloat(ing.factor_rendimiento || 1)
                    const cantidadCocida = cantidadCrudo * factor
                    const costoLinea = cantidadCrudo * parseFloat(ing.precio_unitario || 0)
                    return (
                      <div key={ri.id} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '13px', margin: 0 }}>{ing.nombre}</p>
                          <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                            <span><strong>{cantidadCrudo}</strong> {ri.unidad} crudo/ración</span>
                            <span>→ {cantidadCocida.toFixed(3)} {ri.unidad} cocido</span>
                            <span style={{ color: '#1D9E75' }}>RD$ {costoLinea.toFixed(2)}/ración</span>
                            {ri.notas && <span style={{ fontStyle: 'italic', color: 'var(--color-text-muted)' }}>"{ri.notas}"</span>}
                          </div>
                        </div>
                        <button onClick={() => quitarIngredienteDeReceta(ri)} style={{ padding: '6px 10px', background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.15)', border: '1px solid rgba(226, 75, 74, 0.3)', borderRadius: '8px', color: esTropical ? '#A32D2D' : '#F4C0D1', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>🗑️</button>
                      </div>
                    )
                  })}
                </div>
              )}

              <div style={{ background: 'var(--color-bg-card)', border: `2px dashed ${AZUL.c}50`, borderRadius: '12px', padding: '12px' }}>
                <p style={{ fontSize: '11px', fontWeight: 600, color: esTropical ? AZUL.dark : AZUL.c, marginBottom: '8px' }}>➕ AÑADIR INGREDIENTE</p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <input type="text" placeholder="🔍 Buscar ingrediente..." value={busquedaIng} onChange={(e) => setBusquedaIng(e.target.value)} style={inputStyle()} />

                  <select value={ingSeleccionadoId} onChange={(e) => {
                    setIngSeleccionadoId(e.target.value)
                    const ing = ingredientesCatalogo.find(i => i.id === e.target.value)
                    if (ing) setUnidadIng(ing.unidad_compra || 'lb')
                  }} style={inputStyle()}>
                    <option value="">-- Selecciona ingrediente --</option>
                    {ingredientesFiltrados.map(ing => (
                      <option key={ing.id} value={ing.id}>{ing.nombre} ({ing.unidad_compra}) · Factor {ing.factor_rendimiento}x · RD$ {ing.precio_unitario}</option>
                    ))}
                  </select>

                  {ingredientesFiltrados.length === 0 && busquedaIng && (
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>No se encontraron ingredientes con ese nombre</p>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                    <div>
                      <label style={labelStyle()}>CANTIDAD/RACIÓN</label>
                      <input type="number" step="0.0001" placeholder="0.25" value={cantidadCrudoRacion} onChange={(e) => setCantidadCrudoRacion(e.target.value)} style={inputStyle()} />
                    </div>
                    <div>
                      <label style={labelStyle()}>UNIDAD</label>
                      <select value={unidadIng} onChange={(e) => setUnidadIng(e.target.value)} style={inputStyle()}>
                        <option value="lb">lb</option>
                        <option value="kg">kg</option>
                        <option value="oz">oz</option>
                        <option value="unidad">unidad</option>
                        <option value="galon">galón</option>
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle()}>NOTAS</label>
                      <input type="text" placeholder="picado, deshuesado..." value={notasIng} onChange={(e) => setNotasIng(e.target.value)} style={inputStyle()} />
                    </div>
                  </div>

                  <button onClick={agregarIngredienteAReceta} style={{ width: '100%', padding: '10px', background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    ➕ Añadir a la receta
                  </button>
                </div>
              </div>
            </div>
          )}

          {agregando && (
            <div style={{ marginTop: '16px', background: esTropical ? '#FFF8E6' : 'rgba(239, 159, 39, 0.12)', border: '1px solid rgba(239, 159, 39, 0.35)', borderRadius: '12px', padding: '12px', fontSize: '11px', color: esTropical ? '#7A5410' : '#FAC775' }}>
              💡 Primero guarda la receta. Luego edítala para agregar ingredientes.
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={guardarReceta} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>💾 Guardar receta</button>
            <button onClick={cancelar} style={{ padding: '10px 20px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', color: 'var(--color-text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {DIAS.map(dia => {
          const recetasDia = recetas.filter(r => r.dia_semana === dia.id)
          if (recetasDia.length === 0) return null
          return (
            <div key={dia.id}>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '8px' }}>{dia.label.toUpperCase()}</p>
              {recetasDia.map(r => (
                <div key={r.id} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '12px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                      <span style={{ fontSize: '28px' }}>{r.emoji}</span>
                      <div>
                        <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '13px', margin: 0 }}>{r.nombre}</p>
                        <div style={{ display: 'flex', gap: '12px', fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', flexWrap: 'wrap' }}>
                          <span>⏱️ {r.tiempo_preparacion_min}min</span>
                          <span>👥 {r.personas_requeridas}</span>
                          <span style={{ textTransform: 'capitalize' }}>📊 {r.nivel_complejidad}</span>
                          {r.popularidad === 'baja' && <span style={{ color: '#EF9F27' }}>⚠️ suele sobrar</span>}
                          {r.popularidad === 'alta' && <span style={{ color: '#1D9E75' }}>⭐ favorito</span>}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={() => iniciarEdicion(r)} style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✏️ Editar</button>
                      <button onClick={() => desactivarReceta(r)} style={{ padding: '6px 12px', background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.15)', border: '1px solid rgba(226, 75, 74, 0.3)', borderRadius: '8px', color: esTropical ? '#A32D2D' : '#F4C0D1', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>🗑️ Quitar</button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function KpiMini({ sec, esTropical, label, valor, sub }) {
  return (
    <div style={{ background: esTropical ? sec.claro : `${sec.c}15`, border: `1px solid ${sec.c}${esTropical ? '50' : '40'}`, borderRadius: '12px', padding: '12px', textAlign: 'center' }}>
      <p style={{ fontSize: '10px', color: esTropical ? sec.dark : sec.c, fontWeight: 600, letterSpacing: '0.5px', margin: 0 }}>{label}</p>
      <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '4px 0 0' }}>{valor}</p>
      {sub && <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', margin: 0 }}>{sub}</p>}
    </div>
  )
}

function selectorStyle(activo, esTropical) {
  return {
    padding: '8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', color: 'var(--color-text-primary)',
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

export default SeccionMenusRecetas