import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editOpen, setEditOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setUsername(profile?.username ?? '')
      setEditOpen(true)
    }
  }, [searchParams, profile])

  function openEdit() {
    setUsername(profile?.username ?? '')
    setError('')
    setEditOpen(true)
  }

  function closeEdit() {
    setEditOpen(false)
    setSearchParams({})
  }

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
      if (clean !== profile?.username) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .eq('username', clean)
          .maybeSingle()
        if (existing) {
          setError('That username is already taken.')
          return
        }
      }

      const { error: updateErr } = await supabase.from('profiles').update({ username: clean }).eq('id', user.id)
      if (updateErr) throw updateErr

      await refreshProfile()
      closeEdit()
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (!user || !profile) {
    return (
      <div className={styles.center}>
        <span className="spinner" />
      </div>
    )
  }

  return (
    <div className={styles.layout}>
      <Link to="/" className={styles.back}>
        &larr; Back to feed
      </Link>

      <div className={styles.card}>
        <div className={styles.avatarLarge}>{profile.username?.[0]?.toUpperCase() ?? '?'}</div>
        <h2 className={styles.username}>{profile.username ?? '...'}</h2>
        <p className={styles.joined}>
          Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '...'}
        </p>

        {editOpen ? (
          <form onSubmit={handleSubmit}>
            {error && <div className={styles.error}>{error}</div>}
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
              <button type="button" className="btn btn-ghost" onClick={closeEdit}>
                Cancel
              </button>
              <button type="submit" className="btn btn-accent" disabled={submitting}>
                {submitting ? <span className="spinner" /> : 'Save'}
              </button>
            </div>
          </form>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={openEdit}>
            Edit Profile
          </button>
        )}
      </div>
    </div>
  )
}
