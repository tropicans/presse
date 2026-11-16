import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: vi.fn() },
}))

vi.mock('@/lib/drive', () => ({
  getDriveState: vi.fn(),
}))

const { prisma } = await import('@/lib/prisma')
const { getDriveState } = await import('@/lib/drive')
const { checkHealth } = await import('./health')

describe('checkHealth', () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockReset()
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }])
    vi.mocked(getDriveState).mockReset()
  })

  it('returns the byte-exact {"status":"ok"} when the drive probe is healthy', async () => {
    vi.mocked(getDriveState).mockReturnValue({ state: 'ok', driveId: 'sd-1' })

    const result = await checkHealth()

    expect(JSON.stringify(result)).toBe('{"status":"ok"}')
  })

  it('returns the degraded shape when the drive probe is degraded', async () => {
    vi.mocked(getDriveState).mockReturnValue({ state: 'degraded', reason: 'HTTP 429' })

    const result = await checkHealth()

    expect(result).toEqual({
      status: 'degraded',
      drive: { state: 'degraded', reason: 'HTTP 429' },
    })
  })

  it('rejects when the DB query fails (route then returns 503)', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('db down'))

    await expect(checkHealth()).rejects.toThrow('db down')
  })

  it('does not throw on drive degradation (proves degraded is HTTP 200)', async () => {
    vi.mocked(getDriveState).mockReturnValue({ state: 'degraded', reason: 'HTTP 429' })

    await expect(checkHealth()).resolves.toBeDefined()
  })
})
