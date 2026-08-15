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
  LogOutIcon,
  LockIcon,
} from '../components/icons.jsx'
import styles from './SettingsPage.module.css'

function ChevronRight({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  )
}

function ChevronLeft({ size = 20 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

// Grouped navigation. Each row maps to a ?tab= value rendered by renderPane().
const GROUPS = [
  {
    label: 'Your account',
    items: [
      { id: 'password', label: 'Password', icon: LockIcon, title: 'Password' },
      { id: 'demographics', label: 'Demographics', icon: UserIcon, title: 'Demographics' },
    ],
  },
  {
    label: 'Preferences',
    items: [
      { id: 'notifications', label: 'Notifications', icon: BellIcon, title: 'Notifications' },
      { id: 'appearance', label: 'Appearance', icon: SettingsIcon, title: 'Appearance' },
    ],
  },
]

const ALL_ITEMS = GROUPS.flatMap((g) => g.items).concat([{ id: 'delete', label: 'Delete account', title: 'Delete account' }])

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const BIRTH_YEARS = Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - 13 - i)

const NOTIF_GROUPS = [
  {
    label: 'On your polls',
    items: [
      { key: 'notify_vote', icon: VoteIcon, label: 'Votes', description: 'When someone votes on your poll' },
      { key: 'notify_like', icon: HeartIcon, label: 'Likes', description: 'When someone likes your poll' },
      { key: 'notify_comment', icon: CommentIcon, label: 'Comments', description: 'When someone comments on your poll' },
    ],
  },
  {
    label: 'About you',
    items: [
      { key: 'notify_follow', icon: UserIcon, label: 'New followers', description: 'When someone follows you' },
      { key: 'notify_reply', icon: ReplyIcon, label: 'Replies', description: 'When someone replies to your comment' },
    ],
  },
]

const NOTIF_KEYS = NOTIF_GROUPS.flatMap((g) => g.items.map((i) => i.key))

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(min-width: 900px)').matches : true,
  )
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 900px)')
    const onChange = (e) => setIsDesktop(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesktop
}

