import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const AZUL = { c: '#378ADD', claro: '#E6F1FB', dark: '#0C447C' }

function SeccionMiCocina({ empresa, onActualizado, mostrarExito }) {
  const [datos, setDatos] = useState({
    nombre: '', rnc: '', direccion: '', telefono: '', email: '',
    banco: '', cuenta_bancaria: '', modo_operacion: 'aprendizaje',
  })
  const [guardando, setGuardando] = useState(false)

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

  useEffect(() => {
    if (empresa) {
      setDatos({
        nombre: empresa.nombre || '', rnc: empresa.rnc || '',
        direccion: empresa.direccion || '', telefono: empresa.telefono || '',
        email: empresa.email || '', banco: empresa.banco || '',
        cuenta_bancaria: empresa.cuenta_bancaria || '',
        modo_operacion: empresa.modo_operacion || 'aprendizaje',
      })
    }
  }, [empresa])

  function actualizarCampo(campo, valor) { setDatos({ ...datos, [campo]: valor }) }

  async function guardar() {
    setGuardando(true)
    const { error } = await supabase.from('empresas').update(datos).eq('id', empresa.id)
    setGuardando(false)
    if (error) { alert('Error guardando: ' + error.message); return }
    mostrarExito('Datos de la cocina actualizados')
    if (onActualizado) onActualizado()
  }

  function modoStyle(activo) {
    return {
      padding: '16px', borderRadius: '12px', textAlign: 'left', cursor: 'pointer',
      fontFamily: 'inherit', color: 'var(--color-text-primary)',
      border: activo ? '2px solid #378ADD' : '2px solid var(--color-border-subtle)',
      background: activo ? (esTropical ? '#E6F1FB' : 'rgba(55, 138, 221, 0.18)') : 'var(--color-bg-input)',
    }
  }

  return (
    <div>
      <div style={{ marginBottom: '20px' }}>
        <h3 style={{ fontSize: '22px', fontWeight: 600, color: 'var(--color-text-primary)', margin: 0 }}>🏢 Mi Cocina</h3>
        <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginTop: '4px' }}>Datos generales de tu empresa</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        <div>
          <label style={labelStyle()}>NOMBRE DE LA COCINA</label>
          <input type="text" value={datos.nombre} onChange={(e) => actualizarCampo('nombre', e.target.value)} style={inputStyle()} placeholder="Ej: Elba Gourmet" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle()}>RNC</label>
            <input type="text" value={datos.rnc} onChange={(e) => actualizarCampo('rnc', e.target.value)} style={inputStyle()} placeholder="1-31-12345-6" />
          </div>
          <div>
            <label style={labelStyle()}>TELÉFONO</label>
            <input type="text" value={datos.telefono} onChange={(e) => actualizarCampo('telefono', e.target.value)} style={inputStyle()} placeholder="809-555-1234" />
          </div>
        </div>

        <div>
          <label style={labelStyle()}>DIRECCIÓN</label>
          <input type="text" value={datos.direccion} onChange={(e) => actualizarCampo('direccion', e.target.value)} style={inputStyle()} placeholder="Jícome, Esperanza, Valverde" />
        </div>

        <div>
          <label style={labelStyle()}>EMAIL</label>
          <input type="email" value={datos.email} onChange={(e) => actualizarCampo('email', e.target.value)} style={inputStyle()} placeholder="contacto@elbagourmet.com" />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={labelStyle()}>BANCO</label>
            <input type="text" value={datos.banco} onChange={(e) => actualizarCampo('banco', e.target.value)} style={inputStyle()} placeholder="Ej: Banreservas" />
          </div>
          <div>
            <label style={labelStyle()}>CUENTA BANCARIA</label>
            <input type="text" value={datos.cuenta_bancaria} onChange={(e) => actualizarCampo('cuenta_bancaria', e.target.value)} style={inputStyle()} placeholder="000-0000000-0" />
          </div>
        </div>

        <div>
          <label style={labelStyle()}>MODO DE OPERACIÓN</label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <button onClick={() => actualizarCampo('modo_operacion', 'aprendizaje')} style={modoStyle(datos.modo_operacion === 'aprendizaje')}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>📚 Aprendizaje</div>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>La app aprende y sugiere</p>
            </button>
            <button onClick={() => actualizarCampo('modo_operacion', 'detallado')} style={modoStyle(datos.modo_operacion === 'detallado')}>
              <div style={{ fontWeight: 700, fontSize: '13px' }}>📊 Detallado</div>
              <p style={{ fontSize: '11px', color: 'var(--color-text-muted)', margin: '4px 0 0' }}>Control fino de cada operación</p>
            </button>
          </div>
        </div>

        <div style={{ paddingTop: '4px', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={guardar} disabled={guardando} style={{ padding: '12px 24px', background: guardando ? 'var(--color-bg-card)' : 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)', border: 'none', borderRadius: '10px', color: 'white', fontSize: '13px', fontWeight: 600, cursor: guardando ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
            {guardando ? '⏳ Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>
  )
}

function labelStyle() {
  return { display: 'block', fontSize: '11px', fontWeight: 600, color: 'var(--color-text-muted)', marginBottom: '4px', letterSpacing: '0.5px' }
}

function inputStyle() {
  return {
    width: '100%', boxSizing: 'border-box', padding: '11px 14px',
    background: 'var(--color-bg-input)', border: '1px solid var(--color-border-subtle)',
    borderRadius: '10px', color: 'var(--color-text-primary)', fontSize: '13px',
    fontFamily: 'inherit', outline: 'none',
  }
}

export default SeccionMiCocina