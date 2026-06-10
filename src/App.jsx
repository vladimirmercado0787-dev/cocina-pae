import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import IntroAndamio from './components/intro/IntroAndamio'
import IntroCocinaPAE from './components/intro/IntroCocinaPAE'
import Paso1MiCocina from './components/wizard/Paso1MiCocina'
import Paso2Escuelas from './components/wizard/Paso2Escuelas'
import Paso3MenuInabie from './components/wizard/Paso3MenuInabie'
import Paso4Recetas from './components/wizard/Paso4Recetas'
import Paso5Personal from './components/wizard/Paso5Personal'
import Paso6Finanzas from './components/wizard/Paso6Finanzas'
import WizardCompletado from './components/wizard/WizardCompletado'
import LoginEmpresa from './components/auth/LoginEmpresa'
import SeleccionOperador from './components/auth/SeleccionOperador'
import LoginPin from './components/auth/LoginPin'
import ResetPasswordPage from './components/auth/ResetPasswordPage'
import DashboardDelDia from './components/dashboard/DashboardDelDia'
import VistaDespachador from './components/despachador/VistaDespachador'
import VistaAdministrador from './components/admin/VistaAdministrador'
import VistaSecretaria from './components/secretaria/VistaSecretaria'
import Configuracion from './components/configuracion/Configuracion'
import CierreDelDia from './components/cierre/CierreDelDia'
import FacturaInabie from './components/factura/FacturaInabie'
import CalculadoraProduccion from './components/produccion/CalculadoraProduccion'
import InteligenciaOperativa from './components/inteligencia/InteligenciaOperativa'
import VistaEmpleados from './components/empleados/VistaEmpleados'
import VistaProveedores from './components/proveedores/VistaProveedores'
import VistaCompras from './components/compras/VistaCompras'
import VistaIngredientes from './components/ingredientes/VistaIngredientes'
import VistaGastos from './components/gastos/VistaGastos'
import VistaCatalogoRecetas from './components/catalogo/VistaCatalogoRecetas'
import VistaHistorial from './components/historial/VistaHistorial'
import VistaContratos from './components/contratos/VistaContratos'
import VistaMiContrato from './components/contratos/VistaMiContrato'
import VistaNomina from './components/nomina/VistaNomina'
import MisRecibos from './components/nomina/MisRecibos'
import ReportesDGII from './components/dgii/ReportesDGII'
import VistaAsistencia from './components/asistencia/VistaAsistencia'
import VistaEstadisticas from './components/estadisticas/VistaEstadisticas'

