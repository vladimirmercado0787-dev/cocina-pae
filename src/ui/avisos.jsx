// avisos.jsx — Avisos bonitos para reemplazar los alert() y confirm() feos.
// Usan tus variables de tema (oscuro/tropical). Archivo nuevo: no rompe nada.
//
//   import { ModalAviso, ModalConfirmar } from '../../ui/avisos'
//
// USO (ejemplos):
//   const [aviso, setAviso] = useState(null)
//   ...  setAviso({ tipo: 'exito', mensaje: 'Entrega registrada' })
//   {aviso && <ModalAviso {...aviso} onCerrar={() => setAviso(null)} />}
//
//   const [confirmar, setConfirmar] = useState(null)
//   ...  setConfirmar({ mensaje: '¿Cerrar sesión?', onConfirmar: cerrar })
//   {confirmar && <ModalConfirmar {...confirmar} onCancelar={() => setConfirmar(null)} />}

const TIPOS = {
  info:        { color: '#378ADD', emoji: '💬' },
  exito:       { color: '#1D9E75', emoji: '✅' },
  advertencia: { color: '#EF9F27', emoji: '⚠️' },
  error:       { color: '#E5484D', emoji: '⛔' },
}

function Capa({ children }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
    }}>
      {children}
    </div>
  )
}

function Tarjeta({ children }) {
  return (
    <div style={{
      background: 'var(--color-bg-elevated)',
      border: '1.5px solid var(--color-border-subtle)',
      borderRadius: '22px', padding: '28px 24px',
      width: '100%', maxWidth: '380px', textAlign: 'center',
      boxShadow: '0 24px 70px -20px rgba(0,0,0,0.7)',
    }}>
      {children}
    </div>
  )
}

function Circulo({ color, emoji }) {
  return (
    <div style={{
      width: '60px', height: '60px', borderRadius: '50%',
      background: color + '22', margin: '0 auto 16px',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px',
    }}>{emoji}</div>
  )
}

/* ---------- AVISO (reemplaza alert) ---------- */
export function ModalAviso({ mensaje, titulo, tipo = 'info', textoBoton = 'Entendido', onCerrar }) {
  const t = TIPOS[tipo] || TIPOS.info
  return (
    <Capa>
      <Tarjeta>
        <Circulo color={t.color} emoji={t.emoji} />
        {titulo && <div style={{ fontSize: '19px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>{titulo}</div>}
        <div style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '22px' }}>{mensaje}</div>
        <button onClick={onCerrar} style={{
          width: '100%', border: 'none', borderRadius: '14px', padding: '15px',
          background: 'var(--gradient-button)', color: '#fff',
          fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>{textoBoton}</button>
      </Tarjeta>
    </Capa>
  )
}

/* ---------- CONFIRMAR (reemplaza window.confirm) ---------- */
export function ModalConfirmar({
  mensaje, titulo, peligro = false,
  textoConfirmar = 'Sí', textoCancelar = 'Cancelar',
  onConfirmar, onCancelar,
}) {
  const color = peligro ? '#E5484D' : '#1D9E75'
  return (
    <Capa>
      <Tarjeta>
        <Circulo color={color} emoji={peligro ? '⚠️' : '❓'} />
        {titulo && <div style={{ fontSize: '19px', fontWeight: 700, color: 'var(--color-text-primary)', marginBottom: '6px' }}>{titulo}</div>}
        <div style={{ fontSize: '15px', color: 'var(--color-text-secondary)', lineHeight: 1.5, marginBottom: '22px' }}>{mensaje}</div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={onCancelar} style={{
            flex: 1, borderRadius: '14px', padding: '15px',
            background: 'var(--color-bg-input)', color: 'var(--color-text-primary)',
            border: '1.5px solid var(--color-border-strong)',
            fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>{textoCancelar}</button>
          <button onClick={() => { if (onConfirmar) onConfirmar(); if (onCancelar) onCancelar() }} style={{
            flex: 1, border: 'none', borderRadius: '14px', padding: '15px',
            background: color, color: '#fff',
            fontSize: '16px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
          }}>{textoConfirmar}</button>
        </div>
      </Tarjeta>
    </Capa>
  )
}