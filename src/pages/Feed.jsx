import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { CATEGORIES } from '../lib/constants.js'
import PollCard from '../components/PollCard.jsx'
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
  const [polls, setPolls] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [sort, setSort] = useState('hot')
  const [category, setCategory] = useState('all')

  useEffect(() => {
    loadPolls()
  }, [])

  async function loadPolls() {
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchErr } = await supabase
        .from('polls')
        .select(
          `
          id, question, category, created_at, media_url, media_type,
          profiles(username),
          options(id, label, position, vote_count:votes(count)),
          comment_count:comments(count)
        `,
        )
        .order('created_at', { ascending: false })
        .limit(100)
      if (fetchErr) throw fetchErr
      setPolls(data ?? [])
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
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
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
      </aside>
    </div>
  )
}
