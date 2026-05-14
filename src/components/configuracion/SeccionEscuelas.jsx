import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const FORM_INICIAL = {
  // Identificación
  nombre: '',
  codigo_centro: '',
  regional_distrito: '',
  // Ubicación
  provincia: '',
  municipio: '',
  barrio_sector: '',
  direccion: '',
  // Director
  director_nombre: '',
  director_telefono: '',
  // Contrato PAE
  raciones_contractuales: '',
  precio_racion: '',
  distancia_km: '',
  // Observaciones
  observaciones: '',
}

function SeccionEscuelas({ empresaId, mostrarExito }) {
  const [escuelas, setEscuelas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [datosForm, setDatosForm] = useState(FORM_INICIAL)

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
      codigo_centro: escuela.codigo_centro || '',
      regional_distrito: escuela.regional_distrito || '',
      provincia: escuela.provincia || '',
      municipio: escuela.municipio || '',
      barrio_sector: escuela.barrio_sector || '',
      direccion: escuela.direccion || '',
      director_nombre: escuela.director_nombre || '',
      director_telefono: escuela.director_telefono || '',
      raciones_contractuales: escuela.raciones_contractuales || '',
      precio_racion: escuela.precio_racion || '',
      distancia_km: escuela.distancia_km || '',
      observaciones: escuela.observaciones || '',
    })
  }

  function iniciarAgregado() {
    setAgregando(true)
    setEditando(null)
    setDatosForm({ ...FORM_INICIAL, precio_racion: '71' })
  }

  function cancelar() {
    setEditando(null)
    setAgregando(false)
    setDatosForm(FORM_INICIAL)
  }

  function actualizarCampo(campo, valor) {
    setDatosForm(prev => ({ ...prev, [campo]: valor }))
  }

  async function guardar() {
    if (!datosForm.nombre.trim()) {
      alert('El nombre de la escuela es obligatorio')
      return
    }

    // Limpiar campos numéricos vacíos para que Supabase no falle
    const payload = {
      ...datosForm,
      raciones_contractuales: datosForm.raciones_contractuales || null,
      precio_racion: datosForm.precio_racion || null,
      distancia_km: datosForm.distancia_km || null,
    }

    if (editando) {
      const { error } = await supabase
        .from('escuelas')
        .update(payload)
        .eq('id', editando)
      
      if (error) {
        alert('Error: ' + error.message)
        return
      }
      mostrarExito('Escuela actualizada')
    } else {
      const { error } = await supabase
        .from('escuelas')
        .insert([{ ...payload, empresa_id: empresaId, activa: true }])
      
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
          <p className="text-gray-500 text-sm mt-1">{escuelas.length} escuelas activas · Formato INABIE V1-PAE</p>
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
        <div className="bg-white border-2 border-gray-200 rounded-2xl p-5 mb-6 shadow-sm">
          <h4 className="font-bold text-gray-900 mb-5 text-lg">
            {agregando ? '➕ Nueva escuela' : `✏️ Editando: ${editandoEscuela?.nombre}`}
          </h4>

          {/* SECCIÓN 1: Identificación del Centro (AZUL) */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
            <h5 className="font-bold text-blue-900 mb-3 text-sm flex items-center gap-2">
              🏫 Identificación del Centro
            </h5>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-blue-900 mb-1">
                  Nombre del Centro Educativo *
                </label>
                <input
                  type="text"
                  placeholder="Ej: Centro Educativo Padre Adolfo"
                  value={datosForm.nombre}
                  onChange={(e) => actualizarCampo('nombre', e.target.value)}
                  className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1">
                    Código del Centro
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 04377"
                    value={datosForm.codigo_centro}
                    onChange={(e) => actualizarCampo('codigo_centro', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-blue-900 mb-1">
                    Regional / Distrito
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: 09-02"
                    value={datosForm.regional_distrito}
                    onChange={(e) => actualizarCampo('regional_distrito', e.target.value)}
                    className="w-full px-3 py-2 border border-blue-300 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SECCIÓN 2: Ubicación (VERDE) */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
            <h5 className="font-bold text-green-900 mb-3 text-sm flex items-center gap-2">
              📍 Ubicación
            </h5>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-green-900 mb-1">
                    Provincia
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Valverde"
                    value={datosForm.provincia}
                    onChange={(e) => actualizarCampo('provincia', e.target.value)}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-green-900 mb-1">
                    Municipio
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Mao"
                    value={datosForm.municipio}
                    onChange={(e) => actualizarCampo('municipio', e.target.value)}
                    className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-green-900 mb-1">
                  Barrio / Sector
                </label>
                <input
                  type="text"
                  placeholder="Ej: Jícome"
                  value={datosForm.barrio_sector}
                  onChange={(e) => actualizarCampo('barrio_sector', e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-green-900 mb-1">
                  Dirección detallada
                </label>
                <input
                  type="text"
                  placeholder="Ej: Calle Principal #45, frente a la iglesia"
                  value={datosForm.direccion}
                  onChange={(e) => actualizarCampo('direccion', e.target.value)}
                  className="w-full px-3 py-2 border border-green-300 rounded-lg text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 3: Director del Centro (MORADO) */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4 mb-4">
            <h5 className="font-bold text-purple-900 mb-3 text-sm flex items-center gap-2">
              👤 Director del Centro
            </h5>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-purple-900 mb-1">
                  Nombre del Director
                </label>
                <input
                  type="text"
                  placeholder="Ej: Lic. Juan Pérez"
                  value={datosForm.director_nombre}
                  onChange={(e) => actualizarCampo('director_nombre', e.target.value)}
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-purple-900 mb-1">
                  Teléfono del Director
                </label>
                <input
                  type="text"
                  placeholder="Ej: 809-555-1234"
                  value={datosForm.director_telefono}
                  onChange={(e) => actualizarCampo('director_telefono', e.target.value)}
                  className="w-full px-3 py-2 border border-purple-300 rounded-lg text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 4: Contrato PAE (NARANJA) */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
            <h5 className="font-bold text-orange-900 mb-3 text-sm flex items-center gap-2">
              🍽️ Datos del Contrato PAE
            </h5>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-orange-900 mb-1">
                  Raciones contractuales
                </label>
                <input
                  type="number"
                  placeholder="Ej: 250"
                  value={datosForm.raciones_contractuales}
                  onChange={(e) => actualizarCampo('raciones_contractuales', e.target.value)}
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-orange-900 mb-1">
                  Precio por ración (RD$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="Ej: 71"
                  value={datosForm.precio_racion}
                  onChange={(e) => actualizarCampo('precio_racion', e.target.value)}
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-orange-900 mb-1">
                  Distancia (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="Ej: 3.5"
                  value={datosForm.distancia_km}
                  onChange={(e) => actualizarCampo('distancia_km', e.target.value)}
                  className="w-full px-3 py-2 border border-orange-300 rounded-lg text-sm bg-white"
                />
              </div>
            </div>
          </div>

          {/* SECCIÓN 5: Observaciones (GRIS) */}
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4">
            <h5 className="font-bold text-gray-900 mb-3 text-sm flex items-center gap-2">
              📝 Observaciones
            </h5>
            <textarea
              placeholder="Notas adicionales sobre la escuela, horarios, contactos secundarios, etc."
              value={datosForm.observaciones}
              onChange={(e) => actualizarCampo('observaciones', e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white resize-none"
            />
          </div>

          {/* Botones de acción */}
          <div className="flex gap-2 mt-5">
            <button
              onClick={guardar}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-5 py-2 rounded-lg text-sm"
            >
              💾 Guardar
            </button>
            <button
              onClick={cancelar}
              className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-5 py-2 rounded-lg text-sm"
            >
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Lista de escuelas */}
      <div className="space-y-3">
        {escuelas.map(escuela => (
          <div key={escuela.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h4 className="font-bold text-gray-900">{escuela.nombre}</h4>
                  {escuela.codigo_centro && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-mono">
                      Cód: {escuela.codigo_centro}
                    </span>
                  )}
                  {escuela.regional_distrito && (
                    <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded-full font-mono">
                      Reg/Dist: {escuela.regional_distrito}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  📍 {[escuela.barrio_sector, escuela.municipio, escuela.provincia].filter(Boolean).join(', ') || escuela.direccion || 'Sin ubicación'}
                  {escuela.distancia_km && ` · ${escuela.distancia_km} km`}
                </p>
                <div className="flex gap-4 mt-2 text-xs text-gray-700 flex-wrap">
                  <span>👤 {escuela.director_nombre || '—'}</span>
                  <span>📞 {escuela.director_telefono || '—'}</span>
                  <span>🍽️ {escuela.raciones_contractuales || 0} raciones</span>
                  <span>💰 RD$ {escuela.precio_racion || 0}/ración</span>
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