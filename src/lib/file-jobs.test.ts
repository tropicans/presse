import { describe, expect, it, vi } from 'vitest'

const executeRawMock = vi.fn()
const queryRawMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $executeRaw: (...args: unknown[]) => executeRawMock(...args),
    $queryRaw: (...args: unknown[]) => queryRawMock(...args),
  },
}))

import { insertFileUploadJob, readFileUploadPayload } from './file-jobs'

describe('insertFileUploadJob', () => {
  it('calls $executeRaw exactly once and passes the payload as a Buffer', async () => {
    executeRawMock.mockReset()
    executeRawMock.mockResolvedValue(1)

    const payload = Buffer.from([0xde, 0xad, 0xbe, 0xef])

    await insertFileUploadJob({
      id: 'job_1',
      fileId: 'file_1',
      payload,
      payloadMime: 'application/pdf',
      payloadSize: payload.byteLength,
    })

    expect(executeRawMock).toHaveBeenCalledTimes(1)

    const args = executeRawMock.mock.calls[0] as unknown[]
    const values = args.slice(1)

    const bufferArg = values.find((value) => Buffer.isBuffer(value))
    expect(bufferArg).toBeInstanceOf(Buffer)
    expect(Buffer.compare(bufferArg as Buffer, payload)).toBe(0)
  })

  it('passes PENDING, 0 and CURRENT_TIMESTAMP literals for status/attempts/next_attempt_at', async () => {
    executeRawMock.mockReset()
    executeRawMock.mockResolvedValue(1)

    await insertFileUploadJob({
      id: 'job_1',
      fileId: 'file_1',
      payload: Buffer.from([1]),
      payloadMime: 'text/plain',
      payloadSize: 1,
    })

    const args = executeRawMock.mock.calls[0] as unknown[]
    const strings = args[0] as TemplateStringsArray
    const sql = strings.join('?')

    // Literal tokens live in the SQL text, not as bound parameters.
    expect(sql).toMatch(/'PENDING'/)
    expect(sql).toMatch(/CURRENT_TIMESTAMP/)
    expect(sql).toMatch(/\b0\b/)
    expect(sql).toContain('"file_upload_jobs"')
    expect(sql).toContain('payload_mime')
    expect(sql).toContain('payload_size')
    expect(sql).toContain('next_attempt_at')
  })
})

describe('readFileUploadPayload', () => {
  it('returns the buffered row untouched', async () => {
    queryRawMock.mockReset()
    const storedBytes = Buffer.from([0xde, 0xad, 0xbe, 0xef])
    queryRawMock.mockResolvedValue([{ payload: storedBytes, mime: 'application/pdf', size: 4 }])

    const row = await readFileUploadPayload('job_1')

    expect(row).not.toBeNull()
    expect(row?.payload).toBeInstanceOf(Buffer)
    expect(Buffer.compare(row!.payload!, storedBytes)).toBe(0)
    expect(row?.mime).toBe('application/pdf')
    expect(row?.size).toBe(4)
  })

  it('normalises a Uint8Array payload to a Buffer without changing bytes', async () => {
    queryRawMock.mockReset()
    const storedBytes = new Uint8Array([9, 8, 7])
    queryRawMock.mockResolvedValue([{ payload: storedBytes, mime: 'text/plain', size: 3 }])

    const row = await readFileUploadPayload('job_2')

    expect(row?.payload).toBeInstanceOf(Buffer)
    expect(Buffer.compare(row!.payload!, Buffer.from([9, 8, 7]))).toBe(0)
  })

  it('returns null when no row exists', async () => {
    queryRawMock.mockReset()
    queryRawMock.mockResolvedValue([])

    expect(await readFileUploadPayload('missing')).toBeNull()
  })
})

describe.skipIf(!process.env.LIVE_DB)('readFileUploadPayload (live DB)', () => {
  it('round-trips Buffer.from([1,2,3]) byte-for-byte', async () => {
    // vitest.config.ts pins DATABASE_URL to a stub, so the live block takes the
    // real connection string from LIVE_DATABASE_URL instead.
    if (process.env.LIVE_DATABASE_URL) {
      process.env.DATABASE_URL = process.env.LIVE_DATABASE_URL
    }

    // The live block bypasses the module mock by importing the real prisma client.
    const connectionString = process.env.LIVE_DATABASE_URL
    if (!connectionString) {
      throw new Error('LIVE_DB=1 requires LIVE_DATABASE_URL')
    }

    // The module-level vi.mock('@/lib/prisma') intercepts the file-jobs import graph,
    // so the live case talks to PostgreSQL directly with its own client/adapter.
    const { PrismaClient } = await import('@prisma/client')
    const { PrismaPg } = await import('@prisma/adapter-pg')
    const livePrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) })

    const suffix = Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    const jobId = `live_${suffix}`
    const fileId = `live_file_${suffix}`
    const payload = Buffer.from([1, 2, 3])

    try {
      await livePrisma.$executeRaw`
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
          ${jobId},
          ${fileId},
          ${payload},
          ${'application/octet-stream'},
          ${payload.byteLength},
          'PENDING',
          0,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP,
          CURRENT_TIMESTAMP
        )
      `

      const rows = await livePrisma.$queryRaw<Array<{ payload: Uint8Array | null; mime: string; size: number }>>`
        SELECT payload, payload_mime AS mime, payload_size AS size
        FROM "file_upload_jobs"
        WHERE id = ${jobId}
        LIMIT 1
      `

      expect(rows).toHaveLength(1)
      // pg-types decodes BYTEA to Uint8Array; the bytes must still be exact.
      expect(rows[0].payload).toBeInstanceOf(Uint8Array)
      expect(Buffer.compare(Buffer.from(rows[0].payload!), payload)).toBe(0)
      expect(rows[0].size).toBe(3)
    } finally {
      await livePrisma.$executeRaw`DELETE FROM "file_upload_jobs" WHERE id = ${jobId}`
      await livePrisma.$disconnect()
    }
  })
})
