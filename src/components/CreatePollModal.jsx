import { useEffect, useRef, useState } from 'react'
import posthog from 'posthog-js'
import { supabase } from '../lib/supabase.js'
import { useAuth } from '../lib/AuthContext.jsx'
import { downscaleImage, getVideoDuration } from '../lib/downscaleImage.js'
import { TagIcon } from './icons.jsx'
import { sanitize } from '../lib/sanitize.js'
import { checkRateLimit, LIMITS } from '../lib/rateLimit.js'
import {
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  MAX_IMAGES,
  MAX_VIDEOS,
  MAX_VIDEO_SECONDS,
  ACCEPTED_IMAGE_TYPES,
  ACCEPTED_VIDEO_TYPES,
} from '../lib/constants.js'
import styles from './Modal.module.css'

export default function CreatePollModal({ onClose, onCreated }) {
  const { user } = useAuth()
  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [categorySelected, setCategorySelected] = useState(null) // { id, name, slug }
  const [categorySuggestions, setCategorySuggestions] = useState([])
  const [categoryOpen, setCategoryOpen] = useState(false)
  const categoryRef = useRef(null)
  const [options, setOptions] = useState(['', ''])
  const [mediaFiles, setMediaFiles] = useState([]) // [{ file, preview, isVideo }]
  const [mediaMode, setMediaMode] = useState(null) // null | 'image' | 'video'
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [expiresIn, setExpiresIn] = useState('') // '' | '1h' | '6h' | '24h' | '3d' | '7d'
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  function getExpiresAt() {
    if (!expiresIn) return null
    const map = { '1h': 1, '6h': 6, '24h': 24, '3d': 72, '7d': 168 }
    const d = new Date()
    d.setHours(d.getHours() + map[expiresIn])
    return d.toISOString()
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (categoryRef.current && !categoryRef.current.contains(e.target)) {
        setCategoryOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (categoryInput.trim().length < 1) {
      loadAllCategories()
      return
    }
    const timer = setTimeout(() => searchCategories(categoryInput.trim()), 200)
    return () => clearTimeout(timer)
  }, [categoryInput])

  async function loadAllCategories() {
    const { data } = await supabase.from('categories').select('id, name, slug').order('name').limit(10)
    setCategorySuggestions(data ?? [])
  }

  async function searchCategories(q) {
    const { data } = await supabase
      .from('categories')
      .select('id, name, slug')
      .ilike('name', `%${q}%`)
      .order('name')
      .limit(8)
    setCategorySuggestions(data ?? [])
  }

  function handleCategorySelect(cat) {
    setCategorySelected(cat)
    setCategoryInput(cat.name)
    setCategoryOpen(false)
  }

  function handleCategoryInputChange(e) {
    setCategoryInput(e.target.value)
    setCategorySelected(null)
    setCategoryOpen(true)
  }

  async function handleMediaChange(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    setError('')
    const isVideoInput = ACCEPTED_VIDEO_TYPES.includes(files[0].type)
    const cap = isVideoInput ? MAX_VIDEOS : MAX_IMAGES

    if (mediaFiles.length + files.length > cap) {
      setError(isVideoInput ? 'Only 1 video is allowed.' : `You can attach at most ${MAX_IMAGES} photos.`)
      return
    }

    const accepted = []
    for (const file of files) {
      const isImage = ACCEPTED_IMAGE_TYPES.includes(file.type)
      const isVideo = ACCEPTED_VIDEO_TYPES.includes(file.type)

      if (!isImage && !isVideo) {
        setError('Only JPEG, PNG, WebP, GIF images or MP4/WebM videos are allowed.')
        return
      }
      if (isImage !== !isVideoInput) {
        setError('A poll can have photos or a video, not both.')
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
      if (isVideo) {
        try {
          const duration = await getVideoDuration(file)
          if (duration > MAX_VIDEO_SECONDS) {
            setError(`Videos must be ${MAX_VIDEO_SECONDS} seconds or shorter.`)
            return
          }
        } catch {
          setError('Could not read that video file.')
          return
        }
      }

      accepted.push({ file, preview: URL.createObjectURL(file), isVideo })
    }

    setMediaMode(isVideoInput ? 'video' : 'image')
    setMediaFiles((prev) => [...prev, ...accepted])
  }

  function removeMedia(index) {
    setMediaFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      const next = prev.filter((_, i) => i !== index)
      if (next.length === 0) setMediaMode(null)
      return next
    })
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

    const cleanQuestion = sanitize(question)
    const cleanDescription = sanitize(description)
    const filtered = options.map((o) => sanitize(o)).filter(Boolean)

    if (!cleanQuestion) {
      setError('Question is required.')
      return
    }
    if (cleanQuestion.length > 200) {
      setError('Question must be 200 characters or fewer.')
      return
    }
    if (!categorySelected) {
      setError('Please select a category.')
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

    try {
      checkRateLimit('CREATE_POLL', LIMITS.CREATE_POLL.max, LIMITS.CREATE_POLL.window)
    } catch (err) {
      setError(err.message)
      return
    }

    setSubmitting(true)
    try {
      const { data: poll, error: pollErr } = await supabase
        .from('polls')
        .insert({
          question: cleanQuestion,
          description: cleanDescription || null,
          category: categorySelected.name,
          author_id: user.id,
          expires_at: getExpiresAt(),
        })
        .select()
        .maybeSingle()
      if (pollErr) throw pollErr
      if (!poll) throw new Error('Poll could not be created.')

      const { error: optionsErr } = await supabase
        .from('options')
        .insert(filtered.map((label, position) => ({ poll_id: poll.id, label, position })))
      if (optionsErr) throw optionsErr

      if (mediaFiles.length > 0) {
        const rows = []
        for (let i = 0; i < mediaFiles.length; i++) {
          const { file, isVideo } = mediaFiles[i]
          const uploadFile = isVideo ? file : await downscaleImage(file)
          const ext = uploadFile.name.split('.').pop()
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`

          const { error: uploadErr } = await supabase.storage.from('poll-media').upload(path, uploadFile)
          if (uploadErr) throw uploadErr

          const {
            data: { publicUrl },
          } = supabase.storage.from('poll-media').getPublicUrl(path)

          rows.push({ poll_id: poll.id, url: publicUrl, media_type: isVideo ? 'video' : 'image', position: i })
        }

        const { error: mediaErr } = await supabase.from('poll_media').insert(rows)
        if (mediaErr) throw mediaErr
      }

      posthog.capture('poll_created', {
        category: categorySelected.name,
        has_media: mediaFiles.length > 0,
        has_description: !!cleanDescription,
        has_expiry: !!expiresIn,
      })

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
            <label className={styles.label}>
              Description <span className={styles.optional}>(optional, shown only when poll is opened)</span>
            </label>
            <textarea
              className={styles.textarea}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add more context to your poll..."
              maxLength={500}
              rows={3}
            />
            <span className={styles.charCount}>{description.length}/500</span>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Category</label>
            <div className={styles.categoryWrapper} ref={categoryRef}>
              <div className={`${styles.categoryInput} ${categorySelected ? styles.categorySelected : ''}`}>
                {categorySelected && <span className={styles.categoryBadge}>c/{categorySelected.slug}</span>}
                <input
                  className={styles.categorySearchInput}
                  value={categoryInput}
                  onChange={handleCategoryInputChange}
                  onFocus={() => {
                    setCategoryOpen(true)
                    loadAllCategories()
                  }}
                  placeholder="Select a category..."
                  autoComplete="off"
                />
                {categorySelected && (
                  <button
                    type="button"
                    className={styles.categoryClear}
                    onClick={() => {
                      setCategorySelected(null)
                      setCategoryInput('')
                      setCategoryOpen(true)
                    }}
                  >
                    ✕
                  </button>
                )}
              </div>

              {categoryOpen && categorySuggestions.length > 0 && (
                <div className={styles.categorySuggestions}>
                  {categorySuggestions.map((cat) => (
                    <div
                      key={cat.id}
                      className={`${styles.categorySuggItem} ${
                        categorySelected?.id === cat.id ? styles.categorySuggActive : ''
                      }`}
                      onClick={() => handleCategorySelect(cat)}
                    >
                      <TagIcon size={13} className={styles.categorySuggIcon} />
                      <div className={styles.categorySuggText}>
                        <span className={styles.categorySuggName}>c/{cat.slug}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
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
            <label className={styles.label}>Poll closes in</label>
            <select className={styles.select} value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)}>
              <option value="">Never</option>
              <option value="1h">1 hour</option>
              <option value="6h">6 hours</option>
              <option value="24h">24 hours</option>
              <option value="3d">3 days</option>
              <option value="7d">7 days</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Photos ({MAX_IMAGES} max) or a video ({MAX_VIDEO_SECONDS}s max) — optional, not both
            </label>
            {mediaFiles.length > 0 && (
              <div className={styles.optionRow} style={{ flexWrap: 'wrap' }}>
                {mediaFiles.map((item, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    {item.isVideo ? (
                      <video src={item.preview} className={styles.mediaPreview} muted loop playsInline autoPlay />
                    ) : (
                      <img src={item.preview} className={styles.mediaPreview} alt="" />
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ position: 'absolute', top: 2, right: 2 }}
                      onClick={() => removeMedia(i)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            )}

            <input
              ref={imageInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleMediaChange}
              style={{ display: 'none' }}
            />
            <input
              ref={videoInputRef}
              type="file"
              accept="video/*"
              onChange={handleMediaChange}
              style={{ display: 'none' }}
            />

            <div className={styles.optionRow}>
              {(mediaMode === null || mediaMode === 'image') && mediaFiles.length < MAX_IMAGES && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => imageInputRef.current?.click()}>
                  + Add photo
                </button>
              )}
              {mediaMode === null && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => videoInputRef.current?.click()}>
                  + Add video
                </button>
              )}
            </div>
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
