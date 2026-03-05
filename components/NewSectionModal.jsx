'use client'
import { useState, useRef } from 'react'
import { SECTION_CONFIG } from '@/lib/section-prompts'

const SECTION_TYPES = Object.entries(SECTION_CONFIG).map(([key, val]) => ({ key, ...val }))

/**
 * NewSectionModal — flujo para generar una nueva sección de campaña.
 * 1. El usuario elige el tipo de sección
 * 2. Sube un template de referencia para la estructura (opcional)
 * 3. Se genera la imagen
 */
export default function NewSectionModal({ productoId, onClose, onGenerated, nextOrder }) {
  const [step, setStep] = useState('type') // type | template | generating
  const [sectionType, setSectionType] = useState(null)
  const [templateFile, setTemplateFile] = useState(null)
  const [templatePreview, setTemplatePreview] = useState(null)
  const [templateBase64, setTemplateBase64] = useState(null)
  const [templateMime, setTemplateMime] = useState('image/jpeg')
  const [error, setError] = useState(null)
  const fileInputRef = useRef(null)

  function handleTemplateFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    setTemplateFile(file)
    const reader = new FileReader()
    reader.onload = ev => {
      const dataUrl = ev.target.result
      setTemplatePreview(dataUrl)
      const [header, data] = dataUrl.split(',')
      const mime = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
      setTemplateBase64(data)
      setTemplateMime(mime)
    }
    reader.readAsDataURL(file)
  }

  async function handleGenerate() {
    setStep('generating')
    setError(null)
    try {
      const res = await fetch('/api/generate-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          producto_id: productoId,
          section_type: sectionType,
          template_image_base64: templateBase64 || null,
          template_image_mime: templateMime,
          section_order: nextOrder,
        }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      onGenerated({
        id: json.generacion_id,
        imagen_url: json.imagen_url,
        gemini_prompt: json.gemini_prompt,
        section_type: sectionType,
        section_order: nextOrder,
        version_history: [],
      })
      onClose()
    } catch (err) {
      setError(err.message)
      setStep('template')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-lg p-6 flex flex-col gap-5" onClick={e => e.stopPropagation()}>

        {step === 'type' && (
          <>
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-gray-100">Nueva sección</h2>
              <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-lg leading-none">✕</button>
            </div>
            <p className="text-xs text-gray-500">Elegí qué tipo de sección vas a generar para esta campaña.</p>
            <div className="grid grid-cols-2 gap-2">
              {SECTION_TYPES.map(({ key, label, description }) => (
                <button
                  key={key}
                  onClick={() => { setSectionType(key); setStep('template') }}
                  className="text-left p-3 rounded-xl border border-gray-800 hover:border-violet-700 hover:bg-violet-900/10 transition-all group"
                >
                  <p className="text-xs font-semibold text-gray-200 group-hover:text-violet-300 mb-1">{label}</p>
                  <p className="text-[10px] text-gray-600 leading-tight">{description}</p>
                </button>
              ))}
            </div>
          </>
        )}

        {step === 'template' && (
          <>
            <div className="flex items-center gap-3">
              <button onClick={() => setStep('type')} className="text-gray-600 hover:text-gray-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <h2 className="text-sm font-semibold text-gray-100 flex-1">
                {SECTION_CONFIG[sectionType]?.label}
              </h2>
              <button onClick={onClose} className="text-gray-600 hover:text-gray-400 text-lg leading-none">✕</button>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-3">
                Subí un template de referencia para la <strong>estructura</strong> de esta sección. Los colores y tipografía vendrán de la guía de estilo de la campaña (si está activa).
              </p>

              <label className={`flex flex-col items-center justify-center w-full h-40 rounded-xl border-2 border-dashed cursor-pointer transition-all overflow-hidden ${
                templatePreview ? 'border-gray-700' : 'border-gray-700 hover:border-violet-700'
              }`}>
                {templatePreview ? (
                  <img src={templatePreview} alt="Template" className="w-full h-full object-contain" />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-600">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-xs">Subir template (opcional)</span>
                  </div>
                )}
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleTemplateFile} />
              </label>
              {templatePreview && (
                <button onClick={() => { setTemplateFile(null); setTemplatePreview(null); setTemplateBase64(null) }}
                  className="mt-2 text-[10px] text-gray-600 hover:text-gray-400 underline">
                  Quitar template
                </button>
              )}
            </div>

            {error && (
              <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/30 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              onClick={handleGenerate}
              className="w-full flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium py-3 rounded-xl transition-all"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generar sección
            </button>
          </>
        )}

        {step === 'generating' && (
          <div className="flex flex-col items-center justify-center gap-4 py-8">
            <div className="w-10 h-10 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-200">Generando {SECTION_CONFIG[sectionType]?.label}...</p>
              <p className="text-xs text-gray-500 mt-1">Claude construye el prompt · Gemini genera la imagen</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
