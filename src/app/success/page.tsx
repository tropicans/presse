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
  const formHref = slug ? `/f/${encodeURIComponent(slug)}` : null
  const successMessage = form?.successMessage
    ?? 'Data Anda telah berhasil dikirim.'

  return (
    <div className="success-wrapper public-ledger-success-page">
      <header className="public-ledger-topbar public-ledger-topbar-static">
        <Link href="/" className="public-ledger-brand">
          <div className="public-ledger-brand-mark" aria-hidden="true" />
          <div>
            <strong>Editorial Data Intelligence</strong>
            <span>Bukti pengiriman</span>
          </div>
        </Link>

        {formHref && (
          <div className="public-ledger-topbar-meta">
            <span className="public-ledger-chip">Kiriman tersimpan</span>
          </div>
        )}
      </header>

      <div className="success-card public-ledger-success-card">
        <div className="success-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <p className="public-ledger-eyebrow">Konfirmasi Pengiriman</p>
        <h1 className="success-title">Terima Kasih!</h1>
        <p className="success-message">
          {successMessage}
        </p>
        {summary?.quiz && (
          <div className="success-summary-card public-ledger-success-summary-card">
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
        <div className="public-ledger-success-actions">
          {formHref && (
            <Link href={formHref} className="success-secondary-link public-ledger-success-link">
              Isi Form Lagi
            </Link>
          )}
          <Link href="/" className="success-secondary-link public-ledger-success-link secondary">
            Kembali ke Beranda
          </Link>
        </div>
      </div>
    </div>
  )
}
