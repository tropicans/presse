import { randomUUID } from 'crypto'
import { prisma } from './prisma'

export type FileStatus = 'PENDING_UPLOAD' | 'QUEUED' | 'SYNCED' | 'FAILED' | 'ORPHANED'
export type FileUploadJobStatus = 'PENDING' | 'CLAIMED' | 'DONE' | 'FAILED'

export class InvalidFileStatusTransitionError extends Error {
  constructor(current: string, next: string, reason?: string) {
    super(
      reason ??
        `Invalid file status transition from '${current}' to '${next}'. Allowed transitions: ${
          JSON.stringify(VALID_FILE_STATUS_TRANSITIONS[current as FileStatus] ?? [])
        }`,
    )
    this.name = 'InvalidFileStatusTransitionError'
  }
}

export const VALID_FILE_STATUS_TRANSITIONS: Record<FileStatus, readonly FileStatus[]> = {
  PENDING_UPLOAD: ['QUEUED', 'ORPHANED'],
  QUEUED: ['SYNCED', 'FAILED'],
  SYNCED: [],
  FAILED: [],
  ORPHANED: [],
}

export function assertValidFileStatusTransition(current: FileStatus, next: FileStatus): void {
  const allowed = VALID_FILE_STATUS_TRANSITIONS[current] ?? []
  if (!allowed.includes(next)) {
    throw new InvalidFileStatusTransitionError(current, next)
  }
}

