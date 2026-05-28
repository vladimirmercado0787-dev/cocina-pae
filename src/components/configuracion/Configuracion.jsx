import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import SeccionMiCocina from './SeccionMiCocina'
import SeccionPropietario from './SeccionPropietario'
import SeccionEscuelas from './SeccionEscuelas'
import SeccionPersonal from './SeccionPersonal'
import SeccionFinanzas from './SeccionFinanzas'
import SeccionMenusRecetas from './SeccionMenusRecetas'
import SeccionIngredientes from './SeccionIngredientes'
import SeccionSeguridad from './SeccionSeguridad'
import SeccionNomina from './SeccionNomina'

const COLOR_OP = '#7F77DD'
const COLOR_OP_BG = '#AFA9EC'
const COLOR_OP_DARKER = '#3C3489'
const COLOR_OP_CLARO = '#EEEDFE'

const TABS = [
  { id: 'cocina', emoji: '🏢', label: 'Mi Cocina' },
  { id: 'propietario', emoji: '👤', label: 'Datos del Propietario' },
  { id: 'escuelas', emoji: '🏫', label: 'Escuelas' },
  { id: 'ingredientes', emoji: '🥕', label: 'Ingredientes' },
  { id: 'menus', emoji: '🍽️', label: 'Menús y Recetas' },
  { id: 'personal', emoji: '👥', label: 'Personal' },
  { id: 'nomina', emoji: '💰', label: 'Nómina' },
  { id: 'finanzas', emoji: '📊', label: 'Finanzas' },
  { id: 'seguridad', emoji: '🔐', label: 'Seguridad' },
]

function Configuracion({ usuario, empresaId, onVolver }) {
  const [tabActiva, setTabActiva] = useState('cocina')
  const [empresa, setEmpresa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [mensajeExito, setMensajeExito] = useState('')

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'

  useEffect(() => { cargarEmpresa() }, [empresaId])

  async function cargarEmpresa() {
    setCargando(true)
    const { data } = await supabase.from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(data)
    setCargando(false)
  }

  function mostrarExito(msg) { setMensajeExito(msg); setTimeout(() => setMensajeExito(''), 3000) }

  function renderSeccion() {
    if (cargando) return <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>⏳ Cargando...</div>
    if (tabActiva === 'cocina') return <SeccionMiCocina empresa={empresa} onActualizado={cargarEmpresa} mostrarExito={mostrarExito} />
    if (tabActiva === 'propietario') return <SeccionPropietario empresa={empresa} onActualizado={cargarEmpresa} mostrarExito={mostrarExito} />
    if (tabActiva === 'escuelas') return <SeccionEscuelas empresaId={empresaId} mostrarExito={mostrarExito} />
    if (tabActiva === 'ingredientes') return <SeccionIngredientes empresaId={empresaId} mostrarExito={mostrarExito} />
    if (tabActiva === 'menus') return <SeccionMenusRecetas empresaId={empresaId} mostrarExito={mostrarExito} />
    if (tabActiva === 'personal') return <SeccionPersonal empresaId={empresaId} mostrarExito={mostrarExito} />
    if (tabActiva === 'nomina') return <SeccionNomina empresa={empresa} onActualizado={cargarEmpresa} mostrarExito={mostrarExito} />
    if (tabActiva === 'finanzas') return <SeccionFinanzas empresaId={empresaId} mostrarExito={mostrarExito} />
    if (tabActiva === 'seguridad') return <SeccionSeguridad empresa={empresa} onActualizado={cargarEmpresa} mostrarExito={mostrarExito} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        <Titulo emoji="⚙️" titulo="Ajustes del Sistema" subtitulo={empresa?.nombre || 'Configuración'} color={COLOR_OP} colorBg={COLOR_OP_BG} colorDarker={COLOR_OP_DARKER} colorClaro={COLOR_OP_CLARO} esTropical={esTropical} />

        {mensajeExito && (
          <div style={{ position: 'fixed', top: '20px', right: '20px', background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)', color: 'white', padding: '12px 20px', borderRadius: '12px', fontSize: '13px', fontWeight: 600, zIndex: 100, boxShadow: '0 4px 16px rgba(29, 158, 117, 0.4)' }}>
            ✅ {mensajeExito}
          </div>
        )}

        <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '14px', overflow: 'hidden', boxShadow: 'var(--modulo-sombra)', display: 'grid', gridTemplateColumns: '240px 1fr' }}>
          
          {/* Sidebar */}
          <div style={{ background: esTropical ? '#FBFAF6' : 'var(--color-bg-elevated)', borderRight: '1px solid var(--color-border-subtle)', padding: '14px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              {TABS.map(tab => {
                const activo = tabActiva === tab.id
                return (
                  <button key={tab.id} onClick={() => setTabActiva(tab.id)}
                    style={{
                      padding: '10px 14px', textAlign: 'left',
                      background: activo ? (esTropical ? COLOR_OP : `${COLOR_OP}25`) : 'transparent',
                      border: 'none', borderRadius: '10px',
                      color: activo ? (esTropical ? '#ffffff' : COLOR_OP) : 'var(--color-text-secondary)',
                      fontSize: '13px', fontWeight: activo ? 600 : 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: '8px',
                      boxShadow: activo && esTropical ? `0 2px 8px ${COLOR_OP}40` : 'none',
                    }}>
                    <span>{tab.emoji}</span>
                    <span>{tab.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Contenido */}
          <div style={{ padding: '20px', minHeight: '500px', background: 'var(--color-modulo-bg)' }}>
            {renderSeccion()}
          </div>

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

function Titulo({ emoji, titulo, subtitulo, color, colorBg, colorDarker, colorClaro, esTropical }) {
  return (
    <div style={{
      background: esTropical ? `linear-gradient(135deg, ${colorClaro} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`,
      border: esTropical ? `1.5px solid ${colorBg}` : `1px solid ${color}55`,
      borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
      display: 'flex', alignItems: 'center', gap: '16px',
      boxShadow: esTropical ? `0 2px 12px ${color}15` : 'none',
    }}>
      <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: esTropical ? color : `${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: esTropical ? `0 4px 12px ${color}40` : 'none' }}>{emoji}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? colorDarker : 'var(--color-text-primary)', lineHeight: 1.2 }}>{titulo}</div>
        <div style={{ fontSize: '12px', color: esTropical ? color : `${color}CC`, marginTop: '4px', fontWeight: 500 }}>{subtitulo}</div>
      </div>
    </div>
  )
}

function btnVolver() {
  return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
}

function tabTemaStyle(activo) {
  return { background: activo ? 'var(--gradient-toggle-active)' : 'transparent', border: 'none', borderRadius: '16px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }
}

export default Configuracion