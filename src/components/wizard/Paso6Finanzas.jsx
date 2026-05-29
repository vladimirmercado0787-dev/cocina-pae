import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const NARANJA = { c: '#D85A30', claro: '#FCE9DA', dark: '#7A2F12' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }
const MORADO = { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' }
const ROJO = { c: '#E24B4A', claro: '#FCEBEB', dark: '#7A1F1E' }

function Paso6Finanzas({ empresaId }) {
  const [finanzasId, setFinanzasId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const [datos, setDatos] = useState({
    anticipo_porcentaje: '20.00', dias_pago_promedio: '78',
    costo_objetivo_racion: '35.00', margen_minimo_porcentaje: '25.00',
    frecuencia_pago_empleados: 'quincenal', usa_ecf: false,
    rnc_certificado_ecf: '', boton_emergencia_activo: true,
    telefono_emergencia_1: '', telefono_emergencia_2: '',
    contador_externo: false, contador_nombre: '', contador_iguala_mensual: ''
  })

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

  useEffect(() => { if (empresaId) cargarFinanzas() }, [empresaId])

  async function cargarFinanzas() {
    const { data, error } = await supabase.from('finanzas').select('*').eq('empresa_id', empresaId).single()
    if (data && !error) {
      setFinanzasId(data.id)
      setDatos({
        anticipo_porcentaje: data.anticipo_porcentaje?.toString() || '20.00',
        dias_pago_promedio: data.dias_pago_promedio?.toString() || '78',
        costo_objetivo_racion: data.costo_objetivo_racion?.toString() || '35.00',
        margen_minimo_porcentaje: data.margen_minimo_porcentaje?.toString() || '25.00',
        frecuencia_pago_empleados: data.frecuencia_pago_empleados || 'quincenal',
        usa_ecf: data.usa_ecf || false,
        rnc_certificado_ecf: data.rnc_certificado_ecf || '',
        boton_emergencia_activo: data.boton_emergencia_activo ?? true,
        telefono_emergencia_1: data.telefono_emergencia_1 || '',
        telefono_emergencia_2: data.telefono_emergencia_2 || '',
        contador_externo: data.contador_externo || false,
        contador_nombre: data.contador_nombre || '',
        contador_iguala_mensual: data.contador_iguala_mensual?.toString() || ''
      })
    }
  }

  function actualizarCampo(campo, valor) { setDatos({ ...datos, [campo]: valor }) }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)
    try {
      const datosParaGuardar = {
        empresa_id: empresaId,
        anticipo_porcentaje: parseFloat(datos.anticipo_porcentaje) || 20.00,
        dias_pago_promedio: parseInt(datos.dias_pago_promedio) || 78,
        costo_objetivo_racion: parseFloat(datos.costo_objetivo_racion) || 35.00,
        margen_minimo_porcentaje: parseFloat(datos.margen_minimo_porcentaje) || 25.00,
        frecuencia_pago_empleados: datos.frecuencia_pago_empleados,
        usa_ecf: datos.usa_ecf, rnc_certificado_ecf: datos.rnc_certificado_ecf || null,
        boton_emergencia_activo: datos.boton_emergencia_activo,
        telefono_emergencia_1: datos.telefono_emergencia_1 || null,
        telefono_emergencia_2: datos.telefono_emergencia_2 || null,
        contador_externo: datos.contador_externo,
        contador_nombre: datos.contador_nombre || null,
        contador_iguala_mensual: datos.contador_iguala_mensual ? parseFloat(datos.contador_iguala_mensual) : null,
        updated_at: new Date().toISOString()
      }
      let error
      if (finanzasId) {
        const result = await supabase.from('finanzas').update(datosParaGuardar).eq('id', finanzasId)
        error = result.error
      } else {
        const result = await supabase.from('finanzas').insert([datosParaGuardar]).select()
        error = result.error
        if (result.data && result.data[0]) setFinanzasId(result.data[0].id)
      }
      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + error.message })
      } else {
        setMensaje({ tipo: 'exito', texto: '✅ Configuración financiera guardada' })
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + err.message })
    } finally { setGuardando(false) }
  }

  if (!empresaId) {
    return (
      <div style={alertaTopStyle(AMBAR, esTropical)}>
        <p style={{ color: esTropical ? AMBAR.dark : '#FAC775', margin: 0 }}>Primero registra tu cocina en el Paso 1</p>
      </div>
    )
  }

  return (
    <div style={tarjetaStyle()}>

      <div style={{ marginBottom: '24px' }}>
        <p style={{ fontSize: '11px', color: NARANJA.c, fontWeight: 700, letterSpacing: '1px', marginBottom: '4px' }}>
          PASO 6 DE 6 · ESTIMADO 5 MIN · ÚLTIMO PASO
        </p>
        <h2 style={{ fontSize: '28px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
          💰 Finanzas
        </h2>
        <p style={{ color: 'var(--color-text-secondary)', margin: 0 }}>
          Configuración financiera y de pagos
        </p>
      </div>

      <form onSubmit={guardar} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* PAGOS INABIE */}
        <div style={bloqueColorStyle(AZUL, esTropical)}>
          <h3 style={tituloBloqueStyle(AZUL, esTropical)}>🏛️ PAGOS DE INABIE</h3>
          <p style={{ fontSize: '11px', color: esTropical ? AZUL.dark : '#A9CFF2', margin: '0 0 14px' }}>
            INABIE paga un anticipo y luego salda en bloques cada 2-3 facturas
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Campo label="Anticipo INABIE (%)">
              <input type="number" step="0.01" value={datos.anticipo_porcentaje}
                onChange={(e) => actualizarCampo('anticipo_porcentaje', e.target.value)} style={inputStyle()} />
              <p style={textoAyudaStyle()}>Típico: 20%</p>
            </Campo>
            <Campo label="Días promedio de pago">
              <input type="number" value={datos.dias_pago_promedio}
                onChange={(e) => actualizarCampo('dias_pago_promedio', e.target.value)} style={inputStyle()} />
              <p style={textoAyudaStyle()}>Típico: 78 días</p>
            </Campo>
          </div>
        </div>

        {/* COSTOS */}
        <div style={bloqueColorStyle(VERDE, esTropical)}>
          <h3 style={tituloBloqueStyle(VERDE, esTropical)}>📊 COSTOS Y MÁRGENES</h3>
          <p style={{ fontSize: '11px', color: esTropical ? VERDE.dark : '#A8E0BD', margin: '0 0 14px' }}>
            La app te alertará si el margen baja del mínimo
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Campo label="Costo objetivo por ración (RD$)">
              <input type="number" step="0.01" value={datos.costo_objetivo_racion}
                onChange={(e) => actualizarCampo('costo_objetivo_racion', e.target.value)} style={inputStyle()} />
              <p style={textoAyudaStyle()}>Lo que debe costar producir</p>
            </Campo>
            <Campo label="Margen mínimo (%)">
              <input type="number" step="0.01" value={datos.margen_minimo_porcentaje}
                onChange={(e) => actualizarCampo('margen_minimo_porcentaje', e.target.value)} style={inputStyle()} />
              <p style={textoAyudaStyle()}>Alerta si baja de aquí</p>
            </Campo>
          </div>
        </div>

        {/* PAGO EMPLEADOS */}
        <div>
          <h3 style={{ fontSize: '15px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '0 0 12px' }}>
            👥 Pago de empleados
          </h3>
          <label style={labelStyle()}>FRECUENCIA DE PAGO</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
            <BotonFrecuencia activa={datos.frecuencia_pago_empleados === 'semanal'} onClick={() => actualizarCampo('frecuencia_pago_empleados', 'semanal')} color={AZUL} esTropical={esTropical} titulo="Semanal" sub="Cada viernes" />
            <BotonFrecuencia activa={datos.frecuencia_pago_empleados === 'quincenal'} onClick={() => actualizarCampo('frecuencia_pago_empleados', 'quincenal')} color={AZUL} esTropical={esTropical} titulo="Quincenal" sub="Cada 15 días" />
            <BotonFrecuencia activa={datos.frecuencia_pago_empleados === 'mensual'} onClick={() => actualizarCampo('frecuencia_pago_empleados', 'mensual')} color={AZUL} esTropical={esTropical} titulo="Mensual" sub="Fin de mes" />
          </div>
        </div>

        {/* E-CF */}
        <div style={bloqueColorStyle(MORADO, esTropical)}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={datos.usa_ecf}
              onChange={(e) => actualizarCampo('usa_ecf', e.target.checked)}
              style={{ marginTop: '2px', width: '18px', height: '18px', accentColor: MORADO.c }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: esTropical ? MORADO.dark : '#AFA9EC', margin: 0 }}>🧾 Tengo factura electrónica e-CF activa</p>
              <p style={{ fontSize: '11px', color: esTropical ? MORADO.dark : '#AFA9EC', opacity: 0.85, margin: '4px 0 0' }}>
                Si tienes certificación de DGII para emitir e-CF
              </p>
            </div>
          </label>
          {datos.usa_ecf && (
            <div style={{ marginTop: '14px' }}>
              <Campo label="Número de certificado e-CF">
                <input type="text" value={datos.rnc_certificado_ecf}
                  onChange={(e) => actualizarCampo('rnc_certificado_ecf', e.target.value)}
                  placeholder="Ej: E310000001" style={inputStyle()} />
              </Campo>
            </div>
          )}
        </div>

        {/* EMERGENCIA */}
        <div style={bloqueColorStyle(ROJO, esTropical)}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', marginBottom: '0' }}>
            <input type="checkbox" checked={datos.boton_emergencia_activo}
              onChange={(e) => actualizarCampo('boton_emergencia_activo', e.target.checked)}
              style={{ marginTop: '2px', width: '18px', height: '18px', accentColor: ROJO.c }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: esTropical ? ROJO.dark : '#F4C0D1', margin: 0 }}>🚨 Botón de emergencia activo</p>
              <p style={{ fontSize: '11px', color: esTropical ? ROJO.dark : '#F4C0D1', opacity: 0.85, margin: '4px 0 0' }}>
                Mantener presionado 3 segundos para llamar a los contactos
              </p>
            </div>
          </label>
          {datos.boton_emergencia_activo && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
              <Campo label="Teléfono 1">
                <input type="tel" value={datos.telefono_emergencia_1}
                  onChange={(e) => actualizarCampo('telefono_emergencia_1', e.target.value)}
                  placeholder="809-555-0000" style={inputStyle()} />
              </Campo>
              <Campo label="Teléfono 2">
                <input type="tel" value={datos.telefono_emergencia_2}
                  onChange={(e) => actualizarCampo('telefono_emergencia_2', e.target.value)}
                  placeholder="809-555-0000" style={inputStyle()} />
              </Campo>
            </div>
          )}
        </div>

        {/* CONTADOR */}
        <div style={bloqueColorStyle(AMBAR, esTropical)}>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
            <input type="checkbox" checked={datos.contador_externo}
              onChange={(e) => actualizarCampo('contador_externo', e.target.checked)}
              style={{ marginTop: '2px', width: '18px', height: '18px', accentColor: AMBAR.c }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontWeight: 700, color: esTropical ? AMBAR.dark : '#FAC775', margin: 0 }}>🧮 Tengo contador externo</p>
              <p style={{ fontSize: '11px', color: esTropical ? AMBAR.dark : '#FAC775', opacity: 0.85, margin: '4px 0 0' }}>
                Lic. que maneja TSS, ITBIS y declaraciones DGII
              </p>
            </div>
          </label>
          {datos.contador_externo && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '14px' }}>
              <Campo label="Nombre del contador">
                <input type="text" value={datos.contador_nombre}
                  onChange={(e) => actualizarCampo('contador_nombre', e.target.value)}
                  placeholder="Lic. Pérez" style={inputStyle()} />
              </Campo>
              <Campo label="Iguala mensual (RD$)">
                <input type="number" step="0.01" value={datos.contador_iguala_mensual}
                  onChange={(e) => actualizarCampo('contador_iguala_mensual', e.target.value)}
                  placeholder="5000" style={inputStyle()} />
              </Campo>
            </div>
          )}
        </div>

        {mensaje && <Mensaje mensaje={mensaje} esTropical={esTropical} />}

        <button type="submit" disabled={guardando}
          style={{
            width: '100%', padding: '16px 24px',
            background: 'linear-gradient(135deg, #D85A30 0%, #B53D1A 100%)',
            border: 'none', borderRadius: '12px', color: 'white', fontSize: '16px', fontWeight: 700,
            cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            opacity: guardando ? 0.6 : 1,
          }}>
          {guardando ? 'Guardando...' : '💾 Guardar configuración'}
        </button>
      </form>
    </div>
  )
}

