import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import PollCard from '../components/PollCard.jsx'
import AuthModal from '../components/AuthModal.jsx'
import CreateCategoryModal from '../components/CreateCategoryModal.jsx'
import styles from './Feed.module.css'

const SORT_MODES = ['hot', 'new', 'top']

function totalVotes(poll) {
  return poll.options.reduce((sum, o) => sum + (o.vote_count?.[0]?.count ?? 0), 0)
}

function hotScore(poll) {
  const ageHours = (Date.now() - new Date(poll.created_at).getTime()) / 3600000
  return totalVotes(poll) / Math.pow(ageHours + 2, 1.5)
}

export default function Feed() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sort, setSort] = useState('hot')
  const [category, setCategory] = useState('all')
  const [followedCategories, setFollowedCategories] = useState([])
  const [allCategories, setAllCategories] = useState([])
  const [authOpen, setAuthOpen] = useState(false)
  const [createCategoryOpen, setCreateCategoryOpen] = useState(false)
  const [feedMode, setFeedMode] = useState('all') // 'all' | 'following'

  useEffect(() => {
    loadPolls()
  }, [feedMode, user])

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from('categories').select('id, name, slug').order('name')
      setAllCategories(data ?? [])
    }
    loadCategories()
  }, [])

  useEffect(() => {
    if (!user) {
      setFollowedCategories([])
      return
    }
    async function loadFollowedCategories() {
      const { data } = await supabase
        .from('category_follows')
        .select('categories(id, name, slug)')
        .eq('user_id', user.id)
      setFollowedCategories((data ?? []).map((d) => d.categories).filter(Boolean))
    }
    loadFollowedCategories()
  }, [user])

  async function loadPolls() {
    setLoading(true)
    setError('')
    try {
      let authorIds = null

      if (feedMode === 'following' && user) {
        const { data: followData } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', user.id)

        authorIds = (followData ?? []).map((f) => f.following_id)

        if (authorIds.length === 0) {
          setPolls([])
          setLoading(false)
          return
        }
      }

      let q = supabase
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
        .order('created_at', { ascending: false })
        .limit(100)

      if (authorIds) q = q.in('author_id', authorIds)

      const { data: pollsData, error: pollsErr } = await q
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

      const merged = (pollsData ?? []).map((p) => ({ ...p, poll_media: mediaMap[p.id] ?? [] }))
      setPolls(merged)
    } catch (err) {
      console.error(err)
      setError('Something went wrong loading the feed.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = useMemo(() => {
    let list = category === 'all' ? polls : polls.filter((p) => p.category === category)
    list = list.slice()
    if (sort === 'new') list.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    else if (sort === 'top') list.sort((a, b) => totalVotes(b) - totalVotes(a))
    else list.sort((a, b) => hotScore(b) - hotScore(a))
    return list
  }, [polls, sort, category])

  const trending = useMemo(() => polls.slice().sort((a, b) => totalVotes(b) - totalVotes(a)).slice(0, 5), [polls])

  const stats = useMemo(
    () => ({
      totalPolls: polls.length,
      totalVotes: polls.reduce((sum, p) => sum + totalVotes(p), 0),
    }),
    [polls],
  )

  return (
    <div className={styles.layout}>
      <main className={styles.main}>
        <div className={styles.feedTabs}>
          <button
            className={`${styles.feedTab} ${feedMode === 'all' ? styles.feedTabActive : ''}`}
            onClick={() => setFeedMode('all')}
          >
            All
          </button>
          <button
            className={`${styles.feedTab} ${feedMode === 'following' ? styles.feedTabActive : ''}`}
            onClick={() => (user ? setFeedMode('following') : setAuthOpen(true))}
          >
            Following
          </button>
        </div>

        <div className={styles.controls}>
          <div className={styles.sortTabs}>
            {SORT_MODES.map((mode) => (
              <button
                key={mode}
                className={`${styles.sortTab} ${sort === mode ? styles.sortTabActive : ''}`}
                onClick={() => setSort(mode)}
              >
                {mode[0].toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
          <select className={styles.categorySelect} value={category} onChange={(e) => setCategory(e.target.value)}>
            <option value="all">All categories</option>
            {allCategories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className={styles.center}>
            <span className="spinner" />
          </div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : filtered.length === 0 && feedMode === 'following' ? (
          <div className={styles.emptyFollowing}>
            <p>No polls from people you follow yet.</p>
            <p className={styles.emptyFollowingSub}>Follow some users to see their polls here!</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className={styles.empty}>No polls yet. Be the first to create one.</div>
        ) : (
          filtered.map((poll) => <PollCard key={poll.id} poll={poll} onUpdate={loadPolls} />)
        )}
      </main>

      <aside className={styles.sidebar}>
        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarTitle}>Live Stats</h3>
          <div className={styles.statRow}>
            <span>Total polls</span>
            <span>{stats.totalPolls}</span>
          </div>
          <div className={styles.statRow}>
            <span>Total votes</span>
            <span>{stats.totalVotes}</span>
          </div>
        </div>

        <div className={styles.sidebarCard}>
          <h3 className={styles.sidebarTitle}>Trending</h3>
          {trending.length === 0 ? (
            <div className={styles.empty}>Nothing trending yet.</div>
          ) : (
            <ol className={styles.trendingList}>
              {trending.map((poll) => (
                <li key={poll.id} className={styles.trendingItem}>
                  <Link to={`/poll/${poll.id}`}>{poll.question}</Link>
                </li>
              ))}
            </ol>
          )}
        </div>

        {user && followedCategories.length > 0 && (
          <div className={styles.sidebarCard}>
            <h3 className={styles.sidebarTitle}>Your Categories</h3>
            {followedCategories.map((cat) => (
              <div key={cat.id} className={styles.categoryItem} onClick={() => navigate(`/c/${cat.slug}`)}>
                c/{cat.slug}
              </div>
            ))}
          </div>
        )}

        <button
          className={`btn btn-accent ${styles.createCategoryBtn}`}
          onClick={() => (user ? setCreateCategoryOpen(true) : setAuthOpen(true))}
        >
          + Create Category
        </button>
      </aside>

      {authOpen && <AuthModal onClose={() => setAuthOpen(false)} />}
      {createCategoryOpen && <CreateCategoryModal onClose={() => setCreateCategoryOpen(false)} />}
    </div>
  )
}
