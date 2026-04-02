'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

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
        setError(json.error || 'Gagal memuat submissions')
        return
      }

      setData(json.data)
    } catch {
      setError('Gagal memuat submissions')
    } finally {
      setLoading(false)
    }
  }, [formId, participantFilter, quizFilter, sortBy])

  useEffect(() => {
    load()
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
        setFeedback({ type: 'error', message: json.error || 'Gagal menghapus submission' })
        return
      }

      setFeedback({ type: 'success', message: 'Submission berhasil dihapus' })
      setPendingDeleteId(null)
      await load()
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menghapus submission' })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="admin-wrapper"><div className="admin-empty"><p>Memuat submissions...</p></div></div>
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

  return (
    <div className="admin-wrapper admin-builder-wrapper">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>Submissions Form</h1>
          <p>{data.form.title} · {data.form.slug}</p>
        </div>
        <div className="admin-header-right">
          <Link href="/admin/forms" className="admin-secondary-btn">Daftar Form</Link>
          <a href={`/api/admin/forms/${data.form.id}/export?${exportParams.toString()}`} className="admin-secondary-btn">
            Export CSV
          </a>
          <Link href={`/admin/forms/${data.form.id}`} className="admin-export-btn">Edit Form</Link>
        </div>
      </div>

      {feedback && (
        <div className={`admin-builder-alert ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      <section className="admin-submissions-summary">
        <div className="admin-submissions-summary-grid">
          <article className="admin-submissions-summary-card">
            <span>Total Tersaring</span>
            <strong>{data.items.length}</strong>
            <small>Menampilkan {data.items.length} dari {data.totalItems} submission.</small>
          </article>
          {hasParticipantType && (
            <>
              <article className="admin-submissions-summary-card">
                <span>Peserta Internal</span>
                <strong>{internalCount}</strong>
                <small>Submission internal pada hasil aktif.</small>
              </article>
              <article className="admin-submissions-summary-card">
                <span>Peserta Eksternal</span>
                <strong>{externalCount}</strong>
                <small>Submission eksternal pada hasil aktif.</small>
              </article>
            </>
          )}
          {hasQuiz && (
            <>
              <article className="admin-submissions-summary-card">
                <span>Kelulusan Quiz</span>
                <strong>{passRate !== null ? `${passRate}%` : '-'}</strong>
                <small>{passedQuizCount} lulus, {failedQuizCount} belum lulus.</small>
              </article>
              <article className="admin-submissions-summary-card">
                <span>Rata-rata Nilai</span>
                <strong>{averageQuizPercentage !== null ? `${averageQuizPercentage}%` : '-'}</strong>
                <small>Berdasarkan submission quiz pada hasil aktif.</small>
              </article>
            </>
          )}
        </div>

        <div className="admin-submissions-filters">
          {hasParticipantType && (
            <label className="admin-builder-field">
              <span>Filter Peserta</span>
              <select
                value={participantFilter}
                onChange={(e) => setParticipantFilter(e.target.value as typeof participantFilter)}
                className="admin-builder-select"
              >
                <option value="all">Semua peserta</option>
                <option value="internal">Internal</option>
                <option value="external">Eksternal</option>
              </select>
            </label>
          )}
          {hasQuiz && (
            <label className="admin-builder-field">
              <span>Filter Quiz</span>
              <select
                value={quizFilter}
                onChange={(e) => setQuizFilter(e.target.value as typeof quizFilter)}
                className="admin-builder-select"
              >
                <option value="all">Semua hasil</option>
                <option value="passed">Lulus</option>
                <option value="failed">Belum lulus</option>
                <option value="ungraded">Tanpa quiz</option>
              </select>
            </label>
          )}
          <label className="admin-builder-field">
            <span>Urutkan</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="admin-builder-select"
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
              {hasQuiz && <option value="score-desc">Skor tertinggi</option>}
              {hasQuiz && <option value="score-asc">Skor terendah</option>}
            </select>
          </label>
        </div>
      </section>

      <div className="admin-table-container">
        {data.totalItems === 0 ? (
          <div className="admin-empty">
            <h3>Belum ada submission</h3>
            <p>Form ini belum menerima kiriman data.</p>
          </div>
        ) : data.items.length === 0 ? (
          <div className="admin-empty">
            <h3>Tidak ada hasil yang cocok</h3>
            <p>Ubah filter peserta, filter quiz, atau urutan untuk melihat submission lain.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">Waktu</th>
                {hasParticipantType && <th scope="col">Tipe Peserta</th>}
                {hasQuiz && <th scope="col">Hasil Quiz</th>}
                {visibleColumns.map((column) => (
                  <th key={column.id} scope="col">{column.label}</th>
                ))}
                <th scope="col">Tanda Tangan</th>
                <th scope="col">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const signatureColumn = data.columns.find((column) => column.type === 'signature')
                const signature = signatureColumn ? item.answers[signatureColumn.name] : ''

                return (
                  <tr key={item.id}>
                    <td data-label="Waktu">{new Date(item.createdAt).toLocaleString('id-ID')}</td>
                    {hasParticipantType && (
                      <td data-label="Tipe Peserta">
                        {item.meta.participantType === 'internal'
                          ? 'Internal'
                          : item.meta.participantType === 'external'
                            ? 'Eksternal'
                            : '-'}
                      </td>
                    )}
                    {hasQuiz && (
                      <td data-label="Hasil Quiz">
                        {item.meta.quiz ? (
                          <div className="admin-quiz-result">
                            <strong>{item.meta.quiz.score}/{item.meta.quiz.maxScore}</strong>
                            <span>
                              {item.meta.quiz.correctAnswers} benar dari {item.meta.quiz.totalQuestions} soal · target {item.meta.quiz.passingScore}
                            </span>
                            <em className={`admin-quiz-status ${item.meta.quiz.passed ? 'pass' : 'fail'}`}>
                              {item.meta.quiz.passed ? 'Lulus' : 'Belum lulus'}
                            </em>
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                    )}
                    {visibleColumns.map((column) => (
                      <td key={column.id} data-label={column.label}>{item.answers[column.name] || '-'}</td>
                    ))}
                    <td data-label="Tanda Tangan">
                      {signature ? (
                        <Image
                          src={signature}
                          alt="Signature"
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
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(item.id)}
                        className="delete-btn"
                        title="Hapus submission"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {pendingDeleteId && (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-submission-title">
            <div className="admin-modal-head">
              <h3 id="delete-submission-title">Hapus Submission</h3>
              <p>Tindakan ini akan menghapus submission dari form builder. Untuk form attendance, data legacy terkait juga ikut dihapus.</p>
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
