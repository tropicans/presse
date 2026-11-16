import { describe, expect, it, vi, beforeEach } from 'vitest'

const getAdminSessionMock = vi.fn()
const prismaQueryRawMock = vi.fn()
const prismaExecuteRawMock = vi.fn()
const recordFileUploadMock = vi.fn()
const validateUploadFileMock = vi.fn()

vi.mock('@/lib/auth', () => ({
  getAdminSession: () => getAdminSessionMock(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => prismaQueryRawMock(...args),
    $executeRaw: (...args: unknown[]) => prismaExecuteRawMock(...args),
  },
}))

vi.mock('@/lib/file-storage', () => ({
  recordFileUpload: (...args: unknown[]) => recordFileUploadMock(...args),
}))

vi.mock('@/lib/file-upload-validation', () => ({
  MAX_GLOBAL_FILE_SIZE_MB: 10,
  validateUploadFile: (...args: unknown[]) => validateUploadFileMock(...args),
}))

import { POST } from './route'

describe('POST /api/admin/files/upload (Admin Supplementary File Upload)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    getAdminSessionMock.mockResolvedValue({
      user: { email: 'admin@example.com', role: 'ADMIN' },
    })
    prismaQueryRawMock.mockResolvedValue([{ id: 'sub-123' }])
    prismaExecuteRawMock.mockResolvedValue(1)
    recordFileUploadMock.mockResolvedValue({ fileId: 'file-123', jobId: 'job-123' })
    validateUploadFileMock.mockResolvedValue({
      valid: true,
      detectedMime: 'application/pdf',
      sanitizedFilename: 'lampiran_admin.pdf',
      checksum: 'fakechecksum123',
    })
  })

  it('rejects unauthenticated requests with 401 Unauthorized', async () => {
    getAdminSessionMock.mockResolvedValue(null)

    const formData = new FormData()
    formData.append('submissionId', 'sub-123')
    formData.append('file', new File(['dummy'], 'test.pdf', { type: 'application/pdf' }))

    const req = new Request('http://localhost:3456/api/admin/files/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('rejects missing file or submissionId with 400 Bad Request', async () => {
    const formData = new FormData()
    formData.append('submissionId', 'sub-123')

    const req1 = new Request('http://localhost:3456/api/admin/files/upload', {
      method: 'POST',
      body: formData,
    })
    const res1 = await POST(req1)
    expect(res1.status).toBe(400)

    const formData2 = new FormData()
    formData2.append('file', new File(['dummy'], 'test.pdf', { type: 'application/pdf' }))
    const req2 = new Request('http://localhost:3456/api/admin/files/upload', {
      method: 'POST',
      body: formData2,
    })
    const res2 = await POST(req2)
    expect(res2.status).toBe(400)
  })

  it('returns 404 when target submission does not exist', async () => {
    prismaQueryRawMock.mockResolvedValue([])

    const formData = new FormData()
    formData.append('submissionId', 'nonexistent-sub')
    formData.append('file', new File(['dummy'], 'test.pdf', { type: 'application/pdf' }))

    const req = new Request('http://localhost:3456/api/admin/files/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toBe('Submission tidak ditemukan')
  })

  it('returns 400 when file validation fails', async () => {
    validateUploadFileMock.mockResolvedValue({
      valid: false,
      error: 'Format file tidak diizinkan',
    })

    const formData = new FormData()
    formData.append('submissionId', 'sub-123')
    formData.append('file', new File(['dummy'], 'virus.exe', { type: 'application/x-msdownload' }))

    const req = new Request('http://localhost:3456/api/admin/files/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBe('Format file tidak diizinkan')
  })

  it('successfully spools file, links to submission with admin origin, and returns 201', async () => {
    const formData = new FormData()
    formData.append('submissionId', 'sub-123')
    formData.append('file', new File(['pdf-content'], 'dokumen pendukung.pdf', { type: 'application/pdf' }))

    const req = new Request('http://localhost:3456/api/admin/files/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(201)
    const json = await res.json()
    expect(json.success).toBe(true)
    expect(json.file.submissionId).toBe('sub-123')
    expect(json.file.origin).toBe('admin')
    expect(json.file.status).toBe('QUEUED')
    expect(json.file.sanitizedFilename).toBe('lampiran_admin.pdf')
    expect(recordFileUploadMock).toHaveBeenCalled()
    expect(prismaExecuteRawMock).toHaveBeenCalled()
  })
})
