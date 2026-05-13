import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { normalizarNombre, sonIguales } from '../../utils/normalizarTexto'

const UNIDADES_COMUNES = [
  { id: 'lb', label: 'Libras (lb)' },
  { id: 'kg', label: 'Kilogramos (kg)' },
  { id: 'oz', label: 'Onzas (oz)' },
  { id: 'unidad', label: 'Unidades' },
  { id: 'docena', label: 'Docenas' },
  { id: 'gal', label: 'Galones' },
  { id: 'litro', label: 'Litros' },
  { id: 'paquete', label: 'Paquetes' },
  { id: 'saco', label: 'Sacos' },
  { id: 'caja', label: 'Cajas' },
  { id: 'botella', label: 'Botellas' },
  { id: 'lata', label: 'Latas' },
]

function ModalNuevoIngrediente({ empresaId, ingredienteEditando, onCerrar, onGuardado }) {
  const esEdicion = !!ingredienteEditando

  const [nombre, setNombre] = useState('')
  const [unidad, setUnidad] = useState('lb')
  const [stockActual, setStockActual] = useState('')
  const [stockMinimo, setStockMinimo] = useState('')
  const [ultimoCosto, setUltimoCosto] = useState('')
  const [todosIngredientes, setTodosIngredientes] = useState([])

  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (esEdicion) {
      setNombre(ingredienteEditando.nombre || '')
      setUnidad(ingredienteEditando.unidad_stock || 'lb')
      setStockActual(String(ingredienteEditando.stock_actual || ''))
      setStockMinimo(String(ingredienteEditando.stock_minimo || ''))
      setUltimoCosto(String(ingredienteEditando.ultimo_costo || ''))
    }
    cargarTodosIngredientes()
  }, [ingredienteEditando])

  async function cargarTodosIngredientes() {
    const { data } = await supabase
      .from('ingredientes')
      .select('id, nombre')
      .eq('empresa_id', empresaId)
    setTodosIngredientes(data || [])
  }

  // Preview del nombre normalizado
  const nombreNormalizado = normalizarNombre(nombre)

  // Detección en vivo de duplicado
  const duplicadoDetectado = nombre.trim() && todosIngredientes.find(i => {
    // Si estamos editando, ignorar el propio ingrediente
    if (esEdicion && i.id === ingredienteEditando.id) return false
    return sonIguales(i.nombre, nombre)
  })

  async function guardar() {
    setError('')

    if (!nombreNormalizado) {
      setError('El nombre es obligatorio')
      return
    }

    // ✨ Validación de duplicados con normalización
    if (duplicadoDetectado) {
      setError(`Ya existe el ingrediente "${duplicadoDetectado.nombre}". Edítalo en vez de crear duplicado.`)
      return
    }

    setGuardando(true)

    const datos = {
      nombre: nombreNormalizado,  // ✨ Siempre guardar normalizado
      unidad_stock: unidad,
      stock_actual: parseFloat(stockActual) || 0,
      stock_minimo: parseFloat(stockMinimo) || 0,
      ultimo_costo: parseFloat(ultimoCosto) || null,
    }

    let resultado
    if (esEdicion) {
      resultado = await supabase
        .from('ingredientes')
        .update(datos)
        .eq('id', ingredienteEditando.id)
    } else {
      resultado = await supabase
        .from('ingredientes')
        .insert([{ ...datos, empresa_id: empresaId }])
    }

    setGuardando(false)

    if (resultado.error) {
      setError('Error: ' + resultado.error.message)
      return
    }

    onGuardado()
  }

  async function eliminar() {
    if (!esEdicion) return
    
    const confirmar = window.confirm(
      `¿Eliminar el ingrediente "${ingredienteEditando.nombre}"? Esta acción no se puede deshacer.`
    )
    if (!confirmar) return

    setEliminando(true)
    
    const { error: errDel } = await supabase
      .from('ingredientes')
      .delete()
      .eq('id', ingredienteEditando.id)

    setEliminando(false)

    if (errDel) {
      setError('Error al eliminar: ' + errDel.message)
      return
    }

    onGuardado()
  }

  // ¿El nombre va a cambiar al normalizar?
  const cambiarAlNormalizar = nombre.trim() && nombre !== nombreNormalizado

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-green-600 to-emerald-700 text-white px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs opacity-80 tracking-wider">
                {esEdicion ? 'EDITAR INGREDIENTE' : 'NUEVO INGREDIENTE'}
              </p>
              <h2 className="text-xl font-bold mt-1">
                {esEdicion ? '✏️ Editar' : '🥕 Crear ingrediente'}
              </h2>
            </div>
            <button
              onClick={onCerrar}
              disabled={guardando || eliminando}
              className="text-2xl opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        </div>

        {/* CONTENIDO */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del ingrediente <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={(e) => setNombre(normalizarNombre(e.target.value))}
              placeholder="Ej: Pollo, Arroz, Cebolla..."
              autoFocus={!esEdicion}
              disabled={guardando || eliminando}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            />
            
            {/* Preview de normalización */}
            {cambiarAlNormalizar && (
              <p className="text-xs text-blue-700 mt-1 bg-blue-50 px-2 py-1 rounded">
                💡 Se guardará como: <strong>{nombreNormalizado}</strong>
              </p>
            )}

            {/* Alerta de duplicado */}
            {duplicadoDetectado && (
              <p className="text-xs text-orange-700 mt-1 bg-orange-50 border border-orange-200 px-2 py-1 rounded">
                ⚠️ Ya existe: <strong>{duplicadoDetectado.nombre}</strong>. Edita el existente en vez de crear duplicado.
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Unidad de medida <span className="text-red-500">*</span>
            </label>
            <select
              value={unidad}
              onChange={(e) => setUnidad(e.target.value)}
              disabled={guardando || eliminando}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
            >
              {UNIDADES_COMUNES.map(u => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
            <p className="text-xs text-gray-500 mt-1">
              💡 Si cambias la unidad, el stock anterior podría no tener sentido
            </p>
          </div>

          {/* STOCK */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-xs text-blue-700 font-semibold tracking-wider">📦 INVENTARIO</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Stock actual
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stockActual}
                  onChange={(e) => setStockActual(e.target.value)}
                  placeholder="0"
                  disabled={guardando || eliminando}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">
                  Stock mínimo (alerta)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  value={stockMinimo}
                  onChange={(e) => setStockMinimo(e.target.value)}
                  placeholder="0"
                  disabled={guardando || eliminando}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-mono"
                />
              </div>
            </div>

            <p className="text-xs text-blue-700">
              ℹ️ El stock se actualiza automáticamente cuando registras compras detalladas
            </p>
          </div>

          {/* COSTO */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Último costo unitario (opcional)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-gray-700 font-bold">RD$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                value={ultimoCosto}
                onChange={(e) => setUltimoCosto(e.target.value)}
                placeholder="0.00"
                disabled={guardando || eliminando}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm font-mono"
              />
              <span className="text-gray-500 text-sm">/ {unidad}</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Se actualiza automáticamente con cada compra
            </p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              ⚠️ {error}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4">
          
          {esEdicion && (
            <button
              onClick={eliminar}
              disabled={guardando || eliminando}
              className="w-full px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg text-sm font-semibold mb-3 transition disabled:opacity-50"
            >
              {eliminando ? '⏳ Eliminando...' : '🗑️ Eliminar ingrediente'}
            </button>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              disabled={guardando || eliminando}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100"
            >
              Cancelar
            </button>
            <button
              onClick={guardar}
              disabled={guardando || eliminando || !nombre.trim() || duplicadoDetectado}
              className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <span className="animate-spin">⏳</span> Guardando...
                </>
              ) : (
                <>💾 {esEdicion ? 'Guardar cambios' : 'Crear ingrediente'}</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ModalNuevoIngrediente