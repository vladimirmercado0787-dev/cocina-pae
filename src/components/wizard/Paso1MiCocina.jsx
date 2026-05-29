import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const NARANJA = { c: '#D85A30', claro: '#FCE9DA', dark: '#7A2F12' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }

function Paso1MiCocina({ onCompletado }) {
  const [datos, setDatos] = useState({
    nombre: '', rnc: '', direccion: '', telefono: '', email: '',
    banco: '', cuenta_bancaria: '', modo_operacion: 'aprendizaje'
  })
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

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

  function actualizarCampo(campo, valor) { setDatos({ ...datos, [campo]: valor }) }

  async function guardar(e) {
    e.preventDefault()
    if (!datos.nombre || !datos.rnc) {
      setMensaje({ tipo: 'error', texto: 'Nombre y RNC son obligatorios' })
      return
    }
    setGuardando(true)
    setMensaje(null)
    try {
      const { data, error } = await supabase.from('empresas').insert([datos]).select()
      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + error.message })
      } else {
        setMensaje({ tipo: 'exito', texto: '✅ Cocina guardada correctamente' })
        if (onCompletado) onCompletado(data[0])
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + err.message })
    } finally { setGuardando(false) }
  }

  return (
    <div style={tarjetaStyle()}>
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', color: NARANJA.c, fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>
          PASO 1 DE 6 · ESTIMADO 2 MIN
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          🏢 Mi cocina
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Datos legales y de contacto de tu cocina
        </p>
      </div>

      <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        <Campo label="Nombre de la cocina" requerido>
          <input type="text" value={datos.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)}
            placeholder="Ej: Hacienda Mercado Rodríguez" style={inputStyle()} />
        </Campo>

        <Campo label="RNC" requerido>
          <input type="text" value={datos.rnc} onChange={(e) => actualizarCampo('rnc', e.target.value)}
            placeholder="Ej: 1-31-44XXX-X" style={inputStyle()} />
        </Campo>

        <Campo label="Dirección">
          <input type="text" value={datos.direccion} onChange={(e) => actualizarCampo('direccion', e.target.value)}
            placeholder="Ej: Calle Principal #15, Jícome, Valverde" style={inputStyle()} />
        </Campo>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Campo label="Teléfono">
            <input type="tel" value={datos.telefono} onChange={(e) => actualizarCampo('telefono', e.target.value)}
              placeholder="809-555-1234" style={inputStyle()} />
          </Campo>
          <Campo label="Email">
            <input type="email" value={datos.email} onChange={(e) => actualizarCampo('email', e.target.value)}
              placeholder="contacto@cocina.com" style={inputStyle()} />
          </Campo>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Campo label="Banco">
            <input type="text" value={datos.banco} onChange={(e) => actualizarCampo('banco', e.target.value)}
              placeholder="Ej: Banco BHD" style={inputStyle()} />
          </Campo>
          <Campo label="Cuenta bancaria">
            <input type="text" value={datos.cuenta_bancaria} onChange={(e) => actualizarCampo('cuenta_bancaria', e.target.value)}
              placeholder="1234567890" style={inputStyle()} />
          </Campo>
        </div>

        {/* MODO DE OPERACIÓN */}
        <div>
          <label style={labelStyle()}>MODO DE OPERACIÓN</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <OpcionRadio 
              activa={datos.modo_operacion === 'aprendizaje'}
              onClick={() => actualizarCampo('modo_operacion', 'aprendizaje')}
              color={VERDE} esTropical={esTropical}
              titulo="🌱 Aprendizaje" descripcion="App aprende de ti (3-4 semanas)"
            />
            <OpcionRadio 
              activa={datos.modo_operacion === 'detallado'}
              onClick={() => actualizarCampo('modo_operacion', 'detallado')}
              color={AZUL} esTropical={esTropical}
              titulo="📊 Detallado" descripcion="Cargas cantidades exactas"
            />
          </div>
        </div>

        {mensaje && <Mensaje mensaje={mensaje} esTropical={esTropical} />}

        <button type="submit" disabled={guardando} style={botonPrincipalStyle(guardando)}>
          {guardando ? 'Guardando...' : 'Guardar y continuar →'}
        </button>
      </form>
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

function OpcionRadio({ activa, onClick, color, esTropical, titulo, descripcion }) {
  return (
    <div onClick={onClick} style={{
      cursor: 'pointer',
      border: `2px solid ${activa ? color.c : 'var(--color-border-subtle)'}`,
      background: activa ? (esTropical ? color.claro : `${color.c}15`) : 'var(--color-bg-elevated)',
      padding: '14px', borderRadius: '10px', transition: 'all 0.15s',
    }}>
      <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, fontSize: '14px' }}>{titulo}</p>
      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>{descripcion}</p>
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
      border: `1px solid ${colorBase}40`, borderRadius: '8px', padding: '12px',
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

function labelStyle() {
  return { display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '10px 14px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '14px',
    fontFamily: 'inherit', outline: 'none',
  }
}

function botonPrincipalStyle(disabled) {
  return {
    width: '100%', padding: '14px 24px',
    background: 'linear-gradient(135deg, #D85A30 0%, #B53D1A 100%)',
    border: 'none', borderRadius: '12px', color: 'white', fontSize: '15px', fontWeight: 700,
    cursor: disabled ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
    opacity: disabled ? 0.6 : 1, transition: 'all 0.15s',
  }
}

export default Paso1MiCocina