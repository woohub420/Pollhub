import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { BellIcon } from './icons.jsx'
import styles from './NotificationBell.module.css'

export default function NotificationBell() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const ref = useRef(null)

  useEffect(() => {
    if (!user) return
    fetchNotifications()

    // Realtime subscription — new notifications appear instantly
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        (payload) => {
          setNotifications((prev) => [payload.new, ...prev])
          setUnreadCount((c) => c + 1)
        },
      )
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [user])

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  async function fetchNotifications() {
    const { data } = await supabase
      .from('notifications')
      .select(
        `
        id, type, read, created_at, poll_id, comment_id,
        actor:profiles!notifications_actor_id_fkey(username, avatar_url)
      `,
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    const { data: settingsData } = await supabase
      .from('notification_settings')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    const filtered = (data ?? []).filter((n) => {
      if (!settingsData) return true
      if (n.type === 'vote' && !settingsData.notify_vote) return false
      if (n.type === 'like' && !settingsData.notify_like) return false
      if (n.type === 'follow' && !settingsData.notify_follow) return false
      if (n.type === 'comment' && !settingsData.notify_comment) return false
      if (n.type === 'reply' && !settingsData.notify_reply) return false
      return true
    })

    setNotifications(filtered)
    setUnreadCount(filtered.filter((n) => !n.read).length)
  }

  async function handleOpen() {
    setOpen((o) => !o)
    if (!open && unreadCount > 0) {
      await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
      setUnreadCount(0)
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    }
  }

  function handleClick(n) {
    setOpen(false)
    if (n.poll_id) navigate(`/poll/${n.poll_id}`)
    else if (n.type === 'follow') navigate(`/u/${n.actor?.username}`)
  }

  function getMessage(n) {
    const actor = n.actor?.username ?? 'Someone'
    switch (n.type) {
      case 'vote':
        return `${actor} voted on your poll`
      case 'like':
        return `${actor} liked your poll`
      case 'follow':
        return `${actor} followed you`
      case 'comment':
        return `${actor} commented on your poll`
      case 'reply':
        return `${actor} replied to your comment`
      default:
        return 'New notification'
    }
  }

  function timeAgo(ts) {
    const diff = Date.now() - new Date(ts)
    const m = Math.floor(diff / 60000)
    if (m < 1) return 'just now'
    if (m < 60) return `${m}m ago`
    const h = Math.floor(m / 60)
    if (h < 24) return `${h}h ago`
    return `${Math.floor(h / 24)}d ago`
  }

  if (!user) return null

  return (
    <div className={styles.wrapper} ref={ref}>
      <button className={styles.bell} onClick={handleOpen} aria-label="Notifications">
        <BellIcon size={19} />
        {unreadCount > 0 && <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
      </button>

      {open && (
        <div className={styles.dropdown}>
          <div className={styles.header}>
            <span>Notifications</span>
          </div>

          {notifications.length === 0 ? (
            <div className={styles.empty}>No notifications yet</div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`${styles.item} ${!n.read ? styles.unread : ''}`}
                onClick={() => handleClick(n)}
              >
                <div className={styles.itemContent}>
                  <span className={styles.message}>{getMessage(n)}</span>
                  <span className={styles.time}>{timeAgo(n.created_at)}</span>
                </div>
                {!n.read && <div className={styles.dot} />}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
