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
                    {item.escuela.codigo_centro && `Cód: ${item.escuela.codigo_centro}`}
                    {item.escuela.regional_distrito && ` · ${item.escuela.regional_distrito}`}
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

/// ============================================
// CONDUCES DIARIOS (uno por escuela) - FORMATO INABIE V1-PAE v2
// ============================================
function ConducesDiarios({ empresa, finanzas, escuelas, operaciones, recetas, fecha }) {
  const fechaCorta = new Date(fecha + 'T12:00:00').toLocaleDateString('es-DO', {
    day: '2-digit', month: '2-digit', year: 'numeric'
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
        <p className="text-gray-500 mt-2">No hay entregas registradas para el {fechaCorta}.</p>
        <p className="text-sm text-gray-400 mt-4">Selecciona otra fecha o registra las operaciones del día.</p>
      </div>
    )
  }

  // Construir provincia/municipio
  const formatearProvinciaMunicipio = (esc) => {
    const partes = [esc.provincia, esc.municipio].filter(Boolean)
    return partes.length > 0 ? partes.join(' / ').toUpperCase() : '—'
  }

  // Hora de recepción si firmó digitalmente
  const formatearHoraRecepcion = (op) => {
    if (!op.firmado_en) return null
    return new Date(op.firmado_en).toLocaleTimeString('es-DO', {
      hour: '2-digit', minute: '2-digit', hour12: true
    })
  }

  // Fecha de recepción si firmó digitalmente
  const formatearFechaRecepcion = (op) => {
    if (!op.firmado_en) return null
    return new Date(op.firmado_en).toLocaleDateString('es-DO', {
      day: '2-digit', month: '2-digit', year: 'numeric'
    })
  }

  return (
    <>
      {escuelasConOperacion.map((item, idx) => {
        const { escuela, op, receta } = item
        const numeroConduce = op.numero_conduce || String(4000 + idx + 1).padStart(4, '0')
        const horaRecepcion = formatearHoraRecepcion(op)
        const fechaRecepcion = formatearFechaRecepcion(op)
        const provinciaMunicipio = formatearProvinciaMunicipio(escuela)
        const descripcionProducto = receta?.nombre || 'Ración alimenticia escolar'

        return (
          <div
            key={escuela.id}
            className={`bg-white rounded-2xl shadow-xl p-10 print:shadow-none print:p-6 mb-6 ${idx < escuelasConOperacion.length - 1 ? 'page-break' : ''}`}
          >

            {/* ENCABEZADO CENTRADO - Estilo INABIE oficial */}
            <div className="text-center pb-4 mb-6 border-b-2 border-gray-900">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight uppercase">
                {empresa?.nombre || 'Mi Cocina'}
              </h1>
              {empresa?.direccion && (
                <p className="text-xs text-gray-700 mt-1 uppercase tracking-wide">
                  {empresa.direccion}
                </p>
              )}
              {empresa?.telefono && (
                <p className="text-xs text-gray-700 mt-0.5">
                  Tel.: {empresa.telefono}
                </p>
              )}
              {empresa?.rnc && (
                <p className="text-xs text-gray-700 mt-0.5 font-semibold">
                  RNC: {empresa.rnc}
                </p>
              )}
            </div>

            {/* BLOQUE SUPERIOR: Datos del centro (izq) + Conduce no/Fecha (der) */}
            <div className="grid grid-cols-3 gap-6 mb-6 text-sm">
              
              {/* Columna izquierda y central - Datos centro educativo (2/3) */}
              <div className="col-span-2 space-y-2">
                <CampoFormulario 
                  label="Nombre Centro Educativo" 
                  valor={escuela.nombre?.toUpperCase()} 
                />
                <CampoFormulario 
                  label="Director del Centro" 
                  valor={escuela.director_nombre?.toUpperCase()} 
                />
                <CampoFormulario 
                  label="Dirección" 
                  valor={[escuela.barrio_sector, escuela.direccion].filter(Boolean).join(' / ').toUpperCase() || '—'} 
                />
                <CampoFormulario 
                  label="Provincia/Municipio" 
                  valor={provinciaMunicipio} 
                />
              </div>

              {/* Columna derecha - Datos oficiales */}
              <div className="space-y-2">
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border-2 border-indigo-200 rounded-xl p-3 shadow-sm">
                  <div className="text-center mb-2 pb-2 border-b border-indigo-200">
                    <p className="text-[10px] text-indigo-600 font-bold tracking-widest">CONDUCE NO.</p>
                    <p className="text-2xl font-black text-indigo-900 font-mono">{numeroConduce}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-[10px] text-indigo-600 font-bold tracking-widest">FECHA</p>
                    <p className="text-base font-bold text-indigo-900 font-mono">{fechaCorta}</p>
                  </div>
                </div>

                <CampoFormulario 
                  label="Cód. Centro" 
                  valor={escuela.codigo_centro || '—'}
                  mono
                />
                <CampoFormulario 
                  label="Teléfono" 
                  valor={escuela.director_telefono || '—'}
                  mono
                />
                <CampoFormulario 
                  label="Regional/Distrito" 
                  valor={escuela.regional_distrito || '—'}
                  mono
                />
              </div>
            </div>

            {/* TÍTULO DE TABLA estilo INABIE */}
            <div className="text-center my-4">
              <p className="text-sm font-bold text-gray-700 tracking-wide">
                &laquo;&laquo;&laquo;&laquo; Detalle de las Raciones Entregadas y Recibidas &raquo;&raquo;&raquo;&raquo;
              </p>
            </div>

            {/* TABLA DE RACIONES - Sin precios */}
            <div className="flex items-center gap-3 mb-6">
              <div className="bg-gray-900 text-white px-3 py-8 rounded-l-lg flex items-center justify-center">
                <p className="text-xs font-bold tracking-widest [writing-mode:vertical-rl] rotate-180">
                  RACIONES
                </p>
              </div>
              <table className="flex-1 border-2 border-gray-300 rounded-r-lg overflow-hidden">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-bold text-gray-700 tracking-wider border-r border-gray-300">
                      Descripción del producto
                    </th>
                    <th className="text-center py-3 px-4 text-xs font-bold text-gray-700 tracking-wider w-32">
                      Cantidad
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t border-gray-300">
                    <td className="py-4 px-4 text-base font-semibold text-gray-900 border-r border-gray-300">
                      {descripcionProducto}
                    </td>
                    <td className="py-4 px-4 text-center text-xl font-black font-mono text-gray-900">
                      {op.raciones_planificadas?.toLocaleString() || 0}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* OBSERVACIONES */}
            <div className="mb-8">
              <div className="flex items-baseline gap-2">
                <p className="text-sm font-semibold text-gray-700 whitespace-nowrap">Observaciones:</p>
                <div className="flex-1 border-b border-gray-400 min-h-[1.5rem] px-2 text-sm text-gray-700">
                  {escuela.observaciones || op.observaciones || ''}
                </div>
              </div>
            </div>

            {/* SECCIÓN DE FIRMAS - 2 columnas */}
            <div className="grid grid-cols-2 gap-12 mt-12">
              
              {/* FIRMA Y SELLO DEL SUPLIDOR (izquierda) */}
              <div className="text-center">
                <div className="border-b-2 border-gray-900 mb-2 h-20 flex items-end justify-center pb-1">
                  {/* Espacio para firma manuscrita del suplidor */}
                </div>
                <p className="text-xs font-bold text-gray-900 tracking-widest">
                  FIRMA Y SELLO DEL SUPLIDOR
                </p>
                <p className="text-xs text-gray-600 mt-1">{empresa?.nombre}</p>
              </div>

              {/* RECIBIDO POR (derecha) */}
              <div>
                <p className="text-sm font-bold text-gray-900 mb-4">Recibido por:</p>
                
                {op.firma_imagen ? (
                  // CON FIRMA DIGITAL - se pre-llenan los campos
                  <div className="space-y-3">
                    <div className="bg-green-50 border-2 border-green-300 rounded-lg p-2 mb-3">
                      <img 
                        src={op.firma_imagen} 
                        alt="Firma digital" 
                        className="max-h-16 mx-auto object-contain"
                      />
                      <p className="text-[10px] text-green-700 text-center font-bold tracking-wider mt-1">
                        ✓ FIRMA DIGITAL VALIDADA
                      </p>
                    </div>
                    <CampoFormulario 
                      label="Nombre" 
                      valor={(op.firmado_por_nombre || escuela.director_nombre)?.toUpperCase()} 
                    />
                    <CampoFormulario 
                      label="Fecha Recepción" 
                      valor={fechaRecepcion}
                      mono
                    />
                    <CampoFormulario 
                      label="Hora Recepción" 
                      valor={horaRecepcion}
                      mono
                    />
                  </div>
                ) : (
                  // SIN FIRMA - líneas en blanco para llenar a mano
                  <div className="space-y-3">
                    <CampoFormulario label="Nombre" valor="" />
                    <CampoFormulario label="Fecha Recepción" valor="" />
                    <CampoFormulario label="Hora Recepción" valor="" />
                  </div>
                )}
              </div>

            </div>

            {/* Badge de firmado digitalmente (sutil, abajo) */}
            {op.firma_imagen && (
              <div className="mt-8 text-center">
                <span className="inline-block bg-green-100 text-green-800 text-xs font-bold px-4 py-1.5 rounded-full">
                  ✅ DOCUMENTO FIRMADO DIGITALMENTE
                </span>
              </div>
            )}

            {/* FOOTER estilo INABIE */}
            <div className="mt-10 pt-3 border-t border-gray-300 flex justify-between items-center text-[10px] text-gray-500">
              <p>
                Preparado por: <span className="font-semibold">{empresa?.email || 'cocinapae@andamio.do'}</span>
                <span className="mx-2">·</span>
                Versión: <span className="font-semibold">V1-PAE</span>
                <span className="mx-2">·</span>
                Fecha de impresión: <span className="font-semibold">{new Date().toLocaleDateString('es-DO')}</span>
              </p>
              <p>
                Página: <span className="font-bold">{idx + 1}</span>
              </p>
            </div>

          </div>
        )
      })}
    </>
  )
}

// ============================================
// COMPONENTE AUXILIAR: Campo de formulario estilo INABIE
// Label + línea con valor (o vacía para llenar a mano)
// ============================================
function CampoFormulario({ label, valor, mono = false }) {
  return (
    <div className="flex items-baseline gap-2">
      <p className="text-xs font-semibold text-gray-700 whitespace-nowrap">
        {label}:
      </p>
      <div className={`flex-1 border-b border-gray-400 px-1 text-sm text-gray-900 font-semibold min-h-[1.25rem] ${mono ? 'font-mono' : ''}`}>
        {valor || ''}
      </div>
    </div>
  )
}

export default FacturaInabie