// src/components/despachador/ModalPesarSobrante.jsx
// Modal "Pesar Sobrante" — Cocina PAE
// Cierra el día de UNA escuela específica registrando lo que sobró
// Filosofía: "Default = 0 (no sobró nada)" + "Si sobró, edita ese componente"

import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { redondear } from '../../utils/calculosInteligencia'
import { registrar, TIPOS_ACCION } from '../../utils/historial'

export default function ModalPesarSobrante({
  operacion,           // operación del día (la escuela específica)
  empresaId,
  usuario,
  onCerrar,
  onCerrado,
}) {
  const [escuela, setEscuela] = useState(null)
  const [componentes, setComponentes] = useState([])  // con peso_sobrante editable
  const [notas, setNotas] = useState('')
  const [cargando, setCargando] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (operacion) cargarDatos()
  }, [operacion?.id])

  async function cargarDatos() {
    try {
      setCargando(true)
      setError(null)

      // 1. Cargar info de la escuela
      const { data: escuelaData, error: errEsc } = await supabase
        .from('escuelas')
        .select('*')
        .eq('id', operacion.escuela_id)
        .single()
      if (errEsc) throw errEsc
      setEscuela(escuelaData)

      // 2. Cargar despachos_componente de esta operación (con joins para nombre/emoji/unidad)
      const { data: despachos, error: errDesp } = await supabase
        .from('despachos_componente')
        .select(`
          id,
          componente_id,
          peso_cocido_real,
          peso_sobrante,
          fue_pesado_sobrante_real,
          componentes_receta (
            nombre,
            emoji,
            unidad
          )
        `)
        .eq('operacion_dia_id', operacion.id)
        .order('id', { ascending: true })

      if (errDesp) throw errDesp
      if (!despachos || despachos.length === 0) {
        throw new Error('No se encontraron componentes despachados para esta escuela')
      }

      // 3. Preparar lista con peso_sobrante editable (default = lo que ya está, normalmente 0)
      const lista = despachos.map(d => ({
        despacho_id: d.id,
        componente_id: d.componente_id,
        nombre: d.componentes_receta?.nombre || 'Componente',
        emoji: d.componentes_receta?.emoji || '🍽️',
        unidad: d.componentes_receta?.unidad || 'lb',
        peso_cocido_real: Number(d.peso_cocido_real) || 0,
        peso_sobrante: Number(d.peso_sobrante) || 0,
        fue_pesado_sobrante: d.fue_pesado_sobrante_real || false,
      }))

      setComponentes(lista)
    } catch (err) {
      console.error('Error cargando datos del sobrante:', err)
      setError(err.message)
    } finally {
      setCargando(false)
    }
  }

  function editarSobrante(despachoId, valorNuevo) {
    const valor = parseFloat(valorNuevo) || 0
    setComponentes(prev => prev.map(c =>
      c.despacho_id === despachoId
        ? { ...c, peso_sobrante: valor, fue_pesado_sobrante: true }
        : c
    ))
  }

  function resetearSobrante(despachoId) {
    setComponentes(prev => prev.map(c =>
      c.despacho_id === despachoId
        ? { ...c, peso_sobrante: 0, fue_pesado_sobrante: false }
        : c
    ))
  }

  async function guardarSobranteYCerrar() {
    setProcesando(true)
    setError(null)

    try {
      const ahora = new Date().toISOString()

      // 1. UPDATE cada despachos_componente con su peso_sobrante
      for (const c of componentes) {
        const { error: errUpd } = await supabase
          .from('despachos_componente')
          .update({
            peso_sobrante: c.peso_sobrante,
            fue_pesado_sobrante_real: c.fue_pesado_sobrante,
            hora_regreso: ahora,
            notas_sobrante: notas.trim() || null,
            updated_at: ahora,
          })
          .eq('id', c.despacho_id)

        if (errUpd) throw errUpd
      }

      // 2. UPDATE operacion_dia: estado a 'cerrada' + hora_regreso
      const { error: errOp } = await supabase
        .from('operaciones_dia')
        .update({
          estado: 'cerrada',
          hora_regreso: ahora,
          updated_at: ahora,
        })
        .eq('id', operacion.id)

      if (errOp) throw errOp

      // 3. Registrar en historial
      const totalSobrante = componentes.reduce((sum, c) => 
        sum + (c.unidad === 'lb' ? Number(c.peso_sobrante) : 0), 0)
      const componentesQueSobraron = componentes.filter(c => c.peso_sobrante > 0).length

      await registrar({
        empresaId,
        usuario,
        tipoAccion: TIPOS_ACCION.ESCUELA_CERRADA || 'ESCUELA_CERRADA',
        descripcion: `🔒 Cerró día de ${escuela.nombre} (sobrante: ${redondear(totalSobrante, 1)} lb · ${componentesQueSobraron} componente(s) sobraron)`,
        entidad: 'operacion_dia',
        entidadId: operacion.id,
        detallesExtra: {
          escuela_nombre: escuela.nombre,
          total_sobrante_lb: redondear(totalSobrante, 2),
          componentes_que_sobraron: componentesQueSobraron,
          detalle_sobrantes: componentes.map(c => ({
            nombre: c.nombre,
            despachado: c.peso_cocido_real,
            sobrante: c.peso_sobrante,
            unidad: c.unidad,
            fue_pesado: c.fue_pesado_sobrante,
          })),
          notas: notas.trim() || null,
        },
      })

      alert(`🔒 Día cerrado para ${escuela.nombre}\n\nSobrante total: ${redondear(totalSobrante, 1)} lb\n${componentesQueSobraron} componente(s) sobraron`)
      if (onCerrado) onCerrado()
    } catch (err) {
      console.error('Error cerrando día:', err)
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
          <div className="text-5xl mb-3 animate-pulse">🍱</div>
          <p className="text-gray-700 font-medium">Cargando despacho...</p>
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
  const totalDespachado = componentes.reduce((sum, c) => 
    sum + (c.unidad === 'lb' ? Number(c.peso_cocido_real) : 0), 0)
  const totalSobrante = componentes.reduce((sum, c) => 
    sum + (c.unidad === 'lb' ? Number(c.peso_sobrante) : 0), 0)
  const totalConsumido = totalDespachado - totalSobrante
  const componentesQueSobraron = componentes.filter(c => c.peso_sobrante > 0).length
  const porcentajeConsumido = totalDespachado > 0 
    ? (totalConsumido / totalDespachado) * 100 
    : 0

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl">
        
        {/* ─── HEADER ───────────────────────────────────── */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-600 rounded-t-2xl p-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-purple-100 text-xs font-semibold tracking-wider">PESAR SOBRANTE Y CERRAR DÍA</p>
              <h2 className="text-2xl font-bold mt-1 truncate">
                🍱 {escuela?.nombre}
              </h2>
              <p className="text-purple-50 text-sm mt-1">
                {operacion.raciones_planificadas} raciones · Despachado: {redondear(totalDespachado, 1)} lb cocido
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

        {/* ─── AVISO INICIAL ────────────────────────────── */}
        <div className="bg-purple-50 border-b border-purple-200 px-5 py-3">
          <p className="text-xs text-purple-900">
            💡 <strong>Por defecto = 0</strong> (no sobró nada). Si algo sobró, edita el peso del componente.
          </p>
        </div>

        {/* ─── LISTA DE COMPONENTES ─────────────────────── */}
        <div className="p-5 space-y-3">
          <p className="text-xs font-bold text-gray-700 uppercase">
            🍱 Sobrante por componente
          </p>

          {componentes.map(c => {
            const editado = c.fue_pesado_sobrante
            const consumido = Number(c.peso_cocido_real) - Number(c.peso_sobrante)
            const pctConsumido = c.peso_cocido_real > 0 
              ? (consumido / c.peso_cocido_real) * 100 
              : 0

            return (
              <div
                key={c.despacho_id}
                className={`border-2 rounded-xl p-3 ${
                  editado ? 'border-purple-300 bg-purple-50' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">{c.emoji}</div>
                  
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 truncate">{c.nombre}</p>
                    <p className="text-xs text-gray-500">
                      Despachado: <strong>{c.peso_cocido_real} {c.unidad}</strong>
                    </p>
                    {c.peso_sobrante > 0 && (
                      <p className="text-xs text-orange-700 italic mt-0.5">
                        Consumido: {redondear(consumido, 1)} {c.unidad} ({redondear(pctConsumido, 0)}%)
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col items-end flex-shrink-0">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-500">Sobró:</span>
                      <input
                        type="number"
                        min="0"
                        max={c.peso_cocido_real}
                        step="0.1"
                        value={c.peso_sobrante}
                        onChange={(e) => editarSobrante(c.despacho_id, e.target.value)}
                        disabled={procesando}
                        className={`w-20 px-2 py-1.5 border-2 rounded-lg text-right font-bold ${
                          editado ? 'border-purple-400 text-purple-900' : 'border-gray-300'
                        }`}
                      />
                      <span className="text-xs text-gray-500">{c.unidad}</span>
                    </div>
                    {editado && (
                      <button
                        onClick={() => resetearSobrante(c.despacho_id)}
                        className="text-xs text-purple-700 underline mt-1"
                      >
                        ↺ Volver a 0
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
            Notas del sobrante (opcional)
          </label>
          <input
            type="text"
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            placeholder="Ej: Sobró arroz porque faltaron 30 niños..."
            disabled={procesando}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        {/* ─── FOOTER: RESUMEN + BOTONES ────────────────── */}
        <div className="bg-gray-50 rounded-b-2xl p-5 border-t border-gray-200">
          
          <div className="grid grid-cols-3 gap-3 mb-4 text-center">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Despachado</p>
              <p className="text-lg font-bold text-orange-700">{redondear(totalDespachado, 1)} lb</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Sobrante</p>
              <p className="text-lg font-bold text-purple-700">{redondear(totalSobrante, 1)} lb</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Consumido</p>
              <p className="text-lg font-bold text-green-700">{redondear(totalConsumido, 1)} lb</p>
              <p className="text-xs text-green-600">{redondear(porcentajeConsumido, 0)}%</p>
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
              onClick={guardarSobranteYCerrar}
              disabled={procesando}
              className="flex-1 bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white font-bold px-5 py-3 rounded-xl shadow-lg disabled:opacity-50"
            >
              {procesando ? 'Cerrando día...' : `🔒 Cerrar día de ${escuela?.nombre}`}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}