'use client'
import { useState, useEffect, useRef } from 'react'

const PASOS_LOADING = [
  { label: 'Analizando producto y contexto...', duracion: 4000 },
  { label: 'Claude construyendo prompt visual...', duracion: 8000 },
  { label: 'Gemini generando imagen...', duracion: 99999 },
]

const PASOS_EDIT = [
  { label: 'Claude integrando cambios...', duracion: 5000 },
  { label: 'Gemini generando imagen...', duracion: 99999 },
]

const SECCION_COLORS = {
  HERO:        'bg-violet-900/30 text-violet-400 border-violet-800/40',
  OFERTA:      'bg-amber-900/30 text-amber-400 border-amber-800/40',
  CARRUSEL:    'bg-blue-900/30 text-blue-400 border-blue-800/40',
  STORY:       'bg-green-900/30 text-green-400 border-green-800/40',
  TESTIMONIAL: 'bg-rose-900/30 text-rose-400 border-rose-800/40',
}

const MAX_VERSIONES = 5

/**
 * Step4Generate — Paso 4: genera el anuncio final.
 * Props:
 *   session: { nombreProducto, descripcion, imagenesUrls, anguloSeleccionado, templateSeleccionado }
 *   onBack: () => void
 *   onNuevaCampania: () => void
 */
