import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const NARANJA = { c: '#D85A30', claro: '#FCE9DA', dark: '#7A2F12' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }

const DIAS = [
  { id: 'lunes', nombre: 'Lunes', emoji: '📅' },
  { id: 'martes', nombre: 'Martes', emoji: '📅' },
  { id: 'miercoles', nombre: 'Miércoles', emoji: '📅' },
  { id: 'jueves', nombre: 'Jueves', emoji: '📅' },
  { id: 'viernes', nombre: 'Viernes', emoji: '📅' }
]

const PLATOS_SUGERIDOS = [
  { nombre: 'Locrio de pollo', emoji: '🍗' },
  { nombre: 'Habichuelas guisadas con arroz', emoji: '🫘' },
  { nombre: 'Carne guisada con arroz', emoji: '🥩' },
  { nombre: 'Sancocho', emoji: '🍲' },
  { nombre: 'Espagueti con sardinas', emoji: '🍝' },
  { nombre: 'Pollo guisado con arroz', emoji: '🍗' },
  { nombre: 'Pescado guisado con arroz', emoji: '🐟' },
  { nombre: 'Asopao de pollo', emoji: '🥣' },
  { nombre: 'Mondongo', emoji: '🍲' },
  { nombre: 'Moro de habichuelas', emoji: '🍚' }
]

function Paso3MenuInabie({ empresaId }) {
  const [recetas, setRecetas] = useState([])
  const [diaActivo, setDiaActivo] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  
  const [datos, setDatos] = useState({
    nombre: '', emoji: '🍽️', popularidad: 'normal', notas: ''
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

  useEffect(() => { if (empresaId) cargarRecetas() }, [empresaId])

  async function cargarRecetas() {
    const { data, error } = await supabase.from('recetas').select('*').eq('empresa_id', empresaId).order('created_at', { ascending: true })
    if (!error) setRecetas(data)
  }

  function actualizarCampo(campo, valor) { setDatos({ ...datos, [campo]: valor }) }
  function resetFormulario() {
    setDatos({ nombre: '', emoji: '🍽️', popularidad: 'normal', notas: '' })
    setMensaje(null)
  }
  function usarSugerencia(plato) {
    setDatos({ ...datos, nombre: plato.nombre, emoji: plato.emoji })
  }

  async function agregarReceta(e) {
    e.preventDefault()
    if (!datos.nombre) {
      setMensaje({ tipo: 'error', texto: 'El nombre del plato es obligatorio' })
      return
    }
    setGuardando(true)
    setMensaje(null)
    try {
      const recetaParaGuardar = {
        empresa_id: empresaId, nombre: datos.nombre, emoji: datos.emoji,
        dia_semana: diaActivo, popularidad: datos.popularidad, notas: datos.notas || null
      }
      const { error } = await supabase.from('recetas').insert([recetaParaGuardar]).select()
      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + error.message })
      } else {
        setMensaje({ tipo: 'exito', texto: '✅ Plato agregado' })
        resetFormulario()
        setDiaActivo(null)
        cargarRecetas()
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + err.message })
    } finally { setGuardando(false) }
  }

  async function eliminarReceta(id) {
    const { error } = await supabase.from('recetas').delete().eq('id', id)
    if (!error) cargarRecetas()
  }

  function recetaDelDia(dia) {
    return recetas.find(r => r.dia_semana === dia)
  }

  if (!empresaId) {
    return (
      <div style={alertaTopStyle(AMBAR, esTropical)}>
        <p style={{ color: esTropical ? AMBAR.dark : '#FAC775', margin: 0 }}>
          ⚠️ Primero debes registrar tu cocina en el Paso 1
        </p>
      </div>
    )
  }

  const recetasCompletas = recetas.filter(r => r.dia_semana !== 'extra').length

  return (
    <div style={tarjetaStyle()}>
      
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', color: NARANJA.c, fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>
          PASO 3 DE 6 · ESTIMADO 5 MIN
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          🍽️ Menú INABIE
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Asigna un plato a cada día de la semana
        </p>
      </div>

      {/* TIP EDUCATIVO */}
      <div style={{
        background: esTropical ? AZUL.claro : `${AZUL.c}12`,
        border: `1px solid ${AZUL.c}40`, borderRadius: '10px',
        padding: '14px', marginBottom: '24px',
      }}>
        <p style={{ fontSize: '13px', color: esTropical ? AZUL.dark : '#A9CFF2', margin: 0 }}>
          💡 <strong>Tip:</strong> El menú INABIE estándar son 5 platos que rotan cada semana. 
          Agrégalos uno por día. Después podrás añadir platos extras para días especiales.
        </p>
      </div>

      {/* LISTA DE LOS 5 DÍAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
        {DIAS.map((dia) => {
          const receta = recetaDelDia(dia.id)
          const seleccionado = diaActivo === dia.id

          // DÍA CON RECETA
          if (receta) {
            return (
              <div key={dia.id} style={{
                display: 'flex', alignItems: 'center', gap: '14px', padding: '14px',
                background: esTropical ? VERDE.claro : `${VERDE.c}12`,
                border: `1px solid ${VERDE.c}40`, borderRadius: '10px',
              }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '50%',
                  background: esTropical ? '#FFFFFF' : `${VERDE.c}25`,
                  color: VERDE.c, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: '13px',
                }}>
                  {dia.nombre.substring(0, 3)}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, fontSize: '15px' }}>
                    <span style={{ fontSize: '22px', marginRight: '8px' }}>{receta.emoji}</span>
                    {receta.nombre}
                  </p>
                  {receta.popularidad === 'baja' && (
                    <p style={{ fontSize: '11px', color: NARANJA.c, margin: '4px 0 0' }}>⚠️ Popularidad baja (suelen sobrar)</p>
                  )}
                  {receta.popularidad === 'alta' && (
                    <p style={{ fontSize: '11px', color: VERDE.c, margin: '4px 0 0' }}>⭐ Plato favorito</p>
                  )}
                </div>
                <button onClick={() => eliminarReceta(receta.id)}
                  style={{ background: 'none', border: 'none', color: '#E24B4A', cursor: 'pointer', fontSize: '13px', padding: '6px 12px', fontFamily: 'inherit' }}>
                  Cambiar
                </button>
              </div>
            )
          }

          // DÍA EN EDICIÓN
          if (seleccionado) {
            return (
              <div key={dia.id} style={{
                background: 'var(--color-bg-card)',
                border: `2px solid ${AZUL.c}`, borderRadius: '12px', padding: '18px',
                display: 'flex', flexDirection: 'column', gap: '14px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: esTropical ? AZUL.claro : `${AZUL.c}25`,
                    color: AZUL.c, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 700, fontSize: '12px',
                  }}>
                    {dia.nombre.substring(0, 3)}
                  </div>
                  <h4 style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, fontSize: '15px' }}>
                    ¿Qué se cocina los {dia.nombre.toLowerCase()}?
                  </h4>
                </div>

                {/* SUGERENCIAS */}
                <div>
                  <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.5px', marginBottom: '8px' }}>
                    SUGERENCIAS RÁPIDAS:
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {PLATOS_SUGERIDOS.slice(0, 6).map((plato) => (
                      <button key={plato.nombre} type="button" onClick={() => usarSugerencia(plato)}
                        style={{
                          padding: '6px 12px', background: 'var(--color-bg-input)',
                          border: '1px solid var(--color-border-subtle)', borderRadius: '999px',
                          color: 'var(--color-text-primary)', fontSize: '12px', cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}>
                        {plato.emoji} {plato.nombre}
                      </button>
                    ))}
                  </div>
                </div>

                <form onSubmit={agregarReceta} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input type="text" value={datos.emoji} onChange={(e) => actualizarCampo('emoji', e.target.value)}
                      style={{ ...inputStyle(), width: '60px', textAlign: 'center', fontSize: '20px' }} />
                    <input type="text" value={datos.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)}
                      placeholder="Nombre del plato" style={{ ...inputStyle(), flex: 1 }} />
                  </div>

                  <div>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
                      ¿Cómo es la popularidad de este plato?
                    </label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <BotonPopularidad activo={datos.popularidad === 'alta'} onClick={() => actualizarCampo('popularidad', 'alta')} color={VERDE} esTropical={esTropical} texto="⭐ Favorito" />
                      <BotonPopularidad activo={datos.popularidad === 'normal'} onClick={() => actualizarCampo('popularidad', 'normal')} color={AZUL} esTropical={esTropical} texto="😊 Normal" />
                      <BotonPopularidad activo={datos.popularidad === 'baja'} onClick={() => actualizarCampo('popularidad', 'baja')} color={NARANJA} esTropical={esTropical} texto="⚠️ Suele sobrar" />
                    </div>
                  </div>

                  {mensaje && <Mensaje mensaje={mensaje} esTropical={esTropical} />}

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={() => { setDiaActivo(null); resetFormulario() }} style={botonCancelarStyle()}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={guardando} style={botonAccionStyle(AZUL, guardando)}>
                      {guardando ? 'Guardando...' : 'Asignar plato'}
                    </button>
                  </div>
                </form>
              </div>
            )
          }

          // DÍA VACÍO
          return (
            <button key={dia.id} onClick={() => { setDiaActivo(dia.id); resetFormulario() }}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '14px', padding: '14px',
                background: 'transparent', border: '2px dashed var(--color-border-subtle)',
                borderRadius: '10px', cursor: 'pointer', textAlign: 'left',
                fontFamily: 'inherit', transition: 'all 0.15s',
              }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '50%',
                background: 'var(--color-bg-card)',
                color: 'var(--color-text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: '13px',
              }}>
                {dia.nombre.substring(0, 3)}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: 'var(--color-text-secondary)', margin: 0 }}>{dia.nombre}</p>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>+ Asignar plato</p>
              </div>
            </button>
          )
        })}
      </div>

      {recetasCompletas === 5 && (
        <div style={{
          background: esTropical ? VERDE.claro : `${VERDE.c}15`,
          border: `1px solid ${VERDE.c}40`, borderRadius: '10px',
          padding: '16px', textAlign: 'center',
        }}>
          <p style={{ fontWeight: 700, color: esTropical ? VERDE.dark : VERDE.c, margin: 0, fontSize: '15px' }}>
            ✅ ¡Menú semanal completo!
          </p>
          <p style={{ fontSize: '12px', color: esTropical ? VERDE.dark : '#A8E0BD', margin: '4px 0 0' }}>
            Tu cocina ya tiene los 5 platos rotativos asignados
          </p>
        </div>
      )}
    </div>
  )
}

function BotonPopularidad({ activo, onClick, color, esTropical, texto }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        padding: '10px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
        border: `2px solid ${activo ? color.c : 'var(--color-border-subtle)'}`,
        background: activo ? (esTropical ? color.claro : `${color.c}15`) : 'var(--color-bg-elevated)',
        color: activo ? (esTropical ? color.dark : color.c) : 'var(--color-text-secondary)',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
      {texto}
    </button>
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

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '10px 14px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '14px',
    fontFamily: 'inherit', outline: 'none',
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

export default Paso3MenuInabie