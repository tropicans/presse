'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { getAdminFormStatusLabel } from '@/lib/admin-display'

interface SubmissionColumn {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'radio' | 'likert' | 'signature'
}

interface SubmissionItem {
  id: string
  createdAt: string
  answers: Record<string, string>
  meta: {
    participantType: 'internal' | 'external' | null
    quiz: {
      score: number
      maxScore: number
      correctAnswers: number
      totalQuestions: number
      passingScore: number
      passed: boolean
    } | null
  }
}

interface SubmissionData {
  form: {
    id: string
    slug: string
    title: string
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  }
  totalItems: number
  hasParticipantType: boolean
  hasQuiz: boolean
  columns: SubmissionColumn[]
  items: SubmissionItem[]
}

interface Props {
  formId: string
}

const numberFormatter = new Intl.NumberFormat('id-ID')

function getParticipantLabel(participantType: SubmissionItem['meta']['participantType']) {
  if (participantType === 'internal') {
    return 'Internal'
  }

  if (participantType === 'external') {
    return 'Eksternal'
  }

  return '-'
}

function getParticipantClass(participantType: SubmissionItem['meta']['participantType']) {
  if (participantType === 'internal') {
    return 'internal'
  }

  if (participantType === 'external') {
    return 'external'
  }

  return 'neutral'
}

function formatAnswer(value: string | undefined) {
  const normalized = value?.trim() ?? ''
  return normalized.length > 0 ? normalized : '-'
}

function getQuizPercentage(item: SubmissionItem) {
  if (!item.meta.quiz) {
    return null
  }

  return Math.round((item.meta.quiz.score / Math.max(item.meta.quiz.maxScore, 1)) * 100)
}

