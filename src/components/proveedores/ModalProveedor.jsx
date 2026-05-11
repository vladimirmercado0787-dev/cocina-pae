import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function ModalProveedor({ empresaId, proveedorExistente, onCerrar, onGuardado }) {
  const modoEdicion = !!proveedorExistente

  const [form, setForm] = useState({
    nombre: '',
    rnc: '',
    contacto_nombre: '',
    contacto_telefono: '',
    direccion: '',
    notas: '',
  })
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')
  const [confirmandoBaja, setConfirmandoBaja] = useState(false)

  useEffect(() => {
    if (modoEdicion && proveedorExistente) {
      setForm({
        nombre: proveedorExistente.nombre || '',
        rnc: proveedorExistente.rnc || '',
        contacto_nombre: proveedorExistente.contacto_nombre || '',
        contacto_telefono: proveedorExistente.contacto_telefono || '',
        direccion: proveedorExistente.direccion || '',
        notas: proveedorExistente.notas || '',
      })
    }
  }, [proveedorExistente, modoEdicion])

  function actualizarCampo(campo, valor) {
    setForm({ ...form, [campo]: valor })
    if (error) setError('')
  }

  function validar() {
    if (!form.nombre.trim()) {
      setError('El nombre del proveedor es obligatorio')
      return false
    }
    return true
  }

  async function guardar() {
    if (!validar()) return
    
    setGuardando(true)
    setError('')

    const datos = {
      nombre: form.nombre.trim(),
      rnc: form.rnc.trim() || null,
      contacto_nombre: form.contacto_nombre.trim() || null,
      contacto_telefono: form.contacto_telefono.trim() || null,
      direccion: form.direccion.trim() || null,
      notas: form.notas.trim() || null,
    }

    let errorSupa = null

    if (modoEdicion) {
      const { error: errUpdate } = await supabase
        .from('proveedores')
        .update(datos)
        .eq('id', proveedorExistente.id)
      errorSupa = errUpdate
    } else {
      const { error: errInsert } = await supabase
        .from('proveedores')
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

  async function darDeBaja() {
    setGuardando(true)
    setError('')

    const { error: errUpdate } = await supabase
      .from('proveedores')
      .update({ activo: false })
      .eq('id', proveedorExistente.id)

    if (errUpdate) {
      setError('Error al dar de baja: ' + errUpdate.message)
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
      .from('proveedores')
      .update({ activo: true })
      .eq('id', proveedorExistente.id)

    if (errUpdate) {
      setError('Error al reactivar: ' + errUpdate.message)
      setGuardando(false)
      return
    }

    setGuardando(false)
    onGuardado()
    onCerrar()
  }

  const tituloHeader = modoEdicion ? 'EDITAR PROVEEDOR' : 'NUEVO PROVEEDOR'
  const textoBotonGuardar = modoEdicion ? '💾 Guardar cambios' : '💾 Guardar proveedor'
  const proveedorInactivo = modoEdicion && proveedorExistente.activo === false

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl bg-white/20 flex items-center justify-center text-3xl">
                🏭
              </div>
              <div>
                <p className="text-xs opacity-80 tracking-wider">{tituloHeader}</p>
                <h2 className="text-2xl font-bold mt-1">
                  {form.nombre.trim() || 'Sin nombre'}
                </h2>
                <p className="text-sm opacity-90 mt-1">
                  {form.rnc ? `RNC: ${form.rnc}` : 'Sin RNC registrado'}
                  {proveedorInactivo && ' · ⚠️ INACTIVO'}
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

        {/* AVISO si está inactivo */}
        {proveedorInactivo && (
          <div className="bg-yellow-50 border-b border-yellow-200 px-6 py-3 text-sm text-yellow-800">
            ⚠️ Este proveedor está dado de baja. Puedes reactivarlo desde el botón abajo.
          </div>
        )}

        {/* FORMULARIO */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          <div>
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
              🏭 IDENTIDAD DEL PROVEEDOR
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombre / Razón social <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={(e) => actualizarCampo('nombre', e.target.value)}
                  placeholder="Ej: Colmado El Recreo, Carnicería Don José..."
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  RNC
                </label>
                <input
                  type="text"
                  value={form.rnc}
                  onChange={(e) => actualizarCampo('rnc', e.target.value)}
                  placeholder="Ej: 1-23-45678-9"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Importante para reportes DGII 606. Opcional pero recomendado.
                </p>
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
                  Nombre del contacto
                </label>
                <input
                  type="text"
                  value={form.contacto_nombre}
                  onChange={(e) => actualizarCampo('contacto_nombre', e.target.value)}
                  placeholder="Ej: Don José Pérez"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={form.contacto_telefono}
                  onChange={(e) => actualizarCampo('contacto_telefono', e.target.value)}
                  placeholder="Ej: 809-555-1234"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                  placeholder="Ej: Calle Duarte #45, Esperanza, Valverde"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

            </div>
          </div>

          <div>
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
              📝 NOTAS
            </p>
            <textarea
              value={form.notas}
              onChange={(e) => actualizarCampo('notas', e.target.value)}
              placeholder="Días de visita, productos que vende, formas de pago, etc."
              rows={3}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              ⚠️ {error}
            </div>
          )}

          {/* ZONA PELIGROSA */}
          {modoEdicion && !proveedorInactivo && (
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
                  🚫 Dar de baja este proveedor
                </button>
              ) : (
                <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                  <p className="text-sm font-bold text-red-900 mb-2">
                    ¿Seguro que quieres dar de baja a {form.nombre}?
                  </p>
                  <p className="text-xs text-red-700 mb-3">
                    El proveedor no será borrado. Quedará marcado como inactivo y su histórico se conservará. Puedes reactivarlo en cualquier momento.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setConfirmandoBaja(false)}
                      disabled={guardando}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-gray-700 text-sm font-medium hover:bg-gray-100"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={darDeBaja}
                      disabled={guardando}
                      className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-bold transition disabled:opacity-50"
                    >
                      {guardando ? '⏳ Procesando...' : '🚫 Sí, dar de baja'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {modoEdicion && proveedorInactivo && (
            <div className="border-t-2 border-green-200 pt-4 mt-4">
              <button
                onClick={reactivar}
                disabled={guardando}
                className="w-full px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition disabled:opacity-50"
              >
                {guardando ? '⏳ Procesando...' : '↺ Reactivar proveedor'}
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
              disabled={guardando || proveedorInactivo}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition disabled:opacity-50 flex items-center gap-2"
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

export default ModalProveedor