import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function ModalProveedor({ empresaId, proveedorExistente, onCerrar, onGuardado }) {
  const modoEdicion = !!proveedorExistente

  const [form, setForm] = useState({
    nombre: '', rnc: '', contacto_nombre: '', contacto_telefono: '',
    direccion: '', notas: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [confirmandoBaja, setConfirmandoBaja] = useState(false)

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  useEffect(() => {
    if (modoEdicion && proveedorExistente) {
      setForm({
        nombre: proveedorExistente.nombre || '',
        rnc: proveedorExistente.rnc || '',
        contacto_nombre: proveedorExistente.contacto_nombre || '',
        contacto_telefono: proveedorExistente.contacto_telefono || '',
        direccion: proveedorExistente.direccion || '',
        notas: proveedorExistente.notas || '',
      })
    }
  }, [proveedorExistente, modoEdicion])

  function actualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor })
    if (error) setError('')
  }

  function validar() {
    if (!form.nombre.trim()) { setError('El nombre del proveedor es obligatorio'); return false }
    return true
  }

  async function guardar() {
    if (!validar()) return
    setGuardando(true); setError('')

    const datos = {
      nombre: form.nombre.trim(),
      rnc: form.rnc.trim() || null,
      contacto_nombre: form.contacto_nombre.trim() || null,
      contacto_telefono: form.contacto_telefono.trim() || null,
      direccion: form.direccion.trim() || null,
      notas: form.notas.trim() || null,
    }

    const { error: errorSupa } = modoEdicion
      ? await supabase.from('proveedores').update(datos).eq('id', proveedorExistente.id)
      : await supabase.from('proveedores').insert([{ ...datos, empresa_id: empresaId, activo: true }])

    if (errorSupa) {
      console.error('Error al guardar:', errorSupa)
      setError('Error al guardar: ' + errorSupa.message)
      setGuardando(false); return
    }

    setGuardando(false); onGuardado(); onCerrar()
  }

  async function darDeBaja() {
    setGuardando(true); setError('')
    const { error: errUpdate } = await supabase.from('proveedores').update({ activo: false }).eq('id', proveedorExistente.id)
    if (errUpdate) { setError('Error al dar de baja: ' + errUpdate.message); setGuardando(false); return }
    setGuardando(false); onGuardado(); onCerrar()
  }

  async function reactivar() {
    setGuardando(true); setError('')
    const { error: errUpdate } = await supabase.from('proveedores').update({ activo: true }).eq('id', proveedorExistente.id)
    if (errUpdate) { setError('Error al reactivar: ' + errUpdate.message); setGuardando(false); return }
    setGuardando(false); onGuardado(); onCerrar()
  }

  const tituloHeader = modoEdicion ? 'EDITAR PROVEEDOR' : 'NUEVO PROVEEDOR'
  const textoBotonGuardar = modoEdicion ? '💾 Guardar cambios' : '💾 Guardar proveedor'
  const proveedorInactivo = modoEdicion && proveedorExistente.activo === false

  // ─── ESTILOS ───
  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', padding: '10px 12px',
    color: 'var(--color-text-primary)',
    fontSize: '13px', fontFamily: 'inherit', outline: 'none',
  }
  const labelStyle = {
    display: 'block', fontSize: '10px', fontWeight: 500,
    color: 'var(--color-text-muted)', marginBottom: '6px',
    letterSpacing: '0.5px', textTransform: 'uppercase',
  }
  const sectionTitleStyle = {
    fontSize: '11px', color: 'var(--color-text-muted)',
    letterSpacing: '1.5px', fontWeight: 600,
    marginBottom: '12px',
  }

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
        maxWidth: '720px', width: '100%',
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
              width: '48px', height: '48px', borderRadius: '12px',
              background: 'rgba(239, 159, 39, 0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '24px',
            }}>🏭</div>
            <div>
              <div style={{ fontSize: '10px', color: '#EF9F27', letterSpacing: '1.5px', fontWeight: 600 }}>
                {tituloHeader}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                {form.nombre.trim() || 'Sin nombre'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {form.rnc ? `RNC: ${form.rnc}` : 'Sin RNC registrado'}
                {proveedorInactivo && <span style={{ color: '#EF9F27', marginLeft: '6px', fontWeight: 600 }}>· ⚠️ INACTIVO</span>}
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

        {/* AVISO si está inactivo */}
        {proveedorInactivo && (
          <div style={{
            padding: '12px 24px',
            background: 'rgba(239, 159, 39, 0.12)',
            borderBottom: '1px solid rgba(239, 159, 39, 0.3)',
            fontSize: '12px', color: '#EF9F27',
          }}>
            ⚠️ Este proveedor está dado de baja. Puedes reactivarlo desde el botón abajo.
          </div>
        )}

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* IDENTIDAD */}
          <div>
            <div style={sectionTitleStyle}>🏭 IDENTIDAD DEL PROVEEDOR</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>
                  Nombre / Razón social <span style={{ color: '#E24B4A' }}>*</span>
                </label>
                <input type="text" value={form.nombre}
                  onChange={(e) => actualizarCampo('nombre', e.target.value)}
                  placeholder="Ej: Colmado El Recreo, Carnicería Don José..."
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>RNC</label>
                <input type="text" value={form.rnc}
                  onChange={(e) => actualizarCampo('rnc', e.target.value)}
                  placeholder="Ej: 1-23-45678-9"
                  style={{ ...inputStyle, fontFamily: 'monospace' }} />
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Importante para reportes DGII 606. Opcional pero recomendado.
                </div>
              </div>
            </div>
          </div>

          {/* CONTACTO */}
          <div>
            <div style={sectionTitleStyle}>📞 CONTACTO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Nombre del contacto</label>
                  <input type="text" value={form.contacto_nombre}
                    onChange={(e) => actualizarCampo('contacto_nombre', e.target.value)}
                    placeholder="Ej: Don José Pérez"
                    style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input type="tel" value={form.contacto_telefono}
                    onChange={(e) => actualizarCampo('contacto_telefono', e.target.value)}
                    placeholder="Ej: 809-555-1234"
                    style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Dirección</label>
                <input type="text" value={form.direccion}
                  onChange={(e) => actualizarCampo('direccion', e.target.value)}
                  placeholder="Ej: Calle Duarte #45, Esperanza, Valverde"
                  style={inputStyle} />
              </div>
            </div>
          </div>

          {/* NOTAS */}
          <div>
            <div style={sectionTitleStyle}>📝 NOTAS</div>
            <textarea value={form.notas}
              onChange={(e) => actualizarCampo('notas', e.target.value)}
              placeholder="Días de visita, productos que vende, formas de pago, etc."
              rows={3}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>

          {error && (
            <div style={{
              background: 'rgba(244, 67, 54, 0.12)',
              border: '1px solid rgba(244, 67, 54, 0.35)',
              borderRadius: '10px', padding: '12px',
              fontSize: '12px', color: '#F4C0D1',
            }}>⚠️ {error}</div>
          )}

          {/* ZONA PELIGROSA */}
          {modoEdicion && !proveedorInactivo && (
            <div style={{
              paddingTop: '20px', marginTop: '4px',
              borderTop: '1px solid rgba(244, 67, 54, 0.25)',
            }}>
              <div style={{
                fontSize: '10px', color: '#E24B4A',
                letterSpacing: '1.5px', fontWeight: 600,
                marginBottom: '10px',
              }}>⚠️ ZONA PELIGROSA</div>

              {!confirmandoBaja ? (
                <button onClick={() => setConfirmandoBaja(true)} disabled={guardando} style={{
                  width: '100%', padding: '12px',
                  background: 'transparent',
                  border: '1px solid rgba(244, 67, 54, 0.4)',
                  borderRadius: '10px',
                  color: '#F4C0D1', fontSize: '12px', fontWeight: 500,
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
                }}>🚫 Dar de baja este proveedor</button>
              ) : (
                <div style={{
                  background: 'rgba(244, 67, 54, 0.10)',
                  border: '1px solid rgba(244, 67, 54, 0.35)',
                  borderLeft: '4px solid #E24B4A',
                  borderRadius: '12px', padding: '14px',
                  display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#F4C0D1' }}>
                    ¿Seguro que quieres dar de baja a {form.nombre}?
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    El proveedor no será borrado. Quedará marcado como inactivo y su histórico se conservará. Puedes reactivarlo en cualquier momento.
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button onClick={() => setConfirmandoBaja(false)} disabled={guardando} style={{
                      flex: 1, padding: '9px',
                      background: 'var(--color-bg-input)',
                      border: '1px solid var(--color-border-subtle)',
                      borderRadius: '8px',
                      color: 'var(--color-text-secondary)',
                      fontSize: '12px', fontWeight: 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>Cancelar</button>
                    <button onClick={darDeBaja} disabled={guardando} style={{
                      flex: 1, padding: '9px',
                      background: 'linear-gradient(135deg, #E24B4A 0%, #B83232 100%)',
                      border: 'none', borderRadius: '8px',
                      color: 'white', fontSize: '12px', fontWeight: 600,
                      cursor: guardando ? 'not-allowed' : 'pointer',
                      opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
                    }}>
                      {guardando ? '⏳ Procesando...' : '🚫 Sí, dar de baja'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* REACTIVAR */}
          {modoEdicion && proveedorInactivo && (
            <div style={{
              paddingTop: '20px', marginTop: '4px',
              borderTop: '1px solid rgba(29, 158, 117, 0.25)',
            }}>
              <button onClick={reactivar} disabled={guardando} style={{
                width: '100%', padding: '12px',
                background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 600,
                cursor: guardando ? 'not-allowed' : 'pointer',
                opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
              }}>
                {guardando ? '⏳ Procesando...' : '↺ Reactivar proveedor'}
              </button>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-elevated)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '12px', flexWrap: 'wrap',
        }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
            <span style={{ color: '#E24B4A' }}>*</span> Campos obligatorios
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
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

            <button onClick={guardar} disabled={guardando || proveedorInactivo} style={{
              padding: '12px 22px',
              background: 'linear-gradient(135deg, #EF9F27 0%, #C77C13 100%)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontSize: '13px', fontWeight: 600,
              cursor: (guardando || proveedorInactivo) ? 'not-allowed' : 'pointer',
              opacity: (guardando || proveedorInactivo) ? 0.6 : 1,
              fontFamily: 'inherit',
            }}>
              {guardando ? '⏳ Guardando...' : textoBotonGuardar}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalProveedor