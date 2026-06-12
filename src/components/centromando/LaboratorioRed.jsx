import { useState, useEffect } from 'react'
import { cargarResumenRed } from '../../utils/inteligenciaRed'

// ─── TEMA LABORATORIO FIJO (verde-cian científico) ───
const LAB = {
  bg: '#0a0f14',
  card: '#0e151b',
  borde: 'rgba(94,234,212,0.14)',
  bordeFuerte: 'rgba(94,234,212,0.3)',
  cian: '#5eead4',
  cianClaro: '#9fe7dd',
  texto: '#d7f5ef',
  muted: '#3f7a72',
  ambar: '#fbbf6b',
}

function LaboratorioRed({ empresaIdAdmin, claveMando, onVolver }) {
  const [cargando, setCargando] = useState(true)
  const [resumen, setResumen] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    cargar()
  }, [])

  async function cargar() {
    setCargando(true)
    if (!claveMando) {
      setError('No se recibió la clave de mando. Vuelve a entrar al Centro de Mando.')
      setCargando(false)
      return
    }
    const res = await cargarResumenRed(empresaIdAdmin, claveMando, null)
    setResumen(res.resumen)
    setError(res.error)
    setCargando(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: LAB.bg, position: 'relative', padding: '20px', fontFamily: 'inherit', color: LAB.texto }}>
      <div style={{ maxWidth: '920px', margin: '0 auto' }}>

        {/* HEADER */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '14px', marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(94,234,212,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
              🧪
            </div>
            <div>
              <div style={{ fontSize: '10px', letterSpacing: '0.2em', color: LAB.muted }}>LABORATORIO DE DATOS</div>
              <div style={{ fontSize: '18px', fontWeight: 600, color: LAB.texto }}>Inteligencia de la Red</div>
            </div>
          </div>
          <button onClick={onVolver} style={{ background: LAB.card, border: `1px solid ${LAB.borde}`, borderRadius: '20px', padding: '8px 15px', color: LAB.cianClaro, fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>
            ← Volver
          </button>
        </div>

        {cargando && (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: LAB.muted, fontSize: '14px' }}>
            🧪 Analizando las muestras de la red...
          </div>
        )}

        {!cargando && error && (
          <div style={{ background: 'rgba(226,75,74,0.1)', border: '1px solid rgba(240,149,149,0.3)', borderRadius: '14px', padding: '18px', color: '#F09595', fontSize: '13px' }}>
            No se pudo analizar la red: {error}
          </div>
        )}

        {!cargando && !error && resumen && (
          <>
            {/* Badge vista nacional */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(94,234,212,0.1)', border: `1px solid ${LAB.bordeFuerte}`, color: LAB.cian, fontSize: '11px', padding: '6px 12px', borderRadius: '20px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: LAB.cian }} />
                Vista nacional · toda la red
              </span>
            </div>

            {/* INSTRUMENTOS (KPIs) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '24px' }}>
              <Instrumento label="RACIONES DESPACHADAS" valor={resumen.totalRaciones.toLocaleString()} color={LAB.cian} />
              <Instrumento label="ESCUELAS" valor={resumen.totalEscuelas} color={LAB.cian} />
              <Instrumento label="COCINAS EN RED" valor={resumen.totalCocinas} color={LAB.cian} />
              <Instrumento label="MUESTRAS (EVENTOS)" valor={resumen.totalEventos.toLocaleString()} color={LAB.cian} />
            </div>

            {/* HIPÓTESIS / HALLAZGOS automáticos */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '15px' }}>💡</span>
              <span style={{ fontSize: '11px', letterSpacing: '0.14em', color: LAB.muted }}>HALLAZGOS DE LA RED</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '24px' }}>
              {/* % de pesaje real */}
              <div style={{ background: LAB.card, border: `1px solid ${LAB.borde}`, borderLeft: `3px solid ${resumen.porcentajePesaje < 50 ? '#f0997b' : LAB.cian}`, borderRadius: '0 11px 11px 0', padding: '14px 16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '10px' }}>
                  <div style={{ fontSize: '13px', color: LAB.texto }}>
                    Solo el <strong style={{ color: resumen.porcentajePesaje < 50 ? '#f0997b' : LAB.cian }}>{resumen.porcentajePesaje}%</strong> de los despachos se pesa de verdad
                  </div>
                  <span style={{ fontSize: '10px', color: LAB.cian, background: 'rgba(94,234,212,0.12)', padding: '3px 9px', borderRadius: '6px', whiteSpace: 'nowrap' }}>
                    {resumen.despachosPesados}/{resumen.despachosTotales}
                  </span>
                </div>
                <div style={{ fontSize: '11px', color: LAB.muted, marginTop: '5px' }}>métrica vendible: confiabilidad de medición · comprador: suplidores, auditoría</div>
              </div>

              {/* Sobrante total */}
              <div style={{ background: LAB.card, border: `1px solid ${LAB.borde}`, borderLeft: `3px solid ${LAB.ambar}`, borderRadius: '0 11px 11px 0', padding: '14px 16px' }}>
                <div style={{ fontSize: '13px', color: LAB.texto }}>
                  La red registra <strong style={{ color: LAB.ambar }}>{resumen.sobranteTotal.toLocaleString()}</strong> libras de sobrante acumulado
                </div>
                <div style={{ fontSize: '11px', color: LAB.muted, marginTop: '5px' }}>veta: aceptación de platos · comprador: INABIE, marcas de alimentos</div>
              </div>
            </div>

            {/* EXPERIMENTOS / vetas próximas */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <span style={{ fontSize: '15px' }}>🔬</span>
              <span style={{ fontSize: '11px', letterSpacing: '0.14em', color: LAB.muted }}>EXPERIMENTOS · PRÓXIMAS VETAS</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
              <Veta emoji="🍽️" titulo="Aceptación por receta" sub="sobras por plato y zona" />
              <Veta emoji="📍" titulo="Demanda por zona" sub="raciones por provincia" />
              <Veta emoji="💰" titulo="Índice de precios" sub="canasta y por ración" />
              <Veta emoji="🏪" titulo="Ranking de proveedores" sub="por RNC e informalidad" />
              <Veta emoji="🏫" titulo="Asistencia escolar" sub="matrícula real vs oficial" />
              <Veta emoji="🗺️" titulo="Mapa de la red" sub="zonas con coordenadas" />
            </div>

            <div style={{ textAlign: 'center', marginTop: '28px', fontSize: '11px', color: LAB.muted }}>
              🧪 Andamio · la data se acumula sola con cada despacho
            </div>
          </>
        )}
      </div>
    </div>
  )
}

function Instrumento({ label, valor, color }) {
  return (
    <div style={{ background: LAB.card, border: `1px solid ${LAB.borde}`, borderRadius: '12px', padding: '15px 16px' }}>
      <div style={{ fontSize: '10px', letterSpacing: '0.12em', color: LAB.muted }}>{label}</div>
      <div style={{ fontSize: '26px', fontWeight: 500, color, marginTop: '5px' }}>{valor}</div>
    </div>
  )
}

function Veta({ emoji, titulo, sub }) {
  return (
    <div style={{ background: LAB.card, border: `1px solid ${LAB.borde}`, borderRadius: '12px', padding: '14px', opacity: 0.85 }}>
      <div style={{ fontSize: '20px' }}>{emoji}</div>
      <div style={{ fontSize: '13px', color: LAB.texto, marginTop: '9px' }}>{titulo}</div>
      <div style={{ fontSize: '11px', color: LAB.muted, marginTop: '3px' }}>{sub}</div>
    </div>
  )
}

export default LaboratorioRed