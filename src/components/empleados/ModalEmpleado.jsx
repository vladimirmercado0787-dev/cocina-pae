import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function ModalEmpleado({ empresaId, empleadoExistente, onCerrar, onGuardado, onIrALiquidacion }) {
  const modoEdicion = !!empleadoExistente

  const [form, setForm] = useState({
    nombre: '', sexo: '', cedula: '', rol: '', pin: '',
    telefono: '', email: '', direccion: '',
    fecha_contratacion: new Date().toISOString().split('T')[0],
    sueldo: '', frecuencia_pago: '', foto_url: '', notas: '',
    gestion_contrato: 'sin_contrato',
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
    if (modoEdicion && empleadoExistente) {
      setForm({
        nombre: empleadoExistente.nombre || '',
        sexo: empleadoExistente.sexo || '',
        cedula: empleadoExistente.cedula || '',
        rol: empleadoExistente.rol || '',
        pin: empleadoExistente.pin || '',
        telefono: empleadoExistente.telefono || '',
        email: empleadoExistente.email || '',
        direccion: empleadoExistente.direccion || '',
        fecha_contratacion: empleadoExistente.fecha_contratacion || '',
        sueldo: empleadoExistente.sueldo?.toString() || '',
        frecuencia_pago: empleadoExistente.frecuencia_pago || '',
        foto_url: empleadoExistente.foto_url || '',
        notas: empleadoExistente.notas || '',
        gestion_contrato: empleadoExistente.gestion_contrato || 'sin_contrato',
      })
    }
  }, [empleadoExistente, modoEdicion])

  function actualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor })
    if (error) setError('')
  }

  function validar() {
    if (!form.nombre.trim()) { setError('El nombre es obligatorio'); return false }
    if (!form.rol) { setError('Debes seleccionar un rol'); return false }
    if (form.pin && (form.pin.length !== 4 || !/^\d+$/.test(form.pin))) {
      setError('El PIN debe ser de 4 dígitos numéricos'); return false
    }
    if (form.sueldo && !form.frecuencia_pago) {
      setError('Si pones sueldo, debes elegir la frecuencia de pago'); return false
    }
    return true
  }

  async function guardar() {
    if (!validar()) return
    setGuardando(true); setError('')

    const datos = {
      nombre: form.nombre.trim().toUpperCase(),
      rol: form.rol,
      sexo: form.sexo || null,
      cedula: form.cedula.trim() || null,
      pin: form.pin.trim() || null,
      telefono: form.telefono.trim() || null,
      email: form.email.trim().toLowerCase() || null,
      direccion: form.direccion.trim() || null,
      fecha_contratacion: form.fecha_contratacion || null,
      sueldo: form.sueldo ? parseFloat(form.sueldo) : null,
      frecuencia_pago: form.frecuencia_pago || null,
      foto_url: form.foto_url.trim() || null,
      notas: form.notas.trim() || null,
      gestion_contrato: form.gestion_contrato || 'sin_contrato',
    }

    const { error: errorSupa } = modoEdicion
      ? await supabase.from('usuarios').update(datos).eq('id', empleadoExistente.id)
      : await supabase.from('usuarios').insert([{ ...datos, empresa_id: empresaId, activo: true }])

    if (errorSupa) {
      console.error('Error al guardar:', errorSupa)
      setError('Error al guardar: ' + errorSupa.message)
      setGuardando(false); return
    }

    setGuardando(false); onGuardado(); onCerrar()
  }

  function irACalculadoraLiquidacion() {
    if (onIrALiquidacion && empleadoExistente) {
      onCerrar(); onIrALiquidacion(empleadoExistente)
    }
  }

  async function desactivarSinLiquidar() {
    setGuardando(true); setError('')
    const { error: errUpdate } = await supabase
      .from('usuarios')
      .update({ activo: false, fecha_salida: new Date().toISOString().split('T')[0] })
      .eq('id', empleadoExistente.id)
    if (errUpdate) { setError('Error al desactivar: ' + errUpdate.message); setGuardando(false); return }
    setGuardando(false); onGuardado(); onCerrar()
  }

  async function reactivar() {
    setGuardando(true); setError('')
    const { error: errUpdate } = await supabase.from('usuarios').update({ activo: true }).eq('id', empleadoExistente.id)
    if (errUpdate) { setError('Error al reactivar: ' + errUpdate.message); setGuardando(false); return }
    setGuardando(false); onGuardado(); onCerrar()
  }

  function obtenerAvatarPreview() {
    if (form.foto_url) return null
    if (form.sexo === 'hombre') return '👨'
    if (form.sexo === 'mujer') return '👩'
    return form.nombre?.charAt(0)?.toUpperCase() || '?'
  }

  const tituloHeader = modoEdicion ? 'EDITAR EMPLEADO' : 'CONTRATAR NUEVO EMPLEADO'
  const textoBotonGuardar = modoEdicion ? '💾 Guardar cambios' : '💾 Guardar empleado'
  const empleadoInactivo = modoEdicion && empleadoExistente.activo === false

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
  const radioCardStyle = (selected, color) => ({
    display: 'flex', alignItems: 'flex-start', gap: '12px',
    padding: '12px',
    background: selected ? `rgba(${color}, 0.12)` : 'var(--color-bg-input)',
    border: selected ? `1px solid rgba(${color}, 0.45)` : '1px solid var(--color-border-subtle)',
    borderLeft: selected ? `4px solid rgb(${color})` : '1px solid var(--color-border-subtle)',
    borderRadius: '10px', cursor: 'pointer',
    transition: 'all 0.15s ease',
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
        maxWidth: '820px', width: '100%',
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
            {form.foto_url ? (
              <img src={form.foto_url} alt="preview" style={{
                width: '52px', height: '52px', borderRadius: '14px',
                objectFit: 'cover',
                border: '2px solid var(--color-border-accent)',
              }} />
            ) : (
              <div style={{
                width: '52px', height: '52px', borderRadius: '14px',
                background: 'rgba(127, 119, 221, 0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '26px',
              }}>{obtenerAvatarPreview()}</div>
            )}
            <div>
              <div style={{ fontSize: '10px', color: '#7F77DD', letterSpacing: '1.5px', fontWeight: 600 }}>
                {tituloHeader}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                {form.nombre.trim() || 'Sin nombre'}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {form.rol ? `Rol: ${form.rol}` : 'Selecciona un rol abajo'}
                {empleadoInactivo && <span style={{ color: '#EF9F27', marginLeft: '6px', fontWeight: 600 }}>· ⚠️ INACTIVO</span>}
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

        {/* AVISO INACTIVO */}
        {empleadoInactivo && (
          <div style={{
            padding: '12px 24px',
            background: 'rgba(239, 159, 39, 0.12)',
            borderBottom: '1px solid rgba(239, 159, 39, 0.3)',
            fontSize: '12px', color: '#EF9F27',
          }}>
            ⚠️ Este empleado está dado de baja. Puedes reactivarlo desde el botón abajo.
          </div>
        )}

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* IDENTIDAD BÁSICA */}
          <div>
            <div style={sectionTitleStyle}>👤 IDENTIDAD BÁSICA</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={labelStyle}>
                  Nombre completo <span style={{ color: '#E24B4A' }}>*</span>
                </label>
                <input type="text" value={form.nombre}
                  onChange={(e) => actualizarCampo('nombre', e.target.value)}
                  placeholder="Ej: Yudelkis Pérez" style={inputStyle} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Sexo</label>
                  <select value={form.sexo}
                    onChange={(e) => actualizarCampo('sexo', e.target.value)}
                    style={inputStyle}>
                    <option value="">No especificado</option>
                    <option value="hombre">👨 Hombre</option>
                    <option value="mujer">👩 Mujer</option>
                    <option value="otro">👤 Otro</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Cédula</label>
                  <input type="text" value={form.cedula}
                    onChange={(e) => actualizarCampo('cedula', e.target.value)}
                    placeholder="Ej: 402-1234567-8"
                    style={{ ...inputStyle, fontFamily: 'monospace' }} />
                </div>
              </div>
            </div>
          </div>

          {/* ROL Y ACCESO */}
          <div>
            <div style={sectionTitleStyle}>💼 ROL Y ACCESO</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
              <div>
                <label style={labelStyle}>
                  Rol <span style={{ color: '#E24B4A' }}>*</span>
                </label>
                <select value={form.rol}
                  onChange={(e) => actualizarCampo('rol', e.target.value)}
                  style={inputStyle}>
                  <option value="">Selecciona un rol...</option>
                  <option value="propietario">👑 Propietario</option>
                  <option value="administrador">💼 Administrador</option>
                  <option value="contador">🧮 Contador</option>
                  <option value="secretaria">📋 Secretaria</option>
                  <option value="jefa_cocina">👩‍🍳 Jefa de Cocina</option>
                  <option value="ayudante">👨‍🍳 Ayudante</option>
                </select>
              </div>
              <div>
                <label style={labelStyle}>PIN de acceso (4 dígitos)</label>
                <input type="text" inputMode="numeric" maxLength={4}
                  value={form.pin}
                  onChange={(e) => actualizarCampo('pin', e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 1234"
                  style={{ ...inputStyle, fontFamily: 'monospace', letterSpacing: '2px' }} />
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Opcional. Para iniciar sesión en la app.
                </div>
              </div>
            </div>
          </div>

          {/* CONTACTO */}
          <div>
            <div style={sectionTitleStyle}>📞 CONTACTO</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Teléfono</label>
                  <input type="tel" value={form.telefono}
                    onChange={(e) => actualizarCampo('telefono', e.target.value)}
                    placeholder="Ej: 809-555-1234" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Email</label>
                  <input type="email" value={form.email}
                    onChange={(e) => actualizarCampo('email', e.target.value)}
                    placeholder="Ej: yudelkis@empresa.com" style={inputStyle} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Dirección</label>
                <input type="text" value={form.direccion}
                  onChange={(e) => actualizarCampo('direccion', e.target.value)}
                  placeholder="Ej: Calle Principal #45, Esperanza, Valverde"
                  style={inputStyle} />
              </div>
            </div>
          </div>

          {/* COMPENSACIÓN */}
          <div>
            <div style={sectionTitleStyle}>💰 COMPENSACIÓN</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <div>
                <label style={labelStyle}>Fecha de contratación</label>
                <input type="date" value={form.fecha_contratacion}
                  onChange={(e) => actualizarCampo('fecha_contratacion', e.target.value)}
                  style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Sueldo (RD$)</label>
                <input type="number" step="0.01" min="0" value={form.sueldo}
                  onChange={(e) => actualizarCampo('sueldo', e.target.value)}
                  placeholder="0.00"
                  style={{ ...inputStyle, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={labelStyle}>Frecuencia de pago</label>
                <select value={form.frecuencia_pago}
                  onChange={(e) => actualizarCampo('frecuencia_pago', e.target.value)}
                  style={inputStyle}>
                  <option value="">No especificada</option>
                  <option value="dia">Por día</option>
                  <option value="semana">Semanal</option>
                  <option value="quincena">Quincenal</option>
                  <option value="mes">Mensual</option>
                </select>
              </div>
            </div>

            {form.sueldo && form.frecuencia_pago && (
              <div style={{
                marginTop: '12px',
                background: 'rgba(29, 158, 117, 0.12)',
                border: '1px solid rgba(29, 158, 117, 0.35)',
                borderLeft: '4px solid #1D9E75',
                borderRadius: '10px', padding: '10px 12px',
                fontSize: '11px', color: '#1D9E75',
              }}>
                💡 Este empleado recibirá <strong>RD$ {Number(form.sueldo).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong>{' '}
                {form.frecuencia_pago === 'dia' && 'por cada día trabajado'}
                {form.frecuencia_pago === 'semana' && 'cada semana'}
                {form.frecuencia_pago === 'quincena' && 'cada quincena (15 y 30 del mes)'}
                {form.frecuencia_pago === 'mes' && 'cada mes'}
              </div>
            )}
          </div>

          {/* GESTIÓN CONTRATO */}
          <div>
            <div style={sectionTitleStyle}>📄 GESTIÓN DEL CONTRATO LABORAL</div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginBottom: '10px' }}>
              ¿Cómo manejarás el contrato de este empleado?
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={radioCardStyle(form.gestion_contrato === 'sin_contrato', '239, 159, 39')}>
                <input type="radio" name="gestion_contrato" value="sin_contrato"
                  checked={form.gestion_contrato === 'sin_contrato'}
                  onChange={(e) => actualizarCampo('gestion_contrato', e.target.value)}
                  style={{ marginTop: '2px', cursor: 'pointer' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    🟡 Sin gestión de contrato
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                    Lo manejo por fuera de la app (recomendado si ya tienes tu propio proceso)
                  </div>
                </div>
              </label>

              <label style={radioCardStyle(form.gestion_contrato === 'contrato_digital', '29, 158, 117')}>
                <input type="radio" name="gestion_contrato" value="contrato_digital"
                  checked={form.gestion_contrato === 'contrato_digital'}
                  onChange={(e) => actualizarCampo('gestion_contrato', e.target.value)}
                  style={{ marginTop: '2px', cursor: 'pointer' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    🟢 Generar contrato digital
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                    La app crea el contrato laboral y se firma digitalmente. Imprimible para archivo físico.
                  </div>
                </div>
              </label>

              <label style={radioCardStyle(form.gestion_contrato === 'contrato_externo', '55, 138, 221')}>
                <input type="radio" name="gestion_contrato" value="contrato_externo"
                  checked={form.gestion_contrato === 'contrato_externo'}
                  onChange={(e) => actualizarCampo('gestion_contrato', e.target.value)}
                  style={{ marginTop: '2px', cursor: 'pointer' }} />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    🔵 Contrato físico ya firmado
                  </div>
                  <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '3px' }}>
                    Solo registro al empleado, sin generar contrato en la app
                  </div>
                </div>
              </label>
            </div>

            {form.gestion_contrato === 'contrato_digital' && (
              <div style={{
                marginTop: '10px',
                background: 'rgba(29, 158, 117, 0.12)',
                border: '1px solid rgba(29, 158, 117, 0.3)',
                borderRadius: '8px', padding: '8px 10px',
                fontSize: '11px', color: '#1D9E75',
              }}>
                💡 {modoEdicion
                  ? 'Podrás generar el contrato desde la vista de empleados o desde la sección "Contratos".'
                  : 'Después de guardar al empleado, podrás crear su contrato laboral desde la vista de empleados.'}
              </div>
            )}
          </div>

          {/* OPCIONAL */}
          <div>
            <div style={sectionTitleStyle}>📝 OPCIONAL</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div>
                <label style={labelStyle}>URL de foto (opcional)</label>
                <input type="url" value={form.foto_url}
                  onChange={(e) => actualizarCampo('foto_url', e.target.value)}
                  placeholder="https://..." style={inputStyle} />
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                  Si no pones foto, se usará el emoji según el sexo elegido.
                </div>
              </div>
              <div>
                <label style={labelStyle}>Notas</label>
                <textarea value={form.notas}
                  onChange={(e) => actualizarCampo('notas', e.target.value)}
                  placeholder="Cualquier información adicional sobre este empleado..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              background: 'rgba(244, 67, 54, 0.12)',
              border: '1px solid rgba(244, 67, 54, 0.35)',
              borderRadius: '10px', padding: '12px',
              fontSize: '12px', color: '#F4C0D1',
            }}>⚠️ {error}</div>
          )}

          {/* ZONA PELIGROSA con cumplimiento legal */}
          {modoEdicion && !empleadoInactivo && (
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
                }}>🚫 Dar de baja este empleado</button>
              ) : (
                <div style={{
                  background: 'rgba(244, 67, 54, 0.10)',
                  border: '1px solid rgba(244, 67, 54, 0.35)',
                  borderLeft: '4px solid #E24B4A',
                  borderRadius: '12px', padding: '16px',
                  display: 'flex', flexDirection: 'column', gap: '12px',
                }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#F4C0D1' }}>
                    ¿Dar de baja a {form.nombre}?
                  </div>

                  {/* AVISO LEGAL */}
                  <div style={{
                    background: 'rgba(239, 159, 39, 0.12)',
                    border: '1px solid rgba(239, 159, 39, 0.35)',
                    borderLeft: '4px solid #EF9F27',
                    borderRadius: '10px', padding: '12px',
                  }}>
                    <div style={{ fontSize: '11px', color: '#EF9F27', fontWeight: 700, marginBottom: '4px', letterSpacing: '0.5px' }}>
                      ⚖️ AVISO LEGAL — Código de Trabajo Dominicano
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', lineHeight: 1.5 }}>
                      Según los Artículos 75, 76, 80, 87 y 95, todo empleado tiene derecho
                      a una liquidación que incluya preaviso, cesantía, vacaciones, regalía
                      y salarios pendientes según corresponda.
                    </div>
                  </div>

                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                    Elige cómo proceder:
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {/* OPCIÓN 1: CALCULADORA */}
                    <button onClick={irACalculadoraLiquidacion} disabled={guardando} style={{
                      width: '100%', padding: '14px',
                      background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
                      border: 'none', borderRadius: '10px',
                      color: 'white', fontSize: '13px',
                      cursor: guardando ? 'not-allowed' : 'pointer',
                      opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
                      textAlign: 'left',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <span style={{ fontSize: '22px' }}>⚖️</span>
                        <div>
                          <div style={{ fontWeight: 700 }}>Ir a Calculadora de Liquidación</div>
                          <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.85)', marginTop: '3px', fontWeight: 400 }}>
                            Recomendado · Calcula automáticamente todo lo que la ley exige pagar
                          </div>
                        </div>
                      </div>
                    </button>

                    {/* OPCIÓN 2: SOLO DESACTIVAR */}
                    <button onClick={desactivarSinLiquidar} disabled={guardando} style={{
                      width: '100%', padding: '14px',
                      background: 'transparent',
                      border: '1px solid rgba(244, 67, 54, 0.4)',
                      borderRadius: '10px',
                      color: '#F4C0D1', fontSize: '13px',
                      cursor: guardando ? 'not-allowed' : 'pointer',
                      opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
                      textAlign: 'left',
                    }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                        <span style={{ fontSize: '22px' }}>⚠️</span>
                        <div>
                          <div style={{ fontWeight: 700 }}>Solo desactivar sin liquidar</div>
                          <div style={{ fontSize: '10px', color: 'rgba(244, 192, 209, 0.8)', marginTop: '3px', fontWeight: 400 }}>
                            Solo si ya pagaste la liquidación por fuera. Tú asumes el riesgo legal.
                          </div>
                        </div>
                      </div>
                    </button>
                  </div>

                  <button onClick={() => setConfirmandoBaja(false)} disabled={guardando} style={{
                    width: '100%', padding: '9px',
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '8px',
                    color: 'var(--color-text-secondary)',
                    fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>Cancelar</button>
                </div>
              )}
            </div>
          )}

          {/* REACTIVAR */}
          {modoEdicion && empleadoInactivo && (
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
                {guardando ? '⏳ Procesando...' : '↺ Reactivar empleado'}
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

            <button onClick={guardar} disabled={guardando || empleadoInactivo} style={{
              padding: '12px 22px',
              background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontSize: '13px', fontWeight: 600,
              cursor: (guardando || empleadoInactivo) ? 'not-allowed' : 'pointer',
              opacity: (guardando || empleadoInactivo) ? 0.6 : 1,
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

export default ModalEmpleado