import { describe, expect, it, vi, beforeEach } from 'vitest'

const getAdminSessionMock = vi.fn()
const getFileForServingMock = vi.fn()
const getObjectBytesMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  getAdminSession: () => getAdminSessionMock(),
}))

vi.mock('@/lib/file-storage', () => ({
  getFileForServing: (id: string) => getFileForServingMock(id),
}))

vi.mock('@/lib/storage', () => ({
  getObjectBytes: (key: string) => getObjectBytesMock(key),
}))

import { GET } from './route'

describe('GET /api/files/[id] (Private File Serving Route)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminSessionMock.mockResolvedValue({
      user: { email: 'admin@example.com', role: 'ADMIN' },
    })
  })

  it('rejects unauthenticated request with 401 Unauthorized', async () => {
    getAdminSessionMock.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost:3456/api/files/file-123'), {
      params: Promise.resolve({ id: 'file-123' }),
    })

    expect(response.status).toBe(401)
    const json = await response.json()
    expect(json.error).toBe('Unauthorized')
  })

  it('rejects path traversal and invalid characters with 400 Bad Request', async () => {
    const maliciousIds = ['../secret', '..%2Fsecret', 'file/name', 'file\\name', 'file space', '']

    for (const id of maliciousIds) {
      const response = await GET(new Request(`http://localhost:3456/api/files/${encodeURIComponent(id)}`), {
        params: Promise.resolve({ id }),
      })

      expect(response.status).toBe(400)
      const json = await response.json()
      expect(json.error).toBe('ID berkas tidak valid')
    }
  })

  it('returns 404 when file record does not exist', async () => {
    getFileForServingMock.mockResolvedValue(null)

    const response = await GET(new Request('http://localhost:3456/api/files/nonexistent-id'), {
      params: Promise.resolve({ id: 'nonexistent-id' }),
    })

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe('Berkas tidak ditemukan')
  })

  it('streams file directly from spool payload when pending sync', async () => {
    const spoolBytes = Buffer.from('PDF file spooled content')
    getFileForServingMock.mockResolvedValue({
      fileId: 'file-spool-1',
      originalFilename: 'laporan final.pdf',
      sanitizedFilename: 'laporan_final.pdf',
      mime: 'application/pdf',
      size: spoolBytes.byteLength,
      status: 'QUEUED',
      bucket: null,
      objectKey: null,
      payload: spoolBytes,
    })

    const response = await GET(new Request('http://localhost:3456/api/files/file-spool-1'), {
      params: Promise.resolve({ id: 'file-spool-1' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('application/pdf')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Content-Disposition')).toContain('attachment;')
    expect(response.headers.get('Content-Disposition')).toContain('filename="laporan_final.pdf"')
    expect(response.headers.get('Content-Length')).toBe(String(spoolBytes.byteLength))
    expect(response.headers.get('Cache-Control')).toBe('private, no-cache, no-store, must-revalidate')

    const responseBytes = Buffer.from(await response.arrayBuffer())
    expect(responseBytes.equals(spoolBytes)).toBe(true)
    expect(getObjectBytesMock).not.toHaveBeenCalled()
  })

  it('streams file from MinIO when status is SYNCED and spool payload is cleared', async () => {
    const minioBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
    getFileForServingMock.mockResolvedValue({
      fileId: 'file-synced-1',
      originalFilename: 'foto profil.png',
      sanitizedFilename: 'foto_profil.png',
      mime: 'image/png',
      size: minioBytes.byteLength,
      status: 'SYNCED',
      bucket: 'form-bucket',
      objectKey: 'files/file-synced-1',
      payload: null,
    })
    getObjectBytesMock.mockResolvedValue(minioBytes)

    const response = await GET(new Request('http://localhost:3456/api/files/file-synced-1'), {
      params: Promise.resolve({ id: 'file-synced-1' }),
    })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('image/png')
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff')
    expect(response.headers.get('Content-Disposition')).toContain('attachment;')
    expect(response.headers.get('Content-Disposition')).toContain('filename="foto_profil.png"')
    expect(getObjectBytesMock).toHaveBeenCalledWith('files/file-synced-1')

    const responseBytes = new Uint8Array(await response.arrayBuffer())
    expect(responseBytes).toEqual(minioBytes)
  })

  it('returns 502 when MinIO getObjectBytes fails', async () => {
    getFileForServingMock.mockResolvedValue({
      fileId: 'file-synced-err',
      sanitizedFilename: 'file.png',
      mime: 'image/png',
      size: 100,
      status: 'SYNCED',
      bucket: 'form-bucket',
      objectKey: 'files/file-synced-err',
      payload: null,
    })
    getObjectBytesMock.mockRejectedValue(new Error('MinIO connection refused'))

    const response = await GET(new Request('http://localhost:3456/api/files/file-synced-err'), {
      params: Promise.resolve({ id: 'file-synced-err' }),
    })

    expect(response.status).toBe(502)
    const json = await response.json()
    expect(json.error).toContain('Berkas tidak dapat diakses')
  })

  it('returns 404 when file has neither spool payload nor synced objectKey', async () => {
    getFileForServingMock.mockResolvedValue({
      fileId: 'file-failed-1',
      sanitizedFilename: 'file.png',
      mime: 'image/png',
      size: 100,
      status: 'FAILED',
      bucket: null,
      objectKey: null,
      payload: null,
    })

    const response = await GET(new Request('http://localhost:3456/api/files/file-failed-1'), {
      params: Promise.resolve({ id: 'file-failed-1' }),
    })

    expect(response.status).toBe(404)
    const json = await response.json()
    expect(json.error).toBe('Berkas belum siap atau tidak tersedia')
  })
})
