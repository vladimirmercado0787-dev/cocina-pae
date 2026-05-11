import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function Paso6Finanzas({ empresaId }) {
  const [finanzasId, setFinanzasId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  const [datos, setDatos] = useState({
    anticipo_porcentaje: '20.00',
    dias_pago_promedio: '78',
    costo_objetivo_racion: '35.00',
    margen_minimo_porcentaje: '25.00',
    frecuencia_pago_empleados: 'quincenal',
    usa_ecf: false,
    rnc_certificado_ecf: '',
    boton_emergencia_activo: true,
    telefono_emergencia_1: '',
    telefono_emergencia_2: '',
    contador_externo: false,
    contador_nombre: '',
    contador_iguala_mensual: ''
  })

  useEffect(() => {
    if (empresaId) cargarFinanzas()
  }, [empresaId])

  async function cargarFinanzas() {
    const { data, error } = await supabase
      .from('finanzas')
      .select('*')
      .eq('empresa_id', empresaId)
      .single()

    if (data && !error) {
      setFinanzasId(data.id)
      setDatos({
        anticipo_porcentaje: data.anticipo_porcentaje?.toString() || '20.00',
        dias_pago_promedio: data.dias_pago_promedio?.toString() || '78',
        costo_objetivo_racion: data.costo_objetivo_racion?.toString() || '35.00',
        margen_minimo_porcentaje: data.margen_minimo_porcentaje?.toString() || '25.00',
        frecuencia_pago_empleados: data.frecuencia_pago_empleados || 'quincenal',
        usa_ecf: data.usa_ecf || false,
        rnc_certificado_ecf: data.rnc_certificado_ecf || '',
        boton_emergencia_activo: data.boton_emergencia_activo ?? true,
        telefono_emergencia_1: data.telefono_emergencia_1 || '',
        telefono_emergencia_2: data.telefono_emergencia_2 || '',
        contador_externo: data.contador_externo || false,
        contador_nombre: data.contador_nombre || '',
        contador_iguala_mensual: data.contador_iguala_mensual?.toString() || ''
      })
    }
  }

  function actualizarCampo(campo, valor) {
    setDatos({ ...datos, [campo]: valor })
  }

  async function guardar(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)

    try {
      const datosParaGuardar = {
        empresa_id: empresaId,
        anticipo_porcentaje: parseFloat(datos.anticipo_porcentaje) || 20.00,
        dias_pago_promedio: parseInt(datos.dias_pago_promedio) || 78,
        costo_objetivo_racion: parseFloat(datos.costo_objetivo_racion) || 35.00,
        margen_minimo_porcentaje: parseFloat(datos.margen_minimo_porcentaje) || 25.00,
        frecuencia_pago_empleados: datos.frecuencia_pago_empleados,
        usa_ecf: datos.usa_ecf,
        rnc_certificado_ecf: datos.rnc_certificado_ecf || null,
        boton_emergencia_activo: datos.boton_emergencia_activo,
        telefono_emergencia_1: datos.telefono_emergencia_1 || null,
        telefono_emergencia_2: datos.telefono_emergencia_2 || null,
        contador_externo: datos.contador_externo,
        contador_nombre: datos.contador_nombre || null,
        contador_iguala_mensual: datos.contador_iguala_mensual ? parseFloat(datos.contador_iguala_mensual) : null,
        updated_at: new Date().toISOString()
      }

      let error
      if (finanzasId) {
        const result = await supabase
          .from('finanzas')
          .update(datosParaGuardar)
          .eq('id', finanzasId)
        error = result.error
      } else {
        const result = await supabase
          .from('finanzas')
          .insert([datosParaGuardar])
          .select()
        error = result.error
        if (result.data && result.data[0]) setFinanzasId(result.data[0].id)
      }

      if (error) {
        setMensaje({ tipo: 'error', texto: 'Error: ' + error.message })
      } else {
        setMensaje({ tipo: 'exito', texto: '✅ Configuración financiera guardada' })
      }
    } catch (err) {
      setMensaje({ tipo: 'error', texto: 'Error: ' + err.message })
    } finally {
      setGuardando(false)
    }
  }

  if (!empresaId) {
    return (
      <div className="bg-yellow-50 border border-yellow-300 rounded-2xl p-8 max-w-3xl w-full">
        <p className="text-yellow-800">Primero registra tu cocina en el Paso 1</p>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 max-w-3xl w-full">

      <div className="mb-6">
        <p className="text-xs text-orange-600 font-semibold tracking-wider mb-1">
          PASO 6 DE 6 · ESTIMADO 5 MIN · ULTIMO PASO
        </p>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">
          💰 Finanzas
        </h2>
        <p className="text-gray-600">
          Configuración financiera y de pagos
        </p>
      </div>

      <form onSubmit={guardar} className="space-y-6">

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
          <h3 className="font-bold text-blue-900 mb-3">
            🏛️ Pagos de INABIE
          </h3>
          <p className="text-xs text-blue-700 mb-4">
            INABIE paga un anticipo y luego salda en bloques cada 2-3 facturas
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Anticipo INABIE (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={datos.anticipo_porcentaje}
                onChange={(e) => actualizarCampo('anticipo_porcentaje', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">Tipico: 20%</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Dias promedio de pago
              </label>
              <input
                type="number"
                value={datos.dias_pago_promedio}
                onChange={(e) => actualizarCampo('dias_pago_promedio', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">Tipico: 78 dias</p>
            </div>
          </div>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-5">
          <h3 className="font-bold text-green-900 mb-3">
            📊 Costos y margenes
          </h3>
          <p className="text-xs text-green-700 mb-4">
            La app te alertara si el margen baja del minimo
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Costo objetivo por racion (RD$)
              </label>
              <input
                type="number"
                step="0.01"
                value={datos.costo_objetivo_racion}
                onChange={(e) => actualizarCampo('costo_objetivo_racion', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">Lo que debe costar producir</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Margen minimo (%)
              </label>
              <input
                type="number"
                step="0.01"
                value={datos.margen_minimo_porcentaje}
                onChange={(e) => actualizarCampo('margen_minimo_porcentaje', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              />
              <p className="text-xs text-gray-500 mt-1">Alerta si baja de aqui</p>
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-gray-900 mb-3">
            👥 Pago de empleados
          </h3>
          <label className="block text-sm font-semibold text-gray-700 mb-2">
            Frecuencia de pago
          </label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => actualizarCampo('frecuencia_pago_empleados', 'semanal')}
              className={`p-3 rounded-lg text-center border-2 ${
                datos.frecuencia_pago_empleados === 'semanal'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <p className="font-semibold text-sm text-gray-900">Semanal</p>
              <p className="text-xs text-gray-500">Cada viernes</p>
            </button>
            <button
              type="button"
              onClick={() => actualizarCampo('frecuencia_pago_empleados', 'quincenal')}
              className={`p-3 rounded-lg text-center border-2 ${
                datos.frecuencia_pago_empleados === 'quincenal'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <p className="font-semibold text-sm text-gray-900">Quincenal</p>
              <p className="text-xs text-gray-500">Cada 15 dias</p>
            </button>
            <button
              type="button"
              onClick={() => actualizarCampo('frecuencia_pago_empleados', 'mensual')}
              className={`p-3 rounded-lg text-center border-2 ${
                datos.frecuencia_pago_empleados === 'mensual'
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white'
              }`}
            >
              <p className="font-semibold text-sm text-gray-900">Mensual</p>
              <p className="text-xs text-gray-500">Fin de mes</p>
            </button>
          </div>
        </div>

        <div className="bg-purple-50 border border-purple-200 rounded-lg p-5">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={datos.usa_ecf}
              onChange={(e) => actualizarCampo('usa_ecf', e.target.checked)}
              className="mt-1 w-5 h-5"
            />
            <div className="flex-1">
              <p className="font-bold text-purple-900">🧾 Tengo factura electronica e-CF activa</p>
              <p className="text-xs text-purple-700 mt-1">
                Si tienes certificacion de DGII para emitir e-CF
              </p>
            </div>
          </label>
          {datos.usa_ecf && (
            <div className="mt-3">
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Numero de certificado e-CF
              </label>
              <input
                type="text"
                value={datos.rnc_certificado_ecf}
                onChange={(e) => actualizarCampo('rnc_certificado_ecf', e.target.value)}
                placeholder="Ej: E310000001"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
              />
            </div>
          )}
        </div>

        <div className="bg-red-50 border border-red-200 rounded-lg p-5">
          <label className="flex items-start gap-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={datos.boton_emergencia_activo}
              onChange={(e) => actualizarCampo('boton_emergencia_activo', e.target.checked)}
              className="mt-1 w-5 h-5"
            />
            <div className="flex-1">
              <p className="font-bold text-red-900">🚨 Boton de emergencia activo</p>
              <p className="text-xs text-red-700 mt-1">
                Mantener presionado 3 segundos para llamar a los contactos
              </p>
            </div>
          </label>
          {datos.boton_emergencia_activo && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Telefono 1
                </label>
                <input
                  type="tel"
                  value={datos.telefono_emergencia_1}
                  onChange={(e) => actualizarCampo('telefono_emergencia_1', e.target.value)}
                  placeholder="809-555-0000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Telefono 2
                </label>
                <input
                  type="tel"
                  value={datos.telefono_emergencia_2}
                  onChange={(e) => actualizarCampo('telefono_emergencia_2', e.target.value)}
                  placeholder="809-555-0000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </div>
          )}
        </div>

        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-5">
          <label className="flex items-start gap-3 cursor-pointer mb-3">
            <input
              type="checkbox"
              checked={datos.contador_externo}
              onChange={(e) => actualizarCampo('contador_externo', e.target.checked)}
              className="mt-1 w-5 h-5"
            />
            <div className="flex-1">
              <p className="font-bold text-yellow-900">🧮 Tengo contador externo</p>
              <p className="text-xs text-yellow-700 mt-1">
                Lic. que maneja TSS, ITBIS y declaraciones DGII
              </p>
            </div>
          </label>
          {datos.contador_externo && (
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Nombre del contador
                </label>
                <input
                  type="text"
                  value={datos.contador_nombre}
                  onChange={(e) => actualizarCampo('contador_nombre', e.target.value)}
                  placeholder="Lic. Perez"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  Iguala mensual (RD$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={datos.contador_iguala_mensual}
                  onChange={(e) => actualizarCampo('contador_iguala_mensual', e.target.value)}
                  placeholder="5000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg bg-white"
                />
              </div>
            </div>
          )}
        </div>

        {mensaje && (
          <div className={`p-4 rounded-lg ${mensaje.tipo === 'exito' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {mensaje.texto}
          </div>
        )}

        <button
          type="submit"
          disabled={guardando}
          className="w-full bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white font-bold py-3 px-6 rounded-lg transition-colors text-lg"
        >
          {guardando ? 'Guardando...' : '💾 Guardar configuracion'}
        </button>

      </form>
    </div>
  )
}

export default Paso6Finanzas