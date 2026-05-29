import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const NARANJA = { c: '#D85A30', claro: '#FCE9DA', dark: '#7A2F12' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }

const ROLES = [
  { id: 'propietario', nombre: 'Propietario', emoji: '👑', descripcion: 'Acceso completo' },
  { id: 'administrador', nombre: 'Administrador', emoji: '💼', descripcion: 'Operaciones y reportes' },
  { id: 'jefa_cocina', nombre: 'Jefa de cocina', emoji: '👩‍🍳', descripcion: 'Manda en la cocina' },
  { id: 'despachador', nombre: 'Despachador', emoji: '🚚', descripcion: 'Lleva comida a escuelas' },
  { id: 'ayudante', nombre: 'Ayudante', emoji: '👨‍🍳', descripcion: 'Apoyo general' },
  { id: 'contador', nombre: 'Contador', emoji: '🧮', descripcion: 'Solo finanzas' }
]

function Paso5Personal({ empresaId }) {
  const [usuarios, setUsuarios] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  
  const [datos, setDatos] = useState({
    nombre: '', rol: 'ayudante', pin: '', telefono: '', email: ''
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

  useEffect(() => { if (empresaId) cargarUsuarios() }, [empresaId])

  async function cargarUsuarios() {
    const { data, error } = await supabase.from('usuarios').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: true })
    if (!error) setUsuarios(data)
  }

  function actualizarCampo(campo, valor) { setDatos({ ...datos, [campo]: valor }) }
  function resetFormulario() {
    setDatos({ nombre: '', rol: 'ayudante', pin: '', telefono: '', email: '' })
    setMensaje(null)
  }
  function generarPinSugerido() {
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    actualizarCampo('pin', pin)
  }

  async function agregarUsuario(e) {
    e.preventDefault()
    if (!datos.nombre || !datos.pin) {
      setMensaje({ tipo: 'error', texto: 'Nombre y PIN son obligatorios' })
      return
    }
    if (datos.pin.length !== 4 || !/^\d+$/.test(datos.pin)) {
      setMensaje({ tipo: 'error', texto: 'El PIN debe tener exactamente 4 dígitos' })
      return
    }
    const pinDuplicado = usuarios.find(u => u.pin === datos.pin)
    if (pinDuplicado) {
      setMensaje({ tipo: 'error', texto: `El PIN ${datos.pin} ya está usado por ${pinDuplicado.nombre}` })
      return
    }
    setGuardando(true)
    setMensaje(null)
    try {
      const usuarioParaGuardar = {
        empresa_id: empresaId, nombre: datos.nombre, rol: datos.rol, pin: datos.pin,
        telefono: datos.telefono || null, email: datos.email || null
      }
      const { error } = await supabase.from('usuarios').insert([usuarioParaGuardar]).select()
      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + error.message })
      } else {
        setMensaje({ tipo: 'exito', texto: '✅ Persona agregada' })
        resetFormulario()
        setMostrarFormulario(false)
        cargarUsuarios()
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + err.message })
    } finally { setGuardando(false) }
  }

  async function eliminarUsuario(id) {
    const { error } = await supabase.from('usuarios').delete().eq('id', id)
    if (!error) cargarUsuarios()
  }

  function getRol(rolId) { return ROLES.find(r => r.id === rolId) || ROLES[4] }

  if (!empresaId) {
    return (
      <div style={alertaTopStyle(AMBAR, esTropical)}>
        <p style={{ color: esTropical ? AMBAR.dark : '#FAC775', margin: 0 }}>⚠️ Primero registra tu cocina en el Paso 1</p>
      </div>
    )
  }

  return (
    <div style={tarjetaStyle()}>
      
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', color: NARANJA.c, fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>
          PASO 5 DE 6 · ESTIMADO 5 MIN
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          👥 Personal y roles
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Registra a las personas que trabajan en la cocina
        </p>
      </div>

      {/* TIP */}
      <div style={{
        background: esTropical ? AZUL.claro : `${AZUL.c}12`,
        border: `1px solid ${AZUL.c}40`, borderRadius: '10px',
        padding: '14px', marginBottom: '24px',
      }}>
        <p style={{ fontSize: '13px', color: esTropical ? AZUL.dark : '#A9CFF2', margin: 0 }}>
          💡 <strong>Cada persona tiene un PIN de 4 dígitos</strong> para entrar a la app.
          Cada rol ve diferentes pantallas: el despachador solo ve su lista de entregas,
          la jefa de cocina ve el menú del día, etc.
        </p>
      </div>

      {/* RESUMEN */}
      {usuarios.length > 0 && (
        <div style={{
          background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)',
          borderRadius: '10px', padding: '16px', marginBottom: '24px',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px',
        }}>
          <div>
            <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.5px', margin: 0 }}>PERSONAL REGISTRADO</p>
            <p style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '4px 0 0' }}>
              {usuarios.length} {usuarios.length === 1 ? 'persona' : 'personas'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            {ROLES.map((rol) => {
              const count = usuarios.filter(u => u.rol === rol.id).length
              if (count === 0) return null
              return (
                <span key={rol.id} style={{
                  padding: '4px 10px', background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-subtle)', borderRadius: '999px',
                  fontSize: '12px', color: 'var(--color-text-secondary)',
                }}>
                  {rol.emoji} {count}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* LISTA */}
      {usuarios.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '24px' }}>
          {usuarios.map((usuario) => {
            const rol = getRol(usuario.rol)
            return (
              <div key={usuario.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '14px',
                background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)',
                borderRadius: '10px',
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: esTropical ? AZUL.claro : `${AZUL.c}20`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '22px',
                }}>
                  {rol.emoji}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{usuario.nombre}</p>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                    {rol.nombre} · PIN: <span style={{ fontFamily: 'monospace', fontWeight: 700, color: 'var(--color-text-secondary)' }}>{usuario.pin}</span>
                    {usuario.telefono && ` · ${usuario.telefono}`}
                  </p>
                </div>
                <button onClick={() => eliminarUsuario(usuario.id)}
                  style={{ background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: '13px', padding: '6px 12px', fontFamily: 'inherit' }}>
                  Eliminar
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* BOTÓN o FORMULARIO */}
      {!mostrarFormulario ? (
        <button onClick={() => { setMostrarFormulario(true); generarPinSugerido() }}
          style={botonDashedStyle(AZUL, esTropical)}>
          + Agregar persona
        </button>
      ) : (
        <form onSubmit={agregarUsuario} style={{
          display: 'flex', flexDirection: 'column', gap: '16px',
          background: 'var(--color-bg-card)', padding: '20px',
          borderRadius: '12px', border: '1px solid var(--color-border-subtle)',
        }}>
          <h3 style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, fontSize: '16px' }}>Nueva persona</h3>

          <Campo label="Nombre completo" requerido>
            <input type="text" value={datos.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)}
              placeholder="Ej: María Pérez" style={inputStyle()} />
          </Campo>

          <div>
            <label style={labelStyle()}>ROL EN LA COCINA</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              {ROLES.map((rol) => (
                <button key={rol.id} type="button" onClick={() => actualizarCampo('rol', rol.id)}
                  style={{
                    padding: '12px', textAlign: 'left', borderRadius: '10px',
                    border: `2px solid ${datos.rol === rol.id ? AZUL.c : 'var(--color-border-subtle)'}`,
                    background: datos.rol === rol.id ? (esTropical ? AZUL.claro : `${AZUL.c}15`) : 'var(--color-bg-elevated)',
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                  <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, fontSize: '13px' }}>
                    {rol.emoji} {rol.nombre}
                  </p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>{rol.descripcion}</p>
                </button>
              ))}
            </div>
          </div>

          {/* PIN */}
          <Campo label="PIN de 4 dígitos" requerido>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" maxLength="4" value={datos.pin}
                onChange={(e) => actualizarCampo('pin', e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                style={{ ...inputStyle(), flex: 1, textAlign: 'center', fontFamily: 'monospace', fontSize: '22px', fontWeight: 700 }} />
              <button type="button" onClick={generarPinSugerido}
                style={{
                  padding: '10px 16px',
                  background: esTropical ? AZUL.claro : `${AZUL.c}20`,
                  color: esTropical ? AZUL.dark : AZUL.c, border: 'none', borderRadius: '10px',
                  fontSize: '13px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                🎲 Generar
              </button>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              Esta persona usará este PIN para entrar a la app
            </p>
          </Campo>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Campo label="Teléfono">
              <input type="tel" value={datos.telefono} onChange={(e) => actualizarCampo('telefono', e.target.value)}
                placeholder="809-555-0000" style={inputStyle()} />
            </Campo>
            <Campo label="Email">
              <input type="email" value={datos.email} onChange={(e) => actualizarCampo('email', e.target.value)}
                placeholder="opcional" style={inputStyle()} />
            </Campo>
          </div>

          {mensaje && <Mensaje mensaje={mensaje} esTropical={esTropical} />}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={() => { setMostrarFormulario(false); resetFormulario() }} style={botonCancelarStyle()}>
              Cancelar
            </button>
            <button type="submit" disabled={guardando} style={botonAccionStyle(AZUL, guardando)}>
              {guardando ? 'Guardando...' : 'Agregar persona'}
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

function labelStyle() {
  return { display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.5px', marginBottom: '8px' }
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

export default Paso5Personal