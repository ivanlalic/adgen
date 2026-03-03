'use client'
import { useEffect, useState } from 'react'

/**
 * LoadingOverlay — Overlay de carga con mensaje animado.
 * Props:
 *   visible: boolean
 *   mensaje: string — mensaje principal
 *   submensaje: string — texto secundario (estimado de tiempo, etc.)
 */
export default function LoadingOverlay({ visible, mensaje, submensaje }) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    if (!visible) return
    const interval = setInterval(() => {
      setDots(d => d.length >= 3 ? '' : d + '.')
    }, 500)
    return () => clearInterval(interval)
  }, [visible])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/90 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6 max-w-sm text-center px-6">
        {/* Spinner */}
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-2 border-gray-800" />
          <div className="absolute inset-0 rounded-full border-2 border-t-violet-500 animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-violet-400 text-lg">✦</span>
          </div>
        </div>

        {/* Mensaje */}
        <div className="flex flex-col gap-1">
          <p className="text-white font-medium text-base">
            {mensaje}{dots}
          </p>
          {submensaje && (
            <p className="text-gray-500 text-sm">{submensaje}</p>
          )}
        </div>

        {/* Barra de progreso animada (falsa, solo visual) */}
        <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-violet-600 to-violet-400 rounded-full animate-progress" />
        </div>
      </div>
    </div>
  )
}
