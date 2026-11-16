import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'
import { validateUploadFile, sanitizeFilename } from '@/lib/file-upload-validation'

const recordFileUploadMock = vi.fn()
vi.mock('@/lib/file-storage', () => ({
  recordFileUpload: (...args: unknown[]) => recordFileUploadMock(...args),
}))

const getPublicFormBySlugMock = vi.fn()
vi.mock('@/lib/forms', () => ({
  getPublicFormBySlug: (...args: unknown[]) => getPublicFormBySlugMock(...args),
}))

import { POST } from './route'

describe('file-upload-validation', () => {
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52])
  const jpegHeader = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46])
  const pdfHeader = Buffer.from('%PDF-1.4\n%âãÏÓ\n1 0 obj\n<<>>\nendobj\ntrailer\n<<>>\n%%EOF')

  it('sanitizes filename and prevents directory traversal', () => {
    expect(sanitizeFilename('../../etc/passwd')).toBe('passwd')
    expect(sanitizeFilename('C:\\Windows\\System32\\cmd.exe')).toBe('cmd.exe')
    expect(sanitizeFilename('normal-file_123.pdf')).toBe('normal-file_123.pdf')
    expect(sanitizeFilename('berkas laporan (final).png')).toBe('berkas laporan _final_.png')
  })

  it('validates genuine PNG buffer successfully', async () => {
    const res = await validateUploadFile({
      buffer: pngHeader,
      originalFilename: 'photo.png',
      allowedPreset: 'images',
      maxSizeMB: 5,
    })
    expect(res.valid).toBe(true)
    expect(res.detectedMime).toBe('image/png')
    expect(res.sanitizedFilename).toBe('photo.png')
    expect(res.checksum).toBeDefined()
  })

  it('validates genuine PDF buffer successfully', async () => {
    const res = await validateUploadFile({
      buffer: pdfHeader,
      originalFilename: 'doc.pdf',
      allowedPreset: 'pdf',
      maxSizeMB: 10,
    })
    expect(res.valid).toBe(true)
    expect(res.detectedMime).toBe('application/pdf')
  })

  it('rejects spoofed file with fake extension', async () => {
    const fakePng = Buffer.from('this is just plain text masquerading as png')
    const res = await validateUploadFile({
      buffer: fakePng,
      originalFilename: 'fake.png',
      allowedPreset: 'images',
      maxSizeMB: 5,
    })
    expect(res.valid).toBe(false)
    expect(res.error).toContain('Format file tidak dapat dikenali')
  })

  it('rejects file when MIME does not match allowed preset', async () => {
    const res = await validateUploadFile({
      buffer: jpegHeader,
      originalFilename: 'image.jpg',
      allowedPreset: 'pdf', // Only PDF allowed!
      maxSizeMB: 5,
    })
    expect(res.valid).toBe(false)
    expect(res.error).toContain('tidak diizinkan')
  })

  it('rejects file exceeding maxSizeMB', async () => {
    // 2 MB buffer with 1 MB limit
    const largeBuffer = Buffer.alloc(2 * 1024 * 1024, 0x20)
    const res = await validateUploadFile({
      buffer: largeBuffer,
      originalFilename: 'large.pdf',
      allowedPreset: 'pdf',
      maxSizeMB: 1,
    })
    expect(res.valid).toBe(false)
    expect(res.error).toContain('melebihi batas maksimum')
  })
})

describe('POST /api/public/files/upload', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52])

  it('returns 400 when slug or fieldId is missing', async () => {
    const formData = new FormData()
    formData.append('file', new Blob([pngHeader], { type: 'image/png' }), 'test.png')

    const req = new NextRequest('http://localhost:3456/api/public/files/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('slug')
  })

  it('returns 404 when form slug is not found', async () => {
    getPublicFormBySlugMock.mockResolvedValue(null)

    const formData = new FormData()
    formData.append('slug', 'non-existent')
    formData.append('fieldId', 'file-field-1')
    formData.append('file', new Blob([pngHeader], { type: 'image/png' }), 'test.png')

    const req = new NextRequest('http://localhost:3456/api/public/files/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(404)
    const json = await res.json()
    expect(json.error).toContain('Formulir tidak ditemukan')
  })

  it('returns 400 when field is not a file field', async () => {
    getPublicFormBySlugMock.mockResolvedValue({
      id: 'form-1',
      slug: 'test-slug',
      fields: [
        { id: 'text-field-1', name: 'nama', type: 'text' },
      ],
    })

    const formData = new FormData()
    formData.append('slug', 'test-slug')
    formData.append('fieldId', 'text-field-1')
    formData.append('file', new Blob([pngHeader], { type: 'image/png' }), 'test.png')

    const req = new NextRequest('http://localhost:3456/api/public/files/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toContain('bukan bertipe file upload')
  })

  it('successfully uploads valid file and spools to database', async () => {
    getPublicFormBySlugMock.mockResolvedValue({
      id: 'form-1',
      slug: 'test-slug',
      fields: [
        {
          id: 'file-field-1',
          name: 'dokumen',
          type: 'file',
          maxSizeMB: 5,
          allowedPreset: 'images_and_pdf',
        },
      ],
    })
    recordFileUploadMock.mockResolvedValue({ fileId: 'mock-file-id', jobId: 'mock-job-id' })

    const formData = new FormData()
    formData.append('slug', 'test-slug')
    formData.append('fieldId', 'file-field-1')
    formData.append('file', new File([pngHeader], 'bukti transfer.png', { type: 'image/png' }))

    const req = new NextRequest('http://localhost:3456/api/public/files/upload', {
      method: 'POST',
      body: formData,
    })

    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.fileId).toBeDefined()
    expect(json.originalFilename).toBe('bukti transfer.png')
    expect(json.mime).toBe('image/png')
    expect(json.size).toBe(pngHeader.byteLength)

    expect(recordFileUploadMock).toHaveBeenCalledTimes(1)
    expect(recordFileUploadMock).toHaveBeenCalledWith(
      expect.objectContaining({
        originalFilename: 'bukti transfer.png',
        mime: 'image/png',
        size: pngHeader.byteLength,
      }),
    )
  })
})
