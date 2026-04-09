import { NextRequest, NextResponse } from 'next/server'
import { processQueuedSubmissionJobs } from '@/lib/forms'

const DEFAULT_BATCH_SIZE = 25

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-worker-token')?.trim()
  const expectedToken = process.env.INTERNAL_WORKER_TOKEN?.trim()

  if (!expectedToken || token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batchParam = request.nextUrl.searchParams.get('batch')
  const batchSize = batchParam ? Number(batchParam) : DEFAULT_BATCH_SIZE

  const result = await processQueuedSubmissionJobs(batchSize)
  return NextResponse.json(result)
}
