import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const COLOR_INV = '#EF9F27'
const COLOR_INV_BG = '#FAC775'
const COLOR_INV_DARKER = '#633806'
const COLOR_INV_CLARO = '#FAEEDA'

const DIAS_ORDEN = ['lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado', 'domingo']
const DIAS_LABEL = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles', jueves: 'Jueves',
  viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo',
}

export default function VistaCatalogoRecetas({ empresa_id, onVolver }) {
  const [recetas, setRecetas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [expandida, setExpandida] = useState(null)
  const [error, setError] = useState(null)

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'

  useEffect(() => { cargarRecetas() }, [empresa_id])

  async function cargarRecetas() {
    try {
      setCargando(true)
      setError(null)
      const { data, error: errRecetas } = await supabase
        .from('recetas')
        .select(`
          id, nombre, emoji, dia_semana, popularidad, notas,
          tiempo_preparacion_min, personas_requeridas, preparacion_dia_anterior,
          notas_operativas, nivel_complejidad,
          recetas_ingredientes (
            id, cantidad_crudo_por_racion, unidad, notas,
            ingredientes ( id, nombre, categoria, unidad_compra, factor_rendimiento )
          )
        `)
        .eq('empresa_id', empresa_id)
        .eq('activa', true)
      if (errRecetas) throw errRecetas
      const ordenadas = (data || []).sort((a, b) => {
        const idxA = DIAS_ORDEN.indexOf(a.dia_semana)
        const idxB = DIAS_ORDEN.indexOf(b.dia_semana)
        return idxA - idxB
      })
      setRecetas(ordenadas)
    } catch (err) {
      console.error('Error cargando recetas:', err)
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function toggleExpandir(id) { setExpandida(expandida === id ? null : id) }

  if (cargando) {
    return <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ fontSize: '56px', marginBottom: '12px' }}>📋</div>
        <p style={{ color: 'var(--color-text-muted)' }}>Cargando recetas...</p>
      </div>
    </div>
  }

  if (error) {
    return <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', padding: '20px' }}>
      <div style={{ maxWidth: '900px', margin: '40px auto', background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.12)', border: '2px solid rgba(226, 75, 74, 0.4)', borderRadius: '14px', padding: '24px' }}>
        <p style={{ color: esTropical ? '#A32D2D' : '#F4C0D1', fontWeight: 600 }}>❌ Error: {error}</p>
        <button onClick={onVolver} style={{ marginTop: '12px', padding: '10px 18px', background: 'linear-gradient(135deg, #E24B4A 0%, #A32D2D 100%)', border: 'none', borderRadius: '10px', color: 'white', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>← Volver</button>
      </div>
    </div>
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: '1000px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        <div style={{
          background: esTropical ? `linear-gradient(135deg, ${COLOR_INV_CLARO} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${COLOR_INV}25 0%, ${COLOR_INV}10 100%)`,
          border: esTropical ? `1.5px solid ${COLOR_INV_BG}` : `1px solid ${COLOR_INV}55`,
          borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
          boxShadow: esTropical ? `0 2px 12px ${COLOR_INV}15` : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: esTropical ? COLOR_INV : `${COLOR_INV}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: esTropical ? `0 4px 12px ${COLOR_INV}40` : 'none' }}>📋</div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? COLOR_INV_DARKER : 'var(--color-text-primary)', lineHeight: 1.2 }}>Catálogo de Recetas</div>
                <div style={{ fontSize: '12px', color: esTropical ? COLOR_INV : `${COLOR_INV}CC`, marginTop: '4px', fontWeight: 500 }}>Recetas oficiales INABIE — Solo lectura</div>
              </div>
            </div>
            <span style={{ background: esTropical ? COLOR_INV : `${COLOR_INV}25`, color: esTropical ? '#ffffff' : COLOR_INV, padding: '6px 14px', borderRadius: '12px', fontSize: '11px', fontWeight: 600 }}>
              {recetas.length} {recetas.length === 1 ? 'receta' : 'recetas'}
            </span>
          </div>
        </div>

        {recetas.length === 0 ? (
          <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '14px', padding: '48px', textAlign: 'center', boxShadow: 'var(--modulo-sombra)' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>🍽️</div>
            <p style={{ color: 'var(--color-text-primary)', fontSize: '16px', fontWeight: 600 }}>No hay recetas activas todavía</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '6px' }}>El administrador debe agregar recetas en Configuración</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {recetas.map(receta => {
              const expandido = expandida === receta.id
              const ingredientes = receta.recetas_ingredientes || []
              return (
                <div key={receta.id} style={{
                  background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
                  borderLeft: `4px solid ${COLOR_INV}`,
                  borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--modulo-sombra)',
                }}>
                  <button onClick={() => toggleExpandir(receta.id)} style={{
                    width: '100%', padding: '16px 20px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'transparent', border: 'none', cursor: 'pointer',
                    textAlign: 'left', fontFamily: 'inherit',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span style={{ fontSize: '40px' }}>{receta.emoji || '🍽️'}</span>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', flexWrap: 'wrap' }}>
                          <span style={{ background: esTropical ? COLOR_INV : `${COLOR_INV}25`, color: esTropical ? '#ffffff' : COLOR_INV, padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase' }}>
                            {DIAS_LABEL[receta.dia_semana]}
                          </span>
                          {receta.preparacion_dia_anterior && (
                            <span style={{ background: esTropical ? '#BA7517' : 'rgba(186, 117, 23, 0.2)', color: esTropical ? '#ffffff' : '#FAC775', padding: '3px 8px', borderRadius: '6px', fontSize: '10px', fontWeight: 600 }}>
                              ⏰ Prep. día anterior
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{receta.nombre}</div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {ingredientes.length} {ingredientes.length === 1 ? 'ingrediente' : 'ingredientes'}
                          {receta.tiempo_preparacion_min && ` · ${receta.tiempo_preparacion_min} min`}
                          {receta.personas_requeridas && ` · ${receta.personas_requeridas} ${receta.personas_requeridas === 1 ? 'persona' : 'personas'}`}
                        </div>
                      </div>
                    </div>
                    <span style={{ fontSize: '18px', color: COLOR_INV }}>{expandido ? '▼' : '▶'}</span>
                  </button>

                  {expandido && (
                    <div style={{ padding: '20px', background: esTropical ? '#FBFAF6' : 'rgba(0, 0, 0, 0.15)', borderTop: '1px solid var(--color-border-subtle)' }}>
                      {receta.notas && (
                        <div style={{ marginBottom: '14px', padding: '12px', background: esTropical ? '#FFF' : 'var(--color-bg-elevated)', borderRadius: '10px', border: '1px solid var(--color-border-subtle)' }}>
                          <div style={{ fontSize: '10px', color: COLOR_INV, fontWeight: 600, letterSpacing: '0.5px', marginBottom: '4px' }}>📝 NOTAS</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{receta.notas}</div>
                        </div>
                      )}
                      {receta.notas_operativas && (
                        <div style={{ marginBottom: '14px', padding: '12px', background: esTropical ? '#FAF3E5' : 'rgba(250, 199, 117, 0.08)', borderRadius: '10px', border: '1px solid rgba(186, 117, 23, 0.3)', borderLeft: '4px solid #BA7517' }}>
                          <div style={{ fontSize: '10px', color: esTropical ? '#854F0B' : '#FAC775', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '4px' }}>⚙️ NOTAS OPERATIVAS</div>
                          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>{receta.notas_operativas}</div>
                        </div>
                      )}

                      <div style={{ background: esTropical ? '#FFF' : 'var(--color-bg-elevated)', borderRadius: '10px', border: '1px solid var(--color-border-subtle)', overflow: 'hidden' }}>
                        <div style={{ background: COLOR_INV, color: 'white', padding: '10px 14px', fontSize: '12px', fontWeight: 600 }}>
                          🥘 Ingredientes por ración (en libras)
                        </div>
                        <div>
                          {ingredientes.length === 0 ? (
                            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: 'var(--color-text-muted)' }}>Sin ingredientes registrados</div>
                          ) : ingredientes.map(ri => (
                            <div key={ri.id} style={{ padding: '10px 14px', borderTop: '1px solid var(--color-border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px' }}>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{ri.ingredientes?.nombre || 'Ingrediente eliminado'}</div>
                                {ri.ingredientes?.categoria && <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{ri.ingredientes.categoria}</div>}
                                {ri.notas && <div style={{ fontSize: '10px', color: esTropical ? '#854F0B' : '#FAC775', marginTop: '2px', fontStyle: 'italic' }}>💡 {ri.notas}</div>}
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '13px', fontWeight: 600, fontFamily: 'monospace', color: esTropical ? COLOR_INV_DARKER : 'var(--color-text-primary)' }}>
                                  {Number(ri.cantidad_crudo_por_racion).toFixed(3)} {ri.unidad || 'lb'}
                                </div>
                                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>por ración</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div style={{ marginTop: '12px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {receta.nivel_complejidad && (
                          <span style={{ background: esTropical ? '#FFF' : 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                            Complejidad: <strong style={{ textTransform: 'capitalize' }}>{receta.nivel_complejidad}</strong>
                          </span>
                        )}
                        {receta.popularidad && (
                          <span style={{ background: esTropical ? '#FFF' : 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', padding: '4px 10px', borderRadius: '6px', fontSize: '10px', color: 'var(--color-text-secondary)' }}>
                            Popularidad: <strong style={{ textTransform: 'capitalize' }}>{receta.popularidad}</strong>
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '10px', color: 'var(--color-text-muted)' }}>
          🍽️ Vista de solo lectura · Las recetas se editan desde Configuración
        </div>
      </div>
    </div>
  )
}

function ToggleTema({ tema, setTema }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '3px', gap: '2px' }}>
      <button onClick={() => setTema('oscuro')} style={tabTemaStyle(tema === 'oscuro')}>
        <span style={{ fontSize: '11px' }}>🌙</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
      </button>
      <button onClick={() => setTema('tropical')} style={tabTemaStyle(tema === 'tropical')}>
        <span style={{ fontSize: '11px' }}>☀️</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
      </button>
    </div>
  )
}

function btnVolver() {
  return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
}

function tabTemaStyle(activo) {
  return { background: activo ? 'var(--gradient-toggle-active)' : 'transparent', border: 'none', borderRadius: '16px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }
}