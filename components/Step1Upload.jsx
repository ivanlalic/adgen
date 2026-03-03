'use client'
import { useState, useEffect, useRef } from 'react'
import ImageUploader from './ImageUploader'
import ErrorMessage from './ErrorMessage'
import { uploadProductImages } from '@/lib/uploadToStorage'

/**
 * Step1Upload — Paso 1: subir imágenes del producto + nombre + descripción.
 * Props:
 *   onBack: () => void
 *   onComplete: (analisis, imagenesUrls, nombre, descripcion) => void
 */
export default function Step1Upload({ onBack, onComplete }) {
  const [files, setFiles] = useState([])
  const [nombre, setNombre] = useState('')
  const [descripcion, setDescripcion] = useState('')
  const [sugerenciaAngulo, setSugerenciaAngulo] = useState('')
  const [cargando, setCargando] = useState(false)
  const [mensajeCarga, setMensajeCarga] = useState('')
  const [segundos, setSegundos] = useState(0)
  const [error, setError] = useState(null)
  const timerRef = useRef(null)

  useEffect(() => {
    if (cargando) {
      setSegundos(0)
      timerRef.current = setInterval(() => setSegundos(s => s + 1), 1000)
    } else {
      clearInterval(timerRef.current)
    }
    return () => clearInterval(timerRef.current)
  }, [cargando])

  const canSubmit = nombre.trim() && files.length > 0 && !cargando

  async function handleSubmit(e) {
    e.preventDefault()
    if (!canSubmit) return

    setError(null)
    setCargando(true)

    try {
      setMensajeCarga('Subiendo imágenes...')
      const imagenesUrls = await uploadProductImages(files)

      setMensajeCarga('Analizando con IA...')
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre_producto: nombre.trim(),
          descripcion: descripcion.trim(),
          sugerencia_angulo: sugerenciaAngulo.trim(),
          imagenes_urls: imagenesUrls,
        }),
      })

      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Error al analizar el producto')

      onComplete(data.data, imagenesUrls, nombre.trim(), descripcion.trim())
    } catch (err) {
      setError(err.message)
    } finally {
      setCargando(false)
      setMensajeCarga('')
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-gray-500 hover:text-gray-300 transition-colors"
          aria-label="Volver"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-base font-semibold">Nuevo producto</h1>
          <p className="text-xs text-gray-500 mt-0.5">Paso 1 de 4 · Producto</p>
        </div>
      </header>

      <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
        <div className="flex-1 px-6 py-8 max-w-4xl mx-auto w-full">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Imágenes */}
            <div className="lg:flex-1 flex flex-col gap-3">
              <div>
                <h2 className="text-sm font-medium text-gray-200">Fotos del producto</h2>
                <p className="text-xs text-gray-500 mt-1">1-3 fotos. Mejor calidad = mejor análisis.</p>
              </div>
              <ImageUploader files={files} onChange={setFiles} />
            </div>

            <div className="hidden lg:block w-px bg-gray-800 self-stretch" />

            {/* Formulario */}
            <div className="lg:flex-1 flex flex-col gap-5">
              <h2 className="text-sm font-medium text-gray-200">Información</h2>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400">
                  Nombre <span className="text-violet-400">*</span>
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="ej. Plantillas de pádel XPro"
                  maxLength={100}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400">
                  Descripción <span className="text-gray-600 font-normal">(opcional)</span>
                </label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Material, precio, para quién es, qué lo hace único..."
                  rows={5}
                  maxLength={500}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />
                <span className="text-xs text-gray-600 text-right">{descripcion.length}/500</span>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-medium text-gray-400">
                  Sugerencia de ángulo <span className="text-gray-600 font-normal">(opcional)</span>
                </label>
                <input
                  type="text"
                  value={sugerenciaAngulo}
                  onChange={e => setSugerenciaAngulo(e.target.value)}
                  placeholder="ej. jugadores de pádel, mamás primerizas, oficinistas..."
                  maxLength={150}
                  className="bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500/30 transition-all"
                />
              </div>

              <div className="flex gap-2.5 bg-gray-800/50 border border-gray-800 rounded-lg p-3 mt-auto">
                <span className="text-violet-400 text-sm flex-shrink-0">✦</span>
                <p className="text-xs text-gray-500 leading-relaxed">
                  {sugerenciaAngulo.trim()
                    ? <>Claude trabajará <strong className="text-gray-400">solo ese ángulo</strong> en profundidad: avatar, copy completo y dirección visual.</>
                    : <>Sin sugerencia, Claude generará <strong className="text-gray-400">5 ángulos distintos</strong> para elegir. El análisis tarda ~20 seg.</>
                  }
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-800 px-6 py-4">
          <div className="max-w-4xl mx-auto flex items-center gap-4 flex-wrap">
            {error && (
              <div className="flex-1 min-w-0">
                <ErrorMessage message={error} onRetry={() => setError(null)} />
              </div>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className={`ml-auto flex items-center gap-2 px-6 py-2.5 rounded-lg text-sm font-medium transition-all
                ${canSubmit ? 'bg-violet-600 hover:bg-violet-500 text-white' : 'bg-gray-800 text-gray-600 cursor-not-allowed'}`}
            >
              Analizar producto
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
              </svg>
            </button>
          </div>
        </div>
      </form>

      {/* Overlay de carga */}
      {cargando && (
        <div className="fixed inset-0 bg-gray-950/90 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-6">
          <div className="w-16 h-16 border-4 border-gray-800 border-t-violet-500 rounded-full animate-spin" />
          <div className="text-center">
            <p className="text-white text-lg font-medium">{mensajeCarga}</p>
            <p className="text-gray-500 text-sm mt-1">
              {mensajeCarga === 'Analizando con IA...' ? 'Esto puede tardar hasta 60 segundos' : 'Por favor esperá...'}
            </p>
            <p className="text-violet-400 text-sm font-mono mt-2">{segundos}s</p>
          </div>
          <div className="flex gap-2 mt-2">
            {['Subiendo imágenes...', 'Analizando con IA...'].map((paso, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all duration-500 ${
                  mensajeCarga === paso
                    ? 'w-8 bg-violet-500'
                    : mensajeCarga === 'Analizando con IA...' && i === 0
                    ? 'w-4 bg-violet-800'
                    : 'w-4 bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
