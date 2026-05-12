import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
]

function FacturaInabie({ usuario, empresaId, onVolver }) {
  const hoy = new Date()
  const [modo, setModo] = useState('mensual') // 'mensual' | 'diaria'
  const [mes, setMes] = useState(hoy.getMonth())
  const [anio, setAnio] = useState(hoy.getFullYear())
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoy.toISOString().split('T')[0])
  
  const [empresa, setEmpresa] = useState(null)
  const [finanzas, setFinanzas] = useState(null)
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [recetas, setRecetas] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    cargarDatos()
  }, [empresaId, mes, anio, fechaSeleccionada, modo])

  async function cargarDatos() {
    setCargando(true)

    const { data: empresaData } = await supabase
      .from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)

    const { data: finanzasData } = await supabase
      .from('finanzas').select('*').eq('empresa_id', empresaId).maybeSingle()
    setFinanzas(finanzasData)

    const { data: escuelasData } = await supabase
      .from('escuelas').select('*').eq('empresa_id', empresaId).eq('activa', true)
    setEscuelas(escuelasData || [])

    const { data: recetasData } = await supabase
      .from('recetas').select('*').eq('empresa_id', empresaId)
    setRecetas(recetasData || [])

    if (modo === 'mensual') {
      const inicioMes = new Date(anio, mes, 1).toISOString().split('T')[0]
      const finMes = new Date(anio, mes + 1, 0).toISOString().split('T')[0]
      
      const { data: opsData } = await supabase
        .from('operaciones_dia')
        .select('*')
        .eq('empresa_id', empresaId)
        .gte('fecha', inicioMes)
        .lte('fecha', finMes)
        .in('estado', ['entregada', 'cerrada'])
      setOperaciones(opsData || [])
    } else {
      const { data: opsData } = await supabase
        .from('operaciones_dia')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('fecha', fechaSeleccionada)
        .in('estado', ['entregada', 'cerrada'])
      setOperaciones(opsData || [])
    }

    setCargando(false)
  }

  function imprimir() {
    window.print()
  }

  if (cargando) {
    return <div className="text-center py-12 text-gray-500">Cargando...</div>
  }

  return (
    <div className="w-full max-w-5xl">
      
      {/* Header (no se imprime) */}
      <div className="print:hidden bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start mb-4">
          <div>
            <p className="text-indigo-100 text-xs font-semibold tracking-wider">FACTURACIÓN INABIE</p>
            <h2 className="text-3xl font-bold mt-1">📄 Factura / Conduce</h2>
            <p className="text-indigo-200 mt-1">{empresa?.nombre}</p>
          </div>
          <button
            onClick={onVolver}
            className="bg-indigo-700 hover:bg-indigo-900 text-white text-sm px-4 py-2 rounded-lg"
          >
            ← Volver
          </button>
        </div>

        {/* Selector de MODO */}
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setModo('mensual')}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
              modo === 'mensual'
                ? 'bg-white text-indigo-700'
                : 'bg-indigo-700 hover:bg-indigo-900 text-white'
            }`}
          >
            📊 Factura Mensual
          </button>
          <button
            onClick={() => setModo('diaria')}
            className={`flex-1 px-4 py-3 rounded-xl text-sm font-bold transition-colors ${
              modo === 'diaria'
                ? 'bg-white text-indigo-700'
                : 'bg-indigo-700 hover:bg-indigo-900 text-white'
            }`}
          >
            📅 Conduces Diarios
          </button>
        </div>

        {/* Selector de PERÍODO según modo */}
        <div className="flex gap-3 flex-wrap">
          {modo === 'mensual' ? (
            <>
              <select
                value={mes}
                onChange={(e) => setMes(parseInt(e.target.value))}
                className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold"
              >
                {MESES.map((m, i) => (
                  <option key={i} value={i}>{m}</option>
                ))}
              </select>
              <select
                value={anio}
                onChange={(e) => setAnio(parseInt(e.target.value))}
                className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold"
              >
                {[2024, 2025, 2026, 2027, 2028].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </>
          ) : (
            <input
              type="date"
              value={fechaSeleccionada}
              onChange={(e) => setFechaSeleccionada(e.target.value)}
              className="bg-white text-gray-900 px-4 py-2 rounded-lg text-sm font-semibold"
            />
          )}
          <button
            onClick={imprimir}
            className="bg-white text-indigo-700 hover:bg-gray-100 font-bold px-4 py-2 rounded-lg text-sm ml-auto"
          >
            🖨️ Imprimir / PDF
          </button>
        </div>
      </div>

      {/* DOCUMENTO IMPRIMIBLE */}
      {modo === 'mensual' ? (
        <FacturaMensual
          empresa={empresa}
          finanzas={finanzas}
          escuelas={escuelas}
          operaciones={operaciones}
          mes={mes}
          anio={anio}
        />
      ) : (
        <ConducesDiarios
          empresa={empresa}
          finanzas={finanzas}
          escuelas={escuelas}
          operaciones={operaciones}
          recetas={recetas}
          fecha={fechaSeleccionada}
        />
      )}

      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body { background: white !important; }
          @page { margin: 1.5cm; }
          .page-break { page-break-after: always; }
          .page-break:last-child { page-break-after: auto; }
        }
      `}</style>

    </div>
  )
}

