// src/components/ingredientes/ModalListaGenerada.jsx
import { useState } from 'react'
import { formatearListaWhatsApp, formatearRD } from '../../utils/calculosCompras'

export default function ModalListaGenerada({ datos, onCerrar }) {
  const [copiado, setCopiado] = useState(false)
  
  const { items, agrupado, empresa } = datos
  const fechaHoy = new Date().toLocaleDateString('es-DO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  })
  
  // ════════════════════════════════════════════════════
  // 📋 COPIAR AL PORTAPAPELES
  // ════════════════════════════════════════════════════
  async function copiarLista() {
    const texto = formatearListaWhatsApp(agrupado, empresa)
    try {
      await navigator.clipboard.writeText(texto)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2500)
    } catch (err) {
      alert('Error al copiar. Intenta seleccionar y copiar manualmente.')
    }
  }
  
  // ════════════════════════════════════════════════════
  // 📱 ENVIAR POR WHATSAPP
  // ════════════════════════════════════════════════════
  function enviarWhatsApp(telefono = null) {
    const texto = formatearListaWhatsApp(agrupado, empresa)
    const textoCodificado = encodeURIComponent(texto)
    
    let url
    if (telefono) {
      // Limpiar teléfono (solo dígitos + código país)
      const tel = telefono.replace(/\D/g, '')
      const telConCodigo = tel.startsWith('1') ? tel : `1${tel}`
      url = `https://wa.me/${telConCodigo}?text=${textoCodificado}`
    } else {
      // Sin número específico - abre WhatsApp para elegir contacto
      url = `https://wa.me/?text=${textoCodificado}`
    }
    
    window.open(url, '_blank')
  }
  
  // ════════════════════════════════════════════════════
  // 🖨️ IMPRIMIR
  // ════════════════════════════════════════════════════
  function imprimirLista() {
    window.print()
  }
  
  // ════════════════════════════════════════════════════
  // 🎨 RENDER
  // ════════════════════════════════════════════════════
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end md:items-center justify-center p-0 md:p-4 print:bg-white print:p-0">
      <div className="bg-white w-full md:max-w-3xl md:rounded-2xl shadow-2xl max-h-[95vh] overflow-hidden flex flex-col print:max-h-full print:shadow-none">
        
        {/* ════════════════════════════════════════════════════ */}
        {/* 🎨 HEADER (no se imprime) */}
        {/* ════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-5 print:hidden">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                📋 Lista de Compras Generada
              </h2>
              <p className="text-emerald-100 text-sm mt-1">
                {items.length} ingrediente{items.length > 1 ? 's' : ''} · 
                {' '}{agrupado.grupos.length} proveedor{agrupado.grupos.length > 1 ? 'es' : ''}
              </p>
            </div>
            <button
              onClick={onCerrar}
              className="text-white hover:text-emerald-200 text-3xl leading-none"
              title="Cerrar"
            >
              ×
            </button>
          </div>
        </div>
        
        {/* ════════════════════════════════════════════════════ */}
        {/* 📄 CONTENIDO IMPRIMIBLE */}
        {/* ════════════════════════════════════════════════════ */}
        <div className="flex-1 overflow-y-auto p-5 print:p-8">
          
          {/* Encabezado para impresión */}
          <div className="hidden print:block mb-6 border-b-2 border-gray-300 pb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              🛒 LISTA DE COMPRAS
            </h1>
            <div className="text-gray-700">
              <p className="font-semibold text-lg">{empresa?.nombre || 'Cocina PAE'}</p>
              <p className="text-sm capitalize">{fechaHoy}</p>
            </div>
          </div>
          
          {/* 💎 RESUMEN ECONÓMICO (gritando el valor) */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 border-2 border-emerald-300 rounded-2xl p-5 mb-6 print:bg-white print:border-gray-400">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl mb-1 print:hidden">📦</div>
                <div className="text-2xl font-bold text-emerald-700">{items.length}</div>
                <div className="text-xs text-gray-600 font-semibold">INGREDIENTES</div>
              </div>
              <div>
                <div className="text-3xl mb-1 print:hidden">🏪</div>
                <div className="text-2xl font-bold text-emerald-700">{agrupado.grupos.length}</div>
                <div className="text-xs text-gray-600 font-semibold">PROVEEDORES</div>
              </div>
              <div>
                <div className="text-3xl mb-1 print:hidden">💰</div>
                <div className="text-xl font-bold text-blue-700 leading-tight">
                  {agrupado.totalGeneralFormateado}
                </div>
                <div className="text-xs text-gray-600 font-semibold">INVERSIÓN TOTAL</div>
              </div>
            </div>
          </div>
          
          {/* ════════════════════════════════════════════════════ */}
          {/* 🏪 GRUPOS POR PROVEEDOR */}
          {/* ════════════════════════════════════════════════════ */}
          <div className="space-y-5">
            {agrupado.grupos.map(grupo => (
              <GrupoProveedor
                key={grupo.id}
                grupo={grupo}
                onEnviarWhatsApp={() => enviarWhatsApp(grupo.telefono)}
              />
            ))}
          </div>
          
          {/* Pie de página para impresión */}
          <div className="hidden print:block mt-8 pt-4 border-t-2 border-gray-300 text-center text-xs text-gray-500">
            Generado por Cocina PAE 🇩🇴 · Sistema de Gestión Profesional
          </div>
        </div>
        
        {/* ════════════════════════════════════════════════════ */}
        {/* 🎯 ACCIONES (no se imprimen) */}
        {/* ════════════════════════════════════════════════════ */}
        <div className="border-t-2 border-gray-100 bg-gray-50 p-4 print:hidden">
          <div className="flex flex-wrap gap-2 justify-end">
            <button
              onClick={copiarLista}
              className={`px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                copiado 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : 'bg-white border-2 border-gray-300 text-gray-700 hover:border-emerald-500 hover:text-emerald-700'
              }`}
            >
              {copiado ? '✅ Copiado' : '📋 Copiar'}
            </button>
            
            <button
              onClick={() => enviarWhatsApp()}
              className="px-4 py-2.5 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 flex items-center gap-2"
            >
              📱 WhatsApp
            </button>
            
            <button
              onClick={imprimirLista}
              className="px-4 py-2.5 bg-blue-500 text-white rounded-xl font-bold hover:bg-blue-600 flex items-center gap-2"
            >
              🖨️ Imprimir
            </button>
            
            <button
              onClick={onCerrar}
              className="px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl font-bold hover:bg-gray-300"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
      
      {/* ════════════════════════════════════════════════════ */}
      {/* 🖨️ ESTILOS DE IMPRESIÓN */}
      {/* ════════════════════════════════════════════════════ */}
      <style>{`
        @media print {
          @page {
            margin: 1cm;
            size: letter;
          }
          body * {
            visibility: hidden;
          }
          .fixed * {
            visibility: visible;
          }
          .fixed {
            position: relative !important;
            background: white !important;
          }
        }
      `}</style>
    </div>
  )
}

