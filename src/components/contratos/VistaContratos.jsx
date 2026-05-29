import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalNuevoContrato from './ModalNuevoContrato'
import ModalFirmaPresencial from './ModalFirmaPresencial'
import VistaDetalleContrato from './VistaDetalleContrato'

const MORADO = { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }
const NARANJA = { c: '#D85A30', claro: '#FCE9DA', dark: '#7A2F12' }
const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const GRIS = { c: '#888780', claro: '#EDECE7', dark: '#3A3936' }
const ROJO = { c: '#E24B4A', claro: '#FCEBEB', dark: '#7A1F1E' }

function VistaContratos({ usuario, empresaId, onVolver }) {
  const [empresa, setEmpresa] = useState(null)
  const [contratos, setContratos] = useState([])
  const [empleadosPendientes, setEmpleadosPendientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false)
  const [empleadoPreseleccionado, setEmpleadoPreseleccionado] = useState(null)
  const [contratoParaFirmar, setContratoParaFirmar] = useState(null)
  const [contratoParaVer, setContratoParaVer] = useState(null)

  // ════════ TEMA DUAL CON TOGGLE ════════
  const [tema, setTema] = useState(() => {
    if (typeof document === 'undefined') return 'oscuro'
    return localStorage.getItem('cocina_pae_tema') || 'oscuro'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const esTropical = tema === 'tropical'

  useEffect(() => { if (empresaId) cargarDatos() }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    const { data: empresaData } = await supabase.from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)
    const { data: contratosData, error: errorContratos } = await supabase
      .from('contratos_empleados')
      .select(`*, usuario:usuarios(id, nombre, rol, sexo, foto_url, cedula)`)
      .eq('empresa_id', empresaId).order('created_at', { ascending: false })
    if (errorContratos) console.error('Error cargando contratos:', errorContratos)
    else setContratos(contratosData || [])
    const { data: empleadosDigital } = await supabase
      .from('usuarios')
      .select('id, nombre, rol, sexo, foto_url, sueldo, frecuencia_pago, fecha_contratacion, cedula')
      .eq('empresa_id', empresaId).eq('activo', true)
      .eq('gestion_contrato', 'contrato_digital').neq('rol', 'propietario')
    if (empleadosDigital && empleadosDigital.length > 0) {
      const idsConContrato = (contratosData || []).map(c => c.usuario_id)
      const pendientes = empleadosDigital.filter(e => !idsConContrato.includes(e.id))
      setEmpleadosPendientes(pendientes)
    } else setEmpleadosPendientes([])
    setCargando(false)
  }

  const puedeGestionar = usuario && (usuario.rol === 'propietario' || usuario.rol === 'administrador')

  if (!puedeGestionar) {
    return (
      <div style={{ width: '100%', maxWidth: '1040px', margin: '0 auto', padding: '20px' }}>
        <div style={{
          background: esTropical ? ROJO.claro : `${ROJO.c}15`,
          border: `1px solid ${ROJO.c}40`, borderRadius: '16px', padding: '32px', textAlign: 'center',
        }}>
          <p style={{ fontSize: '36px', marginBottom: '12px' }}>🚫</p>
          <h2 style={{ fontSize: '20px', fontWeight: 700, color: esTropical ? ROJO.dark : '#F4C0D1', marginBottom: '8px' }}>Acceso restringido</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
            Solo el propietario y administrador pueden ver el listado completo de contratos.
          </p>
          <button onClick={onVolver}
            style={{
              background: `linear-gradient(135deg, ${ROJO.c} 0%, ${ROJO.dark} 100%)`,
              color: 'white', border: 'none', borderRadius: '10px', padding: '10px 20px',
              fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}>← Volver</button>
        </div>
      </div>
    )
  }

  if (contratoParaVer) {
    return <VistaDetalleContrato contratoId={contratoParaVer} onVolver={() => { setContratoParaVer(null); cargarDatos() }} />
  }

  function abrirModalConEmpleado(empleado) { setEmpleadoPreseleccionado(empleado); setModalNuevoAbierto(true) }
  function abrirModalNuevo() { setEmpleadoPreseleccionado(null); setModalNuevoAbierto(true) }
  function cerrarModalNuevo() { setModalNuevoAbierto(false); setEmpleadoPreseleccionado(null) }

  function contratoCreado(nuevoContrato) {
    setModalNuevoAbierto(false)
    setEmpleadoPreseleccionado(null)
    cargarDatos()
    if (confirm('✅ Contrato creado como borrador.\n\n¿Deseas firmarlo ahora?')) {
      setTimeout(async () => {
        const { data } = await supabase.from('contratos_empleados')
          .select(`*, usuario:usuarios(id, nombre, rol, sexo, foto_url, cedula)`)
          .eq('id', nuevoContrato.id).single()
        if (data) setContratoParaFirmar(data)
      }, 300)
    }
  }

  function abrirFirma(contrato) { setContratoParaFirmar(contrato) }
  function cerrarFirma() { setContratoParaFirmar(null) }
  function firmasCompletas() {
    setContratoParaFirmar(null)
    cargarDatos()
    alert('✅ Contrato activado exitosamente.\n\nYa puedes imprimirlo para archivo físico.')
  }

  function colorPorEstado(estado) {
    switch (estado) {
      case 'borrador': return AMBAR
      case 'pendiente_firma': return NARANJA
      case 'activo': return VERDE
      case 'terminado': return GRIS
      case 'renovado': return AZUL
      default: return GRIS
    }
  }
  function obtenerEmojiEstado(estado) {
    switch (estado) {
      case 'borrador': return '🟡'
      case 'pendiente_firma': return '🟠'
      case 'activo': return '🟢'
      case 'terminado': return '⚪'
      case 'renovado': return '🔵'
      default: return '⚫'
    }
  }
  function obtenerLabelTipoContrato(tipo) {
    switch (tipo) {
      case 'obra_servicio': return '📑 Obra/Servicio PAE'
      case 'estacional': return '🌾 Estacional'
      case 'indefinido': return '♾️ Indefinido'
      default: return tipo
    }
  }
  function obtenerLabelFrecuencia(freq) {
    return { semanal: 'semanal', quincenal: 'quincenal', mensual: 'mensual' }[freq] || freq
  }
  function obtenerAvatar(empleado) {
    if (!empleado) return '👤'
    if (empleado.foto_url) return null
    if (empleado.sexo === 'hombre') return '👨'
    if (empleado.sexo === 'mujer') return '👩'
    return empleado.nombre?.charAt(0)?.toUpperCase() || '?'
  }
  function formatearFecha(fechaStr) {
    if (!fechaStr) return '—'
    return new Date(fechaStr).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const contratosFiltrados = contratos.filter(c => {
    if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase()
      const nombre = c.usuario?.nombre?.toLowerCase() || ''
      const puesto = c.puesto?.toLowerCase() || ''
      if (!nombre.includes(termino) && !puesto.includes(termino)) return false
    }
    return true
  })

  const totalContratos = contratos.length
  const totalActivos = contratos.filter(c => c.estado === 'activo').length
  const totalBorradores = contratos.filter(c => c.estado === 'borrador' || c.estado === 'pendiente_firma').length
  const totalTerminados = contratos.filter(c => c.estado === 'terminado').length

  if (cargando) {
    return (
      <div style={{ width: '100%', maxWidth: '1040px', margin: '0 auto', padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>⏳ Cargando contratos...</div>
      </div>
    )
  }

  const fechaHoyTexto = new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ width: '100%', maxWidth: '1040px', margin: '0 auto', padding: '20px' }}>
      
      {modalNuevoAbierto && (
        <ModalNuevoContrato empresaId={empresaId} usuarioActual={usuario}
          empleadoPreseleccionado={empleadoPreseleccionado} empresa={empresa}
          onCerrar={cerrarModalNuevo} onContratoCreado={contratoCreado} />
      )}

      {contratoParaFirmar && (
        <ModalFirmaPresencial contrato={contratoParaFirmar} empresa={empresa}
          usuarioActual={usuario} onCerrar={cerrarFirma} onFirmasCompletas={firmasCompletas} />
      )}

      {/* ════════ TOGGLE DE TEMA ════════ */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <div style={{
          display: 'inline-flex',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '20px',
          padding: '3px',
          gap: '2px',
        }}>
          <button onClick={() => setTema('oscuro')} style={tabTemaStyle(tema === 'oscuro')}>
            <span style={{ fontSize: '11px' }}>🌙</span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
          </button>
          <button onClick={() => setTema('tropical')} style={tabTemaStyle(tema === 'tropical')}>
            <span style={{ fontSize: '11px' }}>☀️</span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
          </button>
        </div>
      </div>

      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #7F77DD 0%, #534AB7 100%)',
        borderRadius: '16px', padding: '24px', marginBottom: '24px', color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', opacity: 0.85, margin: 0 }}>CONTRATOS LABORALES</p>
            <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '4px 0' }}>📄 Gestión de Contratos</h2>
            <p style={{ fontSize: '13px', opacity: 0.85, margin: 0 }}>{empresa?.nombre} · {fechaHoyTexto}</p>
          </div>
          <button onClick={onVolver}
            style={{
              background: 'rgba(0,0,0,0.25)', color: 'white', border: 'none',
              borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>← Volver al panel</button>
        </div>
      </div>

      {/* ALERTA PENDIENTES */}
      {empleadosPendientes.length > 0 && (
        <div style={{
          background: esTropical ? AMBAR.claro : `${AMBAR.c}15`,
          border: `2px solid ${AMBAR.c}50`, borderRadius: '16px',
          padding: '20px', marginBottom: '24px',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', marginBottom: '14px' }}>
            <span style={{ fontSize: '28px' }}>⚠️</span>
            <div style={{ flex: 1 }}>
              <h3 style={{ fontWeight: 700, color: esTropical ? AMBAR.dark : '#FAC775', fontSize: '17px', margin: 0 }}>
                {empleadosPendientes.length} empleado{empleadosPendientes.length > 1 ? 's' : ''} pendiente{empleadosPendientes.length > 1 ? 's' : ''} de contrato
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', margin: '4px 0 0' }}>
                Est{empleadosPendientes.length > 1 ? 'án' : 'á'} marcado{empleadosPendientes.length > 1 ? 's' : ''} como "Generar contrato digital" pero aún NO tiene{empleadosPendientes.length > 1 ? 'n' : ''} contrato creado:
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginLeft: '48px' }}>
            {empleadosPendientes.map(emp => (
              <div key={emp.id} style={{
                background: 'var(--color-bg-elevated)', border: `1px solid ${AMBAR.c}30`,
                borderRadius: '10px', padding: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{
                    width: '40px', height: '40px', borderRadius: '50%',
                    background: esTropical ? AMBAR.claro : `${AMBAR.c}25`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px',
                    overflow: 'hidden',
                  }}>
                    {emp.foto_url ? <img src={emp.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : obtenerAvatar(emp)}
                  </div>
                  <div>
                    <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', margin: 0 }}>{emp.nombre}</p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                      {emp.rol}{emp.sueldo && ` · RD$ ${Number(emp.sueldo).toLocaleString('es-DO')} ${obtenerLabelFrecuencia(emp.frecuencia_pago)}`}
                    </p>
                  </div>
                </div>
                <button onClick={() => abrirModalConEmpleado(emp)}
                  style={{
                    background: `linear-gradient(135deg, ${AMBAR.c} 0%, ${AMBAR.dark} 100%)`,
                    color: 'white', border: 'none', borderRadius: '10px',
                    padding: '8px 14px', fontSize: '12px', fontWeight: 700,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>➕ Crear contrato</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESUMEN */}
      <div style={tarjetaStyle()}>
        <p style={labelStyle()}>📊 RESUMEN</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <KpiBoton activo={filtroEstado === 'todos'} onClick={() => setFiltroEstado('todos')} color={MORADO} esTropical={esTropical} valor={totalContratos} label="Total" colorValor="var(--color-text-primary)" />
          <KpiBoton activo={filtroEstado === 'activo'} onClick={() => setFiltroEstado('activo')} color={VERDE} esTropical={esTropical} valor={totalActivos} label="🟢 Activos" colorValor={VERDE.c} />
          <KpiBoton activo={filtroEstado === 'borrador'} onClick={() => setFiltroEstado('borrador')} color={AMBAR} esTropical={esTropical} valor={totalBorradores} label="🟡 Borradores" colorValor={AMBAR.c} />
          <KpiBoton activo={filtroEstado === 'terminado'} onClick={() => setFiltroEstado('terminado')} color={GRIS} esTropical={esTropical} valor={totalTerminados} label="⚪ Terminados" colorValor="var(--color-text-secondary)" />
        </div>
      </div>

      {/* BARRA ACCIONES */}
      <div style={{ ...tarjetaStyle(), padding: '16px' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center' }}>
          <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar empleado o puesto..."
            style={{ ...inputStyle(), flex: 1, minWidth: '200px' }} />
          <button onClick={abrirModalNuevo}
            style={{
              background: `linear-gradient(135deg, ${MORADO.c} 0%, ${MORADO.dark} 100%)`,
              color: 'white', border: 'none', borderRadius: '10px',
              padding: '10px 18px', fontSize: '13px', fontWeight: 700,
              cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
            }}>➕ Nuevo Contrato</button>
        </div>
        {filtroEstado !== 'todos' && (
          <div style={{ marginTop: '12px', fontSize: '13px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <span>Filtro activo:</span>
            <span style={{
              padding: '4px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
              background: esTropical ? colorPorEstado(filtroEstado).claro : `${colorPorEstado(filtroEstado).c}15`,
              border: `1px solid ${colorPorEstado(filtroEstado).c}40`,
              color: esTropical ? colorPorEstado(filtroEstado).dark : colorPorEstado(filtroEstado).c,
            }}>
              {obtenerEmojiEstado(filtroEstado)} {filtroEstado}
            </span>
            <button onClick={() => setFiltroEstado('todos')}
              style={{ background: 'none', border: 'none', color: MORADO.c, fontSize: '11px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
              ✕ Limpiar filtro
            </button>
          </div>
        )}
      </div>

      {/* LISTA */}
      {contratosFiltrados.length === 0 ? (
        <div style={{ ...tarjetaStyle(), padding: '48px', textAlign: 'center' }}>
          {contratos.length === 0 ? (
            <>
              <p style={{ fontSize: '52px', marginBottom: '16px' }}>📄</p>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>Aún no hay contratos creados</h3>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
                Los contratos laborales aparecerán aquí una vez que los crees desde el botón "➕ Nuevo Contrato".
              </p>
            </>
          ) : (
            <>
              <p style={{ fontSize: '36px', marginBottom: '12px' }}>🔍</p>
              <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '8px' }}>No se encontraron contratos</h3>
              <p style={{ color: 'var(--color-text-secondary)' }}>Prueba con otros términos de búsqueda o limpia los filtros.</p>
            </>
          )}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {contratosFiltrados.map(contrato => {
            const empleado = contrato.usuario
            const estaFirmado = contrato.firma_empleado_at && contrato.firma_propietario_at
            const colorEst = colorPorEstado(contrato.estado)
            
            return (
              <div key={contrato.id} style={{
                background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
                borderRadius: '16px', padding: '18px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'flex-start', justifyContent: 'space-between', gap: '14px' }}>
                  
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '14px', flex: 1, minWidth: '280px' }}>
                    <div style={{
                      width: '56px', height: '56px', borderRadius: '50%',
                      background: esTropical ? MORADO.claro : `${MORADO.c}25`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '22px', overflow: 'hidden', flexShrink: 0,
                    }}>
                      {empleado?.foto_url ? <img src={empleado.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : obtenerAvatar(empleado)}
                    </div>

                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                        <h3 style={{ fontWeight: 700, fontSize: '17px', color: 'var(--color-text-primary)', margin: 0 }}>
                          {empleado?.nombre || 'Empleado desconocido'}
                        </h3>
                        <span style={{
                          padding: '3px 10px', borderRadius: '999px', fontSize: '11px', fontWeight: 700,
                          background: esTropical ? colorEst.claro : `${colorEst.c}15`,
                          border: `1px solid ${colorEst.c}40`,
                          color: esTropical ? colorEst.dark : colorEst.c,
                        }}>
                          {obtenerEmojiEstado(contrato.estado)} {contrato.estado.replace('_', ' ')}
                        </span>
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 600 }}>
                          {obtenerLabelTipoContrato(contrato.tipo_contrato)}
                        </span>
                      </div>

                      <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
                        <strong style={{ color: 'var(--color-text-primary)' }}>{contrato.puesto}</strong>
                        {' · '}
                        RD$ {Number(contrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        {' '}{obtenerLabelFrecuencia(contrato.frecuencia_pago)}
                      </p>

                      {contrato.año_escolar_inabie && (
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                          📅 Año escolar {contrato.año_escolar_inabie}
                        </p>
                      )}

                      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>
                        🗓️ {formatearFecha(contrato.fecha_inicio)}
                        {contrato.fecha_fin && ` → ${formatearFecha(contrato.fecha_fin)}`}
                      </p>

                      {estaFirmado && (
                        <p style={{ fontSize: '11px', color: VERDE.c, marginTop: '4px', fontWeight: 600 }}>
                          ✅ Firmado el {formatearFecha(contrato.firma_propietario_at)}
                        </p>
                      )}

                      {contrato.estado === 'pendiente_firma' && (
                        <p style={{ fontSize: '11px', color: NARANJA.c, marginTop: '4px', fontWeight: 600 }}>
                          ⏳ Pendiente de firma
                        </p>
                      )}

                      {contrato.estado === 'borrador' && (
                        <p style={{ fontSize: '11px', color: AMBAR.c, marginTop: '4px', fontWeight: 600 }}>
                          📝 Borrador sin firmar
                        </p>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {(contrato.estado === 'activo' || contrato.estado === 'terminado' || contrato.estado === 'renovado') && (
                      <button onClick={() => setContratoParaVer(contrato.id)}
                        style={botonAccionStyle(MORADO)}>📄 Ver / Imprimir</button>
                    )}

                    {(contrato.estado === 'borrador' || contrato.estado === 'pendiente_firma') && (
                      <>
                        <button onClick={() => abrirFirma(contrato)} style={botonAccionStyle(NARANJA)}>✍️ Firmar</button>
                        <button onClick={() => setContratoParaVer(contrato.id)}
                          style={{
                            ...botonAccionStyle(MORADO),
                            background: esTropical ? MORADO.claro : `${MORADO.c}20`,
                            color: esTropical ? MORADO.dark : '#AFA9EC',
                          }}>👁️ Ver</button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function KpiBoton({ activo, onClick, color, esTropical, valor, label, colorValor }) {
  return (
    <button onClick={onClick}
      style={{
        background: activo ? (esTropical ? color.claro : `${color.c}15`) : 'var(--color-bg-card)',
        border: `2px solid ${activo ? color.c : 'var(--color-border-subtle)'}`,
        borderRadius: '14px', padding: '16px', textAlign: 'center',
        cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
      }}>
      <p style={{ fontSize: '26px', fontWeight: 700, color: colorValor, margin: 0 }}>{valor}</p>
      <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 600 }}>{label}</p>
    </button>
  )
}

function tabTemaStyle(activo) {
  return {
    background: activo ? 'var(--gradient-toggle-active)' : 'transparent',
    border: 'none', borderRadius: '16px', padding: '6px 10px',
    display: 'flex', alignItems: 'center', gap: '5px',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

function tarjetaStyle() {
  return {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '16px', padding: '24px', marginBottom: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  }
}

function labelStyle() {
  return { fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.5px', marginBottom: '14px' }
}

function inputStyle() {
  return {
    boxSizing: 'border-box', padding: '10px 14px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '14px',
    fontFamily: 'inherit', outline: 'none',
  }
}

function botonAccionStyle(color) {
  return {
    background: `linear-gradient(135deg, ${color.c} 0%, ${color.dark} 100%)`,
    color: 'white', border: 'none', borderRadius: '10px',
    padding: '8px 14px', fontSize: '12px', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

export default VistaContratos