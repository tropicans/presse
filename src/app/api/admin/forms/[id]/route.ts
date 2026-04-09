import { NextRequest, NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { deleteAdminForm, FormSubmissionError, getAdminFormDetail, updateAdminForm } from '@/lib/forms'

interface RouteContext {
  params: Promise<{
    id: string
  }>
}

export async function GET(_: NextRequest, context: RouteContext) {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await context.params
  const form = await getAdminFormDetail(id)

  if (!form) {
    return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({ data: form })
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const body = await request.json()
    const form = await updateAdminForm(id, body)

    return NextResponse.json({ data: form })
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Error updating admin form:', error)
    return NextResponse.json({ error: 'Gagal memperbarui form' }, { status: 500 })
  }
}

export async function DELETE(_: NextRequest, context: RouteContext) {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await context.params
    const form = await deleteAdminForm(id)

    return NextResponse.json({ data: form })
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Error deleting admin form:', error)
    return NextResponse.json({ error: 'Gagal menghapus form' }, { status: 500 })
  }
}
