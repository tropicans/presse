import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { FormSubmissionError, normalizeAdminSubmissionFilters } from '@/lib/forms'
import { exportAdminFormFilesZip } from '@/lib/file-export'

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
    const submissionIdsParam = url.searchParams.get('submissionIds')
    const submissionIds = submissionIdsParam ? submissionIdsParam.split(',').map((s) => s.trim()).filter(Boolean) : undefined

    const result = await exportAdminFormFilesZip(
      id,
      normalizeAdminSubmissionFilters({
        participantType: normalizedParticipantType,
        quizStatus: normalizedQuizStatus,
        sortBy: normalizedSortBy,
        submissionIds: submissionIds,
      }),
    )

    if (result.totalFiles === 0 || !result.stream) {
      return NextResponse.json(
        { error: 'Tidak ada berkas yang diunggah untuk data kiriman ini.' },
        { status: 404 }
      )
    }

    return new Response(result.stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${result.filename}"`,
        'Cache-Control': 'no-store',
      },
    })
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Error exporting form files zip:', error)
    return NextResponse.json({ error: 'Gagal mengekspor berkas ZIP' }, { status: 500 })
  }
}
