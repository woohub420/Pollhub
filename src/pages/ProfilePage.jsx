import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import UserAvatar from '../components/UserAvatar.jsx'
import styles from './ProfilePage.module.css'

export default function ProfilePage() {
  const { user, profile, refreshProfile } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [editOpen, setEditOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    if (searchParams.get('edit') === 'true') {
      setUsername(profile?.username ?? '')
      setEditOpen(true)
    }
  }, [searchParams, profile])

  useEffect(() => {
    async function loadCounts() {
      if (!profile?.id) return
      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profile.id)
      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profile.id)
      setFollowerCount(followers ?? 0)
      setFollowingCount(following ?? 0)
    }
    loadCounts()
  }, [profile?.id])

  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar must be 5MB or smaller.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('JPG, PNG, or WebP only.')
      return
    }

    setError('')
    setUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${user.id}/avatar.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBust })
        .eq('id', user.id)
      if (updateErr) throw updateErr

      await refreshProfile()
    } catch (err) {
      console.error(err)
      setError('Something went wrong uploading your avatar.')
    } finally {
      setUploading(false)
    }
  }

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
        <label className={styles.avatarUpload}>
          <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} size={72} />
          <div className={styles.avatarOverlay}>{uploading ? '...' : '📷'}</div>
          <input type="file" accept="image/jpeg,image/png,image/webp" onChange={handleAvatarUpload} hidden />
        </label>
        <h2 className={styles.username}>{profile.username ?? '...'}</h2>
        <p className={styles.joined}>
          Joined {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '...'}
        </p>

        <div className={styles.statsRow}>
          <span>{followerCount} Followers</span>
          <span>{followingCount} Following</span>
        </div>

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
