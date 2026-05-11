import { useState, useEffect } from 'react'

const ROL_INFO = {
  propietario:    { emoji: '👑', label: 'Propietario',   color: 'from-yellow-50 to-yellow-100 border-yellow-300' },
  administrador:  { emoji: '💼', label: 'Administrador', color: 'from-blue-50 to-blue-100 border-blue-300' },
  jefa_cocina:    { emoji: '👩‍🍳', label: 'Jefa de cocina', color: 'from-pink-50 to-pink-100 border-pink-300' },
  despachador:    { emoji: '🚚', label: 'Despachador',   color: 'from-orange-50 to-orange-100 border-orange-300' },
  ayudante:       { emoji: '👨‍🍳', label: 'Ayudante',      color: 'from-green-50 to-green-100 border-green-300' },
  contador:       { emoji: '🧮', label: 'Contador',      color: 'from-purple-50 to-purple-100 border-purple-300' }
}

function LoginPin({ usuario, onCancelar, onLoginExitoso }) {
  const [pinIngresado, setPinIngresado] = useState('')
  const [error, setError] = useState(false)
  const [shake, setShake] = useState(false)

  const info = ROL_INFO[usuario.rol] || ROL_INFO.ayudante

  function agregarDigito(digito) {
    if (pinIngresado.length >= 4) return
    
    const nuevoPin = pinIngresado + digito
    setPinIngresado(nuevoPin)
    setError(false)
    
    if (nuevoPin.length === 4) {
      // Verificar el PIN inmediatamente
      setTimeout(() => verificarPin(nuevoPin), 200)
    }
  }
// Soporte para teclado físico
  useEffect(() => {
    function manejarTecla(evento) {
      // Si presiona un número del 0 al 9
      if (evento.key >= '0' && evento.key <= '9') {
        agregarDigito(evento.key)
      }
      // Si presiona Backspace o Delete
      else if (evento.key === 'Backspace' || evento.key === 'Delete') {
        borrarDigito()
      }
      // Si presiona Escape, vuelve a selección
      else if (evento.key === 'Escape') {
        if (onCancelar) onCancelar()
      }
    }

    // Activar el listener
    window.addEventListener('keydown', manejarTecla)

    // Limpiar el listener cuando el componente se desmonta
    return () => {
      window.removeEventListener('keydown', manejarTecla)
    }
  }, [pinIngresado])  // Se actualiza cuando cambia el PIN
  function borrarDigito() {
    setPinIngresado(pinIngresado.slice(0, -1))
    setError(false)
  }

  function verificarPin(pin) {
    if (pin === usuario.pin) {
      // PIN correcto
      onLoginExitoso(usuario)
    } else {
      // PIN incorrecto
      setError(true)
      setShake(true)
      setTimeout(() => {
        setPinIngresado('')
        setShake(false)
      }, 600)
    }
  }

  return (
    <div className="w-full max-w-md">
      
      {/* Card del usuario */}
      <div className={`bg-gradient-to-br ${info.color} border-2 rounded-2xl p-6 mb-6 text-center`}>
        <div className="text-6xl mb-3">{info.emoji}</div>
        <p className="font-bold text-gray-900 text-2xl mb-1">{usuario.nombre}</p>
        <p className="text-sm text-gray-600 font-semibold tracking-wider uppercase">
          {info.label}
        </p>
      </div>

      {/* Display del PIN */}
      <div className="text-center mb-8">
        <p className="text-sm font-semibold text-gray-600 mb-4">
          Ingresa tu PIN
        </p>
        <div className={`flex justify-center gap-3 ${shake ? 'animate-shake' : ''}`}>
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-5 h-5 rounded-full border-2 transition-all ${
                error 
                  ? 'border-red-500 bg-red-500'
                  : pinIngresado.length > i 
                    ? 'border-blue-600 bg-blue-600' 
                    : 'border-gray-300 bg-white'
              }`}
            />
          ))}
        </div>
        {error && (
          <p className="text-red-600 text-sm font-semibold mt-3">
            PIN incorrecto, intenta de nuevo
          </p>
        )}
      </div>

      {/* Teclado numérico */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
          <button
            key={num}
            onClick={() => agregarDigito(num.toString())}
            className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-2xl py-5 text-3xl font-bold text-gray-900 transition-colors active:scale-95"
          >
            {num}
          </button>
        ))}
        <div></div>
        <button
          onClick={() => agregarDigito('0')}
          className="bg-white hover:bg-gray-50 border-2 border-gray-200 rounded-2xl py-5 text-3xl font-bold text-gray-900 transition-colors active:scale-95"
        >
          0
        </button>
        <button
          onClick={borrarDigito}
          className="bg-gray-100 hover:bg-gray-200 border-2 border-gray-200 rounded-2xl py-5 text-2xl font-bold text-gray-700 transition-colors active:scale-95"
        >
          ⌫
        </button>
      </div>

      {/* Botón de cancelar */}
      <button
        onClick={onCancelar}
        className="w-full bg-white hover:bg-gray-50 border-2 border-gray-200 text-gray-700 font-semibold py-3 rounded-xl transition-colors"
      >
        ← Cambiar usuario
      </button>

      {/* Animación de shake */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-10px); }
          75% { transform: translateX(10px); }
        }
        .animate-shake {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

    </div>
  )
}

export default LoginPin