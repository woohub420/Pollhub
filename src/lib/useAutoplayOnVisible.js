import { useEffect, useRef } from 'react'

export function useAutoplayOnVisible() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {})
        else el.pause()
      },
      { threshold: 0.6 },
    )
    observer.observe(el)

    return () => observer.disconnect()
  }, [])

  return ref
}
