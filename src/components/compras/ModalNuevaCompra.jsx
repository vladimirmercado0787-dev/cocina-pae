import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ProveedorSelector from './ProveedorSelector'
import ItemCompra from './ItemCompra'

const CATEGORIAS = [
  { id: 'viveres', label: '🥫 Víveres' },
  { id: 'carnes', label: '🥩 Carnes' },
  { id: 'vegetales', label: '🥬 Vegetales' },
  { id: 'lacteos', label: '🥛 Lácteos' },
  { id: 'condimentos', label: '🧂 Condimentos' },
  { id: 'gas', label: '🔥 Gas' },
  { id: 'limpieza', label: '🧼 Limpieza' },
  { id: 'utiles', label: '📦 Útiles' },
  { id: 'otros', label: '📌 Otros' },
]

const METODOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo', emoji: '💵' },
  { id: 'transferencia', label: 'Transferencia', emoji: '🏦' },
  { id: 'cheque', label: 'Cheque', emoji: '📝' },
  { id: 'tarjeta', label: 'Tarjeta', emoji: '💳' },
]

function ModalNuevaCompra({ empresaId, usuario, proveedores, onCerrar, onGuardado, onProveedoresActualizados }) {
  // Modo
  const [modo, setModo] = useState('rapido')

  // Ingredientes (para modo detallado)
  const [ingredientes, setIngredientes] = useState([])

  // Proveedor
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null)
  const [proveedoresLocales, setProveedoresLocales] = useState(proveedores)

  // Campos comunes
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [numeroFactura, setNumeroFactura] = useState('')
  const [conRNC, setConRNC] = useState(false)
  const [ncf, setNcf] = useState('')
  const [categoria, setCategoria] = useState('viveres')
  const [notas, setNotas] = useState('')

  // Modo Rápido
  const [subtotalRapido, setSubtotalRapido] = useState('')
  const [aplicaItbisRapido, setAplicaItbisRapido] = useState(false)

  // Modo Detallado
  const [items, setItems] = useState([crearItemVacio()])
  const [aplicaItbisDetallado, setAplicaItbisDetallado] = useState(false)
  
  // Pago
  const [pagada, setPagada] = useState(true)
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [metodoPago, setMetodoPago] = useState('efectivo')

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  function crearItemVacio() {
    return {
      ingrediente_id: null,
      ingrediente: null,
      nombre_libre: '',
      cantidad: '',
      unidad: 'lb',
      precio_unitario: '',
    }
  }

  // Cargar ingredientes al cambiar a modo detallado
  useEffect(() => {
    if (modo === 'detallado' && ingredientes.length === 0) {
      cargarIngredientes()
    }
  }, [modo])

  async function cargarIngredientes() {
    const { data } = await supabase
      .from('ingredientes')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nombre')
    setIngredientes(data || [])
  }

  function handleProveedorCreado(nuevoProv) {
    setProveedoresLocales([...proveedoresLocales, nuevoProv])
    if (onProveedoresActualizados) onProveedoresActualizados()
  }

  function handleIngredienteCreado(nuevoIng) {
    setIngredientes([...ingredientes, nuevoIng])
  }

  // === Manejo de items (modo detallado) ===
  function actualizarItem(index, itemActualizado) {
    const nuevosItems = [...items]
    nuevosItems[index] = itemActualizado
    setItems(nuevosItems)
  }

  function agregarItem() {
    setItems([...items, crearItemVacio()])
  }

  function eliminarItem(index) {
    if (items.length === 1) {
      // Si es el último, en vez de eliminarlo, lo vacía
      setItems([crearItemVacio()])
    } else {
      setItems(items.filter((_, i) => i !== index))
    }
  }

  // === Cálculos ===
  // Modo rápido
  const subtotalRapidoNum = parseFloat(subtotalRapido || 0)
  const itbisRapido = aplicaItbisRapido ? subtotalRapidoNum * 0.18 : 0
  const totalRapido = subtotalRapidoNum + itbisRapido

  // Modo detallado
  const itemsValidos = items.filter(it => 
    (it.ingrediente_id || it.nombre_libre) && 
    parseFloat(it.cantidad || 0) > 0 && 
    parseFloat(it.precio_unitario || 0) > 0
  )
  const subtotalDetallado = itemsValidos.reduce((sum, it) => {
    return sum + (parseFloat(it.cantidad) * parseFloat(it.precio_unitario))
  }, 0)
  const itbisDetallado = aplicaItbisDetallado ? subtotalDetallado * 0.18 : 0
  const totalDetallado = subtotalDetallado + itbisDetallado

  // Total final según modo
  const totalFinal = modo === 'rapido' ? totalRapido : totalDetallado
  const subtotalFinal = modo === 'rapido' ? subtotalRapidoNum : subtotalDetallado
  const itbisFinal = modo === 'rapido' ? itbisRapido : itbisDetallado
  const aplicaItbisFinal = modo === 'rapido' ? aplicaItbisRapido : aplicaItbisDetallado

  // Validación del proveedor con/sin RNC
  const proveedorSinRNC = proveedorSeleccionado && !proveedorSeleccionado.rnc && conRNC

  async function guardarCompra() {
    setError('')

    // Validaciones generales
    if (!proveedorSeleccionado) {
      setError('Selecciona o crea un proveedor')
      return
    }
    if (!fecha) {
      setError('Selecciona la fecha')
      return
    }
    if (conRNC && !ncf.trim()) {
      setError('Si marcas que tiene RNC, ingresa el NCF')
      return
    }
    if (conRNC && !proveedorSeleccionado.rnc) {
      setError('Este proveedor no tiene RNC registrado. Edítalo en Proveedores o desmarca "tiene RNC"')
      return
    }
    if (pagada && !metodoPago) {
      setError('Selecciona el método de pago')
      return
    }

    // Validaciones por modo
    if (modo === 'rapido') {
      if (subtotalRapidoNum <= 0) {
        setError('Ingresa un monto válido')
        return
      }
    } else {
      if (itemsValidos.length === 0) {
        setError('Agrega al menos un item con cantidad y precio')
        return
      }
    }

    setGuardando(true)

    // === 1. CREAR LA COMPRA ===
    const nuevaCompra = {
      empresa_id: empresaId,
      proveedor_id: proveedorSeleccionado.id,
      fecha,
      numero_factura: numeroFactura.trim() || null,
      ncf: conRNC ? ncf.trim() : null,
      con_rnc: conRNC,
      subtotal: subtotalFinal,
      itbis: itbisFinal,
      total: totalFinal,
      modo,
      categoria,
      pagada,
      fecha_pago: pagada ? fechaPago : null,
      metodo_pago: pagada ? metodoPago : null,
      notas: notas.trim() || null,
      created_by: usuario.id,
    }

    const { data: compraCreada, error: errCompra } = await supabase
      .from('compras')
      .insert([nuevaCompra])
      .select()
      .single()

    if (errCompra) {
      setGuardando(false)
      setError('Error al guardar compra: ' + errCompra.message)
      return
    }

    // === 2. SI ES MODO DETALLADO: GUARDAR ITEMS + ACTUALIZAR STOCK ===
    if (modo === 'detallado' && itemsValidos.length > 0) {
      // Multiplicador de costo (si ITBIS aplica, el costo real = precio_unitario × 1.18)
      const multiplicadorCosto = aplicaItbisDetallado ? 1.18 : 1.0

      // Preparar items para insertar
      const itemsParaInsertar = itemsValidos.map(it => {
        const cant = parseFloat(it.cantidad)
        const pu = parseFloat(it.precio_unitario)
        return {
          compra_id: compraCreada.id,
          ingrediente_id: it.ingrediente_id || null,
          nombre_libre: it.nombre_libre || null,
          cantidad: cant,
          unidad: it.unidad,
          precio_unitario: pu,
          subtotal: cant * pu,
          tiene_itbis: aplicaItbisDetallado,
        }
      })

      const { error: errItems } = await supabase
        .from('compras_items')
        .insert(itemsParaInsertar)

      if (errItems) {
        console.error('Error al guardar items:', errItems)
        // No bloqueamos: la compra ya está guardada
      }

      // === 3. ACTUALIZAR STOCK DE INGREDIENTES ===
      for (const it of itemsValidos) {
        if (!it.ingrediente_id) continue // skip items libres

        const cant = parseFloat(it.cantidad)
        const pu = parseFloat(it.precio_unitario)
        const costoReal = pu * multiplicadorCosto

        // Stock actual del ingrediente
        const stockActual = parseFloat(it.ingrediente.stock_actual || 0)
        const nuevoStock = stockActual + cant

        await supabase
          .from('ingredientes')
          .update({
            stock_actual: nuevoStock,
            ultimo_costo: costoReal,
            ultimo_proveedor_id: proveedorSeleccionado.id,
          })
          .eq('id', it.ingrediente_id)
      }
    }

    setGuardando(false)
    onGuardado()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-amber-600 to-amber-700 text-white px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs opacity-80 tracking-wider">REGISTRO DE COMPRA</p>
              <h2 className="text-xl font-bold mt-1">📦 Nueva compra a proveedor</h2>
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

        {/* TOGGLE MODO */}
        <div className="bg-gray-50 border-b border-gray-200 px-6 py-3">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setModo('rapido')}
              disabled={guardando}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                modo === 'rapido'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              ⚡ Compra rápida
            </button>
            <button
              onClick={() => setModo('detallado')}
              disabled={guardando}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition ${
                modo === 'detallado'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-white text-gray-700 border border-gray-300'
              }`}
            >
              📋 Compra detallada
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {modo === 'rapido' 
              ? '⚡ Solo total - NO afecta stock' 
              : '📋 Items específicos - SÍ actualiza stock'}
          </p>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* PROVEEDOR */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Proveedor <span className="text-red-500">*</span>
            </label>
            <ProveedorSelector
              empresaId={empresaId}
              proveedores={proveedoresLocales}
              proveedorSeleccionado={proveedorSeleccionado}
              onSeleccionar={setProveedorSeleccionado}
              onProveedorCreado={handleProveedorCreado}
              disabled={guardando}
            />
          </div>

          {/* FECHA + NÚMERO DE FACTURA */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                disabled={guardando}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Nº Factura
              </label>
              <input
                type="text"
                value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder="Ej: 001234"
                disabled={guardando}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* CATEGORÍA */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Categoría
            </label>
            <div className="grid grid-cols-3 gap-2">
              {CATEGORIAS.map(cat => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoria(cat.id)}
                  disabled={guardando}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition ${
                    categoria === cat.id
                      ? 'border-amber-500 bg-amber-50 text-amber-900'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* === MODO RÁPIDO === */}
          {modo === 'rapido' && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <p className="text-xs text-gray-500 font-semibold tracking-wider">💰 MONTOS</p>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Total de la compra <span className="text-red-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-gray-700 font-bold">RD$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={subtotalRapido}
                    onChange={(e) => setSubtotalRapido(e.target.value)}
                    placeholder="0.00"
                    disabled={guardando}
                    className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg font-mono"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={aplicaItbisRapido}
                  onChange={(e) => setAplicaItbisRapido(e.target.checked)}
                  disabled={guardando}
                  className="w-4 h-4 rounded"
                />
                <span className="text-sm text-gray-700">
                  <strong>Aplicar ITBIS 18%</strong>
                  <span className="text-gray-500 ml-1">- solo si tu factura lo desglosa</span>
                </span>
              </label>

              {subtotalRapidoNum > 0 && (
                <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-1 text-sm">
                  <div className="flex justify-between text-gray-700">
                    <span>Subtotal:</span>
                    <span className="font-mono">RD$ {subtotalRapidoNum.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {aplicaItbisRapido && (
                    <div className="flex justify-between text-gray-700">
                      <span>ITBIS (18%):</span>
                      <span className="font-mono">RD$ {itbisRapido.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t border-amber-200 pt-2 text-base font-bold text-amber-900">
                    <span>TOTAL:</span>
                    <span className="font-mono">RD$ {totalRapido.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* === MODO DETALLADO === */}
          {modo === 'detallado' && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-gray-500 font-semibold tracking-wider">📋 ITEMS DE LA COMPRA</p>
                <span className="text-xs text-gray-500">
                  {itemsValidos.length} de {items.length} items válidos
                </span>
              </div>

              <div className="space-y-3">
                {items.map((item, index) => (
                  <ItemCompra
                    key={index}
                    item={item}
                    index={index}
                    empresaId={empresaId}
                    ingredientes={ingredientes}
                    onActualizar={actualizarItem}
                    onEliminar={eliminarItem}
                    onIngredienteCreado={handleIngredienteCreado}
                    disabled={guardando}
                  />
                ))}
              </div>

              <button
                type="button"
                onClick={agregarItem}
                disabled={guardando}
                className="w-full py-3 border-2 border-dashed border-amber-300 text-amber-700 font-bold rounded-lg hover:bg-amber-50 transition"
              >
                ➕ Agregar otro item
              </button>

              {/* ITBIS toggle + Totales */}
              {subtotalDetallado > 0 && (
                <div className="bg-white border-2 border-amber-200 rounded-xl p-4 space-y-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={aplicaItbisDetallado}
                      onChange={(e) => setAplicaItbisDetallado(e.target.checked)}
                      disabled={guardando}
                      className="w-4 h-4 rounded"
                    />
                    <span className="text-sm text-gray-700">
                      <strong>Aplicar ITBIS 18% al total</strong>
                      <span className="text-gray-500 ml-1">- solo si tu factura lo desglosa</span>
                    </span>
                  </label>

                  <div className="space-y-1 text-sm border-t border-amber-200 pt-3">
                    <div className="flex justify-between text-gray-700">
                      <span>Suma de items:</span>
                      <span className="font-mono">RD$ {subtotalDetallado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {aplicaItbisDetallado && (
                      <div className="flex justify-between text-gray-700">
                        <span>ITBIS (18%):</span>
                        <span className="font-mono">RD$ {itbisDetallado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div className="flex justify-between border-t border-amber-200 pt-2 text-base font-bold text-amber-900">
                      <span>TOTAL FACTURA:</span>
                      <span className="font-mono">RD$ {totalDetallado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {aplicaItbisDetallado && (
                    <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                      💡 Los costos de stock se guardarán CON ITBIS incluido (costo real para tu cocina)
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* RNC / NCF */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-3">
            <p className="text-xs text-blue-700 font-semibold tracking-wider">🧾 INFORMACIÓN FISCAL (DGII)</p>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={conRNC}
                onChange={(e) => setConRNC(e.target.checked)}
                disabled={guardando}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">
                <strong>Esta compra tiene factura formal con RNC</strong>
              </span>
            </label>

            {proveedorSinRNC && (
              <div className="bg-orange-100 border border-orange-300 rounded-lg p-2 text-xs text-orange-800">
                ⚠️ El proveedor seleccionado no tiene RNC registrado.
              </div>
            )}

            {conRNC && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  NCF <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={ncf}
                  onChange={(e) => setNcf(e.target.value.toUpperCase())}
                  placeholder="Ej: B0100000123"
                  disabled={guardando}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
            )}
          </div>

          {/* PAGO */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-500 font-semibold tracking-wider">💸 ESTADO DE PAGO</p>
            
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPagada(true)}
                disabled={guardando}
                className={`px-4 py-3 rounded-lg text-sm font-semibold border-2 transition ${
                  pagada
                    ? 'border-green-500 bg-green-50 text-green-900'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                ✅ Ya está pagada
              </button>
              <button
                type="button"
                onClick={() => setPagada(false)}
                disabled={guardando}
                className={`px-4 py-3 rounded-lg text-sm font-semibold border-2 transition ${
                  !pagada
                    ? 'border-orange-500 bg-orange-50 text-orange-900'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                ⏰ Pendiente de pago
              </button>
            </div>

            {pagada && (
              <>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">
                    Fecha de pago
                  </label>
                  <input
                    type="date"
                    value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    disabled={guardando}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Método de pago
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {METODOS_PAGO.map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetodoPago(m.id)}
                        disabled={guardando}
                        className={`px-2 py-2 rounded-lg text-xs font-medium border-2 transition ${
                          metodoPago === m.id
                            ? 'border-green-500 bg-green-50 text-green-900'
                            : 'border-gray-200 bg-white text-gray-700'
                        }`}
                      >
                        {m.emoji} {m.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* NOTAS */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones, descripciones adicionales..."
              disabled={guardando}
              rows={2}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              ⚠️ {error}
            </div>
          )}

        </div>

        {/* FOOTER */}
        <div className="bg-gray-50 border-t border-gray-200 px-6 py-4 flex gap-3">
          <button
            onClick={onCerrar}
            disabled={guardando}
            className="flex-1 px-4 py-3 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={guardarCompra}
            disabled={guardando || !proveedorSeleccionado || totalFinal <= 0}
            className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <span className="animate-spin">⏳</span> Guardando...
              </>
            ) : (
              <>💾 Guardar compra (RD$ {totalFinal.toLocaleString('es-DO', { minimumFractionDigits: 2 })})</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}

export default ModalNuevaCompra