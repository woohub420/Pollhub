import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PollCard from '../components/PollCard.jsx'
import styles from './CategoryPage.module.css'

export default function CategoryPage() {
  const { slug } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [category, setCategory] = useState(null)
  const [polls, setPolls] = useState([])
  const [followerCount, setFollowerCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    loadAll()
  }, [slug, user])

  async function loadAll() {
    setLoading(true)
    try {
      const { data: cat } = await supabase
        .from('categories')
        .select('id, name, slug, description, created_at')
        .eq('slug', slug)
        .maybeSingle()

      if (!cat) {
        setNotFound(true)
        setLoading(false)
        return
      }
      setCategory(cat)

      const { count } = await supabase
        .from('category_follows')
        .select('*', { count: 'exact', head: true })
        .eq('category_id', cat.id)
      setFollowerCount(count ?? 0)

      if (user) {
        const { data: existing } = await supabase
          .from('category_follows')
          .select('id')
          .eq('user_id', user.id)
          .eq('category_id', cat.id)
          .maybeSingle()
        setIsFollowing(!!existing)
      }

      const { data: pollsData } = await supabase
        .from('polls')
        .select(
          `
          id, question, category, created_at, author_id, media_url, media_type,
          expires_at,
          profiles(username, avatar_url, is_bot),
          options(id, label, position, vote_count:votes(count)),
          comment_count:comments(count)
        `,
        )
        .eq('category', cat.name)
        .order('created_at', { ascending: false })
        .limit(50)

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
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  async function handleFollow() {
    if (!user) return
    if (isFollowing) {
      await supabase.from('category_follows').delete().eq('user_id', user.id).eq('category_id', category.id)
      setIsFollowing(false)
      setFollowerCount((c) => c - 1)
    } else {
      await supabase.from('category_follows').insert({ user_id: user.id, category_id: category.id })
      setIsFollowing(true)
      setFollowerCount((c) => c + 1)
    }
  }

  if (loading)
    return (
      <div className={styles.center}>
        <span className="spinner" />
      </div>
    )
  if (notFound)
    return (
      <div className={styles.center}>
        <p>Category not found.</p>
        <button className="btn btn-ghost" onClick={() => navigate('/')}>
          Back to feed
        </button>
      </div>
    )

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headerTop}>
            <div className={styles.categoryBadge}>c/{category.slug}</div>
            {user && (
              <button className={`${styles.followBtn} ${isFollowing ? styles.following : ''}`} onClick={handleFollow}>
                {isFollowing ? 'Following' : '+ Follow'}
              </button>
            )}
          </div>
          <h1 className={styles.categoryName}>{category.name}</h1>
          {category.description && <p className={styles.description}>{category.description}</p>}
          <div className={styles.meta}>
            <span>{followerCount.toLocaleString()} followers</span>
            <span>·</span>
            <span>{polls.length} polls</span>
          </div>
        </div>

        {polls.length === 0 ? (
          <div className={styles.empty}>
            <span>😕</span>
            <p>No polls in this category yet. Be the first!</p>
          </div>
        ) : (
          <div className={styles.polls}>
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} onUpdate={loadAll} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
