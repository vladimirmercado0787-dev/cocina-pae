import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const NARANJA = { c: '#D85A30', claro: '#FCE9DA', dark: '#7A2F12' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }
const MORADO = { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' }

function Paso2Escuelas({ empresaId }) {
  const [escuelas, setEscuelas] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  
  const [datos, setDatos] = useState({
    nombre: '', direccion: '', director_nombre: '', director_telefono: '',
    raciones_contractuales: '', precio_racion: '51.00', distancia_km: '',
    codigo_centro: '', regional_distrito: '', provincia: '', municipio: '', barrio_sector: ''
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

  useEffect(() => { if (empresaId) cargarEscuelas() }, [empresaId])

  async function cargarEscuelas() {
    const { data, error } = await supabase.from('escuelas').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: true })
    if (!error) setEscuelas(data)
  }

  function actualizarCampo(campo, valor) { setDatos({ ...datos, [campo]: valor }) }

  function resetFormulario() {
    setDatos({
      nombre: '', direccion: '', director_nombre: '', director_telefono: '',
      raciones_contractuales: '', precio_racion: '51.00', distancia_km: '',
      codigo_centro: '', regional_distrito: '', provincia: '', municipio: '', barrio_sector: ''
    })
    setMensaje(null)
  }

  async function agregarEscuela(e) {
    e.preventDefault()
    if (!datos.nombre || !datos.raciones_contractuales) {
      setMensaje({ tipo: 'error', texto: 'Nombre y raciones son obligatorios' })
      return
    }
    setGuardando(true)
    setMensaje(null)
    try {
      const escuelaParaGuardar = {
        empresa_id: empresaId, nombre: datos.nombre,
        direccion: datos.direccion || null,
        director_nombre: datos.director_nombre || null,
        director_telefono: datos.director_telefono || null,
        raciones_contractuales: parseInt(datos.raciones_contractuales),
        precio_racion: parseFloat(datos.precio_racion),
        distancia_km: datos.distancia_km ? parseFloat(datos.distancia_km) : null,
        codigo_centro: datos.codigo_centro || null,
        regional_distrito: datos.regional_distrito || null,
        provincia: datos.provincia || null,
        municipio: datos.municipio || null,
        barrio_sector: datos.barrio_sector || null
      }
      const { error } = await supabase.from('escuelas').insert([escuelaParaGuardar]).select()
      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + error.message })
      } else {
        setMensaje({ tipo: 'exito', texto: '✅ Escuela agregada correctamente' })
        resetFormulario()
        setMostrarFormulario(false)
        cargarEscuelas()
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + err.message })
    } finally { setGuardando(false) }
  }

  async function eliminarEscuela(id) {
    const { error } = await supabase.from('escuelas').delete().eq('id', id)
    if (!error) cargarEscuelas()
  }

  const totalRaciones = escuelas.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0)
  const facturacionDiaria = escuelas.reduce((sum, e) => sum + ((e.raciones_contractuales || 0) * (parseFloat(e.precio_racion) || 0)), 0)
  const facturacionMensual = facturacionDiaria * 22

  if (!empresaId) {
    return (
      <div style={alertaTopStyle(AMBAR, esTropical)}>
        <p style={{ color: esTropical ? AMBAR.dark : '#FAC775', margin: 0 }}>
          ⚠️ Primero debes registrar tu cocina en el Paso 1
        </p>
      </div>
    )
  }

  return (
    <div style={tarjetaStyle()}>
      
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', color: NARANJA.c, fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>
          PASO 2 DE 6 · ESTIMADO 5 MIN
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          🏫 Escuelas
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Agrega las escuelas que atiende tu cocina con datos completos INABIE
        </p>
      </div>

      {/* KPIs */}
      {escuelas.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '24px' }}>
          <KpiCard color={AZUL} esTropical={esTropical} label="ESCUELAS" valor={escuelas.length} />
          <KpiCard color={VERDE} esTropical={esTropical} label="RACIONES/DÍA" valor={totalRaciones.toLocaleString()} />
          <KpiCard color={NARANJA} esTropical={esTropical} label="FACTURACIÓN/MES" valor={`RD$ ${(facturacionMensual / 1000).toFixed(0)}K`} />
        </div>
      )}

      {/* LISTA */}
      {escuelas.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {escuelas.map((escuela, i) => (
            <div key={escuela.id} style={{
              display: 'flex', alignItems: 'center', gap: '16px', padding: '14px',
              background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)',
              borderRadius: '10px',
            }}>
              <div style={{
                width: '40px', height: '40px', borderRadius: '50%',
                background: esTropical ? AZUL.claro : `${AZUL.c}20`,
                color: AZUL.c, display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700,
              }}>
                {i + 1}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{escuela.nombre}</p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                  {escuela.raciones_contractuales} raciones × RD$ {escuela.precio_racion}
                  {escuela.director_nombre && ` · ${escuela.director_nombre}`}
                </p>
                {escuela.codigo_centro && (
                  <p style={{ fontSize: '11px', color: AZUL.c, fontFamily: 'monospace', margin: '4px 0 0' }}>
                    🏷️ Cód: {escuela.codigo_centro}
                    {escuela.regional_distrito && ` · Regional: ${escuela.regional_distrito}`}
                  </p>
                )}
              </div>
              <button onClick={() => eliminarEscuela(escuela.id)}
                style={{ background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: '13px', padding: '6px 12px', fontFamily: 'inherit' }}>
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* BOTÓN o FORMULARIO */}
      {!mostrarFormulario ? (
        <button onClick={() => setMostrarFormulario(true)} style={botonDashedStyle(AZUL, esTropical)}>
          + Agregar escuela
        </button>
      ) : (
        <form onSubmit={agregarEscuela} style={{
          display: 'flex', flexDirection: 'column', gap: '16px',
          background: 'var(--color-bg-card)', padding: '20px',
          borderRadius: '12px', border: '1px solid var(--color-border-subtle)',
        }}>
          <h3 style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, fontSize: '16px' }}>Nueva escuela</h3>

          {/* DATOS BÁSICOS */}
          <div>
            <p style={tituloSeccionStyle()}>📋 DATOS BÁSICOS</p>
            <Campo label="Nombre de la escuela" requerido>
              <input type="text" value={datos.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)}
                placeholder="Ej: Escuela San Juan Bautista" style={inputStyle()} />
            </Campo>
          </div>

          {/* DATOS INABIE */}
          <div style={bloqueColorStyle(AZUL, esTropical)}>
            <p style={tituloBloqueStyle(AZUL, esTropical)}>🏛️ DATOS OFICIALES INABIE</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Campo label="Código del Centro">
                <input type="text" value={datos.codigo_centro} onChange={(e) => actualizarCampo('codigo_centro', e.target.value)}
                  placeholder="Ej: 04377" style={{ ...inputStyle(), fontFamily: 'monospace' }} />
                <p style={textoAyudaStyle()}>Código asignado por INABIE</p>
              </Campo>
              <Campo label="Regional/Distrito">
                <input type="text" value={datos.regional_distrito} onChange={(e) => actualizarCampo('regional_distrito', e.target.value)}
                  placeholder="Ej: 09-02" style={{ ...inputStyle(), fontFamily: 'monospace' }} />
                <p style={textoAyudaStyle()}>Regional - Distrito</p>
              </Campo>
            </div>
          </div>

          {/* UBICACIÓN */}
          <div style={bloqueColorStyle(AMBAR, esTropical)}>
            <p style={tituloBloqueStyle(AMBAR, esTropical)}>📍 UBICACIÓN DETALLADA</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <Campo label="Provincia">
                <input type="text" value={datos.provincia} onChange={(e) => actualizarCampo('provincia', e.target.value)}
                  placeholder="Ej: Valverde" style={inputStyle()} />
              </Campo>
              <Campo label="Municipio">
                <input type="text" value={datos.municipio} onChange={(e) => actualizarCampo('municipio', e.target.value)}
                  placeholder="Ej: Esperanza" style={inputStyle()} />
              </Campo>
            </div>
            <Campo label="Barrio / Sector">
              <input type="text" value={datos.barrio_sector} onChange={(e) => actualizarCampo('barrio_sector', e.target.value)}
                placeholder="Ej: Barrio Buena Vista / El Bolsillo" style={inputStyle()} />
            </Campo>
            <div style={{ marginTop: '12px' }}>
              <Campo label="Dirección (calle, número)">
                <input type="text" value={datos.direccion} onChange={(e) => actualizarCampo('direccion', e.target.value)}
                  placeholder="Ej: Calle Primera No. 7" style={inputStyle()} />
              </Campo>
            </div>
          </div>

          {/* DIRECTOR */}
          <div style={bloqueColorStyle(MORADO, esTropical)}>
            <p style={tituloBloqueStyle(MORADO, esTropical)}>👤 DIRECTOR(A) DEL CENTRO</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <Campo label="Nombre completo">
                <input type="text" value={datos.director_nombre} onChange={(e) => actualizarCampo('director_nombre', e.target.value)}
                  placeholder="Ej: Migdalia Domínguez" style={inputStyle()} />
              </Campo>
              <Campo label="Teléfono">
                <input type="tel" value={datos.director_telefono} onChange={(e) => actualizarCampo('director_telefono', e.target.value)}
                  placeholder="829-294-6109" style={inputStyle()} />
              </Campo>
            </div>
          </div>

          {/* CONTRATO */}
          <div style={bloqueColorStyle(VERDE, esTropical)}>
            <p style={tituloBloqueStyle(VERDE, esTropical)}>💰 CONTRATO</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
              <Campo label="Raciones" requerido>
                <input type="number" value={datos.raciones_contractuales} onChange={(e) => actualizarCampo('raciones_contractuales', e.target.value)}
                  placeholder="350" style={inputStyle()} />
              </Campo>
              <Campo label="Precio/ración">
                <input type="number" step="0.01" value={datos.precio_racion} onChange={(e) => actualizarCampo('precio_racion', e.target.value)} style={inputStyle()} />
              </Campo>
              <Campo label="Distancia (km)">
                <input type="number" step="0.1" value={datos.distancia_km} onChange={(e) => actualizarCampo('distancia_km', e.target.value)}
                  placeholder="4.5" style={inputStyle()} />
              </Campo>
            </div>
          </div>

          {mensaje && <Mensaje mensaje={mensaje} esTropical={esTropical} />}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={() => { setMostrarFormulario(false); resetFormulario() }}
              style={botonCancelarStyle()}>Cancelar</button>
            <button type="submit" disabled={guardando} style={botonAccionStyle(AZUL, guardando)}>
              {guardando ? 'Guardando...' : 'Agregar escuela'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}

function Campo({ label, requerido, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
        {label} {requerido && <span style={{ color: '#E24B4A' }}>*</span>}
      </label>
      {children}
    </div>
  )
}

function KpiCard({ color, esTropical, label, valor }) {
  return (
    <div style={{
      background: esTropical ? color.claro : `${color.c}15`,
      border: `1px solid ${color.c}40`, borderRadius: '10px', padding: '14px',
    }}>
      <p style={{ fontSize: '10px', color: esTropical ? color.dark : color.c, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '4px' }}>{label}</p>
      <p style={{ fontSize: '22px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{valor}</p>
    </div>
  )
}

function Mensaje({ mensaje, esTropical }) {
  const colorBase = mensaje.tipo === 'exito' ? '#1D9E75' : '#E24B4A'
  return (
    <div style={{
      background: esTropical 
        ? (mensaje.tipo === 'exito' ? '#D7F0DD' : '#FCEBEB') 
        : `${colorBase}15`,
      border: `1px solid ${colorBase}40`, borderRadius: '8px', padding: '10px 12px',
      color: esTropical ? (mensaje.tipo === 'exito' ? '#04342C' : '#A32D2D') : (mensaje.tipo === 'exito' ? '#A8E0BD' : '#F4C0D1'),
      fontSize: '13px',
    }}>
      {mensaje.texto}
    </div>
  )
}

function tarjetaStyle() {
  return {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '16px', padding: '32px', maxWidth: '760px', width: '100%',
    boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
  }
}

function alertaTopStyle(color, esTropical) {
  return {
    background: esTropical ? color.claro : `${color.c}15`,
    border: `1px solid ${color.c}40`, borderRadius: '16px',
    padding: '32px', maxWidth: '760px', width: '100%',
  }
}

function tituloSeccionStyle() {
  return { fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '10px' }
}

function bloqueColorStyle(color, esTropical) {
  return {
    background: esTropical ? color.claro : `${color.c}12`,
    border: `1px solid ${color.c}40`, borderRadius: '12px', padding: '16px',
  }
}

function tituloBloqueStyle(color, esTropical) {
  return { fontSize: '11px', color: esTropical ? color.dark : color.c, fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px' }
}

function textoAyudaStyle() {
  return { fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '10px 14px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '14px',
    fontFamily: 'inherit', outline: 'none',
  }
}

function botonDashedStyle(color, esTropical) {
  return {
    width: '100%', padding: '18px',
    background: 'transparent', border: `2px dashed ${color.c}`,
    color: esTropical ? color.dark : color.c, fontSize: '14px', fontWeight: 600,
    borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
  }
}

function botonCancelarStyle() {
  return {
    flex: 1, padding: '12px 20px', background: 'var(--color-bg-card)',
    border: '1px solid var(--color-border-subtle)', borderRadius: '10px',
    color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

function botonAccionStyle(color, disabled) {
  return {
    flex: 1, padding: '12px 20px',
    background: `linear-gradient(135deg, ${color.c} 0%, ${color.dark} 100%)`,
    border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    opacity: disabled ? 0.6 : 1,
  }
}

export default Paso2Escuelas