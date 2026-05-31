import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { crearGastoDesdeBonificacion } from '../../utils/gastosAutomaticos'

const TIPOS_BONO = [
  { value: 'navideño',    label: '🎄 Navideño',      color: '#1D9E75' },
  { value: 'cumpleaños',  label: '🎂 Cumpleaños',    color: '#D4537E' },
  { value: 'productividad', label: '🏆 Productividad', color: '#EF9F27' },
  { value: 'reconocimiento', label: '⭐ Reconocimiento', color: '#7F77DD' },
  { value: 'otro',        label: '🎁 Otro',          color: '#378ADD' },
]

function ModalBonificacion({ empresaId, usuarioActual, onCerrar, onGuardado, bonificacionExistente = null }) {
  const [empleados, setEmpleados] = useState([])
  const [empleadosSeleccionados, setEmpleadosSeleccionados] = useState([])
  const [tipo, setTipo] = useState('navideño')
  const [tituloBono, setTituloBono] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [montoIgual, setMontoIgual] = useState(true)
  const [montoBase, setMontoBase] = useState('')
  const [montosIndividuales, setMontosIndividuales] = useState({})
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [notas, setNotas] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .neq('rol', 'propietario')
      .order('nombre')
    setEmpleados(data || [])

    if (bonificacionExistente) {
      setTipo(bonificacionExistente.tipo || 'navideño')
      setTituloBono(bonificacionExistente.titulo || '')
      setDescripcion(bonificacionExistente.descripcion || '')
      setFechaPago(bonificacionExistente.fecha_pago || new Date().toISOString().split('T')[0])
      setNotas(bonificacionExistente.notas || '')
    }
    setCargando(false)
  }

  function toggleEmpleado(id) {
    if (empleadosSeleccionados.includes(id)) {
      setEmpleadosSeleccionados(empleadosSeleccionados.filter(e => e !== id))
    } else {
      setEmpleadosSeleccionados([...empleadosSeleccionados, id])
    }
  }

  function seleccionarTodos() {
    if (empleadosSeleccionados.length === empleados.length) {
      setEmpleadosSeleccionados([])
    } else {
      setEmpleadosSeleccionados(empleados.map(e => e.id))
    }
  }

  function montoEmpleado(emp) {
    if (montoIgual) return parseFloat(montoBase || 0)
    return parseFloat(montosIndividuales[emp.id] || 0)
  }

  const totalBono = empleadosSeleccionados.reduce((sum, id) => {
    const emp = empleados.find(e => e.id === id)
    return sum + (emp ? montoEmpleado(emp) : 0)
  }, 0)

  async function guardar() {
    setError('')
    if (empleadosSeleccionados.length === 0) { setError('Selecciona al menos un empleado'); return }
    if (!tituloBono.trim()) { setError('Pon un título a la bonificación'); return }
    if (totalBono <= 0) { setError('El monto total debe ser mayor a 0'); return }

    setGuardando(true)
    try {
      const detalle = empleadosSeleccionados.map(id => {
        const emp = empleados.find(e => e.id === id)
        return {
          usuario_id: emp.id,
          nombre: emp.nombre,
          rol: emp.rol,
          monto: montoEmpleado(emp),
        }
      })

      const nuevoBono = {
        empresa_id: empresaId,
        titulo: tituloBono.trim(),
        descripcion: descripcion.trim() || null,
        tipo: tipo,
        fecha_pago: fechaPago,
        año: new Date(fechaPago).getFullYear(),
        estado: 'pagado',
        fecha_pagado: new Date().toISOString(),
        monto_total: totalBono,
        cantidad_empleados: empleadosSeleccionados.length,
        detalle: detalle,
        creado_por_usuario_id: usuarioActual?.id || null,
        notas: notas.trim() || null,
      }

      const { data: bonoCreado, error: errBono } = await supabase
        .from('bonificaciones_extra').insert([nuevoBono]).select().single()
      if (errBono) throw new Error(errBono.message)

      const resGasto = await crearGastoDesdeBonificacion?.({
        empresaId,
        bonificacionId: bonoCreado.id,
        titulo: tituloBono.trim(),
        tipo,
        fechaPago,
        montoTotal: totalBono,
        registradoPor: usuarioActual?.id,
        registradoPorNombre: usuarioActual?.nombre || 'Sistema',
      })
      if (resGasto && !resGasto.success) console.warn('Bono OK pero falló gasto automático:', resGasto.error)

      setGuardando(false)
      if (onGuardado) onGuardado(bonoCreado)
      onCerrar()
    } catch (e) {
      setError(e.message)
      setGuardando(false)
    }
  }

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }

  const colorTipo = TIPOS_BONO.find(t => t.value === tipo)?.color || '#1D9E75'

  // ─── ESTILOS ───
  const input = {
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
  const sectionTitle = {
    fontSize: '11px', color: 'var(--color-text-muted)',
    letterSpacing: '1.5px', fontWeight: 600, marginBottom: '14px',
  }
  const panel = {
    background: 'var(--color-modulo-bg)',
    border: '1px solid var(--color-modulo-border)',
    borderRadius: '14px', padding: '20px',
    boxShadow: 'var(--modulo-sombra)',
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
        my: '20px',
        position: 'relative',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        {/* HEADER del modal */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border-subtle)',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: `${colorTipo}25`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
            }}>🎁</div>
            <div>
              <div style={{ fontSize: '10px', color: colorTipo, letterSpacing: '1.5px', fontWeight: 600 }}>
                BONIFICACIÓN EXTRA
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                {bonificacionExistente ? 'Editar bonificación' : 'Nueva bonificación'}
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
            <button onClick={onCerrar} style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '20px', padding: '7px 14px',
              color: 'var(--color-text-secondary)', fontSize: '12px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>✖ Cerrar</button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ padding: '20px 24px' }}>
          {cargando ? (
            <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-muted)' }}>⏳ Cargando empleados...</div>
          ) : (
            <>
              {/* DATOS BÁSICOS */}
              <div style={{ ...panel, marginBottom: '16px' }}>
                <div style={sectionTitle}>📋 DATOS DE LA BONIFICACIÓN</div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                  <div>
                    <label style={labelStyle}>Tipo</label>
                    <select value={tipo} onChange={(e) => setTipo(e.target.value)} style={input}>
                      {TIPOS_BONO.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Fecha de pago</label>
                    <input type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} style={input} />
                  </div>
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={labelStyle}>Título</label>
                  <input type="text" value={tituloBono} onChange={(e) => setTituloBono(e.target.value)} placeholder="Ej: Bono Navideño 2026" style={input} />
                </div>

                <div>
                  <label style={labelStyle}>Descripción (opcional)</label>
                  <textarea value={descripcion} onChange={(e) => setDescripcion(e.target.value)} rows={2} placeholder="Detalles del bono..." style={{ ...input, resize: 'none' }} />
                </div>
              </div>

              {/* EMPLEADOS */}
              <div style={{ ...panel, marginBottom: '16px' }}>
                <div style={{ ...sectionTitle, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <span>👥 EMPLEADOS QUE RECIBEN ({empleadosSeleccionados.length}/{empleados.length})</span>
                  <button onClick={seleccionarTodos} style={{
                    background: 'var(--color-bg-elevated)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '16px', padding: '5px 12px',
                    color: 'var(--color-text-secondary)', fontSize: '11px',
                    cursor: 'pointer', fontFamily: 'inherit', letterSpacing: 0,
                  }}>
                    {empleadosSeleccionados.length === empleados.length ? 'Quitar todos' : 'Seleccionar todos'}
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '280px', overflowY: 'auto' }}>
                  {empleados.map(emp => {
                    const sel = empleadosSeleccionados.includes(emp.id)
                    return (
                      <label key={emp.id} style={{
                        display: 'flex', alignItems: 'center', gap: '12px',
                        padding: '10px 12px', cursor: 'pointer',
                        background: sel ? `${colorTipo}15` : 'var(--color-bg-input)',
                        border: sel ? `1px solid ${colorTipo}50` : '1px solid var(--color-border-subtle)',
                        borderRadius: '10px',
                      }}>
                        <input type="checkbox" checked={sel} onChange={() => toggleEmpleado(emp.id)} />
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{emp.nombre}</div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>{emp.rol?.replace('_', ' ')}</div>
                        </div>
                        {sel && !montoIgual && (
                          <input
                            type="number" placeholder="0.00"
                            value={montosIndividuales[emp.id] || ''}
                            onChange={(e) => setMontosIndividuales({ ...montosIndividuales, [emp.id]: e.target.value })}
                            style={{ ...input, width: '120px', padding: '6px 10px', fontSize: '12px' }}
                            onClick={(e) => e.stopPropagation()}
                          />
                        )}
                      </label>
                    )
                  })}
                </div>
              </div>

              {/* MONTO */}
              <div style={{ ...panel, marginBottom: '16px' }}>
                <div style={sectionTitle}>💰 MONTO</div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <button onClick={() => setMontoIgual(true)} style={{
                    flex: 1, minWidth: '140px', padding: '10px',
                    background: montoIgual ? `${colorTipo}25` : 'var(--color-bg-input)',
                    border: montoIgual ? `1px solid ${colorTipo}` : '1px solid var(--color-border-subtle)',
                    borderRadius: '10px',
                    color: montoIgual ? colorTipo : 'var(--color-text-secondary)',
                    fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>📊 Monto igual a todos</button>
                  <button onClick={() => setMontoIgual(false)} style={{
                    flex: 1, minWidth: '140px', padding: '10px',
                    background: !montoIgual ? `${colorTipo}25` : 'var(--color-bg-input)',
                    border: !montoIgual ? `1px solid ${colorTipo}` : '1px solid var(--color-border-subtle)',
                    borderRadius: '10px',
                    color: !montoIgual ? colorTipo : 'var(--color-text-secondary)',
                    fontSize: '12px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>🎯 Monto individual</button>
                </div>

                {montoIgual && (
                  <div>
                    <label style={labelStyle}>Monto por empleado (RD$)</label>
                    <input type="number" value={montoBase} onChange={(e) => setMontoBase(e.target.value)} placeholder="0.00" style={{ ...input, fontSize: '15px', fontWeight: 600 }} />
                  </div>
                )}
              </div>

              {/* TOTAL */}
              <div style={{
                background: `linear-gradient(135deg, ${colorTipo}25 0%, ${colorTipo}08 100%)`,
                border: `1px solid ${colorTipo}50`,
                borderLeft: `4px solid ${colorTipo}`,
                borderRadius: '14px', padding: '16px 20px',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                marginBottom: '16px', flexWrap: 'wrap', gap: '10px',
              }}>
                <div>
                  <div style={{ fontSize: '10px', color: colorTipo, letterSpacing: '1.5px', fontWeight: 600 }}>TOTAL A PAGAR</div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{empleadosSeleccionados.length} empleado(s)</div>
                </div>
                <div style={{ fontSize: '24px', fontWeight: 600, color: 'var(--color-text-primary)' }}>RD$ {formatearMoneda(totalBono)}</div>
              </div>

              {/* NOTAS */}
              <div style={{ ...panel, marginBottom: '16px' }}>
                <label style={labelStyle}>Notas adicionales (opcional)</label>
                <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} placeholder="Observaciones..." style={{ ...input, resize: 'none' }} />
              </div>

              {error && (
                <div style={{
                  background: 'rgba(244, 67, 54, 0.1)',
                  border: '1px solid rgba(244, 67, 54, 0.3)',
                  borderRadius: '10px', padding: '12px',
                  fontSize: '12px', color: '#F4C0D1', marginBottom: '12px',
                }}>⚠️ {error}</div>
              )}

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button onClick={onCerrar} disabled={guardando} style={{
                  flex: 1, minWidth: '140px', padding: '14px',
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px', fontWeight: 500,
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
                }}>Cancelar</button>
                <button onClick={guardar} disabled={guardando} style={{
                  flex: 1, minWidth: '140px', padding: '14px',
                  background: `linear-gradient(135deg, ${colorTipo} 0%, ${colorTipo}AA 100%)`,
                  border: 'none', borderRadius: '10px',
                  color: 'white', fontSize: '13px', fontWeight: 600,
                  cursor: guardando ? 'not-allowed' : 'pointer',
                  opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
                }}>{guardando ? '⏳ Guardando...' : '💾 Guardar bonificación'}</button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default ModalBonificacion