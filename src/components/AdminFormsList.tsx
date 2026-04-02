'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'

interface AdminFormListItem {
  id: string
  slug: string
  title: string
  description: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  mode: 'STANDARD' | 'QUIZ' | 'ATTENDANCE'
  submissionCount: number
  quizSummary: {
    totalQuizSubmissions: number
    passedCount: number
    failedCount: number
    passRate: number | null
    averageScorePercentage: number | null
  } | null
  updatedAt: string
}

export default function AdminFormsList() {
  const router = useRouter()
  const [forms, setForms] = useState<AdminFormListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFormTitle, setNewFormTitle] = useState('Form Baru')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/forms')
        if (!res.ok) {
          setFeedback({ type: 'error', message: 'Gagal memuat daftar form' })
          return
        }

        const json = await res.json()
        setForms(json.data ?? [])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const getPublicFormPath = (form: Pick<AdminFormListItem, 'slug' | 'status'>) => {
    if (form.status !== 'PUBLISHED') {
      return null
    }

    return `/f/${form.slug}`
  }

  const getPublicFormUrl = (path: string) => {
    if (typeof window === 'undefined') {
      return path
    }

    return new URL(path, window.location.origin).toString()
  }

  const getShareText = (form: Pick<AdminFormListItem, 'title'>, publicUrl: string) => {
    return `Isi form "${form.title}" di sini: ${publicUrl}`
  }

  const openShareWindow = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleCopyPublicUrl = async (form: Pick<AdminFormListItem, 'slug' | 'status'>) => {
    const path = getPublicFormPath(form)

    if (!path) {
      return
    }

    try {
      await navigator.clipboard.writeText(getPublicFormUrl(path))
      setCopiedSlug(form.slug)
      setFeedback({ type: 'success', message: `Link form ${form.slug} berhasil disalin` })
      window.setTimeout(() => {
        setCopiedSlug((current) => current === form.slug ? null : current)
      }, 1800)
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menyalin link form' })
    }
  }

  const handleShareWhatsApp = (form: Pick<AdminFormListItem, 'slug' | 'status' | 'title'>) => {
    const path = getPublicFormPath(form)
    if (!path) {
      return
    }

    const publicUrl = getPublicFormUrl(path)
    const shareText = getShareText(form, publicUrl)
    openShareWindow(`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`)
  }

  const handleShareX = (form: Pick<AdminFormListItem, 'slug' | 'status' | 'title'>) => {
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

  const handleShareThreads = (form: Pick<AdminFormListItem, 'slug' | 'status' | 'title'>) => {
    const path = getPublicFormPath(form)
    if (!path) {
      return
    }

    const publicUrl = getPublicFormUrl(path)
    const shareText = getShareText(form, publicUrl)
    openShareWindow(`https://www.threads.net/intent/post?text=${encodeURIComponent(shareText)}`)
  }

  const closeShareMenu = (menu: HTMLDetailsElement | null) => {
    if (menu) {
      menu.open = false
    }
  }

  const handleCreateForm = async () => {
    const title = newFormTitle.trim()

    if (!title) {
      setFeedback({ type: 'error', message: 'Judul form baru wajib diisi' })
      return
    }

    setCreating(true)

    try {
      const res = await fetch('/api/admin/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      const json = await res.json()

      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'Gagal membuat form' })
        return
      }

      setFeedback({ type: 'success', message: 'Form baru berhasil dibuat' })
      setShowCreateModal(false)
      router.push(`/admin/forms/${json.data.id}`)
    } catch {
      setFeedback({ type: 'error', message: 'Gagal membuat form' })
    } finally {
      setCreating(false)
    }
  }

  const quizForms = forms.filter(
    (form) => (form.mode === 'QUIZ' || form.mode === 'ATTENDANCE') && form.quizSummary
  )
  const totalSubmissions = forms.reduce((sum, form) => sum + form.submissionCount, 0)
  const totalQuizSubmissions = quizForms.reduce(
    (sum, form) => sum + (form.quizSummary?.totalQuizSubmissions ?? 0),
    0
  )
  const totalPassedQuiz = quizForms.reduce(
    (sum, form) => sum + (form.quizSummary?.passedCount ?? 0),
    0
  )
  const overallQuizPassRate = totalQuizSubmissions > 0
    ? Math.round((totalPassedQuiz / totalQuizSubmissions) * 100)
    : null

  return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>Form Builder</h1>
          <p>Kelola form publik yang dipakai aplikasi</p>
        </div>
        <div className="admin-header-right">
          <button
            onClick={() => {
              setNewFormTitle('Form Baru')
              setShowCreateModal(true)
              setFeedback(null)
            }}
            className="admin-export-btn"
            disabled={creating}
          >
            Buat Form
          </button>
          <Link href="/admin" className="admin-secondary-btn">Lihat Kehadiran</Link>
          <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="admin-logout-btn">
            Logout
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`admin-builder-alert ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      {forms.length > 0 && (
        <section className="admin-submissions-summary">
          <div className="admin-submissions-summary-grid">
            <article className="admin-submissions-summary-card">
              <span>Total Form</span>
              <strong>{forms.length}</strong>
              <small>Semua form yang saat ini tersedia di admin.</small>
            </article>
            <article className="admin-submissions-summary-card">
              <span>Total Submission</span>
              <strong>{totalSubmissions}</strong>
              <small>Akumulasi submission dari seluruh form.</small>
            </article>
            <article className="admin-submissions-summary-card">
              <span>Form Quiz</span>
              <strong>{quizForms.length}</strong>
              <small>Form webinar/quiz yang punya scoring.</small>
            </article>
            <article className="admin-submissions-summary-card">
              <span>Pass Rate Quiz</span>
              <strong>{overallQuizPassRate !== null ? `${overallQuizPassRate}%` : '-'}</strong>
              <small>{totalPassedQuiz} lulus dari {totalQuizSubmissions || 0} attempt quiz.</small>
            </article>
          </div>

          {quizForms.length > 0 && (
            <div className="admin-form-analytics">
              <div className="admin-form-analytics-head">
                <h2>Chart Ringkas Hasil Webinar</h2>
                <p>Ringkasan cepat performa quiz per form webinar yang sudah menerima submission.</p>
              </div>
              <div className="admin-form-analytics-list">
                {quizForms.map((form) => {
                  const summary = form.quizSummary
                  if (!summary) {
                    return null
                  }

                  const total = Math.max(summary.totalQuizSubmissions, 1)
                  const passedWidth = summary.totalQuizSubmissions > 0
                    ? (summary.passedCount / total) * 100
                    : 0
                  const failedWidth = summary.totalQuizSubmissions > 0
                    ? (summary.failedCount / total) * 100
                    : 0

                  return (
                    <article key={form.id} className="admin-form-analytics-card">
                      <div className="admin-form-analytics-card-head">
                        <div>
                          <h3>{form.title}</h3>
                          <p>{form.slug}</p>
                        </div>
                        <strong>{summary.passRate !== null ? `${summary.passRate}%` : '-'}</strong>
                      </div>
                      <div className="admin-form-analytics-bar" aria-hidden="true">
                        <span className="pass" style={{ width: `${passedWidth}%` }} />
                        <span className="fail" style={{ width: `${failedWidth}%` }} />
                      </div>
                      <dl className="admin-form-analytics-meta">
                        <div>
                          <dt>Quiz</dt>
                          <dd>{summary.totalQuizSubmissions}</dd>
                        </div>
                        <div>
                          <dt>Lulus</dt>
                          <dd>{summary.passedCount}</dd>
                        </div>
                        <div>
                          <dt>Belum</dt>
                          <dd>{summary.failedCount}</dd>
                        </div>
                        <div>
                          <dt>Rata-rata</dt>
                          <dd>{summary.averageScorePercentage !== null ? `${summary.averageScorePercentage}%` : '-'}</dd>
                        </div>
                      </dl>
                    </article>
                  )
                })}
              </div>
            </div>
          )}
        </section>
      )}

      <div className="admin-table-container">
        {loading ? (
          <div className="admin-empty"><p>Memuat form...</p></div>
        ) : forms.length === 0 ? (
          <div className="admin-empty">
            <h3>Belum ada form</h3>
            <p>Form yang bisa diedit akan muncul di sini.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Judul</th>
                <th scope="col">Slug</th>
                <th scope="col">Status</th>
                <th scope="col">Mode</th>
                <th scope="col">Submission</th>
                <th scope="col">Diperbarui</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => {
                const publicFormPath = getPublicFormPath(form)

                return (
                <tr key={form.id}>
                  <td data-label="Judul">
                    <div className="admin-form-title">{form.title}</div>
                    {form.description && <div className="admin-form-subtitle">{form.description}</div>}
                  </td>
                  <td data-label="Slug">
                    <code>{form.slug}</code>
                    {publicFormPath && (
                      <div className="admin-form-share-path">{publicFormPath}</div>
                    )}
                  </td>
                  <td data-label="Status"><span className={`admin-form-status ${form.status.toLowerCase()}`}>{form.status}</span></td>
                  <td data-label="Mode">{form.mode}</td>
                  <td data-label="Submission">{form.submissionCount}</td>
                  <td data-label="Diperbarui">{new Date(form.updatedAt).toLocaleString('id-ID')}</td>
                  <td data-label="Aksi">
                    <div className="admin-action-group">
                      <Link href={`/admin/forms/${form.id}`} className="admin-link-btn">
                        Edit Form
                      </Link>
                      <Link href={`/admin/forms/${form.id}/submissions`} className="admin-link-btn">
                        Lihat Data
                      </Link>
                      {publicFormPath && (
                        <>
                          <button
                            type="button"
                            className="admin-link-btn admin-copy-btn"
                            onClick={(event) => {
                              handleCopyPublicUrl(form)
                              closeShareMenu(event.currentTarget.closest('details'))
                            }}
                          >
                            {copiedSlug === form.slug ? 'Tersalin' : 'Copy Link'}
                          </button>
                          <details className="admin-share-menu">
                            <summary className="admin-link-btn admin-share-summary">
                              Bagikan
                            </summary>
                            <div className="admin-share-menu-panel">
                              <button
                                type="button"
                                className="admin-link-btn admin-share-btn whatsapp"
                                onClick={() => handleShareWhatsApp(form)}
                              >
                                WhatsApp
                              </button>
                              <button
                                type="button"
                                className="admin-link-btn admin-share-btn x"
                                onClick={() => handleShareX(form)}
                              >
                                X
                              </button>
                              <button
                                type="button"
                                className="admin-link-btn admin-share-btn threads"
                                onClick={() => handleShareThreads(form)}
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
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              )})}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="create-form-title">
            <div className="admin-modal-head">
              <h3 id="create-form-title">Buat Form Baru</h3>
              <p>Tentukan judul awal. Anda bisa mengubah detail dan field setelah form dibuat.</p>
            </div>

            <label className="admin-builder-field">
              <span>Judul Form</span>
              <input
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                className="admin-builder-input"
                placeholder="Masukkan judul form"
                autoFocus
              />
            </label>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Batal
              </button>
              <button type="button" className="admin-export-btn" onClick={handleCreateForm} disabled={creating}>
                {creating ? 'Membuat...' : 'Buat Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