// ════════════════════════════════════════════════════
// 🎨 SUB-COMPONENTE: Grupo por proveedor
// ════════════════════════════════════════════════════
function GrupoProveedor({ grupo, onEnviarWhatsApp }) {
  const esSinProveedor = !grupo.tieneProveedor
  
  return (
    <div className={`border-2 rounded-2xl overflow-hidden ${
      esSinProveedor 
        ? 'border-yellow-300 bg-yellow-50 print:border-gray-400 print:bg-white' 
        : 'border-emerald-200 bg-white'
    }`}>
      {/* Header del proveedor */}
      <div className={`p-4 ${
        esSinProveedor 
          ? 'bg-yellow-100 print:bg-gray-100' 
          : 'bg-emerald-50 print:bg-gray-100'
      }`}>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-lg ${
              esSinProveedor ? 'text-yellow-800' : 'text-emerald-800 print:text-gray-900'
            }`}>
              {esSinProveedor ? '⚠️ ' : '🏪 '}{grupo.nombre.toUpperCase()}
            </h3>
            {grupo.telefono && (
              <p className="text-sm text-gray-600 mt-1">
                📞 {grupo.telefono}
              </p>
            )}
            {esSinProveedor && (
              <p className="text-xs text-yellow-700 mt-1">
                Asigna un proveedor a estos ingredientes para futuras compras
              </p>
            )}
          </div>
          
          {!esSinProveedor && grupo.telefono && (
            <button
              onClick={onEnviarWhatsApp}
              className="px-3 py-1.5 bg-green-500 text-white rounded-lg text-sm font-bold hover:bg-green-600 print:hidden whitespace-nowrap"
            >
              📱 WhatsApp
            </button>
          )}
        </div>
      </div>
      
      {/* Items del proveedor */}
      <div className="divide-y divide-gray-100">
        {grupo.items.map(item => (
          <div key={item.id} className="p-3 flex items-center justify-between gap-3 print:py-2">
            <div className="flex-1 min-w-0">
              <div className="font-semibold text-gray-800">
                • {item.nombre}
              </div>
              {item.urgencia === 'urgente' && (
                <div className="text-xs text-red-600 font-bold print:hidden">
                  🚨 Urgente · Quedan {item.diasCocinaRestantes} días
                </div>
              )}
            </div>
            
            <div className="text-right flex-shrink-0">
              <div className="font-bold text-gray-900">
                {item.cantidadSugerida} {item.unidadStock}
              </div>
              {item.costoEstimado > 0 && (
                <div className="text-xs text-gray-500">
                  ≈ {formatearRD(item.costoEstimado)}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
      
      {/* Subtotal del proveedor */}
      {grupo.totalCosto > 0 && (
        <div className={`p-3 border-t-2 ${
          esSinProveedor 
            ? 'bg-yellow-100 border-yellow-200 print:bg-gray-100 print:border-gray-300' 
            : 'bg-emerald-50 border-emerald-100 print:bg-gray-50 print:border-gray-300'
        }`}>
          <div className="flex justify-between items-center">
            <span className="font-semibold text-gray-700">Subtotal:</span>
            <span className={`font-bold text-lg ${
              esSinProveedor ? 'text-yellow-800' : 'text-emerald-700 print:text-gray-900'
            }`}>
              {grupo.totalCostoFormateado}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}