import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import SeccionMiCocina from './SeccionMiCocina'
import SeccionEscuelas from './SeccionEscuelas'
import SeccionPersonal from './SeccionPersonal'
import SeccionFinanzas from './SeccionFinanzas'
import SeccionMenusRecetas from './SeccionMenusRecetas'
import SeccionIngredientes from './SeccionIngredientes'
import SeccionSeguridad from './SeccionSeguridad'

const TABS = [
  { id: 'cocina', emoji: '🏢', label: 'Mi Cocina' },
  { id: 'escuelas', emoji: '🏫', label: 'Escuelas' },
  { id: 'ingredientes', emoji: '🥕', label: 'Ingredientes' },
  { id: 'menus', emoji: '🍽️', label: 'Menús y Recetas' },
  { id: 'personal', emoji: '👥', label: 'Personal' },
  { id: 'finanzas', emoji: '💰', label: 'Finanzas' },
  { id: 'seguridad', emoji: '🔐', label: 'Seguridad' },
]

function Configuracion({ usuario, empresaId, onVolver }) {
  const [tabActiva, setTabActiva] = useState('cocina')
  const [empresa, setEmpresa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [mensajeExito, setMensajeExito] = useState('')

  useEffect(() => {
    cargarEmpresa()
  }, [empresaId])

  async function cargarEmpresa() {
    setCargando(true)
    const { data } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single()
    setEmpresa(data)
    setCargando(false)
  }

  function mostrarExito(mensaje) {
    setMensajeExito(mensaje)
    setTimeout(() => setMensajeExito(''), 3000)
  }

  function renderSeccion() {
    if (cargando) {
      return <div className="text-center py-12 text-gray-500">Cargando...</div>
    }
    
    if (tabActiva === 'cocina') {
      return <SeccionMiCocina empresa={empresa} onActualizado={cargarEmpresa} mostrarExito={mostrarExito} />
    }
    if (tabActiva === 'escuelas') {
      return <SeccionEscuelas empresaId={empresaId} mostrarExito={mostrarExito} />
    }
    if (tabActiva === 'ingredientes') {
      return <SeccionIngredientes empresaId={empresaId} mostrarExito={mostrarExito} />
    }
    if (tabActiva === 'menus') {
      return <SeccionMenusRecetas empresaId={empresaId} mostrarExito={mostrarExito} />
    }
    if (tabActiva === 'personal') {
      return <SeccionPersonal empresaId={empresaId} mostrarExito={mostrarExito} />
    }
    if (tabActiva === 'finanzas') {
      return <SeccionFinanzas empresaId={empresaId} mostrarExito={mostrarExito} />
    }
    if (tabActiva === 'seguridad') {
      return <SeccionSeguridad empresa={empresa} onActualizado={cargarEmpresa} mostrarExito={mostrarExito} />
    }
  }

  return (
    <div className="w-full max-w-6xl">
      
      {/* Header */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 mb-6 text-white flex justify-between items-center">
        <div>
          <p className="text-gray-300 text-xs font-semibold tracking-wider">CONFIGURACIÓN</p>
          <h2 className="text-3xl font-bold mt-1">⚙️ Ajustes del Sistema</h2>
          <p className="text-gray-300 mt-1 text-sm">{empresa?.nombre}</p>
        </div>
        <button
          onClick={onVolver}
          className="bg-gray-700 hover:bg-gray-600 text-white text-sm px-4 py-2 rounded-lg"
        >
          ← Volver
        </button>
      </div>

      {/* Mensaje de éxito flotante */}
      {mensajeExito && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl z-50 animate-pulse">
          ✅ {mensajeExito}
        </div>
      )}

      {/* Layout con sidebar y contenido */}
      <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-4">
          
          {/* Sidebar de tabs */}
          <div className="bg-gray-50 border-r border-gray-200 p-4">
            <div className="space-y-1">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setTabActiva(tab.id)}
                  className={`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                    tabActiva === tab.id
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  <span className="mr-2">{tab.emoji}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Contenido principal */}
          <div className="md:col-span-3 p-6 min-h-[500px]">
            {renderSeccion()}
          </div>

        </div>
      </div>

    </div>
  )
}

export default Configuracion