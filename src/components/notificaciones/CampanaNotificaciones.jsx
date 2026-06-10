import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function CampanaNotificaciones({ empresaId }) {
  const [notificaciones, setNotificaciones] = useState([])
  const [abierto, setAbierto] = useState(false)
  const [cargando, setCargando] = useState(false)
  const [tema, setTema] = useState('oscuro')

  const noLeidas = notificaciones.filter((n) => !n.leida).length

  // Detectar el tema actual (del atributo data-tema del documento)
  useEffect(() => {
    const detectar = () => {
      const t = document.documentElement.getAttribute('data-tema') || 'oscuro'
      setTema(t)
    }
    detectar()
    const obs = new MutationObserver(detectar)
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tema'] })
    return () => obs.disconnect()
  }, [])

  useEffect(() => {
    if (!empresaId) return
    cargarNotificaciones()
    const intervalo = setInterval(cargarNotificaciones, 60000)
    return () => clearInterval(intervalo)
  }, [empresaId])

  async function cargarNotificaciones() {
    const { data, error } = await supabase
      .from('notificaciones')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    if (!error && data) setNotificaciones(data)
  }

  async function marcarLeida(notifId) {
    await supabase.rpc('marcar_notificacion_leida', { p_notif_id: notifId })
    setNotificaciones((prev) => prev.map((n) => n.id === notifId ? { ...n, leida: true } : n))
  }

  async function marcarTodasLeidas() {
    setCargando(true)
    await supabase.rpc('marcar_todas_leidas')
    setNotificaciones((prev) => prev.map((n) => ({ ...n, leida: true })))
    setCargando(false)
  }

  // ─── COLORES SÓLIDOS SEGÚN TEMA ───
  const esClaro = tema === 'tropical'
  const C = {
    panelBg: esClaro ? '#FFFFFF' : '#16221C',
    panelBorde: esClaro ? '#E2E0D5' : '#2A3A2E',
    headerBorde: esClaro ? '#EFEDE3' : '#243029',
    textPrimary: esClaro ? '#1F2515' : '#EDF1DD',
    textSec: esClaro ? '#6B7280' : '#9DA889',
    textMuted: esClaro ? '#9CA3AF' : '#6B7560',
    acento: esClaro ? '#5A7302' : '#A3B556',
    itemNoLeido: esClaro ? '#F7F9F0' : '#1C2A22',
    itemHover: esClaro ? '#F0F3E8' : '#22332A',
    divisor: esClaro ? '#F0EEE4' : '#243029',
    botonCampanaBg: esClaro ? '#FFFFFF' : 'rgba(255,255,255,0.06)',
    botonCampanaBorde: esClaro ? '#E2E0D5' : 'rgba(255,255,255,0.12)',
  }

  function colorUrgencia(urgencia) {
    if (urgencia === 'urgente') return { bg: 'rgba(244,67,54,0.12)', border: 'rgba(244,67,54,0.4)', text: esClaro ? '#C0392B' : '#F4A0A0', label: 'URGENTE' }
    if (urgencia === 'importante') return { bg: 'rgba(217,164,65,0.15)', border: 'rgba(217,164,65,0.45)', text: esClaro ? '#9A6E00' : '#E8C97A', label: 'IMPORTANTE' }
    return { bg: 'rgba(74,140,220,0.12)', border: 'rgba(74,140,220,0.4)', text: esClaro ? '#2563A0' : '#9CC5F0', label: 'INFO' }
  }

  function tiempoRelativo(fecha) {
    const ahora = new Date()
    const f = new Date(fecha)
    const seg = Math.floor((ahora - f) / 1000)
    if (seg < 60) return 'hace un momento'
    const min = Math.floor(seg / 60)
    if (min < 60) return `hace ${min} min`
    const horas = Math.floor(min / 60)
    if (horas < 24) return `hace ${horas} h`
    const dias = Math.floor(horas / 24)
    if (dias === 1) return 'ayer'
    return `hace ${dias} días`
  }

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      {/* Campanita */}
      <button
        onClick={() => setAbierto(!abierto)}
        style={{
          position: 'relative',
          background: C.botonCampanaBg,
          border: `1px solid ${C.botonCampanaBorde}`,
          borderRadius: '12px',
          width: '42px', height: '42px',
          cursor: 'pointer', fontSize: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >
        🔔
        {noLeidas > 0 && (
          <span style={{
            position: 'absolute', top: '-5px', right: '-5px',
            background: '#F44336', color: 'white',
            fontSize: '10px', fontWeight: 700,
            minWidth: '18px', height: '18px', borderRadius: '9px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '0 4px', border: `2px solid ${esClaro ? '#FFFFFF' : '#0a1410'}`,
          }}>
            {noLeidas > 9 ? '9+' : noLeidas}
          </span>
        )}
      </button>

      {/* Panel */}
      {abierto && (
        <>
          <div onClick={() => setAbierto(false)} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
          <div style={{
            position: 'absolute', top: '50px', right: 0,
            width: '340px', maxWidth: '90vw', maxHeight: '70vh',
            background: C.panelBg,
            border: `1px solid ${C.panelBorde}`,
            borderRadius: '16px',
            boxShadow: esClaro ? '0 20px 50px rgba(0,0,0,0.18)' : '0 20px 60px rgba(0,0,0,0.6)',
            zIndex: 9999,
            display: 'flex', flexDirection: 'column', overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px', borderBottom: `1px solid ${C.headerBorde}`, background: C.panelBg }}>
              <p style={{ margin: 0, fontSize: '15px', fontWeight: 600, color: C.textPrimary }}>
                Notificaciones {noLeidas > 0 ? `(${noLeidas})` : ''}
              </p>
              {noLeidas > 0 && (
                <button onClick={marcarTodasLeidas} disabled={cargando} style={{ background: 'transparent', border: 'none', color: C.acento, fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Marcar todas
                </button>
              )}
            </div>

            {/* Lista */}
            <div style={{ overflowY: 'auto', flex: 1, background: C.panelBg }}>
              {notificaciones.length === 0 ? (
                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                  <p style={{ margin: 0, fontSize: '28px', marginBottom: '8px' }}>🔕</p>
                  <p style={{ margin: 0, fontSize: '13px', color: C.textMuted }}>No tienes notificaciones</p>
                </div>
              ) : (
                notificaciones.map((n) => {
                  const c = colorUrgencia(n.urgencia)
                  return (
                    <div
                      key={n.id}
                      onClick={() => !n.leida && marcarLeida(n.id)}
                      style={{
                        padding: '14px 16px',
                        borderBottom: `1px solid ${C.divisor}`,
                        background: n.leida ? C.panelBg : C.itemNoLeido,
                        cursor: n.leida ? 'default' : 'pointer',
                        position: 'relative',
                      }}
                    >
                      {!n.leida && (
                        <span style={{ position: 'absolute', left: '6px', top: '20px', width: '6px', height: '6px', borderRadius: '50%', background: '#F44336' }} />
                      )}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', paddingLeft: '8px' }}>
                        <span style={{ fontSize: '8px', fontWeight: 700, letterSpacing: '0.5px', color: c.text, background: c.bg, border: `1px solid ${c.border}`, padding: '2px 6px', borderRadius: '5px' }}>
                          {c.label}
                        </span>
                        <span style={{ fontSize: '11px', color: C.textMuted }}>{tiempoRelativo(n.created_at)}</span>
                      </div>
                      <p style={{ margin: '0 0 3px', fontSize: '13px', fontWeight: 600, color: C.textPrimary, paddingLeft: '8px' }}>{n.titulo}</p>
                      <p style={{ margin: 0, fontSize: '12px', color: C.textSec, lineHeight: 1.5, paddingLeft: '8px' }}>{n.mensaje}</p>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default CampanaNotificaciones