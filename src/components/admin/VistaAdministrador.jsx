import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'

const CATEGORIAS = {
  finanzas: {
    color: '#378ADD',
    colorBg: '#85B7EB',
    colorDark: '#185FA5',
    colorDarker: '#0C447C',
    bgClaro: '#E6F1FB',
    label: 'Finanzas',
    sublabel: 'Facturas, conduces, gastos y reportes DGII',
  },
  inventario: {
    color: '#EF9F27',
    colorBg: '#FAC775',
    colorDark: '#BA7517',
    colorDarker: '#633806',
    bgClaro: '#FAEEDA',
    label: 'Inventario & Compras',
    sublabel: 'Ingredientes, compras, proveedores y recetas',
  },
  personal: {
    color: '#D4537E',
    colorBg: '#ED93B1',
    colorDark: '#993556',
    colorDarker: '#72243E',
    bgClaro: '#FBEAF0',
    label: 'Personal',
    sublabel: 'Empleados, nómina, contratos y calculadora',
  },
  operacion: {
    color: '#7F77DD',
    colorBg: '#AFA9EC',
    colorDark: '#534AB7',
    colorDarker: '#3C3489',
    bgClaro: '#EEEDFE',
    label: 'Operación & Configuración',
    sublabel: 'Inteligencia, historial y configuración',
  },
}

