import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { registrar, TIPOS_ACCION } from '../../utils/historial'
import ModalPesajeCrudo from '../pesaje/ModalPesajeCrudo'

// ─── Colores por categoría de módulos ───
const CATEGORIAS = {
  finanzas:    { color: '#85B7EB', colorOscuro: '#185FA5', glow: 'rgba(55, 138, 221, 0.15)', icon: 'cash', label: 'Finanzas' },
  inventario:  { color: '#FAC775', colorOscuro: '#BA7517', glow: 'rgba(239, 159, 39, 0.15)', icon: 'package', label: 'Inventario & Compras' },
  personal:    { color: '#ED93B1', colorOscuro: '#D4537E', glow: 'rgba(212, 83, 126, 0.15)', icon: 'users', label: 'Personal' },
  operacion:   { color: '#AFA9EC', colorOscuro: '#534AB7', glow: 'rgba(127, 119, 221, 0.15)', icon: 'brain', label: 'Operación & Configuración' },
}

function DashboardDelDia({ 
  usuario, 
  empresaId, 
  onCerrarSesion, 
  onCambiarUsuario,
  onIrConfiguracion, 
  onIrCierre, 
  onIrCalculadora, 
  onIrInteligencia, 
  onIrDespacho, 
  onIrEmpleados,
  onIrContratos,
  onIrMiContrato,
  onIrMisRecibos,
  onIrCompras,
  onIrIngredientes,
  onIrGastos,
  onIrNomina,
  onIrCatalogo,
  onIrHistorial,
  onIrFactura,
  onIrConduces,
  onVerComoSecretaria 
}) {
  const [empresa, setEmpresa] = useState(null)
  const [escuelas, setEscuelas] = useState([])
  const [operacionesHoy, setOperacionesHoy] = useState([])
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [modalSinClase, setModalSinClase] = useState(null)
  const [razonSinClase, setRazonSinClase] = useState('')
  const [yaSePesoHoy, setYaSePesoHoy] = useState(false)
  const [modalPesajeAbierto, setModalPesajeAbierto] = useState(false)
  const [modoEdicionCrudo, setModoEdicionCrudo] = useState(false)
  const [modalProximamente, setModalProximamente] = useState(null)

  // ─── Tema (persiste de pantallas anteriores) ───
  const [tema, setTema] = useState(() => {
    return localStorage.getItem('cocina_pae_tema') || 'oscuro'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)

    const { data: empresaData } = await supabase
      .from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)

    const { data: escuelasData } = await supabase
      .from('escuelas').select('*').eq('empresa_id', empresaId).eq('activa', true)
    setEscuelas(escuelasData || [])

    const fechaHoy = new Date().toISOString().split('T')[0]
    const { data: opsData } = await supabase
      .from('operaciones_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('fecha', fechaHoy)
    setOperacionesHoy(opsData || [])

    const { count: countCrudo } = await supabase
      .from('movimientos_inventario')
      .select('id', { count: 'exact', head: true })
      .eq('empresa_id', empresaId)
      .eq('fecha', fechaHoy)
      .eq('origen', 'consumo_operacion')
    setYaSePesoHoy((countCrudo || 0) > 0)

    setCargando(false)
  }

  function confirmarCerrarSesion() {
    const confirmar = window.confirm('¿Estás seguro de cerrar sesión? Tendrás que ingresar las credenciales de la empresa nuevamente.')
    if (confirmar && onCerrarSesion) {
      onCerrarSesion()
    }
  }

  function mostrarProximamente(nombreModulo) {
    setModalProximamente(nombreModulo)
  }

  async function iniciarEscuela(escuela) {
    setProcesando(true)
    const fechaHoy = new Date().toISOString().split('T')[0]
    
    const nuevaOp = {
      empresa_id: empresaId,
      escuela_id: escuela.id,
      fecha: fechaHoy,
      raciones_planificadas: escuela.raciones_contractuales || 0,
      estado: 'preparando',
      hora_inicio_preparacion: new Date().toISOString(),
      despachador_id: usuario.id,
    }

    const { data: opCreada, error } = await supabase
      .from('operaciones_dia')
      .insert([nuevaOp])
      .select()
      .single()

    if (error) {
      alert('Error al iniciar la escuela: ' + error.message)
      setProcesando(false)
      return
    }

    await registrar({
      empresaId,
      usuario,
      tipoAccion: TIPOS_ACCION.ESCUELA_INICIADA,
      descripcion: `Inició preparación de ${escuela.nombre} (${escuela.raciones_contractuales || 0} raciones)`,
      entidad: 'operacion_dia',
      entidadId: opCreada?.id,
      detallesExtra: {
        escuela_nombre: escuela.nombre,
        escuela_id: escuela.id,
        raciones: escuela.raciones_contractuales || 0
      }
    })

    await cargarDatos()
    setProcesando(false)
  }

  async function iniciarTodas() {
    const escuelasPendientes = escuelas.filter(e => {
      const op = operacionesHoy.find(o => o.escuela_id === e.id)
      return !op
    })

    if (escuelasPendientes.length === 0) {
      alert('No hay escuelas pendientes para iniciar')
      return
    }

    const confirmar = window.confirm(
      `¿Iniciar la preparación para ${escuelasPendientes.length} escuela(s)?\n\n` +
      escuelasPendientes.map(e => `• ${e.nombre} (${e.raciones_contractuales} raciones)`).join('\n')
    )

    if (!confirmar) return

    setProcesando(true)
    const fechaHoy = new Date().toISOString().split('T')[0]
    const ahora = new Date().toISOString()

    const operacionesNuevas = escuelasPendientes.map(escuela => ({
      empresa_id: empresaId,
      escuela_id: escuela.id,
      fecha: fechaHoy,
      raciones_planificadas: escuela.raciones_contractuales || 0,
      estado: 'preparando',
      hora_inicio_preparacion: ahora,
      despachador_id: usuario.id,
    }))

    const { data: opsCreadas, error } = await supabase
      .from('operaciones_dia')
      .insert(operacionesNuevas)
      .select()

    if (error) {
      alert('Error al iniciar las escuelas: ' + error.message)
      setProcesando(false)
      return
    }

    const totalRaciones = escuelasPendientes.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0)
    
    await registrar({
      empresaId,
      usuario,
      tipoAccion: TIPOS_ACCION.ESCUELA_INICIADA,
      descripcion: `🚀 Inició día completo: ${escuelasPendientes.length} escuela(s) · ${totalRaciones.toLocaleString()} raciones totales`,
      entidad: 'operacion_dia',
      detallesExtra: {
        escuelas: escuelasPendientes.map(e => ({
          id: e.id,
          nombre: e.nombre,
          raciones: e.raciones_contractuales || 0
        })),
        total_raciones: totalRaciones,
        cantidad_escuelas: escuelasPendientes.length
      }
    })

    await cargarDatos()
    setProcesando(false)
  }

  async function marcarLista(operacion) {
    setProcesando(true)
    
    const escuela = escuelas.find(e => e.id === operacion.escuela_id)
    const nombreEscuela = escuela?.nombre || 'Escuela'
    
    const { error } = await supabase
      .from('operaciones_dia')
      .update({
        estado: 'lista',
        hora_lista: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', operacion.id)

    if (error) {
      alert('Error al marcar como lista: ' + error.message)
      setProcesando(false)
      return
    }

    await registrar({
      empresaId,
      usuario,
      tipoAccion: TIPOS_ACCION.ESCUELA_LISTA,
      descripcion: `Marcó comida lista para ${nombreEscuela}`,
      entidad: 'operacion_dia',
      entidadId: operacion.id,
      detallesExtra: {
        escuela_nombre: nombreEscuela,
        escuela_id: operacion.escuela_id,
        raciones: operacion.raciones_planificadas
      }
    })

    await cargarDatos()
    setProcesando(false)
  }

  function abrirModalSinClase(escuela) {
    setModalSinClase(escuela)
    setRazonSinClase('')
  }

  async function confirmarSinClase() {
    if (!modalSinClase) return
    if (!razonSinClase.trim()) {
      alert('Por favor indica la razón por la cual no hay clase')
      return
    }

    setProcesando(true)
    const fechaHoy = new Date().toISOString().split('T')[0]

    const nuevaOp = {
      empresa_id: empresaId,
      escuela_id: modalSinClase.id,
      fecha: fechaHoy,
      raciones_planificadas: 0,
      estado: 'sin_clase',
      razon_no_clase: razonSinClase.trim(),
      despachador_id: usuario.id,
    }

    const { data: opCreada, error } = await supabase
      .from('operaciones_dia')
      .insert([nuevaOp])
      .select()
      .single()

    if (error) {
      alert('Error al marcar sin clase: ' + error.message)
      setProcesando(false)
      return
    }

    await registrar({
      empresaId,
      usuario,
      tipoAccion: TIPOS_ACCION.ESCUELA_SIN_CLASE,
      descripcion: `🚫 Marcó ${modalSinClase.nombre} como SIN CLASE: "${razonSinClase.trim()}"`,
      entidad: 'operacion_dia',
      entidadId: opCreada?.id,
      detallesExtra: {
        escuela_nombre: modalSinClase.nombre,
        escuela_id: modalSinClase.id,
        razon: razonSinClase.trim()
      }
    })

    setModalSinClase(null)
    setRazonSinClase('')
    await cargarDatos()
    setProcesando(false)
  }

  async function pesajeAprobado() {
    setModalPesajeAbierto(false)
    setModoEdicionCrudo(false)
    await cargarDatos()
  }

  // ─── KPIs calculados ───
  const totalRacionesHoy = operacionesHoy
    .filter(op => op.estado !== 'sin_clase')
    .reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)

  const facturacionHoy = operacionesHoy.reduce((sum, op) => {
    if (op.estado === 'sin_clase') return sum
    const escuela = escuelas.find(e => e.id === op.escuela_id)
    return sum + ((op.raciones_planificadas || 0) * (parseFloat(escuela?.precio_racion) || 0))
  }, 0)

  const escuelasAtendidas = operacionesHoy.filter(op => 
    op.estado === 'entregada' || op.estado === 'cerrada'
  ).length

  const escuelasPendientesCount = escuelas.filter(e => {
    const op = operacionesHoy.find(o => o.escuela_id === e.id)
    return !op
  }).length

  const operacionesPreparando = operacionesHoy.filter(op => 
    op.estado === 'preparando' || op.estado === 'lista' || op.estado === 'despachando' || op.estado === 'entregada' || op.estado === 'cerrada'
  )
  const todasDecididas = escuelasPendientesCount === 0
  const hayEscuelasIniciadas = operacionesPreparando.length > 0
  const mostrarBotonPesaje = todasDecididas && hayEscuelasIniciadas && !yaSePesoHoy

  const escuelasEntregadas = operacionesHoy.filter(op => 
    op.estado === 'entregada' || op.estado === 'cerrada'
  ).length
  const escuelasEnCamino = operacionesHoy.filter(op => op.estado === 'despachando').length
  const escuelasOperativas = escuelas.length - operacionesHoy.filter(op => op.estado === 'sin_clase').length
  const todasEntregadas = escuelasOperativas > 0 && escuelasEntregadas >= escuelasOperativas
  const mostrarBotonDespacho = yaSePesoHoy && hayEscuelasIniciadas && !todasEntregadas

  // ─── Próximo evento ───
  const proximoEvento = mostrarBotonDespacho 
    ? '🚚 Despachar' 
    : mostrarBotonPesaje 
      ? '🥘 Pesar ingredientes'
      : escuelasPendientesCount > 0
        ? '🚀 Iniciar día'
        : todasEntregadas
          ? '🏆 Día completado'
          : '⏰ Esperando'

  if (cargando) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando dashboard...</p>
      </div>
    )
  }

  const fechaHoyTexto = new Date().toLocaleDateString('es-DO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const fechaCorta = new Date().toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        position: 'relative',
        padding: '20px',
        color: 'var(--color-text-primary)',
      }}
    >
      {/* Resplandores radiales del fondo */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: Sin clase
          ═══════════════════════════════════════════════════════════════ */}
      {modalSinClase && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'var(--color-bg-elevated)',
            backdropFilter: 'blur(20px)',
            border: '0.5px solid var(--color-border-accent)',
            borderRadius: '16px',
            padding: '24px',
            maxWidth: '440px',
            width: '100%',
          }}>
            <h3 style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
              🚫 Sin clase hoy
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 16px' }}>
              Marcar <strong style={{ color: 'var(--color-text-accent)' }}>{modalSinClase.nombre}</strong> como sin clase hoy. No se facturará a INABIE.
            </p>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: 500, color: 'var(--color-text-muted)', marginBottom: '6px', letterSpacing: '0.5px' }}>
              RAZÓN (obligatoria)
            </label>
            <textarea
              value={razonSinClase}
              onChange={(e) => setRazonSinClase(e.target.value)}
              placeholder="Ej: Día feriado, suspensión por lluvia, evento escolar, etc."
              rows={3}
              autoFocus
              style={{
                width: '100%', boxSizing: 'border-box',
                background: 'var(--color-bg-input)',
                border: '0.5px solid var(--color-border-subtle)',
                borderRadius: '10px',
                padding: '10px 12px',
                color: 'var(--color-text-primary)',
                fontSize: '13px',
                fontFamily: 'inherit',
                resize: 'none',
                marginBottom: '16px',
                outline: 'none',
              }}
            />
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={confirmarSinClase}
                disabled={procesando}
                style={{
                  flex: 1, padding: '12px',
                  background: 'var(--gradient-button)',
                  border: 'none', borderRadius: '10px',
                  color: 'white', fontSize: '13px', fontWeight: 500,
                  cursor: procesando ? 'not-allowed' : 'pointer',
                  opacity: procesando ? 0.6 : 1,
                  fontFamily: 'inherit',
                }}
              >
                {procesando ? '⏳ Guardando...' : '🚫 Confirmar sin clase'}
              </button>
              <button
                onClick={() => { setModalSinClase(null); setRazonSinClase('') }}
                disabled={procesando}
                style={{
                  padding: '12px 16px',
                  background: 'var(--color-bg-elevated)',
                  border: '0.5px solid var(--color-border-subtle)',
                  borderRadius: '10px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit',
                }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MODAL: Próximamente
          ═══════════════════════════════════════════════════════════════ */}
      {modalProximamente && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'var(--color-bg-elevated)',
            backdropFilter: 'blur(20px)',
            border: '0.5px solid var(--color-border-accent)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>🚧</div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
              Próximamente
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--color-text-accent)' }}>{modalProximamente}</strong>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Esta función estará disponible en una próxima actualización. Estamos trabajando en ella.
            </p>
            <button
              onClick={() => setModalProximamente(null)}
              style={{
                width: '100%', padding: '12px',
                background: 'var(--gradient-button)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {modalPesajeAbierto && (
        <ModalPesajeCrudo
          empresaId={empresaId}
          usuario={usuario}
          operacionesPreparando={operacionesPreparando}
          escuelas={escuelas}
          modoEdicion={modoEdicionCrudo}
          onCerrar={() => {
            setModalPesajeAbierto(false)
            setModoEdicionCrudo(false)
          }}
          onAprobado={pesajeAprobado}
        />
      )}

      {/* ═══════════════════════════════════════════════════════════════
          HEADER: Logo + saludo + fecha + toggle tema
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'var(--gradient-logo)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 500, color: '#FAC775',
            position: 'relative',
          }}>
            A
            <div style={{ position: 'absolute', top: '5px', right: '7px', width: '3px', height: '3px', borderRadius: '50%', background: '#FAC775' }} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-accent)', opacity: 0.7, letterSpacing: '1.5px', fontWeight: 500 }}>
              ANDAMIO · {empresa?.nombre?.toUpperCase()}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              Hola, {usuario.nombre.split(' ')[0]}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Chip fecha */}
          <div style={{
            background: 'var(--color-bg-elevated)',
            border: '0.5px solid var(--color-border-subtle)',
            borderRadius: '20px', padding: '7px 14px',
            fontSize: '11px', color: 'var(--color-text-secondary)',
            display: 'flex', alignItems: 'center', gap: '6px',
            textTransform: 'capitalize',
          }}>
            📅 {fechaCorta}
          </div>

          {/* Toggle tema */}
          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--color-bg-elevated)',
            border: '0.5px solid var(--color-border-subtle)',
            borderRadius: '20px', padding: '3px', gap: '2px',
          }}>
            <button
              type="button"
              onClick={() => setTema('oscuro')}
              style={{
                background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
                border: 'none', borderRadius: '16px', padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: '11px' }}>🌙</span>
              <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>
                Oscuro
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTema('tropical')}
              style={{
                background: tema === 'tropical' ? 'var(--gradient-toggle-active)' : 'transparent',
                border: 'none', borderRadius: '16px', padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
                transition: 'all 0.3s ease',
              }}
            >
              <span style={{ fontSize: '11px' }}>☀️</span>
              <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>
                Claro
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          OPERACIÓN DE HOY - KPIs + Próximo
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ fontSize: '14px' }}>🔥</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-accent)', opacity: 0.7, letterSpacing: '1.5px', fontWeight: 500 }}>
            OPERACIÓN DE HOY
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <div style={{
            background: 'var(--color-bg-card)',
            border: '0.5px solid var(--color-border-subtle)',
            borderRadius: '12px', padding: '14px',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Raciones planificadas</div>
            <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {totalRacionesHoy.toLocaleString()}
            </div>
          </div>
          <div style={{
            background: 'var(--color-bg-card)',
            border: '0.5px solid var(--color-border-subtle)',
            borderRadius: '12px', padding: '14px',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Escuelas atendidas</div>
            <div style={{ fontSize: '22px', fontWeight: 500 }}>
              <span style={{ color: '#5DCAA5' }}>{escuelasAtendidas}</span>
              <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>/{escuelas.length}</span>
            </div>
          </div>
          <div style={{
            background: 'var(--color-bg-card)',
            border: '0.5px solid var(--color-border-subtle)',
            borderRadius: '12px', padding: '14px',
          }}>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Facturado hoy</div>
            <div style={{ fontSize: '22px', fontWeight: 500, color: '#FAC775' }}>
              RD$ {(facturacionHoy / 1000).toFixed(1)}K
            </div>
          </div>
          <div style={{
            background: 'rgba(83, 74, 183, 0.12)',
            border: '0.5px solid rgba(127, 119, 221, 0.3)',
            borderRadius: '12px', padding: '14px',
          }}>
            <div style={{ fontSize: '10px', color: '#AFA9EC', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
              ⚡ Próximo
            </div>
            <div style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
              {proximoEvento}
            </div>
          </div>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          BLOQUE: Iniciar día / Pesar / Despachar (operativo)
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
        {escuelasPendientesCount > 0 && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(29, 158, 117, 0.18) 0%, rgba(15, 110, 86, 0.08) 100%)',
            border: '0.5px solid rgba(29, 158, 117, 0.3)',
            borderRadius: '14px', padding: '18px', marginBottom: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '16px', flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#5DCAA5', letterSpacing: '1.5px', fontWeight: 500, marginBottom: '6px' }}>
                ACCIÓN DEL DÍA
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                🚀 Iniciar día completo
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {escuelasPendientesCount} escuela(s) pendiente(s) · Inicia preparación de todas a la vez
              </div>
            </div>
            <button
              onClick={iniciarTodas}
              disabled={procesando}
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 500,
                cursor: procesando ? 'not-allowed' : 'pointer',
                opacity: procesando ? 0.6 : 1,
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              {procesando ? '⏳ Iniciando...' : `🚀 Iniciar ${escuelasPendientesCount} escuela(s)`}
            </button>
          </div>
        )}

        {mostrarBotonPesaje && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(239, 159, 39, 0.18) 0%, rgba(186, 117, 23, 0.08) 100%)',
            border: '0.5px solid rgba(239, 159, 39, 0.3)',
            borderRadius: '14px', padding: '18px', marginBottom: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '16px', flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#FAC775', letterSpacing: '1.5px', fontWeight: 500, marginBottom: '6px' }}>
                SIGUIENTE PASO
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                🥘 Iniciar Pesaje
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {operacionesPreparando.length} escuela(s) · {totalRacionesHoy.toLocaleString()} raciones · Pesa todos los ingredientes crudos
              </div>
            </div>
            <button
              onClick={() => { setModoEdicionCrudo(false); setModalPesajeAbierto(true) }}
              disabled={procesando}
              style={{
                padding: '12px 20px',
                background: 'var(--gradient-button)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 500,
                cursor: procesando ? 'not-allowed' : 'pointer',
                opacity: procesando ? 0.6 : 1,
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              🥘 Pesar ingredientes
            </button>
          </div>
        )}

        {yaSePesoHoy && hayEscuelasIniciadas && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(29, 158, 117, 0.15) 0%, rgba(15, 110, 86, 0.05) 100%)',
            border: '0.5px solid rgba(29, 158, 117, 0.25)',
            borderRadius: '14px', padding: '14px 18px', marginBottom: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px', flexWrap: 'wrap',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span style={{ fontSize: '24px' }}>✅</span>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                  Pesaje crudo aprobado
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                  Ingredientes ya descontados del inventario · {totalRacionesHoy.toLocaleString()} raciones
                </div>
              </div>
            </div>
            <button
              onClick={() => { setModoEdicionCrudo(true); setModalPesajeAbierto(true) }}
              style={{
                padding: '8px 14px',
                background: 'var(--color-bg-elevated)',
                border: '0.5px solid var(--color-border-subtle)',
                borderRadius: '20px',
                color: 'var(--color-text-secondary)',
                fontSize: '11px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ✏️ Editar
            </button>
          </div>
        )}

        {mostrarBotonDespacho && onIrDespacho && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(216, 90, 48, 0.2) 0%, rgba(153, 60, 29, 0.08) 100%)',
            border: '0.5px solid rgba(216, 90, 48, 0.35)',
            borderRadius: '14px', padding: '18px', marginBottom: '12px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '16px', flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: '10px', color: '#F0997B', letterSpacing: '1.5px', fontWeight: 500, marginBottom: '6px' }}>
                SIGUIENTE PASO
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
                🚚 Despachar y Entregar
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                {escuelasEntregadas} de {escuelasOperativas} entregadas
                {escuelasEnCamino > 0 && ` · ${escuelasEnCamino} en camino`}
              </div>
            </div>
            <button
              onClick={onIrDespacho}
              disabled={procesando}
              style={{
                padding: '12px 20px',
                background: 'linear-gradient(135deg, #D85A30 0%, #993C1D 100%)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 500,
                cursor: procesando ? 'not-allowed' : 'pointer',
                opacity: procesando ? 0.6 : 1,
                fontFamily: 'inherit', whiteSpace: 'nowrap',
              }}
            >
              🚚 Ir a Modo Despacho
            </button>
          </div>
        )}

        {todasEntregadas && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(29, 158, 117, 0.15) 0%, rgba(15, 110, 86, 0.05) 100%)',
            border: '0.5px solid rgba(29, 158, 117, 0.25)',
            borderRadius: '14px', padding: '14px 18px',
            display: 'flex', alignItems: 'center', gap: '12px',
          }}>
            <span style={{ fontSize: '24px' }}>🏆</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                Todas las escuelas entregadas y firmadas
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                {escuelasEntregadas} conduce(s) firmado(s) por los directores · Día completado
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          ESCUELAS DEL DÍA - Lista con estados
          ═══════════════════════════════════════════════════════════════ */}
      {escuelas.length > 0 && (
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px' }}>🏫</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 500 }}>
              ESCUELAS DEL DÍA
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {escuelas.map(escuela => {
              const op = operacionesHoy.find(o => o.escuela_id === escuela.id)
              const estado = op?.estado || 'pendiente'

              const ESTADO_INFO = {
                entregada:   { label: '✅ Entregada',   color: '#5DCAA5' },
                cerrada:     { label: '✅ Entregada',   color: '#5DCAA5' },
                despachando: { label: '🚚 En camino',   color: '#F0997B' },
                lista:       { label: '✅ Lista',       color: '#85B7EB' },
                preparando:  { label: '👨‍🍳 Preparando',  color: '#FAC775' },
                sin_clase:   { label: '🚫 Sin clase',   color: 'var(--color-text-muted)' },
                pendiente:   { label: '⏰ Pendiente',   color: 'var(--color-text-secondary)' },
              }
              const estadoInfo = ESTADO_INFO[estado] || ESTADO_INFO.pendiente

              return (
                <div key={escuela.id} style={{
                  background: 'var(--color-bg-card)',
                  border: '0.5px solid var(--color-border-subtle)',
                  borderRadius: '12px', padding: '14px 16px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  gap: '12px', flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: '200px' }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                      {escuela.nombre}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      {escuela.raciones_contractuales} raciones · RD$ {escuela.precio_racion}/ración
                    </div>
                    {op?.razon_no_clase && (
                      <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px', fontStyle: 'italic' }}>
                        📝 {op.razon_no_clase}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    <span style={{
                      background: `${estadoInfo.color}20`,
                      border: `0.5px solid ${estadoInfo.color}40`,
                      color: estadoInfo.color,
                      fontSize: '10px', fontWeight: 600,
                      padding: '4px 10px', borderRadius: '12px',
                      letterSpacing: '0.3px',
                    }}>
                      {estadoInfo.label}
                    </span>

                    {!op && (
                      <>
                        <button
                          onClick={() => iniciarEscuela(escuela)}
                          disabled={procesando}
                          style={{
                            padding: '6px 12px',
                            background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                            border: 'none', borderRadius: '8px',
                            color: 'white', fontSize: '11px', fontWeight: 500,
                            cursor: procesando ? 'not-allowed' : 'pointer',
                            opacity: procesando ? 0.6 : 1, fontFamily: 'inherit',
                          }}
                        >
                          ▶️ Iniciar
                        </button>
                        <button
                          onClick={() => abrirModalSinClase(escuela)}
                          disabled={procesando}
                          style={{
                            padding: '6px 12px',
                            background: 'var(--color-bg-elevated)',
                            border: '0.5px solid var(--color-border-subtle)',
                            borderRadius: '8px',
                            color: 'var(--color-text-secondary)',
                            fontSize: '11px', fontWeight: 500,
                            cursor: procesando ? 'not-allowed' : 'pointer',
                            opacity: procesando ? 0.6 : 1, fontFamily: 'inherit',
                          }}
                        >
                          🚫 Sin clase
                        </button>
                      </>
                    )}

                    {op?.estado === 'preparando' && (
                      <button
                        onClick={() => marcarLista(op)}
                        disabled={procesando}
                        style={{
                          padding: '6px 12px',
                          background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)',
                          border: 'none', borderRadius: '8px',
                          color: 'white', fontSize: '11px', fontWeight: 500,
                          cursor: procesando ? 'not-allowed' : 'pointer',
                          opacity: procesando ? 0.6 : 1, fontFamily: 'inherit',
                        }}
                      >
                        ✅ Marcar lista
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════
          MÓDULOS - 4 categorías
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <span style={{ fontSize: '14px' }}>📂</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 500 }}>
            MÓDULOS
          </span>
        </div>

        {/* ─── Categoría: FINANZAS ─── */}
        <CategoriaBanner cat={CATEGORIAS.finanzas} icon="💰" count={4}>
          <Modulo emoji="🧾" label="Factura INABIE"   sublabel="Facturas mensuales" color={CATEGORIAS.finanzas.color} onClick={onIrFactura ? () => onIrFactura() : () => mostrarProximamente('Factura INABIE')} />
          <Modulo emoji="🚚" label="Conduces"         sublabel="Mes en curso"       color={CATEGORIAS.finanzas.color} onClick={onIrConduces ? () => onIrConduces() : () => mostrarProximamente('Conduces')} />
          <Modulo emoji="💸" label="Gastos"           sublabel="Categorías + RNC"   color={CATEGORIAS.finanzas.color} onClick={onIrGastos ? onIrGastos : () => mostrarProximamente('Gastos')} />
          <Modulo emoji="📊" label="Reportes DGII"    sublabel="606 · 607"          color={CATEGORIAS.finanzas.color} proximamente onClick={() => mostrarProximamente('Reportes DGII 606/607')} />
        </CategoriaBanner>

        {/* ─── Categoría: INVENTARIO ─── */}
        <CategoriaBanner cat={CATEGORIAS.inventario} icon="📦" count={4}>
          <Modulo emoji="🥕" label="Ingredientes" sublabel="Catálogo"      color={CATEGORIAS.inventario.color} onClick={onIrIngredientes ? onIrIngredientes : () => mostrarProximamente('Ingredientes')} />
          <Modulo emoji="🛒" label="Compras"       sublabel="Esta semana"   color={CATEGORIAS.inventario.color} onClick={onIrCompras ? onIrCompras : () => mostrarProximamente('Compras')} />
          <Modulo emoji="🏪" label="Proveedores"   sublabel="Con RNC"       color={CATEGORIAS.inventario.color} proximamente onClick={() => mostrarProximamente('Proveedores')} />
          <Modulo emoji="👨‍🍳" label="Recetas"      sublabel="Catálogo"      color={CATEGORIAS.inventario.color} onClick={onIrCatalogo ? onIrCatalogo : () => mostrarProximamente('Recetas')} />
        </CategoriaBanner>

        {/* ─── Categoría: PERSONAL ─── */}
        <CategoriaBanner cat={CATEGORIAS.personal} icon="👥" count={4}>
          <Modulo emoji="👤" label="Empleados"   sublabel="Equipo"          color={CATEGORIAS.personal.color} onClick={onIrEmpleados ? onIrEmpleados : () => mostrarProximamente('Empleados')} />
          <Modulo emoji="💵" label="Nómina"      sublabel="Pagos"           color={CATEGORIAS.personal.color} onClick={onIrNomina ? onIrNomina : () => mostrarProximamente('Nómina')} />
          <Modulo emoji="📄" label="Contratos"   sublabel="Por empleado"    color={CATEGORIAS.personal.color} onClick={onIrContratos ? onIrContratos : () => mostrarProximamente('Contratos')} />
          <Modulo emoji="🧮" label="Calculadora" sublabel="Liquidación"     color={CATEGORIAS.personal.color} onClick={onIrCalculadora ? onIrCalculadora : () => mostrarProximamente('Calculadora')} />
        </CategoriaBanner>

        {/* ─── Categoría: OPERACIÓN ─── */}
        <CategoriaBanner cat={CATEGORIAS.operacion} icon="🧠" count={4}>
          <Modulo emoji="💡" label="Inteligencia"    sublabel="Análisis"    color={CATEGORIAS.operacion.color} onClick={onIrInteligencia ? onIrInteligencia : () => mostrarProximamente('Inteligencia')} />
          <Modulo emoji="📜" label="Historial"       sublabel="Todas ops"   color={CATEGORIAS.operacion.color} onClick={onIrHistorial ? onIrHistorial : () => mostrarProximamente('Historial')} />
          <Modulo emoji="🏫" label="Centros INABIE"  sublabel={`${escuelas.length} escuelas`} color={CATEGORIAS.operacion.color} proximamente onClick={() => mostrarProximamente('Centros INABIE')} />
          <Modulo emoji="⚙️" label="Configuración"  sublabel="Empresa"     color={CATEGORIAS.operacion.color} onClick={onIrConfiguracion ? onIrConfiguracion : () => mostrarProximamente('Configuración')} />
        </CategoriaBanner>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════ */}
      <div style={{
        position: 'relative', zIndex: 1,
        paddingTop: '20px',
        borderTop: '0.5px solid var(--color-border-subtle)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🇩🇴</span>
          <span style={{
            color: 'var(--color-text-accent)', opacity: 0.6,
            fontSize: '10px', fontWeight: 500, letterSpacing: '0.5px',
          }}>
            Andamio · Modo {usuario.rol === 'propietario' ? 'Propietario' : 'Administrador'} · Sincronizado
          </span>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {onCambiarUsuario && (
            <button
              onClick={onCambiarUsuario}
              style={{
                background: 'var(--color-bg-elevated)',
                border: '0.5px solid var(--color-border-subtle)',
                borderRadius: '20px', padding: '7px 14px',
                color: 'var(--color-text-secondary)',
                fontSize: '11px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                fontFamily: 'inherit',
              }}
            >
              🔄 Cambiar usuario
            </button>
          )}
          <button
            onClick={confirmarCerrarSesion}
            style={{
              background: 'rgba(244, 67, 54, 0.1)',
              border: '0.5px solid rgba(244, 67, 54, 0.3)',
              borderRadius: '20px', padding: '7px 14px',
              color: '#F4C0D1',
              fontSize: '11px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              fontFamily: 'inherit',
            }}
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE: Banda de Categoría
// ═══════════════════════════════════════════════════════════════
function CategoriaBanner({ cat, icon, count, children }) {
  return (
    <div style={{
      background: `linear-gradient(135deg, ${cat.glow} 0%, ${cat.glow.replace('0.15', '0.05').replace('0.18', '0.05')} 100%)`,
      border: `0.5px solid ${cat.color}40`,
      borderRadius: '14px', padding: '16px 18px', marginBottom: '14px',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '14px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '20px' }}>{icon}</span>
          <span style={{ fontSize: '15px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
            {cat.label}
          </span>
        </div>
        <span style={{
          fontSize: '10px', color: cat.color,
          background: `${cat.color}15`, padding: '3px 8px', borderRadius: '8px',
        }}>
          {count} módulos
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px' }}>
        {children}
      </div>
    </div>
  )
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTE: Tarjeta de Módulo
// ═══════════════════════════════════════════════════════════════
function Modulo({ emoji, label, sublabel, color, onClick, proximamente }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--color-bg-card)',
        border: '0.5px solid var(--color-border-subtle)',
        borderRadius: '10px', padding: '10px 12px',
        cursor: 'pointer', textAlign: 'left',
        display: 'flex', flexDirection: 'column', gap: '4px',
        fontFamily: 'inherit', position: 'relative',
        transition: 'all 0.15s ease',
        opacity: proximamente ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = 'var(--color-bg-hover)'
        e.currentTarget.style.borderColor = `${color}60`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--color-bg-card)'
        e.currentTarget.style.borderColor = 'var(--color-border-subtle)'
      }}
    >
      {proximamente && (
        <span style={{
          position: 'absolute', top: '6px', right: '6px',
          fontSize: '8px', fontWeight: 600,
          background: 'rgba(250, 199, 117, 0.2)',
          color: '#FAC775',
          padding: '2px 6px', borderRadius: '6px',
          letterSpacing: '0.3px',
        }}>
          PRÓXIMO
        </span>
      )}
      <div style={{ fontSize: '16px', lineHeight: 1 }}>{emoji}</div>
      <div style={{ fontSize: '12px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
        {label}
      </div>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
        {sublabel}
      </div>
    </button>
  )
}

export default DashboardDelDia