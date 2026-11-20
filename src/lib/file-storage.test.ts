import { describe, expect, it, vi, beforeEach } from 'vitest'

let liveDelegate: {
  $executeRaw: (...args: unknown[]) => Promise<unknown>
  $queryRaw: (...args: unknown[]) => Promise<unknown>
  $transaction: (fn: (tx: unknown) => unknown) => Promise<unknown>
} | null = null

const executeRawMock = vi.fn()
const queryRawMock = vi.fn()
const transactionMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: (...args: unknown[]) =>
      liveDelegate ? liveDelegate.$executeRaw(...args) : executeRawMock(...args),
    $queryRaw: (...args: unknown[]) =>
      liveDelegate ? liveDelegate.$queryRaw(...args) : queryRawMock(...args),
    $transaction: (fn: (tx: unknown) => unknown) =>
      liveDelegate ? liveDelegate.$transaction(fn) : transactionMock(fn),
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
  claimUploadJobs,
  markFileJobSynced,
  markFileJobFailed,
  cleanupOrphanedFiles,
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
      expect(sql).toContain("CASE WHEN status = 'PENDING_UPLOAD' THEN 'QUEUED' ELSE status END")
      expect(sql).toContain("status IN ('PENDING_UPLOAD', 'SYNCED')")
      expect(sql).toContain('submission_id IS NULL')
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

    it('successfully links files that are already SYNCED by background worker', async () => {
      // Simulates real-world race condition where background worker syncs file to MinIO
      // before user submits form, changing status from PENDING_UPLOAD to SYNCED.
      executeRawMock.mockImplementation(async (strings: TemplateStringsArray) => {
        const fullSql = Array.isArray(strings) ? strings.join('?') : String(strings)
        // Current code has: AND status = 'PENDING_UPLOAD'
        // If query only checks PENDING_UPLOAD, 0 rows match because file is already SYNCED
        if (fullSql.includes("status = 'PENDING_UPLOAD'") && !fullSql.includes("'SYNCED'")) {
          return 0
        }
        return 1
      })

      const count = await linkFilesToSubmission({
        submissionId: 'sub_synced',
        fieldId: 'field_file',
        fileIds: ['file_already_synced'],
      })
      expect(count).toBe(1)
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

  describe('claimUploadJobs', () => {
    it('clamps batchSize to max 50 (T-48-07)', async () => {
      const txQueryRaw = vi.fn().mockResolvedValue([])
      const txExecuteRaw = vi.fn().mockResolvedValue(0)
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $queryRaw: txQueryRaw, $executeRaw: txExecuteRaw }),
      )

      await claimUploadJobs(999)

      expect(txQueryRaw).toHaveBeenCalledTimes(1)
      const [, ...values] = txQueryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
      // The clamped batchSize (50) should be in the values
      expect(values).toContain(50)
    })

    it('clamps batchSize to minimum 1', async () => {
      const txQueryRaw = vi.fn().mockResolvedValue([])
      const txExecuteRaw = vi.fn().mockResolvedValue(0)
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $queryRaw: txQueryRaw, $executeRaw: txExecuteRaw }),
      )

      await claimUploadJobs(0)

      const [, ...values] = txQueryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
      expect(values).toContain(1)
    })

    it('returns empty array when no pending jobs exist', async () => {
      const txQueryRaw = vi.fn().mockResolvedValue([])
      const txExecuteRaw = vi.fn()
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $queryRaw: txQueryRaw, $executeRaw: txExecuteRaw }),
      )

      const result = await claimUploadJobs()
      expect(result).toEqual([])
      expect(txExecuteRaw).not.toHaveBeenCalled()
    })

    it('queries with FOR UPDATE SKIP LOCKED and correct status filters (T-48-05)', async () => {
      const txQueryRaw = vi.fn().mockResolvedValue([])
      const txExecuteRaw = vi.fn()
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $queryRaw: txQueryRaw, $executeRaw: txExecuteRaw }),
      )

      await claimUploadJobs(10)

      const [strings] = txQueryRaw.mock.calls[0] as [TemplateStringsArray]
      const sql = strings.join('?')
      expect(sql).toContain('FOR UPDATE SKIP LOCKED')
      expect(sql).toContain("status = 'PENDING'")
      expect(sql).toContain("NOW() AT TIME ZONE 'UTC'")
      expect(sql).toContain('LIMIT')
    })

    it('transitions claimed jobs to CLAIMED status and increments attempts', async () => {
      const rawJob = {
        job_id: 'job_1',
        file_id: 'file_1',
        payload: Buffer.from('data'),
        payload_mime: 'text/plain',
        payload_size: 4,
        attempts: 1,
        original_filename: 'file.txt',
        sanitized_filename: 'file.txt',
        mime: 'text/plain',
        size: 4,
      }

      const txQueryRaw = vi.fn().mockResolvedValue([rawJob])
      const txExecuteRaw = vi.fn().mockResolvedValue(1)
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $queryRaw: txQueryRaw, $executeRaw: txExecuteRaw }),
      )

      const result = await claimUploadJobs(10)

      expect(result).toHaveLength(1)
      expect(result[0].jobId).toBe('job_1')
      expect(result[0].fileId).toBe('file_1')

      // UPDATE should set status = 'CLAIMED' and increment attempts
      expect(txExecuteRaw).toHaveBeenCalledTimes(1)
      const [updateStrings] = txExecuteRaw.mock.calls[0] as [TemplateStringsArray]
      const updateSql = updateStrings.join('?')
      expect(updateSql).toContain("status = 'CLAIMED'")
      expect(updateSql).toContain('attempts = attempts + 1')
      expect(updateSql).toContain("NOW() AT TIME ZONE 'UTC'")
    })

    it('normalizes Uint8Array payload to Buffer', async () => {
      const rawBytes = new Uint8Array([0xca, 0xfe])
      const rawJob = {
        job_id: 'job_uint8',
        file_id: 'file_uint8',
        payload: rawBytes,
        payload_mime: 'image/png',
        payload_size: 2,
        attempts: 0,
        original_filename: 'img.png',
        sanitized_filename: 'img.png',
        mime: 'image/png',
        size: 2,
      }

      const txQueryRaw = vi.fn().mockResolvedValue([rawJob])
      const txExecuteRaw = vi.fn().mockResolvedValue(1)
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $queryRaw: txQueryRaw, $executeRaw: txExecuteRaw }),
      )

      const result = await claimUploadJobs(5)
      expect(result[0].payload).toBeInstanceOf(Buffer)
      expect(Buffer.compare(result[0].payload!, Buffer.from(rawBytes))).toBe(0)
    })
  })

  describe('markFileJobSynced', () => {
    it('runs in a transaction, sets job DONE with payload=NULL and file SYNCED (T-48-06)', async () => {
      const txExecuteRaw = vi.fn().mockResolvedValue(1)
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $executeRaw: txExecuteRaw }),
      )

      await markFileJobSynced({
        jobId: 'job_1',
        fileId: 'file_1',
        bucket: 'my-bucket',
        objectKey: 'uploads/file_1.pdf',
      })

      expect(transactionMock).toHaveBeenCalledTimes(1)
      expect(txExecuteRaw).toHaveBeenCalledTimes(2)

      // First UPDATE: file_upload_jobs
      const [jobStrings, ...jobValues] = txExecuteRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
      const jobSql = jobStrings.join('?')
      expect(jobSql).toContain('UPDATE "file_upload_jobs"')
      expect(jobSql).toContain("status = 'DONE'")
      expect(jobSql).toContain('payload = NULL')
      expect(jobSql).toContain('processed_at')
      expect(jobSql).toContain("NOW() AT TIME ZONE 'UTC'")
      expect(jobValues).toContain('job_1')

      // Second UPDATE: submission_files
      const [fileStrings, ...fileValues] = txExecuteRaw.mock.calls[1] as [TemplateStringsArray, ...unknown[]]
      const fileSql = fileStrings.join('?')
      expect(fileSql).toContain('UPDATE "submission_files"')
      expect(fileSql).toContain("status = 'SYNCED'")
      expect(fileSql).toContain('bucket')
      expect(fileSql).toContain('object_key')
      expect(fileValues).toContain('file_1')
      expect(fileValues).toContain('my-bucket')
      expect(fileValues).toContain('uploads/file_1.pdf')
    })
  })

  describe('markFileJobFailed', () => {
    it('with isTerminal=false sets job back to PENDING with backoff and records error', async () => {
      const txExecuteRaw = vi.fn().mockResolvedValue(1)
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $executeRaw: txExecuteRaw }),
      )

      const nextAttemptAt = new Date('2026-11-20T00:00:00Z')
      await markFileJobFailed({
        jobId: 'job_1',
        fileId: 'file_1',
        error: 'connection timeout',
        nextAttemptAt,
        isTerminal: false,
      })

      expect(txExecuteRaw).toHaveBeenCalledTimes(1)
      const [strings, ...values] = txExecuteRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
      const sql = strings.join('?')
      expect(sql).toContain("status = 'PENDING'")
      expect(sql).toContain('last_error')
      expect(sql).toContain('next_attempt_at')
      expect(values).toContain('job_1')
      expect(values).toContain('connection timeout')
      expect(values).toContain(nextAttemptAt)
    })

    it('with isTerminal=true marks both job and file as FAILED', async () => {
      const txExecuteRaw = vi.fn().mockResolvedValue(1)
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $executeRaw: txExecuteRaw }),
      )

      await markFileJobFailed({
        jobId: 'job_2',
        fileId: 'file_2',
        error: 'max retries exceeded',
        isTerminal: true,
      })

      expect(txExecuteRaw).toHaveBeenCalledTimes(2)

      const [jobStrings, ...jobValues] = txExecuteRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
      const jobSql = jobStrings.join('?')
      expect(jobSql).toContain("status = 'FAILED'")
      expect(jobValues).toContain('job_2')
      expect(jobValues).toContain('max retries exceeded')

      const [fileStrings, ...fileValues] = txExecuteRaw.mock.calls[1] as [TemplateStringsArray, ...unknown[]]
      const fileSql = fileStrings.join('?')
      expect(fileSql).toContain('UPDATE "submission_files"')
      expect(fileSql).toContain("status = 'FAILED'")
      expect(fileValues).toContain('file_2')
      expect(fileValues).toContain('max retries exceeded')
    })

    it('uses NOW() as default nextAttemptAt when not provided and isTerminal=false', async () => {
      const txExecuteRaw = vi.fn().mockResolvedValue(1)
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $executeRaw: txExecuteRaw }),
      )

      const before = new Date()
      await markFileJobFailed({
        jobId: 'job_3',
        fileId: 'file_3',
        error: 'timeout',
        isTerminal: false,
      })
      const after = new Date()

      const [, ...values] = txExecuteRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
      const dateVal = values.find((v) => v instanceof Date) as Date
      expect(dateVal.getTime()).toBeGreaterThanOrEqual(before.getTime())
      expect(dateVal.getTime()).toBeLessThanOrEqual(after.getTime())
    })
  })

  describe('cleanupOrphanedFiles', () => {
    it('returns zero counts when no orphans exist', async () => {
      const txQueryRaw = vi.fn().mockResolvedValue([])
      const txExecuteRaw = vi.fn()
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $queryRaw: txQueryRaw, $executeRaw: txExecuteRaw }),
      )

      const result = await cleanupOrphanedFiles()
      expect(result).toEqual({ orphanedCount: 0, purgedPayloadCount: 0 })
      expect(txExecuteRaw).not.toHaveBeenCalled()
    })

    it('queries with correct UTC interval and status conditions (T-48-08)', async () => {
      const txQueryRaw = vi.fn().mockResolvedValue([])
      const txExecuteRaw = vi.fn()
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $queryRaw: txQueryRaw, $executeRaw: txExecuteRaw }),
      )

      await cleanupOrphanedFiles(48)

      const [strings, ...values] = txQueryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
      const sql = strings.join('?')
      expect(sql).toContain('submission_id IS NULL')
      expect(sql).toContain("status = 'PENDING_UPLOAD'")
      expect(sql).toContain("NOW() AT TIME ZONE 'UTC'")
      expect(sql).toContain('interval')
      expect(values).toContain(48)
    })

    it('updates orphan files to ORPHANED and nulls their job payloads (T-48-06)', async () => {
      const txQueryRaw = vi.fn().mockResolvedValue([{ id: 'file_a' }, { id: 'file_b' }])
      const txExecuteRaw = vi.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(2)
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $queryRaw: txQueryRaw, $executeRaw: txExecuteRaw }),
      )

      const result = await cleanupOrphanedFiles(24)
      expect(result).toEqual({ orphanedCount: 2, purgedPayloadCount: 2 })

      expect(txExecuteRaw).toHaveBeenCalledTimes(2)

      // First UPDATE: submission_files -> ORPHANED
      const [sfStrings] = txExecuteRaw.mock.calls[0] as [TemplateStringsArray]
      const sfSql = sfStrings.join('?')
      expect(sfSql).toContain('UPDATE "submission_files"')
      expect(sfSql).toContain("status = 'ORPHANED'")

      // Second UPDATE: file_upload_jobs -> payload = NULL
      const [jobStrings] = txExecuteRaw.mock.calls[1] as [TemplateStringsArray]
      const jobSql = jobStrings.join('?')
      expect(jobSql).toContain('UPDATE "file_upload_jobs"')
      expect(jobSql).toContain('payload = NULL')
    })

    it('uses default maxAgeHours of 24 when called with no arguments', async () => {
      const txQueryRaw = vi.fn().mockResolvedValue([])
      const txExecuteRaw = vi.fn()
      transactionMock.mockImplementation(async (fn: (tx: unknown) => unknown) =>
        fn({ $queryRaw: txQueryRaw, $executeRaw: txExecuteRaw }),
      )

      await cleanupOrphanedFiles()

      const [, ...values] = txQueryRaw.mock.calls[0] as [TemplateStringsArray, ...unknown[]]
      expect(values).toContain(24)
    })
  })
})