export default function Step4Generate({ session, onBack, onNuevaCampania }) {
  const { nombreProducto, descripcion, imagenesUrls, anguloSeleccionado: angulo, templateSeleccionado: template, productoId } = session

  const [estado, setEstado] = useState('idle') // idle | loading | done | error
  const [imagenUrl, setImagenUrl] = useState(null)
  const [geminiPrompt, setGeminiPrompt] = useState(null)
  const [error, setError] = useState(null)
  const [pasoActual, setPasoActual] = useState(0)
  const [showPrompt, setShowPrompt] = useState(false)

  // Edit state
  const [userEdits, setUserEdits] = useState('')
  const [estadoEdit, setEstadoEdit] = useState('idle') // idle | loading | error
  const [errorEdit, setErrorEdit] = useState(null)
  const [pasoEdit, setPasoEdit] = useState(0)

  // Version history: [{ imagenUrl, geminiPrompt }], most recent first
  const [versiones, setVersiones] = useState([])

  const timersRef = useRef([])
  const editTimersRef = useRef([])

  function limpiarTimers() {
    timersRef.current.forEach(clearTimeout)
    timersRef.current = []
  }

  function limpiarEditTimers() {
    editTimersRef.current.forEach(clearTimeout)
    editTimersRef.current = []
  }

  useEffect(() => () => { limpiarTimers(); limpiarEditTimers() }, [])

  function avanzarPasos(idx = 0) {
    if (idx >= PASOS_LOADING.length - 1) return
    const t = setTimeout(() => {
      setPasoActual(idx + 1)
      avanzarPasos(idx + 1)
    }, PASOS_LOADING[idx].duracion)
    timersRef.current.push(t)
  }

  function avanzarPasosEdit(idx = 0) {
    if (idx >= PASOS_EDIT.length - 1) return
    const t = setTimeout(() => {
      setPasoEdit(idx + 1)
      avanzarPasosEdit(idx + 1)
    }, PASOS_EDIT[idx].duracion)
    editTimersRef.current.push(t)
  }

  function pushVersion(url, prompt) {
    setVersiones(prev => [{ imagenUrl: url, geminiPrompt: prompt }, ...prev].slice(0, MAX_VERSIONES))
  }

  async function handleGenerar() {
    setEstado('loading')
    setError(null)
    setImagenUrl(null)
    setGeminiPrompt(null)
    setPasoActual(0)
    limpiarTimers()
    avanzarPasos(0)

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreProducto,
          descripcion,
          imagenesUrls,
          angulo,
          template,
          producto_id: productoId || null,
        }),
      })

      const json = await res.json()
      limpiarTimers()

      if (!json.success) throw new Error(json.error || 'Error al generar')

      pushVersion(json.imagen_url, json.gemini_prompt)
      setImagenUrl(json.imagen_url)
      setGeminiPrompt(json.gemini_prompt)
      setEstado('done')
    } catch (err) {
      limpiarTimers()
      setError(err.message)
      setEstado('error')
    }
  }

  async function handleAplicarCambios() {
    if (!userEdits.trim() || !geminiPrompt) return

    setEstadoEdit('loading')
    setErrorEdit(null)
    setPasoEdit(0)
    limpiarEditTimers()
    avanzarPasosEdit(0)

    try {
      const res = await fetch('/api/edit-generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geminiPrompt,
          userEdits: userEdits.trim(),
          imagenesUrls,
          template,
          producto_id: productoId || null,
        }),
      })

      const json = await res.json()
      limpiarEditTimers()

      if (!json.success) throw new Error(json.error || 'Error al aplicar cambios')

      pushVersion(json.imagen_url, json.gemini_prompt)
      setImagenUrl(json.imagen_url)
      setGeminiPrompt(json.gemini_prompt)
      setUserEdits('')
      setEstadoEdit('idle')
    } catch (err) {
      limpiarEditTimers()
      setErrorEdit(err.message)
      setEstadoEdit('error')
    }
  }

  function handleRestoreVersion(version) {
    setImagenUrl(version.imagenUrl)
    setGeminiPrompt(version.geminiPrompt)
  }

  function handleDescargar() {
    if (!imagenUrl) return
    const a = document.createElement('a')
    a.href = imagenUrl
    a.download = `adgen-${template?.nombre?.replace(/\s+/g, '-').toLowerCase()}-${Date.now()}.png`
    a.target = '_blank'
    a.click()
  }

  const seccionColor = SECCION_COLORS[template?.seccion] || 'bg-gray-800 text-gray-400 border-gray-700'
  const editando = estadoEdit === 'loading'

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
          <p className="text-xs text-gray-500 mt-0.5">Paso 4 de 4 · Generar anuncio</p>
        </div>
        {estado === 'done' && (
          <button
            onClick={onNuevaCampania}
            className="flex-shrink-0 text-xs text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-all"
          >
            Nueva campaña
          </button>
        )}
      </header>

      <div className="flex-1 max-w-5xl mx-auto w-full px-6 py-8 flex flex-col lg:flex-row gap-8">

        {/* ── Sidebar: resumen de sesión ─────────────────────────────────── */}
        <aside className="lg:w-64 flex-shrink-0 flex flex-col gap-4">

          {/* Template */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
            {template?.imagen_url && (
              <div className="aspect-[9/16] bg-gray-800 overflow-hidden">
                <img
                  src={template.imagen_url}
                  alt={template.nombre}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="p-3 flex flex-col gap-1.5">
              <p className="text-xs font-semibold text-gray-200 line-clamp-1">{template?.nombre}</p>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border w-fit ${seccionColor}`}>
                {template?.seccion}
              </span>
            </div>
          </div>

          {/* Ángulo */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex flex-col gap-2">
            <p className="text-[10px] text-gray-600 font-semibold uppercase tracking-wider">Ángulo</p>
            <p className="text-xs font-semibold text-violet-400">{angulo?.angle_name}</p>
            <p className="text-xs text-gray-400 italic leading-snug line-clamp-3">
              &ldquo;{angulo?.copy?.hook}&rdquo;
            </p>
            <div className="pt-1 border-t border-gray-800">
              <p className="text-[10px] text-gray-600">Titular</p>
              <p className="text-xs text-gray-300 line-clamp-2 mt-0.5">{angulo?.copy?.headline}</p>
            </div>
            {angulo?.target_avatar && (
              <div className="pt-1 border-t border-gray-800">
                <p className="text-[10px] text-gray-600">Avatar</p>
                <p className="text-xs text-gray-400 line-clamp-2 mt-0.5">{angulo.target_avatar.description}</p>
              </div>
            )}
          </div>
        </aside>

        {/* ── Main: área de generación ────────────────────────────────────── */}
        <main className="flex-1 flex flex-col gap-6">

          {/* Estado: idle */}
          {estado === 'idle' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12">
              <div className="text-center max-w-sm">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-violet-900/30 border border-violet-800/40 flex items-center justify-center">
                  <svg className="w-8 h-8 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <h2 className="text-lg font-semibold text-white mb-2">Todo listo para generar</h2>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Claude va a construir el prompt visual y luego Gemini lo convierte en imagen.
                  Tarda entre 20 y 40 segundos.
                </p>
              </div>

              <button
                onClick={handleGenerar}
                className="flex items-center gap-2.5 bg-violet-600 hover:bg-violet-500 text-white font-semibold px-8 py-3.5 rounded-xl transition-all shadow-lg shadow-violet-900/30 hover:shadow-violet-900/50"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                Generar anuncio
              </button>
            </div>
          )}

          {/* Estado: loading */}
          {estado === 'loading' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-8 py-12">
              <div className="relative w-48 aspect-[9/16] rounded-xl overflow-hidden bg-gray-900 border border-gray-800">
                <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 to-gray-900 animate-pulse" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="w-8 h-8 border-2 border-violet-400/20 border-t-violet-400 rounded-full animate-spin" />
                </div>
              </div>

              <div className="flex flex-col gap-3 w-full max-w-sm">
                {PASOS_LOADING.map((paso, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 transition-all duration-500 ${
                      idx < pasoActual ? 'opacity-40' : idx === pasoActual ? 'opacity-100' : 'opacity-25'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${
                      idx < pasoActual
                        ? 'bg-green-500/20 border border-green-500/40'
                        : idx === pasoActual
                          ? 'border border-violet-400/40'
                          : 'border border-gray-700'
                    }`}>
                      {idx < pasoActual ? (
                        <svg className="w-3 h-3 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : idx === pasoActual ? (
                        <span className="w-2 h-2 bg-violet-400 rounded-full animate-pulse" />
                      ) : null}
                    </div>
                    <span className={`text-sm ${idx === pasoActual ? 'text-gray-200' : 'text-gray-600'}`}>
                      {paso.label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado: error */}
          {estado === 'error' && (
            <div className="flex-1 flex flex-col items-center justify-center gap-6 py-12">
              <div className="text-center max-w-sm">
                <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-red-900/20 border border-red-800/40 flex items-center justify-center">
                  <svg className="w-7 h-7 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <p className="text-sm text-red-400 mb-4">{error}</p>
              </div>
              <button
                onClick={handleGenerar}
                className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Reintentar
              </button>
            </div>
          )}

          {/* Estado: done */}
          {estado === 'done' && imagenUrl && (
            <div className="flex flex-col gap-6">

              {/* Imagen generada */}
              <div className="flex justify-center">
                <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-violet-900/20 border border-gray-800 max-w-sm w-full">
                  <img
                    src={imagenUrl}
                    alt="Anuncio generado"
                    className={`w-full object-contain transition-opacity duration-300 ${editando ? 'opacity-30' : 'opacity-100'}`}
                  />
                  {/* Overlay de edición */}
                  {editando && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                      <span className="w-8 h-8 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                      <div className="flex flex-col gap-2 w-44">
                        {PASOS_EDIT.map((paso, idx) => (
                          <div
                            key={idx}
                            className={`flex items-center gap-2 transition-all duration-500 ${
                              idx < pasoEdit ? 'opacity-40' : idx === pasoEdit ? 'opacity-100' : 'opacity-25'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center ${
                              idx < pasoEdit
                                ? 'bg-green-500/20 border border-green-500/40'
                                : idx === pasoEdit
                                  ? 'border border-violet-400/40'
                                  : 'border border-gray-700'
                            }`}>
                              {idx < pasoEdit ? (
                                <svg className="w-2.5 h-2.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                </svg>
                              ) : idx === pasoEdit ? (
                                <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" />
                              ) : null}
                            </div>
                            <span className={`text-xs ${idx === pasoEdit ? 'text-gray-200' : 'text-gray-600'}`}>
                              {paso.label}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Acciones principales */}
              <div className="flex flex-wrap gap-3 justify-center">
                <button
                  onClick={handleDescargar}
                  disabled={editando}
                  className="flex items-center gap-2 bg-white text-gray-900 font-semibold text-sm px-6 py-2.5 rounded-lg hover:bg-gray-100 transition-all disabled:opacity-40"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar
                </button>

                <button
                  onClick={handleGenerar}
                  disabled={editando}
                  className="flex items-center gap-2 border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white text-sm px-6 py-2.5 rounded-lg transition-all disabled:opacity-40"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Regenerar
                </button>

                <button
                  onClick={onNuevaCampania}
                  disabled={editando}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-all disabled:opacity-40"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Nueva campaña
                </button>
              </div>

              {/* Caja de edición */}
              <div className="border border-gray-800 rounded-xl p-4 flex flex-col gap-3">
                <p className="text-xs font-medium text-gray-500">Refinar imagen</p>
                <div className="flex gap-2 items-end">
                  <textarea
                    value={userEdits}
                    onChange={e => setUserEdits(e.target.value)}
                    disabled={editando}
                    rows={2}
                    placeholder="Ej: que el jugador se vea de rodillas para abajo, cambiar efecto a color cyan, hacer headline más grande..."
                    className="flex-1 text-sm bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-gray-600 disabled:opacity-40"
                  />
                  <button
                    onClick={handleAplicarCambios}
                    disabled={editando || !userEdits.trim()}
                    className="flex-shrink-0 flex items-center gap-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Aplicar
                  </button>
                </div>
                {estadoEdit === 'error' && errorEdit && (
                  <p className="text-xs text-red-400">{errorEdit}</p>
                )}
              </div>

              {/* Historial de versiones */}
              {versiones.length > 1 && (
                <div className="flex flex-col gap-2">
                  <p className="text-xs font-medium text-gray-600">Versiones</p>
                  <div className="flex gap-2 overflow-x-auto pb-1">
                    {versiones.map((v, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleRestoreVersion(v)}
                        disabled={editando}
                        title={`Versión ${versiones.length - idx}`}
                        className={`flex-shrink-0 w-16 aspect-[9/16] rounded-lg overflow-hidden border transition-all disabled:opacity-40 ${
                          v.imagenUrl === imagenUrl
                            ? 'border-violet-500 ring-1 ring-violet-500/50'
                            : 'border-gray-700 hover:border-gray-600'
                        }`}
                      >
                        <img
                          src={v.imagenUrl}
                          alt={`Versión ${versiones.length - idx}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Prompt expandible */}
              {geminiPrompt && (
                <div className="border border-gray-800 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setShowPrompt(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-gray-900/50 transition-colors"
                  >
                    <span className="text-xs font-medium text-gray-500">Ver prompt de Gemini</span>
                    <svg
                      className={`w-4 h-4 text-gray-600 transition-transform ${showPrompt ? 'rotate-180' : ''}`}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  {showPrompt && (
                    <div className="px-4 pb-4 border-t border-gray-800">
                      <pre className="text-[11px] text-gray-500 whitespace-pre-wrap leading-relaxed mt-3 font-mono">
                        {geminiPrompt}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
