import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import bcrypt from 'bcryptjs'

function LoginEmpresa({ onLoginExitoso }) {
  const [usuario, setUsuario] = useState('')
  const [password, setPassword] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [error, setError] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mostrarAyuda, setMostrarAyuda] = useState(false)

  async function intentarLogin(e) {
    e?.preventDefault()
    
    if (!usuario.trim() || !password.trim()) {
      setError('Ingresa tu usuario y contraseña')
      return
    }

    setCargando(true)
    setError('')

    // Buscar empresa por usuario (case-insensitive)
    const { data: empresas, error: errSupa } = await supabase
      .from('empresas')
      .select('*')
      .ilike('usuario', usuario.trim())
      .limit(1)

    if (errSupa) {
      console.error('Error al buscar empresa:', errSupa)
      setError('Error de conexión. Intenta de nuevo.')
      setCargando(false)
      return
    }

    if (!empresas || empresas.length === 0) {
      setError('Usuario o contraseña incorrectos')
      setCargando(false)
      return
    }

    const empresa = empresas[0]

    // Verificar contraseña
    let passwordCorrecta = false

    // Caso especial: contraseña temporal sin hash (solo durante migración)
    if (empresa.password_hash === 'TEMPORAL_SIN_HASH') {
      passwordCorrecta = (password === 'temporal2026')
    } else if (empresa.password_hash) {
      // Comparar con bcrypt
      try {
        passwordCorrecta = await bcrypt.compare(password, empresa.password_hash)
      } catch (err) {
        console.error('Error al comparar password:', err)
        passwordCorrecta = false
      }
    }

    if (!passwordCorrecta) {
      setError('Usuario o contraseña incorrectos')
      setCargando(false)
      return
    }

    // ¡Login exitoso!
    setCargando(false)
    onLoginExitoso(empresa)
  }

  return (
    <div className="w-full max-w-md">
      
      {/* HEADER con logo */}
      <div className="text-center mb-8">
        <div className="w-24 h-24 mx-auto mb-4 rounded-3xl bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 flex items-center justify-center shadow-2xl">
          <span className="text-4xl font-black text-white drop-shadow-lg">CP</span>
        </div>
        <h1 className="text-3xl font-bold text-gray-900">
          Cocina PAE
        </h1>
        <p className="text-sm text-gray-600 mt-2">
          Sistema de gestión para suplidores INABIE
        </p>
      </div>

      {/* TARJETA DE LOGIN */}
      <div className="bg-white rounded-2xl shadow-xl p-8">
        
        <h2 className="text-xl font-bold text-gray-900 mb-1">
          Iniciar sesión
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Ingresa las credenciales de tu empresa
        </p>

        <form onSubmit={intentarLogin} className="space-y-4">
          
          {/* USUARIO */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Usuario de empresa
            </label>
            <input
              type="text"
              value={usuario}
              onChange={(e) => {
                setUsuario(e.target.value)
                if (error) setError('')
              }}
              placeholder="Ej: elba2026"
              autoComplete="username"
              autoFocus
              disabled={cargando}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
            />
          </div>

          {/* CONTRASEÑA */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Contraseña
            </label>
            <div className="relative">
              <input
                type={verPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                disabled={cargando}
                className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500 disabled:opacity-50"
              />
              <button
                type="button"
                onClick={() => setVerPassword(!verPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"
              >
                {verPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          {/* ERROR */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
              ⚠️ {error}
            </div>
          )}

          {/* BOTÓN ENTRAR */}
          <button
            type="submit"
            disabled={cargando}
            className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white font-bold py-3 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {cargando ? (
              <>
                <span className="animate-spin">⏳</span> Verificando...
              </>
            ) : (
              '🔐 Entrar'
            )}
          </button>

          {/* OLVIDÉ CONTRASEÑA */}
          <button
            type="button"
            onClick={() => setMostrarAyuda(!mostrarAyuda)}
            className="w-full text-sm text-gray-500 hover:text-gray-700 underline"
          >
            ¿Olvidaste tu contraseña?
          </button>

          {mostrarAyuda && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-900">
              <p className="font-semibold mb-2">📞 Contacta al administrador</p>
              <p className="text-xs">
                Por ahora, la recuperación de contraseña es manual. 
                Contacta a tu administrador o a soporte de Cocina PAE:
              </p>
              <p className="text-xs mt-2">
                📧 vladimirmercado0787@gmail.com
              </p>
              <p className="text-xs mt-1">
                📱 WhatsApp: +1 (978) 414-7190
              </p>
            </div>
          )}

        </form>

      </div>

      {/* FOOTER */}
      <div className="text-center mt-6 text-xs text-gray-400">
        <p>Cocina PAE v1.0 · Mayo 2026</p>
        <p className="mt-1">Sistema seguro con encriptación bcrypt 🔒</p>
      </div>

    </div>
  )
}

export default LoginEmpresa