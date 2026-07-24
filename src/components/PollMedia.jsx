import { useState } from 'react'
import { useAutoplayOnVisible } from '../lib/useAutoplayOnVisible.js'
import styles from './PollMedia.module.css'

export default function PollMedia({ url, type }) {
  const videoRef = useAutoplayOnVisible()
  const [muted, setMuted] = useState(true)

  if (!url) return null

  if (type === 'video') {
    return (
      <div className={styles.wrapper}>
        <video ref={videoRef} src={url} className={styles.media} muted={muted} loop playsInline />
        <button className={styles.muteBtn} onClick={() => setMuted((m) => !m)}>
          {muted ? '🔇' : '🔊'}
        </button>
      </div>
    )
  }

  return (
    <div className={styles.wrapper}>
      <img src={url} className={styles.media} alt="" />
    </div>
  )
}