export interface SubmissionFileRecord {
  id: string
  submissionId: string | null
  fieldId: string | null
  originalFilename: string
  sanitizedFilename: string
  mime: string
  size: number
  checksum: string | null
  status: FileStatus
  bucket: string | null
  objectKey: string | null
  lastError: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ServingFileResult {
  fileId: string
  submissionId: string | null
  fieldId: string | null
  originalFilename: string
  sanitizedFilename: string
  mime: string
  size: number
  status: FileStatus
  bucket: string | null
  objectKey: string | null
  payload: Buffer | null
}

export interface RecordFileUploadInput {
  fileId: string
  originalFilename: string
  sanitizedFilename: string
  mime: string
  size: number
  checksum?: string | null
  payload: Buffer
  bucket?: string | null
  objectKey?: string | null
  jobId?: string
}

export interface RecordFileUploadResult {
  fileId: string
  jobId: string
}

export async function recordFileUpload(
  input: RecordFileUploadInput,
): Promise<RecordFileUploadResult> {
  const jobId = input.jobId ?? randomUUID()

  // D-01 & D-02: Atomic transaction creating submission_files and file_upload_jobs
  // D-05: Unified UTC timestamp convention NOW() AT TIME ZONE 'UTC'
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO "submission_files" (
        id,
        submission_id,
        field_id,
        original_filename,
        sanitized_filename,
        mime,
        size,
        checksum,
        status,
        bucket,
        object_key,
        last_error,
        created_at,
        updated_at
      ) VALUES (
        ${input.fileId},
        NULL,
        NULL,
        ${input.originalFilename},
        ${input.sanitizedFilename},
        ${input.mime},
        ${input.size},
        ${input.checksum ?? null},
        'PENDING_UPLOAD',
        ${input.bucket ?? null},
        ${input.objectKey ?? null},
        NULL,
        NOW() AT TIME ZONE 'UTC',
        NOW() AT TIME ZONE 'UTC'
      )
    `

    await tx.$executeRaw`
      INSERT INTO "file_upload_jobs" (
        id,
        file_id,
        payload,
        payload_mime,
        payload_size,
        status,
        attempts,
        next_attempt_at,
        last_error,
        object_key,
        processed_at,
        created_at,
        updated_at
      ) VALUES (
        ${jobId},
        ${input.fileId},
        ${input.payload},
        ${input.mime},
        ${input.size},
        'PENDING',
        0,
        NOW() AT TIME ZONE 'UTC',
        NULL,
        ${input.objectKey ?? null},
        NULL,
        NOW() AT TIME ZONE 'UTC',
        NOW() AT TIME ZONE 'UTC'
      )
    `
  })

  return {
    fileId: input.fileId,
    jobId,
  }
}

interface RawServingRow {
  id: string
  submission_id: string | null
  field_id: string | null
  original_filename: string
  sanitized_filename: string
  mime: string
  size: number
  status: string
  bucket: string | null
  object_key: string | null
  spool_payload: Uint8Array | Buffer | null
}

export async function getFileForServing(fileId: string): Promise<ServingFileResult | null> {
  const rows = await prisma.$queryRaw<RawServingRow[]>`
    SELECT
      sf.id,
      sf.submission_id,
      sf.field_id,
      sf.original_filename,
      sf.sanitized_filename,
      sf.mime,
      sf.size,
      sf.status,
      sf.bucket,
      sf.object_key,
      j.payload AS spool_payload
    FROM "submission_files" sf
    LEFT JOIN "file_upload_jobs" j ON j.file_id = sf.id
    WHERE sf.id = ${fileId}
    ORDER BY j.created_at DESC NULLS LAST
    LIMIT 1
  `

  const row = rows[0]
  if (!row) {
    return null
  }

  // D-04: Normalize Uint8Array from PrismaPg adapter to Node Buffer
  let payloadBuffer: Buffer | null = null
  if (row.spool_payload) {
    if (Buffer.isBuffer(row.spool_payload)) {
      payloadBuffer = row.spool_payload
    } else if (row.spool_payload instanceof Uint8Array) {
      payloadBuffer = Buffer.from(
        row.spool_payload.buffer,
        row.spool_payload.byteOffset,
        row.spool_payload.byteLength,
      )
    } else {
      payloadBuffer = Buffer.from(row.spool_payload)
    }
  }

  return {
    fileId: row.id,
    submissionId: row.submission_id,
    fieldId: row.field_id,
    originalFilename: row.original_filename,
    sanitizedFilename: row.sanitized_filename,
    mime: row.mime,
    size: Number(row.size),
    status: row.status as FileStatus,
    bucket: row.bucket,
    objectKey: row.object_key,
    payload: payloadBuffer,
  }
}

export interface LinkFilesToSubmissionInput {
  submissionId: string
  fieldId: string
  fileIds: string[]
}

export async function linkFilesToSubmission(
  input: LinkFilesToSubmissionInput,
): Promise<number> {
  if (!input.fileIds || input.fileIds.length === 0) {
    return 0
  }

  // D-02 & D-03: Atomically update matching submission_files from PENDING_UPLOAD to QUEUED
  const updatedCount = await prisma.$executeRaw`
    UPDATE "submission_files"
    SET
      submission_id = ${input.submissionId},
      field_id = ${input.fieldId},
      status = 'QUEUED',
      updated_at = NOW() AT TIME ZONE 'UTC'
    WHERE id = ANY(${input.fileIds})
      AND status = 'PENDING_UPLOAD'
  `

  if (updatedCount !== input.fileIds.length) {
    throw new InvalidFileStatusTransitionError(
      'PENDING_UPLOAD',
      'QUEUED',
      `Cannot link files: expected to link ${input.fileIds.length} files from PENDING_UPLOAD, but ${updatedCount} files matched.`,
    )
  }

  return updatedCount
}

interface RawSubmissionFileRow {
  id: string
  submission_id: string | null
  field_id: string | null
  original_filename: string
  sanitized_filename: string
  mime: string
  size: number
  checksum: string | null
  status: string
  bucket: string | null
  object_key: string | null
  last_error: string | null
  created_at: Date
  updated_at: Date
}

export async function getFilesBySubmissionId(
  submissionId: string,
): Promise<SubmissionFileRecord[]> {
  const rows = await prisma.$queryRaw<RawSubmissionFileRow[]>`
    SELECT
      id,
      submission_id,
      field_id,
      original_filename,
      sanitized_filename,
      mime,
      size,
      checksum,
      status,
      bucket,
      object_key,
      last_error,
      created_at,
      updated_at
    FROM "submission_files"
    WHERE submission_id = ${submissionId}
    ORDER BY created_at ASC
  `

  return rows.map((row) => ({
    id: row.id,
    submissionId: row.submission_id,
    fieldId: row.field_id,
    originalFilename: row.original_filename,
    sanitizedFilename: row.sanitized_filename,
    mime: row.mime,
    size: Number(row.size),
    checksum: row.checksum,
    status: row.status as FileStatus,
    bucket: row.bucket,
    objectKey: row.object_key,
    lastError: row.last_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }))
}

export interface InsertFileUploadJobInput {
  id: string
  fileId: string
  payload: Buffer
  payloadMime: string
  payloadSize: number
}

export async function insertFileUploadJob(input: InsertFileUploadJobInput): Promise<void> {
  await prisma.$executeRaw`
    INSERT INTO "file_upload_jobs" (
      id,
      file_id,
      payload,
      payload_mime,
      payload_size,
      status,
      attempts,
      next_attempt_at,
      created_at,
      updated_at
    ) VALUES (
      ${input.id},
      ${input.fileId},
      ${input.payload},
      ${input.payloadMime},
      ${input.payloadSize},
      'PENDING',
      0,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP,
      CURRENT_TIMESTAMP
    )
  `
}

export interface ClaimedJobRow {
  jobId: string
  fileId: string
  payload: Buffer | null
  payloadMime: string
  payloadSize: number
  attempts: number
  originalFilename: string
  sanitizedFilename: string
  mime: string
  size: number
}

// T-48-07: Clamp batchSize to prevent unbounded buffer allocation
const MAX_CLAIM_BATCH = 50

interface RawClaimedJobRow {
  job_id: string
  file_id: string
  payload: Uint8Array | Buffer | null
  payload_mime: string
  payload_size: number
  attempts: number
  original_filename: string
  sanitized_filename: string
  mime: string
  size: number
}

function normalizePayload(raw: Uint8Array | Buffer | null): Buffer | null {
  if (!raw) return null
  if (Buffer.isBuffer(raw)) return raw
  if (raw instanceof Uint8Array) {
    return Buffer.from(raw.buffer, raw.byteOffset, raw.byteLength)
  }
  return Buffer.from(raw)
}

// T-48-05: SELECT ... FOR UPDATE SKIP LOCKED ensures race-free concurrent claiming
export async function claimUploadJobs(batchSize: number = 10): Promise<ClaimedJobRow[]> {
  const clampedBatchSize = Math.max(1, Math.min(batchSize, MAX_CLAIM_BATCH))

  return prisma.$transaction(async (tx) => {
    const rows = await tx.$queryRaw<RawClaimedJobRow[]>`
      SELECT
        j.id AS job_id,
        j.file_id,
        j.payload,
        j.payload_mime,
        j.payload_size,
        j.attempts,
        sf.original_filename,
        sf.sanitized_filename,
        sf.mime,
        sf.size
      FROM "file_upload_jobs" j
      JOIN "submission_files" sf ON sf.id = j.file_id
      WHERE j.status = 'PENDING'
        AND j.next_attempt_at <= NOW() AT TIME ZONE 'UTC'
      FOR UPDATE SKIP LOCKED
      LIMIT ${clampedBatchSize}
    `

    if (rows.length === 0) return []

    const jobIds = rows.map((r) => r.job_id)

    await tx.$executeRaw`
      UPDATE "file_upload_jobs"
      SET
        status = 'CLAIMED',
        attempts = attempts + 1,
        updated_at = NOW() AT TIME ZONE 'UTC'
      WHERE id = ANY(${jobIds})
    `

    return rows.map((row) => ({
      jobId: row.job_id,
      fileId: row.file_id,
      payload: normalizePayload(row.payload),
      payloadMime: row.payload_mime,
      payloadSize: Number(row.payload_size),
      attempts: Number(row.attempts),
      originalFilename: row.original_filename,
      sanitizedFilename: row.sanitized_filename,
      mime: row.mime,
      size: Number(row.size),
    }))
  })
}

// T-48-06: Set payload = NULL on DONE to reclaim database storage
export async function markFileJobSynced(params: {
  jobId: string
  fileId: string
  bucket: string
  objectKey: string
}): Promise<void> {
  const { jobId, fileId, bucket, objectKey } = params

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE "file_upload_jobs"
      SET
        status = 'DONE',
        payload = NULL,
        processed_at = NOW() AT TIME ZONE 'UTC',
        updated_at = NOW() AT TIME ZONE 'UTC'
      WHERE id = ${jobId}
    `

    await tx.$executeRaw`
      UPDATE "submission_files"
      SET
        status = 'SYNCED',
        bucket = ${bucket},
        object_key = ${objectKey},
        updated_at = NOW() AT TIME ZONE 'UTC'
      WHERE id = ${fileId}
    `
  })
}

