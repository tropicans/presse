import { NextRequest, NextResponse } from 'next/server'
import { randomUUID } from 'node:crypto'
import { getClientIp, rateLimit } from '@/lib/rate-limit'
import { getPublicFormBySlug } from '@/lib/forms'
import { validateUploadFile, MAX_GLOBAL_FILE_SIZE_MB } from '@/lib/file-upload-validation'
import { recordFileUpload } from '@/lib/file-storage'
import { stripImageMetadata } from '@/lib/image-exif'

const UPLOAD_RATE_LIMIT = { limit: 30, windowMs: 600_000 } // 30 uploads per 10 minutes per IP

export async function POST(request: NextRequest) {
  try {
    const contentLength = request.headers.get('content-length')
    if (contentLength && Number(contentLength) > 12 * 1024 * 1024) {
      return NextResponse.json({ error: 'Ukuran payload melebihi batas 10 MB' }, { status: 413 })
    }

    const ip = getClientIp(request.headers)
    const rl = rateLimit(`public-file-upload:${ip}`, UPLOAD_RATE_LIMIT)

    if (!rl.allowed) {
      return NextResponse.json(
        { error: 'Terlalu banyak permintaan unggah file. Silakan coba lagi nanti.' },
        {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((rl.resetAt - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(UPLOAD_RATE_LIMIT.limit),
            'X-RateLimit-Remaining': '0',
          },
        },
      )
    }

    let formData: FormData
    try {
      formData = await request.formData()
    } catch {
      return NextResponse.json(
        { error: 'Payload tidak valid. Gunakan format multipart/form-data.' },
        { status: 400 },
      )
    }

    const slug = formData.get('slug')
    const fieldId = formData.get('fieldId')
    const fileEntry = formData.get('file')

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json({ error: 'Parameter slug form diperlukan.' }, { status: 400 })
    }

    if (!fieldId || typeof fieldId !== 'string') {
      return NextResponse.json({ error: 'Parameter fieldId diperlukan.' }, { status: 400 })
    }

    if (!fileEntry || !(fileEntry instanceof Blob)) {
      return NextResponse.json({ error: 'File tidak ditemukan dalam form data.' }, { status: 400 })
    }

    // Load form definition to verify field exists and get allowed file config
    const form = await getPublicFormBySlug(slug)
    if (!form) {
      return NextResponse.json({ error: 'Formulir tidak ditemukan.' }, { status: 404 })
    }

    const field = form.fields.find((f) => f.id === fieldId || f.name === fieldId)
    if (!field) {
      return NextResponse.json({ error: 'Field tidak ditemukan pada formulir ini.' }, { status: 400 })
    }

    if (field.type !== 'file') {
      return NextResponse.json({ error: 'Field bukan bertipe file upload.' }, { status: 400 })
    }

    const arrayBuffer = await fileEntry.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    const originalFilename = fileEntry instanceof File ? fileEntry.name : 'upload.bin'

    const validation = await validateUploadFile({
      buffer,
      originalFilename,
      allowedPreset: (field as unknown as { allowedPreset?: string }).allowedPreset ?? 'images_and_pdf',
      maxSizeMB: (field as unknown as { maxSizeMB?: number }).maxSizeMB ?? MAX_GLOBAL_FILE_SIZE_MB,
    })

    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 })
    }

    const fileId = randomUUID()
    const sanitizedFilename = validation.sanitizedFilename ?? originalFilename
    const mime = validation.detectedMime ?? 'application/octet-stream'

    // FILE-27: Strip EXIF/GPS/comments metadata before storage
    const cleanBuffer = stripImageMetadata(buffer, mime)

    // Spool file to Postgres. Even if MinIO is degraded/down, this succeeds.
    await recordFileUpload({
      fileId,
      originalFilename,
      sanitizedFilename,
      mime,
      size: cleanBuffer.byteLength,
      checksum: validation.checksum,
      payload: cleanBuffer,
    })

    return NextResponse.json(
      {
        fileId,
        originalFilename,
        sanitizedFilename,
        size: cleanBuffer.byteLength,
        mime,
      },
      { status: 200 },
    )
  } catch (error) {
    console.error('Error in public file upload route:', error)
    return NextResponse.json(
      { error: 'Terjadi kesalahan pada server saat memproses unggahan berkas.' },
      { status: 500 },
    )
  }
}
