import { useState, useEffect } from 'react'
import { cargarSenalesSalud } from '../../utils/saludCocinaDatos'
import { calcularSalud } from '../../utils/saludCocina'

// ─── TEMA AZUL CLÍNICO FIJO (modo diagnóstico) ───
const AZUL = {
  bgPanel: '#08203a',
  bgGlow: 'radial-gradient(ellipse at 50% 0%, rgba(55,138,221,0.10), transparent 55%)',
  card: '#0d2b48',
  cardBorde: 'rgba(133,183,235,0.18)',
  textPrimary: '#E6F1FB',
  textSec: '#85B7EB',
  textMuted: '#4f7fae',
  acento: '#378ADD',
  verde: '#1D9E75', verdeBg: 'rgba(29,158,117,0.15)', verdeTxt: '#5DCAA5',
  ambar: '#EF9F27', ambarBg: 'rgba(239,159,39,0.14)', ambarTxt: '#FAC775',
  rojo: '#E24B4A', rojoBg: 'rgba(226,75,74,0.12)', rojoTxt: '#F09595',
}

function colorArea(v) {
  if (v >= 75) return { barra: AZUL.verde, texto: AZUL.verdeTxt }
  if (v >= 50) return { barra: AZUL.ambar, texto: AZUL.ambarTxt }
  return { barra: AZUL.rojo, texto: AZUL.rojoTxt }
}

function colorNivel(nivel) {
  if (nivel === 'sana') return AZUL.verde
  if (nivel === 'atencion') return AZUL.ambar
  return AZUL.rojo
}

const NIVEL_TEXTO = {
  sana: 'Sana',
  atencion: 'Atención',
  riesgo: 'En riesgo',
}

const AREA_INFO = {
  operacion:   { emoji: '⚖️', nombre: 'Operación diaria' },
  financiera:  { emoji: '🧾', nombre: 'Salud financiera' },
  gente:       { emoji: '👥', nombre: 'Gente y nómina' },
  constancia:  { emoji: '📅', nombre: 'Constancia' },
  completitud: { emoji: '📋', nombre: 'Completitud de datos' },
}

const SEV_INFO = {
  alta:  { label: 'Urgente',    bg: AZUL.rojoBg,  txt: AZUL.rojoTxt,  borde: 'rgba(240,149,149,0.3)',  emoji: '⚠️' },
  media: { label: 'Importante', bg: AZUL.ambarBg, txt: AZUL.ambarTxt, borde: 'rgba(250,199,117,0.28)', emoji: '📌' },
  baja:  { label: 'Menor',      bg: AZUL.ambarBg, txt: AZUL.ambarTxt, borde: 'rgba(250,199,117,0.28)', emoji: '💡' },
}

