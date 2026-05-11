'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { signOut } from 'next-auth/react'
import { getAdminFormModeLabel, getAdminFormStatusLabel } from '@/lib/admin-display'

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

const numberFormatter = new Intl.NumberFormat('id-ID')
const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function AdminFormsList() {
  const router = useRouter()
  const [forms, setForms] = useState<AdminFormListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFormTitle, setNewFormTitle] = useState('Form baru')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | AdminFormListItem['status']>('all')

  const loadForms = useCallback(async () => {
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
  }, [])

  useEffect(() => {
    void loadForms()
  }, [loadForms])

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
    return `Isi formulir "${form.title}" di sini: ${publicUrl}`
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
        setCopiedSlug((current) => (current === form.slug ? null : current))
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

  const closeDetailsMenu = (menu: HTMLDetailsElement | null) => {
    if (menu) {
      menu.open = false
    }
  }

  const handleOpenCreateModal = () => {
    setNewFormTitle('Form baru')
    setShowCreateModal(true)
    setFeedback(null)
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

  const getDeleteDisabledReason = (form: AdminFormListItem) => {
    if (form.slug === 'attendance-template') {
      return 'Form template attendance tidak bisa dihapus'
    }

    if (form.status !== 'ARCHIVED') {
      return 'Arsipkan form terlebih dahulu sebelum menghapus'
    }

    if (form.submissionCount > 0) {
      return 'Form yang sudah punya kiriman tidak bisa dihapus'
    }

    return null
  }

  const handleDeleteForm = async (form: AdminFormListItem) => {
    const reason = getDeleteDisabledReason(form)

    if (reason) {
      setFeedback({ type: 'error', message: reason })
      return
    }

    const confirmed = window.confirm(
      `Hapus form "${form.title}"? Tindakan ini permanen dan tidak bisa dibatalkan.`
    )

    if (!confirmed) {
      return
    }

    setDeletingId(form.id)

    try {
      const res = await fetch(`/api/admin/forms/${form.id}`, {
        method: 'DELETE',
      })
      const json = await res.json()

      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'Gagal menghapus form' })
        return
      }

      setForms((current) => current.filter((item) => item.id !== form.id))
      setFeedback({ type: 'success', message: `Form ${form.title} berhasil dihapus` })
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menghapus form' })
    } finally {
      setDeletingId(null)
    }
  }

  const normalizedSearch = search.trim().toLowerCase()
  const filteredForms = useMemo(() => {
    return forms.filter((form) => {
      const matchesSearch = !normalizedSearch
        || [form.title, form.slug, form.description ?? '']
          .some((value) => value.toLowerCase().includes(normalizedSearch))

      const matchesStatus = statusFilter === 'all' || form.status === statusFilter

      return matchesSearch && matchesStatus
    })
  }, [forms, normalizedSearch, statusFilter])

  const filteredQuizForms = filteredForms.filter(
    (form) => (form.mode === 'QUIZ' || form.mode === 'ATTENDANCE') && form.quizSummary
  )
  const filteredSubmissions = filteredForms.reduce((sum, form) => sum + form.submissionCount, 0)
  const filteredQuizSubmissions = filteredQuizForms.reduce(
    (sum, form) => sum + (form.quizSummary?.totalQuizSubmissions ?? 0),
    0
  )
  const filteredPassedQuiz = filteredQuizForms.reduce(
    (sum, form) => sum + (form.quizSummary?.passedCount ?? 0),
    0
  )
  const filteredQuizPassRate = filteredQuizSubmissions > 0
    ? Math.round((filteredPassedQuiz / filteredQuizSubmissions) * 100)
    : null
  const publishedCount = filteredForms.filter((form) => form.status === 'PUBLISHED').length
  const draftCount = filteredForms.filter((form) => form.status === 'DRAFT').length
  const archivedCount = filteredForms.filter((form) => form.status === 'ARCHIVED').length
  const topSubmissionForms = useMemo(
    () => [...filteredForms].sort((left, right) => right.submissionCount - left.submissionCount).slice(0, 12),
    [filteredForms]
  )
  const leadingForm = topSubmissionForms[0] ?? null
  const leadingFormShare = leadingForm && filteredSubmissions > 0
    ? Math.round((leadingForm.submissionCount / filteredSubmissions) * 100)
    : 0
  const highestSubmissionCount = topSubmissionForms[0]?.submissionCount ?? 0
  const activityBars = topSubmissionForms.map((form, index) => ({
    id: form.id,
    title: form.title,
    submissionCount: form.submissionCount,
    barHeight: highestSubmissionCount > 0
      ? Math.max(14, Math.round((form.submissionCount / highestSubmissionCount) * 100))
      : 14,
    isAccent: index % 3 === 1 || index === topSubmissionForms.length - 1,
  }))
  const latestUpdatedForm = filteredForms[0] ?? null
  const tableSummary = filteredForms.length === forms.length
    ? `Menampilkan semua ${numberFormatter.format(forms.length)} form yang tersedia.`
    : `Menampilkan ${numberFormatter.format(filteredForms.length)} dari ${numberFormatter.format(forms.length)} form.`

  return (
    <div className="forms-dashboard-shell">
      <header className="forms-dashboard-topbar">
        <div className="forms-dashboard-brand">
          <div className="forms-dashboard-brand-mark" aria-hidden="true" />
          <div>
            <strong>isian</strong>
            <span>Dashboard admin formulir</span>
          </div>
        </div>

        <nav className="forms-dashboard-topnav" aria-label="Navigasi admin">
          <Link href="/admin/forms" className="active">Formulir</Link>
          <Link href="/admin">Kehadiran</Link>
        </nav>

        <div className="forms-dashboard-topbar-actions">
          <button
            type="button"
            className="forms-dashboard-topbar-icon"
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            aria-label="Logout"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </div>
      </header>

      <div className="forms-dashboard-layout">
        <aside className="forms-dashboard-sidebar" aria-label="Sidebar dashboard">
          <div className="forms-dashboard-sidebar-head">
            <h2>Formulir</h2>
            <p>Navigasi halaman</p>
          </div>

          <nav className="forms-dashboard-sidebar-nav">
            <Link href="/admin/forms" className="active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>Formulir</span>
            </Link>
            <a href="#forms-dashboard-table">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                <path d="M14 3v6h6" />
                <path d="M9 13h6" />
                <path d="M9 17h6" />
              </svg>
              <span>Daftar Form</span>
            </a>
            <a href="#forms-dashboard-insights">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 19V5" />
                <path d="M10 19v-8" />
                <path d="M16 19v-4" />
                <path d="M22 19V9" />
              </svg>
              <span>Insight</span>
            </a>
            <Link href="/admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16" />
                <path d="M4 12h16" />
                <path d="M4 19h16" />
              </svg>
              <span>Kehadiran</span>
            </Link>
          </nav>


          <div className="forms-dashboard-sidebar-foot">
            <Link href="/admin/login">Kembali ke akses admin</Link>
          </div>
        </aside>

        <main className="forms-dashboard-main">
          <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/admin" className="admin-breadcrumb-link">Admin</Link>
            <span className="admin-breadcrumb-separator">/</span>
            <span className="admin-breadcrumb-current">Formulir</span>
            <span className="admin-breadcrumb-separator">/</span>
            <span className="admin-breadcrumb-current muted">Ringkasan</span>
          </nav>

          <section className="forms-dashboard-hero">
            <div className="forms-dashboard-hero-copy">
              <p className="forms-dashboard-overline">Dashboard Admin</p>
              <h1>Formulir</h1>
              <p>
                Kelola form publik, lihat kiriman, dan pantau hasil tanpa menu yang berulang.
              </p>
              <div className="forms-dashboard-hero-pills" aria-label="Ringkasan status form">
                <span>{numberFormatter.format(publishedCount)} publik</span>
                <span>{numberFormatter.format(draftCount)} draft</span>
                <span>{numberFormatter.format(archivedCount)} arsip</span>
              </div>
            </div>

            <div className="forms-dashboard-hero-actions">
              <button
                type="button"
                className="forms-dashboard-secondary-button"
                onClick={() => {
                  setFeedback(null)
                  void loadForms()
                }}
                disabled={loading}
              >
                {loading ? 'Memuat...' : 'Muat Ulang Data'}
              </button>
              <button
                type="button"
                className="forms-dashboard-primary-button"
                onClick={handleOpenCreateModal}
                disabled={creating}
              >
                <span>+</span>
                <span>Buat Form</span>
              </button>
            </div>
          </section>

          {feedback && (
            <div className={`admin-builder-alert ${feedback.type}`}>
              {feedback.message}
            </div>
          )}

          <section className="forms-dashboard-stats" aria-label="Ringkasan dashboard">
            <article className="forms-dashboard-stat-card">
              <div className="forms-dashboard-stat-head">
                <span>Total Form</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                  <path d="M14 3v6h6" />
                </svg>
              </div>
              <strong>{numberFormatter.format(filteredForms.length)}</strong>
              <small>{tableSummary}</small>
            </article>

            <article className="forms-dashboard-stat-card">
              <div className="forms-dashboard-stat-head">
                <span>Total Kiriman</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 2 11 13" />
                  <path d="M22 2 15 22 11 13 2 9 22 2Z" />
                </svg>
              </div>
              <strong>{numberFormatter.format(filteredSubmissions)}</strong>
              <small>Berdasarkan filter saat ini.</small>
            </article>

            <article className="forms-dashboard-stat-card">
              <div className="forms-dashboard-stat-head">
                <span>Form Quiz</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M9.09 9a3 3 0 1 1 5.82 1c0 2-3 3-3 3" />
                  <path d="M12 17h.01" />
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                </svg>
              </div>
              <strong>{numberFormatter.format(filteredQuizForms.length)}</strong>
              <small>Berdasarkan filter saat ini.</small>
            </article>

            <article className="forms-dashboard-stat-card">
              <div className="forms-dashboard-stat-head">
                <span>Pass Rate Quiz</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 17 6-6 4 4 8-8" />
                  <path d="M14 7h7v7" />
                </svg>
              </div>
              <strong>{filteredQuizPassRate !== null ? `${filteredQuizPassRate}%` : '-'}</strong>
              <small>
                Berdasarkan filter saat ini: {numberFormatter.format(filteredPassedQuiz)} lulus dari{' '}
                {numberFormatter.format(filteredQuizSubmissions)} percobaan quiz.
              </small>
            </article>
          </section>

          <section className="forms-dashboard-panel forms-dashboard-table-panel" id="forms-dashboard-table">
            <div className="forms-dashboard-panel-header">
              <div>
                <p className="forms-dashboard-overline">Daftar Form</p>
                <h2>Daftar Form</h2>
                <p>{tableSummary}</p>
              </div>

              <div className="forms-dashboard-panel-controls">
                <label className="forms-dashboard-search" aria-label="Cari form">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Cari judul, slug, atau deskripsi..."
                  />
                </label>

                <label className="forms-dashboard-select-wrap" aria-label="Filter status">
                  <select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
                    className="forms-dashboard-select"
                  >
                    <option value="all">Semua status</option>
                    <option value="DRAFT">Draft</option>
                    <option value="PUBLISHED">Publik</option>
                    <option value="ARCHIVED">Arsip</option>
                  </select>
                </label>
              </div>
            </div>

            {loading ? (
              <div className="forms-dashboard-empty-state">
                <h3>Memuat form</h3>
                <p>Dashboard sedang mengambil daftar form terbaru.</p>
              </div>
            ) : forms.length === 0 ? (
              <div className="forms-dashboard-empty-state">
                <h3>Belum ada form</h3>
                <p>Mulai dengan membuat form pertama dari tombol Buat Form di atas.</p>
              </div>
            ) : filteredForms.length === 0 ? (
              <div className="forms-dashboard-empty-state">
                <h3>Tidak ada form yang cocok</h3>
                <p>Ubah kata kunci pencarian atau filter status untuk melihat form lain.</p>
              </div>
            ) : (
              <div className="forms-dashboard-table-wrap forms-dashboard-table-wrap-compact">
                <table className="forms-dashboard-table forms-dashboard-table-compact">
                  <thead>
                    <tr>
                      <th scope="col">Judul &amp; Deskripsi</th>
                      <th scope="col">Status</th>
                      <th scope="col">Mode</th>
                      <th scope="col">Kiriman</th>
                      <th scope="col">Diperbarui</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredForms.map((form) => {
                      const publicFormPath = getPublicFormPath(form)
                      const deleteDisabledReason = getDeleteDisabledReason(form)
                      const isDeleting = deletingId === form.id
                      const updatedAtLabel = dateTimeFormatter.format(new Date(form.updatedAt))

                      return (
                        <tr key={form.id}>
                          <td data-label="Judul & Deskripsi">
                            <div className="forms-dashboard-table-title">{form.title}</div>
                            <div className="forms-dashboard-table-subtitle">
                              {form.description || 'Belum ada deskripsi untuk form ini.'}
                            </div>
                            <div className="forms-dashboard-table-meta">
                              <code>{form.slug}</code>
                              {publicFormPath && <span>{publicFormPath}</span>}
                            </div>
                            <dl className="forms-dashboard-table-overview">
                              <div>
                                <dt>Status</dt>
                                <dd>
                                  <span className={`forms-dashboard-status-chip ${form.status.toLowerCase()}`}>
                                    {getAdminFormStatusLabel(form.status)}
                                  </span>
                                </dd>
                              </div>
                              <div>
                                <dt>Mode</dt>
                                <dd>
                                  <span className="forms-dashboard-mode-chip">{getAdminFormModeLabel(form.mode)}</span>
                                </dd>
                              </div>
                              <div>
                                <dt>Kiriman</dt>
                                <dd>{numberFormatter.format(form.submissionCount)}</dd>
                              </div>
                              <div>
                                <dt>Diperbarui</dt>
                                <dd>{updatedAtLabel}</dd>
                              </div>
                            </dl>
                          </td>
                          <td data-label="Status">
                            <span className={`forms-dashboard-status-chip ${form.status.toLowerCase()}`}>
                              {getAdminFormStatusLabel(form.status)}
                            </span>
                          </td>
                          <td data-label="Mode">
                            <span className="forms-dashboard-mode-chip">{getAdminFormModeLabel(form.mode)}</span>
                          </td>
                          <td data-label="Kiriman" className="forms-dashboard-table-number">
                            {numberFormatter.format(form.submissionCount)}
                          </td>
                          <td data-label="Diperbarui">
                            {updatedAtLabel}
                          </td>
                          <td data-label="Aksi">
                            <div className="forms-dashboard-row-actions forms-dashboard-row-actions-primary">
                              <Link href={`/admin/forms/${form.id}`} className="forms-dashboard-action-link">
                                Edit
                              </Link>
                              <Link href={`/admin/forms/${form.id}/submissions`} className="forms-dashboard-action-link">
                                Lihat Kiriman
                              </Link>
                              {publicFormPath && (
                                <details className="forms-dashboard-share-menu">
                                  <summary className="forms-dashboard-action-link">Bagikan</summary>
                                  <div className="forms-dashboard-share-panel">
                                    <button
                                      type="button"
                                      className="forms-dashboard-share-link"
                                      onClick={() => handleShareWhatsApp(form)}
                                    >
                                      WhatsApp
                                    </button>
                                    <button
                                      type="button"
                                      className="forms-dashboard-share-link"
                                      onClick={() => handleShareX(form)}
                                    >
                                      X
                                    </button>
                                    <button
                                      type="button"
                                      className="forms-dashboard-share-link"
                                      onClick={() => handleShareThreads(form)}
                                    >
                                      Threads
                                    </button>
                                    <Link
                                      href={publicFormPath}
                                      className="forms-dashboard-share-link"
                                      target="_blank"
                                      rel="noreferrer"
                                      onClick={(event) => closeDetailsMenu(event.currentTarget.closest('details'))}
                                    >
                                      Buka form publik
                                    </Link>
                                  </div>
                                </details>
                              )}
                            </div>
                            <div className="forms-dashboard-row-actions forms-dashboard-row-actions-secondary">
                              <details className="forms-dashboard-share-menu forms-dashboard-more-menu">
                                <summary className="forms-dashboard-action-link forms-dashboard-action-link-subtle">
                                  Lainnya
                                </summary>
                                <div className="forms-dashboard-share-panel forms-dashboard-more-panel">
                                  <Link
                                    href={`/admin/forms/${form.id}/preview`}
                                    className="forms-dashboard-share-link"
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(event) => closeDetailsMenu(event.currentTarget.closest('details'))}
                                  >
                                    Preview desktop
                                  </Link>
                                  <Link
                                    href={`/admin/forms/${form.id}/preview?device=mobile`}
                                    className="forms-dashboard-share-link"
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={(event) => closeDetailsMenu(event.currentTarget.closest('details'))}
                                  >
                                    Preview mobile
                                  </Link>
                                  {publicFormPath && (
                                    <button
                                      type="button"
                                      className="forms-dashboard-share-link"
                                      onClick={() => handleCopyPublicUrl(form)}
                                    >
                                      {copiedSlug === form.slug ? 'Tersalin' : 'Salin link'}
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    className="forms-dashboard-share-link danger"
                                    onClick={() => handleDeleteForm(form)}
                                    disabled={Boolean(deleteDisabledReason) || isDeleting}
                                    title={deleteDisabledReason ?? 'Hapus form ini secara permanen'}
                                  >
                                    {isDeleting ? 'Menghapus...' : 'Hapus'}
                                  </button>
                                </div>
                              </details>
                            </div>
                            {deleteDisabledReason && (
                              <p className="forms-dashboard-row-note">{deleteDisabledReason}</p>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="forms-dashboard-insights" id="forms-dashboard-insights">
            <article className="forms-dashboard-panel forms-dashboard-activity-panel">
              <div className="forms-dashboard-panel-header compact">
                <div>
                  <p className="forms-dashboard-overline">Aktivitas Kiriman</p>
                  <h2>Distribusi Kiriman per Form</h2>
                  <p>Berdasarkan filter saat ini.</p>
                </div>
                <span className="forms-dashboard-panel-tag">Filter aktif</span>
              </div>

              {activityBars.length === 0 ? (
                <div className="forms-dashboard-empty-inline">
                  Belum ada data kiriman yang bisa divisualisasikan.
                </div>
              ) : (
                <div className="forms-dashboard-activity-chart">
                  {activityBars.map((item) => (
                    <div key={item.id} className="forms-dashboard-activity-column">
                      <div className="forms-dashboard-activity-track" aria-hidden="true">
                        <span
                          className={`forms-dashboard-activity-bar ${item.isAccent ? 'accent' : ''}`}
                          style={{ height: `${item.barHeight}%` }}
                        />
                      </div>
                      <span className="forms-dashboard-activity-value">
                        {numberFormatter.format(item.submissionCount)}
                      </span>
                      <span className="forms-dashboard-activity-label" title={item.title}>
                        {item.title}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="forms-dashboard-highlight-card">
              <div className="forms-dashboard-highlight-copy">
                <p className="forms-dashboard-overline dark">Form Teraktif</p>
                <strong>
                  {leadingForm ? numberFormatter.format(leadingForm.submissionCount) : '0'}
                </strong>
                <h3>{leadingForm?.title ?? 'Belum ada form aktif'}</h3>
                <p>
                  {leadingForm
                    ? `Menyumbang ${leadingFormShare}% dari total kiriman pada filter saat ini.`
                    : 'Buat atau publikasikan form terlebih dahulu untuk melihat ringkasan aktivitas.'}
                </p>
              </div>

              <div className="forms-dashboard-highlight-meter" aria-hidden="true">
                <span style={{ width: `${Math.max(leadingFormShare, leadingForm ? 12 : 0)}%` }} />
              </div>

              <dl className="forms-dashboard-highlight-list">
                <div>
                  <dt>Publik</dt>
                  <dd>{numberFormatter.format(publishedCount)}</dd>
                </div>
                <div>
                  <dt>Draft</dt>
                  <dd>{numberFormatter.format(draftCount)}</dd>
                </div>
                <div>
                  <dt>Arsip</dt>
                  <dd>{numberFormatter.format(archivedCount)}</dd>
                </div>
                <div>
                  <dt>Terbaru</dt>
                  <dd>{latestUpdatedForm?.title ?? '-'}</dd>
                </div>
              </dl>
            </article>
          </section>
        </main>
      </div>

      {showCreateModal && (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="create-form-title">
            <div className="admin-modal-head">
              <h3 id="create-form-title">Buat form baru</h3>
              <p>Tentukan judul awal. Anda bisa mengubah detail dan pertanyaan setelah form dibuat.</p>
            </div>

            <label className="admin-builder-field">
                <span>Judul form</span>
              <input
                value={newFormTitle}
                onChange={(event) => setNewFormTitle(event.target.value)}
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
