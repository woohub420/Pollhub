import styles from './UserAvatar.module.css'

export default function UserAvatar({ username, avatarUrl, size = 28 }) {
  if (!username) return null
  return (
    <div className={styles.wrapper} style={{ width: size, height: size, fontSize: size * 0.4 }}>
      {avatarUrl ? <img src={avatarUrl} alt={username} className={styles.img} /> : username[0].toUpperCase()}
    </div>
  )
}
