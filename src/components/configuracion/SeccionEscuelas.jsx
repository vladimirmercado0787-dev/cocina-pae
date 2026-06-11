import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const FORM_INICIAL = {
  nombre: '', codigo_centro: '', regional_distrito: '',
  provincia: '', municipio: '', barrio_sector: '', direccion: '',
  director_nombre: '', director_telefono: '',
  raciones_contractuales: '', precio_racion: '', distancia_km: '',
  observaciones: '',
  cat_escuela_codigo: null, regional_codigo: null, distrito_codigo: null,
  latitud: null, longitud: null, sector: null, nivel: null, matricula: null,
}

const SEC = {
  azul:    { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' },
  verde:   { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' },
  morado:  { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' },
  naranja: { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' },
  gris:    { c: '#888780', claro: '#F1EFE8', dark: '#3D3D38' },
  cyan:    { c: '#00A8B5', claro: '#D9F4F6', dark: '#04484D' },
}

function SeccionEscuelas({ empresaId, mostrarExito }) {
  const [escuelas, setEscuelas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [datosForm, setDatosForm] = useState(FORM_INICIAL)

  // ─── Buscador de catálogo ───
  const [modoManual, setModoManual] = useState(false)
  const [provincias, setProvincias] = useState([])
  const [municipios, setMunicipios] = useState([])
  const [provinciaSel, setProvinciaSel] = useState('')
  const [municipioSel, setMunicipioSel] = useState('')
  const [resultados, setResultados] = useState([])
  const [buscandoCat, setBuscandoCat] = useState(false)
  const [textoBusqueda, setTextoBusqueda] = useState('')
  const [escuelaCatSel, setEscuelaCatSel] = useState(null)

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

  useEffect(() => { cargarEscuelas() }, [empresaId])

  async function cargarEscuelas() {
    setCargando(true)
    const { data } = await supabase.from('escuelas').select('*').eq('empresa_id', empresaId).eq('activa', true).order('nombre')
    setEscuelas(data || [])
    setCargando(false)
  }

  // ─── Catálogo: cargar provincias al abrir ───
  async function cargarProvincias() {
    const { data } = await supabase.rpc('listar_provincias_catalogo')
    setProvincias((data || []).map(d => d.provincia))
  }

  async function alElegirProvincia(prov) {
    setProvinciaSel(prov)
    setMunicipioSel('')
    setMunicipios([])
    setResultados([])
    setEscuelaCatSel(null)
    if (!prov) return
    const { data } = await supabase.rpc('listar_municipios_catalogo', { p_provincia: prov })
    setMunicipios((data || []).map(d => d.municipio))
  }

  async function alElegirMunicipio(mun) {
    setMunicipioSel(mun)
    setEscuelaCatSel(null)
    if (!mun) { setResultados([]); return }
    buscarEnCatalogo(provinciaSel, mun, textoBusqueda)
  }

  async function buscarEnCatalogo(prov, mun, texto) {
    setBuscandoCat(true)
    const { data, error } = await supabase.rpc('buscar_escuelas_catalogo', {
      p_texto: texto?.trim() || null,
      p_provincia: prov || null,
      p_municipio: mun || null,
      p_regional: null,
      p_limite: 100,
    })
    setBuscandoCat(false)
    if (!error) setResultados(data || [])
  }

  function elegirEscuelaCatalogo(esc) {
    setEscuelaCatSel(esc)
    // Llenar el formulario con los datos oficiales
    setDatosForm(prev => ({
      ...prev,
      nombre: esc.nombre || '',
      codigo_centro: esc.codigo || '',
      regional_distrito: `${esc.regional_codigo || ''}${esc.distrito_codigo ? '-' + esc.distrito_codigo.slice(-2) : ''}`,
      provincia: esc.provincia || '',
      municipio: esc.municipio || '',
      cat_escuela_codigo: esc.codigo || null,
      regional_codigo: esc.regional_codigo || null,
      distrito_codigo: esc.distrito_codigo || null,
      latitud: esc.latitud || null,
      longitud: esc.longitud || null,
      sector: esc.sector || null,
      nivel: esc.nivel || null,
      matricula: esc.matricula || null,
    }))
  }

  function iniciarEdicion(escuela) {
    setEditando(escuela.id)
    setAgregando(false)
    setModoManual(true) // al editar, modo manual directo
    setEscuelaCatSel(null)
    setDatosForm({
      nombre: escuela.nombre || '', codigo_centro: escuela.codigo_centro || '',
      regional_distrito: escuela.regional_distrito || '', provincia: escuela.provincia || '',
      municipio: escuela.municipio || '', barrio_sector: escuela.barrio_sector || '',
      direccion: escuela.direccion || '', director_nombre: escuela.director_nombre || '',
      director_telefono: escuela.director_telefono || '',
      raciones_contractuales: escuela.raciones_contractuales || '',
      precio_racion: escuela.precio_racion || '', distancia_km: escuela.distancia_km || '',
      observaciones: escuela.observaciones || '',
      cat_escuela_codigo: escuela.cat_escuela_codigo || null,
      regional_codigo: escuela.regional_codigo || null, distrito_codigo: escuela.distrito_codigo || null,
      latitud: escuela.latitud || null, longitud: escuela.longitud || null,
      sector: escuela.sector || null, nivel: escuela.nivel || null, matricula: escuela.matricula || null,
    })
  }

  function iniciarAgregado() {
    setAgregando(true)
    setEditando(null)
    setModoManual(false)
    setEscuelaCatSel(null)
    setProvinciaSel(''); setMunicipioSel(''); setMunicipios([]); setResultados([]); setTextoBusqueda('')
    setDatosForm({ ...FORM_INICIAL, precio_racion: '71' })
    cargarProvincias()
  }

  function cancelar() {
    setEditando(null); setAgregando(false); setDatosForm(FORM_INICIAL)
    setModoManual(false); setEscuelaCatSel(null)
  }
  function actualizarCampo(campo, valor) { setDatosForm(prev => ({ ...prev, [campo]: valor })) }

  async function guardar() {
    if (!datosForm.nombre.trim()) { alert('El nombre de la escuela es obligatorio'); return }
    const payload = {
      ...datosForm,
      raciones_contractuales: datosForm.raciones_contractuales || null,
      precio_racion: datosForm.precio_racion || null,
      distancia_km: datosForm.distancia_km || null,
    }
    if (editando) {
      const { error } = await supabase.from('escuelas').update(payload).eq('id', editando)
      if (error) { alert('Error: ' + error.message); return }
      mostrarExito('Escuela actualizada')
    } else {
      const { error } = await supabase.from('escuelas').insert([{ ...payload, empresa_id: empresaId, activa: true }])
      if (error) { alert('Error: ' + error.message); return }
      mostrarExito('Escuela agregada')
    }
    cancelar()
    cargarEscuelas()
  }

  async function desactivar(escuela) {
    if (!confirm(`¿Desactivar "${escuela.nombre}"? No aparecerá más en el dashboard.`)) return
    await supabase.from('escuelas').update({ activa: false }).eq('id', escuela.id)
    mostrarExito('Escuela desactivada')
    cargarEscuelas()
  }

  if (cargando) return <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>⏳ Cargando escuelas...</div>

  const editandoEscuela = editando ? escuelas.find(e => e.id === editando) : null
  const cyan = SEC.cyan

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>🏫 Escuelas</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{escuelas.length} escuelas activas · Formato INABIE V1-PAE</p>
        </div>
        {!agregando && !editando && (
          <button onClick={iniciarAgregado} style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ➕ Agregar escuela
          </button>
        )}
      </div>

      {(agregando || editando) && (
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '16px', padding: '20px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 18px' }}>
            {agregando ? '➕ Nueva escuela' : `✏️ Editando: ${editandoEscuela?.nombre}`}
          </h4>

          {/* ─── BUSCADOR DE CATÁLOGO (solo al agregar) ─── */}
          {agregando && !modoManual && (
            <div style={{
              background: esTropical ? cyan.claro : `${cyan.c}15`,
              border: `1px solid ${cyan.c}${esTropical ? '50' : '40'}`,
              borderLeft: `4px solid ${cyan.c}`,
              borderRadius: '12px', padding: '16px', marginBottom: '14px',
            }}>
              <h5 style={{ fontSize: '13px', fontWeight: 600, color: esTropical ? cyan.dark : cyan.c, margin: '0 0 4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                🔍 Buscar escuela en el catálogo oficial
              </h5>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '0 0 12px' }}>
                Elige provincia y municipio para encontrar la escuela. Sus datos se llenarán solos.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <div>
                  <label style={labelCat(cyan, esTropical)}>Provincia</label>
                  <select value={provinciaSel} onChange={(e) => alElegirProvincia(e.target.value)} style={inputStyle()}>
                    <option value="">— Selecciona provincia —</option>
                    {provincias.map(p => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelCat(cyan, esTropical)}>Municipio</label>
                  <select value={municipioSel} onChange={(e) => alElegirMunicipio(e.target.value)} style={inputStyle()} disabled={!provinciaSel}>
                    <option value="">— Selecciona municipio —</option>
                    {municipios.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              </div>

              {/* Filtro por texto dentro de resultados */}
              {municipioSel && (
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="🔎 Filtrar por nombre de escuela..."
                    value={textoBusqueda}
                    onChange={(e) => { setTextoBusqueda(e.target.value); buscarEnCatalogo(provinciaSel, municipioSel, e.target.value) }}
                    style={inputStyle()}
                  />
                </div>
              )}

              {/* Resultados */}
              {buscandoCat && <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px' }}>Buscando...</p>}

              {!buscandoCat && municipioSel && resultados.length === 0 && (
                <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', textAlign: 'center', padding: '12px' }}>
                  No se encontraron escuelas con ese filtro.
                </p>
              )}

              {!buscandoCat && resultados.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflowY: 'auto', marginBottom: '4px' }}>
                  {resultados.map(esc => {
                    const sel = escuelaCatSel?.codigo === esc.codigo
                    return (
                      <button
                        key={esc.codigo}
                        onClick={() => elegirEscuelaCatalogo(esc)}
                        style={{
                          textAlign: 'left', padding: '10px 12px', cursor: 'pointer', fontFamily: 'inherit',
                          background: sel ? (esTropical ? cyan.claro : `${cyan.c}30`) : 'var(--color-bg-card)',
                          border: `1px solid ${sel ? cyan.c : 'var(--color-border-subtle)'}`,
                          borderRadius: '9px',
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                          <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {sel ? '✅ ' : ''}{esc.nombre}
                          </span>
                          <span style={{ fontSize: '10px', fontFamily: 'monospace', color: cyan.c, whiteSpace: 'nowrap' }}>
                            Cód: {esc.codigo}
                          </span>
                        </div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                          {esc.sector} · {esc.nivel || 'Sin nivel'} · 🍽️ {esc.matricula || 0} matrícula
                          {esc.latitud ? ' · 📍 GPS' : ''}
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}

              {escuelaCatSel && (
                <div style={{ background: esTropical ? SEC.verde.claro : `${SEC.verde.c}15`, border: `1px solid ${SEC.verde.c}40`, borderRadius: '9px', padding: '10px 12px', marginTop: '10px' }}>
                  <p style={{ fontSize: '12px', color: esTropical ? SEC.verde.dark : '#A8E0BD', margin: 0 }}>
                    ✅ <strong>{escuelaCatSel.nombre}</strong> seleccionada. Completa abajo los datos del contrato (raciones, precio, director).
                  </p>
                </div>
              )}

              <div style={{ marginTop: '14px', textAlign: 'center' }}>
                <button onClick={() => setModoManual(true)} style={{ background: 'none', border: 'none', color: cyan.c, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                  ¿No encuentras la escuela? Agrégala manualmente →
                </button>
              </div>
            </div>
          )}

          {/* ─── FORMULARIO (manual, o tras elegir del catálogo) ─── */}
          {(modoManual || escuelaCatSel) && (
            <>
              {agregando && !modoManual && escuelaCatSel && (
                <div style={{ marginBottom: '14px', textAlign: 'right' }}>
                  <button onClick={() => { setModoManual(true) }} style={{ background: 'none', border: 'none', color: cyan.c, fontSize: '11px', cursor: 'pointer', fontFamily: 'inherit', textDecoration: 'underline' }}>
                    ✏️ Editar datos de la escuela
                  </button>
                </div>
              )}

              <BloqueColor sec={SEC.azul} esTropical={esTropical} titulo="🏫 Identificación del Centro">
                <Campo label="Nombre del Centro Educativo *" sec={SEC.azul} esTropical={esTropical}>
                  <input type="text" placeholder="Ej: Centro Educativo Padre Adolfo" value={datosForm.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)} style={inputStyle()} />
                </Campo>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Campo label="Código del Centro" sec={SEC.azul} esTropical={esTropical}>
                    <input type="text" placeholder="Ej: 04377" value={datosForm.codigo_centro} onChange={(e) => actualizarCampo('codigo_centro', e.target.value)} style={inputStyle()} />
                  </Campo>
                  <Campo label="Regional / Distrito" sec={SEC.azul} esTropical={esTropical}>
                    <input type="text" placeholder="Ej: 09-02" value={datosForm.regional_distrito} onChange={(e) => actualizarCampo('regional_distrito', e.target.value)} style={inputStyle()} />
                  </Campo>
                </div>
              </BloqueColor>

              <BloqueColor sec={SEC.verde} esTropical={esTropical} titulo="📍 Ubicación">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Campo label="Provincia" sec={SEC.verde} esTropical={esTropical}>
                    <input type="text" placeholder="Ej: Valverde" value={datosForm.provincia} onChange={(e) => actualizarCampo('provincia', e.target.value)} style={inputStyle()} />
                  </Campo>
                  <Campo label="Municipio" sec={SEC.verde} esTropical={esTropical}>
                    <input type="text" placeholder="Ej: Mao" value={datosForm.municipio} onChange={(e) => actualizarCampo('municipio', e.target.value)} style={inputStyle()} />
                  </Campo>
                </div>
                <Campo label="Barrio / Sector" sec={SEC.verde} esTropical={esTropical}>
                  <input type="text" placeholder="Ej: Jícome" value={datosForm.barrio_sector} onChange={(e) => actualizarCampo('barrio_sector', e.target.value)} style={inputStyle()} />
                </Campo>
                <Campo label="Dirección detallada" sec={SEC.verde} esTropical={esTropical}>
                  <input type="text" placeholder="Ej: Calle Principal #45, frente a la iglesia" value={datosForm.direccion} onChange={(e) => actualizarCampo('direccion', e.target.value)} style={inputStyle()} />
                </Campo>
              </BloqueColor>

              <BloqueColor sec={SEC.morado} esTropical={esTropical} titulo="👤 Director del Centro">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <Campo label="Nombre del Director" sec={SEC.morado} esTropical={esTropical}>
                    <input type="text" placeholder="Ej: Lic. Juan Pérez" value={datosForm.director_nombre} onChange={(e) => actualizarCampo('director_nombre', e.target.value)} style={inputStyle()} />
                  </Campo>
                  <Campo label="Teléfono del Director" sec={SEC.morado} esTropical={esTropical}>
                    <input type="text" placeholder="Ej: 809-555-1234" value={datosForm.director_telefono} onChange={(e) => actualizarCampo('director_telefono', e.target.value)} style={inputStyle()} />
                  </Campo>
                </div>
              </BloqueColor>

              <BloqueColor sec={SEC.naranja} esTropical={esTropical} titulo="🍽️ Datos del Contrato PAE">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
                  <Campo label="Raciones contractuales" sec={SEC.naranja} esTropical={esTropical}>
                    <input type="number" placeholder="Ej: 250" value={datosForm.raciones_contractuales} onChange={(e) => actualizarCampo('raciones_contractuales', e.target.value)} style={inputStyle()} />
                  </Campo>
                  <Campo label="Precio por ración (RD$)" sec={SEC.naranja} esTropical={esTropical}>
                    <input type="number" step="0.01" placeholder="Ej: 71" value={datosForm.precio_racion} onChange={(e) => actualizarCampo('precio_racion', e.target.value)} style={inputStyle()} />
                  </Campo>
                  <Campo label="Distancia (km)" sec={SEC.naranja} esTropical={esTropical}>
                    <input type="number" step="0.1" placeholder="Ej: 3.5" value={datosForm.distancia_km} onChange={(e) => actualizarCampo('distancia_km', e.target.value)} style={inputStyle()} />
                  </Campo>
                </div>
              </BloqueColor>

              <BloqueColor sec={SEC.gris} esTropical={esTropical} titulo="📝 Observaciones">
                <textarea placeholder="Notas adicionales sobre la escuela, horarios, contactos secundarios, etc." value={datosForm.observaciones} onChange={(e) => actualizarCampo('observaciones', e.target.value)} rows={3} style={{ ...inputStyle(), resize: 'none' }} />
              </BloqueColor>
            </>
          )}

          <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
            {(modoManual || escuelaCatSel) && (
              <button onClick={guardar} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                💾 Guardar
              </button>
            )}
            <button onClick={cancelar} style={{ padding: '10px 20px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', color: 'var(--color-text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {escuelas.map(escuela => (
          <div key={escuela.id} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderLeft: '4px solid #1D9E75', borderRadius: '12px', padding: '14px 16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '220px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{escuela.nombre}</h4>
                  {escuela.codigo_centro && (
                    <span style={{ fontSize: '10px', background: esTropical ? SEC.azul.claro : `${SEC.azul.c}25`, color: esTropical ? SEC.azul.dark : SEC.azul.c, padding: '2px 8px', borderRadius: '10px', fontFamily: 'monospace', fontWeight: 600 }}>
                      Cód: {escuela.codigo_centro}
                    </span>
                  )}
                  {escuela.regional_distrito && (
                    <span style={{ fontSize: '10px', background: esTropical ? SEC.morado.claro : `${SEC.morado.c}25`, color: esTropical ? SEC.morado.dark : SEC.morado.c, padding: '2px 8px', borderRadius: '10px', fontFamily: 'monospace', fontWeight: 600 }}>
                      Reg/Dist: {escuela.regional_distrito}
                    </span>
                  )}
                  {escuela.latitud && (
                    <span style={{ fontSize: '10px', background: esTropical ? SEC.cyan.claro : `${SEC.cyan.c}25`, color: esTropical ? SEC.cyan.dark : SEC.cyan.c, padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                      📍 GPS
                    </span>
                  )}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  📍 {[escuela.barrio_sector, escuela.municipio, escuela.provincia].filter(Boolean).join(', ') || escuela.direccion || 'Sin ubicación'}
                  {escuela.distancia_km && ` · ${escuela.distancia_km} km`}
                </p>
                <div style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '11px', color: 'var(--color-text-secondary)', flexWrap: 'wrap' }}>
                  <span>👤 {escuela.director_nombre || '—'}</span>
                  <span>📞 {escuela.director_telefono || '—'}</span>
                  <span>🍽️ {escuela.raciones_contractuales || 0} raciones</span>
                  <span>💰 RD$ {escuela.precio_racion || 0}/ración</span>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => iniciarEdicion(escuela)} style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✏️ Editar
                </button>
                <button onClick={() => desactivar(escuela)} style={{ padding: '6px 12px', background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.15)', border: '1px solid rgba(226, 75, 74, 0.3)', borderRadius: '8px', color: esTropical ? '#A32D2D' : '#F4C0D1', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🗑️ Quitar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {escuelas.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
          No hay escuelas activas. Click en "Agregar escuela" para empezar.
        </div>
      )}
    </div>
  )
}

function BloqueColor({ sec, esTropical, titulo, children }) {
  return (
    <div style={{
      background: esTropical ? sec.claro : `${sec.c}15`,
      border: `1px solid ${sec.c}${esTropical ? '50' : '40'}`,
      borderLeft: `4px solid ${sec.c}`,
      borderRadius: '12px', padding: '16px', marginBottom: '14px',
    }}>
      <h5 style={{ fontSize: '13px', fontWeight: 600, color: esTropical ? sec.dark : sec.c, margin: '0 0 12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        {titulo}
      </h5>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {children}
      </div>
    </div>
  )
}

function Campo({ label, sec, esTropical, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: esTropical ? sec.dark : `${sec.c}DD`, marginBottom: '4px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function labelCat(sec, esTropical) {
  return { display: 'block', fontSize: '11px', fontWeight: 600, color: esTropical ? sec.dark : `${sec.c}DD`, marginBottom: '4px' }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  }
}

export default SeccionEscuelas