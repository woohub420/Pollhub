import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import { checkRateLimit, LIMITS } from '../lib/rateLimit.js'
import PollCard from '../components/PollCard.jsx'
import UserAvatar from '../components/UserAvatar.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import styles from './UserProfilePage.module.css'

export default function UserProfilePage() {
  const { username } = useParams()
  const { user, profile: viewerProfile } = useAuth()
  const navigate = useNavigate()
  const [profile, setProfile] = useState(null)
  const [polls, setPolls] = useState([])
  const [followerCount, setFollowerCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [error, setError] = useState('')
  const [avatarUploading, setAvatarUploading] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [username, user])

  async function loadProfile() {
    setLoading(true)
    setError('')
    setNotFound(false)
    try {
      const { data: profileData, error: profileErr } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, created_at, is_bot')
        .eq('username', username)
        .maybeSingle()
      if (profileErr) throw profileErr
      if (!profileData) {
        setNotFound(true)
        return
      }
      setProfile(profileData)

      const { data: pollsData, error: pollsErr } = await supabase
        .from('polls')
        .select(
          `
          id, question, category, created_at, author_id, media_url, media_type,
          expires_at,
          profiles(username, avatar_url, is_bot),
          options(id, label, position, vote_count:votes(count)),
          comment_count:comments(count),
          like_count:likes(count)
        `,
        )
        .eq('author_id', profileData.id)
        .order('created_at', { ascending: false })
      if (pollsErr) throw pollsErr

      // PostgREST isn't recognizing the poll_media foreign key relationship
      // for embedding, so fetch it separately and merge instead.
      const pollIds = (pollsData ?? []).map((p) => p.id)
      const mediaMap = {}
      if (pollIds.length > 0) {
        const { data: mediaData } = await supabase
          .from('poll_media')
          .select('id, poll_id, url, media_type, position')
          .in('poll_id', pollIds)
        ;(mediaData ?? []).forEach((m) => {
          if (!mediaMap[m.poll_id]) mediaMap[m.poll_id] = []
          mediaMap[m.poll_id].push(m)
        })
      }
      setPolls((pollsData ?? []).map((p) => ({ ...p, poll_media: mediaMap[p.id] ?? [] })))

      const { count: followers } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', profileData.id)
      const { count: following } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', profileData.id)
      setFollowerCount(followers ?? 0)
      setFollowingCount(following ?? 0)

      if (user) {
        const { data: existingFollow } = await supabase
          .from('follows')
          .select('id')
          .eq('follower_id', user.id)
          .eq('following_id', profileData.id)
          .maybeSingle()
        setIsFollowing(!!existingFollow)
      } else {
        setIsFollowing(false)
      }
    } catch (err) {
      console.error(err)
      setError('Something went wrong loading this profile.')
    } finally {
      setLoading(false)
    }
  }

  async function handleFollow() {
    if (!user) {
      setError('Log in to follow users.')
      return
    }

    try {
      checkRateLimit('FOLLOW', LIMITS.FOLLOW.max, LIMITS.FOLLOW.window)
    } catch (err) {
      setError(err.message)
      return
    }

    try {
      if (isFollowing) {
        const { error: delErr } = await supabase
          .from('follows')
          .delete()
          .eq('follower_id', user.id)
          .eq('following_id', profile.id)
        if (delErr) throw delErr
        setIsFollowing(false)
        setFollowerCount((c) => c - 1)
      } else {
        const { error: insErr } = await supabase
          .from('follows')
          .insert({ follower_id: user.id, following_id: profile.id })
        if (insErr) throw insErr
        setIsFollowing(true)
        setFollowerCount((c) => c + 1)

        await supabase.from('notifications').insert({
          user_id: profile.id,
          actor_id: user.id,
          type: 'follow',
        })
      }
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    }
  }

  async function handleAdminAvatarUpload(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file || !profile) return
    if (file.size > 5 * 1024 * 1024) {
      setError('Avatar must be 5MB or smaller.')
      return
    }
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setError('JPG, PNG, or WebP only.')
      return
    }

    setError('')
    setAvatarUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${profile.id}/avatar.${ext}`
      const { error: uploadErr } = await supabase.storage.from('avatars').upload(path, file, { upsert: true })
      if (uploadErr) throw uploadErr

      const {
        data: { publicUrl },
      } = supabase.storage.from('avatars').getPublicUrl(path)
      const urlWithCacheBust = `${publicUrl}?t=${Date.now()}`

      const { error: updateErr } = await supabase
        .from('profiles')
        .update({ avatar_url: urlWithCacheBust })
        .eq('id', profile.id)
      if (updateErr) throw updateErr

      await loadProfile()
    } catch (err) {
      console.error(err)
      setError('Something went wrong uploading their avatar.')
    } finally {
      setAvatarUploading(false)
    }
  }

  if (loading)
    return (
      <div className={styles.center}>
        <span className="spinner" />
      </div>
    )
  if (notFound) return <NotFoundPage />

  const isOwnProfile = user?.id === profile.id
  const totalLikes = polls.reduce((sum, p) => sum + (p.like_count?.[0]?.count ?? 0), 0)

  return (
    <div className={styles.layout}>
      <Link to="/" className={styles.back}>
        &larr; Back to feed
      </Link>

      <div className={styles.card}>
        <div className={styles.avatarBox}>
          <UserAvatar username={profile.username} avatarUrl={profile.avatar_url} size={72} />
        </div>
        {viewerProfile?.is_admin && !isOwnProfile && (
          <label className="btn btn-ghost btn-sm" style={{ cursor: 'pointer' }}>
            {avatarUploading ? <span className="spinner" /> : '✏️ Change avatar (Admin)'}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAdminAvatarUpload}
              disabled={avatarUploading}
              style={{ display: 'none' }}
            />
          </label>
        )}
        <h2 className={styles.username}>{profile.username}</h2>
        {profile.is_bot && <span className={styles.botBadge}>Automated account</span>}
        <p className={styles.joined}>
          Member since {profile.created_at ? new Date(profile.created_at).toLocaleDateString() : '...'}
        </p>

        <div className={styles.statsRow}>
          <span>{polls.length} Polls</span>
          <span>{totalLikes} Likes</span>
          <span>{followerCount} Followers</span>
          <span>{followingCount} Following</span>
        </div>

        {error && <div className={styles.error}>{error}</div>}

        {isOwnProfile ? (
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/profile?edit=true')}>
            Edit Profile
          </button>
        ) : (
          <button
            className={isFollowing ? 'btn btn-ghost btn-sm' : 'btn btn-accent btn-sm'}
            onClick={handleFollow}
          >
            {isFollowing ? 'Following' : 'Follow'}
          </button>
        )}
      </div>

      <div className={styles.polls}>
        {polls.length === 0 ? (
          <div className={styles.empty}>No polls yet.</div>
        ) : (
          polls.map((poll) => <PollCard key={poll.id} poll={poll} onUpdate={loadProfile} />)
        )}
      </div>
    </div>
  )
}
