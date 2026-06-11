import { useState } from 'react'
import { cargarSenalesSalud } from '../utils/saludCocinaDatos'
import { calcularSalud } from '../utils/saludCocina'

// Archivo TEMPORAL de prueba. Se borra cuando confirmemos que la nota sale bien.
export default function PruebaSalud() {
  const [resultado, setResultado] = useState(null)

  async function probar() {
    const senales = await cargarSenalesSalud('e4d3c4e2-0edd-4276-8e9e-a5f6581048bf')
    const salud = calcularSalud(senales)
    setResultado({ senales, salud })
    console.log('SEÑALES:', senales)
    console.log('SALUD:', salud)
  }

  return (
    <div style={{ padding: '40px', fontFamily: 'monospace', color: '#fff', background: '#08203a', minHeight: '100vh' }}>
      <button onClick={probar} style={{ padding: '12px 20px', fontSize: '16px', cursor: 'pointer', borderRadius: '8px', border: 'none', background: '#378ADD', color: 'white', fontWeight: 600 }}>
        ▶ Probar Salud de Elba
      </button>
      {resultado && (
        <pre style={{ marginTop: '24px', fontSize: '13px', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
{`NOTA: ${resultado.salud.puntuacion} / 10   (${resultado.salud.nivel})

ÁREAS:
${JSON.stringify(resultado.salud.areas, null, 2)}

CONSEJOS:
${resultado.salud.consejos.map(c => '• [' + c.severidad + '] ' + c.texto).join('\n')}

AVISOS (tablas que fallaron, debe estar vacío):
${JSON.stringify(resultado.senales._avisos, null, 2)}

SEÑALES CRUDAS:
${JSON.stringify(resultado.senales, null, 2)}`}
        </pre>
      )}
    </div>
  )
}