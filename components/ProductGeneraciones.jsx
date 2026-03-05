'use client'
import { useState, useEffect, useRef } from 'react'
import StyleGuideButton from './StyleGuideButton'
import NewSectionModal from './NewSectionModal'
import { SECTION_CONFIG } from '@/lib/section-prompts'

const SECCION_COLORS = {
  HERO:        { badge: 'bg-violet-900/30 text-violet-400 border-violet-800/40', tab: 'bg-violet-600 text-white', inactive: 'text-violet-400 border-violet-800/40 hover:border-violet-600' },
  OFERTA:      { badge: 'bg-amber-900/30 text-amber-400 border-amber-800/40', tab: 'bg-amber-600 text-white', inactive: 'text-amber-400 border-amber-800/40 hover:border-amber-600' },
  CARRUSEL:    { badge: 'bg-blue-900/30 text-blue-400 border-blue-800/40', tab: 'bg-blue-600 text-white', inactive: 'text-blue-400 border-blue-800/40 hover:border-blue-600' },
  STORY:       { badge: 'bg-green-900/30 text-green-400 border-green-800/40', tab: 'bg-green-600 text-white', inactive: 'text-green-400 border-green-800/40 hover:border-green-600' },
  TESTIMONIAL: { badge: 'bg-rose-900/30 text-rose-400 border-rose-800/40', tab: 'bg-rose-600 text-white', inactive: 'text-rose-400 border-rose-800/40 hover:border-rose-600' },
}
const DEFAULT_COLOR = { badge: 'bg-gray-800 text-gray-400 border-gray-700', tab: 'bg-gray-600 text-white', inactive: 'text-gray-400 border-gray-700 hover:border-gray-500' }
const MAX_REF_IMAGES = 3

function seccionColor(sec) {
  return SECCION_COLORS[sec?.toUpperCase()] || DEFAULT_COLOR
}

function sectionLabel(sectionType) {
  if (!sectionType) return null
  return SECTION_CONFIG[sectionType]?.label || sectionType
}

function groupBySec(generaciones) {
  const grupos = {}
  for (const g of generaciones) {
    const sec = g.section_type || g.templates?.seccion || 'SIN SECCIÓN'
    if (!grupos[sec]) grupos[sec] = []
    grupos[sec].push(g)
  }
  // Sort within each group by section_order
  for (const sec of Object.keys(grupos)) {
    grupos[sec].sort((a, b) => (a.section_order ?? 0) - (b.section_order ?? 0))
  }
  return grupos
}

