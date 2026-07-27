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
    const { data } = await supabase
      .from('reports')
      .select(
        `
        id, reason, note, status, created_at,
        reporter:profiles!reports_reporter_id_fkey(username),
        poll:polls(id, question),
        comment:comments(id, body)
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

  return (
    <div className={styles.page}>
      <div className={styles.container}>
        <h1 className={styles.title}>🛡️ Admin Dashboard</h1>

        <div className={styles.tabs}>
          {['pending', 'resolved', 'dismissed'].map((t) => (
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

        {!loading && reports.length === 0 && <div className={styles.empty}>No {tab} reports 🎉</div>}

        {!loading &&
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
                    <button className={styles.btnDanger} onClick={() => handleDeletePoll(report.poll.id, report.id)}>
                      🗑️ Delete Poll
                    </button>
                  )}
                  {report.comment && (
                    <button
                      className={styles.btnDanger}
                      onClick={() => handleDeleteComment(report.comment.id, report.id)}
                    >
                      🗑️ Delete Comment
                    </button>
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
