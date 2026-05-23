import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function ModalPagarQuincena({ 
  empresa, 
  empleados, 
  periodo, 
  usuarioActual,
  onCerrar, 
  onPagoExitoso 
}) {
  const [detallesPago, setDetallesPago] = useState([])
  const [notasGenerales, setNotasGenerales] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [paso, setPaso] = useState('revision') // 'revision' | 'confirmacion'

  const descuentoPct = parseFloat(empresa?.nomina_descuento_porcentaje || 5.74)

  // Inicializar detalles con todos los empleados
  useEffect(() => {
    if (empleados && empleados.length > 0) {
      const inicial = empleados.map(emp => {
        const netoBase = salarioNetoDelPeriodo(emp)
        const brutoBase = calcularBruto(netoBase, descuentoPct)
        return {
          usuario_id: emp.id,
          empleado_nombre: emp.nombre,
          empleado_rol: emp.rol,
          incluido: true,
          salario_neto_base: netoBase,
          salario_bruto_base: brutoBase,
          aporte_tss_afp: brutoBase - netoBase,
          bono_extra: 0,
          bono_descripcion: '',
          ajuste_positivo: 0,
          ajuste_negativo: 0,
          ajuste_razon: '',
        }
      })
      setDetallesPago(inicial)
    }
  }, [empleados])

  // ═══════════════════════════════════════════════════
  // 🧮 HELPERS
  // ═══════════════════════════════════════════════════

  function salarioNetoDelPeriodo(empleado) {
    const sueldo = parseFloat(empleado.sueldo || 0)
    const freq = empleado.frecuencia_pago
    const freqEmpresa = empresa?.nomina_frecuencia || 'quincenal'

    // Convertir sueldo del empleado a lo que paga la empresa
    if (freqEmpresa === 'quincenal') {
      if (freq === 'mes') return sueldo / 2
      if (freq === 'quincena') return sueldo
      if (freq === 'semana') return sueldo * 2.165
      if (freq === 'dia') return sueldo * 11
      return sueldo
    }
    if (freqEmpresa === 'mensual') {
      if (freq === 'mes') return sueldo
      if (freq === 'quincena') return sueldo * 2
      if (freq === 'semana') return sueldo * 4.33
      if (freq === 'dia') return sueldo * 22
      return sueldo
    }
    if (freqEmpresa === 'semanal') {
      if (freq === 'mes') return sueldo / 4.33
      if (freq === 'quincena') return sueldo / 2.165
      if (freq === 'semana') return sueldo
      if (freq === 'dia') return sueldo * 5
      return sueldo
    }
    return sueldo
  }

  function calcularBruto(neto, porcentaje) {
    const factor = 1 - (parseFloat(porcentaje || 5.74) / 100)
    if (factor <= 0) return neto
    return Math.round((neto / factor) * 100) / 100
  }

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  }

  function actualizarDetalle(usuarioId, campo, valor) {
    setDetallesPago(prev => prev.map(d => 
      d.usuario_id === usuarioId ? { ...d, [campo]: valor } : d
    ))
  }

  function calcularTotalEmpleado(d) {
    return (
      parseFloat(d.salario_neto_base || 0) +
      parseFloat(d.bono_extra || 0) +
      parseFloat(d.ajuste_positivo || 0) -
      parseFloat(d.ajuste_negativo || 0)
    )
  }

  // ═══════════════════════════════════════════════════
  // 💰 TOTALES
  // ═══════════════════════════════════════════════════

  const detallesIncluidos = detallesPago.filter(d => d.incluido)
  
  const totalNeto = detallesIncluidos.reduce((sum, d) => 
    sum + calcularTotalEmpleado(d), 0)
  
  const totalBruto = detallesIncluidos.reduce((sum, d) => 
    sum + parseFloat(d.salario_bruto_base || 0) + parseFloat(d.bono_extra || 0), 0)
  
  const totalAportes = detallesIncluidos.reduce((sum, d) => 
    sum + parseFloat(d.aporte_tss_afp || 0), 0)
  
  const totalBonos = detallesIncluidos.reduce((sum, d) => 
    sum + parseFloat(d.bono_extra || 0), 0)

  // ═══════════════════════════════════════════════════
  // 💾 GUARDAR PAGO EN BD
  // ═══════════════════════════════════════════════════

  async function procesarPago() {
    setError('')
    
    if (detallesIncluidos.length === 0) {
      setError('Debes incluir al menos un empleado en el pago')
      return
    }

    setProcesando(true)

    try {
      // 1) Crear cabecera del pago
      const cabecera = {
        empresa_id: empresa.id,
        tipo_periodo: periodo.tipo_periodo,
        año: periodo.año,
        mes: periodo.mes,
        fecha_inicio: periodo.fecha_inicio.toISOString().split('T')[0],
        fecha_fin: periodo.fecha_fin.toISOString().split('T')[0],
        fecha_pago: periodo.fecha_pago.toISOString().split('T')[0],
        fecha_procesado: new Date().toISOString(),
        estado: 'pagado',
        total_neto: totalNeto,
        total_bruto: totalBruto,
        total_aportes: totalAportes,
        total_bonos: totalBonos,
        cantidad_empleados: detallesIncluidos.length,
        procesado_por_usuario_id: usuarioActual.id,
        notas: notasGenerales.trim() || null,
      }

      const { data: pagoCreado, error: errorPago } = await supabase
        .from('pagos_nomina')
        .insert([cabecera])
        .select()
        .single()

      if (errorPago) {
        // Detectar si ya existe el período
        if (errorPago.code === '23505') {
          throw new Error('Este período ya fue procesado anteriormente. Verifica en el historial.')
        }
        throw new Error(errorPago.message)
      }

      // 2) Crear detalles por empleado
      const detallesParaBD = detallesIncluidos.map(d => ({
        pago_nomina_id: pagoCreado.id,
        empresa_id: empresa.id,
        usuario_id: d.usuario_id,
        empleado_nombre: d.empleado_nombre,
        empleado_rol: d.empleado_rol,
        salario_neto: d.salario_neto_base,
        salario_bruto: d.salario_bruto_base,
        aporte_tss_afp: d.aporte_tss_afp,
        bono_extra: parseFloat(d.bono_extra) || 0,
        bono_descripcion: d.bono_descripcion?.trim() || null,
        ajuste_positivo: parseFloat(d.ajuste_positivo) || 0,
        ajuste_negativo: parseFloat(d.ajuste_negativo) || 0,
        ajuste_razon: d.ajuste_razon?.trim() || null,
        total_pagado: calcularTotalEmpleado(d),
        estado: 'pagado',
        fecha_pagado: new Date().toISOString(),
      }))

      const { error: errorDetalles } = await supabase
        .from('pagos_nomina_detalle')
        .insert(detallesParaBD)

      if (errorDetalles) {
        // Si falla el insert de detalles, eliminar la cabecera para no dejar inconsistencia
        await supabase.from('pagos_nomina').delete().eq('id', pagoCreado.id)
        throw new Error('Error al guardar detalles: ' + errorDetalles.message)
      }

      // Éxito
      setProcesando(false)
      if (onPagoExitoso) onPagoExitoso(pagoCreado)

    } catch (e) {
      setError(e.message || 'Error al procesar el pago')
      setProcesando(false)
    }
  }

  // ═══════════════════════════════════════════════════
  // 🎨 RENDER
  // ═══════════════════════════════════════════════════

  const labelFreq = empresa?.nomina_frecuencia === 'quincenal' ? 'quincena' :
                   empresa?.nomina_frecuencia === 'semanal' ? 'semana' :
                   empresa?.nomina_frecuencia === 'mensual' ? 'mes' : 'período'

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full my-8 max-h-[95vh] flex flex-col">

        {/* HEADER FIJO */}
        <div className="bg-gradient-to-br from-pink-600 to-rose-700 text-white rounded-t-2xl p-6 flex justify-between items-start">
          <div>
            <p className="text-pink-100 text-xs font-semibold tracking-wider">
              PROCESAR PAGO DE NÓMINA
            </p>
            <h2 className="text-2xl font-bold mt-1">
              💸 {periodo?.label}
            </h2>
            <p className="text-pink-200 text-sm mt-1">
              Fecha de pago: {periodo?.fecha_pago?.toLocaleDateString('es-DO', { 
                weekday: 'long', day: 'numeric', month: 'long' 
              })}
            </p>
          </div>
          <button
            onClick={onCerrar}
            disabled={procesando}
            className="bg-pink-800 hover:bg-pink-900 text-white text-sm px-3 py-2 rounded-lg disabled:opacity-50"
          >
            ✖ Cerrar
          </button>
        </div>

        {/* BODY SCROLLABLE */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">

          {/* PASO 1: REVISIÓN */}
          {paso === 'revision' && (
            <>
              {/* Resumen visual top */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                  <div>
                    <p className="text-xs text-blue-700 font-semibold">EMPLEADOS</p>
                    <p className="text-2xl font-bold text-blue-900">{detallesIncluidos.length}</p>
                  </div>
                  <div>
                    <p className="text-xs text-green-700 font-semibold">TOTAL A PAGAR</p>
                    <p className="text-2xl font-bold text-green-900">RD$ {formatearMoneda(totalNeto)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-purple-700 font-semibold">COSTO TOTAL</p>
                    <p className="text-2xl font-bold text-purple-900">RD$ {formatearMoneda(totalBruto)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-orange-700 font-semibold">BONOS EXTRA</p>
                    <p className="text-2xl font-bold text-orange-900">RD$ {formatearMoneda(totalBonos)}</p>
                  </div>
                </div>
              </div>

              {/* Lista de empleados editable */}
              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">
                  👥 EMPLEADOS A PAGAR ({detallesIncluidos.length} de {detallesPago.length})
                </p>
                
                <div className="space-y-3">
                  {detallesPago.map((d) => {
                    const total = calcularTotalEmpleado(d)
                    return (
                      <div 
                        key={d.usuario_id}
                        className={`border rounded-xl p-4 transition ${
                          d.incluido 
                            ? 'border-blue-300 bg-blue-50/30' 
                            : 'border-gray-200 bg-gray-100 opacity-60'
                        }`}
                      >
                        {/* Header del empleado */}
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <label className="flex items-center gap-3 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={d.incluido}
                              onChange={(e) => actualizarDetalle(d.usuario_id, 'incluido', e.target.checked)}
                              className="w-5 h-5"
                            />
                            <div>
                              <p className="font-bold text-gray-900">{d.empleado_nombre}</p>
                              <p className="text-xs text-gray-600 capitalize">
                                {d.empleado_rol?.replace('_', ' ')}
                              </p>
                            </div>
                          </label>
                          
                          <div className="text-right">
                            <p className="text-xs text-gray-600">Total a pagar</p>
                            <p className="text-xl font-bold text-green-700">
                              RD$ {formatearMoneda(total)}
                            </p>
                          </div>
                        </div>

                        {d.incluido && (
                          <div className="space-y-3 mt-3 pt-3 border-t border-gray-200">
                            
                            {/* Salario base (no editable) */}
                            <div className="bg-white rounded-lg p-3 text-sm">
                              <div className="grid grid-cols-3 gap-2">
                                <div>
                                  <p className="text-xs text-gray-500">Neto base</p>
                                  <p className="font-bold text-gray-900">
                                    RD$ {formatearMoneda(d.salario_neto_base)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Bruto</p>
                                  <p className="font-bold text-blue-700">
                                    RD$ {formatearMoneda(d.salario_bruto_base)}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-xs text-gray-500">Aporte TSS+AFP</p>
                                  <p className="font-bold text-purple-700">
                                    RD$ {formatearMoneda(d.aporte_tss_afp)}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {/* Bono extra */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  🎁 Bono extra (opcional)
                                </label>
                                <input
                                  type="number"
                                  step="100"
                                  min="0"
                                  value={d.bono_extra}
                                  onChange={(e) => actualizarDetalle(d.usuario_id, 'bono_extra', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Descripción del bono
                                </label>
                                <input
                                  type="text"
                                  value={d.bono_descripcion}
                                  onChange={(e) => actualizarDetalle(d.usuario_id, 'bono_descripcion', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  placeholder="Ej: Productividad, cumpleaños..."
                                />
                              </div>
                            </div>

                            {/* Ajustes +/- */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                              <div>
                                <label className="block text-xs font-semibold text-green-700 mb-1">
                                  ➕ Ajuste positivo
                                </label>
                                <input
                                  type="number"
                                  step="100"
                                  min="0"
                                  value={d.ajuste_positivo}
                                  onChange={(e) => actualizarDetalle(d.usuario_id, 'ajuste_positivo', e.target.value)}
                                  className="w-full px-3 py-2 border border-green-200 rounded-lg text-sm"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-red-700 mb-1">
                                  ➖ Ajuste negativo
                                </label>
                                <input
                                  type="number"
                                  step="100"
                                  min="0"
                                  value={d.ajuste_negativo}
                                  onChange={(e) => actualizarDetalle(d.usuario_id, 'ajuste_negativo', e.target.value)}
                                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm"
                                  placeholder="0"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-semibold text-gray-700 mb-1">
                                  Razón ajuste
                                </label>
                                <input
                                  type="text"
                                  value={d.ajuste_razon}
                                  onChange={(e) => actualizarDetalle(d.usuario_id, 'ajuste_razon', e.target.value)}
                                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                  placeholder="Ej: descuento por adelanto..."
                                />
                              </div>
                            </div>

                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Notas generales */}
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  📝 Notas generales del pago (opcional)
                </label>
                <textarea
                  value={notasGenerales}
                  onChange={(e) => setNotasGenerales(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  placeholder="Cualquier comentario sobre este pago..."
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  ⚠️ {error}
                </div>
              )}
            </>
          )}

          {/* PASO 2: CONFIRMACIÓN */}
          {paso === 'confirmacion' && (
            <div className="space-y-4">
              <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-6 text-center">
                <p className="text-5xl mb-3">⚠️</p>
                <h3 className="text-2xl font-bold text-yellow-900 mb-2">
                  ¿Confirmas el procesamiento?
                </h3>
                <p className="text-yellow-800 text-sm">
                  Esta acción quedará registrada y no se puede revertir fácilmente.
                </p>
              </div>

              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Período:</span>
                  <span className="font-bold">{periodo?.label}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Empleados a pagar:</span>
                  <span className="font-bold">{detallesIncluidos.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-700">Total bonos extra:</span>
                  <span className="font-bold text-orange-700">RD$ {formatearMoneda(totalBonos)}</span>
                </div>
                <div className="flex justify-between text-lg pt-2 border-t border-gray-300">
                  <span className="font-bold text-gray-900">TOTAL NETO A PAGAR:</span>
                  <span className="font-bold text-green-700">RD$ {formatearMoneda(totalNeto)}</span>
                </div>
                <div className="flex justify-between text-sm text-gray-600">
                  <span>Costo total (con aportes):</span>
                  <span>RD$ {formatearMoneda(totalBruto)}</span>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                  ⚠️ {error}
                </div>
              )}
            </div>
          )}

        </div>

        {/* FOOTER FIJO */}
        <div className="bg-gray-50 rounded-b-2xl p-4 flex justify-between gap-2 border-t border-gray-200">
          {paso === 'revision' && (
            <>
              <button
                onClick={onCerrar}
                disabled={procesando}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl disabled:opacity-50"
              >
                Cancelar
              </button>
              <div className="flex-1 text-center">
                <p className="text-xs text-gray-500">Total a pagar</p>
                <p className="text-2xl font-bold text-green-700">
                  RD$ {formatearMoneda(totalNeto)}
                </p>
              </div>
              <button
                onClick={() => setPaso('confirmacion')}
                disabled={procesando || detallesIncluidos.length === 0}
                className="px-6 py-3 bg-pink-600 hover:bg-pink-700 text-white font-bold rounded-xl disabled:opacity-50"
              >
                Continuar →
              </button>
            </>
          )}

          {paso === 'confirmacion' && (
            <>
              <button
                onClick={() => setPaso('revision')}
                disabled={procesando}
                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold rounded-xl disabled:opacity-50"
              >
                ← Volver
              </button>
              <button
                onClick={procesarPago}
                disabled={procesando}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {procesando ? (
                  <>
                    <span className="animate-spin">⏳</span> Procesando...
                  </>
                ) : (
                  <>
                    ✅ Confirmar y procesar pago
                  </>
                )}
              </button>
            </>
          )}
        </div>

      </div>
    </div>
  )
}

export default ModalPagarQuincena