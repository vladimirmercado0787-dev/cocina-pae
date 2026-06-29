// piezas.jsx — Sistema de piezas reutilizables de Cocina PAE
// Usan tus variables de tema (oscuro/tropical) de index.css, sin Tailwind.
// Objetivo: pantallas limpias, fáciles, y sin repetir estilos por todos lados.
//
// Exporta: Boton, TarjetaModulo, SeccionCategoria
//   import { Boton, TarjetaModulo, SeccionCategoria } from '../../ui/piezas'

import { useState } from 'react'

/* ---------- BOTÓN ---------- */
// variante: 'primario' | 'secundario' | 'fantasma'
export function Boton({ children, onClick, variante = 'primario', icono, ancho = false, disabled = false }) {
  const base = {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
    border: 'none', borderRadius: '14px', padding: '16px 22px',
    fontSize: '17px', fontWeight: 700, cursor: disabled ? 'default' : 'pointer',
    fontFamily: 'inherit', width: ancho ? '100%' : 'auto',
    opacity: disabled ? 0.55 : 1, transition: 'transform .12s ease, filter .15s ease',
  }
  const estilos = {
    primario: { background: 'var(--gradient-button)', color: '#fff' },
    secundario: { background: 'var(--color-bg-elevated)', color: 'var(--color-text-primary)', border: '1.5px solid var(--color-border-strong)' },
    fantasma: { background: 'transparent', color: 'var(--color-text-accent)' },
  }
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{ ...base, ...estilos[variante] }}
      onMouseDown={e => { if (!disabled) e.currentTarget.style.transform = 'scale(.97)' }}
      onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
    >
      {icono && <span style={{ fontSize: '20px', lineHeight: 1 }}>{icono}</span>}
      {children}
    </button>
  )
}

/* ---------- TARJETA DE MÓDULO ---------- */
// Tarjeta grande, clara, con color de categoría. icono = emoji.
export function TarjetaModulo({ icono, label, sublabel, color = '#1D9E75', onClick }) {
  const [hover, setHover] = useState(false)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '14px',
        textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
        background: 'var(--color-bg-card)',
        border: '1.5px solid ' + (hover ? color : 'var(--color-border-subtle)'),
        borderLeft: '4px solid ' + color,
        borderRadius: '18px', padding: '18px', minHeight: '118px',
        transform: hover ? 'translateY(-3px)' : 'translateY(0)',
        transition: 'transform .14s ease, border-color .14s ease',
      }}
    >
      <span style={{
        width: '50px', height: '50px', borderRadius: '14px',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '27px', background: color + '24',
      }}>{icono}</span>
      <span>
        <span style={{ display: 'block', fontSize: '17px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{label}</span>
        {sublabel && <span style={{ display: 'block', fontSize: '13px', color: 'var(--color-text-muted)', marginTop: '2px' }}>{sublabel}</span>}
      </span>
    </button>
  )
}

/* ---------- SECCIÓN DE CATEGORÍA (PLEGABLE) ---------- */
// Cabecera con color + título; se abre/cierra. Esto es lo que quita el reguero:
// el inicio muestra las categorías cerradas, y abres solo la que necesitas.
export function SeccionCategoria({ label, sublabel, color = '#1D9E75', abiertaInicial = false, children }) {
  const [abierta, setAbierta] = useState(abiertaInicial)
  return (
    <div style={{ marginBottom: '14px' }}>
      <button
        onClick={() => setAbierta(a => !a)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', gap: '13px',
          background: 'var(--color-bg-elevated)', border: '1.5px solid var(--color-border-subtle)',
          borderRadius: '16px', padding: '15px 16px', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
        }}
      >
        <span style={{ width: '12px', height: '12px', borderRadius: '4px', background: color, flex: '0 0 auto' }} />
        <span style={{ flex: 1 }}>
          <span style={{ display: 'block', fontSize: '16px', fontWeight: 700, color: 'var(--color-text-primary)' }}>{label}</span>
          {sublabel && <span style={{ display: 'block', fontSize: '12.5px', color: 'var(--color-text-muted)', marginTop: '1px' }}>{sublabel}</span>}
        </span>
        <span style={{
          fontSize: '20px', color: 'var(--color-text-muted)',
          transform: abierta ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform .18s ease',
        }}>›</span>
      </button>
      {abierta && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
          gap: '12px', marginTop: '12px', padding: '0 2px',
        }}>
          {children}
        </div>
      )}
    </div>
  )
}