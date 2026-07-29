import DOMPurify from 'isomorphic-dompurify'

// Strips all HTML tags/attributes from user input before it's stored, so a
// stored value can never carry markup even if some future surface renders it
// with dangerouslySetInnerHTML (React already escapes plain text on its own).
export function sanitize(str) {
  if (!str || typeof str !== 'string') return ''
  return DOMPurify.sanitize(str.trim(), { ALLOWED_TAGS: [], ALLOWED_ATTR: [] })
}
