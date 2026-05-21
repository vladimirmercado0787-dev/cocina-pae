import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import VistaDetalleContrato from './VistaDetalleContrato'

function VistaMiContrato({ usuario, empresaId, onVolver }) {
  const [contrato, setContrato] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [vistaCompleta, setVistaCompleta] = useState(false)

  useEffect(() => {
    if (usuario?.id && empresaId) cargarMiContrato()
  }, [usuario, empresaId])

  async function cargarMiContrato() {
    setCargando(true)

    const { data, error } = await supabase
      .from('contratos_empleados')
      .select(`
        *,
        usuario:usuarios(id, nombre, rol, sexo, foto_url, cedula)
      `)
      .eq('empresa_id', empresaId)
      .eq('usuario_id', usuario.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (error) {
      console.error('Error cargando contrato:', error)
    } else {
      setContrato(data)
    }

    setCargando(false)
  }

  function obtenerLabelTipo(tipo) {
    if (tipo === 'obra_servicio') return '📑 Obra/Servicio PAE'
    if (tipo === 'estacional') return '🌾 Estacional'
    if (tipo === 'indefinido') return '♾️ Indefinido'
    return tipo
  }

  function obtenerLabelFrecuencia(freq) {
    const mapa = { semanal: 'semanal', quincenal: 'quincenal', mensual: 'mensual' }
    return mapa[freq] || freq
  }

  function formatearFecha(fechaStr) {
    if (!fechaStr) return '—'
    const fecha = new Date(fechaStr + 'T00:00:00')
    return fecha.toLocaleDateString('es-DO', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return '—'
    const fecha = new Date(fechaStr)
    return fecha.toLocaleDateString('es-DO', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  // Si está viendo el contrato completo, mostrar VistaDetalleContrato
  if (vistaCompleta && contrato) {
    return (
      <VistaDetalleContrato 
        contratoId={contrato.id}
        onVolver={() => setVistaCompleta(false)}
      />
    )
  }

  if (cargando) {
    return (
      <div className="w-full max-w-3xl">
        <div className="text-center py-12 text-gray-500">
          ⏳ Cargando tu contrato...
        </div>
      </div>
    )
  }

  const fechaHoyTexto = new Date().toLocaleDateString('es-DO', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })

  return (
    <div className="w-full max-w-3xl">
      
      {/* HEADER */}
      <div className="bg-gradient-to-br from-cyan-600 to-blue-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-cyan-100 text-xs font-semibold tracking-wider">
              CONTRATO LABORAL
            </p>
            <h2 className="text-3xl font-bold mt-1">
              📄 Mi Contrato
            </h2>
            <p className="text-cyan-200 mt-1">
              {usuario.nombre} · {fechaHoyTexto}
            </p>
          </div>
          <button
            onClick={onVolver}
            className="bg-blue-800 hover:bg-blue-900 text-white text-sm px-4 py-2 rounded-lg"
          >
            ← Volver
          </button>
        </div>
      </div>

      {/* CONTENIDO SEGÚN ESTADO */}
      
      {/* CASO 1: NO TIENE CONTRATO */}
      {!contrato && (
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          <p className="text-6xl mb-4">📋</p>
          <h3 className="text-xl font-bold text-gray-900 mb-3">
            No tienes contrato gestionado en la app
          </h3>
          <p className="text-gray-600 max-w-md mx-auto mb-4">
            Tu contrato laboral puede estar siendo manejado por fuera de esta aplicación. 
          </p>
          <p className="text-sm text-gray-600 bg-blue-50 border border-blue-200 rounded-lg p-4 inline-block max-w-md">
            💡 Si tienes alguna pregunta sobre tu contrato, salario o condiciones laborales, 
            consulta directamente con la administración de la empresa.
          </p>
        </div>
      )}

      {/* CASO 2: CONTRATO EN BORRADOR (sin firmar todavía) */}
      {contrato && contrato.estado === 'borrador' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-6">
            <div className="flex items-start gap-3 mb-3">
              <span className="text-3xl">📝</span>
              <div>
                <h3 className="font-bold text-yellow-900 text-lg">
                  Tu contrato está en preparación
                </h3>
                <p className="text-yellow-800 text-sm mt-1">
                  El empleador está preparando tu contrato laboral. Pronto te llamará 
                  para firmarlo presencialmente.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
              📋 INFORMACIÓN PRELIMINAR
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Tipo de contrato:</span>
                <span className="font-bold">{obtenerLabelTipo(contrato.tipo_contrato)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Puesto:</span>
                <span className="font-bold">{contrato.puesto}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Salario:</span>
                <span className="font-bold text-green-700">
                  RD$ {Number(contrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })} {obtenerLabelFrecuencia(contrato.frecuencia_pago)}
                </span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Fecha inicio:</span>
                <span className="font-bold">{formatearFecha(contrato.fecha_inicio)}</span>
              </div>
              {contrato.fecha_fin && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Fecha fin:</span>
                  <span className="font-bold">{formatearFecha(contrato.fecha_fin)}</span>
                </div>
              )}
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <button
                onClick={() => setVistaCompleta(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg"
              >
                👁️ Ver detalles completos
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASO 3: CONTRATO PENDIENTE DE FIRMA */}
      {contrato && contrato.estado === 'pendiente_firma' && (
        <div className="space-y-4">
          <div className="bg-orange-50 border-2 border-orange-300 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⏳</span>
              <div>
                <h3 className="font-bold text-orange-900 text-lg">
                  Tu contrato está pendiente de firma
                </h3>
                <p className="text-orange-800 text-sm mt-2">
                  Acércate a tu empleador para completar la firma presencial del contrato. 
                  El proceso es rápido: ambos firman digitalmente en la app y luego se imprime 
                  una copia para tus archivos.
                </p>
                {contrato.firma_propietario_at && !contrato.firma_empleado_at && (
                  <p className="text-orange-700 text-xs mt-3 bg-white p-2 rounded">
                    ✅ El empleador ya firmó · ⏳ Falta tu firma
                  </p>
                )}
                {!contrato.firma_propietario_at && contrato.firma_empleado_at && (
                  <p className="text-orange-700 text-xs mt-3 bg-white p-2 rounded">
                    ✅ Tú ya firmaste · ⏳ Falta firma del empleador
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
              📋 RESUMEN DEL CONTRATO
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Tipo:</span>
                <span className="font-bold">{obtenerLabelTipo(contrato.tipo_contrato)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Puesto:</span>
                <span className="font-bold">{contrato.puesto}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Salario:</span>
                <span className="font-bold text-green-700">
                  RD$ {Number(contrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })} {obtenerLabelFrecuencia(contrato.frecuencia_pago)}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setVistaCompleta(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg"
              >
                👁️ Ver contrato completo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CASO 4: CONTRATO ACTIVO (firmado por ambas partes) */}
      {contrato && contrato.estado === 'activo' && (
        <div className="space-y-4">
          <div className="bg-green-50 border-2 border-green-300 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl">🟢</span>
              <div className="flex-1">
                <h3 className="font-bold text-green-900 text-lg">
                  Tu contrato está activo
                </h3>
                <p className="text-green-800 text-sm mt-1">
                  Tu contrato laboral está firmado por ambas partes y vigente.
                </p>
                {contrato.firma_empleado_at && (
                  <p className="text-green-700 text-xs mt-2">
                    ✅ Firmado el {formatearFechaCorta(contrato.firma_empleado_at)}
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
              📋 DETALLES DE TU CONTRATO
            </p>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Tipo de contrato:</span>
                <span className="font-bold">{obtenerLabelTipo(contrato.tipo_contrato)}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Puesto:</span>
                <span className="font-bold">{contrato.puesto}</span>
              </div>
              {contrato.año_escolar_inabie && (
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Año escolar:</span>
                  <span className="font-bold">{contrato.año_escolar_inabie}</span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Salario neto:</span>
                <span className="font-bold text-green-700">
                  RD$ {Number(contrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })} {obtenerLabelFrecuencia(contrato.frecuencia_pago)}
                </span>
              </div>
              {contrato.salario_bruto && (
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Salario bruto:</span>
                  <span className="font-bold text-blue-700">
                    RD$ {Number(contrato.salario_bruto).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Fecha de inicio:</span>
                <span className="font-bold">{formatearFecha(contrato.fecha_inicio)}</span>
              </div>
              {contrato.fecha_fin && (
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Fecha de fin:</span>
                  <span className="font-bold">{formatearFecha(contrato.fecha_fin)}</span>
                </div>
              )}
              {contrato.horario_trabajo && (
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Horario:</span>
                  <span className="font-bold">{contrato.horario_trabajo}</span>
                </div>
              )}
              {contrato.dias_laborales && (
                <div className="flex justify-between border-b border-gray-100 pb-2">
                  <span className="text-gray-600">Días laborales:</span>
                  <span className="font-bold">{contrato.dias_laborales}</span>
                </div>
              )}
              {contrato.lugar_trabajo && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Lugar de trabajo:</span>
                  <span className="font-bold text-right max-w-xs">{contrato.lugar_trabajo}</span>
                </div>
              )}
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <button
                onClick={() => setVistaCompleta(true)}
                className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2"
              >
                📄 Ver contrato completo
              </button>
              <button
                onClick={() => setVistaCompleta(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg flex items-center gap-2"
              >
                🖨️ Imprimir mi copia
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
            <p className="font-bold mb-1">💡 Información importante:</p>
            <ul className="list-disc list-inside space-y-1 text-blue-800">
              <li>Puedes consultar tu contrato en cualquier momento desde aquí.</li>
              <li>Si necesitas una copia física, usa el botón "Imprimir mi copia".</li>
              <li>Si tienes dudas sobre el contenido, consulta con la administración.</li>
            </ul>
          </div>
        </div>
      )}

      {/* CASO 5: CONTRATO TERMINADO */}
      {contrato && contrato.estado === 'terminado' && (
        <div className="space-y-4">
          <div className="bg-gray-100 border-2 border-gray-300 rounded-2xl p-6">
            <div className="flex items-start gap-3">
              <span className="text-3xl">⚪</span>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">
                  Tu contrato anterior está terminado
                </h3>
                <p className="text-gray-700 text-sm mt-1">
                  Este contrato concluyó. Tu historial laboral se conserva para referencia.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-xl p-6">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
              📋 ÚLTIMO CONTRATO
            </p>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Puesto:</span>
                <span className="font-bold">{contrato.puesto}</span>
              </div>
              <div className="flex justify-between border-b border-gray-100 pb-2">
                <span className="text-gray-600">Período:</span>
                <span className="font-bold">
                  {formatearFecha(contrato.fecha_inicio)}
                  {contrato.fecha_fin && ` → ${formatearFecha(contrato.fecha_fin)}`}
                </span>
              </div>
            </div>

            <div className="mt-4">
              <button
                onClick={() => setVistaCompleta(true)}
                className="bg-gray-600 hover:bg-gray-700 text-white text-sm font-bold px-4 py-2 rounded-lg"
              >
                📄 Ver contrato completo
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default VistaMiContrato