function App() {
  const [mostrarIntro, setMostrarIntro] = useState(true)
  const [mostrarIntroCocina, setMostrarIntroCocina] = useState(false)

  const [pasoActual, setPasoActual] = useState(7)
  const [empresaActual, setEmpresaActual] = useState(null)
  const [empresaLogueada, setEmpresaLogueada] = useState(null)
  const [usuarioLogueado, setUsuarioLogueado] = useState(null)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)
  const [vistaActual, setVistaActual] = useState('login_empresa')
  const [tabFacturaInicial, setTabFacturaInicial] = useState('factura')
  const [cargando, setCargando] = useState(true)

  // 🎯 DETECTAR si el usuario viene del email de recuperación de contraseña
  // Supabase envía un link con #access_token=... en el hash de la URL.
  // Si lo detectamos, forzamos la vista de reset_password.
  useEffect(() => {
    const hash = window.location.hash
    const pathname = window.location.pathname

    // Caso 1: URL es /reset-password (ruta directa)
    if (pathname === '/reset-password') {
      setVistaActual('reset_password')
      setMostrarIntro(false)  // saltarse el intro de Andamio
      setCargando(false)
      return
    }

    // Caso 2: hash trae access_token y type=recovery (vino del email de Supabase)
    if (hash && hash.includes('type=recovery')) {
      setVistaActual('reset_password')
      setMostrarIntro(false)
      setCargando(false)
      return
    }

    // Caso normal: verificar sesión existente
    verificarSesionExistente()
  }, [])

  async function verificarSesionExistente() {
    setCargando(true)

    const { data: { session } } = await supabase.auth.getSession()

    if (session?.user) {
      const { data: empresa, error } = await supabase
        .from('empresas')
        .select('*')
        .eq('auth_user_id', session.user.id)
        .single()

      if (empresa && !error) {
        setEmpresaLogueada(empresa)
        setEmpresaActual(empresa)
        setVistaActual('seleccion_operador')
      } else {
        console.warn('Sesión activa pero empresa no encontrada. Cerrando sesión.')
        await supabase.auth.signOut()
        setVistaActual('login_empresa')
      }
    } else {
      setVistaActual('login_empresa')
    }

    setCargando(false)
  }

  function terminarIntro() {
    const hoy = new Date().toISOString().split('T')[0]
    localStorage.setItem('andamio_intro_fecha', hoy)
    setMostrarIntro(false)
  }

  function avanzarPaso() { setPasoActual(pasoActual + 1) }
  function retrocederPaso() { setPasoActual(pasoActual - 1) }

  function loginEmpresaExitoso(empresa) {
    setEmpresaLogueada(empresa)
    setEmpresaActual(empresa)
    setVistaActual('seleccion_operador')
  }

  function seleccionarUsuario(usuario) {
    setUsuarioSeleccionado(usuario)
    setVistaActual('login_pin')
  }

  function loginExitoso(usuario) {
    setUsuarioLogueado(usuario)
    setMostrarIntroCocina(true)
  }

  function terminarIntroCocina() {
    setMostrarIntroCocina(false)
    setVistaActual('dashboard')
  }

  function cambiarDeUsuario() {
    setUsuarioLogueado(null)
    setUsuarioSeleccionado(null)
    setVistaActual('seleccion_operador')
  }

  async function cerrarSesionTotal() {
    await supabase.auth.signOut()
    setUsuarioLogueado(null)
    setUsuarioSeleccionado(null)
    setEmpresaLogueada(null)
    setEmpresaActual(null)
    setVistaActual('login_empresa')
  }

  // 🎯 Al terminar reset de contraseña, llevar al login limpio
  function resetCompletado() {
    setVistaActual('login_empresa')
    window.history.replaceState({}, document.title, '/')
  }

  function volverASeleccion() {
    setUsuarioSeleccionado(null)
    setVistaActual('seleccion_operador')
  }

  function irAFactura() {
    setTabFacturaInicial('factura')
    setVistaActual('factura')
  }

  function irAConduces() {
    setTabFacturaInicial('conduces')
    setVistaActual('factura')
  }

  // === PERMISOS ===
  const puedeVerInteligencia = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria')

  const puedeDespachar = usuarioLogueado && 
    ['propietario', 'administrador', 'jefa_cocina', 'ayudante', 'despachador', 'secretaria'].includes(usuarioLogueado.rol)

  const puedeGestionarEmpleados = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'contador')

  const puedeGestionarProveedores = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria' || usuarioLogueado.rol === 'contador')

  const puedeGestionarCompras = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria' || usuarioLogueado.rol === 'contador')

  const puedeGestionarIngredientes = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria' || usuarioLogueado.rol === 'jefa_cocina')

  const puedeGestionarGastos = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria' || usuarioLogueado.rol === 'contador')

  const puedeGestionarContratos = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador')

  const puedeGestionarNomina = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria' || usuarioLogueado.rol === 'contador')

  const puedeConfigurar = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador')

  const puedeVerDGII = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'contador' || usuarioLogueado.rol === 'secretaria')

  const puedeVerAsistencia = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador')

  const puedeVerEstadisticas = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador')

  const puedeVerCatalogo = usuarioLogueado !== null
  const puedeVerHistorial = usuarioLogueado !== null
  const puedeVerMiContrato = usuarioLogueado && usuarioLogueado.rol !== 'propietario'
  const puedeVerMisRecibos = usuarioLogueado && usuarioLogueado.rol !== 'propietario'

  function renderPasoWizard() {
    if (pasoActual === 1) {
      return <Paso1MiCocina onAvanzar={avanzarPaso} empresaActual={empresaActual} setEmpresaActual={setEmpresaActual} />
    }
    if (pasoActual === 2) {
      return <Paso2Escuelas onAvanzar={avanzarPaso} onRetroceder={retrocederPaso} empresaActual={empresaActual} />
    }
    if (pasoActual === 3) {
      return <Paso3MenuInabie onAvanzar={avanzarPaso} onRetroceder={retrocederPaso} empresaActual={empresaActual} />
    }
    if (pasoActual === 4) {
      return <Paso4Recetas onAvanzar={avanzarPaso} onRetroceder={retrocederPaso} empresaActual={empresaActual} />
    }
    if (pasoActual === 5) {
      return <Paso5Personal onAvanzar={avanzarPaso} onRetroceder={retrocederPaso} empresaActual={empresaActual} />
    }
    if (pasoActual === 6) {
      return <Paso6Finanzas onAvanzar={avanzarPaso} onRetroceder={retrocederPaso} empresaActual={empresaActual} />
    }
    if (pasoActual === 7) {
      return <WizardCompletado empresaActual={empresaActual} onIrAlDashboard={() => setVistaActual('login_empresa')} />
    }
  }

  function renderVistaSegunRol() {
    if (usuarioLogueado.rol === 'secretaria') {
      return (
        <VistaSecretaria 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onCerrarSesion={cerrarSesionTotal}
          onCambiarUsuario={cambiarDeUsuario}
          onIrFactura={irAFactura}
          onIrConduces={irAConduces}
          onIrCalculadora={() => setVistaActual('calculadora')}
          onIrInteligencia={() => setVistaActual('inteligencia')}
          onIrDespacho={() => setVistaActual('despacho')}
          onIrProveedores={() => setVistaActual('proveedores')}
          onIrCompras={() => setVistaActual('compras')}
          onIrIngredientes={() => setVistaActual('ingredientes')}
          onIrGastos={() => setVistaActual('gastos')}
          onIrNomina={() => setVistaActual('nomina')}
          onIrDGII={puedeVerDGII ? () => setVistaActual('dgii') : null}
          onIrCatalogo={() => setVistaActual('catalogo_recetas')}
          onIrHistorial={() => setVistaActual('historial')}
          onIrMiContrato={() => setVistaActual('mi_contrato')}
          onIrMisRecibos={puedeVerMisRecibos ? () => setVistaActual('mis_recibos') : null}
        />
      )
    }

    if (usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'contador') {
      return (
        <VistaAdministrador 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onCerrarSesion={cerrarSesionTotal}
          onCambiarUsuario={cambiarDeUsuario}
          onIrConfiguracion={puedeConfigurar ? () => setVistaActual('configuracion') : null}
          onIrFactura={irAFactura}
          onIrConduces={irAConduces}
          onIrCalculadora={() => setVistaActual('calculadora')}
          onIrInteligencia={usuarioLogueado.rol === 'administrador' ? () => setVistaActual('inteligencia') : null}
          onIrDespacho={usuarioLogueado.rol === 'administrador' ? () => setVistaActual('despacho') : null}
          onIrEmpleados={puedeGestionarEmpleados ? () => setVistaActual('empleados') : null}
          onIrContratos={puedeGestionarContratos ? () => setVistaActual('contratos') : null}
          onIrMiContrato={puedeVerMiContrato ? () => setVistaActual('mi_contrato') : null}
          onIrMisRecibos={puedeVerMisRecibos ? () => setVistaActual('mis_recibos') : null}
          onIrProveedores={puedeGestionarProveedores ? () => setVistaActual('proveedores') : null}
          onIrCompras={puedeGestionarCompras ? () => setVistaActual('compras') : null}
          onIrIngredientes={puedeGestionarIngredientes ? () => setVistaActual('ingredientes') : null}
          onIrGastos={puedeGestionarGastos ? () => setVistaActual('gastos') : null}
          onIrNomina={puedeGestionarNomina ? () => setVistaActual('nomina') : null}
          onIrDGII={puedeVerDGII ? () => setVistaActual('dgii') : null}
          onIrAsistencia={puedeVerAsistencia ? () => setVistaActual('asistencia') : null}
          onIrEstadisticas={puedeVerEstadisticas ? () => setVistaActual('estadisticas') : null}
          onVerComoSecretaria={usuarioLogueado.rol === 'administrador' ? () => setVistaActual('vista_secretaria_admin') : null}
          onIrCatalogo={puedeVerCatalogo ? () => setVistaActual('catalogo_recetas') : null}
          onIrHistorial={puedeVerHistorial ? () => setVistaActual('historial') : null}
        />
      )
    }
    
    return (
      <DashboardDelDia 
        usuario={usuarioLogueado}
        empresaId={empresaActual?.id}
        onCerrarSesion={cerrarSesionTotal}
        onCambiarUsuario={cambiarDeUsuario}
        onIrConfiguracion={puedeConfigurar ? () => setVistaActual('configuracion') : null}
        onIrCierre={() => setVistaActual('cierre')}
        onIrFactura={irAFactura}
        onIrConduces={irAConduces}
        onIrCalculadora={() => setVistaActual('calculadora')}
        onIrInteligencia={puedeVerInteligencia ? () => setVistaActual('inteligencia') : null}
        onIrDespacho={puedeDespachar ? () => setVistaActual('despacho') : null}
        onIrEmpleados={puedeGestionarEmpleados ? () => setVistaActual('empleados') : null}
        onIrContratos={puedeGestionarContratos ? () => setVistaActual('contratos') : null}
        onIrMiContrato={puedeVerMiContrato ? () => setVistaActual('mi_contrato') : null}
        onIrMisRecibos={puedeVerMisRecibos ? () => setVistaActual('mis_recibos') : null}
        onIrProveedores={puedeGestionarProveedores ? () => setVistaActual('proveedores') : null}
        onIrCompras={puedeGestionarCompras ? () => setVistaActual('compras') : null}
        onIrIngredientes={puedeGestionarIngredientes ? () => setVistaActual('ingredientes') : null}
        onIrGastos={puedeGestionarGastos ? () => setVistaActual('gastos') : null}
        onIrNomina={puedeGestionarNomina ? () => setVistaActual('nomina') : null}
        onIrDGII={puedeVerDGII ? () => setVistaActual('dgii') : null}
        onIrAsistencia={puedeVerAsistencia ? () => setVistaActual('asistencia') : null}
        onIrEstadisticas={puedeVerEstadisticas ? () => setVistaActual('estadisticas') : null}
        onVerComoSecretaria={usuarioLogueado.rol === 'propietario' ? () => setVistaActual('vista_secretaria_admin') : null}
        onIrCatalogo={puedeVerCatalogo ? () => setVistaActual('catalogo_recetas') : null}
        onIrHistorial={puedeVerHistorial ? () => setVistaActual('historial') : null}
      />
    )
  }

  // ═══════════════════════════════════════════════════
  // 🎯 RESET PASSWORD - antes de cualquier intro
  // ═══════════════════════════════════════════════════
  if (vistaActual === 'reset_password') {
    return <ResetPasswordPage onTerminado={resetCompletado} />
  }

  // ═══════════════════════════════════════════════════
  // INTRO ANDAMIO
  // ═══════════════════════════════════════════════════
  if (mostrarIntro) {
    return <IntroAndamio onTerminada={terminarIntro} />
  }

  // ═══════════════════════════════════════════════════
  // INTRO COCINA PAE
  // ═══════════════════════════════════════════════════
  if (mostrarIntroCocina && usuarioLogueado) {
    return <IntroCocinaPAE onTerminada={terminarIntroCocina} />
  }

  if (cargando) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'var(--color-bg-primary, #0a1410)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}>
        <p style={{ color: 'var(--color-text-muted, rgba(255,255,255,0.5))' }}>Cargando...</p>
      </div>
    )
  }

  return (
    <>
      {pasoActual < 7 && (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center p-4">
          {renderPasoWizard()}
        </div>
      )}
      
      {pasoActual === 7 && vistaActual === 'login_empresa' && (
        <LoginEmpresa onLoginExitoso={loginEmpresaExitoso} />
      )}
      
      {pasoActual === 7 && vistaActual === 'seleccion_operador' && empresaLogueada && (
        <SeleccionOperador 
          empresaId={empresaLogueada.id}
          onSeleccionar={seleccionarUsuario}
          onCerrarSesion={cerrarSesionTotal}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'login_pin' && usuarioSeleccionado && (
        <LoginPin 
          usuario={usuarioSeleccionado}
          onLoginExitoso={loginExitoso}
          onCancelar={volverASeleccion}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'dashboard' && usuarioLogueado && (
        renderVistaSegunRol()
      )}
      
      {pasoActual === 7 && vistaActual === 'vista_secretaria_admin' && usuarioLogueado && (
        <VistaSecretaria 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onCerrarSesion={cerrarSesionTotal}
          onCambiarUsuario={cambiarDeUsuario}
          onIrFactura={irAFactura}
          onIrConduces={irAConduces}
          onIrCalculadora={() => setVistaActual('calculadora')}
          onIrInteligencia={() => setVistaActual('inteligencia')}
          onIrDespacho={() => setVistaActual('despacho')}
          onIrProveedores={() => setVistaActual('proveedores')}
          onIrCompras={() => setVistaActual('compras')}
          onIrIngredientes={() => setVistaActual('ingredientes')}
          onIrGastos={() => setVistaActual('gastos')}
          onIrNomina={() => setVistaActual('nomina')}
          onIrDGII={() => setVistaActual('dgii')}
          onIrCatalogo={() => setVistaActual('catalogo_recetas')}
          onIrHistorial={() => setVistaActual('historial')}
          onVolverAlPanel={() => setVistaActual('dashboard')}
          modoAdmin={true}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'despacho' && usuarioLogueado && puedeDespachar && (
        <VistaDespachador 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onCerrarSesion={cerrarSesionTotal}
          onCambiarUsuario={cambiarDeUsuario}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'cierre' && usuarioLogueado && (
        <CierreDelDia 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'factura' && usuarioLogueado && (
        <FacturaInabie 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          tabInicial={tabFacturaInicial}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'calculadora' && usuarioLogueado && (
        <CalculadoraProduccion 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'compras' && usuarioLogueado && puedeGestionarCompras && (
        <VistaCompras 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'ingredientes' && usuarioLogueado && puedeGestionarIngredientes && (
        <VistaIngredientes 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'proveedores' && usuarioLogueado && puedeGestionarProveedores && (
        <VistaProveedores 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'gastos' && usuarioLogueado && puedeGestionarGastos && (
        <VistaGastos 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'empleados' && usuarioLogueado && puedeGestionarEmpleados && (
        <VistaEmpleados 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'nomina' && usuarioLogueado && puedeGestionarNomina && (
        <VistaNomina 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'configuracion' && usuarioLogueado && puedeConfigurar && (
        <Configuracion 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'inteligencia' && usuarioLogueado && puedeVerInteligencia && (
        <InteligenciaOperativa 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'catalogo_recetas' && usuarioLogueado && puedeVerCatalogo && (
        <VistaCatalogoRecetas 
          empresa_id={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'historial' && usuarioLogueado && puedeVerHistorial && (
        <VistaHistorial 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'contratos' && usuarioLogueado && puedeGestionarContratos && (
        <VistaContratos 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'mi_contrato' && usuarioLogueado && puedeVerMiContrato && (
        <VistaMiContrato 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'mis_recibos' && usuarioLogueado && puedeVerMisRecibos && (
        <MisRecibos 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'dgii' && usuarioLogueado && puedeVerDGII && (
        <ReportesDGII 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'asistencia' && usuarioLogueado && puedeVerAsistencia && (
        <VistaAsistencia 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'estadisticas' && usuarioLogueado && puedeVerEstadisticas && (
        <VistaEstadisticas 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
    </>
  )
}

export default App