import { createHash } from 'node:crypto'
import { fileTypeFromBuffer } from 'file-type'

export const MAX_GLOBAL_FILE_SIZE_MB = 10

export const ALLOWED_MIME_PRESETS: Record<string, string[]> = {
  images: ['image/jpeg', 'image/png', 'image/webp'],
  pdf: ['application/pdf'],
  images_and_pdf: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],
}

export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return 'upload'
  }

  // Remove path traversal and directory separators
  const basename = filename.split(/[/\\]/).pop() ?? 'upload'

  // Replace control characters and dangerous characters
  // Allow word characters, digits, spaces, hyphens, underscores, and dots
  const sanitized = basename
    .replace(/[^\w\s.-]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()

  return sanitized.length > 0 ? sanitized : 'upload'
}

export function computeBufferChecksum(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex')
}

export interface FileUploadValidationResult {
  valid: boolean
  error?: string
  detectedMime?: string
  sanitizedFilename?: string
  checksum?: string
}

export async function validateUploadFile(params: {
  buffer: Buffer
  originalFilename: string
  allowedPreset?: string
  maxSizeMB?: number
}): Promise<FileUploadValidationResult> {
  const { buffer, originalFilename, allowedPreset = 'images_and_pdf' } = params
  const maxSizeMB = Math.min(params.maxSizeMB ?? MAX_GLOBAL_FILE_SIZE_MB, MAX_GLOBAL_FILE_SIZE_MB)
  const maxSizeBytes = maxSizeMB * 1024 * 1024

  if (!buffer || buffer.byteLength === 0) {
    return {
      valid: false,
      error: 'File kosong atau tidak valid.',
    }
  }

  if (buffer.byteLength > maxSizeBytes) {
    return {
      valid: false,
      error: `Ukuran file (${(buffer.byteLength / (1024 * 1024)).toFixed(1)} MB) melebihi batas maksimum ${maxSizeMB} MB.`,
    }
  }

  const detected = await fileTypeFromBuffer(buffer)
  if (!detected) {
    return {
      valid: false,
      error: 'Format file tidak dapat dikenali atau tidak didukung.',
    }
  }

  const allowedMimes = ALLOWED_MIME_PRESETS[allowedPreset] ?? ALLOWED_MIME_PRESETS.images_and_pdf
  if (!allowedMimes.includes(detected.mime)) {
    return {
      valid: false,
      error: `Tipe file '${detected.mime}' tidak diizinkan. Tipe yang diperbolehkan: ${allowedMimes.join(', ')}.`,
      detectedMime: detected.mime,
    }
  }

  const sanitizedFilename = sanitizeFilename(originalFilename)
  const checksum = computeBufferChecksum(buffer)

  return {
    valid: true,
    detectedMime: detected.mime,
    sanitizedFilename,
    checksum,
  }
}
