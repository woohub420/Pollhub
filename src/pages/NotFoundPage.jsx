import { useNavigate } from 'react-router-dom'
import styles from './NotFoundPage.module.css'

export default function NotFoundPage() {
  const navigate = useNavigate()

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.emoji}>😕</div>
        <h1 className={styles.code}>404</h1>
        <h2 className={styles.title}>Page not found</h2>
        <p className={styles.message}>This page doesn't exist or may have been deleted.</p>
        <div className={styles.actions}>
          <button className="btn btn-accent" onClick={() => navigate('/')}>
            Go to Home
          </button>
          <button className="btn btn-ghost" onClick={() => navigate(-1)}>
            Go Back
          </button>
        </div>
      </div>
    </div>
  )
}
