import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import AuthModal from './AuthModal.jsx'
import CreatePollModal from './CreatePollModal.jsx'
import styles from './Header.module.css'

export default function Header() {
  const { user, profile, loading, signOut } = useAuth()
  const [showAuth, setShowAuth] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const navigate = useNavigate()

  function handleNewPoll() {
    if (!user) {
      setShowAuth(true)
      return
    }
    setShowCreate(true)
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
          <div className={styles.userBox}>
            <span className={styles.username}>{profile?.username ?? '...'}</span>
            <button className="btn btn-ghost btn-sm" onClick={signOut}>
              Log out
            </button>
          </div>
        ) : (
          <button className="btn btn-ghost btn-sm" onClick={() => setShowAuth(true)}>
            Log in
          </button>
        )}
      </div>

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
