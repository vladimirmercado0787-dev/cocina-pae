import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { calcularSugerenciasCocidoPorEscuela, redondear } from '../../utils/calculosInteligencia'
import { registrar, TIPOS_ACCION } from '../../utils/historial'

const NARANJA = { c: '#D85A30', claro: '#FCE9DA', dark: '#7A2F12' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }

export default function ModalPesarYDespachar({ operacion, empresaId, usuario, onCerrar, onDespachado }) {
  const [escuela, setEscuela] = useState(null)
  const [recetaDelDia, setRecetaDelDia] = useState(null)
  const [racionesDiaTotal, setRacionesDiaTotal] = useState(0)
  const [crudoAprobadoTotal, setCrudoAprobadoTotal] = useState(0)
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

  useEffect(() => { if (operacion) cargarDatosYSugerencias() }, [operacion?.id])

  async function cargarDatosYSugerencias() {
    try {
      setCargando(true)
      setError(null)
      const fechaHoy = new Date().toISOString().split('T')[0]
      const { data: escuelaData, error: errEsc } = await supabase.from('escuelas').select('*').eq('id', operacion.escuela_id).single()
      if (errEsc) throw errEsc
      setEscuela(escuelaData)

      // 🎯 FIX BUG-001: Leer la receta REAL que eligió el usuario en el pesaje crudo
      // (guardada en operaciones_dia.receta_id), NO adivinar por dia_semana.
      // Antes: si era sábado y no había receta default, agarraba la primera al azar (ej: sardinas).
      // Ahora: usa exactamente lo que el usuario eligió y pesó como crudo.
      let receta = null

      if (operacion.receta_id) {
        // Caso ideal: ya se hizo el pesaje crudo y se guardó la receta elegida
        const { data: recetaElegida, error: errRecEle } = await supabase
          .from('recetas')
          .select('id, nombre, emoji, dia_semana')
          .eq('id', operacion.receta_id)
          .single()
        if (errRecEle) throw errRecEle
        receta = recetaElegida
      } else {
        // No se ha hecho pesaje crudo todavía → error claro al usuario
        throw new Error('⚠️ Falta hacer el pesaje crudo primero. Sin pesaje crudo no se puede despachar — el sistema no sabe qué receta se cocinó hoy.')
      }

      setRecetaDelDia(receta)

      const { data: opsHoy, error: errOps } = await supabase.from('operaciones_dia').select('raciones_planificadas, estado').eq('empresa_id', empresaId).eq('fecha', fechaHoy).neq('estado', 'sin_clase')
      if (errOps) throw errOps
      const totalRaciones = (opsHoy || []).reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
      setRacionesDiaTotal(totalRaciones)
      const { data: movs, error: errMov } = await supabase.from('movimientos_inventario').select('cantidad').eq('empresa_id', empresaId).eq('fecha', fechaHoy).eq('origen', 'consumo_operacion')
      if (errMov) throw errMov
      const crudoTotal = (movs || []).reduce((sum, m) => sum + Number(m.cantidad), 0)
      setCrudoAprobadoTotal(crudoTotal)
      const resultado = await calcularSugerenciasCocidoPorEscuela({
        empresaId, escuelaId: operacion.escuela_id,
        racionesEscuela: operacion.raciones_planificadas,
        racionesDiaTotal: totalRaciones, recetaId: receta.id, fecha: fechaHoy,
      })
      if (resultado.error) throw new Error(resultado.error)
      const lista = resultado.sugerencias.map(s => ({ ...s, peso_real: s.peso_cocido_sugerido, fue_pesado: false }))
      setComponentes(lista)
    } catch (err) {
      console.error('Error cargando sugerencias:', err)
      setError(err.message)
    } finally { setCargando(false) }
  }

  function editarPesoReal(componenteId, valorNuevo) {
    const valor = parseFloat(valorNuevo) || 0
    setComponentes(prev => prev.map(c => c.componente_id === componenteId ? { ...c, peso_real: valor, fue_pesado: true } : c))
  }

  function resetearSugerencia(componenteId) {
    setComponentes(prev => prev.map(c => c.componente_id === componenteId ? { ...c, peso_real: c.peso_cocido_sugerido, fue_pesado: false } : c))
  }

  async function guardarYDespachar() {
    if (componentes.length === 0) { alert('No hay componentes para despachar'); return }
    const algunoEnCero = componentes.some(c => c.peso_real <= 0)
    if (algunoEnCero) {
      if (!window.confirm('⚠️ Hay componentes con peso 0.\n\n¿Continuar de todas formas?')) return
    }
    setProcesando(true)
    setError(null)
    try {
      const fechaHoy = new Date().toISOString().split('T')[0]
      const ahora = new Date().toISOString()
      const filas = componentes.map(c => ({
        empresa_id: empresaId, fecha: fechaHoy, operacion_dia_id: operacion.id,
        escuela_id: operacion.escuela_id, raciones_escuela: operacion.raciones_planificadas,
        componente_id: c.componente_id, peso_cocido_sugerido: c.peso_cocido_sugerido,
        peso_cocido_real: c.peso_real, fue_pesado_real: c.fue_pesado,
        hora_despacho: ahora, despachador_id: usuario.id, peso_sobrante: 0,
        fue_pesado_sobrante_real: false, crudo_aprobado_dia: crudoAprobadoTotal,
        factor_rendimiento_usado: c.factor_rendimiento_usado,
        raciones_dia_total: racionesDiaTotal, notas: notas.trim() || null,
      }))
      const { error: errInsert } = await supabase.from('despachos_componente').insert(filas)
      if (errInsert) throw errInsert
      const pesoTotalCocidoLb = componentes.reduce((sum, c) => sum + (c.peso_real || 0), 0)
      const { error: errUpdate } = await supabase.from('operaciones_dia').update({
        estado: 'despachando', peso_cocido_lb: redondear(pesoTotalCocidoLb, 2),
        notas_pesaje_cocido: notas.trim() || null, hora_salida: ahora, updated_at: ahora,
      }).eq('id', operacion.id)
      if (errUpdate) throw errUpdate
      const componentesPesados = componentes.filter(c => c.fue_pesado).length
      await registrar({
        empresaId, usuario, tipoAccion: TIPOS_ACCION.ESCUELA_DESPACHADA,
        descripcion: `🚚 Despachó ${escuela.nombre} (${operacion.raciones_planificadas} raciones · ${redondear(pesoTotalCocidoLb, 1)} lb totales)`,
        entidad: 'operacion_dia', entidadId: operacion.id,
        detallesExtra: {
          escuela_nombre: escuela.nombre, raciones: operacion.raciones_planificadas,
          peso_total_cocido: redondear(pesoTotalCocidoLb, 2),
          componentes: componentes.map(c => ({ nombre: c.nombre, sugerido: c.peso_cocido_sugerido, real: c.peso_real, fue_pesado: c.fue_pesado, unidad: c.unidad })),
          componentes_pesados: componentesPesados,
          componentes_aceptaron_sugerencia: componentes.length - componentesPesados,
        },
      })
      alert(`✅ Despacho registrado\n\n${escuela.nombre}\n${componentes.length} componente(s)\n${redondear(pesoTotalCocidoLb, 1)} lb total`)
      if (onDespachado) onDespachado()
    } catch (err) {
      console.error('Error despachando:', err)
      setError(err.message)
    } finally { setProcesando(false) }
  }

  if (cargando) {
    return (
      <div style={overlayStyle()}>
        <div style={loadingBoxStyle()}>
          <div style={{ fontSize: '42px', marginBottom: '12px' }}>🧮</div>
          <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500, margin: 0 }}>Calculando sugerencias inteligentes...</p>
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

  const pesoTotalReal = componentes.reduce((sum, c) => sum + (c.peso_real || 0), 0)
  const pesoTotalSugerido = componentes.reduce((sum, c) => sum + (c.peso_cocido_sugerido || 0), 0)
  const algunoPesadoReal = componentes.some(c => c.fue_pesado)
  const totalDiasAprendidos = Math.max(...componentes.map(c => c.dias_aprendidos || 0), 0)
  const cocidoTotalEsperado = componentes.reduce((sum, c) => {
    if (c.unidad !== 'lb') return sum
    return sum + (Number(c.crudo_total_componente || 0) * Number(c.factor_rendimiento_usado || 1))
  }, 0)
  const porcentajeEscuela = racionesDiaTotal > 0 ? (operacion.raciones_planificadas / racionesDiaTotal) * 100 : 0

  return (
    <div style={overlayStyle('start')}>
      <div style={{ ...modalBoxStyle(), maxWidth: '720px', margin: '32px 0' }}>
        
        {/* HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #D85A30 0%, #B53D1A 100%)',
          borderRadius: '16px 16px 0 0', padding: '20px 24px', color: 'white',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', opacity: 0.9, margin: 0 }}>PESAR Y DESPACHAR</p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0' }}>🚚 {escuela?.nombre}</h2>
              <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
                {operacion.raciones_planificadas} raciones · {recetaDelDia?.emoji} {recetaDelDia?.nombre}
              </p>
            </div>
            <button onClick={onCerrar} disabled={procesando} style={btnCerrar()}>✕</button>
          </div>
        </div>

        {/* BANNER INTELIGENCIA */}
        <div style={{
          background: esTropical ? VERDE.claro : `${VERDE.c}12`,
          borderBottom: `1px solid ${VERDE.c}40`, padding: '14px 20px',
          display: 'flex', flexDirection: 'column', gap: '8px',
        }}>
          <BannerLinea emoji="📊" label="Total CRUDO del día:" valor={`${redondear(crudoAprobadoTotal, 1)} lb`} colorValor={AMBAR.c} extra={`(${racionesDiaTotal} raciones · todas las escuelas)`} />
          <BannerLinea emoji="🍳" label="Cocido esperado TOTAL:" valor={`~${redondear(cocidoTotalEsperado, 1)} lb`} colorValor={AMBAR.c} extra={`(${totalDiasAprendidos > 0 ? `${totalDiasAprendidos} día(s) aprendido(s)` : 'factor INABIE default'})`} />
          <div style={{ borderTop: `1px solid ${VERDE.c}30`, paddingTop: '8px' }}>
            <BannerLinea emoji="🚚" label={`Sugerido para ${escuela?.nombre}:`} valor={`${redondear(pesoTotalSugerido, 1)} lb`} colorValor={VERDE.c} extra={`(${operacion.raciones_planificadas} raciones · ${redondear(porcentajeEscuela, 1)}% del día)`} />
          </div>
        </div>

        {/* COMPONENTES */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <p style={labelStyle()}>🍱 COMPONENTES A DESPACHAR</p>

          {componentes.map(c => {
            const editado = c.fue_pesado
            return (
              <div key={c.componente_id} style={{
                border: `2px solid ${editado ? AZUL.c : 'var(--color-border-subtle)'}40`,
                borderLeft: `4px solid ${editado ? AZUL.c : 'var(--color-border-subtle)'}`,
                background: editado ? (esTropical ? AZUL.claro : `${AZUL.c}12`) : 'var(--color-bg-elevated)',
                borderRadius: '12px', padding: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ fontSize: '24px' }}>{c.emoji || '🍽️'}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '14px', margin: 0 }}>{c.nombre}</p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                      Sugerencia: <strong style={{ color: 'var(--color-text-secondary)' }}>{c.peso_cocido_sugerido} {c.unidad}</strong>
                    </p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic', margin: '4px 0 0' }}>{c.formula_texto}</p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <input type="number" min="0" step="0.1" value={c.peso_real} onChange={(e) => editarPesoReal(c.componente_id, e.target.value)} disabled={procesando}
                        style={{ ...inputStyle(), width: '90px', textAlign: 'right', fontWeight: 700, fontSize: '14px', border: `2px solid ${editado ? AZUL.c : 'var(--color-border-subtle)'}` }} />
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{c.unidad}</span>
                    </div>
                    {editado && (
                      <button onClick={() => resetearSugerencia(c.componente_id)} style={{ background: 'none', border: 'none', color: esTropical ? AZUL.dark : '#A9CFF2', fontSize: '10px', cursor: 'pointer', textDecoration: 'underline', marginTop: '4px', fontFamily: 'inherit' }}>
                        ↺ Usar sugerencia
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* NOTAS */}
        <div style={{ padding: '0 24px 12px' }}>
          <label style={labelStyle()}>NOTAS (OPCIONAL)</label>
          <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: Sobró arroz en olla 2, niños comieron poco..." disabled={procesando} style={inputStyle()} />
        </div>

        {/* AVISO INTELIGENCIA */}
        <div style={{ padding: '0 24px 16px' }}>
          <div style={{
            background: esTropical ? '#FFF8E6' : 'rgba(239, 159, 39, 0.12)',
            border: '1px solid rgba(239, 159, 39, 0.35)', borderRadius: '10px',
            padding: '10px 12px', fontSize: '12px', color: esTropical ? AMBAR.dark : '#FAC775',
          }}>
            💡 {algunoPesadoReal 
              ? <>Pesando real: <strong>la inteligencia aprende con datos exactos.</strong></>
              : <>Si no pesas, el sistema asume las sugerencias como reales y aprende igual.</>}
          </div>
        </div>

        {/* FOOTER */}
        <div style={{
          background: 'var(--color-bg-card)', borderTop: '1px solid var(--color-border-subtle)',
          borderRadius: '0 0 16px 16px', padding: '20px 24px',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
            <KpiMini label="Componentes" valor={componentes.length} color="var(--color-text-primary)" />
            <KpiMini label="Peso total" valor={`${redondear(pesoTotalReal, 1)} lb`} color={NARANJA.c} />
            <KpiMini label="Pesados real" valor={`${componentes.filter(c => c.fue_pesado).length} / ${componentes.length}`} color={AZUL.c} />
          </div>

          {error && (
            <div style={alertaStyle('#E24B4A', esTropical)}>
              <p style={{ fontSize: '13px', margin: 0 }}>❌ {error}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onCerrar} disabled={procesando} style={btnCancelar()}>Cancelar</button>
            <button onClick={guardarYDespachar} disabled={procesando}
              style={{
                flex: 1, padding: '14px 20px',
                background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                border: 'none', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: 700,
                cursor: procesando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: procesando ? 0.6 : 1,
              }}>
              {procesando ? 'Despachando...' : '✅ Guardar y generar conduce'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function BannerLinea({ emoji, label, valor, colorValor, extra }) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', fontSize: '12px' }}>
      <span style={{ flexShrink: 0 }}>{emoji}</span>
      <p style={{ color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--color-text-primary)' }}>{label}</strong>{' '}
        <strong style={{ color: colorValor }}>{valor}</strong>{' '}
        <span style={{ color: 'var(--color-text-muted)' }}>{extra}</span>
      </p>
    </div>
  )
}

function KpiMini({ label, valor, color }) {
  return (
    <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
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