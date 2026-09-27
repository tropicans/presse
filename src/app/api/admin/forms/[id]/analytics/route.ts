import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getFormAnalytics } from '@/lib/forms'

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
  const range = url.searchParams.get('range')
  const participantType = url.searchParams.get('participantType')
  const search = url.searchParams.get('search')

  const data = await getFormAnalytics(id, {
    range,
    participantType,
    search,
  })

  if (!data) {
    return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({ data })
}
