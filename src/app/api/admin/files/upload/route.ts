import { randomUUID } from 'crypto'
import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { recordFileUpload } from '@/lib/file-storage'
import { validateUploadFile, MAX_GLOBAL_FILE_SIZE_MB } from '@/lib/file-upload-validation'
import { stripImageMetadata } from '@/lib/image-exif'

export async function POST(request: Request): Promise<Response> {
  const contentLength = request.headers.get('content-length')
  if (contentLength && Number(contentLength) > 12 * 1024 * 1024) {
    return NextResponse.json({ error: 'Ukuran payload melebihi batas 10 MB' }, { status: 413 })
  }

  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch (err) {
    console.warn('[admin-file-upload] Gagal membaca multipart form data:', err)
    return NextResponse.json({ error: 'Format berkas atau form tidak valid' }, { status: 400 })
  }

  const fileEntry = formData.get('file')
  const submissionId = formData.get('submissionId')

  if (!fileEntry || !(fileEntry instanceof Blob)) {
    return NextResponse.json({ error: 'Berkas wajib dilampirkan' }, { status: 400 })
  }

  if (!submissionId || typeof submissionId !== 'string' || !submissionId.trim()) {
    return NextResponse.json({ error: 'submissionId wajib diisi' }, { status: 400 })
  }

  const cleanSubmissionId = submissionId.trim()

  // Verify that the submission exists
  const existingSubmissions = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM "submissions"
    WHERE id = ${cleanSubmissionId}
    LIMIT 1
  `

  if (!existingSubmissions || existingSubmissions.length === 0) {
    return NextResponse.json({ error: 'Submission tidak ditemukan' }, { status: 404 })
  }

  const arrayBuffer = await fileEntry.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)
  const originalFilename = fileEntry instanceof File ? fileEntry.name : 'upload.bin'

  const validation = await validateUploadFile({
    buffer,
    originalFilename,
    allowedPreset: 'images_and_pdf',
    maxSizeMB: MAX_GLOBAL_FILE_SIZE_MB,
  })

  if (!validation.valid) {
    return NextResponse.json({ error: validation.error || 'Berkas tidak valid' }, { status: 400 })
  }

  const fileId = randomUUID()
  const sanitizedFilename = validation.sanitizedFilename ?? originalFilename
  const mime = validation.detectedMime ?? 'application/octet-stream'

  // FILE-27: Strip EXIF/GPS/comments metadata before storage
  const cleanBuffer = stripImageMetadata(buffer, mime)

  // Spool in local Postgres and queue for sync
  await recordFileUpload({
    fileId,
    originalFilename,
    sanitizedFilename,
    mime,
    size: cleanBuffer.byteLength,
    checksum: validation.checksum,
    payload: cleanBuffer,
  })

  // Link file directly to submission with field_id = NULL (marking it as admin origin)
  await prisma.$executeRaw`
    UPDATE "submission_files"
    SET
      submission_id = ${cleanSubmissionId},
      field_id = NULL,
      status = 'QUEUED',
      updated_at = NOW() AT TIME ZONE 'UTC'
    WHERE id = ${fileId}
  `

  return NextResponse.json(
    {
      success: true,
      file: {
        id: fileId,
        submissionId: cleanSubmissionId,
        fieldId: null,
        originalFilename,
        sanitizedFilename,
        mime,
        size: buffer.byteLength,
        status: 'QUEUED',
        origin: 'admin',
        createdAt: new Date().toISOString(),
      },
    },
    { status: 201 },
  )
}
