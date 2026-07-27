import { useNavigate } from 'react-router-dom'
import UserAvatar from './UserAvatar.jsx'
import styles from './AuthorLine.module.css'

export default function AuthorLine({ username, avatarUrl }) {
  const navigate = useNavigate()
  if (!username) return null
  return (
    <div className={styles.wrapper} onClick={() => navigate(`/u/${username}`)} style={{ cursor: 'pointer' }}>
      <UserAvatar username={username} avatarUrl={avatarUrl} size={24} />
      <span className={styles.username}>{username}</span>
    </div>
  )
}
