'use client'
import { useState } from 'react'
import AngleCard from './AngleCard'

/**
 * Step2Angles — Paso 2: muestra el análisis de Claude y los 5 ángulos de venta.
 * Props:
 *   analisis: objeto completo de Claude (product_document, sales_angles, etc.)
 *   nombreProducto: string
 *   imagenesUrls: string[]
 *   onBack: () => void
 *   onAnguloSeleccionado: (angulo) => void
 */
export default function Step2Angles({ analisis, nombreProducto, imagenesUrls, onBack, onAnguloSeleccionado }) {
  const [anguloActivo, setAnguloActivo] = useState(null)

  const doc = analisis?.product_document
  const angulos = analisis?.sales_angles || []

  function handleContinuar() {
    if (!anguloActivo) return
    onAnguloSeleccionado(anguloActivo)
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4 sticky top-0 bg-gray-950 z-10">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="Volver"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">{nombreProducto}</h1>
          <p className="text-xs text-gray-500 mt-0.5">Paso 2 de 4 · Elegí tu ángulo de venta</p>
        </div>

        {anguloActivo && (
          <button
            onClick={handleContinuar}
            className="flex-shrink-0 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
          >
            Continuar
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
            </svg>
          </button>
        )}
      </header>

      <div className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {/* Product document summary */}
        {doc && (
          <div className="mb-8 bg-gray-900 border border-gray-800 rounded-xl p-5">
            <div className="flex flex-col sm:flex-row gap-5 sm:items-start">
              {/* Thumbnail */}
              {imagenesUrls?.[0] && (
                <img
                  src={imagenesUrls[0]}
                  alt={nombreProducto}
                  className="w-20 h-20 rounded-lg object-cover flex-shrink-0"
                />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 mb-2 flex-wrap">
                  <div>
                    <h2 className="font-semibold text-white text-base">
                      {doc.product_name_suggested || nombreProducto}
                    </h2>
                    <p className="text-gray-400 text-sm mt-0.5">{doc.one_liner}</p>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-xs px-2 py-1 bg-gray-800 border border-gray-700 text-gray-400 rounded-full capitalize">
                      {doc.price_positioning}
                    </span>
                    {doc.best_channels?.slice(0, 2).map(c => (
                      <span key={c} className="text-xs px-2 py-1 bg-violet-900/30 border border-violet-800/40 text-violet-400 rounded-full">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
                {doc.key_benefits?.length > 0 && (
                  <ul className="flex flex-wrap gap-x-4 gap-y-1 mt-3">
                    {doc.key_benefits.map((b, i) => (
                      <li key={i} className="flex items-center gap-1.5 text-xs text-gray-400">
                        <span className="text-violet-400">✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Ángulos */}
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-200">
            5 ángulos de ataque
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Elegí el que mejor encaja con tu campaña. Podés volver y probar otro.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {angulos.map((angulo) => (
            <AngleCard
              key={angulo.angle_number}
              angulo={angulo}
              seleccionado={anguloActivo?.angle_number === angulo.angle_number}
              onClick={() => setAnguloActivo(
                anguloActivo?.angle_number === angulo.angle_number ? null : angulo
              )}
            />
          ))}
        </div>

        {/* Bottom CTA */}
        {anguloActivo && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleContinuar}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-8 py-3 rounded-lg transition-all"
            >
              Continuar con &ldquo;{anguloActivo.angle_name}&rdquo;
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
