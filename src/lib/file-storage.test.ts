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
  assertValidFileStatusTransition,
  InvalidFileStatusTransitionError,
  linkFilesToSubmission,
  getFilesBySubmissionId,
  insertFileUploadJob,
  readFileUploadPayload,
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

  describe('assertValidFileStatusTransition', () => {
    it('allows valid transitions according to D-03 lifecycle rules', () => {
      // PENDING_UPLOAD -> QUEUED
      expect(() => assertValidFileStatusTransition('PENDING_UPLOAD', 'QUEUED')).not.toThrow()
      // PENDING_UPLOAD -> ORPHANED
      expect(() => assertValidFileStatusTransition('PENDING_UPLOAD', 'ORPHANED')).not.toThrow()
      // QUEUED -> SYNCED
      expect(() => assertValidFileStatusTransition('QUEUED', 'SYNCED')).not.toThrow()
      // QUEUED -> FAILED
      expect(() => assertValidFileStatusTransition('QUEUED', 'FAILED')).not.toThrow()
    })

    it('rejects illegal transitions with InvalidFileStatusTransitionError', () => {
      // Cannot rewind SYNCED -> PENDING_UPLOAD
      expect(() => assertValidFileStatusTransition('SYNCED', 'PENDING_UPLOAD')).toThrow(
        InvalidFileStatusTransitionError,
      )
      // Cannot transition FAILED -> QUEUED
      expect(() => assertValidFileStatusTransition('FAILED', 'QUEUED')).toThrow(
        InvalidFileStatusTransitionError,
      )
      // Cannot transition ORPHANED -> SYNCED
      expect(() => assertValidFileStatusTransition('ORPHANED', 'SYNCED')).toThrow(
        InvalidFileStatusTransitionError,
      )
      // Cannot skip QUEUED directly from PENDING_UPLOAD to SYNCED
      expect(() => assertValidFileStatusTransition('PENDING_UPLOAD', 'SYNCED')).toThrow(
        InvalidFileStatusTransitionError,
      )
      // Cannot rewind QUEUED to PENDING_UPLOAD
      expect(() => assertValidFileStatusTransition('QUEUED', 'PENDING_UPLOAD')).toThrow(
        InvalidFileStatusTransitionError,
      )
    })
  })

  describe('linkFilesToSubmission', () => {
    it('returns 0 if fileIds is empty without executing query', async () => {
      const count = await linkFilesToSubmission({
        submissionId: 'sub_123',
        fieldId: 'field_abc',
        fileIds: [],
      })

      expect(count).toBe(0)
      expect(executeRawMock).not.toHaveBeenCalled()
    })

    it('atomically updates submission_files from PENDING_UPLOAD to QUEUED and returns updated count', async () => {
      executeRawMock.mockResolvedValue(2)

      const count = await linkFilesToSubmission({
        submissionId: 'sub_123',
        fieldId: 'field_abc',
        fileIds: ['file_1', 'file_2'],
      })

      expect(count).toBe(2)
      expect(executeRawMock).toHaveBeenCalledTimes(1)

      const [strings, ...values] = executeRawMock.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
      const sql = strings.join('?')
      expect(sql).toContain('UPDATE "submission_files"')
      expect(sql).toContain("status = 'QUEUED'")
      expect(sql).toContain("status = 'PENDING_UPLOAD'")
      expect(sql).toContain("NOW() AT TIME ZONE 'UTC'")
      expect(values).toContain('sub_123')
      expect(values).toContain('field_abc')
    })

    it('throws InvalidFileStatusTransitionError if not all fileIds could be transitioned from PENDING_UPLOAD', async () => {
      // Only 1 updated out of 2 requested
      executeRawMock.mockResolvedValue(1)

      await expect(
        linkFilesToSubmission({
          submissionId: 'sub_123',
          fieldId: 'field_abc',
          fileIds: ['file_1', 'file_2'],
        }),
      ).rejects.toThrow(InvalidFileStatusTransitionError)
    })
  })

  describe('getFilesBySubmissionId', () => {
    it('returns empty array when no files exist for submission', async () => {
      queryRawMock.mockResolvedValue([])

      const files = await getFilesBySubmissionId('sub_empty')
      expect(files).toEqual([])
    })

    it('maps database rows to SubmissionFileRecord sorted by created_at', async () => {
      const date1 = new Date('2026-11-16T10:00:00Z')
      const date2 = new Date('2026-11-16T10:01:00Z')

      queryRawMock.mockResolvedValue([
        {
          id: 'file_1',
          submission_id: 'sub_123',
          field_id: 'field_1',
          original_filename: 'doc1.pdf',
          sanitized_filename: 'doc1.pdf',
          mime: 'application/pdf',
          size: 1024,
          checksum: 'sha256:111',
          status: 'QUEUED',
          bucket: 'form-uploads',
          object_key: null,
          last_error: null,
          created_at: date1,
          updated_at: date1,
        },
        {
          id: 'file_2',
          submission_id: 'sub_123',
          field_id: 'field_2',
          original_filename: 'doc2.pdf',
          sanitized_filename: 'doc2.pdf',
          mime: 'application/pdf',
          size: 2048,
          checksum: null,
          status: 'SYNCED',
          bucket: 'form-uploads',
          object_key: 'files/doc2.pdf',
          last_error: null,
          created_at: date2,
          updated_at: date2,
        },
      ])

      const files = await getFilesBySubmissionId('sub_123')
      expect(files).toHaveLength(2)
      expect(files[0]).toEqual({
        id: 'file_1',
        submissionId: 'sub_123',
        fieldId: 'field_1',
        originalFilename: 'doc1.pdf',
        sanitizedFilename: 'doc1.pdf',
        mime: 'application/pdf',
        size: 1024,
        checksum: 'sha256:111',
        status: 'QUEUED',
        bucket: 'form-uploads',
        objectKey: null,
        lastError: null,
        createdAt: date1,
        updatedAt: date1,
      })

      const [strings, ...values] = queryRawMock.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
      const sql = strings.join('?')
      expect(sql).toContain('FROM "submission_files"')
      expect(sql).toContain('WHERE submission_id = ?')
      expect(sql).toContain('ORDER BY created_at ASC')
      expect(values).toContain('sub_123')
    })
  })

  describe('insertFileUploadJob and readFileUploadPayload (spool delegates)', () => {
    it('insertFileUploadJob executes raw SQL inserting job with Buffer payload', async () => {
      executeRawMock.mockResolvedValue(1)
      const payload = Buffer.from('test spool')

      await insertFileUploadJob({
        id: 'job_spool_1',
        fileId: 'file_spool_1',
        payload,
        payloadMime: 'text/plain',
        payloadSize: payload.byteLength,
      })

      expect(executeRawMock).toHaveBeenCalledTimes(1)
      const [strings, ...values] = executeRawMock.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
      const sql = strings.join('?')
      expect(sql).toContain('INSERT INTO "file_upload_jobs"')
      expect(sql).toMatch(/CURRENT_TIMESTAMP/)
      expect(values).toContain('job_spool_1')
      expect(values).toContain('file_spool_1')
    })

    it('readFileUploadPayload normalizes Uint8Array to Buffer', async () => {
      const rawBytes = new Uint8Array([1, 2, 3])
      queryRawMock.mockResolvedValue([{ payload: rawBytes, mime: 'text/plain', size: 3 }])

      const result = await readFileUploadPayload('job_spool_1')
      expect(result).not.toBeNull()
      expect(result?.payload).toBeInstanceOf(Buffer)
      expect(Buffer.compare(result!.payload!, Buffer.from(rawBytes))).toBe(0)
    })
  })
})
