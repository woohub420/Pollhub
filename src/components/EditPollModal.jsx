import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase.js'
import { downscaleImage, getVideoDuration } from '../lib/downscaleImage.js'
import { TagIcon } from './icons.jsx'
import { sanitize } from '../lib/sanitize.js'
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

// Admin-only editor for an existing poll. Mirrors CreatePollModal's form,
// but loads the poll's current data and updates in place instead of
// inserting — preserving option ids (and therefore existing votes) for any
// option that isn't actually removed.
export default function EditPollModal({ pollId, onClose, onUpdated }) {
  const [loading, setLoading] = useState(true)
  const [question, setQuestion] = useState('')
  const [description, setDescription] = useState('')
  const [categoryInput, setCategoryInput] = useState('')
  const [categorySelected, setCategorySelected] = useState(null) // { id, name, slug }
  const [categorySuggestions, setCategorySuggestions] = useState([])
  const [categoryOpen, setCategoryOpen] = useState(false)
  const categoryRef = useRef(null)
  const [options, setOptions] = useState([]) // [{ id: existingId|null, label }]
  const [initialOptionIds, setInitialOptionIds] = useState([])
  const [existingMedia, setExistingMedia] = useState([]) // [{ id, url, media_type, position }]
  const [removedMediaIds, setRemovedMediaIds] = useState([])
  const [newMediaFiles, setNewMediaFiles] = useState([]) // [{ file, preview, isVideo }]
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const imageInputRef = useRef(null)
  const videoInputRef = useRef(null)

  const keptMedia = existingMedia.filter((m) => !removedMediaIds.includes(m.id))
  const mediaMode =
    keptMedia.some((m) => m.media_type === 'video') || newMediaFiles.some((m) => m.isVideo)
      ? 'video'
      : keptMedia.length > 0 || newMediaFiles.length > 0
        ? 'image'
        : null

  useEffect(() => {
    async function load() {
      const [{ data: poll }, { data: opts }, { data: media }] = await Promise.all([
        supabase.from('polls').select('question, description, category').eq('id', pollId).maybeSingle(),
        supabase.from('options').select('id, label, position').eq('poll_id', pollId).order('position'),
        supabase.from('poll_media').select('id, url, media_type, position').eq('poll_id', pollId).order('position'),
      ])

      if (poll) {
        setQuestion(poll.question ?? '')
        setDescription(poll.description ?? '')
        setCategoryInput(poll.category ?? '')
        const { data: cat } = await supabase
          .from('categories')
          .select('id, name, slug')
          .eq('name', poll.category)
          .maybeSingle()
        if (cat) setCategorySelected(cat)
      }
      const loadedOptions = (opts ?? []).map((o) => ({ id: o.id, label: o.label }))
      setOptions(loadedOptions)
      setInitialOptionIds(loadedOptions.map((o) => o.id))
      setExistingMedia(media ?? [])
      setLoading(false)
    }
    load()
  }, [pollId])

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

  function updateOption(index, value) {
    setOptions((prev) => prev.map((o, i) => (i === index ? { ...o, label: value } : o)))
  }

  function addOption() {
    if (options.length >= 6) return
    setOptions((prev) => [...prev, { id: null, label: '' }])
  }

  function removeOption(index) {
    if (options.length <= 2) return
    setOptions((prev) => prev.filter((_, i) => i !== index))
  }

  function removeExistingMedia(id) {
    setRemovedMediaIds((prev) => [...prev, id])
  }

  async function handleMediaChange(e) {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (files.length === 0) return

    setError('')
    const isVideoInput = ACCEPTED_VIDEO_TYPES.includes(files[0].type)
    const currentCount = keptMedia.length + newMediaFiles.length
    const cap = isVideoInput ? MAX_VIDEOS : MAX_IMAGES

    if (currentCount + files.length > cap) {
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
      if (mediaMode && ((isVideo && mediaMode === 'image') || (isImage && mediaMode === 'video'))) {
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

    setNewMediaFiles((prev) => [...prev, ...accepted])
  }

  function removeNewMedia(index) {
    setNewMediaFiles((prev) => {
      URL.revokeObjectURL(prev[index].preview)
      return prev.filter((_, i) => i !== index)
    })
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const cleanQuestion = sanitize(question)
    const cleanDescription = sanitize(description)
    const filtered = options.map((o) => ({ ...o, label: sanitize(o.label) })).filter((o) => o.label)

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
    if (filtered.some((o) => o.label.length > 80)) {
      setError('Each option must be 80 characters or fewer.')
      return
    }

    setSubmitting(true)
    try {
      const { error: pollErr } = await supabase
        .from('polls')
        .update({
          question: cleanQuestion,
          description: cleanDescription || null,
          category: categorySelected.name,
        })
        .eq('id', pollId)
      if (pollErr) throw pollErr

      // Options: only touch what actually changed, so kept options (and
      // their votes, via option_id's on-delete-cascade) survive untouched.
      const keptIds = filtered.filter((o) => o.id).map((o) => o.id)
      const toDelete = initialOptionIds.filter((id) => !keptIds.includes(id))
      if (toDelete.length > 0) {
        const { error: delErr } = await supabase.from('options').delete().in('id', toDelete)
        if (delErr) throw delErr
      }

      for (let i = 0; i < filtered.length; i++) {
        const opt = filtered[i]
        if (opt.id) {
          const { error: updErr } = await supabase
            .from('options')
            .update({ label: opt.label, position: i })
            .eq('id', opt.id)
          if (updErr) throw updErr
        }
      }

      const toInsert = filtered
        .map((opt, i) => ({ opt, position: i }))
        .filter(({ opt }) => !opt.id)
      if (toInsert.length > 0) {
        const { error: insErr } = await supabase
          .from('options')
          .insert(toInsert.map(({ opt, position }) => ({ poll_id: pollId, label: opt.label, position })))
        if (insErr) throw insErr
      }

      // Media: delete removed rows, then append newly uploaded ones after
      // whatever's kept.
      if (removedMediaIds.length > 0) {
        const { error: delMediaErr } = await supabase.from('poll_media').delete().in('id', removedMediaIds)
        if (delMediaErr) throw delMediaErr
      }

      if (newMediaFiles.length > 0) {
        const {
          data: { user },
        } = await supabase.auth.getUser()
        const rows = []
        for (let i = 0; i < newMediaFiles.length; i++) {
          const { file, isVideo } = newMediaFiles[i]
          const uploadFile = isVideo ? file : await downscaleImage(file)
          const ext = uploadFile.name.split('.').pop()
          const path = `${user.id}/${crypto.randomUUID()}.${ext}`

          const { error: uploadErr } = await supabase.storage.from('poll-media').upload(path, uploadFile)
          if (uploadErr) throw uploadErr

          const {
            data: { publicUrl },
          } = supabase.storage.from('poll-media').getPublicUrl(path)

          rows.push({
            poll_id: pollId,
            url: publicUrl,
            media_type: isVideo ? 'video' : 'image',
            position: keptMedia.length + i,
          })
        }

        const { error: mediaErr } = await supabase.from('poll_media').insert(rows)
        if (mediaErr) throw mediaErr
      }

      onUpdated?.()
    } catch (err) {
      console.error(err)
      setError('Something went wrong. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.overlay}>
        <div className={styles.modal}>
          <span className="spinner" />
        </div>
      </div>
    )
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <h2 className={styles.title}>Edit Poll (Admin)</h2>

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
              <div key={opt.id ?? `new-${i}`} className={styles.optionRow}>
                <input
                  className={styles.input}
                  value={opt.label}
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
            <label className={styles.label}>
              Photos ({MAX_IMAGES} max) or a video ({MAX_VIDEO_SECONDS}s max) — optional, not both
            </label>
            {(keptMedia.length > 0 || newMediaFiles.length > 0) && (
              <div className={styles.optionRow} style={{ flexWrap: 'wrap' }}>
                {keptMedia.map((item) => (
                  <div key={item.id} style={{ position: 'relative' }}>
                    {item.media_type === 'video' ? (
                      <video src={item.url} className={styles.mediaPreview} muted loop playsInline autoPlay />
                    ) : (
                      <img src={item.url} className={styles.mediaPreview} alt="" />
                    )}
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      style={{ position: 'absolute', top: 2, right: 2 }}
                      onClick={() => removeExistingMedia(item.id)}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {newMediaFiles.map((item, i) => (
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
                      onClick={() => removeNewMedia(i)}
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
              {(mediaMode === null || mediaMode === 'image') && keptMedia.length + newMediaFiles.length < MAX_IMAGES && (
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
              {submitting ? <span className="spinner" /> : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