function Campo({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '6px' }}>
        {label}
      </label>
      {children}
    </div>
  )
}

function BotonFrecuencia({ activa, onClick, color, esTropical, titulo, sub }) {
  return (
    <button type="button" onClick={onClick}
      style={{
        padding: '12px', textAlign: 'center', borderRadius: '10px',
        border: `2px solid ${activa ? color.c : 'var(--color-border-subtle)'}`,
        background: activa ? (esTropical ? color.claro : `${color.c}15`) : 'var(--color-bg-elevated)',
        cursor: 'pointer', fontFamily: 'inherit',
      }}>
      <p style={{ fontWeight: 700, fontSize: '13px', color: 'var(--color-text-primary)', margin: 0 }}>{titulo}</p>
      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>{sub}</p>
    </button>
  )
}

function Mensaje({ mensaje, esTropical }) {
  const colorBase = mensaje.tipo === 'exito' ? '#1D9E75' : '#E24B4A'
  return (
    <div style={{
      background: esTropical 
        ? (mensaje.tipo === 'exito' ? '#D7F0DD' : '#FCEBEB') 
        : `${colorBase}15`,
      border: `1px solid ${colorBase}40`, borderRadius: '8px', padding: '12px',
      color: esTropical ? (mensaje.tipo === 'exito' ? '#04342C' : '#A32D2D') : (mensaje.tipo === 'exito' ? '#A8E0BD' : '#F4C0D1'),
      fontSize: '13px',
    }}>
      {mensaje.texto}
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

function alertaTopStyle(color, esTropical) {
  return {
    background: esTropical ? color.claro : `${color.c}15`,
    border: `1px solid ${color.c}40`, borderRadius: '16px',
    padding: '32px', maxWidth: '760px', width: '100%',
  }
}

function bloqueColorStyle(color, esTropical) {
  return {
    background: esTropical ? color.claro : `${color.c}12`,
    border: `1px solid ${color.c}40`, borderRadius: '12px', padding: '18px',
  }
}

function tituloBloqueStyle(color, esTropical) {
  return { fontSize: '13px', fontWeight: 700, color: esTropical ? color.dark : color.c, margin: '0 0 8px' }
}

function labelStyle() {
  return { display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.5px', marginBottom: '8px' }
}

function textoAyudaStyle() {
  return { fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '10px 14px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '14px',
    fontFamily: 'inherit', outline: 'none',
  }
}

export default Paso6Finanzas