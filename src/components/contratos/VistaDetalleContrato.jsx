import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'

function VistaDetalleContrato({ contratoId, onVolver }) {
  const [contrato, setContrato] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const contenidoRef = useRef(null)

  useEffect(() => {
    if (contratoId) cargarContrato()
  }, [contratoId])

  async function cargarContrato() {
    setCargando(true)

    const { data: contratoData, error } = await supabase
      .from('contratos_empleados')
      .select(`
        *,
        usuario:usuarios(id, nombre, rol, sexo, foto_url, cedula, direccion, telefono)
      `)
      .eq('id', contratoId)
      .single()

    if (error) {
      console.error('Error cargando contrato:', error)
      setCargando(false)
      return
    }

    setContrato(contratoData)

    if (contratoData?.empresa_id) {
      const { data: empresaData } = await supabase
        .from('empresas')
        .select('*')
        .eq('id', contratoData.empresa_id)
        .single()
      setEmpresa(empresaData)
    }

    setCargando(false)
  }

  function imprimir() {
    window.print()
  }

  function formatearFecha(fechaStr) {
    if (!fechaStr) return '_______________'
    const fecha = new Date(fechaStr + 'T00:00:00')
    return fecha.toLocaleDateString('es-DO', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    })
  }

  function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return '_______________'
    const fecha = new Date(fechaStr)
    return fecha.toLocaleDateString('es-DO', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  if (cargando) {
    return (
      <div className="w-full max-w-5xl">
        <div className="text-center py-12 text-gray-500">⏳ Cargando contrato...</div>
      </div>
    )
  }

  if (!contrato) {
    return (
      <div className="w-full max-w-5xl">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">❌</p>
          <h2 className="text-2xl font-bold text-red-900 mb-2">Contrato no encontrado</h2>
          <button
            onClick={onVolver}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg mt-4"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  const empleado = contrato.usuario
  const direccionPropietario = empresa?.direccion_propietario_misma 
    ? empresa?.direccion 
    : empresa?.direccion_propietario

  return (
    <div className="w-full max-w-5xl">
      
      {/* Estilos para impresión */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area, .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20mm;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: letter;
            margin: 0;
          }
        }
      `}</style>

      {/* HEADER (no se imprime) */}
      <div className="no-print bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start flex-wrap gap-3">
          <div>
            <p className="text-purple-100 text-xs font-semibold tracking-wider">CONTRATO LABORAL</p>
            <h2 className="text-2xl font-bold mt-1">{empleado?.nombre}</h2>
            <p className="text-purple-200 text-sm mt-1">{contrato.puesto}</p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={imprimir}
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold px-4 py-2 rounded-lg"
            >
              🖨️ Imprimir contrato
            </button>
            <button
              onClick={onVolver}
              className="bg-purple-800 hover:bg-purple-900 text-white text-sm px-4 py-2 rounded-lg"
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>

      {/* ESTADO DEL CONTRATO (no se imprime) */}
      <div className="no-print bg-white rounded-2xl shadow-xl p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            {contrato.estado === 'activo' && (
              <span className="bg-green-100 text-green-800 font-bold px-4 py-2 rounded-full">
                🟢 ACTIVO
              </span>
            )}
            {contrato.estado === 'borrador' && (
              <span className="bg-yellow-100 text-yellow-800 font-bold px-4 py-2 rounded-full">
                🟡 BORRADOR
              </span>
            )}
            {contrato.estado === 'pendiente_firma' && (
              <span className="bg-orange-100 text-orange-800 font-bold px-4 py-2 rounded-full">
                🟠 PENDIENTE DE FIRMA
              </span>
            )}
            {contrato.estado === 'terminado' && (
              <span className="bg-gray-200 text-gray-700 font-bold px-4 py-2 rounded-full">
                ⚪ TERMINADO
              </span>
            )}
            
            {contrato.firma_propietario_at && (
              <span className="text-xs text-gray-600">
                ✅ Firmado el {formatearFechaCorta(contrato.firma_propietario_at)}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* CONTENIDO DEL CONTRATO (se imprime) */}
      <div className="print-area bg-white rounded-2xl shadow-xl p-8 md:p-12" ref={contenidoRef}>
        
        {/* TÍTULO */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            CONTRATO DE TRABAJO
          </h1>
          {contrato.tipo_contrato === 'obra_servicio' && (
            <p className="text-sm text-gray-700 italic">
              POR OBRA O SERVICIO DETERMINADO<br />
              (Servicio de Alimentación Escolar — PAE / INABIE)
            </p>
          )}
          {contrato.tipo_contrato === 'estacional' && (
            <p className="text-sm text-gray-700 italic">
              CONTRATO DE TRABAJO ESTACIONAL
            </p>
          )}
          {contrato.tipo_contrato === 'indefinido' && (
            <p className="text-sm text-gray-700 italic">
              CONTRATO DE TRABAJO POR TIEMPO INDEFINIDO
            </p>
          )}
        </div>

        {/* INTRODUCCIÓN */}
        <p className="text-sm text-justify mb-4 leading-relaxed">
          En la ciudad de <strong>{empresa?.direccion?.split(',').pop()?.trim() || '_______________'}</strong>, 
          República Dominicana, a los <strong>{new Date(contrato.fecha_inicio + 'T00:00:00').getDate()}</strong> días 
          del mes de <strong>{new Date(contrato.fecha_inicio + 'T00:00:00').toLocaleDateString('es-DO', { month: 'long' })}</strong> del 
          año <strong>{new Date(contrato.fecha_inicio + 'T00:00:00').getFullYear()}</strong>, comparecen libre y voluntariamente:
        </p>

        {/* PARTES */}
        <div className="mb-4">
          <p className="text-sm font-bold mb-2">DE UNA PARTE:</p>
          <p className="text-sm text-justify leading-relaxed">
            <strong>{empresa?.nombre_propietario || '___________________'}</strong>, dominicano(a), mayor de edad, 
            portador(a) de la Cédula de Identidad y Electoral No. <strong>{empresa?.cedula_propietario || '_______________'}</strong>, 
            domiciliado(a) en <strong>{direccionPropietario || '_______________'}</strong>, 
            en su calidad de propietario(a) del establecimiento comercial <strong>"{empresa?.nombre || '___________'}"</strong>
            {contrato.tipo_contrato === 'obra_servicio' && ', suplidor del Programa de Alimentación Escolar (PAE) del INABIE'}, 
            quien en lo adelante y para los fines del presente contrato se denominará <strong>"EL EMPLEADOR"</strong>;
          </p>
        </div>

        <div className="mb-4">
          <p className="text-sm font-bold mb-2">DE LA OTRA PARTE:</p>
          <p className="text-sm text-justify leading-relaxed">
            <strong>{empleado?.nombre || '___________________'}</strong>, dominicano(a), mayor de edad, 
            portador(a) de la Cédula de Identidad y Electoral No. <strong>{empleado?.cedula || '_______________'}</strong>, 
            domiciliado(a) en <strong>{empleado?.direccion || '_______________'}</strong>, 
            quien en lo adelante y para los fines del presente contrato se denominará <strong>"EL TRABAJADOR"</strong>;
          </p>
        </div>

        <p className="text-sm text-justify mb-6 leading-relaxed">
          Ambas partes han convenido en celebrar el presente CONTRATO DE TRABAJO 
          {contrato.tipo_contrato === 'obra_servicio' && ' PARA OBRA O SERVICIO DETERMINADO, conforme a los artículos 31, 32, 33 y 72 del Código de Trabajo de la República Dominicana (Ley No. 16-92),'}
          {contrato.tipo_contrato === 'estacional' && ' ESTACIONAL, conforme al Código de Trabajo de la República Dominicana (Ley No. 16-92),'}
          {contrato.tipo_contrato === 'indefinido' && ' POR TIEMPO INDEFINIDO, conforme al Código de Trabajo de la República Dominicana (Ley No. 16-92),'}
          {' '}sujeto a las siguientes cláusulas:
        </p>

        {/* CLÁUSULAS */}
        <div className="space-y-4 text-sm">
          
          <div>
            <p className="font-bold">PRIMERO: NATURALEZA DEL CONTRATO</p>
            {contrato.tipo_contrato === 'obra_servicio' && (
              <p className="text-justify leading-relaxed mt-1">
                Este contrato se celebra para la prestación de un servicio determinado, 
                consistente en las labores requeridas por EL EMPLEADOR para el cumplimiento 
                de su contrato de suministro de raciones alimenticias bajo el Programa de 
                Alimentación Escolar (PAE) del Instituto Nacional de Bienestar Estudiantil (INABIE), 
                correspondiente al año escolar <strong>{contrato.año_escolar_inabie || '_______'}</strong>. 
                Ambas partes reconocen que la naturaleza del servicio depende de la adjudicación 
                y vigencia del contrato con INABIE.
              </p>
            )}
            {contrato.tipo_contrato === 'estacional' && (
              <p className="text-justify leading-relaxed mt-1">
                El presente contrato se celebra bajo la modalidad de trabajo estacional, 
                en virtud de que la actividad del EMPLEADOR se realiza únicamente durante 
                el calendario escolar dominicano.
              </p>
            )}
            {contrato.tipo_contrato === 'indefinido' && (
              <p className="text-justify leading-relaxed mt-1">
                El presente contrato se celebra por tiempo indefinido, en atención a la 
                naturaleza permanente y continua de las funciones que desempeñará EL TRABAJADOR.
              </p>
            )}
          </div>

          <div>
            <p className="font-bold">SEGUNDO: OBJETO Y FUNCIONES</p>
            <p className="text-justify leading-relaxed mt-1">
              EL TRABAJADOR se obliga a prestar sus servicios personales bajo la dirección 
              y dependencia de EL EMPLEADOR, desempeñando las funciones de <strong>{contrato.puesto}</strong>.
              {contrato.descripcion_funciones && (
                <span> {contrato.descripcion_funciones}</span>
              )}
            </p>
          </div>

          <div>
            <p className="font-bold">TERCERO: DURACIÓN</p>
            <p className="text-justify leading-relaxed mt-1">
              Fecha de inicio: <strong>{formatearFecha(contrato.fecha_inicio)}</strong>.
              {contrato.fecha_fin && (
                <> Fecha estimada de finalización: <strong>{formatearFecha(contrato.fecha_fin)}</strong>.</>
              )}
              {contrato.tipo_contrato === 'obra_servicio' && (
                <> El contrato terminará, sin responsabilidad para ninguna de las partes, 
                con la conclusión del servicio determinado, conforme al artículo 72 del Código de Trabajo.</>
              )}
            </p>
          </div>

          <div>
            <p className="font-bold">CUARTO: SALARIO</p>
            <p className="text-justify leading-relaxed mt-1">
              EL EMPLEADOR pagará a EL TRABAJADOR un salario neto de 
              <strong> RD$ {Number(contrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })}</strong>,
              {contrato.frecuencia_pago === 'quincenal' && ' con pago quincenal'}
              {contrato.frecuencia_pago === 'semanal' && ' con pago semanal'}
              {contrato.frecuencia_pago === 'mensual' && ' con pago mensual'}.
              {contrato.salario_bruto && (
                <> El salario bruto correspondiente es de RD$ {Number(contrato.salario_bruto).toLocaleString('es-DO', { minimumFractionDigits: 2 })}, 
                del cual se realizarán las retenciones de ley (TSS, AFP).</>
              )}
              {' '}EL EMPLEADOR realizará los aportes patronales correspondientes a la 
              Tesorería de la Seguridad Social (TSS), Administradora de Fondos de Pensiones (AFP) 
              y demás contribuciones obligatorias conforme a la legislación dominicana vigente.
            </p>
          </div>

          {(contrato.horario_trabajo || contrato.dias_laborales) && (
            <div>
              <p className="font-bold">QUINTO: JORNADA DE TRABAJO</p>
              <p className="text-justify leading-relaxed mt-1">
                {contrato.horario_trabajo && <>Horario: <strong>{contrato.horario_trabajo}</strong>. </>}
                {contrato.dias_laborales && <>Días laborales: <strong>{contrato.dias_laborales}</strong>. </>}
                Se respetarán los descansos semanales, días feriados nacionales y los recesos 
                del calendario escolar, conforme a la ley.
              </p>
            </div>
          )}

          {contrato.lugar_trabajo && (
            <div>
              <p className="font-bold">SEXTO: LUGAR DE TRABAJO</p>
              <p className="text-justify leading-relaxed mt-1">
                El lugar principal de trabajo será: <strong>{contrato.lugar_trabajo}</strong>. 
                EL TRABAJADOR podrá ser asignado, en función de las necesidades del servicio, 
                a cualquiera de los centros educativos beneficiados por el contrato PAE de EL EMPLEADOR.
              </p>
            </div>
          )}

          <div>
            <p className="font-bold">SÉPTIMO: REGALÍA PASCUAL</p>
            <p className="text-justify leading-relaxed mt-1">
              {contrato.tipo_contrato === 'obra_servicio' && (
                <>Dado que el presente contrato es por obra o servicio determinado, conforme al 
                artículo 7 de la Ley No. 5235 y los artículos 219 al 222 del Código de Trabajo, 
                la regalía pascual se reconocerá únicamente si al mes de diciembre el contrato 
                tiene una duración igual o superior a seis (6) meses. </>
              )}
              {contrato.tipo_contrato !== 'obra_servicio' && (
                <>EL TRABAJADOR tendrá derecho a la regalía pascual proporcional al tiempo trabajado 
                durante el año calendario, conforme a los artículos 219 al 222 del Código de Trabajo, 
                a pagarse a más tardar el día 20 de diciembre. </>
              )}
              EL EMPLEADOR podrá, a su libre criterio, otorgar bonificaciones voluntarias adicionales.
            </p>
          </div>

          <div>
            <p className="font-bold">OCTAVO: CONFIDENCIALIDAD Y NORMAS</p>
            <p className="text-justify leading-relaxed mt-1">
              EL TRABAJADOR se obliga a mantener absoluta confidencialidad sobre la información 
              comercial, financiera, recetas, costos, proveedores, clientes y procedimientos 
              operativos de EL EMPLEADOR, así como a cumplir las normas de higiene, manipulación 
              de alimentos y conducta establecidas por EL EMPLEADOR y las autoridades sanitarias 
              y educativas competentes.
            </p>
          </div>

          <div>
            <p className="font-bold">NOVENO: DISPOSICIONES FINALES</p>
            <p className="text-justify leading-relaxed mt-1">
              Todo lo no previsto en el presente contrato se regirá por el Código de Trabajo 
              de la República Dominicana (Ley No. 16-92), su Reglamento de Aplicación No. 258-93 
              y las demás disposiciones laborales vigentes.
            </p>
          </div>

          {contrato.notas && (
            <div>
              <p className="font-bold">CLÁUSULA ADICIONAL</p>
              <p className="text-justify leading-relaxed mt-1">
                {contrato.notas}
              </p>
            </div>
          )}
        </div>

        <p className="text-sm text-justify mt-6 mb-8 leading-relaxed">
          Hecho y firmado en dos (2) originales del mismo tenor y valor, uno para cada parte, 
          en la fecha indicada al inicio del presente contrato.
        </p>

        {/* FIRMAS DIGITALES (si existen) */}
        {(contrato.firma_propietario_base64 || contrato.firma_empleado_base64) && (
          <div className="mt-8 mb-6">
            <p className="text-xs font-bold text-gray-600 tracking-wider mb-3 text-center">
              FIRMAS DIGITALES (registradas en el sistema Cocina PAE)
            </p>
            <div className="grid grid-cols-2 gap-8">
              <div className="text-center">
                <div className="h-24 flex items-end justify-center border-b border-gray-400 pb-1">
                  {contrato.firma_propietario_base64 ? (
                    <img 
                      src={contrato.firma_propietario_base64} 
                      alt="Firma empleador" 
                      className="max-h-24"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">_____________________</span>
                  )}
                </div>
                <p className="text-sm font-bold mt-2">EL EMPLEADOR</p>
                <p className="text-xs text-gray-700">{empresa?.nombre_propietario || '___________'}</p>
                <p className="text-xs text-gray-600">CC: {empresa?.cedula_propietario || '_____________'}</p>
                {contrato.firma_propietario_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formatearFechaCorta(contrato.firma_propietario_at)}
                  </p>
                )}
              </div>

              <div className="text-center">
                <div className="h-24 flex items-end justify-center border-b border-gray-400 pb-1">
                  {contrato.firma_empleado_base64 ? (
                    <img 
                      src={contrato.firma_empleado_base64} 
                      alt="Firma empleado" 
                      className="max-h-24"
                    />
                  ) : (
                    <span className="text-gray-400 text-xs">_____________________</span>
                  )}
                </div>
                <p className="text-sm font-bold mt-2">EL TRABAJADOR</p>
                <p className="text-xs text-gray-700">{empleado?.nombre || '___________'}</p>
                <p className="text-xs text-gray-600">CC: {empleado?.cedula || '_____________'}</p>
                {contrato.firma_empleado_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    {formatearFechaCorta(contrato.firma_empleado_at)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FIRMAS FÍSICAS (espacios para firmar a mano) */}
        <div className="mt-12">
          <p className="text-xs font-bold text-gray-600 tracking-wider mb-3 text-center">
            FIRMAS FÍSICAS (manuscritas)
          </p>
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
              <div className="h-16 border-b border-gray-700"></div>
              <p className="text-sm font-bold mt-2">EL EMPLEADOR</p>
              <p className="text-xs text-gray-700">{empresa?.nombre_propietario || '___________'}</p>
              <p className="text-xs text-gray-600 mt-1">Fecha: ___/___/______</p>
            </div>

            <div className="text-center">
              <div className="h-16 border-b border-gray-700"></div>
              <p className="text-sm font-bold mt-2">EL TRABAJADOR</p>
              <p className="text-xs text-gray-700">{empleado?.nombre || '___________'}</p>
              <p className="text-xs text-gray-600 mt-1">Fecha: ___/___/______</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}

export default VistaDetalleContrato