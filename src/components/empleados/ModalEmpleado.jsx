import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function ModalEmpleado({ empresaId, empleadoExistente, onCerrar, onGuardado, onIrALiquidacion }) {
  const modoEdicion = !!empleadoExistente

  const [form, setForm] = useState({
    nombre: '',
    sexo: '',
    cedula: '',
    rol: '',
    pin: '',
    telefono: '',
    email: '',
    direccion: '',
    fecha_contratacion: new Date().toISOString().split('T')[0],
    sueldo: '',
    frecuencia_pago: '',
    foto_url: '',
    notas: '',
    gestion_contrato: 'sin_contrato',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [confirmandoBaja, setConfirmandoBaja] = useState(false)

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
    if (!form.nombre.trim()) {
      setError('El nombre es obligatorio')
      return false
    }
    if (!form.rol) {
      setError('Debes seleccionar un rol')
      return false
    }
    if (form.pin && (form.pin.length !== 4 || !/^\d+$/.test(form.pin))) {
      setError('El PIN debe ser de 4 dígitos numéricos')
      return false
    }
    if (form.sueldo && !form.frecuencia_pago) {
      setError('Si pones sueldo, debes elegir la frecuencia de pago')
      return false
    }
    return true
  }

  async function guardar() {
    if (!validar()) return
    
    setGuardando(true)
    setError('')

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

    let errorSupa = null

    if (modoEdicion) {
      const { error: errUpdate } = await supabase
        .from('usuarios')
        .update(datos)
        .eq('id', empleadoExistente.id)
      errorSupa = errUpdate
    } else {
      const { error: errInsert } = await supabase
        .from('usuarios')
        .insert([{ ...datos, empresa_id: empresaId, activo: true }])
      errorSupa = errInsert
    }

    if (errorSupa) {
      console.error('Error al guardar:', errorSupa)
      setError('Error al guardar: ' + errorSupa.message)
      setGuardando(false)
      return
    }

    setGuardando(false)
    onGuardado()
    onCerrar()
  }

  // ═══════════════════════════════════════════════════
  // INT-005: IR A CALCULADORA DE LIQUIDACIÓN
  // ═══════════════════════════════════════════════════
  function irACalculadoraLiquidacion() {
    if (onIrALiquidacion && empleadoExistente) {
      onCerrar()
      onIrALiquidacion(empleadoExistente)
    }
  }

  // ═══════════════════════════════════════════════════
  // DESACTIVAR SIN LIQUIDAR (cuando ya pagó por fuera)
  // ═══════════════════════════════════════════════════
  async function desactivarSinLiquidar() {
    setGuardando(true)
    setError('')

    const { error: errUpdate } = await supabase
      .from('usuarios')
      .update({ 
        activo: false,
        fecha_salida: new Date().toISOString().split('T')[0],
      })
      .eq('id', empleadoExistente.id)

    if (errUpdate) {
      setError('Error al desactivar: ' + errUpdate.message)
      setGuardando(false)
      return
    }

    setGuardando(false)
    onGuardado()
    onCerrar()
  }

  async function reactivar() {
    setGuardando(true)
    setError('')

    const { error: errUpdate } = await supabase
      .from('usuarios')
      .update({ activo: true })
      .eq('id', empleadoExistente.id)

    if (errUpdate) {
      setError('Error al reactivar: ' + errUpdate.message)
      setGuardando(false)
      return
    }

    setGuardando(false)
    onGuardado()
    onCerrar()
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

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              {form.foto_url ? (
                <img
                  src={form.foto_url}
                  alt="preview"
                  className="w-16 h-16 rounded-full object-cover border-2 border-white/30"
                />
              ) : (
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-3xl">
                  {obtenerAvatarPreview()}
                </div>
              )}
              <div>
                <p className="text-xs opacity-80 tracking-wider">{tituloHeader}</p>
                <h2 className="text-2xl font-bold mt-1">
                  {form.nombre.trim() || 'Sin nombre'}
                </h2>
                <p className="text-sm opacity-90 mt-1">
                  {form.rol ? `Rol: ${form.rol}` : 'Selecciona un rol abajo'}
                  {empleadoInactivo && ' · ⚠️ INACTIVO'}
                </p>
              </div>
            </div>
            <button
              onClick={onCerrar}
              className="text-2xl opacity-70 hover:opacity-100"
              disabled={guardando}
            >
              ✕
            </button>
          </div>
        </div>

        {/* AVISO si el empleado está inactivo */}
        {empleadoInactivo && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 text-sm text-yellow-800">
            ⚠️ Este empleado está dado de baja. Puedes reactivarlo desde el botón abajo.
          </div>
        )}

        {/* FORMULARIO */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div>
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
              👤 IDENTIDAD BÁSICA
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombre completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => actualizarCampo('nombre', e.target.value)}
                  placeholder="Ej: Yudelkis Pérez"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Sexo
                </label>
                <select
                  value={form.sexo}
                  onChange={(e) => actualizarCampo('sexo', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">No especificado</option>
                  <option value="hombre">👨 Hombre</option>
                  <option value="mujer">👩 Mujer</option>
                  <option value="otro">👤 Otro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Cédula
                </label>
                <input
                  type="text"
                  value={form.cedula}
                  onChange={(e) => actualizarCampo('cedula', e.target.value)}
                  placeholder="Ej: 402-1234567-8"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
              💼 ROL Y ACCESO
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Rol <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.rol}
                  onChange={(e) => actualizarCampo('rol', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
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
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  PIN de acceso (4 dígitos)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={form.pin}
                  onChange={(e) => actualizarCampo('pin', e.target.value.replace(/\D/g, ''))}
                  placeholder="Ej: 1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">Opcional. Para iniciar sesión en la app.</p>
              </div>

            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
              📞 CONTACTO
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={form.telefono}
                  onChange={(e) => actualizarCampo('telefono', e.target.value)}
                  placeholder="Ej: 809-555-1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => actualizarCampo('email', e.target.value)}
                  placeholder="Ej: yudelkis@empresa.com"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={form.direccion}
                  onChange={(e) => actualizarCampo('direccion', e.target.value)}
                  placeholder="Ej: Calle Principal #45, Esperanza, Valverde"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
              💰 COMPENSACIÓN
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Fecha de contratación
                </label>
                <input
                  type="date"
                  value={form.fecha_contratacion}
                  onChange={(e) => actualizarCampo('fecha_contratacion', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Sueldo (RD$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={form.sueldo}
                  onChange={(e) => actualizarCampo('sueldo', e.target.value)}
                  placeholder="0.00"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Frecuencia de pago
                </label>
                <select
                  value={form.frecuencia_pago}
                  onChange={(e) => actualizarCampo('frecuencia_pago', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">No especificada</option>
                  <option value="dia">Por día</option>
                  <option value="semana">Semanal</option>
                  <option value="quincena">Quincenal</option>
                  <option value="mes">Mensual</option>
                </select>
              </div>

            </div>
            
            {form.sueldo && form.frecuencia_pago && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-sm text-green-800">
                💡 Este empleado recibirá <strong>RD$ {Number(form.sueldo).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong> {' '}
                {form.frecuencia_pago === 'dia' && 'por cada día trabajado'}
                {form.frecuencia_pago === 'semana' && 'cada semana'}
                {form.frecuencia_pago === 'quincena' && 'cada quincena (15 y 30 del mes)'}
                {form.frecuencia_pago === 'mes' && 'cada mes'}
              </div>
            )}
          </div>

          {/* GESTIÓN DEL CONTRATO LABORAL */}
          <div>
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
              📄 GESTIÓN DEL CONTRATO LABORAL
            </p>
            <p className="text-xs text-gray-600 mb-3">
              ¿Cómo manejarás el contrato de este empleado?
            </p>
            <div className="space-y-2">
              
              <label
                className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  form.gestion_contrato === 'sin_contrato'
                    ? 'border-yellow-400 bg-yellow-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="gestion_contrato"
                  value="sin_contrato"
                  checked={form.gestion_contrato === 'sin_contrato'}
                  onChange={(e) => actualizarCampo('gestion_contrato', e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">
                    🟡 Sin gestión de contrato
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Lo manejo por fuera de la app (recomendado si ya tienes tu propio proceso)
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  form.gestion_contrato === 'contrato_digital'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="gestion_contrato"
                  value="contrato_digital"
                  checked={form.gestion_contrato === 'contrato_digital'}
                  onChange={(e) => actualizarCampo('gestion_contrato', e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">
                    🟢 Generar contrato digital
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    La app crea el contrato laboral y se firma digitalmente. Imprimible para archivo físico.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 p-3 border-2 rounded-lg cursor-pointer transition-colors ${
                  form.gestion_contrato === 'contrato_externo'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <input
                  type="radio"
                  name="gestion_contrato"
                  value="contrato_externo"
                  checked={form.gestion_contrato === 'contrato_externo'}
                  onChange={(e) => actualizarCampo('gestion_contrato', e.target.value)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="font-semibold text-sm text-gray-900">
                    🔵 Contrato físico ya firmado
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    Solo registro al empleado, sin generar contrato en la app
                  </p>
                </div>
              </label>

            </div>

            {form.gestion_contrato === 'contrato_digital' && !modoEdicion && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                💡 Después de guardar al empleado, podrás crear su contrato laboral desde la vista de empleados.
              </div>
            )}
            {form.gestion_contrato === 'contrato_digital' && modoEdicion && (
              <div className="mt-3 bg-green-50 border border-green-200 rounded-lg p-3 text-xs text-green-800">
                💡 Podrás generar el contrato desde la vista de empleados o desde la sección "Contratos".
              </div>
            )}
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
              📝 OPCIONAL
            </p>
            <div className="space-y-4">
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  URL de foto (opcional)
                </label>
                <input
                  type="url"
                  value={form.foto_url}
                  onChange={(e) => actualizarCampo('foto_url', e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Si no pones foto, se usará el emoji según el sexo elegido.
                </p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Notas
                </label>
                <textarea
                  value={form.notas}
                  onChange={(e) => actualizarCampo('notas', e.target.value)}
                  placeholder="Cualquier información adicional sobre este empleado..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>

            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              ⚠️ {error}
            </div>
          )}

          {/* ════════════════════════════════════════════════ */}
          {/* INT-005: ZONA PELIGROSA REFACTORIZADA             */}
          {/* Ahora con cumplimiento legal Art. 75-95           */}
          {/* ════════════════════════════════════════════════ */}
          {modoEdicion && !empleadoInactivo && (
            <div className="border-t-2 border-red-200 pt-4 mt-4">
              <p className="text-xs text-red-600 font-semibold tracking-wider mb-2">
                ⚠️ ZONA PELIGROSA
              </p>
              
              {!confirmandoBaja ? (
                <button
                  onClick={() => setConfirmandoBaja(true)}
                  disabled={guardando}
                  className="w-full px-4 py-3 border-2 border-red-300 hover:border-red-500 hover:bg-red-50 text-red-700 rounded-lg font-medium transition disabled:opacity-50"
                >
                  🚫 Dar de baja este empleado
                </button>
              ) : (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-900 mb-2">
                    ¿Dar de baja a {form.nombre}?
                  </p>
                  
                  {/* AVISO LEGAL */}
                  <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 mb-3">
                    <p className="text-xs font-bold text-yellow-900 mb-1">
                      ⚖️ AVISO LEGAL — Código de Trabajo Dominicano
                    </p>
                    <p className="text-xs text-yellow-800">
                      Según los Artículos 75, 76, 80, 87 y 95, todo empleado tiene derecho 
                      a una liquidación que incluya preaviso, cesantía, vacaciones, regalía 
                      y salarios pendientes según corresponda.
                    </p>
                  </div>

                  <p className="text-xs text-gray-700 mb-3">
                    Elige cómo proceder:
                  </p>

                  <div className="space-y-2 mb-3">
                    {/* OPCIÓN 1: IR A CALCULADORA (RECOMENDADA) */}
                    <button
                      onClick={irACalculadoraLiquidacion}
                      disabled={guardando}
                      className="w-full p-3 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold text-sm transition disabled:opacity-50 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">⚖️</span>
                        <div>
                          <p className="font-bold">Ir a Calculadora de Liquidación</p>
                          <p className="text-xs font-normal text-purple-100 mt-1">
                            Recomendado · Calcula automáticamente todo lo que la ley exige pagar
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* OPCIÓN 2: SOLO DESACTIVAR (RIESGOSA) */}
                    <button
                      onClick={desactivarSinLiquidar}
                      disabled={guardando}
                      className="w-full p-3 bg-white border-2 border-red-300 hover:border-red-500 hover:bg-red-50 text-red-700 rounded-lg text-sm transition disabled:opacity-50 text-left"
                    >
                      <div className="flex items-start gap-3">
                        <span className="text-2xl">⚠️</span>
                        <div>
                          <p className="font-bold">Solo desactivar sin liquidar</p>
                          <p className="text-xs font-normal text-red-600 mt-1">
                            Solo si ya pagaste la liquidación por fuera. Tú asumes el riesgo legal.
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>

                  {/* BOTÓN CANCELAR */}
                  <button
                    onClick={() => setConfirmandoBaja(false)}
                    disabled={guardando}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-100 disabled:opacity-50"
                  >
                    Cancelar
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Si el empleado está inactivo, botón de reactivar */}
          {modoEdicion && empleadoInactivo && (
            <div className="border-t-2 border-green-200 pt-4 mt-4">
              <button
                onClick={reactivar}
                disabled={guardando}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition disabled:opacity-50"
              >
                {guardando ? '⏳ Procesando...' : '↺ Reactivar empleado'}
              </button>
            </div>
          )}

        </div>

        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            <span className="text-red-500">*</span> Campos obligatorios
          </p>
          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              disabled={guardando}
              className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={guardando || empleadoInactivo}
              className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
            >
              {guardando ? (
                <>
                  <span className="animate-spin">⏳</span> Guardando...
                </>
              ) : (
                textoBotonGuardar
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ModalEmpleado