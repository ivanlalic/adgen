'use client'
import { useState } from 'react'

/**
 * StyleGuideButton — aparece en cada GenCard.
 * Al confirmar, extrae la guía de estilo de la imagen y la guarda en el producto.
 */
export default function StyleGuideButton({ genId, imagenUrl, productoId, isActive, onExtracted }) {
  const [estado, setEstado] = useState('idle') // idle | confirm | loading | done | error
  const [errorMsg, setErrorMsg] = useState(null)

  async function handleConfirm() {
    setEstado('loading')
    setErrorMsg(null)
    try {
      const res = await fetch('/api/extract-style-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imagen_url: imagenUrl, producto_id: productoId }),
      })
      const json = await res.json()
      if (!json.success) throw new Error(json.error)
      setEstado('done')
      onExtracted?.(json.style_guide)
    } catch (err) {
      setErrorMsg(err.message)
      setEstado('error')
    }
  }

  if (estado === 'loading') {
    return (
      <button disabled className="flex items-center gap-1 text-[10px] text-violet-400 px-2 py-1 rounded border border-violet-800/40 opacity-70">
        <span className="w-2.5 h-2.5 border border-violet-400/40 border-t-violet-400 rounded-full animate-spin" />
        Extrayendo...
      </button>
    )
  }

  if (estado === 'done' || isActive) {
    return (
      <span className="text-[10px] text-violet-400 bg-violet-900/20 border border-violet-800/40 px-2 py-1 rounded flex items-center gap-1">
        🎨 Guía activa
      </span>
    )
  }

  if (estado === 'confirm') {
    return (
      <div className="flex flex-col gap-1.5 p-2 bg-gray-900 border border-violet-800/40 rounded-lg">
        <p className="text-[10px] text-gray-400 leading-tight">¿Usar como guía de estilo de la campaña? Las próximas secciones respetarán estos colores y estilo.</p>
        <div className="flex gap-1.5">
          <button onClick={() => setEstado('idle')} className="flex-1 text-[10px] text-gray-500 border border-gray-700 py-1 rounded hover:border-gray-600 transition-all">
            Cancelar
          </button>
          <button onClick={handleConfirm} className="flex-1 text-[10px] text-white bg-violet-600 hover:bg-violet-500 py-1 rounded font-medium transition-all">
            Confirmar
          </button>
        </div>
        {estado === 'error' && errorMsg && (
          <p className="text-[10px] text-red-400">{errorMsg}</p>
        )}
      </div>
    )
  }

  return (
    <button
      onClick={() => setEstado('confirm')}
      title="Usar como guía de estilo de la campaña"
      className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-violet-400 px-2 py-1 rounded border border-gray-700 hover:border-violet-700 transition-all"
    >
      🎨 Guía
    </button>
  )
}
