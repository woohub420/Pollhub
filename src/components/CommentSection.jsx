import { useEffect, useState } from 'react'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import AuthorLine from './AuthorLine.jsx'
import styles from './CommentSection.module.css'

export default function CommentSection({ pollId, pollAuthorId, onCommentPosted }) {
  const { user } = useAuth()
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [body, setBody] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [replyText, setReplyText] = useState('')

  useEffect(() => {
    loadComments()
  }, [pollId])

  async function loadComments() {
    setLoading(true)
    setError('')
    try {
      const { data, error: fetchErr } = await supabase
        .from('comments')
        .select('id, body, created_at, parent_id, author_id, profiles(username, avatar_url)')
        .eq('poll_id', pollId)
        .order('created_at', { ascending: true })
      if (fetchErr) throw fetchErr

      const all = data ?? []
      const topLevel = all.filter((c) => !c.parent_id)
      const replies = all.filter((c) => c.parent_id)
      const threaded = topLevel.map((c) => ({ ...c, replies: replies.filter((r) => r.parent_id === c.id) }))
      setComments(threaded)
    } catch (err) {
      console.error(err)
      setError('Something went wrong loading comments.')
    } finally {
      setLoading(false)
    }
  }

  async function notify({ recipientId, type, commentId }) {
    if (!recipientId || recipientId === user.id) return
    const { error: notifyErr } = await supabase.from('notifications').insert({
      user_id: recipientId,
      actor_id: user.id,
      type,
      poll_id: pollId,
      comment_id: commentId,
    })
    if (notifyErr) console.error(notifyErr)
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
      const { data, error: insertErr } = await supabase
        .from('comments')
        .insert({ poll_id: pollId, author_id: user.id, body: trimmed })
        .select('id')
        .maybeSingle()
      if (insertErr) throw insertErr

      await notify({ recipientId: pollAuthorId, type: 'comment', commentId: data?.id })

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

  async function handleReply(parentComment) {
    const trimmed = replyText.trim()
    if (!trimmed || !user) return
    if (trimmed.length > 500) {
      setError('Comment must be 500 characters or fewer.')
      return
    }

    setError('')
    try {
      const { data, error: insertErr } = await supabase
        .from('comments')
        .insert({ poll_id: pollId, author_id: user.id, body: trimmed, parent_id: parentComment.id })
        .select('id, body, created_at, parent_id, author_id, profiles(username, avatar_url)')
        .maybeSingle()
      if (insertErr) throw insertErr

      await notify({ recipientId: pollAuthorId, type: 'comment', commentId: data?.id })
      await notify({ recipientId: parentComment.author_id, type: 'reply', commentId: data?.id })

      setComments((prev) =>
        prev.map((c) => (c.id === parentComment.id ? { ...c, replies: [...(c.replies ?? []), data] } : c)),
      )
      setReplyText('')
      setReplyingTo(null)
      onCommentPosted?.()
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
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
          {comments.map((comment) => (
            <li key={comment.id} className={styles.commentThread}>
              <div className={styles.comment}>
                <AuthorLine
                  username={comment.profiles?.username ?? 'unknown'}
                  avatarUrl={comment.profiles?.avatar_url}
                />
                <p className={styles.commentBody}>{comment.body}</p>
                {user && (
                  <button
                    className={styles.replyBtn}
                    onClick={() => {
                      setReplyingTo(replyingTo === comment.id ? null : comment.id)
                      setReplyText('')
                    }}
                  >
                    Reply
                  </button>
                )}
              </div>

              {comment.replies?.map((reply) => (
                <div key={reply.id} className={styles.reply}>
                  <AuthorLine
                    username={reply.profiles?.username ?? 'unknown'}
                    avatarUrl={reply.profiles?.avatar_url}
                  />
                  <p className={styles.commentBody}>{reply.body}</p>
                </div>
              ))}

              {replyingTo === comment.id && (
                <div className={styles.replyInput}>
                  <input
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    maxLength={500}
                    placeholder={`Reply to ${comment.profiles?.username ?? 'unknown'}...`}
                    onKeyDown={(e) => e.key === 'Enter' && handleReply(comment)}
                  />
                  <button className="btn btn-accent btn-sm" onClick={() => handleReply(comment)}>
                    Post
                  </button>
                  <button className="btn btn-ghost btn-sm" onClick={() => setReplyingTo(null)}>
                    Cancel
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
