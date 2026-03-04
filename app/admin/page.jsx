'use client'
import { useState, useRef, useCallback, useEffect } from 'react'

const SECCIONES = ['HERO', 'OFERTA', 'CARRUSEL', 'STORY', 'TESTIMONIAL']

const SECCION_COLORS = {
  HERO:        'bg-violet-900/30 text-violet-400 border-violet-800/40',
  OFERTA:      'bg-amber-900/30 text-amber-400 border-amber-800/40',
  CARRUSEL:    'bg-blue-900/30 text-blue-400 border-blue-800/40',
  STORY:       'bg-green-900/30 text-green-400 border-green-800/40',
  TESTIMONIAL: 'bg-rose-900/30 text-rose-400 border-rose-800/40',
}

function cleanName(filename) {
  return filename
    .replace(/\.[^/.]+$/, '')
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())
    .trim()
}

export default function AdminPage() {
  const [seccion, setSeccion] = useState('HERO')
  const [filasSeleccionadas, setFilasSeleccionadas] = useState([]) // { file, name, status, error }
  const [subiendo, setSubiendo] = useState(false)
  const [dragging, setDragging] = useState(false)

  const [templates, setTemplates] = useState([])
  const [loadingTemplates, setLoadingTemplates] = useState(true)
  const [filtro, setFiltro] = useState('TODOS')

  const inputRef = useRef(null)

  // Load templates
  async function cargarTemplates() {
    setLoadingTemplates(true)
    try {
      const res = await fetch('/api/admin/templates')
      const json = await res.json()
      if (json.success) setTemplates(json.templates)
    } finally {
      setLoadingTemplates(false)
    }
  }

  useEffect(() => { cargarTemplates() }, [])

  // File selection
  function agregarArchivos(files) {
    const nuevas = Array.from(files)
      .filter(f => f.type.startsWith('image/'))
      .map(f => ({ file: f, name: cleanName(f.name), status: 'pending', error: null }))
    setFilasSeleccionadas(prev => [...prev, ...nuevas])
  }

  // Drag & drop
  const onDrop = useCallback((e) => {
    e.preventDefault()
    setDragging(false)
    agregarArchivos(e.dataTransfer.files)
  }, [])

  const onDragOver = useCallback((e) => { e.preventDefault(); setDragging(true) }, [])
  const onDragLeave = useCallback(() => setDragging(false), [])

  function actualizarNombre(idx, value) {
    setFilasSeleccionadas(prev => prev.map((f, i) => i === idx ? { ...f, name: value } : f))
  }

  function eliminarFila(idx) {
    setFilasSeleccionadas(prev => prev.filter((_, i) => i !== idx))
  }

  // Upload
  async function handleSubir() {
    if (!filasSeleccionadas.length || subiendo) return
    setSubiendo(true)

    for (let i = 0; i < filasSeleccionadas.length; i++) {
      const fila = filasSeleccionadas[i]
      if (fila.status === 'done') continue

      setFilasSeleccionadas(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'uploading' } : f))

      try {
        const formData = new FormData()
        formData.append('file', fila.file)
        formData.append('seccion', seccion)
        formData.append('nombre', fila.name || cleanName(fila.file.name))

        const res = await fetch('/api/admin/upload-template', { method: 'POST', body: formData })
        const json = await res.json()

        if (!json.success) throw new Error(json.error)
        setFilasSeleccionadas(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'done' } : f))
      } catch (err) {
        setFilasSeleccionadas(prev => prev.map((f, idx) => idx === i ? { ...f, status: 'error', error: err.message } : f))
      }
    }

    setSubiendo(false)
    cargarTemplates()
  }

  // Delete template
  async function handleEliminar(id) {
    if (!confirm('¿Eliminar este template?')) return
    await fetch(`/api/admin/templates?id=${id}`, { method: 'DELETE' })
    setTemplates(prev => prev.filter(t => t.id !== id))
  }

  const templatesFiltrados = filtro === 'TODOS' ? templates : templates.filter(t => t.seccion === filtro)
  const pendienteCount = filasSeleccionadas.filter(f => f.status === 'pending').length
  const doneCount = filasSeleccionadas.filter(f => f.status === 'done').length

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold">Admin · ADGEN</h1>
          <p className="text-xs text-gray-500 mt-0.5">Gestión de templates</p>
        </div>
        <a href="/" className="text-xs text-gray-600 hover:text-gray-400 transition-colors">
          ← Volver al app
        </a>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8 flex flex-col gap-10">

        {/* ── SUBIR TEMPLATES ── */}
        <section>
          <h2 className="text-sm font-semibold text-gray-200 mb-1">Subir templates</h2>
          <p className="text-xs text-gray-500 mb-5">
            Seleccioná la sección, arrastrá las imágenes y editá los nombres. El análisis se corre solo la primera vez que alguien use el template.
          </p>

          {/* Selector de sección */}
          <div className="flex flex-wrap gap-2 mb-5">
            {SECCIONES.map(s => (
              <button
                key={s}
                onClick={() => setSeccion(s)}
                className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${
                  seccion === s
                    ? SECCION_COLORS[s]
                    : 'border-gray-700 text-gray-500 hover:border-gray-600 hover:text-gray-400'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Drop zone */}
          <div
            onDrop={onDrop}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onClick={() => inputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl px-6 py-10 text-center cursor-pointer transition-all ${
              dragging
                ? 'border-violet-500 bg-violet-950/30'
                : 'border-gray-700 hover:border-gray-600 bg-gray-900/50'
            }`}
          >
            <svg className="w-8 h-8 mx-auto mb-3 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-sm text-gray-400">
              Arrastrá imágenes acá o <span className="text-violet-400 underline underline-offset-2">elegí archivos</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">PNG, JPG, WEBP · Podés seleccionar varios a la vez</p>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => agregarArchivos(e.target.files)}
            />
          </div>

          {/* Lista de archivos seleccionados */}
          {filasSeleccionadas.length > 0 && (
            <div className="mt-4 flex flex-col gap-2">
              {filasSeleccionadas.map((fila, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 rounded-lg px-4 py-3 border transition-all ${
                    fila.status === 'done'    ? 'bg-green-900/10 border-green-800/30' :
                    fila.status === 'error'   ? 'bg-red-900/10 border-red-800/30' :
                    fila.status === 'uploading' ? 'bg-violet-900/10 border-violet-800/30' :
                    'bg-gray-900 border-gray-800'
                  }`}
                >
                  {/* Thumbnail */}
                  <img
                    src={URL.createObjectURL(fila.file)}
                    alt=""
                    className="w-10 h-10 rounded object-cover flex-shrink-0"
                  />

                  {/* Name input */}
                  <input
                    type="text"
                    value={fila.name}
                    onChange={e => actualizarNombre(idx, e.target.value)}
                    disabled={fila.status !== 'pending'}
                    className="flex-1 bg-transparent text-sm text-white placeholder-gray-600 focus:outline-none disabled:text-gray-500"
                  />

                  {/* Status */}
                  <div className="flex-shrink-0 flex items-center gap-2">
                    {fila.status === 'pending' && (
                      <span className="text-xs text-gray-500">Pendiente</span>
                    )}
                    {fila.status === 'uploading' && (
                      <span className="w-3.5 h-3.5 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
                    )}
                    {fila.status === 'done' && (
                      <span className="text-xs text-green-400">✓ Subido</span>
                    )}
                    {fila.status === 'error' && (
                      <span className="text-xs text-red-400" title={fila.error}>✗ Error</span>
                    )}
                    {fila.status === 'pending' && (
                      <button
                        onClick={() => eliminarFila(idx)}
                        className="text-gray-600 hover:text-gray-400 transition-colors ml-1"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}

              {/* Actions */}
              <div className="flex items-center justify-between mt-2">
                <button
                  onClick={() => setFilasSeleccionadas([])}
                  className="text-xs text-gray-600 hover:text-gray-400 transition-colors"
                >
                  Limpiar todo
                </button>
                <button
                  onClick={handleSubir}
                  disabled={subiendo || pendienteCount === 0}
                  className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium px-6 py-2.5 rounded-lg transition-all"
                >
                  {subiendo ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Subiendo...
                    </>
                  ) : (
                    <>
                      Subir {pendienteCount > 0 ? `${pendienteCount} template${pendienteCount > 1 ? 's' : ''}` : 'templates'} como {seccion}
                    </>
                  )}
                </button>
              </div>

              {doneCount > 0 && doneCount === filasSeleccionadas.length && (
                <p className="text-xs text-green-400 text-center mt-1">
                  ✓ Todos los templates subidos correctamente
                </p>
              )}
            </div>
          )}
        </section>

        {/* ── TEMPLATES GUARDADOS ── */}
        <section>
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <h2 className="text-sm font-semibold text-gray-200">
              Templates guardados{' '}
              <span className="text-gray-600 font-normal">({templates.length})</span>
            </h2>

            {/* Filtro de sección */}
            <div className="flex flex-wrap gap-1.5">
              {['TODOS', ...SECCIONES].map(s => (
                <button
                  key={s}
                  onClick={() => setFiltro(s)}
                  className={`text-xs px-3 py-1 rounded-full border transition-all ${
                    filtro === s
                      ? s === 'TODOS'
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : SECCION_COLORS[s]
                      : 'border-gray-800 text-gray-600 hover:border-gray-700 hover:text-gray-500'
                  }`}
                >
                  {s}
                  {s !== 'TODOS' && (
                    <span className="ml-1 opacity-60">
                      {templates.filter(t => t.seccion === s).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {loadingTemplates ? (
            <div className="flex items-center justify-center py-16">
              <span className="w-6 h-6 border-2 border-gray-700 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : templatesFiltrados.length === 0 ? (
            <div className="border border-dashed border-gray-800 rounded-xl py-12 text-center">
              <p className="text-gray-600 text-sm">
                {filtro === 'TODOS' ? 'No hay templates aún. Subí el primero arriba.' : `No hay templates de tipo ${filtro} aún.`}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {templatesFiltrados.map(t => (
                <div key={t.id} className="group relative rounded-xl overflow-hidden bg-gray-900 border border-gray-800 hover:border-gray-700 transition-all">
                  {/* Thumbnail */}
                  <div className="aspect-[9/16] bg-gray-800 overflow-hidden">
                    <img
                      src={t.imagen_url}
                      alt={t.nombre}
                      className="w-full h-full object-cover"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-3 flex flex-col gap-1.5">
                    <p className="text-xs font-medium text-white leading-tight line-clamp-1">{t.nombre}</p>
                    <div className="flex items-center justify-between gap-1 flex-wrap">
                      <span className={`text-xs px-1.5 py-0.5 rounded border ${SECCION_COLORS[t.seccion] || 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                        {t.seccion}
                      </span>
                      <span className={`text-xs ${t.style_guide ? 'text-green-500' : 'text-gray-600'}`}>
                        {t.style_guide ? '✓ Analizado' : 'Sin analizar'}
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <button
                    onClick={() => handleEliminar(t.id)}
                    className="absolute top-2 right-2 w-7 h-7 bg-gray-950/80 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-900/60"
                  >
                    <svg className="w-3.5 h-3.5 text-gray-400 hover:text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
