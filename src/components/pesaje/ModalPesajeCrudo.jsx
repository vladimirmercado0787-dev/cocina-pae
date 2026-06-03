import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const DIAS_SEMANA = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
const DIAS_LABEL = {
  lunes: 'Lunes', martes: 'Martes', miercoles: 'Miércoles',
  jueves: 'Jueves', viernes: 'Viernes', sabado: 'Sábado', domingo: 'Domingo'
}

const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }

export default function ModalPesajeCrudo({ 
  empresaId, usuario, operacionesPreparando, escuelas,
  onCerrar, onAprobado, modoEdicion = false
}) {
  const [recetasDisponibles, setRecetasDisponibles] = useState([])
  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null)
  const [ingredientes, setIngredientes] = useState([])
  const [racionesTotales, setRacionesTotales] = useState(0)
  const [racionesEditables, setRacionesEditables] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)
  const [notas, setNotas] = useState('')

  const [esTropical, setEsTropical] = useState(
    typeof document !== 'undefined' && document.documentElement.getAttribute('data-tema') === 'tropical'
  )
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setEsTropical(document.documentElement.getAttribute('data-tema') === 'tropical')
    })
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => { cargarRecetasYDelDia() }, [])

  useEffect(() => {
    if (!modoEdicion && recetaSeleccionada && racionesEditables > 0) {
      construirListaIngredientes(recetaSeleccionada, racionesEditables)
    }
  }, [racionesEditables, recetaSeleccionada?.id, modoEdicion])

  async function cargarRecetasYDelDia() {
    try {
      setCargando(true)
      setError(null)
      const totalRaciones = operacionesPreparando.reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
      setRacionesTotales(totalRaciones)
      setRacionesEditables(totalRaciones)
      const { data: recetasData, error: errRecetas } = await supabase
        .from('recetas')
        .select(`id, nombre, emoji, dia_semana, notas_operativas, recetas_ingredientes (id, cantidad_crudo_por_racion, unidad, notas, ingredientes (id, nombre, categoria, unidad_compra, factor_rendimiento, stock_actual, precio_unitario))`)
        .eq('empresa_id', empresaId).eq('activa', true)
      if (errRecetas) throw errRecetas
      if (!recetasData || recetasData.length === 0) throw new Error('No hay recetas activas configuradas')
      const ordenadas = recetasData.sort((a, b) => DIAS_SEMANA.indexOf(a.dia_semana) - DIAS_SEMANA.indexOf(b.dia_semana))
      setRecetasDisponibles(ordenadas)
      if (modoEdicion) { await precargarDesdeEdicion(ordenadas); return }
      const hoy = new Date()
      const recetaDelDia = ordenadas.find(r => r.dia_semana === DIAS_SEMANA[hoy.getDay()])
      setRecetaSeleccionada(recetaDelDia || null)
    } catch (err) {
      console.error('Error cargando recetas:', err)
      setError(err.message)
    } finally { setCargando(false) }
  }

  async function precargarDesdeEdicion(recetasOrdenadas) {
    const fechaHoy = new Date().toISOString().split('T')[0]
    const { data: movimientosExistentes, error: errMov } = await supabase
      .from('movimientos_inventario')
      .select(`id, ingrediente_id, cantidad, unidad, precio_unitario, stock_antes, stock_despues, notas, ingredientes (id, nombre, categoria, factor_rendimiento, stock_actual, precio_unitario)`)
      .eq('empresa_id', empresaId).eq('fecha', fechaHoy).eq('origen', 'consumo_operacion')
    if (errMov) throw errMov
    if (!movimientosExistentes || movimientosExistentes.length === 0) throw new Error('No hay pesaje crudo previo para editar')
    const primerNota = movimientosExistentes[0].notas || ''
    const matchReceta = primerNota.match(/Pesaje crudo · (.+?) · \d+ raciones/)
    const nombreReceta = matchReceta ? matchReceta[1].trim() : null
    let recetaEncontrada = nombreReceta ? recetasOrdenadas.find(r => r.nombre === nombreReceta) : null
    if (!recetaEncontrada) recetaEncontrada = recetasOrdenadas[0]
    setRecetaSeleccionada(recetaEncontrada)
    const matchNotas = primerNota.match(/Pesaje crudo · .+? · \d+ raciones · (.+)$/)
    if (matchNotas) setNotas(matchNotas[1].trim())
    const lista = movimientosExistentes.map(mov => {
      const ing = mov.ingredientes
      return {
        ingrediente_id: ing.id, nombre: ing.nombre, categoria: ing.categoria,
        unidad: mov.unidad || 'lb', cantidad_por_racion: 0,
        cantidad_sugerida: Number(mov.cantidad), cantidad_real: Number(mov.cantidad),
        stock_actual: Number(ing.stock_actual || 0), precio_unitario: Number(mov.precio_unitario || 0),
        factor_rendimiento: Number(ing.factor_rendimiento || 1), notas: '',
        movimiento_id: mov.id, cantidad_original: Number(mov.cantidad)
      }
    })
    setIngredientes(lista)
  }

  function construirListaIngredientes(receta, raciones) {
    const lista = (receta.recetas_ingredientes || []).map(ri => {
      const ing = ri.ingredientes
      const sugerida = Number(ri.cantidad_crudo_por_racion) * raciones
      return {
        ingrediente_id: ing.id, nombre: ing.nombre, categoria: ing.categoria,
        unidad: ri.unidad || 'lb', cantidad_por_racion: Number(ri.cantidad_crudo_por_racion),
        cantidad_sugerida: sugerida, cantidad_real: sugerida,
        stock_actual: Number(ing.stock_actual || 0), precio_unitario: Number(ing.precio_unitario || 0),
        factor_rendimiento: Number(ing.factor_rendimiento || 1), notas: ri.notas || ''
      }
    })
    setIngredientes(lista)
  }

  function cambiarReceta(recetaId) {
    if (modoEdicion) { alert('No se puede cambiar la receta en modo edición.'); return }
    const nueva = recetasDisponibles.find(r => r.id === recetaId)
    if (nueva) setRecetaSeleccionada(nueva)
  }

  function editarCantidad(ingrediente_id, valorNuevo) {
    const valor = parseFloat(valorNuevo) || 0
    setIngredientes(prev => prev.map(ing => ing.ingrediente_id === ingrediente_id ? { ...ing, cantidad_real: valor } : ing))
  }

  function resetearAIndividual(ingrediente_id) {
    setIngredientes(prev => prev.map(ing => ing.ingrediente_id === ingrediente_id ? { ...ing, cantidad_real: ing.cantidad_sugerida } : ing))
  }

  async function tieneCocidoOSobrante() {
    const fechaHoy = new Date().toISOString().split('T')[0]
    const { count: countCocido } = await supabase.from('pesajes_cocido').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('fecha', fechaHoy)
    const { count: countSobrante } = await supabase.from('pesajes_cocido').select('id', { count: 'exact', head: true }).eq('empresa_id', empresaId).eq('fecha', fechaHoy).not('peso_sobrante_lb', 'is', null)
    return { hayCocido: (countCocido || 0) > 0, haySobrante: (countSobrante || 0) > 0 }
  }

  async function aprobarPesaje() {
    if (!recetaSeleccionada) { alert('Selecciona una receta antes de aprobar'); return }
    if (racionesEditables <= 0) { alert('Las raciones totales deben ser mayor a 0'); return }
    const ingredientesAGuardar = ingredientes.filter(ing => ing.cantidad_real > 0)
    if (ingredientesAGuardar.length === 0) { alert('Debes registrar al menos un ingrediente'); return }

    if (modoEdicion) {
      const { hayCocido, haySobrante } = await tieneCocidoOSobrante()
      let msg = `⚠️ ESTÁS EDITANDO EL PESAJE CRUDO\n\nEsto va a:\n✅ Revertir el inventario actual\n✅ Descontar las cantidades nuevas\n`
      if (hayCocido || haySobrante) {
        msg += `\n🚨 ATENCIÓN:\n`
        if (hayCocido) msg += `❌ Se borrará el pesaje COCIDO de hoy\n`
        if (haySobrante) msg += `❌ Se borrará el pesaje SOBRANTE de hoy\n`
        msg += `\nTendrás que volver a hacer esos pesajes después.\n`
      }
      msg += `\n¿Continuar?`
      if (!window.confirm(msg)) return
    } else {
      if (!window.confirm(`¿Confirmas el pesaje?\n\n🍽️ Receta: ${recetaSeleccionada.nombre}\n📊 ${racionesEditables.toLocaleString()} raciones\n🥘 ${ingredientesAGuardar.length} ingredientes\n\nEsta acción NO se puede deshacer fácilmente.`)) return
    }

    setProcesando(true)
    setError(null)
    try {
      const fechaHoy = new Date().toISOString().split('T')[0]
      if (modoEdicion) await revertirYBorrarDependencias()
      const origenId = operacionesPreparando[0]?.id || null
      const movimientos = ingredientesAGuardar.map(ing => ({
        empresa_id: empresaId, ingrediente_id: ing.ingrediente_id, tipo: 'salida',
        origen: 'consumo_operacion', origen_id: origenId, cantidad: ing.cantidad_real,
        unidad: ing.unidad, precio_unitario: ing.precio_unitario,
        stock_antes: ing.stock_actual, stock_despues: ing.stock_actual - ing.cantidad_real,
        fecha: fechaHoy,
        notas: `Pesaje crudo · ${recetaSeleccionada.nombre} · ${racionesEditables} raciones${notas ? ' · ' + notas : ''}`,
        created_by: usuario.id
      }))
      const { error: errInsert } = await supabase.from('movimientos_inventario').insert(movimientos)
      if (errInsert) throw errInsert
      for (const ing of ingredientesAGuardar) {
        await supabase.from('ingredientes').update({ stock_actual: ing.stock_actual - ing.cantidad_real }).eq('id', ing.ingrediente_id)
      }

      // 🎯 FIX BUG-001: Guardar la receta elegida en operaciones_dia.receta_id
      // Esto es CRÍTICO para que el modal de despacho/cocido y el sobrante
      // sepan EXACTAMENTE qué receta se cocinó, sin adivinar por día de la semana.
      const { error: errReceta } = await supabase
        .from('operaciones_dia')
        .update({ receta_id: recetaSeleccionada.id })
        .eq('empresa_id', empresaId)
        .eq('fecha', fechaHoy)
        .in('estado', ['preparando', 'lista', 'despachando', 'entregada', 'cerrada'])
      if (errReceta) {
        console.error('⚠️ Error guardando receta_id en operaciones_dia:', errReceta)
        // No lanzamos error porque el pesaje ya se guardó. Solo loggeamos.
      }

      alert(`${modoEdicion ? '✅ Pesaje actualizado' : '✅ Pesaje aprobado'}\n\n${ingredientesAGuardar.length} ingredientes registrados\n${racionesEditables} raciones`)
      if (onAprobado) onAprobado()
    } catch (err) {
      console.error('Error guardando pesaje:', err)
      setError(err.message)
    } finally { setProcesando(false) }
  }

  async function revertirYBorrarDependencias() {
    const fechaHoy = new Date().toISOString().split('T')[0]
    const { data: movimientosViejos, error: errMov } = await supabase
      .from('movimientos_inventario').select('id, ingrediente_id, cantidad')
      .eq('empresa_id', empresaId).eq('fecha', fechaHoy).eq('origen', 'consumo_operacion')
    if (errMov) throw errMov
    if (movimientosViejos && movimientosViejos.length > 0) {
      for (const mov of movimientosViejos) {
        const { data: ingActual } = await supabase.from('ingredientes').select('stock_actual').eq('id', mov.ingrediente_id).single()
        const stockRevertido = Number(ingActual?.stock_actual || 0) + Number(mov.cantidad)
        await supabase.from('ingredientes').update({ stock_actual: stockRevertido }).eq('id', mov.ingrediente_id)
      }
      const idsAEliminar = movimientosViejos.map(m => m.id)
      const { error: errDelete } = await supabase.from('movimientos_inventario').delete().in('id', idsAEliminar)
      if (errDelete) throw errDelete
    }
    await supabase.from('pesajes_cocido').delete().eq('empresa_id', empresaId).eq('fecha', fechaHoy)
  }

  const costoTotal = ingredientes.reduce((sum, ing) => sum + (ing.cantidad_real * ing.precio_unitario), 0)
  const hayStockInsuficiente = ingredientes.some(ing => ing.cantidad_real > ing.stock_actual && ing.stock_actual > 0)
  const hoy = new Date()
  const diaSemanaHoy = DIAS_SEMANA[hoy.getDay()]
  const esDiaSinReceta = !recetasDisponibles.some(r => r.dia_semana === diaSemanaHoy)

  if (cargando) {
    return (
      <div style={overlayStyle()}>
        <div style={loadingBoxStyle()}>
          <div style={{ fontSize: '48px', marginBottom: '12px', animation: 'pulse 2s infinite' }}>🥘</div>
          <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500, margin: 0 }}>
            {modoEdicion ? 'Cargando datos del pesaje crudo...' : 'Cargando recetas...'}
          </p>
        </div>
      </div>
    )
  }

  if (error && recetasDisponibles.length === 0) {
    return (
      <div style={overlayStyle()}>
        <div style={{ ...modalBoxStyle(), padding: '24px', maxWidth: '420px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#E24B4A', marginBottom: '8px' }}>❌ Error</h3>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '14px', marginBottom: '16px' }}>{error}</p>
          <button onClick={onCerrar} style={btnCancelar()}>Cerrar</button>
        </div>
      </div>
    )
  }

  return (
    <div style={overlayStyle('start')}>
      <div style={{ ...modalBoxStyle(), maxWidth: '880px', margin: '32px 0' }}>
        
        {/* HEADER */}
        <div style={{
          background: 'linear-gradient(135deg, #EF9F27 0%, #C97B0F 100%)',
          borderRadius: '16px 16px 0 0', padding: '20px 24px', color: 'white',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px' }}>
            <div>
              <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', opacity: 0.9, margin: 0 }}>
                {modoEdicion ? '✏️ EDITANDO PESAJE CRUDO' : 'PESAJE CRUDO'}
              </p>
              <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '28px' }}>{recetaSeleccionada?.emoji || '🥘'}</span>
                {recetaSeleccionada?.nombre || 'Selecciona una receta'}
              </h2>
              <p style={{ fontSize: '13px', opacity: 0.9, margin: 0 }}>
                {operacionesPreparando.length} escuela(s){modoEdicion ? ' · Modo edición' : ' · Pesa todo de un solo cocinazo'}
              </p>
            </div>
            <button onClick={onCerrar} disabled={procesando} style={btnCerrar()}>✕</button>
          </div>
        </div>

        {/* ADVERTENCIA MODO EDICIÓN */}
        {modoEdicion && (
          <div style={{
            background: esTropical ? '#FFF8E6' : 'rgba(239, 159, 39, 0.12)',
            borderBottom: '2px solid rgba(239, 159, 39, 0.4)', padding: '14px 20px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 700, color: esTropical ? '#7A5410' : '#FAC775', letterSpacing: '0.5px', marginBottom: '4px' }}>
              ⚠️ MODO EDICIÓN — ESTO AFECTA TODO
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>
              Al guardar:<br />✅ Se devuelven al inventario las cantidades viejas
              <br />✅ Se descuentan las cantidades nuevas
              <br />❌ <strong>Se borrarán los pesajes de Cocido y Sobrante (si existen)</strong>
            </p>
          </div>
        )}

        {/* SELECTOR DE RECETA */}
        <div style={{
          background: esTropical ? AMBAR.claro : `${AMBAR.c}15`,
          borderBottom: `1px solid ${AMBAR.c}40`, padding: '14px 20px',
        }}>
          <label style={{ display: 'block', fontSize: '11px', fontWeight: 700, color: esTropical ? AMBAR.dark : AMBAR.c, letterSpacing: '0.5px', marginBottom: '8px' }}>
            {esDiaSinReceta ? '⚠️ Hoy no hay receta automática — Elige una' : '🍽️ Receta a cocinar (puedes cambiarla)'}
          </label>
          <select value={recetaSeleccionada?.id || ''} onChange={(e) => cambiarReceta(e.target.value)} disabled={procesando || modoEdicion}
            style={{
              ...inputStyle(),
              border: `2px solid ${AMBAR.c}50`, fontWeight: 500,
              cursor: (procesando || modoEdicion) ? 'not-allowed' : 'pointer',
              opacity: modoEdicion ? 0.6 : 1,
            }}>
            <option value="">— Selecciona una receta —</option>
            {recetasDisponibles.map(r => (
              <option key={r.id} value={r.id}>{r.emoji} {DIAS_LABEL[r.dia_semana]}: {r.nombre}</option>
            ))}
          </select>
          {modoEdicion && (
            <p style={{ fontSize: '11px', color: esTropical ? AMBAR.dark : AMBAR.c, marginTop: '8px', fontStyle: 'italic' }}>
              En modo edición no se puede cambiar la receta.
            </p>
          )}
          {esDiaSinReceta && !modoEdicion && (
            <p style={{ fontSize: '11px', color: esTropical ? AMBAR.dark : AMBAR.c, marginTop: '8px', fontStyle: 'italic' }}>
              Hoy es {DIAS_LABEL[diaSemanaHoy]}. No hay receta INABIE configurada — selecciona cualquier receta activa.
            </p>
          )}
        </div>

        {/* NOTAS OPERATIVAS */}
        {recetaSeleccionada?.notas_operativas && (
          <div style={{
            background: esTropical ? '#FFF8E6' : 'rgba(239, 159, 39, 0.08)',
            borderBottom: '1px solid var(--color-border-subtle)', padding: '14px 20px',
          }}>
            <p style={{ fontSize: '11px', fontWeight: 600, color: esTropical ? AMBAR.dark : AMBAR.c, letterSpacing: '0.5px', marginBottom: '4px' }}>
              ⚙️ NOTAS OPERATIVAS
            </p>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: 0 }}>{recetaSeleccionada.notas_operativas}</p>
          </div>
        )}

        {/* EDITOR DE RACIONES */}
        {recetaSeleccionada && (
          <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-subtle)', background: 'var(--color-bg-card)' }}>
            <label style={labelStyle()}>TOTAL DE RACIONES A COCINAR</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              <input type="number" min="1" value={racionesEditables} onChange={(e) => setRacionesEditables(parseInt(e.target.value) || 0)} disabled={procesando}
                style={{ ...inputStyle(), width: '120px', textAlign: 'center', fontWeight: 700, fontSize: '20px', border: `2px solid ${AMBAR.c}` }} />
              <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)' }}>
                <p style={{ margin: 0 }}>Sugerencia: <strong style={{ color: 'var(--color-text-primary)' }}>{racionesTotales.toLocaleString()}</strong> raciones</p>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: 0 }}>(suma de escuelas iniciadas)</p>
              </div>
              {racionesEditables !== racionesTotales && (
                <button onClick={() => setRacionesEditables(racionesTotales)} disabled={procesando}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', color: esTropical ? AMBAR.dark : AMBAR.c, fontSize: '11px', cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit' }}>
                  ↺ Restaurar sugerencia
                </button>
              )}
            </div>
          </div>
        )}

        {/* LISTA DE INGREDIENTES */}
        {recetaSeleccionada && ingredientes.length > 0 && (
          <div style={{ padding: '20px 24px' }}>
            <p style={labelStyle()}>🥘 INGREDIENTES ({ingredientes.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {ingredientes.map((ing) => {
                const editada = Math.abs(ing.cantidad_real - ing.cantidad_sugerida) > 0.001
                const sinStock = ing.cantidad_real > ing.stock_actual && ing.stock_actual > 0
                const stockCero = ing.stock_actual === 0
                const colorBorde = (sinStock || stockCero) ? '#E24B4A' : (editada ? AMBAR.c : 'var(--color-border-subtle)')
                const colorBg = (sinStock || stockCero) ? (esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.08)') : (editada ? (esTropical ? AMBAR.claro : `${AMBAR.c}10`) : 'var(--color-bg-elevated)')

                return (
                  <div key={ing.ingrediente_id} style={{ border: `2px solid ${colorBorde}40`, borderLeft: `4px solid ${colorBorde}`, background: colorBg, borderRadius: '12px', padding: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: '160px' }}>
                        <p style={{ fontWeight: 700, color: 'var(--color-text-primary)', fontSize: '14px', margin: 0 }}>{ing.nombre}</p>
                        <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>{ing.categoria}</p>
                        {ing.notas && <p style={{ fontSize: '11px', color: esTropical ? AMBAR.dark : AMBAR.c, fontStyle: 'italic', marginTop: '4px' }}>💡 {ing.notas}</p>}
                      </div>
                      <div style={{ textAlign: 'right', fontSize: '11px' }}>
                        <p style={{ color: 'var(--color-text-muted)', margin: 0 }}>Stock</p>
                        <p style={{ fontWeight: 700, color: stockCero ? '#E24B4A' : 'var(--color-text-primary)', margin: 0 }}>
                          {ing.stock_actual.toFixed(2)} {ing.unidad}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <input type="number" min="0" step="0.001" value={ing.cantidad_real} onChange={(e) => editarCantidad(ing.ingrediente_id, e.target.value)} disabled={procesando}
                          style={{ ...inputStyle(), width: '110px', textAlign: 'right', fontWeight: 700, fontSize: '14px', border: `2px solid ${colorBorde}` }} />
                        <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{ing.unidad}</span>
                        {editada && (
                          <button onClick={() => resetearAIndividual(ing.ingrediente_id)} style={{ background: 'none', border: 'none', color: esTropical ? AMBAR.dark : AMBAR.c, fontSize: '10px', cursor: 'pointer', textDecoration: 'underline', marginTop: '4px', fontFamily: 'inherit' }}>
                            ↺ {ing.cantidad_sugerida.toFixed(3)}
                          </button>
                        )}
                      </div>
                    </div>
                    {(sinStock || stockCero) && (
                      <p style={{ fontSize: '11px', color: '#E24B4A', fontWeight: 600, marginTop: '8px' }}>
                        ⚠️ {stockCero ? 'Sin stock registrado' : 'Cantidad mayor al stock disponible'} — verifica antes de aprobar
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* NOTAS */}
        {recetaSeleccionada && (
          <div style={{ padding: '0 24px 16px' }}>
            <label style={labelStyle()}>NOTAS DEL PESAJE (OPCIONAL)</label>
            <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej: Habichuelas un poco viejas, faltó cebolla..." disabled={procesando} style={inputStyle()} />
          </div>
        )}

        {/* FOOTER */}
        <div style={{
          background: 'var(--color-bg-card)', borderTop: '1px solid var(--color-border-subtle)',
          borderRadius: '0 0 16px 16px', padding: '20px 24px',
        }}>
          {recetaSeleccionada && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <KpiMini label="Raciones" valor={racionesEditables.toLocaleString()} color={AMBAR.c} />
              <KpiMini label="Ingredientes" valor={ingredientes.length} color="var(--color-text-primary)" />
              <KpiMini label="Costo estimado" valor={`RD$ ${costoTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} color="#1D9E75" />
            </div>
          )}

          {hayStockInsuficiente && (
            <div style={alertaStyle('#E24B4A', esTropical)}>
              <p style={{ fontSize: '13px', fontWeight: 600, margin: 0 }}>
                ⚠️ Algunos ingredientes tienen cantidad mayor al stock. Puedes continuar igual (el inventario se ajustará).
              </p>
            </div>
          )}

          {error && (
            <div style={alertaStyle('#E24B4A', esTropical)}>
              <p style={{ fontSize: '13px', margin: 0 }}>❌ {error}</p>
            </div>
          )}

          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={onCerrar} disabled={procesando} style={btnCancelar()}>Cancelar</button>
            <button onClick={aprobarPesaje} disabled={procesando || !recetaSeleccionada || racionesEditables <= 0}
              style={{
                flex: 1, padding: '14px 20px',
                background: 'linear-gradient(135deg, #EF9F27 0%, #C97B0F 100%)',
                border: 'none', borderRadius: '12px', color: 'white', fontSize: '13px', fontWeight: 700,
                cursor: procesando ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: (procesando || !recetaSeleccionada || racionesEditables <= 0) ? 0.6 : 1,
              }}>
              {procesando 
                ? (modoEdicion ? 'Actualizando pesaje...' : 'Guardando pesaje...') 
                : (modoEdicion ? '✏️ Actualizar pesaje crudo' : '✅ Aprobar pesaje y sacar del inventario')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function KpiMini({ label, valor, color }) {
  return (
    <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
      <p style={{ fontSize: '10px', color: 'var(--color-text-muted)', margin: 0, letterSpacing: '0.5px' }}>{label}</p>
      <p style={{ fontSize: '18px', fontWeight: 700, color, margin: '4px 0 0' }}>{valor}</p>
    </div>
  )
}

function overlayStyle(align = 'center') {
  return {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
    zIndex: 50, display: 'flex', alignItems: align === 'start' ? 'flex-start' : 'center',
    justifyContent: 'center', padding: '16px', overflowY: 'auto',
  }
}

function modalBoxStyle() {
  return {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '16px', width: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
  }
}

function loadingBoxStyle() {
  return {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '16px', padding: '48px', textAlign: 'center', maxWidth: '380px',
  }
}

function btnCerrar() {
  return {
    background: 'none', border: 'none', color: 'rgba(255,255,255,0.8)',
    fontSize: '22px', cursor: 'pointer', lineHeight: 1, padding: '4px 8px',
  }
}

function btnCancelar() {
  return {
    padding: '14px 24px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '12px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

function labelStyle() {
  return { display: 'block', fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.5px', marginBottom: '8px' }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '10px 14px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  }
}

function alertaStyle(color, esTropical) {
  return {
    background: esTropical ? '#FCEBEB' : `${color}15`,
    border: `1px solid ${color}40`, borderRadius: '8px',
    padding: '10px 12px', marginBottom: '12px',
    color: esTropical ? '#A32D2D' : '#F4C0D1',
  }
}