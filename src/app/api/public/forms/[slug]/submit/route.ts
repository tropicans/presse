import { NextRequest, NextResponse } from 'next/server'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { createPublicFormSubmission, FormSubmissionError } from '@/lib/forms'

const POST_RATE_LIMIT = { limit: 5, windowMs: 60_000 }

interface RouteContext {
  params: Promise<{
    slug: string
  }>
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const ip = getClientIp(request.headers)
    const rl = rateLimit(`public-form:${ip}`, POST_RATE_LIMIT)

    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan. Silakan coba lagi nanti.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(POST_RATE_LIMIT.limit),
            'X-RateLimit-Remaining': '0',
          },
        }
      )
    }

    const { slug } = await context.params
    const body = await request.json()
    const result = await createPublicFormSubmission(slug, body)

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: error.status })
    }

    console.error('Error creating public form submission:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan server. Silakan coba lagi.' },
      { status: 500 }
    )
  }
}
