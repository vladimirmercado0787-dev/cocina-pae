import { useState, useEffect, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { supabase } from '../../supabaseClient'

const SEC = {
  morado: { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' },
  verde:  { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' },
  ambar:  { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' },
}

function SeccionPropietario({ empresa, onActualizado, mostrarExito }) {
  const [datos, setDatos] = useState({
    nombre_propietario: '', cedula_propietario: '', direccion_propietario: '',
    direccion_propietario_misma: true, firma_propietario_url: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [modalFirma, setModalFirma] = useState(false)
  const [guardandoFirma, setGuardandoFirma] = useState(false)
  const firmaRef = useRef(null)

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
      setDatos({
        nombre_propietario: empresa.nombre_propietario || '',
        cedula_propietario: empresa.cedula_propietario || '',
        direccion_propietario: empresa.direccion_propietario || '',
        direccion_propietario_misma: empresa.direccion_propietario_misma ?? true,
        firma_propietario_url: empresa.firma_propietario_url || '',
      })
    }
  }, [empresa])

  function actualizarCampo(campo, valor) { setDatos({ ...datos, [campo]: valor }) }

  function formatearCedula(valor) {
    const limpio = valor.replace(/\D/g, '').slice(0, 11)
    if (limpio.length <= 3) return limpio
    if (limpio.length <= 10) return `${limpio.slice(0, 3)}-${limpio.slice(3)}`
    return `${limpio.slice(0, 3)}-${limpio.slice(3, 10)}-${limpio.slice(10)}`
  }

  function validarCedula(cedula) { return cedula.replace(/\D/g, '').length === 11 }

  async function guardarFirma() {
    if (firmaRef.current.isEmpty()) { alert('Por favor dibuja tu firma antes de guardar'); return }
    setGuardandoFirma(true)
    try {
      const firmaBase64 = firmaRef.current.toDataURL('image/png')
      const { error } = await supabase.from('empresas').update({ firma_propietario_url: firmaBase64 }).eq('id', empresa.id)
      if (error) throw error
      setDatos({ ...datos, firma_propietario_url: firmaBase64 })
      setModalFirma(false)
      mostrarExito('Firma guardada exitosamente')
      if (onActualizado) onActualizado()
    } catch (error) {
      alert('Error guardando firma: ' + error.message)
    } finally {
      setGuardandoFirma(false)
    }
  }

  async function eliminarFirma() {
    if (!confirm('¿Estás seguro de eliminar tu firma?')) return
    const { error } = await supabase.from('empresas').update({ firma_propietario_url: null }).eq('id', empresa.id)
    if (error) { alert('Error: ' + error.message); return }
    setDatos({ ...datos, firma_propietario_url: '' })
    mostrarExito('Firma eliminada')
    if (onActualizado) onActualizado()
  }

  async function guardar() {
    if (!datos.nombre_propietario.trim()) { alert('El nombre del propietario es obligatorio'); return }
    if (!datos.cedula_propietario.trim()) { alert('La cédula del propietario es obligatoria'); return }
    if (!validarCedula(datos.cedula_propietario)) { alert('La cédula debe tener 11 dígitos (formato XXX-XXXXXXX-X)'); return }
    if (!datos.direccion_propietario_misma && !datos.direccion_propietario.trim()) {
      alert('Ingresa la dirección personal o marca "usar misma dirección"'); return
    }
    setGuardando(true)
    const datosGuardar = {
      nombre_propietario: datos.nombre_propietario.trim(),
      cedula_propietario: datos.cedula_propietario.trim(),
      direccion_propietario_misma: datos.direccion_propietario_misma,
      direccion_propietario: datos.direccion_propietario_misma ? null : datos.direccion_propietario.trim(),
    }
    const { error } = await supabase.from('empresas').update(datosGuardar).eq('id', empresa.id)
    setGuardando(false)
    if (error) { alert('Error guardando: ' + error.message); return }
    mostrarExito('Datos del propietario actualizados')
    if (onActualizado) onActualizado()
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>👤 Datos del Propietario</h3>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
          Información personal para contratos y documentos legales
        </p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        <div style={bloqueStyle(SEC.morado, esTropical)}>
          <h4 style={tituloBloque(SEC.morado, esTropical)}>📋 IDENTIFICACIÓN PERSONAL</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <label style={labelStyle()}>NOMBRE COMPLETO DEL PROPIETARIO *</label>
              <input type="text" value={datos.nombre_propietario} onChange={(e) => actualizarCampo('nombre_propietario', e.target.value)} style={inputStyle()} placeholder="Ej: Elba Baudilia Rodríguez" />
            </div>
            <div>
              <label style={labelStyle()}>CÉDULA DE IDENTIDAD Y ELECTORAL *</label>
              <input type="text" value={datos.cedula_propietario} onChange={(e) => actualizarCampo('cedula_propietario', formatearCedula(e.target.value))} style={inputStyle()} placeholder="040-1234567-8" maxLength={13} />
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Formato: XXX-XXXXXXX-X (11 dígitos)</p>
            </div>
          </div>
        </div>

        <div style={bloqueStyle(SEC.verde, esTropical)}>
          <h4 style={tituloBloque(SEC.verde, esTropical)}>📍 DIRECCIÓN PERSONAL</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer' }}>
              <input type="checkbox" checked={datos.direccion_propietario_misma} onChange={(e) => actualizarCampo('direccion_propietario_misma', e.target.checked)} style={{ marginTop: '2px', width: '18px', height: '18px' }} />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>Usar la misma dirección de la cocina</div>
                {datos.direccion_propietario_misma && empresa?.direccion && (
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>📍 {empresa.direccion}</div>
                )}
              </div>
            </label>
            {!datos.direccion_propietario_misma && (
              <div>
                <label style={labelStyle()}>DIRECCIÓN PERSONAL DEL PROPIETARIO</label>
                <input type="text" value={datos.direccion_propietario} onChange={(e) => actualizarCampo('direccion_propietario', e.target.value)} style={inputStyle()} placeholder="Calle, sector, municipio, provincia" />
              </div>
            )}
          </div>
        </div>

        <div style={bloqueStyle(SEC.ambar, esTropical)}>
          <h4 style={tituloBloque(SEC.ambar, esTropical)}>✍️ FIRMA DIGITAL DEL PROPIETARIO</h4>
          {datos.firma_propietario_url ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: '#FFFFFF', border: `2px dashed ${SEC.ambar.c}60`, borderRadius: '12px', padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={datos.firma_propietario_url} alt="Firma del propietario" style={{ maxHeight: '160px', maxWidth: '100%' }} />
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                ✅ Esta firma se usará automáticamente en conduces, contratos y documentos legales.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setModalFirma(true)} style={{ padding: '8px 16px', background: `linear-gradient(135deg, ${SEC.ambar.c} 0%, ${SEC.ambar.dark} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🔄 Cambiar firma
                </button>
                <button onClick={eliminarFirma} style={{ padding: '8px 16px', background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.15)', border: '1px solid rgba(226, 75, 74, 0.3)', borderRadius: '10px', color: esTropical ? '#A32D2D' : '#F4C0D1', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ background: esTropical ? '#FFFFFF' : 'var(--color-bg-card)', border: `2px dashed ${SEC.ambar.c}60`, borderRadius: '12px', padding: '32px', textAlign: 'center' }}>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', marginBottom: '12px' }}>Aún no has capturado tu firma</p>
                <button onClick={() => setModalFirma(true)} style={{ padding: '12px 24px', background: `linear-gradient(135deg, ${SEC.ambar.c} 0%, ${SEC.ambar.dark} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  ✍️ Capturar firma
                </button>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                💡 Tu firma se usará automáticamente para firmar conduces, contratos y otros documentos legales.
              </p>
            </div>
          )}
        </div>

        <div style={{ paddingTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={guardar} disabled={guardando} style={{ padding: '12px 24px', background: guardando ? 'var(--color-bg-card)' : `linear-gradient(135deg, ${SEC.morado.c} 0%, ${SEC.morado.dark} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {guardando ? '⏳ Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>
      </div>

      {modalFirma && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: '20px' }}>
          <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-accent)', borderRadius: '16px', maxWidth: '640px', width: '100%', padding: '24px' }}>
            <div style={{ marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>✍️ Capturar firma del propietario</h3>
              <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                Firma con el mouse, dedo (touch) o lápiz óptico en el área de abajo
              </p>
            </div>
            <div style={{ background: '#F8F9FA', border: '2px dashed #CCC', borderRadius: '12px', overflow: 'hidden', marginBottom: '16px' }}>
              <SignatureCanvas ref={firmaRef} canvasProps={{ width: 600, height: 250, style: { width: '100%', background: 'white' } }} penColor="#1e40af" />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <button onClick={() => firmaRef.current.clear()} style={{ padding: '10px 16px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                🗑️ Limpiar
              </button>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button onClick={() => setModalFirma(false)} disabled={guardandoFirma} style={{ padding: '10px 16px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Cancelar
                </button>
                <button onClick={guardarFirma} disabled={guardandoFirma} style={{ padding: '10px 16px', background: guardandoFirma ? 'var(--color-bg-card)' : `linear-gradient(135deg, ${SEC.ambar.c} 0%, ${SEC.ambar.dark} 100%)`, border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: guardandoFirma ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {guardandoFirma ? '⏳ Guardando...' : '💾 Guardar firma'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function bloqueStyle(sec, esTropical) {
  return {
    background: esTropical ? sec.claro : `${sec.c}15`,
    border: `1px solid ${sec.c}${esTropical ? '50' : '40'}`,
    borderLeft: `4px solid ${sec.c}`,
    borderRadius: '14px', padding: '20px',
  }
}

function tituloBloque(sec, esTropical) {
  return { fontSize: '13px', fontWeight: 600, color: esTropical ? sec.dark : sec.c, margin: '0 0 16px', letterSpacing: '0.5px' }
}

function labelStyle() {
  return { display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '11px 14px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  }
}

export default SeccionPropietario