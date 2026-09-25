import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { createAdminForm, FormSubmissionError, listAdminForms } from '@/lib/forms'

export async function GET() {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const forms = await listAdminForms()
  return NextResponse.json({ data: forms })
}

export async function POST(request: Request) {
  const session = await getAdminSession()

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const title = typeof body.title === 'string' ? body.title : ''
    const form = await createAdminForm(title)

    return NextResponse.json({ data: form }, { status: 201 })
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Error creating form:', error)
    return NextResponse.json({ error: 'Gagal membuat form' }, { status: 500 })
  }
}
