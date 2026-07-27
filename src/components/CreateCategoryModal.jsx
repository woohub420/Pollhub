import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { slugify } from '../lib/slugify.js'
import styles from './Modal.module.css'

export default function CreateCategoryModal({ onClose }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const slug = slugify(name)
  const preview = slug ? `c/${slug}` : ''

  async function handleSubmit() {
    if (!user) return
    if (name.trim().length < 2) {
      setError('Name must be at least 2 characters')
      return
    }
    if (name.trim().length > 30) {
      setError('Name must be under 30 characters')
      return
    }
    if (!/^[a-zA-Z0-9\s]+$/.test(name)) {
      setError('Letters and numbers only')
      return
    }

    setLoading(true)
    setError('')
    try {
      const { data, error: dbErr } = await supabase
        .from('categories')
        .insert({
          name: slug,
          slug,
          description: description.trim() || null,
          created_by: user.id,
        })
        .select()
        .maybeSingle()

      if (dbErr) {
        if (dbErr.code === '23505') {
          setError('A category with this name already exists')
        } else {
          throw dbErr
        }
        return
      }

      onClose()
      navigate(`/c/${data.slug}`)
    } catch (err) {
      setError('Something went wrong. Please try again.')
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Create a Category</h2>

        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input
            className={styles.input}
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setError('')
            }}
            placeholder="e.g. travel, music, cars"
            maxLength={30}
          />
          {preview && (
            <span className={styles.preview}>
              Will be created as: <strong>{preview}</strong>
            </span>
          )}
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Description <span className={styles.optional}>(optional)</span>
          </label>
          <textarea
            className={styles.textarea}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is this category about?"
            maxLength={200}
            rows={3}
          />
        </div>

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.actionsRow}>
          <button className="btn btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-accent" onClick={handleSubmit} disabled={loading || !name.trim()}>
            {loading ? 'Creating...' : 'Create Category'}
          </button>
        </div>
      </div>
    </div>
  )
}
