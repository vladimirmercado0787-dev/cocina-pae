import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

function SeccionNomina({ empresa, onActualizado, mostrarExito }) {
  const [frecuencia, setFrecuencia] = useState('quincenal')
  const [diaPago1, setDiaPago1] = useState(15)
  const [diaPago2, setDiaPago2] = useState(30)
  const [descuento, setDescuento] = useState(5.74)
  const [guardando, setGuardando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (empresa) {
      setFrecuencia(empresa.nomina_frecuencia || 'quincenal')
      setDiaPago1(empresa.nomina_dia_pago_1 || 15)
      setDiaPago2(empresa.nomina_dia_pago_2 || 30)
      setDescuento(empresa.nomina_descuento_porcentaje || 5.74)
    }
  }, [empresa])

  async function guardar() {
    setError('')

    // Validaciones
    if (frecuencia === 'quincenal' && (diaPago1 < 1 || diaPago1 > 28)) {
      setError('El día de la 1ra quincena debe estar entre 1 y 28')
      return
    }
    if (frecuencia === 'quincenal' && (diaPago2 < 1 || diaPago2 > 31)) {
      setError('El día de la 2da quincena debe estar entre 1 y 31')
      return
    }
    if (frecuencia === 'quincenal' && diaPago1 >= diaPago2) {
      setError('La 2da quincena debe ser un día posterior a la 1ra')
      return
    }
    if (frecuencia === 'mensual' && (diaPago1 < 1 || diaPago1 > 28)) {
      setError('El día de pago mensual debe estar entre 1 y 28')
      return
    }
    if (descuento < 0 || descuento > 100) {
      setError('El descuento debe estar entre 0% y 100%')
      return
    }

    setGuardando(true)

    const { error: errorUpdate } = await supabase
      .from('empresas')
      .update({
        nomina_frecuencia: frecuencia,
        nomina_dia_pago_1: parseInt(diaPago1),
        nomina_dia_pago_2: frecuencia === 'quincenal' ? parseInt(diaPago2) : null,
        nomina_descuento_porcentaje: parseFloat(descuento),
      })
      .eq('id', empresa.id)

    if (errorUpdate) {
      setError('Error al guardar: ' + errorUpdate.message)
      setGuardando(false)
      return
    }

    setGuardando(false)
    if (onActualizado) onActualizado()
    if (mostrarExito) mostrarExito('Configuración de nómina guardada')
  }

  // Cálculo de ejemplo (para mostrarle al usuario)
  const salarioEjemplo = 12000
  const descuentoDecimal = parseFloat(descuento) / 100
  const factor = 1 - descuentoDecimal
  const brutoEjemplo = factor > 0 ? salarioEjemplo / factor : 0
  const aporteEjemplo = brutoEjemplo - salarioEjemplo

  return (
    <div className="space-y-6">
      
      {/* Título */}
      <div>
        <h3 className="text-xl font-bold text-gray-900 flex items-center gap-2">
          💰 Configuración de Nómina
        </h3>
        <p className="text-sm text-gray-600 mt-1">
          Define cómo y cuándo se paga a los empleados de tu empresa.
        </p>
      </div>

      {/* Frecuencia de pago */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5">
        <p className="text-xs text-blue-800 font-semibold tracking-wider mb-3">
          📅 FRECUENCIA DE PAGO
        </p>
        <div className="space-y-2">
          
          <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            frecuencia === 'semanal' ? 'bg-white border-2 border-blue-500' : 'bg-white border border-gray-200 hover:border-gray-400'
          }`}>
            <input
              type="radio"
              name="frecuencia"
              value="semanal"
              checked={frecuencia === 'semanal'}
              onChange={(e) => setFrecuencia(e.target.value)}
              className="mt-1"
            />
            <div>
              <p className="font-bold text-gray-900">📆 Semanal</p>
              <p className="text-xs text-gray-600">
                Un pago cada semana (52 pagos al año)
              </p>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            frecuencia === 'quincenal' ? 'bg-white border-2 border-blue-500' : 'bg-white border border-gray-200 hover:border-gray-400'
          }`}>
            <input
              type="radio"
              name="frecuencia"
              value="quincenal"
              checked={frecuencia === 'quincenal'}
              onChange={(e) => setFrecuencia(e.target.value)}
              className="mt-1"
            />
            <div>
              <p className="font-bold text-gray-900">📅 Quincenal (recomendado)</p>
              <p className="text-xs text-gray-600">
                Dos pagos al mes (24 pagos al año)
              </p>
            </div>
          </label>

          <label className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
            frecuencia === 'mensual' ? 'bg-white border-2 border-blue-500' : 'bg-white border border-gray-200 hover:border-gray-400'
          }`}>
            <input
              type="radio"
              name="frecuencia"
              value="mensual"
              checked={frecuencia === 'mensual'}
              onChange={(e) => setFrecuencia(e.target.value)}
              className="mt-1"
            />
            <div>
              <p className="font-bold text-gray-900">🗓️ Mensual</p>
              <p className="text-xs text-gray-600">
                Un pago al mes (12 pagos al año)
              </p>
            </div>
          </label>

        </div>
      </div>

      {/* Días de pago */}
      <div className="bg-green-50 border border-green-200 rounded-xl p-5">
        <p className="text-xs text-green-800 font-semibold tracking-wider mb-3">
          📆 DÍAS DE PAGO
        </p>

        {frecuencia === 'semanal' && (
          <div className="bg-white border border-green-200 rounded-lg p-3 text-sm text-gray-700">
            ℹ️ Para pagos semanales, podrás registrar el pago cualquier día de la semana 
            desde el módulo de Nómina.
          </div>
        )}

        {frecuencia === 'mensual' && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Día del mes en que paga:
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="1"
                max="28"
                value={diaPago1}
                onChange={(e) => setDiaPago1(e.target.value)}
                className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold text-lg"
              />
              <span className="text-gray-700">del mes</span>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              💡 Recomendado: día 1, 5, 15 o 30 (evitar 29, 30, 31 si quieres pagar el último día de febrero también)
            </p>
          </div>
        )}

        {frecuencia === 'quincenal' && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                1ra Quincena — Día de pago:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="28"
                  value={diaPago1}
                  onChange={(e) => setDiaPago1(e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold text-lg"
                />
                <span className="text-gray-700">del mes (cubre días 1 al 15)</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                2da Quincena — Día de pago:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={diaPago2}
                  onChange={(e) => setDiaPago2(e.target.value)}
                  className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold text-lg"
                />
                <span className="text-gray-700">del mes (cubre días 16 al 30/31)</span>
              </div>
            </div>

            <div className="bg-white border border-green-200 rounded-lg p-3 text-xs text-gray-600">
              💡 Ejemplo común: día 15 y día 30. Si el día de pago cae en domingo o feriado, 
              puedes adelantar o atrasar el pago al ejecutarlo.
            </div>
          </div>
        )}
      </div>

      {/* Descuento TSS+AFP */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-5">
        <p className="text-xs text-purple-800 font-semibold tracking-wider mb-3">
          💼 DESCUENTO TSS + AFP
        </p>

        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Porcentaje de descuento al empleado:
        </label>
        <div className="flex items-center gap-2 mb-3">
          <input
            type="number"
            step="0.01"
            min="0"
            max="100"
            value={descuento}
            onChange={(e) => setDescuento(e.target.value)}
            className="w-32 px-3 py-2 border border-gray-300 rounded-lg text-center font-bold text-lg"
          />
          <span className="text-gray-700">%</span>
        </div>

        <div className="bg-white border border-purple-200 rounded-lg p-3 text-xs text-gray-700">
          ℹ️ <strong>5.74% es el estándar en República Dominicana</strong>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>2.87% para Seguridad Social (TSS)</li>
            <li>2.87% para Fondo de Pensiones (AFP)</li>
          </ul>
          <p className="mt-2">
            Cambia este valor solo si tu empresa tiene un esquema diferente acordado con la DGT.
          </p>
        </div>
      </div>

      {/* Ejemplo de cálculo */}
      <div className="bg-gradient-to-br from-amber-50 to-yellow-50 border border-amber-200 rounded-xl p-5">
        <p className="text-xs text-amber-800 font-semibold tracking-wider mb-3">
          💡 EJEMPLO DE CÁLCULO
        </p>

        <p className="text-sm text-gray-700 mb-3">
          Si pagas a un empleado <strong>RD$ {salarioEjemplo.toLocaleString('es-DO')} netos</strong> por {frecuencia === 'semanal' ? 'semana' : frecuencia === 'quincenal' ? 'quincena' : 'mes'}:
        </p>

        <div className="bg-white border border-amber-200 rounded-lg p-4">
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <p className="text-xs text-gray-500">Salario neto</p>
              <p className="font-bold text-green-700">
                RD$ {salarioEjemplo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">+ Aporte TSS+AFP ({descuento}%)</p>
              <p className="font-bold text-orange-700">
                RD$ {aporteEjemplo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div>
              <p className="text-xs text-gray-500">= Salario bruto</p>
              <p className="font-bold text-blue-700">
                RD$ {brutoEjemplo.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-600 mt-3">
          📊 La app calcula automáticamente el bruto a partir del neto que registras 
          para cada empleado. El aporte TSS+AFP se reporta como costo del empleador.
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
          ⚠️ {error}
        </div>
      )}

      {/* Botón guardar */}
      <div className="flex justify-end pt-2 border-t border-gray-200">
        <button
          onClick={guardar}
          disabled={guardando}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-lg disabled:opacity-50 flex items-center gap-2"
        >
          {guardando ? (
            <>
              <span className="animate-spin">⏳</span> Guardando...
            </>
          ) : (
            '💾 Guardar configuración'
          )}
        </button>
      </div>

    </div>
  )
}

export default SeccionNomina