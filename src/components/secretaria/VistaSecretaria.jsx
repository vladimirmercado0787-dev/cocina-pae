import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const COLOR_SECRETARIA = '#D4537E'
const COLOR_SECRETARIA_BG = '#ED93B1'
const COLOR_SECRETARIA_DARKER = '#72243E'
const COLOR_SECRETARIA_CLARO = '#FBEAF0'

function VistaSecretaria({ usuario, empresaId, onCerrarSesion, onCambiarUsuario, onIrCalculadora, onIrInteligencia, onIrDespacho, onIrFactura, onIrConduces, onIrProveedores, onIrCompras, onIrGastos, onIrIngredientes, onIrEmpleados, onIrMiContrato, onIrMisRecibos, onIrCatalogo, onIrHistorial, onVolverAlPanel, modoAdmin = false }) {
  const [empresa, setEmpresa] = useState(null)
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [finanzas, setFinanzas] = useState(null)
  const [empleados, setEmpleados] = useState([])
  const [cargando, setCargando] = useState(true)
  const [tabActivo, setTabActivo] = useState('resumen')

  const [tema, setTema] = useState(() => {
    return localStorage.getItem('cocina_pae_tema') || 'oscuro'
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-tema', tema)
    localStorage.setItem('cocina_pae_tema', tema)
  }, [tema])

  const esTropical = tema === 'tropical'

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)

    const { data: empresaData } = await supabase
      .from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(empresaData)

    const { data: escuelasData } = await supabase
      .from('escuelas').select('*').eq('empresa_id', empresaId).eq('activa', true)
    setEscuelas(escuelasData || [])

    const inicioMes = new Date()
    inicioMes.setDate(1)
    const inicioMesStr = inicioMes.toISOString().split('T')[0]
    
    const { data: opsData } = await supabase
      .from('operaciones_dia')
      .select('*')
      .eq('empresa_id', empresaId)
      .gte('fecha', inicioMesStr)
    setOperaciones(opsData || [])

    const { data: finanzasData } = await supabase
      .from('finanzas').select('*').eq('empresa_id', empresaId).maybeSingle()
    setFinanzas(finanzasData)

    const { data: empleadosData } = await supabase
      .from('usuarios')
      .select('*')
      .eq('empresa_id', empresaId)
      .or('activo.eq.true,activo.is.null')
    setEmpleados(empleadosData || [])

    setCargando(false)
  }

  const totalRacionesDia = escuelas.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0)
  const facturacionDiaria = escuelas.reduce((sum, e) => sum + ((e.raciones_contractuales || 0) * (parseFloat(e.precio_racion) || 0)), 0)
  const facturacionMensual = facturacionDiaria * 22
  const anticipoPct = parseFloat(finanzas?.anticipo_porcentaje || 20)
  const anticipoMonto = facturacionMensual * (anticipoPct / 100)
  const pendienteCobrar = facturacionMensual - anticipoMonto

  const fechaHoy = new Date().toISOString().split('T')[0]
  const opsHoy = operaciones.filter(op => op.fecha === fechaHoy)
  const racionesHoy = opsHoy.reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
  const entregadasHoy = opsHoy.filter(op => op.estado === 'entregada' || op.estado === 'cerrada').length

  const nominaMensual = empleados.reduce((sum, emp) => {
    if (!emp.sueldo || !emp.frecuencia_pago) return sum
    const sueldo = parseFloat(emp.sueldo)
    let mensual = 0
    if (emp.frecuencia_pago === 'mes') mensual = sueldo
    else if (emp.frecuencia_pago === 'quincena') mensual = sueldo * 2
    else if (emp.frecuencia_pago === 'semana') mensual = sueldo * 4.33
    else if (emp.frecuencia_pago === 'dia') mensual = sueldo * 22
    return sum + mensual
  }, 0)

  const mesNombre = new Date().toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })
  const fechaCorta = new Date().toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })

  function confirmarCerrarSesion() {
    const confirmar = window.confirm('¿Estás seguro de cerrar sesión? Tendrás que ingresar las credenciales de la empresa nuevamente.')
    if (confirmar && onCerrarSesion) {
      onCerrarSesion()
    }
  }

  const TABS = [
    { id: 'resumen', label: 'Resumen', emoji: '📊' },
    { id: 'facturacion', label: 'Facturación', emoji: '📄' },
    { id: 'gastos', label: 'Gastos', emoji: '💸' },
    { id: 'nomina', label: 'Nómina', emoji: '💰' },
    { id: 'compras', label: 'Compras', emoji: '📦' },
    { id: 'reportes', label: 'Reportes', emoji: '📈' },
  ]

  if (cargando) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando vista secretaria...</p>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        position: 'relative',
        padding: '20px',
        color: 'var(--color-text-primary)',
      }}
    >
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'var(--glow-verde), var(--glow-ambar)',
          pointerEvents: 'none',
          zIndex: 0,
        }}
      />

      {/* HEADER */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '20px', flexWrap: 'wrap', gap: '12px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '38px', height: '38px', borderRadius: '10px',
            background: 'var(--gradient-logo)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '18px', fontWeight: 500, color: '#FAC775',
            position: 'relative',
          }}>
            A
            <div style={{ position: 'absolute', top: '5px', right: '7px', width: '3px', height: '3px', borderRadius: '50%', background: '#FAC775' }} />
          </div>
          <div>
            <div style={{ fontSize: '10px', color: 'var(--color-text-accent)', opacity: 0.85, letterSpacing: '1.5px', fontWeight: 600 }}>
              ANDAMIO · {empresa?.nombre?.toUpperCase()}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 500, color: 'var(--color-text-primary)', marginTop: '2px' }}>
              Hola, {usuario.nombre.split(' ')[0]}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '20px', padding: '7px 14px',
            fontSize: '11px', color: 'var(--color-text-secondary)',
            display: 'flex', alignItems: 'center', gap: '6px',
            textTransform: 'capitalize',
          }}>
            📅 {fechaCorta}
          </div>

          <div style={{
            display: 'flex', alignItems: 'center',
            background: 'var(--color-bg-elevated)',
            border: '1px solid var(--color-border-subtle)',
            borderRadius: '20px', padding: '3px', gap: '2px',
          }}>
            <button
              type="button"
              onClick={() => setTema('oscuro')}
              style={{
                background: tema === 'oscuro' ? 'var(--gradient-toggle-active)' : 'transparent',
                border: 'none', borderRadius: '16px', padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '11px' }}>🌙</span>
              <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'oscuro' ? 'white' : 'var(--color-text-muted)' }}>
                Oscuro
              </span>
            </button>
            <button
              type="button"
              onClick={() => setTema('tropical')}
              style={{
                background: tema === 'tropical' ? 'var(--gradient-toggle-active)' : 'transparent',
                border: 'none', borderRadius: '16px', padding: '6px 10px',
                display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer',
              }}
            >
              <span style={{ fontSize: '11px' }}>☀️</span>
              <span style={{ fontSize: '10px', fontWeight: 500, color: tema === 'tropical' ? 'white' : 'var(--color-text-muted)' }}>
                Claro
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* BANNER MODO ADMIN */}
      {modoAdmin && (
        <div style={{
          position: 'relative', zIndex: 1,
          background: esTropical ? '#E6F1FB' : 'rgba(55, 138, 221, 0.12)',
          border: '1px solid rgba(24, 95, 165, 0.3)',
          borderLeft: '4px solid #185FA5',
          borderRadius: '14px',
          padding: '16px 20px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          flexWrap: 'wrap',
          boxShadow: esTropical ? '0 2px 8px rgba(24, 95, 165, 0.08)' : 'none',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>👁️</span>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: esTropical ? '#0C447C' : 'var(--color-text-primary)' }}>
                Estás viendo el panel de la secretaria
              </div>
              <div style={{ fontSize: '11px', color: esTropical ? '#185FA5' : 'var(--color-text-secondary)', marginTop: '2px' }}>
                Acceso completo · todas las acciones quedan registradas con tu usuario
              </div>
            </div>
          </div>
          {onVolverAlPanel && (
            <button
              onClick={onVolverAlPanel}
              style={{
                padding: '8px 16px',
                background: 'linear-gradient(135deg, #378ADD 0%, #185FA5 100%)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
                whiteSpace: 'nowrap',
              }}
            >
              ← Volver al panel admin
            </button>
          )}
        </div>
      )}

      {/* TÍTULO ROL */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: esTropical 
          ? `linear-gradient(135deg, ${COLOR_SECRETARIA_CLARO} 0%, #ffffff 100%)`
          : `linear-gradient(135deg, ${COLOR_SECRETARIA}25 0%, ${COLOR_SECRETARIA}10 100%)`,
        border: esTropical ? `1.5px solid ${COLOR_SECRETARIA_BG}` : `1px solid ${COLOR_SECRETARIA}55`,
        borderRadius: '18px',
        padding: '20px 24px',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: esTropical ? `0 2px 12px ${COLOR_SECRETARIA}15` : 'none',
      }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: esTropical ? COLOR_SECRETARIA : `${COLOR_SECRETARIA}30`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px',
          boxShadow: esTropical ? `0 4px 12px ${COLOR_SECRETARIA}40` : 'none',
        }}>
          📋
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: '20px', fontWeight: 500, color: esTropical ? COLOR_SECRETARIA_DARKER : 'var(--color-text-primary)', lineHeight: 1.2 }}>
            Vista Secretaria
          </div>
          <div style={{ fontSize: '12px', color: esTropical ? COLOR_SECRETARIA : `${COLOR_SECRETARIA}CC`, marginTop: '4px', fontWeight: 500, textTransform: 'capitalize' }}>
            {empresa?.nombre} · {mesNombre}
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div style={{
        position: 'relative', zIndex: 1,
        background: 'var(--color-modulo-bg)',
        border: '1px solid var(--color-modulo-border)',
        borderRadius: '14px',
        padding: '8px',
        marginBottom: '20px',
        boxShadow: 'var(--modulo-sombra)',
        overflowX: 'auto',
      }}>
        <div style={{ display: 'flex', gap: '4px', minWidth: 'fit-content' }}>
          {TABS.map(tab => {
            const activo = tabActivo === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setTabActivo(tab.id)}
                style={{
                  padding: '10px 18px',
                  background: activo 
                    ? (esTropical ? COLOR_SECRETARIA : `${COLOR_SECRETARIA}25`)
                    : 'transparent',
                  border: 'none',
                  borderRadius: '10px',
                  color: activo 
                    ? (esTropical ? '#ffffff' : COLOR_SECRETARIA)
                    : 'var(--color-text-secondary)',
                  fontSize: '13px',
                  fontWeight: activo ? 600 : 500,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s ease',
                  boxShadow: activo && esTropical ? `0 2px 8px ${COLOR_SECRETARIA}40` : 'none',
                }}
              >
                <span>{tab.emoji}</span>
                <span>{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* CONTENIDO DE TABS */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>

        {/* TAB: RESUMEN */}
        {tabActivo === 'resumen' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Proyección Mensual */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px' }}>📊</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-accent)', opacity: 0.85, letterSpacing: '1.5px', fontWeight: 600 }}>
                  PROYECCIÓN MENSUAL
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <KpiCard label="Facturación" valor={`RD$ ${(facturacionMensual / 1000).toFixed(0)}K`} sublabel="22 días hábiles" colorBorde="#378ADD" colorTexto={esTropical ? '#0C447C' : '#85B7EB'} />
                <KpiCard label="Anticipo" valor={`RD$ ${(anticipoMonto / 1000).toFixed(0)}K`} sublabel={`${anticipoPct}% del total`} colorBorde="#1D9E75" colorTexto={esTropical ? '#04342C' : '#5DCAA5'} />
                <KpiCard label="Pendiente" valor={`RD$ ${(pendienteCobrar / 1000).toFixed(0)}K`} sublabel="por cobrar" colorBorde="#BA7517" colorTexto={esTropical ? '#854F0B' : '#FAC775'} />
                <KpiCard label="Nómina" valor={`RD$ ${(nominaMensual / 1000).toFixed(0)}K`} sublabel={`${empleados.length} empleados`} colorBorde={COLOR_SECRETARIA} colorTexto={esTropical ? COLOR_SECRETARIA_DARKER : COLOR_SECRETARIA_BG} />
              </div>
            </div>

            {/* Hoy */}
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                <span style={{ fontSize: '14px' }}>🔥</span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-accent)', opacity: 0.85, letterSpacing: '1.5px', fontWeight: 600 }}>
                  HOY
                </span>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
                <KpiCard label="Raciones planificadas" valor={racionesHoy.toLocaleString()} colorBorde="#1D9E75" />
                <KpiCard label="Escuelas atendidas" colorBorde="#0F6E56">
                  <span style={{ color: esTropical ? '#0F6E56' : '#5DCAA5' }}>{entregadasHoy}</span>
                  <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>/{escuelas.length}</span>
                </KpiCard>
                <KpiCard label="Operaciones del mes" valor={operaciones.length} sublabel="total ops" colorBorde="#7F77DD" colorTexto={esTropical ? '#3C3489' : '#AFA9EC'} />
              </div>
            </div>

            {/* Pendientes del día */}
            <div style={{
              background: esTropical ? '#FAF3E5' : 'rgba(250, 199, 117, 0.08)',
              border: esTropical ? '1px solid rgba(186, 117, 23, 0.3)' : '1px solid rgba(250, 199, 117, 0.25)',
              borderLeft: '4px solid #BA7517',
              borderRadius: '14px',
              padding: '18px 20px',
              boxShadow: 'var(--modulo-sombra)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <span style={{ fontSize: '14px' }}>🚨</span>
                <span style={{ fontSize: '11px', color: esTropical ? '#854F0B' : '#FAC775', letterSpacing: '1.5px', fontWeight: 700 }}>
                  PENDIENTES DEL DÍA
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: esTropical ? '#633806' : 'var(--color-text-secondary)' }}>
                <div>• Revisar conduces de entregas</div>
                <div>• Validar pagos pendientes</div>
                <div>• Capturar facturas de proveedores con RNC</div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: FACTURACIÓN */}
        {tabActivo === 'facturacion' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px' }}>📄</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-accent)', opacity: 0.85, letterSpacing: '1.5px', fontWeight: 600 }}>
                FACTURACIÓN INABIE Y CONDUCES
              </span>
            </div>
            <CardAccion 
              emoji="🧾" 
              titulo="Factura INABIE" 
              descripcion="Genera, imprime y gestiona las facturas mensuales para INABIE"
              colorBorde="#378ADD"
              onClick={onIrFactura}
              esTropical={esTropical}
              labelBoton="Abrir Factura INABIE"
            />
            <CardAccion 
              emoji="🚚" 
              titulo="Conduces" 
              descripcion="Gestiona los conduces del mes en curso"
              colorBorde="#378ADD"
              onClick={onIrConduces}
              esTropical={esTropical}
              labelBoton="Abrir Conduces"
            />
          </div>
        )}

        {/* TAB: GASTOS */}
        {tabActivo === 'gastos' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px' }}>💸</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-accent)', opacity: 0.85, letterSpacing: '1.5px', fontWeight: 600 }}>
                GASTOS OPERATIVOS
              </span>
            </div>
            <CardAccion 
              emoji="💸" 
              titulo="Gastos del negocio" 
              descripcion="Captura gastos con RNC, NCF, categorías y formas de pago"
              colorBorde={COLOR_SECRETARIA}
              onClick={onIrGastos}
              esTropical={esTropical}
              labelBoton="Abrir Gastos"
            />
          </div>
        )}

        {/* TAB: NÓMINA */}
        {tabActivo === 'nomina' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px' }}>💰</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-accent)', opacity: 0.85, letterSpacing: '1.5px', fontWeight: 600 }}>
                NÓMINA DEL MES
              </span>
            </div>

            {/* Total nómina */}
            <div style={{
              background: esTropical 
                ? `linear-gradient(135deg, ${COLOR_SECRETARIA_CLARO} 0%, #ffffff 100%)`
                : `linear-gradient(135deg, ${COLOR_SECRETARIA}20 0%, ${COLOR_SECRETARIA}05 100%)`,
              border: `1px solid ${COLOR_SECRETARIA}40`,
              borderLeft: `4px solid ${COLOR_SECRETARIA}`,
              borderRadius: '14px',
              padding: '18px 20px',
              boxShadow: 'var(--modulo-sombra)',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '12px', color: esTropical ? COLOR_SECRETARIA_DARKER : COLOR_SECRETARIA_BG, fontWeight: 600 }}>
                    Total a pagar este mes
                  </div>
                  <div style={{ fontSize: '11px', color: esTropical ? COLOR_SECRETARIA : 'var(--color-text-muted)', marginTop: '4px' }}>
                    {empleados.filter(e => e.sueldo).length} empleados con sueldo configurado
                  </div>
                </div>
                <div style={{ fontSize: '28px', fontWeight: 600, color: esTropical ? COLOR_SECRETARIA_DARKER : 'var(--color-text-primary)' }}>
                  RD$ {nominaMensual.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                </div>
              </div>
            </div>

            {/* Lista empleados */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {empleados.filter(e => e.sueldo).map(emp => {
                const sueldo = parseFloat(emp.sueldo)
                let mensual = 0
                if (emp.frecuencia_pago === 'mes') mensual = sueldo
                else if (emp.frecuencia_pago === 'quincena') mensual = sueldo * 2
                else if (emp.frecuencia_pago === 'semana') mensual = sueldo * 4.33
                else if (emp.frecuencia_pago === 'dia') mensual = sueldo * 22

                return (
                  <div key={emp.id} style={{
                    background: 'var(--color-modulo-bg)',
                    border: '1px solid var(--color-modulo-border)',
                    borderLeft: `4px solid ${COLOR_SECRETARIA}`,
                    borderRadius: '12px',
                    padding: '14px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    flexWrap: 'wrap',
                    boxShadow: 'var(--modulo-sombra)',
                  }}>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        {emp.nombre}
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '2px', textTransform: 'capitalize' }}>
                        {emp.rol} · {emp.frecuencia_pago}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                        RD$ {mensual.toLocaleString('es-DO', { maximumFractionDigits: 0 })}
                      </div>
                      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)' }}>
                        /mes
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {onIrEmpleados && (
              <div style={{ textAlign: 'center', paddingTop: '8px' }}>
                <button
                  onClick={onIrEmpleados}
                  style={{
                    padding: '10px 20px',
                    background: 'linear-gradient(135deg, #D4537E 0%, #993556 100%)',
                    border: 'none', borderRadius: '10px',
                    color: 'white', fontSize: '13px', fontWeight: 500,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  👥 Gestionar Empleados
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB: COMPRAS */}
        {tabActivo === 'compras' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <span style={{ fontSize: '14px' }}>📦</span>
              <span style={{ fontSize: '11px', color: 'var(--color-text-accent)', opacity: 0.85, letterSpacing: '1.5px', fontWeight: 600 }}>
                COMPRAS, PROVEEDORES E INVENTARIO
              </span>
            </div>
            
            {onIrCompras && (
              <CardAccion 
                emoji="🛒" 
                titulo="Compras" 
                descripcion="Registra compras, facturas, recepción de mercancía"
                colorBorde="#EF9F27"
                onClick={onIrCompras}
                esTropical={esTropical}
              />
            )}

            {onIrProveedores && (
              <CardAccion 
                emoji="🏪" 
                titulo="Proveedores" 
                descripcion="Gestiona a quién le compras tus insumos"
                colorBorde="#EF9F27"
                onClick={onIrProveedores}
                esTropical={esTropical}
              />
            )}

            {onIrIngredientes && (
              <CardAccion 
                emoji="🥕" 
                titulo="Ingredientes e Inventario" 
                descripcion="Consulta el stock disponible y los ingredientes registrados"
                colorBorde="#1D9E75"
                onClick={onIrIngredientes}
                esTropical={esTropical}
              />
            )}
          </div>
        )}

        {/* TAB: REPORTES */}
        {tabActivo === 'reportes' && (
          <div style={{
            background: 'var(--color-modulo-bg)',
            border: '1px solid var(--color-modulo-border)',
            borderRadius: '14px',
            padding: '60px 40px',
            textAlign: 'center',
            boxShadow: 'var(--modulo-sombra)',
          }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>📈</div>
            <div style={{ fontSize: '18px', fontWeight: 600, color: 'var(--color-text-primary)', marginBottom: '8px' }}>
              Reportes Mensuales
            </div>
            <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '20px', maxWidth: '420px', margin: '0 auto 20px' }}>
              Próximamente: P&L, formularios 606/607 DGII, estado INABIE, export Excel/PDF
            </div>
            <span style={{
              display: 'inline-block',
              background: esTropical ? '#BA7517' : 'rgba(250, 199, 117, 0.2)',
              color: esTropical ? '#ffffff' : '#FAC775',
              padding: '5px 12px',
              borderRadius: '8px',
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.5px',
            }}>
              BLOQUE 6E
            </span>
          </div>
        )}

      </div>

      {/* ACCESOS RÁPIDOS (siempre visibles) */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ fontSize: '14px' }}>⚡</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600 }}>
            ACCESOS RÁPIDOS
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
          {onIrDespacho && <AccesoRapido emoji="🚚" label="Despacho" color="#D85A30" onClick={onIrDespacho} esTropical={esTropical} />}
          {onIrInteligencia && <AccesoRapido emoji="💡" label="Inteligencia" color="#7F77DD" onClick={onIrInteligencia} esTropical={esTropical} />}
          {onIrCalculadora && <AccesoRapido emoji="🧮" label="Calculadora" color="#D4537E" onClick={onIrCalculadora} esTropical={esTropical} />}
          {onIrCatalogo && <AccesoRapido emoji="📋" label="Catálogo" color="#1D9E75" onClick={onIrCatalogo} esTropical={esTropical} />}
          {onIrHistorial && <AccesoRapido emoji="📜" label="Historial" color="#7F77DD" onClick={onIrHistorial} esTropical={esTropical} />}
          {onIrMiContrato && <AccesoRapido emoji="📋" label="Mi Contrato" color="#534AB7" onClick={onIrMiContrato} esTropical={esTropical} />}
          {onIrMisRecibos && <AccesoRapido emoji="💰" label="Mis Recibos" color="#1D9E75" onClick={onIrMisRecibos} esTropical={esTropical} />}
        </div>
      </div>

      {/* FOOTER (solo si NO está en modo admin) */}
      {!modoAdmin && (
        <div style={{
          position: 'relative', zIndex: 1,
          paddingTop: '20px',
          borderTop: '1px solid var(--color-border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '12px', flexWrap: 'wrap',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '14px' }}>🇩🇴</span>
            <span style={{
              color: 'var(--color-text-accent)', opacity: 0.85,
              fontSize: '10px', fontWeight: 600, letterSpacing: '0.5px',
            }}>
              Andamio · Modo Secretaria · Sincronizado
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            {onCambiarUsuario && (
              <button
                onClick={onCambiarUsuario}
                style={{
                  background: 'var(--color-bg-elevated)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: '20px', padding: '7px 14px',
                  color: 'var(--color-text-secondary)',
                  fontSize: '11px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  fontFamily: 'inherit', fontWeight: 500,
                }}
              >
                🔄 Cambiar usuario
              </button>
            )}
            <button
              onClick={confirmarCerrarSesion}
              style={{
                background: esTropical ? '#FCEBEB' : 'rgba(244, 67, 54, 0.1)',
                border: esTropical ? '1px solid #E24B4A' : '1px solid rgba(244, 67, 54, 0.3)',
                borderRadius: '20px', padding: '7px 14px',
                color: esTropical ? '#A32D2D' : '#F4C0D1',
                fontSize: '11px', cursor: 'pointer',
                display: 'flex', alignItems: 'center', gap: '6px',
                fontFamily: 'inherit', fontWeight: 500,
              }}
            >
              🚪 Cerrar sesión
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Sub-componente: KPI Card ───
function KpiCard({ label, valor, sublabel, children, colorBorde, colorTexto }) {
  return (
    <div style={{
      background: 'var(--color-modulo-bg)',
      border: '1px solid var(--color-modulo-border)',
      borderLeft: `4px solid ${colorBorde}`,
      borderRadius: '12px', padding: '14px',
      boxShadow: 'var(--modulo-sombra)',
    }}>
      <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginBottom: '8px', fontWeight: 500 }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 600, color: colorTexto || 'var(--color-text-primary)' }}>
        {valor || children}
      </div>
      {sublabel && (
        <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', marginTop: '4px', fontWeight: 500 }}>
          {sublabel}
        </div>
      )}
    </div>
  )
}

// ─── Sub-componente: Card de Acción (con botón) ───
function CardAccion({ emoji, titulo, descripcion, colorBorde, onClick, esTropical, labelBoton }) {
  return (
    <div style={{
      background: 'var(--color-modulo-bg)',
      border: '1px solid var(--color-modulo-border)',
      borderLeft: `4px solid ${colorBorde}`,
      borderRadius: '14px',
      padding: '20px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '16px',
      flexWrap: 'wrap',
      boxShadow: 'var(--modulo-sombra)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flex: 1, minWidth: '200px' }}>
        <div style={{
          width: '52px',
          height: '52px',
          borderRadius: '14px',
          background: esTropical ? colorBorde : `${colorBorde}25`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px',
          boxShadow: esTropical ? `0 4px 12px ${colorBorde}40` : 'none',
        }}>
          {emoji}
        </div>
        <div>
          <div style={{ fontSize: '15px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {titulo}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)', marginTop: '4px', fontWeight: 500 }}>
            {descripcion}
          </div>
        </div>
      </div>
      {onClick && (
        <button
          onClick={onClick}
          style={{
            padding: '10px 18px',
            background: `linear-gradient(135deg, ${colorBorde} 0%, ${colorBorde}CC 100%)`,
            border: 'none', borderRadius: '10px',
            color: 'white', fontSize: '13px', fontWeight: 500,
            cursor: 'pointer', fontFamily: 'inherit',
            whiteSpace: 'nowrap',
          }}
        >
          {labelBoton || 'Abrir →'}
        </button>
      )}
    </div>
  )
}

// ─── Sub-componente: Acceso Rápido (tarjeta pequeña) ───
function AccesoRapido({ emoji, label, color, onClick, esTropical }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'var(--color-modulo-bg)',
        border: '1px solid var(--color-modulo-border)',
        borderLeft: `4px solid ${color}`,
        borderRadius: '12px',
        padding: '14px 16px',
        cursor: 'pointer',
        textAlign: 'left',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
        fontFamily: 'inherit',
        boxShadow: 'var(--modulo-sombra)',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.borderColor = `${color}80`
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'none'
        e.currentTarget.style.borderColor = 'var(--color-modulo-border)'
      }}
    >
      <div style={{ fontSize: '20px', marginBottom: '4px' }}>{emoji}</div>
      <div style={{ fontSize: '13px', fontWeight: 500, color: 'var(--color-text-primary)' }}>
        {label}
      </div>
    </button>
  )
}

export default VistaSecretaria