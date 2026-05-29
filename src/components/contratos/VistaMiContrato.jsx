import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import VistaDetalleContrato from './VistaDetalleContrato'

const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }
const VERDE = { c: '#1D9E75', claro: '#D7F0DD', dark: '#04342C' }
const AMBAR = { c: '#EF9F27', claro: '#FAEEDA', dark: '#633806' }
const NARANJA = { c: '#D85A30', claro: '#FCE9DA', dark: '#7A2F12' }
const MORADO = { c: '#7F77DD', claro: '#EEEDFE', dark: '#3C3489' }
const GRIS = { c: '#888780', claro: '#EDECE7', dark: '#3A3936' }

function VistaMiContrato({ usuario, empresaId, onVolver }) {
  const [contrato, setContrato] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [vistaCompleta, setVistaCompleta] = useState(false)

  const [tema, setTema] = useState(() => {
    if (typeof document === 'undefined') return 'oscuro'
    return localStorage.getItem('cocina_pae_tema') || 'oscuro'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const esTropical = tema === 'tropical'

  useEffect(() => { if (usuario?.id && empresaId) cargarMiContrato() }, [usuario, empresaId])

  async function cargarMiContrato() {
    setCargando(true)
    const { data, error } = await supabase.from('contratos_empleados')
      .select(`*, usuario:usuarios(id, nombre, rol, sexo, foto_url, cedula)`)
      .eq('empresa_id', empresaId).eq('usuario_id', usuario.id)
      .order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (error) console.error('Error cargando contrato:', error)
    else setContrato(data)
    setCargando(false)
  }

  function obtenerLabelTipo(tipo) {
    if (tipo === 'obra_servicio') return '📑 Obra/Servicio PAE'
    if (tipo === 'estacional') return '🌾 Estacional'
    if (tipo === 'indefinido') return '♾️ Indefinido'
    return tipo
  }
  function obtenerLabelFrecuencia(freq) {
    return { semanal: 'semanal', quincenal: 'quincenal', mensual: 'mensual' }[freq] || freq
  }
  function formatearFecha(fechaStr) {
    if (!fechaStr) return '—'
    return new Date(fechaStr + 'T00:00:00').toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })
  }
  function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return '—'
    return new Date(fechaStr).toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (vistaCompleta && contrato) {
    return <VistaDetalleContrato contratoId={contrato.id} onVolver={() => setVistaCompleta(false)} />
  }

  if (cargando) {
    return (
      <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '20px' }}>
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>⏳ Cargando tu contrato...</div>
      </div>
    )
  }

  const fechaHoyTexto = new Date().toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <div style={{ width: '100%', maxWidth: '760px', margin: '0 auto', padding: '20px' }}>
      
      {/* TOGGLE DE TEMA */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '12px' }}>
        <div style={{
          display: 'inline-flex',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '20px',
          padding: '3px',
          gap: '2px',
        }}>
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

      {/* HEADER */}
      <div style={{
        background: 'linear-gradient(135deg, #378ADD 0%, #0C447C 100%)',
        borderRadius: '16px', padding: '24px', marginBottom: '24px', color: 'white',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <p style={{ fontSize: '11px', fontWeight: 600, letterSpacing: '1px', opacity: 0.85, margin: 0 }}>CONTRATO LABORAL</p>
            <h2 style={{ fontSize: '28px', fontWeight: 700, margin: '4px 0' }}>📄 Mi Contrato</h2>
            <p style={{ fontSize: '13px', opacity: 0.85, margin: 0 }}>{usuario.nombre} · {fechaHoyTexto}</p>
          </div>
          <button onClick={onVolver}
            style={{
              background: 'rgba(0,0,0,0.25)', color: 'white', border: 'none',
              borderRadius: '10px', padding: '10px 16px', fontSize: '13px', fontWeight: 600,
              cursor: 'pointer', fontFamily: 'inherit',
            }}>← Volver</button>
        </div>
      </div>

      {/* CASO 1: NO TIENE CONTRATO */}
      {!contrato && (
        <div style={{ ...tarjetaStyle(), padding: '40px', textAlign: 'center' }}>
          <p style={{ fontSize: '52px', marginBottom: '16px' }}>📋</p>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '12px' }}>
            No tienes contrato gestionado en la app
          </h3>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '480px', margin: '0 auto 16px' }}>
            Tu contrato laboral puede estar siendo manejado por fuera de esta aplicación.
          </p>
          <p style={{
            fontSize: '13px', display: 'inline-block', maxWidth: '480px',
            background: esTropical ? AZUL.claro : `${AZUL.c}15`,
            border: `1px solid ${AZUL.c}40`, borderRadius: '10px',
            padding: '14px', color: esTropical ? AZUL.dark : '#A9CFF2',
          }}>
            💡 Si tienes alguna pregunta sobre tu contrato, salario o condiciones laborales, consulta directamente con la administración de la empresa.
          </p>
        </div>
      )}

      {/* CASO 2: BORRADOR */}
      {contrato && contrato.estado === 'borrador' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <BannerEstado color={AMBAR} esTropical={esTropical} emoji="📝" titulo="Tu contrato está en preparación"
            descripcion="El empleador está preparando tu contrato laboral. Pronto te llamará para firmarlo presencialmente." />

          <div style={tarjetaStyle()}>
            <p style={labelStyle()}>📋 INFORMACIÓN PRELIMINAR</p>
            <FilasInfo contrato={contrato} obtenerLabelTipo={obtenerLabelTipo} obtenerLabelFrecuencia={obtenerLabelFrecuencia} formatearFecha={formatearFecha} />
            <div style={{ marginTop: '16px' }}>
              <button onClick={() => setVistaCompleta(true)} style={botonAccionStyle(AZUL)}>👁️ Ver detalles completos</button>
            </div>
          </div>
        </div>
      )}

      {/* CASO 3: PENDIENTE DE FIRMA */}
      {contrato && contrato.estado === 'pendiente_firma' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: esTropical ? NARANJA.claro : `${NARANJA.c}15`,
            border: `2px solid ${NARANJA.c}50`, borderRadius: '16px', padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>⏳</span>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '17px', color: esTropical ? NARANJA.dark : '#F2B89E', margin: 0 }}>
                  Tu contrato está pendiente de firma
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '8px 0 0' }}>
                  Acércate a tu empleador para completar la firma presencial del contrato. El proceso es rápido: ambos firman digitalmente en la app y luego se imprime una copia para tus archivos.
                </p>
                {contrato.firma_propietario_at && !contrato.firma_empleado_at && (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '12px', background: 'var(--color-bg-elevated)', padding: '8px', borderRadius: '6px' }}>
                    ✅ El empleador ya firmó · ⏳ Falta tu firma
                  </p>
                )}
                {!contrato.firma_propietario_at && contrato.firma_empleado_at && (
                  <p style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '12px', background: 'var(--color-bg-elevated)', padding: '8px', borderRadius: '6px' }}>
                    ✅ Tú ya firmaste · ⏳ Falta firma del empleador
                  </p>
                )}
              </div>
            </div>
          </div>

          <div style={tarjetaStyle()}>
            <p style={labelStyle()}>📋 RESUMEN DEL CONTRATO</p>
            <FilasInfo contrato={contrato} obtenerLabelTipo={obtenerLabelTipo} obtenerLabelFrecuencia={obtenerLabelFrecuencia} formatearFecha={formatearFecha} simple />
            <div style={{ marginTop: '16px' }}>
              <button onClick={() => setVistaCompleta(true)} style={botonAccionStyle(AZUL)}>👁️ Ver contrato completo</button>
            </div>
          </div>
        </div>
      )}

      {/* CASO 4: ACTIVO */}
      {contrato && contrato.estado === 'activo' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{
            background: esTropical ? VERDE.claro : `${VERDE.c}15`,
            border: `2px solid ${VERDE.c}50`, borderRadius: '16px', padding: '20px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
              <span style={{ fontSize: '28px' }}>🟢</span>
              <div style={{ flex: 1 }}>
                <h3 style={{ fontWeight: 700, fontSize: '17px', color: esTropical ? VERDE.dark : '#A8E0BD', margin: 0 }}>
                  Tu contrato está activo
                </h3>
                <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>
                  Tu contrato laboral está firmado por ambas partes y vigente.
                </p>
                {contrato.firma_empleado_at && (
                  <p style={{ fontSize: '11px', color: VERDE.c, marginTop: '8px', fontWeight: 600 }}>
                    ✅ Firmado el {formatearFechaCorta(contrato.firma_empleado_at)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div style={tarjetaStyle()}>
            <p style={labelStyle()}>📋 DETALLES DE TU CONTRATO</p>
            <FilasInfo contrato={contrato} obtenerLabelTipo={obtenerLabelTipo} obtenerLabelFrecuencia={obtenerLabelFrecuencia} formatearFecha={formatearFecha} completo />
            <div style={{ marginTop: '20px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button onClick={() => setVistaCompleta(true)} style={botonAccionStyle(MORADO)}>📄 Ver contrato completo</button>
              <button onClick={() => setVistaCompleta(true)} style={botonAccionStyle(AZUL)}>🖨️ Imprimir mi copia</button>
            </div>
          </div>

          <div style={{
            background: esTropical ? AZUL.claro : `${AZUL.c}12`,
            border: `1px solid ${AZUL.c}40`, borderRadius: '12px',
            padding: '14px', fontSize: '13px', color: esTropical ? AZUL.dark : '#A9CFF2',
          }}>
            <p style={{ fontWeight: 700, marginBottom: '6px' }}>💡 Información importante:</p>
            <ul style={{ paddingLeft: '20px', margin: 0, display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <li>Puedes consultar tu contrato en cualquier momento desde aquí.</li>
              <li>Si necesitas una copia física, usa el botón "Imprimir mi copia".</li>
              <li>Si tienes dudas sobre el contenido, consulta con la administración.</li>
            </ul>
          </div>
        </div>
      )}

      {/* CASO 5: TERMINADO */}
      {contrato && contrato.estado === 'terminado' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <BannerEstado color={GRIS} esTropical={esTropical} emoji="⚪" titulo="Tu contrato anterior está terminado"
            descripcion="Este contrato concluyó. Tu historial laboral se conserva para referencia." />

          <div style={tarjetaStyle()}>
            <p style={labelStyle()}>📋 ÚLTIMO CONTRATO</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <FilaInfo label="Puesto:" valor={contrato.puesto} />
              <FilaInfo label="Período:" valor={`${formatearFecha(contrato.fecha_inicio)}${contrato.fecha_fin ? ` → ${formatearFecha(contrato.fecha_fin)}` : ''}`} />
            </div>
            <div style={{ marginTop: '16px' }}>
              <button onClick={() => setVistaCompleta(true)} style={botonAccionStyle(GRIS)}>📄 Ver contrato completo</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function BannerEstado({ color, esTropical, emoji, titulo, descripcion }) {
  return (
    <div style={{
      background: esTropical ? color.claro : `${color.c}15`,
      border: `2px solid ${color.c}50`, borderRadius: '16px', padding: '20px',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
        <span style={{ fontSize: '28px' }}>{emoji}</span>
        <div>
          <h3 style={{ fontWeight: 700, fontSize: '17px', color: esTropical ? color.dark : 'var(--color-text-primary)', margin: 0 }}>
            {titulo}
          </h3>
          <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '4px 0 0' }}>{descripcion}</p>
        </div>
      </div>
    </div>
  )
}

function FilaInfo({ label, valor }) {
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', gap: '12px',
      borderBottom: '1px solid var(--color-border-subtle)', paddingBottom: '8px',
    }}>
      <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>{label}</span>
      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)', textAlign: 'right' }}>{valor}</span>
    </div>
  )
}

function FilasInfo({ contrato, obtenerLabelTipo, obtenerLabelFrecuencia, formatearFecha, simple, completo }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
      <FilaInfo label={simple ? "Tipo:" : "Tipo de contrato:"} valor={obtenerLabelTipo(contrato.tipo_contrato)} />
      <FilaInfo label="Puesto:" valor={contrato.puesto} />
      {completo && contrato.año_escolar_inabie && (
        <FilaInfo label="Año escolar:" valor={contrato.año_escolar_inabie} />
      )}
      <FilaInfo label={completo ? "Salario neto:" : "Salario:"} valor={
        <span style={{ color: '#1D9E75' }}>RD$ {Number(contrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })} {obtenerLabelFrecuencia(contrato.frecuencia_pago)}</span>
      } />
      {completo && contrato.salario_bruto && (
        <FilaInfo label="Salario bruto:" valor={
          <span style={{ color: '#378ADD' }}>RD$ {Number(contrato.salario_bruto).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
        } />
      )}
      {!simple && (
        <>
          <FilaInfo label="Fecha inicio:" valor={formatearFecha(contrato.fecha_inicio)} />
          {contrato.fecha_fin && <FilaInfo label="Fecha fin:" valor={formatearFecha(contrato.fecha_fin)} />}
        </>
      )}
      {completo && contrato.horario_trabajo && <FilaInfo label="Horario:" valor={contrato.horario_trabajo} />}
      {completo && contrato.dias_laborales && <FilaInfo label="Días laborales:" valor={contrato.dias_laborales} />}
      {completo && contrato.lugar_trabajo && <FilaInfo label="Lugar de trabajo:" valor={contrato.lugar_trabajo} />}
    </div>
  )
}

function tabTemaStyle(activo) {
  return {
    background: activo ? 'var(--gradient-toggle-active)' : 'transparent',
    border: 'none', borderRadius: '16px', padding: '6px 10px',
    display: 'flex', alignItems: 'center', gap: '5px',
    cursor: 'pointer', fontFamily: 'inherit',
  }
}

function tarjetaStyle() {
  return {
    background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '16px', padding: '24px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
  }
}

function labelStyle() {
  return { fontSize: '11px', fontWeight: 700, color: 'var(--color-text-muted)', letterSpacing: '0.5px', marginBottom: '14px' }
}

function botonAccionStyle(color) {
  return {
    background: `linear-gradient(135deg, ${color.c} 0%, ${color.dark} 100%)`,
    color: 'white', border: 'none', borderRadius: '10px',
    padding: '10px 16px', fontSize: '13px', fontWeight: 700,
    cursor: 'pointer', fontFamily: 'inherit',
    display: 'inline-flex', alignItems: 'center', gap: '8px',
  }
}

export default VistaMiContrato