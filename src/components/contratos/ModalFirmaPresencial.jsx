import { useState, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { supabase } from '../../supabaseClient'
import { useEffect } from 'react'

function ModalFirmaPresencial({
  contrato, empresa, usuarioActual,
  onCerrar, onFirmasCompletas
}) {
  const [firmaPropietario, setFirmaPropietario] = useState(contrato.firma_propietario_base64 || empresa?.firma_propietario_url || '')
  const [firmaEmpleado, setFirmaEmpleado] = useState(contrato.firma_empleado_base64 || '')
  const [modoCapturaPropietario, setModoCapturaPropietario] = useState(false)
  const [modoCapturaEmpleado, setModoCapturaEmpleado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const firmaPropietarioRef = useRef(null)
  const firmaEmpleadoRef = useRef(null)

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const empleado = contrato.usuario
  const tieneFirmaPropietarioGuardada = !!empresa?.firma_propietario_url
  const ambasFirmas = firmaPropietario && firmaEmpleado

  function capturarFirmaPropietario() {
    if (!firmaPropietarioRef.current || firmaPropietarioRef.current.isEmpty()) {
      alert('Por favor dibuja la firma del empleador antes de guardar'); return
    }
    const firma = firmaPropietarioRef.current.toDataURL('image/png')
    setFirmaPropietario(firma)
    setModoCapturaPropietario(false)
  }

  function capturarFirmaEmpleado() {
    if (!firmaEmpleadoRef.current || firmaEmpleadoRef.current.isEmpty()) {
      alert('Por favor dibuja la firma del empleado antes de guardar'); return
    }
    const firma = firmaEmpleadoRef.current.toDataURL('image/png')
    setFirmaEmpleado(firma)
    setModoCapturaEmpleado(false)
  }

  function usarFirmaGuardada() {
    if (empresa?.firma_propietario_url) setFirmaPropietario(empresa.firma_propietario_url)
  }

  function limpiarFirmaPropietario() { if (firmaPropietarioRef.current) firmaPropietarioRef.current.clear() }
  function limpiarFirmaEmpleado() { if (firmaEmpleadoRef.current) firmaEmpleadoRef.current.clear() }

  function eliminarFirmaPropietario() {
    if (confirm('¿Eliminar la firma del empleador?')) {
      setFirmaPropietario(''); setModoCapturaPropietario(false)
    }
  }

  function eliminarFirmaEmpleado() {
    if (confirm('¿Eliminar la firma del empleado?')) {
      setFirmaEmpleado(''); setModoCapturaEmpleado(false)
    }
  }

  async function activarContrato() {
    if (!firmaPropietario) { setError('Falta la firma del empleador'); return }
    if (!firmaEmpleado) { setError('Falta la firma del empleado'); return }

    setGuardando(true); setError('')
    const ahora = new Date().toISOString()
    const datosActualizacion = {
      firma_propietario_base64: firmaPropietario,
      firma_propietario_at: ahora,
      firma_propietario_por_usuario_id: usuarioActual?.id || null,
      firma_empleado_base64: firmaEmpleado,
      firma_empleado_at: ahora,
      estado: 'activo',
    }

    const { error: errorUpdate } = await supabase
      .from('contratos_empleados').update(datosActualizacion).eq('id', contrato.id)

    if (errorUpdate) {
      console.error('Error activando contrato:', errorUpdate)
      setError('Error al guardar firmas: ' + errorUpdate.message)
      setGuardando(false); return
    }

    setGuardando(false)
    if (onFirmasCompletas) onFirmasCompletas()
  }

  async function guardarBorrador() {
    if (!firmaPropietario && !firmaEmpleado) {
      setError('Captura al menos una firma para guardar como borrador'); return
    }

    setGuardando(true); setError('')
    const ahora = new Date().toISOString()
    const datosActualizacion = { estado: 'pendiente_firma' }

    if (firmaPropietario) {
      datosActualizacion.firma_propietario_base64 = firmaPropietario
      datosActualizacion.firma_propietario_at = ahora
      datosActualizacion.firma_propietario_por_usuario_id = usuarioActual?.id || null
    }
    if (firmaEmpleado) {
      datosActualizacion.firma_empleado_base64 = firmaEmpleado
      datosActualizacion.firma_empleado_at = ahora
    }

    const { error: errorUpdate } = await supabase
      .from('contratos_empleados').update(datosActualizacion).eq('id', contrato.id)

    if (errorUpdate) { setError('Error al guardar: ' + errorUpdate.message); setGuardando(false); return }

    setGuardando(false)
    if (onFirmasCompletas) onFirmasCompletas()
  }

  function obtenerLabelFrecuencia(freq) {
    const mapa = { semanal: 'semanal', quincenal: 'quincenal', mensual: 'mensual' }
    return mapa[freq] || freq
  }

  function obtenerLabelTipo(tipo) {
    if (tipo === 'obra_servicio') return '📑 Obra/Servicio PAE'
    if (tipo === 'estacional') return '🌾 Estacional'
    if (tipo === 'indefinido') return '♾️ Indefinido'
    return tipo
  }

  // ─── ESTILOS ───
  const sectionTitleStyle = {
    fontSize: '11px', color: 'var(--color-text-muted)',
    letterSpacing: '1.5px', fontWeight: 600,
    marginBottom: '10px',
  }
  const cardFirmaStyle = (color) => ({
    background: 'var(--color-modulo-bg)',
    border: `1px solid rgba(${color}, 0.35)`,
    borderLeft: `4px solid rgb(${color})`,
    borderRadius: '14px', padding: '18px',
    boxShadow: 'var(--modulo-sombra)',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px', overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-accent)',
        borderRadius: '16px',
        maxWidth: '900px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '95vh', overflow: 'hidden',
      }}>

        {/* HEADER */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border-subtle)',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(239, 159, 39, 0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
            }}>✍️</div>
            <div>
              <div style={{ fontSize: '10px', color: '#EF9F27', letterSpacing: '1.5px', fontWeight: 600 }}>
                FIRMA PRESENCIAL DEL CONTRATO
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                Firmar contrato
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {empleado?.nombre || 'Empleado'} · {contrato.puesto}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '20px', padding: '3px', gap: '2px',
            }}>
              <button type="button" onClick={() => setTema('oscuro')} style={{
                background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
                border: 'none', borderRadius: '16px', padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
              }}>
                <span style={{ fontSize: '11px' }}>🌙</span>
                <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
              </button>
              <button type="button" onClick={() => setTema('tropical')} style={{
                background: tema === 'tropical' ? 'var(--gradient-toggle-active)' : 'transparent',
                border: 'none', borderRadius: '16px', padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
              }}>
                <span style={{ fontSize: '11px' }}>☀️</span>
                <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
              </button>
            </div>
            <button onClick={onCerrar} disabled={guardando} style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '20px', padding: '7px 14px',
              color: 'var(--color-text-secondary)', fontSize: '12px',
              cursor: guardando ? 'not-allowed' : 'pointer',
              opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
            }}>✖ Cerrar</button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* RESUMEN */}
          <div style={{
            background: 'rgba(127, 119, 221, 0.12)',
            border: '1px solid rgba(127, 119, 221, 0.35)',
            borderLeft: '4px solid #7F77DD',
            borderRadius: '12px', padding: '14px',
          }}>
            <div style={{ fontSize: '11px', color: '#7F77DD', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '10px' }}>
              📄 RESUMEN DEL CONTRATO
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', fontSize: '12px' }}>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Tipo:</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{obtenerLabelTipo(contrato.tipo_contrato)}</div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Salario:</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: '#1D9E75' }}>
                  RD$ {Number(contrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })} {obtenerLabelFrecuencia(contrato.frecuencia_pago)}
                </div>
              </div>
              <div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Inicio:</div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{contrato.fecha_inicio}</div>
              </div>
              {contrato.fecha_fin && (
                <div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Fin:</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{contrato.fecha_fin}</div>
                </div>
              )}
            </div>
          </div>

          {/* FIRMA DEL EMPLEADOR */}
          <div style={cardFirmaStyle('127, 119, 221')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👑 Firma del Empleador
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                  {empresa?.nombre_propietario || 'Propietario'}
                  {empresa?.cedula_propietario && ` · CC: ${empresa.cedula_propietario}`}
                </div>
              </div>
              {firmaPropietario && (
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '4px 12px',
                  background: 'rgba(29, 158, 117, 0.18)',
                  border: '1px solid rgba(29, 158, 117, 0.4)',
                  borderRadius: '14px', color: '#1D9E75',
                  letterSpacing: '0.5px',
                }}>✅ FIRMADO</span>
              )}
            </div>

            {/* CASO 1: Hay firma capturada */}
            {firmaPropietario && !modoCapturaPropietario && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  background: 'white',
                  border: '2px dashed rgba(127, 119, 221, 0.4)',
                  borderRadius: '12px', padding: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: '120px',
                }}>
                  <img src={firmaPropietario} alt="Firma del empleador"
                    style={{ maxHeight: '110px', maxWidth: '100%' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => {
                    setModoCapturaPropietario(true)
                    setTimeout(() => firmaPropietarioRef.current?.clear(), 100)
                  }} style={{
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
                    border: 'none', borderRadius: '10px',
                    color: 'white', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>🔄 Cambiar firma</button>
                  <button onClick={eliminarFirmaPropietario} style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: '1px solid rgba(244, 67, 54, 0.4)',
                    borderRadius: '10px',
                    color: '#F4C0D1', fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>🗑️ Eliminar</button>
                </div>
              </div>
            )}

            {/* CASO 2: Sin firma, sin modo captura */}
            {!firmaPropietario && !modoCapturaPropietario && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {tieneFirmaPropietarioGuardada && (
                  <button onClick={usarFirmaGuardada} style={{
                    width: '100%', padding: '14px',
                    background: 'rgba(29, 158, 117, 0.12)',
                    border: '1px solid rgba(29, 158, 117, 0.45)',
                    borderRadius: '10px',
                    color: '#1D9E75', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>✅ Usar mi firma guardada (1 click)</button>
                )}
                <button onClick={() => setModoCapturaPropietario(true)} style={{
                  width: '100%', padding: '14px',
                  background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
                  border: 'none', borderRadius: '10px',
                  color: 'white', fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>✍️ Capturar firma nueva</button>
              </div>
            )}

            {/* CASO 3: Modo captura */}
            {modoCapturaPropietario && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  background: 'white',
                  border: '2px dashed var(--color-border-subtle)',
                  borderRadius: '12px', overflow: 'hidden',
                }}>
                  <SignatureCanvas
                    ref={firmaPropietarioRef}
                    canvasProps={{ width: 700, height: 200, style: { width: '100%', display: 'block', background: 'white' } }}
                    penColor="#1e40af"
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={limpiarFirmaPropietario} style={{
                    padding: '9px 14px',
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>🗑️ Limpiar</button>
                  <button onClick={() => setModoCapturaPropietario(false)} style={{
                    padding: '9px 14px',
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Cancelar</button>
                  <button onClick={capturarFirmaPropietario} style={{
                    padding: '9px 18px',
                    background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
                    border: 'none', borderRadius: '8px',
                    color: 'white', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    marginLeft: 'auto',
                  }}>✅ Guardar firma</button>
                </div>
              </div>
            )}
          </div>

          {/* FIRMA DEL EMPLEADO */}
          <div style={cardFirmaStyle('239, 159, 39')}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  👤 Firma del Trabajador
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                  {empleado?.nombre || 'Empleado'}
                  {empleado?.cedula && ` · CC: ${empleado.cedula}`}
                </div>
              </div>
              {firmaEmpleado && (
                <span style={{
                  fontSize: '10px', fontWeight: 700, padding: '4px 12px',
                  background: 'rgba(29, 158, 117, 0.18)',
                  border: '1px solid rgba(29, 158, 117, 0.4)',
                  borderRadius: '14px', color: '#1D9E75',
                  letterSpacing: '0.5px',
                }}>✅ FIRMADO</span>
              )}
            </div>

            {/* CASO 1: Hay firma */}
            {firmaEmpleado && !modoCapturaEmpleado && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{
                  background: 'white',
                  border: '2px dashed rgba(239, 159, 39, 0.4)',
                  borderRadius: '12px', padding: '16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  minHeight: '120px',
                }}>
                  <img src={firmaEmpleado} alt="Firma del empleado"
                    style={{ maxHeight: '110px', maxWidth: '100%' }} />
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={() => {
                    setModoCapturaEmpleado(true)
                    setTimeout(() => firmaEmpleadoRef.current?.clear(), 100)
                  }} style={{
                    padding: '10px 16px',
                    background: 'linear-gradient(135deg, #EF9F27 0%, #C77C13 100%)',
                    border: 'none', borderRadius: '10px',
                    color: 'white', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>🔄 Cambiar firma</button>
                  <button onClick={eliminarFirmaEmpleado} style={{
                    padding: '10px 16px',
                    background: 'transparent',
                    border: '1px solid rgba(244, 67, 54, 0.4)',
                    borderRadius: '10px',
                    color: '#F4C0D1', fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>🗑️ Eliminar</button>
                </div>
              </div>
            )}

            {/* CASO 2: Sin firma */}
            {!firmaEmpleado && !modoCapturaEmpleado && (
              <button onClick={() => setModoCapturaEmpleado(true)} style={{
                width: '100%', padding: '14px',
                background: 'linear-gradient(135deg, #EF9F27 0%, #C77C13 100%)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>✍️ Capturar firma del trabajador</button>
            )}

            {/* CASO 3: Modo captura */}
            {modoCapturaEmpleado && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  El trabajador debe firmar en este recuadro:
                </div>
                <div style={{
                  background: 'white',
                  border: '2px dashed var(--color-border-subtle)',
                  borderRadius: '12px', overflow: 'hidden',
                }}>
                  <SignatureCanvas
                    ref={firmaEmpleadoRef}
                    canvasProps={{ width: 700, height: 200, style: { width: '100%', display: 'block', background: 'white' } }}
                    penColor="#1e40af"
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button onClick={limpiarFirmaEmpleado} style={{
                    padding: '9px 14px',
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>🗑️ Limpiar</button>
                  <button onClick={() => setModoCapturaEmpleado(false)} style={{
                    padding: '9px 14px',
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Cancelar</button>
                  <button onClick={capturarFirmaEmpleado} style={{
                    padding: '9px 18px',
                    background: 'linear-gradient(135deg, #EF9F27 0%, #C77C13 100%)',
                    border: 'none', borderRadius: '8px',
                    color: 'white', fontSize: '12px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    marginLeft: 'auto',
                  }}>✅ Guardar firma</button>
                </div>
              </div>
            )}
          </div>

          {/* Estado del contrato */}
          {ambasFirmas && (
            <div style={{
              background: 'rgba(29, 158, 117, 0.12)',
              border: '1px solid rgba(29, 158, 117, 0.4)',
              borderLeft: '4px solid #1D9E75',
              borderRadius: '12px', padding: '14px',
            }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#1D9E75', display: 'flex', alignItems: 'center', gap: '8px' }}>
                ✅ Ambas firmas capturadas
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '6px', lineHeight: 1.5 }}>
                Al hacer click en "Activar contrato", el estado cambiará a 🟢 ACTIVO y el contrato será legalmente vinculante en la app.
              </div>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(244, 67, 54, 0.12)',
              border: '1px solid rgba(244, 67, 54, 0.35)',
              borderRadius: '10px', padding: '12px',
              fontSize: '12px', color: '#F4C0D1',
            }}>⚠️ {error}</div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-elevated)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '10px', flexWrap: 'wrap',
        }}>
          <button onClick={onCerrar} disabled={guardando} style={{
            padding: '12px 18px',
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '10px',
            color: 'var(--color-text-secondary)',
            fontSize: '13px', fontWeight: 500,
            cursor: guardando ? 'not-allowed' : 'pointer',
            opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
          }}>Cancelar</button>

          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {(firmaPropietario || firmaEmpleado) && !ambasFirmas && (
              <button onClick={guardarBorrador} disabled={guardando} style={{
                padding: '12px 18px',
                background: 'linear-gradient(135deg, #EF9F27 0%, #C77C13 100%)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 600,
                cursor: guardando ? 'not-allowed' : 'pointer',
                opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
              }}>
                {guardando ? '⏳' : '💾 Guardar progreso'}
              </button>
            )}

            <button onClick={activarContrato} disabled={!ambasFirmas || guardando} style={{
              padding: '12px 22px',
              background: !ambasFirmas
                ? 'var(--color-bg-input)'
                : 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
              border: !ambasFirmas ? '1px solid var(--color-border-subtle)' : 'none',
              borderRadius: '10px',
              color: !ambasFirmas ? 'var(--color-text-muted)' : 'white',
              fontSize: '13px', fontWeight: 600,
              cursor: (!ambasFirmas || guardando) ? 'not-allowed' : 'pointer',
              opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
            }}>
              {guardando ? '⏳ Activando...' : '✅ Activar contrato'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalFirmaPresencial