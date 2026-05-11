import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalEmpleado from './ModalEmpleado'

function VistaEmpleados({ usuario, empresaId, onVolver }) {
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroActivos, setFiltroActivos] = useState(true)
  
  // Estado del modal: null = cerrado, {} = crear nuevo, {empleado} = editar
  const [modalEmpleado, setModalEmpleado] = useState(null)

  useEffect(() => {
    cargarEmpleados()
  }, [empresaId, filtroActivos])

  async function cargarEmpleados() {
    setCargando(true)
    
    let query = supabase
      .from('usuarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('nombre', { ascending: true })

    if (filtroActivos) {
      query = query.or('activo.eq.true,activo.is.null')
    }

    const { data, error } = await query

    if (error) {
      console.error('Error al cargar empleados:', error)
      setCargando(false)
      return
    }

    setEmpleados(data || [])
    setCargando(false)
  }

  function obtenerAvatar(empleado) {
    if (empleado.foto_url) return null
    if (empleado.sexo === 'hombre') return '👨'
    if (empleado.sexo === 'mujer') return '👩'
    return empleado.nombre?.charAt(0)?.toUpperCase() || '?'
  }

  function formatearRol(rol) {
    const roles = {
      propietario: { label: 'Propietario', emoji: '👑', color: 'bg-yellow-100 text-yellow-800' },
      administrador: { label: 'Administrador', emoji: '💼', color: 'bg-blue-100 text-blue-800' },
      contador: { label: 'Contador', emoji: '🧮', color: 'bg-purple-100 text-purple-800' },
      secretaria: { label: 'Secretaria', emoji: '📋', color: 'bg-pink-100 text-pink-800' },
      jefa_cocina: { label: 'Jefa de Cocina', emoji: '👩‍🍳', color: 'bg-green-100 text-green-800' },
      ayudante: { label: 'Ayudante', emoji: '👨‍🍳', color: 'bg-green-100 text-green-800' },
      despachador: { label: 'Despachador (legacy)', emoji: '🚚', color: 'bg-gray-100 text-gray-800' },
    }
    return roles[rol] || { label: rol, emoji: '👤', color: 'bg-gray-100 text-gray-800' }
  }

  function formatearFrecuencia(frecuencia) {
    const opciones = {
      dia: 'Por día',
      semana: 'Semanal',
      quincena: 'Quincenal',
      mes: 'Mensual',
    }
    return opciones[frecuencia] || 'No definida'
  }

  function formatearSueldo(sueldo) {
    if (!sueldo) return 'No definido'
    return `RD$ ${Number(sueldo).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`
  }

  return (
    <div className="w-full max-w-6xl bg-white rounded-2xl shadow-xl overflow-hidden">
      
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 px-6 py-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">👥 Empleados</h1>
            <p className="text-purple-100 text-sm mt-1">
              Gestiona el personal de tu cocina
            </p>
          </div>
          <button
            onClick={onVolver}
            className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg transition"
          >
            ← Volver
          </button>
        </div>
      </div>

      <div className="px-6 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
            <input
              type="checkbox"
              checked={filtroActivos}
              onChange={(e) => setFiltroActivos(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            Solo activos
          </label>
          <span className="text-sm text-gray-500">
            {empleados.length} {empleados.length === 1 ? 'empleado' : 'empleados'}
          </span>
        </div>
        <button
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg font-medium transition flex items-center gap-2"
          onClick={() => setModalEmpleado({})}
        >
          <span>+</span> Agregar empleado
        </button>
      </div>

      <div className="p-6">
        {cargando ? (
          <p className="text-center text-gray-500 py-12">Cargando empleados...</p>
        ) : empleados.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 text-lg">No hay empleados registrados todavía</p>
            <p className="text-gray-400 text-sm mt-2">
              Haz click en "Agregar empleado" para comenzar
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {empleados.map((empleado) => {
              const rol = formatearRol(empleado.rol)
              const inactivo = empleado.activo === false
              
              return (
                <div
                  key={empleado.id}
                  className={`border-2 rounded-xl p-4 transition hover:shadow-md cursor-pointer ${
                    inactivo 
                      ? 'border-gray-200 bg-gray-50 opacity-60' 
                      : 'border-gray-200 bg-white hover:border-purple-300'
                  }`}
                  onClick={() => setModalEmpleado(empleado)}
                >
                  <div className="flex items-center gap-3 mb-3">
                    {empleado.foto_url ? (
                      <img
                        src={empleado.foto_url}
                        alt={empleado.nombre}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-2xl">
                        {obtenerAvatar(empleado)}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-gray-800 truncate">
                        {empleado.nombre}
                      </p>
                      {inactivo && (
                        <span className="text-xs text-red-600 font-medium">
                          Inactivo
                        </span>
                      )}
                    </div>
                  </div>

                  <div className={`inline-block px-2 py-1 rounded-md text-xs font-medium ${rol.color} mb-2`}>
                    {rol.emoji} {rol.label}
                  </div>

                  <div className="space-y-1 text-xs text-gray-600 mt-2">
                    {empleado.telefono && (
                      <p>📞 {empleado.telefono}</p>
                    )}
                    {empleado.sueldo && (
                      <p>💰 {formatearSueldo(empleado.sueldo)} <span className="text-gray-400">/ {formatearFrecuencia(empleado.frecuencia_pago)}</span></p>
                    )}
                    {empleado.fecha_contratacion && (
                      <p>📅 Desde {new Date(empleado.fecha_contratacion).toLocaleDateString('es-DO')}</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* MODAL: Agregar o Editar empleado */}
      {modalEmpleado && (
        <ModalEmpleado
          empresaId={empresaId}
          empleadoExistente={modalEmpleado.id ? modalEmpleado : null}
          onCerrar={() => setModalEmpleado(null)}
          onGuardado={() => cargarEmpleados()}
        />
      )}

    </div>
  )
}

export default VistaEmpleados