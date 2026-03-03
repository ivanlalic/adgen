import { supabase } from './supabase'
import { resizeImage } from './resizeImage'

/**
 * Resize y sube una imagen al bucket "productos" en Supabase Storage.
 * @param {File} file
 * @returns {Promise<string>} URL pública
 */
export async function uploadProductImage(file) {
  const resized = await resizeImage(file)
  const ext = 'webp'
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

  const { data, error } = await supabase.storage
    .from('productos')
    .upload(filename, resized, {
      contentType: 'image/webp',
      upsert: false,
    })

  if (error) throw new Error(`Error al subir imagen: ${error.message}`)

  const { data: { publicUrl } } = supabase.storage
    .from('productos')
    .getPublicUrl(data.path)

  return publicUrl
}

/**
 * Sube múltiples imágenes y devuelve array de URLs públicas.
 * @param {File[]} files
 * @returns {Promise<string[]>}
 */
export async function uploadProductImages(files) {
  return Promise.all(files.map(uploadProductImage))
}
