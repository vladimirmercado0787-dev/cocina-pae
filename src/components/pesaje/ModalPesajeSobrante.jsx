import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const MORADO = { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' }
const ROSA = { c: '#D4537E', claro: '#FBEAF0', dark: '#72243E' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }

export default function ModalPesajeSobrante({ 
  empresaId, usuario, onCerrar, onAprobado, modoEdicion = false
}) {
  const [pesajes, setPesajes] = useState([])
  const [recetaInfo, setRecetaInfo] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)
  const [notasGenerales, setNotasGenerales] = useState('')

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

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    try {
      setCargando(true)
      setError(null)
      const fechaHoy = new Date().toISOString().split('T')[0]
      const { data: pesajesHoy, error: errPesajes } = await supabase
        .from('pesajes_cocido')
        .select(`id, componente_id, peso_crudo_total, peso_cocido_sugerido, peso_cocido_real, peso_sobrante_lb, fue_pesado_sobrante_real, notas_sobrante, componentes_receta (id, nombre, emoji, orden, unidad, receta_id, recetas (id, nombre))`)
        .eq('empresa_id', empresaId).eq('fecha', fechaHoy)
      if (errPesajes) throw errPesajes
      if (!pesajesHoy || pesajesHoy.length === 0) {
        throw new Error('No hay pesajes cocidos registrados hoy. Primero hay que aprobar el pesaje cocido.')
      }
      const primerPesaje = pesajesHoy[0]
      const nombreReceta = primerPesaje.componentes_receta?.recetas?.nombre || 'Receta del día'
      setRecetaInfo({ nombre: nombreReceta })
      if (modoEdicion && primerPesaje.notas_sobrante) setNotasGenerales(primerPesaje.notas_sobrante)
      const lista = pesajesHoy.map(p => {
        const sobranteExistente = p.peso_sobrante_lb !== null ? Number(p.peso_sobrante_lb) : 0
        return {
          pesaje_id: p.id, componente_id: p.componente_id,
          nombre: p.componentes_receta?.nombre || 'Componente',
          emoji: p.componentes_receta?.emoji || '🍽️',
          unidad: p.componentes_receta?.unidad || 'lb',
          orden: p.componentes_receta?.orden || 999,
          peso_cocido_real: Number(p.peso_cocido_real) || 0,
          peso_sobrante_lb: modoEdicion ? sobranteExistente : 0,
          fue_pesado_sobrante_real: modoEdicion ? Boolean(p.fue_pesado_sobrante_real) : false,
        }
      }).sort((a, b) => a.orden - b.orden)
      setPesajes(lista)
    } catch (err) {
      console.error('Error cargando datos sobrante:', err)
      setError(err.message)
    } finally { setCargando(false) }
  }

  function editarSobrante(pesaje_id, valorNuevo) {
    const valor = parseFloat(valorNuevo) || 0
    setPesajes(prev => prev.map(p => p.pesaje_id === pesaje_id ? { ...p, peso_sobrante_lb: valor, fue_pesado_sobrante_real: valor > 0 } : p))
  }

  async function aprobarPesajeSobrante() {
    if (pesajes.length === 0) { alert('No hay componentes para registrar sobrante'); return }
    const conSobrante = pesajes.filter(p => p.peso_sobrante_lb > 0).length
    const sinSobrante = pesajes.length - conSobrante
    const titulo = modoEdicion ? '¿Actualizar el pesaje sobrante?' : '¿Confirmas el pesaje sobrante?'
    if (!window.confirm(`${titulo}\n\n🍱 ${conSobrante} plato(s) con sobrante\n✅ ${sinSobrante} plato(s) sin sobrante (se consumió todo)\n\nEsto cierra el ciclo del día y alimenta la inteligencia.`)) return
    setProcesando(true)
    setError(null)
    try {
      const promesas = pesajes.map(p => supabase.from('pesajes_cocido').update({
        peso_sobrante_lb: p.peso_sobrante_lb,
        fue_pesado_sobrante_real: p.fue_pesado_sobrante_real,
        notas_sobrante: notasGenerales || null,
      }).eq('id', p.pesaje_id))
      const resultados = await Promise.all(promesas)
      const errores = resultados.filter(r => r.error)
      if (errores.length > 0) throw new Error(`${errores.length} de ${pesajes.length} actualizaciones fallaron`)
      alert(`✅ Pesaje sobrante ${modoEdicion ? 'actualizado' : 'aprobado'}\n\n${conSobrante} con sobrante, ${sinSobrante} sin sobrante\n\nCiclo del día completo 🎉`)
      if (onAprobado) onAprobado()
    } catch (err) {
      console.error('Error guardando pesaje sobrante:', err)
      setError(err.message)
    } finally { setProcesando(false) }
  }

  const totalCocido = pesajes.reduce((sum, p) => sum + p.peso_cocido_real, 0)
  const totalSobrante = pesajes.reduce((sum, p) => sum + p.peso_sobrante_lb, 0)
  const totalConsumido = totalCocido - totalSobrante
  const conSobrante = pesajes.filter(p => p.peso_sobrante_lb > 0).length

  if (cargando) {
    return (
      <div style={overlayStyle()}>
        <div style={loadingBoxStyle()}>
          <div style={{ fontSize: '48px', marginBottom: '12px' }}>🍱</div>
          <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500, margin: 0 }}>
            {modoEdicion ? 'Cargando datos del sobrante...' : 'Cargando platos del día...'}
          </p>
        </div>
      </div>
    )
  }

  if (error && pesajes.length === 0) {
    return (
      <div style={overlayStyle()}>
        <div style={{ ...modalBoxStyle(), padding: '24px', maxWidth: '420px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#E24B4A', marginBottom: '8px' }}>❌ Error</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
          <button onClick={onCerrar} style={btnCancelar()}>Cerrar</button>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayStyle('start')}>
      <div style={{ ...modalBoxStyle(), maxWidth: '880px', margin: '32px 0' }}>
        
        {/* HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
          borderRadius: '16px 16px 0 0', padding: '20px 24px', color: 'white',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', opacity: 0.9, margin: 0 }}>
                {modoEdicion ? '✏️ EDITANDO PESAJE SOBRANTE' : 'PESAJE SOBRANTE · POR PLATO'}
              </p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '28px' }}>🍱</span>
                Lo que regresó de las escuelas
              </h2>
              <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
                {recetaInfo?.nombre} · {modoEdicion ? 'Modo edición' : 'Cierre del ciclo'}
              </p>
            </div>
            <button onClick={onCerrar} disabled={procesando} style={btnCerrar()}>✕</button>
          </div>
        </div>

        {/* NOTA INFORMATIVA */}
        <div style={{
          background: modoEdicion 
            ? (esTropical ? '#FFF8E6' : 'rgba(239, 159, 39, 0.12)')
            : (esTropical ? AZUL.claro : `${AZUL.c}12`),
          borderBottom: `1px solid ${modoEdicion ? 'rgba(239, 159, 39, 0.35)' : `${AZUL.c}40`}`,
          padding: '14px 20px',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: modoEdicion ? (esTropical ? '#7A5410' : '#FAC775') : (esTropical ? AZUL.dark : AZUL.c), letterSpacing: '0.5px', marginBottom: '4px' }}>
            {modoEdicion ? '⚠️ MODO EDICIÓN' : '💡 CÓMO FUNCIONA'}
          </p>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
            {modoEdicion 
              ? <>Los valores actuales están precargados. Edita lo que necesites corregir y aprueba para actualizar.</>
              : <>Por defecto, todos los platos están en <strong>0</strong> (asumiendo que se consumió todo). Solo edita los platos que sí regresaron sobrantes.</>}
          </p>
        </div>

        {/* LISTA DE COMPONENTES */}
        <div style={{ padding: '20px 24px' }}>
          <p style={labelStyle()}>🍽️ PLATOS DEL DÍA ({pesajes.length})</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {pesajes.map((p) => {
              const conSob = p.peso_sobrante_lb > 0
              return (
                <div key={p.pesaje_id} style={{
                  border: `2px solid ${conSob ? MORADO.c : 'var(--color-border-subtle)'}40`,
                  borderLeft: `4px solid ${conSob ? MORADO.c : 'var(--color-border-subtle)'}`,
                  background: conSob ? (esTropical ? MORADO.claro : `${MORADO.c}12`) : 'var(--color-bg-elevated)',
                  borderRadius: '12px', padding: '14px',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '22px' }}>{p.emoji}</span>
                        <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '15px', margin: 0 }}>{p.nombre}</p>
                      </div>
                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                        Cocido: <strong style={{ color: 'var(--color-text-secondary)' }}>{p.peso_cocido_real.toFixed(2)} {p.unidad}</strong>
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      <input type="number" min="0" step="0.01" value={p.peso_sobrante_lb} onChange={(e) => editarSobrante(p.pesaje_id, e.target.value)} disabled={procesando}
                        style={{ ...inputStyle(), width: '110px', textAlign: 'right', fontWeight: 700, fontSize: '15px', border: `2px solid ${conSob ? MORADO.c : 'var(--color-border-subtle)'}` }} />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{p.unidad} sobró</span>
                      {conSob ? (
                        <span style={{ fontSize: '11px', color: esTropical ? MORADO.dark : '#AFA9EC', fontWeight: 600, marginTop: '4px' }}>✓ Con sobrante</span>
                      ) : (
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', marginTop: '4px' }}>Se consumió todo</span>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* NOTAS */}
        <div style={{ padding: '0 24px 16px' }}>
          <label style={labelStyle()}>NOTAS DEL PESAJE SOBRANTE (OPCIONAL)</label>
          <input type="text" value={notasGenerales} onChange={(e) => setNotasGenerales(e.target.value)} placeholder="Ej: La escuela X devolvió bastante arroz..." disabled={procesando} style={inputStyle()} />
        </div>

        {/* FOOTER */}
        <div style={{
          background: 'var(--color-bg-card)', borderTop: '1px solid var(--color-border-subtle)',
          borderRadius: '0 0 16px 16px', padding: '20px 24px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
            <KpiMini label="Total cocido" valor={totalCocido.toFixed(1)} color={ROSA.c} />
            <KpiMini label="Sobrante" valor={totalSobrante.toFixed(1)} color={MORADO.c} />
            <KpiMini label="Consumido real" valor={totalConsumido.toFixed(1)} color={VERDE.c} />
            <KpiMini label="Con sobrante" valor={`${conSobrante} / ${pesajes.length}`} color="var(--color-text-primary)" />
          </div>

          {error && (
            <div style={alertaStyle('#E24B4A', esTropical)}>
              <p style={{ fontSize: '13px', margin: 0 }}>❌ {error}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onCerrar} disabled={procesando} style={btnCancelar()}>Cancelar</button>
            <button onClick={aprobarPesajeSobrante} disabled={procesando}
              style={{
                flex: 1, padding: '14px 20px',
                background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
                border: 'none', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: 700,
                cursor: procesando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: procesando ? 0.6 : 1,
              }}>
              {procesando 
                ? (modoEdicion ? 'Actualizando...' : 'Guardando pesaje sobrante...') 
                : (modoEdicion ? '✏️ Actualizar pesaje sobrante' : '✅ Aprobar pesaje sobrante')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiMini({ label, valor, color }) {
  return (
    <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', padding: '10px', textAlign: 'center' }}>
      <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', margin: 0, letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ fontSize: '16px', fontWeight: 700, color, margin: '4px 0 0' }}>{valor}</p>
    </div>
  )
}

function overlayStyle(align = 'center') {
  return {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    zIndex: 50, display: 'flex', alignItems: align === 'start' ? 'flex-start' : 'center',
    justifyContent: 'center', padding: '16px', overflowY: 'auto',
  }
}

function modalBoxStyle() {
  return {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '16px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  }
}

function loadingBoxStyle() {
  return {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '16px', padding: '48px', textAlign: 'center', maxWidth: '380px',
  }
}

function btnCerrar() {
  return { background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }
}

function btnCancelar() {
  return {
    padding: '14px 24px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '12px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

function labelStyle() {
  return { display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.5px', marginBottom: '8px' }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '10px 14px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  }
}

function alertaStyle(color, esTropical) {
  return {
    background: esTropical ? '#FCEBEB' : `${color}15`,
    border: `1px solid ${color}40`, borderRadius: '8px',
    padding: '10px 12px', marginBottom: '12px',
    color: esTropical ? '#A32D2D' : '#F4C0D1',
  }
}