'use client'
import { useState, useEffect } from 'react'
import TemplateCard from './TemplateCard'

const SECCIONES = ['HERO', 'OFERTA', 'CARRUSEL', 'STORY', 'TESTIMONIAL']

const TRIGGER_BADGE = {
  'Pain/Problem':      { label: 'Dolor', color: 'bg-red-900/30 text-red-400 border-red-800/40' },
  'Aspiration':        { label: 'Aspiración', color: 'bg-purple-900/30 text-purple-400 border-purple-800/40' },
  'Social proof / belonging': { label: 'Social', color: 'bg-blue-900/30 text-blue-400 border-blue-800/40' },
  'Fear / urgency':    { label: 'Urgencia', color: 'bg-orange-900/30 text-orange-400 border-orange-800/40' },
  'Curiosity / novelty': { label: 'Curiosidad', color: 'bg-teal-900/30 text-teal-400 border-teal-800/40' },
  'Value / deal':      { label: 'Valor', color: 'bg-green-900/30 text-green-400 border-green-800/40' },
  'Authority / expertise': { label: 'Autoridad', color: 'bg-indigo-900/30 text-indigo-400 border-indigo-800/40' },
  'Transformation':    { label: 'Transformación', color: 'bg-pink-900/30 text-pink-400 border-pink-800/40' },
}

/**
 * Step3Templates — Paso 3: galería de templates.
 * Props:
 *   session: { analisisCompleto, anguloSeleccionado, nombreProducto, imagenesUrls }
 *   onBack: () => void
 *   onTemplateSeleccionado: (template) => void
 */
export default function Step3Templates({ session, onBack, onTemplateSeleccionado }) {
  const { anguloSeleccionado, nombreProducto } = session

  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorCarga, setErrorCarga] = useState(null)

  const [filtro, setFiltro] = useState('TODOS')
  const [seleccionado, setSeleccionado] = useState(null)
  const [analizandoId, setAnalizandoId] = useState(null)
  const [errorAnalisis, setErrorAnalisis] = useState(null)

  useEffect(() => {
    async function fetchTemplates() {
      setLoading(true)
      setErrorCarga(null)
      try {
        const res = await fetch('/api/templates')
        const json = await res.json()
        if (!json.success) throw new Error(json.error)
        setTemplates(json.templates)
      } catch (err) {
        setErrorCarga(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchTemplates()
  }, [])

  async function handleSeleccionarTemplate(template) {
    // Deselect
    if (seleccionado?.id === template.id) {
      setSeleccionado(null)
      return
    }

    // Already analyzed — select immediately
    if (template.style_guide) {
      setSeleccionado(template)
      setErrorAnalisis(null)
      return
    }

    // Needs analysis (first time used)
    setAnalizandoId(template.id)
    setErrorAnalisis(null)
    setSeleccionado(null)

    try {
      const res = await fetch('/api/analyze-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ template_id: template.id }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)

      const actualizado = { ...template, style_guide: json.style_guide }
      setTemplates(prev => prev.map(t => t.id === template.id ? actualizado : t))
      setSeleccionado(actualizado)
    } catch (err) {
      setErrorAnalisis(`No se pudo analizar el template: ${err.message}`)
    } finally {
      setAnalizandoId(null)
    }
  }

  function handleContinuar() {
    if (!seleccionado || analizandoId) return
    onTemplateSeleccionado(seleccionado)
  }

  const templatesFiltrados = filtro === 'TODOS'
    ? templates
    : templates.filter(t => t.seccion === filtro)

  const trigger = anguloSeleccionado?.psychological_trigger
  const triggerInfo = TRIGGER_BADGE[trigger]

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
          <p className="text-xs text-gray-500 mt-0.5">Paso 3 de 4 · Elegí tu template</p>
        </div>
        {seleccionado && (
          <button
            onClick={handleContinuar}
            disabled={!!analizandoId}
            className="flex-shrink-0 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
          >
            Continuar
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5-5 5M6 12h12" />
            </svg>
          </button>
        )}
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">

        {/* Ángulo seleccionado — chip recordatorio */}
        <div className="mb-6 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-500">Ángulo seleccionado:</span>
          <span className="text-xs font-semibold text-gray-300 bg-gray-800 border border-gray-700 px-3 py-1 rounded-full">
            {anguloSeleccionado?.angle_name}
          </span>
          {triggerInfo && (
            <span className={`text-xs px-2.5 py-1 rounded-full border ${triggerInfo.color}`}>
              {triggerInfo.label}
            </span>
          )}
          <span className="text-xs text-gray-600 ml-auto">
            Elegí el formato que mejor encaja con la plataforma.
          </span>
        </div>

        {/* Filtro de sección */}
        <div className="flex flex-wrap gap-2 mb-6">
          {['TODOS', ...SECCIONES].map(s => {
            const count = s === 'TODOS' ? templates.length : templates.filter(t => t.seccion === s).length
            return (
              <button
                key={s}
                onClick={() => setFiltro(s)}
                className={`text-xs font-medium px-3.5 py-1.5 rounded-full border transition-all ${
                  filtro === s
                    ? 'bg-gray-700 border-gray-500 text-white'
                    : 'border-gray-800 text-gray-500 hover:border-gray-700 hover:text-gray-400'
                }`}
              >
                {s}
                {count > 0 && (
                  <span className={`ml-1.5 ${filtro === s ? 'text-gray-300' : 'text-gray-700'}`}>
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {/* Error de carga */}
        {errorCarga && (
          <div className="text-center py-12">
            <p className="text-sm text-red-400 mb-3">{errorCarga}</p>
            <button
              onClick={() => window.location.reload()}
              className="text-xs text-gray-500 hover:text-gray-300 underline"
            >
              Reintentar
            </button>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              <div key={i} className="rounded-xl overflow-hidden border border-gray-800 animate-pulse">
                <div className="aspect-[9/16] bg-gray-800" />
                <div className="p-2.5 bg-gray-900">
                  <div className="h-3 bg-gray-800 rounded w-3/4 mb-2" />
                  <div className="h-2.5 bg-gray-800 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !errorCarga && templatesFiltrados.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 gap-3">
            <svg className="w-10 h-10 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-500">
              {filtro === 'TODOS'
                ? 'No hay templates cargados. Subí algunos desde /admin.'
                : `No hay templates de tipo ${filtro} aún.`
              }
            </p>
          </div>
        )}

        {/* Grid de templates */}
        {!loading && !errorCarga && templatesFiltrados.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {templatesFiltrados.map(t => (
              <TemplateCard
                key={t.id}
                template={t}
                seleccionado={seleccionado?.id === t.id}
                analizando={analizandoId === t.id}
                onClick={() => handleSeleccionarTemplate(t)}
              />
            ))}
          </div>
        )}

        {/* Error de análisis */}
        {errorAnalisis && (
          <div className="mt-4 text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-4 py-3">
            {errorAnalisis}
          </div>
        )}

        {/* Bottom CTA */}
        {seleccionado && (
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleContinuar}
              disabled={!!analizandoId}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium px-8 py-3 rounded-lg transition-all"
            >
              Continuar con &ldquo;{seleccionado.nombre}&rdquo;
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
