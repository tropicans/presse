'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import AdminFormPreview from './AdminFormPreview'
import { getAdminFormStatusLabel } from '@/lib/admin-display'
import { getAdminPreviewStorageKey, type AdminPreviewField, type AdminPreviewForm, type AdminPreviewPage } from '@/lib/admin-form-preview'

type EditableField = AdminPreviewField
type EditablePage = AdminPreviewPage

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

const CONDITIONAL_ROUTE_SUBMIT = '__SUBMIT__'

const fieldTypeOptions: Array<EditableField['type']> = ['text', 'textarea', 'radio', 'select', 'likert', 'signature']
const fieldTypeLabels: Record<EditableField['type'], string> = {
  text: 'Teks Singkat',
  textarea: 'Teks Panjang',
  radio: 'Pilihan',
  select: 'Dropdown',
  likert: 'Likert',
  signature: 'Tanda Tangan',
}
function createOptionsForType(type: EditableField['type'], currentOptions: EditableField['options'] = []) {
  if (type === 'radio' || type === 'select') {
    return currentOptions.length
      ? currentOptions.map((option) => ({ ...option }))
      : defaultRadioOptions.map((option) => ({ ...option }))
  }

  if (type === 'likert') {
    return currentOptions.length
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

function createPage(): EditablePage {
  return {
    id: `page-${crypto.randomUUID()}`,
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

function createFormSnapshot(form: AdminFormDetail) {
  return JSON.stringify({
    title: form.title,
    description: form.description ?? '',
    successMessage: form.successMessage ?? '',
    status: form.status,
    mode: form.mode,
    workflow: form.workflow,
    quizSettings: form.quizSettings,
    pages: form.pages,
    fields: form.fields,
  })
}

function createPreviewForm(form: Pick<AdminFormDetail, 'title' | 'description' | 'workflow' | 'pages' | 'fields'>): AdminPreviewForm {
  return {
    title: form.title,
    description: form.description,
    workflow: form.workflow,
    pages: form.pages,
    fields: form.fields,
  }
}

function persistPreviewSnapshot(form: Pick<AdminFormDetail, 'id' | 'title' | 'description' | 'workflow' | 'pages' | 'fields'>) {
  window.localStorage.setItem(getAdminPreviewStorageKey(form.id), JSON.stringify({
    formId: form.id,
    updatedAt: new Date().toISOString(),
    form: createPreviewForm(form),
  }))
}

function clearPreviewSnapshot(formId: string) {
  window.localStorage.removeItem(getAdminPreviewStorageKey(formId))
}

export default function AdminFormEditor({ formId }: Props) {
  const [form, setForm] = useState<AdminFormDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [lastSavedSnapshot, setLastSavedSnapshot] = useState<string | null>(null)

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
        setLastSavedSnapshot(createFormSnapshot(json.data))
      } catch {
        setError('Gagal memuat form')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [formId])

  useEffect(() => {
    if (!form) {
      return
    }

    try {
      persistPreviewSnapshot(form)
    } catch {}
  }, [form])

  useEffect(() => {
    const clearCurrentPreviewSnapshot = () => {
      try {
        clearPreviewSnapshot(formId)
      } catch {}
    }

    window.addEventListener('pagehide', clearCurrentPreviewSnapshot)

    return () => {
      window.removeEventListener('pagehide', clearCurrentPreviewSnapshot)
      clearCurrentPreviewSnapshot()
    }
  }, [formId])

  const isDirty = useMemo(() => {
    if (!form || !lastSavedSnapshot) {
      return false
    }

    return createFormSnapshot(form) !== lastSavedSnapshot
  }, [form, lastSavedSnapshot])

  const getPublicFormPath = (currentForm: Pick<AdminFormDetail, 'slug' | 'status'>, hasUnsavedChanges = false) => {
    if (currentForm.status !== 'PUBLISHED' || hasUnsavedChanges) {
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
    return `Isi formulir "${currentForm.title}" di sini: ${publicUrl}`
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

  const getStepLabel = (pageId: string) => {
    if (pageId === CONDITIONAL_ROUTE_SUBMIT) {
      return 'pengiriman form'
    }

    if (!form) {
      return 'langkah berikutnya'
    }

    const pageIndex = form.pages.findIndex((item) => item.id === pageId)
    return pageIndex >= 0 ? `Langkah ${pageIndex + 1}` : 'langkah berikutnya'
  }

  const getStepFieldCount = (pageId: string) => {
    return form?.fields.filter((field) => field.pageId === pageId).length ?? 0
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
        pages: [...current.pages, createPage()],
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

  const handleOpenPreviewTab = (device: 'desktop' | 'mobile' = 'desktop') => {
    if (!form) {
      return
    }

    try {
      persistPreviewSnapshot(form)
    } catch {
      setError('Gagal menyiapkan pratinjau tab baru')
      setMessage(null)
      return
    }

    window.open(`/admin/forms/${form.id}/preview?device=${device}`, '_blank', 'noopener,noreferrer')
  }

  const closeShareMenu = (menu: HTMLDetailsElement | null) => {
    if (menu) {
      menu.open = false
    }
  }

  const handleSave = async () => {
    if (!form) return

    const hasEmptyStep = form.pages.some((page) => getStepFieldCount(page.id) === 0)
    if (hasEmptyStep) {
      setMessage(null)
      setError('Setiap langkah harus memiliki minimal satu field sebelum disimpan')
      return
    }

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
      setLastSavedSnapshot(createFormSnapshot(json.data))
      setMessage('Form berhasil diperbarui')
    } catch {
      setError('Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
  }

  const handleDiscardChanges = () => {
    if (!form || !lastSavedSnapshot) {
      return
    }

    const snapshot = JSON.parse(lastSavedSnapshot) as Omit<AdminFormDetail, 'id' | 'slug'>
    setForm({
      ...form,
      ...snapshot,
    })
    setMessage(null)
    setError(null)
  }

  if (loading) {
    return <div className="admin-wrapper"><div className="admin-empty"><p>Memuat editor...</p></div></div>
  }

  if (!form) {
    return <div className="admin-wrapper"><div className="admin-empty"><p>{error || 'Form tidak ditemukan'}</p></div></div>
  }

  const publicFormPath = getPublicFormPath(form, isDirty)
  const usesAttendanceMode = form.mode === 'ATTENDANCE'
  const usesQuizScoring = form.mode === 'QUIZ' || form.mode === 'ATTENDANCE'

  return (
    <div className="editorial-form-editor-shell">
      <header className="editorial-form-editor-topbar">
        <div className="editorial-form-editor-topbar-left">
          <div className="forms-dashboard-brand">
            <div className="forms-dashboard-brand-mark" aria-hidden="true" />
            <div>
              <strong>isian</strong>
              <span>Ruang kerja penyusunan formulir</span>
            </div>
          </div>

          <div className="editorial-form-editor-divider" aria-hidden="true" />

          <Link href="/admin/forms" className="editorial-form-editor-backlink">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Kembali ke daftar</span>
          </Link>
        </div>

        <div className="editorial-form-editor-topbar-actions">
          <Link href={`/admin/forms/${form.id}/submissions`} className="editorial-form-editor-ghost-btn">
            Lihat Kiriman
          </Link>
          <button
            type="button"
            className="editorial-form-editor-ghost-btn"
            onClick={handleDiscardChanges}
            disabled={!isDirty || saving}
          >
            Batalkan Perubahan
          </button>
          <button
            type="button"
            className="editorial-form-editor-primary-btn"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? 'Menyimpan...' : 'Simpan'}
          </button>
        </div>
      </header>

      <div className="editorial-form-editor-content">
        {(message || error) && (
          <div className={`admin-builder-alert ${error ? 'error' : 'success'}`}>
            {error || message}
          </div>
        )}

        <div className="editorial-form-editor-statusbar" aria-live="polite">
          <div>
            <p className="forms-dashboard-overline">Status penyuntingan</p>
            <strong>{saving ? 'Menyimpan perubahan...' : isDirty ? 'Perubahan belum disimpan' : 'Semua perubahan tersimpan'}</strong>
            <span>
              {isDirty
                ? 'Simpan setelah selesai mengubah form agar versi publik ikut terbarui.'
                : 'Versi penyuntingan dan data tersimpan sudah sinkron.'}
            </span>
          </div>
          <div className="editorial-form-editor-status-meta">
            <span className={`forms-dashboard-status-chip ${form.status.toLowerCase()}`}>{getAdminFormStatusLabel(form.status)}</span>
            <code>{form.slug}</code>
          </div>
        </div>

        <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/admin" className="admin-breadcrumb-link">Admin</Link>
          <span className="admin-breadcrumb-separator">/</span>
          <Link href="/admin/forms" className="admin-breadcrumb-link">Formulir</Link>
          <span className="admin-breadcrumb-separator">/</span>
          <span className="admin-breadcrumb-current">{form.title || 'Form tanpa judul'}</span>
          <span className="admin-breadcrumb-separator">/</span>
          <span className="admin-breadcrumb-current muted">Editor</span>
        </nav>

        <div className="admin-builder-grid editorial-form-editor-grid">
          <section className="admin-builder-panel editorial-form-editor-panel editorial-form-editor-settings-panel">
          <h2>Informasi form</h2>
          <p className="editorial-form-editor-section-note">
            Atur identitas form, status publikasi, dan pesan yang tampil setelah pengisi mengirim data.
          </p>
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
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Publik</option>
              <option value="ARCHIVED">Arsip</option>
            </select>
          </label>
          <label className="admin-builder-field">
            <span>Mode</span>
            <select
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value as AdminFormDetail['mode'] })}
              className="admin-builder-select"
            >
              <option value="STANDARD">Standar</option>
              <option value="QUIZ">QUIZ</option>
              <option value="ATTENDANCE">PRESENSI + QUIZ + EVALUASI</option>
            </select>
          </label>
             <small>
               {usesAttendanceMode
                 ? 'Mode ini ditujukan untuk form gabungan presensi, kuis, dan evaluasi dengan builder multi-langkah.'
                 : 'Mode kuis atau standar tetap bisa memakai langkah dan branching sesuai kebutuhan.'}
            </small>
          {usesQuizScoring && (
            <label className="admin-builder-field">
              <span>Nilai lulus (%)</span>
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
              <small>Peserta dinyatakan lulus jika skornya mencapai persentase ini dari total nilai kuis.</small>
            </label>
          )}
          <div className="admin-builder-share-panel">
            <div className="admin-builder-share-head">
              <h3>Bagikan form</h3>
              <p>
                {publicFormPath
                  ? 'Gunakan link ini untuk membagikan form ke pengisi.'
                  : isDirty
                    ? 'Simpan perubahan terlebih dahulu agar status publikasi aktif.'
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
                {copied ? 'Tersalin' : 'Salin Link'}
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
                      Lihat form publik
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

          <section className="admin-builder-panel editorial-form-editor-panel editorial-form-editor-structure-panel">
          <h2>Struktur form</h2>
          <p className="editorial-form-editor-section-note">
            Susun langkah, pertanyaan, opsi jawaban, dan alur percabangan dari satu tempat.
          </p>
          <div className="admin-builder-pages-panel">
            <div className="admin-builder-pages-head">
              <div>
                <h3>Langkah Form</h3>
                <p>Kelompokkan pertanyaan per langkah. Setiap langkah harus memiliki minimal satu field.</p>
              </div>
              <button
                type="button"
                onClick={addPage}
                className="admin-secondary-btn admin-builder-add-btn"
              >
                + Tambah Langkah
              </button>
            </div>
            <div className="admin-builder-page-list">
              {form.pages.map((page, index) => (
                <div key={page.id} className="admin-builder-page-card">
                  <div className="admin-builder-page-card-head">
                    <strong>Langkah {index + 1}</strong>
                    <button
                      type="button"
                      onClick={() => removePage(page.id)}
                      className="admin-builder-icon-btn danger"
                      disabled={form.pages.length <= 1}
                      aria-label={`Hapus Langkah ${index + 1}`}
                    >
                      ✕
                    </button>
                  </div>
                  <small>
                    {getStepFieldCount(page.id)} field pada langkah ini.
                  </small>
                  {getStepFieldCount(page.id) === 0 && (
                    <small className="admin-builder-warning-text">
                      Langkah kosong tidak bisa disimpan. Tambahkan field atau pindahkan field ke langkah ini.
                    </small>
                  )}
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
                    <strong>{field.label || field.name}</strong>
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
                        || e.target.value === 'select'
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
                  <span>Langkah</span>
                  <select
                    value={field.pageId}
                    onChange={(e) => updateField(field.id, { pageId: e.target.value })}
                    className="admin-builder-select"
                  >
                    {form.pages.map((page, pageIndex) => (
                      <option key={page.id} value={page.id}>{`Langkah ${pageIndex + 1}`}</option>
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

                {(field.type === 'radio' || field.type === 'select' || field.type === 'likert') && (
                  <div className="admin-builder-field">
                    <span>Opsi</span>
                    {(field.type === 'radio' || field.type === 'select') && form.pages.length > 1 && (
                      <p className="admin-builder-option-helper">
                        Menu branching ada di bawah setiap opsi. Arah perpindahan hanya bisa maju ke langkah berikutnya, ke langkah tertentu, atau langsung submit.
                      </p>
                    )}
                    <div className="admin-builder-option-list">
                      {field.options.map((option, optionIndex) => {
                        const branchTargetPages = (field.type === 'radio' || field.type === 'select')
                          ? getBranchTargetPages(field.pageId)
                          : []
                        const nextPageId = option.nextPageId === CONDITIONAL_ROUTE_SUBMIT
                          || branchTargetPages.some((page) => page.id === option.nextPageId)
                          ? option.nextPageId ?? ''
                          : ''
                        const routeSummary = nextPageId === CONDITIONAL_ROUTE_SUBMIT
                          ? 'Setelah dipilih, form langsung dikirim.'
                          : nextPageId
                            ? `Setelah dipilih, langsung lompat ke ${getStepLabel(nextPageId)}.`
                            : branchTargetPages.length > 0
                              ? `Setelah dipilih, lanjut otomatis ke ${getStepLabel(branchTargetPages[0].id)}.`
                            : 'Opsi ini berada di langkah terakhir, jadi alurnya akan lanjut ke submit form.'

                        return (
                          <div key={`${field.id}-option-${optionIndex}`} className="admin-builder-option-card">
                            <div className="admin-builder-option-row">
                              <input
                                value={option.label}
                                onChange={(e) => updateOption(field.id, optionIndex, { label: e.target.value })}
                                className="admin-builder-input"
                                placeholder={`Opsi ${optionIndex + 1}`}
                                />
                              {(field.type === 'radio' || field.type === 'select' || field.type === 'likert') && (
                                <>
                                  {field.type === 'radio' && (
                                    <label className="admin-builder-inline-checkbox">
                                      <input
                                        type="checkbox"
                                        checked={option.isCorrect}
                                        onChange={(e) => updateOption(field.id, optionIndex, { isCorrect: e.target.checked })}
                                      />
                                      Benar
                                    </label>
                                  )}
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
                            {(field.type === 'radio' || field.type === 'select') && (
                              <div className="admin-builder-option-route">
                                <label className="admin-builder-field">
                                  <span>Navigasi Setelah Opsi Ini Dipilih</span>
                                  <select
                                    value={nextPageId}
                                    onChange={(e) => updateOption(field.id, optionIndex, { nextPageId: e.target.value })}
                                  className="admin-builder-select"
                                >
                                    <option value="">{branchTargetPages.length > 0 ? 'Lanjut ke langkah berikutnya' : 'Ikuti alur default'}</option>
                                    <option value={CONDITIONAL_ROUTE_SUBMIT}>Submit form</option>
                                    {branchTargetPages.map((page) => (
                                      <option key={page.id} value={page.id}>
                                        Lompat ke {getStepLabel(page.id)}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                                <p className="admin-builder-option-summary">{routeSummary}</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    {field.type === 'radio' || field.type === 'select' || field.type === 'likert' ? (
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
                        <small>
                          {field.type === 'radio'
                            ? 'Tandai satu opsi benar untuk soal kuis. Jika tidak ada opsi yang ditandai benar, field radio diperlakukan sebagai evaluasi biasa. Untuk form multi-langkah, tiap opsi juga bisa diarahkan ke langkah berikutnya, ke langkah tertentu, atau langsung mengirim form.'
                            : field.type === 'select'
                              ? 'Untuk form multi-langkah, tiap opsi dropdown bisa diarahkan ke langkah berikutnya, ke langkah tertentu, atau langsung mengirim form.'
                              : 'Field Likert dapat diatur tingkatnya (misalnya 4 atau 5 pilihan). Anda bisa menambahkan atau menghapus tingkat/opsi, serta mengubah label tiap tingkat.'}
                        </small>
                      </>
                    ) : null}
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

          <section className="admin-builder-panel editorial-form-editor-panel editorial-form-editor-preview-panel">
          <h2>Pratinjau form</h2>
          <p className="editorial-form-editor-section-note">
            Gunakan pratinjau ini untuk mengecek urutan langkah dan pengalaman pengisi sebelum form dipublikasikan.
          </p>
          <div className="editorial-form-editor-preview-actions">
            <button
              type="button"
              className="admin-link-btn"
              onClick={() => handleOpenPreviewTab('desktop')}
            >
              Buka di tab baru
            </button>
            <button
              type="button"
              className="admin-link-btn"
              onClick={() => handleOpenPreviewTab('mobile')}
            >
              Buka mode mobile
            </button>
          </div>
          <AdminFormPreview
            form={createPreviewForm(form)}
          />
          </section>
        </div>
      </div>
    </div>
  )
}
