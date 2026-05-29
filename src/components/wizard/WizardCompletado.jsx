import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const NARANJA = { c: '#D85A30', claro: '#FCE9DA', dark: '#7A2F12' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const MORADO = { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' }

function WizardCompletado({ empresaId, onIrAlDashboard, onEditarConfig }) {
  const [stats, setStats] = useState({
    empresas: 0, escuelas: 0, raciones: 0, facturacion: 0,
    recetas: 0, usuarios: 0, finanzasConfigurada: false
  })
  const [empresa, setEmpresa] = useState(null)
  const [cargando, setCargando] = useState(true)

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

  useEffect(() => { if (empresaId) cargarStats() }, [empresaId])

  async function cargarStats() {
    setCargando(true)
    const { data: empresaData } = await supabase.from('empresas').select('*').eq('id', empresaId).single()
    const { data: escuelas } = await supabase.from('escuelas').select('raciones_contractuales, precio_racion').eq('empresa_id', empresaId)
    const { data: recetas } = await supabase.from('recetas').select('id').eq('empresa_id', empresaId)
    const { data: usuarios } = await supabase.from('usuarios').select('id').eq('empresa_id', empresaId)
    const { data: finanzas } = await supabase.from('finanzas').select('id').eq('empresa_id', empresaId).single()

    const totalRaciones = escuelas?.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0) || 0
    const facturacionDiaria = escuelas?.reduce((sum, e) => sum + ((e.raciones_contractuales || 0) * (parseFloat(e.precio_racion) || 0)), 0) || 0
    const facturacionMensual = facturacionDiaria * 22

    setEmpresa(empresaData)
    setStats({
      empresas: 1, escuelas: escuelas?.length || 0,
      raciones: totalRaciones, facturacion: facturacionMensual,
      recetas: recetas?.length || 0, usuarios: usuarios?.length || 0,
      finanzasConfigurada: !!finanzas
    })
    setCargando(false)
  }

  if (cargando) {
    return (
      <div style={{ ...tarjetaStyle(), padding: '48px', textAlign: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Cargando resumen...</p>
      </div>
    )
  }

  return (
    <div style={tarjetaStyle()}>
      
      {/* CELEBRACIÓN */}
      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <div style={{ fontSize: '64px', marginBottom: '16px' }}>🎉</div>
        <h2 style={{ fontSize: '32px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
          ¡Configuración completa!
        </h2>
        <p style={{ fontSize: '17px', color: 'var(--color-text-secondary)', margin: 0 }}>
          Tu cocina <span style={{ fontWeight: 700, color: AZUL.c }}>{empresa?.nombre}</span> está lista para operar
        </p>
      </div>

      {/* STATS GRID */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '32px' }}>
        <StatCard color={AZUL} esTropical={esTropical} emoji="🏫" valor={stats.escuelas}
          label={`${stats.escuelas === 1 ? 'Escuela' : 'Escuelas'} registrada${stats.escuelas === 1 ? '' : 's'}`} />
        <StatCard color={VERDE} esTropical={esTropical} emoji="🍽️" valor={stats.raciones.toLocaleString()} label="Raciones por día" />
        <StatCard color={NARANJA} esTropical={esTropical} emoji="💰" valor={`RD$ ${(stats.facturacion / 1000).toFixed(0)}K`} label="Facturación proyectada/mes" />
        <StatCard color={MORADO} esTropical={esTropical} emoji="👥" valor={stats.usuarios}
          label={`${stats.usuarios === 1 ? 'Persona' : 'Personas'} en el equipo`} />
      </div>

      {/* CHECKLIST */}
      <div style={{
        background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)',
        borderRadius: '12px', padding: '20px', marginBottom: '24px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.5px', margin: '0 0 12px' }}>
          CONFIGURACIÓN COMPLETADA:
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <ChecklistItem ok={true} texto="Cocina registrada con RNC" />
          <ChecklistItem ok={true} texto={`${stats.escuelas} escuelas con sus directores`} />
          <ChecklistItem ok={true} texto={`Menú semanal de ${stats.recetas} platos`} />
          <ChecklistItem ok={true} texto={`${stats.usuarios} personas con PINs únicos`} />
          <ChecklistItem ok={stats.finanzasConfigurada} 
            texto={`Configuración financiera ${stats.finanzasConfigurada ? 'completa' : 'pendiente'}`} />
        </div>
      </div>

      {/* MODO OPERACIÓN */}
      <div style={{
        background: empresa?.modo_operacion === 'aprendizaje'
          ? (esTropical ? VERDE.claro : `${VERDE.c}12`)
          : (esTropical ? AZUL.claro : `${AZUL.c}12`),
        border: `2px solid ${empresa?.modo_operacion === 'aprendizaje' ? VERDE.c : AZUL.c}40`,
        borderRadius: '12px', padding: '18px', marginBottom: '24px',
      }}>
        <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.5px', margin: '0 0 6px' }}>
          MODO DE OPERACIÓN:
        </p>
        <p style={{ fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 6px' }}>
          {empresa?.modo_operacion === 'aprendizaje' ? '🌱 Modo Aprendizaje' : '📊 Modo Detallado'}
        </p>
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
          {empresa?.modo_operacion === 'aprendizaje' 
            ? 'La app va a observar tu operación durante 3-4 semanas y aprender tus patrones automáticamente.'
            : 'La app va a usar las cantidades exactas que cargues para calcular costos y márgenes.'}
        </p>
      </div>

      {/* BOTONES */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        <button onClick={onIrAlDashboard}
          style={{
            width: '100%', padding: '18px 24px',
            background: 'linear-gradient(135deg, #D85A30 0%, #B53D1A 100%)',
            border: 'none', borderRadius: '12px', color: 'white', fontSize: '17px', fontWeight: 700,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          🚀 Ir al Dashboard
        </button>

        <button onClick={onEditarConfig}
          style={{
            width: '100%', padding: '14px 24px',
            background: 'var(--color-bg-card)', border: '2px solid var(--color-border-subtle)',
            borderRadius: '12px', color: 'var(--color-text-secondary)', fontSize: '14px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
          ✏️ Editar configuración
        </button>
      </div>
    </div>
  )
}

function StatCard({ color, esTropical, emoji, valor, label }) {
  return (
    <div style={{
      background: esTropical ? color.claro : `${color.c}12`,
      border: `1px solid ${color.c}40`, borderRadius: '14px', padding: '20px',
    }}>
      <div style={{ fontSize: '28px', marginBottom: '8px' }}>{emoji}</div>
      <p style={{ fontSize: '26px', fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{valor}</p>
      <p style={{ fontSize: '13px', fontWeight: 600, color: esTropical ? color.dark : color.c, margin: '4px 0 0' }}>
        {label}
      </p>
    </div>
  )
}

function ChecklistItem({ ok, texto }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
      <span style={{
        color: ok ? VERDE.c : 'var(--color-text-muted)',
        fontWeight: 700, fontSize: '16px',
      }}>
        {ok ? '✓' : '○'}
      </span>
      <span style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>{texto}</span>
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

export default WizardCompletado