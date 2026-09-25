import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import {
  deleteAdminFormSubmission,
  FormSubmissionError,
  listAdminFormSubmissions,
  normalizeAdminSubmissionFilters,
  normalizeAdminSubmissionPagination,
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

  const { id } = await context.params
  const url = new URL(request.url)
  const participantType = url.searchParams.get('participantType')
  const quizStatus = url.searchParams.get('quizStatus')
  const sortBy = url.searchParams.get('sortBy')
  const page = Number(url.searchParams.get('page'))
  const pageSize = Number(url.searchParams.get('pageSize'))
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
  const data = await listAdminFormSubmissions(
    id,
    normalizeAdminSubmissionFilters({
      participantType: normalizedParticipantType,
      quizStatus: normalizedQuizStatus,
      sortBy: normalizedSortBy,
    }),
    normalizeAdminSubmissionPagination({ page, pageSize })
  )

  if (!data) {
    return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({ data })
}

export async function DELETE(request: Request, context: RouteContext) {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const url = new URL(request.url)
    const submissionIdParam = url.searchParams.get('submissionId')?.trim()

    if (!submissionIdParam) {
      return NextResponse.json({ error: 'submissionId wajib diisi' }, { status: 400 })
    }

    const submissionIds = submissionIdParam.split(',').map((s) => s.trim()).filter(Boolean)
    if (submissionIds.length === 0) {
      return NextResponse.json({ error: 'submissionId tidak valid' }, { status: 400 })
    }

    for (const subId of submissionIds) {
      await deleteAdminFormSubmission(id, subId)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Error deleting submission:', error)
    return NextResponse.json({ error: 'Gagal menghapus submission' }, { status: 500 })
  }
}
