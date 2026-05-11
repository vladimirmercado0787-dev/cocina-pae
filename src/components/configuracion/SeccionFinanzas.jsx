import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function SeccionFinanzas({ empresaId, mostrarExito }) {
  const [datos, setDatos] = useState({
    anticipo_porcentaje: 20,
    dias_pago_promedio: 90,
    costo_objetivo_racion: 35,
    margen_minimo_porcentaje: 25,
    frecuencia_pago_empleados: 'quincenal',
    usa_ecf: false,
    rnc_certificado_ecf: '',
    boton_emergencia_activo: false,
    telefono_emergencia_1: '',
    telefono_emergencia_2: '',
    contador_externo: false,
    contador_nombre: '',
    contador_iguala_mensual: '',
  })
  const [finanzasId, setFinanzasId] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)

  useEffect(() => {
    cargarFinanzas()
  }, [empresaId])

  async function cargarFinanzas() {
    setCargando(true)
    const { data } = await supabase
      .from('finanzas')
      .select('*')
      .eq('empresa_id', empresaId)
      .maybeSingle()
    
    if (data) {
      setFinanzasId(data.id)
      setDatos({
        anticipo_porcentaje: data.anticipo_porcentaje || 20,
        dias_pago_promedio: data.dias_pago_promedio || 90,
        costo_objetivo_racion: data.costo_objetivo_racion || 35,
        margen_minimo_porcentaje: data.margen_minimo_porcentaje || 25,
        frecuencia_pago_empleados: data.frecuencia_pago_empleados || 'quincenal',
        usa_ecf: data.usa_ecf || false,
        rnc_certificado_ecf: data.rnc_certificado_ecf || '',
        boton_emergencia_activo: data.boton_emergencia_activo || false,
        telefono_emergencia_1: data.telefono_emergencia_1 || '',
        telefono_emergencia_2: data.telefono_emergencia_2 || '',
        contador_externo: data.contador_externo || false,
        contador_nombre: data.contador_nombre || '',
        contador_iguala_mensual: data.contador_iguala_mensual || '',
      })
    }
    setCargando(false)
  }

  function actualizarCampo(campo, valor) {
    setDatos({ ...datos, [campo]: valor })
  }

  async function guardar() {
    setGuardando(true)
    
    let error
    if (finanzasId) {
      const result = await supabase
        .from('finanzas')
        .update(datos)
        .eq('id', finanzasId)
      error = result.error
    } else {
      const result = await supabase
        .from('finanzas')
        .insert([{ ...datos, empresa_id: empresaId }])
      error = result.error
    }
    
    setGuardando(false)
    
    if (error) {
      alert('Error: ' + error.message)
      return
    }
    
    mostrarExito('Finanzas actualizadas')
    cargarFinanzas()
  }

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando finanzas...</div>
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-2xl font-bold text-gray-900">💰 Finanzas</h3>
        <p className="text-gray-500 text-sm mt-1">Configuración financiera y operativa</p>
      </div>

      <div className="space-y-6">

        {/* INABIE */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h4 className="font-bold text-blue-900 mb-3">📋 INABIE</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Anticipo (%)</label>
              <input
                type="number"
                value={datos.anticipo_porcentaje}
                onChange={(e) => actualizarCampo('anticipo_porcentaje', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Días promedio de pago</label>
              <input
                type="number"
                value={datos.dias_pago_promedio}
                onChange={(e) => actualizarCampo('dias_pago_promedio', parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Costos */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <h4 className="font-bold text-orange-900 mb-3">💵 Costos y márgenes</h4>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Costo objetivo por ración (RD$)</label>
              <input
                type="number"
                step="0.01"
                value={datos.costo_objetivo_racion}
                onChange={(e) => actualizarCampo('costo_objetivo_racion', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Margen mínimo (%)</label>
              <input
                type="number"
                value={datos.margen_minimo_porcentaje}
                onChange={(e) => actualizarCampo('margen_minimo_porcentaje', parseFloat(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          </div>
        </div>

        {/* Empleados */}
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h4 className="font-bold text-green-900 mb-3">👥 Empleados</h4>
          <label className="block text-xs font-semibold text-gray-600 mb-2">Frecuencia de pago</label>
          <div className="grid grid-cols-3 gap-2">
            {['semanal', 'quincenal', 'mensual'].map(f => (
              <button
                key={f}
                onClick={() => actualizarCampo('frecuencia_pago_empleados', f)}
                className={`p-2 rounded-lg border-2 text-sm font-semibold transition-colors capitalize ${
                  datos.frecuencia_pago_empleados === f
                    ? 'border-green-500 bg-green-100'
                    : 'border-gray-200 hover:border-gray-300 bg-white'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* e-CF */}
        <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
          <h4 className="font-bold text-purple-900 mb-3">🧾 Facturación electrónica</h4>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={datos.usa_ecf}
              onChange={(e) => actualizarCampo('usa_ecf', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-semibold">Usar e-CF (DGII)</span>
          </label>
          {datos.usa_ecf && (
            <input
              type="text"
              placeholder="RNC certificado e-CF"
              value={datos.rnc_certificado_ecf}
              onChange={(e) => actualizarCampo('rnc_certificado_ecf', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
            />
          )}
        </div>

        {/* Emergencia */}
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <h4 className="font-bold text-red-900 mb-3">🚨 Botón de emergencia</h4>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={datos.boton_emergencia_activo}
              onChange={(e) => actualizarCampo('boton_emergencia_activo', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-semibold">Activar botón de emergencia</span>
          </label>
          {datos.boton_emergencia_activo && (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Teléfono 1"
                value={datos.telefono_emergencia_1}
                onChange={(e) => actualizarCampo('telefono_emergencia_1', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Teléfono 2"
                value={datos.telefono_emergencia_2}
                onChange={(e) => actualizarCampo('telefono_emergencia_2', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
        </div>

        {/* Contador */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h4 className="font-bold text-yellow-900 mb-3">🧮 Contador externo</h4>
          <label className="flex items-center gap-2 mb-3">
            <input
              type="checkbox"
              checked={datos.contador_externo}
              onChange={(e) => actualizarCampo('contador_externo', e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-sm font-semibold">Tengo contador externo</span>
          </label>
          {datos.contador_externo && (
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Nombre del contador"
                value={datos.contador_nombre}
                onChange={(e) => actualizarCampo('contador_nombre', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="number"
                placeholder="Iguala mensual (RD$)"
                value={datos.contador_iguala_mensual}
                onChange={(e) => actualizarCampo('contador_iguala_mensual', e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
          )}
        </div>

        {/* Guardar */}
        <div className="pt-4 flex justify-end">
          <button
            onClick={guardar}
            disabled={guardando}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold px-6 py-3 rounded-xl"
          >
            {guardando ? '⏳ Guardando...' : '💾 Guardar Cambios'}
          </button>
        </div>

      </div>
    </div>
  )
}

export default SeccionFinanzas