export async function markFileJobFailed(params: {
  jobId: string
  fileId: string
  error: string
  nextAttemptAt?: Date
  isTerminal: boolean
}): Promise<void> {
  const { jobId, fileId, error, nextAttemptAt, isTerminal } = params

  await prisma.$transaction(async (tx) => {
    if (!isTerminal) {
      const nextAt = nextAttemptAt ?? new Date()
      await tx.$executeRaw`
        UPDATE "file_upload_jobs"
        SET
          status = 'PENDING',
          last_error = ${error},
          next_attempt_at = ${nextAt},
          updated_at = NOW() AT TIME ZONE 'UTC'
        WHERE id = ${jobId}
      `
    } else {
      await tx.$executeRaw`
        UPDATE "file_upload_jobs"
        SET
          status = 'FAILED',
          last_error = ${error},
          updated_at = NOW() AT TIME ZONE 'UTC'
        WHERE id = ${jobId}
      `

      await tx.$executeRaw`
        UPDATE "submission_files"
        SET
          status = 'FAILED',
          last_error = ${error},
          updated_at = NOW() AT TIME ZONE 'UTC'
        WHERE id = ${fileId}
      `
    }
  })
}

// T-48-08: UTC interval ensures consistent GC regardless of server timezone
export async function cleanupOrphanedFiles(
  maxAgeHours: number = 24,
): Promise<{ orphanedCount: number; purgedPayloadCount: number }> {
  return prisma.$transaction(async (tx) => {
    const orphanRows = await tx.$queryRaw<{ id: string }[]>`
      SELECT id FROM "submission_files"
      WHERE submission_id IS NULL
        AND status = 'PENDING_UPLOAD'
        AND created_at < NOW() AT TIME ZONE 'UTC' - (${maxAgeHours} || ' hours')::interval
    `

    if (orphanRows.length === 0) {
      return { orphanedCount: 0, purgedPayloadCount: 0 }
    }

    const orphanIds = orphanRows.map((r) => r.id)

    const orphanedCount = await tx.$executeRaw`
      UPDATE "submission_files"
      SET
        status = 'ORPHANED',
        updated_at = NOW() AT TIME ZONE 'UTC'
      WHERE id = ANY(${orphanIds})
    `

    const purgedPayloadCount = await tx.$executeRaw`
      UPDATE "file_upload_jobs"
      SET
        payload = NULL,
        updated_at = NOW() AT TIME ZONE 'UTC'
      WHERE file_id = ANY(${orphanIds})
    `

    return {
      orphanedCount: Number(orphanedCount),
      purgedPayloadCount: Number(purgedPayloadCount),
    }
  })
}

export interface FileUploadPayloadRow {
  payload: Buffer | null
  mime: string
  size: number
}

interface RawFileUploadPayloadRow {
  payload: Uint8Array | Buffer | null
  mime: string
  size: number
}

export async function readFileUploadPayload(jobId: string): Promise<FileUploadPayloadRow | null> {
  const rows = await prisma.$queryRaw<RawFileUploadPayloadRow[]>`
    SELECT
      payload,
      payload_mime AS mime,
      payload_size AS size
    FROM "file_upload_jobs"
    WHERE id = ${jobId}
    LIMIT 1
  `

  const row = rows[0]
  if (!row) {
    return null
  }

  let payloadBuffer: Buffer | null = null
  if (row.payload) {
    if (Buffer.isBuffer(row.payload)) {
      payloadBuffer = row.payload
    } else if (row.payload instanceof Uint8Array) {
      payloadBuffer = Buffer.from(
        row.payload.buffer,
        row.payload.byteOffset,
        row.payload.byteLength,
      )
    } else {
      payloadBuffer = Buffer.from(row.payload)
    }
  }

  return {
    payload: payloadBuffer,
    mime: row.mime,
    size: Number(row.size),
  }
}
