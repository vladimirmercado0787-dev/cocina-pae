import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalNuevoContrato from './ModalNuevoContrato'
import ModalFirmaPresencial from './ModalFirmaPresencial'
import VistaDetalleContrato from './VistaDetalleContrato'

function VistaContratos({ usuario, empresaId, onVolver }) {
  const [empresa, setEmpresa] = useState(null)
  const [contratos, setContratos] = useState([])
  const [empleadosPendientes, setEmpleadosPendientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [filtroEstado, setFiltroEstado] = useState('todos')
  const [busqueda, setBusqueda] = useState('')
  
  // Modales
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false)
  const [empleadoPreseleccionado, setEmpleadoPreseleccionado] = useState(null)
  const [contratoParaFirmar, setContratoParaFirmar] = useState(null)
  const [contratoParaVer, setContratoParaVer] = useState(null)

  useEffect(() => {
    if (empresaId) cargarDatos()
  }, [empresaId])

  async function cargarDatos() {
    setCargando(true)

    const { data: empresaData } = await supabase
      .from('empresas')
      .select('*')
      .eq('id', empresaId)
      .single()
    setEmpresa(empresaData)

    const { data: contratosData, error: errorContratos } = await supabase
      .from('contratos_empleados')
      .select(`
        *,
        usuario:usuarios(id, nombre, rol, sexo, foto_url, cedula)
      `)
      .eq('empresa_id', empresaId)
      .order('created_at', { ascending: false })

    if (errorContratos) {
      console.error('Error cargando contratos:', errorContratos)
    } else {
      setContratos(contratosData || [])
    }

    const { data: empleadosDigital } = await supabase
      .from('usuarios')
      .select('id, nombre, rol, sexo, foto_url, sueldo, frecuencia_pago, fecha_contratacion, cedula')
      .eq('empresa_id', empresaId)
      .eq('activo', true)
      .eq('gestion_contrato', 'contrato_digital')
      .neq('rol', 'propietario')

    if (empleadosDigital && empleadosDigital.length > 0) {
      const idsConContrato = (contratosData || []).map(c => c.usuario_id)
      const pendientes = empleadosDigital.filter(e => !idsConContrato.includes(e.id))
      setEmpleadosPendientes(pendientes)
    } else {
      setEmpleadosPendientes([])
    }

    setCargando(false)
  }

  const puedeGestionar = usuario && 
    (usuario.rol === 'propietario' || usuario.rol === 'administrador')

  if (!puedeGestionar) {
    return (
      <div className="w-full max-w-5xl">
        <div className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center">
          <p className="text-4xl mb-3">🚫</p>
          <h2 className="text-2xl font-bold text-red-900 mb-2">Acceso restringido</h2>
          <p className="text-red-700 mb-4">
            Solo el propietario y administrador pueden ver el listado completo de contratos.
          </p>
          <button
            onClick={onVolver}
            className="bg-red-600 hover:bg-red-700 text-white font-semibold px-6 py-2 rounded-lg"
          >
            ← Volver
          </button>
        </div>
      </div>
    )
  }

  // Si está viendo un contrato específico, mostrar la vista detalle
  if (contratoParaVer) {
    return (
      <VistaDetalleContrato 
        contratoId={contratoParaVer}
        onVolver={() => {
          setContratoParaVer(null)
          cargarDatos()
        }}
      />
    )
  }

  function abrirModalConEmpleado(empleado) {
    setEmpleadoPreseleccionado(empleado)
    setModalNuevoAbierto(true)
  }

  function abrirModalNuevo() {
    setEmpleadoPreseleccionado(null)
    setModalNuevoAbierto(true)
  }

  function cerrarModalNuevo() {
    setModalNuevoAbierto(false)
    setEmpleadoPreseleccionado(null)
  }

  function contratoCreado(nuevoContrato) {
    setModalNuevoAbierto(false)
    setEmpleadoPreseleccionado(null)
    cargarDatos()
    
    if (confirm('✅ Contrato creado como borrador.\n\n¿Deseas firmarlo ahora?')) {
      // Recargar y abrir modal de firma
      setTimeout(async () => {
        const { data } = await supabase
          .from('contratos_empleados')
          .select(`*, usuario:usuarios(id, nombre, rol, sexo, foto_url, cedula)`)
          .eq('id', nuevoContrato.id)
          .single()
        if (data) {
          setContratoParaFirmar(data)
        }
      }, 300)
    }
  }

  function abrirFirma(contrato) {
    setContratoParaFirmar(contrato)
  }

  function cerrarFirma() {
    setContratoParaFirmar(null)
  }

  function firmasCompletas() {
    setContratoParaFirmar(null)
    cargarDatos()
    alert('✅ Contrato activado exitosamente.\n\nYa puedes imprimirlo para archivo físico.')
  }

  function obtenerColorEstado(estado) {
    switch (estado) {
      case 'borrador': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'pendiente_firma': return 'bg-orange-100 text-orange-800 border-orange-300'
      case 'activo': return 'bg-green-100 text-green-800 border-green-300'
      case 'terminado': return 'bg-gray-200 text-gray-700 border-gray-300'
      case 'renovado': return 'bg-blue-100 text-blue-800 border-blue-300'
      default: return 'bg-gray-100 text-gray-700 border-gray-300'
    }
  }

  function obtenerEmojiEstado(estado) {
    switch (estado) {
      case 'borrador': return '🟡'
      case 'pendiente_firma': return '🟠'
      case 'activo': return '🟢'
      case 'terminado': return '⚪'
      case 'renovado': return '🔵'
      default: return '⚫'
    }
  }

  function obtenerLabelTipoContrato(tipo) {
    switch (tipo) {
      case 'obra_servicio': return '📑 Obra/Servicio PAE'
      case 'estacional': return '🌾 Estacional'
      case 'indefinido': return '♾️ Indefinido'
      default: return tipo
    }
  }

  function obtenerLabelFrecuencia(freq) {
    switch (freq) {
      case 'semanal': return 'semanal'
      case 'quincenal': return 'quincenal'
      case 'mensual': return 'mensual'
      default: return freq
    }
  }

  function obtenerAvatar(empleado) {
    if (!empleado) return '👤'
    if (empleado.foto_url) return null
    if (empleado.sexo === 'hombre') return '👨'
    if (empleado.sexo === 'mujer') return '👩'
    return empleado.nombre?.charAt(0)?.toUpperCase() || '?'
  }

  function formatearFecha(fechaStr) {
    if (!fechaStr) return '—'
    const fecha = new Date(fechaStr)
    return fecha.toLocaleDateString('es-DO', { 
      day: 'numeric', 
      month: 'short', 
      year: 'numeric' 
    })
  }

  const contratosFiltrados = contratos.filter(c => {
    if (filtroEstado !== 'todos' && c.estado !== filtroEstado) return false
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase()
      const nombre = c.usuario?.nombre?.toLowerCase() || ''
      const puesto = c.puesto?.toLowerCase() || ''
      if (!nombre.includes(termino) && !puesto.includes(termino)) return false
    }
    return true
  })

  const totalContratos = contratos.length
  const totalActivos = contratos.filter(c => c.estado === 'activo').length
  const totalBorradores = contratos.filter(c => c.estado === 'borrador' || c.estado === 'pendiente_firma').length
  const totalTerminados = contratos.filter(c => c.estado === 'terminado').length

  if (cargando) {
    return (
      <div className="w-full max-w-5xl">
        <div className="text-center py-12 text-gray-500">
          ⏳ Cargando contratos...
        </div>
      </div>
    )
  }

  const fechaHoyTexto = new Date().toLocaleDateString('es-DO', { 
    day: 'numeric', 
    month: 'long', 
    year: 'numeric' 
  })

  return (
    <div className="w-full max-w-5xl">
      
      {/* MODAL WIZARD NUEVO */}
      {modalNuevoAbierto && (
        <ModalNuevoContrato
          empresaId={empresaId}
          usuarioActual={usuario}
          empleadoPreseleccionado={empleadoPreseleccionado}
          empresa={empresa}
          onCerrar={cerrarModalNuevo}
          onContratoCreado={contratoCreado}
        />
      )}

      {/* MODAL FIRMA PRESENCIAL */}
      {contratoParaFirmar && (
        <ModalFirmaPresencial
          contrato={contratoParaFirmar}
          empresa={empresa}
          usuarioActual={usuario}
          onCerrar={cerrarFirma}
          onFirmasCompletas={firmasCompletas}
        />
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="text-purple-100 text-xs font-semibold tracking-wider">
              CONTRATOS LABORALES
            </p>
            <h2 className="text-3xl font-bold mt-1">
              📄 Gestión de Contratos
            </h2>
            <p className="text-purple-200 mt-1">
              {empresa?.nombre} · {fechaHoyTexto}
            </p>
          </div>
          <button
            onClick={onVolver}
            className="bg-purple-800 hover:bg-purple-900 text-white text-sm px-4 py-2 rounded-lg"
          >
            ← Volver al panel
          </button>
        </div>
      </div>

      {/* ALERTA PENDIENTES */}
      {empleadosPendientes.length > 0 && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-2xl p-5 mb-6">
          <div className="flex items-start gap-3 mb-3">
            <span className="text-3xl">⚠️</span>
            <div className="flex-1">
              <h3 className="font-bold text-yellow-900 text-lg">
                {empleadosPendientes.length} empleado{empleadosPendientes.length > 1 ? 's' : ''} pendiente{empleadosPendientes.length > 1 ? 's' : ''} de contrato
              </h3>
              <p className="text-yellow-800 text-sm mt-1">
                Est{empleadosPendientes.length > 1 ? 'án' : 'á'} marcado{empleadosPendientes.length > 1 ? 's' : ''} como "Generar contrato digital" pero aún NO tiene{empleadosPendientes.length > 1 ? 'n' : ''} contrato creado:
              </p>
            </div>
          </div>
          
          <div className="space-y-2 ml-12">
            {empleadosPendientes.map(emp => (
              <div 
                key={emp.id} 
                className="bg-white border border-yellow-200 rounded-lg p-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 flex items-center justify-center text-lg">
                    {emp.foto_url ? (
                      <img src={emp.foto_url} alt="" className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                      obtenerAvatar(emp)
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900">{emp.nombre}</p>
                    <p className="text-xs text-gray-600">
                      {emp.rol}
                      {emp.sueldo && ` · RD$ ${Number(emp.sueldo).toLocaleString('es-DO')} ${obtenerLabelFrecuencia(emp.frecuencia_pago)}`}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => abrirModalConEmpleado(emp)}
                  className="bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-bold px-4 py-2 rounded-lg"
                >
                  ➕ Crear contrato
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RESUMEN */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">📊 RESUMEN</p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={() => setFiltroEstado('todos')}
            className={`border rounded-xl p-4 text-center transition-colors ${
              filtroEstado === 'todos' 
                ? 'bg-purple-50 border-purple-400 ring-2 ring-purple-200' 
                : 'bg-gray-50 border-gray-200 hover:border-gray-400'
            }`}
          >
            <p className="text-3xl font-bold text-gray-900">{totalContratos}</p>
            <p className="text-xs text-gray-600 mt-1 font-semibold">Total</p>
          </button>

          <button
            onClick={() => setFiltroEstado('activo')}
            className={`border rounded-xl p-4 text-center transition-colors ${
              filtroEstado === 'activo' 
                ? 'bg-green-50 border-green-400 ring-2 ring-green-200' 
                : 'bg-gray-50 border-gray-200 hover:border-gray-400'
            }`}
          >
            <p className="text-3xl font-bold text-green-700">{totalActivos}</p>
            <p className="text-xs text-gray-600 mt-1 font-semibold">🟢 Activos</p>
          </button>

          <button
            onClick={() => setFiltroEstado('borrador')}
            className={`border rounded-xl p-4 text-center transition-colors ${
              filtroEstado === 'borrador' 
                ? 'bg-yellow-50 border-yellow-400 ring-2 ring-yellow-200' 
                : 'bg-gray-50 border-gray-200 hover:border-gray-400'
            }`}
          >
            <p className="text-3xl font-bold text-yellow-700">{totalBorradores}</p>
            <p className="text-xs text-gray-600 mt-1 font-semibold">🟡 Borradores</p>
          </button>

          <button
            onClick={() => setFiltroEstado('terminado')}
            className={`border rounded-xl p-4 text-center transition-colors ${
              filtroEstado === 'terminado' 
                ? 'bg-gray-100 border-gray-400 ring-2 ring-gray-200' 
                : 'bg-gray-50 border-gray-200 hover:border-gray-400'
            }`}
          >
            <p className="text-3xl font-bold text-gray-700">{totalTerminados}</p>
            <p className="text-xs text-gray-600 mt-1 font-semibold">⚪ Terminados</p>
          </button>
        </div>
      </div>

      {/* BARRA ACCIONES */}
      <div className="bg-white rounded-2xl shadow-xl p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="🔍 Buscar empleado o puesto..."
            className="flex-1 min-w-[200px] px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          
          <button
            onClick={abrirModalNuevo}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold px-5 py-2 rounded-lg flex items-center gap-2 whitespace-nowrap"
          >
            ➕ Nuevo Contrato
          </button>
        </div>

        {filtroEstado !== 'todos' && (
          <div className="mt-3 text-sm text-gray-600 flex items-center gap-2">
            <span>Filtro activo:</span>
            <span className={`px-2 py-1 rounded-full text-xs font-bold border ${obtenerColorEstado(filtroEstado)}`}>
              {obtenerEmojiEstado(filtroEstado)} {filtroEstado}
            </span>
            <button
              onClick={() => setFiltroEstado('todos')}
              className="text-purple-600 hover:text-purple-800 text-xs font-bold"
            >
              ✕ Limpiar filtro
            </button>
          </div>
        )}
      </div>

      {/* LISTA */}
      {contratosFiltrados.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
          {contratos.length === 0 ? (
            <>
              <p className="text-6xl mb-4">📄</p>
              <h3 className="text-xl font-bold text-gray-900 mb-2">Aún no hay contratos creados</h3>
              <p className="text-gray-600 mb-6">
                Los contratos laborales aparecerán aquí una vez que los crees desde el botón "➕ Nuevo Contrato".
              </p>
            </>
          ) : (
            <>
              <p className="text-4xl mb-3">🔍</p>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No se encontraron contratos</h3>
              <p className="text-gray-600">Prueba con otros términos de búsqueda o limpia los filtros.</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {contratosFiltrados.map(contrato => {
            const empleado = contrato.usuario
            const estaFirmado = contrato.firma_empleado_at && contrato.firma_propietario_at

            return (
              <div 
                key={contrato.id} 
                className="bg-white rounded-2xl shadow-md hover:shadow-lg transition-shadow p-5 border border-gray-100"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  
                  <div className="flex items-start gap-4 flex-1 min-w-[280px]">
                    <div className="w-14 h-14 rounded-full bg-purple-100 flex items-center justify-center text-2xl flex-shrink-0">
                      {empleado?.foto_url ? (
                        <img src={empleado.foto_url} alt="" className="w-14 h-14 rounded-full object-cover" />
                      ) : (
                        obtenerAvatar(empleado)
                      )}
                    </div>

                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-bold text-lg text-gray-900">
                          {empleado?.nombre || 'Empleado desconocido'}
                        </h3>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold border ${obtenerColorEstado(contrato.estado)}`}>
                          {obtenerEmojiEstado(contrato.estado)} {contrato.estado.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-gray-500 font-semibold">
                          {obtenerLabelTipoContrato(contrato.tipo_contrato)}
                        </span>
                      </div>

                      <p className="text-sm text-gray-700">
                        <strong>{contrato.puesto}</strong>
                        {' · '}
                        RD$ {Number(contrato.salario_neto).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                        {' '}{obtenerLabelFrecuencia(contrato.frecuencia_pago)}
                      </p>

                      {contrato.año_escolar_inabie && (
                        <p className="text-xs text-gray-600 mt-1">
                          📅 Año escolar {contrato.año_escolar_inabie}
                        </p>
                      )}

                      <p className="text-xs text-gray-600 mt-1">
                        🗓️ {formatearFecha(contrato.fecha_inicio)}
                        {contrato.fecha_fin && ` → ${formatearFecha(contrato.fecha_fin)}`}
                      </p>

                      {estaFirmado && (
                        <p className="text-xs text-green-700 mt-1 font-semibold">
                          ✅ Firmado el {formatearFecha(contrato.firma_propietario_at)}
                        </p>
                      )}

                      {contrato.estado === 'pendiente_firma' && (
                        <p className="text-xs text-orange-700 mt-1 font-semibold">
                          ⏳ Pendiente de firma
                        </p>
                      )}

                      {contrato.estado === 'borrador' && (
                        <p className="text-xs text-yellow-700 mt-1 font-semibold">
                          📝 Borrador sin firmar
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 flex-wrap">
                    {(contrato.estado === 'activo' || contrato.estado === 'terminado' || contrato.estado === 'renovado') && (
                      <button
                        onClick={() => setContratoParaVer(contrato.id)}
                        className="bg-purple-600 hover:bg-purple-700 text-white text-sm font-bold px-3 py-2 rounded-lg"
                      >
                        📄 Ver / Imprimir
                      </button>
                    )}

                    {(contrato.estado === 'borrador' || contrato.estado === 'pendiente_firma') && (
                      <>
                        <button
                          onClick={() => abrirFirma(contrato)}
                          className="bg-orange-600 hover:bg-orange-700 text-white text-sm font-bold px-3 py-2 rounded-lg"
                        >
                          ✍️ Firmar
                        </button>
                        <button
                          onClick={() => setContratoParaVer(contrato.id)}
                          className="bg-purple-100 hover:bg-purple-200 text-purple-700 text-sm font-bold px-3 py-2 rounded-lg"
                        >
                          👁️ Ver
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

    </div>
  )
}

export default VistaContratos