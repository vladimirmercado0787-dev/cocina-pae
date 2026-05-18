// src/components/despachador/ModalPesarYDespachar.jsx
// Modal "Pesar y Despachar" — Cocina PAE
// Fusión: cocido por escuela + despacho + generación de conduce
// Filosofía: "La matemática no puede fallar" + "Si no pesas, asume sugerencia"

import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { calcularSugerenciasCocidoPorEscuela, redondear } from '../../utils/calculosInteligencia'
import { registrar, TIPOS_ACCION } from '../../utils/historial'

export default function ModalPesarYDespachar({
  operacion,           // operación del día (la escuela específica)
  empresaId,
  usuario,
  onCerrar,
  onDespachado,
}) {
  const [escuela, setEscuela] = useState(null)
  const [recetaDelDia, setRecetaDelDia] = useState(null)
  const [racionesDiaTotal, setRacionesDiaTotal] = useState(0)
  const [crudoAprobadoTotal, setCrudoAprobadoTotal] = useState(0)
  const [componentes, setComponentes] = useState([])  // con sugerencia + valor editable
  const [notas, setNotas] = useState('')
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (operacion) cargarDatosYSugerencias()
  }, [operacion?.id])

  async function cargarDatosYSugerencias() {
    try {
      setCargando(true)
      setError(null)

      const fechaHoy = new Date().toISOString().split('T')[0]

      // 1. Cargar info de la escuela
      const { data: escuelaData, error: errEsc } = await supabase
        .from('escuelas')
        .select('*')
        .eq('id', operacion.escuela_id)
        .single()
      if (errEsc) throw errEsc
      setEscuela(escuelaData)

      // 2. Detectar receta del día (lunes-viernes auto, sábado/domingo manual)
      const diasSemana = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado']
      const hoy = new Date()
      const diaSemana = diasSemana[hoy.getDay()]

      const { data: recetas, error: errRec } = await supabase
        .from('recetas')
        .select('id, nombre, emoji, dia_semana')
        .eq('empresa_id', empresaId)
        .eq('activa', true)

      if (errRec) throw errRec
      if (!recetas || recetas.length === 0) {
        throw new Error('No hay recetas activas configuradas')
      }

      let receta = recetas.find(r => r.dia_semana === diaSemana)
      if (!receta) receta = recetas[0]  // fallback fin de semana
      setRecetaDelDia(receta)

      // 3. Calcular raciones totales del día (excluye sin_clase)
      const { data: opsHoy, error: errOps } = await supabase
        .from('operaciones_dia')
        .select('raciones_planificadas, estado')
        .eq('empresa_id', empresaId)
        .eq('fecha', fechaHoy)
        .neq('estado', 'sin_clase')

      if (errOps) throw errOps
      const totalRaciones = (opsHoy || []).reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
      setRacionesDiaTotal(totalRaciones)

      // 4. Calcular crudo aprobado total del día (para mostrar contexto)
      const { data: movs, error: errMov } = await supabase
        .from('movimientos_inventario')
        .select('cantidad')
        .eq('empresa_id', empresaId)
        .eq('fecha', fechaHoy)
        .eq('origen', 'consumo_operacion')

      if (errMov) throw errMov
      const crudoTotal = (movs || []).reduce((sum, m) => sum + Number(m.cantidad), 0)
      setCrudoAprobadoTotal(crudoTotal)

      // 5. Calcular sugerencias por componente usando el cerebro inteligente
      const resultado = await calcularSugerenciasCocidoPorEscuela({
        empresaId,
        escuelaId: operacion.escuela_id,
        racionesEscuela: operacion.raciones_planificadas,
        racionesDiaTotal: totalRaciones,
        recetaId: receta.id,
        fecha: fechaHoy,
      })

      if (resultado.error) throw new Error(resultado.error)

      // 6. Preparar lista de componentes con valor real editable (precargado con sugerencia)
      const lista = resultado.sugerencias.map(s => ({
        ...s,
        peso_real: s.peso_cocido_sugerido,  // default: igual a la sugerencia
        fue_pesado: false,                   // si toca el input → true
      }))

      setComponentes(lista)
    } catch (err) {
      console.error('Error cargando sugerencias:', err)
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function editarPesoReal(componenteId, valorNuevo) {
    const valor = parseFloat(valorNuevo) || 0
    setComponentes(prev => prev.map(c =>
      c.componente_id === componenteId
        ? { ...c, peso_real: valor, fue_pesado: true }
        : c
    ))
  }

  function resetearSugerencia(componenteId) {
    setComponentes(prev => prev.map(c =>
      c.componente_id === componenteId
        ? { ...c, peso_real: c.peso_cocido_sugerido, fue_pesado: false }
        : c
    ))
  }

  async function guardarYDespachar() {
    if (componentes.length === 0) {
      alert('No hay componentes para despachar')
      return
    }

    // Validar que todos los pesos sean positivos
    const algunoEnCero = componentes.some(c => c.peso_real <= 0)
    if (algunoEnCero) {
      const confirmar = window.confirm(
        '⚠️ Hay componentes con peso 0.\n\n¿Continuar de todas formas?'
      )
      if (!confirmar) return
    }

    setProcesando(true)
    setError(null)

    try {
      const fechaHoy = new Date().toISOString().split('T')[0]
      const ahora = new Date().toISOString()

      // 1. INSERT en despachos_componente (uno por cada componente)
      const filas = componentes.map(c => ({
        empresa_id: empresaId,
        fecha: fechaHoy,
        operacion_dia_id: operacion.id,
        escuela_id: operacion.escuela_id,
        raciones_escuela: operacion.raciones_planificadas,
        componente_id: c.componente_id,
        peso_cocido_sugerido: c.peso_cocido_sugerido,
        peso_cocido_real: c.peso_real,
        fue_pesado_real: c.fue_pesado,
        hora_despacho: ahora,
        despachador_id: usuario.id,
        peso_sobrante: 0,
        fue_pesado_sobrante_real: false,
        crudo_aprobado_dia: crudoAprobadoTotal,
        factor_rendimiento_usado: c.factor_rendimiento_usado,
        raciones_dia_total: racionesDiaTotal,
        notas: notas.trim() || null,
      }))

      const { error: errInsert } = await supabase
        .from('despachos_componente')
        .insert(filas)

      if (errInsert) throw errInsert

      // 2. UPDATE operacion_dia: estado a 'despachando' y peso total cocido
      const pesoTotalCocidoLb = componentes.reduce((sum, c) => sum + (c.peso_real || 0), 0)
      
      const { error: errUpdate } = await supabase
        .from('operaciones_dia')
        .update({
          estado: 'despachando',
          peso_cocido_lb: redondear(pesoTotalCocidoLb, 2),
          notas_pesaje_cocido: notas.trim() || null,
          hora_salida: ahora,
          updated_at: ahora,
        })
        .eq('id', operacion.id)

      if (errUpdate) throw errUpdate

      // 3. Registrar en historial
      const componentesPesados = componentes.filter(c => c.fue_pesado).length
      const componentesSugeridos = componentes.length - componentesPesados

      await registrar({
        empresaId,
        usuario,
        tipoAccion: TIPOS_ACCION.ESCUELA_DESPACHADA,
        descripcion: `🚚 Despachó ${escuela.nombre} (${operacion.raciones_planificadas} raciones · ${redondear(pesoTotalCocidoLb, 1)} lb totales)`,
        entidad: 'operacion_dia',
        entidadId: operacion.id,
        detallesExtra: {
          escuela_nombre: escuela.nombre,
          raciones: operacion.raciones_planificadas,
          peso_total_cocido: redondear(pesoTotalCocidoLb, 2),
          componentes: componentes.map(c => ({
            nombre: c.nombre,
            sugerido: c.peso_cocido_sugerido,
            real: c.peso_real,
            fue_pesado: c.fue_pesado,
            unidad: c.unidad,
          })),
          componentes_pesados: componentesPesados,
          componentes_aceptaron_sugerencia: componentesSugeridos,
        },
      })

      alert(`✅ Despacho registrado\n\n${escuela.nombre}\n${componentes.length} componente(s)\n${redondear(pesoTotalCocidoLb, 1)} lb total`)
      if (onDespachado) onDespachado()
    } catch (err) {
      console.error('Error despachando:', err)
      setError(err.message)
    } finally {
      setProcesando(false)
    }
  }

  // ─── LOADING ────────────────────────────────────────────
  if (cargando) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-10 text-center max-w-sm">
          <div className="text-5xl mb-3 animate-pulse">🧮</div>
          <p className="text-gray-700 font-medium">Calculando sugerencias inteligentes...</p>
        </div>
      </div>
    )
  }

  // ─── ERROR FATAL ────────────────────────────────────────
  if (error && componentes.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-6 max-w-md w-full">
          <h3 className="text-xl font-bold text-red-700 mb-2">❌ Error</h3>
          <p className="text-gray-700 mb-4">{error}</p>
          <button onClick={onCerrar} className="w-full bg-gray-600 hover:bg-gray-700 text-white font-bold px-4 py-2 rounded-lg">
            Cerrar
          </button>
        </div>
      </div>
    )
  }

  // ─── CÁLCULOS DE RESUMEN ────────────────────────────────
  const pesoTotalReal = componentes.reduce((sum, c) => sum + (c.peso_real || 0), 0)
  const pesoTotalSugerido = componentes.reduce((sum, c) => sum + (c.peso_cocido_sugerido || 0), 0)
  const algunoPesadoReal = componentes.some(c => c.fue_pesado)
  const totalDiasAprendidos = Math.max(...componentes.map(c => c.dias_aprendidos || 0), 0)

  // ─── CÁLCULO DEL COCIDO TOTAL ESPERADO DEL DÍA ──────────
  // Solo sumar componentes que se miden en lb (excluye 'unidad' como huevos)
  // Usa el campo `crudo_total_componente` que devuelve calculosInteligencia.js
  const cocidoTotalEsperado = componentes.reduce((sum, c) => {
    if (c.unidad !== 'lb') return sum
    const crudoComponente = Number(c.crudo_total_componente) || 0
    const factor = Number(c.factor_rendimiento_usado) || 1
    return sum + (crudoComponente * factor)
  }, 0)

  // Porcentaje que le toca a esta escuela del total del día
  const porcentajeEscuela = racionesDiaTotal > 0
    ? (operacion.raciones_planificadas / racionesDiaTotal) * 100
    : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl">
        
        {/* ─── HEADER ───────────────────────────────────── */}
        <div className="bg-gradient-to-r from-orange-500 to-red-600 rounded-t-2xl p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-orange-100 text-xs font-semibold tracking-wider">PESAR Y DESPACHAR</p>
              <h2 className="text-2xl font-bold mt-1 truncate">
                🚚 {escuela?.nombre}
              </h2>
              <p className="text-orange-50 text-sm mt-1">
                {operacion.raciones_planificadas} raciones · {recetaDelDia?.emoji} {recetaDelDia?.nombre}
              </p>
            </div>
            <button
              onClick={onCerrar}
              disabled={procesando}
              className="text-white/80 hover:text-white text-2xl leading-none"
            >
              ✕
            </button>
          </div>
        </div>

        {/* ─── BANNER DE INTELIGENCIA (MEJORADO) ────────── */}
        <div className="bg-green-50 border-b border-green-200 px-5 py-3 space-y-1.5">
          <div className="flex items-start gap-2 text-xs">
            <span className="flex-shrink-0">📊</span>
            <p className="text-gray-700">
              <strong className="text-gray-900">Total CRUDO del día:</strong>{' '}
              <strong className="text-orange-700">{redondear(crudoAprobadoTotal, 1)} lb</strong>{' '}
              <span className="text-gray-500">({racionesDiaTotal} raciones · todas las escuelas)</span>
            </p>
          </div>
          
          <div className="flex items-start gap-2 text-xs">
            <span className="flex-shrink-0">🍳</span>
            <p className="text-gray-700">
              <strong className="text-gray-900">Cocido esperado TOTAL:</strong>{' '}
              <strong className="text-amber-700">~{redondear(cocidoTotalEsperado, 1)} lb</strong>{' '}
              <span className="text-gray-500">
                ({totalDiasAprendidos > 0 
                  ? `${totalDiasAprendidos} día(s) aprendido(s)` 
                  : 'factor INABIE default'})
              </span>
            </p>
          </div>

          <div className="flex items-start gap-2 text-xs pt-1 border-t border-green-200">
            <span className="flex-shrink-0">🚚</span>
            <p className="text-gray-700">
              <strong className="text-gray-900">Sugerido para {escuela?.nombre}:</strong>{' '}
              <strong className="text-green-700">{redondear(pesoTotalSugerido, 1)} lb</strong>{' '}
              <span className="text-gray-500">
                ({operacion.raciones_planificadas} raciones · {redondear(porcentajeEscuela, 1)}% del día)
              </span>
            </p>
          </div>
        </div>

        {/* ─── LISTA DE COMPONENTES ─────────────────────── */}
        <div className="p-5 space-y-3">
          <p className="text-xs font-bold text-gray-700 uppercase">
            🍱 Componentes a despachar
          </p>

          {componentes.map(c => {
            const editado = c.fue_pesado
            return (
              <div
                key={c.componente_id}
                className={`border-2 rounded-xl p-3 ${
                  editado ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">{c.emoji || '🍽️'}</div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{c.nombre}</p>
                    <p className="text-xs text-gray-500">
                      Sugerencia: <strong>{c.peso_cocido_sugerido} {c.unidad}</strong>
                    </p>
                    <p className="text-xs text-gray-400 italic mt-0.5">
                      {c.formula_texto}
                    </p>
                  </div>

                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={c.peso_real}
                        onChange={(e) => editarPesoReal(c.componente_id, e.target.value)}
                        disabled={procesando}
                        className={`w-24 px-2 py-1.5 border-2 rounded-lg text-right font-bold ${
                          editado ? 'border-blue-400 text-blue-900' : 'border-gray-300'
                        }`}
                      />
                      <span className="text-xs text-gray-500">{c.unidad}</span>
                    </div>
                    {editado && (
                      <button
                        onClick={() => resetearSugerencia(c.componente_id)}
                        className="text-xs text-blue-700 underline mt-1"
                      >
                        ↺ Usar sugerencia
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ─── NOTAS ────────────────────────────────────── */}
        <div className="px-5 pb-3">
          <label className="block text-xs font-bold text-gray-700 uppercase mb-1">
            Notas (opcional)
          </label>
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: Sobró arroz en olla 2, niños comieron poco..."
            disabled={procesando}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* ─── AVISO DE INTELIGENCIA ────────────────────── */}
        <div className="px-5 pb-3">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-xs text-yellow-900">
            💡 {algunoPesadoReal 
              ? <>Pesando real: <strong>la inteligencia aprende con datos exactos.</strong></>
              : <>Si no pesas, el sistema asume las sugerencias como reales y aprende igual.</>
            }
          </div>
        </div>

        {/* ─── FOOTER: RESUMEN + BOTONES ────────────────── */}
        <div className="bg-gray-50 rounded-b-2xl p-5 border-t border-gray-200">
          
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Componentes</p>
              <p className="text-xl font-bold text-gray-800">{componentes.length}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Peso total</p>
              <p className="text-xl font-bold text-orange-700">{redondear(pesoTotalReal, 1)} lb</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Pesados real</p>
              <p className="text-xl font-bold text-blue-700">
                {componentes.filter(c => c.fue_pesado).length} / {componentes.length}
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-3">
              <p className="text-sm text-red-800">❌ {error}</p>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={onCerrar}
              disabled={procesando}
              className="px-5 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={guardarYDespachar}
              disabled={procesando}
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white font-bold px-5 py-3 rounded-xl shadow-lg disabled:opacity-50"
            >
              {procesando ? 'Despachando...' : '✅ Guardar y generar conduce'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}