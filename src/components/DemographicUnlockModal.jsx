import { useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import styles from './Modal.module.css'

const GENDER_OPTIONS = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
]

const BIRTH_YEARS = Array.from({ length: 90 }, (_, i) => new Date().getFullYear() - 13 - i)

export default function DemographicUnlockModal({ onClose, onSaved }) {
  const { user } = useAuth()
  const [birthYear, setBirthYear] = useState('')
  const [gender, setGender] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    setError('')
    if (birthYear) {
      const age = new Date().getFullYear() - parseInt(birthYear, 10)
      if (age < 13) {
        setError('You must be at least 13 years old.')
        return
      }
    }

    setLoading(true)
    try {
      const { error: dbErr } = await supabase.from('user_demographics').upsert(
        {
          user_id: user.id,
          birth_year: birthYear ? parseInt(birthYear, 10) : null,
          gender: gender || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'user_id' },
      )
      if (dbErr) throw dbErr
      onSaved?.()
      onClose()
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>📊 See how your group voted</h2>
        <p className={styles.subtitle}>
          Add your demographics to unlock age and gender breakdowns on all polls. This is optional and completely
          anonymous — we never show individual votes.
        </p>

        <div className={styles.field}>
          <label className={styles.label}>Birth Year</label>
          <select className={styles.select} value={birthYear} onChange={(e) => setBirthYear(e.target.value)}>
            <option value="">Prefer not to say</option>
            {BIRTH_YEARS.map((year) => (
              <option key={year} value={year}>
                {year}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Gender</label>
          <select className={styles.select} value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="">Prefer not to say</option>
            {GENDER_OPTIONS.map((g) => (
              <option key={g.value} value={g.value}>
                {g.label}
              </option>
            ))}
          </select>
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actionsRow}>
          <button className="btn btn-ghost" onClick={onClose}>
            Skip
          </button>
          <button className="btn btn-accent" onClick={handleSave} disabled={loading}>
            {loading ? <span className="spinner" /> : 'Unlock Insights'}
          </button>
        </div>
      </div>
    </div>
  )
}
