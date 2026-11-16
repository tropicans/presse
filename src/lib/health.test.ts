import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/lib/prisma', () => ({
  prisma: { $queryRaw: vi.fn() },
}))

vi.mock('@/lib/storage-probe', () => ({
  getStorageState: vi.fn(),
}))

const { prisma } = await import('@/lib/prisma')
const { getStorageState } = await import('@/lib/storage-probe')
const { checkHealth } = await import('./health')

describe('checkHealth', () => {
  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockReset()
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ '?column?': 1 }])
    vi.mocked(getStorageState).mockReset()
  })

  it('returns the byte-exact {"status":"ok"} when the storage probe is healthy', async () => {
    vi.mocked(getStorageState).mockReturnValue({ state: 'ok', bucket: 'form-uploads' })

    const result = await checkHealth()

    expect(JSON.stringify(result)).toBe('{"status":"ok"}')
  })

  it('returns the degraded shape when the storage probe is degraded', async () => {
    vi.mocked(getStorageState).mockReturnValue({ state: 'degraded', reason: 'ECONNREFUSED' })

    const result = await checkHealth()

    expect(result).toEqual({
      status: 'degraded',
      storage: { state: 'degraded', reason: 'ECONNREFUSED' },
    })
  })

  it('rejects when the DB query fails (route then returns 503)', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(new Error('db down'))

    await expect(checkHealth()).rejects.toThrow('db down')
  })

  it('does not throw on storage degradation (proves degraded is HTTP 200)', async () => {
    vi.mocked(getStorageState).mockReturnValue({ state: 'degraded', reason: 'ECONNREFUSED' })

    await expect(checkHealth()).resolves.toBeDefined()
  })
})
