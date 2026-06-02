// src/components/ingredientes/ModalListaGenerada.jsx
import { useState, useEffect } from 'react'
import { formatearListaWhatsApp, formatearRD } from '../../utils/calculosCompras'

export default function ModalListaGenerada({ datos, onCerrar }) {
  const [copiado, setCopiado] = useState(false)
  const { items, agrupado, empresa } = datos

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const fechaHoy = new Date().toLocaleDateString('es-DO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  })

  async function copiarLista() {
    const texto = formatearListaWhatsApp(agrupado, empresa)
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch (err) {
      alert('Error al copiar. Intenta seleccionar y copiar manualmente.')
    }
  }

  function enviarWhatsApp(telefono = null) {
    const texto = formatearListaWhatsApp(agrupado, empresa)
    const textoCodificado = encodeURIComponent(texto)
    let url
    if (telefono) {
      const tel = telefono.replace(/\D/g, '')
      const telConCodigo = tel.startsWith('1') ? tel : `1${tel}`
      url = `https://wa.me/${telConCodigo}?text=${textoCodificado}`
    } else {
      url = `https://wa.me/?text=${textoCodificado}`
    }
    window.open(url, '_blank')
  }

  function imprimirLista() { window.print() }

  return (
    <div className="modal-lista-generada" style={{
      position: 'fixed', inset: 0, zIndex: 90,
      background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'flex-start', justifyContent: 'center',
      padding: '20px', overflowY: 'auto',
    }}>
      <div className="modal-lista-contenido" style={{
        background: 'var(--color-bg-primary)',
        border: '1px solid var(--color-border-accent)',
        borderRadius: '16px',
        maxWidth: '820px', width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
        display: 'flex', flexDirection: 'column',
        maxHeight: '95vh', overflow: 'hidden',
      }}>

        {/* HEADER (no se imprime) */}
        <div className="no-print" style={{
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
            }}>📋</div>
            <div>
              <div style={{ fontSize: '10px', color: '#1D9E75', letterSpacing: '1.5px', fontWeight: 600 }}>
                LISTA GENERADA
              </div>
              <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
                Lista de Compras
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                {items.length} ingrediente{items.length > 1 ? 's' : ''} · {agrupado.grupos.length} proveedor{agrupado.grupos.length > 1 ? 'es' : ''}
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
            <button onClick={onCerrar} style={{
              background: 'var(--color-bg-elevated)',
              border: '1px solid var(--color-border-subtle)',
              borderRadius: '20px', padding: '7px 14px',
              color: 'var(--color-text-secondary)', fontSize: '12px',
              cursor: 'pointer', fontFamily: 'inherit',
            }}>✖ Cerrar</button>
          </div>
        </div>

        {/* BODY - contenido imprimible */}
        <div className="contenido-imprimible" style={{
          flex: 1, overflowY: 'auto', padding: '20px 24px',
          display: 'flex', flexDirection: 'column', gap: '20px',
        }}>

          {/* Encabezado para impresión (solo visible al imprimir) */}
          <div className="solo-print" style={{
            display: 'none',
            paddingBottom: '16px', marginBottom: '8px',
            borderBottom: '2px solid #333',
          }}>
            <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#000', margin: 0 }}>
              🛒 LISTA DE COMPRAS
            </h1>
            <div style={{ marginTop: '8px', color: '#333' }}>
              <div style={{ fontSize: '15px', fontWeight: 600 }}>{empresa?.nombre || 'Cocina PAE'}</div>
              <div style={{ fontSize: '12px', textTransform: 'capitalize' }}>{fechaHoy}</div>
            </div>
          </div>

          {/* Resumen económico */}
          <div style={{
            background: 'var(--color-modulo-bg)',
            border: '1px solid var(--color-modulo-border)',
            borderLeft: '4px solid #1D9E75',
            borderRadius: '14px', padding: '18px',
            boxShadow: 'var(--modulo-sombra)',
          }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
              gap: '14px', textAlign: 'center',
            }}>
              <div>
                <div className="no-print" style={{ fontSize: '24px', marginBottom: '4px' }}>📦</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1D9E75' }}>{items.length}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginTop: '4px' }}>
                  INGREDIENTES
                </div>
              </div>
              <div>
                <div className="no-print" style={{ fontSize: '24px', marginBottom: '4px' }}>🏪</div>
                <div style={{ fontSize: '24px', fontWeight: 700, color: '#1D9E75' }}>{agrupado.grupos.length}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginTop: '4px' }}>
                  PROVEEDORES
                </div>
              </div>
              <div>
                <div className="no-print" style={{ fontSize: '24px', marginBottom: '4px' }}>💰</div>
                <div style={{ fontSize: '16px', fontWeight: 700, color: '#378ADD', lineHeight: 1.2 }}>
                  {agrupado.totalGeneralFormateado}
                </div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', fontWeight: 600, letterSpacing: '0.5px', marginTop: '4px' }}>
                  INVERSIÓN TOTAL
                </div>
              </div>
            </div>
          </div>

          {/* Grupos por proveedor */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {agrupado.grupos.map(grupo => (
              <GrupoProveedor
                key={grupo.id} grupo={grupo}
                onEnviarWhatsApp={() => enviarWhatsApp(grupo.telefono)}
              />
            ))}
          </div>

          {/* Pie de página para impresión */}
          <div className="solo-print" style={{
            display: 'none',
            marginTop: '16px', paddingTop: '12px',
            borderTop: '2px solid #333',
            textAlign: 'center', fontSize: '10px', color: '#666',
          }}>
            Generado por Cocina PAE 🇩🇴 · Sistema de Gestión Profesional
          </div>
        </div>

        {/* FOOTER de acciones (no se imprime) */}
        <div className="no-print" style={{
          padding: '14px 20px',
          borderTop: '1px solid var(--color-border-subtle)',
          background: 'var(--color-bg-elevated)',
          display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'flex-end',
        }}>
          <button onClick={copiarLista} style={{
            padding: '10px 16px',
            background: copiado ? 'rgba(29, 158, 117, 0.18)' : 'var(--color-bg-input)',
            border: copiado ? '1px solid rgba(29, 158, 117, 0.5)' : '1px solid var(--color-border-subtle)',
            borderRadius: '10px',
            color: copiado ? '#1D9E75' : 'var(--color-text-secondary)',
            fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>
            {copiado ? '✅ Copiado' : '📋 Copiar'}
          </button>

          <button onClick={() => enviarWhatsApp()} style={{
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            border: 'none', borderRadius: '10px',
            color: 'white', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>📱 WhatsApp</button>

          <button onClick={imprimirLista} style={{
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #378ADD 0%, #1F5FA8 100%)',
            border: 'none', borderRadius: '10px',
            color: 'white', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            display: 'flex', alignItems: 'center', gap: '6px',
          }}>🖨️ Imprimir</button>

          <button onClick={onCerrar} style={{
            padding: '10px 16px',
            background: 'var(--color-bg-input)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '10px',
            color: 'var(--color-text-secondary)',
            fontSize: '12px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>Cerrar</button>
        </div>
      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          @page { margin: 1cm; size: letter; }
          body * { visibility: hidden; }
          .modal-lista-generada,
          .modal-lista-generada * { visibility: visible; }
          .modal-lista-generada {
            position: absolute !important;
            inset: 0 !important;
            background: white !important;
            padding: 0 !important;
            overflow: visible !important;
          }
          .modal-lista-generada .modal-lista-contenido {
            background: white !important;
            border: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            max-width: 100% !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .no-print { display: none !important; }
          .solo-print { display: block !important; }
          .contenido-imprimible { color: #000 !important; }
          .contenido-imprimible * {
            color: #000 !important;
            background: white !important;
            border-color: #ccc !important;
            box-shadow: none !important;
          }
        }
      `}</style>
    </div>
  )
}

// ─── SUB-COMPONENTE: Grupo por proveedor ───
function GrupoProveedor({ grupo, onEnviarWhatsApp }) {
  const esSinProveedor = !grupo.tieneProveedor
  const colorAcento = esSinProveedor ? '250, 199, 117' : '29, 158, 117'

  return (
    <div style={{
      background: 'var(--color-modulo-bg)',
      border: `1px solid rgba(${colorAcento}, 0.35)`,
      borderLeft: `4px solid rgb(${colorAcento})`,
      borderRadius: '14px', overflow: 'hidden',
      boxShadow: 'var(--modulo-sombra)',
    }}>
      {/* Header del proveedor */}
      <div style={{
        padding: '14px 18px',
        background: `rgba(${colorAcento}, 0.12)`,
        borderBottom: '1px solid var(--color-modulo-border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: '15px', fontWeight: 700,
            color: `rgb(${colorAcento})`,
            textTransform: 'uppercase', letterSpacing: '0.5px',
          }}>
            {esSinProveedor ? '⚠️ ' : '🏪 '}{grupo.nombre}
          </div>
          {grupo.telefono && (
            <div style={{ fontSize: '11px', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
              📞 {grupo.telefono}
            </div>
          )}
          {esSinProveedor && (
            <div style={{ fontSize: '10px', color: '#FAC775', marginTop: '4px' }}>
              Asigna un proveedor a estos ingredientes para futuras compras
            </div>
          )}
        </div>

        {!esSinProveedor && grupo.telefono && (
          <button onClick={onEnviarWhatsApp} className="no-print" style={{
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #25D366 0%, #128C7E 100%)',
            border: 'none', borderRadius: '8px',
            color: 'white', fontSize: '11px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}>📱 WhatsApp</button>
        )}
      </div>

      {/* Items */}
      <div>
        {grupo.items.map((item, idx) => (
          <div key={item.id} style={{
            padding: '10px 18px',
            borderBottom: idx === grupo.items.length - 1 ? 'none' : '1px solid var(--color-border-subtle)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '12px',
          }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                • {item.nombre}
              </div>
              {item.urgencia === 'urgente' && (
                <div className="no-print" style={{ fontSize: '10px', color: '#F4C0D1', fontWeight: 600, marginTop: '2px' }}>
                  🚨 Urgente · Quedan {item.diasCocinaRestantes} días
                </div>
              )}
            </div>

            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ fontSize: '13px', fontWeight: 700, color: 'var(--color-text-primary)' }}>
                {item.cantidadSugerida} {item.unidadStock}
              </div>
              {item.costoEstimado > 0 && (
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
                  ≈ {formatearRD(item.costoEstimado)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Subtotal */}
      {grupo.totalCosto > 0 && (
        <div style={{
          padding: '12px 18px',
          background: `rgba(${colorAcento}, 0.10)`,
          borderTop: `1px solid rgba(${colorAcento}, 0.25)`,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>Subtotal:</span>
          <span style={{ fontSize: '15px', fontWeight: 700, color: `rgb(${colorAcento})` }}>
            {grupo.totalCostoFormateado}
          </span>
        </div>
      )}
    </div>
  )
}