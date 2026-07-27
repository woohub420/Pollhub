import { IMAGE_JPEG_QUALITY, IMAGE_MAX_DIMENSION } from './constants.js'

// Resizes an image file down to IMAGE_MAX_DIMENSION on its longest side and
// re-encodes it as JPEG, so a 12MB phone photo doesn't go to storage as-is.
// GIFs are skipped (canvas would flatten them to a single frame).
export async function downscaleImage(file) {
  if (file.type === 'image/gif') return file

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, IMAGE_MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height)
  bitmap.close?.()

  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', IMAGE_JPEG_QUALITY))
  if (!blob) return file

  const name = file.name.replace(/\.[^.]+$/, '') + '.jpg'
  return new File([blob], name, { type: 'image/jpeg' })
}

// Reads a video file's duration without uploading it, by loading it into an
// off-DOM <video> element from an object URL.
export function getVideoDuration(file) {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video')
    video.preload = 'metadata'
    const url = URL.createObjectURL(file)
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(url)
      resolve(video.duration)
    }
    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read video metadata.'))
    }
    video.src = url
  })
}
