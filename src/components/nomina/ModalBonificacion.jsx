import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { crearGastoDesdeBonificacion } from '../../utils/gastosAutomaticos'

const TIPOS_BONO = [
  { value: 'navideño', label: '🎄 Navideño', color: 'red' },
  { value: 'cumpleaños', label: '🎂 Cumpleaños', color: 'pink' },
  { value: 'productividad', label: '🏆 Productividad', color: 'amber' },
  { value: 'reconocimiento', label: '❤️ Reconocimiento', color: 'purple' },
  { value: 'otro', label: '✨ Otro', color: 'blue' },
]

function ModalBonificacion({ empresa, usuarioActual, onCerrar, onExito }) {
  const [empleados, setEmpleados] = useState([])
  const [tipo, setTipo] = useState('navideño')
  const [titulo, setTitulo] = useState('Bono Navideño')
  const [descripcion, setDescripcion] = useState('')
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [asignaciones, setAsignaciones] = useState([])
  const [notas, setNotas] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(true)

  // ─── Tema dual (reactivo vía MutationObserver) ───
  const [tema, setTema] = useState(() => document.documentElement.getAttribute('data-tema') || 'oscuro')
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setTema(document.documentElement.getAttribute('data-tema') || 'oscuro')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] })
    return () => obs.disconnect()
  }, [])
  const esTropical = tema === 'tropical'

  // ─── Estilos reutilizables según tema (fondos SÓLIDOS, no transparentes) ───
  const superficie = {
    background: 'var(--color-bg-primary)',
    border: esTropical ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,0.10)',
  }
  const panel = {
    background: esTropical ? '#F9FAFB' : 'rgba(255,255,255,0.05)',
    border: esTropical ? '1px solid #E5E7EB' : '1px solid rgba(255,255,255,0.10)',
  }
  const footerBg = { background: esTropical ? '#F9FAFB' : 'rgba(255,255,255,0.03)', borderTop: '1px solid var(--color-border-subtle)' }
  const inputStyle = {
    background: esTropical ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
    border: esTropical ? '1px solid #D1D5DB' : '1px solid rgba(255,255,255,0.14)',
    color: 'var(--color-text-primary)',
  }
  const cajaAzul = {
    background: esTropical ? '#EFF6FF' : 'rgba(59,130,246,0.10)',
    border: esTropical ? '1px solid #BFDBFE' : '1px solid rgba(59,130,246,0.30)',
  }

  useEffect(() => {
    cargarEmpleados()
  }, [empresa])

  async function cargarEmpleados() {
    setCargando(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('empresa_id', empresa.id)
      .eq('activo', true)
      .neq('rol', 'propietario')
      .order('nombre')
    
    const emps = data || []
    setEmpleados(emps)
    
    setAsignaciones(emps.map(e => ({
      usuario_id: e.id,
      nombre: e.nombre,
      rol: e.rol,
      incluido: false,
      monto: 0,
    })))
    
    setCargando(false)
  }

  function actualizarTipo(nuevoTipo) {
    setTipo(nuevoTipo)
    const tipoObj = TIPOS_BONO.find(t => t.value === nuevoTipo)
    if (tipoObj) {
      if (nuevoTipo === 'navideño') setTitulo(`Bono Navideño ${new Date().getFullYear()}`)
      else if (nuevoTipo === 'cumpleaños') setTitulo('Bono de Cumpleaños')
      else if (nuevoTipo === 'productividad') setTitulo('Bono de Productividad')
      else if (nuevoTipo === 'reconocimiento') setTitulo('Bono de Reconocimiento')
      else setTitulo('Bonificación Extra')
    }
  }

  function actualizarAsignacion(usuarioId, campo, valor) {
    setAsignaciones(prev => prev.map(a => 
      a.usuario_id === usuarioId ? { ...a, [campo]: valor } : a
    ))
  }

  function asignarMontoATodos() {
    const monto = prompt('¿Qué monto quieres asignar a todos los empleados?', '5000')
    const montoNum = parseFloat(monto)
    if (isNaN(montoNum) || montoNum <= 0) return
    
    setAsignaciones(prev => prev.map(a => ({
      ...a,
      incluido: true,
      monto: montoNum,
    })))
  }

  function limpiarTodos() {
    setAsignaciones(prev => prev.map(a => ({
      ...a,
      incluido: false,
      monto: 0,
    })))
  }

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  const asignacionesIncluidas = asignaciones.filter(a => a.incluido && parseFloat(a.monto) > 0)
  const totalBono = asignacionesIncluidas.reduce((sum, a) => sum + parseFloat(a.monto || 0), 0)

  async function procesarBonificacion() {
    setError('')

    if (!titulo.trim()) {
      setError('Debes ingresar un título para la bonificación')
      return
    }
    if (asignacionesIncluidas.length === 0) {
      setError('Debes seleccionar al menos un empleado con un monto mayor a cero')
      return
    }
    if (totalBono <= 0) {
      setError('El monto total debe ser mayor a cero')
      return
    }

    setProcesando(true)

    try {
      const año = new Date(fechaPago).getFullYear()
      
      const detalleJson = asignacionesIncluidas.map(a => ({
        usuario_id: a.usuario_id,
        nombre: a.nombre,
        rol: a.rol,
        monto: parseFloat(a.monto),
      }))

      const nuevaBoni = {
        empresa_id: empresa.id,
        titulo: titulo.trim(),
        descripcion: descripcion.trim() || null,
        tipo: tipo,
        fecha_pago: fechaPago,
        año: año,
        estado: 'pagado',
        fecha_pagado: new Date().toISOString(),
        monto_total: totalBono,
        cantidad_empleados: asignacionesIncluidas.length,
        detalle: detalleJson,
        creado_por_usuario_id: usuarioActual.id,
        notas: notas.trim() || null,
      }

      const { data: bonificacionCreada, error: errorInsert } = await supabase
        .from('bonificaciones_extra')
        .insert([nuevaBoni])
        .select()
        .single()

      if (errorInsert) {
        throw new Error(errorInsert.message)
      }

      const resultadoGasto = await crearGastoDesdeBonificacion({
        empresaId: empresa.id,
        bonificacionId: bonificacionCreada.id,
        fechaPago: fechaPago,
        titulo: titulo.trim(),
        tipo: tipo,
        montoTotal: totalBono,
        cantidadEmpleados: asignacionesIncluidas.length,
        registradoPor: usuarioActual?.id,
        registradoPorNombre: usuarioActual?.nombre || 'Sistema',
      })

      if (!resultadoGasto.success) {
        console.warn('⚠️ Bonificación OK, pero falló crear gasto automático:', resultadoGasto.error)
      } else {
        console.log('✅ Ecosistema conectado: gasto automático creado desde bonificación')
      }

      setProcesando(false)
      if (onExito) onExito()

    } catch (e) {
      setError('Error al procesar la bonificación: ' + e.message)
      setProcesando(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[95vh] flex flex-col" style={superficie}>

        {/* HEADER */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-t-2xl p-6 flex justify-between items-start">
          <div>
            <p className="text-amber-100 text-xs font-semibold tracking-wider">
              NUEVA BONIFICACIÓN
            </p>
            <h2 className="text-2xl font-bold mt-1">
              🎁 Bono Extra para Empleados
            </h2>
            <p className="text-amber-200 text-sm mt-1">
              Bonos especiales fuera de la nómina regular
            </p>
          </div>
          <button
            onClick={onCerrar}
            disabled={procesando}
            className="bg-amber-700 hover:bg-amber-800 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-50"
          >
            ✖ Cerrar
          </button>
        </div>

        {/* BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* TIPO DE BONO */}
          <div>
            <label className="block text-sm font-bold mb-2" style={{ color: 'var(--color-text-secondary)' }}>
              📋 Tipo de bonificación
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {TIPOS_BONO.map(t => {
                const activo = tipo === t.value
                return (
                  <button
                    key={t.value}
                    onClick={() => actualizarTipo(t.value)}
                    disabled={procesando}
                    className="p-3 rounded-xl text-sm font-bold transition"
                    style={activo ? {
                      background: esTropical ? '#FEF3C7' : 'rgba(245,158,11,0.18)',
                      border: '2px solid #F59E0B',
                      color: esTropical ? '#78350F' : '#FAC775',
                    } : {
                      background: 'var(--color-modulo-bg)',
                      border: '2px solid var(--color-border-subtle)',
                      color: 'var(--color-text-muted)',
                    }}
                  >
                    {t.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* TÍTULO Y FECHA */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                📝 Título
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                disabled={procesando}
                className="w-full px-3 py-2 rounded-lg"
                style={inputStyle}
                placeholder="Bono Navideño 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
                📅 Fecha de pago
              </label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                disabled={procesando}
                className="w-full px-3 py-2 rounded-lg"
                style={inputStyle}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              📄 Descripción (opcional)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={procesando}
              className="w-full px-3 py-2 rounded-lg"
              style={inputStyle}
              placeholder="Ej: Reconocimiento por trabajo durante inspección INABIE"
            />
          </div>

          {/* EMPLEADOS */}
          <div>
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <label className="text-sm font-bold" style={{ color: 'var(--color-text-secondary)' }}>
                👥 Empleados a recibir el bono
              </label>
              <div className="flex gap-2">
                <button
                  onClick={asignarMontoATodos}
                  disabled={procesando}
                  className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  🚀 Asignar a todos
                </button>
                <button
                  onClick={limpiarTodos}
                  disabled={procesando}
                  className="text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                  style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
                >
                  🧹 Limpiar
                </button>
              </div>
            </div>

            {cargando ? (
              <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando empleados...</div>
            ) : empleados.length === 0 ? (
              <div className="text-center py-8" style={{ color: 'var(--color-text-muted)' }}>
                No hay empleados activos disponibles
              </div>
            ) : (
              <div className="space-y-2">
                {asignaciones.map(a => (
                  <div 
                    key={a.usuario_id}
                    className="rounded-xl p-3 transition flex items-center gap-3"
                    style={a.incluido ? {
                      background: esTropical ? 'rgba(245,158,11,0.08)' : 'rgba(245,158,11,0.10)',
                      border: '1px solid rgba(245,158,11,0.40)',
                    } : panel}
                  >
                    <label className="flex items-center gap-3 flex-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={a.incluido}
                        onChange={(e) => actualizarAsignacion(a.usuario_id, 'incluido', e.target.checked)}
                        disabled={procesando}
                        className="w-5 h-5"
                      />
                      <div>
                        <p className="font-bold" style={{ color: 'var(--color-text-primary)' }}>{a.nombre}</p>
                        <p className="text-xs capitalize" style={{ color: 'var(--color-text-muted)' }}>
                          {a.rol?.replace('_', ' ')}
                        </p>
                      </div>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>RD$</span>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        value={a.monto || ''}
                        onChange={(e) => actualizarAsignacion(a.usuario_id, 'monto', e.target.value)}
                        disabled={procesando || !a.incluido}
                        className="w-28 px-2 py-1.5 rounded-lg text-right font-bold disabled:opacity-50"
                        style={inputStyle}
                        placeholder="0"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* NOTAS */}
          <div>
            <label className="block text-sm font-bold mb-1" style={{ color: 'var(--color-text-secondary)' }}>
              📝 Notas adicionales (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={procesando}
              rows={2}
              className="w-full px-3 py-2 rounded-lg"
              style={inputStyle}
              placeholder="Cualquier nota sobre esta bonificación..."
            />
          </div>

          {/* AVISO CONEXIÓN GASTOS */}
          {totalBono > 0 && (
            <div className="rounded-xl p-4" style={cajaAzul}>
              <p className="text-sm font-semibold mb-2" style={{ color: esTropical ? '#1E3A8A' : '#93C5FD' }}>
                🔗 Conexión automática con Gastos
              </p>
              <p className="text-xs" style={{ color: esTropical ? '#1E40AF' : '#BFDBFE' }}>
                Al procesar, se creará automáticamente <strong>1 gasto</strong> en el módulo de Gastos:
              </p>
              <ul className="text-xs mt-2 space-y-1 ml-4" style={{ color: esTropical ? '#1E40AF' : '#BFDBFE' }}>
                <li>💰 <strong>Sueldos y Salarios:</strong> RD$ {formatearMoneda(totalBono)} ({asignacionesIncluidas.length} {asignacionesIncluidas.length === 1 ? 'empleado' : 'empleados'})</li>
              </ul>
            </div>
          )}

          {error && (
            <div className="rounded-lg p-3 text-sm" style={{ background: esTropical ? '#FEF2F2' : 'rgba(239,68,68,0.10)', border: esTropical ? '1px solid #FECACA' : '1px solid rgba(239,68,68,0.30)', color: esTropical ? '#991B1B' : '#FCA5A5' }}>
              ⚠️ {error}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="rounded-b-2xl p-4 flex justify-between items-center gap-2 flex-wrap" style={footerBg}>
          <button
            onClick={onCerrar}
            disabled={procesando}
            className="px-6 py-3 font-bold rounded-xl disabled:opacity-50"
            style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-border-subtle)', color: 'var(--color-text-secondary)' }}
          >
            Cancelar
          </button>

          <div className="text-center">
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {asignacionesIncluidas.length} empleado{asignacionesIncluidas.length !== 1 ? 's' : ''} · Total
            </p>
            <p className="text-2xl font-bold" style={{ color: esTropical ? '#B45309' : '#FAC775' }}>
              RD$ {formatearMoneda(totalBono)}
            </p>
          </div>

          <button
            onClick={procesarBonificacion}
            disabled={procesando || totalBono <= 0}
            className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center gap-2"
          >
            {procesando ? (
              <>
                <span className="animate-spin">⏳</span> Procesando...
              </>
            ) : (
              <>
                💰 Procesar bonificación
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}

export default ModalBonificacion
