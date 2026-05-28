import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const COLOR_PERSONAL = '#D4537E'
const COLOR_PERSONAL_BG = '#ED93B1'
const COLOR_PERSONAL_DARKER = '#72243E'
const COLOR_PERSONAL_CLARO = '#FBEAF0'

function CalculadoraProduccion({ usuario, empresaId, onVolver }) {
  const [recetas, setRecetas] = useState([])
  const [escuelas, setEscuelas] = useState([])
  const [recetaSeleccionada, setRecetaSeleccionada] = useState(null)
  const [ingredientesReceta, setIngredientesReceta] = useState([])
  const [racionesObjetivo, setRacionesObjetivo] = useState(0)
  const [cargando, setCargando] = useState(true)
  const [cargandoIngredientes, setCargandoIngredientes] = useState(false)
  const [modoSeleccion, setModoSeleccion] = useState('manual')
  const [escuelasSeleccionadas, setEscuelasSeleccionadas] = useState([])

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const esTropical = tema === 'tropical'

  useEffect(() => {
    cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    const { data: recetasData } = await supabase
      .from('recetas').select('*').eq('empresa_id', empresaId).eq('activa', true).order('dia_semana')
    setRecetas(recetasData || [])
    
    const { data: escuelasData } = await supabase
      .from('escuelas').select('*').eq('empresa_id', empresaId).eq('activa', true).order('nombre')
    setEscuelas(escuelasData || [])
    setCargando(false)
  }

  async function seleccionarReceta(receta) {
    setRecetaSeleccionada(receta)
    setCargandoIngredientes(true)
    const { data } = await supabase
      .from('recetas_ingredientes').select('*, ingredientes(*)').eq('receta_id', receta.id)
    setIngredientesReceta(data || [])
    setCargandoIngredientes(false)
  }

  function toggleEscuela(escuela) {
    if (escuelasSeleccionadas.find(e => e.id === escuela.id)) {
      setEscuelasSeleccionadas(escuelasSeleccionadas.filter(e => e.id !== escuela.id))
    } else {
      setEscuelasSeleccionadas([...escuelasSeleccionadas, escuela])
    }
  }

  function imprimir() { window.print() }

  const racionesCalculadas = modoSeleccion === 'manual'
    ? parseInt(racionesObjetivo) || 0
    : escuelasSeleccionadas.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0)

  const ingredientesCalculados = ingredientesReceta.map(ri => {
    const ing = ri.ingredientes
    const cantidadCrudoTotal = parseFloat(ri.cantidad_crudo_por_racion) * racionesCalculadas
    const factor = parseFloat(ing?.factor_rendimiento || 1)
    const cantidadCocidoTotal = cantidadCrudoTotal * factor
    const precioUnit = parseFloat(ing?.precio_unitario || 0)
    const subtotal = cantidadCrudoTotal * precioUnit
    return {
      id: ri.id, nombre: ing?.nombre || '?', categoria: ing?.categoria || 'otros',
      nivel: ing?.nivel_importancia || 'principal', unidad: ri.unidad,
      cantidadCrudo: cantidadCrudoTotal, cantidadCocido: cantidadCocidoTotal,
      factor, precioUnit, subtotal, notas: ri.notas,
    }
  })

  const costoTotal = ingredientesCalculados.reduce((sum, i) => sum + i.subtotal, 0)
  const costoPorRacion = racionesCalculadas > 0 ? costoTotal / racionesCalculadas : 0
  const pesoCrudoTotal = ingredientesCalculados.reduce((sum, i) => sum + i.cantidadCrudo, 0)
  const pesoCocidoTotal = ingredientesCalculados.reduce((sum, i) => sum + i.cantidadCocido, 0)
  const facturacionEsperada = modoSeleccion === 'escuelas'
    ? escuelasSeleccionadas.reduce((sum, e) => sum + ((e.raciones_contractuales || 0) * parseFloat(e.precio_racion || 0)), 0) : 0
  const margenTotal = facturacionEsperada - costoTotal
  const margenPct = facturacionEsperada > 0 ? Math.round((margenTotal / facturacionEsperada) * 100) : 0

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando calculadora...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div className="print:hidden" style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />

      {/* HEADER */}
      <div className="print:hidden" style={{ position: 'relative', zIndex: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
        <button onClick={onVolver} style={btnVolver()}>← Volver</button>
        <div style={toggleTemaStyle()}>
          <button onClick={() => setTema('oscuro')} style={tabTemaStyle(tema === 'oscuro')}>
            <span style={{ fontSize: '11px' }}>🌙</span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
          </button>
          <button onClick={() => setTema('tropical')} style={tabTemaStyle(tema === 'tropical')}>
            <span style={{ fontSize: '11px' }}>☀️</span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
          </button>
        </div>
      </div>

      {/* TÍTULO */}
      <div className="print:hidden" style={{
        position: 'relative', zIndex: 1,
        background: esTropical ? `linear-gradient(135deg, ${COLOR_PERSONAL_CLARO} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${COLOR_PERSONAL}25 0%, ${COLOR_PERSONAL}10 100%)`,
        border: esTropical ? `1.5px solid ${COLOR_PERSONAL_BG}` : `1px solid ${COLOR_PERSONAL}55`,
        borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
        display: 'flex', alignItems: 'center', gap: '16px',
        boxShadow: esTropical ? `0 2px 12px ${COLOR_PERSONAL}15` : 'none',
      }}>
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: esTropical ? COLOR_PERSONAL : `${COLOR_PERSONAL}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px',
          boxShadow: esTropical ? `0 4px 12px ${COLOR_PERSONAL}40` : 'none',
        }}>📐</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? COLOR_PERSONAL_DARKER : 'var(--color-text-primary)', lineHeight: 1.2 }}>
            Calculadora de Producción
          </div>
          <div style={{ fontSize: '12px', color: esTropical ? COLOR_PERSONAL : `${COLOR_PERSONAL}CC`, marginTop: '4px', fontWeight: 500 }}>
            Calcula ingredientes y costos automáticamente
          </div>
        </div>
      </div>

      {/* PASO 1 - SELECCIONAR RECETA */}
      <div className="print:hidden" style={{ position: 'relative', zIndex: 1, marginBottom: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ fontSize: '14px' }}>1️⃣</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-accent)', opacity: 0.85, letterSpacing: '1.5px', fontWeight: 600 }}>
            SELECCIONA LA RECETA
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px' }}>
          {recetas.map(r => {
            const seleccionada = recetaSeleccionada?.id === r.id
            return (
              <button
                key={r.id}
                onClick={() => seleccionarReceta(r)}
                style={{
                  background: seleccionada ? (esTropical ? COLOR_PERSONAL_CLARO : `${COLOR_PERSONAL}15`) : 'var(--color-modulo-bg)',
                  border: seleccionada ? `1px solid ${COLOR_PERSONAL}` : '1px solid var(--color-modulo-border)',
                  borderLeft: `4px solid ${seleccionada ? COLOR_PERSONAL : 'transparent'}`,
                  borderRadius: '12px', padding: '14px 16px',
                  cursor: 'pointer', textAlign: 'left',
                  display: 'flex', flexDirection: 'column', gap: '4px',
                  fontFamily: 'inherit', boxShadow: 'var(--modulo-sombra)',
                }}
              >
                <div style={{ fontSize: '22px', lineHeight: 1, marginBottom: '4px' }}>{r.emoji}</div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: esTropical && seleccionada ? COLOR_PERSONAL_DARKER : 'var(--color-text-primary)' }}>
                  {r.nombre}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', textTransform: 'capitalize' }}>
                  📅 {r.dia_semana}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* PASO 2 - RACIONES */}
      {recetaSeleccionada && (
        <div className="print:hidden" style={{ position: 'relative', zIndex: 1, marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px' }}>2️⃣</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-accent)', opacity: 0.85, letterSpacing: '1.5px', fontWeight: 600 }}>
              ¿CUÁNTAS RACIONES VAS A PRODUCIR?
            </span>
          </div>

          <div style={{ background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)', borderRadius: '14px', padding: '8px', marginBottom: '12px', display: 'flex', gap: '4px', boxShadow: 'var(--modulo-sombra)' }}>
            <button
              onClick={() => setModoSeleccion('manual')}
              style={{
                flex: 1, padding: '12px',
                background: modoSeleccion === 'manual' ? (esTropical ? COLOR_PERSONAL : `${COLOR_PERSONAL}25`) : 'transparent',
                border: 'none', borderRadius: '10px',
                color: modoSeleccion === 'manual' ? (esTropical ? '#fff' : COLOR_PERSONAL) : 'var(--color-text-secondary)',
                fontSize: '13px', fontWeight: modoSeleccion === 'manual' ? 600 : 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              ✍️ Cantidad manual
            </button>
            <button
              onClick={() => setModoSeleccion('escuelas')}
              style={{
                flex: 1, padding: '12px',
                background: modoSeleccion === 'escuelas' ? (esTropical ? COLOR_PERSONAL : `${COLOR_PERSONAL}25`) : 'transparent',
                border: 'none', borderRadius: '10px',
                color: modoSeleccion === 'escuelas' ? (esTropical ? '#fff' : COLOR_PERSONAL) : 'var(--color-text-secondary)',
                fontSize: '13px', fontWeight: modoSeleccion === 'escuelas' ? 600 : 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              🏫 Por escuelas ({escuelas.length})
            </button>
          </div>

          {modoSeleccion === 'manual' ? (
            <input
              type="number" placeholder="Ej: 1230"
              value={racionesObjetivo} onChange={(e) => setRacionesObjetivo(e.target.value)}
              style={{
                width: '100%', padding: '20px',
                background: 'var(--color-modulo-bg)',
                border: '1px solid var(--color-modulo-border)',
                borderRadius: '14px', textAlign: 'center',
                fontSize: '28px', fontWeight: 600,
                color: 'var(--color-text-primary)',
                fontFamily: 'inherit', outline: 'none',
                boxShadow: 'var(--modulo-sombra)',
              }}
            />
          ) : (
            <div>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button
                  onClick={() => setEscuelasSeleccionadas(escuelas)}
                  style={{ padding: '6px 14px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ✅ Todas
                </button>
                <button
                  onClick={() => setEscuelasSeleccionadas([])}
                  style={{ padding: '6px 14px', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', color: 'var(--color-text-secondary)', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  ❌ Ninguna
                </button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {escuelas.map(e => {
                  const sel = escuelasSeleccionadas.find(s => s.id === e.id)
                  return (
                    <button
                      key={e.id}
                      onClick={() => toggleEscuela(e)}
                      style={{
                        padding: '14px 16px',
                        background: sel ? (esTropical ? COLOR_PERSONAL_CLARO : `${COLOR_PERSONAL}15`) : 'var(--color-modulo-bg)',
                        border: sel ? `1px solid ${COLOR_PERSONAL}` : '1px solid var(--color-modulo-border)',
                        borderLeft: `4px solid ${sel ? COLOR_PERSONAL : 'transparent'}`,
                        borderRadius: '12px', textAlign: 'left',
                        cursor: 'pointer', fontFamily: 'inherit',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        boxShadow: 'var(--modulo-sombra)',
                      }}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: esTropical && sel ? COLOR_PERSONAL_DARKER : 'var(--color-text-primary)' }}>
                          {sel ? '✅' : '⬜'} {e.nombre}
                        </div>
                        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                          {e.raciones_contractuales} raciones · RD$ {e.precio_racion}/ración
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* RESULTADO IMPRIMIBLE */}
      {recetaSeleccionada && racionesCalculadas > 0 && (
        <div style={{ position: 'relative', zIndex: 1 }} className="bg-white rounded-2xl shadow-xl p-8 print:shadow-none print:p-4">
          <div className="border-b-2 border-gray-900 pb-4 mb-6">
            <div className="flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">📋 Lista de Producción</h1>
                <p className="text-sm text-gray-600 mt-1">{recetaSeleccionada.emoji} {recetaSeleccionada.nombre}</p>
                <p className="text-xs text-gray-500 mt-1 capitalize">📅 {recetaSeleccionada.dia_semana} · {new Date().toLocaleDateString('es-DO')}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 font-semibold tracking-wider">RACIONES</p>
                <p className="text-4xl font-bold" style={{ color: COLOR_PERSONAL }}>{racionesCalculadas.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {cargandoIngredientes ? (
            <div className="text-center py-12 text-gray-500">Cargando ingredientes...</div>
          ) : ingredientesReceta.length === 0 ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
              <p className="text-2xl mb-2">⚠️</p>
              <p className="font-bold text-yellow-900">Esta receta no tiene ingredientes asociados</p>
              <p className="text-sm text-yellow-700 mt-2">Ve a Configuración → Menús y Recetas → Editar esta receta para agregar ingredientes.</p>
            </div>
          ) : (
            <>
              <div className="mb-6">
                <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">📦 LISTA DE COMPRAS</p>
                <table className="w-full">
                  <thead className="border-b-2 border-gray-300">
                    <tr className="text-left">
                      <th className="py-2 text-xs text-gray-600 font-semibold tracking-wider">INGREDIENTE</th>
                      <th className="py-2 text-xs text-gray-600 font-semibold tracking-wider text-right">CANTIDAD CRUDA</th>
                      <th className="py-2 text-xs text-gray-600 font-semibold tracking-wider text-right">PRECIO/UNIDAD</th>
                      <th className="py-2 text-xs text-gray-600 font-semibold tracking-wider text-right">SUBTOTAL</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ingredientesCalculados.map(ing => (
                      <tr key={ing.id} className="border-b border-gray-200">
                        <td className="py-3">
                          <p className="font-semibold text-gray-900 text-sm">{ing.nombre}</p>
                          {ing.notas && (<p className="text-xs text-gray-500 italic">"{ing.notas}"</p>)}
                          <p className="text-xs text-gray-400 mt-1">
                            {ing.nivel === 'principal' && '⚖️ Principal'}
                            {ing.nivel === 'sazonador' && '📏 Sazonador'}
                            {ing.nivel === 'condimento' && '🤏 Condimento'}
                          </p>
                        </td>
                        <td className="py-3 text-right text-sm font-mono">
                          <span className="font-bold">{ing.cantidadCrudo.toFixed(2)}</span> {ing.unidad}
                          <p className="text-xs text-gray-400">→ {ing.cantidadCocido.toFixed(2)} {ing.unidad} cocido</p>
                        </td>
                        <td className="py-3 text-right text-sm font-mono">RD$ {ing.precioUnit.toFixed(2)}</td>
                        <td className="py-3 text-right text-sm font-mono font-bold">RD$ {ing.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-gray-900">
                    <tr>
                      <td colSpan={3} className="py-3 text-right text-sm font-bold">COSTO TOTAL:</td>
                      <td className="py-3 text-right font-mono text-lg font-bold" style={{ color: COLOR_PERSONAL }}>
                        RD$ {costoTotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-700 font-semibold tracking-wider">PESO CRUDO</p>
                  <p className="text-lg font-bold text-blue-900 mt-1">{pesoCrudoTotal.toFixed(1)} lb</p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-orange-700 font-semibold tracking-wider">PESO COCIDO</p>
                  <p className="text-lg font-bold text-orange-900 mt-1">{pesoCocidoTotal.toFixed(1)} lb</p>
                  <p className="text-xs text-orange-600">estimado</p>
                </div>
                <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-semibold tracking-wider" style={{ color: COLOR_PERSONAL_DARKER }}>COSTO/RACIÓN</p>
                  <p className="text-lg font-bold mt-1" style={{ color: COLOR_PERSONAL_DARKER }}>RD$ {costoPorRacion.toFixed(2)}</p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-purple-700 font-semibold tracking-wider">TOTAL</p>
                  <p className="text-lg font-bold text-purple-900 mt-1">RD$ {(costoTotal / 1000).toFixed(1)}K</p>
                </div>
              </div>

              {modoSeleccion === 'escuelas' && escuelasSeleccionadas.length > 0 && (
                <div className={`rounded-xl p-4 mb-6 border ${margenPct < 25 ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
                  <p className={`text-xs font-semibold tracking-wider mb-3 ${margenPct < 25 ? 'text-red-700' : 'text-green-700'}`}>
                    💰 ANÁLISIS DE GANANCIA
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-gray-600">Facturación esperada</p>
                      <p className="text-lg font-bold text-gray-900">RD$ {facturacionEsperada.toLocaleString('es-DO')}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Costo de producción</p>
                      <p className="text-lg font-bold text-gray-900">RD$ {costoTotal.toLocaleString('es-DO', { maximumFractionDigits: 0 })}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-600">Margen ({margenPct}%)</p>
                      <p className={`text-lg font-bold ${margenPct < 25 ? 'text-red-700' : 'text-green-700'}`}>
                        RD$ {margenTotal.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                  </div>
                  {margenPct < 25 && (
                    <p className="text-xs text-red-700 mt-3 font-semibold">⚠️ Margen bajo el mínimo recomendado (25%)</p>
                  )}
                </div>
              )}

              {modoSeleccion === 'escuelas' && escuelasSeleccionadas.length > 0 && (
                <div className="mb-6">
                  <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">🏫 DISTRIBUCIÓN POR ESCUELA</p>
                  <div className="space-y-2">
                    {escuelasSeleccionadas.map(e => (
                      <div key={e.id} className="flex justify-between items-center bg-gray-50 rounded-lg p-3">
                        <div>
                          <p className="font-semibold text-sm">{e.nombre}</p>
                          <p className="text-xs text-gray-500">{e.raciones_contractuales} raciones × RD$ {e.precio_racion}</p>
                        </div>
                        <p className="font-mono font-bold text-sm">
                          RD$ {((e.raciones_contractuales || 0) * parseFloat(e.precio_racion || 0)).toLocaleString('es-DO')}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="print:hidden flex justify-center pt-4 border-t border-gray-200">
                <button
                  onClick={imprimir}
                  style={{
                    padding: '14px 28px',
                    background: `linear-gradient(135deg, ${COLOR_PERSONAL} 0%, ${COLOR_PERSONAL_DARKER} 100%)`,
                    border: 'none', borderRadius: '12px',
                    color: 'white', fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                    boxShadow: `0 4px 12px ${COLOR_PERSONAL}40`,
                  }}
                >
                  🖨️ Imprimir Lista de Compras
                </button>
              </div>

              <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
                <p>Generado por Cocina PAE · {new Date().toLocaleString('es-DO')}</p>
              </div>
            </>
          )}
        </div>
      )}

      <style>{`
        @media print {
          body { background: white !important; }
          @page { margin: 1.5cm; }
        }
      `}</style>
    </div>
  )
}

function btnVolver() {
  return {
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '20px', padding: '8px 16px',
    color: 'var(--color-text-secondary)',
    fontSize: '13px', fontWeight: 500, cursor: 'pointer',
    display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'inherit',
  }
}

function toggleTemaStyle() {
  return {
    display: 'flex', alignItems: 'center',
    background: 'var(--color-bg-elevated)',
    border: '1px solid var(--color-border-subtle)',
    borderRadius: '20px', padding: '3px', gap: '2px',
  }
}

function tabTemaStyle(activo) {
  return {
    background: activo ? 'var(--gradient-toggle-active)' : 'transparent',
    border: 'none', borderRadius: '16px', padding: '6px 10px',
    display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
  }
}

export default CalculadoraProduccion