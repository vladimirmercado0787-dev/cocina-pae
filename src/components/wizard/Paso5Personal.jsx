import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const ROLES = [
  { id: 'propietario', nombre: 'Propietario', emoji: '👑', descripcion: 'Acceso completo' },
  { id: 'administrador', nombre: 'Administrador', emoji: '💼', descripcion: 'Operaciones y reportes' },
  { id: 'jefa_cocina', nombre: 'Jefa de cocina', emoji: '👩‍🍳', descripcion: 'Manda en la cocina' },
  { id: 'despachador', nombre: 'Despachador', emoji: '🚚', descripcion: 'Lleva comida a escuelas' },
  { id: 'ayudante', nombre: 'Ayudante', emoji: '👨‍🍳', descripcion: 'Apoyo general' },
  { id: 'contador', nombre: 'Contador', emoji: '🧮', descripcion: 'Solo finanzas' }
]

function Paso5Personal({ empresaId }) {
  const [usuarios, setUsuarios] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  
  const [datos, setDatos] = useState({
    nombre: '',
    rol: 'ayudante',
    pin: '',
    telefono: '',
    email: ''
  })

  useEffect(() => {
    if (empresaId) cargarUsuarios()
  }, [empresaId])

  async function cargarUsuarios() {
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: true })
    
    if (!error) {
      setUsuarios(data)
    }
  }

  function actualizarCampo(campo, valor) {
    setDatos({ ...datos, [campo]: valor })
  }

  function resetFormulario() {
    setDatos({
      nombre: '',
      rol: 'ayudante',
      pin: '',
      telefono: '',
      email: ''
    })
    setMensaje(null)
  }

  function generarPinSugerido() {
    const pin = Math.floor(1000 + Math.random() * 9000).toString()
    actualizarCampo('pin', pin)
  }

  async function agregarUsuario(e) {
    e.preventDefault()
    
    if (!datos.nombre || !datos.pin) {
      setMensaje({ tipo: 'error', texto: 'Nombre y PIN son obligatorios' })
      return
    }

    if (datos.pin.length !== 4 || !/^\d+$/.test(datos.pin)) {
      setMensaje({ tipo: 'error', texto: 'El PIN debe tener exactamente 4 dígitos' })
      return
    }

    // Verificar PIN duplicado
    const pinDuplicado = usuarios.find(u => u.pin === datos.pin)
    if (pinDuplicado) {
      setMensaje({ tipo: 'error', texto: `El PIN ${datos.pin} ya está usado por ${pinDuplicado.nombre}` })
      return
    }

    setGuardando(true)
    setMensaje(null)

    try {
      const usuarioParaGuardar = {
        empresa_id: empresaId,
        nombre: datos.nombre,
        rol: datos.rol,
        pin: datos.pin,
        telefono: datos.telefono || null,
        email: datos.email || null
      }

      const { error } = await supabase
        .from('usuarios')
        .insert([usuarioParaGuardar])
        .select()

      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + error.message })
      } else {
        setMensaje({ tipo: 'exito', texto: '✅ Persona agregada' })
        resetFormulario()
        setMostrarFormulario(false)
        cargarUsuarios()
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + err.message })
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarUsuario(id) {
    const { error } = await supabase
      .from('usuarios')
      .delete()
      .eq('id', id)
    
    if (!error) {
      cargarUsuarios()
    }
  }

  function getRol(rolId) {
    return ROLES.find(r => r.id === rolId) || ROLES[4]
  }

  if (!empresaId) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-8 max-w-3xl w-full">
        <p className="text-yellow-800">⚠️ Primero registra tu cocina en el Paso 1</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl w-full">
      
      <div className="mb-6">
        <p className="text-xs text-orange-600 font-semibold tracking-wider mb-1">
          PASO 5 DE 6 · ESTIMADO 5 MIN
        </p>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          👥 Personal y roles
        </h2>
        <p className="text-gray-600">
          Registra a las personas que trabajan en la cocina
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <p className="text-sm text-blue-900">
          💡 <strong>Cada persona tiene un PIN de 4 dígitos</strong> para entrar a la app.
          Cada rol ve diferentes pantallas: el despachador solo ve su lista de entregas, 
          la jefa de cocina ve el menú del día, etc.
        </p>
      </div>

      {/* Resumen */}
      {usuarios.length > 0 && (
        <div className="bg-gray-50 rounded-lg p-4 mb-6 flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-500 font-semibold tracking-wider">PERSONAL REGISTRADO</p>
            <p className="text-3xl font-bold text-gray-900">{usuarios.length} {usuarios.length === 1 ? 'persona' : 'personas'}</p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end max-w-xs">
            {ROLES.map((rol) => {
              const count = usuarios.filter(u => u.rol === rol.id).length
              if (count === 0) return null
              return (
                <span key={rol.id} className="px-2 py-1 bg-white border border-gray-200 rounded-full text-xs">
                  {rol.emoji} {count}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* Lista de usuarios */}
      {usuarios.length > 0 && (
        <div className="space-y-2 mb-6">
          {usuarios.map((usuario) => {
            const rol = getRol(usuario.rol)
            return (
              <div key={usuario.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center text-2xl">
                  {rol.emoji}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900">{usuario.nombre}</p>
                  <p className="text-sm text-gray-500">
                    {rol.nombre} · PIN: <span className="font-mono font-bold">{usuario.pin}</span>
                    {usuario.telefono && ` · ${usuario.telefono}`}
                  </p>
                </div>
                <button
                  onClick={() => eliminarUsuario(usuario.id)}
                  className="text-red-500 hover:text-red-700 px-3 py-1 text-sm"
                >
                  Eliminar
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulario o botón */}
      {!mostrarFormulario ? (
        <button
          onClick={() => {
            setMostrarFormulario(true)
            generarPinSugerido()
          }}
          className="w-full border-2 border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 py-4 rounded-lg font-semibold transition-colors"
        >
          + Agregar persona
        </button>
      ) : (
        <form onSubmit={agregarUsuario} className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200">
          
          <h3 className="font-semibold text-gray-900 mb-2">Nueva persona</h3>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Nombre completo <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={datos.nombre}
              onChange={(e) => actualizarCampo('nombre', e.target.value)}
              placeholder="Ej: María Pérez"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Rol en la cocina
            </label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((rol) => (
                <button
                  key={rol.id}
                  type="button"
                  onClick={() => actualizarCampo('rol', rol.id)}
                  className={`p-3 rounded-lg text-left border-2 transition-all ${
                    datos.rol === rol.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <p className="font-semibold text-gray-900">
                    {rol.emoji} {rol.nombre}
                  </p>
                  <p className="text-xs text-gray-500">{rol.descripcion}</p>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              PIN de 4 dígitos <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength="4"
                value={datos.pin}
                onChange={(e) => actualizarCampo('pin', e.target.value.replace(/\D/g, ''))}
                placeholder="0000"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-center font-mono text-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <button
                type="button"
                onClick={generarPinSugerido}
                className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg font-semibold hover:bg-blue-200"
              >
                🎲 Generar
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Esta persona usará este PIN para entrar a la app
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Teléfono
              </label>
              <input
                type="tel"
                value={datos.telefono}
                onChange={(e) => actualizarCampo('telefono', e.target.value)}
                placeholder="809-555-0000"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Email
              </label>
              <input
                type="email"
                value={datos.email}
                onChange={(e) => actualizarCampo('email', e.target.value)}
                placeholder="opcional"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {mensaje && (
            <div className={`p-3 rounded-lg text-sm ${mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {mensaje.texto}
            </div>
          )}

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setMostrarFormulario(false)
                resetFormulario()
              }}
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg"
            >
              {guardando ? 'Guardando...' : 'Agregar persona'}
            </button>
          </div>
        </form>
      )}

    </div>
  )
}

export default Paso5Personal