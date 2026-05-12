import { useState } from 'react'
import { supabase } from '../../supabaseClient'
import bcrypt from 'bcryptjs'

function SeccionSeguridad({ empresa, onActualizado, mostrarExito }) {
  const [emailContacto, setEmailContacto] = useState(empresa?.email_contacto || '')
  const [guardandoEmail, setGuardandoEmail] = useState(false)
  
  // Estado del modal de cambio de contraseña
  const [mostrarCambioPassword, setMostrarCambioPassword] = useState(false)
  const [passwordActual, setPasswordActual] = useState('')
  const [passwordNueva, setPasswordNueva] = useState('')
  const [passwordConfirmar, setPasswordConfirmar] = useState('')
  const [verPassword, setVerPassword] = useState(false)
  const [errorPassword, setErrorPassword] = useState('')
  const [guardandoPassword, setGuardandoPassword] = useState(false)

  async function guardarEmail() {
    if (!emailContacto.trim()) {
      return
    }

    setGuardandoEmail(true)
    
    const { error } = await supabase
      .from('empresas')
      .update({ email_contacto: emailContacto.trim().toLowerCase() })
      .eq('id', empresa.id)

    setGuardandoEmail(false)

    if (error) {
      console.error('Error al guardar email:', error)
      return
    }

    mostrarExito('Email de contacto actualizado')
    onActualizado()
  }

  function cancelarCambio() {
    setMostrarCambioPassword(false)
    setPasswordActual('')
    setPasswordNueva('')
    setPasswordConfirmar('')
    setErrorPassword('')
  }

  async function cambiarPassword() {
    setErrorPassword('')

    if (!passwordActual || !passwordNueva || !passwordConfirmar) {
      setErrorPassword('Llena todos los campos')
      return
    }

    if (passwordNueva.length < 6) {
      setErrorPassword('La nueva contraseña debe tener al menos 6 caracteres')
      return
    }

    if (passwordNueva !== passwordConfirmar) {
      setErrorPassword('La confirmación no coincide')
      return
    }

    if (passwordNueva === passwordActual) {
      setErrorPassword('La nueva contraseña no puede ser igual a la actual')
      return
    }

    setGuardandoPassword(true)

    let passwordActualCorrecta = false

    if (empresa.password_hash === 'TEMPORAL_SIN_HASH') {
      passwordActualCorrecta = (passwordActual === 'temporal2026')
    } else if (empresa.password_hash) {
      try {
        passwordActualCorrecta = await bcrypt.compare(passwordActual, empresa.password_hash)
      } catch (err) {
        console.error('Error al comparar:', err)
        passwordActualCorrecta = false
      }
    }

    if (!passwordActualCorrecta) {
      setErrorPassword('La contraseña actual es incorrecta')
      setGuardandoPassword(false)
      return
    }

    let nuevoHash = ''
    try {
      const salt = await bcrypt.genSalt(10)
      nuevoHash = await bcrypt.hash(passwordNueva, salt)
    } catch (err) {
      console.error('Error al hashear:', err)
      setErrorPassword('Error al procesar la nueva contraseña')
      setGuardandoPassword(false)
      return
    }

    const { error } = await supabase
      .from('empresas')
      .update({ password_hash: nuevoHash })
      .eq('id', empresa.id)

    setGuardandoPassword(false)

    if (error) {
      console.error('Error al guardar:', error)
      setErrorPassword('Error al guardar la contraseña: ' + error.message)
      return
    }

    mostrarExito('Contraseña actualizada correctamente')
    cancelarCambio()
    onActualizado()
  }

  const usandoPasswordTemporal = empresa?.password_hash === 'TEMPORAL_SIN_HASH'

  return (
    <div className="space-y-6">
      
      <div>
        <h3 className="text-2xl font-bold text-gray-900">🔐 Seguridad</h3>
        <p className="text-sm text-gray-600 mt-1">
          Credenciales de acceso de tu empresa
        </p>
      </div>

      {usandoPasswordTemporal && (
        <div className="bg-yellow-50 border-2 border-yellow-300 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl">⚠️</span>
            <div>
              <p className="font-bold text-yellow-900">
                Estás usando una contraseña temporal
              </p>
              <p className="text-sm text-yellow-800 mt-1">
                Por seguridad, te recomendamos cambiar la contraseña a una propia con el botón de abajo. 
                La contraseña temporal actual es: <code className="bg-yellow-100 px-2 py-0.5 rounded font-mono text-xs">temporal2026</code>
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
          👤 USUARIO DE EMPRESA
        </p>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Usuario de login
          </label>
          <input
            type="text"
            value={empresa?.usuario || ''}
            readOnly
            className="w-full px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg text-gray-700 font-mono cursor-not-allowed"
          />
          <p className="text-xs text-gray-500 mt-1">
            El usuario no se puede cambiar. Si necesitas otro, contacta soporte.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
          📧 EMAIL DE CONTACTO
        </p>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            Email para recuperación de contraseña
          </label>
          <div className="flex gap-2">
            <input
              type="email"
              value={emailContacto}
              onChange={(e) => setEmailContacto(e.target.value)}
              placeholder="email@ejemplo.com"
              className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={guardarEmail}
              disabled={guardandoEmail || emailContacto === empresa?.email_contacto}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition disabled:opacity-50"
            >
              {guardandoEmail ? '⏳' : '💾 Guardar'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Este email se usará para enviarte un enlace de recuperación si olvidas tu contraseña.
          </p>
        </div>
      </div>

      <div className="bg-gray-50 border border-gray-200 rounded-xl p-5">
        <p className="text-xs text-gray-500 font-semibold tracking-wider mb-3">
          🔑 CONTRASEÑA
        </p>

        {!mostrarCambioPassword ? (
          <div className="flex items-center justify-between gap-4">
            <div className="flex-1">
              <p className="text-sm text-gray-700">
                Tu contraseña está cifrada con <strong>bcrypt</strong> (estándar bancario).
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Última actualización: {empresa?.updated_at 
                  ? new Date(empresa.updated_at).toLocaleDateString('es-DO', { 
                      day: 'numeric', month: 'long', year: 'numeric' 
                    })
                  : 'desconocida'}
              </p>
            </div>
            <button
              onClick={() => setMostrarCambioPassword(true)}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition whitespace-nowrap"
            >
              🔑 Cambiar contraseña
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Contraseña actual
              </label>
              <input
                type={verPassword ? 'text' : 'password'}
                value={passwordActual}
                onChange={(e) => setPasswordActual(e.target.value)}
                placeholder="••••••••"
                disabled={guardandoPassword}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Nueva contraseña <span className="text-xs font-normal text-gray-500">(mínimo 6 caracteres)</span>
              </label>
              <input
                type={verPassword ? 'text' : 'password'}
                value={passwordNueva}
                onChange={(e) => setPasswordNueva(e.target.value)}
                placeholder="••••••••"
                disabled={guardandoPassword}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Confirmar nueva contraseña
              </label>
              <input
                type={verPassword ? 'text' : 'password'}
                value={passwordConfirmar}
                onChange={(e) => setPasswordConfirmar(e.target.value)}
                placeholder="••••••••"
                disabled={guardandoPassword}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={verPassword}
                onChange={(e) => setVerPassword(e.target.checked)}
                className="w-4 h-4 rounded"
              />
              👁️ Mostrar contraseñas
            </label>

            {errorPassword && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-800">
                ⚠️ {errorPassword}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                onClick={cancelarCambio}
                disabled={guardandoPassword}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100"
              >
                Cancelar
              </button>
              <button
                onClick={cambiarPassword}
                disabled={guardandoPassword}
                className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold transition disabled:opacity-50"
              >
                {guardandoPassword ? '⏳ Guardando...' : '💾 Guardar contraseña'}
              </button>
            </div>

          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-900">
        <p className="font-semibold mb-2">🔒 Información de seguridad</p>
        <ul className="space-y-1 text-xs">
          <li>• Tu contraseña se guarda cifrada con bcrypt (el mismo estándar que usan los bancos).</li>
          <li>• Ni siquiera nosotros podemos verla en texto plano.</li>
          <li>• Si la olvidas, deberá ser regenerada con un enlace al email de contacto.</li>
          <li>• Recomendamos usar al menos 8 caracteres con números y letras.</li>
        </ul>
      </div>

    </div>
  )
}

export default SeccionSeguridad