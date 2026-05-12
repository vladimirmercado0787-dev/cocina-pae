import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import ProveedorSelector from './ProveedorSelector'

const CATEGORIAS = [
  { id: 'viveres', label: '🥫 Víveres', emoji: '🥫' },
  { id: 'carnes', label: '🥩 Carnes', emoji: '🥩' },
  { id: 'vegetales', label: '🥬 Vegetales', emoji: '🥬' },
  { id: 'lacteos', label: '🥛 Lácteos', emoji: '🥛' },
  { id: 'condimentos', label: '🧂 Condimentos', emoji: '🧂' },
  { id: 'gas', label: '🔥 Gas', emoji: '🔥' },
  { id: 'limpieza', label: '🧼 Limpieza', emoji: '🧼' },
  { id: 'utiles', label: '📦 Útiles', emoji: '📦' },
  { id: 'otros', label: '📌 Otros', emoji: '📌' },
]

const METODOS_PAGO = [
  { id: 'efectivo', label: 'Efectivo', emoji: '💵' },
  { id: 'transferencia', label: 'Transferencia', emoji: '🏦' },
  { id: 'cheque', label: 'Cheque', emoji: '📝' },
  { id: 'tarjeta', label: 'Tarjeta', emoji: '💳' },
  { id: 'credito', label: 'Crédito (pendiente)', emoji: '⏰' },
]

