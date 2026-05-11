import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const CATEGORIAS = [
  { id: 'cereales',   emoji: '🌾', label: 'Cereales' },
  { id: 'proteinas',  emoji: '🍗', label: 'Proteínas' },
  { id: 'vegetales',  emoji: '🥬', label: 'Vegetales' },
  { id: 'sazones',    emoji: '🧂', label: 'Sazones' },
  { id: 'aceites',    emoji: '🫒', label: 'Aceites/grasas' },
  { id: 'otros',      emoji: '📦', label: 'Otros' },
]

const NIVELES = [
  { id: 'principal',  emoji: '⚖️', label: 'Principal',  desc: 'Se pesa siempre' },
  { id: 'sazonador',  emoji: '📏', label: 'Sazonador',  desc: 'Se estima' },
  { id: 'condimento', emoji: '🤏', label: 'Condimento', desc: 'Al gusto' },
]

const UNIDADES = ['lb', 'kg', 'oz', 'unidad', 'galon']

// Factores de rendimiento sugeridos (mezcla teórica + ajuste con datos)
const FACTORES_SUGERIDOS = {
  'arroz':         3.0,
  'arroz blanco':  3.0,
  'habichuela':    2.5,
  'habichuelas':   2.5,
  'frijol':        2.5,
  'pollo':         0.7,
  'pollo deshuesado': 0.7,
  'carne':         0.75,
  'carne molida':  0.75,
  'res':           0.75,
  'cerdo':         0.7,
  'pescado':       0.85,
  'sardina':       1.0,
  'espagueti':     3.0,
  'pasta':         3.0,
  'fideo':         3.0,
  'plátano':       0.95,
  'platano':       0.95,
  'papa':          0.95,
  'yuca':          0.9,
  'cebolla':       0.9,
  'pimiento':      0.9,
  'ajo':           1.0,
  'aceite':        1.0,
  'sal':           1.0,
  'orégano':       1.0,
  'oregano':       1.0,
}

