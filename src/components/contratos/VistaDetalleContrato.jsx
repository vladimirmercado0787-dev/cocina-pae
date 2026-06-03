import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'

function VistaDetalleContrato({ contratoId, onVolver }) {
  const [contrato, setContrato] = useState(null)
  const [empresa, setEmpresa] = useState(null)
  const [cargando, setCargando] = useState(true)
  const contenidoRef = useRef(null)

  // Tema dual (mismo patrón del Dashboard)
  const [tema, setTema] = useState(() => localStorage.getItem('cocina_pae_tema') || 'oscuro')
  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  useEffect(() => { if (contratoId) cargarContrato() }, [contratoId])

  async function cargarContrato() {
    setCargando(true)
    const { data: contratoData, error } = await supabase
      .from('contratos_empleados')
      .select(`*, usuario:usuarios(id, nombre, rol, sexo, foto_url, cedula, direccion, telefono)`)
      .eq('id', contratoId).single()

    if (error) { console.error('Error cargando contrato:', error); setCargando(false); return }
    setContrato(contratoData)

    if (contratoData?.empresa_id) {
      const { data: empresaData } = await supabase.from('empresas').select('*').eq('id', contratoData.empresa_id).single()
      setEmpresa(empresaData)
    }
    setCargando(false)
  }

  function imprimir() { window.print() }

  function formatearFecha(fechaStr) {
    if (!fechaStr) return '_______________'
    const fecha = new Date(fechaStr + 'T00:00:00')
    return fecha.toLocaleDateString('es-DO', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  function formatearFechaCorta(fechaStr) {
    if (!fechaStr) return '_______________'
    const fecha = new Date(fechaStr)
    return fecha.toLocaleDateString('es-DO', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  if (cargando) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg-primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '20px',
      }}>
        <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '14px' }}>
          ⏳ Cargando contrato...
        </div>
      </div>
    )
  }

  if (!contrato) {
    return (
      <div style={{
        minHeight: '100vh', background: 'var(--color-bg-primary)',
        padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{
          maxWidth: '400px',
          background: 'rgba(244, 67, 54, 0.12)',
          border: '1px solid rgba(244, 67, 54, 0.4)',
          borderRadius: '14px', padding: '32px', textAlign: 'center',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '10px' }}>❌</div>
          <div style={{ fontSize: '18px', fontWeight: 600, color: '#F4C0D1', marginBottom: '14px' }}>
            Contrato no encontrado
          </div>
          <button onClick={onVolver} style={{
            padding: '10px 22px',
            background: 'linear-gradient(135deg, #E24B4A 0%, #B83232 100%)',
            border: 'none', borderRadius: '10px',
            color: 'white', fontSize: '13px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>← Volver</button>
        </div>
      </div>
    )
  }

  const empleado = contrato.usuario
  const direccionPropietario = empresa?.direccion_propietario_misma
    ? empresa?.direccion
    : empresa?.direccion_propietario

  // ─── PASTILLA DE ESTADO ───
  const estadosUI = {
    activo:            { label: '🟢 ACTIVO',              color: '29, 158, 117' },
    borrador:          { label: '🟡 BORRADOR',            color: '239, 159, 39' },
    pendiente_firma:   { label: '🟠 PENDIENTE DE FIRMA',  color: '239, 159, 39' },
    terminado:         { label: '⚪ TERMINADO',            color: '156, 163, 175' },
  }
  const estadoActual = estadosUI[contrato.estado] || estadosUI.borrador

  return (
    <div className="detalle-contrato" style={{
      minHeight: '100vh',
      background: 'var(--color-bg-primary)',
      padding: '20px',
      position: 'relative',
    }}>
      {/* Glow ambiental */}
      <div className="no-print" style={{
        position: 'fixed', inset: 0,
        backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
        pointerEvents: 'none', zIndex: 0,
      }} />

      {/* HEADER de chrome (no se imprime) */}
      <div className="no-print" style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '16px', flexWrap: 'wrap', gap: '12px',
        maxWidth: '1100px', margin: '0 auto 16px',
      }}>
        <button onClick={onVolver} style={{
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '20px', padding: '7px 14px',
          color: 'var(--color-text-secondary)', fontSize: '12px',
          cursor: 'pointer', fontFamily: 'inherit',
        }}>← Volver</button>

        <div style={{
          display: 'flex', alignItems: 'center',
          background: 'var(--color-bg-elevated)',
          border: '1px solid var(--color-border-subtle)',
          borderRadius: '20px', padding: '3px', gap: '2px',
        }}>
          <button type="button" onClick={() => setTema('oscuro')} style={{
            background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
            border: 'none', borderRadius: '16px', padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
          }}>
            <span style={{ fontSize: '11px' }}>🌙</span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>Oscuro</span>
          </button>
          <button type="button" onClick={() => setTema('tropical')} style={{
            background: tema === 'tropical' ? 'var(--gradient-toggle-active)' : 'transparent',
            border: 'none', borderRadius: '16px', padding: '6px 10px',
            display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
          }}>
            <span style={{ fontSize: '11px' }}>☀️</span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>Claro</span>
          </button>
        </div>
      </div>

      {/* TÍTULO + ACCIONES (no se imprime) */}
      <div className="no-print" style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1100px', margin: '0 auto 16px',
        background: 'var(--color-modulo-bg)',
        border: '1px solid var(--color-modulo-border)',
        borderLeft: '4px solid #7F77DD',
        borderRadius: '14px', padding: '18px 22px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        gap: '14px', flexWrap: 'wrap',
        boxShadow: 'var(--modulo-sombra)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '46px', height: '46px', borderRadius: '12px',
            background: 'rgba(127, 119, 221, 0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px',
          }}>📄</div>
          <div>
            <div style={{ fontSize: '10px', color: '#7F77DD', letterSpacing: '1.5px', fontWeight: 600 }}>
              CONTRATO LABORAL
            </div>
            <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              {empleado?.nombre}
            </div>
            <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px' }}>
              {contrato.puesto}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button onClick={imprimir} style={{
            padding: '10px 16px',
            background: 'linear-gradient(135deg, #378ADD 0%, #1F5FA8 100%)',
            border: 'none', borderRadius: '10px',
            color: 'white', fontSize: '12px', fontWeight: 600,
            cursor: 'pointer', fontFamily: 'inherit',
          }}>🖨️ Imprimir contrato</button>
        </div>
      </div>

      {/* ESTADO (no se imprime) */}
      <div className="no-print" style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1100px', margin: '0 auto 16px',
        background: 'var(--color-modulo-bg)',
        border: '1px solid var(--color-modulo-border)',
        borderRadius: '14px', padding: '14px 18px',
        boxShadow: 'var(--modulo-sombra)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '12px', fontWeight: 700, padding: '6px 14px',
            background: `rgba(${estadoActual.color}, 0.18)`,
            border: `1px solid rgba(${estadoActual.color}, 0.4)`,
            borderRadius: '16px',
            color: `rgb(${estadoActual.color})`,
            letterSpacing: '0.5px',
          }}>{estadoActual.label}</span>

          {contrato.firma_propietario_at && (
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
              ✅ Firmado el {formatearFechaCorta(contrato.firma_propietario_at)}
            </span>
          )}
        </div>
      </div>

      {/* ─── CONTENIDO DEL CONTRATO (área imprimible) ─── */}
      <div className="print-area" ref={contenidoRef} style={{
        position: 'relative', zIndex: 1,
        maxWidth: '1100px', margin: '0 auto',
        background: 'white',
        color: '#1a1a1a',
        borderRadius: '14px',
        padding: '48px 56px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
        fontFamily: '"Times New Roman", Georgia, serif',
        fontSize: '14px',
        lineHeight: 1.6,
      }}>

        {/* TÍTULO */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <h1 style={{
            fontSize: '22px', fontWeight: 700, color: '#000',
            margin: 0, letterSpacing: '0.5px',
          }}>CONTRATO DE TRABAJO</h1>
          {contrato.tipo_contrato === 'obra_servicio' && (
            <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#333', marginTop: '6px' }}>
              POR OBRA O SERVICIO DETERMINADO<br />
              (Servicio de Alimentación Escolar — PAE / INABIE)
            </div>
          )}
          {contrato.tipo_contrato === 'estacional' && (
            <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#333', marginTop: '6px' }}>
              CONTRATO DE TRABAJO ESTACIONAL
            </div>
          )}
          {contrato.tipo_contrato === 'indefinido' && (
            <div style={{ fontSize: '13px', fontStyle: 'italic', color: '#333', marginTop: '6px' }}>
              CONTRATO DE TRABAJO POR TIEMPO INDEFINIDO
            </div>
          )}
        </div>

        {/* INTRODUCCIÓN */}
        <p style={{ textAlign: 'justify', marginBottom: '14px' }}>
          En la ciudad de <strong>{empresa?.direccion?.split(',').pop()?.trim() || '_______________'}</strong>,
          República Dominicana, a los <strong>{new Date(contrato.fecha_inicio + 'T00:00:00').getDate()}</strong> días
          del mes de <strong>{new Date(contrato.fecha_inicio + 'T00:00:00').toLocaleDateString('es-DO', { month: 'long' })}</strong> del
          año <strong>{new Date(contrato.fecha_inicio + 'T00:00:00').getFullYear()}</strong>, comparecen libre y voluntariamente:
        </p>

        {/* PARTES */}
        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontWeight: 700, marginBottom: '6px' }}>DE UNA PARTE:</p>
          <p style={{ textAlign: 'justify' }}>
            <strong>{empresa?.nombre_propietario || '___________________'}</strong>, dominicano(a), mayor de edad,
            portador(a) de la Cédula de Identidad y Electoral No. <strong>{empresa?.cedula_propietario || '_______________'}</strong>,
            domiciliado(a) en <strong>{direccionPropietario || '_______________'}</strong>,
            en su calidad de propietario(a) del establecimiento comercial <strong>"{empresa?.nombre || '___________'}"</strong>
            {contrato.tipo_contrato === 'obra_servicio' && ', suplidor del Programa de Alimentación Escolar (PAE) del INABIE'},
            quien en lo adelante y para los fines del presente contrato se denominará <strong>"EL EMPLEADOR"</strong>;
          </p>
        </div>

        <div style={{ marginBottom: '14px' }}>
          <p style={{ fontWeight: 700, marginBottom: '6px' }}>DE LA OTRA PARTE:</p>
          <p style={{ textAlign: 'justify' }}>
            <strong>{empleado?.nombre || '___________________'}</strong>, dominicano(a), mayor de edad,
            portador(a) de la Cédula de Identidad y Electoral No. <strong>{empleado?.cedula || '_______________'}</strong>,
            domiciliado(a) en <strong>{empleado?.direccion || '_______________'}</strong>,
            quien en lo adelante y para los fines del presente contrato se denominará <strong>"EL TRABAJADOR"</strong>;
          </p>
        </div>

        <p style={{ textAlign: 'justify', marginBottom: '22px' }}>
          Ambas partes han convenido en celebrar el presente CONTRATO DE TRABAJO
          {contrato.tipo_contrato === 'obra_servicio' && ' PARA OBRA O SERVICIO DETERMINADO, conforme a los artículos 31, 32, 33 y 72 del Código de Trabajo de la República Dominicana (Ley No. 16-92),'}
          {contrato.tipo_contrato === 'estacional' && ' ESTACIONAL, conforme al Código de Trabajo de la República Dominicana (Ley No. 16-92),'}
          {contrato.tipo_contrato === 'indefinido' && ' POR TIEMPO INDEFINIDO, conforme al Código de Trabajo de la República Dominicana (Ley No. 16-92),'}
          {' '}sujeto a las siguientes cláusulas:
        </p>

        {/* CLÁUSULAS */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>

          <div>
            <p style={{ fontWeight: 700 }}>PRIMERO: NATURALEZA DEL CONTRATO</p>
            {contrato.tipo_contrato === 'obra_servicio' && (
              <p style={{ textAlign: 'justify', marginTop: '4px' }}>
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
              <p style={{ textAlign: 'justify', marginTop: '4px' }}>
                El presente contrato se celebra bajo la modalidad de trabajo estacional,
                en virtud de que la actividad del EMPLEADOR se realiza únicamente durante
                el calendario escolar dominicano.
              </p>
            )}
            {contrato.tipo_contrato === 'indefinido' && (
              <p style={{ textAlign: 'justify', marginTop: '4px' }}>
                El presente contrato se celebra por tiempo indefinido, en atención a la
                naturaleza permanente y continua de las funciones que desempeñará EL TRABAJADOR.
              </p>
            )}
          </div>

          <div>
            <p style={{ fontWeight: 700 }}>SEGUNDO: OBJETO Y FUNCIONES</p>
            <p style={{ textAlign: 'justify', marginTop: '4px' }}>
              EL TRABAJADOR se obliga a prestar sus servicios personales bajo la dirección
              y dependencia de EL EMPLEADOR, desempeñando las funciones de <strong>{contrato.puesto}</strong>.
              {contrato.descripcion_funciones && (<span> {contrato.descripcion_funciones}</span>)}
            </p>
          </div>

          <div>
            <p style={{ fontWeight: 700 }}>TERCERO: DURACIÓN</p>
            <p style={{ textAlign: 'justify', marginTop: '4px' }}>
              Fecha de inicio: <strong>{formatearFecha(contrato.fecha_inicio)}</strong>.
              {contrato.fecha_fin && (<> Fecha estimada de finalización: <strong>{formatearFecha(contrato.fecha_fin)}</strong>.</>)}
              {contrato.tipo_contrato === 'obra_servicio' && (
                <> El contrato terminará, sin responsabilidad para ninguna de las partes,
                con la conclusión del servicio determinado, conforme al artículo 72 del Código de Trabajo.</>
              )}
            </p>
          </div>

          <div>
            <p style={{ fontWeight: 700 }}>CUARTO: SALARIO</p>
            <p style={{ textAlign: 'justify', marginTop: '4px' }}>
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
              <p style={{ fontWeight: 700 }}>QUINTO: JORNADA DE TRABAJO</p>
              <p style={{ textAlign: 'justify', marginTop: '4px' }}>
                {contrato.horario_trabajo && <>Horario: <strong>{contrato.horario_trabajo}</strong>. </>}
                {contrato.dias_laborales && <>Días laborales: <strong>{contrato.dias_laborales}</strong>. </>}
                Se respetarán los descansos semanales, días feriados nacionales y los recesos
                del calendario escolar, conforme a la ley.
              </p>
            </div>
          )}

          {contrato.lugar_trabajo && (
            <div>
              <p style={{ fontWeight: 700 }}>SEXTO: LUGAR DE TRABAJO</p>
              <p style={{ textAlign: 'justify', marginTop: '4px' }}>
                El lugar principal de trabajo será: <strong>{contrato.lugar_trabajo}</strong>.
                EL TRABAJADOR podrá ser asignado, en función de las necesidades del servicio,
                a cualquiera de los centros educativos beneficiados por el contrato PAE de EL EMPLEADOR.
              </p>
            </div>
          )}

          <div>
            <p style={{ fontWeight: 700 }}>SÉPTIMO: REGALÍA PASCUAL</p>
            <p style={{ textAlign: 'justify', marginTop: '4px' }}>
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
            <p style={{ fontWeight: 700 }}>OCTAVO: CONFIDENCIALIDAD Y NORMAS</p>
            <p style={{ textAlign: 'justify', marginTop: '4px' }}>
              EL TRABAJADOR se obliga a mantener absoluta confidencialidad sobre la información
              comercial, financiera, recetas, costos, proveedores, clientes y procedimientos
              operativos de EL EMPLEADOR, así como a cumplir las normas de higiene, manipulación
              de alimentos y conducta establecidas por EL EMPLEADOR y las autoridades sanitarias
              y educativas competentes.
            </p>
          </div>

          <div>
            <p style={{ fontWeight: 700 }}>NOVENO: DISPOSICIONES FINALES</p>
            <p style={{ textAlign: 'justify', marginTop: '4px' }}>
              Todo lo no previsto en el presente contrato se regirá por el Código de Trabajo
              de la República Dominicana (Ley No. 16-92), su Reglamento de Aplicación No. 258-93
              y las demás disposiciones laborales vigentes.
            </p>
          </div>

          {contrato.notas && (
            <div>
              <p style={{ fontWeight: 700 }}>CLÁUSULA ADICIONAL</p>
              <p style={{ textAlign: 'justify', marginTop: '4px' }}>{contrato.notas}</p>
            </div>
          )}
        </div>

        <p style={{ textAlign: 'justify', marginTop: '24px', marginBottom: '32px' }}>
          Hecho y firmado en cuatro (4) originales del mismo tenor y valor: uno para cada una de
          las partes y dos (2) para ser remitidos por EL EMPLEADOR al Departamento de Trabajo o a
          la autoridad local que ejerza sus funciones, conforme al artículo 22 del Código de Trabajo,
          en la fecha indicada al inicio del presente contrato.
        </p>

        {/* FIRMAS DIGITALES */}
        {(contrato.firma_propietario_base64 || contrato.firma_empleado_base64) && (
          <div style={{ marginTop: '32px', marginBottom: '24px' }}>
            <div style={{
              fontSize: '11px', fontWeight: 700, color: '#555',
              letterSpacing: '1px', textAlign: 'center', marginBottom: '12px',
            }}>
              FIRMAS DIGITALES (registradas en el sistema Cocina PAE)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  height: '96px',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  borderBottom: '1px solid #666', paddingBottom: '4px',
                }}>
                  {contrato.firma_propietario_base64 ? (
                    <img src={contrato.firma_propietario_base64} alt="Firma empleador" style={{ maxHeight: '96px' }} />
                  ) : (
                    <span style={{ color: '#aaa', fontSize: '11px' }}>_____________________</span>
                  )}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>EL EMPLEADOR</div>
                <div style={{ fontSize: '11px', color: '#444' }}>{empresa?.nombre_propietario || '___________'}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>CC: {empresa?.cedula_propietario || '_____________'}</div>
                {contrato.firma_propietario_at && (
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                    {formatearFechaCorta(contrato.firma_propietario_at)}
                  </div>
                )}
              </div>

              <div style={{ textAlign: 'center' }}>
                <div style={{
                  height: '96px',
                  display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
                  borderBottom: '1px solid #666', paddingBottom: '4px',
                }}>
                  {contrato.firma_empleado_base64 ? (
                    <img src={contrato.firma_empleado_base64} alt="Firma empleado" style={{ maxHeight: '96px' }} />
                  ) : (
                    <span style={{ color: '#aaa', fontSize: '11px' }}>_____________________</span>
                  )}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>EL TRABAJADOR</div>
                <div style={{ fontSize: '11px', color: '#444' }}>{empleado?.nombre || '___________'}</div>
                <div style={{ fontSize: '11px', color: '#666' }}>CC: {empleado?.cedula || '_____________'}</div>
                {contrato.firma_empleado_at && (
                  <div style={{ fontSize: '10px', color: '#888', marginTop: '4px' }}>
                    {formatearFechaCorta(contrato.firma_empleado_at)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* FIRMAS FÍSICAS + HUELLA + SELLO */}
        <div style={{ marginTop: '48px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: '#555',
            letterSpacing: '1px', textAlign: 'center', marginBottom: '16px',
          }}>
            FIRMAS FÍSICAS (manuscritas)
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px', alignItems: 'flex-start' }}>

            {/* EMPLEADOR + SELLO */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '64px', borderBottom: '1px solid #333' }}></div>
              <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>EL EMPLEADOR</div>
              <div style={{ fontSize: '11px', color: '#444' }}>{empresa?.nombre_propietario || '___________'}</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Fecha: ___/___/______</div>
              <div style={{
                marginTop: '14px',
                border: '1px dashed #999', borderRadius: '8px',
                height: '90px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '10px', color: '#999' }}>Sello de la empresa</span>
              </div>
            </div>

            {/* TRABAJADOR + HUELLA */}
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', justifyContent: 'center' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ height: '64px', borderBottom: '1px solid #333' }}></div>
                  <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>EL TRABAJADOR</div>
                  <div style={{ fontSize: '11px', color: '#444' }}>{empleado?.nombre || '___________'}</div>
                  <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Fecha: ___/___/______</div>
                </div>
                <div style={{ width: '90px', flexShrink: 0 }}>
                  <div style={{
                    border: '1px dashed #999', borderRadius: '8px',
                    height: '90px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    textAlign: 'center', padding: '4px',
                  }}>
                    <span style={{ fontSize: '9px', color: '#999', lineHeight: 1.3 }}>Huella digital<br />(si no firma)</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TESTIGOS (Art. 21 Código de Trabajo) */}
        <div style={{ marginTop: '40px' }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: '#555',
            letterSpacing: '1px', textAlign: 'center', marginBottom: '8px',
          }}>
            TESTIGOS
          </div>
          <p style={{ fontSize: '11px', color: '#444', textAlign: 'justify', marginBottom: '20px', fontStyle: 'italic' }}>
            Los testigos abajo firmantes certifican que el presente contrato fue leído a las partes,
            que éstas lo aprobaron en la forma indicada y que firmaron o estamparon sus señas digitales
            en su presencia, conforme al artículo 21 del Código de Trabajo de la República Dominicana.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '56px', borderBottom: '1px solid #333' }}></div>
              <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>TESTIGO 1</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Nombre: _______________________</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>CC: _______________________</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ height: '56px', borderBottom: '1px solid #333' }}></div>
              <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>TESTIGO 2</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>Nombre: _______________________</div>
              <div style={{ fontSize: '11px', color: '#666', marginTop: '2px' }}>CC: _______________________</div>
            </div>
          </div>
        </div>

        {/* LEGALIZACIÓN NOTARIAL */}
        <div style={{ marginTop: '40px', paddingTop: '24px', borderTop: '1px solid #ccc' }}>
          <div style={{
            fontSize: '11px', fontWeight: 700, color: '#555',
            letterSpacing: '1px', textAlign: 'center', marginBottom: '12px',
          }}>
            LEGALIZACIÓN NOTARIAL
          </div>
          <p style={{ fontSize: '12px', color: '#333', textAlign: 'justify', marginBottom: '24px' }}>
            Yo, _______________________________________, Notario Público de los del número del municipio
            de _______________________, debidamente matriculado(a) en el Colegio Dominicano de Notarios bajo
            el No. ____________, CERTIFICO Y DOY FE de que las firmas y/o señas digitales que anteceden fueron
            puestas libre y voluntariamente en mi presencia por las partes, quienes me declararon conocer el
            contenido y alcance del presente contrato. En la ciudad de _______________________, República Dominicana,
            a los ______ días del mes de _______________ del año ____________.
          </p>
          <div style={{ display: 'flex', justifyContent: 'center', marginTop: '16px' }}>
            <div style={{ textAlign: 'center', width: '60%' }}>
              <div style={{ height: '64px', borderBottom: '1px solid #333' }}></div>
              <div style={{ fontSize: '13px', fontWeight: 700, marginTop: '8px' }}>NOTARIO PÚBLICO</div>
              <div style={{
                marginTop: '14px',
                border: '1px dashed #999', borderRadius: '8px',
                height: '90px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <span style={{ fontSize: '10px', color: '#999' }}>Sello del notario</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      {/* Estilos de impresión */}
      <style>{`
        @media print {
          @page { size: letter; margin: 0; }
          body * { visibility: hidden; }
          .detalle-contrato,
          .detalle-contrato * { visibility: visible; }
          .detalle-contrato {
            background: white !important;
            padding: 0 !important;
          }
          .no-print { display: none !important; }
          .print-area {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 20mm !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
          }
        }
      `}</style>
    </div>
  )
}

export default VistaDetalleContrato