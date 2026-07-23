import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import styles from './CommentSection.module.css'

export default function CommentSection({ pollId, onCommentPosted }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    loadComments()
  }, [pollId])

  async function loadComments() {
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchErr } = await supabase
        .from('comments')
        .select('id, body, created_at, profiles(username)')
        .eq('poll_id', pollId)
        .order('created_at', { ascending: true })
      if (fetchErr) throw fetchErr
      setComments(data ?? [])
    } catch (err) {
      console.error(err)
      setError('Something went wrong loading comments.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmed = body.trim()
    if (!trimmed) {
      setError('Comment cannot be empty.')
      return
    }
    if (trimmed.length > 500) {
      setError('Comment must be 500 characters or fewer.')
      return
    }
    if (!user) {
      setError('Log in to comment.')
      return
    }

    setSubmitting(true)
    try {
      const { error: insertErr } = await supabase
        .from('comments')
        .insert({ poll_id: pollId, author_id: user.id, body: trimmed })
      if (insertErr) throw insertErr
      setBody('')
      await loadComments()
      onCommentPosted?.()
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.section}>
      <form onSubmit={handleSubmit} className={styles.form}>
        <textarea
          className={styles.textarea}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          maxLength={500}
          rows={2}
          placeholder={user ? 'Add a comment...' : 'Log in to comment'}
          disabled={!user}
        />
        <button className="btn btn-accent btn-sm" type="submit" disabled={submitting || !user}>
          {submitting ? <span className="spinner" /> : 'Post'}
        </button>
      </form>

      {error && <div className={styles.error}>{error}</div>}

      {loading ? (
        <div className={styles.center}>
          <span className="spinner" />
        </div>
      ) : comments.length === 0 ? (
        <div className={styles.empty}>No comments yet.</div>
      ) : (
        <ul className={styles.list}>
          {comments.map((c) => (
            <li key={c.id} className={styles.comment}>
              <span className={styles.commentAuthor}>u/{c.profiles?.username ?? 'unknown'}</span>
              <p className={styles.commentBody}>{c.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
