import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const VERDE = { c: '#0F6E56', bg: '#1D9E75', claro: '#E1F5EE', dark: '#04342C' }

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

const INICIALES_DOW = ['D', 'L', 'M', 'M', 'J', 'V', 'S'] // getDay(): 0=Dom ... 6=Sab

const ROL_LABEL = {
  propietario: 'Propietaria', administrador: 'Administrador', secretaria: 'Secretaria',
  jefa_cocina: 'Jefa de cocina', despachador: 'Despachador', ayudante: 'Ayudante', contador: 'Contador',
}

function formatHora(iso) {
  return new Date(iso).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit', hour12: true })
}

function VistaAsistencia({ usuario, empresaId, onVolver }) {
  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth()) // 0-11
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [empleados, setEmpleados] = useState([])
  const [asistencias, setAsistencias] = useState([])
  const [cargando, setCargando] = useState(true)

  // ─── Corrección (tocar celda) ───
  const [celda, setCelda] = useState(null) // { emp, dia, fecha, registro }
  const [guardando, setGuardando] = useState(false)

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'

  useEffect(() => { if (empresaId) cargarDatos() }, [empresaId, mes, anio])

  async function cargarDatos() {
    setCargando(true)

    const { data: emps } = await supabase
      .from('usuarios')
      .select('id, nombre, rol')
      .eq('empresa_id', empresaId)
      .eq('activo', true)

    const ordenados = (emps || []).sort((a, b) => {
      if (a.rol === 'propietario') return -1
      if (b.rol === 'propietario') return 1
      return a.nombre.localeCompare(b.nombre)
    })
    setEmpleados(ordenados)

    const primerDia = `${anio}-${String(mes + 1).padStart(2, '0')}-01`
    const ultimoDiaNum = new Date(anio, mes + 1, 0).getDate()
    const ultimoDia = `${anio}-${String(mes + 1).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`

    const { data: asis } = await supabase
      .from('asistencias')
      .select('id, usuario_id, fecha, hora_entrada, origen')
      .eq('empresa_id', empresaId)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia)

    setAsistencias(asis || [])
    setCargando(false)
  }

  const diasEnMes = new Date(anio, mes + 1, 0).getDate()
  const dias = Array.from({ length: diasEnMes }, (_, i) => i + 1)

  function esFinde(dia) {
    const dow = new Date(anio, mes, dia).getDay()
    return dow === 0 || dow === 6
  }

  function fechaDe(dia) {
    return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`
  }

  // Mapa: "usuario_id|fecha" -> { id, hora, origen }
  const mapa = {}
  asistencias.forEach(a => {
    mapa[`${a.usuario_id}|${a.fecha}`] = { id: a.id, hora: a.hora_entrada, origen: a.origen }
  })

  function registroDe(usuarioId, dia) {
    return mapa[`${usuarioId}|${fechaDe(dia)}`] || null
  }

  function diasTrabajados(usuarioId) {
    let count = 0
    dias.forEach(d => { if (registroDe(usuarioId, d)) count++ })
    return count
  }

  function cambiarMes(delta) {
    let nuevoMes = mes + delta
    let nuevoAnio = anio
    if (nuevoMes < 0) { nuevoMes = 11; nuevoAnio-- }
    if (nuevoMes > 11) { nuevoMes = 0; nuevoAnio++ }
    setMes(nuevoMes)
    setAnio(nuevoAnio)
  }

  // ─── Abrir/cerrar corrección ───
  function abrirCelda(emp, dia) {
    setCelda({ emp, dia, fecha: fechaDe(dia), registro: registroDe(emp.id, dia) })
  }
  function cerrarCelda() {
    setCelda(null)
  }

  async function marcarManual() {
    if (!celda) return
    setGuardando(true)
    // Para marcas manuales guardamos la hora a mediodía de ese día (la hora real no se conoce)
    const horaManual = new Date(`${celda.fecha}T12:00:00`).toISOString()

    const { error } = await supabase.from('asistencias').insert([{
      empresa_id: empresaId,
      usuario_id: celda.emp.id,
      usuario_nombre: celda.emp.nombre,
      fecha: celda.fecha,
      hora_entrada: horaManual,
      origen: 'manual',
      registrado_por: usuario.id,
      registrado_por_nombre: usuario.nombre,
    }])

    setGuardando(false)
    if (error && error.code !== '23505') {
      alert('No se pudo guardar: ' + error.message)
      return
    }
    cerrarCelda()
    await cargarDatos()
  }

  async function quitarMarca() {
    if (!celda || !celda.registro) return
    setGuardando(true)
    const { error } = await supabase
      .from('asistencias')
      .delete()
      .eq('id', celda.registro.id)

    setGuardando(false)
    if (error) {
      alert('No se pudo quitar: ' + error.message)
      return
    }
    cerrarCelda()
    await cargarDatos()
  }

  const cellW = 18, gap = 2, nameW = 140

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando asistencia...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: '1100px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        {/* TÍTULO */}
        <div style={{
          background: esTropical ? `linear-gradient(135deg, ${VERDE.claro} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${VERDE.bg}25 0%, ${VERDE.bg}10 100%)`,
          border: esTropical ? `1.5px solid ${VERDE.bg}` : `1px solid ${VERDE.bg}55`,
          borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: esTropical ? VERDE.bg : `${VERDE.bg}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🕐</div>
          <div>
            <div style={{ fontSize: '10px', color: esTropical ? VERDE.c : `${VERDE.bg}CC`, letterSpacing: '1.5px', fontWeight: 600 }}>PERSONAL</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? VERDE.dark : 'var(--color-text-primary)', lineHeight: 1.2 }}>Asistencia</div>
            <div style={{ fontSize: '12px', color: esTropical ? VERDE.c : `${VERDE.bg}CC`, marginTop: '4px', fontWeight: 500 }}>Quién vino cada día</div>
          </div>
        </div>

        {/* SELECTOR DE MES */}
        <div style={{
          background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
          borderRadius: '14px', padding: '14px 20px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px',
        }}>
          <button onClick={() => cambiarMes(-1)} style={btnFlecha()}>←</button>
          <span style={{ fontSize: '16px', fontWeight: 600, color: 'var(--color-text-primary)', minWidth: '160px', textAlign: 'center' }}>
            {MESES[mes]} {anio}
          </span>
          <button onClick={() => cambiarMes(1)} style={btnFlecha()}>→</button>
        </div>

        {/* LEYENDA */}
        <div style={{ display: 'flex', gap: '18px', flexWrap: 'wrap', marginBottom: '14px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
          <Leyenda color={VERDE.bg} texto="Vino" />
          <Leyenda borde texto="No marcó" />
          <Leyenda finde texto="Fin de semana" />
          <Leyenda manual texto="Agregado a mano" />
        </div>

        {/* PLANILLA */}
        {empleados.length === 0 ? (
          <div style={{
            background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
            borderRadius: '14px', padding: '40px', textAlign: 'center',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>👥</div>
            <p style={{ fontSize: '14px', color: 'var(--color-text-muted)', margin: 0 }}>No hay empleados activos.</p>
          </div>
        ) : (
          <div style={{
            background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
            borderRadius: '14px', padding: '16px', boxShadow: 'var(--modulo-sombra)',
            overflowX: 'auto',
          }}>
            <div style={{ minWidth: `${nameW + dias.length * (cellW + gap)}px` }}>

              {/* Encabezado de días */}
              <div style={{ display: 'flex', alignItems: 'flex-end', marginBottom: '6px' }}>
                <div style={{ width: `${nameW}px`, flexShrink: 0 }} />
                {dias.map(d => {
                  const finde = esFinde(d)
                  const dow = new Date(anio, mes, d).getDay()
                  return (
                    <div key={d} style={{ width: `${cellW}px`, marginRight: `${gap}px`, textAlign: 'center', flexShrink: 0 }}>
                      <div style={{ fontSize: '9px', color: finde ? 'var(--color-text-muted)' : 'var(--color-text-secondary)', lineHeight: 1.1 }}>{INICIALES_DOW[dow]}</div>
                      <div style={{ fontSize: '10px', color: finde ? 'var(--color-text-muted)' : 'var(--color-text-secondary)', lineHeight: 1.3 }}>{d}</div>
                    </div>
                  )
                })}
              </div>

              {/* Filas de empleados */}
              {empleados.map(emp => {
                const total = diasTrabajados(emp.id)
                return (
                  <div key={emp.id} style={{ display: 'flex', alignItems: 'center', marginBottom: `${gap}px` }}>
                    <div style={{ width: `${nameW}px`, flexShrink: 0, paddingRight: '10px' }}>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {emp.nombre}
                      </div>
                      <div style={{ fontSize: '10px', color: VERDE.c }}>{total} {total === 1 ? 'día' : 'días'}</div>
                    </div>
                    {dias.map(d => {
                      const finde = esFinde(d)
                      const reg = registroDe(emp.id, d)
                      const esManual = reg && reg.origen === 'manual'
                      let bg = 'transparent', border = '1px solid var(--color-border-subtle)', title = 'No marcó'
                      if (finde && !reg) { bg = 'var(--color-bg-elevated)'; border = 'none'; title = 'Fin de semana' }
                      if (reg) {
                        bg = VERDE.bg; border = 'none'
                        title = esManual ? 'Vino (agregado a mano)' : `Vino · ${formatHora(reg.hora)}`
                      }
                      return (
                        <div
                          key={d}
                          onClick={() => abrirCelda(emp, d)}
                          title={`${emp.nombre} · ${d} ${MESES[mes].toLowerCase()} · ${title}`}
                          style={{
                            position: 'relative',
                            width: `${cellW}px`, height: '26px', marginRight: `${gap}px`,
                            borderRadius: '3px', background: bg, border, boxSizing: 'border-box', flexShrink: 0,
                            cursor: 'pointer',
                          }}
                        >
                          {esManual && (
                            <span style={{
                              position: 'absolute', top: '1px', right: '1px',
                              width: '5px', height: '5px', borderRadius: '50%',
                              background: '#FAC775',
                            }} />
                          )}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        <div style={{ marginTop: '14px', fontSize: '12px', color: 'var(--color-text-muted)', lineHeight: 1.6 }}>
          💡 Toca cualquier día para agregar o quitar una asistencia. El número al lado de cada nombre es el total de días que asistió en {MESES[mes]}. Pasa el mouse sobre un cuadrito verde para ver la hora.
        </div>

      </div>

      {/* ─── MODAL CORRECCIÓN ─── */}
      {celda && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100,
          background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }}>
          <div style={{
            background: 'var(--color-bg-primary)',
            border: '1px solid var(--color-border-accent)',
            borderRadius: '16px', maxWidth: '400px', width: '100%',
            boxShadow: '0 20px 60px rgba(0,0,0,0.4)', overflow: 'hidden',
          }}>
            {/* Header modal */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-subtle)' }}>
              <div style={{ fontSize: '10px', color: VERDE.bg, letterSpacing: '1.5px', fontWeight: 600 }}>CORREGIR ASISTENCIA</div>
              <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '4px' }}>
                {celda.emp.nombre}
              </div>
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
                {celda.dia} de {MESES[mes].toLowerCase()} {anio}
              </div>
            </div>

            {/* Body modal */}
            <div style={{ padding: '24px' }}>
              {celda.registro ? (
                <>
                  <div style={{
                    background: `${VERDE.bg}18`, border: `1px solid ${VERDE.bg}55`,
                    borderRadius: '12px', padding: '14px', marginBottom: '18px',
                    display: 'flex', alignItems: 'center', gap: '12px',
                  }}>
                    <span style={{ fontSize: '28px' }}>✅</span>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                        {celda.registro.origen === 'manual' ? 'Asistencia agregada a mano' : 'Vino este día'}
                      </div>
                      <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {celda.registro.origen === 'manual'
                          ? 'No tiene hora real (la pusiste tú)'
                          : `Marcó a las ${formatHora(celda.registro.hora)}`}
                      </div>
                    </div>
                  </div>
                  <button onClick={quitarMarca} disabled={guardando} style={btnPeligro(guardando)}>
                    {guardando ? '⏳ Quitando...' : '🗑️ Quitar asistencia'}
                  </button>
                </>
              ) : (
                <>
                  <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 18px', lineHeight: 1.5 }}>
                    Esta persona no marcó asistencia este día. Si sí vino, puedes agregarla a mano.
                  </p>
                  <button onClick={marcarManual} disabled={guardando} style={btnExito(guardando)}>
                    {guardando ? '⏳ Guardando...' : '✅ Marcar que vino'}
                  </button>
                </>
              )}

              <button onClick={cerrarCelda} disabled={guardando} style={btnCancelar()}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Leyenda({ color, borde, finde, manual, texto }) {
  let estilo = { width: '14px', height: '14px', borderRadius: '3px', position: 'relative' }
  if (color) estilo.background = color
  else if (borde) { estilo.background = 'transparent'; estilo.border = '1px solid var(--color-border-strong)' }
  else if (finde) estilo.background = 'var(--color-bg-elevated)'
  else if (manual) estilo.background = '#1D9E75'
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span style={estilo}>
        {manual && <span style={{ position: 'absolute', top: '1px', right: '1px', width: '5px', height: '5px', borderRadius: '50%', background: '#FAC775' }} />}
      </span> {texto}
    </span>
  )
}

function ToggleTema({ tema, setTema }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '3px', gap: '2px' }}>
      <button onClick={() => setTema('oscuro')} style={tabTemaStyle(tema === 'oscuro')}>
        <span style={{ fontSize: '11px' }}>🌙</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
      </button>
      <button onClick={() => setTema('tropical')} style={tabTemaStyle(tema === 'tropical')}>
        <span style={{ fontSize: '11px' }}>☀️</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
      </button>
    </div>
  )
}

function btnVolver() {
  return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
}

function btnFlecha() {
  return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', padding: '8px 16px', color: 'var(--color-text-primary)', fontSize: '16px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }
}

function btnExito(guardando) {
  return { width: '100%', padding: '14px', background: guardando ? '#1D9E7588' : 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: '10px' }
}

function btnPeligro(guardando) {
  return { width: '100%', padding: '14px', background: guardando ? 'rgba(226,75,74,0.5)' : 'linear-gradient(135deg, #E24B4A 0%, #A32D2D 100%)', border: 'none', borderRadius: '12px', color: 'white', fontSize: '14px', fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit', marginBottom: '10px' }
}

function btnCancelar() {
  return { width: '100%', padding: '12px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
}
function tabTemaStyle(activo) {
  return { background: activo ? 'var(--gradient-toggle-active)' : 'transparent', border: 'none', borderRadius: '16px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }
}
export default VistaAsistencia