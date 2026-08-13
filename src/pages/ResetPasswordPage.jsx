import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import styles from './NotFoundPage.module.css'

export default function ResetPasswordPage() {
  const navigate = useNavigate()
  const { user, loading, updatePassword } = useAuth()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  async function handleReset() {
    setError('')
    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (!/[a-zA-Z]/.test(password)) {
      setError('Password must contain a letter')
      return
    }
    if (!/[0-9]/.test(password)) {
      setError('Password must contain a number')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setSubmitting(true)
    try {
      await updatePassword(password)
      setDone(true)
      setTimeout(() => navigate('/'), 3000)
    } catch (err) {
      setError('Something went wrong. Please request a new reset link.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.page}>
        <span className="spinner" />
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.emoji}>🔗</div>
          <h1 className={styles.title}>Invalid or expired link</h1>
          <p className={styles.message}>This reset link has expired. Please request a new one.</p>
          <button className="btn btn-accent" onClick={() => navigate('/')}>
            Go home
          </button>
        </div>
      </div>
    )
  }

  if (done) {
    return (
      <div className={styles.page}>
        <div className={styles.container}>
          <div className={styles.emoji}>✅</div>
          <h1 className={styles.title}>Password updated!</h1>
          <p className={styles.message}>Redirecting you to the feed...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.container} style={{ maxWidth: '400px' }}>
        <div className={styles.emoji}>🔑</div>
        <h1 className={styles.title}>Set new password</h1>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
          <input
            type="password"
            placeholder="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border2)',
              background: 'var(--bg3)',
              color: 'var(--text)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font)',
            }}
          />
          <input
            type="password"
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleReset()}
            style={{
              padding: '10px 14px',
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border2)',
              background: 'var(--bg3)',
              color: 'var(--text)',
              fontSize: '0.9rem',
              fontFamily: 'var(--font)',
            }}
          />
          {error && <p style={{ color: 'var(--red)', fontSize: '0.85rem', margin: 0 }}>{error}</p>}
          <button className="btn btn-accent" onClick={handleReset} disabled={submitting || !password || !confirm}>
            {submitting ? 'Updating...' : 'Update Password'}
          </button>
        </div>
      </div>
    </div>
  )
}
