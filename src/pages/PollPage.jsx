import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import posthog from 'posthog-js'
import { useAuth } from '../lib/AuthContext.jsx'
import { supabase } from '../lib/supabase.js'
import PollCard from '../components/PollCard.jsx'
import NotFoundPage from './NotFoundPage.jsx'
import styles from './PollPage.module.css'

export default function PollPage() {
  const { id } = useParams()
  const { user } = useAuth()
  const [poll, setPoll] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPoll()
  }, [id])

  // Record a view once per poll load — keyed on poll id (not the poll object
  // itself) so re-fetching via onUpdate after a vote/comment doesn't count
  // as another view.
  useEffect(() => {
    if (!poll || poll.author_id === user?.id) return

    supabase
      .from('poll_views')
      .upsert({ poll_id: poll.id, viewer_id: user?.id ?? null }, { onConflict: 'poll_id,viewer_id' })
      .then(({ error: viewErr }) => {
        if (viewErr) console.error(viewErr)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [poll?.id, user?.id])

  useEffect(() => {
    if (!poll) return
    posthog.capture('poll_viewed', {
      poll_id: poll.id,
      category: poll.category,
      has_media: (poll.poll_media?.length > 0) || !!poll.media_url,
    })
  }, [poll?.id])

  async function loadPoll() {
    setLoading(true)
    setError('')
    try {
      const { data: pollData, error: pollErr } = await supabase
        .from('polls')
        .select(
          `
          id, question, description, category, created_at, author_id, media_url, media_type,
          expires_at,
          profiles(username, avatar_url),
          options(id, label, position, vote_count:votes(count)),
          comment_count:comments(count)
        `,
        )
        .eq('id', id)
        .maybeSingle()
      if (pollErr) throw pollErr

      // PostgREST isn't recognizing the poll_media foreign key relationship
      // for embedding, so fetch it separately and merge instead.
      let media = []
      if (pollData) {
        const { data: mediaData } = await supabase
          .from('poll_media')
          .select('id, poll_id, url, media_type, position')
          .eq('poll_id', pollData.id)
        media = mediaData ?? []
      }

      setPoll(pollData ? { ...pollData, poll_media: media } : null)
    } catch (err) {
      console.error(err)
      setError('Something went wrong loading this poll.')
    } finally {
      setLoading(false)
    }
  }

  if (loading)
    return (
      <div className={styles.center}>
        <span className="spinner" />
      </div>
    )
  if (error) return <div className={styles.error}>{error}</div>
  if (!poll) return <NotFoundPage />

  return (
    <div className={styles.layout}>
      <Link to="/" className={styles.back}>
        &larr; Back to feed
      </Link>
      <PollCard poll={poll} onUpdate={loadPoll} defaultShowComments showDescription />
    </div>
  )
}
