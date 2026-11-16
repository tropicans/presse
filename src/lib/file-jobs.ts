// Phase 46: bytea spool primitives. The worker (phase 50) owns the PENDING→CLAIMED→DONE/FAILED transitions; this module only writes and reads bytes.
import { prisma } from './prisma'

export interface InsertFileUploadJobInput {
  id: string
  fileId: string
  payload: Buffer
  payloadMime: string
  payloadSize: number
}

export async function insertFileUploadJob(input: InsertFileUploadJobInput): Promise<void> {
  // The payload is interpolated as a raw Buffer. The PrismaPg adapter maps
  // Uint8Array/Buffer to the BYTEA wire format natively — never base64 here.
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

export interface FileUploadPayloadRow {
  payload: Buffer | null
  mime: string
  size: number
}

interface RawFileUploadPayloadRow {
  payload: Uint8Array | null
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

  // @prisma/adapter-pg decodes BYTEA (pg OID 17) to Uint8Array, not Buffer.
  // Normalise here so callers always get a Buffer; bytes are never re-encoded.
  return {
    payload: row.payload ? Buffer.from(row.payload.buffer, row.payload.byteOffset, row.payload.byteLength) : null,
    mime: row.mime,
    size: row.size,
  }
}
