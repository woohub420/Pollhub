import { Link } from 'react-router-dom'
import styles from './Footer.module.css'

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.links}>
        <Link to="/terms" className={styles.link}>Terms of Service</Link>
        <Link to="/privacy" className={styles.link}>Privacy Policy</Link>
        <a
          href="mailto:ypmedia.contact@gmail.com?subject=Bug Report&body=Describe the bug here..."
          className={styles.link}
        >
          🐛 Report a Bug
        </a>
        <span className={styles.copyright}>© 2026 PollHub</span>
      </div>
    </footer>
  )
}