// Live DB integration test — requires LIVE_DB=1 and DATABASE_URL pointing at a real PostgreSQL instance
describe.skipIf(!process.env.LIVE_DB)('file-storage live DB lifecycle', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaClient } = require('@prisma/client')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { PrismaPg } = require('@prisma/adapter-pg')
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { Pool } = require('pg')

  it('records upload -> links to submission -> claims -> marks synced -> payload is null and status SYNCED', async () => {
    const connectionString = process.env.LIVE_DATABASE_URL || process.env.DATABASE_URL
    const pool = new Pool({ connectionString })
    const adapter = new PrismaPg(pool)
    const db = new PrismaClient({ adapter })
    liveDelegate = db as unknown as typeof liveDelegate

    const { randomUUID } = await import('crypto')
    const fileId = randomUUID()
    const jobId = randomUUID()
    const submissionId = randomUUID()

    try {
      // 1. Record file upload with real Buffer payload
      const { recordFileUpload: liveRecordFileUpload } = await import('./file-storage')
      await liveRecordFileUpload({
        fileId,
        originalFilename: 'live-test.txt',
        sanitizedFilename: 'live-test.txt',
        mime: 'text/plain',
        size: 11,
        payload: Buffer.from('live test!!'),
        jobId,
      })

      // 2. Link to a submission
      const { linkFilesToSubmission: liveLinkFiles } = await import('./file-storage')
      await liveLinkFiles({ submissionId, fieldId: 'live-field', fileIds: [fileId] })

      // 3. Claim the job
      const { claimUploadJobs: liveClaimJobs } = await import('./file-storage')
      const claimed = await liveClaimJobs(1)
      expect(claimed.length).toBeGreaterThanOrEqual(1)
      const claimedJob = claimed.find((j) => j.jobId === jobId)
      expect(claimedJob).toBeDefined()
      expect(claimedJob?.payload).toBeInstanceOf(Buffer)

      // 4. Mark synced
      const { markFileJobSynced: liveMarkSynced } = await import('./file-storage')
      await liveMarkSynced({
        jobId,
        fileId,
        bucket: 'live-bucket',
        objectKey: 'live/live-test.txt',
      })

      // 5. Assert payload is null and status is SYNCED
      const jobRows = await db.$queryRaw<{ payload: Buffer | null; status: string }[]>`
        SELECT payload, status FROM "file_upload_jobs" WHERE id = ${jobId}
      `
      expect(jobRows[0]?.payload).toBeNull()
      expect(jobRows[0]?.status).toBe('DONE')

      const fileRows = await db.$queryRaw<{ status: string; bucket: string; object_key: string }[]>`
        SELECT status, bucket, object_key FROM "submission_files" WHERE id = ${fileId}
      `
      expect(fileRows[0]?.status).toBe('SYNCED')
      expect(fileRows[0]?.bucket).toBe('live-bucket')
      expect(fileRows[0]?.object_key).toBe('live/live-test.txt')
    } finally {
      liveDelegate = null
      await db.$executeRaw`DELETE FROM "file_upload_jobs" WHERE id = ${jobId}`
      await db.$executeRaw`DELETE FROM "submission_files" WHERE id = ${fileId}`
      await db.$disconnect()
      await pool.end()
    }
  })
})
