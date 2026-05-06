import { NextResponse } from 'next/server'
import ExcelJS from 'exceljs'
import { getAdminSession } from '@/lib/auth'
import {
  exportAdminFormSubmissionsWorkbook,
  FormSubmissionError,
  normalizeAdminSubmissionFilters,
} from '@/lib/forms'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: Request, context: RouteContext) {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const url = new URL(request.url)
    const participantType = url.searchParams.get('participantType')
    const quizStatus = url.searchParams.get('quizStatus')
    const sortBy = url.searchParams.get('sortBy')
    const normalizedParticipantType =
      participantType === 'all' || participantType === 'internal' || participantType === 'external'
        ? participantType
        : undefined
    const normalizedQuizStatus =
      quizStatus === 'all' || quizStatus === 'passed' || quizStatus === 'failed' || quizStatus === 'ungraded'
        ? quizStatus
        : undefined
    const normalizedSortBy =
      sortBy === 'newest' || sortBy === 'oldest' || sortBy === 'score-desc' || sortBy === 'score-asc'
        ? sortBy
        : undefined
    const result = await exportAdminFormSubmissionsWorkbook(
      id,
      normalizeAdminSubmissionFilters({
        participantType: normalizedParticipantType,
        quizStatus: normalizedQuizStatus,
        sortBy: normalizedSortBy,
      })
    )
    const buffer = await result.workbook.xlsx.writeBuffer()

    return new NextResponse(buffer as ExcelJS.Buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
      },
    })
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Error exporting form submissions:', error)
    return NextResponse.json({ error: 'Gagal mengekspor data form' }, { status: 500 })
  }
}
