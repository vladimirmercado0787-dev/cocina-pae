import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { crearGastoDesdeCompra } from '../../utils/gastosAutomaticos'
import ProveedorSelector from './ProveedorSelector'
import ItemCompra from './ItemCompra'

const CATEGORIAS = [
  { id: 'viveres',     label: 'Víveres',     emoji: '🥫' },
  { id: 'carnes',      label: 'Carnes',      emoji: '🥩' },
  { id: 'vegetales',   label: 'Vegetales',   emoji: '🥬' },
  { id: 'lacteos',     label: 'Lácteos',     emoji: '🥛' },
  { id: 'condimentos', label: 'Condimentos', emoji: '🧂' },
  { id: 'gas',         label: 'Gas',         emoji: '🔥' },
  { id: 'limpieza',    label: 'Limpieza',    emoji: '🧼' },
  { id: 'utiles',      label: 'Útiles',      emoji: '📦' },
  { id: 'otros',       label: 'Otros',       emoji: '📌' },
]

const METODOS_PAGO = [
  { id: 'efectivo',      label: 'Efectivo',      emoji: '💵' },
  { id: 'transferencia', label: 'Transferencia', emoji: '🏦' },
  { id: 'cheque',        label: 'Cheque',        emoji: '📝' },
  { id: 'tarjeta',       label: 'Tarjeta',       emoji: '💳' },
]

