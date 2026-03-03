'use client'

/**
 * ErrorMessage — Componente de error inline.
 * Props:
 *   message: string
 *   onRetry: () => void (opcional)
 */
export default function ErrorMessage({ message, onRetry }) {
  if (!message) return null

  return (
    <div className="flex items-start gap-3 rounded-xl border border-red-900/50 bg-red-950/30 px-4 py-3">
      <span className="text-red-400 mt-0.5 flex-shrink-0">⚠</span>
      <div className="flex-1 min-w-0">
        <p className="text-red-300 text-sm leading-snug">{message}</p>
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 text-xs text-red-400 hover:text-red-300 underline underline-offset-2 transition-colors"
          >
            Intentar de nuevo
          </button>
        )}
      </div>
    </div>
  )
}
