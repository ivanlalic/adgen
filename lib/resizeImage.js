/**
 * Resize una imagen en el cliente antes de subirla.
 * Max 1200px en el lado más largo, calidad 0.8 en WebP.
 * @param {File} file
 * @returns {Promise<Blob>}
 */
export function resizeImage(file, maxSide = 800, quality = 0.8) {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      let { width, height } = img
      if (width > height && width > maxSide) {
        height = (height * maxSide) / width
        width = maxSide
      } else if (height > maxSide) {
        width = (width * maxSide) / height
        height = maxSide
      }
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d').drawImage(img, 0, 0, width, height)
      canvas.toBlob(resolve, 'image/jpeg', quality)
    }
    img.src = URL.createObjectURL(file)
  })
}
