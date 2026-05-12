import { useState, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import SignatureCanvas from 'react-signature-canvas'

function ModalEntregarYFirmar({ operacion, escuela, recetaHoy, empresa, usuario, onCerrar, onGuardado }) {
  const [nombreFirmante, setNombreFirmante] = useState(escuela?.director_nombre || '')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [firmaCapturada, setFirmaCapturada] = useState(false)
  const sigCanvasRef = useRef(null)

  const fechaHoy = new Date()
  const fechaFormateada = fechaHoy.toLocaleDateString('es-DO', { 
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' 
  })
  const horaFormateada = fechaHoy.toLocaleTimeString('es-DO', { 
    hour: '2-digit', minute: '2-digit' 
  })

  // Generar número de conduce
  const numeroConduce = `${fechaHoy.getFullYear()}${String(fechaHoy.getMonth() + 1).padStart(2, '0')}${String(fechaHoy.getDate()).padStart(2, '0')}-${String(operacion?.id || '0000').slice(0, 4)}`

  // Cálculo del subtotal
  const raciones = operacion?.raciones_planificadas || escuela?.raciones_contractuales || 0
  const precioRacion = parseFloat(escuela?.precio_racion) || 0
  const subtotal = raciones * precioRacion

  function borrarFirma() {
    if (sigCanvasRef.current) {
      sigCanvasRef.current.clear()
      setFirmaCapturada(false)
    }
  }

  function onFirmar() {
    setFirmaCapturada(true)
  }

  async function confirmarEntrega() {
    setError('')

    // Validaciones
    if (!nombreFirmante.trim()) {
      setError('Ingresa el nombre de quien firma')
      return
    }

    if (sigCanvasRef.current?.isEmpty()) {
      setError('Por favor solicita al director que firme antes de confirmar')
      return
    }

    setGuardando(true)

    // Capturar la firma como base64
    const firmaBase64 = sigCanvasRef.current.toDataURL('image/png')

    // Guardar en Supabase
    const ahora = new Date().toISOString()

    const { error: errSupa } = await supabase
      .from('operaciones_dia')
      .update({
        estado: 'entregada',
        director_firma: true,
        firma_imagen: firmaBase64,
        firmado_por_nombre: nombreFirmante.trim().toUpperCase(),
        firmado_en: ahora,
        entregado_por: usuario.id,
        hora_entrega: ahora,
        updated_at: ahora,
      })
      .eq('id', operacion.id)

    if (errSupa) {
      console.error('Error al guardar:', errSupa)
      setError('Error al guardar: ' + errSupa.message)
      setGuardando(false)
      return
    }

    setGuardando(false)
    onGuardado()
    onCerrar()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs opacity-80 tracking-wider">CONDUCE DE ENTREGA</p>
              <h2 className="text-xl font-bold mt-1">📝 Confirmar entrega</h2>
            </div>
            <button
              onClick={onCerrar}
              disabled={guardando}
              className="text-2xl opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* MINI CONDUCE */}
          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-5">
            <div className="flex justify-between items-start mb-3">
              <div>
                <p className="font-bold text-gray-900 text-lg">{empresa?.nombre || 'Empresa'}</p>
                {empresa?.rnc && (
                  <p className="text-xs text-gray-600">RNC: {empresa.rnc}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold tracking-wider">CONDUCE</p>
                <p className="font-bold text-gray-900 font-mono text-sm">Nº {numeroConduce}</p>
              </div>
            </div>

            <div className="border-t border-blue-200 pt-3 mt-3">
              <p className="text-xs text-gray-500 font-semibold tracking-wider mb-1">ENTREGADO A:</p>
              <p className="font-bold text-gray-900">{escuela?.nombre}</p>
              {escuela?.direccion && (
                <p className="text-xs text-gray-600">📍 {escuela.direccion}</p>
              )}
              {escuela?.director_nombre && (
                <p className="text-xs text-gray-600">👤 Director: {escuela.director_nombre}</p>
              )}
            </div>

            <div className="border-t border-blue-200 pt-3 mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <p className="text-xs text-gray-500">FECHA</p>
                <p className="text-sm font-bold text-gray-900">
                  {fechaHoy.toLocaleDateString('es-DO')}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500">HORA</p>
                <p className="text-sm font-bold text-gray-900">{horaFormateada}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">RACIONES</p>
                <p className="text-sm font-bold text-gray-900">{raciones}</p>
              </div>
            </div>

            {recetaHoy && (
              <div className="border-t border-blue-200 pt-3 mt-3">
                <p className="text-xs text-gray-500 font-semibold tracking-wider mb-1">MENÚ DEL DÍA:</p>
                <p className="font-semibold text-gray-900">
                  {recetaHoy.emoji} {recetaHoy.nombre}
                </p>
              </div>
            )}

            {subtotal > 0 && (
              <div className="border-t border-blue-300 pt-3 mt-3 bg-white -mx-5 -mb-5 px-5 pb-3 rounded-b-xl">
                <div className="flex justify-between items-center">
                  <p className="text-sm font-semibold text-gray-700">SUBTOTAL:</p>
                  <p className="text-xl font-bold text-gray-900">
                    RD$ {subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* INSTRUCCIONES */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm text-yellow-900">
            👇 <strong>Por favor solicita al director(a) que firme abajo:</strong>
          </div>

          {/* CAMPO NOMBRE */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre de quien firma <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombreFirmante}
              onChange={(e) => {
                setNombreFirmante(e.target.value)
                if (error) setError('')
              }}
              placeholder="Ej: Juan Espinal"
              disabled={guardando}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-base"
            />
          </div>

          {/* CANVAS DE FIRMA */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Firma <span className="text-red-500">*</span>
            </label>
            <div className="border-2 border-dashed border-gray-400 rounded-lg bg-white relative">
              <SignatureCanvas
                ref={sigCanvasRef}
                penColor="#000000"
                canvasProps={{
                  className: 'w-full h-48 rounded-lg',
                  style: { touchAction: 'none' }
                }}
                onEnd={onFirmar}
              />
              {!firmaCapturada && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <p className="text-gray-300 text-sm italic">
                    Firma aquí con el dedo o mouse...
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-between items-center mt-2">
              <button
                type="button"
                onClick={borrarFirma}
                disabled={guardando}
                className="text-sm text-gray-600 hover:text-red-600 underline"
              >
                🗑️ Borrar y volver a firmar
              </button>
              {firmaCapturada && (
                <p className="text-xs text-green-700 font-semibold">
                  ✓ Firma capturada
                </p>
              )}
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              ⚠️ {error}
            </div>
          )}

        </div>

        {/* FOOTER con botones */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onCerrar}
            disabled={guardando}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={confirmarEntrega}
            disabled={guardando}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-base transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <span className="animate-spin">⏳</span> Guardando...
              </>
            ) : (
              <>✅ Confirmar entrega</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}

export default ModalEntregarYFirmar