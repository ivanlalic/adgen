'use client'
import { useRef } from 'react'

/**
 * ImageUploader — 3 slots de imagen (1 requerida, 2 opcionales).
 * Props:
 *   files: File[]  — array de hasta 3 archivos seleccionados
 *   onChange: (files: File[]) => void
 */
export default function ImageUploader({ files = [], onChange }) {
  const slots = [
    { label: 'Foto principal', required: true },
    { label: 'Foto 2', required: false },
    { label: 'Foto 3', required: false },
  ]

  const inputRefs = [useRef(null), useRef(null), useRef(null)]

  function handleFileChange(index, e) {
    const selected = Array.from(e.target.files || [])
    if (!selected.length) return
    const next = [files[0] || null, files[1] || null, files[2] || null]
    selected.slice(0, 3 - index).forEach((file, i) => {
      next[index + i] = file
    })
    onChange(next.filter(Boolean))
    e.target.value = ''
  }

  function removeFile(index) {
    const next = [files[0] || null, files[1] || null, files[2] || null]
    next[index] = null
    onChange(next.filter(Boolean))
  }

  function getPreviewUrl(index) {
    return files[index] ? URL.createObjectURL(files[index]) : null
  }

  return (
    <div className="flex gap-3 h-full">
      {slots.map((slot, i) => {
        const preview = getPreviewUrl(i)
        const hasFile = !!files[i]

        return (
          <div key={i} className="flex-1 flex flex-col gap-2">
            <span className="text-xs text-gray-500 font-medium">
              {slot.label}
              {slot.required && <span className="text-violet-400 ml-1">*</span>}
            </span>
            <div
              className={`relative flex-1 rounded-xl border-2 border-dashed cursor-pointer overflow-hidden transition-all min-h-[180px]
                ${hasFile
                  ? 'border-violet-500/60 bg-gray-800'
                  : 'border-gray-700 bg-gray-800/40 hover:border-gray-600 hover:bg-gray-800/70'
                }`}
              onClick={() => inputRefs[i].current?.click()}
            >
              {preview ? (
                <>
                  <img
                    src={preview}
                    alt={`Foto ${i + 1}`}
                    className="w-full h-full object-cover absolute inset-0"
                  />
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-900/80 backdrop-blur-sm text-gray-300 hover:text-white flex items-center justify-center text-xs transition-colors z-10"
                  >
                    ✕
                  </button>
                </>
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-4 text-center">
                  <div className="w-10 h-10 rounded-full bg-gray-700/60 flex items-center justify-center">
                    <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <span className="text-xs text-gray-600 leading-tight">
                    {slot.required ? 'Clic para subir' : 'Opcional'}
                  </span>
                </div>
              )}
            </div>
            <input
              ref={inputRefs[i]}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleFileChange(i, e)}
            />
          </div>
        )
      })}
    </div>
  )
}
