import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import {
  CATEGORIES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
} from '../lib/constants.js'
import styles from './Modal.module.css'

export default function CreatePollModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [options, setOptions] = useState(['', ''])
  const [mediaFile, setMediaFile] = useState(null)
  const [mediaPreview, setMediaPreview] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  function handleMediaChange(e) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setError('')
    const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type)
    const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type)

    if (!isImage && !isVideo) {
      setError('Only JPEG, PNG, WebP, GIF images or MP4/WebM videos are allowed.')
      return
    }
    if (isImage && file.size > MAX_IMAGE_BYTES) {
      setError('Images must be 5MB or smaller.')
      return
    }
    if (isVideo && file.size > MAX_VIDEO_BYTES) {
      setError('Videos must be 20MB or smaller.')
      return
    }

    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(file)
    setMediaPreview(URL.createObjectURL(file))
  }

  function removeMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview)
    setMediaFile(null)
    setMediaPreview('')
  }

  function updateOption(index, value) {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)))
  }

  function addOption() {
    if (options.length >= 6) return
    setOptions((prev) => [...prev, ''])
  }

  function removeOption(index) {
    if (options.length <= 2) return
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const trimmedQuestion = question.trim()
    const filtered = options.map((o) => o.trim()).filter(Boolean)

    if (!trimmedQuestion) {
      setError('Question is required.')
      return
    }
    if (trimmedQuestion.length > 200) {
      setError('Question must be 200 characters or fewer.')
      return
    }
    if (!CATEGORIES.includes(category)) {
      setError('Invalid category.')
      return
    }
    if (filtered.length < 2) {
      setError('Add at least 2 options.')
      return
    }
    if (filtered.length > 6) {
      setError('A poll can have at most 6 options.')
      return
    }
    if (filtered.some((o) => o.length > 80)) {
      setError('Each option must be 80 characters or fewer.')
      return
    }
    if (!user) {
      setError('You must be logged in to create a poll.')
      return
    }

    setSubmitting(true)
    try {
      const { data: poll, error: pollErr } = await supabase
        .from('polls')
        .insert({ question: trimmedQuestion, category, author_id: user.id })
        .select()
        .maybeSingle()
      if (pollErr) throw pollErr
      if (!poll) throw new Error('Poll could not be created.')

      const { error: optionsErr } = await supabase
        .from('options')
        .insert(filtered.map((label, position) => ({ poll_id: poll.id, label, position })))
      if (optionsErr) throw optionsErr

      if (mediaFile) {
        const isVideo = ACCEPTED_VIDEO_TYPES.includes(mediaFile.type)
        const ext = mediaFile.name.split('.').pop()
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`

        const { error: uploadErr } = await supabase.storage.from('poll-media').upload(path, mediaFile)
        if (uploadErr) throw uploadErr

        const {
          data: { publicUrl },
        } = supabase.storage.from('poll-media').getPublicUrl(path)

        const { error: mediaErr } = await supabase
          .from('polls')
          .update({ media_url: publicUrl, media_type: isVideo ? 'video' : 'image' })
          .eq('id', poll.id)
        if (mediaErr) throw mediaErr
      }

      onCreated?.(poll.id)
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>New Poll</h2>

        {error && <div className={styles.error}>{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label}>Question</label>
            <textarea
              className={styles.textarea}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              maxLength={200}
              rows={2}
              required
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <select className={styles.select} value={category} onChange={(e) => setCategory(e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Options</label>
            {options.map((opt, i) => (
              <div key={i} className={styles.optionRow}>
                <input
                  className={styles.input}
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  maxLength={80}
                  placeholder={`Option ${i + 1}`}
                />
                {options.length > 2 && (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeOption(i)}>
                    Remove
                  </button>
                )}
              </div>
            ))}
            {options.length < 6 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={addOption}>
                + Add option
              </button>
            )}
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Photo or video (optional)</label>
            {mediaPreview ? (
              <div className={styles.optionRow}>
                {mediaFile.type.startsWith('video/') ? (
                  <video src={mediaPreview} className={styles.mediaPreview} muted loop playsInline autoPlay />
                ) : (
                  <img src={mediaPreview} className={styles.mediaPreview} alt="" />
                )}
                <button type="button" className="btn btn-ghost btn-sm" onClick={removeMedia}>
                  Remove
                </button>
              </div>
            ) : (
              <input type="file" accept="image/*,video/*" onChange={handleMediaChange} />
            )}
          </div>

          <div className={styles.actionsRow}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-accent" disabled={submitting}>
              {submitting ? <span className="spinner" /> : 'Create Poll'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