export default function SettingsPage() {
  const { user, profile, signOut, refreshProfile } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()
  const isDesktop = useIsDesktop()

  const paramTab = searchParams.get('tab') ?? (location.pathname === '/settings/notifications' ? 'notifications' : null)
  // Old links used ?tab=account — keep them working.
  const requestedTab = paramTab === 'account' ? 'password' : paramTab
  const validTab = ALL_ITEMS.some((i) => i.id === requestedTab) ? requestedTab : null
  const tab = validTab ?? (isDesktop ? 'password' : null)
  const activeItem = ALL_ITEMS.find((i) => i.id === tab)

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

  const [birthYear, setBirthYear] = useState('')
  const [gender, setGender] = useState('')
  const [demoLoading, setDemoLoading] = useState(false)
  const [demoError, setDemoError] = useState('')
  const [demoSuccess, setDemoSuccess] = useState(false)

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

  useEffect(() => {
    if (!user) return
    async function loadDemographics() {
      const { data } = await supabase
        .from('user_demographics')
        .select('birth_year, gender')
        .eq('user_id', user.id)
        .maybeSingle()
      if (data) {
        setBirthYear(data.birth_year ?? '')
        setGender(data.gender ?? '')
      }
    }
    loadDemographics()
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

  async function handleSaveDemographics() {
    setDemoError('')
    setDemoSuccess(false)

    if (birthYear) {
      const age = new Date().getFullYear() - parseInt(birthYear, 10)
      if (age < 13) {
        setDemoError('You must be at least 13 years old to use PollHub.')
        return
      }
    }

    setDemoLoading(true)
    try {
      const { error } = await supabase.from('user_demographics').upsert(
        {
          user_id: user.id,
          birth_year: birthYear ? parseInt(birthYear, 10) : null,
          gender: gender || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      if (error) throw error
      setDemoSuccess(true)
      setTimeout(() => setDemoSuccess(false), 2000)
    } catch (err) {
      console.error(err)
      setDemoError('Something went wrong. Please try again.')
    } finally {
      setDemoLoading(false)
    }
  }

  async function handleThemeChange(t) {
    document.documentElement.setAttribute('data-theme', t)
    await supabase.from('profiles').update({ theme: t }).eq('id', user.id)
    await refreshProfile()
  }

  const theme = profile?.theme ?? 'dark'
  const isGoogleUser = user?.app_metadata?.provider === 'google'
  const notifOnCount = NOTIF_KEYS.filter((k) => notifSettings[k]).length

  function goTo(id) {
    setSearchParams(id ? { tab: id } : {})
  }

  function summaryFor(id) {
    if (id === 'notifications') return `${notifOnCount} of ${NOTIF_KEYS.length} on`
    if (id === 'appearance') return theme === 'light' ? 'Light' : 'Dark'
    if (id === 'demographics') {
      const g = GENDER_OPTIONS.find((o) => o.value === gender)
      if (!birthYear && !g) return 'Not set'
      return [birthYear, g && g.value !== 'prefer_not_to_say' ? g.label : null].filter(Boolean).join(' · ') || 'Set'
    }
    if (id === 'password') return isGoogleUser ? 'Google account' : null
    return null
  }

  function renderPane() {
    if (tab === 'password') {
      return (
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
                style={{ alignSelf: 'flex-start' }}
              >
                {passwordLoading ? <span className="spinner" /> : 'Update Password'}
              </button>
            </>
          )}
        </div>
      )
    }

    if (tab === 'delete') {
      return (
        <div className={`${styles.card} ${styles.dangerCard}`}>
          <h2 className={`${styles.cardTitle} ${styles.dangerTitle}`}>Delete Account</h2>
          <p className={styles.muted}>
            This will permanently delete your account, all your polls, votes, and comments. This action cannot be
            undone.
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
      )
    }

    if (tab === 'notifications') {
      return (
        <>
          {NOTIF_GROUPS.map((group) => (
            <div key={group.label} className={styles.group}>
              <span className={styles.groupLabel}>{group.label}</span>
              <div className={styles.card}>
                <div className={styles.notifList}>
                  {group.items.map((item) => (
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
              </div>
            </div>
          ))}
          {notifSaved && <div className={styles.savedToast}>Saved</div>}
        </>
      )
    }

    if (tab === 'appearance') {
      return (
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
      )
    }

    if (tab === 'demographics') {
      return (
        <div className={styles.card}>
          <h2 className={styles.cardTitle}>Your Demographics</h2>
          <p className={styles.muted}>
            Used only to show anonymous, aggregated poll breakdowns — never shown per-vote or shared with anyone.
          </p>

          <div className={styles.field}>
            <label className={styles.label}>Birth Year</label>
            <select className={styles.input} value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>
              <option value="">Prefer not to say</option>
              {BIRTH_YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Gender</label>
            <div className={styles.chips}>
              {GENDER_OPTIONS.map((g) => (
                <button
                  key={g.value}
                  className={`${styles.chip} ${gender === g.value ? styles.chipActive : ''}`}
                  onClick={() => setGender(g.value)}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {demoError && <p className={styles.error}>{demoError}</p>}
          {demoSuccess && <p className={styles.success}>✓ Saved</p>}

          <button
            className="btn btn-accent"
            onClick={handleSaveDemographics}
            disabled={demoLoading}
            style={{ alignSelf: 'flex-start' }}
          >
            {demoLoading ? <span className="spinner" /> : 'Save'}
          </button>
        </div>
      )
    }

    return null
  }

  const index = (
    <div className={styles.index}>
      <button className={styles.profileRow} onClick={() => navigate('/profile')}>
        <div className={styles.profileAvatar}>{(profile?.username ?? '?').charAt(0).toUpperCase()}</div>
        <div className={styles.profileText}>
          <span className={styles.profileName}>{profile?.username}</span>
          <span className={styles.profileSub}>View and edit your profile</span>
        </div>
        <span className={styles.chevron}>
          <ChevronRight />
        </span>
      </button>

      {GROUPS.map((group) => (
        <div key={group.label} className={styles.group}>
          <span className={styles.groupLabel}>{group.label}</span>
          <div className={styles.rows}>
            {group.items.map((item) => (
              <button key={item.id} className={styles.row} onClick={() => goTo(item.id)}>
                <span className={styles.rowIcon}>
                  <item.icon size={18} />
                </span>
                <span className={styles.rowLabel}>{item.label}</span>
                {summaryFor(item.id) && <span className={styles.rowValue}>{summaryFor(item.id)}</span>}
                <span className={styles.chevron}>
                  <ChevronRight />
                </span>
              </button>
            ))}
          </div>
        </div>
      ))}

      <div className={styles.group}>
        <span className={styles.groupLabel}>More</span>
        <div className={styles.rows}>
          <button className={styles.row} onClick={() => navigate('/terms')}>
            <span className={styles.rowLabel}>Terms of service</span>
            <span className={styles.chevron}>
              <ChevronRight />
            </span>
          </button>
          <button className={styles.row} onClick={() => navigate('/privacy')}>
            <span className={styles.rowLabel}>Privacy policy</span>
            <span className={styles.chevron}>
              <ChevronRight />
            </span>
          </button>
          <button className={`${styles.row} ${styles.rowDanger}`} onClick={signOut}>
            <span className={styles.rowLabel}>Log out</span>
          </button>
        </div>
      </div>

      <button className={styles.deleteRow} onClick={() => goTo('delete')}>
        <TrashIcon size={18} />
        <span className={styles.rowLabel}>Delete account</span>
        <span className={styles.chevron}>
          <ChevronRight />
        </span>
      </button>
    </div>
  )

  if (!isDesktop) {
    return (
      <div className={styles.page}>
        <div className={styles.mobileWrap}>
          <div className={styles.mobileBar}>
            {tab ? (
              <button className={styles.backBtn} onClick={() => goTo(null)} aria-label="Back">
                <ChevronLeft />
              </button>
            ) : null}
            <h1 className={styles.mobileTitle}>{activeItem ? activeItem.title : 'Settings'}</h1>
          </div>
          {tab ? <div className={styles.section}>{renderPane()}</div> : index}
        </div>
      </div>
    )
  }

  return (
    <div className={styles.page}>
      <div className={styles.desktopWrap}>
        <aside className={styles.sidebar}>
          <h1 className={styles.sidebarTitle}>Settings</h1>
          {GROUPS.map((group) => (
            <div key={group.label} className={styles.navGroup}>
              <span className={styles.groupLabel}>{group.label}</span>
              {group.items.map((item) => (
                <button
                  key={item.id}
                  className={`${styles.navItem} ${tab === item.id ? styles.navItemActive : ''}`}
                  onClick={() => goTo(item.id)}
                >
                  <item.icon size={17} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          ))}
          <div className={styles.navGroup}>
            <span className={styles.groupLabel}>More</span>
            <button
              className={`${styles.navItem} ${tab === 'delete' ? styles.navItemActive : ''} ${styles.navItemDanger}`}
              onClick={() => goTo('delete')}
            >
              <TrashIcon size={17} />
              <span>Delete account</span>
            </button>
            <button className={`${styles.navItem} ${styles.navItemDanger}`} onClick={signOut}>
              <LogOutIcon size={17} />
              <span>Log out</span>
            </button>
          </div>
        </aside>

        <main className={styles.pane}>
          <div className={styles.paneHead}>
            <h2 className={styles.paneTitle}>{activeItem?.title}</h2>
          </div>
          <div className={styles.section}>{renderPane()}</div>
        </main>
      </div>
    </div>
  )
}