export default function AdminFormSubmissions({ formId }: Props) {
  const [data, setData] = useState<SubmissionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [participantFilter, setParticipantFilter] = useState<'all' | 'internal' | 'external'>('all')
  const [quizFilter, setQuizFilter] = useState<'all' | 'passed' | 'failed' | 'ungraded'>('all')
  const [sortBy, setSortBy] = useState<'newest' | 'oldest' | 'score-desc' | 'score-asc'>('newest')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        participantType: participantFilter,
        quizStatus: quizFilter,
        sortBy,
      })
      const res = await fetch(`/api/admin/forms/${formId}/submissions?${params.toString()}`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Gagal memuat kiriman')
        return
      }

      setData(json.data)
    } catch {
      setError('Gagal memuat kiriman')
    } finally {
      setLoading(false)
    }
  }, [formId, participantFilter, quizFilter, sortBy])

  useEffect(() => {
    void load()
  }, [load])

  const handleDelete = async (submissionId: string) => {
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/admin/forms/${formId}/submissions?submissionId=${encodeURIComponent(submissionId)}`,
        { method: 'DELETE' }
      )
      const json = await res.json()

      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'Gagal menghapus kiriman' })
        return
      }

      setFeedback({ type: 'success', message: 'Kiriman berhasil dihapus' })
      setPendingDeleteId(null)
      await load()
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menghapus kiriman' })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="admin-wrapper"><div className="admin-empty"><p>Memuat kiriman...</p></div></div>
  }

  if (!data) {
    return <div className="admin-wrapper"><div className="admin-empty"><p>{error || 'Data tidak ditemukan'}</p></div></div>
  }

  const exportParams = new URLSearchParams({
    participantType: participantFilter,
    quizStatus: quizFilter,
    sortBy,
  })
  const visibleColumns = data.columns.filter(
    (column) => column.type !== 'signature' && column.name !== 'participantType'
  )
  const hasParticipantType = data.hasParticipantType
  const hasQuiz = data.hasQuiz
  const quizItems = data.items.filter((item) => item.meta.quiz)
  const passedQuizCount = quizItems.filter((item) => item.meta.quiz?.passed).length
  const failedQuizCount = quizItems.filter((item) => item.meta.quiz && !item.meta.quiz.passed).length
  const internalCount = data.items.filter((item) => item.meta.participantType === 'internal').length
  const externalCount = data.items.filter((item) => item.meta.participantType === 'external').length
  const averageQuizPercentage = quizItems.length > 0
    ? Math.round(
        (quizItems.reduce((sum, item) => {
          const quiz = item.meta.quiz
          if (!quiz) {
            return sum
          }

          return sum + ((quiz.score / Math.max(quiz.maxScore, 1)) * 100)
        }, 0) / quizItems.length) * 10
      ) / 10
    : null
  const passRate = quizItems.length > 0
    ? Math.round((passedQuizCount / quizItems.length) * 100)
    : null

  const bestQuizSubmission = data.items.reduce<SubmissionItem | null>((best, item) => {
    const currentPercentage = getQuizPercentage(item)
    const bestPercentage = best ? getQuizPercentage(best) : null

    if (currentPercentage === null) {
      return best
    }

    if (bestPercentage === null || currentPercentage > bestPercentage) {
      return item
    }

    return best
  }, null)

  const bestQuizPercentage = bestQuizSubmission ? getQuizPercentage(bestQuizSubmission) : null
  const signatureColumn = data.columns.find((column) => column.type === 'signature')

  return (
    <div className="editorial-form-editor-shell">
      <header className="editorial-form-editor-topbar">
        <div className="editorial-form-editor-topbar-left">
          <div className="forms-dashboard-brand">
            <div className="forms-dashboard-brand-mark" aria-hidden="true" />
            <div>
              <strong>isian</strong>
              <span>Ruang kerja peninjauan hasil form</span>
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
          <Link href={`/admin/forms/${data.form.id}`} className="editorial-form-editor-ghost-btn">
            Edit Formulir
          </Link>
          <a
            href={`/api/admin/forms/${data.form.id}/export?${exportParams.toString()}`}
            className="editorial-form-editor-primary-btn"
          >
            Unduh CSV
          </a>
        </div>
      </header>

      <div className="editorial-form-editor-content submissions-dashboard-content">
        {feedback && (
          <div className={`admin-builder-alert ${feedback.type}`}>
            {feedback.message}
          </div>
        )}

        <div className="editorial-form-editor-statusbar" aria-live="polite">
          <div>
            <p className="forms-dashboard-overline">Pusat Kiriman</p>
            <strong>{data.form.title}</strong>
            <span>
              Pantau kiriman, evaluasi hasil kuis, dan unduh CSV dari satu tampilan yang lebih fokus.
            </span>
            <p className="editorial-form-editor-section-note submissions-dashboard-note">
              Gunakan filter di bawah untuk mempersempit hasil yang benar-benar ingin Anda tindak lanjuti.
            </p>
          </div>
          <div className="editorial-form-editor-status-meta">
            <span className={`forms-dashboard-status-chip ${data.form.status.toLowerCase()}`}>{getAdminFormStatusLabel(data.form.status)}</span>
            <code>{data.form.slug}</code>
          </div>
        </div>

        <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
          <Link href="/admin" className="admin-breadcrumb-link">Admin</Link>
          <span className="admin-breadcrumb-separator">/</span>
          <Link href="/admin/forms" className="admin-breadcrumb-link">Formulir</Link>
          <span className="admin-breadcrumb-separator">/</span>
          <Link href={`/admin/forms/${data.form.id}`} className="admin-breadcrumb-link">{data.form.title}</Link>
          <span className="admin-breadcrumb-separator">/</span>
          <span className="admin-breadcrumb-current">Kiriman</span>
        </nav>

          <section className="forms-dashboard-hero submissions-dashboard-hero">
            <div className="forms-dashboard-hero-copy">
              <p className="forms-dashboard-overline">Tinjauan Kiriman</p>
              <h1>Kiriman</h1>
              <p>
                Menampilkan {numberFormatter.format(data.items.length)} hasil aktif dari total{' '}
                {numberFormatter.format(data.totalItems)} kiriman untuk form ini.
            </p>
          </div>

          <div className="forms-dashboard-hero-actions">
            <button
              type="button"
              className="forms-dashboard-secondary-button"
              onClick={() => {
                setFeedback(null)
                void load()
              }}
              disabled={loading}
            >
              {loading ? 'Memuat...' : 'Muat Ulang Data'}
            </button>
          </div>
        </section>

            <section className="forms-dashboard-stats" aria-label="Ringkasan kiriman">
          <article className="forms-dashboard-stat-card">
            <div className="forms-dashboard-stat-head">
              <span>Total Tersaring</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3v18" />
                <path d="M3 12h18" />
              </svg>
            </div>
            <strong>{numberFormatter.format(data.items.length)}</strong>
            <small>Menampilkan hasil sesuai filter yang sedang aktif.</small>
          </article>

          <article className="forms-dashboard-stat-card">
            <div className="forms-dashboard-stat-head">
                <span>Total Kiriman</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                <path d="M14 3v6h6" />
              </svg>
            </div>
            <strong>{numberFormatter.format(data.totalItems)}</strong>
              <small>Jumlah semua kiriman yang tersimpan untuk form ini.</small>
          </article>

          {hasParticipantType && (
            <article className="forms-dashboard-stat-card">
              <div className="forms-dashboard-stat-head">
                <span>Peserta Internal</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                  <path d="M6 20a6 6 0 0 1 12 0" />
                </svg>
              </div>
              <strong>{numberFormatter.format(internalCount)}</strong>
              <small>{numberFormatter.format(externalCount)} kiriman lain berasal dari peserta eksternal.</small>
            </article>
          )}

          {hasQuiz && (
            <article className="forms-dashboard-stat-card">
              <div className="forms-dashboard-stat-head">
                <span>Tingkat lulus kuis</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 17 6-6 4 4 8-8" />
                  <path d="M14 7h7v7" />
                </svg>
              </div>
              <strong>{passRate !== null ? `${passRate}%` : '-'}</strong>
              <small>
                {numberFormatter.format(passedQuizCount)} lulus, {numberFormatter.format(failedQuizCount)} belum lulus.
              </small>
            </article>
          )}
        </section>

        <section className="forms-dashboard-panel forms-dashboard-table-panel" id="submissions-dashboard-table">
          <div className="forms-dashboard-panel-header">
              <div>
                <p className="forms-dashboard-overline">Tabel Kiriman</p>
                <h2>Data Masuk</h2>
                <p>Filter, urutkan, lalu hapus kiriman yang tidak valid bila memang diperlukan.</p>
              </div>

            <div className="submissions-dashboard-filterbar">
              {hasParticipantType && (
                <label className="submissions-dashboard-filter">
                  <span>Peserta</span>
                  <select
                    value={participantFilter}
                    onChange={(event) => setParticipantFilter(event.target.value as typeof participantFilter)}
                    className="forms-dashboard-select"
                  >
                    <option value="all">Semua peserta</option>
                    <option value="internal">Internal</option>
                    <option value="external">Eksternal</option>
                  </select>
                </label>
              )}

              {hasQuiz && (
                <label className="submissions-dashboard-filter">
                  <span>Kuis</span>
                  <select
                    value={quizFilter}
                    onChange={(event) => setQuizFilter(event.target.value as typeof quizFilter)}
                    className="forms-dashboard-select"
                  >
                    <option value="all">Semua nilai</option>
                    <option value="passed">Lulus</option>
                    <option value="failed">Belum lulus</option>
                    <option value="ungraded">Tanpa kuis</option>
                  </select>
                </label>
              )}

              <label className="submissions-dashboard-filter">
                <span>Urutan</span>
                <select
                  value={sortBy}
                  onChange={(event) => setSortBy(event.target.value as typeof sortBy)}
                  className="forms-dashboard-select"
                >
                  <option value="newest">Terbaru</option>
                  <option value="oldest">Terlama</option>
                  {hasQuiz && <option value="score-desc">Skor tertinggi</option>}
                  {hasQuiz && <option value="score-asc">Skor terendah</option>}
                </select>
              </label>
            </div>
          </div>

          <div className="forms-dashboard-table-wrap">
            {data.totalItems === 0 ? (
              <div className="forms-dashboard-empty-state">
                  <h3>Belum ada kiriman</h3>
                <p>Form ini belum menerima kiriman data.</p>
              </div>
            ) : data.items.length === 0 ? (
              <div className="forms-dashboard-empty-state">
                <h3>Tidak ada hasil yang cocok</h3>
                  <p>Ubah filter peserta, filter kuis, atau urutan untuk melihat kiriman lain.</p>
              </div>
            ) : (
              <table className="forms-dashboard-table submissions-dashboard-table">
                <thead>
                  <tr>
                    <th scope="col">Waktu & Metadata</th>
                    {hasParticipantType && <th scope="col">Tipe Peserta</th>}
                    {hasQuiz && <th scope="col">Hasil Kuis</th>}
                    {visibleColumns.map((column) => (
                      <th key={column.id} scope="col">{column.label}</th>
                    ))}
                    <th scope="col">Tanda Tangan</th>
                      <th scope="col">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => {
                    const signature = signatureColumn ? item.answers[signatureColumn.name] : ''
                    const quizPercentage = getQuizPercentage(item)
                    const submittedAt = new Date(item.createdAt).toLocaleString('id-ID')

                    return (
                      <tr key={item.id}>
                        <td data-label="Waktu & Metadata">
                          <div className="submissions-dashboard-primary-cell">
                            <strong>{submittedAt}</strong>
                            <span>Kiriman: {item.id}</span>
                          </div>
                        </td>
                        {hasParticipantType && (
                          <td data-label="Tipe Peserta">
                            <span className={`submissions-dashboard-participant-chip ${getParticipantClass(item.meta.participantType)}`}>
                              {getParticipantLabel(item.meta.participantType)}
                            </span>
                          </td>
                        )}
                        {hasQuiz && (
                          <td data-label="Hasil Kuis">
                            {item.meta.quiz ? (
                               <div className="submissions-dashboard-quiz-card">
                                 <strong>{item.meta.quiz.score}/{item.meta.quiz.maxScore}</strong>
                                 <span>
                                   {item.meta.quiz.correctAnswers} benar dari {item.meta.quiz.totalQuestions} soal
                                 </span>
                                <em className={`admin-quiz-status ${item.meta.quiz.passed ? 'pass' : 'fail'}`}>
                                  {quizPercentage}% · {item.meta.quiz.passed ? 'Lulus' : 'Belum lulus'}
                                </em>
                              </div>
                            ) : (
                              '-'
                            )}
                          </td>
                        )}
                        {visibleColumns.map((column) => (
                          <td key={column.id} data-label={column.label}>
                            {formatAnswer(item.answers[column.name])}
                          </td>
                        ))}
                        <td data-label="Tanda Tangan">
                          {signature ? (
                            <Image
                              src={signature}
                               alt="Tanda tangan pengirim"
                              width={80}
                              height={40}
                              unoptimized
                              className="signature-thumb"
                            />
                          ) : (
                            '-'
                          )}
                        </td>
                        <td data-label="Aksi">
                          <div className="forms-dashboard-row-actions">
                            <button
                              type="button"
                              onClick={() => setPendingDeleteId(item.id)}
                              className="forms-dashboard-action-link danger"
                              title="Hapus kiriman"
                            >
                              Hapus
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <section className="forms-dashboard-insights submissions-dashboard-insights">
          <article className="forms-dashboard-panel submissions-dashboard-breakdown-panel">
            <div className="forms-dashboard-panel-header compact">
                <div>
                  <p className="forms-dashboard-overline">Ringkasan</p>
                  <h2>Komposisi Hasil</h2>
                  <p>Ringkasan cepat untuk melihat distribusi kiriman yang sedang aktif.</p>
                </div>
              </div>

            <div className="submissions-dashboard-breakdown-list">
              {hasParticipantType && (
                <div className="submissions-dashboard-breakdown-item">
                  <div>
                    <strong>Peserta Internal</strong>
                    <span>{numberFormatter.format(internalCount)} kiriman</span>
                  </div>
                  <div className="submissions-dashboard-breakdown-meter" aria-hidden="true">
                    <span style={{ width: `${data.items.length > 0 ? Math.max(10, Math.round((internalCount / data.items.length) * 100)) : 0}%` }} />
                  </div>
                </div>
              )}

              {hasParticipantType && (
                <div className="submissions-dashboard-breakdown-item">
                  <div>
                    <strong>Peserta Eksternal</strong>
                    <span>{numberFormatter.format(externalCount)} kiriman</span>
                  </div>
                  <div className="submissions-dashboard-breakdown-meter muted" aria-hidden="true">
                    <span style={{ width: `${data.items.length > 0 ? Math.max(10, Math.round((externalCount / data.items.length) * 100)) : 0}%` }} />
                  </div>
                </div>
              )}

              {hasQuiz && (
                <div className="submissions-dashboard-breakdown-item">
                  <div>
                    <strong>Kelulusan kuis</strong>
                    <span>{passRate !== null ? `${passRate}% tingkat kelulusan` : 'Belum ada nilai'}</span>
                  </div>
                  <div className="submissions-dashboard-breakdown-meter accent" aria-hidden="true">
                    <span style={{ width: `${passRate !== null ? Math.max(12, passRate) : 0}%` }} />
                  </div>
                </div>
              )}
            </div>
          </article>

          <article className="forms-dashboard-highlight-card">
              <div className="forms-dashboard-highlight-copy">
                <p className="forms-dashboard-overline dark">Sorotan utama</p>
                <strong>{bestQuizPercentage !== null ? `${bestQuizPercentage}%` : numberFormatter.format(data.items.length)}</strong>
                <h3>{bestQuizSubmission ? 'Nilai Tertinggi' : 'Kiriman Aktif'}</h3>
                <p>
                  {bestQuizSubmission
                    ? `Kiriman terbaik memiliki skor ${bestQuizSubmission.meta.quiz?.score}/${bestQuizSubmission.meta.quiz?.maxScore} dan dikirim pada ${new Date(bestQuizSubmission.createdAt).toLocaleString('id-ID')}.`
                    : 'Belum ada data kuis. Gunakan panel ini untuk memantau volume kiriman aktif.'}
                </p>
              </div>

            <dl className="forms-dashboard-highlight-list">
              <div>
                  <dt>Tersaring</dt>
                <dd>{numberFormatter.format(data.items.length)}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd>{numberFormatter.format(data.totalItems)}</dd>
              </div>
              <div>
                  <dt>Lulus</dt>
                <dd>{numberFormatter.format(passedQuizCount)}</dd>
              </div>
              <div>
                  <dt>Rata-rata</dt>
                <dd>{averageQuizPercentage !== null ? `${averageQuizPercentage}%` : '-'}</dd>
              </div>
            </dl>
          </article>
        </section>
      </div>

      {pendingDeleteId && (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-submission-title">
            <div className="admin-modal-head">
              <h3 id="delete-submission-title">Hapus Kiriman</h3>
              <p>Kiriman ini akan dihapus dari form builder. Untuk form attendance, data legacy terkait juga ikut dihapus.</p>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => setPendingDeleteId(null)}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                type="button"
                className="admin-delete-confirm-btn"
                onClick={() => handleDelete(pendingDeleteId)}
                disabled={deleting}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
