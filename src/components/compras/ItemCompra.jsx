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
      unidad: ingrediente?.unidad_stock || item.unidad || 'lb',
      precio_unitario: !item.precio_unitario && ingrediente?.ultimo_costo
        ? ingrediente.ultimo_costo : item.precio_unitario,
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

  // ─── ESTILOS ───
  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', padding: '9px 11px',
    color: 'var(--color-text-primary)',
    fontSize: '13px', fontFamily: 'inherit', outline: 'none',
  }
  const labelStyle = {
    display: 'block', fontSize: '10px', fontWeight: 500,
    color: 'var(--color-text-muted)', marginBottom: '5px',
    letterSpacing: '0.5px', textTransform: 'uppercase',
  }

  return (
    <div style={{
      background: 'var(--color-bg-input)',
      border: '1px solid var(--color-border-subtle)',
      borderRadius: '12px', padding: '14px',
      display: 'flex', flexDirection: 'column', gap: '12px',
      transition: 'border-color 0.15s ease',
    }}>

      {/* Header del item */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{
          fontSize: '10px', color: 'var(--color-text-muted)',
          fontWeight: 600, letterSpacing: '1.5px',
        }}>
          ITEM #{index + 1}
        </div>
        <button type="button" onClick={() => onEliminar(index)} disabled={disabled} style={{
          background: 'rgba(244, 67, 54, 0.12)',
          border: '1px solid rgba(244, 67, 54, 0.35)',
          borderRadius: '8px', padding: '4px 10px',
          color: '#F4C0D1', fontSize: '10px', fontWeight: 600,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1, fontFamily: 'inherit',
        }}>✕ Eliminar</button>
      </div>

      {/* Selector de ingrediente */}
      <div>
        <label style={labelStyle}>
          Ingrediente <span style={{ color: '#E24B4A' }}>*</span>
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

      {/* Cantidad + Unidad + Precio */}
      {(tieneIngrediente || esItemLibre) && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '10px' }}>
            <div>
              <label style={labelStyle}>Cantidad</label>
              <input type="number" step="0.01" min="0"
                value={item.cantidad || ''}
                onChange={(e) => actualizarCampo('cantidad', e.target.value)}
                placeholder="0" disabled={disabled}
                style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </div>
            <div>
              <label style={labelStyle}>Unidad</label>
              <select value={item.unidad || 'lb'}
                onChange={(e) => actualizarCampo('unidad', e.target.value)}
                disabled={disabled} style={inputStyle}>
                {UNIDADES.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Precio unit. (RD$)</label>
              <input type="number" step="0.01" min="0"
                value={item.precio_unitario || ''}
                onChange={(e) => actualizarCampo('precio_unitario', e.target.value)}
                placeholder="0.00" disabled={disabled}
                style={{ ...inputStyle, fontFamily: 'monospace' }} />
            </div>
          </div>

          {/* Subtotal del item */}
          {subtotal > 0 && (
            <div style={{
              background: 'rgba(239, 159, 39, 0.12)',
              border: '1px solid rgba(239, 159, 39, 0.35)',
              borderLeft: '4px solid #EF9F27',
              borderRadius: '10px', padding: '10px 14px',
              textAlign: 'right',
            }}>
              <div style={{ fontSize: '10px', color: '#EF9F27', fontWeight: 600, letterSpacing: '0.5px' }}>
                SUBTOTAL DEL ITEM
              </div>
              <div style={{
                fontSize: '18px', fontWeight: 700, fontFamily: 'monospace',
                color: '#EF9F27', marginTop: '2px',
              }}>
                RD$ {subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </div>
              {tieneIngrediente && cantidad > 0 && (
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                  → Suma {cantidad} {item.unidad} al stock de {item.ingrediente.nombre}
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Mensaje si no hay ingrediente */}
      {!tieneIngrediente && !esItemLibre && (
        <div style={{
          background: 'var(--color-bg-elevated)',
          border: '1px dashed var(--color-border-subtle)',
          borderRadius: '10px', padding: '12px',
          textAlign: 'center',
          fontSize: '11px', color: 'var(--color-text-muted)',
        }}>
          👆 Selecciona un ingrediente para continuar
        </div>
      )}
    </div>
  )
}

export default ItemCompra