function SaludDeLaCocina({ empresaId, onVolver }) {
  const [cargando, setCargando] = useState(true)
  const [salud, setSalud] = useState(null)
  const [avisos, setAvisos] = useState([])

  useEffect(() => {
    if (empresaId) cargar()
  }, [empresaId])

  async function cargar() {
    setCargando(true)
    const senales = await cargarSenalesSalud(empresaId)
    setAvisos(senales._avisos || [])
    setSalud(calcularSalud(senales))
    setCargando(false)
  }

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: AZUL.bgPanel, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: AZUL.textSec, fontSize: '14px' }}>🩺 Revisando la salud de tu cocina...</p>
      </div>
    )
  }

  const consejosCliente = (salud?.consejos || []).filter(c => c.paraQuien !== 'andamio')

  const R = 54
  const C = 2 * Math.PI * R
  const frac = Math.max(0, Math.min(1, (salud?.puntuacion || 0) / 10))
  const aro = colorNivel(salud?.nivel)

  return (
    <div style={{ minHeight: '100vh', background: AZUL.bgPanel, position: 'relative', padding: '20px', color: AZUL.textPrimary, fontFamily: 'inherit' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: AZUL.bgGlow, pointerEvents: 'none', zIndex: 0 }} />

      <div style={{ position: 'relative', zIndex: 1, maxWidth: '560px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '42px', height: '42px', borderRadius: '12px', background: 'rgba(55,138,221,0.18)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
              🩺
            </div>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '2px', color: AZUL.textMuted, fontWeight: 600 }}>MODO DIAGNÓSTICO</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: AZUL.textPrimary }}>Salud de mi Cocina</div>
            </div>
          </div>
          {onVolver && (
            <button onClick={onVolver} style={{ background: AZUL.card, border: `1px solid ${AZUL.cardBorde}`, borderRadius: '20px', padding: '8px 15px', color: AZUL.textSec, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              ← Volver
            </button>
          )}
        </div>

        {/* NOTA GRANDE + RESUMEN */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: AZUL.card, border: `1px solid ${AZUL.cardBorde}`, borderRadius: '18px', padding: '22px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <svg viewBox="0 0 140 140" style={{ width: '124px', height: '124px', flexShrink: 0 }}>
            <circle cx="70" cy="70" r={R} fill="none" stroke="rgba(133,183,235,0.15)" strokeWidth="12" />
            <circle cx="70" cy="70" r={R} fill="none" stroke={aro} strokeWidth="12" strokeLinecap="round"
              strokeDasharray={`${(frac * C).toFixed(1)} ${C.toFixed(1)}`} transform="rotate(-90 70 70)" />
            <text x="70" y="68" textAnchor="middle" style={{ fontSize: '34px', fontWeight: 600, fill: AZUL.textPrimary }}>
              {salud?.puntuacion?.toFixed(1)}
            </text>
            <text x="70" y="88" textAnchor="middle" style={{ fontSize: '12px', fill: AZUL.textSec }}>de 10</text>
          </svg>
          <div style={{ flex: 1, minWidth: '180px' }}>
            <span style={{ display: 'inline-block', background: `${colorNivel(salud?.nivel)}22`, color: colorNivel(salud?.nivel) === AZUL.verde ? AZUL.verdeTxt : colorNivel(salud?.nivel) === AZUL.ambar ? AZUL.ambarTxt : AZUL.rojoTxt, fontSize: '11px', fontWeight: 600, padding: '4px 12px', borderRadius: '8px', letterSpacing: '0.5px' }}>
              {NIVEL_TEXTO[salud?.nivel]}
            </span>
            <p style={{ margin: '12px 0 0', fontSize: '14px', color: AZUL.textPrimary, lineHeight: 1.5 }}>
              {consejosCliente.length === 0
                ? '¡Tu cocina está al día! Sigue así.'
                : <>Tienes <strong style={{ color: AZUL.ambarTxt }}>{consejosCliente.length} cosa{consejosCliente.length > 1 ? 's' : ''}</strong> por mejorar para subir tu nota.</>}
            </p>
          </div>
        </div>

        {/* ÁREAS */}
        <div style={{ background: AZUL.card, border: `1px solid ${AZUL.cardBorde}`, borderRadius: '18px', padding: '20px', marginBottom: '16px' }}>
          <div style={{ fontSize: '10px', letterSpacing: '2px', color: AZUL.textMuted, marginBottom: '16px', fontWeight: 600 }}>ÁREAS EVALUADAS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {Object.entries(AREA_INFO).map(([key, info]) => {
              const valor = salud?.areas?.[key] ?? 0
              const col = colorArea(valor)
              return (
                <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{ fontSize: '18px', width: '22px', textAlign: 'center' }}>{info.emoji}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: AZUL.textPrimary, marginBottom: '5px' }}>
                      <span>{info.nombre}</span>
                      <span style={{ color: col.texto, fontWeight: 600 }}>{valor}</span>
                    </div>
                    <div style={{ height: '6px', borderRadius: '99px', background: 'rgba(133,183,235,0.12)' }}>
                      <div style={{ height: '100%', width: `${valor}%`, borderRadius: '99px', background: col.barra, transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* QUÉ HACER AHORA */}
        {consejosCliente.length > 0 && (
          <div style={{ background: AZUL.card, border: `1px solid ${AZUL.cardBorde}`, borderRadius: '18px', padding: '20px', marginBottom: '16px' }}>
            <div style={{ fontSize: '10px', letterSpacing: '2px', color: AZUL.textMuted, marginBottom: '16px', fontWeight: 600 }}>QUÉ HACER AHORA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {consejosCliente.map((c, i) => {
                const sv = SEV_INFO[c.severidad] || SEV_INFO.baja
                return (
                  <div key={i} style={{ background: sv.bg, border: `1px solid ${sv.borde}`, borderRadius: '12px', padding: '13px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <span style={{ fontSize: '14px' }}>{sv.emoji}</span>
                      <span style={{ fontSize: '11px', fontWeight: 600, color: sv.txt, letterSpacing: '0.5px' }}>
                        {sv.label}{c.ahorro ? ' · ahorro' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: AZUL.textPrimary, lineHeight: 1.5 }}>{c.texto}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Aviso técnico si alguna tabla falló */}
        {avisos.length > 0 && (
          <div style={{ background: 'rgba(226,75,74,0.08)', border: '1px solid rgba(240,149,149,0.25)', borderRadius: '12px', padding: '12px 14px', marginBottom: '16px' }}>
            <div style={{ fontSize: '11px', color: AZUL.rojoTxt, fontWeight: 600, marginBottom: '4px' }}>⚠️ No se pudieron leer algunas fuentes:</div>
            <div style={{ fontSize: '11px', color: AZUL.textSec, lineHeight: 1.5 }}>{avisos.join(' · ')}</div>
          </div>
        )}

        {/* FOOTER */}
        <div style={{ textAlign: 'center', paddingTop: '8px' }}>
          <p style={{ margin: 0, fontSize: '11px', color: AZUL.textMuted, letterSpacing: '0.5px' }}>
            🩺 Tu administrador virtual · Andamio
          </p>
        </div>
      </div>
    </div>
  )
}

export default SaludDeLaCocina