import { describe, expect, it, vi, beforeEach } from 'vitest'
import { escapeExcelFormula } from './forms'

const prismaQueryRawMock = vi.fn()
const prismaExecuteRawMock = vi.fn()
const deleteObjectMock = vi.fn()

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: (...args: unknown[]) => prismaQueryRawMock(...args),
    $executeRaw: (...args: unknown[]) => prismaExecuteRawMock(...args),
  },
}))

vi.mock('@/lib/storage', () => ({
  deleteObject: (...args: unknown[]) => deleteObjectMock(...args),
}))

import { deleteSubmissionFiles } from './file-storage'

describe('Admin File Surfaces & Export helpers (Phase 52)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('escapeExcelFormula (FILE-24)', () => {
    it('prefixes formula injection trigger characters with a single quote', () => {
      expect(escapeExcelFormula('=SUM(A1:A10)')).toBe("'=SUM(A1:A10)")
      expect(escapeExcelFormula('+cmd|"/C calc"!A0')).toBe("'+cmd|\"/C calc\"!A0")
      expect(escapeExcelFormula('-12345')).toBe("'-12345")
      expect(escapeExcelFormula('@calc')).toBe("'@calc")
    })

    it('leaves standard text and file names untouched', () => {
      expect(escapeExcelFormula('laporan-kegiatan.pdf')).toBe('laporan-kegiatan.pdf')
      expect(escapeExcelFormula('foto_profil.jpg')).toBe('foto_profil.jpg')
      expect(escapeExcelFormula('Daftar Hadir 2026')).toBe('Daftar Hadir 2026')
      expect(escapeExcelFormula('')).toBe('')
    })
  })

  describe('deleteSubmissionFiles cascading cleanup', () => {
    it('deletes MinIO objects, file_upload_jobs, and submission_files rows', async () => {
      prismaQueryRawMock.mockResolvedValue([
        { id: 'f-1', object_key: 'files/f-1' },
        { id: 'f-2', object_key: null }, // still in spool
      ])
      prismaExecuteRawMock.mockResolvedValue(2)

      const result = await deleteSubmissionFiles('sub-999')

      expect(result.deletedCount).toBe(2)
      // MinIO deleteObject should be called only for objects with object_key
      expect(deleteObjectMock).toHaveBeenCalledWith('files/f-1')
      expect(deleteObjectMock).toHaveBeenCalledTimes(1)

      // Both DB tables should be purged
      expect(prismaExecuteRawMock).toHaveBeenCalledTimes(2)
    })

    it('returns 0 when submission has no files attached', async () => {
      prismaQueryRawMock.mockResolvedValue([])

      const result = await deleteSubmissionFiles('sub-empty')

      expect(result.deletedCount).toBe(0)
      expect(deleteObjectMock).not.toHaveBeenCalled()
      expect(prismaExecuteRawMock).not.toHaveBeenCalled()
    })
  })
})
