import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const MORADO = { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }

function SeccionNomina({ empresa, onActualizado, mostrarExito }) {
  const [frecuencia, setFrecuencia] = useState('quincenal')
  const [diaPago1, setDiaPago1] = useState(15)
  const [diaPago2, setDiaPago2] = useState(30)
  const [descuento, setDescuento] = useState(5.74)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

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

  useEffect(() => {
    if (empresa) {
      setFrecuencia(empresa.nomina_frecuencia || 'quincenal')
      setDiaPago1(empresa.nomina_dia_pago_1 || 15)
      setDiaPago2(empresa.nomina_dia_pago_2 || 30)
      setDescuento(empresa.nomina_descuento_porcentaje || 5.74)
    }
  }, [empresa])

  async function guardar() {
    setError('')
    if (frecuencia === 'quincenal' && (diaPago1 < 1 || diaPago1 > 28)) { setError('El día de la 1ra quincena debe estar entre 1 y 28'); return }
    if (frecuencia === 'quincenal' && (diaPago2 < 1 || diaPago2 > 31)) { setError('El día de la 2da quincena debe estar entre 1 y 31'); return }
    if (frecuencia === 'quincenal' && diaPago1 >= diaPago2) { setError('La 2da quincena debe ser un día posterior a la 1ra'); return }
    if (frecuencia === 'mensual' && (diaPago1 < 1 || diaPago1 > 28)) { setError('El día de pago mensual debe estar entre 1 y 28'); return }
    if (descuento < 0 || descuento > 100) { setError('El descuento debe estar entre 0% y 100%'); return }

    setGuardando(true)
    const { error: errorUpdate } = await supabase.from('empresas').update({
      nomina_frecuencia: frecuencia,
      nomina_dia_pago_1: parseInt(diaPago1),
      nomina_dia_pago_2: frecuencia === 'quincenal' ? parseInt(diaPago2) : null,
      nomina_descuento_porcentaje: parseFloat(descuento),
    }).eq('id', empresa.id)

    if (errorUpdate) { setError('Error al guardar: ' + errorUpdate.message); setGuardando(false); return }
    setGuardando(false)
    if (onActualizado) onActualizado()
    if (mostrarExito) mostrarExito('Configuración de nómina guardada')
  }

  const salarioEjemplo = 12000
  const descuentoDecimal = parseFloat(descuento) / 100
  const factor = 1 - descuentoDecimal
  const brutoEjemplo = factor > 0 ? salarioEjemplo / factor : 0
  const aporteEjemplo = brutoEjemplo - salarioEjemplo

  const radioBase = (activo) => ({
    display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '12px',
    borderRadius: '10px', cursor: 'pointer',
    background: 'var(--color-bg-input)',
    border: activo ? '2px solid #378ADD' : '1px solid var(--color-border-subtle)',
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>💰 Configuración de Nómina</h3>
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Define cómo y cuándo se paga a los empleados de tu empresa.</p>
      </div>

      {/* FRECUENCIA */}
      <Bloque sec={AZUL} esTropical={esTropical} titulo="📅 FRECUENCIA DE PAGO">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            { id: 'semanal', titulo: '📆 Semanal', desc: 'Un pago cada semana (52 pagos al año)' },
            { id: 'quincenal', titulo: '📅 Quincenal (recomendado)', desc: 'Dos pagos al mes (24 pagos al año)' },
            { id: 'mensual', titulo: '🗓️ Mensual', desc: 'Un pago al mes (12 pagos al año)' },
          ].map(f => (
            <label key={f.id} style={radioBase(frecuencia === f.id)}>
              <input type="radio" name="frecuencia" value={f.id} checked={frecuencia === f.id} onChange={(e) => setFrecuencia(e.target.value)} style={{ marginTop: '2px' }} />
              <div>
                <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '13px', margin: 0 }}>{f.titulo}</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{f.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </Bloque>

      {/* DÍAS DE PAGO */}
      <Bloque sec={VERDE} esTropical={esTropical} titulo="📆 DÍAS DE PAGO">
        {frecuencia === 'semanal' && (
          <div style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: 'var(--color-text-secondary)' }}>
            ℹ️ Para pagos semanales, podrás registrar el pago cualquier día de la semana desde el módulo de Nómina.
          </div>
        )}
        {frecuencia === 'mensual' && (
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Día del mes en que paga:</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input type="number" min="1" max="28" value={diaPago1} onChange={(e) => setDiaPago1(e.target.value)} style={{ ...inputStyle(), width: '90px', textAlign: 'center', fontWeight: 700, fontSize: '16px' }} />
              <span style={{ color: 'var(--color-text-secondary)' }}>del mes</span>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px' }}>💡 Recomendado: día 1, 5, 15 o 30</p>
          </div>
        )}
        {frecuencia === 'quincenal' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>1ra Quincena — Día de pago:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="number" min="1" max="28" value={diaPago1} onChange={(e) => setDiaPago1(e.target.value)} style={{ ...inputStyle(), width: '90px', textAlign: 'center', fontWeight: 700, fontSize: '16px' }} />
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>del mes (cubre días 1 al 15)</span>
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>2da Quincena — Día de pago:</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input type="number" min="1" max="31" value={diaPago2} onChange={(e) => setDiaPago2(e.target.value)} style={{ ...inputStyle(), width: '90px', textAlign: 'center', fontWeight: 700, fontSize: '16px' }} />
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '13px' }}>del mes (cubre días 16 al 30/31)</span>
              </div>
            </div>
            <div style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', padding: '12px', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              💡 Ejemplo común: día 15 y día 30. Si cae en domingo o feriado, puedes adelantar o atrasar el pago al ejecutarlo.
            </div>
          </div>
        )}
      </Bloque>

      {/* DESCUENTO */}
      <Bloque sec={MORADO} esTropical={esTropical} titulo="💼 DESCUENTO TSS + AFP">
        <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>Porcentaje de descuento al empleado:</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <input type="number" step="0.01" min="0" max="100" value={descuento} onChange={(e) => setDescuento(e.target.value)} style={{ ...inputStyle(), width: '120px', textAlign: 'center', fontWeight: 700, fontSize: '16px' }} />
          <span style={{ color: 'var(--color-text-secondary)' }}>%</span>
        </div>
        <div style={{ background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', padding: '12px', fontSize: '11px', color: 'var(--color-text-secondary)' }}>
          ℹ️ <strong>5.74% es el estándar en República Dominicana</strong>
          <ul style={{ margin: '8px 0 0', paddingLeft: '18px' }}>
            <li>2.87% para Seguridad Social (TSS)</li>
            <li>2.87% para Fondo de Pensiones (AFP)</li>
          </ul>
          <p style={{ margin: '8px 0 0' }}>Cambia este valor solo si tu empresa tiene un esquema diferente acordado con la DGT.</p>
        </div>
      </Bloque>

      {/* EJEMPLO */}
      <Bloque sec={AMBAR} esTropical={esTropical} titulo="💡 EJEMPLO DE CÁLCULO">
        <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '12px' }}>
          Si pagas a un empleado <strong>RD$ {salarioEjemplo.toLocaleString('es-DO')} netos</strong> por {frecuencia === 'semanal' ? 'semana' : frecuencia === 'quincenal' ? 'quincena' : 'mes'}:
        </p>
        <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', padding: '16px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', fontSize: '13px' }}>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>Salario neto</p>
              <p style={{ fontWeight: 700, color: '#1D9E75', margin: '2px 0 0' }}>RD$ {salarioEjemplo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>+ Aporte ({descuento}%)</p>
              <p style={{ fontWeight: 700, color: '#EF9F27', margin: '2px 0 0' }}>RD$ {aporteEjemplo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
            </div>
            <div>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>= Salario bruto</p>
              <p style={{ fontWeight: 700, color: '#378ADD', margin: '2px 0 0' }}>RD$ {brutoEjemplo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</p>
            </div>
          </div>
        </div>
        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '12px' }}>
          📊 La app calcula automáticamente el bruto a partir del neto que registras. El aporte TSS+AFP se reporta como costo del empleador.
        </p>
      </Bloque>

      {error && (
        <div style={{ background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.15)', border: '1px solid rgba(226, 75, 74, 0.3)', borderRadius: '8px', padding: '12px', fontSize: '13px', color: esTropical ? '#A32D2D' : '#F4C0D1' }}>
          ⚠️ {error}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px', borderTop: '1px solid var(--color-border-subtle)' }}>
        <button onClick={guardar} disabled={guardando} style={{ padding: '12px 24px', background: guardando ? 'var(--color-bg-card)' : 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 700, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {guardando ? '⏳ Guardando...' : '💾 Guardar configuración'}
        </button>
      </div>
    </div>
  )
}

function Bloque({ sec, esTropical, titulo, children }) {
  return (
    <div style={{
      background: esTropical ? sec.claro : `${sec.c}15`,
      border: `1px solid ${sec.c}${esTropical ? '50' : '40'}`,
      borderLeft: `4px solid ${sec.c}`,
      borderRadius: '12px', padding: '20px',
    }}>
      <p style={{ fontSize: '11px', color: esTropical ? sec.dark : sec.c, fontWeight: 600, letterSpacing: '0.5px', margin: '0 0 12px' }}>{titulo}</p>
      {children}
    </div>
  )
}

function inputStyle() {
  return {
    boxSizing: 'border-box', padding: '9px 12px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  }
}

export default SeccionNomina