import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import CategoriaSelector from './CategoriaSelector'
import ProveedorSelector from '../compras/ProveedorSelector'

const TIPOS_NCF = [
  { id: 'B01', label: 'B01 - Crédito Fiscal' },
  { id: 'B02', label: 'B02 - Consumidor Final' },
  { id: 'B11', label: 'B11 - Comprobante Único' },
  { id: 'B14', label: 'B14 - Régimen Especial' },
  { id: 'B15', label: 'B15 - Gubernamental' },
]

const FORMAS_PAGO = [
  { id: 'efectivo', label: '💵 Efectivo', icono: '💵' },
  { id: 'transferencia', label: '🏦 Transferencia', icono: '🏦' },
  { id: 'tarjeta', label: '💳 Tarjeta', icono: '💳' },
  { id: 'cheque', label: '📄 Cheque', icono: '📄' },
  { id: 'pendiente', label: '⏰ Por pagar', icono: '⏰' },
]

function ModalNuevoGasto({ 
  empresaId, 
  usuario,
  categorias,
  proveedores,
  gastoEditando,
  onCerrar, 
  onGuardado,
  onCategoriaCreada,
  onProveedorCreado
}) {
  const esEdicion = !!gastoEditando

  // Estados del formulario
  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [subtotal, setSubtotal] = useState('')
  const [aplicaItbis, setAplicaItbis] = useState(false)
  
  // Proveedor (opcional)
  const [conProveedor, setConProveedor] = useState(false)
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null)
  const [proveedorNombreSuelto, setProveedorNombreSuelto] = useState('')
  
  // RNC/NCF
  const [conRnc, setConRnc] = useState(false)
  const [rnc, setRnc] = useState('')
  const [ncf, setNcf] = useState('')
  const [tipoNcf, setTipoNcf] = useState('B02')
  
  // Pago
  const [formaPago, setFormaPago] = useState('efectivo')
  const [pagado, setPagado] = useState(true)
  
  // Notas
  const [notas, setNotas] = useState('')
  
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')

  // Si es edición, cargar datos
  useEffect(() => {
    if (esEdicion && gastoEditando) {
      const cat = categorias.find(c => c.id === gastoEditando.categoria_id)
      setCategoriaSeleccionada(cat || null)
      setDescripcion(gastoEditando.descripcion || '')
      setFecha(gastoEditando.fecha || new Date().toISOString().split('T')[0])
      setSubtotal(String(gastoEditando.subtotal || ''))
      setAplicaItbis(gastoEditando.aplica_itbis || false)
      
      if (gastoEditando.proveedor_id) {
        setConProveedor(true)
        const prov = proveedores.find(p => p.id === gastoEditando.proveedor_id)
        setProveedorSeleccionado(prov || null)
      } else if (gastoEditando.proveedor_nombre) {
        setConProveedor(true)
        setProveedorNombreSuelto(gastoEditando.proveedor_nombre)
      }
      
      setConRnc(gastoEditando.con_rnc || false)
      setRnc(gastoEditando.rnc || '')
      setNcf(gastoEditando.ncf || '')
      setTipoNcf(gastoEditando.tipo_ncf || 'B02')
      setFormaPago(gastoEditando.forma_pago || 'efectivo')
      setPagado(gastoEditando.pagado !== false)
      setNotas(gastoEditando.notas || '')
    }
  }, [gastoEditando])

  // Cálculos
  const subtotalNum = parseFloat(subtotal) || 0
  const itbisCalculado = aplicaItbis ? subtotalNum * 0.18 : 0
  const totalCalculado = subtotalNum + itbisCalculado

  async function guardar() {
    setError('')

    // Validaciones
    if (!categoriaSeleccionada) {
      setError('Selecciona una categoría')
      return
    }
    if (!descripcion.trim()) {
      setError('Agrega una descripción')
      return
    }
    if (subtotalNum <= 0) {
      setError('El monto debe ser mayor a 0')
      return
    }
    if (conRnc && !rnc.trim()) {
      setError('Si marcaste "Con RNC", debes ingresar el RNC')
      return
    }

    setGuardando(true)

    const datos = {
      empresa_id: empresaId,
      categoria_id: categoriaSeleccionada.id,
      descripcion: descripcion.trim(),
      fecha,
      subtotal: subtotalNum,
      aplica_itbis: aplicaItbis,
      itbis: itbisCalculado,
      total: totalCalculado,
      proveedor_id: conProveedor && proveedorSeleccionado ? proveedorSeleccionado.id : null,
      proveedor_nombre: conProveedor && !proveedorSeleccionado && proveedorNombreSuelto.trim() 
        ? proveedorNombreSuelto.trim() 
        : null,
      con_rnc: conRnc,
      rnc: conRnc ? rnc.trim() : null,
      ncf: conRnc ? ncf.trim() : null,
      tipo_ncf: conRnc ? tipoNcf : null,
      forma_pago: formaPago,
      pagado: formaPago === 'pendiente' ? false : pagado,
      notas: notas.trim() || null,
      registrado_por: usuario?.id || null,
      registrado_por_nombre: usuario?.nombre || null,
    }

    let resultado
    if (esEdicion) {
      resultado = await supabase
        .from('gastos')
        .update(datos)
        .eq('id', gastoEditando.id)
    } else {
      resultado = await supabase
        .from('gastos')
        .insert([datos])
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
      `¿Eliminar el gasto "${gastoEditando.descripcion}" por RD$ ${parseFloat(gastoEditando.total).toLocaleString('es-DO')}? Esta acción no se puede deshacer.`
    )
    if (!confirmar) return

    setEliminando(true)
    
    const { error: errDel } = await supabase
      .from('gastos')
      .delete()
      .eq('id', gastoEditando.id)

    setEliminando(false)

    if (errDel) {
      setError('Error al eliminar: ' + errDel.message)
      return
    }

    onGuardado()
  }

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        
        {/* HEADER */}
        <div className="bg-gradient-to-r from-rose-600 to-pink-700 text-white px-6 py-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs opacity-80 tracking-wider">
                {esEdicion ? 'EDITAR GASTO' : 'NUEVO GASTO'}
              </p>
              <h2 className="text-xl font-bold mt-1">
                {esEdicion ? '✏️ Editar gasto' : '💸 Registrar gasto'}
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
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          
          {/* CATEGORÍA */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Categoría <span className="text-red-500">*</span>
            </label>
            <CategoriaSelector
              empresaId={empresaId}
              categorias={categorias}
              categoriaSeleccionada={categoriaSeleccionada}
              onSeleccionar={setCategoriaSeleccionada}
              onCategoriaCreada={onCategoriaCreada}
              disabled={guardando || eliminando}
            />
          </div>

          {/* DESCRIPCIÓN */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Gas para cocina (cilindro 100 lb)"
              disabled={guardando || eliminando}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
          </div>

          {/* FECHA Y MONTO */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Fecha <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value)}
                disabled={guardando || eliminando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Monto (RD$) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)}
                placeholder="0.00"
                disabled={guardando || eliminando}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
              />
            </div>
          </div>

          {/* ITBIS */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={aplicaItbis}
                onChange={(e) => setAplicaItbis(e.target.checked)}
                disabled={guardando || eliminando}
                className="w-4 h-4 text-amber-600"
              />
              <span className="text-sm font-semibold text-amber-900">
                Aplicar ITBIS 18%
              </span>
            </label>
            {aplicaItbis && subtotalNum > 0 && (
              <div className="mt-2 text-xs text-amber-800 grid grid-cols-3 gap-2 font-mono">
                <span>Subtotal: RD$ {subtotalNum.toFixed(2)}</span>
                <span>ITBIS: RD$ {itbisCalculado.toFixed(2)}</span>
                <span className="font-bold">Total: RD$ {totalCalculado.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* PROVEEDOR (OPCIONAL) */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={conProveedor}
                onChange={(e) => setConProveedor(e.target.checked)}
                disabled={guardando || eliminando}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm font-semibold text-blue-900">
                🏭 Asociar a un proveedor
              </span>
            </label>

            {conProveedor && (
              <div className="space-y-2 mt-3">
                <ProveedorSelector
                  empresaId={empresaId}
                  proveedores={proveedores}
                  proveedorSeleccionado={proveedorSeleccionado}
                  onSeleccionarProveedor={setProveedorSeleccionado}
                  onProveedorCreado={onProveedorCreado}
                  disabled={guardando || eliminando}
                />
                <p className="text-xs text-blue-700">
                  💡 O escribe el nombre suelto si no está en tu lista:
                </p>
                <input
                  type="text"
                  value={proveedorNombreSuelto}
                  onChange={(e) => setProveedorNombreSuelto(e.target.value)}
                  placeholder="Ej: Estación Texaco Esperanza"
                  disabled={proveedorSeleccionado || guardando || eliminando}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
                />
              </div>
            )}
          </div>

          {/* RNC/NCF (OPCIONAL) */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3">
            <label className="flex items-center gap-2 cursor-pointer mb-2">
              <input
                type="checkbox"
                checked={conRnc}
                onChange={(e) => setConRnc(e.target.checked)}
                disabled={guardando || eliminando}
                className="w-4 h-4 text-purple-600"
              />
              <span className="text-sm font-semibold text-purple-900">
                🧾 Factura con RNC (para reporte 606 DGII)
              </span>
            </label>

            {conRnc && (
              <div className="space-y-2 mt-3">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={rnc}
                    onChange={(e) => setRnc(e.target.value)}
                    placeholder="RNC (Ej: 130123456)"
                    disabled={guardando || eliminando}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                  />
                  <select
                    value={tipoNcf}
                    onChange={(e) => setTipoNcf(e.target.value)}
                    disabled={guardando || eliminando}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {TIPOS_NCF.map(t => (
                      <option key={t.id} value={t.id}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <input
                  type="text"
                  value={ncf}
                  onChange={(e) => setNcf(e.target.value)}
                  placeholder="NCF (Ej: B0200000001)"
                  disabled={guardando || eliminando}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono"
                />
              </div>
            )}
          </div>

          {/* FORMA DE PAGO */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Forma de pago
            </label>
            <div className="grid grid-cols-5 gap-2">
              {FORMAS_PAGO.map(fp => (
                <button
                  key={fp.id}
                  type="button"
                  onClick={() => {
                    setFormaPago(fp.id)
                    if (fp.id === 'pendiente') setPagado(false)
                    else setPagado(true)
                  }}
                  disabled={guardando || eliminando}
                  className={`p-2 rounded-lg border-2 text-xs font-semibold transition ${
                    formaPago === fp.id
                      ? 'border-rose-500 bg-rose-50 text-rose-900'
                      : 'border-gray-200 hover:border-gray-300 text-gray-600'
                  }`}
                >
                  <span className="text-lg block">{fp.icono}</span>
                  {fp.label.replace(fp.icono, '').trim()}
                </button>
              ))}
            </div>
          </div>

          {/* NOTAS */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles adicionales..."
              rows="2"
              disabled={guardando || eliminando}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
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
              {eliminando ? '⏳ Eliminando...' : '🗑️ Eliminar gasto'}
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
              disabled={guardando || eliminando}
              className="flex-1 px-4 py-3 bg-gradient-to-r from-rose-600 to-pink-700 hover:from-rose-700 hover:to-pink-800 text-white rounded-lg font-bold transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {guardando ? (
                <>
                  <span className="animate-spin">⏳</span> Guardando...
                </>
              ) : (
                <>💾 {esEdicion ? 'Guardar cambios' : `Registrar gasto (RD$ ${totalCalculado.toFixed(2)})`}</>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}

export default ModalNuevoGasto