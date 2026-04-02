import { NextResponse } from 'next/server'
import { getPublicFormBySlug } from '@/lib/forms'

interface RouteContext {
  params: Promise<{
    slug: string
  }>
}

export async function GET(_: Request, context: RouteContext) {
  const { slug } = await context.params
  const form = await getPublicFormBySlug(slug)

  if (!form) {
    return NextResponse.json({ error: 'Form tidak ditemukan' }, { status: 404 })
  }

  return NextResponse.json({ form })
}
