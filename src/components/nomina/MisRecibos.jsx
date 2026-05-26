import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function MisRecibos({ usuario, empresaId, onVolver }) {
  const [recibos, setRecibos] = useState([])
  const [periodos, setPeriodos] = useState({})
  const [cargando, setCargando] = useState(true)
  const [reciboSeleccionado, setReciboSeleccionado] = useState(null)

  useEffect(() => {
    if (usuario?.id && empresaId) {
      cargarMisRecibos()
    }
  }, [usuario, empresaId])

  async function cargarMisRecibos() {
    setCargando(true)

    // Cargar todos los recibos del usuario logueado
    const { data: detalles, error } = await supabase
      .from('pagos_nomina_detalle')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('usuario_id', usuario.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error cargando recibos:', error)
      setCargando(false)
      return
    }

    setRecibos(detalles || [])

    // Cargar los períodos relacionados
    const periodoIds = [...new Set((detalles || []).map(d => d.pago_nomina_id))]
    if (periodoIds.length > 0) {
      const { data: periodosData } = await supabase
        .from('pagos_nomina')
        .select('*')
        .in('id', periodoIds)

      const periodosMap = {}
      ;(periodosData || []).forEach(p => {
        periodosMap[p.id] = p
      })
      setPeriodos(periodosMap)
    }

    setCargando(false)
  }

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
  }

  function formatearFecha(fecha) {
    if (!fecha) return '—'
    return new Date(fecha).toLocaleDateString('es-DO', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    })
  }

  function descripcionPeriodo(periodo) {
    if (!periodo) return 'Sin período'
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    const mesNombre = meses[(periodo.mes || 1) - 1]

    if (periodo.tipo_periodo === 'mensual') {
      return `${mesNombre} ${periodo.año}`
    }
    if (periodo.tipo_periodo === 'quincenal') {
      const qStr = periodo.semana === 1 ? '1ra Quincena' : '2da Quincena'
      return `${qStr} ${mesNombre} ${periodo.año}`
    }
    if (periodo.tipo_periodo === 'semanal') {
      return `Semana ${periodo.semana} de ${mesNombre} ${periodo.año}`
    }
    return `${formatearFecha(periodo.fecha_inicio)} - ${formatearFecha(periodo.fecha_fin)}`
  }

  // ─────────────────────────────────────────────
  // 📄 VISTA DETALLE DE UN RECIBO
  // ─────────────────────────────────────────────
  if (reciboSeleccionado) {
    const periodo = periodos[reciboSeleccionado.pago_nomina_id]
    const r = reciboSeleccionado
    const totalDevengado = parseFloat(r.salario_neto || 0) + 
                          parseFloat(r.bono_extra || 0) +
                          parseFloat(r.ajuste_positivo || 0)
    const totalDeducciones = parseFloat(r.ajuste_negativo || 0)

    return (
      <div className="w-full max-w-3xl">
        {/* HEADER */}
        <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 mb-6 text-white">
          <div className="flex justify-between items-start flex-wrap gap-3">
            <div>
              <p className="text-emerald-100 text-xs font-semibold tracking-wider">
                RECIBO DE PAGO
              </p>
              <h2 className="text-2xl font-bold mt-1">
                {descripcionPeriodo(periodo)}
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                Pagado: {formatearFecha(r.fecha_pagado)}
              </p>
            </div>
            <button
              onClick={() => setReciboSeleccionado(null)}
              className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-lg"
            >
              ← Volver a mis recibos
            </button>
          </div>
        </div>

        {/* DATOS DEL EMPLEADO */}
        <div className="bg-white rounded-2xl shadow-xl p-5 mb-4">
          <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
            👤 EMPLEADO
          </p>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <p className="text-gray-500">Nombre:</p>
              <p className="font-bold text-gray-900">{r.empleado_nombre}</p>
            </div>
            <div>
              <p className="text-gray-500">Rol:</p>
              <p className="font-bold text-gray-900 capitalize">{r.empleado_rol?.replace('_', ' ') || '—'}</p>
            </div>
          </div>
        </div>

        {/* DESGLOSE COMPLETO */}
        <div className="bg-white rounded-2xl shadow-xl p-5 mb-4">
          <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
            💰 DESGLOSE DEL PAGO
          </p>

          {/* DEVENGADO */}
          <div className="mb-4">
            <p className="text-xs font-bold text-green-700 mb-2">+ DEVENGADO</p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-700">Salario neto</span>
                <span className="font-mono font-bold">RD$ {formatearMoneda(r.salario_neto)}</span>
              </div>
              {r.bono_extra > 0 && (
                <div className="flex justify-between text-sm bg-purple-50 p-2 rounded">
                  <div>
                    <span className="text-purple-900 font-semibold">🎁 Bonificación</span>
                    {r.bono_descripcion && (
                      <p className="text-xs text-purple-700">{r.bono_descripcion}</p>
                    )}
                  </div>
                  <span className="font-mono font-bold text-purple-900">RD$ {formatearMoneda(r.bono_extra)}</span>
                </div>
              )}
              {r.ajuste_positivo > 0 && (
                <div className="flex justify-between text-sm bg-blue-50 p-2 rounded">
                  <div>
                    <span className="text-blue-900 font-semibold">➕ Ajuste positivo</span>
                    {r.ajuste_razon && (
                      <p className="text-xs text-blue-700">{r.ajuste_razon}</p>
                    )}
                  </div>
                  <span className="font-mono font-bold text-blue-900">RD$ {formatearMoneda(r.ajuste_positivo)}</span>
                </div>
              )}
            </div>
            <div className="border-t border-green-200 mt-2 pt-2 flex justify-between text-sm font-bold text-green-800">
              <span>Total devengado:</span>
              <span className="font-mono">RD$ {formatearMoneda(totalDevengado)}</span>
            </div>
          </div>

          {/* DEDUCCIONES */}
          {totalDeducciones > 0 && (
            <div className="mb-4">
              <p className="text-xs font-bold text-red-700 mb-2">− DEDUCCIONES</p>
              <div className="space-y-2">
                {r.ajuste_negativo > 0 && (
                  <div className="flex justify-between text-sm bg-red-50 p-2 rounded">
                    <div>
                      <span className="text-red-900 font-semibold">➖ Ajuste negativo</span>
                      {r.ajuste_razon && (
                        <p className="text-xs text-red-700">{r.ajuste_razon}</p>
                      )}
                    </div>
                    <span className="font-mono font-bold text-red-900">RD$ {formatearMoneda(r.ajuste_negativo)}</span>
                  </div>
                )}
              </div>
              <div className="border-t border-red-200 mt-2 pt-2 flex justify-between text-sm font-bold text-red-800">
                <span>Total deducciones:</span>
                <span className="font-mono">RD$ {formatearMoneda(totalDeducciones)}</span>
              </div>
            </div>
          )}

          {/* TOTAL FINAL */}
          <div className="bg-gradient-to-br from-emerald-100 to-teal-100 rounded-xl p-4 border-2 border-emerald-300">
            <div className="flex justify-between items-center">
              <p className="text-lg font-bold text-emerald-900">TOTAL RECIBIDO:</p>
              <p className="text-2xl font-bold text-emerald-900 font-mono">
                RD$ {formatearMoneda(r.total_pagado)}
              </p>
            </div>
          </div>
        </div>

        {/* APORTES PATRONALES (informativo) */}
        {r.aporte_tss_afp > 0 && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 mb-4">
            <p className="text-xs text-blue-700 font-semibold tracking-wider mb-2">
              ℹ️ APORTES PATRONALES (pagados por la empresa, NO se descuentan a ti)
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-blue-900">TSS + AFP:</span>
              <span className="font-mono font-bold text-blue-900">RD$ {formatearMoneda(r.aporte_tss_afp)}</span>
            </div>
            <p className="text-xs text-blue-700 mt-2">
              Estos aportes los paga la empresa directamente al gobierno por tu beneficio (seguro de salud + pensión).
            </p>
          </div>
        )}

        {/* FIRMA */}
        {r.firma_empleado_at && (
          <div className="bg-green-50 border border-green-200 rounded-2xl p-4">
            <p className="text-xs text-green-700 font-semibold tracking-wider mb-2">
              ✅ FIRMA APLICADA
            </p>
            <p className="text-sm text-green-900">
              Confirmaste haber recibido este pago el {formatearFecha(r.firma_empleado_at)}
            </p>
          </div>
        )}

        {!r.firma_empleado_at && r.estado === 'pagado' && (
          <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-4">
            <p className="text-sm text-yellow-900">
              ⏳ Aún no has firmado este recibo. Habla con tu supervisor para confirmar la recepción.
            </p>
          </div>
        )}
      </div>
    )
  }

  // ─────────────────────────────────────────────
  // 📋 VISTA LISTA DE RECIBOS
  // ─────────────────────────────────────────────
  return (
    <div className="w-full max-w-4xl">
      {/* HEADER */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <p className="text-emerald-100 text-xs font-semibold tracking-wider">
              MIS RECIBOS DE PAGO
            </p>
            <h2 className="text-3xl font-bold mt-1">
              💰 Historial de Pagos
            </h2>
            <p className="text-emerald-100 text-sm mt-1">
              {usuario.nombre} · {recibos.length} recibo(s)
            </p>
          </div>
          <button
            onClick={onVolver}
            className="bg-white/20 hover:bg-white/30 text-white text-sm px-4 py-2 rounded-lg"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* STATS */}
      {recibos.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 font-semibold tracking-wider">TOTAL RECIBOS</p>
            <p className="text-2xl font-bold text-gray-900">{recibos.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 font-semibold tracking-wider">PAGADOS</p>
            <p className="text-2xl font-bold text-green-600">
              {recibos.filter(r => r.estado === 'pagado').length}
            </p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4 text-center">
            <p className="text-xs text-gray-500 font-semibold tracking-wider">FIRMADOS</p>
            <p className="text-2xl font-bold text-purple-600">
              {recibos.filter(r => r.firma_empleado_at).length}
            </p>
          </div>
        </div>
      )}

      {/* LISTA DE RECIBOS */}
      {cargando ? (
        <div className="text-center py-12 text-gray-500">Cargando tus recibos...</div>
      ) : recibos.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          <p className="text-6xl mb-3">📭</p>
          <p className="text-xl font-bold text-gray-700">Aún no tienes recibos</p>
          <p className="text-sm text-gray-500 mt-2">
            Tus pagos de nómina aparecerán aquí cuando tu empleador los procese.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {recibos.map(r => {
            const periodo = periodos[r.pago_nomina_id]
            const firmado = !!r.firma_empleado_at
            const pagado = r.estado === 'pagado'

            return (
              <button
                key={r.id}
                onClick={() => setReciboSeleccionado(r)}
                className="w-full bg-white rounded-2xl shadow-md hover:shadow-xl transition p-5 text-left border-2 border-transparent hover:border-emerald-300"
              >
                <div className="flex justify-between items-start gap-3 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 text-lg">
                      {descripcionPeriodo(periodo)}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Pagado: {formatearFecha(r.fecha_pagado)}
                    </p>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {pagado && (
                        <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded-full">
                          ✅ Pagado
                        </span>
                      )}
                      {firmado ? (
                        <span className="bg-purple-100 text-purple-800 text-xs font-bold px-2 py-1 rounded-full">
                          ✍️ Firmado
                        </span>
                      ) : pagado && (
                        <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded-full">
                          ⏳ Sin firmar
                        </span>
                      )}
                      {r.bono_extra > 0 && (
                        <span className="bg-pink-100 text-pink-800 text-xs font-bold px-2 py-1 rounded-full">
                          🎁 Con bono
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="text-2xl font-bold text-emerald-700 font-mono">
                      RD$ {formatearMoneda(r.total_pagado)}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default MisRecibos