function ModalNuevaCompra({ empresaId, usuario, proveedores, onCerrar, onGuardado, onProveedoresActualizados }) {
  // Modo: rapido | detallado
  const [modo, setModo] = useState('rapido')

  // Proveedor seleccionado (objeto completo, no solo ID)
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null)
  const [proveedoresLocales, setProveedoresLocales] = useState(proveedores)

  // Campos comunes
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [numeroFactura, setNumeroFactura] = useState('')
  const [conRNC, setConRNC] = useState(false)
  const [ncf, setNcf] = useState('')
  const [categoria, setCategoria] = useState('viveres')
  const [notas, setNotas] = useState('')

  // Montos (modo rápido)
  const [subtotal, setSubtotal] = useState('')
  const [aplicaItbis, setAplicaItbis] = useState(false)
  
  // Pago
  const [pagada, setPagada] = useState(true)
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [metodoPago, setMetodoPago] = useState('efectivo')

  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Cálculos
  const subtotalNum = parseFloat(subtotal || 0)
  const itbisCalculado = aplicaItbis ? subtotalNum * 0.18 : 0
  const totalCalculado = subtotalNum + itbisCalculado

  // Callback cuando se crea un proveedor inline
  function handleProveedorCreado(nuevoProv) {
    // Agregar a lista local para que aparezca en futuras búsquedas en esta sesión
    setProveedoresLocales([...proveedoresLocales, nuevoProv])
    // Notificar al padre para que recargue (opcional)
    if (onProveedoresActualizados) {
      onProveedoresActualizados()
    }
  }

  // Si la compra está marcada como con RNC pero el proveedor no tiene RNC, advertir
  const proveedorSinRNC = proveedorSeleccionado && !proveedorSeleccionado.rnc && conRNC

  async function guardarCompra() {
    setError('')

    if (!proveedorSeleccionado) {
      setError('Selecciona o crea un proveedor')
      return
    }
    if (!fecha) {
      setError('Selecciona la fecha')
      return
    }
    if (subtotalNum <= 0) {
      setError('Ingresa un monto válido')
      return
    }
    if (conRNC && !ncf.trim()) {
      setError('Si marcas que tiene RNC, ingresa el NCF de la factura')
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

    setGuardando(true)

    const nuevaCompra = {
      empresa_id: empresaId,
      proveedor_id: proveedorSeleccionado.id,
      fecha,
      numero_factura: numeroFactura.trim() || null,
      ncf: conRNC ? ncf.trim() : null,
      con_rnc: conRNC,
      subtotal: subtotalNum,
      itbis: itbisCalculado,
      total: totalCalculado,
      modo: 'rapido',
      categoria,
      pagada,
      fecha_pago: pagada ? fechaPago : null,
      metodo_pago: pagada ? metodoPago : null,
      notas: notas.trim() || null,
      created_by: usuario.id,
    }

    const { error: errSupa } = await supabase
      .from('compras')
      .insert([nuevaCompra])

    setGuardando(false)

    if (errSupa) {
      console.error('Error al guardar:', errSupa)
      setError('Error al guardar: ' + errSupa.message)
      return
    }

    onGuardado()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        
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
              disabled
              className="px-4 py-2 rounded-lg text-sm font-semibold bg-gray-200 text-gray-400 cursor-not-allowed"
              title="Próximamente"
            >
              📋 Detallada (próximamente)
            </button>
          </div>
        </div>

        {/* CONTENIDO SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* PROVEEDOR — Con selector inteligente */}
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
            <p className="text-xs text-gray-500 mt-1">
              💡 Si el proveedor no existe, escribe su nombre y usa "➕ Crear nuevo"
            </p>
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

          {/* MONTOS */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-3">
            <p className="text-xs text-gray-500 font-semibold tracking-wider">💰 MONTOS</p>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Subtotal (sin ITBIS) <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2">
                <span className="text-gray-700 font-bold">RD$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={subtotal}
                  onChange={(e) => setSubtotal(e.target.value)}
                  placeholder="0.00"
                  disabled={guardando}
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-lg font-mono"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aplicaItbis}
                onChange={(e) => setAplicaItbis(e.target.checked)}
                disabled={guardando}
                className="w-4 h-4 rounded"
              />
              <span className="text-sm text-gray-700">
                <strong>Aplica ITBIS (18%)</strong>
                <span className="text-gray-500 ml-1">- algunos productos no lo tienen</span>
              </span>
            </label>

            {/* Resumen visual */}
            {subtotalNum > 0 && (
              <div className="bg-white border border-amber-200 rounded-lg p-3 space-y-1 text-sm">
                <div className="flex justify-between text-gray-700">
                  <span>Subtotal:</span>
                  <span className="font-mono">RD$ {subtotalNum.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                </div>
                {aplicaItbis && (
                  <div className="flex justify-between text-gray-700">
                    <span>ITBIS (18%):</span>
                    <span className="font-mono">RD$ {itbisCalculado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-amber-200 pt-2 text-base font-bold text-amber-900">
                  <span>TOTAL:</span>
                  <span className="font-mono">RD$ {totalCalculado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            )}
          </div>

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
                <strong>Esta compra tiene factura con RNC</strong>
                <span className="text-gray-500 ml-1">- útil para reporte 606 DGII</span>
              </span>
            </label>

            {proveedorSinRNC && (
              <div className="bg-orange-100 border border-orange-300 rounded-lg p-2 text-xs text-orange-800">
                ⚠️ El proveedor seleccionado no tiene RNC registrado. Si esta compra tiene RNC, edita el proveedor en la sección Proveedores.
              </div>
            )}

            {conRNC && (
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  NCF (Número de Comprobante Fiscal) <span className="text-red-500">*</span>
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
                  <div className="grid grid-cols-3 gap-2">
                    {METODOS_PAGO.filter(m => m.id !== 'credito').map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMetodoPago(m.id)}
                        disabled={guardando}
                        className={`px-3 py-2 rounded-lg text-sm font-medium border-2 transition ${
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
              Notas (qué se compró, observaciones, etc.)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej: 50 lb arroz, 10 lb pollo, condimentos varios..."
              disabled={guardando}
              rows={3}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm"
            />
          </div>

          {/* ERROR */}
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
            disabled={guardando || !proveedorSeleccionado}
            className="flex-1 px-4 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {guardando ? (
              <>
                <span className="animate-spin">⏳</span> Guardando...
              </>
            ) : (
              <>💾 Guardar compra</>
            )}
          </button>
        </div>

      </div>
    </div>
  )
}

export default ModalNuevaCompra