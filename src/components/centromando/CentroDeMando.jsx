import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModuloNuevaCocina from './ModuloNuevaCocina'
import GestionCocinas from './GestionCocinas'
import ContabilidadAndamio from './ContabilidadAndamio'

// ─── LOS 3 TEMAS DEL CENTRO DE MANDO ───
const TEMAS = {
  oliva: {
    nombre: 'Oliva', icono: '🫒',
    bgPanel: 'linear-gradient(160deg, #1E2613 0%, #161C0E 60%, #10140A 100%)',
    bgGlow1: 'radial-gradient(circle at 15% 0%, rgba(163,181,86,0.12), transparent 40%)',
    bgGlow2: 'radial-gradient(circle at 85% 100%, rgba(217,180,65,0.08), transparent 45%)',
    borde: 'rgba(163,181,86,0.18)',
    bordeFuerte: 'rgba(163,181,86,0.45)',
    cardBg: 'rgba(40,49,26,0.45)',
    textPrimary: '#EDF1DD', textSec: '#8A9663', textMuted: '#6E7857',
    acento: '#A3B556', acento2: '#D9B441',
    logoGrad: 'linear-gradient(135deg, #A3B556, #5E7029)',
  },
  azul: {
    nombre: 'Azul', icono: '🌊',
    bgPanel: 'radial-gradient(ellipse at 50% 0%, #10243A 0%, #0A1119 55%, #060A0F 100%)',
    bgGlow1: 'radial-gradient(circle at 15% 0%, rgba(74,163,240,0.12), transparent 40%)',
    bgGlow2: 'radial-gradient(circle at 85% 100%, rgba(46,196,166,0.08), transparent 45%)',
    borde: 'rgba(74,163,240,0.18)',
    bordeFuerte: 'rgba(74,163,240,0.45)',
    cardBg: 'rgba(16,32,50,0.55)',
    textPrimary: '#EAF2FB', textSec: '#6B8299', textMuted: '#5E7080',
    acento: '#4AA3F0', acento2: '#2EC4A6',
    logoGrad: 'linear-gradient(135deg, #4AA3F0, #1E6FB8)',
  },
  salvia: {
    nombre: 'Salvia', icono: '🌿', claro: true,
    bgPanel: 'linear-gradient(160deg, #F0F2E6 0%, #E3E9D5 100%)',
    bgGlow1: 'radial-gradient(circle at 15% 0%, rgba(141,160,78,0.10), transparent 40%)',
    bgGlow2: 'radial-gradient(circle at 85% 100%, rgba(176,134,40,0.06), transparent 45%)',
    borde: 'rgba(141,160,78,0.3)',
    bordeFuerte: 'rgba(141,160,78,0.55)',
    cardBg: 'rgba(251,252,245,0.85)',
    textPrimary: '#2E3818', textSec: '#76814F', textMuted: '#9AA67A',
    acento: '#6B7D32', acento2: '#B08628',
    logoGrad: 'linear-gradient(135deg, #8DA04E, #5E7029)',
  },
}

