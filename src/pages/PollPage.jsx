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
      const { data, error: fetchErr } = await supabase
        .from('polls')
        .select(
          `
          id, question, category, created_at, media_url, media_type,
          profiles(username),
          options(id, label, position, vote_count:votes(count)),
          comment_count:comments(count)
        `,
        )
        .eq('id', id)
        .maybeSingle()
      if (fetchErr) throw fetchErr
      setPoll(data)
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
