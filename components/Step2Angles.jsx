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
  const [angulos, setAngulos] = useState(analisis?.sales_angles || [])
  const [textoEdicion, setTextoEdicion] = useState('')
  const [refinando, setRefinando] = useState(false)
  const [errorRefine, setErrorRefine] = useState(null)
  const [editando, setEditando] = useState(false)
  const [imagenesRef, setImagenesRef] = useState([])

  const doc = analisis?.product_document

  function handleContinuar() {
    if (!anguloActivo) return
    onAnguloSeleccionado(anguloActivo)
  }

  function handleSeleccionarAngulo(angulo) {
    const nuevo = anguloActivo?.angle_number === angulo.angle_number ? null : angulo
    setAnguloActivo(nuevo)
    if (!nuevo) {
      setEditando(false)
      setTextoEdicion('')
      setErrorRefine(null)
      setImagenesRef([])
    }
  }

  async function handleRefinar() {
    if (!textoEdicion.trim() || !anguloActivo) return
    setRefinando(true)
    setErrorRefine(null)

    try {
      const res = await fetch('/api/refine-angle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          angulo_actual: anguloActivo,
          edicion: textoEdicion,
          imagenes_urls: imagenesUrls || [],
          imagenes_referencia: imagenesRef.map(img => ({ data: img.data, type: img.type })),
        }),
      })

      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Error al refinar')

      const anguloRefinado = { ...json.data, angle_number: 0, _refinado: true }
      setAngulos(prev => [anguloRefinado, ...prev])
      setAnguloActivo(anguloRefinado)
      setEditando(false)
      setTextoEdicion('')
      setImagenesRef([])
    } catch (err) {
      setErrorRefine(err.message)
    } finally {
      setRefinando(false)
    }
  }

  function handleImageRefChange(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = () => {
      const dataUrl = reader.result
      const base64 = dataUrl.split(',')[1]
      setImagenesRef(prev => [...prev, { preview: dataUrl, data: base64, type: file.type || 'image/jpeg' }])
    }
    reader.readAsDataURL(file)
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
            {angulos.length === 1 ? 'Ángulo de venta' : `${angulos.length} ángulos de ataque`}
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            {angulos.length === 1
              ? 'Ángulo trabajado en profundidad según tu sugerencia. Podés volver y probar otro.'
              : 'Elegí el que mejor encaja con tu campaña. Podés ajustar cualquier ángulo antes de continuar.'
            }
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {angulos.map((angulo, i) => (
            <div key={`${angulo.angle_number}-${i}`} className="flex flex-col gap-0">
              {angulo._refinado && (
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className="text-xs font-semibold text-violet-400 bg-violet-900/30 border border-violet-800/40 px-2 py-0.5 rounded-full">
                    ✦ Refinado
                  </span>
                </div>
              )}
              <AngleCard
                angulo={angulo}
                seleccionado={anguloActivo?.angle_number === angulo.angle_number && anguloActivo === angulo}
                onClick={() => handleSeleccionarAngulo(angulo)}
              />
            </div>
          ))}
        </div>

        {/* Panel ajustar ángulo */}
        {anguloActivo && (
          <div className="mt-6 border border-gray-800 rounded-xl bg-gray-900 p-5">
            <button
              onClick={() => {
                setEditando(v => !v)
                setTextoEdicion('')
                setErrorRefine(null)
              }}
              className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors w-full text-left"
            >
              <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Ajustar este ángulo
              <svg
                className={`w-4 h-4 ml-auto text-gray-600 transition-transform ${editando ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {editando && (
              <div className="mt-4 flex flex-col gap-3">
                <p className="text-xs text-gray-500">
                  Describí qué querés cambiar. Claude va a refinar el ángulo manteniendo el resto intacto.
                </p>
                <textarea
                  value={textoEdicion}
                  onChange={e => setTextoEdicion(e.target.value)}
                  placeholder="ej. Cambiá el avatar a mujeres mayores de 45 años / El hook tiene que ser más agresivo / Usá el trigger de miedo en lugar de aspiración..."
                  rows={3}
                  maxLength={400}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />
                {/* Imágenes de referencia */}
                <div>
                  <p className="text-xs text-gray-500 mb-2">Imagen de referencia visual (opcional)</p>
                  <div className="flex flex-wrap gap-2">
                    {imagenesRef.map((img, i) => (
                      <div key={i} className="relative">
                        <img src={img.preview} alt="" className="w-16 h-16 object-cover rounded-lg border border-gray-700" />
                        <button
                          type="button"
                          onClick={() => setImagenesRef(prev => prev.filter((_, j) => j !== i))}
                          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-700 hover:bg-red-700 rounded-full text-xs flex items-center justify-center text-gray-300 transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                    {imagenesRef.length < 3 && (
                      <label className="w-16 h-16 border border-dashed border-gray-700 hover:border-gray-500 rounded-lg flex flex-col items-center justify-center cursor-pointer transition-colors gap-1">
                        <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="text-[10px] text-gray-600">Imagen</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handleImageRefChange} />
                      </label>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs text-gray-600">{textoEdicion.length}/400</span>
                  <button
                    onClick={handleRefinar}
                    disabled={!textoEdicion.trim() || refinando}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-5 py-2 rounded-lg transition-all"
                  >
                    {refinando ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Refinando...
                      </>
                    ) : (
                      <>
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Regenerar con cambios
                      </>
                    )}
                  </button>
                </div>
                {errorRefine && (
                  <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">
                    {errorRefine}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* Bottom CTA */}
        {anguloActivo && (
          <div className="mt-6 flex justify-end">
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
