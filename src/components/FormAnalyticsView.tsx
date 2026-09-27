'use client'

import Link from 'next/link'
import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  DateRangeFilter,
  ParticipantFilter,
  SubmissionColumn,
} from '@/lib/form-analytics'

interface AnalyticsData {
  form: {
    id: string
    slug: string
    title: string
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  }
  totalItems: number
  filteredItems: number
  hasParticipantType: boolean
  hasQuiz: boolean
  columns: SubmissionColumn[]
  kpis: {
    totalResponses: number
    totalItems: number
    averageQuizScore: string | null
    quizPassRate: string | null
    latestResponseTime: string
  }
  dailyVolume: Array<{
    day: string
    count: number
    heightPercent: number
    formattedDay: string
  }>
  questionDistributions: Array<{
    column: SubmissionColumn
    totalAnswered: number
    options: Array<{
      label: string
      count: number
      percentage: number
    }>
  }>
}

interface FormAnalyticsViewProps {
  formId: string
}

export default function FormAnalyticsView({ formId }: FormAnalyticsViewProps) {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hasLoadedRef = useRef(false)

  // Filter States
  const [dateRange, setDateRange] = useState<DateRangeFilter>('30d')
  const [participantType, setParticipantType] = useState<ParticipantFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')

  const fetchAnalyticsData = useCallback(
    async (range: DateRangeFilter, participant: ParticipantFilter, query: string, isInitial = false) => {
      if (isInitial) {
        setLoading(true)
      } else {
        setIsUpdating(true)
      }
      setError(null)
      try {
        const params = new URLSearchParams({
          range,
          participantType: participant,
        })
        if (query.trim()) {
          params.set('search', query.trim())
        }
        const response = await fetch(`/api/admin/forms/${formId}/analytics?${params.toString()}`)
        if (!response.ok) {
          throw new Error('Gagal memuat data analitik formulir')
        }
        const json = await response.json()
        setData(json.data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Terjadi kesalahan tidak terduga')
      } finally {
        setLoading(false)
        setIsUpdating(false)
      }
    },
    [formId]
  )

  useEffect(() => {
    const isInitial = !hasLoadedRef.current
    const timer = setTimeout(() => {
      fetchAnalyticsData(dateRange, participantType, searchQuery, isInitial)
      hasLoadedRef.current = true
    }, searchQuery ? 300 : 0)

    return () => clearTimeout(timer)
  }, [fetchAnalyticsData, dateRange, participantType, searchQuery])

  if (loading && !data) {
    return (
      <main className="analytics-shell">
        <div className="analytics-header">
          <div className="admin-skeleton-line short" />
          <div className="admin-skeleton-line" style={{ height: '36px', width: '60%' }} />
        </div>
        <div className="analytics-metric-grid">
          <div className="admin-skeleton-card" style={{ height: '120px' }} />
          <div className="admin-skeleton-card" style={{ height: '120px' }} />
          <div className="admin-skeleton-card" style={{ height: '120px' }} />
          <div className="admin-skeleton-card" style={{ height: '120px' }} />
        </div>
      </main>
    )
  }

  if (error && !data) {
    return (
      <main className="analytics-shell">
        <div className="admin-step-empty-card">
          <p>Gagal memuat analitik</p>
          <small>{error || 'Formulir tidak ditemukan'}</small>
          <div style={{ marginTop: '16px' }}>
            <button
              type="button"
              className="admin-secondary-btn"
              onClick={() => fetchAnalyticsData(dateRange, participantType, searchQuery, true)}
            >
              Coba Lagi
            </button>
          </div>
        </div>
      </main>
    )
  }

  if (!data) return null

  const { kpis, dailyVolume, questionDistributions } = data

  return (
    <main className="analytics-shell" style={{ opacity: isUpdating ? 0.7 : 1, transition: 'opacity 0.15s ease' }}>
      {/* Header */}
      <header className="analytics-header">
        <div style={{ marginBottom: '12px' }}>
          <Link href="/admin/forms" className="admin-back-link">
            ← Kembali ke Daftar Formulir
          </Link>
        </div>
        <div className="analytics-header-top">
          <div>
            <h1 className="analytics-header-title">{data.form.title}</h1>
            <div className="analytics-header-subtitle">
              <span>ANALITIK DATA & DISTRIBUSI RESPON</span>
              <span style={{ margin: '0 8px' }}>•</span>
              <code>/{data.form.slug}</code>
            </div>
          </div>
          <div className="analytics-header-actions">
            <Link
              href={`/admin/forms/${formId}/submissions`}
              className="admin-secondary-btn"
            >
              Kiriman Data
            </Link>
            <Link
              href={`/admin/forms/${formId}/edit`}
              className="admin-secondary-btn"
            >
              Sunting Form
            </Link>
          </div>
        </div>
      </header>

      {/* Filter Bar */}
      <section className="analytics-filterbar" aria-label="Filter Analitik">
        <div className="analytics-filter-group">
          <label htmlFor="analytics-date-range" className="analytics-filter-label">
            Rentang Waktu
          </label>
          <select
            id="analytics-date-range"
            className="analytics-filter-select"
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value as DateRangeFilter)}
          >
            <option value="7d">7 Hari Terakhir</option>
            <option value="30d">30 Hari Terakhir</option>
            <option value="month">Bulan Ini</option>
            <option value="all">Semua Waktu</option>
          </select>
        </div>

        {data.hasParticipantType && (
          <div className="analytics-filter-group">
            <label htmlFor="analytics-participant-type" className="analytics-filter-label">
              Tipe Partisipan
            </label>
            <select
              id="analytics-participant-type"
              className="analytics-filter-select"
              value={participantType}
              onChange={(e) => setParticipantType(e.target.value as ParticipantFilter)}
            >
              <option value="all">Semua Partisipan</option>
              <option value="internal">Internal</option>
              <option value="external">Eksternal</option>
            </select>
          </div>
        )}

        <div className="analytics-filter-group" style={{ flexGrow: 1 }}>
          <label htmlFor="analytics-search" className="analytics-filter-label">
            Cari Dalam Jawaban
          </label>
          <input
            id="analytics-search"
            type="text"
            className="analytics-filter-input"
            placeholder="Ketik kata kunci jawaban atau ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {(dateRange !== 'all' || participantType !== 'all' || searchQuery.trim()) && (
          <button
            type="button"
            className="admin-secondary-btn"
            style={{ padding: '8px 14px' }}
            onClick={() => {
              setDateRange('all')
              setParticipantType('all')
              setSearchQuery('')
            }}
          >
            Reset Filter
          </button>
        )}
      </section>

      {/* KPI Metric Cards */}
      <section className="analytics-metric-grid" aria-label="Metrik Ringkasan KPI">
        <div className="analytics-metric-card">
          <div className="analytics-metric-card-label">Total Respon Terfilter</div>
          <div className="analytics-metric-card-value">{kpis.totalResponses}</div>
          <div className="analytics-metric-card-sub">
            Dari total {data.totalItems} keseluruhan
          </div>
        </div>

        {data.hasQuiz ? (
          <>
            <div className="analytics-metric-card">
              <div className="analytics-metric-card-label">Rata-rata Skor Kuis</div>
              <div className="analytics-metric-card-value">{kpis.averageQuizScore ?? '0.0'}</div>
              <div className="analytics-metric-card-sub">
                Tingkat Kelulusan: {kpis.quizPassRate ?? 0}%
              </div>
            </div>
            <div className="analytics-metric-card">
              <div className="analytics-metric-card-label">Respon Terakhir</div>
              <div className="analytics-metric-card-value" style={{ fontSize: '1.25rem', paddingTop: '10px' }}>
                {kpis.latestResponseTime}
              </div>
              <div className="analytics-metric-card-sub">
                Aktivitas kiriman terbaru
              </div>
            </div>
          </>
        ) : (
          <div className="analytics-metric-card">
            <div className="analytics-metric-card-label">Respon Terakhir</div>
            <div className="analytics-metric-card-value" style={{ fontSize: '1.25rem', paddingTop: '10px' }}>
              {kpis.latestResponseTime}
            </div>
            <div className="analytics-metric-card-sub">
              Aktivitas kiriman terbaru
            </div>
          </div>
        )}

        <div className="analytics-metric-card">
          <div className="analytics-metric-card-label">Jumlah Pertanyaan</div>
          <div className="analytics-metric-card-value">{data.columns.length}</div>
          <div className="analytics-metric-card-sub">
            Bidang data terdaftar
          </div>
        </div>
      </section>

      {/* Daily Submission Volume Bar Chart */}
      <section className="analytics-chart-panel" aria-label="Tren Pengiriman Harian">
        <div className="analytics-chart-header">
          <div>
            <h2 style={{ fontFamily: 'var(--font-family-display)', margin: 0, fontSize: '1.2rem', fontWeight: 700 }}>
              Tren Pengiriman Harian
            </h2>
            <small style={{ fontFamily: 'var(--font-family-mono)', color: 'var(--text-muted)' }}>
              Frekuensi kiriman per tanggal dalam periode terfilter
            </small>
          </div>
        </div>

        {dailyVolume.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
            Tidak ada data kiriman pada rentang waktu yang dipilih
          </div>
        ) : (
          <div className="analytics-chart-container">
            {dailyVolume.map((item) => (
              <div key={item.day} className="analytics-chart-bar-group" title={`${item.day}: ${item.count} respon`}>
                <div
                  className="analytics-chart-bar"
                  style={{ height: `${item.heightPercent}%` }}
                />
                <span className="analytics-chart-label">{item.formattedDay}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Question Choices Distribution Breakdown */}
      <section aria-label="Distribusi Jawaban per Pertanyaan">
        <h2 className="analytics-section-title">
          <span>Distribusi Respon per Pertanyaan</span>
          <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>
            {questionDistributions.length} Pertanyaan
          </span>
        </h2>

        <div className="analytics-question-grid">
          {questionDistributions.map(({ column, totalAnswered, options }, idx) => (
            <article key={column.id || column.name} className="analytics-question-card">
              <div className="analytics-question-card-head">
                <div>
                  <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 800 }}>
                    [ Q{String(idx + 1).padStart(2, '0')} ]
                  </span>
                  <h3 className="analytics-question-title" style={{ marginTop: '4px' }}>
                    {column.label}
                  </h3>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <span className="analytics-question-type">{column.type.toUpperCase()}</span>
                  <span style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    {totalAnswered} respon
                  </span>
                </div>
              </div>

              {options.length === 0 ? (
                <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.82rem', color: 'var(--text-muted)', padding: '8px 0' }}>
                  Belum ada respon untuk pertanyaan ini
                </div>
              ) : (
                <div className="analytics-option-list">
                  {options.slice(0, 10).map((opt) => (
                    <div key={opt.label} className="analytics-option-row">
                      <div className="analytics-option-meta">
                        <span style={{ overflowWrap: 'anywhere' }}>{opt.label}</span>
                        <span>
                          {opt.count} ({opt.percentage}%)
                        </span>
                      </div>
                      <div
                        className="analytics-option-meter"
                        role="meter"
                        aria-valuenow={opt.percentage}
                        aria-valuemin={0}
                        aria-valuemax={100}
                        aria-label={`${opt.label}: ${opt.percentage}%`}
                      >
                        <div
                          className="analytics-option-fill"
                          style={{ width: `${opt.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                  {options.length > 10 && (
                    <div style={{ fontFamily: 'var(--font-family-mono)', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      + {options.length - 10} opsi jawaban lainnya
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </main>
  )
}
