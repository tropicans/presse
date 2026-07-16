'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { getAdminFormStatusLabel } from '@/lib/admin-display'

function MarkdownRenderer({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let listItems: string[] = []
  let inTable = false
  let tableRows: string[][] = []

  const parseInline = (text: string): React.ReactNode[] => {
    const parts = text.split(/\*\*([^*]+)\*\*/g)
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index} style={{ fontWeight: 700, color: 'var(--ledger-primary-text, #1f2937)' }}>{part}</strong>
      }
      const subparts = part.split(/`([^`]+)`/g)
      return subparts.map((subpart, subindex) => {
        if (subindex % 2 === 1) {
          return (
            <code key={subindex} style={{
              padding: '2px 6px',
              backgroundColor: 'rgba(0,0,0,0.05)',
              borderRadius: '6px',
              fontFamily: 'monospace',
              fontSize: '0.85em'
            }}>
              {subpart}
            </code>
          )
        }
        return subpart
      })
    })
  }

  const flushList = (key: number) => {
    if (listItems.length > 0) {
      elements.push(
        <ul key={`ul-${key}`} style={{
          listStyleType: 'disc',
          paddingLeft: '24px',
          marginBottom: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '6px'
        }}>
          {listItems.map((item, idx) => (
            <li key={idx} style={{ fontSize: '0.975rem', lineHeight: '1.6', color: 'var(--ledger-primary-text, #374151)' }}>
              {parseInline(item)}
            </li>
          ))}
        </ul>
      )
      listItems = []
    }
  }

  const flushTable = (key: number) => {
    if (tableRows.length > 0) {
      const headers = tableRows[0]
      const dataRows = tableRows.slice(1).filter(row => {
        return !row.every(cell => cell.trim().match(/^:?-+:?$/))
      })

      elements.push(
        <div key={`table-container-${key}`} className="forms-dashboard-table-wrap" style={{ overflowX: 'auto', marginBottom: '24px', border: '1px solid var(--ledger-border)', borderRadius: '12px' }}>
          <table className="forms-dashboard-table" style={{ width: '100%', borderCollapse: 'collapse', margin: 0 }}>
            <thead>
              <tr style={{ background: 'rgba(0,0,0,0.02)' }}>
                {headers.map((cell, idx) => (
                  <th key={idx} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, fontSize: '0.9rem', borderBottom: '1px solid var(--ledger-border)' }}>
                    {parseInline(cell.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} style={{ borderBottom: rIdx === dataRows.length - 1 ? 'none' : '1px solid var(--ledger-border)' }}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} style={{ padding: '12px 16px', fontSize: '0.925rem', color: 'var(--ledger-primary-text)' }}>
                      {parseInline(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableRows = []
      inTable = false
    }
  }

  let keyCounter = 0
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const trimmed = line.trim()

    if (trimmed.startsWith('|') && trimmed.endsWith('|') && trimmed.length > 1) {
      flushList(keyCounter++)
      inTable = true
      const cells = trimmed.slice(1, -1).split('|')
      tableRows.push(cells)
      continue
    } else if (inTable && !trimmed.startsWith('|')) {
      flushTable(keyCounter++)
    }

    if (trimmed.startsWith('# ')) {
      flushList(keyCounter++)
      elements.push(
        <h1 key={keyCounter++} style={{
          fontSize: '1.8rem',
          fontWeight: 800,
          marginTop: '28px',
          marginBottom: '16px',
          borderBottom: '2px solid var(--ledger-border)',
          paddingBottom: '10px',
          color: 'var(--ledger-primary-text, #111827)'
        }}>
          {parseInline(trimmed.slice(2))}
        </h1>
      )
    } else if (trimmed.startsWith('## ')) {
      flushList(keyCounter++)
      elements.push(
        <h2 key={keyCounter++} style={{
          fontSize: '1.45rem',
          fontWeight: 700,
          marginTop: '24px',
          marginBottom: '12px',
          borderBottom: '1px solid var(--ledger-border)',
          paddingBottom: '6px',
          color: 'var(--ledger-primary-text, #1f2937)'
        }}>
          {parseInline(trimmed.slice(3))}
        </h2>
      )
    } else if (trimmed.startsWith('### ')) {
      flushList(keyCounter++)
      elements.push(
        <h3 key={keyCounter++} style={{
          fontSize: '1.2rem',
          fontWeight: 600,
          marginTop: '20px',
          marginBottom: '10px',
          color: 'var(--ledger-primary-text, #374151)'
        }}>
          {parseInline(trimmed.slice(4))}
        </h3>
      )
    } else if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      listItems.push(trimmed.slice(2))
    } else if (trimmed.match(/^\d+\.\s/)) {
      flushList(keyCounter++)
      const match = trimmed.match(/^(\d+)\.\s(.*)/)
      if (match) {
        elements.push(
          <div key={keyCounter++} style={{
            display: 'flex',
            gap: '8px',
            marginBottom: '8px',
            paddingLeft: '16px',
            fontSize: '0.975rem',
            lineHeight: '1.6',
            color: 'var(--ledger-primary-text, #374151)'
          }}>
            <span style={{ fontWeight: 700, color: 'var(--ledger-primary)' }}>{match[1]}.</span>
            <span>{parseInline(match[2])}</span>
          </div>
        )
      }
    } else if (trimmed === '') {
      flushList(keyCounter++)
    } else {
      flushList(keyCounter++)
      elements.push(
        <p key={keyCounter++} style={{
          fontSize: '0.975rem',
          lineHeight: '1.6',
          marginBottom: '16px',
          color: 'var(--ledger-primary-text, #374151)'
        }}>
          {parseInline(line)}
        </p>
      )
    }
  }

  flushList(keyCounter++)
  flushTable(keyCounter++)

  return <div className="markdown-body" style={{ color: 'var(--ledger-primary-text)' }}>{elements}</div>
}

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
  filteredItems: number
  page: number
  pageSize: number
  totalPages: number
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

function isSignatureImage(value: string | undefined) {
  return value?.startsWith('data:image/') ?? false
}

function getAnswerPreview(value: string | undefined, type: SubmissionColumn['type']) {
  if (type === 'signature' && isSignatureImage(value)) {
    return 'Tanda tangan tersimpan'
  }

  const normalized = formatAnswer(value)
  return normalized.length > 140 ? `${normalized.slice(0, 140)}…` : normalized
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
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [exporting, setExporting] = useState(false)
  const [exportingPage, setExportingPage] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [pendingBulkDelete, setPendingBulkDelete] = useState(false)

  const [activeTab, setActiveTab] = useState<'data' | 'ai-analysis'>('data')
  const [aiAnalysis, setAiAnalysis] = useState<{
    id: string
    formId: string
    analysisText: string
    analyzedCount: number
    modelUsed: string
    createdAt: string
    updatedAt: string
  } | null>(null)
  const [loadingAnalysis, setLoadingAnalysis] = useState(false)
  const [generatingAnalysis, setGeneratingAnalysis] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)

  useEffect(() => {
    setSelectedIds([])
  }, [search, participantFilter, quizFilter, sortBy, page])

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked && data) {
      setSelectedIds(filteredItems.map((item) => item.id))
    } else {
      setSelectedIds([])
    }
  }

  const handleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    )
  }

  const handleBulkExport = async () => {
    if (exporting || selectedIds.length === 0) return
    setExporting(true)
    try {
      const exportParams = new URLSearchParams({
        submissionIds: selectedIds.join(','),
      })
      const res = await fetch(`/api/admin/forms/${formId}/export?${exportParams.toString()}`)
      if (!res.ok) {
        setFeedback({ type: 'error', message: 'Gagal mengekspor data Excel' })
        return
      }

      const contentDisposition = res.headers.get('Content-Disposition')
      let filename = `kiriman-terpilih-${new Date().toISOString().split('T')[0]}.xlsx`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/)
        if (match && match[1]) {
          filename = match[1]
        }
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
      setFeedback({ type: 'success', message: `Berhasil mengunduh Excel ${filename}` })
    } catch {
      setFeedback({ type: 'error', message: 'Gagal mengunduh file Excel' })
    } finally {
      setExporting(false)
    }
  }

  const executeBulkDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/admin/forms/${formId}/submissions?submissionId=${selectedIds.join(',')}`,
        { method: 'DELETE' }
      )
      const json = await res.json()

      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'Gagal menghapus kiriman' })
        return
      }

      setFeedback({ type: 'success', message: `${selectedIds.length} kiriman berhasil dihapus` })
      setSelectedIds([])
      setPendingBulkDelete(false)
      await load()
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menghapus kiriman' })
    } finally {
      setDeleting(false)
    }
  }

  const handleExport = async (e: React.MouseEvent<HTMLAnchorElement | HTMLButtonElement>, pageNum: number) => {
    e.preventDefault()
    if (exporting || !data) return
    setExporting(true)
    setExportingPage(pageNum)
    try {
      const exportParams = new URLSearchParams({
        participantType: participantFilter,
        quizStatus: quizFilter,
        sortBy: sortBy,
        page: pageNum.toString(),
        pageSize: '500',
      })
      const href = `/api/admin/forms/${data.form.id}/export?${exportParams.toString()}`
      const res = await fetch(href)
      if (!res.ok) {
        setFeedback({ type: 'error', message: 'Gagal mengekspor data Excel' })
        return
      }

      const contentDisposition = res.headers.get('Content-Disposition')
      let filename = `kiriman-${data.form.slug}-part-${pageNum}.xlsx`
      if (contentDisposition) {
        const match = contentDisposition.match(/filename="(.+?)"/)
        if (match && match[1]) {
          filename = match[1]
        }
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename
      document.body.appendChild(link)
      link.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)
      setFeedback({ type: 'success', message: `Berhasil mengunduh Excel ${filename}` })
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan saat mengekspor data' })
    } finally {
      setExporting(false)
      setExportingPage(null)
    }
  }

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        participantType: participantFilter,
        quizStatus: quizFilter,
        sortBy,
        page: page.toString(),
        pageSize: '20',
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
  }, [formId, participantFilter, quizFilter, sortBy, page])

  useEffect(() => {
    void load()
  }, [load])

  const loadAiAnalysis = useCallback(async () => {
    setLoadingAnalysis(true)
    setAnalysisError(null)
    try {
      const res = await fetch(`/api/admin/forms/${formId}/ai-analysis`)
      const json = await res.json()
      if (res.ok) {
        setAiAnalysis(json.data)
      } else {
        if (res.status === 404) {
          setAiAnalysis(null)
        } else {
          setAnalysisError(json.error || 'Gagal memuat analisis AI')
        }
      }
    } catch {
      setAnalysisError('Gagal memuat analisis AI')
    } finally {
      setLoadingAnalysis(false)
    }
  }, [formId])

  const generateAiAnalysis = async () => {
    if (generatingAnalysis) return
    setGeneratingAnalysis(true)
    setAnalysisError(null)
    try {
      const res = await fetch(`/api/admin/forms/${formId}/ai-analysis`, {
        method: 'POST',
      })
      const json = await res.json()
      if (res.ok) {
        setAiAnalysis(json.data)
        setFeedback({ type: 'success', message: 'Analisis AI berhasil diperbarui' })
      } else {
        setAnalysisError(json.error || 'Gagal membuat analisis AI')
      }
    } catch {
      setAnalysisError('Terjadi kesalahan saat memanggil API Analisis AI')
    } finally {
      setGeneratingAnalysis(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'ai-analysis') {
      void loadAiAnalysis()
    }
  }, [activeTab, loadAiAnalysis])

  useEffect(() => {
    setPage(1)
  }, [participantFilter, quizFilter, sortBy])
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

  if (loading && !data) {
    return (
      <div className="editorial-form-editor-shell">
        <header className="editorial-form-editor-topbar">
          <div className="editorial-form-editor-topbar-left">
            <div className="forms-dashboard-brand">
              <div className="forms-dashboard-brand-mark" aria-hidden="true" />
              <div>
                <strong>isian</strong>
                <span>Hasil Form</span>
              </div>
            </div>
            <div className="editorial-form-editor-divider" aria-hidden="true" />
            <Link href="/admin/forms" className="editorial-form-editor-backlink">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span>Kembali ke Formulir</span>
            </Link>
          </div>
          <div className="editorial-form-editor-topbar-actions">
            <Link href={`/admin/forms/${formId}`} className="editorial-form-editor-ghost-btn">
              Edit Formulir
            </Link>
          </div>
        </header>

        <div className="editorial-form-editor-content submissions-dashboard-content">
          <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/admin" className="admin-breadcrumb-link">Admin</Link>
            <span className="admin-breadcrumb-separator">/</span>
            <Link href="/admin/forms" className="admin-breadcrumb-link">Formulir</Link>
            <span className="admin-breadcrumb-separator">/</span>
            <span className="admin-breadcrumb-current muted">Memuat...</span>
          </nav>

          <div className="forms-dashboard-empty-state">
            <h3>Memuat kiriman</h3>
            <p>Dashboard sedang mengambil data kiriman formulir.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="editorial-form-editor-shell">
        <header className="editorial-form-editor-topbar">
          <div className="editorial-form-editor-topbar-left">
            <div className="forms-dashboard-brand">
              <div className="forms-dashboard-brand-mark" aria-hidden="true" />
              <div>
                <strong>isian</strong>
                <span>Hasil Form</span>
              </div>
            </div>
            <div className="editorial-form-editor-divider" aria-hidden="true" />
            <Link href="/admin/forms" className="editorial-form-editor-backlink">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="m15 18-6-6 6-6" />
              </svg>
              <span>Kembali ke Formulir</span>
            </Link>
          </div>
          <div className="editorial-form-editor-topbar-actions">
            <Link href={`/admin/forms/${formId}`} className="editorial-form-editor-ghost-btn">
              Edit Formulir
            </Link>
          </div>
        </header>

        <div className="editorial-form-editor-content submissions-dashboard-content">
          <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/admin" className="admin-breadcrumb-link">Admin</Link>
            <span className="admin-breadcrumb-separator">/</span>
            <Link href="/admin/forms" className="admin-breadcrumb-link">Formulir</Link>
            <span className="admin-breadcrumb-separator">/</span>
            <span className="admin-breadcrumb-current muted">Error</span>
          </nav>

          <div className="forms-dashboard-empty-state">
            <h3>Terjadi Kesalahan</h3>
            <p>{error || 'Data tidak ditemukan'}</p>
          </div>
        </div>
      </div>
    )
  }

  const exportPageSize = 500
  const exportPages = Math.max(1, Math.ceil(data.filteredItems / exportPageSize))
  const answerColumns = data.columns.filter((column) => column.name !== 'participantType')
  const firstAnswerColumns = answerColumns.slice(0, 3)
  const remainingAnswerColumns = answerColumns.slice(3)
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
  const firstVisibleItem = data.filteredItems > 0 ? ((data.page - 1) * data.pageSize) + 1 : 0
  const lastVisibleItem = Math.min(data.page * data.pageSize, data.filteredItems)

  const normalizedSearch = search.trim().toLowerCase()
  const filteredItems = data.items.filter((item) => {
    if (!normalizedSearch) {
      return true
    }
    const matchesAnswers = Object.values(item.answers).some((val) =>
      val.toLowerCase().includes(normalizedSearch)
    )
    const matchesId = item.id.toLowerCase().includes(normalizedSearch)
    const matchesParticipant = item.meta.participantType && getParticipantLabel(item.meta.participantType).toLowerCase().includes(normalizedSearch)
    return matchesAnswers || matchesId || matchesParticipant
  })

  return (
    <div className="editorial-form-editor-shell">
      <header className="editorial-form-editor-topbar">
        <div className="editorial-form-editor-topbar-left">
          <div className="forms-dashboard-brand">
            <div className="forms-dashboard-brand-mark" aria-hidden="true" />
            <div>
              <strong>isian</strong>
              <span>Hasil Form</span>
            </div>
          </div>

          <div className="editorial-form-editor-divider" aria-hidden="true" />

          <Link href="/admin/forms" className="editorial-form-editor-backlink">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="m15 18-6-6 6-6" />
            </svg>
            <span>Kembali ke Formulir</span>
          </Link>
        </div>

        <div className="editorial-form-editor-topbar-actions">
          <Link href={`/admin/forms/${data.form.id}`} className="editorial-form-editor-ghost-btn">
            Edit Formulir
          </Link>
          {exportPages === 1 ? (
            <button
              type="button"
              disabled={exporting}
              onClick={(e) => handleExport(e, 1)}
              className="editorial-form-editor-primary-btn"
            >
              {exporting ? (
                <>
                  <span className="spinner" />
                  <span>Mengunduh...</span>
                </>
              ) : (
                'Download All Excel'
              )}
            </button>
          ) : (
            <details className="forms-dashboard-share-menu">
              <summary className="editorial-form-editor-primary-btn">
                {exporting ? (
                  <>
                    <span className="spinner" />
                    <span>Mengunduh Part {exportingPage}...</span>
                  </>
                ) : (
                  'Download Excel'
                )}
              </summary>
              <div className="forms-dashboard-share-panel">
                {Array.from({ length: exportPages }, (_, index) => {
                  const exportPage = index + 1
                  const start = (index * exportPageSize) + 1
                  const end = Math.min(exportPage * exportPageSize, data.filteredItems)

                  return (
                    <button
                      key={exportPage}
                      type="button"
                      disabled={exporting}
                      onClick={(e) => {
                        void handleExport(e, exportPage)
                        const details = e.currentTarget.closest('details')
                        if (details) details.open = false
                      }}
                      className="forms-dashboard-share-link"
                      style={{ border: 'none', background: 'none', width: '100%', textAlign: 'left', padding: '10px 14px', borderRadius: '12px' }}
                    >
                      Part {numberFormatter.format(exportPage)} ({numberFormatter.format(start)}-{numberFormatter.format(end)})
                    </button>
                  )
                })}
              </div>
            </details>
          )}
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
            <p className="forms-dashboard-overline">Kiriman Form</p>
            <strong>{data.form.title}</strong>
            <span>
              Lihat kiriman, evaluasi kuis, dan unduh semua hasil tersaring ke Excel.
            </span>
            <p className="editorial-form-editor-section-note submissions-dashboard-note">
              Download Excel mengambil semua kiriman sesuai filter saat ini. Jika lebih dari 500 kiriman, unduh per part.
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

        {/* Tab Navigation */}
        <div className="submissions-tab-navigation" style={{ display: 'flex', gap: '8px', borderBottom: '1px solid var(--ledger-border)', marginBottom: '24px', paddingBottom: '0' }}>
          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`submissions-tab-button ${activeTab === 'data' ? 'active' : ''}`}
            style={{
              padding: '12px 18px',
              fontWeight: 600,
              fontSize: '0.95rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'data' ? '2.5px solid var(--ledger-primary, #4f46e5)' : '2.5px solid transparent',
              color: activeTab === 'data' ? 'var(--ledger-primary, #4f46e5)' : 'var(--ledger-secondary, #6b7280)',
              cursor: 'pointer',
              marginBottom: '-1px',
              transition: 'all 0.2s ease',
            }}
          >
            Data Masuk
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('ai-analysis')}
            className={`submissions-tab-button ${activeTab === 'ai-analysis' ? 'active' : ''}`}
            style={{
              padding: '12px 18px',
              fontWeight: 600,
              fontSize: '0.95rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === 'ai-analysis' ? '2.5px solid var(--ledger-primary, #4f46e5)' : '2.5px solid transparent',
              color: activeTab === 'ai-analysis' ? 'var(--ledger-primary, #4f46e5)' : 'var(--ledger-secondary, #6b7280)',
              cursor: 'pointer',
              marginBottom: '-1px',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <span>Analisis AI</span>
            <span style={{ fontSize: '0.75rem', background: 'rgba(124, 58, 237, 0.12)', color: '#7c3aed', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>Baru</span>
          </button>
        </div>

      {activeTab === 'data' && (
        <>
          <section className="forms-dashboard-hero submissions-dashboard-hero">
            <div className="forms-dashboard-hero-copy">
              <p className="forms-dashboard-overline">Tinjauan Kiriman</p>
              <h1>Kiriman</h1>
              <p>
                Menampilkan {numberFormatter.format(firstVisibleItem)}-{numberFormatter.format(lastVisibleItem)} dari{' '}
                {numberFormatter.format(data.filteredItems)} hasil tersaring, total {numberFormatter.format(data.totalItems)} kiriman.
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
            <strong>{numberFormatter.format(data.filteredItems)}</strong>
            <small>Berdasarkan filter saat ini.</small>
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
              <small>Semua kiriman untuk form ini.</small>
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
              <small>Pada halaman ini: {numberFormatter.format(externalCount)} kiriman lain berasal dari peserta eksternal.</small>
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
                Pada halaman ini: {numberFormatter.format(passedQuizCount)} lulus, {numberFormatter.format(failedQuizCount)} belum lulus.
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
              <label className="forms-dashboard-search" aria-label="Cari kiriman" style={{ marginRight: '1rem', width: '280px' }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  type="text"
                  placeholder="Cari dalam jawaban..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>

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

          {selectedIds.length > 0 && (
            <div className="admin-bulk-actions-bar" style={{ margin: '0 24px 20px' }}>
              <span>{selectedIds.length} kiriman terpilih</span>
              <div className="admin-bulk-actions-buttons">
                <button
                  type="button"
                  onClick={handleBulkExport}
                  className="admin-bulk-action-btn primary"
                  disabled={exporting}
                >
                  {exporting ? 'Mengunduh...' : 'Ekspor Terpilih'}
                </button>
                <button
                  type="button"
                  onClick={() => setPendingBulkDelete(true)}
                  className="admin-bulk-action-btn danger"
                >
                  Hapus Terpilih
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedIds([])}
                  className="admin-bulk-action-btn secondary"
                >
                  Batal
                </button>
              </div>
            </div>
          )}

          <div className="forms-dashboard-table-wrap">
            {loading ? (
              <div className="submissions-dashboard-card-list">
                {Array.from({ length: 5 }).map((_, index) => (
                  <article key={index} className="submissions-dashboard-card">
                    <div className="submissions-dashboard-card-head">
                      <div className="submissions-dashboard-primary-cell">
                        <div className="admin-skeleton-line short" style={{ marginBottom: '6px' }} />
                        <div className="admin-skeleton-line" style={{ width: '150px' }} />
                      </div>
                      <div className="submissions-dashboard-card-badges">
                        <div className="admin-skeleton-line" style={{ width: '80px', height: '24px', borderRadius: '12px' }} />
                      </div>
                    </div>
                    <div className="submissions-dashboard-answer-grid" style={{ marginTop: '16px' }}>
                      {Array.from({ length: 3 }).map((_, fieldIdx) => (
                        <div key={fieldIdx}>
                          <div className="admin-skeleton-line short" style={{ marginBottom: '8px' }} />
                          <div className="admin-skeleton-line" />
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            ) : data.totalItems === 0 ? (
              <div className="forms-dashboard-empty-state">
                  <h3>Belum ada kiriman</h3>
                <p>Form ini belum menerima kiriman data.</p>
              </div>
            ) : filteredItems.length === 0 ? (
              <div className="forms-dashboard-empty-state">
                <h3>Tidak ada hasil yang cocok</h3>
                  <p>Ubah kata kunci pencarian, filter peserta, filter kuis, atau urutan untuk melihat kiriman lain.</p>
              </div>
            ) : (
              <>
                {filteredItems.length > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 20px', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', marginBottom: '15px' }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === filteredItems.length}
                      onChange={handleSelectAll}
                      id="select-all-submissions"
                      style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                    />
                    <label htmlFor="select-all-submissions" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer', color: 'var(--ledger-secondary)' }}>
                      Pilih Semua Kiriman di Halaman Ini
                    </label>
                  </div>
                )}
                <div className="submissions-dashboard-card-list">
                  {filteredItems.map((item) => {
                    const quizPercentage = getQuizPercentage(item)
                    const submittedAt = new Date(item.createdAt).toLocaleString('id-ID')

                    return (
                      <article key={item.id} className="submissions-dashboard-card">
                        <div className="submissions-dashboard-card-head">
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <input
                              type="checkbox"
                              checked={selectedIds.includes(item.id)}
                              onChange={() => handleSelectItem(item.id)}
                              aria-label={`Pilih kiriman ${item.id}`}
                              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                            />
                            <div className="submissions-dashboard-primary-cell">
                              <span>Waktu Submit</span>
                              <strong>{submittedAt}</strong>
                              <code>{item.id}</code>
                            </div>
                          </div>
                        <div className="submissions-dashboard-card-badges">
                          {hasParticipantType && (
                            <span className={`submissions-dashboard-participant-chip ${getParticipantClass(item.meta.participantType)}`}>
                              {getParticipantLabel(item.meta.participantType)}
                            </span>
                          )}
                          {hasQuiz && item.meta.quiz && (
                            <span className={`admin-quiz-status ${item.meta.quiz.passed ? 'pass' : 'fail'}`}>
                              {quizPercentage}% · {item.meta.quiz.passed ? 'Lulus' : 'Belum lulus'}
                            </span>
                          )}
                        </div>
                      </div>

                      <dl className="submissions-dashboard-answer-grid">
                        {firstAnswerColumns.map((column) => (
                          <div key={column.id} className={column.type === 'signature' ? 'signature' : undefined}>
                            <dt>{column.label}</dt>
                            <dd>
                              {column.type === 'signature' && isSignatureImage(item.answers[column.name]) ? (
                                <Image
                                  src={item.answers[column.name]}
                                  alt="Tanda tangan pengirim"
                                  width={220}
                                  height={90}
                                  unoptimized
                                  className="submissions-dashboard-signature-image"
                                />
                              ) : (
                                getAnswerPreview(item.answers[column.name], column.type)
                              )}
                            </dd>
                          </div>
                        ))}
                      </dl>

                      {remainingAnswerColumns.length > 0 && (
                        <details className="submissions-dashboard-details">
                          <summary>Lihat {remainingAnswerColumns.length} jawaban lainnya</summary>
                          <dl className="submissions-dashboard-answer-grid expanded">
                            {remainingAnswerColumns.map((column) => (
                              <div key={column.id} className={column.type === 'signature' ? 'signature' : undefined}>
                                <dt>{column.label}</dt>
                                <dd>
                                  {column.type === 'signature' && isSignatureImage(item.answers[column.name]) ? (
                                    <Image
                                      src={item.answers[column.name]}
                                      alt="Tanda tangan pengirim"
                                      width={220}
                                      height={90}
                                      unoptimized
                                      className="submissions-dashboard-signature-image"
                                    />
                                  ) : (
                                    getAnswerPreview(item.answers[column.name], column.type)
                                  )}
                                </dd>
                              </div>
                            ))}
                          </dl>
                        </details>
                      )}

                      {hasQuiz && item.meta.quiz && (
                        <div className="submissions-dashboard-quiz-card">
                          <strong>{item.meta.quiz.score}/{item.meta.quiz.maxScore}</strong>
                          <span>{item.meta.quiz.correctAnswers} benar dari {item.meta.quiz.totalQuestions} soal</span>
                        </div>
                      )}

                      <div className="submissions-dashboard-card-actions">
                        <button
                          type="button"
                          onClick={() => setPendingDeleteId(item.id)}
                          className="forms-dashboard-action-link danger"
                          title="Hapus kiriman"
                        >
                          Hapus
                        </button>
                      </div>
                    </article>
                  )
                })}
              </div>
              </>
            )}
          </div>

          {data.filteredItems > 0 && (
            <div className="attendance-dashboard-pagination">
              <span className="attendance-dashboard-pagination-info">
                Menampilkan {numberFormatter.format(firstVisibleItem)}-{numberFormatter.format(lastVisibleItem)} dari{' '}
                {numberFormatter.format(data.filteredItems)} kiriman tersaring · Halaman {numberFormatter.format(data.page)} dari{' '}
                {numberFormatter.format(data.totalPages)}
              </span>
              <div className="attendance-dashboard-pagination-buttons">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={data.page <= 1 || loading}
                  className="forms-dashboard-action-link"
                >
                  ← Sebelumnya
                </button>
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.min(data.totalPages, current + 1))}
                  disabled={data.page >= data.totalPages || loading}
                  className="forms-dashboard-action-link"
                >
                  Selanjutnya →
                </button>
              </div>
            </div>
          )}
        </section>

        <section className="forms-dashboard-insights submissions-dashboard-insights">
          <article className="forms-dashboard-panel submissions-dashboard-breakdown-panel">
            <div className="forms-dashboard-panel-header compact">
                <div>
                  <p className="forms-dashboard-overline">Ringkasan</p>
                  <h2>Komposisi Hasil</h2>
                  <p>Pada halaman ini.</p>
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
                  <dt>Halaman ini</dt>
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
        </>
      )}

      {activeTab === 'ai-analysis' && (
        <div className="submissions-ai-analysis-container space-y-6 animate-fade-in" style={{ padding: '0 4px', marginBottom: '32px' }}>
          {/* Metadata & Actions Panel */}
          <div className="forms-dashboard-panel" style={{ padding: '24px', borderRadius: '16px', border: '1px solid var(--ledger-border)', background: 'var(--ledger-bg-card, #ffffff)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '20px' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{
                  width: '54px',
                  height: '54px',
                  borderRadius: '14px',
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
                  color: '#ffffff'
                }}>
                  <svg style={{ width: '28px', height: '28px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2v2" />
                    <path d="M12 20v2" />
                    <path d="M4.93 4.93l1.41 1.41" />
                    <path d="M17.66 17.66l1.41 1.41" />
                    <path d="M2 12h2" />
                    <path d="M20 12h2" />
                    <path d="M6.34 17.66l-1.41 1.41" />
                    <path d="M19.07 4.93l-1.41 1.41" />
                    <path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
                  </svg>
                </div>
                <div>
                  <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--ledger-primary-text, #1f2937)' }}>Analisis Sentimen & Kualitatif AI</h2>
                  <p style={{ margin: '4px 0 0', fontSize: '0.9rem', color: 'var(--ledger-secondary-text, #6b7280)' }}>
                    Gunakan kecerdasan buatan untuk merangkum masukan, sentimen, dan korelasi data.
                  </p>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  onClick={generateAiAnalysis}
                  disabled={generatingAnalysis || loading}
                  className="editorial-form-editor-primary-btn"
                  style={{
                    background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                    border: 'none',
                    boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                    color: '#ffffff',
                    padding: '12px 24px',
                    borderRadius: '12px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'transform 0.1s ease',
                  }}
                >
                  {generatingAnalysis ? (
                    <>
                      <span className="spinner" style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }} />
                      <span>Menganalisis ({data.filteredItems} Respon)...</span>
                    </>
                  ) : aiAnalysis ? (
                    <>
                      <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
                      </svg>
                      <span>Perbarui Analisis AI</span>
                    </>
                  ) : (
                    <>
                      <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="m12 3-1.912 5.886L4.2 10.8l5.887 1.912L12 18.6l1.912-5.886L19.8 10.8l-5.887-1.912z" />
                      </svg>
                      <span>Mulai Analisis AI</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Metadata Stats */}
            {aiAnalysis && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '16px',
                marginTop: '24px',
                paddingTop: '20px',
                borderTop: '1px solid var(--ledger-border)'
              }}>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--ledger-border)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ledger-secondary-text)', display: 'block', marginBottom: '4px' }}>Sampel Dianalisis</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--ledger-primary-text)' }}>{aiAnalysis.analyzedCount} Submissions</strong>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--ledger-border)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ledger-secondary-text)', display: 'block', marginBottom: '4px' }}>Model AI</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--ledger-primary-text)', fontFamily: 'monospace' }}>{aiAnalysis.modelUsed}</strong>
                </div>
                <div style={{ padding: '12px', borderRadius: '10px', background: 'rgba(0,0,0,0.02)', border: '1px solid var(--ledger-border)' }}>
                  <span style={{ fontSize: '0.8rem', color: 'var(--ledger-secondary-text)', display: 'block', marginBottom: '4px' }}>Terakhir Diperbarui</span>
                  <strong style={{ fontSize: '1.1rem', color: 'var(--ledger-primary-text)' }}>{new Date(aiAnalysis.updatedAt).toLocaleString('id-ID')}</strong>
                </div>
              </div>
            )}
          </div>

          {/* Analysis Content or States */}
          {loadingAnalysis ? (
            <div className="forms-dashboard-panel" style={{ padding: '48px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '16px', borderRadius: '16px', border: '1px solid var(--ledger-border)' }}>
              <span className="spinner" style={{ width: '40px', height: '40px', borderWidth: '3px' }} />
              <p style={{ color: 'var(--ledger-secondary-text)', margin: 0 }}>Memuat hasil analisis AI dari database...</p>
            </div>
          ) : analysisError ? (
            <div className="forms-dashboard-panel" style={{ padding: '32px', borderRadius: '16px', border: '1px solid #fee2e2', background: '#fef2f2', color: '#991b1b' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <svg style={{ width: '24px', height: '24px', flexShrink: 0 }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <div style={{ fontWeight: 600 }}>{analysisError}</div>
              </div>
            </div>
          ) : aiAnalysis ? (
            <div className="forms-dashboard-panel" style={{
              padding: '40px',
              borderRadius: '16px',
              border: '1px solid var(--ledger-border)',
              background: 'var(--ledger-bg-card, #ffffff)',
              boxShadow: '0 4px 20px rgba(0,0,0,0.03)',
              position: 'relative',
              overflow: 'hidden'
            }}>
              {/* Subtle top indicator bar */}
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: '4px',
                background: 'linear-gradient(90deg, #4f46e5 0%, #7c3aed 100%)'
              }} />
              
              <MarkdownRenderer content={aiAnalysis.analysisText} />
            </div>
          ) : (
            <div className="forms-dashboard-panel" style={{
              padding: '64px 32px',
              borderRadius: '16px',
              border: '2px dashed var(--ledger-border)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              background: 'rgba(0,0,0,0.01)'
            }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                background: 'rgba(124, 58, 237, 0.08)',
                color: '#7c3aed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: '20px'
              }}>
                <svg style={{ width: '32px', height: '32px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m12 3-1.912 5.886L4.2 10.8l5.887 1.912L12 18.6l1.912-5.886L19.8 10.8l-5.887-1.912z" />
                  <path d="M5 3v4" />
                  <path d="M3 5h4" />
                  <path d="M19 17v4" />
                  <path d="M17 19h4" />
                </svg>
              </div>
              <h3 style={{ fontSize: '1.2rem', fontWeight: 600, margin: '0 0 8px', color: 'var(--ledger-primary-text)' }}>Belum Ada Analisis AI</h3>
              <p style={{ maxWidth: '460px', margin: '0 0 24px', fontSize: '0.925rem', color: 'var(--ledger-secondary-text)', lineHeight: 1.5 }}>
                Hasil analisis kualitatif kepegawaian belum digenerasi untuk formulir ini. Klik tombol di bawah untuk mulai menganalisis kiriman menggunakan kecerdasan buatan.
              </p>
              <button
                type="button"
                onClick={generateAiAnalysis}
                disabled={generatingAnalysis || loading}
                className="editorial-form-editor-primary-btn"
                style={{
                  background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
                  border: 'none',
                  boxShadow: '0 4px 14px rgba(124, 58, 237, 0.3)',
                  color: '#ffffff',
                  padding: '12px 28px',
                  borderRadius: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {generatingAnalysis ? (
                  <>
                    <span className="spinner" style={{ borderColor: '#ffffff', borderTopColor: 'transparent' }} />
                    <span>Menganalisis ({data.filteredItems} Respon)...</span>
                  </>
                ) : (
                  <>
                    <svg style={{ width: '18px', height: '18px' }} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m12 3-1.912 5.886L4.2 10.8l5.887 1.912L12 18.6l1.912-5.886L19.8 10.8l-5.887-1.912z" />
                    </svg>
                    <span>Mulai Analisis AI Pertama</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}
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

      {pendingBulkDelete && (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-bulk-submission-title">
            <div className="admin-modal-head">
              <h3 id="delete-bulk-submission-title">Hapus Massal Kiriman</h3>
              <p>Apakah Anda yakin ingin menghapus {selectedIds.length} kiriman terpilih? Tindakan ini tidak bisa dibatalkan.</p>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => setPendingBulkDelete(false)}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                type="button"
                className="admin-delete-confirm-btn"
                onClick={executeBulkDelete}
                disabled={deleting}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus Massal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
