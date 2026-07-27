import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import styles from './Modal.module.css'

const REASONS = [
  { value: 'spam', label: '🚫 Spam' },
  { value: 'hate_speech', label: '💢 Hate Speech' },
  { value: 'misinformation', label: '❌ Misinformation' },
  { value: 'nsfw', label: '🔞 NSFW' },
  { value: 'other', label: '💬 Other' },
]

export default function ReportModal({ pollId, commentId, onClose }) {
  const { user } = useAuth()
  const [reason, setReason] = useState('')
  const [note, setNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit() {
    if (!reason) {
      setError('Please select a reason')
      return
    }
    setLoading(true)
    setError('')
    try {
      const { error: dbErr } = await supabase.from('reports').insert({
        reporter_id: user.id,
        poll_id: pollId ?? null,
        comment_id: commentId ?? null,
        reason,
        note: note.trim() || null,
      })
      if (dbErr) throw dbErr
      setDone(true)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  if (done)
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <div className={styles.doneIcon}>✅</div>
          <h2 className={styles.title}>Report Submitted</h2>
          <p className={styles.subtitle}>Thanks for helping keep PollHub safe.</p>
          <div className={styles.actionsRow}>
            <button className="btn btn-accent" onClick={onClose}>
              Done
            </button>
          </div>
        </div>
      </div>
    )

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Report {pollId ? 'Poll' : 'Comment'}</h2>
        <p className={styles.subtitle}>Why are you reporting this?</p>

        <div className={styles.reasonList}>
          {REASONS.map((r) => (
            <button
              key={r.value}
              className={`${styles.reasonBtn} ${reason === r.value ? styles.reasonSelected : ''}`}
              onClick={() => {
                setReason(r.value)
                setError('')
              }}
            >
              {r.label}
            </button>
          ))}
        </div>

        <textarea
          className={styles.textarea}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Additional details (optional)"
          rows={3}
          maxLength={300}
        />

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actionsRow}>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-accent" onClick={handleSubmit} disabled={loading || !reason}>
            {loading ? 'Submitting...' : 'Submit Report'}
          </button>
        </div>
      </div>
    </div>
  )
}
