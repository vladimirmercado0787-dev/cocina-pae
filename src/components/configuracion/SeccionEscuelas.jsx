import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const FORM_INICIAL = {
  nombre: '', codigo_centro: '', regional_distrito: '',
  provincia: '', municipio: '', barrio_sector: '', direccion: '',
  director_nombre: '', director_telefono: '',
  raciones_contractuales: '', precio_racion: '', distancia_km: '',
  observaciones: '',
}

const SEC = {
  azul:    { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' },
  verde:   { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' },
  morado:  { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' },
  naranja: { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' },
  gris:    { c: '#888780', claro: '#F1EFE8', dark: '#3D3D38' },
}

function SeccionEscuelas({ empresaId, mostrarExito }) {
  const [escuelas, setEscuelas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [datosForm, setDatosForm] = useState(FORM_INICIAL)

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

  function iniciarEdicion(escuela) {
    setEditando(escuela.id)
    setAgregando(false)
    setDatosForm({
      nombre: escuela.nombre || '', codigo_centro: escuela.codigo_centro || '',
      regional_distrito: escuela.regional_distrito || '', provincia: escuela.provincia || '',
      municipio: escuela.municipio || '', barrio_sector: escuela.barrio_sector || '',
      direccion: escuela.direccion || '', director_nombre: escuela.director_nombre || '',
      director_telefono: escuela.director_telefono || '',
      raciones_contractuales: escuela.raciones_contractuales || '',
      precio_racion: escuela.precio_racion || '', distancia_km: escuela.distancia_km || '',
      observaciones: escuela.observaciones || '',
    })
  }

  function iniciarAgregado() {
    setAgregando(true)
    setEditando(null)
    setDatosForm({ ...FORM_INICIAL, precio_racion: '71' })
  }

  function cancelar() { setEditando(null); setAgregando(false); setDatosForm(FORM_INICIAL) }
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

          <div style={{ display: 'flex', gap: '8px', marginTop: '18px' }}>
            <button onClick={guardar} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
              💾 Guardar
            </button>
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

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  }
}

export default SeccionEscuelas