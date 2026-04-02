import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { exportAdminFormSubmissionsCsv, FormSubmissionError } from '@/lib/forms'

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

  try {
    const { id } = await context.params
    const result = await exportAdminFormSubmissionsCsv(id)

    return new NextResponse(result.content, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
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
