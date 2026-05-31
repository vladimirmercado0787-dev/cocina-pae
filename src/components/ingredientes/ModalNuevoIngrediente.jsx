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

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

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
      .from('ingredientes').select('id, nombre').eq('empresa_id', empresaId)
    setTodosIngredientes(data || [])
  }

  const nombreNormalizado = normalizarNombre(nombre)

  const duplicadoDetectado = nombre.trim() && todosIngredientes.find(i => {
    if (esEdicion && i.id === ingredienteEditando.id) return false
    return sonIguales(i.nombre, nombre)
  })

  async function guardar() {
    setError('')
    if (!nombreNormalizado) { setError('El nombre es obligatorio'); return }
    if (duplicadoDetectado) {
      setError(`Ya existe el ingrediente "${duplicadoDetectado.nombre}". Edítalo en vez de crear duplicado.`)
      return
    }

    setGuardando(true)
    const datos = {
      nombre: nombreNormalizado,
      unidad_stock: unidad,
      stock_actual: parseFloat(stockActual) || 0,
      stock_minimo: parseFloat(stockMinimo) || 0,
      ultimo_costo: parseFloat(ultimoCosto) || null,
    }

    const resultado = esEdicion
      ? await supabase.from('ingredientes').update(datos).eq('id', ingredienteEditando.id)
      : await supabase.from('ingredientes').insert([{ ...datos, empresa_id: empresaId }])

    setGuardando(false)
    if (resultado.error) { setError('Error: ' + resultado.error.message); return }
    onGuardado()
  }

  async function eliminar() {
    if (!esEdicion) return
    const confirmar = window.confirm(
      `¿Eliminar el ingrediente "${ingredienteEditando.nombre}"? Esta acción no se puede deshacer.`
    )
    if (!confirmar) return

    setEliminando(true)
    const { error: errDel } = await supabase.from('ingredientes').delete().eq('id', ingredienteEditando.id)
    setEliminando(false)
    if (errDel) { setError('Error al eliminar: ' + errDel.message); return }
    onGuardado()
  }

  const cambiarAlNormalizar = nombre.trim() && nombre !== nombreNormalizado

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
        maxWidth: '500px', width: '100%',
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
              background: 'rgba(29, 158, 117, 0.18)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '22px',
            }}>🥕</div>
            <div>
              <div style={{ fontSize: '10px', color: '#1D9E75', letterSpacing: '1.5px', fontWeight: 600 }}>
                {esEdicion ? 'EDITAR INGREDIENTE' : 'NUEVO INGREDIENTE'}
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                {esEdicion ? '✏️ Editar' : 'Crear ingrediente'}
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
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

          {/* NOMBRE */}
          <div>
            <label style={labelStyle}>
              Nombre del ingrediente <span style={{ color: '#E24B4A' }}>*</span>
            </label>
            <input type="text" value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              onBlur={(e) => setNombre(normalizarNombre(e.target.value))}
              placeholder="Ej: Pollo, Arroz, Cebolla..."
              autoFocus={!esEdicion}
              disabled={guardando || eliminando}
              style={inputStyle} />

            {cambiarAlNormalizar && (
              <div style={{
                fontSize: '11px', marginTop: '6px', padding: '6px 10px',
                background: 'rgba(55, 138, 221, 0.12)',
                border: '1px solid rgba(55, 138, 221, 0.3)',
                borderRadius: '8px',
                color: '#378ADD',
              }}>
                💡 Se guardará como: <strong>{nombreNormalizado}</strong>
              </div>
            )}

            {duplicadoDetectado && (
              <div style={{
                fontSize: '11px', marginTop: '6px', padding: '6px 10px',
                background: 'rgba(239, 159, 39, 0.12)',
                border: '1px solid rgba(239, 159, 39, 0.35)',
                borderRadius: '8px',
                color: '#EF9F27',
              }}>
                ⚠️ Ya existe: <strong>{duplicadoDetectado.nombre}</strong>. Edita el existente en vez de crear duplicado.
              </div>
            )}
          </div>

          {/* UNIDAD */}
          <div>
            <label style={labelStyle}>
              Unidad de medida <span style={{ color: '#E24B4A' }}>*</span>
            </label>
            <select value={unidad} onChange={(e) => setUnidad(e.target.value)}
              disabled={guardando || eliminando} style={inputStyle}>
              {UNIDADES_COMUNES.map(u => <option key={u.id} value={u.id}>{u.label}</option>)}
            </select>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              💡 Si cambias la unidad, el stock anterior podría no tener sentido
            </div>
          </div>

          {/* INVENTARIO */}
          <div style={{
            background: 'rgba(55, 138, 221, 0.12)',
            border: '1px solid rgba(55, 138, 221, 0.35)',
            borderLeft: '4px solid #378ADD',
            borderRadius: '12px', padding: '14px',
            display: 'flex', flexDirection: 'column', gap: '10px',
          }}>
            <div style={{ fontSize: '11px', color: '#378ADD', letterSpacing: '1.5px', fontWeight: 600 }}>
              📦 INVENTARIO
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
              <div>
                <label style={labelStyle}>Stock actual</label>
                <input type="number" step="0.1" min="0" value={stockActual}
                  onChange={(e) => setStockActual(e.target.value)} placeholder="0"
                  disabled={guardando || eliminando}
                  style={{ ...inputStyle, fontFamily: 'monospace' }} />
              </div>
              <div>
                <label style={labelStyle}>Stock mínimo (alerta)</label>
                <input type="number" step="0.1" min="0" value={stockMinimo}
                  onChange={(e) => setStockMinimo(e.target.value)} placeholder="0"
                  disabled={guardando || eliminando}
                  style={{ ...inputStyle, fontFamily: 'monospace' }} />
              </div>
            </div>

            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
              ℹ️ El stock se actualiza automáticamente cuando registras compras detalladas
            </div>
          </div>

          {/* COSTO */}
          <div>
            <label style={labelStyle}>Último costo unitario (opcional)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ color: 'var(--color-text-primary)', fontWeight: 600, fontSize: '13px' }}>RD$</span>
              <input type="number" step="0.01" min="0" value={ultimoCosto}
                onChange={(e) => setUltimoCosto(e.target.value)} placeholder="0.00"
                disabled={guardando || eliminando}
                style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }} />
              <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>/ {unidad}</span>
            </div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '6px' }}>
              Se actualiza automáticamente con cada compra
            </div>
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
              {eliminando ? '⏳ Eliminando...' : '🗑️ Eliminar ingrediente'}
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

            <button onClick={guardar}
              disabled={guardando || eliminando || !nombre.trim() || duplicadoDetectado}
              style={{
                flex: 2, minWidth: '180px', padding: '14px',
                background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 600,
                cursor: (guardando || eliminando || !nombre.trim() || duplicadoDetectado) ? 'not-allowed' : 'pointer',
                opacity: (guardando || eliminando || !nombre.trim() || duplicadoDetectado) ? 0.6 : 1,
                fontFamily: 'inherit',
              }}>
              {guardando ? '⏳ Guardando...' : (esEdicion ? '💾 Guardar cambios' : '💾 Crear ingrediente')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalNuevoIngrediente