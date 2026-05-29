import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const NARANJA = { c: '#D85A30', claro: '#FCE9DA', dark: '#7A2F12' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }
const ROJO = { c: '#E24B4A', claro: '#FCEBEB', dark: '#7A1F1E' }

function Paso4Recetas({ empresaId }) {
  const [recetas, setRecetas] = useState([])
  const [recetaActiva, setRecetaActiva] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  
  const [datos, setDatos] = useState({
    tiempo_preparacion_min: '', personas_requeridas: '2',
    preparacion_dia_anterior: false, notas_operativas: '',
    nivel_complejidad: 'normal'
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
    const { data, error } = await supabase.from('recetas').select('*').eq('empresa_id', empresaId).neq('dia_semana', 'extra').order('created_at', { ascending: true })
    if (!error) setRecetas(data)
  }

  function abrirEdicion(receta) {
    setRecetaActiva(receta.id)
    setDatos({
      tiempo_preparacion_min: receta.tiempo_preparacion_min?.toString() || '',
      personas_requeridas: receta.personas_requeridas?.toString() || '2',
      preparacion_dia_anterior: receta.preparacion_dia_anterior || false,
      notas_operativas: receta.notas_operativas || '',
      nivel_complejidad: receta.nivel_complejidad || 'normal'
    })
    setMensaje(null)
  }

  function cerrarEdicion() {
    setRecetaActiva(null)
    setMensaje(null)
  }

  function actualizarCampo(campo, valor) { setDatos({ ...datos, [campo]: valor }) }

  async function guardarReceta(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)
    try {
      const datosParaGuardar = {
        tiempo_preparacion_min: datos.tiempo_preparacion_min ? parseInt(datos.tiempo_preparacion_min) : null,
        personas_requeridas: parseInt(datos.personas_requeridas) || 2,
        preparacion_dia_anterior: datos.preparacion_dia_anterior,
        notas_operativas: datos.notas_operativas || null,
        nivel_complejidad: datos.nivel_complejidad,
        updated_at: new Date().toISOString()
      }
      const { error } = await supabase.from('recetas').update(datosParaGuardar).eq('id', recetaActiva)
      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + error.message })
      } else {
        setMensaje({ tipo: 'exito', texto: 'Detalles guardados' })
        cargarRecetas()
        setTimeout(() => cerrarEdicion(), 1000)
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + err.message })
    } finally { setGuardando(false) }
  }

  function formatearTiempo(min) {
    if (!min) return null
    if (min < 60) return `${min} min`
    const horas = Math.floor(min / 60)
    const mins = min % 60
    return mins === 0 ? `${horas}h` : `${horas}h ${mins}min`
  }

  function emojiComplejidad(nivel) {
    if (nivel === 'facil') return '🟢'
    if (nivel === 'complicado') return '🔴'
    return '🟡'
  }

  if (!empresaId) {
    return (
      <div style={alertaTopStyle(AMBAR, esTropical)}>
        <p style={{ color: esTropical ? AMBAR.dark : '#FAC775', margin: 0 }}>Primero registra tu cocina en el Paso 1</p>
      </div>
    )
  }

  if (recetas.length === 0) {
    return (
      <div style={alertaTopStyle(AMBAR, esTropical)}>
        <p style={{ color: esTropical ? AMBAR.dark : '#FAC775', margin: 0 }}>Primero asigna los platos del menú en el Paso 3</p>
      </div>
    )
  }

  const recetasConDetalles = recetas.filter(r => r.tiempo_preparacion_min || r.notas_operativas).length

  return (
    <div style={tarjetaStyle()}>
      
      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', color: NARANJA.c, fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>
          PASO 4 DE 6 · ESTIMADO 10 MIN · OPCIONAL EN MODO APRENDIZAJE
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          📖 Recetas detalladas
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Detalles operativos de cada plato del menú
        </p>
      </div>

      <div style={{
        background: esTropical ? VERDE.claro : `${VERDE.c}12`,
        border: `1px solid ${VERDE.c}40`, borderRadius: '10px',
        padding: '14px', marginBottom: '24px',
      }}>
        <p style={{ fontSize: '13px', color: esTropical ? VERDE.dark : '#A8E0BD', margin: 0 }}>
          🌱 <strong>Estás en modo Aprendizaje</strong> — este paso es OPCIONAL.
          Puedes llenar los detalles ahora o dejar que la app aprenda observando
          tu operación durante 3-4 semanas.
        </p>
      </div>

      {/* PROGRESO */}
      <div style={{
        background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)',
        borderRadius: '10px', padding: '16px', marginBottom: '24px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <div>
          <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.5px', margin: 0 }}>PROGRESO</p>
          <p style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '4px 0 0' }}>
            {recetasConDetalles} de {recetas.length} platos con detalles
          </p>
        </div>
        <div style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-muted)' }}>
          {Math.round((recetasConDetalles / recetas.length) * 100)}%
        </div>
      </div>

      {/* LISTA DE RECETAS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {recetas.map((receta) => {
          const enEdicion = recetaActiva === receta.id
          const tieneDetalles = receta.tiempo_preparacion_min || receta.notas_operativas

          // EN EDICIÓN
          if (enEdicion) {
            return (
              <div key={receta.id} style={{
                background: 'var(--color-bg-card)',
                border: `2px solid ${AZUL.c}`, borderRadius: '12px', padding: '20px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                  <span style={{ fontSize: '28px' }}>{receta.emoji}</span>
                  <div>
                    <h4 style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, fontSize: '16px' }}>{receta.nombre}</h4>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize', margin: '4px 0 0' }}>{receta.dia_semana}</p>
                  </div>
                </div>

                <form onSubmit={guardarReceta} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  
                  {/* TIEMPO */}
                  <div>
                    <label style={labelStyle()}>⏱️ TIEMPO DE PREPARACIÓN</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                      {[{ min: 30, label: '30min' }, { min: 60, label: '1h' }, { min: 120, label: '2h' }, { min: 180, label: '3h' }, { min: 240, label: '4h+' }].map((opt) => (
                        <BotonOpcion key={opt.min} activo={parseInt(datos.tiempo_preparacion_min) === opt.min}
                          onClick={() => actualizarCampo('tiempo_preparacion_min', opt.min.toString())}
                          color={AZUL} esTropical={esTropical} texto={opt.label} />
                      ))}
                    </div>
                  </div>

                  {/* PERSONAS */}
                  <div>
                    <label style={labelStyle()}>👥 PERSONAS NECESARIAS PARA COCINARLO</label>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px' }}>
                      {[1, 2, 3, 4, 5].map((num) => (
                        <BotonOpcion key={num} activo={parseInt(datos.personas_requeridas) === num}
                          onClick={() => actualizarCampo('personas_requeridas', num.toString())}
                          color={AZUL} esTropical={esTropical} texto={num.toString()} />
                      ))}
                    </div>
                  </div>

                  {/* COMPLEJIDAD */}
                  <div>
                    <label style={labelStyle()}>🎯 NIVEL DE COMPLEJIDAD</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                      <BotonOpcion activo={datos.nivel_complejidad === 'facil'} onClick={() => actualizarCampo('nivel_complejidad', 'facil')} color={VERDE} esTropical={esTropical} texto="🟢 Fácil" grande />
                      <BotonOpcion activo={datos.nivel_complejidad === 'normal'} onClick={() => actualizarCampo('nivel_complejidad', 'normal')} color={AMBAR} esTropical={esTropical} texto="🟡 Normal" grande />
                      <BotonOpcion activo={datos.nivel_complejidad === 'complicado'} onClick={() => actualizarCampo('nivel_complejidad', 'complicado')} color={ROJO} esTropical={esTropical} texto="🔴 Complicado" grande />
                    </div>
                  </div>

                  {/* CHECKBOX */}
                  <label style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '14px', background: 'var(--color-bg-elevated)',
                    border: '2px solid var(--color-border-subtle)', borderRadius: '10px',
                    cursor: 'pointer',
                  }}>
                    <input type="checkbox" checked={datos.preparacion_dia_anterior}
                      onChange={(e) => actualizarCampo('preparacion_dia_anterior', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: AZUL.c }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, fontSize: '14px' }}>📅 Requiere preparación el día anterior</p>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Ej: licuar sazón, marinar, picar verduras</p>
                    </div>
                  </label>

                  {/* NOTAS */}
                  <div>
                    <label style={labelStyle()}>📝 NOTAS OPERATIVAS</label>
                    <textarea value={datos.notas_operativas} onChange={(e) => actualizarCampo('notas_operativas', e.target.value)}
                      placeholder="Ej: Empezar a las 6 AM. Sazón listo desde la noche anterior." rows="3"
                      style={{ ...inputStyle(), resize: 'vertical', fontFamily: 'inherit' }} />
                  </div>

                  {mensaje && <Mensaje mensaje={mensaje} esTropical={esTropical} />}

                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button type="button" onClick={cerrarEdicion} style={botonCancelarStyle()}>Cancelar</button>
                    <button type="submit" disabled={guardando} style={botonAccionStyle(AZUL, guardando)}>
                      {guardando ? 'Guardando...' : 'Guardar detalles'}
                    </button>
                  </div>
                </form>
              </div>
            )
          }

          // BOTÓN PARA ABRIR
          return (
            <button key={receta.id} onClick={() => abrirEdicion(receta)}
              style={{
                width: '100%', textAlign: 'left', padding: '14px',
                background: tieneDetalles ? (esTropical ? VERDE.claro : `${VERDE.c}12`) : 'var(--color-bg-elevated)',
                border: `2px solid ${tieneDetalles ? `${VERDE.c}40` : 'var(--color-border-subtle)'}`,
                borderRadius: '10px', cursor: 'pointer', fontFamily: 'inherit',
                transition: 'all 0.15s',
              }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                <span style={{ fontSize: '28px' }}>{receta.emoji}</span>
                <div style={{ flex: 1 }}>
                  <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: 0, fontSize: '15px' }}>{receta.nombre}</p>
                  <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize', margin: '4px 0' }}>{receta.dia_semana}</p>
                  {tieneDetalles ? (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '11px' }}>
                      {receta.tiempo_preparacion_min && (
                        <span style={chipStyle()}>⏱️ {formatearTiempo(receta.tiempo_preparacion_min)}</span>
                      )}
                      {receta.personas_requeridas && (
                        <span style={chipStyle()}>👥 {receta.personas_requeridas} personas</span>
                      )}
                      <span style={chipStyle()}>{emojiComplejidad(receta.nivel_complejidad)} {receta.nivel_complejidad}</span>
                      {receta.preparacion_dia_anterior && (
                        <span style={{ ...chipStyle(), background: esTropical ? AMBAR.claro : `${AMBAR.c}15`, color: esTropical ? AMBAR.dark : '#FAC775' }}>
                          📅 Prep. día anterior
                        </span>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>Click para agregar detalles</p>
                  )}
                </div>
                <div style={{ color: 'var(--color-text-muted)', fontSize: '18px' }}>
                  {tieneDetalles ? '✓' : '+'}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function BotonOpcion({ activo, onClick, color, esTropical, texto, grande }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        padding: grande ? '12px' : '10px',
        borderRadius: '10px', fontSize: '13px', fontWeight: 600,
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

function chipStyle() {
  return {
    padding: '4px 10px', background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border-subtle)', borderRadius: '999px',
    color: 'var(--color-text-secondary)',
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

export default Paso4Recetas