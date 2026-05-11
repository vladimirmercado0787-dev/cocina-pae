import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const ROL_INFO = {
  propietario:    { emoji: '👑', label: 'Propietario',   color: 'from-yellow-50 to-yellow-100 border-yellow-300' },
  administrador:  { emoji: '💼', label: 'Administrador', color: 'from-blue-50 to-blue-100 border-blue-300' },
  secretaria:     { emoji: '📋', label: 'Secretaria',    color: 'from-pink-50 to-rose-100 border-pink-300' },
  jefa_cocina:    { emoji: '👩‍🍳', label: 'Jefa de cocina', color: 'from-fuchsia-50 to-fuchsia-100 border-fuchsia-300' },
  despachador:    { emoji: '🚚', label: 'Despachador',   color: 'from-orange-50 to-orange-100 border-orange-300' },
  ayudante:       { emoji: '👨‍🍳', label: 'Ayudante',      color: 'from-green-50 to-green-100 border-green-300' },
  contador:       { emoji: '🧮', label: 'Contador',      color: 'from-purple-50 to-purple-100 border-purple-300' }
}

function SeleccionOperador({ empresaId, onSeleccionar }) {
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    if (empresaId) cargarUsuarios()
  }, [empresaId])

  async function cargarUsuarios() {
    setCargando(true)
    const { data, error } = await supabase
      .from('usuarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('rol', { ascending: true })
    
    if (!error) {
      setUsuarios(data)
    }
    setCargando(false)
  }

  function getInfo(rol) {
    return ROL_INFO[rol] || ROL_INFO.ayudante
  }

  if (cargando) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Cargando equipo...</p>
      </div>
    )
  }

  if (usuarios.length === 0) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-8 max-w-3xl w-full">
        <p className="text-yellow-800">No hay personas registradas. Completa el Paso 5 del wizard primero.</p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-5xl">
      
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          ¿Quién está usando la app?
        </h2>
        <p className="text-gray-600">
          Selecciona tu nombre para continuar
        </p>
      </div>

      {/* Grid de operadores */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {usuarios.map((usuario) => {
          const info = getInfo(usuario.rol)
          return (
            <button
              key={usuario.id}
              onClick={() => onSeleccionar(usuario)}
              className={`bg-gradient-to-br ${info.color} border-2 rounded-2xl p-6 transition-all hover:scale-105 hover:shadow-xl text-center`}
            >
              <div className="text-5xl mb-3">{info.emoji}</div>
              <p className="font-bold text-gray-900 text-lg leading-tight mb-1">
                {usuario.nombre}
              </p>
              <p className="text-xs text-gray-600 font-semibold tracking-wider uppercase">
                {info.label}
              </p>
            </button>
          )
        })}
      </div>

      {/* Footer */}
      <div className="text-center mt-8">
        <p className="text-xs text-gray-400">
          {usuarios.length} {usuarios.length === 1 ? 'persona registrada' : 'personas registradas'}
        </p>
      </div>

    </div>
  )
}

export default SeleccionOperador