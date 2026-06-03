import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C', bg: '#85B7EB' }

// Nombres de meses en español
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

function num(v) {
  const n = parseFloat(v)
  return isNaN(n) ? 0 : n
}

// Limpia un RNC/cédula: solo dígitos
function soloDigitos(str) {
  return (str || '').replace(/\D/g, '')
}

// Determina tipo de identificación DGII: 1=RNC (9 díg), 2=Cédula (11 díg)
function tipoId(rncOcedula) {
  const d = soloDigitos(rncOcedula)
  if (d.length === 11) return '2' // cédula
  return '1' // RNC (9 dígitos) por defecto
}

// Fecha a formato DGII: AAAAMMDD
function fechaDGII(fechaStr) {
  if (!fechaStr) return ''
  const d = new Date(fechaStr + 'T00:00:00')
  const a = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dia = String(d.getDate()).padStart(2, '0')
  return `${a}${m}${dia}`
}

function ReportesDGII({ usuario, empresaId, onVolver }) {
  const [empresa, setEmpresa] = useState(null)
  const [gastos, setGastos] = useState([])
  const [cargando, setCargando] = useState(true)

  const hoy = new Date()
  const [mes, setMes] = useState(hoy.getMonth() + 1) // 1-12
  const [anio, setAnio] = useState(hoy.getFullYear())

  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])
  const esTropical = tema === 'tropical'

  useEffect(() => { if (empresaId) cargarDatos() }, [empresaId, mes, anio])

  async function cargarDatos() {
    setCargando(true)

    const { data: empresaData } = await supabase.from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)

    // Rango del mes seleccionado
    const primerDia = `${anio}-${String(mes).padStart(2, '0')}-01`
    const ultimoDiaNum = new Date(anio, mes, 0).getDate()
    const ultimoDia = `${anio}-${String(mes).padStart(2, '0')}-${String(ultimoDiaNum).padStart(2, '0')}`

    const { data: gastosData } = await supabase
      .from('gastos')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('fecha', primerDia)
      .lte('fecha', ultimoDia)
      .order('fecha', { ascending: true })

    setGastos(gastosData || [])
    setCargando(false)
  }

  // ── Clasificar gastos ─────────────────────────────────────────
  // Entran al 606 los que tienen NCF y RNC/cédula.
  const gastosValidos = gastos.filter(g => (g.ncf || '').trim() !== '' && (g.rnc || '').trim() !== '')
  const gastosSinNCF = gastos.filter(g => (g.ncf || '').trim() === '' || (g.rnc || '').trim() === '')

  const totalMonto = gastosValidos.reduce((sum, g) => sum + num(g.subtotal), 0)
  const totalITBIS = gastosValidos.reduce((sum, g) => sum + num(g.itbis), 0)

  // ── Generar el TXT del 606 ────────────────────────────────────
  // Estructura oficial DGII:
  //   Línea 1 (ENCABEZADO): 606 | RNC empresa | Periodo AAAAMM | Cantidad de registros
  //   Líneas siguientes (DETALLE): una por cada gasto con NCF.
  // Campos del detalle (separados por |):
  //   RNC/Cédula | TipoId | TipoBienServicio | NCF | NCFModificado |
  //   FechaComprobante | FechaPago | MontoFacturado | ITBISFacturado | FormaPago
  function generarTXT606() {
    const rncEmpresa = soloDigitos(empresa?.rnc)
    const periodo = `${anio}${String(mes).padStart(2, '0')}` // AAAAMM
    const cantidad = gastosValidos.length

    // ENCABEZADO
    const encabezado = ['606', rncEmpresa, periodo, String(cantidad)].join('|')

    // DETALLE
    const lineas = gastosValidos.map(g => {
      const id = soloDigitos(g.rnc)
      const tId = tipoId(g.rnc)
      const tipoBienServicio = '09' // 09 = Gastos de servicios/otros (genérico V1)
      const ncf = (g.ncf || '').trim().toUpperCase() // NCF siempre en MAYÚSCULA
      const ncfMod = '' // sin notas de crédito en V1
      const fechaComp = fechaDGII(g.fecha)
      const fechaPago = g.pagado ? fechaDGII(g.fecha) : ''
      const monto = num(g.subtotal).toFixed(2)
      const itbis = num(g.itbis).toFixed(2)
      const formaPago = mapearFormaPago(g.forma_pago)

      return [id, tId, tipoBienServicio, ncf, ncfMod, fechaComp, fechaPago, monto, itbis, formaPago].join('|')
    })

    // Encabezado + detalle, todo junto
    return [encabezado, ...lineas].join('\r\n')
  }

  // Forma de pago DGII: 01=efectivo, 02=cheque/transferencia, 03=tarjeta, 04=crédito
  function mapearFormaPago(fp) {
    const mapa = {
      efectivo: '01',
      cheque: '02',
      transferencia: '02',
      tarjeta: '03',
      credito: '04',
    }
    return mapa[fp] || '01'
  }

  function descargarTXT() {
    if (gastosValidos.length === 0) {
      alert('No hay gastos con comprobante fiscal (NCF) en este mes para reportar.')
      return
    }
    const contenido = generarTXT606()
    const rncEmpresa = soloDigitos(empresa?.rnc) || 'SINRNC'
    const periodo = `${anio}${String(mes).padStart(2, '0')}`
    const nombreArchivo = `606_${rncEmpresa}_${periodo}.txt`

    const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = nombreArchivo
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Años disponibles para el selector (año actual y 2 atrás)
  const aniosDisponibles = [hoy.getFullYear(), hoy.getFullYear() - 1, hoy.getFullYear() - 2]

  if (cargando) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando reporte...</p>
      </div>
    )
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg-primary)', position: 'relative', padding: '20px' }}>
      <div style={{ position: 'fixed', inset: 0, backgroundImage: 'var(--glow-verde), var(--glow-ambar)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ maxWidth: '900px', margin: '0 auto', position: 'relative', zIndex: 1 }}>

        {/* HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <button onClick={onVolver} style={btnVolver()}>← Volver</button>
          <ToggleTema tema={tema} setTema={setTema} />
        </div>

        {/* TÍTULO */}
        <div style={{
          background: esTropical ? `linear-gradient(135deg, ${AZUL.claro} 0%, #ffffff 100%)` : `linear-gradient(135deg, ${AZUL.c}25 0%, ${AZUL.c}10 100%)`,
          border: esTropical ? `1.5px solid ${AZUL.bg}` : `1px solid ${AZUL.c}55`,
          borderRadius: '18px', padding: '20px 24px', marginBottom: '20px',
          display: 'flex', alignItems: 'center', gap: '16px',
        }}>
          <div style={{ width: '52px', height: '52px', borderRadius: '14px', background: esTropical ? AZUL.c : `${AZUL.c}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>📊</div>
          <div>
            <div style={{ fontSize: '10px', color: esTropical ? AZUL.c : `${AZUL.c}CC`, letterSpacing: '1.5px', fontWeight: 600 }}>REPORTES FISCALES</div>
            <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? AZUL.dark : 'var(--color-text-primary)', lineHeight: 1.2 }}>Reporte 606 — Compras y Gastos</div>
            <div style={{ fontSize: '12px', color: esTropical ? AZUL.c : `${AZUL.c}CC`, marginTop: '4px', fontWeight: 500 }}>Para la DGII · {empresa?.nombre}</div>
          </div>
        </div>

        {/* SELECTOR DE MES */}
        <div style={{
          background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
          borderRadius: '14px', padding: '20px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)',
        }}>
          <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '12px' }}>
            📅 ¿DE QUÉ MES QUIERES EL REPORTE?
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <select value={mes} onChange={(e) => setMes(parseInt(e.target.value))} style={selectStyle()}>
              {MESES.map((nombre, idx) => (
                <option key={idx} value={idx + 1}>{nombre}</option>
              ))}
            </select>
            <select value={anio} onChange={(e) => setAnio(parseInt(e.target.value))} style={selectStyle()}>
              {aniosDisponibles.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* RESUMEN GRANDE Y SIMPLE */}
        <div style={{
          background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
          borderLeft: `4px solid ${AZUL.c}`,
          borderRadius: '14px', padding: '24px', marginBottom: '20px', boxShadow: 'var(--modulo-sombra)',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '4px' }}>
            {gastosValidos.length === 0
              ? `No hay gastos con comprobante fiscal en ${MESES[mes - 1]} ${anio}`
              : `Tienes ${gastosValidos.length} gasto${gastosValidos.length !== 1 ? 's' : ''} con comprobante fiscal en ${MESES[mes - 1]} ${anio}`}
          </div>
          {gastosValidos.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginTop: '16px' }}>
              <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: 'var(--color-text-primary)' }}>RD$ {totalMonto.toLocaleString('es-DO', { maximumFractionDigits: 0 })}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Monto total facturado</div>
              </div>
              <div style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', padding: '14px', textAlign: 'center' }}>
                <div style={{ fontSize: '24px', fontWeight: 700, color: esTropical ? '#04342C' : '#5DCAA5' }}>RD$ {totalITBIS.toLocaleString('es-DO', { maximumFractionDigits: 0 })}</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px' }}>ITBIS total</div>
              </div>
            </div>
          )}

          {/* BOTÓN GRANDE DE DESCARGA */}
          <button onClick={descargarTXT} disabled={gastosValidos.length === 0} style={{
            width: '100%', marginTop: '20px', padding: '16px',
            background: gastosValidos.length === 0 ? 'var(--color-bg-input)' : `linear-gradient(135deg, ${AZUL.c} 0%, ${AZUL.dark} 100%)`,
            border: 'none', borderRadius: '12px',
            color: gastosValidos.length === 0 ? 'var(--color-text-muted)' : 'white',
            fontSize: '15px', fontWeight: 700,
            cursor: gastosValidos.length === 0 ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit',
          }}>
            📥 Descargar reporte 606 para la DGII
          </button>

          {/* AVISO HONESTO DE QUÉ HACER */}
          {gastosValidos.length > 0 && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '12px', textAlign: 'center', lineHeight: 1.5 }}>
              💡 Después de descargar, sube este archivo en la Oficina Virtual de la DGII<br />
              (dgii.gov.do) <strong>antes del día 15</strong> del mes siguiente.
            </div>
          )}
        </div>

        {/* AVISO DE GASTOS SIN NCF */}
        {gastosSinNCF.length > 0 && (
          <div style={{
            background: esTropical ? '#FAF3E5' : 'rgba(186, 117, 23, 0.08)',
            border: '1px solid rgba(186, 117, 23, 0.3)', borderLeft: '4px solid #BA7517',
            borderRadius: '14px', padding: '18px 20px', marginBottom: '20px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 700, color: esTropical ? '#854F0B' : '#FAC775', marginBottom: '6px' }}>
              ⚠️ {gastosSinNCF.length} gasto{gastosSinNCF.length !== 1 ? 's' : ''} sin comprobante fiscal (NCF)
            </div>
            <div style={{ fontSize: '12px', color: esTropical ? '#633806' : 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '10px' }}>
              Estos gastos NO entran en el reporte 606 porque les falta el NCF o el RNC del proveedor.
              Si deberían reportarse, edítalos en el módulo de Gastos y agrégales esos datos.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {gastosSinNCF.map(g => (
                <div key={g.id} style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'flex', justifyContent: 'space-between', gap: '8px', padding: '6px 0', borderTop: '1px solid var(--color-border-subtle)' }}>
                  <span>{g.descripcion || 'Sin descripción'}</span>
                  <span style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>RD$ {num(g.total).toLocaleString('es-DO', { maximumFractionDigits: 0 })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TABLA DE LO QUE SÍ ENTRA */}
        {gastosValidos.length > 0 && (
          <div style={{
            background: 'var(--color-modulo-bg)', border: '1px solid var(--color-modulo-border)',
            borderRadius: '14px', padding: '20px', boxShadow: 'var(--modulo-sombra)',
          }}>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontWeight: 700, letterSpacing: '0.5px', marginBottom: '14px' }}>
              📋 GASTOS QUE SE VAN A REPORTAR ({gastosValidos.length})
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {gastosValidos.map(g => (
                <div key={g.id} style={{
                  background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
                  borderRadius: '10px', padding: '12px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', flexWrap: 'wrap',
                }}>
                  <div style={{ flex: 1, minWidth: '180px' }}>
                    <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                      {g.proveedor_nombre || g.descripcion || 'Sin nombre'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                      RNC: {g.rnc} · NCF: {(g.ncf || '').toUpperCase()} · {new Date(g.fecha + 'T00:00:00').toLocaleDateString('es-DO')}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                      RD$ {num(g.subtotal).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </div>
                    {num(g.itbis) > 0 && (
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        ITBIS: RD$ {num(g.itbis).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function ToggleTema({ tema, setTema }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '3px', gap: '2px' }}>
      <button onClick={() => setTema('oscuro')} style={tabTemaStyle(tema === 'oscuro')}>
        <span style={{ fontSize: '11px' }}>🌙</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
      </button>
      <button onClick={() => setTema('tropical')} style={tabTemaStyle(tema === 'tropical')}>
        <span style={{ fontSize: '11px' }}>☀️</span>
        <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
      </button>
    </div>
  )
}

function btnVolver() {
  return { background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '20px', padding: '8px 16px', color: 'var(--color-text-secondary)', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }
}

function tabTemaStyle(activo) {
  return { background: activo ? 'var(--gradient-toggle-active)' : 'transparent', border: 'none', borderRadius: '16px', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }
}

function selectStyle() {
  return {
    flex: 1, minWidth: '140px', padding: '12px 14px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '14px',
    fontFamily: 'inherit', outline: 'none', cursor: 'pointer',
  }
}

export default ReportesDGII