import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function VistaHistorialNomina({ empresaId, onVolver }) {
  const [pagos, setPagos] = useState([])
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear())
  const [añosDisponibles, setAñosDisponibles] = useState([])
  const [pagoDetalle, setPagoDetalle] = useState(null)
  const [detallesPago, setDetallesPago] = useState([])
  const [cargando, setCargando] = useState(true)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)

  useEffect(() => {
    if (empresaId) cargarAños()
  }, [empresaId])

  useEffect(() => {
    if (empresaId && añoSeleccionado) cargarPagos()
  }, [añoSeleccionado, empresaId])

  async function cargarAños() {
    const { data } = await supabase
      .from('pagos_nomina')
      .select('año')
      .eq('empresa_id', empresaId)
      .order('año', { ascending: false })
    
    const años = [...new Set((data || []).map(p => p.año))]
    if (años.length === 0) años.push(new Date().getFullYear())
    setAñosDisponibles(años)
    
    if (!años.includes(añoSeleccionado)) {
      setAñoSeleccionado(años[0])
    }
  }

  async function cargarPagos() {
    setCargando(true)
    const { data } = await supabase
      .from('pagos_nomina')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('año', añoSeleccionado)
      .order('mes', { ascending: false })
      .order('tipo_periodo', { ascending: false })
    
    setPagos(data || [])
    setCargando(false)
  }

  async function abrirDetalle(pago) {
    setPagoDetalle(pago)
    setCargandoDetalle(true)
    
    const { data } = await supabase
      .from('pagos_nomina_detalle')
      .select('*')
      .eq('pago_nomina_id', pago.id)
      .order('empleado_nombre')
    
    setDetallesPago(data || [])
    setCargandoDetalle(false)
  }

  function cerrarDetalle() {
    setPagoDetalle(null)
    setDetallesPago([])
  }

  function nombreMes(mes) {
    const nombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                     'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    return nombres[mes - 1] || ''
  }

  function labelPeriodo(pago) {
    if (pago.tipo_periodo === 'quincenal_1') return `1ra quincena de ${nombreMes(pago.mes)} ${pago.año}`
    if (pago.tipo_periodo === 'quincenal_2') return `2da quincena de ${nombreMes(pago.mes)} ${pago.año}`
    if (pago.tipo_periodo === 'mensual') return `${nombreMes(pago.mes)} ${pago.año}`
    if (pago.tipo_periodo === 'semanal') return `Semana ${pago.semana} de ${nombreMes(pago.mes)} ${pago.año}`
    return `${nombreMes(pago.mes)} ${pago.año}`
  }

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  function formatearFecha(fecha) {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-DO', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  function imprimirReporte() {
    window.print()
  }

  // KPIs del año
  const totalAño = pagos.reduce((sum, p) => sum + parseFloat(p.total_neto || 0), 0)
  const totalAportesAño = pagos.reduce((sum, p) => sum + parseFloat(p.total_aportes || 0), 0)
  const totalBonosAño = pagos.reduce((sum, p) => sum + parseFloat(p.total_bonos || 0), 0)
  const totalBrutoAño = pagos.reduce((sum, p) => sum + parseFloat(p.total_bruto || 0), 0)
  const promedioPago = pagos.length > 0 ? totalAño / pagos.length : 0
  const empleadosUnicosCount = pagos[0]?.cantidad_empleados || 0

  return (
    <div className="w-full max-w-5xl">

      {/* MODAL DETALLE */}
      {pagoDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 overflow-y-auto print:bg-white print:p-0">
          <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8 max-h-[95vh] flex flex-col print:max-h-none print:my-0 print:rounded-none print:shadow-none">
            
            {/* Header del modal */}
            <div className="bg-gradient-to-br from-pink-600 to-rose-700 text-white rounded-t-2xl p-6 flex justify-between items-start print:bg-pink-700">
              <div>
                <p className="text-pink-100 text-xs font-semibold tracking-wider">
                  RECIBO DE PAGO DE NÓMINA
                </p>
                <h2 className="text-2xl font-bold mt-1">
                  💰 {labelPeriodo(pagoDetalle)}
                </h2>
                <p className="text-pink-200 text-sm mt-1">
                  Pagado el {formatearFecha(pagoDetalle.fecha_pago)}
                </p>
              </div>
              <div className="flex gap-2 print:hidden">
                <button
                  onClick={imprimirReporte}
                  className="bg-pink-800 hover:bg-pink-900 text-white text-sm px-3 py-2 rounded-lg"
                >
                  🖨️ Imprimir
                </button>
                <button
                  onClick={cerrarDetalle}
                  className="bg-pink-800 hover:bg-pink-900 text-white text-sm px-3 py-2 rounded-lg"
                >
                  ✖ Cerrar
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 print:overflow-visible">

              {/* Información del pago */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Período</p>
                    <p className="font-bold">
                      {formatearFecha(pagoDetalle.fecha_inicio)} - {formatearFecha(pagoDetalle.fecha_fin)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Estado</p>
                    <p className="font-bold text-green-700 capitalize">
                      ✅ {pagoDetalle.estado}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Empleados</p>
                    <p className="font-bold">{pagoDetalle.cantidad_empleados}</p>
                  </div>
                </div>
                {pagoDetalle.notas && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">📝 Notas</p>
                    <p className="text-sm text-gray-700 italic">{pagoDetalle.notas}</p>
                  </div>
                )}
              </div>

              {/* Totales */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-green-700 font-semibold">NETO PAGADO</p>
                  <p className="text-lg font-bold text-green-900">
                    RD$ {formatearMoneda(pagoDetalle.total_neto)}
                  </p>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-blue-700 font-semibold">COSTO BRUTO</p>
                  <p className="text-lg font-bold text-blue-900">
                    RD$ {formatearMoneda(pagoDetalle.total_bruto)}
                  </p>
                </div>
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-purple-700 font-semibold">APORTES</p>
                  <p className="text-lg font-bold text-purple-900">
                    RD$ {formatearMoneda(pagoDetalle.total_aportes)}
                  </p>
                </div>
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-orange-700 font-semibold">BONOS EXTRA</p>
                  <p className="text-lg font-bold text-orange-900">
                    RD$ {formatearMoneda(pagoDetalle.total_bonos)}
                  </p>
                </div>
              </div>

              {/* Detalle por empleado */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">
                  👥 DETALLE POR EMPLEADO ({detallesPago.length})
                </p>
                
                {cargandoDetalle ? (
                  <div className="text-center py-8 text-gray-500">⏳ Cargando detalle...</div>
                ) : detallesPago.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">No hay detalle disponible</div>
                ) : (
                  <div className="space-y-2">
                    {detallesPago.map(d => (
                      <div key={d.id} className="border border-gray-200 rounded-xl p-3">
                        <div className="flex items-center justify-between gap-3 flex-wrap mb-2">
                          <div>
                            <p className="font-bold text-gray-900">{d.empleado_nombre}</p>
                            <p className="text-xs text-gray-600 capitalize">
                              {d.empleado_rol?.replace('_', ' ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Total pagado</p>
                            <p className="text-xl font-bold text-green-700">
                              RD$ {formatearMoneda(d.total_pagado)}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs pt-2 border-t border-gray-100">
                          <div>
                            <p className="text-gray-500">Neto base</p>
                            <p className="font-semibold">RD$ {formatearMoneda(d.salario_neto)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Bruto</p>
                            <p className="font-semibold">RD$ {formatearMoneda(d.salario_bruto)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Aporte TSS+AFP</p>
                            <p className="font-semibold">RD$ {formatearMoneda(d.aporte_tss_afp)}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Bono extra</p>
                            <p className="font-semibold text-orange-700">
                              RD$ {formatearMoneda(d.bono_extra)}
                            </p>
                          </div>
                        </div>

                        {(parseFloat(d.ajuste_positivo) > 0 || parseFloat(d.ajuste_negativo) > 0) && (
                          <div className="mt-2 pt-2 border-t border-gray-100 text-xs space-y-1">
                            {parseFloat(d.ajuste_positivo) > 0 && (
                              <p className="text-green-700">
                                ➕ Ajuste positivo: RD$ {formatearMoneda(d.ajuste_positivo)}
                                {d.ajuste_razon && ` · ${d.ajuste_razon}`}
                              </p>
                            )}
                            {parseFloat(d.ajuste_negativo) > 0 && (
                              <p className="text-red-700">
                                ➖ Ajuste negativo: RD$ {formatearMoneda(d.ajuste_negativo)}
                                {d.ajuste_razon && ` · ${d.ajuste_razon}`}
                              </p>
                            )}
                          </div>
                        )}

                        {d.bono_descripcion && (
                          <p className="text-xs text-gray-500 italic mt-2">
                            🎁 {d.bono_descripcion}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-br from-slate-700 to-slate-900 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-slate-300 text-xs font-semibold tracking-wider">
              HISTORIAL DE PAGOS
            </p>
            <h2 className="text-3xl font-bold mt-1">
              📜 Historial de Nómina
            </h2>
            <p className="text-slate-300 mt-1 text-sm">
              Todos los pagos procesados ordenados del más reciente
            </p>
          </div>
          <button
            onClick={onVolver}
            className="bg-slate-800 hover:bg-slate-900 text-white text-sm px-4 py-2 rounded-lg"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* SELECTOR DE AÑO Y KPIs */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">
            📊 RESUMEN AÑO {añoSeleccionado}
          </p>
          <select
            value={añoSeleccionado}
            onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold"
          >
            {añosDisponibles.map(año => (
              <option key={año} value={año}>{año}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-xl p-4">
            <p className="text-xs text-green-700 font-semibold tracking-wider mb-1">TOTAL PAGADO</p>
            <p className="text-xl font-bold text-green-900">
              RD$ {formatearMoneda(totalAño)}
            </p>
            <p className="text-xs text-green-600 mt-1">neto a empleados</p>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-700 font-semibold tracking-wider mb-1">COSTO TOTAL</p>
            <p className="text-xl font-bold text-blue-900">
              RD$ {formatearMoneda(totalBrutoAño)}
            </p>
            <p className="text-xs text-blue-600 mt-1">incluye aportes</p>
          </div>

          <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
            <p className="text-xs text-purple-700 font-semibold tracking-wider mb-1">PAGOS</p>
            <p className="text-xl font-bold text-purple-900">
              {pagos.length}
            </p>
            <p className="text-xs text-purple-600 mt-1">períodos procesados</p>
          </div>

          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
            <p className="text-xs text-orange-700 font-semibold tracking-wider mb-1">PROMEDIO</p>
            <p className="text-xl font-bold text-orange-900">
              RD$ {formatearMoneda(promedioPago)}
            </p>
            <p className="text-xs text-orange-600 mt-1">por pago</p>
          </div>
        </div>
      </div>

      {/* LISTA DE PAGOS */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
          🗓️ PAGOS DE {añoSeleccionado.toString().toUpperCase()}
        </p>

        {cargando ? (
          <div className="text-center py-12 text-gray-500">⏳ Cargando pagos...</div>
        ) : pagos.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">📭</p>
            <p className="text-gray-700 font-bold mb-1">
              No hay pagos registrados en {añoSeleccionado}
            </p>
            <p className="text-sm text-gray-500">
              Los pagos aparecerán aquí cuando proceses una quincena.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pagos.map(pago => (
              <div 
                key={pago.id}
                className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition cursor-pointer flex items-center justify-between gap-3 flex-wrap"
                onClick={() => abrirDetalle(pago)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl flex-shrink-0">
                    ✅
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {labelPeriodo(pago)}
                    </p>
                    <p className="text-xs text-gray-600">
                      Pagado el {formatearFecha(pago.fecha_pago)} · 
                      {' '}{pago.cantidad_empleados} empleado{pago.cantidad_empleados !== 1 ? 's' : ''}
                      {parseFloat(pago.total_bonos) > 0 && ` · 🎁 RD$ ${formatearMoneda(pago.total_bonos)} en bonos`}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <p className="text-xs text-gray-500">Total pagado</p>
                  <p className="text-lg font-bold text-green-700">
                    RD$ {formatearMoneda(pago.total_neto)}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    abrirDetalle(pago)
                  }}
                  className="bg-slate-700 hover:bg-slate-800 text-white text-xs font-bold px-3 py-2 rounded-lg"
                >
                  👁️ Ver detalle
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default VistaHistorialNomina