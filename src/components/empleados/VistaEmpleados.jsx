import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalEmpleado from './ModalEmpleado'
import CalculadoraLiquidacion from '../nomina/CalculadoraLiquidacion'

const COLOR_PERS = '#D4537E'
const COLOR_PERS_BG = '#ED93B1'
const COLOR_PERS_DARKER = '#72243E'
const COLOR_PERS_CLARO = '#FBEAF0'

const ROLES_INFO = {
  propietario:   { label: 'Propietario',     emoji: '👑', color: '#BA7517' },
  administrador: { label: 'Administrador',   emoji: '💼', color: '#185FA5' },
  contador:      { label: 'Contador',        emoji: '🧮', color: '#534AB7' },
  secretaria:    { label: 'Secretaria',      emoji: '📋', color: '#D4537E' },
  jefa_cocina:   { label: 'Jefa de Cocina',  emoji: '👩‍🍳', color: '#D4537E' },
  ayudante:      { label: 'Ayudante',        emoji: '👨‍🍳', color: '#0F6E56' },
  despachador:   { label: 'Despachador',     emoji: '🚚', color: '#D85A30' },
}

function VistaEmpleados({ usuario, empresaId, onVolver }) {
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroActivos, setFiltroActivos] = useState(true)
  const [modalEmpleado, setModalEmpleado] = useState(null)
  const [empleadoParaLiquidar, setEmpleadoParaLiquidar] = useState(null)

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'

  useEffect(() => { cargarEmpleados() }, [empresaId, filtroActivos])

  async function cargarEmpleados() {
    setCargando(true)
    let query = supabase.from('usuarios').select('*').eq('empresa_id', empresaId).order('nombre', { ascending: true })
    if (filtroActivos) query = query.or('activo.eq.true,activo.is.null')
    const { data, error } = await query
    if (error) { console.error(error); setCargando(false); return }
    setEmpleados(data || [])
    setCargando(false)
  }

  function handleIrALiquidacion(empleado) { setEmpleadoParaLiquidar(empleado) }
  function handleVolverDeLiquidacion() { setEmpleadoParaLiquidar(null); cargarEmpleados() }

  function obtenerAvatar(emp) {
    if (emp.foto_url) return null
    if (emp.sexo === 'hombre') return '👨'
    if (emp.sexo === 'mujer') return '👩'
    return emp.nombre?.charAt(0)?.toUpperCase() || '?'
  }

  function getRolInfo(rol) { return ROLES_INFO[rol] || { label: rol, emoji: '👤', color: '#888780' } }

  function formatearFrecuencia(f) {
    const opts = { dia: 'Por día', semana: 'Semanal', quincena: 'Quincenal', mes: 'Mensual' }
    return opts[f] || 'No definida'
  }

  function formatearSueldo(s) { if (!s) return 'No definido'; return `RD$ ${Number(s).toLocaleString('es-DO', { minimumFractionDigits: 2 })}` }

  if (empleadoParaLiquidar) {
    return <CalculadoraLiquidacion empresaId={empresaId} usuarioActual={usuario} onVolver={handleVolverDeLiquidacion} empleadoPreseleccionado={empleadoParaLiquidar} />
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: '1200px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        <Titulo emoji="👥" titulo="Empleados" subtitulo="Gestiona el personal de tu cocina" color={COLOR_PERS} colorBg={COLOR_PERS_BG} colorDarker={COLOR_PERS_DARKER} colorClaro={COLOR_PERS_CLARO} esTropical={esTropical} accion={{ label: '➕ Agregar empleado', onClick: () => setModalEmpleado({}) }} />

        <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '12px', padding: '14px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '14px', boxShadow: 'var(--modulo-sombra)' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '13px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            <input type="checkbox" checked={filtroActivos} onChange={(e) => setFiltroActivos(e.target.checked)} style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
            Solo activos
          </label>
          <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            {empleados.length} {empleados.length === 1 ? 'empleado' : 'empleados'}
          </span>
        </div>

        {cargando ? (
          <div style={{ padding: '48px', textAlign: 'center', color: 'var(--color-text-muted)' }}>⏳ Cargando empleados...</div>
        ) : empleados.length === 0 ? (
          <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '14px', padding: '48px', textAlign: 'center', boxShadow: 'var(--modulo-sombra)' }}>
            <div style={{ fontSize: '56px', marginBottom: '12px' }}>👥</div>
            <p style={{ color: 'var(--color-text-primary)', fontSize: '16px', fontWeight: 600, marginBottom: '6px' }}>No hay empleados registrados todavía</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>Haz click en "Agregar empleado" para comenzar</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '14px' }}>
            {empleados.map(emp => {
              const rolInfo = getRolInfo(emp.rol)
              const inactivo = emp.activo === false
              return (
                <button key={emp.id} onClick={() => setModalEmpleado(emp)}
                  style={{
                    background: 'var(--color-modulo-bg)',
                    border: '1px solid var(--color-modulo-border)',
                    borderLeft: `4px solid ${inactivo ? '#888780' : rolInfo.color}`,
                    borderRadius: '14px', padding: '16px',
                    cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
                    opacity: inactivo ? 0.6 : 1,
                    boxShadow: 'var(--modulo-sombra)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
                    {emp.foto_url ? (
                      <img src={emp.foto_url} alt={emp.nombre} style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} />
                    ) : (
                      <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: esTropical ? `${rolInfo.color}20` : `${rolInfo.color}30`, border: `2px solid ${rolInfo.color}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px' }}>
                        {obtenerAvatar(emp)}
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{emp.nombre}</div>
                      {inactivo && <div style={{ fontSize: '10px', color: '#E24B4A', fontWeight: 600 }}>Inactivo</div>}
                    </div>
                  </div>

                  <span style={{ display: 'inline-block', fontSize: '10px', fontWeight: 600, padding: '4px 10px', borderRadius: '8px', background: esTropical ? rolInfo.color : `${rolInfo.color}25`, color: esTropical ? '#ffffff' : rolInfo.color, marginBottom: '8px' }}>
                    {rolInfo.emoji} {rolInfo.label}
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    {emp.telefono && <div>📞 {emp.telefono}</div>}
                    {emp.sueldo && (
                      <div>💰 {formatearSueldo(emp.sueldo)} <span style={{ color: 'var(--color-text-muted)' }}>/ {formatearFrecuencia(emp.frecuencia_pago)}</span></div>
                    )}
                    {emp.fecha_contratacion && (
                      <div>📅 Desde {new Date(emp.fecha_contratacion).toLocaleDateString('es-DO')}</div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {modalEmpleado && (
        <ModalEmpleado empresaId={empresaId} empleadoExistente={modalEmpleado.id ? modalEmpleado : null} onCerrar={() => setModalEmpleado(null)} onGuardado={() => cargarEmpleados()} onIrALiquidacion={handleIrALiquidacion} />
      )}
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

function Titulo({ emoji, titulo, subtitulo, color, colorBg, colorDarker, colorClaro, esTropical, accion }) {
  return (
    <div style={{
      background: esTropical ? `linear-gradient(135deg, ${colorClaro} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${color}25 0%, ${color}10 100%)`,
      border: esTropical ? `1.5px solid ${colorBg}` : `1px solid ${color}55`,
      borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
      display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between', flexWrap: 'wrap',
      boxShadow: esTropical ? `0 2px 12px ${color}15` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: esTropical ? color : `${color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px', boxShadow: esTropical ? `0 4px 12px ${color}40` : 'none' }}>{emoji}</div>
        <div>
          <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? colorDarker : 'var(--color-text-primary)', lineHeight: 1.2 }}>{titulo}</div>
          <div style={{ fontSize: '12px', color: esTropical ? color : `${color}CC`, marginTop: '4px', fontWeight: 500 }}>{subtitulo}</div>
        </div>
      </div>
      {accion && (
        <button onClick={accion.onClick} style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${color} 0%, ${colorDarker} 100%)`, border: 'none', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', boxShadow: `0 4px 12px ${color}40` }}>
          {accion.label}
        </button>
      )}
    </div>
  )
}

function btnVolver() {
  return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
}

function tabTemaStyle(activo) {
  return { background: activo ? 'var(--gradient-toggle-active)' : 'transparent', border: 'none', borderRadius: '16px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }
}

export default VistaEmpleados