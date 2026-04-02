import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { deleteAdminFormSubmission, FormSubmissionError, listAdminFormSubmissions } from '@/lib/forms'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(_: Request, context: RouteContext) {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const data = await listAdminFormSubmissions(id)

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
    const submissionId = url.searchParams.get('submissionId')?.trim()

    if (!submissionId) {
      return NextResponse.json({ error: 'submissionId wajib diisi' }, { status: 400 })
    }

    await deleteAdminFormSubmission(id, submissionId)
    return NextResponse.json({ success: true })
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Error deleting submission:', error)
    return NextResponse.json({ error: 'Gagal menghapus submission' }, { status: 500 })
  }
}
