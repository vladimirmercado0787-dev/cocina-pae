import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { redondear } from '../../utils/calculosInteligencia'
import { registrar, TIPOS_ACCION } from '../../utils/historial'

const MORADO = { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' }
const NARANJA = { c: '#D85A30', claro: '#FCE9DA', dark: '#7A2F12' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }

export default function ModalPesarSobrante({ operacion, empresaId, usuario, onCerrar, onCerrado }) {
  const [escuela, setEscuela] = useState(null)
  const [componentes, setComponentes] = useState([])
  const [notas, setNotas] = useState('')
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)

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

  useEffect(() => { if (operacion) cargarDatos() }, [operacion?.id])

  async function cargarDatos() {
    try {
      setCargando(true)
      setError(null)
      const { data: escuelaData, error: errEsc } = await supabase.from('escuelas').select('*').eq('id', operacion.escuela_id).single()
      if (errEsc) throw errEsc
      setEscuela(escuelaData)
      const { data: despachos, error: errDesp } = await supabase
        .from('despachos_componente')
        .select(`id, componente_id, peso_cocido_real, peso_sobrante, fue_pesado_sobrante_real, componentes_receta (nombre, emoji, unidad)`)
        .eq('operacion_dia_id', operacion.id).order('id', { ascending: true })
      if (errDesp) throw errDesp
      if (!despachos || despachos.length === 0) throw new Error('No se encontraron componentes despachados para esta escuela')
      const lista = despachos.map(d => ({
        despacho_id: d.id, componente_id: d.componente_id,
        nombre: d.componentes_receta?.nombre || 'Componente',
        emoji: d.componentes_receta?.emoji || '🍽️',
        unidad: d.componentes_receta?.unidad || 'lb',
        peso_cocido_real: Number(d.peso_cocido_real) || 0,
        peso_sobrante: Number(d.peso_sobrante) || 0,
        fue_pesado_sobrante: d.fue_pesado_sobrante_real || false,
      }))
      setComponentes(lista)
    } catch (err) {
      console.error('Error cargando datos del sobrante:', err)
      setError(err.message)
    } finally { setCargando(false) }
  }

  function editarSobrante(despachoId, valorNuevo) {
    const valor = parseFloat(valorNuevo) || 0
    setComponentes(prev => prev.map(c => c.despacho_id === despachoId ? { ...c, peso_sobrante: valor, fue_pesado_sobrante: true } : c))
  }

  function resetearSobrante(despachoId) {
    setComponentes(prev => prev.map(c => c.despacho_id === despachoId ? { ...c, peso_sobrante: 0, fue_pesado_sobrante: false } : c))
  }

  async function guardarSobranteYCerrar() {
    setProcesando(true)
    setError(null)
    try {
      const ahora = new Date().toISOString()
      for (const c of componentes) {
        const { error: errUpd } = await supabase.from('despachos_componente').update({
          peso_sobrante: c.peso_sobrante, fue_pesado_sobrante_real: c.fue_pesado_sobrante,
          hora_regreso: ahora, notas_sobrante: notas.trim() || null, updated_at: ahora,
        }).eq('id', c.despacho_id)
        if (errUpd) throw errUpd
      }
      const { error: errOp } = await supabase.from('operaciones_dia').update({
        estado: 'cerrada', hora_regreso: ahora, updated_at: ahora,
      }).eq('id', operacion.id)
      if (errOp) throw errOp
      const totalSobrante = componentes.reduce((sum, c) => sum + (c.unidad === 'lb' ? Number(c.peso_sobrante) : 0), 0)
      const componentesQueSobraron = componentes.filter(c => c.peso_sobrante > 0).length
      await registrar({
        empresaId, usuario,
        tipoAccion: TIPOS_ACCION.ESCUELA_CERRADA || 'ESCUELA_CERRADA',
        descripcion: `🔒 Cerró día de ${escuela.nombre} (sobrante: ${redondear(totalSobrante, 1)} lb · ${componentesQueSobraron} componente(s) sobraron)`,
        entidad: 'operacion_dia', entidadId: operacion.id,
        detallesExtra: {
          escuela_nombre: escuela.nombre,
          total_sobrante_lb: redondear(totalSobrante, 2),
          componentes_que_sobraron: componentesQueSobraron,
          detalle_sobrantes: componentes.map(c => ({ nombre: c.nombre, despachado: c.peso_cocido_real, sobrante: c.peso_sobrante, unidad: c.unidad, fue_pesado: c.fue_pesado_sobrante })),
          notas: notas.trim() || null,
        },
      })
      alert(`🔒 Día cerrado para ${escuela.nombre}\n\nSobrante total: ${redondear(totalSobrante, 1)} lb\n${componentesQueSobraron} componente(s) sobraron`)
      if (onCerrado) onCerrado()
    } catch (err) {
      console.error('Error cerrando día:', err)
      setError(err.message)
    } finally { setProcesando(false) }
  }

  if (cargando) {
    return (
      <div style={overlayStyle()}>
        <div style={loadingBoxStyle()}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🍱</div>
          <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500, margin: 0 }}>Cargando despacho...</p>
        </div>
      </div>
    )
  }

  if (error && componentes.length === 0) {
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

  const totalDespachado = componentes.reduce((sum, c) => sum + (c.unidad === 'lb' ? Number(c.peso_cocido_real) : 0), 0)
  const totalSobrante = componentes.reduce((sum, c) => sum + (c.unidad === 'lb' ? Number(c.peso_sobrante) : 0), 0)
  const totalConsumido = totalDespachado - totalSobrante
  const porcentajeConsumido = totalDespachado > 0 ? (totalConsumido / totalDespachado) * 100 : 0

  return (
    <div style={overlayStyle('start')}>
      <div style={{ ...modalBoxStyle(), maxWidth: '720px', margin: '32px 0' }}>
        
        {/* HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
          borderRadius: '16px 16px 0 0', padding: '20px 24px', color: 'white',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', opacity: 0.9, margin: 0 }}>
                PESAR SOBRANTE Y CERRAR DÍA
              </p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0' }}>🍱 {escuela?.nombre}</h2>
              <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
                {operacion.raciones_planificadas} raciones · Despachado: {redondear(totalDespachado, 1)} lb cocido
              </p>
            </div>
            <button onClick={onCerrar} disabled={procesando} style={btnCerrar()}>✕</button>
          </div>
        </div>

        {/* AVISO INICIAL */}
        <div style={{
          background: esTropical ? MORADO.claro : `${MORADO.c}12`,
          borderBottom: `1px solid ${MORADO.c}40`, padding: '12px 20px',
        }}>
          <p style={{ fontSize: '12px', color: esTropical ? MORADO.dark : '#AFA9EC', margin: 0 }}>
            💡 <strong>Por defecto = 0</strong> (no sobró nada). Si algo sobró, edita el peso del componente.
          </p>
        </div>

        {/* LISTA DE COMPONENTES */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={labelStyle()}>🍱 SOBRANTE POR COMPONENTE</p>
          {componentes.map(c => {
            const editado = c.fue_pesado_sobrante
            const consumido = Number(c.peso_cocido_real) - Number(c.peso_sobrante)
            const pctConsumido = c.peso_cocido_real > 0 ? (consumido / c.peso_cocido_real) * 100 : 0
            return (
              <div key={c.despacho_id} style={{
                border: `2px solid ${editado ? MORADO.c : 'var(--color-border-subtle)'}40`,
                borderLeft: `4px solid ${editado ? MORADO.c : 'var(--color-border-subtle)'}`,
                background: editado ? (esTropical ? MORADO.claro : `${MORADO.c}12`) : 'var(--color-bg-elevated)',
                borderRadius: '12px', padding: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ fontSize: '24px' }}>{c.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '14px', margin: 0 }}>{c.nombre}</p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                      Despachado: <strong style={{ color: 'var(--color-text-secondary)' }}>{c.peso_cocido_real} {c.unidad}</strong>
                    </p>
                    {c.peso_sobrante > 0 && (
                      <p style={{ fontSize: '11px', color: NARANJA.c, fontStyle: 'italic', marginTop: '4px' }}>
                        Consumido: {redondear(consumido, 1)} {c.unidad} ({redondear(pctConsumido, 0)}%)
                      </p>
                    )}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Sobró:</span>
                      <input type="number" min="0" max={c.peso_cocido_real} step="0.1" value={c.peso_sobrante} onChange={(e) => editarSobrante(c.despacho_id, e.target.value)} disabled={procesando}
                        style={{ ...inputStyle(), width: '80px', textAlign: 'right', fontWeight: 700, fontSize: '14px', border: `2px solid ${editado ? MORADO.c : 'var(--color-border-subtle)'}` }} />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{c.unidad}</span>
                    </div>
                    {editado && (
                      <button onClick={() => resetearSobrante(c.despacho_id)}
                        style={{ background: 'none', border: 'none', color: esTropical ? MORADO.dark : '#AFA9EC', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline', marginTop: '4px', fontFamily: 'inherit' }}>
                        ↺ Volver a 0
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* NOTAS */}
        <div style={{ padding: '0 24px 16px' }}>
          <label style={labelStyle()}>NOTAS DEL SOBRANTE (OPCIONAL)</label>
          <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: Sobró arroz porque faltaron 30 niños..." disabled={procesando} style={inputStyle()} />
        </div>

        {/* FOOTER */}
        <div style={{
          background: 'var(--color-bg-card)', borderTop: '1px solid var(--color-border-subtle)',
          borderRadius: '0 0 16px 16px', padding: '20px 24px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <KpiMini label="Despachado" valor={`${redondear(totalDespachado, 1)} lb`} color={NARANJA.c} />
            <KpiMini label="Sobrante" valor={`${redondear(totalSobrante, 1)} lb`} color={MORADO.c} />
            <KpiMini label="Consumido" valor={`${redondear(totalConsumido, 1)} lb`} color={VERDE.c} sub={`${redondear(porcentajeConsumido, 0)}%`} />
          </div>

          {error && (
            <div style={alertaStyle('#E24B4A', esTropical)}>
              <p style={{ fontSize: '13px', margin: 0 }}>❌ {error}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onCerrar} disabled={procesando} style={btnCancelar()}>Cancelar</button>
            <button onClick={guardarSobranteYCerrar} disabled={procesando}
              style={{
                flex: 1, padding: '14px 20px',
                background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
                border: 'none', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: 700,
                cursor: procesando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: procesando ? 0.6 : 1,
              }}>
              {procesando ? 'Cerrando día...' : `🔒 Cerrar día de ${escuela?.nombre}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiMini({ label, valor, color, sub }) {
  return (
    <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
      <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', margin: 0, letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ fontSize: '16px', fontWeight: 700, color, margin: '4px 0 0' }}>{valor}</p>
      {sub && <p style={{ fontSize: '11px', color, margin: 0 }}>{sub}</p>}
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