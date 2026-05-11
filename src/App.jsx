import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import Paso1MiCocina from './components/wizard/Paso1MiCocina'
import Paso2Escuelas from './components/wizard/Paso2Escuelas'
import Paso3MenuInabie from './components/wizard/Paso3MenuInabie'
import Paso4Recetas from './components/wizard/Paso4Recetas'
import Paso5Personal from './components/wizard/Paso5Personal'
import Paso6Finanzas from './components/wizard/Paso6Finanzas'
import WizardCompletado from './components/wizard/WizardCompletado'
import SeleccionOperador from './components/auth/SeleccionOperador'
import LoginPin from './components/auth/LoginPin'
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

function App() {
  const [pasoActual, setPasoActual] = useState(1)
  const [empresaActual, setEmpresaActual] = useState(null)
  const [usuarioLogueado, setUsuarioLogueado] = useState(null)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)
  const [vistaActual, setVistaActual] = useState('seleccion')
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    verificarEstadoApp()
  }, [])

  async function verificarEstadoApp() {
    setCargando(true)
    
    const { data: empresas } = await supabase
      .from('empresas')
      .select('*')
      .limit(1)
    
    if (empresas && empresas.length > 0) {
      setEmpresaActual(empresas[0])
      
      const { data: usuarios } = await supabase
        .from('usuarios')
        .select('*')
        .eq('empresa_id', empresas[0].id)
        .limit(1)
      
      if (usuarios && usuarios.length > 0) {
        setPasoActual(7)
      }
    }
    
    setCargando(false)
  }

  function avanzarPaso() {
    setPasoActual(pasoActual + 1)
  }

  function retrocederPaso() {
    setPasoActual(pasoActual - 1)
  }

  function seleccionarUsuario(usuario) {
    setUsuarioSeleccionado(usuario)
    setVistaActual('login')
  }

  function loginExitoso(usuario) {
    setUsuarioLogueado(usuario)
    setVistaActual('dashboard')
  }

  function cerrarSesion() {
    setUsuarioLogueado(null)
    setUsuarioSeleccionado(null)
    setVistaActual('seleccion')
  }

  function volverASeleccion() {
    setUsuarioSeleccionado(null)
    setVistaActual('seleccion')
  }

  // === PERMISOS ===
  const puedeVerInteligencia = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria')

  const puedeDespachar = usuarioLogueado && 
    ['propietario', 'administrador', 'jefa_cocina', 'ayudante', 'despachador', 'secretaria'].includes(usuarioLogueado.rol)

  const puedeGestionarEmpleados = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador')

  const puedeGestionarProveedores = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria')

  // Admin/Propietario pueden "ver como secretaria"
  const esAdminViendoSecretaria = usuarioLogueado && 
    (usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'propietario') &&
    vistaActual === 'vista_secretaria_admin'

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
      return <WizardCompletado empresaActual={empresaActual} onIrAlDashboard={() => setVistaActual('seleccion')} />
    }
  }

  function renderVistaSegunRol() {
    if (usuarioLogueado.rol === 'secretaria') {
      return (
        <VistaSecretaria 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onCerrarSesion={cerrarSesion}
          onIrFactura={() => setVistaActual('factura')}
          onIrCalculadora={() => setVistaActual('calculadora')}
          onIrInteligencia={() => setVistaActual('inteligencia')}
          onIrDespacho={() => setVistaActual('despacho')}
          onIrProveedores={() => setVistaActual('proveedores')}
        />
      )
    }

    if (usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'contador') {
      return (
        <VistaAdministrador 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onCerrarSesion={cerrarSesion}
          onIrConfiguracion={() => setVistaActual('configuracion')}
          onIrFactura={() => setVistaActual('factura')}
          onIrCalculadora={() => setVistaActual('calculadora')}
          onIrInteligencia={
            usuarioLogueado.rol === 'administrador' 
              ? () => setVistaActual('inteligencia') 
              : null
          }
          onIrDespacho={
            usuarioLogueado.rol === 'administrador'
              ? () => setVistaActual('despacho')
              : null
          }
          onIrEmpleados={
            puedeGestionarEmpleados
              ? () => setVistaActual('empleados')
              : null
          }
          onIrProveedores={
            puedeGestionarProveedores
              ? () => setVistaActual('proveedores')
              : null
          }
          onVerComoSecretaria={
            usuarioLogueado.rol === 'administrador'
              ? () => setVistaActual('vista_secretaria_admin')
              : null
          }
        />
      )
    }
    
    return (
      <DashboardDelDia 
        usuario={usuarioLogueado}
        empresaId={empresaActual?.id}
        onCerrarSesion={cerrarSesion}
        onIrConfiguracion={() => setVistaActual('configuracion')}
        onIrCierre={() => setVistaActual('cierre')}
        onIrCalculadora={() => setVistaActual('calculadora')}
        onIrInteligencia={
          puedeVerInteligencia 
            ? () => setVistaActual('inteligencia') 
            : null
        }
        onIrDespacho={
          puedeDespachar
            ? () => setVistaActual('despacho')
            : null
        }
        onIrEmpleados={
          puedeGestionarEmpleados
            ? () => setVistaActual('empleados')
            : null
        }
        onVerComoSecretaria={
          usuarioLogueado.rol === 'propietario'
            ? () => setVistaActual('vista_secretaria_admin')
            : null
        }
      />
    )
  }

  if (cargando) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center">
        <p className="text-gray-500">Cargando...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-blue-50 flex items-center justify-center p-4">
      {pasoActual < 7 && renderPasoWizard()}
      {pasoActual === 7 && vistaActual === 'seleccion' && (
        <SeleccionOperador 
          empresaId={empresaActual?.id}
          onSeleccionar={seleccionarUsuario}
        />
      )}
      {pasoActual === 7 && vistaActual === 'login' && usuarioSeleccionado && (
        <LoginPin 
          usuario={usuarioSeleccionado}
          onLoginExitoso={loginExitoso}
          onCancelar={volverASeleccion}
        />
      )}
      {pasoActual === 7 && vistaActual === 'dashboard' && usuarioLogueado && renderVistaSegunRol()}
      
      {/* Admin/Propietario viendo "como secretaria" */}
      {pasoActual === 7 && vistaActual === 'vista_secretaria_admin' && usuarioLogueado && (
        <VistaSecretaria 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onCerrarSesion={cerrarSesion}
          onIrFactura={() => setVistaActual('factura')}
          onIrCalculadora={() => setVistaActual('calculadora')}
          onIrInteligencia={() => setVistaActual('inteligencia')}
          onIrDespacho={() => setVistaActual('despacho')}
          onIrProveedores={() => setVistaActual('proveedores')}
          onVolverAlPanel={() => setVistaActual('dashboard')}
          modoAdmin={true}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'despacho' && usuarioLogueado && (
        <VistaDespachador 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onCerrarSesion={cerrarSesion}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
      {pasoActual === 7 && vistaActual === 'configuracion' && usuarioLogueado && (
        <Configuracion 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
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
      {pasoActual === 7 && vistaActual === 'inteligencia' && usuarioLogueado && puedeVerInteligencia && (
        <InteligenciaOperativa 
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
      {pasoActual === 7 && vistaActual === 'proveedores' && usuarioLogueado && puedeGestionarProveedores && (
        <VistaProveedores 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onVolver={() => setVistaActual('dashboard')}
        />
      )}
    </div>
  )
}

export default App