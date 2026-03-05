'use client'
import { useState, useRef } from 'react'

const SECCION_COLORS = {
  HERO:        { badge: 'bg-violet-900/30 text-violet-400 border-violet-800/40', tab: 'bg-violet-600 text-white', inactive: 'text-violet-400 border-violet-800/40 hover:border-violet-600' },
  OFERTA:      { badge: 'bg-amber-900/30 text-amber-400 border-amber-800/40', tab: 'bg-amber-600 text-white', inactive: 'text-amber-400 border-amber-800/40 hover:border-amber-600' },
  CARRUSEL:    { badge: 'bg-blue-900/30 text-blue-400 border-blue-800/40', tab: 'bg-blue-600 text-white', inactive: 'text-blue-400 border-blue-800/40 hover:border-blue-600' },
  STORY:       { badge: 'bg-green-900/30 text-green-400 border-green-800/40', tab: 'bg-green-600 text-white', inactive: 'text-green-400 border-green-800/40 hover:border-green-600' },
  TESTIMONIAL: { badge: 'bg-rose-900/30 text-rose-400 border-rose-800/40', tab: 'bg-rose-600 text-white', inactive: 'text-rose-400 border-rose-800/40 hover:border-rose-600' },
}
const DEFAULT_COLOR = { badge: 'bg-gray-800 text-gray-400 border-gray-700', tab: 'bg-gray-600 text-white', inactive: 'text-gray-400 border-gray-700 hover:border-gray-500' }

function seccionColor(sec) {
  return SECCION_COLORS[sec?.toUpperCase()] || DEFAULT_COLOR
}

function groupBySec(generaciones) {
  const grupos = {}
  for (const g of generaciones) {
    const sec = g.templates?.seccion || 'SIN SECCIÓN'
    if (!grupos[sec]) grupos[sec] = []
    grupos[sec].push(g)
  }
  return grupos
}

/**
 * ProductGeneraciones — muestra las imágenes generadas de un producto, agrupadas por sección.
 * Props:
 *   producto: objeto producto con nombre, imagenes_urls
 *   generaciones: array de generaciones con templates(seccion, nombre)
 *   onBack: () => void
 *   onGenerarNuevo: () => void  — va al stepper de ángulos
 *   onEliminar: (id) => void    — elimina una generación de la lista local
 */