function ModalNuevaCompra({ empresaId, usuario, proveedores, onCerrar, onGuardado, onProveedoresActualizados }) {
  const [modo, setModo] = useState('rapido')
  const [ingredientes, setIngredientes] = useState([])
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null)
  const [proveedoresLocales, setProveedoresLocales] = useState(proveedores)
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [numeroFactura, setNumeroFactura] = useState('')
  const [conRNC, setConRNC] = useState(false)
  const [ncf, setNcf] = useState('')
  const [categoria, setCategoria] = useState('viveres')
  const [notas, setNotas] = useState('')
  const [subtotalRapido, setSubtotalRapido] = useState('')
  const [aplicaItbisRapido, setAplicaItbisRapido] = useState(false)
  const [items, setItems] = useState([crearItemVacio()])
  const [aplicaItbisDetallado, setAplicaItbisDetallado] = useState(false)
  const [pagada, setPagada] = useState(true)
  const [fechaPago, setFechaPago] = useState(new Date().toISOString().split('T')[0])
  const [metodoPago, setMetodoPago] = useState('efectivo')
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  function crearItemVacio() {
    return {
      ingrediente_id: null, ingrediente: null, nombre_libre: '',
      cantidad: '', unidad: 'lb', precio_unitario: '',
    }
  }

  useEffect(() => {
    if (modo === 'detallado' && ingredientes.length === 0) cargarIngredientes()
  }, [modo])

  async function cargarIngredientes() {
    const { data } = await supabase.from('ingredientes').select('*').eq('empresa_id', empresaId).order('nombre')
    setIngredientes(data || [])
  }

  function handleProveedorCreado(nuevoProv) {
    setProveedoresLocales([...proveedoresLocales, nuevoProv])
    if (onProveedoresActualizados) onProveedoresActualizados()
  }

  function handleIngredienteCreado(nuevoIng) { setIngredientes([...ingredientes, nuevoIng]) }

  function actualizarItem(index, itemActualizado) {
    const nuevosItems = [...items]; nuevosItems[index] = itemActualizado; setItems(nuevosItems)
  }
  function agregarItem() { setItems([...items, crearItemVacio()]) }
  function eliminarItem(index) {
    if (items.length === 1) setItems([crearItemVacio()])
    else setItems(items.filter((_, i) => i !== index))
  }

  const subtotalRapidoNum = parseFloat(subtotalRapido || 0)
  const itbisRapido = aplicaItbisRapido ? subtotalRapidoNum * 0.18 : 0
  const totalRapido = subtotalRapidoNum + itbisRapido

  const itemsValidos = items.filter(it =>
    (it.ingrediente_id || it.nombre_libre) &&
    parseFloat(it.cantidad || 0) > 0 &&
    parseFloat(it.precio_unitario || 0) > 0
  )
  const subtotalDetallado = itemsValidos.reduce((sum, it) =>
    sum + (parseFloat(it.cantidad) * parseFloat(it.precio_unitario)), 0)
  const itbisDetallado = aplicaItbisDetallado ? subtotalDetallado * 0.18 : 0
  const totalDetallado = subtotalDetallado + itbisDetallado

  const totalFinal = modo === 'rapido' ? totalRapido : totalDetallado
  const subtotalFinal = modo === 'rapido' ? subtotalRapidoNum : subtotalDetallado
  const itbisFinal = modo === 'rapido' ? itbisRapido : itbisDetallado
  const aplicaItbisFinal = modo === 'rapido' ? aplicaItbisRapido : aplicaItbisDetallado

  const proveedorSinRNC = proveedorSeleccionado && !proveedorSeleccionado.rnc && conRNC

  async function guardarCompra() {
    setError('')
    if (!proveedorSeleccionado) { setError('Selecciona o crea un proveedor'); return }
    if (!fecha) { setError('Selecciona la fecha'); return }
    if (conRNC && !ncf.trim()) { setError('Si marcas que tiene RNC, ingresa el NCF'); return }
    if (conRNC && !proveedorSeleccionado.rnc) { setError('Este proveedor no tiene RNC registrado. Edítalo en Proveedores o desmarca "tiene RNC"'); return }
    if (pagada && !metodoPago) { setError('Selecciona el método de pago'); return }

    if (modo === 'rapido') {
      if (subtotalRapidoNum <= 0) { setError('Ingresa un monto válido'); return }
    } else {
      if (itemsValidos.length === 0) { setError('Agrega al menos un item con cantidad y precio'); return }
    }

    setGuardando(true)

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
      .from('compras').insert([nuevaCompra]).select().single()

    if (errCompra) {
      setGuardando(false); setError('Error al guardar compra: ' + errCompra.message); return
    }

    if (modo === 'detallado' && itemsValidos.length > 0) {
      const multiplicadorCosto = aplicaItbisDetallado ? 1.18 : 1.0

      const itemsParaInsertar = itemsValidos.map(it => {
        const cant = parseFloat(it.cantidad), pu = parseFloat(it.precio_unitario)
        return {
          compra_id: compraCreada.id,
          ingrediente_id: it.ingrediente_id || null,
          nombre_libre: it.nombre_libre || null,
          cantidad: cant, unidad: it.unidad, precio_unitario: pu,
          subtotal: cant * pu, tiene_itbis: aplicaItbisDetallado,
        }
      })

      const { error: errItems } = await supabase.from('compras_items').insert(itemsParaInsertar)
      if (errItems) console.error('Error al guardar items:', errItems)

      for (const it of itemsValidos) {
        if (!it.ingrediente_id) continue
        const cant = parseFloat(it.cantidad), pu = parseFloat(it.precio_unitario)
        const costoReal = pu * multiplicadorCosto
        const stockActual = parseFloat(it.ingrediente.stock_actual || 0)
        const nuevoStock = stockActual + cant

        await supabase.from('ingredientes').update({
          stock_actual: nuevoStock,
          ultimo_costo: costoReal,
          ultimo_proveedor_id: proveedorSeleccionado.id,
        }).eq('id', it.ingrediente_id)
      }
    }

    const resultadoGasto = await crearGastoDesdeCompra({
      empresaId, compraId: compraCreada.id, fechaCompra: fecha,
      categoriaCompra: categoria, proveedorNombre: proveedorSeleccionado.nombre,
      numeroFactura: numeroFactura.trim() || null,
      ncf: conRNC ? ncf.trim() : null, conRNC,
      subtotal: subtotalFinal, itbis: itbisFinal, total: totalFinal,
      aplicaItbis: aplicaItbisFinal, pagada,
      fechaPago: pagada ? fechaPago : null,
      metodoPago: pagada ? metodoPago : null,
      registradoPor: usuario.id,
      registradoPorNombre: usuario.nombre || 'Sistema',
    })

    if (!resultadoGasto.success) {
      console.warn('⚠️ Compra guardada OK pero falló crear gasto automático:', resultadoGasto.error)
    } else {
      console.log('✅ Ecosistema conectado: gasto automático creado desde compra')
    }

    setGuardando(false)
    onGuardado()
  }

  // ─── ESTILOS ───
  const inputStyle = {
    width: '100%', boxSizing: 'border-box',
    background: 'var(--color-bg-input)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', padding: '10px 12px',
    color: 'var(--color-text-primary)',
    fontSize: '13px', fontFamily: 'inherit', outline: 'none',
  }
  const labelStyle = {
    display: 'block', fontSize: '10px', fontWeight: 500,
    color: 'var(--color-text-muted)', marginBottom: '6px',
    letterSpacing: '0.5px', textTransform: 'uppercase',
  }
  const seccionAcento = (color) => ({
    background: `rgba(${color}, 0.10)`,
    border: `1px solid rgba(${color}, 0.30)`,
    borderLeft: `4px solid rgb(${color})`,
    borderRadius: '12px', padding: '14px',
    display: 'flex', flexDirection: 'column', gap: '10px',
  })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px', overflowY: 'auto',
    }}>
      <div style={{
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-accent)',
        borderRadius: '16px',
        maxWidth: '820px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '95vh', overflow: 'hidden',
      }}>

        {/* HEADER */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border-subtle)',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(239, 159, 39, 0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
            }}>📦</div>
            <div>
              <div style={{ fontSize: '10px', color: '#EF9F27', letterSpacing: '1.5px', fontWeight: 600 }}>
                REGISTRO DE COMPRA
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                Nueva compra a proveedor
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              display: 'flex', alignItems: 'center',
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '20px', padding: '3px', gap: '2px',
            }}>
              <button type="button" onClick={() => setTema('oscuro')} style={{
                background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
                border: 'none', borderRadius: '16px', padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
              }}>
                <span style={{ fontSize: '11px' }}>🌙</span>
                <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
              </button>
              <button type="button" onClick={() => setTema('tropical')} style={{
                background: tema === 'tropical' ? 'var(--gradient-toggle-active)' : 'transparent',
                border: 'none', borderRadius: '16px', padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
              }}>
                <span style={{ fontSize: '11px' }}>☀️</span>
                <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
              </button>
            </div>
            <button onClick={onCerrar} disabled={guardando} style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '20px', padding: '7px 14px',
              color: 'var(--color-text-secondary)', fontSize: '12px',
              cursor: guardando ? 'not-allowed' : 'pointer',
              opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
            }}>✖ Cerrar</button>
          </div>
        </div>

        {/* TOGGLE MODO */}
        <div style={{
          padding: '14px 24px',
          background: 'var(--color-bg-elevated)',
          borderBottom: '1px solid var(--color-border-subtle)',
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
            <button onClick={() => setModo('rapido')} disabled={guardando} style={{
              padding: '11px',
              background: modo === 'rapido'
                ? 'linear-gradient(135deg, #EF9F27 0%, #C77C13 100%)'
                : 'var(--color-bg-input)',
              border: modo === 'rapido' ? 'none' : '1px solid var(--color-border-subtle)',
              borderRadius: '10px',
              color: modo === 'rapido' ? 'white' : 'var(--color-text-primary)',
              fontSize: '13px', fontWeight: 600,
              cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>⚡ Compra rápida</button>
            <button onClick={() => setModo('detallado')} disabled={guardando} style={{
              padding: '11px',
              background: modo === 'detallado'
                ? 'linear-gradient(135deg, #EF9F27 0%, #C77C13 100%)'
                : 'var(--color-bg-input)',
              border: modo === 'detallado' ? 'none' : '1px solid var(--color-border-subtle)',
              borderRadius: '10px',
              color: modo === 'detallado' ? 'white' : 'var(--color-text-primary)',
              fontSize: '13px', fontWeight: 600,
              cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
            }}>📋 Compra detallada</button>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '8px', textAlign: 'center' }}>
            {modo === 'rapido' ? '⚡ Solo total - NO afecta stock' : '📋 Items específicos - SÍ actualiza stock'}
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* PROVEEDOR */}
          <div>
            <label style={labelStyle}>
              Proveedor <span style={{ color: '#E24B4A' }}>*</span>
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

          {/* FECHA + FACTURA */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                Fecha <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                disabled={guardando} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Nº Factura</label>
              <input type="text" value={numeroFactura}
                onChange={(e) => setNumeroFactura(e.target.value)}
                placeholder="Ej: 001234" disabled={guardando} style={inputStyle} />
            </div>
          </div>

          {/* CATEGORÍA */}
          <div>
            <label style={labelStyle}>Categoría</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
              {CATEGORIAS.map(cat => (
                <button key={cat.id} type="button"
                  onClick={() => setCategoria(cat.id)} disabled={guardando}
                  style={{
                    padding: '10px 8px',
                    background: categoria === cat.id ? 'rgba(239, 159, 39, 0.15)' : 'var(--color-bg-input)',
                    border: categoria === cat.id ? '1px solid rgba(239, 159, 39, 0.5)' : '1px solid var(--color-border-subtle)',
                    borderRadius: '10px',
                    color: categoria === cat.id ? '#EF9F27' : 'var(--color-text-secondary)',
                    fontSize: '11px', fontWeight: 600,
                    cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  }}>
                  <span style={{ fontSize: '18px' }}>{cat.emoji}</span>
                  <span>{cat.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* MODO RÁPIDO */}
          {modo === 'rapido' && (
            <div style={seccionAcento('239, 159, 39')}>
              <div style={{ fontSize: '11px', color: '#EF9F27', letterSpacing: '1.5px', fontWeight: 600 }}>
                💰 MONTOS
              </div>

              <div>
                <label style={labelStyle}>
                  Total de la compra <span style={{ color: '#E24B4A' }}>*</span>
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '14px' }}>RD$</span>
                  <input type="number" step="0.01" min="0"
                    value={subtotalRapido}
                    onChange={(e) => setSubtotalRapido(e.target.value)}
                    placeholder="0.00" disabled={guardando}
                    style={{ ...inputStyle, flex: 1, fontFamily: 'monospace', fontSize: '15px', fontWeight: 600 }} />
                </div>
              </div>

              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <input type="checkbox" checked={aplicaItbisRapido}
                  onChange={(e) => setAplicaItbisRapido(e.target.checked)}
                  disabled={guardando}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                  <strong style={{ color: 'var(--color-text-primary)' }}>Aplicar ITBIS 18%</strong>
                  <span style={{ color: 'var(--color-text-muted)', marginLeft: '4px' }}>- solo si tu factura lo desglosa</span>
                </span>
              </label>

              {subtotalRapidoNum > 0 && (
                <div style={{
                  background: 'var(--color-bg-input)',
                  border: '1px solid rgba(239, 159, 39, 0.3)',
                  borderRadius: '10px', padding: '12px',
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  fontSize: '12px',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                    <span>Subtotal:</span>
                    <span style={{ fontFamily: 'monospace' }}>RD$ {subtotalRapidoNum.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>
                  {aplicaItbisRapido && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                      <span>ITBIS (18%):</span>
                      <span style={{ fontFamily: 'monospace' }}>RD$ {itbisRapido.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                  )}
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    paddingTop: '8px', marginTop: '4px',
                    borderTop: '1px solid var(--color-border-subtle)',
                    color: '#EF9F27', fontWeight: 700, fontSize: '14px',
                  }}>
                    <span>TOTAL:</span>
                    <span style={{ fontFamily: 'monospace' }}>RD$ {totalRapido.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODO DETALLADO */}
          {modo === 'detallado' && (
            <div style={seccionAcento('239, 159, 39')}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '11px', color: '#EF9F27', letterSpacing: '1.5px', fontWeight: 600 }}>
                  📋 ITEMS DE LA COMPRA
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                  {itemsValidos.length} de {items.length} items válidos
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {items.map((item, index) => (
                  <ItemCompra
                    key={index} item={item} index={index}
                    empresaId={empresaId} ingredientes={ingredientes}
                    onActualizar={actualizarItem} onEliminar={eliminarItem}
                    onIngredienteCreado={handleIngredienteCreado}
                    disabled={guardando}
                  />
                ))}
              </div>

              <button type="button" onClick={agregarItem} disabled={guardando} style={{
                width: '100%', padding: '12px',
                background: 'transparent',
                border: '2px dashed rgba(239, 159, 39, 0.4)',
                borderRadius: '10px',
                color: '#EF9F27', fontSize: '13px', fontWeight: 600,
                cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>➕ Agregar otro item</button>

              {subtotalDetallado > 0 && (
                <div style={{
                  background: 'var(--color-bg-input)',
                  border: '1px solid rgba(239, 159, 39, 0.3)',
                  borderRadius: '10px', padding: '14px',
                  display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={aplicaItbisDetallado}
                      onChange={(e) => setAplicaItbisDetallado(e.target.checked)}
                      disabled={guardando}
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
                    <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      <strong style={{ color: 'var(--color-text-primary)' }}>Aplicar ITBIS 18% al total</strong>
                      <span style={{ color: 'var(--color-text-muted)', marginLeft: '4px' }}>- solo si tu factura lo desglosa</span>
                    </span>
                  </label>

                  <div style={{
                    paddingTop: '10px', borderTop: '1px solid var(--color-border-subtle)',
                    display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '12px',
                  }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                      <span>Suma de items:</span>
                      <span style={{ fontFamily: 'monospace' }}>RD$ {subtotalDetallado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                    {aplicaItbisDetallado && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-secondary)' }}>
                        <span>ITBIS (18%):</span>
                        <span style={{ fontFamily: 'monospace' }}>RD$ {itbisDetallado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                      </div>
                    )}
                    <div style={{
                      display: 'flex', justifyContent: 'space-between',
                      paddingTop: '8px', marginTop: '4px',
                      borderTop: '1px solid var(--color-border-subtle)',
                      color: '#EF9F27', fontWeight: 700, fontSize: '14px',
                    }}>
                      <span>TOTAL FACTURA:</span>
                      <span style={{ fontFamily: 'monospace' }}>RD$ {totalDetallado.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  {aplicaItbisDetallado && (
                    <div style={{
                      background: 'rgba(55, 138, 221, 0.12)',
                      border: '1px solid rgba(55, 138, 221, 0.3)',
                      borderRadius: '8px', padding: '8px 10px',
                      fontSize: '10px', color: '#378ADD',
                    }}>
                      💡 Los costos de stock se guardarán CON ITBIS incluido (costo real para tu cocina)
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* RNC / NCF */}
          <div style={seccionAcento('127, 119, 221')}>
            <div style={{ fontSize: '11px', color: '#7F77DD', letterSpacing: '1.5px', fontWeight: 600 }}>
              🧾 INFORMACIÓN FISCAL (DGII)
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={conRNC}
                onChange={(e) => setConRNC(e.target.checked)}
                disabled={guardando}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <span style={{ fontSize: '12px', color: 'var(--color-text-primary)', fontWeight: 600 }}>
                Esta compra tiene factura formal con RNC
              </span>
            </label>

            {proveedorSinRNC && (
              <div style={{
                background: 'rgba(239, 159, 39, 0.15)',
                border: '1px solid rgba(239, 159, 39, 0.35)',
                borderRadius: '8px', padding: '8px 10px',
                fontSize: '11px', color: '#EF9F27',
              }}>
                ⚠️ El proveedor seleccionado no tiene RNC registrado.
              </div>
            )}

            {conRNC && (
              <div>
                <label style={labelStyle}>
                  NCF <span style={{ color: '#E24B4A' }}>*</span>
                </label>
                <input type="text" value={ncf}
                  onChange={(e) => setNcf(e.target.value.toUpperCase())}
                  placeholder="Ej: B0100000123" disabled={guardando}
                  style={{ ...inputStyle, fontFamily: 'monospace' }} />
              </div>
            )}
          </div>

          {/* PAGO */}
          <div style={seccionAcento('29, 158, 117')}>
            <div style={{ fontSize: '11px', color: '#1D9E75', letterSpacing: '1.5px', fontWeight: 600 }}>
              💸 ESTADO DE PAGO
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button type="button" onClick={() => setPagada(true)} disabled={guardando} style={{
                padding: '12px',
                background: pagada ? 'rgba(29, 158, 117, 0.18)' : 'var(--color-bg-input)',
                border: pagada ? '1px solid rgba(29, 158, 117, 0.5)' : '1px solid var(--color-border-subtle)',
                borderRadius: '10px',
                color: pagada ? '#1D9E75' : 'var(--color-text-secondary)',
                fontSize: '12px', fontWeight: 600,
                cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>✅ Ya está pagada</button>
              <button type="button" onClick={() => setPagada(false)} disabled={guardando} style={{
                padding: '12px',
                background: !pagada ? 'rgba(239, 159, 39, 0.18)' : 'var(--color-bg-input)',
                border: !pagada ? '1px solid rgba(239, 159, 39, 0.5)' : '1px solid var(--color-border-subtle)',
                borderRadius: '10px',
                color: !pagada ? '#EF9F27' : 'var(--color-text-secondary)',
                fontSize: '12px', fontWeight: 600,
                cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>⏰ Pendiente de pago</button>
            </div>

            {pagada && (
              <>
                <div>
                  <label style={labelStyle}>Fecha de pago</label>
                  <input type="date" value={fechaPago}
                    onChange={(e) => setFechaPago(e.target.value)}
                    disabled={guardando} style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Método de pago</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
                    {METODOS_PAGO.map(m => (
                      <button key={m.id} type="button"
                        onClick={() => setMetodoPago(m.id)} disabled={guardando}
                        style={{
                          padding: '10px 8px',
                          background: metodoPago === m.id ? 'rgba(29, 158, 117, 0.18)' : 'var(--color-bg-input)',
                          border: metodoPago === m.id ? '1px solid rgba(29, 158, 117, 0.5)' : '1px solid var(--color-border-subtle)',
                          borderRadius: '10px',
                          color: metodoPago === m.id ? '#1D9E75' : 'var(--color-text-secondary)',
                          fontSize: '11px', fontWeight: 600,
                          cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                        }}>
                        <span style={{ fontSize: '16px' }}>{m.emoji}</span>
                        <span>{m.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* NOTAS */}
          <div>
            <label style={labelStyle}>Notas (opcional)</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder="Observaciones, descripciones adicionales..."
              disabled={guardando} rows={2}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>

          {/* AVISO ECOSISTEMA */}
          {totalFinal > 0 && (
            <div style={{
              background: 'rgba(239, 159, 39, 0.12)',
              border: '1px solid rgba(239, 159, 39, 0.35)',
              borderLeft: '4px solid #EF9F27',
              borderRadius: '10px', padding: '12px 14px',
            }}>
              <div style={{ fontSize: '11px', color: '#EF9F27', fontWeight: 600, marginBottom: '6px' }}>
                🔗 Al guardar esta compra se ejecutarán automáticamente:
              </div>
              <ul style={{ fontSize: '11px', color: 'var(--color-text-secondary)', margin: 0, paddingLeft: '20px', lineHeight: 1.6 }}>
                {modo === 'detallado' && (
                  <li>📦 <strong style={{ color: 'var(--color-text-primary)' }}>Actualizar stock</strong> de los ingredientes en inventario</li>
                )}
                <li>💰 <strong style={{ color: 'var(--color-text-primary)' }}>Crear gasto automático</strong> de RD$ {totalFinal.toLocaleString('es-DO', { minimumFractionDigits: 2 })} en módulo Gastos</li>
              </ul>
            </div>
          )}

          {error && (
            <div style={{
              background: 'rgba(244, 67, 54, 0.12)',
              border: '1px solid rgba(244, 67, 54, 0.35)',
              borderRadius: '10px', padding: '12px',
              fontSize: '12px', color: '#F4C0D1',
            }}>⚠️ {error}</div>
          )}
        </div>

        {/* FOOTER */}
        <div style={{
          padding: '16px 24px',
          borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-elevated)',
          display: 'flex', gap: '10px', flexWrap: 'wrap',
        }}>
          <button onClick={onCerrar} disabled={guardando} style={{
            flex: 1, minWidth: '120px', padding: '14px',
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '10px',
            color: 'var(--color-text-secondary)',
            fontSize: '13px', fontWeight: 500,
            cursor: guardando ? 'not-allowed' : 'pointer',
            opacity: guardando ? 0.6 : 1, fontFamily: 'inherit',
          }}>Cancelar</button>

          <button onClick={guardarCompra}
            disabled={guardando || !proveedorSeleccionado || totalFinal <= 0}
            style={{
              flex: 2, minWidth: '220px', padding: '14px',
              background: 'linear-gradient(135deg, #EF9F27 0%, #C77C13 100%)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontSize: '13px', fontWeight: 600,
              cursor: (guardando || !proveedorSeleccionado || totalFinal <= 0) ? 'not-allowed' : 'pointer',
              opacity: (guardando || !proveedorSeleccionado || totalFinal <= 0) ? 0.6 : 1,
              fontFamily: 'inherit',
            }}>
            {guardando
              ? '⏳ Guardando...'
              : `💾 Guardar compra (RD$ ${totalFinal.toLocaleString('es-DO', { minimumFractionDigits: 2 })})`}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ModalNuevaCompra