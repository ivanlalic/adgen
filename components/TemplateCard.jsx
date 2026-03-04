'use client'

const SECCION_COLORS = {
  HERO:        'bg-violet-900/30 text-violet-400 border-violet-800/40',
  OFERTA:      'bg-amber-900/30 text-amber-400 border-amber-800/40',
  CARRUSEL:    'bg-blue-900/30 text-blue-400 border-blue-800/40',
  STORY:       'bg-green-900/30 text-green-400 border-green-800/40',
  TESTIMONIAL: 'bg-rose-900/30 text-rose-400 border-rose-800/40',
}

/**
 * TemplateCard — tarjeta de template seleccionable.
 * Props:
 *   template: { id, nombre, seccion, imagen_url, style_guide }
 *   seleccionado: boolean
 *   analizando: boolean  — muestra overlay de carga
 *   onClick: () => void
 */
export default function TemplateCard({ template, seleccionado, analizando, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`
        group relative w-full text-left rounded-xl overflow-hidden border transition-all duration-200
        ${seleccionado
          ? 'border-violet-500 ring-2 ring-violet-500/40 scale-[1.02]'
          : 'border-gray-800 hover:border-gray-600'
        }
        ${analizando ? 'cursor-wait' : 'cursor-pointer'}
      `}
    >
      {/* Imagen */}
      <div className="aspect-[9/16] bg-gray-800 overflow-hidden">
        {template.imagen_url ? (
          <img
            src={template.imagen_url}
            alt={template.nombre}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-700">
            <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01" />
            </svg>
          </div>
        )}

        {/* Overlay — analizando */}
        {analizando && (
          <div className="absolute inset-0 bg-gray-950/70 backdrop-blur-sm flex flex-col items-center justify-center gap-2">
            <span className="w-6 h-6 border-2 border-violet-400/30 border-t-violet-400 rounded-full animate-spin" />
            <span className="text-xs text-violet-300 font-medium">Analizando...</span>
          </div>
        )}

        {/* Check badge — seleccionado */}
        {seleccionado && !analizando && (
          <div className="absolute top-2 right-2 w-6 h-6 bg-violet-500 rounded-full flex items-center justify-center shadow-lg">
            <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
        )}

        {/* Badge "Analizado" (sutil, solo si tiene style_guide) */}
        {template.style_guide && !seleccionado && !analizando && (
          <div className="absolute top-2 left-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] bg-gray-950/80 text-green-400 px-1.5 py-0.5 rounded border border-green-900/40">
              ✓
            </span>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-2.5 bg-gray-900">
        <p className="text-xs font-medium text-gray-200 leading-tight line-clamp-1 mb-1.5">
          {template.nombre}
        </p>
        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${SECCION_COLORS[template.seccion] || 'bg-gray-800 text-gray-500 border-gray-700'}`}>
          {template.seccion}
        </span>
      </div>
    </button>
  )
}
