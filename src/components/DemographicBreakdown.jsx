import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import styles from './DemographicBreakdown.module.css'

const GENDER_LABELS = {
  male: 'Male',
  female: 'Female',
  prefer_not_to_say: 'Prefer not to say',
  other: 'Other',
}

export default function DemographicBreakdown({ pollId }) {
  const [ageData, setAgeData] = useState([])
  const [genderData, setGenderData] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    async function load() {
      setLoading(true)
      const [ageRes, genderRes] = await Promise.all([
        supabase.rpc('get_poll_age_breakdown', { p_poll_id: pollId }),
        supabase.rpc('get_poll_gender_breakdown', { p_poll_id: pollId }),
      ])
      if (!active) return
      setAgeData(ageRes.data ?? [])
      setGenderData(genderRes.data ?? [])
      setLoading(false)
    }
    load()

    return () => {
      active = false
    }
  }, [pollId])

  if (loading) return null

  if (ageData.length === 0 && genderData.length === 0) {
    return <div className={styles.empty}>📊 Not enough votes yet to show a demographic breakdown</div>
  }

  return (
    <div className={styles.wrapper}>
      <h3 className={styles.title}>Who voted?</h3>

      {ageData.length > 0 && (
        <div className={styles.group}>
          <div className={styles.groupLabel}>Age groups</div>
          {ageData.map((row) => (
            <div key={row.age_group} className={styles.row}>
              <span className={styles.label}>{row.age_group}</span>
              <div className={styles.barWrapper}>
                <div className={styles.bar} style={{ width: `${row.pct}%` }} />
              </div>
              <span className={styles.pct}>{row.pct}%</span>
            </div>
          ))}
        </div>
      )}

      {genderData.length > 0 && (
        <div className={styles.group}>
          <div className={styles.groupLabel}>Gender</div>
          {genderData.map((row) => (
            <div key={row.gender_group} className={styles.row}>
              <span className={styles.label}>{GENDER_LABELS[row.gender_group] ?? row.gender_group}</span>
              <div className={styles.barWrapper}>
                <div className={styles.bar} style={{ width: `${row.pct}%` }} />
              </div>
              <span className={styles.pct}>{row.pct}%</span>
            </div>
          ))}
        </div>
      )}

      <p className={styles.disclaimer}>
        Shown only when 10+ votes and 3+ per group. Individual votes are never shown.
      </p>
    </div>
  )
}
