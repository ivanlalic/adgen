'use client'

/**
 * AngleCard — Muestra un ángulo de venta generado por Claude.
 * Props:
 *   angulo: objeto de sales_angles
 *   seleccionado: boolean
 *   onClick: () => void
 */
export default function AngleCard({ angulo, seleccionado, onClick }) {
  if (!angulo) return null

  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border p-5 transition-all duration-150 flex flex-col gap-3
        ${seleccionado
          ? 'border-violet-500 bg-violet-950/40 ring-1 ring-violet-500/40'
          : 'border-gray-800 bg-gray-900 hover:border-gray-700 hover:bg-gray-900/80'
        }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center
            ${seleccionado ? 'bg-violet-500 text-white' : 'bg-gray-800 text-gray-400'}`}>
            {angulo.angle_number}
          </span>
          <h3 className="font-semibold text-white text-sm leading-tight">
            {angulo.angle_name}
          </h3>
        </div>
        {seleccionado && (
          <span className="text-violet-400 text-sm flex-shrink-0">✓</span>
        )}
      </div>

      {/* Trigger badge */}
      <span className="self-start text-xs px-2 py-0.5 rounded-full bg-gray-800 text-gray-400 border border-gray-700">
        {angulo.psychological_trigger}
      </span>

      {/* One-liner */}
      <p className="text-gray-300 text-sm leading-snug">
        {angulo.one_line_concept}
      </p>

      {/* Divider */}
      <div className="border-t border-gray-800" />

      {/* Copy preview */}
      <div className="flex flex-col gap-1.5">
        <p className="text-gray-500 text-xs italic leading-snug line-clamp-2">
          &ldquo;{angulo.copy?.hook}&rdquo;
        </p>
        <p className="text-white text-sm font-bold leading-snug line-clamp-2">
          {angulo.copy?.headline}
        </p>
      </div>

      {/* Avatar + visual */}
      <div className="flex gap-3 text-xs text-gray-500">
        <div className="flex-1">
          <span className="text-gray-600">Avatar · </span>
          <span>{angulo.target_avatar?.description}</span>
        </div>
      </div>

      {/* Visual direction */}
      <div className="text-xs text-gray-600 bg-gray-800/50 rounded-lg px-3 py-2">
        <span className="text-gray-500">Visual: </span>
        {angulo.visual_direction?.scene}
      </div>
    </button>
  )
}
