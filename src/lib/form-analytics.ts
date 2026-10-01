export interface SubmissionColumn {
  id: string
  name: string
  label: string
  type: string
}

export interface SubmissionItem {
  id: string
  createdAt: string
  answers: Record<string, string>
  meta?: {
    participantType?: 'internal' | 'external' | null
    quiz?: {
      score?: number
      maxScore?: number
      correctAnswers?: number
      totalQuestions?: number
      passingScore?: number
      passed?: boolean
    } | null
  } | null
}

export type DateRangeFilter = '7d' | '30d' | 'month' | 'all'
export type ParticipantFilter = 'all' | 'internal' | 'external'

export function filterSubmissions(
  items: SubmissionItem[],
  dateRange: DateRangeFilter = 'all',
  participantType: ParticipantFilter = 'all',
  searchQuery = '',
  referenceDate: Date = new Date()
): SubmissionItem[] {
  let startDate: Date | null = null

  if (dateRange === '7d') {
    startDate = new Date(referenceDate)
    startDate.setDate(referenceDate.getDate() - 7)
    startDate.setHours(0, 0, 0, 0)
  } else if (dateRange === '30d') {
    startDate = new Date(referenceDate)
    startDate.setDate(referenceDate.getDate() - 30)
    startDate.setHours(0, 0, 0, 0)
  } else if (dateRange === 'month') {
    startDate = new Date(referenceDate.getFullYear(), referenceDate.getMonth(), 1)
    startDate.setHours(0, 0, 0, 0)
  }

  return items.filter((item) => {
    // Date filter
    if (startDate) {
      const itemDate = new Date(item.createdAt)
      if (itemDate < startDate) return false
    }

    // Participant filter
    if (participantType !== 'all') {
      if (item.meta?.participantType !== participantType) return false
    }

    // Search query across answers and ID
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      const matchesAnswer = Object.values(item.answers || {}).some(
        (val) => typeof val === 'string' && val.toLowerCase().includes(query)
      )
      const matchesId = item.id.toLowerCase().includes(query)
      if (!matchesAnswer && !matchesId) return false
    }

    return true
  })
}

export function computeAnalyticsKPIs(
  items: SubmissionItem[],
  totalItems: number,
  hasQuiz: boolean
) {
  const totalResponses = items.length

  let averageQuizScore: string | null = null
  let quizPassRate: string | null = null

  if (hasQuiz) {
    const quizSubmissions = items.filter((i) => i.meta?.quiz)
    if (quizSubmissions.length > 0) {
      const totalScore = quizSubmissions.reduce(
        (acc, curr) => acc + (curr.meta?.quiz?.score || 0),
        0
      )
      averageQuizScore = (totalScore / quizSubmissions.length).toFixed(1)

      const passedCount = quizSubmissions.filter((i) => i.meta?.quiz?.passed).length
      quizPassRate = ((passedCount / quizSubmissions.length) * 100).toFixed(1)
    }
  }

  let latestResponseTime = '-'
  if (items.length > 0) {
    const latest = items[0]
    const date = new Date(latest.createdAt)
    latestResponseTime = date.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return {
    totalResponses,
    totalItems,
    averageQuizScore,
    quizPassRate,
    latestResponseTime
  }
}

export function computeDailyVolume(items: SubmissionItem[]) {
  const countsByDay: Record<string, number> = {}

  items.forEach((item) => {
    const dateKey = item.createdAt.slice(0, 10)
    countsByDay[dateKey] = (countsByDay[dateKey] || 0) + 1
  })

  const sortedDays = Object.keys(countsByDay).sort()
  const maxVal = Math.max(...Object.values(countsByDay), 1)

  return sortedDays.map((day) => ({
    day,
    count: countsByDay[day],
    heightPercent: Math.max(8, Math.round((countsByDay[day] / maxVal) * 100)),
    formattedDay: new Date(day).toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short'
    })
  }))
}

export function computeQuestionDistributions(
  columns: SubmissionColumn[],
  items: SubmissionItem[]
) {
  return columns.map((col) => {
    const optionCounts: Record<string, number> = {}
    let totalAnswered = 0

    items.forEach((item) => {
      const answer = item.answers?.[col.name]
      if (answer !== undefined && answer !== null && answer !== '') {
        totalAnswered++
        const choices = answer.includes(',') ? answer.split(',').map((s) => s.trim()) : [answer]
        choices.forEach((choice) => {
          if (choice) {
            let label = choice
            if (col.type === 'checkbox') {
              const lower = choice.toLowerCase()
              if (choice === 'true' || choice === '1' || lower === 'setuju' || lower === 'ya') {
                label = 'Disetujui'
              }
            }
            optionCounts[label] = (optionCounts[label] || 0) + 1
          }
        })
      }
    })

    const totalChoices = Object.values(optionCounts).reduce((a, b) => a + b, 0)
    const optionsSorted = Object.entries(optionCounts)
      .map(([label, count]) => ({
        label,
        count,
        percentage: totalChoices > 0 ? Math.round((count / totalChoices) * 100) : 0
      }))
      .sort((a, b) => b.count - a.count)

    return {
      column: col,
      totalAnswered,
      options: optionsSorted
    }
  })
}
