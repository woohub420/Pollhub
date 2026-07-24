import { useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import styles from './Modal.module.css'

export default function AuthModal({ onClose }) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function validateSignup() {
    const clean = username.toLowerCase().trim()
    if (clean.length < 2 || clean.length > 24) return 'Username must be 2-24 characters.'
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) return 'Username can only contain letters, numbers, and underscores.'
    if (password.length < 8) return 'Password must be at least 8 characters.'
    if (!/[a-zA-Z]/.test(password)) return 'Password must contain at least one letter.'
    if (!/[0-9]/.test(password)) return 'Password must contain at least one number.'
    return ''
  }

  async function handleGoogleClick() {
    setError('')
    try {
      await signInWithGoogle()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      console.error(err)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    if (mode === 'signup') {
      const validationError = validateSignup()
      if (validationError) {
        setError(validationError)
        return
      }
    }

    setSubmitting(true)
    try {
      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        await signUp(email.trim(), password, username)
      }
      onClose()
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>{mode === 'login' ? 'Log in' : 'Sign up'}</h2>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className={styles.field}>
              <label className={styles.label}>Username</label>
              <input
                className={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                maxLength={24}
                required
              />
            </div>
          )}

          <div className={styles.field}>
            <label className={styles.label}>Email</label>
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Password</label>
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className={styles.actionsRow}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent" disabled={submitting}>
              {submitting ? <span className="spinner" /> : mode === 'login' ? 'Log in' : 'Sign up'}
            </button>
          </div>
        </form>

        <div className={styles.divider}>or</div>

        <button type="button" className={`btn btn-ghost ${styles.fullWidthBtn}`} onClick={handleGoogleClick}>
          Continue with Google
        </button>

        <div className={styles.switchRow}>
          {mode === 'login' ? (
            <>
              No account?{' '}
              <button
                className={styles.switchLink}
                onClick={() => {
                  setMode('signup')
                  setError('')
                }}
              >
                Sign up
              </button>
            </>
          ) : (
            <>
              Already have an account?{' '}
              <button
                className={styles.switchLink}
                onClick={() => {
                  setMode('login')
                  setError('')
                }}
              >
                Log in
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