function VistaAdministrador({ usuario, empresaId, onCerrarSesion, onCambiarUsuario, onIrConfiguracion, onIrFactura, onIrConduces, onIrCalculadora, onIrInteligencia, onIrDespacho, onIrEmpleados, onIrContratos, onIrMiContrato, onIrMisRecibos, onIrProveedores, onIrCompras, onIrIngredientes, onVerComoSecretaria, onIrGastos, onIrNomina, onIrCatalogo, onIrHistorial }) {
  const [empresa, setEmpresa] = useState(null)
  const [escuelas, setEscuelas] = useState([])
  const [operaciones, setOperaciones] = useState([])
  const [finanzas, setFinanzas] = useState(null)
  const [usuarios, setUsuarios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [modalProximamente, setModalProximamente] = useState(null)

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

    const { data: usuariosData } = await supabase
      .from('usuarios').select('*').eq('empresa_id', empresaId).eq('activo', true)
    setUsuarios(usuariosData || [])

    setCargando(false)
  }

  function confirmarCerrarSesion() {
    const confirmar = window.confirm('¿Estás seguro de cerrar sesión? Tendrás que ingresar las credenciales de la empresa nuevamente.')
    if (confirmar && onCerrarSesion) {
      onCerrarSesion()
    }
  }

  function mostrarProximamente(nombreModulo) {
    setModalProximamente(nombreModulo)
  }

  // ─── Cálculos financieros ───
  const totalRacionesDia = escuelas.reduce((sum, e) => sum + (e.raciones_contractuales || 0), 0)
  const facturacionDiaria = escuelas.reduce((sum, e) => sum + ((e.raciones_contractuales || 0) * (parseFloat(e.precio_racion) || 0)), 0)
  const facturacionMensual = facturacionDiaria * 22

  const anticipoPct = parseFloat(finanzas?.anticipo_porcentaje || 20)
  const anticipoMonto = facturacionMensual * (anticipoPct / 100)
  const pendienteCobrar = facturacionMensual - anticipoMonto
  const diasPago = finanzas?.dias_pago_promedio || 90

  const racionesEntregadasMes = operaciones
    .filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
    .reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)

  const facturacionRealMes = operaciones
    .filter(op => op.estado === 'entregada' || op.estado === 'cerrada')
    .reduce((sum, op) => {
      const escuela = escuelas.find(e => e.id === op.escuela_id)
      return sum + ((op.raciones_planificadas || 0) * (parseFloat(escuela?.precio_racion) || 0))
    }, 0)

  const fechaHoy = new Date().toISOString().split('T')[0]
  const opsHoy = operaciones.filter(op => op.fecha === fechaHoy)
  const racionesHoy = opsHoy.reduce((sum, op) => sum + (op.raciones_planificadas || 0), 0)
  const facturacionHoy = opsHoy.reduce((sum, op) => {
    const escuela = escuelas.find(e => e.id === op.escuela_id)
    return sum + ((op.raciones_planificadas || 0) * (parseFloat(escuela?.precio_racion) || 0))
  }, 0)
  const escuelasAtendidasHoy = opsHoy.filter(op => op.estado === 'entregada' || op.estado === 'cerrada').length

  const costoObjetivo = parseFloat(finanzas?.costo_objetivo_racion || 35)
  const costoTotalDiarioObjetivo = totalRacionesDia * costoObjetivo
  const margenDiarioObjetivo = facturacionDiaria - costoTotalDiarioObjetivo
  const margenPct = facturacionDiaria > 0 ? Math.round((margenDiarioObjetivo / facturacionDiaria) * 100) : 0

  const mesNombre = new Date().toLocaleDateString('es-DO', { month: 'long', year: 'numeric' })
  const fechaCorta = new Date().toLocaleDateString('es-DO', { weekday: 'short', day: 'numeric', month: 'short' })

  const tituloVista = usuario.rol === 'contador' ? 'Modo Contador' : 'Modo Administrador'

  if (cargando) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ color: 'var(--color-text-muted)' }}>⏳ Cargando administración...</p>
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

      {/* MODAL: Próximamente */}
      {modalProximamente && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(8px)',
        }}>
          <div style={{
            background: 'var(--color-bg-elevated)',
            backdropFilter: 'blur(20px)',
            border: '0.5px solid var(--color-border-accent)',
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '420px',
            width: '100%',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '52px', marginBottom: '12px' }}>🚧</div>
            <h3 style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)', margin: '0 0 8px' }}>
              Próximamente
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', margin: '0 0 8px', lineHeight: 1.5 }}>
              <strong style={{ color: 'var(--color-text-accent)' }}>{modalProximamente}</strong>
            </p>
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', margin: '0 0 24px', lineHeight: 1.5 }}>
              Esta función estará disponible en una próxima actualización.
            </p>
            <button
              onClick={() => setModalProximamente(null)}
              style={{
                width: '100%', padding: '12px',
                background: 'var(--gradient-button)',
                border: 'none', borderRadius: '10px',
                color: 'white', fontSize: '13px', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '24px', flexWrap: 'wrap', gap: '12px',
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
                transition: 'all 0.3s ease',
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
                transition: 'all 0.3s ease',
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

      {/* PROYECCIÓN MENSUAL */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ fontSize: '14px' }}>📊</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-accent)', opacity: 0.85, letterSpacing: '1.5px', fontWeight: 600 }}>
            PROYECCIÓN MENSUAL · {mesNombre.toUpperCase()}
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <KpiCard 
            label="Facturación proyectada" 
            valor={`RD$ ${(facturacionMensual / 1000).toFixed(0)}K`}
            sublabel="22 días hábiles"
            colorBorde="#378ADD" 
            colorTexto={esTropical ? '#0C447C' : '#85B7EB'}
          />
          <KpiCard 
            label="Anticipo INABIE" 
            valor={`RD$ ${(anticipoMonto / 1000).toFixed(0)}K`}
            sublabel={`${anticipoPct}% del total`}
            colorBorde="#1D9E75" 
            colorTexto={esTropical ? '#04342C' : '#5DCAA5'}
          />
          <KpiCard 
            label="Pendiente cobrar" 
            valor={`RD$ ${(pendienteCobrar / 1000).toFixed(0)}K`}
            sublabel={`en ${diasPago} días`}
            colorBorde="#BA7517" 
            colorTexto={esTropical ? '#854F0B' : '#FAC775'}
          />
          <KpiCard 
            label="Margen objetivo" 
            valor={`${margenPct}%`}
            sublabel={`RD$ ${(margenDiarioObjetivo / 1000).toFixed(0)}K/día`}
            colorBorde={margenPct < 25 ? '#E24B4A' : '#534AB7'}
            colorTexto={margenPct < 25 ? (esTropical ? '#A32D2D' : '#F4C0D1') : (esTropical ? '#3C3489' : '#AFA9EC')}
          />
        </div>
      </div>

      {/* OPERACIÓN DE HOY */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '16px', marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ fontSize: '14px' }}>🔥</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-accent)', opacity: 0.85, letterSpacing: '1.5px', fontWeight: 600 }}>
            OPERACIÓN DE HOY
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          <KpiCard label="Raciones planificadas" valor={racionesHoy.toLocaleString()} colorBorde="#1D9E75" />
          <KpiCard label="Escuelas atendidas" colorBorde="#0F6E56">
            <span style={{ color: esTropical ? '#0F6E56' : '#5DCAA5' }}>{escuelasAtendidasHoy}</span>
            <span style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>/{escuelas.length}</span>
          </KpiCard>
          <KpiCard label="Facturado hoy" valor={`RD$ ${(facturacionHoy / 1000).toFixed(1)}K`} colorBorde="#BA7517" colorTexto={esTropical ? '#854F0B' : '#FAC775'} />
          <KpiCard label="Total operaciones" valor={operaciones.length} sublabel="este mes" colorBorde="#7F77DD" colorTexto={esTropical ? '#3C3489' : '#AFA9EC'} />
        </div>
      </div>

      {/* MES EN CURSO - Datos reales */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px', marginTop: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
          <span style={{ fontSize: '14px' }}>📈</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600 }}>
            MES EN CURSO (DATOS REALES)
          </span>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
          <KpiCard label="Raciones entregadas" valor={racionesEntregadasMes.toLocaleString()} colorBorde="#0F6E56" />
          <KpiCard label="Facturación real" valor={`RD$ ${(facturacionRealMes / 1000).toFixed(0)}K`} colorBorde="#BA7517" colorTexto={esTropical ? '#854F0B' : '#FAC775'} />
        </div>
      </div>

      {/* EQUIPO ACTIVO */}
      {usuarios.length > 0 && (
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px' }}>👥</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600 }}>
              EQUIPO ACTIVO ({usuarios.length})
            </span>
          </div>
          <div style={{
            background: 'var(--color-modulo-bg)',
            border: '1px solid var(--color-modulo-border)',
            borderRadius: '14px',
            padding: '16px',
            boxShadow: 'var(--modulo-sombra)',
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
          }}>
            {usuarios.map((u) => (
              <span key={u.id} style={{
                padding: '6px 12px',
                background: 'var(--color-bg-elevated)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: '20px',
                fontSize: '12px',
                color: 'var(--color-text-secondary)',
                fontWeight: 500,
              }}>
                {u.nombre} · <span style={{ color: 'var(--color-text-accent)', textTransform: 'capitalize' }}>{u.rol}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ALERTAS Y RECORDATORIOS */}
      {(finanzas?.contador_externo || finanzas?.frecuencia_pago_empleados || margenPct < 25) && (
        <div style={{
          position: 'relative', zIndex: 1, marginBottom: '24px',
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
              ALERTAS Y RECORDATORIOS
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {finanzas?.contador_externo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: esTropical ? '#633806' : 'var(--color-text-secondary)' }}>
                <span>🧮</span>
                <span>Pago contador <strong>{finanzas.contador_nombre}</strong>: RD$ {finanzas.contador_iguala_mensual} (mensual)</span>
              </div>
            )}
            {finanzas?.frecuencia_pago_empleados && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: esTropical ? '#633806' : 'var(--color-text-secondary)' }}>
                <span>👥</span>
                <span>Pago empleados: <strong style={{ textTransform: 'capitalize' }}>{finanzas.frecuencia_pago_empleados}</strong></span>
              </div>
            )}
            {margenPct < 25 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: esTropical ? '#A32D2D' : '#F4C0D1', fontWeight: 600 }}>
                <span>⚠️</span>
                <span>Margen ({margenPct}%) por debajo del mínimo ({finanzas?.margen_minimo_porcentaje || 25}%)</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTÓN VER COMO SECRETARIA (si aplica) */}
      {onVerComoSecretaria && (
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
          <button
            onClick={onVerComoSecretaria}
            style={{
              width: '100%',
              padding: '14px',
              background: esTropical 
                ? `linear-gradient(135deg, ${CATEGORIAS.personal.bgClaro} 0%, var(--color-bg-elevated) 100%)`
                : `linear-gradient(135deg, ${CATEGORIAS.personal.color}20 0%, ${CATEGORIAS.personal.color}05 100%)`,
              border: `1px solid ${CATEGORIAS.personal.color}40`,
              borderLeft: `4px solid ${CATEGORIAS.personal.color}`,
              borderRadius: '12px',
              color: esTropical ? CATEGORIAS.personal.colorDarker : 'var(--color-text-primary)',
              fontSize: '13px',
              fontWeight: 500,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              fontFamily: 'inherit',
            }}
          >
            📋 Ver como Secretaria
          </button>
        </div>
      )}

      {/* MÓDULOS - 4 CATEGORÍAS */}
      <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px' }}>
          <span style={{ fontSize: '14px' }}>📂</span>
          <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600 }}>
            MÓDULOS
          </span>
        </div>

        <CategoriaBanner cat={CATEGORIAS.finanzas} icon="💰" count={4} tema={tema}>
          <Modulo emoji="🧾" label="Factura INABIE"   sublabel="Facturas mensuales" cat={CATEGORIAS.finanzas} tema={tema} onClick={onIrFactura ? onIrFactura : () => mostrarProximamente('Factura INABIE')} />
          <Modulo emoji="🚚" label="Conduces"         sublabel="Mes en curso"       cat={CATEGORIAS.finanzas} tema={tema} onClick={onIrConduces ? onIrConduces : () => mostrarProximamente('Conduces')} />
          <Modulo emoji="💸" label="Gastos"           sublabel="Categorías + RNC"   cat={CATEGORIAS.finanzas} tema={tema} onClick={onIrGastos ? onIrGastos : () => mostrarProximamente('Gastos')} />
          <Modulo emoji="📊" label="Reportes DGII"    sublabel="606 · 607"          cat={CATEGORIAS.finanzas} tema={tema} proximamente onClick={() => mostrarProximamente('Reportes DGII 606/607')} />
        </CategoriaBanner>

        <CategoriaBanner cat={CATEGORIAS.inventario} icon="📦" count={4} tema={tema}>
          <Modulo emoji="🥕" label="Ingredientes" sublabel="Catálogo"    cat={CATEGORIAS.inventario} tema={tema} onClick={onIrIngredientes ? onIrIngredientes : () => mostrarProximamente('Ingredientes')} />
          <Modulo emoji="🛒" label="Compras"       sublabel="Esta semana" cat={CATEGORIAS.inventario} tema={tema} onClick={onIrCompras ? onIrCompras : () => mostrarProximamente('Compras')} />
          <Modulo emoji="🏪" label="Proveedores"   sublabel="Con RNC"     cat={CATEGORIAS.inventario} tema={tema} onClick={onIrProveedores ? onIrProveedores : () => mostrarProximamente('Proveedores')} />
          <Modulo emoji="👨‍🍳" label="Recetas"      sublabel="Catálogo"    cat={CATEGORIAS.inventario} tema={tema} onClick={onIrCatalogo ? onIrCatalogo : () => mostrarProximamente('Recetas')} />
        </CategoriaBanner>

        <CategoriaBanner cat={CATEGORIAS.personal} icon="👥" count={4} tema={tema}>
          <Modulo emoji="👤" label="Empleados"   sublabel="Equipo"       cat={CATEGORIAS.personal} tema={tema} onClick={onIrEmpleados ? onIrEmpleados : () => mostrarProximamente('Empleados')} />
          <Modulo emoji="💵" label="Nómina"      sublabel="Pagos"        cat={CATEGORIAS.personal} tema={tema} onClick={onIrNomina ? onIrNomina : () => mostrarProximamente('Nómina')} />
          <Modulo emoji="📄" label="Contratos"   sublabel="Por empleado" cat={CATEGORIAS.personal} tema={tema} onClick={onIrContratos ? onIrContratos : () => mostrarProximamente('Contratos')} />
          <Modulo emoji="🧮" label="Calculadora" sublabel="Liquidación"  cat={CATEGORIAS.personal} tema={tema} onClick={onIrCalculadora ? onIrCalculadora : () => mostrarProximamente('Calculadora')} />
        </CategoriaBanner>

        <CategoriaBanner cat={CATEGORIAS.operacion} icon="🧠" count={4} tema={tema}>
          <Modulo emoji="🚚" label="Modo Despacho"   sublabel="Operación"   cat={CATEGORIAS.operacion} tema={tema} onClick={onIrDespacho ? onIrDespacho : () => mostrarProximamente('Modo Despacho')} />
          <Modulo emoji="💡" label="Inteligencia"    sublabel="Análisis"    cat={CATEGORIAS.operacion} tema={tema} onClick={onIrInteligencia ? onIrInteligencia : () => mostrarProximamente('Inteligencia')} />
          <Modulo emoji="📜" label="Historial"       sublabel="Todas ops"   cat={CATEGORIAS.operacion} tema={tema} onClick={onIrHistorial ? onIrHistorial : () => mostrarProximamente('Historial')} />
          <Modulo emoji="⚙️" label="Configuración"  sublabel={onIrConfiguracion ? "Empresa" : "Solo propietario"} cat={CATEGORIAS.operacion} tema={tema} proximamente={!onIrConfiguracion} onClick={onIrConfiguracion ? onIrConfiguracion : () => mostrarProximamente('Configuración (solo propietario)')} />
        </CategoriaBanner>
      </div>

      {/* MIS COSAS (si aplica) */}
      {(onIrMiContrato || onIrMisRecibos) && (
        <div style={{ position: 'relative', zIndex: 1, marginBottom: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
            <span style={{ fontSize: '14px' }}>📌</span>
            <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', letterSpacing: '1.5px', fontWeight: 600 }}>
              MIS COSAS
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {onIrMiContrato && (
              <button
                onClick={onIrMiContrato}
                style={{
                  background: 'var(--color-modulo-bg)',
                  border: '1px solid var(--color-modulo-border)',
                  borderLeft: '4px solid #534AB7',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  boxShadow: 'var(--modulo-sombra)',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>📋</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>Mi Contrato</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Ver detalles</div>
              </button>
            )}
            {onIrMisRecibos && (
              <button
                onClick={onIrMisRecibos}
                style={{
                  background: 'var(--color-modulo-bg)',
                  border: '1px solid var(--color-modulo-border)',
                  borderLeft: '4px solid #1D9E75',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'inherit',
                  boxShadow: 'var(--modulo-sombra)',
                }}
              >
                <div style={{ fontSize: '20px', marginBottom: '6px' }}>💰</div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: 'var(--color-text-primary)' }}>Mis Recibos</div>
                <div style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>Historial de pagos</div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* FOOTER */}
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
            Andamio · {tituloVista} · Sincronizado
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
              background: tema === 'tropical' ? '#FCEBEB' : 'rgba(244, 67, 54, 0.1)',
              border: tema === 'tropical' ? '1px solid #E24B4A' : '1px solid rgba(244, 67, 54, 0.3)',
              borderRadius: '20px', padding: '7px 14px',
              color: tema === 'tropical' ? '#A32D2D' : '#F4C0D1',
              fontSize: '11px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '6px',
              fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            🚪 Cerrar sesión
          </button>
        </div>
      </div>
    </div>
  )
}

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

function CategoriaBanner({ cat, icon, count, children, tema }) {
  const esTropical = tema === 'tropical'

  return (
    <div style={{
      background: esTropical
        ? `linear-gradient(135deg, ${cat.bgClaro} 0%, #ffffff 100%)`
        : `linear-gradient(135deg, ${cat.color}25 0%, ${cat.color}10 100%)`,
      border: esTropical ? `1.5px solid ${cat.colorBg}` : `1px solid ${cat.color}55`,
      borderRadius: '18px',
      padding: '26px 28px',
      marginBottom: '16px',
      boxShadow: esTropical ? `0 2px 12px ${cat.color}15` : 'none',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: '22px', gap: '12px', flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: esTropical ? cat.color : `${cat.color}30`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '26px',
            boxShadow: esTropical ? `0 4px 12px ${cat.color}40` : 'none',
          }}>
            {icon}
          </div>
          <div>
            <div style={{
              fontSize: '22px',
              fontWeight: 500,
              color: esTropical ? cat.colorDarker : 'var(--color-text-primary)',
              lineHeight: 1.2,
            }}>
              {cat.label}
            </div>
            {cat.sublabel && (
              <div style={{
                fontSize: '12px',
                color: esTropical ? cat.colorDark : cat.color,
                opacity: esTropical ? 1 : 0.85,
                marginTop: '4px',
                fontWeight: esTropical ? 500 : 400,
              }}>
                {cat.sublabel}
              </div>
            )}
          </div>
        </div>
        <span style={{
          fontSize: '12px',
          color: esTropical ? '#ffffff' : cat.color,
          background: esTropical ? cat.colorDark : `${cat.color}25`,
          padding: '6px 14px',
          borderRadius: '12px',
          fontWeight: 500,
          whiteSpace: 'nowrap',
        }}>
          {count} módulos
        </span>
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
        gap: '12px',
      }}>
        {children}
      </div>
    </div>
  )
}

function Modulo({ emoji, label, sublabel, cat, tema, onClick, proximamente }) {
  const esTropical = tema === 'tropical'

  return (
    <button
      onClick={onClick}
      style={{
        background: proximamente
          ? (esTropical ? '#F1EFE8' : 'var(--color-bg-card)')
          : 'var(--color-modulo-bg)',
        border: proximamente
          ? (esTropical ? '1px solid rgba(186, 117, 23, 0.3)' : '0.5px solid var(--color-border-subtle)')
          : (esTropical ? `1px solid ${cat.color}30` : '0.5px solid var(--color-border-subtle)'),
        borderLeft: proximamente
          ? (esTropical ? '4px solid #BA7517' : '0.5px solid var(--color-border-subtle)')
          : (esTropical ? `4px solid ${cat.color}` : '0.5px solid var(--color-border-subtle)'),
        borderRadius: '12px',
        padding: '16px 18px',
        cursor: 'pointer', textAlign: 'left',
        display: 'flex', flexDirection: 'column', gap: '4px',
        fontFamily: 'inherit', position: 'relative',
        transition: 'all 0.15s ease',
        opacity: proximamente ? (esTropical ? 0.9 : 0.75) : 1,
        boxShadow: esTropical && !proximamente ? `0 2px 8px ${cat.color}10` : 'none',
      }}
      onMouseEnter={(e) => {
        if (esTropical && !proximamente) {
          e.currentTarget.style.background = cat.bgClaro
          e.currentTarget.style.transform = 'translateY(-1px)'
        } else if (!esTropical) {
          e.currentTarget.style.background = 'var(--color-bg-hover)'
          e.currentTarget.style.borderColor = `${cat.color}60`
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = proximamente
          ? (esTropical ? '#F1EFE8' : 'var(--color-bg-card)')
          : 'var(--color-modulo-bg)'
        e.currentTarget.style.transform = 'none'
      }}
    >
      {proximamente && (
        <span style={{
          position: 'absolute', top: '8px', right: '8px',
          fontSize: '9px', fontWeight: 600,
          background: esTropical ? '#BA7517' : 'rgba(250, 199, 117, 0.2)',
          color: esTropical ? '#ffffff' : '#FAC775',
          padding: '3px 7px', borderRadius: '7px',
          letterSpacing: '0.3px',
        }}>
          PRÓXIMO
        </span>
      )}
      <div style={{ fontSize: '22px', lineHeight: 1, marginBottom: '6px' }}>{emoji}</div>
      <div style={{
        fontSize: '14px',
        fontWeight: 500,
        color: proximamente
          ? (esTropical ? '#633806' : 'var(--color-text-primary)')
          : (esTropical ? cat.colorDarker : 'var(--color-text-primary)'),
        lineHeight: 1.3,
      }}>
        {label}
      </div>
      <div style={{
        fontSize: '11px',
        color: proximamente
          ? (esTropical ? '#854F0B' : 'var(--color-text-muted)')
          : (esTropical ? cat.colorDark : 'var(--color-text-muted)'),
        fontWeight: esTropical ? 500 : 400,
      }}>
        {sublabel}
      </div>
    </button>
  )
}

export default VistaAdministrador