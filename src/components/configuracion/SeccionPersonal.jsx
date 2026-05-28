import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const ROLES = [
  { id: 'propietario',    emoji: '👑', label: 'Propietario' },
  { id: 'administrador',  emoji: '💼', label: 'Administrador' },
  { id: 'jefa_cocina',    emoji: '👩‍🍳', label: 'Jefa de cocina' },
  { id: 'despachador',    emoji: '🚚', label: 'Despachador' },
  { id: 'ayudante',       emoji: '👨‍🍳', label: 'Ayudante' },
  { id: 'contador',       emoji: '🧮', label: 'Contador' },
]

const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }

function SeccionPersonal({ empresaId, mostrarExito }) {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [datosForm, setDatosForm] = useState({ nombre: '', rol: 'ayudante', pin: '', telefono: '', email: '' })

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

  useEffect(() => { cargarUsuarios() }, [empresaId])

  async function cargarUsuarios() {
    setCargando(true)
    const { data } = await supabase.from('usuarios').select('*').eq('empresa_id', empresaId).eq('activo', true).order('rol')
    setUsuarios(data || [])
    setCargando(false)
  }

  function generarPIN() { return Math.floor(1000 + Math.random() * 9000).toString() }

  function iniciarEdicion(usuario) {
    setEditando(usuario.id)
    setAgregando(false)
    setDatosForm({
      nombre: usuario.nombre || '', rol: usuario.rol || 'ayudante',
      pin: usuario.pin || '', telefono: usuario.telefono || '', email: usuario.email || '',
    })
  }

  function iniciarAgregado() {
    setAgregando(true)
    setEditando(null)
    setDatosForm({ nombre: '', rol: 'ayudante', pin: generarPIN(), telefono: '', email: '' })
  }

  function cancelar() { setEditando(null); setAgregando(false) }

  async function guardar() {
    if (!datosForm.nombre.trim()) { alert('El nombre es obligatorio'); return }
    if (!datosForm.pin || datosForm.pin.length !== 4) { alert('El PIN debe tener 4 dígitos'); return }
    const pinDuplicado = usuarios.some(u => u.pin === datosForm.pin && u.id !== editando)
    if (pinDuplicado) { alert('Ese PIN ya está en uso por otro usuario'); return }
    if (editando) {
      const { error } = await supabase.from('usuarios').update(datosForm).eq('id', editando)
      if (error) { alert('Error: ' + error.message); return }
      mostrarExito('Usuario actualizado')
    } else {
      const { error } = await supabase.from('usuarios').insert([{ ...datosForm, empresa_id: empresaId, activo: true }])
      if (error) { alert('Error: ' + error.message); return }
      mostrarExito('Usuario agregado')
    }
    cancelar()
    cargarUsuarios()
  }

  async function desactivar(usuario) {
    if (!confirm(`¿Desactivar a "${usuario.nombre}"? Ya no podrá hacer login.`)) return
    await supabase.from('usuarios').update({ activo: false }).eq('id', usuario.id)
    mostrarExito('Usuario desactivado')
    cargarUsuarios()
  }

  if (cargando) return <div style={{ textAlign: 'center', padding: '48px', color: 'var(--color-text-muted)' }}>⏳ Cargando personal...</div>

  const usuarioEditando = editando ? usuarios.find(u => u.id === editando) : null

  return (
    <div>
      <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px', flexWrap: 'wrap' }}>
        <div>
          <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>👥 Personal</h3>
          <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>{usuarios.length} usuarios activos</p>
        </div>
        {!agregando && !editando && (
          <button onClick={iniciarAgregado} style={{ padding: '10px 18px', background: 'linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ➕ Agregar usuario
          </button>
        )}
      </div>

      {(agregando || editando) && (
        <div style={{ background: esTropical ? AZUL.claro : `${AZUL.c}15`, border: `1px solid ${AZUL.c}${esTropical ? '50' : '40'}`, borderRadius: '12px', padding: '16px', marginBottom: '20px' }}>
          <h4 style={{ fontSize: '15px', fontWeight: 600, color: esTropical ? AZUL.dark : AZUL.c, margin: '0 0 16px' }}>
            {agregando ? '➕ Nuevo usuario' : `✏️ Editando: ${usuarioEditando?.nombre}`}
          </h4>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <input type="text" placeholder="Nombre completo *" value={datosForm.nombre} onChange={(e) => setDatosForm({ ...datosForm, nombre: e.target.value.toUpperCase() })} style={inputStyle()} />

            <div>
              <label style={labelStyle()}>ROL</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                {ROLES.map(r => (
                  <button key={r.id} onClick={() => setDatosForm({ ...datosForm, rol: r.id })} style={selectorStyle(datosForm.rol === r.id, esTropical)}>
                    <div style={{ fontSize: '18px' }}>{r.emoji}</div>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={labelStyle()}>PIN (4 dígitos)</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input type="text" maxLength={4} placeholder="0000" value={datosForm.pin} onChange={(e) => setDatosForm({ ...datosForm, pin: e.target.value.replace(/\D/g, '') })} style={{ ...inputStyle(), fontFamily: 'monospace', textAlign: 'center', fontSize: '16px', letterSpacing: '4px' }} />
                  <button onClick={() => setDatosForm({ ...datosForm, pin: generarPIN() })} style={{ padding: '0 12px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '8px', cursor: 'pointer', fontSize: '14px' }} title="Generar PIN aleatorio">🎲</button>
                </div>
              </div>
              <div>
                <label style={labelStyle()}>Teléfono</label>
                <input type="text" placeholder="809-555-1234" value={datosForm.telefono} onChange={(e) => setDatosForm({ ...datosForm, telefono: e.target.value })} style={inputStyle()} />
              </div>
            </div>

            <input type="email" placeholder="Email (opcional)" value={datosForm.email} onChange={(e) => setDatosForm({ ...datosForm, email: e.target.value })} style={inputStyle()} />
          </div>

          <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
            <button onClick={guardar} style={{ padding: '10px 20px', background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>💾 Guardar</button>
            <button onClick={cancelar} style={{ padding: '10px 20px', background: 'var(--color-bg-card)', border: '1px solid var(--color-border-subtle)', borderRadius: '10px', color: 'var(--color-text-secondary)', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}>Cancelar</button>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {usuarios.map(u => {
          const rolInfo = ROLES.find(r => r.id === u.rol) || ROLES[4]
          return (
            <div key={u.id} style={{ background: 'var(--color-bg-elevated)', border: '1px solid var(--color-border-subtle)', borderRadius: '12px', padding: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                  <span style={{ fontSize: '24px' }}>{rolInfo.emoji}</span>
                  <div>
                    <p style={{ fontWeight: 600, color: 'var(--color-text-primary)', fontSize: '13px', margin: 0 }}>{u.nombre}</p>
                    <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '2px 0 0' }}>
                      {rolInfo.label} · PIN: <span style={{ fontFamily: 'monospace' }}>••••</span>
                      {u.telefono && ` · 📞 ${u.telefono}`}
                    </p>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => iniciarEdicion(u)} style={{ padding: '6px 12px', background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '8px', color: 'white', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>✏️ Editar</button>
                  <button onClick={() => desactivar(u)} style={{ padding: '6px 12px', background: esTropical ? '#FCEBEB' : 'rgba(226, 75, 74, 0.15)', border: '1px solid rgba(226, 75, 74, 0.3)', borderRadius: '8px', color: esTropical ? '#A32D2D' : '#F4C0D1', fontSize: '11px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>🗑️ Quitar</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function selectorStyle(activo, esTropical) {
  return {
    padding: '8px', borderRadius: '10px', fontSize: '11px', fontWeight: 600,
    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'center',
    color: 'var(--color-text-primary)',
    border: activo ? '2px solid #378ADD' : '2px solid var(--color-border-subtle)',
    background: activo ? (esTropical ? '#E6F1FB' : 'rgba(55, 138, 221, 0.18)') : 'var(--color-bg-input)',
  }
}

function labelStyle() {
  return { display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '9px 12px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '8px', color: 'var(--color-text-primary)', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  }
}

export default SeccionPersonal