function CentroDeMando({ empresa, onSalir }) {
  const [temaKey, setTemaKey] = useState(() => localStorage.getItem('centro_mando_tema') || 'oliva')
  const [vista, setVista] = useState('panel') // panel | nueva_cocina | gestion_cocinas | contabilidad
  const [stats, setStats] = useState({ cocinas: 0, escuelas: 0, usuarios: 0 })
  const [cargandoStats, setCargandoStats] = useState(true)

  const t = TEMAS[temaKey] || TEMAS.oliva

  useEffect(() => {
    localStorage.setItem('centro_mando_tema', temaKey)
  }, [temaKey])

  useEffect(() => {
    cargarStats()
  }, [])

  async function cargarStats() {
    setCargandoStats(true)
    const [cocinas, escuelas, usuarios] = await Promise.all([
      supabase.from('empresas').select('id', { count: 'exact', head: true }),
      supabase.from('escuelas').select('id', { count: 'exact', head: true }),
      supabase.from('usuarios').select('id', { count: 'exact', head: true }),
    ])
    setStats({
      cocinas: cocinas.count || 0,
      escuelas: escuelas.count || 0,
      usuarios: usuarios.count || 0,
    })
    setCargandoStats(false)
  }

  const ahora = new Date()
  const saludo = ahora.getHours() < 12 ? 'Buenos días' : ahora.getHours() < 19 ? 'Buenas tardes' : 'Buenas noches'
  const fechaTexto = ahora.toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long' })
  const horaTexto = ahora.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })

  if (vista === 'nueva_cocina') {
    return (
      <ModuloNuevaCocina
        tema={t}
        empresa={empresa}
        onVolver={() => { setVista('panel'); cargarStats() }}
      />
    )
  }

  if (vista === 'gestion_cocinas') {
    return (
      <GestionCocinas
        tema={t}
        empresa={empresa}
        onVolver={() => { setVista('panel'); cargarStats() }}
      />
    )
  }

  if (vista === 'contabilidad') {
    return (
      <ContabilidadAndamio
        tema={t}
        empresa={empresa}
        onVolver={() => { setVista('panel'); cargarStats() }}
      />
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        position: 'relative',
        overflow: 'hidden',
        background: t.bgPanel,
        padding: '20px',
        fontFamily: 'inherit',
      }}
    >
      <style>{`
        @keyframes cmPanelFade { 0% { opacity: 0; } 100% { opacity: 1; } }
        @keyframes cmPanelUp { 0% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes cmPulse { 0%,100%{opacity:1; transform:scale(1);} 50%{opacity:.4; transform:scale(.7);} }
        .cm-stat { transition: transform .35s cubic-bezier(.2,.8,.2,1), border-color .35s; }
        .cm-stat:hover { transform: translateY(-4px); }
        .cm-act { transition: transform .4s cubic-bezier(.2,.8,.2,1), border-color .4s, box-shadow .4s; cursor: pointer; }
        .cm-act:hover { transform: translateY(-6px); }
        .cm-act:hover .cm-ico { transform: scale(1.12) rotate(-4deg); }
        .cm-ico { transition: transform .4s cubic-bezier(.2,.8,.2,1); }
        .cm-tema-btn { transition: all .25s ease; }
      `}</style>

      <div style={{ position: 'absolute', inset: 0, backgroundImage: `${t.bgGlow1}, ${t.bgGlow2}`, pointerEvents: 'none', opacity: 0, animation: 'cmPanelFade 1.2s ease 0.1s forwards' }} />

      <div style={{ position: 'relative', maxWidth: '920px', margin: '0 auto' }}>

        {/* ─── HEADER ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '28px', opacity: 0, animation: 'cmPanelUp 0.6s ease 0.15s forwards' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '50px', height: '50px', borderRadius: '15px', background: t.logoGrad, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: `0 8px 20px -6px ${t.acento}80` }}>
              🛡️
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: t.textPrimary }}>Centro de Mando</p>
              <p style={{ margin: '2px 0 0', fontSize: '10px', letterSpacing: '2px', color: t.textSec }}>ANDAMIO · SÚPER-ADMIN</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ background: `${t.acento2}22`, border: `1px solid ${t.acento2}55`, color: t.acento2, fontSize: '10px', letterSpacing: '2px', fontWeight: 700, padding: '6px 12px', borderRadius: '7px' }}>
              COCINA PAE
            </span>
            <button onClick={onSalir} style={{ background: t.cardBg, border: `1px solid ${t.borde}`, borderRadius: '20px', padding: '8px 15px', color: t.textSec, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
              🚪 Salir
            </button>
          </div>
        </div>

        {/* ─── SELECTOR DE TEMAS ─── */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', opacity: 0, animation: 'cmPanelUp 0.6s ease 0.25s forwards' }}>
          {Object.entries(TEMAS).map(([key, tema]) => (
            <button
              key={key}
              className="cm-tema-btn"
              onClick={() => setTemaKey(key)}
              style={{
                display: 'flex', alignItems: 'center', gap: '6px',
                background: temaKey === key ? `${t.acento}22` : 'transparent',
                border: `1px solid ${temaKey === key ? t.bordeFuerte : t.borde}`,
                borderRadius: '10px', padding: '7px 13px',
                color: temaKey === key ? t.textPrimary : t.textSec,
                fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <span>{tema.icono}</span> {tema.nombre}
            </button>
          ))}
        </div>

        {/* ─── SALUDO ─── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '22px', opacity: 0, animation: 'cmPanelUp 0.6s ease 0.35s forwards' }}>
          <div>
            <p style={{ margin: 0, fontSize: '22px', fontWeight: 600, color: t.textPrimary }}>{saludo}</p>
            <p style={{ margin: '3px 0 0', fontSize: '12px', color: t.textMuted, textTransform: 'capitalize' }}>{fechaTexto} · {horaTexto}</p>
          </div>
          <span style={{ display: 'flex', alignItems: 'center', gap: '7px', background: `${t.acento}1A`, border: `1px solid ${t.acento}50`, color: t.acento, fontSize: '11px', padding: '6px 13px', borderRadius: '20px' }}>
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: t.acento, animation: 'cmPulse 2s infinite' }} />
            EN LÍNEA
          </span>
        </div>

        {/* ─── KPIs ─── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '22px', opacity: 0, animation: 'cmPanelUp 0.6s ease 0.45s forwards' }}>
          <StatCard t={t} label="COCINAS" valor={cargandoStats ? '—' : stats.cocinas} acento={t.acento} />
          <StatCard t={t} label="ESCUELAS" valor={cargandoStats ? '—' : stats.escuelas} acento={t.acento2} />
          <StatCard t={t} label="USUARIOS" valor={cargandoStats ? '—' : stats.usuarios} acento={t.acento} />
        </div>

        {/* Nota informativa */}
        <div style={{ background: `${t.acento2}12`, border: `1px solid ${t.acento2}30`, borderRadius: '12px', padding: '12px 16px', marginBottom: '22px', opacity: 0, animation: 'cmPanelUp 0.6s ease 0.5s forwards' }}>
          <p style={{ margin: 0, fontSize: '12px', color: t.textSec, lineHeight: 1.5 }}>
            💡 Por ahora ves los datos de tu propia cocina. Cuando se active la llave maestra de inteligencia, verás los datos agregados de toda la red.
          </p>
        </div>

        {/* ─── MÓDULOS ─── */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', opacity: 0, animation: 'cmPanelUp 0.6s ease 0.55s forwards' }}>
          {/* Nueva Cocina */}
          <div
            className="cm-act"
            onClick={() => setVista('nueva_cocina')}
            style={{ flex: '1 1 220px', position: 'relative', background: t.cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${t.borde}`, borderRadius: '16px', padding: '20px', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, left: '18px', right: '18px', height: '1px', background: t.claro ? 'linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)' : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
            <span className="cm-ico" style={{ display: 'inline-flex', width: '46px', height: '46px', alignItems: 'center', justifyContent: 'center', borderRadius: '13px', background: `${t.acento}22`, fontSize: '24px' }}>🏗️</span>
            <p style={{ margin: '13px 0 3px', fontSize: '16px', fontWeight: 600, color: t.textPrimary }}>Nueva Cocina</p>
            <p style={{ margin: 0, fontSize: '12px', color: t.textSec }}>Dar de alta un cliente nuevo</p>
          </div>

          {/* Gestión de Cocinas */}
          <div
            className="cm-act"
            onClick={() => setVista('gestion_cocinas')}
            style={{ flex: '1 1 220px', position: 'relative', background: t.cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${t.borde}`, borderRadius: '16px', padding: '20px', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, left: '18px', right: '18px', height: '1px', background: t.claro ? 'linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)' : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
            <span className="cm-ico" style={{ display: 'inline-flex', width: '46px', height: '46px', alignItems: 'center', justifyContent: 'center', borderRadius: '13px', background: `${t.acento}22`, fontSize: '24px' }}>🏢</span>
            <p style={{ margin: '13px 0 3px', fontSize: '16px', fontWeight: 600, color: t.textPrimary }}>Gestión de Cocinas</p>
            <p style={{ margin: 0, fontSize: '12px', color: t.textSec }}>Ver, suspender, reactivar</p>
          </div>

          {/* Contabilidad Andamio */}
          <div
            className="cm-act"
            onClick={() => setVista('contabilidad')}
            style={{ flex: '1 1 220px', position: 'relative', background: t.cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${t.borde}`, borderRadius: '16px', padding: '20px', overflow: 'hidden' }}
          >
            <div style={{ position: 'absolute', top: 0, left: '18px', right: '18px', height: '1px', background: t.claro ? 'linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)' : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
            <span className="cm-ico" style={{ display: 'inline-flex', width: '46px', height: '46px', alignItems: 'center', justifyContent: 'center', borderRadius: '13px', background: `${t.acento2}22`, fontSize: '24px' }}>📊</span>
            <p style={{ margin: '13px 0 3px', fontSize: '16px', fontWeight: 600, color: t.textPrimary }}>Contabilidad</p>
            <p style={{ margin: 0, fontSize: '12px', color: t.textSec }}>Cobros, ingresos y pagos</p>
          </div>

          {/* Inteligencia (próximamente) */}
          <div
            style={{ flex: '1 1 220px', position: 'relative', background: t.cardBg, backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: `1px solid ${t.borde}`, borderRadius: '16px', padding: '20px', overflow: 'hidden', opacity: 0.75 }}
          >
            <div style={{ position: 'absolute', top: 0, left: '18px', right: '18px', height: '1px', background: t.claro ? 'linear-gradient(90deg, transparent, rgba(0,0,0,0.1), transparent)' : 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)' }} />
            <span style={{ display: 'inline-flex', width: '46px', height: '46px', alignItems: 'center', justifyContent: 'center', borderRadius: '13px', background: `${t.acento2}22`, fontSize: '24px' }}>📡</span>
            <p style={{ margin: '13px 0 3px', fontSize: '16px', fontWeight: 600, color: t.textPrimary }}>Inteligencia</p>
            <p style={{ margin: 0, fontSize: '12px', color: t.textSec }}>Datos acumulados de la red</p>
            <span style={{ position: 'absolute', top: '16px', right: '16px', background: `${t.acento2}22`, color: t.acento2, fontSize: '9px', letterSpacing: '1px', fontWeight: 700, padding: '4px 9px', borderRadius: '6px' }}>PRONTO</span>
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: 'center', marginTop: '32px', opacity: 0, animation: 'cmPanelUp 0.6s ease 0.65s forwards' }}>
          <p style={{ margin: 0, fontSize: '11px', color: t.textMuted, letterSpacing: '0.5px' }}>
            🇩🇴 Andamio · Materializamos ideas, construimos posibilidades
          </p>
        </div>
      </div>
    </div>
  )
}

function StatCard({ t, label, valor, acento }) {
  return (
    <div
      className="cm-stat"
      style={{
        position: 'relative',
        background: t.cardBg,
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: `1px solid ${t.borde}`,
        borderLeft: `3px solid ${acento}`,
        borderRadius: '0 13px 13px 0',
        padding: '15px',
        overflow: 'hidden',
      }}
    >
      <p style={{ margin: 0, fontSize: '10px', letterSpacing: '1.5px', color: t.textSec }}>{label}</p>
      <p style={{ margin: '6px 0 0', fontSize: '26px', fontWeight: 300, color: t.textPrimary, lineHeight: 1 }}>{valor}</p>
    </div>
  )
}

export default CentroDeMando