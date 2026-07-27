import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import AuthModal from './AuthModal.jsx'
import CreatePollModal from './CreatePollModal.jsx'
import CompleteProfileModal from './CompleteProfileModal.jsx'
import NotificationBell from './NotificationBell.jsx'
import styles from './Header.module.css'

export default function Header() {
  const { user, profile, loading, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropdownRef = useRef(null)
  const navigate = useNavigate()

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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
        PollHub
      </Link>

      <div className={styles.actions}>
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
                  👤 View Profile
                </div>
                <div
                  className={styles.dropdownItem}
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/profile?edit=true')
                  }}
                >
                  ✏️ Edit Profile
                </div>
                <div
                  className={styles.dropdownItem}
                  onClick={() => {
                    setDropdownOpen(false)
                    navigate('/settings/notifications')
                  }}
                >
                  🔔 Notification Settings
                </div>
                <div className={styles.dropdownDivider} />
                <div className={`${styles.dropdownItem} ${styles.danger}`} onClick={handleLogOut}>
                  🚪 Log Out
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
