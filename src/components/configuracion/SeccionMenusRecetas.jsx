import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const DIAS = [
  { id: 'lunes',     label: 'Lunes' },
  { id: 'martes',    label: 'Martes' },
  { id: 'miercoles', label: 'Miércoles' },
  { id: 'jueves',    label: 'Jueves' },
  { id: 'viernes',   label: 'Viernes' },
  { id: 'extra',     label: 'Extra' },
]

const EMOJIS_COMIDA = ['🍗', '🫘', '🍲', '🍝', '🍚', '🥘', '🍛', '🥣', '🍖', '🥗', '🍤', '🍳']

function SeccionMenusRecetas({ empresaId, mostrarExito }) {
  const [recetas, setRecetas] = useState([])
  const [ingredientesCatalogo, setIngredientesCatalogo] = useState([])
  const [ingredientesReceta, setIngredientesReceta] = useState([]) // ingredientes asociados a la receta editada
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [datosForm, setDatosForm] = useState({
    nombre: '',
    emoji: '🍗',
    dia_semana: 'lunes',
    popularidad: 'normal',
    tiempo_preparacion_min: 120,
    personas_requeridas: 2,
    nivel_complejidad: 'normal',
    preparacion_dia_anterior: false,
    notas_operativas: '',
  })

  // Para añadir ingrediente a la receta
  const [busquedaIng, setBusquedaIng] = useState('')
  const [ingSeleccionadoId, setIngSeleccionadoId] = useState('')
  const [cantidadCrudoRacion, setCantidadCrudoRacion] = useState('')
  const [unidadIng, setUnidadIng] = useState('lb')
  const [notasIng, setNotasIng] = useState('')

  useEffect(() => {
    cargarTodo()
  }, [empresaId])

  async function cargarTodo() {
    setCargando(true)
    
    const { data: recetasData } = await supabase
      .from('recetas')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activa', true)
    setRecetas(recetasData || [])
    
    const { data: ingsData } = await supabase
      .from('ingredientes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('nombre')
    setIngredientesCatalogo(ingsData || [])
    
    setCargando(false)
  }

  async function cargarIngredientesDeReceta(recetaId) {
    const { data } = await supabase
      .from('recetas_ingredientes')
      .select('*, ingredientes(*)')
      .eq('receta_id', recetaId)
    setIngredientesReceta(data || [])
  }

  function iniciarEdicion(receta) {
    setEditando(receta.id)
    setAgregando(false)
    setDatosForm({
      nombre: receta.nombre || '',
      emoji: receta.emoji || '🍗',
      dia_semana: receta.dia_semana || 'lunes',
      popularidad: receta.popularidad || 'normal',
      tiempo_preparacion_min: receta.tiempo_preparacion_min || 120,
      personas_requeridas: receta.personas_requeridas || 2,
      nivel_complejidad: receta.nivel_complejidad || 'normal',
      preparacion_dia_anterior: receta.preparacion_dia_anterior || false,
      notas_operativas: receta.notas_operativas || '',
    })
    cargarIngredientesDeReceta(receta.id)
    resetearFormIng()
  }

  function iniciarAgregado() {
    setAgregando(true)
    setEditando(null)
    setIngredientesReceta([])
    setDatosForm({
      nombre: '',
      emoji: '🍗',
      dia_semana: 'lunes',
      popularidad: 'normal',
      tiempo_preparacion_min: 120,
      personas_requeridas: 2,
      nivel_complejidad: 'normal',
      preparacion_dia_anterior: false,
      notas_operativas: '',
    })
    resetearFormIng()
  }

  function cancelar() {
    setEditando(null)
    setAgregando(false)
    setIngredientesReceta([])
  }

  function resetearFormIng() {
    setBusquedaIng('')
    setIngSeleccionadoId('')
    setCantidadCrudoRacion('')
    setUnidadIng('lb')
    setNotasIng('')
  }

  async function guardarReceta() {
    if (!datosForm.nombre.trim()) {
      alert('El nombre es obligatorio')
      return
    }

    if (editando) {
      const { error } = await supabase
        .from('recetas')
        .update(datosForm)
        .eq('id', editando)
      if (error) { alert('Error: ' + error.message); return }
      mostrarExito('Receta actualizada')
      cancelar()
      cargarTodo()
    } else {
      const { data, error } = await supabase
        .from('recetas')
        .insert([{ ...datosForm, empresa_id: empresaId, activa: true }])
        .select()
      if (error) { alert('Error: ' + error.message); return }
      
      // Si quedaron ingredientes pendientes, asociarlos a la nueva receta
      if (data && data[0] && ingredientesReceta.length > 0) {
        // Aquí podríamos asociar los ingredientes pendientes,
        // pero como recién creamos, mejor el flujo es: crear receta → editar → añadir ings
      }
      
      mostrarExito('Receta agregada. Ahora edítala para agregar ingredientes.')
      cancelar()
      cargarTodo()
    }
  }

  async function agregarIngredienteAReceta() {
    if (!editando) {
      alert('Primero guarda la receta, luego edita para agregar ingredientes')
      return
    }
    if (!ingSeleccionadoId) {
      alert('Selecciona un ingrediente')
      return
    }
    if (!cantidadCrudoRacion || parseFloat(cantidadCrudoRacion) <= 0) {
      alert('Ingresa una cantidad válida')
      return
    }

    // Verificar si ya está asociado
    const yaExiste = ingredientesReceta.some(ri => ri.ingrediente_id === ingSeleccionadoId)
    if (yaExiste) {
      alert('Este ingrediente ya está asociado a la receta')
      return
    }

    const { error } = await supabase
      .from('recetas_ingredientes')
      .insert([{
        receta_id: editando,
        ingrediente_id: ingSeleccionadoId,
        cantidad_crudo_por_racion: parseFloat(cantidadCrudoRacion),
        unidad: unidadIng,
        notas: notasIng,
      }])

    if (error) { alert('Error: ' + error.message); return }
    
    mostrarExito('Ingrediente añadido a la receta')
    cargarIngredientesDeReceta(editando)
    resetearFormIng()
  }

  async function quitarIngredienteDeReceta(ri) {
    if (!confirm(`¿Quitar "${ri.ingredientes?.nombre}" de la receta?`)) return
    
    await supabase
      .from('recetas_ingredientes')
      .delete()
      .eq('id', ri.id)
    
    mostrarExito('Ingrediente quitado')
    cargarIngredientesDeReceta(editando)
  }

  async function desactivarReceta(receta) {
    if (!confirm(`¿Quitar "${receta.nombre}" del menú?`)) return
    
    await supabase
      .from('recetas')
      .update({ activa: false })
      .eq('id', receta.id)
    
    mostrarExito('Receta quitada')
    cargarTodo()
  }

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando menús...</div>
  }

  const recetaEditando = editando ? recetas.find(r => r.id === editando) : null

  // Filtrar catálogo de ingredientes según búsqueda
  const ingredientesFiltrados = ingredientesCatalogo.filter(ing => {
    const yaAsociado = ingredientesReceta.some(ri => ri.ingrediente_id === ing.id)
    if (yaAsociado) return false
    if (!busquedaIng) return true
    return ing.nombre.toLowerCase().includes(busquedaIng.toLowerCase())
  })

  // Cálculos automáticos para la receta editada
  const costoTotalRacion = ingredientesReceta.reduce((sum, ri) => {
    const ing = ri.ingredientes
    if (!ing) return sum
    return sum + (parseFloat(ri.cantidad_crudo_por_racion) * parseFloat(ing.precio_unitario || 0))
  }, 0)

  const pesoCrudoTotalRacion = ingredientesReceta.reduce((sum, ri) => {
    return sum + parseFloat(ri.cantidad_crudo_por_racion || 0)
  }, 0)

  const pesoCocidoEstimadoRacion = ingredientesReceta.reduce((sum, ri) => {
    const ing = ri.ingredientes
    if (!ing) return sum
    const factor = parseFloat(ing.factor_rendimiento || 1)
    return sum + (parseFloat(ri.cantidad_crudo_por_racion) * factor)
  }, 0)

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">🍽️ Menús y Recetas</h3>
          <p className="text-gray-500 text-sm mt-1">{recetas.length} recetas activas</p>
        </div>
        {!agregando && !editando && (
          <button
            onClick={iniciarAgregado}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl text-sm"
          >
            ➕ Agregar receta
          </button>
        )}
      </div>

      {/* Formulario */}
      {(agregando || editando) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h4 className="font-bold text-blue-900 mb-4">
            {agregando ? '➕ Nueva receta' : `✏️ Editando: ${recetaEditando?.nombre}`}
          </h4>
          
          <div className="space-y-3">
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Emoji</label>
                <select
                  value={datosForm.emoji}
                  onChange={(e) => setDatosForm({...datosForm, emoji: e.target.value})}
                  className="w-full px-2 py-2 border border-gray-300 rounded-lg text-2xl text-center"
                >
                  {EMOJIS_COMIDA.map(e => (
                    <option key={e} value={e}>{e}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-3">
                <label className="block text-xs font-semibold text-gray-600 mb-1">Nombre del plato</label>
                <input
                  type="text"
                  placeholder="Ej: Locrio de pollo"
                  value={datosForm.nombre}
                  onChange={(e) => setDatosForm({...datosForm, nombre: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Día de la semana</label>
              <div className="grid grid-cols-6 gap-2">
                {DIAS.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setDatosForm({...datosForm, dia_semana: d.id})}
                    className={`p-2 rounded-lg border-2 text-xs font-semibold transition-colors ${
                      datosForm.dia_semana === d.id
                        ? 'border-blue-500 bg-blue-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tiempo (min)</label>
                <input
                  type="number"
                  value={datosForm.tiempo_preparacion_min}
                  onChange={(e) => setDatosForm({...datosForm, tiempo_preparacion_min: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Personas</label>
                <input
                  type="number"
                  value={datosForm.personas_requeridas}
                  onChange={(e) => setDatosForm({...datosForm, personas_requeridas: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Complejidad</label>
                <select
                  value={datosForm.nivel_complejidad}
                  onChange={(e) => setDatosForm({...datosForm, nivel_complejidad: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="facil">Fácil</option>
                  <option value="normal">Normal</option>
                  <option value="complicado">Complicado</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Popularidad</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'alta',   label: '⭐ Favorito' },
                  { id: 'normal', label: '👍 Normal' },
                  { id: 'baja',   label: '⚠️ Suele sobrar' },
                ].map(p => (
                  <button
                    key={p.id}
                    onClick={() => setDatosForm({...datosForm, popularidad: p.id})}
                    className={`p-2 rounded-lg border-2 text-xs font-semibold transition-colors ${
                      datosForm.popularidad === p.id
                        ? 'border-blue-500 bg-blue-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={datosForm.preparacion_dia_anterior}
                onChange={(e) => setDatosForm({...datosForm, preparacion_dia_anterior: e.target.checked})}
                className="w-4 h-4"
              />
              <span className="text-sm">Requiere preparación el día anterior</span>
            </label>

            <textarea
              placeholder="Notas operativas (opcional)"
              value={datosForm.notas_operativas}
              onChange={(e) => setDatosForm({...datosForm, notas_operativas: e.target.value})}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          </div>

          {/* ════════════════════════════════════════════════ */}
          {/* PANEL DE INGREDIENTES (solo al editar receta) */}
          {/* ════════════════════════════════════════════════ */}
          {editando && (
            <div className="mt-6 pt-6 border-t-2 border-blue-300">
              <h5 className="font-bold text-blue-900 mb-3">🥕 INGREDIENTES DE LA RECETA</h5>
              
              {/* Tarjetas de cálculos automáticos */}
              {ingredientesReceta.length > 0 && (
                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-green-700 font-semibold tracking-wider">COSTO/RACIÓN</p>
                    <p className="text-xl font-bold text-green-900 mt-1">
                      RD$ {costoTotalRacion.toFixed(2)}
                    </p>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-blue-700 font-semibold tracking-wider">PESO CRUDO</p>
                    <p className="text-xl font-bold text-blue-900 mt-1">
                      {pesoCrudoTotalRacion.toFixed(3)} lb
                    </p>
                    <p className="text-xs text-blue-600">por ración</p>
                  </div>
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                    <p className="text-xs text-orange-700 font-semibold tracking-wider">PESO COCIDO</p>
                    <p className="text-xl font-bold text-orange-900 mt-1">
                      {pesoCocidoEstimadoRacion.toFixed(3)} lb
                    </p>
                    <p className="text-xs text-orange-600">estimado</p>
                  </div>
                </div>
              )}

              {/* Lista de ingredientes asociados */}
              {ingredientesReceta.length === 0 ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4 text-center">
                  <p className="text-sm text-yellow-900">
                    Esta receta aún no tiene ingredientes. Agrega los principales abajo.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 mb-4">
                  {ingredientesReceta.map(ri => {
                    const ing = ri.ingredientes
                    if (!ing) return null
                    const cantidadCrudo = parseFloat(ri.cantidad_crudo_por_racion)
                    const factor = parseFloat(ing.factor_rendimiento || 1)
                    const cantidadCocida = cantidadCrudo * factor
                    const costoLinea = cantidadCrudo * parseFloat(ing.precio_unitario || 0)
                    
                    return (
                      <div key={ri.id} className="bg-white border border-gray-200 rounded-lg p-3 flex justify-between items-center">
                        <div className="flex-1">
                          <p className="font-bold text-gray-900 text-sm">{ing.nombre}</p>
                          <div className="flex gap-3 text-xs text-gray-500 mt-1 flex-wrap">
                            <span><strong>{cantidadCrudo}</strong> {ri.unidad} crudo/ración</span>
                            <span>→ {cantidadCocida.toFixed(3)} {ri.unidad} cocido</span>
                            <span className="text-green-700">RD$ {costoLinea.toFixed(2)}/ración</span>
                            {ri.notas && <span className="text-gray-400 italic">"{ri.notas}"</span>}
                          </div>
                        </div>
                        <button
                          onClick={() => quitarIngredienteDeReceta(ri)}
                          className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1 rounded-lg ml-2"
                        >
                          🗑️
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Formulario para añadir ingrediente */}
              <div className="bg-white border-2 border-dashed border-blue-300 rounded-xl p-3">
                <p className="text-xs font-semibold text-blue-900 mb-2">➕ AÑADIR INGREDIENTE</p>
                
                <div className="space-y-2">
                  {/* Búsqueda */}
                  <input
                    type="text"
                    placeholder="🔍 Buscar ingrediente..."
                    value={busquedaIng}
                    onChange={(e) => setBusquedaIng(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />

                  {/* Selector */}
                  <select
                    value={ingSeleccionadoId}
                    onChange={(e) => {
                      setIngSeleccionadoId(e.target.value)
                      const ing = ingredientesCatalogo.find(i => i.id === e.target.value)
                      if (ing) setUnidadIng(ing.unidad_compra || 'lb')
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    <option value="">-- Selecciona ingrediente --</option>
                    {ingredientesFiltrados.map(ing => (
                      <option key={ing.id} value={ing.id}>
                        {ing.nombre} ({ing.unidad_compra}) · Factor {ing.factor_rendimiento}x · RD$ {ing.precio_unitario}
                      </option>
                    ))}
                  </select>

                  {ingredientesFiltrados.length === 0 && busquedaIng && (
                    <p className="text-xs text-gray-500 italic">No se encontraron ingredientes con ese nombre</p>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">CANTIDAD/RACIÓN</label>
                      <input
                        type="number"
                        step="0.0001"
                        placeholder="0.25"
                        value={cantidadCrudoRacion}
                        onChange={(e) => setCantidadCrudoRacion(e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">UNIDAD</label>
                      <select
                        value={unidadIng}
                        onChange={(e) => setUnidadIng(e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        <option value="lb">lb</option>
                        <option value="kg">kg</option>
                        <option value="oz">oz</option>
                        <option value="unidad">unidad</option>
                        <option value="galon">galón</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">NOTAS</label>
                      <input
                        type="text"
                        placeholder="picado, deshuesado..."
                        value={notasIng}
                        onChange={(e) => setNotasIng(e.target.value)}
                        className="w-full px-2 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                  </div>

                  <button
                    onClick={agregarIngredienteAReceta}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 rounded-lg text-sm"
                  >
                    ➕ Añadir a la receta
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje si está agregando (todavía no se puede añadir ings) */}
          {agregando && (
            <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-xs text-yellow-900">
              💡 Primero guarda la receta. Luego edítala para agregar ingredientes.
            </div>
          )}

          <div className="flex gap-2 mt-4">
            <button
              onClick={guardarReceta}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2 rounded-lg text-sm"
            >
              💾 Guardar receta
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

      {/* Lista organizada por día */}
      <div className="space-y-3">
        {DIAS.map(dia => {
          const recetasDia = recetas.filter(r => r.dia_semana === dia.id)
          if (recetasDia.length === 0) return null
          
          return (
            <div key={dia.id}>
              <p className="text-xs text-gray-500 font-semibold tracking-wider mb-2">
                {dia.label.toUpperCase()}
              </p>
              {recetasDia.map(r => (
                <div key={r.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-2">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-3 flex-1">
                      <span className="text-3xl">{r.emoji}</span>
                      <div>
                        <p className="font-bold text-gray-900 text-sm">{r.nombre}</p>
                        <div className="flex gap-3 text-xs text-gray-500 mt-1">
                          <span>⏱️ {r.tiempo_preparacion_min}min</span>
                          <span>👥 {r.personas_requeridas}</span>
                          <span className="capitalize">📊 {r.nivel_complejidad}</span>
                          {r.popularidad === 'baja' && <span className="text-orange-600">⚠️ suele sobrar</span>}
                          {r.popularidad === 'alta' && <span className="text-green-600">⭐ favorito</span>}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => iniciarEdicion(r)}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1 rounded-lg"
                      >
                        ✏️ Editar
                      </button>
                      <button
                        onClick={() => desactivarReceta(r)}
                        className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1 rounded-lg"
                      >
                        🗑️ Quitar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default SeccionMenusRecetas