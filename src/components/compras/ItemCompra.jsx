import IngredienteSelector from './IngredienteSelector'

const UNIDADES = [
  'lb', 'kg', 'oz', 'unidad', 'docena', 'gal', 'litro', 
  'paquete', 'saco', 'caja', 'botella', 'lata'
]

function ItemCompra({ 
  item, 
  index, 
  empresaId,
  ingredientes,
  onActualizar, 
  onEliminar,
  onIngredienteCreado,
  disabled = false 
}) {
  
  // Calcular subtotal del item automáticamente
  const cantidad = parseFloat(item.cantidad || 0)
  const precioUnitario = parseFloat(item.precio_unitario || 0)
  const subtotal = cantidad * precioUnitario

  function actualizarCampo(campo, valor) {
    onActualizar(index, { ...item, [campo]: valor })
  }

  function seleccionarIngrediente(ingrediente) {
    onActualizar(index, {
      ...item,
      ingrediente_id: ingrediente ? ingrediente.id : null,
      ingrediente: ingrediente,
      nombre_libre: '',
      // Si tiene unidad de stock predefinida, la usa
      unidad: ingrediente?.unidad_stock || item.unidad || 'lb',
      // Sugiere último costo si existe
      precio_unitario: !item.precio_unitario && ingrediente?.ultimo_costo 
        ? ingrediente.ultimo_costo 
        : item.precio_unitario,
    })
  }

  function setearItemLibre(nombre) {
    onActualizar(index, {
      ...item,
      ingrediente_id: null,
      ingrediente: null,
      nombre_libre: nombre,
    })
  }

  const tieneIngrediente = !!item.ingrediente
  const esItemLibre = !!item.nombre_libre

  return (
    <div className="bg-white border-2 border-gray-200 rounded-xl p-3 space-y-3 hover:border-amber-300 transition">
      
      {/* Header del item */}
      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500 font-bold tracking-wider">
          ITEM #{index + 1}
        </p>
        <button
          type="button"
          onClick={() => onEliminar(index)}
          disabled={disabled}
          className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs px-2 py-1 rounded font-semibold"
        >
          ✕ Eliminar
        </button>
      </div>

      {/* Selector de ingrediente */}
      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">
          Ingrediente <span className="text-red-500">*</span>
        </label>
        <IngredienteSelector
          empresaId={empresaId}
          ingredientes={ingredientes}
          ingredienteSeleccionado={item.ingrediente}
          itemLibreNombre={item.nombre_libre}
          onSeleccionarIngrediente={seleccionarIngrediente}
          onItemLibre={setearItemLibre}
          onIngredienteCreado={onIngredienteCreado}
          disabled={disabled}
        />
      </div>

      {/* Cantidad + Unidad + Precio (solo si tiene ingrediente o item libre) */}
      {(tieneIngrediente || esItemLibre) && (
        <>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Cantidad
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.cantidad || ''}
                onChange={(e) => actualizarCampo('cantidad', e.target.value)}
                placeholder="0"
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Unidad
              </label>
              <select
                value={item.unidad || 'lb'}
                onChange={(e) => actualizarCampo('unidad', e.target.value)}
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
              >
                {UNIDADES.map(u => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Precio unit. (RD$)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={item.precio_unitario || ''}
                onChange={(e) => actualizarCampo('precio_unitario', e.target.value)}
                placeholder="0.00"
                disabled={disabled}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm font-mono"
              />
            </div>
          </div>

          {/* Subtotal del item */}
          {subtotal > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-right">
              <p className="text-xs text-amber-700">Subtotal del item:</p>
              <p className="text-lg font-bold text-amber-900 font-mono">
                RD$ {subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
              {tieneIngrediente && cantidad > 0 && (
                <p className="text-xs text-gray-500">
                  → Suma {cantidad} {item.unidad} al stock de {item.ingrediente.nombre}
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Mensaje si no hay ingrediente seleccionado */}
      {!tieneIngrediente && !esItemLibre && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-center">
          <p className="text-xs text-gray-500">
            👆 Selecciona un ingrediente para continuar
          </p>
        </div>
      )}

    </div>
  )
}

export default ItemCompra