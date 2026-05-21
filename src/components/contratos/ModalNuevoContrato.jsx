import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function ModalNuevoContrato({ 
  empresaId, 
  usuarioActual, 
  empleadoPreseleccionado, 
  empresa,
  onCerrar, 
  onContratoCreado 
}) {
  const [paso, setPaso] = useState(empleadoPreseleccionado ? 2 : 1)
  const [empleados, setEmpleados] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [cargando, setCargando] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Datos del contrato
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

  useEffect(() => {
    if (paso === 1) cargarEmpleados()
  }, [paso])

  useEffect(() => {
    if (empleadoSeleccionado && paso === 3) {
      // Pre-llenar datos basados en el empleado
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
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .neq('rol', 'propietario')
      .order('nombre')
    
    // Excluir los que YA tienen contrato
    const { data: contratosExistentes } = await supabase
      .from('contratos_empleados')
      .select('usuario_id')
      .eq('empresa_id', empresaId)
    
    const idsConContrato = (contratosExistentes || []).map(c => c.usuario_id)
    const empleadosDisponibles = (data || []).filter(e => !idsConContrato.includes(e.id))
    
    setEmpleados(empleadosDisponibles)
    setCargando(false)
  }

  function formatearPuesto(rol) {
    const mapa = {
      'administrador': 'Administrador',
      'contador': 'Contador',
      'secretaria': 'Secretaria',
      'jefa_cocina': 'Jefa de Cocina',
      'ayudante': 'Ayudante de Cocina',
      'despachador': 'Despachador',
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

  // Calcular salario bruto (5.74% TSS+AFP)
  function calcularBruto(neto) {
    if (!neto || isNaN(neto)) return 0
    return Math.round((parseFloat(neto) / 0.9426) * 100) / 100
  }

  function validarPaso3() {
    if (!datosContrato.fecha_inicio) {
      setError('La fecha de inicio es obligatoria')
      return false
    }
    if (tipoContrato !== 'indefinido' && !datosContrato.fecha_fin) {
      setError('La fecha de fin es obligatoria para contratos por obra/servicio o estacionales')
      return false
    }
    if (!datosContrato.puesto.trim()) {
      setError('El puesto es obligatorio')
      return false
    }
    if (!datosContrato.salario_neto || parseFloat(datosContrato.salario_neto) <= 0) {
      setError('El salario neto debe ser mayor a 0')
      return false
    }
    return true
  }

  async function crearContrato() {
    if (!validarPaso3()) return

    setGuardando(true)
    setError('')

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
      .from('contratos_empleados')
      .insert([nuevoContrato])
      .select()
      .single()

    if (errorInsert) {
      console.error('Error creando contrato:', errorInsert)
      setError('Error al crear contrato: ' + errorInsert.message)
      setGuardando(false)
      return
    }

    setGuardando(false)
    
    // Notificar al padre que se creó el contrato
    if (onContratoCreado) {
      onContratoCreado(data)
    }
  }

  // Filtrar empleados por búsqueda
  const empleadosFiltrados = empleados.filter(e => {
    if (!busqueda.trim()) return true
    return e.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
           e.rol.toLowerCase().includes(busqueda.toLowerCase())
  })

  // Helpers
  function obtenerAvatar(empleado) {
    if (empleado.foto_url) return null
    if (empleado.sexo === 'hombre') return '👨'
    if (empleado.sexo === 'mujer') return '👩'
    return empleado.nombre?.charAt(0)?.toUpperCase() || '?'
  }

  function obtenerLabelFrecuencia(freq) {
    const mapa = {
      'dia': 'por día',
      'semana': 'por semana',
      'quincena': 'por quincena',
      'mes': 'por mes',
    }
    return mapa[freq] || freq
  }

  const salarioBrutoCalculado = calcularBruto(datosContrato.salario_neto)

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-700 text-white p-6">
          <div className="flex justify-between items-start mb-4">
            <div>
              <p className="text-xs opacity-80 tracking-wider">NUEVO CONTRATO LABORAL</p>
              <h2 className="text-2xl font-bold mt-1">
                {paso === 1 && '👤 Selecciona el empleado'}
                {paso === 2 && '📋 Tipo de contrato'}
                {paso === 3 && '📝 Datos del contrato'}
                {paso === 4 && '✅ Confirmar y crear'}
              </h2>
            </div>
            <button
              onClick={onCerrar}
              className="text-2xl opacity-70 hover:opacity-100"
              disabled={guardando}
            >
              ✕
            </button>
          </div>

          {/* Progress steps */}
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((n, i) => (
              <div key={n} className="flex items-center gap-2 flex-1">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                  n === paso ? 'bg-white text-purple-700' :
                  n < paso ? 'bg-green-400 text-white' :
                  'bg-purple-800 text-purple-300'
                }`}>
                  {n < paso ? '✓' : n}
                </div>
                {i < 3 && (
                  <div className={`flex-1 h-1 rounded ${n < paso ? 'bg-green-400' : 'bg-purple-800'}`} />
                )}
              </div>
            ))}
          </div>
          <p className="text-xs text-purple-200 mt-2">Paso {paso} de 4</p>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* ─── PASO 1: SELECCIONAR EMPLEADO ─────────────────── */}
          {paso === 1 && (
            <div>
              <p className="text-sm text-gray-600 mb-4">
                Solo se muestran empleados que aún NO tienen contrato creado.
              </p>

              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="🔍 Buscar empleado por nombre o rol..."
                className="w-full px-4 py-2 border border-gray-300 rounded-lg mb-4 focus:outline-none focus:ring-2 focus:ring-purple-500"
              />

              {cargando ? (
                <p className="text-center py-8 text-gray-500">⏳ Cargando empleados...</p>
              ) : empleadosFiltrados.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-xl">
                  <p className="text-4xl mb-2">👥</p>
                  <p className="font-bold text-gray-900">
                    {empleados.length === 0 
                      ? 'No hay empleados disponibles' 
                      : 'No se encontraron empleados con esa búsqueda'}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">
                    {empleados.length === 0 && 'Todos los empleados activos ya tienen contrato creado'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {empleadosFiltrados.map(emp => (
                    <button
                      key={emp.id}
                      onClick={() => {
                        setEmpleadoSeleccionado(emp)
                        setPaso(2)
                      }}
                      className="w-full text-left bg-white border-2 border-gray-200 hover:border-purple-400 hover:bg-purple-50 rounded-xl p-4 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full bg-purple-100 flex items-center justify-center text-xl flex-shrink-0">
                          {emp.foto_url ? (
                            <img src={emp.foto_url} alt="" className="w-12 h-12 rounded-full object-cover" />
                          ) : (
                            obtenerAvatar(emp)
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-gray-900">{emp.nombre}</p>
                          <p className="text-xs text-gray-600">
                            {formatearPuesto(emp.rol)}
                            {emp.sueldo && ` · RD$ ${Number(emp.sueldo).toLocaleString('es-DO')} ${obtenerLabelFrecuencia(emp.frecuencia_pago)}`}
                          </p>
                          {emp.gestion_contrato === 'contrato_digital' && (
                            <p className="text-xs text-yellow-700 mt-1 font-semibold">
                              ⚠️ Marcado para contrato digital
                            </p>
                          )}
                        </div>
                        <span className="text-purple-600">→</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ─── PASO 2: TIPO DE CONTRATO ─────────────────────── */}
          {paso === 2 && empleadoSeleccionado && (
            <div>
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-6">
                <p className="text-xs text-purple-700 font-semibold tracking-wider mb-1">
                  EMPLEADO SELECCIONADO
                </p>
                <p className="font-bold text-gray-900">{empleadoSeleccionado.nombre}</p>
                <p className="text-sm text-gray-600">{formatearPuesto(empleadoSeleccionado.rol)}</p>
              </div>

              <p className="text-sm text-gray-600 mb-4">
                Selecciona el tipo de contrato que mejor se ajuste a la relación laboral:
              </p>

              <div className="space-y-3">
                {/* Opción 1: Obra/Servicio */}
                <label
                  className={`block p-5 border-2 rounded-xl cursor-pointer transition-colors ${
                    tipoContrato === 'obra_servicio'
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="tipo_contrato"
                      value="obra_servicio"
                      checked={tipoContrato === 'obra_servicio'}
                      onChange={(e) => setTipoContrato(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        📑 Obra o Servicio Determinado (PAE)
                        <span className="bg-green-200 text-green-800 text-xs font-bold px-2 py-0.5 rounded-full">
                          RECOMENDADO
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        Contrato amarrado al año escolar y al contrato con INABIE. Termina automáticamente al finalizar el servicio. <strong>Mejor protección para el empleador.</strong>
                      </p>
                    </div>
                  </div>
                </label>

                {/* Opción 2: Estacional */}
                <label
                  className={`block p-5 border-2 rounded-xl cursor-pointer transition-colors ${
                    tipoContrato === 'estacional'
                      ? 'border-yellow-500 bg-yellow-50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="tipo_contrato"
                      value="estacional"
                      checked={tipoContrato === 'estacional'}
                      onChange={(e) => setTipoContrato(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">🌾 Estacional</div>
                      <p className="text-sm text-gray-600 mt-1">
                        Reconoce la naturaleza estacional del trabajo PAE. Si dura más de 4 meses, aplica asistencia económica.
                      </p>
                    </div>
                  </div>
                </label>

                {/* Opción 3: Indefinido */}
                <label
                  className={`block p-5 border-2 rounded-xl cursor-pointer transition-colors ${
                    tipoContrato === 'indefinido'
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="tipo_contrato"
                      value="indefinido"
                      checked={tipoContrato === 'indefinido'}
                      onChange={(e) => setTipoContrato(e.target.value)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-bold text-gray-900">♾️ Tiempo Indefinido</div>
                      <p className="text-sm text-gray-600 mt-1">
                        Para personal permanente que trabaja todo el año (ej: secretaria administrativa). Aplican todas las prestaciones.
                      </p>
                    </div>
                  </div>
                </label>
              </div>
            </div>
          )}

          {/* ─── PASO 3: DATOS DEL CONTRATO ───────────────────── */}
          {paso === 3 && empleadoSeleccionado && (
            <div className="space-y-5">

              {/* Datos auto-llenados (no editables) */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
                  📋 DATOS AUTO-LLENADOS DESDE LA CONFIGURACIÓN
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Empleador</p>
                    <p className="font-bold">{empresa?.nombre_propietario || 'Sin nombre'}</p>
                    <p className="text-xs text-gray-600">CC: {empresa?.cedula_propietario || '(sin cédula)'}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Trabajador</p>
                    <p className="font-bold">{empleadoSeleccionado.nombre}</p>
                    <p className="text-xs text-gray-600">CC: {empleadoSeleccionado.cedula || '(sin cédula)'}</p>
                  </div>
                </div>
                {(!empresa?.cedula_propietario || !empleadoSeleccionado.cedula) && (
                  <p className="text-xs text-orange-700 mt-3 bg-orange-50 border border-orange-200 rounded p-2">
                    ⚠️ Faltan cédulas. Edita los datos en Configuración o en el perfil del empleado para que aparezcan en el contrato.
                  </p>
                )}
              </div>

              {/* Año escolar (solo obra_servicio) */}
              {tipoContrato === 'obra_servicio' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Año escolar INABIE *
                  </label>
                  <input
                    type="text"
                    value={datosContrato.año_escolar_inabie}
                    onChange={(e) => actualizarCampo('año_escolar_inabie', e.target.value)}
                    placeholder="2026-2027"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              )}

              {/* Fechas */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Fecha de inicio *
                  </label>
                  <input
                    type="date"
                    value={datosContrato.fecha_inicio}
                    onChange={(e) => actualizarCampo('fecha_inicio', e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                {tipoContrato !== 'indefinido' && (
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Fecha de fin *
                    </label>
                    <input
                      type="date"
                      value={datosContrato.fecha_fin}
                      onChange={(e) => actualizarCampo('fecha_fin', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                )}
              </div>

              {/* Puesto */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Puesto *
                </label>
                <input
                  type="text"
                  value={datosContrato.puesto}
                  onChange={(e) => actualizarCampo('puesto', e.target.value)}
                  placeholder="Ej: Cocinero, Ayudante de Cocina, Despachador"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              {/* Descripción de funciones */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Descripción de funciones (opcional)
                </label>
                <textarea
                  value={datosContrato.descripcion_funciones}
                  onChange={(e) => actualizarCampo('descripcion_funciones', e.target.value)}
                  placeholder="Ej: Preparar alimentos según menú INABIE, mantener limpieza del área..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {/* Salario */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-xs text-green-800 font-semibold tracking-wider mb-3">
                  💰 COMPENSACIÓN
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Salario neto (RD$) *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={datosContrato.salario_neto}
                      onChange={(e) => actualizarCampo('salario_neto', e.target.value)}
                      placeholder="0.00"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                    <p className="text-xs text-gray-600 mt-1">
                      Lo que el empleado recibe limpio
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">
                      Frecuencia *
                    </label>
                    <select
                      value={datosContrato.frecuencia_pago}
                      onChange={(e) => actualizarCampo('frecuencia_pago', e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="semanal">Semanal</option>
                      <option value="quincenal">Quincenal</option>
                      <option value="mensual">Mensual</option>
                    </select>
                  </div>
                </div>

                {datosContrato.salario_neto && parseFloat(datosContrato.salario_neto) > 0 && (
                  <div className="mt-3 bg-white border border-green-300 rounded-lg p-3">
                    <p className="text-xs text-gray-600 font-semibold mb-1">CÁLCULO TRANSPARENTE:</p>
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-500">Salario neto</p>
                        <p className="font-bold text-green-700">
                          RD$ {Number(datosContrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">+ TSS+AFP (5.74%)</p>
                        <p className="font-bold text-gray-700">
                          RD$ {(salarioBrutoCalculado - parseFloat(datosContrato.salario_neto)).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">= Salario bruto</p>
                        <p className="font-bold text-blue-700">
                          RD$ {salarioBrutoCalculado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Logística */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Horario de trabajo
                  </label>
                  <input
                    type="text"
                    value={datosContrato.horario_trabajo}
                    onChange={(e) => actualizarCampo('horario_trabajo', e.target.value)}
                    placeholder="Ej: 5:00 AM - 1:00 PM"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Días laborales
                  </label>
                  <input
                    type="text"
                    value={datosContrato.dias_laborales}
                    onChange={(e) => actualizarCampo('dias_laborales', e.target.value)}
                    placeholder="Ej: Lunes a Viernes"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Lugar de trabajo
                </label>
                <input
                  type="text"
                  value={datosContrato.lugar_trabajo}
                  onChange={(e) => actualizarCampo('lugar_trabajo', e.target.value)}
                  placeholder="Dirección de la cocina"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Notas adicionales (opcional)
                </label>
                <textarea
                  value={datosContrato.notas}
                  onChange={(e) => actualizarCampo('notas', e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}

          {/* ─── PASO 4: CONFIRMAR Y CREAR ─────────────────────── */}
          {paso === 4 && empleadoSeleccionado && (
            <div className="space-y-4">
              <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
                <p className="text-xs text-purple-700 font-semibold tracking-wider mb-3">
                  ✅ RESUMEN DEL CONTRATO
                </p>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between border-b border-purple-200 pb-2">
                    <span className="text-gray-600">Empleado:</span>
                    <span className="font-bold">{empleadoSeleccionado.nombre}</span>
                  </div>
                  <div className="flex justify-between border-b border-purple-200 pb-2">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-bold">
                      {tipoContrato === 'obra_servicio' && '📑 Obra/Servicio PAE'}
                      {tipoContrato === 'estacional' && '🌾 Estacional'}
                      {tipoContrato === 'indefinido' && '♾️ Indefinido'}
                    </span>
                  </div>
                  <div className="flex justify-between border-b border-purple-200 pb-2">
                    <span className="text-gray-600">Puesto:</span>
                    <span className="font-bold">{datosContrato.puesto}</span>
                  </div>
                  {tipoContrato === 'obra_servicio' && (
                    <div className="flex justify-between border-b border-purple-200 pb-2">
                      <span className="text-gray-600">Año escolar:</span>
                      <span className="font-bold">{datosContrato.año_escolar_inabie}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-purple-200 pb-2">
                    <span className="text-gray-600">Fecha inicio:</span>
                    <span className="font-bold">{datosContrato.fecha_inicio}</span>
                  </div>
                  {tipoContrato !== 'indefinido' && (
                    <div className="flex justify-between border-b border-purple-200 pb-2">
                      <span className="text-gray-600">Fecha fin:</span>
                      <span className="font-bold">{datosContrato.fecha_fin}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-b border-purple-200 pb-2">
                    <span className="text-gray-600">Salario neto:</span>
                    <span className="font-bold text-green-700">
                      RD$ {Number(datosContrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })} {datosContrato.frecuencia_pago}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Salario bruto:</span>
                    <span className="font-bold text-blue-700">
                      RD$ {salarioBrutoCalculado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
                <p className="font-bold mb-1">📌 Después de crear:</p>
                <p>
                  El contrato quedará como <strong>borrador</strong>. Podrás continuar con la firma presencial (empleador + empleado) desde la vista de contratos.
                </p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER con navegación */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => {
              if (paso === 1) {
                onCerrar()
              } else if (paso === 2 && empleadoPreseleccionado) {
                onCerrar()
              } else {
                setPaso(paso - 1)
                setError('')
              }
            }}
            disabled={guardando}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition disabled:opacity-50"
          >
            {paso === 1 ? 'Cancelar' : '← Atrás'}
          </button>

          {paso < 4 && (
            <button
              onClick={() => {
                if (paso === 1 && !empleadoSeleccionado) {
                  setError('Selecciona un empleado para continuar')
                  return
                }
                if (paso === 3 && !validarPaso3()) {
                  return
                }
                setPaso(paso + 1)
                setError('')
              }}
              disabled={paso === 1 && !empleadoSeleccionado}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition"
            >
              Siguiente →
            </button>
          )}

          {paso === 4 && (
            <button
              onClick={crearContrato}
              disabled={guardando}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center gap-2"
            >
              {guardando ? (
                <>
                  <span className="animate-spin">⏳</span> Creando contrato...
                </>
              ) : (
                '✅ Crear contrato'
              )}
            </button>
          )}
        </div>

      </div>
    </div>
  )
}

export default ModalNuevoContrato