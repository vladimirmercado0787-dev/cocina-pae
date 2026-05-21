import { useState, useEffect, useRef } from 'react'
import SignatureCanvas from 'react-signature-canvas'
import { supabase } from '../../supabaseClient'

function SeccionPropietario({ empresa, onActualizado, mostrarExito }) {
  const [datos, setDatos] = useState({
    nombre_propietario: '',
    cedula_propietario: '',
    direccion_propietario: '',
    direccion_propietario_misma: true,
    firma_propietario_url: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [modalFirma, setModalFirma] = useState(false)
  const [subiendoFirma, setSubiendoFirma] = useState(false)
  const firmaRef = useRef(null)

  useEffect(() => {
    if (empresa) {
      setDatos({
        nombre_propietario: empresa.nombre_propietario || '',
        cedula_propietario: empresa.cedula_propietario || '',
        direccion_propietario: empresa.direccion_propietario || '',
        direccion_propietario_misma: empresa.direccion_propietario_misma ?? true,
        firma_propietario_url: empresa.firma_propietario_url || '',
      })
    }
  }, [empresa])

  function actualizarCampo(campo, valor) {
    setDatos({ ...datos, [campo]: valor })
  }

  // Formato cédula: XXX-XXXXXXX-X
  function formatearCedula(valor) {
    const limpio = valor.replace(/\D/g, '').slice(0, 11)
    if (limpio.length <= 3) return limpio
    if (limpio.length <= 10) return `${limpio.slice(0, 3)}-${limpio.slice(3)}`
    return `${limpio.slice(0, 3)}-${limpio.slice(3, 10)}-${limpio.slice(10)}`
  }

  function validarCedula(cedula) {
    const limpio = cedula.replace(/\D/g, '')
    return limpio.length === 11
  }

  // Capturar firma y subir a Supabase Storage
  async function guardarFirma() {
    if (firmaRef.current.isEmpty()) {
      alert('Por favor dibuja tu firma antes de guardar')
      return
    }

    setSubiendoFirma(true)

    try {
      // Convertir canvas a blob PNG
      const canvas = firmaRef.current.getCanvas()
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'))

      // Nombre único: documentos/{empresa_id}/firmas/propietario_{timestamp}.png
      const timestamp = Date.now()
      const ruta = `${empresa.id}/firmas/propietario_${timestamp}.png`

      // Subir a bucket
      const { error: errorUpload } = await supabase.storage
        .from('documentos')
        .upload(ruta, blob, {
          contentType: 'image/png',
          upsert: false,
        })

      if (errorUpload) throw errorUpload

      // Obtener URL pública firmada
      const { data: urlData } = await supabase.storage
        .from('documentos')
        .createSignedUrl(ruta, 60 * 60 * 24 * 365) // URL válida 1 año

      if (!urlData?.signedUrl) throw new Error('No se pudo generar URL')

      // Guardar URL en estado y BD
      const nuevaUrl = urlData.signedUrl

      const { error: errorUpdate } = await supabase
        .from('empresas')
        .update({ firma_propietario_url: nuevaUrl })
        .eq('id', empresa.id)

      if (errorUpdate) throw errorUpdate

      setDatos({ ...datos, firma_propietario_url: nuevaUrl })
      setModalFirma(false)
      mostrarExito('Firma guardada exitosamente')
      if (onActualizado) onActualizado()
    } catch (error) {
      alert('Error guardando firma: ' + error.message)
    } finally {
      setSubiendoFirma(false)
    }
  }

  async function eliminarFirma() {
    if (!confirm('¿Estás seguro de eliminar tu firma?')) return

    const { error } = await supabase
      .from('empresas')
      .update({ firma_propietario_url: null })
      .eq('id', empresa.id)

    if (error) {
      alert('Error: ' + error.message)
      return
    }

    setDatos({ ...datos, firma_propietario_url: '' })
    mostrarExito('Firma eliminada')
    if (onActualizado) onActualizado()
  }

  async function guardar() {
    // Validaciones
    if (!datos.nombre_propietario.trim()) {
      alert('El nombre del propietario es obligatorio')
      return
    }
    if (!datos.cedula_propietario.trim()) {
      alert('La cédula del propietario es obligatoria')
      return
    }
    if (!validarCedula(datos.cedula_propietario)) {
      alert('La cédula debe tener 11 dígitos (formato XXX-XXXXXXX-X)')
      return
    }
    if (!datos.direccion_propietario_misma && !datos.direccion_propietario.trim()) {
      alert('Ingresa la dirección personal o marca "usar misma dirección"')
      return
    }

    setGuardando(true)

    const datosGuardar = {
      nombre_propietario: datos.nombre_propietario.trim(),
      cedula_propietario: datos.cedula_propietario.trim(),
      direccion_propietario_misma: datos.direccion_propietario_misma,
      direccion_propietario: datos.direccion_propietario_misma 
        ? null 
        : datos.direccion_propietario.trim(),
    }

    const { error } = await supabase
      .from('empresas')
      .update(datosGuardar)
      .eq('id', empresa.id)

    setGuardando(false)

    if (error) {
      alert('Error guardando: ' + error.message)
      return
    }

    mostrarExito('Datos del propietario actualizados')
    if (onActualizado) onActualizado()
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900">👤 Datos del Propietario</h3>
        <p className="text-gray-500 text-sm mt-1">
          Información personal para contratos y documentos legales
        </p>
      </div>

      <div className="space-y-6">

        {/* Información personal */}
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
          <h4 className="font-bold text-purple-900 mb-4 text-sm tracking-wider">
            📋 IDENTIFICACIÓN PERSONAL
          </h4>

          <div className="space-y-4">

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wider">
                NOMBRE COMPLETO DEL PROPIETARIO *
              </label>
              <input
                type="text"
                value={datos.nombre_propietario}
                onChange={(e) => actualizarCampo('nombre_propietario', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500"
                placeholder="Ej: Elba Baudilia Rodríguez"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wider">
                CÉDULA DE IDENTIDAD Y ELECTORAL *
              </label>
              <input
                type="text"
                value={datos.cedula_propietario}
                onChange={(e) => actualizarCampo('cedula_propietario', formatearCedula(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-purple-500"
                placeholder="040-1234567-8"
                maxLength={13}
              />
              <p className="text-xs text-gray-500 mt-1">Formato: XXX-XXXXXXX-X (11 dígitos)</p>
            </div>

          </div>
        </div>

        {/* Dirección personal */}
        <div className="bg-green-50 border border-green-200 rounded-2xl p-5">
          <h4 className="font-bold text-green-900 mb-4 text-sm tracking-wider">
            📍 DIRECCIÓN PERSONAL
          </h4>

          <div className="space-y-4">

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={datos.direccion_propietario_misma}
                onChange={(e) => actualizarCampo('direccion_propietario_misma', e.target.checked)}
                className="mt-1 w-5 h-5 rounded"
              />
              <div>
                <div className="font-semibold text-sm">Usar la misma dirección de la cocina</div>
                {datos.direccion_propietario_misma && empresa?.direccion && (
                  <div className="text-xs text-gray-600 mt-1">
                    📍 {empresa.direccion}
                  </div>
                )}
              </div>
            </label>

            {!datos.direccion_propietario_misma && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wider">
                  DIRECCIÓN PERSONAL DEL PROPIETARIO
                </label>
                <input
                  type="text"
                  value={datos.direccion_propietario}
                  onChange={(e) => actualizarCampo('direccion_propietario', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-green-500"
                  placeholder="Calle, sector, municipio, provincia"
                />
              </div>
            )}

          </div>
        </div>

        {/* Firma digital */}
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5">
          <h4 className="font-bold text-amber-900 mb-4 text-sm tracking-wider">
            ✍️ FIRMA DIGITAL DEL PROPIETARIO
          </h4>

          {datos.firma_propietario_url ? (
            <div className="space-y-3">
              <div className="bg-white border-2 border-dashed border-amber-300 rounded-xl p-4 flex items-center justify-center">
                <img 
                  src={datos.firma_propietario_url} 
                  alt="Firma del propietario" 
                  className="max-h-40 max-w-full"
                />
              </div>
              <p className="text-xs text-gray-600">
                ✅ Esta firma se usará automáticamente en conduces, contratos y documentos legales.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setModalFirma(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold px-4 py-2 rounded-xl"
                >
                  🔄 Cambiar firma
                </button>
                <button
                  onClick={eliminarFirma}
                  className="bg-red-100 hover:bg-red-200 text-red-700 text-sm font-semibold px-4 py-2 rounded-xl"
                >
                  🗑️ Eliminar
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="bg-white border-2 border-dashed border-amber-300 rounded-xl p-8 text-center">
                <p className="text-gray-500 text-sm mb-3">Aún no has capturado tu firma</p>
                <button
                  onClick={() => setModalFirma(true)}
                  className="bg-amber-600 hover:bg-amber-700 text-white font-semibold px-6 py-3 rounded-xl"
                >
                  ✍️ Capturar firma
                </button>
              </div>
              <p className="text-xs text-gray-600">
                💡 Tu firma se usará automáticamente para firmar conduces, contratos y otros documentos legales.
              </p>
            </div>
          )}
        </div>

        {/* Botón guardar */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={guardar}
            disabled={guardando}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold px-6 py-3 rounded-xl"
          >
            {guardando ? '⏳ Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>

      </div>

      {/* Modal de captura de firma */}
      {modalFirma && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6">
            <div className="mb-4">
              <h3 className="text-xl font-bold">✍️ Capturar firma del propietario</h3>
              <p className="text-sm text-gray-600 mt-1">
                Firma con el mouse, dedo (touch) o lápiz óptico en el área de abajo
              </p>
            </div>

            <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-xl overflow-hidden mb-4">
              <SignatureCanvas
                ref={firmaRef}
                canvasProps={{
                  width: 600,
                  height: 250,
                  className: 'w-full bg-white',
                }}
                penColor="#1e40af"
              />
            </div>

            <div className="flex flex-col sm:flex-row gap-2 justify-between">
              <button
                onClick={() => firmaRef.current.clear()}
                className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-xl text-sm"
              >
                🗑️ Limpiar
              </button>

              <div className="flex gap-2">
                <button
                  onClick={() => setModalFirma(false)}
                  disabled={subiendoFirma}
                  className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-4 py-2 rounded-xl text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={guardarFirma}
                  disabled={subiendoFirma}
                  className="bg-amber-600 hover:bg-amber-700 disabled:bg-gray-400 text-white font-semibold px-4 py-2 rounded-xl text-sm"
                >
                  {subiendoFirma ? '⏳ Subiendo...' : '💾 Guardar firma'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default SeccionPropietario