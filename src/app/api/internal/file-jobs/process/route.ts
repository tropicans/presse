import { NextRequest, NextResponse } from 'next/server'
import { processQueuedFileUploadJobs } from '@/lib/file-sync'
import { readRequiredEnv } from '@/lib/env'

const DEFAULT_BATCH_SIZE = 10

export async function POST(request: NextRequest) {
  const token = request.headers.get('x-worker-token')?.trim()
  const expectedToken = readRequiredEnv(process.env, 'INTERNAL_WORKER_TOKEN')

  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const batchParam = request.nextUrl.searchParams.get('batch')
  const batchSize = batchParam ? Number(batchParam) : DEFAULT_BATCH_SIZE

  const result = await processQueuedFileUploadJobs(batchSize)
  return NextResponse.json(result)
}
