import { useState, useEffect } from 'react'
import { cargarSaludFlota } from '../../utils/saludCocinaDatos'

// Color según nivel de salud
function colorNivel(nivel) {
  if (nivel === 'sana') return { punto: '#1D9E75', txt: '#5DCAA5', bg: 'rgba(29,158,117,0.15)' }
  if (nivel === 'atencion') return { punto: '#EF9F27', txt: '#FAC775', bg: 'rgba(239,159,39,0.14)' }
  if (nivel === 'riesgo') return { punto: '#E24B4A', txt: '#F09595', bg: 'rgba(226,75,74,0.12)' }
  return { punto: '#6E7857', txt: '#8A9663', bg: 'rgba(110,120,87,0.12)' } // error / sin nota
}

const NIVEL_TEXTO = {
  sana: 'Sana',
  atencion: 'Atención',
  riesgo: 'En riesgo',
  error: 'Sin datos',
}

const AREA_INFO = {
  operacion:   { emoji: '⚖️', nombre: 'Operación diaria' },
  financiera:  { emoji: '🧾', nombre: 'Salud financiera' },
  gente:       { emoji: '👥', nombre: 'Gente y nómina' },
  constancia:  { emoji: '📅', nombre: 'Constancia' },
  completitud: { emoji: '📋', nombre: 'Completitud de datos' },
}

const SEV_INFO = {
  alta:  { label: 'Urgente',    bg: 'rgba(226,75,74,0.12)',  txt: '#F09595', borde: 'rgba(240,149,149,0.3)',  emoji: '⚠️' },
  media: { label: 'Importante', bg: 'rgba(239,159,39,0.12)', txt: '#FAC775', borde: 'rgba(250,199,117,0.28)', emoji: '📌' },
  baja:  { label: 'Menor',      bg: 'rgba(239,159,39,0.10)', txt: '#FAC775', borde: 'rgba(250,199,117,0.25)', emoji: '💡' },
}

function colorArea(v) {
  if (v >= 75) return { barra: '#1D9E75', texto: '#5DCAA5' }
  if (v >= 50) return { barra: '#EF9F27', texto: '#FAC775' }
  return { barra: '#E24B4A', texto: '#F09595' }
}

