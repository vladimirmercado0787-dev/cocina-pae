import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function Paso2Escuelas({ empresaId }) {
  const [escuelas, setEscuelas] = useState([])
  const [mostrarFormulario, setMostrarFormulario] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  
  const [datos, setDatos] = useState({
    nombre: '',
    direccion: '',
    director_nombre: '',
    director_telefono: '',
    raciones_contractuales: '',
    precio_racion: '51.00',
    distancia_km: '',
    // Nuevos campos INABIE V1-PAE
    codigo_centro: '',
    regional_distrito: '',
    provincia: '',
    municipio: '',
    barrio_sector: ''
  })

  useEffect(() => {
    if (empresaId) cargarEscuelas()
  }, [empresaId])

  async function cargarEscuelas() {
    const { data, error } = await supabase
      .from('escuelas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: true })
    
    if (!error) {
      setEscuelas(data)
    }
  }

  function actualizarCampo(campo, valor) {
    setDatos({ ...datos, [campo]: valor })
  }

  function resetFormulario() {
    setDatos({
      nombre: '',
      direccion: '',
      director_nombre: '',
      director_telefono: '',
      raciones_contractuales: '',
      precio_racion: '51.00',
      distancia_km: '',
      codigo_centro: '',
      regional_distrito: '',
      provincia: '',
      municipio: '',
      barrio_sector: ''
    })
    setMensaje(null)
  }

  async function agregarEscuela(e) {
    e.preventDefault()
    
    if (!datos.nombre || !datos.raciones_contractuales) {
      setMensaje({ tipo: 'error', texto: 'Nombre y raciones son obligatorios' })
      return
    }

    setGuardando(true)
    setMensaje(null)

    try {
      const escuelaParaGuardar = {
        empresa_id: empresaId,
        nombre: datos.nombre,
        direccion: datos.direccion || null,
        director_nombre: datos.director_nombre || null,
        director_telefono: datos.director_telefono || null,
        raciones_contractuales: parseInt(datos.raciones_contractuales),
        precio_racion: parseFloat(datos.precio_racion),
        distancia_km: datos.distancia_km ? parseFloat(datos.distancia_km) : null,
        // Nuevos campos INABIE
        codigo_centro: datos.codigo_centro || null,
        regional_distrito: datos.regional_distrito || null,
        provincia: datos.provincia || null,
        municipio: datos.municipio || null,
        barrio_sector: datos.barrio_sector || null
      }

      const { data, error } = await supabase
        .from('escuelas')
        .insert([escuelaParaGuardar])
        .select()

      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + error.message })
      } else {
        setMensaje({ tipo: 'exito', texto: '✅ Escuela agregada correctamente' })
        resetFormulario()
        setMostrarFormulario(false)
        cargarEscuelas()
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + err.message })
    } finally {
      setGuardando(false)
    }
  }

  async function eliminarEscuela(id) {
    const { error } = await supabase
      .from('escuelas')
      .delete()
      .eq('id', id)
    
    if (!error) {
      cargarEscuelas()
    }
  }

  const totalRaciones = escuelas.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0)
  const facturacionDiaria = escuelas.reduce((sum, e) => sum + ((e.raciones_contractuales || 0) * (parseFloat(e.precio_racion) || 0)), 0)
  const facturacionMensual = facturacionDiaria * 22

  if (!empresaId) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-8 max-w-3xl w-full">
        <p className="text-yellow-800">
          ⚠️ Primero debes registrar tu cocina en el Paso 1
        </p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl w-full">
      
      <div className="mb-6">
        <p className="text-xs text-orange-600 font-semibold tracking-wider mb-1">
          PASO 2 DE 6 · ESTIMADO 5 MIN
        </p>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          🏫 Escuelas
        </h2>
        <p className="text-gray-600">
          Agrega las escuelas que atiende tu cocina con datos completos INABIE
        </p>
      </div>

      {escuelas.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <div className="bg-blue-50 rounded-lg p-4 border border-blue-100">
            <p className="text-xs text-blue-700 font-semibold tracking-wider mb-1">ESCUELAS</p>
            <p className="text-2xl font-bold text-blue-900">{escuelas.length}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-4 border border-green-100">
            <p className="text-xs text-green-700 font-semibold tracking-wider mb-1">RACIONES/DÍA</p>
            <p className="text-2xl font-bold text-green-900">{totalRaciones.toLocaleString()}</p>
          </div>
          <div className="bg-orange-50 rounded-lg p-4 border border-orange-100">
            <p className="text-xs text-orange-700 font-semibold tracking-wider mb-1">FACTURACIÓN/MES</p>
            <p className="text-2xl font-bold text-orange-900">RD$ {(facturacionMensual / 1000).toFixed(0)}K</p>
          </div>
        </div>
      )}

      {escuelas.length > 0 && (
        <div className="space-y-2 mb-6">
          {escuelas.map((escuela, i) => (
            <div key={escuela.id} className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-bold">
                {i + 1}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{escuela.nombre}</p>
                <p className="text-sm text-gray-500">
                  {escuela.raciones_contractuales} raciones × RD$ {escuela.precio_racion}
                  {escuela.director_nombre && ` · ${escuela.director_nombre}`}
                </p>
                {escuela.codigo_centro && (
                  <p className="text-xs text-blue-600 font-mono">
                    🏷️ Cód: {escuela.codigo_centro}
                    {escuela.regional_distrito && ` · Regional: ${escuela.regional_distrito}`}
                  </p>
                )}
              </div>
              <button
                onClick={() => eliminarEscuela(escuela.id)}
                className="text-red-500 hover:text-red-700 px-3 py-1 text-sm"
              >
                Eliminar
              </button>
            </div>
          ))}
        </div>
      )}

      {!mostrarFormulario ? (
        <button
          onClick={() => setMostrarFormulario(true)}
          className="w-full border-2 border-dashed border-blue-400 text-blue-600 hover:bg-blue-50 py-4 rounded-lg font-semibold transition-colors"
        >
          + Agregar escuela
        </button>
      ) : (
        <form onSubmit={agregarEscuela} className="space-y-4 bg-gray-50 p-6 rounded-lg border border-gray-200">
          
          <h3 className="font-semibold text-gray-900 mb-2">Nueva escuela</h3>

          {/* DATOS BÁSICOS */}
          <div>
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-2">📋 DATOS BÁSICOS</p>
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nombre de la escuela <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={datos.nombre}
                onChange={(e) => actualizarCampo('nombre', e.target.value)}
                placeholder="Ej: Escuela San Juan Bautista"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
            </div>
          </div>

          {/* CÓDIGO INABIE - NUEVO */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-700 font-semibold tracking-wider mb-3">🏛️ DATOS OFICIALES INABIE</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Código del Centro
                </label>
                <input
                  type="text"
                  value={datos.codigo_centro}
                  onChange={(e) => actualizarCampo('codigo_centro', e.target.value)}
                  placeholder="Ej: 04377"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Código asignado por INABIE</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Regional/Distrito
                </label>
                <input
                  type="text"
                  value={datos.regional_distrito}
                  onChange={(e) => actualizarCampo('regional_distrito', e.target.value)}
                  placeholder="Ej: 09-02"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white font-mono"
                />
                <p className="text-xs text-gray-500 mt-1">Regional - Distrito</p>
              </div>
            </div>
          </div>

          {/* UBICACIÓN DETALLADA - NUEVO */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-xs text-amber-700 font-semibold tracking-wider mb-3">📍 UBICACIÓN DETALLADA</p>
            
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Provincia
                </label>
                <input
                  type="text"
                  value={datos.provincia}
                  onChange={(e) => actualizarCampo('provincia', e.target.value)}
                  placeholder="Ej: Valverde"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Municipio
                </label>
                <input
                  type="text"
                  value={datos.municipio}
                  onChange={(e) => actualizarCampo('municipio', e.target.value)}
                  placeholder="Ej: Esperanza"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
                />
              </div>
            </div>

            <div className="mb-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Barrio / Sector
              </label>
              <input
                type="text"
                value={datos.barrio_sector}
                onChange={(e) => actualizarCampo('barrio_sector', e.target.value)}
                placeholder="Ej: Barrio Buena Vista / El Bolsillo"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Dirección (calle, número)
              </label>
              <input
                type="text"
                value={datos.direccion}
                onChange={(e) => actualizarCampo('direccion', e.target.value)}
                placeholder="Ej: Calle Primera No. 7"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              />
            </div>
          </div>

          {/* DIRECTOR */}
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs text-purple-700 font-semibold tracking-wider mb-3">👤 DIRECTOR(A) DEL CENTRO</p>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  type="text"
                  value={datos.director_nombre}
                  onChange={(e) => actualizarCampo('director_nombre', e.target.value)}
                  placeholder="Ej: Migdalia Domínguez"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Teléfono
                </label>
                <input
                  type="tel"
                  value={datos.director_telefono}
                  onChange={(e) => actualizarCampo('director_telefono', e.target.value)}
                  placeholder="829-294-6109"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
                />
              </div>
            </div>
          </div>

          {/* CONTRATO */}
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-700 font-semibold tracking-wider mb-3">💰 CONTRATO</p>
            
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Raciones <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={datos.raciones_contractuales}
                  onChange={(e) => actualizarCampo('raciones_contractuales', e.target.value)}
                  placeholder="350"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Precio/ración
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={datos.precio_racion}
                  onChange={(e) => actualizarCampo('precio_racion', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Distancia (km)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={datos.distancia_km}
                  onChange={(e) => actualizarCampo('distancia_km', e.target.value)}
                  placeholder="4.5"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                />
              </div>
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
              className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={guardando}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-2 px-4 rounded-lg transition-colors"
            >
              {guardando ? 'Guardando...' : 'Agregar escuela'}
            </button>
          </div>
        </form>
      )}

    </div>
  )
}

export default Paso2Escuelas