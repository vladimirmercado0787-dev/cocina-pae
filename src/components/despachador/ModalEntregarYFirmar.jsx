import { useState, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import SignatureCanvas from 'react-signature-canvas'
import { useEffect } from 'react'

const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }

function ModalEntregarYFirmar({ operacion, escuela, recetaHoy, empresa, usuario, onCerrar, onGuardado }) {
  const [nombreFirmante, setNombreFirmante] = useState(escuela?.director_nombre || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [firmaCapturada, setFirmaCapturada] = useState(false)
  const sigCanvasRef = useRef(null)

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

  const fechaHoy = new Date()
  const horaFormateada = fechaHoy.toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
  const numeroConduce = `${fechaHoy.getFullYear()}${String(fechaHoy.getMonth() + 1).padStart(2, '0')}${String(fechaHoy.getDate()).padStart(2, '0')}-${String(operacion?.id || '0000').slice(0, 4)}`
  const raciones = operacion?.raciones_planificadas || escuela?.raciones_contractuales || 0

  function borrarFirma() {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear()
      setFirmaCapturada(false)
    }
  }

  function onFirmar() { setFirmaCapturada(true) }

  async function confirmarEntrega() {
    setError('')
    if (!nombreFirmante.trim()) { setError('Ingresa el nombre de quien firma'); return }
    if (sigCanvasRef.current?.isEmpty()) { setError('Por favor solicita al director que firme antes de confirmar'); return }
    setGuardando(true)
    const firmaBase64 = sigCanvasRef.current.toDataURL('image/png')
    const ahora = new Date().toISOString()
    const { error: errSupa } = await supabase.from('operaciones_dia').update({
      estado: 'entregada', director_firma: true, firma_imagen: firmaBase64,
      firmado_por_nombre: nombreFirmante.trim().toUpperCase(),
      firmado_en: ahora, entregado_por: usuario.id,
      hora_entrega: ahora, updated_at: ahora,
    }).eq('id', operacion.id)
    if (errSupa) {
      console.error('Error al guardar:', errSupa)
      setError('Error al guardar: ' + errSupa.message)
      setGuardando(false)
      return
    }
    setGuardando(false)
    onGuardado()
    onCerrar()
  }

  return (
    <div style={overlayStyle()}>
      <div style={{ ...modalBoxStyle(), maxWidth: '640px', maxHeight: '95vh', display: 'flex', flexDirection: 'column' }}>
        
        {/* HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
          borderRadius: '16px 16px 0 0', padding: '16px 24px', color: 'white',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', opacity: 0.8, margin: 0 }}>CONDUCE DE ENTREGA</p>
              <h2 style={{ fontSize: '20px', fontWeight: 700, margin: '4px 0 0' }}>📝 Confirmar entrega</h2>
            </div>
            <button onClick={onCerrar} disabled={guardando} style={btnCerrar()}>✕</button>
          </div>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* MINI CONDUCE — SIN PRECIO NI SUBTOTAL */}
          <div style={{
            background: esTropical ? AZUL.claro : `${AZUL.c}12`,
            border: `2px solid ${AZUL.c}40`, borderRadius: '14px', padding: '18px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <div>
                <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '17px', margin: 0 }}>{empresa?.nombre || 'Empresa'}</p>
                {empresa?.rnc && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>RNC: {empresa.rnc}</p>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px', margin: 0 }}>CONDUCE</p>
                <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontFamily: 'monospace', fontSize: '13px', margin: '2px 0 0' }}>Nº {numeroConduce}</p>
              </div>
            </div>

            <div style={{ borderTop: `1px solid ${AZUL.c}30`, paddingTop: '12px', marginTop: '12px' }}>
              <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '4px' }}>ENTREGADO A:</p>
              <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{escuela?.nombre}</p>
              {escuela?.direccion && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>📍 {escuela.direccion}</p>}
              {escuela?.director_nombre && <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>👤 Director: {escuela.director_nombre}</p>}
            </div>

            <div style={{ borderTop: `1px solid ${AZUL.c}30`, paddingTop: '12px', marginTop: '12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', textAlign: 'center' }}>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', margin: 0 }}>FECHA</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '2px 0 0' }}>{fechaHoy.toLocaleDateString('es-DO')}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', margin: 0 }}>HORA</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '2px 0 0' }}>{horaFormateada}</p>
              </div>
              <div>
                <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', margin: 0 }}>RACIONES</p>
                <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', margin: '2px 0 0' }}>{raciones}</p>
              </div>
            </div>

            {recetaHoy && (
              <div style={{ borderTop: `1px solid ${AZUL.c}30`, paddingTop: '12px', marginTop: '12px' }}>
                <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginBottom: '4px' }}>MENÚ DEL DÍA:</p>
                <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>{recetaHoy.emoji} {recetaHoy.nombre}</p>
              </div>
            )}

            {/* 🎯 BLOQUE DE RACIONES TOTAL (sin precio) */}
            <div style={{
              borderTop: `2px solid ${AZUL.c}40`, marginTop: '12px',
              background: 'var(--color-bg-elevated)',
              marginLeft: '-18px', marginRight: '-18px', marginBottom: '-18px',
              padding: '14px 18px', borderRadius: '0 0 14px 14px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', margin: 0 }}>
                  TOTAL RACIONES ENTREGADAS:
                </p>
                <p style={{ fontSize: '24px', fontWeight: 700, color: VERDE.c, margin: 0 }}>
                  {raciones.toLocaleString('es-DO')}
                </p>
              </div>
            </div>
          </div>

          {/* INSTRUCCIONES */}
          <div style={{
            background: esTropical ? '#FFF8E6' : 'rgba(239, 159, 39, 0.12)',
            border: '1px solid rgba(239, 159, 39, 0.35)', borderRadius: '10px',
            padding: '12px', fontSize: '13px', color: esTropical ? AMBAR.dark : '#FAC775',
          }}>
            👇 <strong>Por favor solicita al director(a) que firme abajo:</strong>
          </div>

          {/* NOMBRE */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              Nombre de quien firma <span style={{ color: '#E24B4A' }}>*</span>
            </label>
            <input type="text" value={nombreFirmante}
              onChange={(e) => { setNombreFirmante(e.target.value); if (error) setError('') }}
              placeholder="Ej: Juan Espinal" disabled={guardando}
              style={{ ...inputStyle(), padding: '12px 16px', fontSize: '15px', border: '2px solid var(--color-border-subtle)' }} />
          </div>

          {/* CANVAS DE FIRMA */}
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)', marginBottom: '8px' }}>
              Firma <span style={{ color: '#E24B4A' }}>*</span>
            </label>
            <div style={{
              border: '2px dashed var(--color-border-accent)',
              borderRadius: '10px', background: '#FFFFFF', position: 'relative', overflow: 'hidden',
            }}>
              <SignatureCanvas ref={sigCanvasRef} penColor="#000000"
                canvasProps={{ className: 'w-full h-48 rounded-lg', style: { width: '100%', height: '192px', touchAction: 'none', background: 'white' } }}
                onEnd={onFirmar} />
              {!firmaCapturada && (
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  pointerEvents: 'none',
                }}>
                  <p style={{ color: '#CBD5E1', fontSize: '13px', fontStyle: 'italic', margin: 0 }}>
                    Firma aquí con el dedo o mouse...
                  </p>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
              <button onClick={borrarFirma} disabled={guardando}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', fontSize: '12px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                🗑️ Borrar y volver a firmar
              </button>
              {firmaCapturada && (
                <p style={{ fontSize: '11px', color: VERDE.c, fontWeight: 600, margin: 0 }}>✓ Firma capturada</p>
              )}
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div style={alertaStyle('#E24B4A', esTropical)}>
              <p style={{ fontSize: '13px', margin: 0 }}>⚠️ {error}</p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          background: 'var(--color-bg-card)', borderTop: '1px solid var(--color-border-subtle)',
          borderRadius: '0 0 16px 16px', padding: '16px 24px',
          display: 'flex', gap: '12px',
        }}>
          <button onClick={onCerrar} disabled={guardando} style={{ ...btnCancelar(), flex: 1 }}>Cancelar</button>
          <button onClick={confirmarEntrega} disabled={guardando}
            style={{
              flex: 1, padding: '14px 20px',
              background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
              border: 'none', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: 700,
              cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
              opacity: guardando ? 0.6 : 1,
            }}>
            {guardando ? <>⏳ Guardando...</> : <>✅ Confirmar entrega</>}
          </button>
        </div>
      </div>
    </div>
  )
}

function overlayStyle() {
  return {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
  }
}

function modalBoxStyle() {
  return {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '16px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
    overflow: 'hidden',
  }
}

function btnCerrar() {
  return { background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)', fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '4px 8px' }
}

function btnCancelar() {
  return {
    padding: '14px 20px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '12px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '10px 14px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  }
}

function alertaStyle(color, esTropical) {
  return {
    background: esTropical ? '#FCEBEB' : `${color}15`,
    border: `1px solid ${color}40`, borderRadius: '8px',
    padding: '12px', color: esTropical ? '#A32D2D' : '#F4C0D1',
  }
}

export default ModalEntregarYFirmar