// ============================================
// FACTURA MENSUAL (totalidad del mes)
// ============================================
function FacturaMensual({ empresa, finanzas, escuelas, operaciones, mes, anio }) {
  const resumenPorEscuela = escuelas.map(escuela => {
    const opsEscuela = operaciones.filter(op => op.escuela_id === escuela.id)
    const totalRaciones = opsEscuela.reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
    const precioRacion = parseFloat(escuela.precio_racion || 0)
    const subtotal = totalRaciones * precioRacion
    const diasTrabajados = opsEscuela.length
    const conducesFirmados = opsEscuela.filter(op => op.firma_imagen).length

    return {
      escuela,
      diasTrabajados,
      totalRaciones,
      precioRacion,
      subtotal,
      conducesFirmados,
    }
  }).filter(item => item.totalRaciones > 0)

  const totalRacionesMes = resumenPorEscuela.reduce((sum, item) => sum + item.totalRaciones, 0)
  const totalFacturacion = resumenPorEscuela.reduce((sum, item) => sum + item.subtotal, 0)
  const totalConducesFirmados = resumenPorEscuela.reduce((sum, item) => sum + item.conducesFirmados, 0)
  const anticipoPct = parseFloat(finanzas?.anticipo_porcentaje || 20)
  const anticipoMonto = totalFacturacion * (anticipoPct / 100)
  const pendienteCobrar = totalFacturacion - anticipoMonto

  const numeroFactura = `${anio}-${String(mes + 1).padStart(2, '0')}-${empresa?.rnc?.replace(/-/g, '').slice(-4) || '0001'}`

  return (
    <div className="bg-white rounded-2xl shadow-xl p-8 print:shadow-none print:p-4">

      <div className="border-b-2 border-gray-900 pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{empresa?.nombre || 'Mi Cocina'}</h1>
            <p className="text-sm text-gray-600 mt-1">RNC: {empresa?.rnc || '—'}</p>
            <p className="text-sm text-gray-600">{empresa?.direccion || ''}</p>
            <p className="text-sm text-gray-600">
              {empresa?.telefono && `📞 ${empresa.telefono}`}
              {empresa?.email && ` · ✉️ ${empresa.email}`}
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 font-semibold tracking-wider">FACTURA</p>
            <p className="text-xl font-bold text-gray-900">N° {numeroFactura}</p>
            <p className="text-sm text-gray-600 mt-1">
              Período: <strong>{MESES[mes]} {anio}</strong>
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Emitida: {new Date().toLocaleDateString('es-DO')}
            </p>
          </div>
        </div>
      </div>

      <div className="mb-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-1">FACTURAR A:</p>
        <p className="font-bold text-gray-900">INSTITUTO NACIONAL DE BIENESTAR ESTUDIANTIL (INABIE)</p>
        <p className="text-sm text-gray-600">Programa de Alimentación Escolar (PAE)</p>
        <p className="text-sm text-gray-600">República Dominicana</p>
      </div>

      <table className="w-full mb-6">
        <thead className="border-b-2 border-gray-300">
          <tr className="text-left">
            <th className="py-3 text-xs text-gray-600 font-semibold tracking-wider">ESCUELA</th>
            <th className="py-3 text-xs text-gray-600 font-semibold tracking-wider text-center">DÍAS</th>
            <th className="py-3 text-xs text-gray-600 font-semibold tracking-wider text-center">FIRMADOS</th>
            <th className="py-3 text-xs text-gray-600 font-semibold tracking-wider text-right">RACIONES</th>
            <th className="py-3 text-xs text-gray-600 font-semibold tracking-wider text-right">PRECIO/RACIÓN</th>
            <th className="py-3 text-xs text-gray-600 font-semibold tracking-wider text-right">SUBTOTAL</th>
          </tr>
        </thead>
        <tbody>
          {resumenPorEscuela.length === 0 ? (
            <tr>
              <td colSpan={6} className="py-8 text-center text-gray-400">
                No hay operaciones registradas en {MESES[mes]} {anio}
              </td>
            </tr>
          ) : (
            resumenPorEscuela.map(item => (
              <tr key={item.escuela.id} className="border-b border-gray-200">
                <td className="py-3">
                  <p className="font-semibold text-gray-900 text-sm">{item.escuela.nombre}</p>
                  <p className="text-xs text-gray-500">
                    {item.escuela.director_nombre && `Director: ${item.escuela.director_nombre}`}
                  </p>
                </td>
                <td className="py-3 text-center text-sm">{item.diasTrabajados}</td>
                <td className="py-3 text-center text-sm">
                  {item.conducesFirmados > 0 ? (
                    <span className="text-green-700 font-bold">✅ {item.conducesFirmados}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
                <td className="py-3 text-right text-sm font-mono">{item.totalRaciones.toLocaleString()}</td>
                <td className="py-3 text-right text-sm font-mono">RD$ {item.precioRacion.toFixed(2)}</td>
                <td className="py-3 text-right text-sm font-mono font-semibold">RD$ {item.subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <div className="border-t-2 border-gray-900 pt-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 font-semibold tracking-wider mb-2">RESUMEN OPERATIVO</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Total raciones:</span>
                <span className="font-bold">{totalRacionesMes.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Escuelas atendidas:</span>
                <span className="font-bold">{resumenPorEscuela.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Días operativos:</span>
                <span className="font-bold">
                  {[...new Set(operaciones.map(op => op.fecha))].length}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Conduces firmados:</span>
                <span className="font-bold text-green-700">
                  ✅ {totalConducesFirmados} / {operaciones.length}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
            <p className="text-xs text-blue-700 font-semibold tracking-wider mb-2">RESUMEN FINANCIERO</p>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-700">Total facturación:</span>
                <span className="font-bold font-mono">RD$ {totalFacturacion.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between text-green-700">
                <span>Anticipo INABIE ({anticipoPct}%):</span>
                <span className="font-bold font-mono">- RD$ {anticipoMonto.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className="flex justify-between border-t border-blue-300 pt-2 mt-2 text-base">
                <span className="font-bold text-gray-900">PENDIENTE COBRAR:</span>
                <span className="font-bold font-mono text-blue-900">RD$ {pendienteCobrar.toLocaleString('es-DO', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {empresa?.banco && empresa?.cuenta_bancaria && (
        <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <p className="text-xs text-yellow-800 font-semibold tracking-wider mb-2">INFORMACIÓN DE PAGO</p>
          <p className="text-sm text-gray-700">
            <strong>Banco:</strong> {empresa.banco}
            {' · '}
            <strong>Cuenta:</strong> {empresa.cuenta_bancaria}
          </p>
        </div>
      )}

      {finanzas?.usa_ecf && finanzas?.rnc_certificado_ecf && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          🧾 Documento certificado e-CF · RNC: {finanzas.rnc_certificado_ecf}
        </div>
      )}

      <div className="mt-8 text-center text-xs text-gray-400 border-t border-gray-200 pt-4">
        <p>Generado por Cocina PAE · {new Date().toLocaleString('es-DO')}</p>
        <p className="mt-1">Plazo de pago promedio: {finanzas?.dias_pago_promedio || 90} días</p>
      </div>
    </div>
  )
}

// ============================================
// CONDUCES DIARIOS (uno por escuela)
// ============================================
function ConducesDiarios({ empresa, finanzas, escuelas, operaciones, recetas, fecha }) {
  const fechaTexto = new Date(fecha + 'T12:00:00').toLocaleDateString('es-DO', { 
    weekday: 'long', 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })

  // Solo escuelas que tuvieron operación ese día
  const escuelasConOperacion = escuelas
    .map(escuela => {
      const op = operaciones.find(o => o.escuela_id === escuela.id)
      const receta = op ? recetas.find(r => r.id === op.receta_id) : null
      return { escuela, op, receta }
    })
    .filter(item => item.op)

  if (escuelasConOperacion.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
        <div className="text-6xl mb-4">📅</div>
        <h3 className="text-xl font-bold text-gray-900">Sin operaciones</h3>
        <p className="text-gray-500 mt-2">No hay entregas registradas para {fechaTexto}.</p>
        <p className="text-sm text-gray-400 mt-4">Selecciona otra fecha o registra las operaciones del día.</p>
      </div>
    )
  }

  return (
    <>
      {escuelasConOperacion.map((item, idx) => {
        const { escuela, op, receta } = item
        const precioRacion = parseFloat(escuela.precio_racion || 0)
        const subtotal = (op.raciones_planificadas || 0) * precioRacion
        const numeroConduce = `${fecha.replace(/-/g, '')}-${escuela.id.slice(0, 4).toUpperCase()}`
        const horaEntrega = op.hora_entrega 
          ? new Date(op.hora_entrega).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
          : '—'

        return (
          <div 
            key={escuela.id} 
            className={`bg-white rounded-2xl shadow-xl p-8 print:shadow-none print:p-4 mb-6 ${idx < escuelasConOperacion.length - 1 ? 'page-break' : ''}`}
          >
            
            {/* Encabezado */}
            <div className="border-b-2 border-gray-900 pb-4 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{empresa?.nombre || 'Mi Cocina'}</h1>
                  <p className="text-sm text-gray-600 mt-1">RNC: {empresa?.rnc || '—'}</p>
                  <p className="text-sm text-gray-600">{empresa?.direccion || ''}</p>
                  {empresa?.telefono && (
                    <p className="text-sm text-gray-600">📞 {empresa.telefono}</p>
                  )}
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500 font-semibold tracking-wider">CONDUCE DIARIO</p>
                  <p className="text-xl font-bold text-gray-900">N° {numeroConduce}</p>
                  <p className="text-sm text-gray-600 mt-1 capitalize">
                    {fechaTexto}
                  </p>
                  {op.firma_imagen && (
                    <div className="mt-2 inline-block bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full">
                      ✅ FIRMADO DIGITALMENTE
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Datos de la escuela */}
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <p className="text-xs text-gray-500 font-semibold tracking-wider mb-2">ENTREGADO A:</p>
              <p className="font-bold text-gray-900 text-lg">{escuela.nombre}</p>
              {escuela.direccion && (
                <p className="text-sm text-gray-600 mt-1">📍 {escuela.direccion}</p>
              )}
              {escuela.director_nombre && (
                <p className="text-sm text-gray-600">
                  👤 Director(a): <strong>{escuela.director_nombre}</strong>
                  {escuela.director_telefono && ` · 📞 ${escuela.director_telefono}`}
                </p>
              )}
            </div>

            {/* Detalle de la entrega */}
            <table className="w-full mb-6">
              <thead className="border-b-2 border-gray-300">
                <tr className="text-left">
                  <th className="py-3 text-xs text-gray-600 font-semibold tracking-wider">DESCRIPCIÓN</th>
                  <th className="py-3 text-xs text-gray-600 font-semibold tracking-wider text-right">CANTIDAD</th>
                  <th className="py-3 text-xs text-gray-600 font-semibold tracking-wider text-right">P. UNITARIO</th>
                  <th className="py-3 text-xs text-gray-600 font-semibold tracking-wider text-right">SUBTOTAL</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-gray-200">
                  <td className="py-4">
                    <p className="font-semibold text-gray-900">
                      {receta ? `${receta.emoji} ${receta.nombre}` : 'Ración alimenticia escolar'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">Almuerzo escolar PAE</p>
                  </td>
                  <td className="py-4 text-right font-mono text-base font-semibold">
                    {op.raciones_planificadas?.toLocaleString()} raciones
                  </td>
                  <td className="py-4 text-right font-mono">RD$ {precioRacion.toFixed(2)}</td>
                  <td className="py-4 text-right font-mono text-base font-bold">
                    RD$ {subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tbody>
              <tfoot className="border-t-2 border-gray-900">
                <tr>
                  <td colSpan={3} className="py-4 text-right text-sm font-bold">TOTAL DEL DÍA:</td>
                  <td className="py-4 text-right font-mono text-lg font-bold">
                    RD$ {subtotal.toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                  </td>
                </tr>
              </tfoot>
            </table>

            {/* Información operativa */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 text-center">
                <p className="text-xs text-blue-700 font-semibold tracking-wider">INICIO COCINA</p>
                <p className="text-sm font-bold text-blue-900 mt-1">
                  {op.hora_inicio_preparacion 
                    ? new Date(op.hora_inicio_preparacion).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </p>
              </div>
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 text-center">
                <p className="text-xs text-orange-700 font-semibold tracking-wider">SALIDA</p>
                <p className="text-sm font-bold text-orange-900 mt-1">
                  {op.hora_salida 
                    ? new Date(op.hora_salida).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' })
                    : '—'}
                </p>
              </div>
              <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center">
                <p className="text-xs text-green-700 font-semibold tracking-wider">ENTREGA</p>
                <p className="text-sm font-bold text-green-900 mt-1">{horaEntrega}</p>
              </div>
            </div>

            {/* Espacios de firma */}
            <div className="grid grid-cols-2 gap-8 mt-12 mb-4">
              <div className="text-center">
                <div className="border-b-2 border-gray-400 mb-2 h-16"></div>
                <p className="text-xs text-gray-600 font-semibold tracking-wider">ENTREGADO POR (SUPLIDOR)</p>
                <p className="text-sm text-gray-900 mt-1 font-semibold">{empresa?.nombre}</p>
                <p className="text-xs text-gray-500">RNC: {empresa?.rnc}</p>
              </div>
              
              {/* Sección RECIBIDO POR - con firma digital si existe */}
              <div className="text-center">
                {op.firma_imagen ? (
                  // FIRMA DIGITAL CAPTURADA
                  <>
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg mb-2 h-16 flex items-center justify-center overflow-hidden p-1">
                      <img 
                        src={op.firma_imagen} 
                        alt="Firma del director" 
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                    <p className="text-xs text-green-700 font-semibold tracking-wider">
                      ✅ RECIBIDO Y FIRMADO DIGITALMENTE
                    </p>
                    <p className="text-sm text-gray-900 mt-1 font-semibold">
                      {op.firmado_por_nombre || escuela.director_nombre}
                    </p>
                    <p className="text-xs text-gray-500">{escuela.nombre}</p>
                    {op.firmado_en && (
                      <p className="text-xs text-green-600 mt-1 font-medium">
                        Firmado el {new Date(op.firmado_en).toLocaleDateString('es-DO', { 
                          day: 'numeric', month: 'long', year: 'numeric' 
                        })} a las {new Date(op.firmado_en).toLocaleTimeString('es-DO', { 
                          hour: '2-digit', minute: '2-digit' 
                        })}
                      </p>
                    )}
                  </>
                ) : (
                  // SIN FIRMA (espacio para firma manual)
                  <>
                    <div className="border-b-2 border-gray-400 mb-2 h-16"></div>
                    <p className="text-xs text-gray-600 font-semibold tracking-wider">RECIBIDO CONFORME (DIRECTOR/A)</p>
                    <p className="text-sm text-gray-900 mt-1 font-semibold">{escuela.director_nombre || '________________________'}</p>
                    <p className="text-xs text-gray-500">{escuela.nombre}</p>
                  </>
                )}
              </div>
            </div>

           {/* Sellos */}
            <div className="grid grid-cols-2 gap-8 mt-8">
              <div className="text-center">
                <div className="inline-block border-2 border-dashed border-gray-300 rounded-lg w-32 h-32 flex items-center justify-center text-gray-300 text-xs">
                  Sello
                </div>
              </div>
              <div className="text-center">
                <div className="inline-block border-2 border-dashed border-gray-300 rounded-lg w-32 h-32 flex items-center justify-center text-gray-300 text-xs">
                  {op.firma_imagen ? (
                    <span className="text-green-600 font-semibold">✓ Validado<br/>digitalmente</span>
                  ) : (
                    'Sello'
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-gray-400 border-t border-gray-200 pt-3">
              <p>Conduce {idx + 1} de {escuelasConOperacion.length} · Generado por Cocina PAE</p>
              {finanzas?.usa_ecf && finanzas?.rnc_certificado_ecf && (
                <p className="mt-1">🧾 e-CF · RNC: {finanzas.rnc_certificado_ecf}</p>
              )}
            </div>

          </div>
        )
      })}
    </>
  )
}

export default FacturaInabie