import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import CommentSection from './CommentSection.jsx'
import styles from './PollCard.module.css'

export default function PollCard({ poll, onUpdate, defaultShowComments = false }) {
  const { user } = useAuth()
  const [myVote, setMyVote] = useState(null)
  const [voting, setVoting] = useState(false)
  const [error, setError] = useState('')
  const [showComments, setShowComments] = useState(defaultShowComments)

  useEffect(() => {
    let active = true

    async function loadVote() {
      if (!user) {
        setMyVote(null)
        return
      }
      const { data } = await supabase
        .from('votes')
        .select('option_id')
        .eq('poll_id', poll.id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (active) setMyVote(data?.option_id ?? null)
    }
    loadVote()

    return () => {
      active = false
    }
  }, [poll.id, user])

  const totalVotes = poll.options.reduce((sum, o) => sum + (o.vote_count?.[0]?.count ?? 0), 0)
  const hasVoted = Boolean(myVote)
  const commentCount = poll.comment_count?.[0]?.count ?? 0

  async function handleVote(optionId) {
    setError('')
    if (!user) {
      setError('Log in to vote.')
      return
    }

    // Option ownership check — never trust the client without verifying membership
    const validOption = poll.options.find((o) => o.id === optionId)
    if (!validOption) {
      setError('Invalid option.')
      return
    }
    if (myVote) return

    setVoting(true)
    try {
      const { error: voteErr } = await supabase.from('votes').insert({
        poll_id: poll.id,
        option_id: optionId,
        user_id: user.id,
      })
      if (voteErr) throw voteErr
      setMyVote(optionId)
      onUpdate?.()
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setVoting(false)
    }
  }

  function handleCopyLink() {
    const url = `${window.location.origin}/poll/${poll.id}`
    navigator.clipboard?.writeText(url)
  }

  function handleShareTwitter() {
    const url = `${window.location.origin}/poll/${poll.id}`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(poll.question)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    )
  }

  return (
    <div className={styles.card}>
      <div className={styles.meta}>
        <span className={styles.category}>{poll.category}</span>
        <span>u/{poll.profiles?.username ?? 'unknown'}</span>
      </div>

      <Link to={`/poll/${poll.id}`} className={styles.question}>
        {poll.question}
      </Link>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.options}>
        {poll.options
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((option) => {
            const count = option.vote_count?.[0]?.count ?? 0
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
            const isMine = myVote === option.id

            if (hasVoted) {
              return (
                <div key={option.id} className={styles.resultRow}>
                  <div className={styles.resultBar} style={{ width: `${pct}%` }} />
                  <span className={styles.resultLabel}>
                    {option.label} {isMine && '✓'}
                  </span>
                  <span className={styles.resultPct}>{pct}%</span>
                </div>
              )
            }

            return (
              <button
                key={option.id}
                className={styles.optionButton}
                onClick={() => handleVote(option.id)}
                disabled={voting}
              >
                {option.label}
              </button>
            )
          })}
      </div>

      <div className={styles.footer}>
        <span className={styles.stat}>{totalVotes} votes</span>
        <button className={styles.footerBtn} onClick={() => setShowComments((v) => !v)}>
          {commentCount} comments
        </button>
        <button className={styles.footerBtn} onClick={handleCopyLink}>
          Copy link
        </button>
        <button className={styles.footerBtn} onClick={handleShareTwitter}>
          Share
        </button>
      </div>

      {showComments && <CommentSection pollId={poll.id} onCommentPosted={onUpdate} />}
    </div>
  )
}
