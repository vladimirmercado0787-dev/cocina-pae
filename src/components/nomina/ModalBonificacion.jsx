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
    
    // Inicializar asignaciones con todos seleccionados pero con monto 0
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
      // Auto-completar título con el tipo
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
      
      // Estructura JSON del detalle
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

      // ⚠️ IMPORTANTE: Agregamos .select().single() para obtener el ID
      const { data: bonificacionCreada, error: errorInsert } = await supabase
        .from('bonificaciones_extra')
        .insert([nuevaBoni])
        .select()
        .single()

      if (errorInsert) {
        throw new Error(errorInsert.message)
      }

      // ═══════════════════════════════════════════════════
      // 🔗 INT-002: Generar gasto automático del ecosistema
      // ───────────────────────────────────────────────────
      // Filosofía: "una acción trae consecuencias en todo el
      // ecosistema". La bonificación genera 1 gasto en módulo
      // de Gastos (categoría Sueldos y Salarios).
      //
      // IMPORTANTE: si falla la creación del gasto, NO revertimos
      // la bonificación (ya está registrada). Solo logueamos.
      // ═══════════════════════════════════════════════════
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
        console.warn(
          '⚠️ Bonificación OK, pero falló crear gasto automático:',
          resultadoGasto.error
        )
      } else {
        console.log(
          '✅ Ecosistema conectado: gasto automático creado desde bonificación'
        )
      }

      setProcesando(false)
      if (onExito) onExito()

    } catch (e) {
      setError('Error al procesar la bonificación: ' + e.message)
      setProcesando(false)
    }
  }

  const tipoActual = TIPOS_BONO.find(t => t.value === tipo)

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[95vh] flex flex-col">

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
            <label className="block text-sm font-bold text-gray-700 mb-2">
              📋 Tipo de bonificación
            </label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              {TIPOS_BONO.map(t => (
                <button
                  key={t.value}
                  onClick={() => actualizarTipo(t.value)}
                  disabled={procesando}
                  className={`p-3 rounded-xl text-sm font-bold transition border-2 ${
                    tipo === t.value
                      ? 'bg-amber-100 border-amber-500 text-amber-900'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* TÍTULO Y DESCRIPCIÓN */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                📝 Título
              </label>
              <input
                type="text"
                value={titulo}
                onChange={(e) => setTitulo(e.target.value)}
                disabled={procesando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                placeholder="Bono Navideño 2026"
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">
                📅 Fecha de pago
              </label>
              <input
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                disabled={procesando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">
              📄 Descripción (opcional)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              disabled={procesando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Ej: Reconocimiento por trabajo durante inspección INABIE"
            />
          </div>

          {/* EMPLEADOS */}
          <div>
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
              <label className="text-sm font-bold text-gray-700">
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
                  className="bg-gray-300 hover:bg-gray-400 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-lg disabled:opacity-50"
                >
                  🧹 Limpiar
                </button>
              </div>
            </div>

            {cargando ? (
              <div className="text-center py-8 text-gray-500">⏳ Cargando empleados...</div>
            ) : empleados.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay empleados activos disponibles
              </div>
            ) : (
              <div className="space-y-2">
                {asignaciones.map(a => (
                  <div 
                    key={a.usuario_id}
                    className={`border rounded-xl p-3 transition flex items-center gap-3 ${
                      a.incluido 
                        ? 'border-amber-300 bg-amber-50/30' 
                        : 'border-gray-200 bg-gray-50'
                    }`}
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
                        <p className="font-bold text-gray-900">{a.nombre}</p>
                        <p className="text-xs text-gray-600 capitalize">
                          {a.rol?.replace('_', ' ')}
                        </p>
                      </div>
                    </label>

                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600">RD$</span>
                      <input
                        type="number"
                        step="100"
                        min="0"
                        value={a.monto || ''}
                        onChange={(e) => actualizarAsignacion(a.usuario_id, 'monto', e.target.value)}
                        disabled={procesando || !a.incluido}
                        className="w-28 px-2 py-1.5 border border-gray-300 rounded-lg text-right font-bold disabled:bg-gray-100"
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
            <label className="block text-sm font-bold text-gray-700 mb-1">
              📝 Notas adicionales (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={procesando}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="Cualquier nota sobre esta bonificación..."
            />
          </div>

          {/* 🔗 AVISO DE CONEXIÓN AUTOMÁTICA CON GASTOS */}
          {totalBono > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-blue-900 mb-2">
                🔗 Conexión automática con Gastos
              </p>
              <p className="text-xs text-blue-800">
                Al procesar, se creará automáticamente <strong>1 gasto</strong> en el módulo de Gastos:
              </p>
              <ul className="text-xs text-blue-800 mt-2 space-y-1 ml-4">
                <li>💰 <strong>Sueldos y Salarios:</strong> RD$ {formatearMoneda(totalBono)} ({asignacionesIncluidas.length} {asignacionesIncluidas.length === 1 ? 'empleado' : 'empleados'})</li>
              </ul>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              ⚠️ {error}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 rounded-b-2xl p-4 flex justify-between items-center gap-2 border-t border-gray-200 flex-wrap">
          <button
            onClick={onCerrar}
            disabled={procesando}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl disabled:opacity-50"
          >
            Cancelar
          </button>

          <div className="text-center">
            <p className="text-xs text-gray-500">
              {asignacionesIncluidas.length} empleado{asignacionesIncluidas.length !== 1 ? 's' : ''} · Total
            </p>
            <p className="text-2xl font-bold text-amber-700">
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