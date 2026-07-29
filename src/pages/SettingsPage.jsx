import { useEffect, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import {
  UserIcon,
  BellIcon,
  SettingsIcon,
  SunIcon,
  MoonIcon,
  TrashIcon,
  VoteIcon,
  HeartIcon,
  CommentIcon,
  ReplyIcon,
} from '../components/icons.jsx'
import styles from './SettingsPage.module.css'

const TABS = [
  { id: 'account', label: 'Account', icon: UserIcon },
  { id: 'notifications', label: 'Notifications', icon: BellIcon },
  { id: 'appearance', label: 'Appearance', icon: SettingsIcon },
]

const NOTIF_ITEMS = [
  { key: 'notify_vote', icon: VoteIcon, label: 'Votes', description: 'When someone votes on your poll' },
  { key: 'notify_like', icon: HeartIcon, label: 'Likes', description: 'When someone likes your poll' },
  { key: 'notify_follow', icon: UserIcon, label: 'New Followers', description: 'When someone follows you' },
  { key: 'notify_comment', icon: CommentIcon, label: 'Comments', description: 'When someone comments on your poll' },
  { key: 'notify_reply', icon: ReplyIcon, label: 'Replies', description: 'When someone replies to your comment' },
]

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const tab = searchParams.get('tab') ?? (location.pathname === '/settings/notifications' ? 'notifications' : 'account')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordSuccess, setPasswordSuccess] = useState('')
  const [passwordLoading, setPasswordLoading] = useState(false)

  const [deleteConfirm, setDeleteConfirm] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [notifSettings, setNotifSettings] = useState({
    notify_vote: true,
    notify_like: true,
    notify_follow: true,
    notify_comment: true,
    notify_reply: true,
  })
  const [notifSaved, setNotifSaved] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    async function loadNotifSettings() {
      const { data } = await supabase
        .from('notification_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) setNotifSettings(data)
    }
    loadNotifSettings()
  }, [user])

  async function handlePasswordChange() {
    setPasswordError('')
    setPasswordSuccess('')
    if (newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters.')
      return
    }
    if (!/[a-zA-Z]/.test(newPassword)) {
      setPasswordError('Password must contain a letter.')
      return
    }
    if (!/[0-9]/.test(newPassword)) {
      setPasswordError('Password must contain a number.')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('Passwords do not match.')
      return
    }

    setPasswordLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      setPasswordSuccess('Password updated successfully.')
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      console.error(err)
      setPasswordError('Something went wrong. Please try again.')
    } finally {
      setPasswordLoading(false)
    }
  }

  async function handleDeleteAccount() {
    if (deleteConfirm !== profile?.username) {
      setDeleteError(`Type your username "${profile?.username}" to confirm.`)
      return
    }
    setDeleteError('')
    setDeleteLoading(true)
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const res = await fetch('/api/delete-account', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session?.access_token}` },
      })
      const data = await res.json()
      if (!data.success) throw new Error(data.error || 'Could not delete account.')

      await signOut()
      navigate('/')
    } catch (err) {
      console.error(err)
      setDeleteError('Something went wrong. Please try again.')
    } finally {
      setDeleteLoading(false)
    }
  }

  async function handleNotifToggle(key) {
    const updated = { ...notifSettings, [key]: !notifSettings[key] }
    setNotifSettings(updated)
    await supabase.from('notification_settings').upsert({ user_id: user.id, ...updated })
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 2000)
  }

  async function handleThemeChange(t) {
    document.documentElement.setAttribute('data-theme', t)
    await supabase.from('profiles').update({ theme: t }).eq('id', user.id)
    await refreshProfile()
  }

  const theme = profile?.theme ?? 'dark'
  const isGoogleUser = user?.app_metadata?.provider === 'google'

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>Settings</h1>

        <div className={styles.tabs}>
          {TABS.map((t) => (
            <button
              key={t.id}
              className={`${styles.tab} ${tab === t.id ? styles.tabActive : ''}`}
              onClick={() => setSearchParams({ tab: t.id })}
            >
              <t.icon size={15} /> {t.label}
            </button>
          ))}
        </div>

        {tab === 'account' && (
          <div className={styles.section}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Change Password</h2>
              {isGoogleUser ? (
                <p className={styles.muted}>You signed in with Google — password change is not available.</p>
              ) : (
                <>
                  <div className={styles.field}>
                    <label className={styles.label}>New Password</label>
                    <input
                      type="password"
                      className={styles.input}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 8 chars, 1 letter, 1 number"
                    />
                  </div>
                  <div className={styles.field}>
                    <label className={styles.label}>Confirm Password</label>
                    <input
                      type="password"
                      className={styles.input}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat new password"
                    />
                  </div>
                  {passwordError && <p className={styles.error}>{passwordError}</p>}
                  {passwordSuccess && <p className={styles.success}>{passwordSuccess}</p>}
                  <button
                    className="btn btn-accent"
                    onClick={handlePasswordChange}
                    disabled={passwordLoading || !newPassword || !confirmPassword}
                  >
                    {passwordLoading ? <span className="spinner" /> : 'Update Password'}
                  </button>
                </>
              )}
            </div>

            <div className={`${styles.card} ${styles.dangerCard}`}>
              <h2 className={`${styles.cardTitle} ${styles.dangerTitle}`}>Delete Account</h2>
              <p className={styles.muted}>
                This will permanently delete your account, all your polls, votes, and comments. This action cannot
                be undone.
              </p>
              <div className={styles.field}>
                <label className={styles.label}>
                  Type <strong>{profile?.username}</strong> to confirm
                </label>
                <input
                  className={styles.input}
                  value={deleteConfirm}
                  onChange={(e) => {
                    setDeleteConfirm(e.target.value)
                    setDeleteError('')
                  }}
                  placeholder={profile?.username}
                />
              </div>
              {deleteError && <p className={styles.error}>{deleteError}</p>}
              <button
                className={styles.btnDanger}
                onClick={handleDeleteAccount}
                disabled={deleteLoading || deleteConfirm !== profile?.username}
              >
                {deleteLoading ? <span className="spinner" /> : (
                  <>
                    <TrashIcon size={14} /> Delete My Account
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {tab === 'notifications' && (
          <div className={styles.section}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Notification Preferences</h2>
              <p className={styles.muted}>Choose what you want to be notified about.</p>
              <div className={styles.notifList}>
                {NOTIF_ITEMS.map((item) => (
                  <div key={item.key} className={styles.notifRow}>
                    <div className={styles.notifLeft}>
                      <span className={styles.notifIcon}>
                        <item.icon size={17} />
                      </span>
                      <div className={styles.notifText}>
                        <span className={styles.notifLabel}>{item.label}</span>
                        <span className={styles.notifDesc}>{item.description}</span>
                      </div>
                    </div>
                    <button
                      className={`${styles.toggle} ${notifSettings[item.key] ? styles.toggleOn : styles.toggleOff}`}
                      onClick={() => handleNotifToggle(item.key)}
                      aria-label={`Toggle ${item.label}`}
                    >
                      <div className={styles.toggleThumb} />
                    </button>
                  </div>
                ))}
              </div>
              {notifSaved && <div className={styles.savedToast}>Saved</div>}
            </div>
          </div>
        )}

        {tab === 'appearance' && (
          <div className={styles.section}>
            <div className={styles.card}>
              <h2 className={styles.cardTitle}>Theme</h2>
              <p className={styles.muted}>Choose your preferred color theme.</p>
              <div className={styles.themeOptions}>
                <button
                  className={`${styles.themeBtn} ${theme === 'dark' ? styles.themeBtnActive : ''}`}
                  onClick={() => handleThemeChange('dark')}
                >
                  <MoonIcon size={26} />
                  <span>Dark</span>
                </button>
                <button
                  className={`${styles.themeBtn} ${theme === 'light' ? styles.themeBtnActive : ''}`}
                  onClick={() => handleThemeChange('light')}
                >
                  <SunIcon size={26} />
                  <span>Light</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
