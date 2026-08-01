import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import styles from './AdminPage.module.css'

const REASON_LABELS = {
  spam: '🚫 Spam',
  hate_speech: '💢 Hate Speech',
  misinformation: '❌ Misinformation',
  nsfw: '🔞 NSFW',
  other: '💬 Other',
}

export default function AdminPage() {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('pending')

  useEffect(() => {
    if (!user || !profile) return
    if (!profile.is_admin) {
      navigate('/')
      return
    }
    loadReports()
  }, [user, profile, tab])

  async function loadReports() {
    setLoading(true)

    if (tab === 'banned') {
      const { data } = await supabase
        .from('profiles')
        .select('id, username, avatar_url, is_banned, ban_reason, created_at')
        .eq('is_banned', true)
        .order('created_at', { ascending: false })
      setReports(data ?? [])
      setLoading(false)
      return
    }

    const { data } = await supabase
      .from('reports')
      .select(
        `
        id, reason, note, status, created_at,
        reporter:profiles!reports_reporter_id_fkey(username),
        poll:polls(id, question, author_id, author:profiles!polls_author_id_fkey(id, username, is_banned)),
        comment:comments(id, body, author_id, author:profiles!comments_author_id_fkey(id, username, is_banned))
      `,
      )
      .eq('status', tab)
      .order('created_at', { ascending: false })
    setReports(data ?? [])
    setLoading(false)
  }

  async function handleDeletePoll(pollId, reportId) {
    if (!window.confirm('Delete this poll permanently?')) return
    await supabase.from('polls').delete().eq('id', pollId)
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId)
    loadReports()
  }

  async function handleDeleteComment(commentId, reportId) {
    if (!window.confirm('Delete this comment permanently?')) return
    await supabase.from('comments').delete().eq('id', commentId)
    await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId)
    loadReports()
  }

  async function handleDismiss(reportId) {
    await supabase.from('reports').update({ status: 'dismissed' }).eq('id', reportId)
    loadReports()
  }

  async function handleBan(userId, username, reportId) {
    const reason = window.prompt(`Ban reason for ${username ?? 'this user'}:`)
    if (!reason) return

    await supabase.from('profiles').update({ is_banned: true, ban_reason: reason }).eq('id', userId)
    if (reportId) {
      await supabase.from('reports').update({ status: 'resolved' }).eq('id', reportId)
    }
    loadReports()
  }

  async function handleUnban(userId) {
    await supabase.from('profiles').update({ is_banned: false, ban_reason: null }).eq('id', userId)
    loadReports()
  }

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>🛡️ Admin Dashboard</h1>

        <div className={styles.tabs}>
          {['pending', 'resolved', 'dismissed', 'banned'].map((t) => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.activeTab : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {loading && (
          <div className={styles.loading}>
            <span className="spinner" />
          </div>
        )}

        {!loading && reports.length === 0 && (
          <div className={styles.empty}>{tab === 'banned' ? 'No banned users' : `No ${tab} reports`} 🎉</div>
        )}

        {!loading &&
          tab === 'banned' &&
          reports.map((bannedUser) => (
            <div key={bannedUser.id} className={styles.reportCard}>
              <div className={styles.reportHeader}>
                <span className={styles.reasonBadge}>🚫 Banned</span>
                <span className={styles.reportMeta}>{bannedUser.username}</span>
              </div>
              {bannedUser.ban_reason && <div className={styles.reportNote}>Reason: {bannedUser.ban_reason}</div>}
              <div className={styles.reportActions}>
                <button className={styles.btnUnban} onClick={() => handleUnban(bannedUser.id)}>
                  ✅ Unban
                </button>
              </div>
            </div>
          ))}

        {!loading &&
          tab !== 'banned' &&
          reports.map((report) => (
            <div key={report.id} className={styles.reportCard}>
              <div className={styles.reportHeader}>
                <span className={styles.reasonBadge}>{REASON_LABELS[report.reason]}</span>
                <span className={styles.reportMeta}>
                  by {report.reporter?.username} · {new Date(report.created_at).toLocaleDateString()}
                </span>
              </div>

              {report.poll && (
                <div className={styles.reportContent}>
                  <span className={styles.contentType}>Poll:</span>
                  <span className={styles.contentLink} onClick={() => navigate(`/poll/${report.poll.id}`)}>
                    {report.poll.question}
                  </span>
                </div>
              )}
              {report.comment && (
                <div className={styles.reportContent}>
                  <span className={styles.contentType}>Comment:</span>
                  <span className={styles.contentText}>"{report.comment.body}"</span>
                </div>
              )}
              {report.note && <div className={styles.reportNote}>Note: {report.note}</div>}

              {tab === 'pending' && (
                <div className={styles.reportActions}>
                  {report.poll && (
                    <>
                      <button
                        className={styles.btnDanger}
                        onClick={() => handleDeletePoll(report.poll.id, report.id)}
                      >
                        🗑️ Delete Poll
                      </button>
                      {!report.poll.author?.is_banned ? (
                        <button
                          className={styles.btnBan}
                          onClick={() => handleBan(report.poll.author_id, report.poll.author?.username, report.id)}
                        >
                          🚫 Ban User
                        </button>
                      ) : (
                        <button className={styles.btnUnban} onClick={() => handleUnban(report.poll.author_id)}>
                          ✅ Unban User
                        </button>
                      )}
                    </>
                  )}
                  {report.comment && (
                    <>
                      <button
                        className={styles.btnDanger}
                        onClick={() => handleDeleteComment(report.comment.id, report.id)}
                      >
                        🗑️ Delete Comment
                      </button>
                      {!report.comment.author?.is_banned ? (
                        <button
                          className={styles.btnBan}
                          onClick={() =>
                            handleBan(report.comment.author_id, report.comment.author?.username, report.id)
                          }
                        >
                          🚫 Ban User
                        </button>
                      ) : (
                        <button className={styles.btnUnban} onClick={() => handleUnban(report.comment.author_id)}>
                          ✅ Unban User
                        </button>
                      )}
                    </>
                  )}
                  <button className={styles.btnDismiss} onClick={() => handleDismiss(report.id)}>
                    Dismiss
                  </button>
                </div>
              )}
            </div>
          ))}
      </div>
    </div>
  )
}
