import { useRef, useState } from 'react'
import { useAutoplayOnVisible } from '../lib/useAutoplayOnVisible.js'
import styles from './PollMedia.module.css'

const SWIPE_THRESHOLD = 40

// Accepts either the new `media` array (poll_media rows) or falls back to
// the legacy single media_url/media_type columns from before multi-media.
export default function PollMedia({ media, url, type }) {
  const videoRef = useAutoplayOnVisible()
  const [muted, setMuted] = useState(true)
  const [current, setCurrent] = useState(0)
  const touchStartX = useRef(null)

  const items = media?.length ? media : url ? [{ url, media_type: type }] : []
  if (items.length === 0) return null

  const sorted = items.slice().sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  const isVideo = sorted[0].media_type === 'video'

  if (isVideo) {
    return (
      <div className={styles.wrapper}>
        <video ref={videoRef} src={sorted[0].url} className={styles.media} muted={muted} loop playsInline />
        <button className={styles.muteBtn} onClick={() => setMuted((m) => !m)}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    )
  }

  // 1 image — full width. 2 images — side by side.
  if (sorted.length <= 2) {
    return (
      <div className={`${styles.grid} ${styles[`grid${sorted.length}`]}`}>
        {sorted.map((item, i) => (
          <img key={item.id ?? i} src={item.url} className={styles.gridImg} alt="" />
        ))}
      </div>
    )
  }

  // 3-4 images — swipeable carousel
  function goTo(index) {
    setCurrent(Math.max(0, Math.min(sorted.length - 1, index)))
  }

  function handleTouchStart(e) {
    touchStartX.current = e.touches[0].clientX
  }

  function handleTouchEnd(e) {
    if (touchStartX.current === null) return
    const diff = e.changedTouches[0].clientX - touchStartX.current
    touchStartX.current = null
    if (diff > SWIPE_THRESHOLD) goTo(current - 1)
    else if (diff < -SWIPE_THRESHOLD) goTo(current + 1)
  }

  return (
    <div className={styles.carousel} onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <img
        src={sorted[current].url}
        alt={`${current + 1} of ${sorted.length}`}
        className={styles.carouselImg}
      />

      {current > 0 && (
        <button
          type="button"
          className={`${styles.carouselBtn} ${styles.carouselPrev}`}
          onClick={() => goTo(current - 1)}
        >
          ‹
        </button>
      )}
      {current < sorted.length - 1 && (
        <button
          type="button"
          className={`${styles.carouselBtn} ${styles.carouselNext}`}
          onClick={() => goTo(current + 1)}
        >
          ›
        </button>
      )}

      <div className={styles.dots}>
        {sorted.map((_, i) => (
          <button
            key={i}
            type="button"
            className={`${styles.dot} ${i === current ? styles.dotActive : ''}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>

      <div className={styles.counter}>
        {current + 1} / {sorted.length}
      </div>
    </div>
  )
}
