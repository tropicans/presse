import { describe, expect, it, vi, beforeEach } from 'vitest'

const listAdminFormSubmissionsMock = vi.fn()
vi.mock('@/lib/forms', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/forms')>()
  return {
    ...actual,
    listAdminFormSubmissions: (...args: unknown[]) => listAdminFormSubmissionsMock(...args),
  }
})

const getFileForServingMock = vi.fn()
vi.mock('@/lib/file-storage', () => ({
  getFileForServing: (...args: unknown[]) => getFileForServingMock(...args),
}))

const getObjectBytesMock = vi.fn()
vi.mock('@/lib/storage', () => ({
  getObjectBytes: (...args: unknown[]) => getObjectBytesMock(...args),
}))

const getAdminSessionMock = vi.fn()
vi.mock('@/lib/auth', () => ({
  getAdminSession: (...args: unknown[]) => getAdminSessionMock(...args),
}))

import { exportAdminFormFilesZip } from './file-export'
import { GET } from '@/app/api/admin/forms/[id]/export/files/route'

describe('exportAdminFormFilesZip', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns totalFiles: 0 and stream: null when form has no files', async () => {
    listAdminFormSubmissionsMock.mockResolvedValue({
      form: { id: 'f-1', slug: 'survey' },
      columns: [{ id: 'col-1', label: 'Nama', name: 'nama', type: 'text' }],
      items: [
        {
          id: 'sub-1',
          createdAt: new Date(),
          answers: { nama: 'Budi' },
          files: [],
        },
      ],
    })

    const result = await exportAdminFormFilesZip('f-1')
    expect(result.totalFiles).toBe(0)
    expect(result.stream).toBeNull()
  })

  it('creates zip stream with formatted filenames and submitter identifiers', async () => {
    listAdminFormSubmissionsMock.mockResolvedValue({
      form: { id: 'f-1', slug: 'lomba-foto' },
      columns: [
        { id: 'col-nama', label: 'Nama Lengkap', name: 'namaLengkap', type: 'text' },
        { id: 'col-file-1', label: 'Foto Karya', name: 'karya', type: 'file' },
      ],
      items: [
        {
          id: 'sub-1',
          createdAt: new Date(),
          answers: { namaLengkap: 'Budi Santoso' },
          files: [
            {
              id: 'file-1',
              fieldId: 'col-file-1',
              originalFilename: 'sunset final.jpg',
              sanitizedFilename: 'sunset_final.jpg',
              status: 'SYNCED',
              objectKey: 'files/file-1',
            },
          ],
        },
      ],
    })

    getObjectBytesMock.mockResolvedValue(Buffer.from('fake-image-bytes'))
    getFileForServingMock.mockResolvedValue({
      id: 'file-1',
      originalFilename: 'sunset final.jpg',
      sanitizedFilename: 'sunset_final.jpg',
      status: 'SYNCED',
      objectKey: 'files/file-1',
      payload: null,
    })

    const result = await exportAdminFormFilesZip('f-1')
    expect(result.totalFiles).toBe(1)
    expect(result.filename).toContain('berkas-lomba-foto-')
    expect(result.filename).toContain('.zip')
    expect(result.stream).toBeDefined()
  })
})

describe('GET /api/admin/forms/[id]/export/files', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthorized', async () => {
    getAdminSessionMock.mockResolvedValue(null)
    const req = new Request('http://localhost:3456/api/admin/forms/f-1/export/files')
    const res = await GET(req, { params: Promise.resolve({ id: 'f-1' }) })
    expect(res.status).toBe(401)
  })

  it('returns 404 when no files exist', async () => {
    getAdminSessionMock.mockResolvedValue({ user: { email: 'admin@example.com' } })
    listAdminFormSubmissionsMock.mockResolvedValue({
      form: { id: 'f-1', slug: 'survey' },
      columns: [],
      items: [],
    })

    const req = new Request('http://localhost:3456/api/admin/forms/f-1/export/files')
    const res = await GET(req, { params: Promise.resolve({ id: 'f-1' }) })
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toContain('Tidak ada berkas yang diunggah')
  })

  it('returns 200 with application/zip header when files exist', async () => {
    getAdminSessionMock.mockResolvedValue({ user: { email: 'admin@example.com' } })
    listAdminFormSubmissionsMock.mockResolvedValue({
      form: { id: 'f-1', slug: 'survey' },
      columns: [{ id: 'c-1', label: 'Bukti', name: 'bukti', type: 'file' }],
      items: [
        {
          id: 'sub-1',
          createdAt: new Date(),
          answers: {},
          files: [
            {
              id: 'file-1',
              fieldId: 'c-1',
              originalFilename: 'bukti.pdf',
              sanitizedFilename: 'bukti.pdf',
              status: 'SYNCED',
              objectKey: 'files/file-1',
            },
          ],
        },
      ],
    })

    getFileForServingMock.mockResolvedValue({
      id: 'file-1',
      originalFilename: 'bukti.pdf',
      sanitizedFilename: 'bukti.pdf',
      status: 'SYNCED',
      objectKey: 'files/file-1',
      payload: null,
    })
    getObjectBytesMock.mockResolvedValue(Buffer.from('%PDF-1.4...'))

    const req = new Request('http://localhost:3456/api/admin/forms/f-1/export/files')
    const res = await GET(req, { params: Promise.resolve({ id: 'f-1' }) })
    expect(res.status).toBe(200)
    expect(res.headers.get('Content-Type')).toBe('application/zip')
    expect(res.headers.get('Content-Disposition')).toContain('attachment; filename="berkas-survey-')
  })
})