export default function ProductGeneraciones({ producto, generaciones, onBack, onGenerarNuevo, onEliminar }) {
  const grupos = groupBySec(generaciones)
  const secciones = Object.keys(grupos)
  const [seccionActiva, setSeccionActiva] = useState(secciones[0] || null)
  const [confirmDelete, setConfirmDelete] = useState(null) // id de generación a confirmar
  const [deletingId, setDeletingId] = useState(null)
  const [fullscreen, setFullscreen] = useState(null) // { imagen_url, angulo }
  const sectionRefs = useRef({})

  function scrollToSection(sec) {
    setSeccionActiva(sec)
    sectionRefs.current[sec]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  function handleDescargar(gen) {
    const a = document.createElement('a')
    a.href = gen.imagen_url
    a.download = `adgen-${(gen.templates?.seccion || 'ad').toLowerCase()}-${gen.id}.png`
    a.target = '_blank'
    a.click()
  }

  async function handleEliminar(id) {
    setDeletingId(id)
    try {
      await fetch(`/api/generaciones/${id}`, { method: 'DELETE' })
      onEliminar(id)
    } catch {}
    setDeletingId(null)
    setConfirmDelete(null)
  }

  const totalAds = generaciones.length

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
          <h1 className="text-base font-semibold truncate">{producto.nombre}</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {totalAds > 0 ? `${totalAds} ad${totalAds !== 1 ? 's' : ''} generado${totalAds !== 1 ? 's' : ''}` : 'Sin ads generados'}
          </p>
        </div>
        <button
          onClick={onGenerarNuevo}
          className="flex-shrink-0 flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-4 py-2 rounded-lg transition-all"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          Generar nuevo
        </button>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 py-8">

        {totalAds === 0 ? (
          /* ── Empty state ─── */
          <div className="flex flex-col items-center justify-center min-h-[60vh] text-center">
            <div className="w-16 h-16 rounded-2xl bg-gray-900 border border-gray-800 flex items-center justify-center mb-5">
              <svg className="w-8 h-8 text-gray-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-200 mb-2">Todavía no hay ads generados</h2>
            <p className="text-gray-500 text-sm mb-8 max-w-xs leading-relaxed">
              Elegí un ángulo y un template para generar tu primer anuncio.
            </p>
            <button
              onClick={onGenerarNuevo}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium px-6 py-3 rounded-lg transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Generar primer anuncio
            </button>
          </div>
        ) : (
          <>
            {/* ── Tabs de sección ─── */}
            {secciones.length > 1 && (
              <div className="flex gap-2 flex-wrap mb-8">
                <span className="text-xs text-gray-600 self-center mr-1">Ir a:</span>
                {secciones.map(sec => {
                  const col = seccionColor(sec)
                  const activa = sec === seccionActiva
                  return (
                    <button
                      key={sec}
                      onClick={() => scrollToSection(sec)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                        activa ? col.tab + ' border-transparent' : 'bg-transparent border ' + col.inactive
                      }`}
                    >
                      {sec} ({grupos[sec].length})
                    </button>
                  )
                })}
              </div>
            )}

            {/* ── Secciones ─── */}
            <div className="flex flex-col gap-12">
              {secciones.map(sec => {
                const col = seccionColor(sec)
                return (
                  <section
                    key={sec}
                    ref={el => { sectionRefs.current[sec] = el }}
                  >
                    {/* Separador de sección */}
                    <div className="flex items-center gap-4 mb-6">
                      <div className="flex-1 h-px bg-gray-800" />
                      <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${col.badge}`}>
                        {sec}
                      </span>
                      <div className="flex-1 h-px bg-gray-800" />
                    </div>

                    {/* Grid de imágenes */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                      {grupos[sec].map(gen => (
                        <GenCard
                          key={gen.id}
                          gen={gen}
                          deleting={deletingId === gen.id}
                          confirming={confirmDelete === gen.id}
                          onView={() => setFullscreen(gen)}
                          onDownload={() => handleDescargar(gen)}
                          onConfirmDelete={() => setConfirmDelete(gen.id)}
                          onCancelDelete={() => setConfirmDelete(null)}
                          onDelete={() => handleEliminar(gen.id)}
                        />
                      ))}
                    </div>
                  </section>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* ── Fullscreen modal ─── */}
      {fullscreen && (
        <div
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
          onClick={() => setFullscreen(null)}
        >
          <div className="relative max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <button
              onClick={() => setFullscreen(null)}
              className="absolute -top-10 right-0 text-gray-400 hover:text-white transition-colors text-sm"
            >
              Cerrar ✕
            </button>
            <img
              src={fullscreen.imagen_url}
              alt="Anuncio"
              className="w-full rounded-xl shadow-2xl"
            />
            {fullscreen.angulo?.copy?.headline && (
              <p className="mt-3 text-center text-sm text-gray-400 italic">
                &ldquo;{fullscreen.angulo.copy.headline}&rdquo;
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function GenCard({ gen, deleting, confirming, onView, onDownload, onConfirmDelete, onCancelDelete, onDelete }) {
  const headline = gen.angulo?.copy?.headline || gen.angulo?.angle_name || ''
  const seccion = gen.templates?.seccion || ''
  const templateNombre = gen.templates?.nombre || ''

  return (
    <div className="group relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-gray-700 transition-colors">
      {/* Thumbnail */}
      <div
        className="aspect-[9/16] overflow-hidden cursor-pointer"
        onClick={onView}
      >
        <img
          src={gen.imagen_url}
          alt={headline}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />
      </div>

      {/* Info */}
      <div className="p-2">
        {templateNombre && (
          <p className="text-[10px] text-gray-500 truncate">{templateNombre}</p>
        )}
        {headline && (
          <p className="text-[11px] text-gray-300 font-medium truncate mt-0.5">{headline}</p>
        )}
      </div>

      {/* Acciones */}
      {confirming ? (
        <div className="border-t border-gray-800 p-2 flex items-center justify-between gap-1">
          <span className="text-[10px] text-gray-500">¿Borrar?</span>
          <div className="flex gap-1">
            <button
              onClick={onCancelDelete}
              className="text-[10px] text-gray-500 hover:text-gray-300 px-2 py-1 rounded border border-gray-700 hover:border-gray-600 transition-all"
            >
              No
            </button>
            <button
              onClick={onDelete}
              disabled={deleting}
              className="text-[10px] text-red-400 hover:text-red-300 px-2 py-1 rounded border border-red-900/40 hover:border-red-800 transition-all disabled:opacity-40"
            >
              {deleting ? '...' : 'Sí'}
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-gray-800 p-2 flex items-center justify-around">
          <button
            onClick={onView}
            title="Ver"
            className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
          <button
            onClick={onDownload}
            title="Descargar"
            className="p-1.5 text-gray-500 hover:text-white rounded-lg hover:bg-gray-800 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
          <button
            onClick={onConfirmDelete}
            title="Eliminar"
            className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg hover:bg-red-900/20 transition-all"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
