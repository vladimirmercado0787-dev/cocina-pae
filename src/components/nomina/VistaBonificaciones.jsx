import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import ModalBonificacion from './ModalBonificacion'

const ICONOS_TIPO = {
  navideño: '🎄',
  cumpleaños: '🎂',
  productividad: '🏆',
  reconocimiento: '❤️',
  otro: '✨',
}

const LABELS_TIPO = {
  navideño: 'Navideño',
  cumpleaños: 'Cumpleaños',
  productividad: 'Productividad',
  reconocimiento: 'Reconocimiento',
  otro: 'Otro',
}

function VistaBonificaciones({ empresaId, usuarioActual, onVolver }) {
  const [bonificaciones, setBonificaciones] = useState([])
  const [añoSeleccionado, setAñoSeleccionado] = useState(new Date().getFullYear())
  const [añosDisponibles, setAñosDisponibles] = useState([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [bonoDetalle, setBonoDetalle] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [empresa, setEmpresa] = useState(null)
  const [mensajeExito, setMensajeExito] = useState('')

  useEffect(() => {
    if (empresaId) {
      cargarEmpresa()
      cargarAños()
    }
  }, [empresaId])

  useEffect(() => {
    if (empresaId && añoSeleccionado) cargarBonificaciones()
  }, [añoSeleccionado, empresaId])

  async function cargarEmpresa() {
    const { data } = await supabase
      .from('empresas').select('*').eq('id', empresaId).single()
    setEmpresa(data)
  }

  async function cargarAños() {
    const { data } = await supabase
      .from('bonificaciones_extra')
      .select('año')
      .eq('empresa_id', empresaId)
      .order('año', { ascending: false })
    
    const años = [...new Set((data || []).map(b => b.año))]
    if (años.length === 0) años.push(new Date().getFullYear())
    setAñosDisponibles(años)
  }

  async function cargarBonificaciones() {
    setCargando(true)
    const { data } = await supabase
      .from('bonificaciones_extra')
      .select('*')
      .eq('empresa_id', empresaId)
      .eq('año', añoSeleccionado)
      .order('fecha_pago', { ascending: false })
    
    setBonificaciones(data || [])
    setCargando(false)
  }

  function mostrarExito(msg) {
    setMensajeExito(msg)
    setTimeout(() => setMensajeExito(''), 4000)
  }

  function onBonoExitoso() {
    setModalAbierto(false)
    mostrarExito('✅ Bonificación procesada correctamente')
    cargarAños()
    cargarBonificaciones()
  }

  function formatearMoneda(monto) {
    return Number(monto || 0).toLocaleString('es-DO', {
      minimumFractionDigits: 2, maximumFractionDigits: 2
    })
  }

  function formatearFecha(fecha) {
    if (!fecha) return '-'
    return new Date(fecha).toLocaleDateString('es-DO', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  // KPIs por tipo
  const totalAño = bonificaciones.reduce((sum, b) => sum + parseFloat(b.monto_total || 0), 0)
  const totalNavideño = bonificaciones.filter(b => b.tipo === 'navideño').reduce((s, b) => s + parseFloat(b.monto_total), 0)
  const totalCumpleaños = bonificaciones.filter(b => b.tipo === 'cumpleaños').reduce((s, b) => s + parseFloat(b.monto_total), 0)
  const totalProductividad = bonificaciones.filter(b => b.tipo === 'productividad').reduce((s, b) => s + parseFloat(b.monto_total), 0)
  const totalReconocimiento = bonificaciones.filter(b => b.tipo === 'reconocimiento').reduce((s, b) => s + parseFloat(b.monto_total), 0)

  return (
    <div className="w-full max-w-5xl">

      {mensajeExito && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-6 py-3 rounded-xl shadow-2xl z-[60] animate-pulse">
          {mensajeExito}
        </div>
      )}

      {/* MODAL CREAR */}
      {modalAbierto && empresa && (
        <ModalBonificacion
          empresa={empresa}
          usuarioActual={usuarioActual}
          onCerrar={() => setModalAbierto(false)}
          onExito={onBonoExitoso}
        />
      )}

      {/* MODAL DETALLE */}
      {bonoDetalle && (
        <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col">
            <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white rounded-t-2xl p-6 flex justify-between items-start">
              <div>
                <p className="text-amber-100 text-xs font-semibold tracking-wider">
                  DETALLE DE BONIFICACIÓN
                </p>
                <h2 className="text-2xl font-bold mt-1">
                  {ICONOS_TIPO[bonoDetalle.tipo]} {bonoDetalle.titulo}
                </h2>
                <p className="text-amber-200 text-sm mt-1">
                  Pagado el {formatearFecha(bonoDetalle.fecha_pago)}
                </p>
              </div>
              <button
                onClick={() => setBonoDetalle(null)}
                className="bg-amber-700 hover:bg-amber-800 text-white text-sm px-3 py-2 rounded-lg"
              >
                ✖ Cerrar
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-gray-500">Tipo</p>
                    <p className="font-bold capitalize">{LABELS_TIPO[bonoDetalle.tipo]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Empleados</p>
                    <p className="font-bold">{bonoDetalle.cantidad_empleados}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Total</p>
                    <p className="font-bold text-amber-700">
                      RD$ {formatearMoneda(bonoDetalle.monto_total)}
                    </p>
                  </div>
                </div>
                {bonoDetalle.descripcion && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">Descripción</p>
                    <p className="text-sm text-gray-700">{bonoDetalle.descripcion}</p>
                  </div>
                )}
                {bonoDetalle.notas && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <p className="text-xs text-gray-500 mb-1">📝 Notas</p>
                    <p className="text-sm text-gray-700 italic">{bonoDetalle.notas}</p>
                  </div>
                )}
              </div>

              <div>
                <p className="text-sm font-bold text-gray-700 mb-3">
                  👥 EMPLEADOS BENEFICIADOS
                </p>
                <div className="space-y-2">
                  {(bonoDetalle.detalle || []).map((emp, idx) => (
                    <div key={idx} className="border border-gray-200 rounded-xl p-3 flex items-center justify-between">
                      <div>
                        <p className="font-bold text-gray-900">{emp.nombre}</p>
                        <p className="text-xs text-gray-600 capitalize">
                          {emp.rol?.replace('_', ' ')}
                        </p>
                      </div>
                      <p className="text-xl font-bold text-amber-700">
                        RD$ {formatearMoneda(emp.monto)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* HEADER */}
      <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-6 mb-6 text-white">
        <div className="flex justify-between items-start">
          <div>
            <p className="text-amber-100 text-xs font-semibold tracking-wider">
              BONIFICACIONES EXTRA
            </p>
            <h2 className="text-3xl font-bold mt-1">
              🎁 Bonos Especiales
            </h2>
            <p className="text-amber-200 mt-1 text-sm">
              Bonos fuera de la nómina regular
            </p>
          </div>
          <div className="flex gap-2 flex-wrap justify-end">
            <button
              onClick={() => setModalAbierto(true)}
              className="bg-white text-amber-700 hover:bg-amber-50 font-bold text-sm px-4 py-2 rounded-lg shadow-lg"
            >
              ➕ Nueva bonificación
            </button>
            <button
              onClick={onVolver}
              className="bg-amber-700 hover:bg-amber-800 text-white text-sm px-4 py-2 rounded-lg"
            >
              ← Volver
            </button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="bg-white rounded-2xl shadow-xl p-6 mb-6">
        <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <p className="text-xs text-gray-500 font-semibold tracking-wider">
            📊 RESUMEN AÑO {añoSeleccionado}
          </p>
          <select
            value={añoSeleccionado}
            onChange={(e) => setAñoSeleccionado(parseInt(e.target.value))}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm font-semibold"
          >
            {añosDisponibles.map(año => (
              <option key={año} value={año}>{año}</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
            <p className="text-xs text-amber-700 font-semibold">TOTAL</p>
            <p className="text-lg font-bold text-amber-900">
              RD$ {formatearMoneda(totalAño)}
            </p>
            <p className="text-xs text-amber-600 mt-1">{bonificaciones.length} bonos</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
            <p className="text-xs text-red-700 font-semibold">🎄 NAVIDEÑO</p>
            <p className="text-sm font-bold text-red-900">
              RD$ {formatearMoneda(totalNavideño)}
            </p>
          </div>
          <div className="bg-pink-50 border border-pink-200 rounded-xl p-3 text-center">
            <p className="text-xs text-pink-700 font-semibold">🎂 CUMPLEAÑOS</p>
            <p className="text-sm font-bold text-pink-900">
              RD$ {formatearMoneda(totalCumpleaños)}
            </p>
          </div>
          <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 text-center">
            <p className="text-xs text-yellow-700 font-semibold">🏆 PROD.</p>
            <p className="text-sm font-bold text-yellow-900">
              RD$ {formatearMoneda(totalProductividad)}
            </p>
          </div>
          <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-center">
            <p className="text-xs text-purple-700 font-semibold">❤️ RECON.</p>
            <p className="text-sm font-bold text-purple-900">
              RD$ {formatearMoneda(totalReconocimiento)}
            </p>
          </div>
        </div>
      </div>

      {/* LISTA */}
      <div className="bg-white rounded-2xl shadow-xl p-6">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-4">
          🎁 BONIFICACIONES DEL AÑO
        </p>

        {cargando ? (
          <div className="text-center py-12 text-gray-500">⏳ Cargando...</div>
        ) : bonificaciones.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-4xl mb-2">🎁</p>
            <p className="text-gray-700 font-bold mb-1">
              No hay bonificaciones en {añoSeleccionado}
            </p>
            <p className="text-sm text-gray-500 mb-4">
              Crea tu primera bonificación para empleados
            </p>
            <button
              onClick={() => setModalAbierto(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold px-6 py-3 rounded-xl"
            >
              ➕ Crear bonificación
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {bonificaciones.map(b => (
              <div 
                key={b.id}
                className="border border-gray-200 rounded-xl p-4 hover:bg-gray-50 transition cursor-pointer flex items-center justify-between gap-3 flex-wrap"
                onClick={() => setBonoDetalle(b)}
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center text-2xl flex-shrink-0">
                    {ICONOS_TIPO[b.tipo]}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">
                      {b.titulo}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatearFecha(b.fecha_pago)} · {b.cantidad_empleados} empleado{b.cantidad_empleados !== 1 ? 's' : ''} · 
                      {' '}<span className="capitalize">{LABELS_TIPO[b.tipo]}</span>
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-lg font-bold text-amber-700">
                    RD$ {formatearMoneda(b.monto_total)}
                  </p>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setBonoDetalle(b)
                  }}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold px-3 py-2 rounded-lg"
                >
                  👁️ Ver
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

export default VistaBonificaciones