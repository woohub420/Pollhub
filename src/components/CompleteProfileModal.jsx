import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import styles from './Modal.module.css'

export default function CompleteProfileModal() {
  const { user, refreshProfile } = useAuth()
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const clean = username.toLowerCase().trim()
    if (clean.length < 2 || clean.length > 24) {
      setError('Username must be 2-24 characters.')
      return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(clean)) {
      setError('Username can only contain letters, numbers, and underscores.')
      return
    }

    setSubmitting(true)
    try {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', clean)
        .maybeSingle()
      if (existing) {
        setError('That username is already taken.')
        return
      }

      const { error: updateErr } = await supabase.from('profiles').update({ username: clean }).eq('id', user.id)
      if (updateErr) throw updateErr

      await refreshProfile()
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Choose a username</h2>
        <p className={styles.label}>One last step before you can start voting and posting.</p>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Username</label>
            <input
              className={styles.input}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={24}
              autoFocus
              required
            />
          </div>

          <div className={styles.actionsRow}>
            <button type="submit" className="btn btn-accent" disabled={submitting}>
              {submitting ? <span className="spinner" /> : 'Continue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
