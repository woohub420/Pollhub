import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import styles from './NotificationSettingsPage.module.css'

export default function NotificationSettingsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [settings, setSettings] = useState({
    notify_vote: true,
    notify_follow: true,
    notify_comment: true,
    notify_reply: true,
  })
  const [loading, setLoading] = useState(true)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!user) {
      navigate('/')
      return
    }
    fetchSettings()
  }, [user])

  async function fetchSettings() {
    const { data } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
    if (data) setSettings(data)
    setLoading(false)
  }

  async function handleToggle(key) {
    const updated = { ...settings, [key]: !settings[key] }
    setSettings(updated)
    await supabase.from('notification_settings').upsert({ user_id: user.id, ...updated })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  if (loading) return <div className={styles.loading}>Loading...</div>

  const items = [
    { key: 'notify_vote', icon: '🗳️', label: 'Votes', description: 'When someone votes on your poll' },
    { key: 'notify_follow', icon: '👤', label: 'New Followers', description: 'When someone follows you' },
    { key: 'notify_comment', icon: '💬', label: 'Comments', description: 'When someone comments on your poll' },
    { key: 'notify_reply', icon: '↩️', label: 'Replies', description: 'When someone replies to your comment' },
  ]

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <button className={styles.back} onClick={() => navigate(-1)}>
          ← Back
        </button>
        <h1 className={styles.title}>Notification Settings</h1>
        <p className={styles.subtitle}>Choose what you want to be notified about</p>

        <div className={styles.list}>
          {items.map((item) => (
            <div key={item.key} className={styles.row}>
              <div className={styles.rowLeft}>
                <span className={styles.icon}>{item.icon}</span>
                <div className={styles.rowText}>
                  <span className={styles.label}>{item.label}</span>
                  <span className={styles.description}>{item.description}</span>
                </div>
              </div>
              <button
                className={`${styles.toggle} ${settings[item.key] ? styles.on : styles.off}`}
                onClick={() => handleToggle(item.key)}
                aria-label={`Toggle ${item.label}`}
              >
                <div className={styles.toggleThumb} />
              </button>
            </div>
          ))}
        </div>

        {saved && <div className={styles.savedToast}>✓ Saved</div>}
      </div>
    </div>
  )
}
