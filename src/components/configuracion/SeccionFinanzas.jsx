import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const SEC = {
  azul:    { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' },
  naranja: { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' },
  verde:   { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' },
  morado:  { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' },
  rojo:    { c: '#E24B4A', claro: '#FCEBEB', dark: '#7A2120' },
  ambar:   { c: '#EAB308', claro: '#FEF9C3', dark: '#713F12' },
}

function SeccionFinanzas({ empresaId, mostrarExito }) {
  const [datos, setDatos] = useState({
    anticipo_porcentaje: 20, dias_pago_promedio: 90, costo_objetivo_racion: 35,
    margen_minimo_porcentaje: 25, frecuencia_pago_empleados: 'quincenal',
    usa_ecf: false, rnc_certificado_ecf: '', boton_emergencia_activo: false,
    telefono_emergencia_1: '', telefono_emergencia_2: '', contador_externo: false,
    contador_nombre: '', contador_iguala_mensual: '',
  })
  const [finanzasId, setFinanzasId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

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

  useEffect(() => { cargarFinanzas() }, [empresaId])

  async function cargarFinanzas() {
    setCargando(true)
    const { data } = await supabase.from('finanzas').select('*').eq('empresa_id', empresaId).maybeSingle()
    if (data) {
      setFinanzasId(data.id)
      setDatos({
        anticipo_porcentaje: data.anticipo_porcentaje || 20,
        dias_pago_promedio: data.dias_pago_promedio || 90,
        costo_objetivo_racion: data.costo_objetivo_racion || 35,
        margen_minimo_porcentaje: data.margen_minimo_porcentaje || 25,
        frecuencia_pago_empleados: data.frecuencia_pago_empleados || 'quincenal',
        usa_ecf: data.usa_ecf || false, rnc_certificado_ecf: data.rnc_certificado_ecf || '',
        boton_emergencia_activo: data.boton_emergencia_activo || false,
        telefono_emergencia_1: data.telefono_emergencia_1 || '',
        telefono_emergencia_2: data.telefono_emergencia_2 || '',
        contador_externo: data.contador_externo || false,
        contador_nombre: data.contador_nombre || '',
        contador_iguala_mensual: data.contador_iguala_mensual || '',
      })
    }
    setCargando(false)
  }

  function actualizarCampo(campo, valor) { setDatos({ ...datos, [campo]: valor }) }

  async function guardar() {
    setGuardando(true)
    let error
    if (finanzasId) {
      const result = await supabase.from('finanzas').update(datos).eq('id', finanzasId)
      error = result.error
    } else {
      const result = await supabase.from('finanzas').insert([{ ...datos, empresa_id: empresaId }])
      error = result.error
    }
    setGuardando(false)
    if (error) { alert('Error: ' + error.message); return }
    mostrarExito('Finanzas actualizadas')
    cargarFinanzas()
  }

  if (cargando) return <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>⏳ Cargando finanzas...</div>

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>💰 Finanzas</h3>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Configuración financiera y operativa</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <Bloque sec={SEC.azul} esTropical={esTropical} titulo="📋 INABIE">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle()}>Anticipo (%)</label>
              <input type="number" value={datos.anticipo_porcentaje} onChange={(e) => actualizarCampo('anticipo_porcentaje', parseFloat(e.target.value))} style={inputStyle()} />
            </div>
            <div>
              <label style={labelStyle()}>Días promedio de pago</label>
              <input type="number" value={datos.dias_pago_promedio} onChange={(e) => actualizarCampo('dias_pago_promedio', parseInt(e.target.value))} style={inputStyle()} />
            </div>
          </div>
        </Bloque>

        <Bloque sec={SEC.naranja} esTropical={esTropical} titulo="💵 Costos y márgenes">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={labelStyle()}>Costo objetivo por ración (RD$)</label>
              <input type="number" step="0.01" value={datos.costo_objetivo_racion} onChange={(e) => actualizarCampo('costo_objetivo_racion', parseFloat(e.target.value))} style={inputStyle()} />
            </div>
            <div>
              <label style={labelStyle()}>Margen mínimo (%)</label>
              <input type="number" value={datos.margen_minimo_porcentaje} onChange={(e) => actualizarCampo('margen_minimo_porcentaje', parseFloat(e.target.value))} style={inputStyle()} />
            </div>
          </div>
        </Bloque>

        <Bloque sec={SEC.verde} esTropical={esTropical} titulo="👥 Empleados">
          <label style={labelStyle()}>Frecuencia de pago</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            {['semanal', 'quincenal', 'mensual'].map(f => (
              <button key={f} onClick={() => actualizarCampo('frecuencia_pago_empleados', f)} style={{ ...selectorStyle(datos.frecuencia_pago_empleados === f, esTropical, SEC.verde.c), textTransform: 'capitalize' }}>
                {f}
              </button>
            ))}
          </div>
        </Bloque>

        <Bloque sec={SEC.morado} esTropical={esTropical} titulo="🧾 Facturación electrónica">
          <label style={checkLabelStyle()}>
            <input type="checkbox" checked={datos.usa_ecf} onChange={(e) => actualizarCampo('usa_ecf', e.target.checked)} style={{ width: '16px', height: '16px' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Usar e-CF (DGII)</span>
          </label>
          {datos.usa_ecf && (
            <input type="text" placeholder="RNC certificado e-CF" value={datos.rnc_certificado_ecf} onChange={(e) => actualizarCampo('rnc_certificado_ecf', e.target.value)} style={{ ...inputStyle(), marginTop: '12px' }} />
          )}
        </Bloque>

        <Bloque sec={SEC.rojo} esTropical={esTropical} titulo="🚨 Botón de emergencia">
          <label style={checkLabelStyle()}>
            <input type="checkbox" checked={datos.boton_emergencia_activo} onChange={(e) => actualizarCampo('boton_emergencia_activo', e.target.checked)} style={{ width: '16px', height: '16px' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Activar botón de emergencia</span>
          </label>
          {datos.boton_emergencia_activo && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <input type="text" placeholder="Teléfono 1" value={datos.telefono_emergencia_1} onChange={(e) => actualizarCampo('telefono_emergencia_1', e.target.value)} style={inputStyle()} />
              <input type="text" placeholder="Teléfono 2" value={datos.telefono_emergencia_2} onChange={(e) => actualizarCampo('telefono_emergencia_2', e.target.value)} style={inputStyle()} />
            </div>
          )}
        </Bloque>

        <Bloque sec={SEC.ambar} esTropical={esTropical} titulo="🧮 Contador externo">
          <label style={checkLabelStyle()}>
            <input type="checkbox" checked={datos.contador_externo} onChange={(e) => actualizarCampo('contador_externo', e.target.checked)} style={{ width: '16px', height: '16px' }} />
            <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Tengo contador externo</span>
          </label>
          {datos.contador_externo && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '12px' }}>
              <input type="text" placeholder="Nombre del contador" value={datos.contador_nombre} onChange={(e) => actualizarCampo('contador_nombre', e.target.value)} style={inputStyle()} />
              <input type="number" placeholder="Iguala mensual (RD$)" value={datos.contador_iguala_mensual} onChange={(e) => actualizarCampo('contador_iguala_mensual', e.target.value)} style={inputStyle()} />
            </div>
          )}
        </Bloque>

        <div style={{ paddingTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={guardar} disabled={guardando} style={{ padding: '12px 24px', background: guardando ? 'var(--color-bg-card)' : 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {guardando ? '⏳ Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
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
      borderRadius: '12px', padding: '16px',
    }}>
      <h4 style={{ fontSize: '14px', fontWeight: 600, color: esTropical ? sec.dark : sec.c, margin: '0 0 12px' }}>{titulo}</h4>
      {children}
    </div>
  )
}

function selectorStyle(activo, esTropical, color = '#378ADD') {
  return {
    padding: '8px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', color: 'var(--color-text-primary)',
    border: activo ? `2px solid ${color}` : '2px solid var(--color-border-subtle)',
    background: activo ? (esTropical ? '#D7F0DD' : `${color}25`) : 'var(--color-bg-input)',
  }
}

function checkLabelStyle() {
  return { display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }
}

function labelStyle() {
  return { display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  }
}

export default SeccionFinanzas