// SaludFlota usa el tema (t) que le pasa el Centro de Mando, igual que los otros módulos.
function SaludFlota({ tema: t, onVolver }) {
  const [cargando, setCargando] = useState(true)
  const [cocinas, setCocinas] = useState([])
  const [error, setError] = useState(null)
  const [seleccionada, setSeleccionada] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    const res = await cargarSaludFlota()
    setCocinas(res.cocinas || [])
    setError(res.error)
    setCargando(false)
  }

  // Conteo por nivel para los KPIs de arriba
  const conteo = cocinas.reduce((acc, c) => {
    acc[c.nivel] = (acc[c.nivel] || 0) + 1
    return acc
  }, {})

  return (
    <div style={{ minHeight: '100vh', background: t.bgPanel, position: 'relative', overflow: 'hidden', padding: '20px', fontFamily: 'inherit' }}>
      <div style={{ position: 'absolute', inset: 0, backgroundImage: `${t.bgGlow1}, ${t.bgGlow2}`, pointerEvents: 'none' }} />

      <div style={{ position: 'relative', maxWidth: '920px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: t.logoGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              🩺
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: t.textPrimary }}>Diagnóstico de Cocinas</p>
              <p style={{ margin: '2px 0 0', fontSize: '10px', letterSpacing: '2px', color: t.textSec }}>SALUD DE LA FLOTA · ANDAMIO</p>
            </div>
          </div>
          <button onClick={onVolver} style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderRadius: '20px', padding: '8px 15px', color: t.textSec, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Volver
          </button>
        </div>

        {cargando && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: t.textSec, fontSize: '14px' }}>
            🩺 Revisando la salud de tus cocinas...
          </div>
        )}

        {!cargando && error && (
          <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(240,149,149,0.3)', borderRadius: '14px', padding: '18px', color: '#F09595', fontSize: '13px' }}>
            No se pudieron cargar las cocinas: {error}
          </div>
        )}

        {!cargando && !error && (
          <>
            {/* KPIs por nivel */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '12px', marginBottom: '22px' }}>
              <KpiNivel t={t} label="TOTAL" valor={cocinas.length} color={t.acento} />
              <KpiNivel t={t} label="SANAS" valor={conteo.sana || 0} color="#1D9E75" />
              <KpiNivel t={t} label="ATENCIÓN" valor={conteo.atencion || 0} color="#EF9F27" />
              <KpiNivel t={t} label="EN RIESGO" valor={conteo.riesgo || 0} color="#E24B4A" />
            </div>

            {/* LISTA DE COCINAS */}
            <div style={{ fontSize: '10px', letterSpacing: '2px', color: t.textMuted, marginBottom: '12px', fontWeight: 600 }}>
              COCINAS · ORDENADAS DE MENOR A MAYOR NOTA
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cocinas.map((c) => {
                const col = colorNivel(c.nivel)
                return (
                  <div
                    key={c.id}
                    onClick={() => setSeleccionada(c)}
                    style={{
                      background: t.cardBg,
                      backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
                      border: `1px solid ${t.borde}`,
                      borderLeft: `4px solid ${col.punto}`,
                      borderRadius: '14px', padding: '16px 18px',
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: '14px', flexWrap: 'wrap', cursor: 'pointer',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px', minWidth: 0 }}>
                      <div style={{ fontSize: '28px', fontWeight: 600, color: col.txt, minWidth: '52px' }}>
                        {c.puntuacion != null ? c.puntuacion.toFixed(1) : '—'}
                      </div>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: '15px', fontWeight: 600, color: t.textPrimary }}>{c.nombre}</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '3px', flexWrap: 'wrap' }}>
                          <span style={{ background: col.bg, color: col.txt, fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '7px', letterSpacing: '0.5px' }}>
                            {NIVEL_TEXTO[c.nivel] || c.nivel}
                          </span>
                          {c.estado === 'suspendida' && (
                            <span style={{ background: 'rgba(226,75,74,0.12)', color: '#F09595', fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '7px' }}>
                              🔒 Suspendida
                            </span>
                          )}
                          {/* Alerta de fuga (solo Andamio la ve) */}
                          {c.consejos?.some(cs => cs.paraQuien === 'andamio') && (
                            <span style={{ background: 'rgba(226,75,74,0.12)', color: '#F09595', fontSize: '10px', fontWeight: 600, padding: '3px 9px', borderRadius: '7px' }}>
                              📞 Posible fuga
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div style={{ color: t.textMuted, fontSize: '20px' }}>›</div>
                  </div>
                )
              })}
              {cocinas.length === 0 && (
                <div style={{ textAlign: 'center', padding: '40px', color: t.textMuted, fontSize: '13px' }}>
                  No hay cocinas visibles todavía.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* MODAL DE DETALLE DE UNA COCINA */}
      {seleccionada && (
        <div
          onClick={() => setSeleccionada(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(6px)', zIndex: 200, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '20px', overflowY: 'auto' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: t.bgPanel, border: `1px solid ${t.bordeFuerte}`, borderRadius: '18px', padding: '24px', maxWidth: '520px', width: '100%', marginTop: '20px', marginBottom: '20px' }}
          >
            <DetalleCocina cocina={seleccionada} t={t} onCerrar={() => setSeleccionada(null)} />
          </div>
        </div>
      )}
    </div>
  )
}

function KpiNivel({ t, label, valor, color }) {
  return (
    <div style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderLeft: `3px solid ${color}`, borderRadius: '0 13px 13px 0', padding: '15px' }}>
      <p style={{ margin: 0, fontSize: '10px', letterSpacing: '1.5px', color: t.textSec }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: '26px', fontWeight: 300, color, lineHeight: 1 }}>{valor}</p>
    </div>
  )
}

