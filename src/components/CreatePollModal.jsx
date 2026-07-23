import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { CATEGORIES } from '../lib/constants.js'
import styles from './Modal.module.css'

export default function CreatePollModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const [question, setQuestion] = useState('')
  const [category, setCategory] = useState(CATEGORIES[0])
  const [options, setOptions] = useState(['', ''])
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

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
