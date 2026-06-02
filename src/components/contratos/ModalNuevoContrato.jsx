import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function ModalNuevoContrato({
  empresaId, usuarioActual, empleadoPreseleccionado, empresa,
  onCerrar, onContratoCreado
}) {
  const [paso, setPaso] = useState(empleadoPreseleccionado ? 2 : 1)
  const [empleados, setEmpleados] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  const [empleadoSeleccionado, setEmpleadoSeleccionado] = useState(empleadoPreseleccionado || null)
  const [tipoContrato, setTipoContrato] = useState('obra_servicio')
  const [datosContrato, setDatosContrato] = useState({
    año_escolar_inabie: '2026-2027',
    fecha_inicio: '',
    fecha_fin: '',
    puesto: '',
    descripcion_funciones: '',
    salario_neto: '',
    frecuencia_pago: 'quincenal',
    horario_trabajo: '',
    dias_laborales: 'Lunes a Viernes',
    lugar_trabajo: '',
    notas: '',
  })

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  useEffect(() => { if (paso === 1) cargarEmpleados() }, [paso])

  useEffect(() => {
    if (empleadoSeleccionado && paso === 3) {
      setDatosContrato(prev => ({
        ...prev,
        puesto: prev.puesto || formatearPuesto(empleadoSeleccionado.rol),
        salario_neto: prev.salario_neto || empleadoSeleccionado.sueldo?.toString() || '',
        frecuencia_pago: prev.frecuencia_pago || mapearFrecuencia(empleadoSeleccionado.frecuencia_pago),
        fecha_inicio: prev.fecha_inicio || empleadoSeleccionado.fecha_contratacion || new Date().toISOString().split('T')[0],
        lugar_trabajo: prev.lugar_trabajo || empresa?.direccion || '',
      }))
    }
  }, [empleadoSeleccionado, paso, empresa])

  async function cargarEmpleados() {
    setCargando(true)
    const { data } = await supabase
      .from('usuarios')
      .select('id, nombre, rol, sexo, foto_url, cedula, sueldo, frecuencia_pago, fecha_contratacion, gestion_contrato')
      .eq('empresa_id', empresaId).eq('activo', true).neq('rol', 'propietario').order('nombre')

    const { data: contratosExistentes } = await supabase
      .from('contratos_empleados').select('usuario_id').eq('empresa_id', empresaId)

    const idsConContrato = (contratosExistentes || []).map(c => c.usuario_id)
    const empleadosDisponibles = (data || []).filter(e => !idsConContrato.includes(e.id))
    setEmpleados(empleadosDisponibles)
    setCargando(false)
  }

  function formatearPuesto(rol) {
    const mapa = {
      administrador: 'Administrador', contador: 'Contador', secretaria: 'Secretaria',
      jefa_cocina: 'Jefa de Cocina', ayudante: 'Ayudante de Cocina', despachador: 'Despachador',
    }
    return mapa[rol] || rol
  }
  function mapearFrecuencia(freq) {
    if (freq === 'semana') return 'semanal'
    if (freq === 'quincena') return 'quincenal'
    if (freq === 'mes') return 'mensual'
    return 'quincenal'
  }
  function actualizarCampo(campo, valor) {
    setDatosContrato(prev => ({ ...prev, [campo]: valor }))
    if (error) setError('')
  }
  function calcularBruto(neto) {
    if (!neto || isNaN(neto)) return 0
    return Math.round((parseFloat(neto) / 0.9426) * 100) / 100
  }

  function validarPaso3() {
    if (!datosContrato.fecha_inicio) { setError('La fecha de inicio es obligatoria'); return false }
    if (tipoContrato !== 'indefinido' && !datosContrato.fecha_fin) {
      setError('La fecha de fin es obligatoria para contratos por obra/servicio o estacionales')
      return false
    }
    if (!datosContrato.puesto.trim()) { setError('El puesto es obligatorio'); return false }
    if (!datosContrato.salario_neto || parseFloat(datosContrato.salario_neto) <= 0) {
      setError('El salario neto debe ser mayor a 0'); return false
    }
    return true
  }

  async function crearContrato() {
    if (!validarPaso3()) return
    setGuardando(true); setError('')

    const salarioNeto = parseFloat(datosContrato.salario_neto)
    const salarioBruto = calcularBruto(salarioNeto)

    const nuevoContrato = {
      empresa_id: empresaId,
      usuario_id: empleadoSeleccionado.id,
      tipo_contrato: tipoContrato,
      estado: 'borrador',
      año_escolar_inabie: tipoContrato === 'obra_servicio' ? datosContrato.año_escolar_inabie : null,
      fecha_inicio: datosContrato.fecha_inicio,
      fecha_fin: tipoContrato === 'indefinido' ? null : datosContrato.fecha_fin,
      puesto: datosContrato.puesto.trim(),
      descripcion_funciones: datosContrato.descripcion_funciones.trim() || null,
      salario_neto: salarioNeto,
      salario_bruto: salarioBruto,
      frecuencia_pago: datosContrato.frecuencia_pago,
      horario_trabajo: datosContrato.horario_trabajo.trim() || null,
      dias_laborales: datosContrato.dias_laborales.trim() || null,
      lugar_trabajo: datosContrato.lugar_trabajo.trim() || null,
      notas: datosContrato.notas.trim() || null,
      created_by_usuario_id: usuarioActual?.id || null,
    }

    const { data, error: errorInsert } = await supabase
      .from('contratos_empleados').insert([nuevoContrato]).select().single()

    if (errorInsert) {
      console.error('Error creando contrato:', errorInsert)
      setError('Error al crear contrato: ' + errorInsert.message)
      setGuardando(false); return
    }

    setGuardando(false)
    if (onContratoCreado) onContratoCreado(data)
  }

  const empleadosFiltrados = empleados.filter(e => {
    if (!busqueda.trim()) return true
    return e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
           e.rol.toLowerCase().includes(busqueda.toLowerCase())
  })

  function obtenerAvatar(empleado) {
    if (empleado.foto_url) return null
    if (empleado.sexo === 'hombre') return '👨'
    if (empleado.sexo === 'mujer') return '👩'
    return empleado.nombre?.charAt(0)?.toUpperCase() || '?'
  }
  function obtenerLabelFrecuencia(freq) {
    const mapa = { dia: 'por día', semana: 'por semana', quincena: 'por quincena', mes: 'por mes' }
    return mapa[freq] || freq
  }

  const salarioBrutoCalculado = calcularBruto(datosContrato.salario_neto)

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
    marginBottom: '10px',
  }
  const radioCardStyle = (selected, color) => ({
    display: 'block', padding: '16px',
    background: selected ? `rgba(${color}, 0.12)` : 'var(--color-bg-input)',
    border: selected ? `1px solid rgba(${color}, 0.45)` : '1px solid var(--color-border-subtle)',
    borderLeft: selected ? `4px solid rgb(${color})` : '1px solid var(--color-border-subtle)',
    borderRadius: '12px', cursor: 'pointer',
    transition: 'all 0.15s ease',
  })

  const tituloPaso = {
    1: '👤 Selecciona el empleado',
    2: '📋 Tipo de contrato',
    3: '📝 Datos del contrato',
    4: '✅ Confirmar y crear',
  }[paso]

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
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border-subtle)',
          display: 'flex', flexDirection: 'column', gap: '14px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '44px', height: '44px', borderRadius: '12px',
                background: 'rgba(127, 119, 221, 0.18)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '22px',
              }}>📄</div>
              <div>
                <div style={{ fontSize: '10px', color: '#7F77DD', letterSpacing: '1.5px', fontWeight: 600 }}>
                  NUEVO CONTRATO LABORAL
                </div>
                <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                  {tituloPaso}
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

          {/* Progress steps */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {[1, 2, 3, 4].map((n, i) => (
                <div key={n} style={{ display: 'flex', alignItems: 'center', gap: '6px', flex: 1 }}>
                  <div style={{
                    width: '28px', height: '28px', borderRadius: '50%',
                    background: n === paso
                      ? 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)'
                      : n < paso
                        ? 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)'
                        : 'var(--color-bg-input)',
                    border: n > paso ? '1px solid var(--color-border-subtle)' : 'none',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '12px', fontWeight: 700,
                    color: n > paso ? 'var(--color-text-muted)' : 'white',
                  }}>{n < paso ? '✓' : n}</div>
                  {i < 3 && (
                    <div style={{
                      flex: 1, height: '3px', borderRadius: '2px',
                      background: n < paso
                        ? 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)'
                        : 'var(--color-bg-input)',
                    }} />
                  )}
                </div>
              ))}
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              Paso {paso} de 4
            </div>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* PASO 1: SELECCIONAR EMPLEADO */}
          {paso === 1 && (
            <div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                Solo se muestran empleados que aún NO tienen contrato creado.
              </div>

              <input type="text" value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar empleado por nombre o rol..."
                style={{ ...inputStyle, marginBottom: '14px' }} />

              {cargando ? (
                <div style={{ textAlign: 'center', padding: '32px', color: 'var(--color-text-muted)', fontSize: '13px' }}>
                  ⏳ Cargando empleados...
                </div>
              ) : empleadosFiltrados.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '32px',
                  background: 'var(--color-bg-input)',
                  border: '1px dashed var(--color-border-subtle)',
                  borderRadius: '12px',
                }}>
                  <div style={{ fontSize: '36px', marginBottom: '6px' }}>👥</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                    {empleados.length === 0
                      ? 'No hay empleados disponibles'
                      : 'No se encontraron empleados con esa búsqueda'}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                    {empleados.length === 0 && 'Todos los empleados activos ya tienen contrato creado'}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {empleadosFiltrados.map(emp => (
                    <button key={emp.id}
                      onClick={() => { setEmpleadoSeleccionado(emp); setPaso(2) }}
                      style={{
                        textAlign: 'left',
                        background: 'var(--color-bg-input)',
                        border: '1px solid var(--color-border-subtle)',
                        borderRadius: '12px', padding: '14px',
                        cursor: 'pointer', fontFamily: 'inherit',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(127, 119, 221, 0.10)'
                        e.currentTarget.style.borderColor = 'rgba(127, 119, 221, 0.4)'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'var(--color-bg-input)'
                        e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '12px',
                          background: 'rgba(127, 119, 221, 0.18)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '22px', flexShrink: 0,
                          overflow: 'hidden',
                        }}>
                          {emp.foto_url
                            ? <img src={emp.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : obtenerAvatar(emp)}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                            {emp.nombre}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                            {formatearPuesto(emp.rol)}
                            {emp.sueldo && ` · RD$ ${Number(emp.sueldo).toLocaleString('es-DO')} ${obtenerLabelFrecuencia(emp.frecuencia_pago)}`}
                          </div>
                          {emp.gestion_contrato === 'contrato_digital' && (
                            <div style={{ fontSize: '10px', color: '#EF9F27', fontWeight: 600, marginTop: '4px' }}>
                              ⚠️ Marcado para contrato digital
                            </div>
                          )}
                        </div>
                        <span style={{ color: '#7F77DD', fontSize: '16px' }}>→</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* PASO 2: TIPO DE CONTRATO */}
          {paso === 2 && empleadoSeleccionado && (
            <div>
              <div style={{
                background: 'rgba(127, 119, 221, 0.12)',
                border: '1px solid rgba(127, 119, 221, 0.35)',
                borderLeft: '4px solid #7F77DD',
                borderRadius: '12px', padding: '14px',
                marginBottom: '18px',
              }}>
                <div style={{ fontSize: '10px', color: '#7F77DD', fontWeight: 600, letterSpacing: '1.5px' }}>
                  EMPLEADO SELECCIONADO
                </div>
                <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginTop: '4px' }}>
                  {empleadoSeleccionado.nombre}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {formatearPuesto(empleadoSeleccionado.rol)}
                </div>
              </div>

              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginBottom: '14px' }}>
                Selecciona el tipo de contrato que mejor se ajuste a la relación laboral:
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {/* Opción 1: Obra/Servicio */}
                <label style={radioCardStyle(tipoContrato === 'obra_servicio', '29, 158, 117')}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <input type="radio" name="tipo_contrato" value="obra_servicio"
                      checked={tipoContrato === 'obra_servicio'}
                      onChange={(e) => setTipoContrato(e.target.value)}
                      style={{ marginTop: '4px', cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                        📑 Obra o Servicio Determinado (PAE)
                        <span style={{
                          fontSize: '9px', padding: '2px 8px',
                          background: 'rgba(29, 158, 117, 0.25)',
                          color: '#1D9E75',
                          borderRadius: '10px', fontWeight: 700, letterSpacing: '0.5px',
                        }}>RECOMENDADO</span>
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                        Contrato amarrado al año escolar y al contrato con INABIE. Termina automáticamente al finalizar el servicio. <strong>Mejor protección para el empleador.</strong>
                      </div>
                    </div>
                  </div>
                </label>

                {/* Opción 2: Estacional */}
                <label style={radioCardStyle(tipoContrato === 'estacional', '239, 159, 39')}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <input type="radio" name="tipo_contrato" value="estacional"
                      checked={tipoContrato === 'estacional'}
                      onChange={(e) => setTipoContrato(e.target.value)}
                      style={{ marginTop: '4px', cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        🌾 Estacional
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                        Reconoce la naturaleza estacional del trabajo PAE. Si dura más de 4 meses, aplica asistencia económica.
                      </div>
                    </div>
                  </div>
                </label>

                {/* Opción 3: Indefinido */}
                <label style={radioCardStyle(tipoContrato === 'indefinido', '55, 138, 221')}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                    <input type="radio" name="tipo_contrato" value="indefinido"
                      checked={tipoContrato === 'indefinido'}
                      onChange={(e) => setTipoContrato(e.target.value)}
                      style={{ marginTop: '4px', cursor: 'pointer' }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        ♾️ Tiempo Indefinido
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', lineHeight: 1.5 }}>
                        Para personal permanente que trabaja todo el año (ej: secretaria administrativa). Aplican todas las prestaciones.
                      </div>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* PASO 3: DATOS DEL CONTRATO */}
          {paso === 3 && empleadoSeleccionado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

              {/* Auto-llenados */}
              <div style={{
                background: 'var(--color-bg-input)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '12px', padding: '14px',
              }}>
                <div style={sectionTitleStyle}>📋 DATOS AUTO-LLENADOS DESDE LA CONFIGURACIÓN</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', fontSize: '12px' }}>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Empleador</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {empresa?.nombre_propietario || 'Sin nombre'}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      CC: {empresa?.cedula_propietario || '(sin cédula)'}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Trabajador</div>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {empleadoSeleccionado.nombre}
                    </div>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                      CC: {empleadoSeleccionado.cedula || '(sin cédula)'}
                    </div>
                  </div>
                </div>
                {(!empresa?.cedula_propietario || !empleadoSeleccionado.cedula) && (
                  <div style={{
                    marginTop: '12px',
                    background: 'rgba(239, 159, 39, 0.12)',
                    border: '1px solid rgba(239, 159, 39, 0.35)',
                    borderRadius: '8px', padding: '8px 10px',
                    fontSize: '11px', color: '#EF9F27',
                  }}>
                    ⚠️ Faltan cédulas. Edita los datos en Configuración o en el perfil del empleado para que aparezcan en el contrato.
                  </div>
                )}
              </div>

              {tipoContrato === 'obra_servicio' && (
                <div>
                  <label style={labelStyle}>
                    Año escolar INABIE <span style={{ color: '#E24B4A' }}>*</span>
                  </label>
                  <input type="text" value={datosContrato.año_escolar_inabie}
                    onChange={(e) => actualizarCampo('año_escolar_inabie', e.target.value)}
                    placeholder="2026-2027" style={inputStyle} />
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>
                    Fecha de inicio <span style={{ color: '#E24B4A' }}>*</span>
                  </label>
                  <input type="date" value={datosContrato.fecha_inicio}
                    onChange={(e) => actualizarCampo('fecha_inicio', e.target.value)}
                    style={inputStyle} />
                </div>
                {tipoContrato !== 'indefinido' && (
                  <div>
                    <label style={labelStyle}>
                      Fecha de fin <span style={{ color: '#E24B4A' }}>*</span>
                    </label>
                    <input type="date" value={datosContrato.fecha_fin}
                      onChange={(e) => actualizarCampo('fecha_fin', e.target.value)}
                      style={inputStyle} />
                  </div>
                )}
              </div>

              <div>
                <label style={labelStyle}>
                  Puesto <span style={{ color: '#E24B4A' }}>*</span>
                </label>
                <input type="text" value={datosContrato.puesto}
                  onChange={(e) => actualizarCampo('puesto', e.target.value)}
                  placeholder="Ej: Cocinero, Ayudante de Cocina, Despachador"
                  style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Descripción de funciones (opcional)</label>
                <textarea value={datosContrato.descripcion_funciones}
                  onChange={(e) => actualizarCampo('descripcion_funciones', e.target.value)}
                  placeholder="Ej: Preparar alimentos según menú INABIE, mantener limpieza del área..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }} />
              </div>

              {/* Compensación */}
              <div style={{
                background: 'rgba(29, 158, 117, 0.12)',
                border: '1px solid rgba(29, 158, 117, 0.35)',
                borderLeft: '4px solid #1D9E75',
                borderRadius: '12px', padding: '14px',
                display: 'flex', flexDirection: 'column', gap: '12px',
              }}>
                <div style={{ fontSize: '11px', color: '#1D9E75', letterSpacing: '1.5px', fontWeight: 600 }}>
                  💰 COMPENSACIÓN
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>
                      Salario neto (RD$) <span style={{ color: '#E24B4A' }}>*</span>
                    </label>
                    <input type="number" step="0.01" min="0"
                      value={datosContrato.salario_neto}
                      onChange={(e) => actualizarCampo('salario_neto', e.target.value)}
                      placeholder="0.00"
                      style={{ ...inputStyle, fontFamily: 'monospace' }} />
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
                      Lo que el empleado recibe limpio
                    </div>
                  </div>

                  <div>
                    <label style={labelStyle}>
                      Frecuencia <span style={{ color: '#E24B4A' }}>*</span>
                    </label>
                    <select value={datosContrato.frecuencia_pago}
                      onChange={(e) => actualizarCampo('frecuencia_pago', e.target.value)}
                      style={inputStyle}>
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </div>
                </div>

                {datosContrato.salario_neto && parseFloat(datosContrato.salario_neto) > 0 && (
                  <div style={{
                    background: 'var(--color-bg-input)',
                    border: '1px solid var(--color-border-subtle)',
                    borderRadius: '10px', padding: '12px',
                  }}>
                    <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, marginBottom: '8px', letterSpacing: '0.5px' }}>
                      CÁLCULO TRANSPARENTE:
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Salario neto</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#1D9E75', fontFamily: 'monospace' }}>
                          RD$ {Number(datosContrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>+ TSS+AFP (5.74%)</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-secondary)', fontFamily: 'monospace' }}>
                          RD$ {(salarioBrutoCalculado - parseFloat(datosContrato.salario_neto)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>= Salario bruto</div>
                        <div style={{ fontSize: '13px', fontWeight: 700, color: '#378ADD', fontFamily: 'monospace' }}>
                          RD$ {salarioBrutoCalculado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Logística */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <div>
                  <label style={labelStyle}>Horario de trabajo</label>
                  <input type="text" value={datosContrato.horario_trabajo}
                    onChange={(e) => actualizarCampo('horario_trabajo', e.target.value)}
                    placeholder="Ej: 5:00 AM - 1:00 PM" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Días laborales</label>
                  <input type="text" value={datosContrato.dias_laborales}
                    onChange={(e) => actualizarCampo('dias_laborales', e.target.value)}
                    placeholder="Ej: Lunes a Viernes" style={inputStyle} />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Lugar de trabajo</label>
                <input type="text" value={datosContrato.lugar_trabajo}
                  onChange={(e) => actualizarCampo('lugar_trabajo', e.target.value)}
                  placeholder="Dirección de la cocina" style={inputStyle} />
              </div>

              <div>
                <label style={labelStyle}>Notas adicionales (opcional)</label>
                <textarea value={datosContrato.notas}
                  onChange={(e) => actualizarCampo('notas', e.target.value)}
                  rows={2}
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
            </div>
          )}

          {/* PASO 4: CONFIRMAR */}
          {paso === 4 && empleadoSeleccionado && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{
                background: 'rgba(127, 119, 221, 0.12)',
                border: '1px solid rgba(127, 119, 221, 0.35)',
                borderLeft: '4px solid #7F77DD',
                borderRadius: '12px', padding: '16px',
              }}>
                <div style={{ fontSize: '11px', color: '#7F77DD', letterSpacing: '1.5px', fontWeight: 600, marginBottom: '12px' }}>
                  ✅ RESUMEN DEL CONTRATO
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px' }}>
                  <FilaResumen label="Empleado" valor={empleadoSeleccionado.nombre} />
                  <FilaResumen label="Tipo" valor={
                    tipoContrato === 'obra_servicio' ? '📑 Obra/Servicio PAE' :
                    tipoContrato === 'estacional' ? '🌾 Estacional' :
                    '♾️ Indefinido'
                  } />
                  <FilaResumen label="Puesto" valor={datosContrato.puesto} />
                  {tipoContrato === 'obra_servicio' && (
                    <FilaResumen label="Año escolar" valor={datosContrato.año_escolar_inabie} />
                  )}
                  <FilaResumen label="Fecha inicio" valor={datosContrato.fecha_inicio} />
                  {tipoContrato !== 'indefinido' && (
                    <FilaResumen label="Fecha fin" valor={datosContrato.fecha_fin} />
                  )}
                  <FilaResumen
                    label="Salario neto"
                    valor={`RD$ ${Number(datosContrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })} ${datosContrato.frecuencia_pago}`}
                    valorColor="#1D9E75"
                  />
                  <FilaResumen
                    label="Salario bruto"
                    valor={`RD$ ${salarioBrutoCalculado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}`}
                    valorColor="#378ADD"
                    sinBorde
                  />
                </div>
              </div>

              <div style={{
                background: 'rgba(55, 138, 221, 0.12)',
                border: '1px solid rgba(55, 138, 221, 0.35)',
                borderLeft: '4px solid #378ADD',
                borderRadius: '10px', padding: '12px',
                fontSize: '12px', color: 'var(--color-text-secondary)',
              }}>
                <div style={{ fontWeight: 600, color: '#378ADD', marginBottom: '4px' }}>📌 Después de crear:</div>
                El contrato quedará como <strong style={{ color: 'var(--color-text-primary)' }}>borrador</strong>. Podrás continuar con la firma presencial (empleador + empleado) desde la vista de contratos.
              </div>

              {error && (
                <div style={{
                  background: 'rgba(244, 67, 54, 0.12)',
                  border: '1px solid rgba(244, 67, 54, 0.35)',
                  borderRadius: '10px', padding: '12px',
                  fontSize: '12px', color: '#F4C0D1',
                }}>⚠️ {error}</div>
              )}
            </div>
          )}
        </div>

        {/* FOOTER navegación */}
        <div style={{
          padding: '14px 24px',
          borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-elevated)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '10px', flexWrap: 'wrap',
        }}>
          <button onClick={() => {
            if (paso === 1) { onCerrar() }
            else if (paso === 2 && empleadoPreseleccionado) { onCerrar() }
            else { setPaso(paso - 1); setError('') }
          }} disabled={guardando} style={{
            padding: '12px 18px',
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '10px',
            color: 'var(--color-text-secondary)',
            fontSize: '13px', fontWeight: 500,
            cursor: guardando ? 'not-allowed' : 'pointer',
            opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
          }}>
            {paso === 1 ? 'Cancelar' : '← Atrás'}
          </button>

          {paso < 4 && (
            <button onClick={() => {
              if (paso === 1 && !empleadoSeleccionado) { setError('Selecciona un empleado para continuar'); return }
              if (paso === 3 && !validarPaso3()) return
              setPaso(paso + 1); setError('')
            }} disabled={paso === 1 && !empleadoSeleccionado} style={{
              padding: '12px 22px',
              background: paso === 1 && !empleadoSeleccionado
                ? 'var(--color-bg-input)'
                : 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
              border: paso === 1 && !empleadoSeleccionado ? '1px solid var(--color-border-subtle)' : 'none',
              borderRadius: '10px',
              color: paso === 1 && !empleadoSeleccionado ? 'var(--color-text-muted)' : 'white',
              fontSize: '13px', fontWeight: 600,
              cursor: (paso === 1 && !empleadoSeleccionado) ? 'not-allowed' : 'pointer',
              fontFamily: 'inherit',
            }}>Siguiente →</button>
          )}

          {paso === 4 && (
            <button onClick={crearContrato} disabled={guardando} style={{
              padding: '12px 22px',
              background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontSize: '13px', fontWeight: 600,
              cursor: guardando ? 'not-allowed' : 'pointer',
              opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
            }}>
              {guardando ? '⏳ Creando contrato...' : '✅ Crear contrato'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Helper para filas del resumen
function FilaResumen({ label, valor, valorColor, sinBorde }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      paddingBottom: sinBorde ? 0 : '8px',
      borderBottom: sinBorde ? 'none' : '1px solid rgba(127, 119, 221, 0.2)',
      gap: '12px', flexWrap: 'wrap',
    }}>
      <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{label}:</span>
      <span style={{
        fontWeight: 600,
        color: valorColor || 'var(--color-text-primary)',
        fontSize: '13px', textAlign: 'right',
      }}>{valor}</span>
    </div>
  )
}

export default ModalNuevoContrato