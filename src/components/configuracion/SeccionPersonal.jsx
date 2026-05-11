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

function SeccionPersonal({ empresaId, mostrarExito }) {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [datosForm, setDatosForm] = useState({
    nombre: '',
    rol: 'ayudante',
    pin: '',
    telefono: '',
    email: '',
  })

  useEffect(() => {
    cargarUsuarios()
  }, [empresaId])

  async function cargarUsuarios() {
    setCargando(true)
    const { data } = await supabase
      .from('usuarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('rol')
    setUsuarios(data || [])
    setCargando(false)
  }

  function generarPIN() {
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    return pin
  }

  function iniciarEdicion(usuario) {
    setEditando(usuario.id)
    setAgregando(false)
    setDatosForm({
      nombre: usuario.nombre || '',
      rol: usuario.rol || 'ayudante',
      pin: usuario.pin || '',
      telefono: usuario.telefono || '',
      email: usuario.email || '',
    })
  }

  function iniciarAgregado() {
    setAgregando(true)
    setEditando(null)
    setDatosForm({
      nombre: '',
      rol: 'ayudante',
      pin: generarPIN(),
      telefono: '',
      email: '',
    })
  }

  function cancelar() {
    setEditando(null)
    setAgregando(false)
  }

  async function guardar() {
    if (!datosForm.nombre.trim()) {
      alert('El nombre es obligatorio')
      return
    }
    if (!datosForm.pin || datosForm.pin.length !== 4) {
      alert('El PIN debe tener 4 dígitos')
      return
    }

    // Verificar PIN duplicado
    const pinDuplicado = usuarios.some(u => 
      u.pin === datosForm.pin && u.id !== editando
    )
    if (pinDuplicado) {
      alert('Ese PIN ya está en uso por otro usuario')
      return
    }

    if (editando) {
      const { error } = await supabase
        .from('usuarios')
        .update(datosForm)
        .eq('id', editando)
      
      if (error) {
        alert('Error: ' + error.message)
        return
      }
      mostrarExito('Usuario actualizado')
    } else {
      const { error } = await supabase
        .from('usuarios')
        .insert([{ ...datosForm, empresa_id: empresaId, activo: true }])
      
      if (error) {
        alert('Error: ' + error.message)
        return
      }
      mostrarExito('Usuario agregado')
    }

    cancelar()
    cargarUsuarios()
  }

  async function desactivar(usuario) {
    if (!confirm(`¿Desactivar a "${usuario.nombre}"? Ya no podrá hacer login.`)) {
      return
    }
    
    await supabase
      .from('usuarios')
      .update({ activo: false })
      .eq('id', usuario.id)
    
    mostrarExito('Usuario desactivado')
    cargarUsuarios()
  }

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando personal...</div>
  }

  const usuarioEditando = editando ? usuarios.find(u => u.id === editando) : null

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">👥 Personal</h3>
          <p className="text-gray-500 text-sm mt-1">{usuarios.length} usuarios activos</p>
        </div>
        {!agregando && !editando && (
          <button
            onClick={iniciarAgregado}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl text-sm"
          >
            ➕ Agregar usuario
          </button>
        )}
      </div>

      {/* Formulario */}
      {(agregando || editando) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h4 className="font-bold text-blue-900 mb-4">
            {agregando ? '➕ Nuevo usuario' : `✏️ Editando: ${usuarioEditando?.nombre}`}
          </h4>
          
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre completo *"
              value={datosForm.nombre}
              onChange={(e) => setDatosForm({...datosForm, nombre: e.target.value.toUpperCase()})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">ROL</label>
              <div className="grid grid-cols-3 gap-2">
                {ROLES.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setDatosForm({...datosForm, rol: r.id})}
                    className={`p-2 rounded-lg border-2 text-xs font-semibold transition-colors ${
                      datosForm.rol === r.id
                        ? 'border-blue-500 bg-blue-100'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg">{r.emoji}</div>
                    {r.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">PIN (4 dígitos)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    placeholder="0000"
                    value={datosForm.pin}
                    onChange={(e) => setDatosForm({...datosForm, pin: e.target.value.replace(/\D/g, '')})}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono text-center text-lg tracking-widest"
                  />
                  <button
                    onClick={() => setDatosForm({...datosForm, pin: generarPIN()})}
                    className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-3 rounded-lg text-xs"
                    title="Generar PIN aleatorio"
                  >
                    🎲
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Teléfono</label>
                <input
                  type="text"
                  placeholder="809-555-1234"
                  value={datosForm.telefono}
                  onChange={(e) => setDatosForm({...datosForm, telefono: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <input
              type="email"
              placeholder="Email (opcional)"
              value={datosForm.email}
              onChange={(e) => setDatosForm({...datosForm, email: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          <div className="flex gap-2 mt-4">
            <button
              onClick={guardar}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              💾 Guardar
            </button>
            <button
              onClick={cancelar}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de usuarios */}
      <div className="space-y-2">
        {usuarios.map(u => {
          const rolInfo = ROLES.find(r => r.id === u.rol) || ROLES[4]
          return (
            <div key={u.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-2xl">{rolInfo.emoji}</span>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{u.nombre}</p>
                    <p className="text-xs text-gray-500">
                      {rolInfo.label} · PIN: <span className="font-mono">••••</span>
                      {u.telefono && ` · 📞 ${u.telefono}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => iniciarEdicion(u)}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1 rounded-lg"
                  >
                    ✏️ Editar
                  </button>
                  <button
                    onClick={() => desactivar(u)}
                    className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1 rounded-lg"
                  >
                    🗑️ Quitar
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SeccionPersonal