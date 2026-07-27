import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import PollCard from '../components/PollCard.jsx'
import styles from './PollPage.module.css'

export default function PollPage() {
  const { id } = useParams()
  const [poll, setPoll] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadPoll()
  }, [id])

  async function loadPoll() {
    setLoading(true)
    setError('')
    try {
      const { data: pollData, error: pollErr } = await supabase
        .from('polls')
        .select(
          `
          id, question, category, created_at, author_id, media_url, media_type,
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
  if (!poll) return <div className={styles.empty}>Poll not found.</div>

  return (
    <div className={styles.layout}>
      <Link to="/" className={styles.back}>
        &larr; Back to feed
      </Link>
      <PollCard poll={poll} onUpdate={loadPoll} defaultShowComments />
    </div>
  )
}
