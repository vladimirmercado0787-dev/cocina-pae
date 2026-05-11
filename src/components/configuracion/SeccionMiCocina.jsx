import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function SeccionMiCocina({ empresa, onActualizado, mostrarExito }) {
  const [datos, setDatos] = useState({
    nombre: '',
    rnc: '',
    direccion: '',
    telefono: '',
    email: '',
    banco: '',
    cuenta_bancaria: '',
    modo_operacion: 'aprendizaje',
  })
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    if (empresa) {
      setDatos({
        nombre: empresa.nombre || '',
        rnc: empresa.rnc || '',
        direccion: empresa.direccion || '',
        telefono: empresa.telefono || '',
        email: empresa.email || '',
        banco: empresa.banco || '',
        cuenta_bancaria: empresa.cuenta_bancaria || '',
        modo_operacion: empresa.modo_operacion || 'aprendizaje',
      })
    }
  }, [empresa])

  function actualizarCampo(campo, valor) {
    setDatos({ ...datos, [campo]: valor })
  }

  async function guardar() {
    setGuardando(true)
    
    const { error } = await supabase
      .from('empresas')
      .update(datos)
      .eq('id', empresa.id)
    
    setGuardando(false)
    
    if (error) {
      alert('Error guardando: ' + error.message)
      return
    }
    
    mostrarExito('Datos de la cocina actualizados')
    if (onActualizado) onActualizado()
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900">🏢 Mi Cocina</h3>
        <p className="text-gray-500 text-sm mt-1">Datos generales de tu empresa</p>
      </div>

      <div className="space-y-4">

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wider">
            NOMBRE DE LA COCINA
          </label>
          <input
            type="text"
            value={datos.nombre}
            onChange={(e) => actualizarCampo('nombre', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            placeholder="Ej: Elba Gourmet"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wider">
              RNC
            </label>
            <input
              type="text"
              value={datos.rnc}
              onChange={(e) => actualizarCampo('rnc', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              placeholder="1-31-12345-6"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wider">
              TELÉFONO
            </label>
            <input
              type="text"
              value={datos.telefono}
              onChange={(e) => actualizarCampo('telefono', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              placeholder="809-555-1234"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wider">
            DIRECCIÓN
          </label>
          <input
            type="text"
            value={datos.direccion}
            onChange={(e) => actualizarCampo('direccion', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            placeholder="Jícome, Esperanza, Valverde"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wider">
            EMAIL
          </label>
          <input
            type="email"
            value={datos.email}
            onChange={(e) => actualizarCampo('email', e.target.value)}
            className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
            placeholder="contacto@elbagourmet.com"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wider">
              BANCO
            </label>
            <input
              type="text"
              value={datos.banco}
              onChange={(e) => actualizarCampo('banco', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              placeholder="Ej: Banreservas"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1 tracking-wider">
              CUENTA BANCARIA
            </label>
            <input
              type="text"
              value={datos.cuenta_bancaria}
              onChange={(e) => actualizarCampo('cuenta_bancaria', e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500"
              placeholder="000-0000000-0"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-2 tracking-wider">
            MODO DE OPERACIÓN
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => actualizarCampo('modo_operacion', 'aprendizaje')}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                datos.modo_operacion === 'aprendizaje'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-bold text-sm">📚 Aprendizaje</div>
              <p className="text-xs text-gray-500 mt-1">La app aprende y sugiere</p>
            </button>
            <button
              onClick={() => actualizarCampo('modo_operacion', 'detallado')}
              className={`p-4 rounded-xl border-2 text-left transition-colors ${
                datos.modo_operacion === 'detallado'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="font-bold text-sm">📊 Detallado</div>
              <p className="text-xs text-gray-500 mt-1">Control fino de cada operación</p>
            </button>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            onClick={guardar}
            disabled={guardando}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold px-6 py-3 rounded-xl"
          >
            {guardando ? '⏳ Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default SeccionMiCocina