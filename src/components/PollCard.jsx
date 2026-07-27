import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import AuthorLine from './AuthorLine.jsx'
import CommentSection from './CommentSection.jsx'
import { CheckIcon, HeartIcon, LinkIcon, ShareIcon } from './icons.jsx'
import PollMedia from './PollMedia.jsx'
import ReportModal from './ReportModal.jsx'
import styles from './PollCard.module.css'

export default function PollCard({ poll, onUpdate, defaultShowComments = false }) {
  const { user, profile } = useAuth()
  const navigate = useNavigate()
  const [myVote, setMyVote] = useState(null)
  const [voting, setVoting] = useState(false)
  const [error, setError] = useState('')
  const [showComments, setShowComments] = useState(defaultShowComments)
  const [menuOpen, setMenuOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [localOptions, setLocalOptions] = useState(poll.options ?? [])
  const [liked, setLiked] = useState(false)
  const [likeCount, setLikeCount] = useState(0)
  const [shareMenuOpen, setShareMenuOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const shareRef = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (shareRef.current && !shareRef.current.contains(e.target)) {
        setShareMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

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

  useEffect(() => {
    setLocalOptions(poll.options ?? [])
  }, [poll.options])

  useEffect(() => {
    let active = true

    async function loadLikes() {
      const { count } = await supabase
        .from('likes')
        .select('*', { count: 'exact', head: true })
        .eq('poll_id', poll.id)
      if (active) setLikeCount(count ?? 0)

      if (!user) {
        if (active) setLiked(false)
        return
      }
      const { data } = await supabase
        .from('likes')
        .select('id')
        .eq('poll_id', poll.id)
        .eq('user_id', user.id)
        .maybeSingle()
      if (active) setLiked(!!data)
    }
    loadLikes()

    return () => {
      active = false
    }
  }, [poll.id, user])

  useEffect(() => {
    const channel = supabase
      .channel(`likes-${poll.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'likes', filter: `poll_id=eq.${poll.id}` },
        async () => {
          const { count } = await supabase
            .from('likes')
            .select('*', { count: 'exact', head: true })
            .eq('poll_id', poll.id)
          setLikeCount(count ?? 0)
        },
      )
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [poll.id])

  const totalVotes = localOptions.reduce((sum, o) => sum + (o.vote_count?.[0]?.count ?? 0), 0)
  const hasVoted = Boolean(myVote)
  const commentCount = poll.comment_count?.[0]?.count ?? 0
  const isExpired = Boolean(poll.expires_at && new Date(poll.expires_at) < new Date())
  const showResults = hasVoted

  function timeLeft() {
    if (!poll.expires_at) return null
    const diff = new Date(poll.expires_at) - new Date()
    if (diff <= 0) return 'Closed'
    const h = Math.floor(diff / 3600000)
    const m = Math.floor((diff % 3600000) / 60000)
    if (h > 24) return `${Math.floor(h / 24)}d left`
    if (h > 0) return `${h}h left`
    return `${m}m left`
  }

  async function handleVote(optionId) {
    setError('')
    if (!user) {
      setError('Log in to vote.')
      return
    }
    if (isExpired) return

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

      if (poll.author_id && poll.author_id !== user.id) {
        await supabase.from('notifications').insert({
          user_id: poll.author_id,
          actor_id: user.id,
          type: 'vote',
          poll_id: poll.id,
        })
      }
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setVoting(false)
    }
  }

  async function handleLike() {
    if (!user) {
      setError('Log in to like.')
      return
    }

    if (liked) {
      setLiked(false)
      setLikeCount((c) => c - 1)
      const { error: delErr } = await supabase
        .from('likes')
        .delete()
        .eq('poll_id', poll.id)
        .eq('user_id', user.id)
      if (delErr) {
        console.error(delErr)
        setLiked(true)
        setLikeCount((c) => c + 1)
      }
    } else {
      setLiked(true)
      setLikeCount((c) => c + 1)
      const { error: insErr } = await supabase.from('likes').insert({ poll_id: poll.id, user_id: user.id })
      if (insErr) {
        console.error(insErr)
        setLiked(false)
        setLikeCount((c) => c - 1)
        return
      }

      if (poll.author_id && poll.author_id !== user.id) {
        const { data: settings } = await supabase
          .from('notification_settings')
          .select('notify_like')
          .eq('user_id', poll.author_id)
          .maybeSingle()

        if (!settings || settings.notify_like !== false) {
          await supabase.from('notifications').insert({
            user_id: poll.author_id,
            actor_id: user.id,
            type: 'like',
            poll_id: poll.id,
          })
        }
      }
    }
  }

  async function handleDelete() {
    if (!window.confirm('Delete this poll?')) return
    await supabase.from('polls').delete().eq('id', poll.id)
    onUpdate?.()
  }

  async function handleShare() {
    const url = `${window.location.origin}/poll/${poll.id}`

    if (navigator.share) {
      try {
        await navigator.share({ title: poll.question, url })
      } catch (err) {
        // User cancelled the share sheet — nothing to do
      }
      return
    }

    setShareMenuOpen((o) => !o)
  }

  async function copyLink() {
    const url = `${window.location.origin}/poll/${poll.id}`
    await navigator.clipboard?.writeText(url)
    setShareMenuOpen(false)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function shareToTwitter() {
    const url = `${window.location.origin}/poll/${poll.id}`
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(poll.question)}&url=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    )
    setShareMenuOpen(false)
  }

  function shareToFacebook() {
    const url = `${window.location.origin}/poll/${poll.id}`
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      '_blank',
      'noopener,noreferrer',
    )
    setShareMenuOpen(false)
  }

  function shareToKakao() {
    const url = `${window.location.origin}/poll/${poll.id}`
    window.open(`https://story.kakao.com/share?url=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer')
    setShareMenuOpen(false)
  }

  return (
    <div className={styles.card}>
      <div className={styles.meta}>
        <span
          className={styles.category}
          onClick={(e) => {
            e.stopPropagation()
            navigate(`/c/${poll.category}`)
          }}
          style={{ cursor: 'pointer' }}
        >
          {poll.category}
        </span>
        <AuthorLine username={poll.profiles?.username ?? 'unknown'} avatarUrl={poll.profiles?.avatar_url} />

        <div className={styles.menuWrapper}>
          <button className={styles.menuBtn} onClick={() => setMenuOpen((o) => !o)}>
            ⋯
          </button>
          {menuOpen && (
            <div className={styles.menuDropdown}>
              {user && (
                <div
                  className={styles.menuItem}
                  onClick={() => {
                    setMenuOpen(false)
                    setReportOpen(true)
                  }}
                >
                  🚩 Report
                </div>
              )}
              {(profile?.is_admin || user?.id === poll.author_id) && (
                <div
                  className={`${styles.menuItem} ${styles.menuItemDanger}`}
                  onClick={() => {
                    setMenuOpen(false)
                    handleDelete()
                  }}
                >
                  🗑️ Delete Poll
                </div>
              )}
              {!user && (
                <div className={styles.menuItem} onClick={() => setMenuOpen(false)}>
                  Log in to report
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {reportOpen && <ReportModal pollId={poll.id} onClose={() => setReportOpen(false)} />}

      <Link to={`/poll/${poll.id}`} className={styles.question}>
        {poll.question}
      </Link>

      <PollMedia
        media={poll.poll_media?.slice().sort((a, b) => a.position - b.position)}
        url={poll.media_url}
        type={poll.media_type}
      />

      {error && <div className={styles.error}>{error}</div>}

      {poll.expires_at && (
        <span className={`${styles.expiryBadge} ${isExpired ? styles.expired : ''}`}>
          {isExpired ? 'Closed' : timeLeft()}
        </span>
      )}

      <div className={styles.options}>
        {localOptions
          .slice()
          .sort((a, b) => a.position - b.position)
          .map((option) => {
            const count = option.vote_count?.[0]?.count ?? 0
            const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0
            const isChosen = myVote === option.id
            const votable = !hasVoted && !isExpired && !voting

            return (
              <div
                key={option.id}
                className={`${styles.option} ${votable ? styles.optionVotable : ''} ${
                  isChosen ? styles.optionChosen : ''
                } ${isExpired ? styles.optionDisabled : ''}`}
                onClick={() => votable && handleVote(option.id)}
              >
                {showResults && <div className={styles.optionBar} style={{ width: `${pct}%` }} />}
                <span className={styles.optionLabel}>
                  {option.label} {isChosen && '✓'}
                </span>
                {showResults ? (
                  <span className={styles.optionPct}>{pct}%</span>
                ) : (
                  <span className={styles.voteToSeeHint}>Vote to see results</span>
                )}
              </div>
            )
          })}
      </div>

      <div className={styles.footer}>
        <span className={styles.stat}>{totalVotes} votes</span>
        <button
          className={`${styles.footerBtn} ${styles.likeBtn} ${liked ? styles.footerBtnLiked : ''}`}
          onClick={handleLike}
        >
          <HeartIcon size={15} filled={liked} /> {likeCount}
        </button>
        <button className={styles.footerBtn} onClick={() => setShowComments((v) => !v)}>
          {commentCount} comments
        </button>
        <div className={styles.shareWrapper} ref={shareRef}>
          <button
            className={`${styles.footerBtn} ${styles.likeBtn} ${copied ? styles.footerBtnCopied : ''}`}
            onClick={handleShare}
          >
            {copied ? (
              <>
                <CheckIcon size={14} /> Copied
              </>
            ) : (
              <>
                <ShareIcon size={14} /> Share
              </>
            )}
          </button>

          {shareMenuOpen && (
            <div className={styles.shareDropdown}>
              <div className={styles.menuItem} onClick={copyLink}>
                <LinkIcon size={14} /> Copy link
              </div>
              <div className={styles.menuItem} onClick={shareToTwitter}>
                Twitter / X
              </div>
              <div className={styles.menuItem} onClick={shareToFacebook}>
                Facebook
              </div>
              <div className={styles.menuItem} onClick={shareToKakao}>
                KakaoTalk
              </div>
            </div>
          )}
        </div>
      </div>

      {showComments && (
        <CommentSection pollId={poll.id} pollAuthorId={poll.author_id} onCommentPosted={onUpdate} />
      )}
    </div>
  )
}
