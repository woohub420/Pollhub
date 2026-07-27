export const CATEGORIES = ['tech', 'life', 'finance', 'gaming', 'other']

export const MAX_IMAGE_BYTES = 5 * 1024 * 1024 // 5MB
export const MAX_VIDEO_BYTES = 20 * 1024 * 1024 // 20MB
export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
export const ACCEPTED_VIDEO_TYPES = ['video/mp4', 'video/webm']

export const MAX_IMAGES = 4
export const MAX_VIDEOS = 1
export const MAX_VIDEO_SECONDS = 60
// Images get downscaled client-side before upload so the bucket doesn't fill
// with full-resolution phone photos nobody needs at feed size.
export const IMAGE_MAX_DIMENSION = 1600
export const IMAGE_JPEG_QUALITY = 0.82