function DetalleCocina({ cocina, t, onCerrar }) {
  const col = colorNivel(cocina.nivel)
  const R = 46
  const C = 2 * Math.PI * R
  const frac = Math.max(0, Math.min(1, (cocina.puntuacion || 0) / 10))

  return (
    <div>
      {/* Encabezado del modal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: t.textPrimary }}>{cocina.nombre}</div>
          <div style={{ fontSize: '11px', color: t.textMuted, letterSpacing: '1px', marginTop: '2px' }}>DIAGNÓSTICO COMPLETO</div>
        </div>
        <button onClick={onCerrar} style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderRadius: '20px', padding: '6px 12px', color: t.textSec, fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>
          ✕ Cerrar
        </button>
      </div>

      {/* Nota + aro */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px', marginBottom: '20px' }}>
        <svg viewBox="0 0 120 120" style={{ width: '100px', height: '100px', flexShrink: 0 }}>
          <circle cx="60" cy="60" r={R} fill="none" stroke={`${t.borde}`} strokeWidth="10" />
          <circle cx="60" cy="60" r={R} fill="none" stroke={col.punto} strokeWidth="10" strokeLinecap="round"
            strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 60 60)" />
          <text x="60" y="58" textAnchor="middle" style={{ fontSize: '28px', fontWeight: 600, fill: t.textPrimary }}>
            {cocina.puntuacion != null ? cocina.puntuacion.toFixed(1) : '—'}
          </text>
          <text x="60" y="76" textAnchor="middle" style={{ fontSize: '11px', fill: t.textSec }}>de 10</text>
        </svg>
        <div>
          <span style={{ display: 'inline-block', background: col.bg, color: col.txt, fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '8px', letterSpacing: '0.5px' }}>
            {NIVEL_TEXTO[cocina.nivel] || cocina.nivel}
          </span>
          <p style={{ margin: '10px 0 0', fontSize: '13px', color: t.textSec, lineHeight: 1.5 }}>
            {cocina.consejos?.length || 0} consejo(s) · {cocina.consejos?.filter(c => c.paraQuien === 'andamio').length || 0} alerta(s) para ti
          </p>
        </div>
      </div>

      {/* Áreas */}
      <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: t.textMuted, marginBottom: '12px', fontWeight: 600 }}>ÁREAS</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '20px' }}>
        {Object.entries(AREA_INFO).map(([key, info]) => {
          const valor = cocina.areas?.[key] ?? 0
          const ac = colorArea(valor)
          return (
            <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '16px', width: '20px', textAlign: 'center' }}>{info.emoji}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: t.textPrimary, marginBottom: '4px' }}>
                  <span>{info.nombre}</span>
                  <span style={{ color: ac.texto, fontWeight: 600 }}>{valor}</span>
                </div>
                <div style={{ height: '6px', borderRadius: '99px', background: t.borde }}>
                  <div style={{ height: '100%', width: `${valor}%`, borderRadius: '99px', background: ac.barra }} />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Consejos (TODOS, incluyendo los de Andamio / fuga) */}
      {cocina.consejos?.length > 0 && (
        <>
          <div style={{ fontSize: '10px', letterSpacing: '1.5px', color: t.textMuted, marginBottom: '12px', fontWeight: 600 }}>DIAGNÓSTICO Y ACCIONES</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {cocina.consejos.map((c, i) => {
              const sv = SEV_INFO[c.severidad] || SEV_INFO.baja
              const esAndamio = c.paraQuien === 'andamio'
              return (
                <div key={i} style={{ background: sv.bg, border: `1px solid ${sv.borde}`, borderRadius: '12px', padding: '13px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                    <span style={{ fontSize: '14px' }}>{esAndamio ? '📞' : sv.emoji}</span>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: sv.txt, letterSpacing: '0.5px' }}>
                      {esAndamio ? 'ACCIÓN PARA TI' : sv.label}{c.ahorro ? ' · ahorro' : ''}
                    </span>
                  </div>
                  <div style={{ fontSize: '13px', color: t.textPrimary, lineHeight: 1.5 }}>{c.texto}</div>
                </div>
              )
            })}
          </div>
        </>
      )}

      {/* Avisos técnicos si alguna tabla falló */}
      {cocina.avisos?.length > 0 && (
        <div style={{ marginTop: '16px', background: 'rgba(226,75,74,0.08)', border: '1px solid rgba(240,149,149,0.25)', borderRadius: '12px', padding: '12px 14px' }}>
          <div style={{ fontSize: '11px', color: '#F09595', fontWeight: 600, marginBottom: '4px' }}>⚠️ Fuentes que no se pudieron leer:</div>
          <div style={{ fontSize: '11px', color: t.textSec, lineHeight: 1.5 }}>{cocina.avisos.join(' · ')}</div>
        </div>
      )}
    </div>
  )
}

export default SaludFlota