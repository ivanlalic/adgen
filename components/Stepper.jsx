'use client'

const PASOS = [
  { numero: 1, label: 'Producto' },
  { numero: 2, label: 'Ángulo' },
  { numero: 3, label: 'Template' },
  { numero: 4, label: 'Generar' },
]

/**
 * Stepper — Barra de progreso de pasos 1-4.
 * Props:
 *   pasoActual: 1 | 2 | 3 | 4
 */
export default function Stepper({ pasoActual }) {
  return (
    <div className="flex items-center gap-0">
      {PASOS.map((paso, i) => {
        const completado = paso.numero < pasoActual
        const activo = paso.numero === pasoActual

        return (
          <div key={paso.numero} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all
                  ${completado
                    ? 'bg-violet-500 text-white'
                    : activo
                      ? 'bg-violet-600 text-white ring-2 ring-violet-500/40'
                      : 'bg-gray-800 text-gray-500'
                  }`}
              >
                {completado ? '✓' : paso.numero}
              </div>
              <span className={`text-xs whitespace-nowrap
                ${activo ? 'text-violet-400' : completado ? 'text-gray-400' : 'text-gray-600'}`}>
                {paso.label}
              </span>
            </div>

            {i < PASOS.length - 1 && (
              <div className={`h-px w-12 sm:w-16 mx-2 mb-4 transition-all
                ${completado ? 'bg-violet-500' : 'bg-gray-800'}`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
