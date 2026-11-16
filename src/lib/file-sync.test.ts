import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const claimUploadJobsMock = vi.fn()
const markFileJobSyncedMock = vi.fn()
const markFileJobFailedMock = vi.fn()
const cleanupOrphanedFilesMock = vi.fn()

vi.mock('@/lib/file-storage', () => ({
  claimUploadJobs: (...args: unknown[]) => claimUploadJobsMock(...args),
  markFileJobSynced: (...args: unknown[]) => markFileJobSyncedMock(...args),
  markFileJobFailed: (...args: unknown[]) => markFileJobFailedMock(...args),
  cleanupOrphanedFiles: (...args: unknown[]) => cleanupOrphanedFilesMock(...args),
}))

const putObjectMock = vi.fn()
const buildObjectKeyMock = vi.fn((fileId: string) => `files/${fileId}`)
const getBucketMock = vi.fn(() => 'test-bucket')

vi.mock('@/lib/storage', () => ({
  putObject: (...args: unknown[]) => putObjectMock(...args),
  buildObjectKey: (fileId: string) => buildObjectKeyMock(fileId),
  getBucket: () => getBucketMock(),
}))

import { processQueuedFileUploadJobs } from './file-sync'
import { POST } from '@/app/api/internal/file-jobs/process/route'

describe('file-sync engine (Phase 50)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    cleanupOrphanedFilesMock.mockResolvedValue({ orphanedCount: 0, purgedPayloadCount: 0 })
  })

  it('processes and syncs pending file upload jobs successfully', async () => {
    const payload = Buffer.from('test bytes')
    claimUploadJobsMock.mockResolvedValue([
      {
        jobId: 'job-1',
        fileId: 'file-1',
        payload,
        payloadMime: 'image/png',
        payloadSize: payload.byteLength,
        attempts: 1,
        originalFilename: 'test.png',
        sanitizedFilename: 'test.png',
        mime: 'image/png',
        size: payload.byteLength,
      },
    ])
    putObjectMock.mockResolvedValue(undefined)
    markFileJobSyncedMock.mockResolvedValue(undefined)

    const result = await processQueuedFileUploadJobs(10, true)

    expect(result.claimed).toBe(1)
    expect(result.synced).toBe(1)
    expect(result.failed).toBe(0)
    expect(result.retried).toBe(0)

    expect(putObjectMock).toHaveBeenCalledWith('files/file-1', payload, 'image/png')
    expect(markFileJobSyncedMock).toHaveBeenCalledWith({
      jobId: 'job-1',
      fileId: 'file-1',
      bucket: 'test-bucket',
      objectKey: 'files/file-1',
    })
    expect(cleanupOrphanedFilesMock).toHaveBeenCalledWith(24)
  })

  it('schedules retry with exponential backoff on transient upload failure', async () => {
    const payload = Buffer.from('test bytes')
    claimUploadJobsMock.mockResolvedValue([
      {
        jobId: 'job-2',
        fileId: 'file-2',
        payload,
        payloadMime: 'application/pdf',
        payloadSize: payload.byteLength,
        attempts: 2, // 2nd attempt
        originalFilename: 'doc.pdf',
        sanitizedFilename: 'doc.pdf',
        mime: 'application/pdf',
        size: payload.byteLength,
      },
    ])
    putObjectMock.mockRejectedValue(new Error('Connection timeout'))
    markFileJobFailedMock.mockResolvedValue(undefined)

    const result = await processQueuedFileUploadJobs(10, false)

    expect(result.claimed).toBe(1)
    expect(result.synced).toBe(0)
    expect(result.retried).toBe(1)
    expect(result.failed).toBe(0)

    expect(markFileJobFailedMock).toHaveBeenCalledWith({
      jobId: 'job-2',
      fileId: 'file-2',
      error: 'Connection timeout',
      nextAttemptAt: expect.any(Date),
      isTerminal: false,
    })
  })

  it('marks job as terminal FAILED when attempts reach 5', async () => {
    const payload = Buffer.from('test bytes')
    claimUploadJobsMock.mockResolvedValue([
      {
        jobId: 'job-3',
        fileId: 'file-3',
        payload,
        payloadMime: 'image/jpeg',
        payloadSize: payload.byteLength,
        attempts: 5, // 5th attempt - terminal!
        originalFilename: 'photo.jpg',
        sanitizedFilename: 'photo.jpg',
        mime: 'image/jpeg',
        size: payload.byteLength,
      },
    ])
    putObjectMock.mockRejectedValue(new Error('Persistent 500 error'))
    markFileJobFailedMock.mockResolvedValue(undefined)

    const result = await processQueuedFileUploadJobs(10, false)

    expect(result.claimed).toBe(1)
    expect(result.synced).toBe(0)
    expect(result.failed).toBe(1)
    expect(result.retried).toBe(0)

    expect(markFileJobFailedMock).toHaveBeenCalledWith({
      jobId: 'job-3',
      fileId: 'file-3',
      error: expect.stringContaining('5 percobaan'),
      isTerminal: true,
    })
  })

  it('sweeps orphaned unlinked uploads older than 24 hours', async () => {
    claimUploadJobsMock.mockResolvedValue([])
    cleanupOrphanedFilesMock.mockResolvedValue({ orphanedCount: 3, purgedPayloadCount: 3 })

    const result = await processQueuedFileUploadJobs(10, true)

    expect(result.orphanedCount).toBe(3)
    expect(result.purgedPayloadCount).toBe(3)
    expect(cleanupOrphanedFilesMock).toHaveBeenCalledWith(24)
  })
})

describe('POST /api/internal/file-jobs/process', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.INTERNAL_WORKER_TOKEN = 'test-worker-secret'
  })

  it('rejects request without valid worker token', async () => {
    const req = new NextRequest('http://localhost:3456/api/internal/file-jobs/process', {
      method: 'POST',
      headers: {
        'x-worker-token': 'wrong-token',
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('accepts request with valid worker token and runs file jobs', async () => {
    claimUploadJobsMock.mockResolvedValue([])
    cleanupOrphanedFilesMock.mockResolvedValue({ orphanedCount: 0, purgedPayloadCount: 0 })

    const req = new NextRequest('http://localhost:3456/api/internal/file-jobs/process?batch=15', {
      method: 'POST',
      headers: {
        'x-worker-token': 'test-worker-secret',
      },
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json).toHaveProperty('claimed')
    expect(json).toHaveProperty('synced')
    expect(claimUploadJobsMock).toHaveBeenCalledWith(15)
  })
})
