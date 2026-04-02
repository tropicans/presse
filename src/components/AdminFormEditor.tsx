'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AdminFormPreview from './AdminFormPreview'

interface EditableField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'radio' | 'likert' | 'signature'
  required: boolean
  placeholder: string
  pageId: string
  options: Array<{
    label: string
    isCorrect: boolean
    points: number
    nextPageId?: string
  }>
}

interface EditablePage {
  id: string
  title: string
  description: string
}

interface AdminFormDetail {
  id: string
  slug: string
  title: string
  description: string | null
  successMessage: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  mode: 'STANDARD' | 'QUIZ' | 'ATTENDANCE'
  workflow: 'STANDARD' | 'WEBINAR'
  quizSettings: {
    passingPercentage: number
  }
  pages: EditablePage[]
  fields: EditableField[]
}

interface Props {
  formId: string
}

const defaultRadioOptions = [
  { label: 'Opsi 1', isCorrect: false, points: 0, nextPageId: '' },
  { label: 'Opsi 2', isCorrect: false, points: 0, nextPageId: '' },
]

const defaultLikertOptions = [
  { label: '1 - Sangat Tidak Setuju', isCorrect: false, points: 0, nextPageId: '' },
  { label: '2 - Tidak Setuju', isCorrect: false, points: 0, nextPageId: '' },
  { label: '3 - Netral', isCorrect: false, points: 0, nextPageId: '' },
  { label: '4 - Setuju', isCorrect: false, points: 0, nextPageId: '' },
  { label: '5 - Sangat Setuju', isCorrect: false, points: 0, nextPageId: '' },
]

const fieldTypeOptions: Array<EditableField['type']> = ['text', 'textarea', 'radio', 'likert', 'signature']
const fieldTypeLabels: Record<EditableField['type'], string> = {
  text: 'Teks Singkat',
  textarea: 'Teks Panjang',
  radio: 'Pilihan',
  likert: 'Likert',
  signature: 'Tanda Tangan',
}
function createOptionsForType(type: EditableField['type'], currentOptions: EditableField['options'] = []) {
  if (type === 'radio') {
    return currentOptions.length
      ? currentOptions.map((option) => ({ ...option }))
      : defaultRadioOptions.map((option) => ({ ...option }))
  }

  if (type === 'likert') {
    return currentOptions.length === defaultLikertOptions.length
      ? currentOptions.map((option) => ({
          ...option,
          isCorrect: false,
          points: 0,
          nextPageId: '',
        }))
      : defaultLikertOptions.map((option) => ({ ...option }))
  }

  return []
}

function createPage(index: number): EditablePage {
  return {
    id: `page-${crypto.randomUUID()}`,
    title: `Halaman ${index + 1}`,
    description: '',
  }
}

function createField(type: EditableField['type'], pageId: string): EditableField {
  return {
    id: `new-${crypto.randomUUID()}`,
    name: 'field_baru',
    label: '',
    type,
    required: true,
    placeholder: '',
    pageId,
    options: createOptionsForType(type),
  }
}