export default function ProductGeneraciones({ producto, generaciones: generacionesInit, loading = false, onBack, onGenerarNuevo, onEliminar }) {
  const [generaciones, setGeneraciones] = useState(generacionesInit)
  const [styleGuide, setStyleGuide] = useState(producto.style_guide || null)
  const [seccionActiva, setSeccionActiva] = useState(() => Object.keys(groupBySec(generacionesInit))[0] || null)
  const [showNewSection, setShowNewSection] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [fullscreen, setFullscreen] = useState(null)
  const [editingId, setEditingId] = useState(null)
  const [exportando, setExportando] = useState(false)
  const sectionRefs = useRef({})

  useEffect(() => {
    setGeneraciones(generacionesInit)
    setStyleGuide(producto.style_guide || null)
    const secs = Object.keys(groupBySec(generacionesInit))
    setSeccionActiva(prev => (secs.includes(prev) ? prev : secs[0] || null))
  }, [generacionesInit, producto.style_guide])

  function scrollToSection(sec) {
    setSeccionActiva(sec)
    sectionRefs.current[sec]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleDescargar(gen) {
    const a = document.createElement('a')
    a.href = gen.imagen_url
    a.download = `adgen-${(gen.section_type || gen.templates?.seccion || 'ad').toLowerCase()}-${gen.id}.png`
    a.target = '_blank'
    a.click()
  }

  async function handleEliminar(id) {
    setDeletingId(id)
    try {
      await fetch(`/api/generaciones/${id}`, { method: 'DELETE' })
      setGeneraciones(prev => prev.filter(g => g.id !== id))
      onEliminar(id)
    } catch {}
    setDeletingId(null)
    setConfirmDelete(null)
  }

  function handleEditDone(id, newImagenUrl, newGeminiPrompt, newVersionHistory) {
    setGeneraciones(prev => prev.map(g =>
      g.id === id ? { ...g, imagen_url: newImagenUrl, gemini_prompt: newGeminiPrompt, version_history: newVersionHistory } : g
    ))
    setFullscreen(prev => prev?.id === id ? { ...prev, imagen_url: newImagenUrl } : prev)
    setEditingId(null)
  }

  function handleRestoreVersion(genId, version) {
    setGeneraciones(prev => prev.map(g =>
      g.id === genId ? { ...g, imagen_url: version.imagen_url, gemini_prompt: version.gemini_prompt } : g
    ))
    setFullscreen(prev => prev?.id === genId ? { ...prev, imagen_url: version.imagen_url } : prev)
  }

  function handleStyleGuideExtracted(newStyleGuide) {
    setStyleGuide(newStyleGuide)
  }

  function handleNewSectionGenerated(generacion) {
    setGeneraciones(prev => [...prev, generacion])
  }

  // Drag & drop reordering within a section group
  const [dragId, setDragId] = useState(null)
  const [dragOverId, setDragOverId] = useState(null)

  function handleDragStart(e, genId) {
    setDragId(genId)
    e.dataTransfer.effectAllowed = 'move'
  }
  function handleDragOver(e, genId) {
    e.preventDefault()
    if (genId !== dragId) setDragOverId(genId)
  }
  function handleDrop(e, targetId) {
    e.preventDefault()
    if (!dragId || dragId === targetId) { setDragId(null); setDragOverId(null); return }
    setGeneraciones(prev => {
      const list = [...prev]
      const fromIdx = list.findIndex(g => g.id === dragId)
      const toIdx = list.findIndex(g => g.id === targetId)
      const [moved] = list.splice(fromIdx, 1)
      list.splice(toIdx, 0, moved)
      // Persist new order async
      const sectionIds = list.filter(g => (g.section_type || g.templates?.seccion) === (moved.section_type || moved.templates?.seccion))
      sectionIds.forEach((g, i) => {
        fetch(`/api/generaciones/${g.id}/reorder`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ section_order: i }),
        }).catch(() => {})
      })
      return list
    })
    setDragId(null)
    setDragOverId(null)
  }

  async function handleExportarZIP() {
    setExportando(true)
    try {
      const sorted = [...generaciones].sort((a, b) => (a.section_order ?? 0) - (b.section_order ?? 0))
      for (let i = 0; i < sorted.length; i++) {
        const gen = sorted[i]
        const sec = gen.section_type || gen.templates?.seccion || 'ad'
        const res = await fetch(gen.imagen_url)
        const blob = await res.blob()
        const ext = blob.type.split('/')[1] || 'png'
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `${String(i + 1).padStart(2, '0')}_${sec.toLowerCase()}.${ext}`
        a.click()
        URL.revokeObjectURL(a.href)
        await new Promise(r => setTimeout(r, 300))
      }
    } catch {}
    setExportando(false)
  }

  const gruposActuales = groupBySec(generaciones)
  const seccionesActuales = Object.keys(gruposActuales)
  const totalAds = generaciones.length
  const nextOrder = totalAds

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-gray-800 px-6 py-4 flex items-center gap-4 sticky top-0 bg-gray-950 z-10">
        <button onClick={onBack} className="text-gray-500 hover:text-gray-300 transition-colors">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-semibold truncate">{producto.nombre}</h1>
          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            <p className="text-xs text-gray-500">
              {loading ? 'Cargando...' : totalAds > 0 ? `${totalAds} sección${totalAds !== 1 ? 'es' : ''}` : 'Sin secciones'}
            </p>
            {styleGuide && (
              <span className="flex items-center gap-1 text-[10px] text-violet-400 bg-violet-900/20 border border-violet-800/30 px-2 py-0.5 rounded-full">
                🎨 Guía de estilo activa
                {styleGuide.source_image_url && (
                  <img src={styleGuide.source_image_url} alt="" className="w-4 h-4 object-cover rounded-sm ml-0.5" />
                )}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {totalAds > 0 && (
            <button
              onClick={handleExportarZIP}
              disabled={exportando}
              title="Exportar todas las secciones"
              className="text-xs text-gray-500 hover:text-gray-300 border border-gray-800 hover:border-gray-700 px-3 py-2 rounded-lg transition-all disabled:opacity-40"
            >
              {exportando ? '...' : '📥 Exportar'}
            </button>
          )}
          <button
            onClick={() => setShowNewSection(true)}
            className="flex items-center gap-1.5 text-xs border border-gray-700 hover:border-violet-600 text-gray-400 hover:text-violet-400 px-3 py-2 rounded-lg transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nueva sección
          </button>
          <button
            onClick={onGenerarNuevo}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Hero
          </button>
        </div>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">
        {loading ? (
          <SkeletonGaleria />
        ) : totalAds === 0 ? (
          <EmptyState onGenerarNuevo={onGenerarNuevo} onNuevaSeccion={() => setShowNewSection(true)} />
        ) : (
          <>
            {/* Section tabs */}
            {seccionesActuales.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-8">
                <span className="text-xs text-gray-600 self-center mr-1">Ir a:</span>
                {seccionesActuales.map(sec => {
                  const col = seccionColor(sec)
                  const activa = sec === seccionActiva
                  return (
                    <button key={sec} onClick={() => scrollToSection(sec)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${activa ? col.tab + ' border-transparent' : 'bg-transparent border ' + col.inactive}`}>
                      {sectionLabel(sec) || sec} ({gruposActuales[sec].length})
                    </button>
                  )
                })}
              </div>
            )}

            <div className="flex flex-col gap-12">
              {seccionesActuales.map(sec => {
                const col = seccionColor(sec)
                return (
                  <section key={sec} ref={el => { sectionRefs.current[sec] = el }}>
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex-1 h-px bg-gray-800" />
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${col.badge}`}>
                        {sectionLabel(sec) || sec}
                      </span>
                      <div className="flex-1 h-px bg-gray-800" />
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {gruposActuales[sec].map(gen => (
                        <GenCard
                          key={gen.id}
                          gen={gen}
                          productoId={producto.id}
                          styleGuideActive={styleGuide?.source_image_url === gen.imagen_url}
                          isEditing={editingId === gen.id}
                          deleting={deletingId === gen.id}
                          confirming={confirmDelete === gen.id}
                          isDragOver={dragOverId === gen.id}
                          onDragStart={e => handleDragStart(e, gen.id)}
                          onDragOver={e => handleDragOver(e, gen.id)}
                          onDrop={e => handleDrop(e, gen.id)}
                          onView={() => setFullscreen(gen)}
                          onDownload={() => handleDescargar(gen)}
                          onEdit={() => setEditingId(editingId === gen.id ? null : gen.id)}
                          onCancelEdit={() => setEditingId(null)}
                          onEditDone={(url, prompt, history) => handleEditDone(gen.id, url, prompt, history)}
                          onRestoreVersion={v => handleRestoreVersion(gen.id, v)}
                          onConfirmDelete={() => setConfirmDelete(gen.id)}
                          onCancelDelete={() => setConfirmDelete(null)}
                          onDelete={() => handleEliminar(gen.id)}
                          onStyleGuideExtracted={handleStyleGuideExtracted}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>

            {/* + Nueva sección CTA */}
            <div className="mt-12 flex justify-center">
              <button
                onClick={() => setShowNewSection(true)}
                className="flex items-center gap-2 text-sm text-gray-500 hover:text-violet-400 border border-gray-800 hover:border-violet-700 px-6 py-3 rounded-xl transition-all"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                + Nueva sección
              </button>
            </div>
          </>
        )}
      </div>

      {/* Fullscreen modal */}
      {fullscreen && (
        <FullscreenModal
          gen={fullscreen}
          onClose={() => setFullscreen(null)}
          onDownload={() => handleDescargar(fullscreen)}
          onEdit={() => { setEditingId(fullscreen.id); setFullscreen(null) }}
        />
      )}

      {/* New section modal */}
      {showNewSection && (
        <NewSectionModal
          productoId={producto.id}
          nextOrder={nextOrder}
          onClose={() => setShowNewSection(false)}
          onGenerated={handleNewSectionGenerated}
        />
      )}
    </div>
  )
}

/* ─── Empty State ────────────────────────────────────────────────────────── */
function EmptyState({ onGenerarNuevo, onNuevaSeccion }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
      <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-5">
        <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-gray-200 mb-2">Todavía no hay imágenes generadas</h2>
      <p className="text-gray-500 text-sm mb-8 max-w-xs leading-relaxed">
        Generá el hero de la campaña, luego marcá una imagen como guía de estilo y agregá más secciones.
      </p>
      <div className="flex gap-3">
        <button onClick={onGenerarNuevo} className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generar hero
        </button>
        <button onClick={onNuevaSeccion} className="flex items-center gap-2 border border-gray-700 hover:border-violet-700 text-gray-400 hover:text-violet-400 text-sm font-medium px-5 py-2.5 rounded-lg transition-colors">
          + Nueva sección
        </button>
      </div>
    </div>
  )
}

/* ─── Skeleton ───────────────────────────────────────────────────────────── */
function SkeletonGaleria() {
  return (
    <div className="flex flex-col gap-12">
      {[0, 1].map(g => (
        <div key={g}>
          <div className="flex items-center gap-4 mb-6">
            <div className="flex-1 h-px bg-gray-800" />
            <div className="h-5 w-24 bg-gray-800 rounded-full animate-pulse" />
            <div className="flex-1 h-px bg-gray-800" />
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: g === 0 ? 3 : 2 }).map((_, i) => (
              <div key={i} className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden animate-pulse">
                <div className="aspect-[9/16] bg-gray-800" />
                <div className="p-2 space-y-1.5"><div className="h-2.5 bg-gray-800 rounded w-3/4" /><div className="h-2 bg-gray-800 rounded w-1/2" /></div>
                <div className="border-t border-gray-800 p-2 h-8 bg-gray-900" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

/* ─── Fullscreen modal ────────────────────────────────────────────────────── */
function FullscreenModal({ gen, onClose, onDownload, onEdit }) {
  return (
    <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-gray-400 hover:text-white transition-colors text-sm">Cerrar ✕</button>
        <img src={gen.imagen_url} alt="Anuncio" className="w-full rounded-xl shadow-2xl" />
        <div className="mt-3 flex gap-2 justify-center">
          <button onClick={onEdit} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 border border-violet-800/40 hover:border-violet-700 px-3 py-1.5 rounded-lg transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            Editar imagen
          </button>
          <button onClick={onDownload} className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600 px-3 py-1.5 rounded-lg transition-all">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            Descargar
          </button>
        </div>
      </div>
    </div>
  )
}

/* ─── GenCard ────────────────────────────────────────────────────────────── */
function GenCard({
  gen, productoId, styleGuideActive, isEditing,
  deleting, confirming, isDragOver,
  onDragStart, onDragOver, onDrop,
  onView, onDownload, onEdit, onCancelEdit, onEditDone, onRestoreVersion,
  onConfirmDelete, onCancelDelete, onDelete, onStyleGuideExtracted,
}) {
  const headline = gen.angulo?.copy?.headline || gen.angulo?.angle_name || ''
  const templateNombre = gen.templates?.nombre || (gen.section_type ? sectionLabel(gen.section_type) : '')
  const versiones = Array.isArray(gen.version_history) ? gen.version_history : []

  return (
    <div
      className={`group relative bg-gray-900 border rounded-xl overflow-hidden transition-colors cursor-grab active:cursor-grabbing ${
        isEditing ? 'border-violet-700 col-span-2 sm:col-span-2' : isDragOver ? 'border-violet-500 bg-violet-900/10' : 'border-gray-800 hover:border-gray-700'
      }`}
      draggable
      onDragStart={e => onDragStart(e)}
      onDragOver={e => onDragOver(e)}
      onDrop={e => onDrop(e)}
    >
      {/* Thumbnail */}
      <div className="aspect-[9/16] overflow-hidden cursor-pointer relative" onClick={isEditing ? undefined : onView}>
        <img src={gen.imagen_url} alt={headline} className={`w-full h-full object-cover transition-transform duration-300 ${!isEditing ? 'group-hover:scale-105' : ''}`} />
        {styleGuideActive && (
          <div className="absolute top-1.5 left-1.5 text-[9px] bg-violet-900/80 text-violet-300 px-1.5 py-0.5 rounded-full border border-violet-700/50">
            🎨 Guía
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-2">
        {templateNombre && <p className="text-[10px] text-gray-500 truncate">{templateNombre}</p>}
        {headline && <p className="text-[11px] text-gray-300 font-medium truncate mt-0.5">{headline}</p>}
      </div>

      {/* Actions */}
      {confirming ? (
        <div className="border-t border-gray-800 p-2 flex items-center justify-between gap-1">
          <span className="text-[10px] text-gray-500">¿Borrar?</span>
          <div className="flex gap-1">
            <button onClick={onCancelDelete} className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-gray-700 hover:border-gray-600 transition-all">No</button>
            <button onClick={onDelete} disabled={deleting} className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-900/40 hover:border-red-800 transition-all disabled:opacity-40">{deleting ? '...' : 'Sí'}</button>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-800 p-2 flex flex-col gap-1.5">
          <div className="flex items-center justify-around">
            {!isEditing && (
              <button onClick={onView} title="Ver" className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
              </button>
            )}
            <button onClick={onDownload} title="Descargar" className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-all">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
            </button>
            <button onClick={onEdit} title={isEditing ? 'Cerrar editor' : 'Editar'}
              className={`p-1.5 rounded-lg transition-all ${isEditing ? 'text-violet-400 bg-violet-900/30' : 'text-gray-500 hover:text-violet-400 hover:bg-violet-900/20'}`}>
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
            </button>
            {!isEditing && (
              <button onClick={onConfirmDelete} title="Eliminar" className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-all">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
              </button>
            )}
          </div>
          {/* Style guide button */}
          {!isEditing && (
            <div className="flex justify-center">
              <StyleGuideButton
                imagenUrl={gen.imagen_url}
                productoId={productoId}
                isActive={styleGuideActive}
                onExtracted={onStyleGuideExtracted}
              />
            </div>
          )}
        </div>
      )}

      {/* Edit panel */}
      {isEditing && (
        <EditPanel
          genId={gen.id}
          versiones={versiones}
          onCancel={onCancelEdit}
          onDone={onEditDone}
          onRestoreVersion={onRestoreVersion}
        />
      )}
    </div>
  )
}

/* ─── EditPanel ──────────────────────────────────────────────────────────── */
const PASOS_EDIT = [
  { label: 'Claude integrando cambios...' },
  { label: 'Gemini generando imagen...' },
]

function EditPanel({ genId, versiones, onCancel, onDone, onRestoreVersion }) {
  const [texto, setTexto] = useState('')
  const [refImages, setRefImages] = useState([])
  const [estado, setEstado] = useState('idle')
  const [pasoActual, setPasoActual] = useState(0)
  const [errorMsg, setErrorMsg] = useState(null)
  const fileInputRef = useRef(null)
  const cargando = estado === 'loading'

  function handleAddRefImages(e) {
    const files = Array.from(e.target.files || [])
    const restante = MAX_REF_IMAGES - refImages.length
    files.slice(0, restante).forEach(file => {
      const reader = new FileReader()
      reader.onload = ev => {
        const dataUrl = ev.target.result
        const [header, data] = dataUrl.split(',')
        const mimeType = header.match(/:(.*?);/)?.[1] || 'image/jpeg'
        setRefImages(prev => [...prev, { data, mimeType, preview: dataUrl, name: file.name }])
      }
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  function removeRefImage(idx) { setRefImages(prev => prev.filter((_, i) => i !== idx)) }

  async function handleRegenerar() {
    if (!texto.trim() || cargando) return
    setEstado('loading')
    setErrorMsg(null)
    setPasoActual(0)
    const t = setTimeout(() => setPasoActual(1), 5000)
    try {
      const res = await fetch(`/api/generaciones/${genId}/edit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEdits: texto.trim(), referenceImages: refImages.map(({ data, mimeType }) => ({ data, mimeType })) }),
      })
      clearTimeout(t)
      const json = await res.json()
      if (!json.success) throw new Error(json.error || 'Error al editar')
      onDone(json.imagen_url, json.gemini_prompt, json.version_history)
    } catch (err) {
      clearTimeout(t)
      setErrorMsg(err.message)
      setEstado('error')
    }
  }

  return (
    <div className="border-t border-violet-900/40 bg-gray-950 p-3 flex flex-col gap-3">
      <p className="text-[11px] font-semibold text-violet-400">✏️ Describí los cambios</p>
      <textarea value={texto} onChange={e => setTexto(e.target.value)} disabled={cargando} rows={3}
        placeholder="Ej: cambiar el fondo a más oscuro, hacer el headline más grande..."
        className="w-full text-xs bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-2 text-gray-200 placeholder-gray-600 resize-none focus:outline-none focus:border-violet-700 disabled:opacity-40" />
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-600">Referencia visual (opcional)</span>
          {refImages.length < MAX_REF_IMAGES && (
            <button onClick={() => fileInputRef.current?.click()} disabled={cargando}
              className="text-[10px] text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 px-1.5 py-0.5 rounded transition-all disabled:opacity-40">
              + Adjuntar
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={handleAddRefImages} />
        </div>
        {refImages.length > 0 && (
          <div className="flex gap-1.5 flex-wrap">
            {refImages.map((img, idx) => (
              <div key={idx} className="relative group/ref">
                <img src={img.preview} alt={img.name} className="w-10 h-10 object-cover rounded-lg border border-gray-700" />
                <button onClick={() => removeRefImage(idx)} className="absolute -top-1 -right-1 w-4 h-4 bg-gray-800 hover:bg-red-700 rounded-full text-gray-400 hover:text-white text-[10px] flex items-center justify-center opacity-0 group-hover/ref:opacity-100 transition-all">×</button>
              </div>
            ))}
          </div>
        )}
      </div>
      {cargando && (
        <div className="flex flex-col gap-1.5">
          {PASOS_EDIT.map((paso, idx) => (
            <div key={idx} className={`flex items-center gap-2 transition-all duration-500 ${idx < pasoActual ? 'opacity-40' : idx === pasoActual ? 'opacity-100' : 'opacity-25'}`}>
              <div className={`w-3.5 h-3.5 rounded-full flex-shrink-0 flex items-center justify-center ${idx < pasoActual ? 'bg-green-500/20 border border-green-500/40' : idx === pasoActual ? 'border border-violet-400/40' : 'border border-gray-700'}`}>
                {idx < pasoActual ? <svg className="w-2 h-2 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                  : idx === pasoActual ? <span className="w-1.5 h-1.5 bg-violet-400 rounded-full animate-pulse" /> : null}
              </div>
              <span className={`text-[10px] ${idx === pasoActual ? 'text-gray-300' : 'text-gray-600'}`}>{paso.label}</span>
            </div>
          ))}
        </div>
      )}
      {estado === 'error' && errorMsg && <p className="text-[10px] text-red-400">{errorMsg}</p>}
      <div className="flex gap-2">
        <button onClick={onCancel} disabled={cargando} className="flex-1 text-[11px] text-gray-500 hover:text-gray-300 border border-gray-700 hover:border-gray-600 py-1.5 rounded-lg transition-all disabled:opacity-40">Cancelar</button>
        <button onClick={handleRegenerar} disabled={cargando || !texto.trim()} className="flex-1 flex items-center justify-center gap-1 text-[11px] text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed py-1.5 rounded-lg transition-all font-medium">
          {cargando ? <span className="w-3 h-3 border border-violet-300/30 border-t-violet-300 rounded-full animate-spin" /> : <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
          Regenerar
        </button>
      </div>
      {versiones.length > 0 && (
        <div className="flex flex-col gap-1.5 pt-1 border-t border-gray-800">
          <p className="text-[10px] text-gray-600">Versiones anteriores</p>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {versiones.map((v, idx) => (
              <button key={idx} onClick={() => onRestoreVersion(v)} disabled={cargando}
                title={`v${versiones.length - idx} — ${new Date(v.timestamp).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}`}
                className="flex-shrink-0 w-10 aspect-[9/16] rounded overflow-hidden border border-gray-700 hover:border-violet-600 transition-all disabled:opacity-40">
                <img src={v.imagen_url} alt={`v${versiones.length - idx}`} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
