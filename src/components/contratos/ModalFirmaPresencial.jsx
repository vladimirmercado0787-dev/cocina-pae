import { useState, useRef, useEffect } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { supabase } from '../../supabaseClient'

function ModalFirmaPresencial({ 
  contrato, 
  empresa, 
  usuarioActual,
  onCerrar, 
  onFirmasCompletas 
}) {
  // Estados de firmas
  const [firmaPropietario, setFirmaPropietario] = useState(contrato.firma_propietario_base64 || empresa?.firma_propietario_url || '')
  const [firmaEmpleado, setFirmaEmpleado] = useState(contrato.firma_empleado_base64 || '')
  
  // Estados de UI
  const [modoCapturaPropietario, setModoCapturaPropietario] = useState(false)
  const [modoCapturaEmpleado, setModoCapturaEmpleado] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  
  // Refs para canvas
  const firmaPropietarioRef = useRef(null)
  const firmaEmpleadoRef = useRef(null)

  const empleado = contrato.usuario
  const tieneFirmaPropietarioGuardada = !!empresa?.firma_propietario_url
  const ambasFirmas = firmaPropietario && firmaEmpleado

  function capturarFirmaPropietario() {
    if (!firmaPropietarioRef.current || firmaPropietarioRef.current.isEmpty()) {
      alert('Por favor dibuja la firma del empleador antes de guardar')
      return
    }
    const firma = firmaPropietarioRef.current.toDataURL('image/png')
    setFirmaPropietario(firma)
    setModoCapturaPropietario(false)
  }

  function capturarFirmaEmpleado() {
    if (!firmaEmpleadoRef.current || firmaEmpleadoRef.current.isEmpty()) {
      alert('Por favor dibuja la firma del empleado antes de guardar')
      return
    }
    const firma = firmaEmpleadoRef.current.toDataURL('image/png')
    setFirmaEmpleado(firma)
    setModoCapturaEmpleado(false)
  }

  function usarFirmaGuardada() {
    if (empresa?.firma_propietario_url) {
      setFirmaPropietario(empresa.firma_propietario_url)
    }
  }

  function limpiarFirmaPropietario() {
    if (firmaPropietarioRef.current) {
      firmaPropietarioRef.current.clear()
    }
  }

  function limpiarFirmaEmpleado() {
    if (firmaEmpleadoRef.current) {
      firmaEmpleadoRef.current.clear()
    }
  }

  function eliminarFirmaPropietario() {
    if (confirm('¿Eliminar la firma del empleador?')) {
      setFirmaPropietario('')
      setModoCapturaPropietario(false)
    }
  }

  function eliminarFirmaEmpleado() {
    if (confirm('¿Eliminar la firma del empleado?')) {
      setFirmaEmpleado('')
      setModoCapturaEmpleado(false)
    }
  }

  async function activarContrato() {
    if (!firmaPropietario) {
      setError('Falta la firma del empleador')
      return
    }
    if (!firmaEmpleado) {
      setError('Falta la firma del empleado')
      return
    }

    setGuardando(true)
    setError('')

    const ahora = new Date().toISOString()

    const datosActualizacion = {
      firma_propietario_base64: firmaPropietario,
      firma_propietario_at: ahora,
      firma_propietario_por_usuario_id: usuarioActual?.id || null,
      firma_empleado_base64: firmaEmpleado,
      firma_empleado_at: ahora,
      estado: 'activo',
    }

    const { error: errorUpdate } = await supabase
      .from('contratos_empleados')
      .update(datosActualizacion)
      .eq('id', contrato.id)

    if (errorUpdate) {
      console.error('Error activando contrato:', errorUpdate)
      setError('Error al guardar firmas: ' + errorUpdate.message)
      setGuardando(false)
      return
    }

    setGuardando(false)
    
    if (onFirmasCompletas) {
      onFirmasCompletas()
    }
  }

  async function guardarBorrador() {
    if (!firmaPropietario && !firmaEmpleado) {
      setError('Captura al menos una firma para guardar como borrador')
      return
    }

    setGuardando(true)
    setError('')

    const ahora = new Date().toISOString()
    const datosActualizacion = {
      estado: 'pendiente_firma',
    }

    if (firmaPropietario) {
      datosActualizacion.firma_propietario_base64 = firmaPropietario
      datosActualizacion.firma_propietario_at = ahora
      datosActualizacion.firma_propietario_por_usuario_id = usuarioActual?.id || null
    }
    if (firmaEmpleado) {
      datosActualizacion.firma_empleado_base64 = firmaEmpleado
      datosActualizacion.firma_empleado_at = ahora
    }

    const { error: errorUpdate } = await supabase
      .from('contratos_empleados')
      .update(datosActualizacion)
      .eq('id', contrato.id)

    if (errorUpdate) {
      setError('Error al guardar: ' + errorUpdate.message)
      setGuardando(false)
      return
    }

    setGuardando(false)
    if (onFirmasCompletas) {
      onFirmasCompletas()
    }
  }

  function obtenerLabelFrecuencia(freq) {
    const mapa = { semanal: 'semanal', quincenal: 'quincenal', mensual: 'mensual' }
    return mapa[freq] || freq
  }

  function obtenerLabelTipo(tipo) {
    if (tipo === 'obra_servicio') return '📑 Obra/Servicio PAE'
    if (tipo === 'estacional') return '🌾 Estacional'
    if (tipo === 'indefinido') return '♾️ Indefinido'
    return tipo
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-orange-600 to-red-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs opacity-80 tracking-wider">FIRMA PRESENCIAL DEL CONTRATO</p>
              <h2 className="text-2xl font-bold mt-1">
                ✍️ Firmar contrato
              </h2>
              <p className="text-sm opacity-90 mt-1">
                {empleado?.nombre || 'Empleado'} · {contrato.puesto}
              </p>
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

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Resumen del contrato */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs text-purple-700 font-semibold tracking-wider mb-2">
              📄 RESUMEN DEL CONTRATO
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-gray-600">Tipo:</p>
                <p className="font-bold">{obtenerLabelTipo(contrato.tipo_contrato)}</p>
              </div>
              <div>
                <p className="text-gray-600">Salario:</p>
                <p className="font-bold text-green-700">
                  RD$ {Number(contrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })} {obtenerLabelFrecuencia(contrato.frecuencia_pago)}
                </p>
              </div>
              <div>
                <p className="text-gray-600">Inicio:</p>
                <p className="font-bold">{contrato.fecha_inicio}</p>
              </div>
              {contrato.fecha_fin && (
                <div>
                  <p className="text-gray-600">Fin:</p>
                  <p className="font-bold">{contrato.fecha_fin}</p>
                </div>
              )}
            </div>
          </div>

          {/* ─── FIRMA DEL EMPLEADOR ─────────────────────────── */}
          <div className="border-2 border-purple-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  👑 Firma del Empleador
                </h3>
                <p className="text-xs text-gray-600">
                  {empresa?.nombre_propietario || 'Propietario'}
                  {empresa?.cedula_propietario && ` · CC: ${empresa.cedula_propietario}`}
                </p>
              </div>
              {firmaPropietario && (
                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                  ✅ Firmado
                </span>
              )}
            </div>

            {/* CASO 1: Hay firma capturada */}
            {firmaPropietario && !modoCapturaPropietario && (
              <div className="space-y-3">
                <div className="bg-white border-2 border-dashed border-purple-300 rounded-xl p-4 flex items-center justify-center">
                  <img 
                    src={firmaPropietario} 
                    alt="Firma del empleador" 
                    className="max-h-32 max-w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setModoCapturaPropietario(true)
                      setTimeout(() => firmaPropietarioRef.current?.clear(), 100)
                    }}
                    className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-4 py-2 rounded-lg"
                  >
                    🔄 Cambiar firma
                  </button>
                  <button
                    onClick={eliminarFirmaPropietario}
                    className="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold px-4 py-2 rounded-lg"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            )}

            {/* CASO 2: No hay firma capturada, NO está en modo captura */}
            {!firmaPropietario && !modoCapturaPropietario && (
              <div className="space-y-3">
                {tieneFirmaPropietarioGuardada && (
                  <button
                    onClick={usarFirmaGuardada}
                    className="w-full bg-green-50 hover:bg-green-100 border-2 border-green-300 text-green-800 font-bold px-4 py-3 rounded-lg flex items-center justify-center gap-2"
                  >
                    ✅ Usar mi firma guardada (1 click)
                  </button>
                )}
                
                <button
                  onClick={() => setModoCapturaPropietario(true)}
                  className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-3 rounded-lg"
                >
                  ✍️ Capturar firma nueva
                </button>
              </div>
            )}

            {/* CASO 3: Modo captura activo */}
            {modoCapturaPropietario && (
              <div className="space-y-3">
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden">
                  <SignatureCanvas
                    ref={firmaPropietarioRef}
                    canvasProps={{
                      width: 700,
                      height: 200,
                      className: 'w-full bg-white',
                    }}
                    penColor="#1e40af"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={limpiarFirmaPropietario}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm"
                  >
                    🗑️ Limpiar
                  </button>
                  <button
                    onClick={() => setModoCapturaPropietario(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={capturarFirmaPropietario}
                    className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-4 py-2 rounded-lg text-sm ml-auto"
                  >
                    ✅ Guardar firma
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* ─── FIRMA DEL EMPLEADO ──────────────────────────── */}
          <div className="border-2 border-orange-200 rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  👤 Firma del Trabajador
                </h3>
                <p className="text-xs text-gray-600">
                  {empleado?.nombre || 'Empleado'}
                  {empleado?.cedula && ` · CC: ${empleado.cedula}`}
                </p>
              </div>
              {firmaEmpleado && (
                <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                  ✅ Firmado
                </span>
              )}
            </div>

            {/* CASO 1: Hay firma capturada */}
            {firmaEmpleado && !modoCapturaEmpleado && (
              <div className="space-y-3">
                <div className="bg-white border-2 border-dashed border-orange-300 rounded-xl p-4 flex items-center justify-center">
                  <img 
                    src={firmaEmpleado} 
                    alt="Firma del empleado" 
                    className="max-h-32 max-w-full"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setModoCapturaEmpleado(true)
                      setTimeout(() => firmaEmpleadoRef.current?.clear(), 100)
                    }}
                    className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-4 py-2 rounded-lg"
                  >
                    🔄 Cambiar firma
                  </button>
                  <button
                    onClick={eliminarFirmaEmpleado}
                    className="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-bold px-4 py-2 rounded-lg"
                  >
                    🗑️ Eliminar
                  </button>
                </div>
              </div>
            )}

            {/* CASO 2: No hay firma, NO está en modo captura */}
            {!firmaEmpleado && !modoCapturaEmpleado && (
              <button
                onClick={() => setModoCapturaEmpleado(true)}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-3 rounded-lg"
              >
                ✍️ Capturar firma del trabajador
              </button>
            )}

            {/* CASO 3: Modo captura activo */}
            {modoCapturaEmpleado && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  El trabajador debe firmar en este recuadro:
                </p>
                <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden">
                  <SignatureCanvas
                    ref={firmaEmpleadoRef}
                    canvasProps={{
                      width: 700,
                      height: 200,
                      className: 'w-full bg-white',
                    }}
                    penColor="#1e40af"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={limpiarFirmaEmpleado}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm"
                  >
                    🗑️ Limpiar
                  </button>
                  <button
                    onClick={() => setModoCapturaEmpleado(false)}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-lg text-sm"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={capturarFirmaEmpleado}
                    className="bg-orange-600 hover:bg-orange-700 text-white font-bold px-4 py-2 rounded-lg text-sm ml-auto"
                  >
                    ✅ Guardar firma
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Estado del contrato */}
          {ambasFirmas && (
            <div className="bg-green-50 border-2 border-green-300 rounded-xl p-4 text-sm">
              <p className="font-bold text-green-900 flex items-center gap-2">
                ✅ Ambas firmas capturadas
              </p>
              <p className="text-green-800 mt-1">
                Al hacer click en "Activar contrato", el estado cambiará a 🟢 ACTIVO y el contrato será legalmente vinculante en la app.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              ⚠️ {error}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex justify-between items-center flex-wrap gap-2">
          <button
            onClick={onCerrar}
            disabled={guardando}
            className="px-5 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100 transition disabled:opacity-50"
          >
            Cancelar
          </button>

          <div className="flex gap-2">
            {(firmaPropietario || firmaEmpleado) && !ambasFirmas && (
              <button
                onClick={guardarBorrador}
                disabled={guardando}
                className="px-5 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold transition disabled:opacity-50"
              >
                {guardando ? '⏳' : '💾 Guardar progreso'}
              </button>
            )}
            
            <button
              onClick={activarContrato}
              disabled={!ambasFirmas || guardando}
              className="px-5 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg font-bold transition flex items-center gap-2"
            >
              {guardando ? (
                <>
                  <span className="animate-spin">⏳</span> Activando...
                </>
              ) : (
                '✅ Activar contrato'
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ModalFirmaPresencial