export default function AdminFormEditor({ formId }: Props) {
  const [form, setForm] = useState<AdminFormDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/admin/forms/${formId}`)
        const json = await res.json()

        if (!res.ok) {
          setError(json.error || 'Gagal memuat form')
          return
        }

        setForm(json.data)
      } catch {
        setError('Gagal memuat form')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [formId])

  const getPublicFormPath = (currentForm: Pick<AdminFormDetail, 'slug' | 'status'>) => {
    if (currentForm.status !== 'PUBLISHED') {
      return null
    }

    return `/f/${currentForm.slug}`
  }

  const getPublicFormUrl = (path: string) => {
    if (typeof window === 'undefined') {
      return path
    }

    return new URL(path, window.location.origin).toString()
  }

  const getShareText = (currentForm: Pick<AdminFormDetail, 'title'>, publicUrl: string) => {
    return `Isi form "${currentForm.title}" di sini: ${publicUrl}`
  }

  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const getBranchTargetPages = (pageId: string) => {
    if (!form) {
      return []
    }

    const currentPageIndex = form.pages.findIndex((page) => page.id === pageId)
    return currentPageIndex >= 0
      ? form.pages.slice(currentPageIndex + 1)
      : form.pages.slice(1)
  }

  const getPageLabel = (pageId: string) => {
    if (!form) {
      return 'halaman berikutnya'
    }

    const page = form.pages.find((item) => item.id === pageId)
    return page?.title || 'halaman berikutnya'
  }

  const updateField = (fieldId: string, patch: Partial<EditableField>) => {
    setForm((current) => {
      if (!current) return current
      return {
        ...current,
        fields: current.fields.map((field) =>
          field.id === fieldId ? { ...field, ...patch } : field
        ),
      }
    })
  }

  const removeField = (fieldId: string) => {
    setForm((current) => {
      if (!current) return current
      if (current.fields.length <= 1) return current

      return {
        ...current,
        fields: current.fields.filter((field) => field.id !== fieldId),
      }
    })
  }

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    setForm((current) => {
      if (!current) return current

      const index = current.fields.findIndex((field) => field.id === fieldId)
      if (index === -1) return current

      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.fields.length) {
        return current
      }

      const fields = [...current.fields]
      const [field] = fields.splice(index, 1)
      fields.splice(targetIndex, 0, field)

      return { ...current, fields }
    })
  }

  const addField = (type: EditableField['type']) => {
    setForm((current) => {
      if (!current) return current
      const targetPageId = current.pages[current.pages.length - 1]?.id ?? 'page-1'
      return {
        ...current,
        fields: [...current.fields, createField(type, targetPageId)],
      }
    })
  }

  const addPage = () => {
    setForm((current) => {
      if (!current) return current

      return {
        ...current,
        pages: [...current.pages, createPage(current.pages.length)],
      }
    })
  }

  const updatePage = (pageId: string, patch: Partial<EditablePage>) => {
    setForm((current) => {
      if (!current) return current

      return {
        ...current,
        pages: current.pages.map((page) => page.id === pageId ? { ...page, ...patch } : page),
      }
    })
  }

  const removePage = (pageId: string) => {
    setForm((current) => {
      if (!current || current.pages.length <= 1) {
        return current
      }

      const nextPages = current.pages.filter((page) => page.id !== pageId)
      const fallbackPageId = nextPages[0]?.id ?? current.pages[0].id

      return {
        ...current,
        pages: nextPages,
        fields: current.fields.map((field) => (
          field.pageId === pageId
            ? { ...field, pageId: fallbackPageId }
            : field
        )),
      }
    })
  }

  const updateOption = (
    fieldId: string,
    optionIndex: number,
    patch: Partial<EditableField['options'][number]>
  ) => {
    setForm((current) => {
      if (!current) return current

      return {
        ...current,
        fields: current.fields.map((field) => {
          if (field.id !== fieldId) {
            return field
          }

          const nextOptions = field.options.map((option, index) => {
            if (index !== optionIndex) {
              return patch.isCorrect ? { ...option, isCorrect: false } : option
            }

            return {
              ...option,
              ...patch,
            }
          })

          return {
            ...field,
            options: nextOptions,
          }
        }),
      }
    })
  }

  const addOption = (fieldId: string) => {
    setForm((current) => {
      if (!current) return current

      return {
        ...current,
        fields: current.fields.map((field) => (
          field.id === fieldId
            ? {
                ...field,
                options: [
                  ...field.options,
                  {
                    label: `Opsi ${field.options.length + 1}`,
                    isCorrect: false,
                    points: 0,
                    nextPageId: '',
                  },
                ],
              }
            : field
        )),
      }
    })
  }

  const removeOption = (fieldId: string, optionIndex: number) => {
    setForm((current) => {
      if (!current) return current

      return {
        ...current,
        fields: current.fields.map((field) => (
          field.id === fieldId
            ? {
                ...field,
                options: field.options.filter((_, index) => index !== optionIndex),
              }
            : field
        )),
      }
    })
  }

  const handleCopyPublicUrl = async () => {
    if (!form) {
      return
    }

    const path = getPublicFormPath(form)

    if (!path) {
      return
    }

    try {
      await navigator.clipboard.writeText(getPublicFormUrl(path))
      setCopied(true)
      setMessage(`Link form ${form.slug} berhasil disalin`)
      setError(null)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setError('Gagal menyalin link form')
      setMessage(null)
    }
  }

  const handleShareWhatsApp = () => {
    if (!form) {
      return
    }

    const path = getPublicFormPath(form)

    if (!path) {
      return
    }

    const publicUrl = getPublicFormUrl(path)
    openShareWindow(`https://api.whatsapp.com/send?text=${encodeURIComponent(getShareText(form, publicUrl))}`)
  }

  const handleShareX = () => {
    if (!form) {
      return
    }

    const path = getPublicFormPath(form)

    if (!path) {
      return
    }

    const publicUrl = getPublicFormUrl(path)
    const shareText = `Isi form "${form.title}" di sini`
    openShareWindow(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(publicUrl)}`
    )
  }

  const handleShareThreads = () => {
    if (!form) {
      return
    }

    const path = getPublicFormPath(form)

    if (!path) {
      return
    }

    const publicUrl = getPublicFormUrl(path)
    openShareWindow(`https://www.threads.net/intent/post?text=${encodeURIComponent(getShareText(form, publicUrl))}`)
  }

  const closeShareMenu = (menu: HTMLDetailsElement | null) => {
    if (menu) {
      menu.open = false
    }
  }

  const handleSave = async () => {
    if (!form) return

    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const res = await fetch(`/api/admin/forms/${formId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description ?? '',
          successMessage: form.successMessage ?? '',
          status: form.status,
          mode: form.mode,
          quizSettings: form.quizSettings,
          pages: form.pages,
          fields: form.fields.map((field) => ({
            id: field.id,
            type: field.type,
            label: field.label,
            required: field.required,
            placeholder: field.placeholder,
            pageId: field.pageId,
            options: field.options,
          })),
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Gagal menyimpan perubahan')
        return
      }

      setForm(json.data)
      setMessage('Form berhasil diperbarui')
    } catch {
      setError('Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="admin-wrapper"><div className="admin-empty"><p>Memuat editor...</p></div></div>
  }

  if (!form) {
    return <div className="admin-wrapper"><div className="admin-empty"><p>{error || 'Form tidak ditemukan'}</p></div></div>
  }

  const publicFormPath = getPublicFormPath(form)
  const usesAttendanceMode = form.mode === 'ATTENDANCE'
  const usesQuizScoring = form.mode === 'QUIZ' || form.mode === 'ATTENDANCE'

  return (
    <div className="admin-wrapper admin-builder-wrapper">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>Edit Form</h1>
          <p>{form.slug}</p>
        </div>
        <div className="admin-header-right">
          <Link href="/admin/forms" className="admin-secondary-btn">Kembali ke daftar</Link>
          <Link href={`/admin/forms/${form.id}/submissions`} className="admin-secondary-btn">Lihat Submissions</Link>
          <button onClick={handleSave} disabled={saving} className="admin-export-btn">
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {(message || error) && (
        <div className={`admin-builder-alert ${error ? 'error' : 'success'}`}>
          {error || message}
        </div>
      )}

      <div className="admin-builder-grid">
        <section className="admin-builder-panel">
          <h2>Informasi Form</h2>
          <label className="admin-builder-field">
            <span>Judul</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="admin-builder-input" />
          </label>
          <label className="admin-builder-field">
            <span>Deskripsi</span>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="admin-builder-textarea"
              rows={4}
            />
          </label>
          <label className="admin-builder-field">
            <span>Pesan sukses</span>
            <textarea
              value={form.successMessage ?? ''}
              onChange={(e) => setForm({ ...form, successMessage: e.target.value })}
              className="admin-builder-textarea"
              rows={3}
            />
          </label>
          <label className="admin-builder-field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as AdminFormDetail['status'] })}
              className="admin-builder-select"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>
          <label className="admin-builder-field">
            <span>Mode</span>
            <select
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value as AdminFormDetail['mode'] })}
              className="admin-builder-select"
            >
              <option value="STANDARD">STANDARD</option>
              <option value="QUIZ">QUIZ</option>
              <option value="ATTENDANCE">PRESENSI + QUIZ + EVALUASI</option>
            </select>
          </label>
          <small>
            {usesAttendanceMode
              ? 'Mode ini ditujukan untuk form gabungan presensi, quiz, dan evaluasi dengan builder multi-halaman seperti Google Forms.'
              : 'Mode quiz atau standar tetap bisa memakai halaman, section, dan branching sesuai kebutuhan.'}
          </small>
          {usesQuizScoring && (
            <label className="admin-builder-field">
              <span>Passing Grade (%)</span>
              <input
                type="number"
                min={1}
                max={100}
                value={form.quizSettings.passingPercentage}
                onChange={(e) => setForm({
                  ...form,
                  quizSettings: {
                    passingPercentage: Math.min(100, Math.max(1, Number(e.target.value) || 1)),
                  },
                })}
                className="admin-builder-input admin-builder-points-input"
              />
              <small>Peserta dinyatakan lulus jika skor mencapai persentase ini dari total nilai quiz.</small>
            </label>
          )}
          <div className="admin-builder-share-panel">
            <div className="admin-builder-share-head">
              <h3>Bagikan Form</h3>
              <p>
                {publicFormPath
                  ? 'Gunakan link ini untuk membagikan form ke pengisi.'
                  : 'Publikasikan form terlebih dahulu untuk mengaktifkan link publik.'}
              </p>
            </div>
            <div className="admin-builder-share-url">
              <code>{publicFormPath ?? '/f/{slug}'}</code>
            </div>
            <div className="admin-action-group">
              <button
                type="button"
                className="admin-link-btn admin-copy-btn"
                onClick={(event) => {
                  handleCopyPublicUrl()
                  closeShareMenu(event.currentTarget.closest('details'))
                }}
                disabled={!publicFormPath}
              >
                {copied ? 'Tersalin' : 'Copy Link'}
              </button>
              {publicFormPath ? (
                <details className="admin-share-menu">
                  <summary className="admin-link-btn admin-share-summary">
                    Bagikan
                  </summary>
                  <div className="admin-share-menu-panel">
                    <button
                      type="button"
                      className="admin-link-btn admin-share-btn whatsapp"
                      onClick={handleShareWhatsApp}
                    >
                      WhatsApp
                    </button>
                    <button
                      type="button"
                      className="admin-link-btn admin-share-btn x"
                      onClick={handleShareX}
                    >
                      X
                    </button>
                    <button
                      type="button"
                      className="admin-link-btn admin-share-btn threads"
                      onClick={handleShareThreads}
                    >
                      Threads
                    </button>
                    <Link
                      href={publicFormPath}
                      className="admin-link-btn"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Buka Form
                    </Link>
                  </div>
                </details>
              ) : (
                <button type="button" className="admin-link-btn admin-share-summary" disabled>
                  Bagikan
                </button>
              )}
            </div>
          </div>
        </section>

        <section className="admin-builder-panel">
          <h2>Field Form</h2>
          <div className="admin-builder-pages-panel">
            <div className="admin-builder-pages-head">
              <div>
                <h3>Halaman Form</h3>
                <p>Atur section, beberapa pertanyaan per halaman, dan branching antar halaman seperti Google Forms.</p>
              </div>
              <button
                type="button"
                onClick={addPage}
                className="admin-secondary-btn admin-builder-add-btn"
              >
                + Tambah Halaman
              </button>
            </div>
            <div className="admin-builder-page-list">
              {form.pages.map((page, index) => (
                <div key={page.id} className="admin-builder-page-card">
                  <div className="admin-builder-page-card-head">
                    <strong>{page.title || `Halaman ${index + 1}`}</strong>
                    <button
                      type="button"
                      onClick={() => removePage(page.id)}
                      className="admin-builder-icon-btn danger"
                      disabled={form.pages.length <= 1}
                      aria-label={`Hapus ${page.title || `Halaman ${index + 1}`}`}
                    >
                      ✕
                    </button>
                  </div>
                  <label className="admin-builder-field">
                    <span>Judul Halaman</span>
                    <input
                      value={page.title}
                      onChange={(e) => updatePage(page.id, { title: e.target.value })}
                      className="admin-builder-input"
                    />
                  </label>
                  <label className="admin-builder-field">
                    <span>Deskripsi Halaman</span>
                    <textarea
                      value={page.description}
                      onChange={(e) => updatePage(page.id, { description: e.target.value })}
                      className="admin-builder-textarea"
                      rows={2}
                    />
                  </label>
                  <small>
                    {form.fields.filter((field) => field.pageId === page.id).length} field pada halaman ini.
                  </small>
                </div>
              ))}
            </div>
          </div>
          <div className="admin-builder-toolbar">
            {fieldTypeOptions.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addField(type)}
                className="admin-secondary-btn admin-builder-add-btn"
              >
                + {fieldTypeLabels[type]}
              </button>
            ))}
          </div>
          <div className="admin-builder-fields">
            {form.fields.map((field, index) => (
              <div key={field.id} className="admin-builder-card">
                <div className="admin-builder-card-head">
                  <strong>{field.name}</strong>
                  <div className="admin-builder-card-actions">
                    <span>{fieldTypeLabels[field.type]}</span>
                    <button
                      type="button"
                      onClick={() => moveField(field.id, 'up')}
                      className="admin-builder-icon-btn"
                      disabled={index === 0}
                      aria-label={`Pindahkan ${field.label || field.name} ke atas`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveField(field.id, 'down')}
                      className="admin-builder-icon-btn"
                      disabled={index === form.fields.length - 1}
                      aria-label={`Pindahkan ${field.label || field.name} ke bawah`}
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => removeField(field.id)}
                      className="admin-builder-icon-btn danger"
                      disabled={form.fields.length === 1}
                      aria-label={`Hapus field ${field.label || field.name}`}
                    >
                      ✕
                    </button>
                  </div>
                </div>

                <label className="admin-builder-field">
                  <span>Tipe</span>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, {
                      type: e.target.value as EditableField['type'],
                      options: createOptionsForType(
                        e.target.value as EditableField['type'],
                        field.options
                      ),
                      placeholder: e.target.value === 'signature'
                        || e.target.value === 'radio'
                        || e.target.value === 'likert'
                        ? ''
                        : field.placeholder,
                    })}
                    className="admin-builder-select"
                  >
                    {fieldTypeOptions.map((type) => (
                      <option key={type} value={type}>{fieldTypeLabels[type]}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-builder-field">
                  <span>Label</span>
                  <input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    className="admin-builder-input"
                  />
                </label>

                <label className="admin-builder-field">
                  <span>Halaman</span>
                  <select
                    value={field.pageId}
                    onChange={(e) => updateField(field.id, { pageId: e.target.value })}
                    className="admin-builder-select"
                  >
                    {form.pages.map((page) => (
                      <option key={page.id} value={page.id}>{page.title || 'Tanpa Judul'}</option>
                    ))}
                  </select>
                </label>

                {(field.type === 'text' || field.type === 'textarea') && (
                  <label className="admin-builder-field">
                    <span>Placeholder</span>
                    <input
                      value={field.placeholder}
                      onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      className="admin-builder-input"
                    />
                  </label>
                )}

                {(field.type === 'radio' || field.type === 'likert') && (
                  <div className="admin-builder-field">
                    <span>Opsi</span>
                    {field.type === 'radio' && form.pages.length > 1 && (
                      <p className="admin-builder-option-helper">
                        Branching hanya bisa diarahkan maju. Jika tidak diatur, opsi akan lanjut ke halaman berikutnya secara otomatis.
                      </p>
                    )}
                    <div className="admin-builder-option-list">
                      {field.options.map((option, optionIndex) => {
                        const branchTargetPages = field.type === 'radio'
                          ? getBranchTargetPages(field.pageId)
                          : []
                        const nextPageId = branchTargetPages.some((page) => page.id === option.nextPageId)
                          ? option.nextPageId ?? ''
                          : ''
                        const routeSummary = nextPageId
                          ? `Setelah dipilih, langsung lompat ke ${getPageLabel(nextPageId)}.`
                          : branchTargetPages.length > 0
                            ? `Setelah dipilih, lanjut otomatis ke ${getPageLabel(branchTargetPages[0].id)}.`
                            : 'Opsi ini berada di halaman terakhir, jadi tidak punya perpindahan lanjutan.'

                        return (
                          <div key={`${field.id}-option-${optionIndex}`} className="admin-builder-option-card">
                            <div className="admin-builder-option-row">
                              <input
                                value={option.label}
                                onChange={(e) => updateOption(field.id, optionIndex, { label: e.target.value })}
                                className="admin-builder-input"
                                placeholder={`Opsi ${optionIndex + 1}`}
                                />
                              {field.type === 'radio' && (
                                <>
                                  <label className="admin-builder-inline-checkbox">
                                    <input
                                      type="checkbox"
                                      checked={option.isCorrect}
                                      onChange={(e) => updateOption(field.id, optionIndex, { isCorrect: e.target.checked })}
                                    />
                                    Benar
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => removeOption(field.id, optionIndex)}
                                    className="admin-builder-icon-btn danger"
                                    disabled={field.options.length <= 1}
                                    aria-label={`Hapus opsi ${option.label || `ke-${optionIndex + 1}`}`}
                                  >
                                    ✕
                                  </button>
                                </>
                              )}
                            </div>
                            {field.type === 'radio' && branchTargetPages.length > 0 && (
                              <div className="admin-builder-option-route">
                                <label className="admin-builder-field">
                                  <span>Arah Setelah Dipilih</span>
                                  <select
                                    value={nextPageId}
                                    onChange={(e) => updateOption(field.id, optionIndex, { nextPageId: e.target.value })}
                                    className="admin-builder-select"
                                  >
                                    <option value="">Lanjut ke halaman berikutnya</option>
                                    {branchTargetPages.map((page) => (
                                      <option key={page.id} value={page.id}>
                                        Lompat ke {page.title || 'Tanpa Judul'}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <p className="admin-builder-option-summary">{routeSummary}</p>
                              </div>
                            )}
                            {field.type === 'radio' && branchTargetPages.length === 0 && (
                              <p className="admin-builder-option-summary">{routeSummary}</p>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {field.type === 'radio' ? (
                      <>
                        <div className="admin-builder-option-actions">
                          <button
                            type="button"
                            onClick={() => addOption(field.id)}
                            className="admin-link-btn"
                          >
                            + Tambah opsi
                          </button>
                        </div>
                        <small>Tandai satu opsi benar untuk soal quiz. Jika tidak ada opsi yang ditandai benar, field radio akan diperlakukan sebagai evaluasi biasa. Untuk form multi-halaman, tiap opsi juga bisa diarahkan ke halaman berikutnya atau ke halaman tertentu.</small>
                      </>
                    ) : (
                      <small>Field Likert selalu memakai 5 tingkat. Anda bisa mengubah label tiap tingkat, tetapi jumlah opsinya tetap lima.</small>
                    )}
                  </div>
                )}

                <label className="admin-builder-checkbox">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  />
                  Wajib diisi
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-builder-panel">
          <h2>Preview Live</h2>
          <AdminFormPreview
            form={{
              title: form.title,
              description: form.description,
              workflow: form.workflow,
              pages: form.pages,
              fields: form.fields,
            }}
          />
        </section>
      </div>
    </div>
  )
}
