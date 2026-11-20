import { PassThrough, Readable } from 'node:stream'
import { ZipArchive } from 'archiver'
import { listAdminFormSubmissions, type AdminSubmissionFilters } from './forms'
import { getFileForServing } from './file-storage'
import { getObjectBytes } from './storage'
import { sanitizeFilename } from './file-upload-validation'

export interface ExportFormFilesZipResult {
  filename: string
  totalFiles: number
  stream: ReadableStream | null
}

function getSubmitterIdentifier(answers: Record<string, string>): string {
  for (const [key, value] of Object.entries(answers)) {
    const k = key.toLowerCase()
    if ((k.includes('nama') || k.includes('name')) && value?.trim()) {
      return sanitizeFilename(value.trim())
    }
  }
  return ''
}

export async function exportAdminFormFilesZip(
  formId: string,
  filters?: Partial<AdminSubmissionFilters>,
): Promise<ExportFormFilesZipResult> {
  const data = await listAdminFormSubmissions(formId, filters, {
    page: 1,
    pageSize: 2000,
  })

  if (!data) {
    return { filename: '', totalFiles: 0, stream: null }
  }

  // Collect all files across submissions
  interface FileTask {
    fileId: string
    entryName: string
  }

  const tasks: FileTask[] = []
  const usedEntryNames = new Set<string>()

  data.items.forEach((item, index) => {
    const files = item.files ?? []
    if (files.length === 0) return

    const numPrefix = String(index + 1).padStart(3, '0')
    const submitter = getSubmitterIdentifier(item.answers)

    files.forEach((file) => {
      const originalName = sanitizeFilename(file.sanitizedFilename || file.originalFilename || 'berkas')

      let candidateName = submitter
        ? `${numPrefix}_${submitter}_${originalName}`
        : `${numPrefix}_${originalName}`
      let counter = 1
      while (usedEntryNames.has(candidateName)) {
        const dotIdx = candidateName.lastIndexOf('.')
        if (dotIdx > 0) {
          candidateName = `${candidateName.slice(0, dotIdx)}_${counter}${candidateName.slice(dotIdx)}`
        } else {
          candidateName = `${candidateName}_${counter}`
        }
        counter++
      }
      usedEntryNames.add(candidateName)

      tasks.push({
        fileId: file.id,
        entryName: candidateName,
      })
    })
  })

  if (tasks.length === 0) {
    return {
      filename: `berkas-${data.form.slug}.zip`,
      totalFiles: 0,
      stream: null,
    }
  }

  const archive = new ZipArchive({ zlib: { level: 6 } })
  const passThrough = new PassThrough()
  archive.pipe(passThrough)

  archive.on('warning', (err) => {
    console.warn('[export-files-zip] Archive warning:', err)
  })

  archive.on('error', (err) => {
    console.error('[export-files-zip] Archive error:', err)
    passThrough.destroy(err)
  })

  // Asynchronously stream file bytes into the archive
  ;(async () => {
    try {
      for (const task of tasks) {
        try {
          const fileRecord = await getFileForServing(task.fileId)
          if (!fileRecord) continue

          let fileBuffer: Buffer | null = null

          if (fileRecord.payload) {
            fileBuffer = fileRecord.payload
          } else if (fileRecord.status === 'SYNCED' && fileRecord.objectKey) {
            const bytes = await getObjectBytes(fileRecord.objectKey)
            fileBuffer = Buffer.from(bytes)
          }

          if (fileBuffer) {
            archive.append(fileBuffer, { name: task.entryName })
          }
        } catch (fileErr) {
          console.error(`[export-files-zip] Gagal memuat berkas ${task.fileId}:`, fileErr)
          // Continue with remaining files so one corrupt file doesn't block the whole export
        }
      }

      await archive.finalize()
    } catch (finalErr) {
      console.error('[export-files-zip] Fatal error finalizing archive:', finalErr)
      archive.abort()
      passThrough.destroy(finalErr instanceof Error ? finalErr : new Error(String(finalErr)))
    }
  })()

  const webStream = Readable.toWeb(passThrough) as ReadableStream
  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `berkas-${data.form.slug}-${dateStr}.zip`

  return {
    filename,
    totalFiles: tasks.length,
    stream: webStream,
  }
}
