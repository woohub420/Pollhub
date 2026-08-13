import { useState } from 'react'
import { Turnstile } from '@marsidev/react-turnstile'
import { useAuth } from '../lib/AuthContext.jsx'
import styles from './Modal.module.css'

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY

export default function AuthModal({ onClose }) {
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth()
  const [mode, setMode] = useState('login') // 'login' | 'signup' | 'forgot'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState('')
  const [turnstileKey, setTurnstileKey] = useState(0)
  const [resetEmail, setResetEmail] = useState('')
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const [resetError, setResetError] = useState('')

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

  async function handleForgotPassword() {
    if (!resetEmail.trim()) {
      setResetError('Please enter your email')
      return
    }
    setResetLoading(true)
    setResetError('')
    try {
      await resetPassword(resetEmail.trim())
      setResetSent(true)
    } catch (err) {
      setResetError('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setResetLoading(false)
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
        {mode === 'forgot' ? (
          <div className={styles.forgotView}>
            {resetSent ? (
              <>
                <div className={styles.successIcon}>📧</div>
                <h2 className={styles.title}>Check your email</h2>
                <p className={styles.subtitle}>
                  We sent a password reset link to <strong>{resetEmail}</strong>. Check your inbox and follow the
                  link.
                </p>
                <button
                  className="btn btn-ghost"
                  onClick={() => {
                    setMode('login')
                    setResetSent(false)
                  }}
                >
                  Back to login
                </button>
              </>
            ) : (
              <>
                <h2 className={styles.title}>Reset your password</h2>
                <p className={styles.subtitle}>Enter your email and we'll send you a reset link.</p>
                <div className={styles.field}>
                  <label className={styles.label}>Email</label>
                  <input
                    className={styles.input}
                    type="email"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="your@email.com"
                    onKeyDown={(e) => e.key === 'Enter' && handleForgotPassword()}
                  />
                </div>
                {resetError && <p className={styles.error}>{resetError}</p>}
                <div className={styles.actionsRow}>
                  <button className="btn btn-ghost" onClick={() => setMode('login')}>
                    Back
                  </button>
                  <button
                    className="btn btn-accent"
                    onClick={handleForgotPassword}
                    disabled={resetLoading || !resetEmail.trim()}
                  >
                    {resetLoading ? 'Sending...' : 'Send Reset Link'}
                  </button>
                </div>
              </>
            )}
          </div>
        ) : (
          <>
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
            {mode === 'login' && (
              <button
                type="button"
                className={styles.forgotLink}
                onClick={() => {
                  setMode('forgot')
                  setResetError('')
                }}
              >
                Forgot password?
              </button>
            )}
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
          </>
        )}
      </div>
    </div>
  )
}
