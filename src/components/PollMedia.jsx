import { useState } from 'react'
import { useAutoplayOnVisible } from '../lib/useAutoplayOnVisible.js'
import styles from './PollMedia.module.css'

// Accepts either the new `media` array (poll_media rows) or falls back to
// the legacy single media_url/media_type columns from before multi-media.
export default function PollMedia({ media, url, type }) {
  const videoRef = useAutoplayOnVisible()
  const [muted, setMuted] = useState(true)

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

  return (
    <div className={`${styles.grid} ${styles[`grid${Math.min(sorted.length, 4)}`]}`}>
      {sorted.map((item, i) => (
        <img key={item.id ?? i} src={item.url} className={styles.gridImg} alt="" />
      ))}
    </div>
  )
}
