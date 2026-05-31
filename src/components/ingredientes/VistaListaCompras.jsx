// src/components/ingredientes/VistaListaCompras.jsx
import { useState, useEffect, useMemo } from 'react'
import {
  obtenerListaCompras,
  agruparPorProveedor,
  calcularResumenEconomico,
  formatearRD,
  redondear,
  DIAS_COCINA_POR_SEMANA
} from '../../utils/calculosCompras'
import ModalListaGenerada from './ModalListaGenerada'

const PRESETS = [
  { label: '1 día',     dias: 1,  descripcion: '1 día de cocina' },
  { label: '3 días',    dias: 3,  descripcion: '3 días de cocina' },
  { label: '1 semana',  dias: 5,  descripcion: '1 semana INABIE', destacado: true },
  { label: '2 semanas', dias: 10, descripcion: '2 semanas' },
  { label: '1 mes',     dias: 20, descripcion: '~4 semanas' }
]

// Colores por urgencia (rgb sin paréntesis para usar en rgba())
const COLOR_URGENTE = '244, 67, 54'      // rojo
const COLOR_PROXIMO = '239, 159, 39'     // ámbar
const COLOR_SUFICIENTE = '29, 158, 117'  // verde
const COLOR_SIN_DATO = '250, 199, 117'   // amarillo
const COLOR_INVERSION = '55, 138, 221'   // azul

