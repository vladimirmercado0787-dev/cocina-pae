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
  { id: 'efectivo',      label: 'Efectivo',       icono: '💵' },
  { id: 'transferencia', label: 'Transferencia',  icono: '🏦' },
  { id: 'tarjeta',       label: 'Tarjeta',        icono: '💳' },
  { id: 'cheque',        label: 'Cheque',         icono: '📄' },
  { id: 'pendiente',     label: 'Por pagar',      icono: '⏰' },
]

function ModalNuevoGasto({
  empresaId, usuario, categorias, proveedores, gastoEditando,
  onCerrar, onGuardado, onCategoriaCreada, onProveedorCreado
}) {
  const esEdicion = !!gastoEditando

  const [categoriaSeleccionada, setCategoriaSeleccionada] = useState(null)
  const [descripcion, setDescripcion] = useState('')
  const [fecha, setFecha] = useState(new Date().toISOString().split('T')[0])
  const [subtotal, setSubtotal] = useState('')
  const [aplicaItbis, setAplicaItbis] = useState(false)
  const [conProveedor, setConProveedor] = useState(false)
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState(null)
  const [proveedorNombreSuelto, setProveedorNombreSuelto] = useState('')
  const [conRnc, setConRnc] = useState(false)
  const [rnc, setRnc] = useState('')
  const [ncf, setNcf] = useState('')
  const [tipoNcf, setTipoNcf] = useState('B02')
  const [formaPago, setFormaPago] = useState('efectivo')
  const [pagado, setPagado] = useState(true)
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [eliminando, setEliminando] = useState(false)
  const [error, setError] = useState('')

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

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

  const subtotalNum = parseFloat(subtotal) || 0
  const itbisCalculado = aplicaItbis ? subtotalNum * 0.18 : 0
  const totalCalculado = subtotalNum + itbisCalculado

  async function guardar() {
    setError('')
    if (!categoriaSeleccionada) { setError('Selecciona una categoría'); return }
    if (!descripcion.trim()) { setError('Agrega una descripción'); return }
    if (subtotalNum <= 0) { setError('El monto debe ser mayor a 0'); return }
    if (conRnc && !rnc.trim()) { setError('Si marcaste "Con RNC", debes ingresar el RNC'); return }

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
        ? proveedorNombreSuelto.trim() : null,
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

    const resultado = esEdicion
      ? await supabase.from('gastos').update(datos).eq('id', gastoEditando.id)
      : await supabase.from('gastos').insert([datos])

    setGuardando(false)
    if (resultado.error) { setError('Error: ' + resultado.error.message); return }
    onGuardado()
  }

  async function eliminar() {
    if (!esEdicion) return
    const confirmar = window.confirm(
      `¿Eliminar el gasto "${gastoEditando.descripcion}" por RD$ ${parseFloat(gastoEditando.total).toLocaleString('es-DO')}? Esta acción no se puede deshacer.`
    )
    if (!confirmar) return
    setEliminando(true)
    const { error: errDel } = await supabase.from('gastos').delete().eq('id', gastoEditando.id)
    setEliminando(false)
    if (errDel) { setError('Error al eliminar: ' + errDel.message); return }
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
  const seccionAcento = (color, opacidad = 0.12) => ({
    background: `rgba(${color}, ${opacidad})`,
    border: `1px solid rgba(${color}, 0.35)`,
    borderLeft: `4px solid rgb(${color})`,
    borderRadius: '12px', padding: '14px',
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
        maxWidth: '720px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '95vh', overflow: 'hidden',
      }}>

        {/* HEADER del modal */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '20px 24px',
          borderBottom: '1px solid var(--color-border-subtle)',
          flexWrap: 'wrap', gap: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '44px', height: '44px', borderRadius: '12px',
              background: 'rgba(212, 83, 126, 0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
            }}>💸</div>
            <div>
              <div style={{ fontSize: '10px', color: '#D4537E', letterSpacing: '1.5px', fontWeight: 600 }}>
                {esEdicion ? 'EDITAR GASTO' : 'NUEVO GASTO'}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                {esEdicion ? '✏️ Editar gasto' : 'Registrar gasto'}
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
            <button onClick={onCerrar} disabled={guardando || eliminando} style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '20px', padding: '7px 14px',
              color: 'var(--color-text-secondary)', fontSize: '12px',
              cursor: (guardando || eliminando) ? 'not-allowed' : 'pointer',
              opacity: (guardando || eliminando) ? 0.6 : 1, fontFamily: 'inherit',
            }}>✖ Cerrar</button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* CATEGORÍA */}
          <div>
            <label style={labelStyle}>
              Categoría <span style={{ color: '#E24B4A' }}>*</span>
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
            <label style={labelStyle}>
              Descripción <span style={{ color: '#E24B4A' }}>*</span>
            </label>
            <input type="text" value={descripcion} onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Gas para cocina (cilindro 100 lb)"
              disabled={guardando || eliminando} style={inputStyle} />
          </div>

          {/* FECHA Y MONTO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label style={labelStyle}>
                Fecha <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)}
                disabled={guardando || eliminando} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>
                Monto (RD$) <span style={{ color: '#E24B4A' }}>*</span>
              </label>
              <input type="number" step="0.01" min="0" value={subtotal}
                onChange={(e) => setSubtotal(e.target.value)} placeholder="0.00"
                disabled={guardando || eliminando}
                style={{ ...inputStyle, fontFamily: 'monospace', fontWeight: 600 }} />
            </div>
          </div>

          {/* ITBIS */}
          <div style={seccionAcento('239, 159, 39')}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={aplicaItbis}
                onChange={(e) => setAplicaItbis(e.target.checked)}
                disabled={guardando || eliminando}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#EF9F27' }}>
                💰 Aplicar ITBIS 18%
              </span>
            </label>
            {aplicaItbis && subtotalNum > 0 && (
              <div style={{
                marginTop: '10px', fontSize: '11px', fontFamily: 'monospace',
                display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px',
                color: 'var(--color-text-secondary)',
              }}>
                <span>Subtotal: RD$ {subtotalNum.toFixed(2)}</span>
                <span>ITBIS: RD$ {itbisCalculado.toFixed(2)}</span>
                <span style={{ fontWeight: 700, color: '#EF9F27' }}>Total: RD$ {totalCalculado.toFixed(2)}</span>
              </div>
            )}
          </div>

          {/* PROVEEDOR */}
          <div style={seccionAcento('55, 138, 221')}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
              <input type="checkbox" checked={conProveedor}
                onChange={(e) => setConProveedor(e.target.checked)}
                disabled={guardando || eliminando}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#378ADD' }}>
                🏭 Asociar a un proveedor
              </span>
            </label>

            {conProveedor && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <ProveedorSelector
                  empresaId={empresaId}
                  proveedores={proveedores}
                  proveedorSeleccionado={proveedorSeleccionado}
                  onSeleccionarProveedor={setProveedorSeleccionado}
                  onProveedorCreado={onProveedorCreado}
                  disabled={guardando || eliminando}
                />
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                  💡 O escribe el nombre suelto si no está en tu lista:
                </div>
                <input type="text" value={proveedorNombreSuelto}
                  onChange={(e) => setProveedorNombreSuelto(e.target.value)}
                  placeholder="Ej: Estación Texaco Esperanza"
                  disabled={proveedorSeleccionado || guardando || eliminando}
                  style={{ ...inputStyle, opacity: proveedorSeleccionado ? 0.5 : 1 }} />
              </div>
            )}
          </div>

          {/* RNC/NCF */}
          <div style={seccionAcento('127, 119, 221')}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', marginBottom: '8px' }}>
              <input type="checkbox" checked={conRnc}
                onChange={(e) => setConRnc(e.target.checked)}
                disabled={guardando || eliminando}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }} />
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#7F77DD' }}>
                🧾 Factura con RNC (para reporte 606 DGII)
              </span>
            </label>

            {conRnc && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  <input type="text" value={rnc} onChange={(e) => setRnc(e.target.value)}
                    placeholder="RNC (Ej: 130123456)"
                    disabled={guardando || eliminando}
                    style={{ ...inputStyle, fontFamily: 'monospace' }} />
                  <select value={tipoNcf} onChange={(e) => setTipoNcf(e.target.value)}
                    disabled={guardando || eliminando} style={inputStyle}>
                    {TIPOS_NCF.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
                <input type="text" value={ncf} onChange={(e) => setNcf(e.target.value)}
                  placeholder="NCF (Ej: B0200000001)"
                  disabled={guardando || eliminando}
                  style={{ ...inputStyle, fontFamily: 'monospace' }} />
              </div>
            )}
          </div>

          {/* FORMA DE PAGO */}
          <div>
            <label style={labelStyle}>Forma de pago</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))', gap: '8px' }}>
              {FORMAS_PAGO.map(fp => (
                <button key={fp.id} type="button"
                  onClick={() => {
                    setFormaPago(fp.id)
                    if (fp.id === 'pendiente') setPagado(false)
                    else setPagado(true)
                  }}
                  disabled={guardando || eliminando}
                  style={{
                    padding: '10px 8px',
                    background: formaPago === fp.id ? 'rgba(212, 83, 126, 0.15)' : 'var(--color-bg-input)',
                    border: formaPago === fp.id ? '1px solid rgba(212, 83, 126, 0.5)' : '1px solid var(--color-border-subtle)',
                    borderRadius: '10px',
                    color: formaPago === fp.id ? '#D4537E' : 'var(--color-text-secondary)',
                    fontSize: '11px', fontWeight: 600,
                    cursor: (guardando || eliminando) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                  }}>
                  <span style={{ fontSize: '18px' }}>{fp.icono}</span>
                  <span>{fp.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* NOTAS */}
          <div>
            <label style={labelStyle}>Notas (opcional)</label>
            <textarea value={notas} onChange={(e) => setNotas(e.target.value)}
              placeholder="Detalles adicionales..." rows={2}
              disabled={guardando || eliminando}
              style={{ ...inputStyle, resize: 'none' }} />
          </div>

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
        }}>
          {esEdicion && (
            <button onClick={eliminar} disabled={guardando || eliminando} style={{
              width: '100%', padding: '10px',
              background: 'transparent',
              border: '1px solid rgba(244, 67, 54, 0.35)',
              borderRadius: '10px',
              color: '#F4C0D1',
              fontSize: '12px', fontWeight: 500,
              cursor: (guardando || eliminando) ? 'not-allowed' : 'pointer',
              opacity: (guardando || eliminando) ? 0.6 : 1,
              fontFamily: 'inherit', marginBottom: '10px',
            }}>
              {eliminando ? '⏳ Eliminando...' : '🗑️ Eliminar gasto'}
            </button>
          )}

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button onClick={onCerrar} disabled={guardando || eliminando} style={{
              flex: 1, minWidth: '120px', padding: '14px',
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '10px',
              color: 'var(--color-text-secondary)',
              fontSize: '13px', fontWeight: 500,
              cursor: (guardando || eliminando) ? 'not-allowed' : 'pointer',
              opacity: (guardando || eliminando) ? 0.6 : 1, fontFamily: 'inherit',
            }}>Cancelar</button>

            <button onClick={guardar} disabled={guardando || eliminando} style={{
              flex: 2, minWidth: '200px', padding: '14px',
              background: 'linear-gradient(135deg, #D4537E 0%, #993556 100%)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontSize: '13px', fontWeight: 600,
              cursor: (guardando || eliminando) ? 'not-allowed' : 'pointer',
              opacity: (guardando || eliminando) ? 0.6 : 1, fontFamily: 'inherit',
            }}>
              {guardando
                ? '⏳ Guardando...'
                : esEdicion
                  ? '💾 Guardar cambios'
                  : `💾 Registrar gasto (RD$ ${totalCalculado.toFixed(2)})`}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalNuevoGasto