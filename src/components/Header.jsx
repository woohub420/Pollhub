import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import AuthModal from './AuthModal.jsx'
import CreatePollModal from './CreatePollModal.jsx'
import CompleteProfileModal from './CompleteProfileModal.jsx'
import NotificationBell from './NotificationBell.jsx'
import { SearchIcon, BellIcon, UserIcon, EditIcon, LogOutIcon } from './icons.jsx'
import styles from './Header.module.css'

export default function Header() {
  const { user, profile, loading, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [searchInput, setSearchInput] = useState('')
  const [suggestions, setSuggestions] = useState(null) // null = closed, [] = open but empty
  const [suggestLoading, setSuggestLoading] = useState(false)
  const dropdownRef = useRef(null)
  const searchRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSuggestions(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (searchInput.trim().length < 1) {
      setSuggestions(null)
      return
    }
    const timer = setTimeout(() => fetchSuggestions(searchInput.trim()), 250)
    return () => clearTimeout(timer)
  }, [searchInput])

  async function fetchSuggestions(q) {
    setSuggestLoading(true)
    try {
      const [pollsRes, usersRes, catsRes] = await Promise.all([
        supabase.from('polls').select('id, question, category').ilike('question', `%${q}%`).limit(4),
        supabase.from('profiles').select('id, username, avatar_url').ilike('username', `%${q}%`).limit(3),
        supabase.from('categories').select('id, name, slug').ilike('name', `%${q}%`).limit(3),
      ])

      setSuggestions({
        polls: pollsRes.data ?? [],
        users: usersRes.data ?? [],
        categories: catsRes.data ?? [],
      })
    } catch (err) {
      console.error(err)
    } finally {
      setSuggestLoading(false)
    }
  }

  function handleSelect(path) {
    setSuggestions(null)
    setSearchInput('')
    navigate(path)
  }

  function handleSearch(e) {
    e.preventDefault()
    if (!searchInput.trim()) return
    setSuggestions(null)
    navigate(`/search?q=${encodeURIComponent(searchInput.trim())}&tab=polls`)
    setSearchInput('')
  }

  function handleNewPoll() {
    if (!user) {
      setShowAuth(true)
      return
    }
    setShowCreate(true)
  }

  async function handleLogOut() {
    setDropdownOpen(false)
    await signOut()
    navigate('/')
  }

  return (
    <header className={styles.header}>
      <Link to="/" className={styles.logo}>
        <img src="/logo.png" alt="" className={styles.logoIcon} />
        <span className={styles.logoText}>PollHub</span>
      </Link>

      <div className={styles.searchWrapper} ref={searchRef}>
        <form className={styles.headerSearch} onSubmit={handleSearch}>
          <SearchIcon className={styles.headerSearchIcon} />
          <input
            className={styles.headerSearchInput}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="Search polls, users, communities..."
            onFocus={() => searchInput.trim().length > 0 && fetchSuggestions(searchInput.trim())}
          />
          {searchInput && (
            <button
              type="button"
              className={styles.searchClearBtn}
              onClick={() => {
                setSearchInput('')
                setSuggestions(null)
              }}
            >
              ✕
            </button>
          )}
        </form>

        {suggestions && (
          <div className={styles.suggestDropdown}>
            {suggestLoading && (
              <div className={styles.suggestLoading}>
                <span className="spinner" />
              </div>
            )}

            {!suggestLoading && (
              <>
                {suggestions.categories.length > 0 && (
                  <div className={styles.suggestGroup}>
                    <div className={styles.suggestGroupLabel}>Communities</div>
                    {suggestions.categories.map((cat) => (
                      <div
                        key={cat.id}
                        className={styles.suggestItem}
                        onClick={() => handleSelect(`/c/${cat.slug}`)}
                      >
                        <span className={styles.suggestIcon}>🏷️</span>
                        <div className={styles.suggestText}>
                          <span className={styles.suggestMain}>c/{cat.slug}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {suggestions.users.length > 0 && (
                  <div className={styles.suggestGroup}>
                    <div className={styles.suggestGroupLabel}>Users</div>
                    {suggestions.users.map((u) => (
                      <div key={u.id} className={styles.suggestItem} onClick={() => handleSelect(`/u/${u.username}`)}>
                        <span className={styles.suggestIcon}>👤</span>
                        <div className={styles.suggestText}>
                          <span className={styles.suggestMain}>{u.username}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {suggestions.polls.length > 0 && (
                  <div className={styles.suggestGroup}>
                    <div className={styles.suggestGroupLabel}>Polls</div>
                    {suggestions.polls.map((p) => (
                      <div key={p.id} className={styles.suggestItem} onClick={() => handleSelect(`/poll/${p.id}`)}>
                        <span className={styles.suggestIcon}>🗳️</span>
                        <div className={styles.suggestText}>
                          <span className={styles.suggestMain}>{p.question}</span>
                          <span className={styles.suggestSub}>c/{p.category}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {suggestions.polls.length === 0 &&
                  suggestions.users.length === 0 &&
                  suggestions.categories.length === 0 && (
                    <div className={styles.suggestEmpty}>
                      No results for "<strong>{searchInput}</strong>"
                    </div>
                  )}

                {(suggestions.polls.length > 0 || suggestions.users.length > 0) && (
                  <div
                    className={styles.suggestFooter}
                    onClick={() => handleSelect(`/search?q=${encodeURIComponent(searchInput)}&tab=polls`)}
                  >
                    See all results for "<strong>{searchInput}</strong>"
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <button className={styles.mobileSearchBtn} onClick={() => navigate('/search')} aria-label="Search">
          <SearchIcon size={19} />
        </button>

        <button className="btn btn-accent btn-sm" onClick={handleNewPoll}>
          + New Poll
        </button>

        {loading ? (
          <span className="spinner" />
        ) : user ? (
          <>
            <NotificationBell />
            <div className={styles.avatarWrapper} ref={dropdownRef}>
            <div className={styles.avatar} onClick={() => setDropdownOpen((o) => !o)}>
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt={profile.username} className={styles.avatarImg} />
              ) : (
                profile?.username?.[0]?.toUpperCase() ?? '?'
              )}
            </div>
            {dropdownOpen && (
              <div className={styles.dropdown}>
                <div className={styles.dropdownHeader}>
                  <div className={styles.dropdownHeaderAvatar}>
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt={profile.username} className={styles.avatarImg} />
                    ) : (
                      profile?.username?.[0]?.toUpperCase() ?? '?'
                    )}
                  </div>
                  <div className={styles.dropdownHeaderText}>
                    <strong>{profile?.username ?? '...'}</strong>
                    <span>u/{profile?.username ?? '...'}</span>
                  </div>
                </div>
                <div
                  className={styles.dropdownItem}
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/profile')
                  }}
                >
                  <UserIcon size={15} /> View Profile
                </div>
                <div
                  className={styles.dropdownItem}
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/profile?edit=true')
                  }}
                >
                  <EditIcon size={15} /> Edit Profile
                </div>
                {profile?.is_admin && (
                  <div
                    className={styles.dropdownItem}
                    onClick={() => {
                      navigate('/admin')
                      setDropdownOpen(false)
                    }}
                  >
                    🛡️ Admin Dashboard
                  </div>
                )}
                <div
                  className={styles.dropdownItem}
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/settings/notifications')
                  }}
                >
                  <BellIcon size={15} /> Notification Settings
                </div>
                <div className={styles.dropdownDivider} />
                <div className={`${styles.dropdownItem} ${styles.danger}`} onClick={handleLogOut}>
                  <LogOutIcon size={15} /> Log Out
                </div>
              </div>
            )}
            </div>
          </>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAuth(true)}>
            Log in
          </button>
        )}
      </div>

      {user && profile && !profile.username && <CompleteProfileModal />}
      {showAuth && <AuthModal onClose={() => setShowAuth(false)} />}
      {showCreate && (
        <CreatePollModal
          onClose={() => setShowCreate(false)}
          onCreated={(pollId) => {
            setShowCreate(false)
            navigate(`/poll/${pollId}`)
          }}
        />
      )}
    </header>
  )
}
