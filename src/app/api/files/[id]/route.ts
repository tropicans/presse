import { NextResponse } from 'next/server'
import { getAdminSession } from '@/lib/auth'
import { getFileForServing } from '@/lib/file-storage'
import { getObjectBytes } from '@/lib/storage'

const VALID_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params

  // Traversal & format guard
  if (!id || !VALID_ID_PATTERN.test(id) || id.includes('..') || id.includes('/') || id.includes('\\')) {
    return NextResponse.json({ error: 'ID berkas tidak valid' }, { status: 400 })
  }

  // Admin authentication guard
  const session = await getAdminSession()
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // File lookup
  const file = await getFileForServing(id)
  if (!file) {
    return NextResponse.json({ error: 'Berkas tidak ditemukan' }, { status: 404 })
  }

  // Content extraction: dual-source streaming (spool bytea vs MinIO object)
  let fileBytes: Uint8Array | Buffer | null = null

  if (file.payload) {
    fileBytes = file.payload
  } else if (file.status === 'SYNCED' && file.objectKey) {
    try {
      fileBytes = await getObjectBytes(file.objectKey)
    } catch (err) {
      console.error(`[file-serving] Gagal mengambil objek dari storage untuk berkas ${id}:`, err)
      return NextResponse.json(
        { error: 'Berkas tidak dapat diakses dari penyimpanan objek' },
        { status: 502 },
      )
    }
  } else {
    return NextResponse.json(
      { error: 'Berkas belum siap atau tidak tersedia' },
      { status: 404 },
    )
  }

  // Strict Content-Disposition with RFC 5987 UTF-8 support and sanitized ASCII fallback
  const rawFilename = file.sanitizedFilename || file.originalFilename || 'download'
  const asciiFallback = rawFilename.replace(/[\r\n"\\/]/g, '_').replace(/[^\x20-\x7E]/g, '_')
  const encodedFilename = encodeURIComponent(rawFilename)
  const contentDisposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFilename}`

  const headers = new Headers()
  headers.set('Content-Type', file.mime || 'application/octet-stream')
  headers.set('Content-Disposition', contentDisposition)
  headers.set('X-Content-Type-Options', 'nosniff')
  headers.set('Content-Length', String(fileBytes.byteLength))
  headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate')

  // Convert Buffer or Uint8Array into a Uint8Array BodyInit compatible with Fetch Response
  const body = Buffer.isBuffer(fileBytes)
    ? new Uint8Array(fileBytes.buffer, fileBytes.byteOffset, fileBytes.byteLength)
    : fileBytes

  return new Response(body as unknown as BodyInit, {
    status: 200,
    headers,
  })
}
