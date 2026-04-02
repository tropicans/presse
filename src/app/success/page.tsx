import Link from 'next/link'
import { getPublicFormBySlug, getPublicSubmissionSummary } from '@/lib/forms'

interface SuccessPageProps {
  searchParams?: Promise<{
    slug?: string | string[]
    submissionId?: string | string[]
  }>
}

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const resolvedSearchParams = searchParams ? await searchParams : undefined
  const slugParam = resolvedSearchParams?.slug
  const submissionIdParam = resolvedSearchParams?.submissionId
  const slug = Array.isArray(slugParam) ? slugParam[0]?.trim() : slugParam?.trim()
  const submissionId = Array.isArray(submissionIdParam)
    ? submissionIdParam[0]?.trim()
    : submissionIdParam?.trim()
  const form = slug ? await getPublicFormBySlug(slug) : null
  const summary = slug && submissionId
    ? await getPublicSubmissionSummary(slug, submissionId)
    : null
  const backHref = !slug
    ? '/'
    : `/f/${encodeURIComponent(slug)}`
  const successMessage = form?.successMessage
    ?? 'Data Anda telah berhasil dikirim.'

  return (
    <div className="success-wrapper">
      <div className="success-card">
        <div className="success-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="success-title">Terima Kasih!</h1>
        <p className="success-message">
          {successMessage}
        </p>
        {summary?.quiz && (
          <div className="success-summary-card">
            <div className="success-summary-head">
              <h2>Ringkasan Quiz</h2>
              <span className={`success-summary-status ${summary.quiz.passed ? 'pass' : 'fail'}`}>
                {summary.quiz.passed ? 'Lulus' : 'Belum Lulus'}
              </span>
            </div>
            <dl className="success-summary-grid">
              <div className="success-summary-item">
                <dt>Skor</dt>
                <dd>{summary.quiz.score} / {summary.quiz.maxScore}</dd>
              </div>
              <div className="success-summary-item">
                <dt>Target Lulus</dt>
                <dd>{summary.quiz.passingScore} poin</dd>
              </div>
              <div className="success-summary-item">
                <dt>Jawaban Benar</dt>
                <dd>{summary.quiz.correctAnswers} / {summary.quiz.totalQuestions}</dd>
              </div>
              {summary.participantType && (
                <div className="success-summary-item">
                  <dt>Tipe Peserta</dt>
                  <dd>{summary.participantType === 'internal' ? 'Internal' : 'Eksternal'}</dd>
                </div>
              )}
            </dl>
          </div>
        )}
        <Link href={backHref} className="success-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Kembali ke Form
        </Link>
      </div>
    </div>
  )
}
