import { useState } from 'react'
import { supabase } from '../../supabaseClient'

function Paso1MiCocina({ onCompletado }) {
  const [datos, setDatos] = useState({
    nombre: '',
    rnc: '',
    direccion: '',
    telefono: '',
    email: '',
    banco: '',
    cuenta_bancaria: '',
    modo_operacion: 'aprendizaje'
  })

  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  function actualizarCampo(campo, valor) {
    setDatos({ ...datos, [campo]: valor })
  }

  async function guardar(e) {
    e.preventDefault()
    
    if (!datos.nombre || !datos.rnc) {
      setMensaje({ tipo: 'error', texto: 'Nombre y RNC son obligatorios' })
      return
    }

    setGuardando(true)
    setMensaje(null)

    try {
      const { data, error } = await supabase
        .from('empresas')
        .insert([datos])
        .select()

      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + error.message })
      } else {
        setMensaje({ tipo: 'exito', texto: '✅ Cocina guardada correctamente' })
        if (onCompletado) onCompletado(data[0])
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + err.message })
    } finally {
      setGuardando(false)
    }
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl w-full">
      
      <div className="mb-6">
        <p className="text-xs text-orange-600 font-semibold tracking-wider mb-1">
          PASO 1 DE 6 · ESTIMADO 2 MIN
        </p>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🏢 Mi cocina
        </h2>
        <p className="text-gray-600">
          Datos legales y de contacto de tu cocina
        </p>
      </div>

      <form onSubmit={guardar} className="space-y-4">
        
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Nombre de la cocina <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={datos.nombre}
            onChange={(e) => actualizarCampo('nombre', e.target.value)}
            placeholder="Ej: Hacienda Mercado Rodríguez"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            RNC <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={datos.rnc}
            onChange={(e) => actualizarCampo('rnc', e.target.value)}
            placeholder="Ej: 1-31-44XXX-X"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Dirección
          </label>
          <input
            type="text"
            value={datos.direccion}
            onChange={(e) => actualizarCampo('direccion', e.target.value)}
            placeholder="Ej: Calle Principal #15, Jícome, Valverde"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              type="tel"
              value={datos.telefono}
              onChange={(e) => actualizarCampo('telefono', e.target.value)}
              placeholder="809-555-1234"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={datos.email}
              onChange={(e) => actualizarCampo('email', e.target.value)}
              placeholder="contacto@cocina.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Banco
            </label>
            <input
              type="text"
              value={datos.banco}
              onChange={(e) => actualizarCampo('banco', e.target.value)}
              placeholder="Ej: Banco BHD"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Cuenta bancaria
            </label>
            <input
              type="text"
              value={datos.cuenta_bancaria}
              onChange={(e) => actualizarCampo('cuenta_bancaria', e.target.value)}
              placeholder="1234567890"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Modo de operación
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${datos.modo_operacion === 'aprendizaje' ? 'border-green-600 bg-green-50' : 'border-gray-300 bg-white'}`}>
              <input
                type="radio"
                name="modo"
                value="aprendizaje"
                checked={datos.modo_operacion === 'aprendizaje'}
                onChange={(e) => actualizarCampo('modo_operacion', e.target.value)}
                className="mt-1"
              />
              <div className="ml-3">
                <p className="font-semibold text-gray-900">🌱 Aprendizaje</p>
                <p className="text-xs text-gray-600">App aprende de ti (3-4 semanas)</p>
              </div>
            </label>
            <label className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${datos.modo_operacion === 'detallado' ? 'border-blue-600 bg-blue-50' : 'border-gray-300 bg-white'}`}>
              <input
                type="radio"
                name="modo"
                value="detallado"
                checked={datos.modo_operacion === 'detallado'}
                onChange={(e) => actualizarCampo('modo_operacion', e.target.value)}
                className="mt-1"
              />
              <div className="ml-3">
                <p className="font-semibold text-gray-900">📊 Detallado</p>
                <p className="text-xs text-gray-600">Cargas cantidades exactas</p>
              </div>
            </label>
          </div>
        </div>

        {mensaje && (
          <div className={`p-4 rounded-lg ${mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {mensaje.texto}
          </div>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors"
        >
          {guardando ? 'Guardando...' : 'Guardar y continuar →'}
        </button>

      </form>
    </div>
  )
}

export default Paso1MiCocina