export default function VistaListaCompras({ empresaId, empresa, onVolver }) {
  const [cargando, setCargando] = useState(true)
  const [items, setItems] = useState([])
  const [diasObjetivo, setDiasObjetivo] = useState(DIAS_COCINA_POR_SEMANA)
  const [customDias, setCustomDias] = useState('')
  const [tipoCustom, setTipoCustom] = useState('dias')
  const [seleccionados, setSeleccionados] = useState({})
  const [cantidadesEditadas, setCantidadesEditadas] = useState({})
  const [mostrarSuficientes, setMostrarSuficientes] = useState(false)
  const [mostrarSinDato, setMostrarSinDato] = useState(false)
  const [modalAbierto, setModalAbierto] = useState(false)
  const [datosLista, setDatosLista] = useState(null)

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const racionesPromedio = empresa?.raciones_diarias_total || 1230

  async function cargarLista() {
    setCargando(true)
    const { items: itemsCargados, error } = await obtenerListaCompras(empresaId, diasObjetivo, racionesPromedio)
    if (error) { alert('Error cargando lista: ' + error.message); setCargando(false); return }
    setItems(itemsCargados)

    const autoSeleccionados = {}
    itemsCargados.forEach(item => {
      if (item.urgencia === 'urgente' || item.urgencia === 'proximo') {
        autoSeleccionados[item.id] = true
      }
    })
    setSeleccionados(autoSeleccionados)
    setCargando(false)
  }

  useEffect(() => {
    cargarLista()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [empresaId, diasObjetivo])

  function aplicarPreset(dias) {
    setDiasObjetivo(dias); setCustomDias(''); setCantidadesEditadas({})
  }
  function aplicarCustom() {
    const valor = parseInt(customDias)
    if (isNaN(valor) || valor < 1 || valor > 365) { alert('Ingresa un número entre 1 y 365'); return }
    const diasFinales = tipoCustom === 'semanas' ? valor * DIAS_COCINA_POR_SEMANA : valor
    setDiasObjetivo(diasFinales); setCantidadesEditadas({})
  }
  function toggleSeleccion(itemId) {
    setSeleccionados(prev => ({ ...prev, [itemId]: !prev[itemId] }))
  }
  function seleccionarTodos(filtro = null) {
    const nuevos = { ...seleccionados }
    items.forEach(item => { if (!filtro || item.urgencia === filtro) nuevos[item.id] = true })
    setSeleccionados(nuevos)
  }
  function deseleccionarTodos() { setSeleccionados({}) }
  function editarCantidad(itemId, nuevaCantidad) {
    const valor = parseFloat(nuevaCantidad)
    if (isNaN(valor) || valor < 0) {
      setCantidadesEditadas(prev => { const nuevo = { ...prev }; delete nuevo[itemId]; return nuevo })
      return
    }
    setCantidadesEditadas(prev => ({ ...prev, [itemId]: valor }))
  }
  function resetearEdicion(itemId) {
    setCantidadesEditadas(prev => { const nuevo = { ...prev }; delete nuevo[itemId]; return nuevo })
  }

  function generarLista() {
    const itemsConCantidad = items
      .filter(item => seleccionados[item.id])
      .map(item => ({
        ...item,
        cantidadSugerida: cantidadesEditadas[item.id] !== undefined ? cantidadesEditadas[item.id] : item.cantidadSugerida,
        costoEstimado: cantidadesEditadas[item.id] !== undefined
          ? cantidadesEditadas[item.id] * item.precioUnitario
          : item.costoEstimado
      }))
      .filter(item => item.cantidadSugerida > 0)

    if (itemsConCantidad.length === 0) { alert('⚠️ No hay items seleccionados con cantidad mayor a 0'); return }

    itemsConCantidad.forEach(item => { item.costoEstimadoFormateado = formatearRD(item.costoEstimado) })
    const agrupado = agruparPorProveedor(itemsConCantidad)
    setDatosLista({ items: itemsConCantidad, agrupado, empresa })
    setModalAbierto(true)
  }

  const resumen = useMemo(() => calcularResumenEconomico(items), [items])
  const itemsUrgentes = items.filter(i => i.urgencia === 'urgente')
  const itemsProximos = items.filter(i => i.urgencia === 'proximo')
  const itemsSinDato = items.filter(i => i.urgencia === 'sin_dato')
  const itemsSuficientes = items.filter(i => i.urgencia === 'suficiente')

  const totalSeleccionado = useMemo(() => {
    let count = 0, costo = 0
    items.forEach(item => {
      if (seleccionados[item.id]) {
        const cantidad = cantidadesEditadas[item.id] !== undefined ? cantidadesEditadas[item.id] : item.cantidadSugerida
        if (cantidad > 0) { count++; costo += cantidad * item.precioUnitario }
      }
    })
    return { count, costo, costoFormateado: formatearRD(costo) }
  }, [items, seleccionados, cantidadesEditadas])

  // ─── ESTILOS ───
  const panel = {
    background: 'var(--color-modulo-bg)',
    border: '1px solid var(--color-modulo-border)',
    borderRadius: '14px', padding: '20px',
    boxShadow: 'var(--modulo-sombra)',
  }
  const sectionTitle = {
    fontSize: '11px', color: 'var(--color-text-muted)',
    letterSpacing: '1.5px', fontWeight: 600, marginBottom: '14px',
  }

  if (cargando) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '52px', marginBottom: '12px' }}>📦</div>
          <p style={{ color: 'var(--color-text-primary)', fontSize: '17px', fontWeight: 500 }}>Analizando inventario...</p>
          <p style={{ color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '4px' }}>Calculando consumo aprendido</p>
        </div>
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--color-bg-primary)',
      position: 'relative', padding: '20px', paddingBottom: '120px',
      color: 'var(--color-text-primary)',
    }}>
      <style>{`
        @keyframes vlcSlideTop { 0% { opacity: 0; transform: translateY(-18px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes vlcFadeUp { 0% { opacity: 0; transform: translateY(22px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* HEADER */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
        opacity: 0, animation: 'vlcSlideTop 0.5s ease forwards',
      }}>
        <button onClick={onVolver} style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '20px', padding: '7px 14px',
          color: 'var(--color-text-secondary)', fontSize: '12px',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>← Volver a Ingredientes</button>

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
      </div>

      {/* TÍTULO */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--color-modulo-bg)',
        border: '1px solid var(--color-modulo-border)',
        borderLeft: '4px solid #1D9E75',
        borderRadius: '14px', padding: '20px',
        marginBottom: '20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        gap: '16px', flexWrap: 'wrap',
        boxShadow: 'var(--modulo-sombra)',
        opacity: 0, animation: 'vlcFadeUp 0.5s ease 0.1s forwards',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '14px',
            background: 'rgba(29, 158, 117, 0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '26px',
          }}>📦</div>
          <div>
            <div style={{ fontSize: '10px', color: '#1D9E75', letterSpacing: '1.5px', fontWeight: 600 }}>
              INTELIGENCIA DE INVENTARIO
            </div>
            <div style={{ fontSize: '22px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              Lista de Compras
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              Sugerencias automáticas basadas en consumo aprendido
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', letterSpacing: '0.5px' }}>EMPRESA</div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{empresa?.nombre}</div>
          <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
            {racionesPromedio.toLocaleString('es-DO')} raciones diarias
          </div>
        </div>
      </div>

      {/* ANÁLISIS DE INVENTARIO */}
      {resumen.totalItems > 0 && (
        <div style={{
          position: 'relative', zIndex: 1, marginBottom: '20px',
          ...panel, padding: 0, overflow: 'hidden',
          opacity: 0, animation: 'vlcFadeUp 0.5s ease 0.15s forwards',
        }}>
          <div style={{
            background: 'linear-gradient(135deg, rgba(29, 158, 117, 0.18) 0%, rgba(15, 110, 86, 0.08) 100%)',
            padding: '14px 18px',
            borderBottom: '1px solid var(--color-modulo-border)',
          }}>
            <div style={{ fontSize: '11px', color: '#1D9E75', letterSpacing: '1.5px', fontWeight: 600 }}>
              💎 ANÁLISIS DE INVENTARIO
            </div>
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>
              La aplicación analizó {resumen.totalItems} ingredientes activos
            </div>
          </div>

          <div style={{
            padding: '16px',
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px',
          }}>
            <KpiUrgencia color={COLOR_URGENTE} cantidad={resumen.cantidadUrgentes} icon={resumen.cantidadUrgentes > 0 ? '🚨' : '✅'} label="URGENTES" />
            <KpiUrgencia color={COLOR_PROXIMO} cantidad={resumen.cantidadProximos} icon={resumen.cantidadProximos > 0 ? '⚠️' : '✅'} label="PRÓXIMOS" />
            <KpiUrgencia color={COLOR_SUFICIENTE} cantidad={resumen.cantidadSuficientes} icon="✅" label="SUFICIENTES" />
            <KpiUrgencia color={COLOR_SIN_DATO} cantidad={resumen.cantidadSinDato} icon="⚙️" label="SIN CONFIG" />
            <KpiUrgencia color={COLOR_INVERSION} cantidad={resumen.inversionTotalFormateada} icon="💰" label="INVERSIÓN" textoLargo />
          </div>

          {resumen.riesgoOperacional && (
            <div style={{
              background: `rgba(${COLOR_URGENTE}, 0.15)`,
              borderTop: `1px solid rgba(${COLOR_URGENTE}, 0.35)`,
              padding: '10px 14px', textAlign: 'center',
              fontSize: '12px', color: '#F4C0D1', fontWeight: 600,
            }}>
              {resumen.mensajeRiesgo} · ¡La operación está en riesgo!
            </div>
          )}

          {resumen.cantidadSinProveedor > 0 && (
            <div style={{
              background: `rgba(${COLOR_PROXIMO}, 0.12)`,
              borderTop: `1px solid rgba(${COLOR_PROXIMO}, 0.3)`,
              padding: '10px 14px', textAlign: 'center',
              fontSize: '12px', color: '#EF9F27', fontWeight: 600,
            }}>
              ⚠️ {resumen.cantidadSinProveedor} ingrediente{resumen.cantidadSinProveedor > 1 ? 's' : ''} sin proveedor asignado
            </div>
          )}
        </div>
      )}

      {/* SELECTOR DE PERÍODO */}
      <div style={{
        position: 'relative', zIndex: 1, marginBottom: '16px',
        ...panel,
        opacity: 0, animation: 'vlcFadeUp 0.5s ease 0.2s forwards',
      }}>
        <div style={sectionTitle}>📅 REPONER PARA CUÁNTOS DÍAS</div>

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
          {PRESETS.map(preset => (
            <button key={preset.dias} onClick={() => aplicarPreset(preset.dias)} style={{
              padding: '8px 14px',
              background: diasObjetivo === preset.dias
                ? 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)'
                : 'var(--color-bg-input)',
              border: diasObjetivo === preset.dias
                ? 'none'
                : preset.destacado
                  ? '1px solid rgba(29, 158, 117, 0.5)'
                  : '1px solid var(--color-border-subtle)',
              borderRadius: '10px',
              color: diasObjetivo === preset.dias ? 'white' : 'var(--color-text-primary)',
              fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>
              {preset.label}
              {preset.destacado && diasObjetivo !== preset.dias && <span style={{ marginLeft: '4px', fontSize: '10px' }}>⭐</span>}
            </button>
          ))}
        </div>

        <div style={{
          display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap',
          paddingTop: '12px', borderTop: '1px solid var(--color-border-subtle)',
        }}>
          <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 500 }}>O custom:</span>
          <input type="number" min="1" max="365" value={customDias}
            onChange={e => setCustomDias(e.target.value)} placeholder="Cantidad"
            style={{
              width: '90px', boxSizing: 'border-box',
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '8px', padding: '7px 10px',
              color: 'var(--color-text-primary)',
              fontSize: '12px', fontFamily: 'inherit', outline: 'none',
            }} />
          <select value={tipoCustom} onChange={e => setTipoCustom(e.target.value)} style={{
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '8px', padding: '7px 10px',
            color: 'var(--color-text-primary)',
            fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>
            <option value="dias">días</option>
            <option value="semanas">semanas</option>
          </select>
          <button onClick={aplicarCustom} disabled={!customDias} style={{
            padding: '7px 14px',
            background: !customDias ? 'var(--color-bg-input)' : 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
            border: 'none', borderRadius: '8px',
            color: !customDias ? 'var(--color-text-muted)' : 'white',
            fontSize: '12px', fontWeight: 600,
            cursor: !customDias ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
          }}>Aplicar</button>
        </div>

        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '10px' }}>
          💡 Período actual: <strong style={{ color: '#1D9E75' }}>{diasObjetivo} días de cocina</strong>
          {' '}({redondear(diasObjetivo / DIAS_COCINA_POR_SEMANA, 1)} semana{diasObjetivo > 5 ? 's' : ''})
        </div>
      </div>

      {/* ACCIONES DE SELECCIÓN */}
      {items.length > 0 && (itemsUrgentes.length > 0 || itemsProximos.length > 0) && (
        <div style={{
          position: 'relative', zIndex: 1, marginBottom: '16px',
          ...panel, padding: '12px',
          display: 'flex', flexWrap: 'wrap', gap: '8px',
        }}>
          <BotonAccion onClick={() => seleccionarTodos()} color={COLOR_SUFICIENTE} label="☑️ Seleccionar todos" />
          {itemsUrgentes.length > 0 && <BotonAccion onClick={() => seleccionarTodos('urgente')} color={COLOR_URGENTE} label="🚨 Solo urgentes" />}
          {itemsProximos.length > 0 && <BotonAccion onClick={() => seleccionarTodos('proximo')} color={COLOR_PROXIMO} label="⚠️ Solo próximos" />}
          <BotonAccion onClick={deseleccionarTodos} label="☐ Deseleccionar" />
        </div>
      )}

      {/* SECCIÓN URGENTES */}
      {itemsUrgentes.length > 0 && (
        <SeccionItems
          titulo="🚨 URGENTES" descripcion="Se acaban en menos de 2 días"
          color={COLOR_URGENTE} items={itemsUrgentes}
          seleccionados={seleccionados} cantidadesEditadas={cantidadesEditadas}
          onToggle={toggleSeleccion} onEditarCantidad={editarCantidad} onResetearEdicion={resetearEdicion}
        />
      )}

      {/* SECCIÓN PRÓXIMOS */}
      {itemsProximos.length > 0 && (
        <SeccionItems
          titulo="⚠️ PRÓXIMOS A AGOTARSE" descripcion="Te quedan entre 2 y 5 días de cocina"
          color={COLOR_PROXIMO} items={itemsProximos}
          seleccionados={seleccionados} cantidadesEditadas={cantidadesEditadas}
          onToggle={toggleSeleccion} onEditarCantidad={editarCantidad} onResetearEdicion={resetearEdicion}
        />
      )}

      {/* SECCIÓN SIN DATOS (colapsable) */}
      {itemsSinDato.length > 0 && (
        <div style={{
          position: 'relative', zIndex: 1, marginBottom: '16px',
          background: 'var(--color-modulo-bg)',
          border: `1px solid rgba(${COLOR_SIN_DATO}, 0.4)`,
          borderLeft: `4px solid rgb(${COLOR_SIN_DATO})`,
          borderRadius: '14px', overflow: 'hidden',
          boxShadow: 'var(--modulo-sombra)',
        }}>
          <button onClick={() => setMostrarSinDato(!mostrarSinDato)} style={{
            width: '100%', padding: '14px 18px', textAlign: 'left',
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: '12px', fontFamily: 'inherit',
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#FAC775' }}>
                ⚙️ SIN CONFIGURAR ({itemsSinDato.length})
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Sin historial ni estándar INABIE · Configurar consumo manualmente
              </div>
            </div>
            <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>{mostrarSinDato ? '▼' : '▶'}</span>
          </button>

          {mostrarSinDato && (
            <div style={{
              padding: '14px 18px',
              borderTop: `1px solid rgba(${COLOR_SIN_DATO}, 0.25)`,
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              <div style={{
                background: `rgba(${COLOR_SIN_DATO}, 0.15)`,
                border: `1px solid rgba(${COLOR_SIN_DATO}, 0.35)`,
                borderRadius: '10px', padding: '10px 12px',
                fontSize: '11px', color: '#FAC775',
              }}>
                💡 <strong>¿Por qué aparecen aquí?</strong> No están en el catálogo INABIE estándar y no tienen historial suficiente. Edítalos en Ingredientes para configurar su "Consumo semanal esperado".
              </div>

              {itemsSinDato.map(item => (
                <div key={item.id} style={{
                  background: 'var(--color-bg-input)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px', padding: '10px 12px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  flexWrap: 'wrap', gap: '8px',
                }}>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>{item.nombre}</div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      Stock actual: <strong style={{ color: 'var(--color-text-secondary)' }}>{item.stockActual} {item.unidadStock}</strong>
                      {item.precioUnitario > 0 && (
                        <> · Último costo: <strong style={{ color: 'var(--color-text-secondary)' }}>{formatearRD(item.precioUnitario)}</strong></>
                      )}
                    </div>
                  </div>
                  <span style={{
                    padding: '4px 10px',
                    background: `rgba(${COLOR_SIN_DATO}, 0.18)`,
                    border: `1px solid rgba(${COLOR_SIN_DATO}, 0.4)`,
                    borderRadius: '14px',
                    fontSize: '10px', fontWeight: 600, color: '#FAC775',
                  }}>💡 Configurar</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* SECCIÓN SUFICIENTES (colapsable) */}
      {itemsSuficientes.length > 0 && (
        <div style={{
          position: 'relative', zIndex: 1, marginBottom: '16px',
          background: 'var(--color-modulo-bg)',
          border: '1px solid var(--color-modulo-border)',
          borderLeft: `4px solid rgb(${COLOR_SUFICIENTE})`,
          borderRadius: '14px', overflow: 'hidden',
          boxShadow: 'var(--modulo-sombra)',
        }}>
          <button onClick={() => setMostrarSuficientes(!mostrarSuficientes)} style={{
            width: '100%', padding: '14px 18px', textAlign: 'left',
            background: 'transparent', border: 'none', cursor: 'pointer',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            gap: '12px', fontFamily: 'inherit',
          }}>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 600, color: '#1D9E75' }}>
                ✅ SUFICIENTES ({itemsSuficientes.length})
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                Stock adecuado · No requieren compra urgente
              </div>
            </div>
            <span style={{ fontSize: '14px', color: 'var(--color-text-muted)' }}>{mostrarSuficientes ? '▼' : '▶'}</span>
          </button>

          {mostrarSuficientes && (
            <div style={{
              padding: '14px 18px',
              borderTop: '1px solid var(--color-modulo-border)',
              display: 'flex', flexDirection: 'column', gap: '10px',
            }}>
              {itemsSuficientes.map(item => (
                <ItemCompra
                  key={item.id} item={item}
                  seleccionado={seleccionados[item.id] || false}
                  cantidadEditada={cantidadesEditadas[item.id]}
                  color={COLOR_SUFICIENTE}
                  onToggle={() => toggleSeleccion(item.id)}
                  onEditarCantidad={(cant) => editarCantidad(item.id, cant)}
                  onResetearEdicion={() => resetearEdicion(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* MENSAJE SI NO HAY ITEMS */}
      {items.length === 0 && !cargando && (
        <div style={{ ...panel, position: 'relative', zIndex: 1, textAlign: 'center', padding: '32px' }}>
          <div style={{ fontSize: '52px', marginBottom: '10px' }}>📦</div>
          <div style={{ fontSize: '17px', fontWeight: 500, color: 'var(--color-text-primary)', marginBottom: '6px' }}>
            No hay ingredientes activos
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
            Agrega ingredientes en el módulo de Ingredientes para que aparezcan aquí.
          </div>
        </div>
      )}

      {/* BARRA DE ACCIÓN FLOTANTE */}
      {totalSeleccionado.count > 0 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
          background: 'var(--color-bg-primary)',
          borderTop: '1px solid var(--color-border-accent)',
          boxShadow: '0 -8px 24px rgba(0,0,0,0.3)',
          padding: '14px 20px',
        }}>
          <div style={{
            maxWidth: '1100px', margin: '0 auto',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '14px', flexWrap: 'wrap',
          }}>
            <div>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#1D9E75' }}>
                {totalSeleccionado.count} ingrediente{totalSeleccionado.count > 1 ? 's' : ''} seleccionado{totalSeleccionado.count > 1 ? 's' : ''}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                Inversión: <strong style={{ color: '#378ADD' }}>{totalSeleccionado.costoFormateado}</strong>
              </div>
            </div>
            <button onClick={generarLista} style={{
              padding: '12px 24px',
              background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)',
              border: 'none', borderRadius: '10px',
              color: 'white', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
              display: 'flex', alignItems: 'center', gap: '6px',
            }}>📋 Generar Lista</button>
          </div>
        </div>
      )}

      {/* MODAL LISTA GENERADA */}
      {modalAbierto && datosLista && (
        <ModalListaGenerada datos={datosLista} onCerrar={() => setModalAbierto(false)} />
      )}
    </div>
  )
}

// ─── SUB-COMPONENTES ───

function KpiUrgencia({ color, cantidad, icon, label, textoLargo }) {
  return (
    <div style={{
      background: `rgba(${color}, 0.12)`,
      border: `1px solid rgba(${color}, 0.35)`,
      borderLeft: `4px solid rgb(${color})`,
      borderRadius: '10px', padding: '10px 12px',
    }}>
      <div style={{ fontSize: '18px', marginBottom: '4px' }}>{icon}</div>
      <div style={{
        fontSize: textoLargo ? '13px' : '20px',
        fontWeight: 700,
        color: `rgb(${color})`,
        lineHeight: 1.2,
      }}>{cantidad}</div>
      <div style={{ fontSize: '9px', color: 'var(--color-text-muted)', fontWeight: 600, marginTop: '4px', letterSpacing: '0.5px' }}>{label}</div>
    </div>
  )
}

function BotonAccion({ onClick, color, label }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 12px',
      background: color ? `rgba(${color}, 0.15)` : 'var(--color-bg-input)',
      border: color ? `1px solid rgba(${color}, 0.35)` : '1px solid var(--color-border-subtle)',
      borderRadius: '8px',
      color: color ? `rgb(${color})` : 'var(--color-text-secondary)',
      fontSize: '11px', fontWeight: 600,
      cursor: 'pointer', fontFamily: 'inherit',
    }}>{label}</button>
  )
}

function SeccionItems({ titulo, descripcion, color, items, seleccionados, cantidadesEditadas, onToggle, onEditarCantidad, onResetearEdicion }) {
  return (
    <div style={{
      position: 'relative', zIndex: 1, marginBottom: '16px',
      background: 'var(--color-modulo-bg)',
      border: '1px solid var(--color-modulo-border)',
      borderLeft: `4px solid rgb(${color})`,
      borderRadius: '14px', overflow: 'hidden',
      boxShadow: 'var(--modulo-sombra)',
    }}>
      <div style={{
        background: `rgba(${color}, 0.12)`,
        padding: '14px 18px',
        borderBottom: '1px solid var(--color-modulo-border)',
      }}>
        <div style={{ fontSize: '13px', fontWeight: 700, color: `rgb(${color})` }}>
          {titulo} ({items.length})
        </div>
        <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '2px' }}>{descripcion}</div>
      </div>
      <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {items.map(item => (
          <ItemCompra
            key={item.id} item={item}
            seleccionado={seleccionados[item.id] || false}
            cantidadEditada={cantidadesEditadas[item.id]}
            color={color}
            onToggle={() => onToggle(item.id)}
            onEditarCantidad={(cant) => onEditarCantidad(item.id, cant)}
            onResetearEdicion={() => onResetearEdicion(item.id)}
          />
        ))}
      </div>
    </div>
  )
}

function ItemCompra({ item, seleccionado, cantidadEditada, color, onToggle, onEditarCantidad, onResetearEdicion }) {
  const cantidadFinal = cantidadEditada !== undefined ? cantidadEditada : item.cantidadSugerida
  const costoFinal = cantidadFinal * item.precioUnitario
  const fueEditado = cantidadEditada !== undefined

  return (
    <div style={{
      background: seleccionado ? `rgba(${color}, 0.10)` : 'var(--color-bg-input)',
      border: seleccionado ? `1px solid rgba(${color}, 0.45)` : '1px solid var(--color-border-subtle)',
      borderRadius: '12px', padding: '12px 14px',
      transition: 'all 0.15s ease',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <button onClick={onToggle} style={{
          marginTop: '2px', flexShrink: 0,
          width: '24px', height: '24px', borderRadius: '6px',
          background: seleccionado ? `rgb(${color})` : 'var(--color-bg-input)',
          border: seleccionado ? 'none' : '1px solid var(--color-border-subtle)',
          color: 'white', fontSize: '14px', fontWeight: 700,
          cursor: 'pointer', fontFamily: 'inherit',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>{seleccionado && '✓'}</button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
            <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>{item.nombre}</div>
            <span style={{
              fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
              background: 'var(--color-bg-input)',
              border: '1px solid var(--color-border-subtle)',
              color: 'var(--color-text-muted)',
            }}>{item.etiquetaFuente}</span>
            {!item.tieneProveedor && (
              <span style={{
                fontSize: '10px', padding: '2px 8px', borderRadius: '10px',
                background: `rgba(${COLOR_PROXIMO}, 0.18)`,
                border: `1px solid rgba(${COLOR_PROXIMO}, 0.4)`,
                color: '#EF9F27', fontWeight: 600,
              }}>⚠️ Sin proveedor</span>
            )}
          </div>

          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
            gap: '8px', fontSize: '11px', marginBottom: '10px',
          }}>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Stock: </span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{item.stockActual} {item.unidadStock}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Consumo/sem: </span>
              <strong style={{ color: 'var(--color-text-primary)' }}>{item.consumoSemanal} {item.unidadStock}</strong>
            </div>
            <div>
              <span style={{ color: 'var(--color-text-muted)' }}>Quedan: </span>
              <strong style={{
                color: item.diasCocinaRestantes < 2 ? '#F4C0D1' :
                       item.diasCocinaRestantes < 5 ? '#EF9F27' : '#1D9E75'
              }}>
                {item.diasCocinaRestantes === Infinity ? '∞' : `${item.diasCocinaRestantes} días`}
              </strong>
            </div>
          </div>

          <div style={{
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '10px', padding: '10px 12px', marginBottom: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>💡 Comprar:</span>
                <input type="number" step="0.1" min="0" value={cantidadFinal}
                  onChange={e => onEditarCantidad(e.target.value)}
                  style={{
                    width: '90px', boxSizing: 'border-box',
                    background: fueEditado ? 'rgba(55, 138, 221, 0.15)' : 'var(--color-modulo-bg)',
                    border: fueEditado ? '1px solid rgba(55, 138, 221, 0.5)' : '1px solid var(--color-border-subtle)',
                    borderRadius: '6px', padding: '5px 8px', textAlign: 'center',
                    color: fueEditado ? '#378ADD' : 'var(--color-text-primary)',
                    fontWeight: 700, fontSize: '12px', fontFamily: 'inherit', outline: 'none',
                  }} />
                <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', fontWeight: 600 }}>{item.unidadStock}</span>
                {fueEditado && (
                  <button onClick={onResetearEdicion} style={{
                    background: 'transparent', border: 'none',
                    color: '#378ADD', fontSize: '10px',
                    cursor: 'pointer', textDecoration: 'underline', fontFamily: 'inherit',
                  }} title="Volver a la sugerencia automática">↺ Resetear</button>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>Costo estimado:</div>
                <div style={{ fontSize: '14px', fontWeight: 700, color: '#378ADD' }}>{formatearRD(costoFinal)}</div>
              </div>
            </div>
          </div>

          {item.tieneProveedor && (
            <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              🏪 <strong style={{ color: 'var(--color-text-primary)' }}>{item.proveedor.nombre}</strong>
              {item.proveedor.telefono && (
                <a href={`tel:${item.proveedor.telefono}`} style={{
                  color: '#1D9E75', fontSize: '10px',
                  textDecoration: 'none', fontWeight: 600,
                }}>📞 {item.proveedor.telefono}</a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}