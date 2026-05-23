import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
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

function App() {
  const [pasoActual, setPasoActual] = useState(1)
  const [empresaActual, setEmpresaActual] = useState(null)
  const [empresaLogueada, setEmpresaLogueada] = useState(null)
  const [usuarioLogueado, setUsuarioLogueado] = useState(null)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)
  const [vistaActual, setVistaActual] = useState('login_empresa')
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
        setVistaActual('login_empresa')
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
    setVistaActual('dashboard')
  }

  function cambiarDeUsuario() {
    setUsuarioLogueado(null)
    setUsuarioSeleccionado(null)
    setVistaActual('seleccion_operador')
  }

  function cerrarSesionTotal() {
    setUsuarioLogueado(null)
    setUsuarioSeleccionado(null)
    setEmpresaLogueada(null)
    setVistaActual('login_empresa')
  }

  function volverASeleccion() {
    setUsuarioSeleccionado(null)
    setVistaActual('seleccion_operador')
  }

  // === PERMISOS ===
  // 🔵 Inteligencia: NO el contador (es estrategia interna del negocio)
  const puedeVerInteligencia = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria')

  // 🔵 Despacho: NO el contador (es operativo)
  const puedeDespachar = usuarioLogueado && 
    ['propietario', 'administrador', 'jefa_cocina', 'ayudante', 'despachador', 'secretaria'].includes(usuarioLogueado.rol)

  // 🟢 Empleados: SÍ el contador (necesita ver totales de nómina para reportes)
  const puedeGestionarEmpleados = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'contador')

  // 🟢 Proveedores: SÍ el contador (necesita RNC para reporte 606 DGII)
  const puedeGestionarProveedores = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria' || usuarioLogueado.rol === 'contador')

  // 🟢 Compras: SÍ el contador (necesita facturas con NCF para reporte 606)
  const puedeGestionarCompras = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria' || usuarioLogueado.rol === 'contador')

  // 🔵 Ingredientes: NO el contador (es inventario operativo)
  const puedeGestionarIngredientes = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria' || usuarioLogueado.rol === 'jefa_cocina')

  // 🟢 Gastos: SÍ el contador (necesita gastos con RNC/NCF para reporte 606)
  const puedeGestionarGastos = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria' || usuarioLogueado.rol === 'contador')

  // 🔵 Contratos: NO el contador (es RRHH, no contabilidad)
  const puedeGestionarContratos = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador')

  // 🟢 Nómina: propietario, administrador, secretaria, contador
  const puedeGestionarNomina = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador' || usuarioLogueado.rol === 'secretaria' || usuarioLogueado.rol === 'contador')

  // 🔵 Configuración: NO el contador (solo el dueño/admin configura)
  const puedeConfigurar = usuarioLogueado && 
    (usuarioLogueado.rol === 'propietario' || usuarioLogueado.rol === 'administrador')

  // 🟢 Catálogo de Recetas: TODOS los usuarios activos (incluye contador)
  const puedeVerCatalogo = usuarioLogueado !== null

  // 🟢 Historial: TODOS los usuarios activos (incluye contador - útil para auditoría)
  const puedeVerHistorial = usuarioLogueado !== null

  // Mi Contrato: todos menos propietario
  const puedeVerMiContrato = usuarioLogueado && usuarioLogueado.rol !== 'propietario'

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
          onIrFactura={() => setVistaActual('factura')}
          onIrCalculadora={() => setVistaActual('calculadora')}
          onIrInteligencia={() => setVistaActual('inteligencia')}
          onIrDespacho={() => setVistaActual('despacho')}
          onIrProveedores={() => setVistaActual('proveedores')}
          onIrCompras={() => setVistaActual('compras')}
          onIrIngredientes={() => setVistaActual('ingredientes')}
          onIrGastos={() => setVistaActual('gastos')}
          onIrNomina={() => setVistaActual('nomina')}
          onIrCatalogo={() => setVistaActual('catalogo_recetas')}
          onIrHistorial={() => setVistaActual('historial')}
          onIrMiContrato={() => setVistaActual('mi_contrato')}
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
          onIrConfiguracion={
            puedeConfigurar
              ? () => setVistaActual('configuracion')
              : null
          }
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
          onIrContratos={
            puedeGestionarContratos
              ? () => setVistaActual('contratos')
              : null
          }
          onIrMiContrato={
            puedeVerMiContrato
              ? () => setVistaActual('mi_contrato')
              : null
          }
          onIrProveedores={
            puedeGestionarProveedores
              ? () => setVistaActual('proveedores')
              : null
          }
          onIrCompras={
            puedeGestionarCompras
              ? () => setVistaActual('compras')
              : null
          }
          onIrIngredientes={
            puedeGestionarIngredientes
              ? () => setVistaActual('ingredientes')
              : null
          }
          onIrGastos={
            puedeGestionarGastos
              ? () => setVistaActual('gastos')
              : null
          }
          onIrNomina={
            puedeGestionarNomina
              ? () => setVistaActual('nomina')
              : null
          }
          onVerComoSecretaria={
            usuarioLogueado.rol === 'administrador'
              ? () => setVistaActual('vista_secretaria_admin')
              : null
          }
          onIrCatalogo={
            puedeVerCatalogo
              ? () => setVistaActual('catalogo_recetas')
              : null
          }
          onIrHistorial={
            puedeVerHistorial
              ? () => setVistaActual('historial')
              : null
          }
        />
      )
    }
    
    return (
      <DashboardDelDia 
        usuario={usuarioLogueado}
        empresaId={empresaActual?.id}
        onCerrarSesion={cerrarSesionTotal}
        onCambiarUsuario={cambiarDeUsuario}
        onIrConfiguracion={
          puedeConfigurar
            ? () => setVistaActual('configuracion')
            : null
        }
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
        onIrContratos={
          puedeGestionarContratos
            ? () => setVistaActual('contratos')
            : null
        }
        onIrMiContrato={
          puedeVerMiContrato
            ? () => setVistaActual('mi_contrato')
            : null
        }
        onIrCompras={
          puedeGestionarCompras
            ? () => setVistaActual('compras')
            : null
        }
        onIrIngredientes={
          puedeGestionarIngredientes
            ? () => setVistaActual('ingredientes')
            : null
        }
        onIrGastos={
          puedeGestionarGastos
            ? () => setVistaActual('gastos')
            : null
        }
        onIrNomina={
          puedeGestionarNomina
            ? () => setVistaActual('nomina')
            : null
        }
        onVerComoSecretaria={
          usuarioLogueado.rol === 'propietario'
            ? () => setVistaActual('vista_secretaria_admin')
            : null
        }
        onIrCatalogo={
          puedeVerCatalogo
            ? () => setVistaActual('catalogo_recetas')
            : null
        }
        onIrHistorial={
          puedeVerHistorial
            ? () => setVistaActual('historial')
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
      
      {pasoActual === 7 && vistaActual === 'login_empresa' && (
        <LoginEmpresa onLoginExitoso={loginEmpresaExitoso} />
      )}
      
      {pasoActual === 7 && vistaActual === 'seleccion_operador' && empresaLogueada && (
        <SeleccionOperador 
          empresaId={empresaLogueada.id}
          onSeleccionar={seleccionarUsuario}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'login_pin' && usuarioSeleccionado && (
        <LoginPin 
          usuario={usuarioSeleccionado}
          onLoginExitoso={loginExitoso}
          onCancelar={volverASeleccion}
        />
      )}
      
      {pasoActual === 7 && vistaActual === 'dashboard' && usuarioLogueado && renderVistaSegunRol()}
      
      {pasoActual === 7 && vistaActual === 'vista_secretaria_admin' && usuarioLogueado && (
        <VistaSecretaria 
          usuario={usuarioLogueado}
          empresaId={empresaActual?.id}
          onCerrarSesion={cerrarSesionTotal}
          onCambiarUsuario={cambiarDeUsuario}
          onIrFactura={() => setVistaActual('factura')}
          onIrCalculadora={() => setVistaActual('calculadora')}
          onIrInteligencia={() => setVistaActual('inteligencia')}
          onIrDespacho={() => setVistaActual('despacho')}
          onIrProveedores={() => setVistaActual('proveedores')}
          onIrCompras={() => setVistaActual('compras')}
          onIrIngredientes={() => setVistaActual('ingredientes')}
          onIrGastos={() => setVistaActual('gastos')}
          onIrNomina={() => setVistaActual('nomina')}
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
      {pasoActual === 7 && vistaActual === 'configuracion' && usuarioLogueado && puedeConfigurar && (
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
      {pasoActual === 7 && vistaActual === 'proveedores' && usuarioLogueado && puedeGestionarProveedores && (
        <VistaProveedores 
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
      {pasoActual === 7 && vistaActual === 'gastos' && usuarioLogueado && puedeGestionarGastos && (
        <VistaGastos 
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
    </div>
  )
}

export default App