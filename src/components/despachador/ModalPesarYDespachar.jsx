import { useState } from 'react'
import { supabase } from '../../supabaseClient'

function ModalPesarYDespachar({ operacion, escuela, usuario, onCerrar, onGuardado }) {
  const [pesoCocido, setPesoCocido] = useState('')
  const [notas, setNotas] = useState('')
  const [procesando, setProcesando] = useState(false)

  async function guardarYDespachar(conPesaje) {
    setProcesando(true)
    
    const datos = {
      estado: 'despachando',
      despachado_por: usuario.id,
      hora_salida: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }

    // Si pesó, agregamos el peso y las notas
    if (conPesaje) {
      const pesoNum = parseFloat(pesoCocido)
      if (!pesoNum || pesoNum <= 0) {
        alert('Por favor ingresa un peso válido en libras')
        setProcesando(false)
        return
      }
      datos.peso_cocido_lb = pesoNum
      if (notas.trim()) {
        datos.notas_pesaje_cocido = notas.trim()
      }
    }

    const { error } = await supabase
      .from('operaciones_dia')
      .update(datos)
      .eq('id', operacion.id)

    if (error) {
      alert('Error al guardar: ' + error.message)
      setProcesando(false)
      return
    }

    setProcesando(false)
    onGuardado()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl">
        
        {/* Header */}
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900">
            ⚖️ Pesar y Despachar
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            <strong>{escuela.nombre}</strong> · {operacion.raciones_planificadas} raciones
          </p>
        </div>

        {/* Campo de peso */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Peso total de comida cocida (libras)
          </label>
          <div className="relative">
            <input
              type="number"
              step="0.01"
              min="0"
              value={pesoCocido}
              onChange={(e) => setPesoCocido(e.target.value)}
              placeholder="Ej: 85.5"
              className="w-full px-3 py-3 border border-gray-300 rounded-lg text-lg font-bold pr-12"
              autoFocus
            />
            <span className="absolute right-3 top-3 text-gray-500 font-semibold">lb</span>
          </div>
        </div>

        {/* Notas */}
        <div className="mb-4">
          <label className="block text-xs font-semibold text-gray-700 mb-1">
            Notas (opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: Quedó muy sazonado, sobró arroz en olla 2..."
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm resize-none"
          />
        </div>

        {/* Mensaje informativo */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-xs text-blue-800">
            💡 <strong>El pesaje es opcional pero recomendado.</strong> Cada pesaje alimenta la inteligencia operativa: 
            más datos = mejores sugerencias de compras y ajustes de raciones.
          </p>
        </div>

        {/* Botones */}
        <div className="space-y-2">
          <button
            onClick={() => guardarYDespachar(true)}
            disabled={procesando}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold py-3 rounded-xl disabled:opacity-50"
          >
            {procesando ? 'Guardando...' : '✅ Guardar pesaje y despachar'}
          </button>
          
          <button
            onClick={() => guardarYDespachar(false)}
            disabled={procesando}
            className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-3 rounded-xl disabled:opacity-50"
          >
            ⏭️ Despachar sin pesar
          </button>

          <button
            onClick={onCerrar}
            disabled={procesando}
            className="w-full text-gray-500 hover:text-gray-700 font-medium py-2 disabled:opacity-50"
          >
            Cancelar
          </button>
        </div>

      </div>
    </div>
  )
}

export default ModalPesarYDespachar