import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function SeccionEscuelas({ empresaId, mostrarExito }) {
  const [escuelas, setEscuelas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [datosForm, setDatosForm] = useState({
    nombre: '',
    direccion: '',
    director_nombre: '',
    director_telefono: '',
    raciones_contractuales: '',
    precio_racion: '',
    distancia_km: '',
  })

  useEffect(() => {
    cargarEscuelas()
  }, [empresaId])

  async function cargarEscuelas() {
    setCargando(true)
    const { data } = await supabase
      .from('escuelas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activa', true)
      .order('nombre')
    setEscuelas(data || [])
    setCargando(false)
  }

  function iniciarEdicion(escuela) {
    setEditando(escuela.id)
    setAgregando(false)
    setDatosForm({
      nombre: escuela.nombre || '',
      direccion: escuela.direccion || '',
      director_nombre: escuela.director_nombre || '',
      director_telefono: escuela.director_telefono || '',
      raciones_contractuales: escuela.raciones_contractuales || '',
      precio_racion: escuela.precio_racion || '',
      distancia_km: escuela.distancia_km || '',
    })
  }

  function iniciarAgregado() {
    setAgregando(true)
    setEditando(null)
    setDatosForm({
      nombre: '',
      direccion: '',
      director_nombre: '',
      director_telefono: '',
      raciones_contractuales: '',
      precio_racion: '71',
      distancia_km: '',
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

    if (editando) {
      // Actualizar
      const { error } = await supabase
        .from('escuelas')
        .update(datosForm)
        .eq('id', editando)
      
      if (error) {
        alert('Error: ' + error.message)
        return
      }
      mostrarExito('Escuela actualizada')
    } else {
      // Crear nueva
      const { error } = await supabase
        .from('escuelas')
        .insert([{ ...datosForm, empresa_id: empresaId, activa: true }])
      
      if (error) {
        alert('Error: ' + error.message)
        return
      }
      mostrarExito('Escuela agregada')
    }

    cancelar()
    cargarEscuelas()
  }

  async function desactivar(escuela) {
    if (!confirm(`¿Desactivar "${escuela.nombre}"? No aparecerá más en el dashboard.`)) {
      return
    }
    
    await supabase
      .from('escuelas')
      .update({ activa: false })
      .eq('id', escuela.id)
    
    mostrarExito('Escuela desactivada')
    cargarEscuelas()
  }

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando escuelas...</div>
  }

  const editandoEscuela = editando ? escuelas.find(e => e.id === editando) : null

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">🏫 Escuelas</h3>
          <p className="text-gray-500 text-sm mt-1">{escuelas.length} escuelas activas</p>
        </div>
        {!agregando && !editando && (
          <button
            onClick={iniciarAgregado}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl text-sm"
          >
            ➕ Agregar escuela
          </button>
        )}
      </div>

      {/* Formulario de edición/creación */}
      {(agregando || editando) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h4 className="font-bold text-blue-900 mb-4">
            {agregando ? '➕ Nueva escuela' : `✏️ Editando: ${editandoEscuela?.nombre}`}
          </h4>
          
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Nombre de la escuela *"
              value={datosForm.nombre}
              onChange={(e) => setDatosForm({...datosForm, nombre: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <input
              type="text"
              placeholder="Dirección"
              value={datosForm.direccion}
              onChange={(e) => setDatosForm({...datosForm, direccion: e.target.value})}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Director"
                value={datosForm.director_nombre}
                onChange={(e) => setDatosForm({...datosForm, director_nombre: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Tel. director"
                value={datosForm.director_telefono}
                onChange={(e) => setDatosForm({...datosForm, director_telefono: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <input
                type="number"
                placeholder="Raciones"
                value={datosForm.raciones_contractuales}
                onChange={(e) => setDatosForm({...datosForm, raciones_contractuales: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="number"
                step="0.01"
                placeholder="Precio (RD$)"
                value={datosForm.precio_racion}
                onChange={(e) => setDatosForm({...datosForm, precio_racion: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="number"
                step="0.1"
                placeholder="Distancia (km)"
                value={datosForm.distancia_km}
                onChange={(e) => setDatosForm({...datosForm, distancia_km: e.target.value})}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
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

      {/* Lista de escuelas */}
      <div className="space-y-3">
        {escuelas.map(escuela => (
          <div key={escuela.id} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <h4 className="font-bold text-gray-900">{escuela.nombre}</h4>
                <p className="text-xs text-gray-500 mt-1">
                  📍 {escuela.direccion || 'Sin dirección'} 
                  {escuela.distancia_km && ` · ${escuela.distancia_km} km`}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-gray-700">
                  <span>👤 {escuela.director_nombre || '—'}</span>
                  <span>📞 {escuela.director_telefono || '—'}</span>
                  <span>🍽️ {escuela.raciones_contractuales} raciones</span>
                  <span>💰 RD$ {escuela.precio_racion}/ración</span>
                </div>
              </div>
              <div className="flex gap-2 ml-4">
                <button
                  onClick={() => iniciarEdicion(escuela)}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1 rounded-lg"
                >
                  ✏️ Editar
                </button>
                <button
                  onClick={() => desactivar(escuela)}
                  className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1 rounded-lg"
                >
                  🗑️ Quitar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {escuelas.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No hay escuelas activas. Click en "Agregar escuela" para empezar.
        </div>
      )}

    </div>
  )
}

export default SeccionEscuelas