import { useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { useAuth } from '../lib/AuthContext.jsx'
import styles from './Modal.module.css'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export default function AuthModal({ onClose }) {
  const { signIn, signUp, signInWithGoogle } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileKey, setTurnstileKey] = useState(0)

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

    if (!turnstileToken) {
      setError('Please complete the security check.')
      return
    }

    setSubmitting(true)
    try {
      const verifyRes = await fetch('/api/verify-turnstile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: turnstileToken }),
      })
      const verifyData = await verifyRes.json()
      if (!verifyData.success) {
        setError('Security check failed. Please try again.')
        setTurnstileKey((k) => k + 1)
        setTurnstileToken('')
        return
      }

      if (mode === 'login') {
        await signIn(email.trim(), password)
      } else {
        await signUp(email.trim(), password, username)
      }
      onClose()
    } catch (err) {
      const msg = err.message?.toLowerCase() ?? ''
      if (mode === 'login' && (msg.includes('invalid') || msg.includes('credentials'))) {
        setError('Email or password is incorrect.')
      } else {
        setError(err.message || 'Something went wrong. Please try again.')
      }
      console.error(err)
      setTurnstileKey((k) => k + 1)
      setTurnstileToken('')
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

          {TURNSTILE_SITE_KEY && (
            <div className={styles.field}>
              <Turnstile
                key={turnstileKey}
                siteKey={TURNSTILE_SITE_KEY}
                onSuccess={(token) => setTurnstileToken(token)}
                onExpire={() => setTurnstileToken('')}
                onError={() => setTurnstileToken('')}
                options={{ theme: 'dark' }}
              />
            </div>
          )}

          <div className={styles.actionsRow}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-accent"
              disabled={submitting || (TURNSTILE_SITE_KEY && !turnstileToken)}
            >
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
