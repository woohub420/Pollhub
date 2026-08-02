import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.links}>
        <Link to="/terms" className={styles.link}>Terms of Service</Link>
        <Link to="/privacy" className={styles.link}>Privacy Policy</Link>
        <span className={styles.copyright}>© 2026 PollHub</span>
      </div>
    </footer>
  )
}
