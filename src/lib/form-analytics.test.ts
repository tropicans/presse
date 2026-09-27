import { describe, expect, it } from 'vitest'
import {
  computeAnalyticsKPIs,
  computeDailyVolume,
  computeQuestionDistributions,
  filterSubmissions,
  SubmissionColumn,
  SubmissionItem
} from './form-analytics'

const mockItems: SubmissionItem[] = [
  {
    id: 'sub-1',
    createdAt: '2026-09-27T10:00:00.000Z',
    answers: { sesi_favorit: 'Keamanan Data', fasilitas: 'Sangat Puas' },
    meta: {
      participantType: 'internal',
      quiz: { score: 90, maxScore: 100, correctAnswers: 9, totalQuestions: 10, passingScore: 70, passed: true }
    }
  },
  {
    id: 'sub-2',
    createdAt: '2026-09-27T11:00:00.000Z',
    answers: { sesi_favorit: 'Keamanan Data', fasilitas: 'Puas' },
    meta: {
      participantType: 'internal',
      quiz: { score: 80, maxScore: 100, correctAnswers: 8, totalQuestions: 10, passingScore: 70, passed: true }
    }
  },
  {
    id: 'sub-3',
    createdAt: '2026-09-20T09:00:00.000Z',
    answers: { sesi_favorit: 'Arsitektur Sistem', fasilitas: 'Puas' },
    meta: {
      participantType: 'external',
      quiz: { score: 60, maxScore: 100, correctAnswers: 6, totalQuestions: 10, passingScore: 70, passed: false }
    }
  },
  {
    id: 'sub-4',
    createdAt: '2026-08-15T14:00:00.000Z',
    answers: { sesi_favorit: 'Keamanan Data', fasilitas: 'Sangat Puas' },
    meta: {
      participantType: 'external',
      quiz: { score: 100, maxScore: 100, correctAnswers: 10, totalQuestions: 10, passingScore: 70, passed: true }
    }
  }
]

const mockColumns: SubmissionColumn[] = [
  { id: 'c1', name: 'sesi_favorit', label: 'Sesi Favorit', type: 'radio' },
  { id: 'c2', name: 'fasilitas', label: 'Fasilitas', type: 'likert' }
]

describe('Form Analytics Calculation Engine', () => {
  it('computes KPI summary cards correctly', () => {
    const kpis = computeAnalyticsKPIs(mockItems, 10, true)

    expect(kpis.totalResponses).toBe(4)
    expect(kpis.totalItems).toBe(10)
    // (90 + 80 + 60 + 100) / 4 = 82.5
    expect(kpis.averageQuizScore).toBe('82.5')
    // 3 passed out of 4 = 75.0%
    expect(kpis.quizPassRate).toBe('75.0')
  })

  it('filters submissions by participant type', () => {
    const internalOnly = filterSubmissions(mockItems, 'all', 'internal')
    expect(internalOnly.length).toBe(2)
    expect(internalOnly.every((i) => i.meta?.participantType === 'internal')).toBe(true)

    const externalOnly = filterSubmissions(mockItems, 'all', 'external')
    expect(externalOnly.length).toBe(2)
    expect(externalOnly.every((i) => i.meta?.participantType === 'external')).toBe(true)
  })

  it('filters submissions by date range', () => {
    const refDate = new Date('2026-09-27T12:00:00.000Z')

    // 7d should only match items from Sep 20 onwards
    const last7d = filterSubmissions(mockItems, '7d', 'all', '', refDate)
    expect(last7d.length).toBe(3)

    // 30d includes Sep 20, Sep 27
    const last30d = filterSubmissions(mockItems, '30d', 'all', '', refDate)
    expect(last30d.length).toBe(3)

    // all includes Aug 15
    const all = filterSubmissions(mockItems, 'all', 'all', '', refDate)
    expect(all.length).toBe(4)
  })

  it('filters submissions by search query', () => {
    const searchArsitektur = filterSubmissions(mockItems, 'all', 'all', 'Arsitektur')
    expect(searchArsitektur.length).toBe(1)
    expect(searchArsitektur[0].id).toBe('sub-3')
  })

  it('computes daily volume timeline grouping', () => {
    const volume = computeDailyVolume(mockItems)
    expect(volume.length).toBe(3) // 3 distinct dates: 2026-08-15, 2026-09-20, 2026-09-27

    const sep27 = volume.find((v) => v.day === '2026-09-27')
    expect(sep27?.count).toBe(2)
  })

  it('computes question choices distribution breakdown', () => {
    const dist = computeQuestionDistributions(mockColumns, mockItems)

    const sesiDist = dist.find((d) => d.column.name === 'sesi_favorit')
    expect(sesiDist?.totalAnswered).toBe(4)

    // Keamanan Data: 3 (75%)
    const optKeamanan = sesiDist?.options.find((o) => o.label === 'Keamanan Data')
    expect(optKeamanan?.count).toBe(3)
    expect(optKeamanan?.percentage).toBe(75)

    // Arsitektur Sistem: 1 (25%)
    const optArsitektur = sesiDist?.options.find((o) => o.label === 'Arsitektur Sistem')
    expect(optArsitektur?.count).toBe(1)
    expect(optArsitektur?.percentage).toBe(25)
  })

  it('handles empty submission set gracefully', () => {
    const kpis = computeAnalyticsKPIs([], 0, false)
    expect(kpis.totalResponses).toBe(0)
    expect(kpis.averageQuizScore).toBeNull()
    expect(kpis.latestResponseTime).toBe('-')

    const volume = computeDailyVolume([])
    expect(volume).toEqual([])

    const dist = computeQuestionDistributions(mockColumns, [])
    expect(dist.length).toBe(2)
    expect(dist[0].totalAnswered).toBe(0)
    expect(dist[0].options).toEqual([])
  })
})

