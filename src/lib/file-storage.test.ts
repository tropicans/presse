import { describe, expect, it, vi, beforeEach } from 'vitest'

const executeRawMock = vi.fn()
const queryRawMock = vi.fn()
const transactionMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: (...args: unknown[]) => executeRawMock(...args),
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
    $transaction: (fn: (tx: unknown) => unknown) => transactionMock(fn),
  },
}))

import {
  recordFileUpload,
  getFileForServing,
} from './file-storage'

describe('file-storage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('recordFileUpload', () => {
    it('persists metadata in submission_files and spooled payload in file_upload_jobs in a transaction', async () => {
      const txExecuteRaw = vi.fn().mockResolvedValue(1)
      transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => {
        return callback({ $executeRaw: txExecuteRaw })
      })

      const payload = Buffer.from('hello world file content')
      const result = await recordFileUpload({
        fileId: 'file_123',
        originalFilename: 'test.pdf',
        sanitizedFilename: 'test-sanitized.pdf',
        mime: 'application/pdf',
        size: payload.byteLength,
        checksum: 'sha256:abc',
        payload,
        bucket: 'form-uploads',
        objectKey: 'submissions/123/file_123.pdf',
      })

      expect(transactionMock).toHaveBeenCalledTimes(1)
      expect(txExecuteRaw).toHaveBeenCalledTimes(2)

      // First query: submission_files
      const [sfStrings, ...sfValues] = txExecuteRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
      const sfSql = sfStrings.join('?')
      expect(sfSql).toContain('INSERT INTO "submission_files"')
      expect(sfSql).toContain('PENDING_UPLOAD')
      expect(sfSql).toContain("NOW() AT TIME ZONE 'UTC'")
      expect(sfValues).toContain('file_123')
      expect(sfValues).toContain('test.pdf')
      expect(sfValues).toContain('test-sanitized.pdf')
      expect(sfValues).toContain('application/pdf')
      expect(sfValues).toContain(payload.byteLength)
      expect(sfValues).toContain('sha256:abc')
      expect(sfValues).toContain('form-uploads')
      expect(sfValues).toContain('submissions/123/file_123.pdf')

      // Second query: file_upload_jobs
      const [jobStrings, ...jobValues] = txExecuteRaw.mock.calls[1] as [TemplateStringsArray, ...unknown[]]
      const jobSql = jobStrings.join('?')
      expect(jobSql).toContain('INSERT INTO "file_upload_jobs"')
      expect(jobSql).toContain('PENDING')
      expect(jobSql).toContain("NOW() AT TIME ZONE 'UTC'")
      expect(jobValues).toContain('file_123')
      expect(jobValues).toContain('application/pdf')
      expect(jobValues).toContain(payload.byteLength)
      const passedBuffer = jobValues.find((v) => Buffer.isBuffer(v))
      expect(passedBuffer).toBeDefined()
      expect(Buffer.compare(passedBuffer as Buffer, payload)).toBe(0)

      expect(result).toEqual({
        fileId: 'file_123',
        jobId: expect.any(String),
      })
    })

    it('honors an explicitly provided jobId', async () => {
      const txExecuteRaw = vi.fn().mockResolvedValue(1)
      transactionMock.mockImplementation(async (callback: (tx: unknown) => unknown) => {
        return callback({ $executeRaw: txExecuteRaw })
      })

      const payload = Buffer.from('data')
      const result = await recordFileUpload({
        fileId: 'file_456',
        originalFilename: 'data.txt',
        sanitizedFilename: 'data.txt',
        mime: 'text/plain',
        size: 4,
        payload,
        jobId: 'custom_job_id',
      })

      expect(result.jobId).toBe('custom_job_id')
      const [, ...jobValues] = txExecuteRaw.mock.calls[1] as [TemplateStringsArray, ...unknown[]]
      expect(jobValues).toContain('custom_job_id')
    })
  })

  describe('getFileForServing', () => {
    it('returns null when the file does not exist', async () => {
      queryRawMock.mockResolvedValue([])

      const result = await getFileForServing('missing_id')
      expect(result).toBeNull()
    })

    it('returns metadata and normalizes Uint8Array spool payload to Buffer', async () => {
      const rawBytes = new Uint8Array([0xde, 0xad, 0xbe, 0xef])
      queryRawMock.mockResolvedValue([
        {
          id: 'file_789',
          submission_id: 'sub_1',
          field_id: 'field_1',
          original_filename: 'receipt.pdf',
          sanitized_filename: 'receipt.pdf',
          mime: 'application/pdf',
          size: 4,
          status: 'PENDING_UPLOAD',
          bucket: 'form-uploads',
          object_key: 'files/receipt.pdf',
          spool_payload: rawBytes,
        },
      ])

      const result = await getFileForServing('file_789')
      expect(result).not.toBeNull()
      expect(result?.fileId).toBe('file_789')
      expect(result?.submissionId).toBe('sub_1')
      expect(result?.fieldId).toBe('field_1')
      expect(result?.originalFilename).toBe('receipt.pdf')
      expect(result?.sanitizedFilename).toBe('receipt.pdf')
      expect(result?.mime).toBe('application/pdf')
      expect(result?.size).toBe(4)
      expect(result?.status).toBe('PENDING_UPLOAD')
      expect(result?.bucket).toBe('form-uploads')
      expect(result?.objectKey).toBe('files/receipt.pdf')
      expect(result?.payload).toBeInstanceOf(Buffer)
      expect(Buffer.compare(result!.payload!, Buffer.from(rawBytes))).toBe(0)
    })

    it('handles files already synced to object storage where spool payload is null', async () => {
      queryRawMock.mockResolvedValue([
        {
          id: 'file_synced',
          submission_id: 'sub_1',
          field_id: 'field_1',
          original_filename: 'receipt.pdf',
          sanitized_filename: 'receipt.pdf',
          mime: 'application/pdf',
          size: 4,
          status: 'SYNCED',
          bucket: 'form-uploads',
          object_key: 'files/receipt.pdf',
          spool_payload: null,
        },
      ])

      const result = await getFileForServing('file_synced')
      expect(result).not.toBeNull()
      expect(result?.status).toBe('SYNCED')
      expect(result?.payload).toBeNull()
      expect(result?.bucket).toBe('form-uploads')
      expect(result?.objectKey).toBe('files/receipt.pdf')
    })
  })
})
