import { useState, useEffect } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import PollCard from '../components/PollCard.jsx'
import UserAvatar from '../components/UserAvatar.jsx'
import { SearchIcon } from '../components/icons.jsx'
import styles from './SearchPage.module.css'

const TABS = ['polls', 'users', 'categories']

export default function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const query = searchParams.get('q') ?? ''
  const tab = searchParams.get('tab') ?? 'polls'

  const [input, setInput] = useState(query)
  const [loading, setLoading] = useState(false)
  const [polls, setPolls] = useState([])
  const [users, setUsers] = useState([])
  const [allCategories, setAllCategories] = useState([])

  useEffect(() => {
    setInput(query)
  }, [query])

  useEffect(() => {
    async function loadCategories() {
      const { data } = await supabase.from('categories').select('id, name, slug').order('name')
      setAllCategories(data ?? [])
    }
    loadCategories()
  }, [])

  useEffect(() => {
    if (query.trim().length < 1) return
    if (tab === 'polls' || tab === 'categories') searchPolls()
    if (tab === 'users') searchUsers()
  }, [query, tab])

  async function searchPolls() {
    setLoading(true)
    try {
      let q = supabase
        .from('polls')
        .select(
          `
          id, question, category, created_at, author_id, media_url, media_type,
          profiles(username, avatar_url),
          options(id, label, position, vote_count:votes(count)),
          comment_count:comments(count)
        `,
        )
        .order('created_at', { ascending: false })
        .limit(30)

      if (tab === 'categories') {
        q = q.eq('category', query.toLowerCase())
      } else {
        q = q.ilike('question', `%${query}%`)
      }

      const { data: pollsData, error } = await q
      if (error) throw error

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

  async function searchUsers() {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, created_at')
        .ilike('username', `%${query}%`)
        .limit(20)
      if (error) throw error
      setUsers(data ?? [])
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!input.trim()) return
    setSearchParams({ q: input.trim(), tab })
  }

  function handleTabChange(newTab) {
    setSearchParams({ q: query, tab: newTab })
  }

  const showEmpty =
    !loading &&
    query &&
    ((tab === 'polls' && polls.length === 0) ||
      (tab === 'users' && users.length === 0) ||
      (tab === 'categories' && polls.length === 0))

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <form className={styles.searchBar} onSubmit={handleSearch}>
          <SearchIcon className={styles.searchIcon} />
          <input
            className={styles.searchInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Search PollHub..."
            autoFocus
          />
          {input && (
            <button
              type="button"
              className={styles.clearBtn}
              onClick={() => {
                setInput('')
                setSearchParams({})
                setPolls([])
                setUsers([])
              }}
            >
              ✕
            </button>
          )}
          <button type="submit" className={styles.searchBtn}>
            Search
          </button>
        </form>

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
              onClick={() => handleTabChange(t)}
            >
              {t === 'polls' && '🗳️ Polls'}
              {t === 'users' && '👤 Users'}
              {t === 'categories' && '🏷️ Categories'}
            </button>
          ))}
        </div>

        {tab === 'categories' && (
          <div className={styles.categoryPills}>
            {allCategories.map((cat) => (
              <button
                key={cat.id}
                className={`${styles.pill} ${query === cat.slug ? styles.pillActive : ''}`}
                onClick={() => navigate(`/c/${cat.slug}`)}
              >
                c/{cat.slug}
              </button>
            ))}
          </div>
        )}

        {!query && tab !== 'categories' && (
          <div className={styles.emptyState}>
            <SearchIcon size={32} className={styles.emptyIcon} />
            <p>Search for polls or users</p>
          </div>
        )}

        {loading && (
          <div className={styles.loading}>
            <span className="spinner" />
          </div>
        )}

        {showEmpty && (
          <div className={styles.emptyState}>
            <span className={styles.emptyIcon}>😕</span>
            <p>
              No results for "<strong>{query}</strong>"
            </p>
          </div>
        )}

        {!loading && (tab === 'polls' || tab === 'categories') && polls.length > 0 && (
          <div className={styles.results}>
            {polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} onUpdate={searchPolls} />
            ))}
          </div>
        )}

        {!loading && tab === 'users' && users.length > 0 && (
          <div className={styles.userResults}>
            {users.map((u) => (
              <div key={u.id} className={styles.userCard} onClick={() => navigate(`/u/${u.username}`)}>
                <UserAvatar username={u.username} avatarUrl={u.avatar_url} size={44} />
                <div className={styles.userInfo}>
                  <span className={styles.username}>{u.username}</span>
                  <span className={styles.joined}>
                    Joined {new Date(u.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' })}
                  </span>
                </div>
                <span className={styles.userArrow}>›</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
