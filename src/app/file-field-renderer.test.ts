// file-field-renderer test suite
import fs from 'fs'
import path from 'path'
import { describe, it, expect } from 'vitest'
import {
  getFilePresetLabel,
  getFilePresetShortLabel,
  getFileConstraintText,
} from '@/lib/admin-form-preview'

describe('File Field Renderer (Plan 47-02)', () => {
  describe('Preset Description and Constraint Helpers', () => {
    it('maps all four presets to accurate Indonesian labels and format listings', () => {
      expect(getFilePresetLabel('images_and_pdf')).toBe('Gambar & Dokumen PDF (PNG, JPG, WEBP, PDF)')
      expect(getFilePresetLabel('images')).toBe('Gambar saja (PNG, JPG, WEBP)')
      expect(getFilePresetLabel('pdf')).toBe('Dokumen PDF saja (PDF)')
      expect(getFilePresetLabel('all')).toBe('Semua format didukung (Maks 10 MB)')

      // Fallbacks
      expect(getFilePresetLabel(undefined)).toBe('Gambar & Dokumen PDF (PNG, JPG, WEBP, PDF)')
      expect(getFilePresetLabel('unknown_preset')).toBe('Gambar & Dokumen PDF (PNG, JPG, WEBP, PDF)')
    })

    it('maps all presets to concise short labels for summary cards and badges', () => {
      expect(getFilePresetShortLabel('images_and_pdf')).toBe('Gambar + PDF')
      expect(getFilePresetShortLabel('images')).toBe('Gambar saja')
      expect(getFilePresetShortLabel('pdf')).toBe('PDF saja')
      expect(getFilePresetShortLabel('all')).toBe('Semua format')
      expect(getFilePresetShortLabel(undefined)).toBe('Gambar + PDF')
    })

    it('generates formatted constraint string for various combinations of maxSizeMB and maxFiles', () => {
      expect(getFileConstraintText(2, 1)).toBe('Maks 2 MB • 1 berkas')
      expect(getFileConstraintText(5, 3)).toBe('Maks 5 MB • 3 berkas')
      expect(getFileConstraintText(10, 5)).toBe('Maks 10 MB • 5 berkas')

      // Defaults
      expect(getFileConstraintText()).toBe('Maks 5 MB • 1 berkas')
      expect(getFileConstraintText(undefined, 2)).toBe('Maks 5 MB • 2 berkas')
      expect(getFileConstraintText(10, undefined)).toBe('Maks 10 MB • 1 berkas')
    })
  })

  describe('Structural Renderer Assertions (AdminFormPreview & AttendanceForm)', () => {
    const previewPath = path.resolve(process.cwd(), 'src/components/AdminFormPreview.tsx')
    const attendancePath = path.resolve(process.cwd(), 'src/components/AttendanceForm.tsx')
    const globalsCssPath = path.resolve(process.cwd(), 'src/app/globals.css')

    const previewSrc = fs.readFileSync(previewPath, 'utf8')
    const attendanceSrc = fs.readFileSync(attendancePath, 'utf8')
    const globalsCss = fs.readFileSync(globalsCssPath, 'utf8')

    it('asserts AdminFormPreview includes inert dropzone with upload SVG icon and D-06 notice', () => {
      expect(previewSrc).toContain("field.type === 'file'")
      expect(previewSrc).toContain('public-file-dropzone')
      expect(previewSrc).toContain('public-file-dropzone-box')
      expect(previewSrc).toContain('public-file-dropzone-icon')
      expect(previewSrc).toContain('public-file-dropzone-btn')
      expect(previewSrc).toContain('public-file-dropzone-notice')

      // SVG upload arrow / tray vector
      expect(previewSrc).toMatch(/polyline\s+points=["']17 8 12 3 7 8["']/)
      expect(previewSrc).toMatch(/line\s+x1=["']12["']\s+y1=["']3["']\s+x2=["']12["']\s+y2=["']15["']/)

      // Asterisk for required
      expect(previewSrc).toContain("field.required ? ' *' : ''")

      // Inert button text and D-06 notice
      expect(previewSrc).toContain('Pilih Berkas')
      expect(previewSrc).toContain('Pengunggahan berkas aktif pada pengisian formulir')
    })

    it('asserts AttendanceForm includes identical monochrome dropzone structure per D-05', () => {
      expect(attendanceSrc).toContain("field.type === 'file'")
      expect(attendanceSrc).toContain('public-file-dropzone')
      expect(attendanceSrc).toContain('public-file-dropzone-box')
      expect(attendanceSrc).toContain('public-file-dropzone-icon')
      expect(attendanceSrc).toContain('public-file-dropzone-btn')
      expect(attendanceSrc).toContain('public-file-dropzone-notice')

      // SVG upload arrow / tray vector
      expect(attendanceSrc).toMatch(/polyline\s+points=["']17 8 12 3 7 8["']/)
      expect(attendanceSrc).toMatch(/line\s+x1=["']12["']\s+y1=["']3["']\s+x2=["']12["']\s+y2=["']15["']/)

      // Asterisk for required
      expect(attendanceSrc).toContain("field.required ? ' *' : ''")

      // Inert button text and D-06 notice
      expect(attendanceSrc).toContain('Pilih Berkas')
      expect(attendanceSrc).toContain('Pengunggahan berkas aktif pada pengisian formulir')
    })

    it('asserts AttendanceForm validation does not block submission for file fields in Phase 47', () => {
      // In validateFields, field.type === 'file' must continue or be exempted
      expect(attendanceSrc).toMatch(/if\s*\(\s*field\.type\s*===\s*['"]file['"]\s*\)\s*\{\s*(\/\/[^\n]*\n\s*)?continue\s*\}/)
    })

    it('asserts globals.css defines monochrome dropzone styling rules', () => {
      expect(globalsCss).toContain('.public-file-dropzone')
      expect(globalsCss).toContain('.public-file-dropzone-box')
      expect(globalsCss).toContain('.public-file-dropzone-icon')
      expect(globalsCss).toContain('.public-file-dropzone-label')
      expect(globalsCss).toContain('.public-file-dropzone-constraints')
      expect(globalsCss).toContain('.public-file-dropzone-btn')
      expect(globalsCss).toContain('.public-file-dropzone-notice')

      // Dashed border on dropzone box
      expect(globalsCss).toMatch(/\.public-file-dropzone-box\s*\{[^}]*border:[^;]*dashed/)
      // Dark theme override
      expect(globalsCss).toMatch(/html\[data-theme=['"]dark['"]\]\s+\.public-file-dropzone-box/)
    })
  })
})