function SeccionIngredientes({ empresaId, mostrarExito }) {
  const [ingredientes, setIngredientes] = useState([])
  const [proveedores, setProveedores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editando, setEditando] = useState(null)
  const [agregando, setAgregando] = useState(false)
  const [filtroCategoria, setFiltroCategoria] = useState('todos')
  const [datosForm, setDatosForm] = useState({
    nombre: '',
    categoria: 'cereales',
    unidad_compra: 'lb',
    factor_rendimiento: 1.0,
    precio_unitario: 0,
    proveedor_id: '',
    nivel_importancia: 'principal',
    notas: '',
  })

  useEffect(() => {
    cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)
    
    const { data: ingsData } = await supabase
      .from('ingredientes')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .order('nombre')
    setIngredientes(ingsData || [])
    
    const { data: provData } = await supabase
      .from('proveedores')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
    setProveedores(provData || [])
    
    setCargando(false)
  }

  function sugerirFactor(nombre) {
    const nombreLower = nombre.toLowerCase().trim()
    
    // Búsqueda exacta primero
    if (FACTORES_SUGERIDOS[nombreLower]) {
      return FACTORES_SUGERIDOS[nombreLower]
    }
    
    // Búsqueda parcial
    for (const [key, valor] of Object.entries(FACTORES_SUGERIDOS)) {
      if (nombreLower.includes(key) || key.includes(nombreLower)) {
        return valor
      }
    }
    
    return 1.0
  }

  function actualizarNombre(nombre) {
    const factorSugerido = sugerirFactor(nombre)
    setDatosForm({
      ...datosForm,
      nombre: nombre,
      factor_rendimiento: factorSugerido,
    })
  }

  function iniciarEdicion(ing) {
    setEditando(ing.id)
    setAgregando(false)
    setDatosForm({
      nombre: ing.nombre || '',
      categoria: ing.categoria || 'cereales',
      unidad_compra: ing.unidad_compra || 'lb',
      factor_rendimiento: ing.factor_rendimiento || 1.0,
      precio_unitario: ing.precio_unitario || 0,
      proveedor_id: ing.proveedor_id || '',
      nivel_importancia: ing.nivel_importancia || 'principal',
      notas: ing.notas || '',
    })
  }

  function iniciarAgregado() {
    setAgregando(true)
    setEditando(null)
    setDatosForm({
      nombre: '',
      categoria: 'cereales',
      unidad_compra: 'lb',
      factor_rendimiento: 1.0,
      precio_unitario: 0,
      proveedor_id: '',
      nivel_importancia: 'principal',
      notas: '',
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

    // Convertir proveedor_id vacío a null
    const datosLimpios = {
      ...datosForm,
      proveedor_id: datosForm.proveedor_id || null,
      factor_rendimiento: parseFloat(datosForm.factor_rendimiento) || 1.0,
      precio_unitario: parseFloat(datosForm.precio_unitario) || 0,
    }

    if (editando) {
      const { error } = await supabase
        .from('ingredientes')
        .update(datosLimpios)
        .eq('id', editando)
      if (error) { alert('Error: ' + error.message); return }
      mostrarExito('Ingrediente actualizado')
    } else {
      const { error } = await supabase
        .from('ingredientes')
        .insert([{ ...datosLimpios, empresa_id: empresaId, activo: true }])
      if (error) { alert('Error: ' + error.message); return }
      mostrarExito('Ingrediente agregado')
    }

    cancelar()
    cargarDatos()
  }

  async function desactivar(ing) {
    if (!confirm(`¿Quitar "${ing.nombre}" del catálogo?`)) return
    
    await supabase
      .from('ingredientes')
      .update({ activo: false })
      .eq('id', ing.id)
    
    mostrarExito('Ingrediente quitado')
    cargarDatos()
  }

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando ingredientes...</div>
  }

  // Filtrar
  const ingredientesFiltrados = filtroCategoria === 'todos'
    ? ingredientes
    : ingredientes.filter(i => i.categoria === filtroCategoria)

  // Agrupar por categoría para mostrar
  const ingredientesPorCategoria = {}
  ingredientesFiltrados.forEach(ing => {
    const cat = ing.categoria || 'otros'
    if (!ingredientesPorCategoria[cat]) ingredientesPorCategoria[cat] = []
    ingredientesPorCategoria[cat].push(ing)
  })

  const ingredienteEditando = editando ? ingredientes.find(i => i.id === editando) : null

  return (
    <div>
      <div className="mb-6 flex justify-between items-start">
        <div>
          <h3 className="text-2xl font-bold text-gray-900">🥕 Ingredientes</h3>
          <p className="text-gray-500 text-sm mt-1">{ingredientes.length} ingredientes activos</p>
        </div>
        {!agregando && !editando && (
          <button
            onClick={iniciarAgregado}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl text-sm"
          >
            ➕ Agregar ingrediente
          </button>
        )}
      </div>

      {/* Filtros */}
      {!agregando && !editando && ingredientes.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
          <button
            onClick={() => setFiltroCategoria('todos')}
            className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
              filtroCategoria === 'todos'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Todos
          </button>
          {CATEGORIAS.map(cat => (
            <button
              key={cat.id}
              onClick={() => setFiltroCategoria(cat.id)}
              className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${
                filtroCategoria === cat.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {cat.emoji} {cat.label}
            </button>
          ))}
        </div>
      )}

      {/* Formulario */}
      {(agregando || editando) && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
          <h4 className="font-bold text-blue-900 mb-4">
            {agregando ? '➕ Nuevo ingrediente' : `✏️ Editando: ${ingredienteEditando?.nombre}`}
          </h4>
          
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">NOMBRE</label>
              <input
                type="text"
                placeholder="Ej: Arroz blanco, Pollo deshuesado"
                value={datosForm.nombre}
                onChange={(e) => actualizarNombre(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">CATEGORÍA</label>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
                {CATEGORIAS.map(cat => (
                  <button
                    key={cat.id}
                    onClick={() => setDatosForm({...datosForm, categoria: cat.id})}
                    className={`p-2 rounded-lg border-2 text-xs font-semibold transition-colors ${
                      datosForm.categoria === cat.id
                        ? 'border-blue-500 bg-blue-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-lg">{cat.emoji}</div>
                    <div>{cat.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">NIVEL DE IMPORTANCIA</label>
              <div className="grid grid-cols-3 gap-2">
                {NIVELES.map(n => (
                  <button
                    key={n.id}
                    onClick={() => setDatosForm({...datosForm, nivel_importancia: n.id})}
                    className={`p-3 rounded-lg border-2 text-left transition-colors ${
                      datosForm.nivel_importancia === n.id
                        ? 'border-blue-500 bg-blue-100'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <div className="text-xs font-bold">{n.emoji} {n.label}</div>
                    <div className="text-xs text-gray-500 mt-1">{n.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">UNIDAD COMPRA</label>
                <select
                  value={datosForm.unidad_compra}
                  onChange={(e) => setDatosForm({...datosForm, unidad_compra: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  {UNIDADES.map(u => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">PRECIO POR UNIDAD (RD$)</label>
                <input
                  type="number"
                  step="0.01"
                  value={datosForm.precio_unitario}
                  onChange={(e) => setDatosForm({...datosForm, precio_unitario: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">FACTOR RENDIMIENTO</label>
                <input
                  type="number"
                  step="0.05"
                  value={datosForm.factor_rendimiento}
                  onChange={(e) => setDatosForm({...datosForm, factor_rendimiento: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                />
              </div>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-900">
              💡 <strong>Factor de rendimiento:</strong> cuánto cambia el peso al cocinarse.
              Ej: 1 lb de arroz crudo → 3 lb cocido (factor 3.0).
              1 lb de pollo crudo → 0.7 lb cocido (factor 0.7).
              {datosForm.factor_rendimiento != 1.0 && (
                <span className="block mt-1 font-semibold">
                  Sugerencia auto: {datosForm.factor_rendimiento}x (puedes ajustar)
                </span>
              )}
            </div>

            {proveedores.length > 0 && (
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">PROVEEDOR (opcional)</label>
                <select
                  value={datosForm.proveedor_id}
                  onChange={(e) => setDatosForm({...datosForm, proveedor_id: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                >
                  <option value="">Sin proveedor asignado</option>
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.nombre}</option>
                  ))}
                </select>
              </div>
            )}

            <textarea
              placeholder="Notas (opcional)"
              value={datosForm.notas}
              onChange={(e) => setDatosForm({...datosForm, notas: e.target.value})}
              rows={2}
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

      {/* Lista agrupada por categoría */}
      {ingredientes.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <div className="text-5xl mb-4">🥕</div>
          <h4 className="font-bold text-gray-700">No hay ingredientes aún</h4>
          <p className="text-sm text-gray-500 mt-2">
            Agrega los ingredientes principales que usas en tus recetas.
          </p>
          <p className="text-xs text-gray-400 mt-2">
            Ejemplos: Arroz, Pollo, Habichuelas, Aceite, Cebolla...
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(ingredientesPorCategoria).map(([catId, items]) => {
            const cat = CATEGORIAS.find(c => c.id === catId) || CATEGORIAS[5]
            return (
              <div key={catId}>
                <p className="text-xs text-gray-500 font-semibold tracking-wider mb-2">
                  {cat.emoji} {cat.label.toUpperCase()} ({items.length})
                </p>
                <div className="space-y-2">
                  {items.map(ing => {
                    const nivel = NIVELES.find(n => n.id === ing.nivel_importancia) || NIVELES[0]
                    return (
                      <div key={ing.id} className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                        <div className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <p className="font-bold text-gray-900 text-sm">{ing.nombre}</p>
                              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                                {nivel.emoji} {nivel.label}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mt-1">
                              <span>📦 {ing.unidad_compra}</span>
                              <span>💰 RD$ {parseFloat(ing.precio_unitario || 0).toFixed(2)}/{ing.unidad_compra}</span>
                              <span>⚖️ Factor: {parseFloat(ing.factor_rendimiento || 1).toFixed(2)}x</span>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => iniciarEdicion(ing)}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold px-3 py-1 rounded-lg"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={() => desactivar(ing)}
                              className="bg-red-100 hover:bg-red-200 text-red-700 text-xs font-semibold px-3 py-1 rounded-lg"
                            >
                              🗑️
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default SeccionIngredientes