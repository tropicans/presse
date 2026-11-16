export type FileFieldPreset = 'images' | 'pdf' | 'images_and_pdf' | 'all'

export interface AdminPreviewField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'radio' | 'select' | 'likert' | 'signature' | 'yes_no' | 'checkbox' | 'file'
  required: boolean
  placeholder: string
  pageId: string
  options: Array<{
    label: string
    isCorrect: boolean
    points: number
    nextPageId?: string
  }>
  copyFromFieldId?: string
  copyFromLabel?: string
  maxSizeMB?: number
  allowedPreset?: FileFieldPreset
  maxFiles?: number
}

export interface AdminPreviewPage {
  id: string
}

export interface AdminPreviewForm {
  title: string
  description: string | null
  workflow: 'STANDARD' | 'WEBINAR'
  pages: AdminPreviewPage[]
  fields: AdminPreviewField[]
}

export interface AdminPreviewSnapshot {
  formId: string
  updatedAt: string
  form: AdminPreviewForm
}

export function getAdminPreviewStorageKey(formId: string) {
  return `admin-form-preview:${formId}`
}

export function getFilePresetLabel(preset?: string): string {
  switch (preset) {
    case 'images':
      return 'Gambar saja (PNG, JPG, WEBP)'
    case 'pdf':
      return 'Dokumen PDF saja (PDF)'
    case 'all':
      return 'Semua format didukung (Maks 10 MB)'
    case 'images_and_pdf':
    default:
      return 'Gambar & Dokumen PDF (PNG, JPG, WEBP, PDF)'
  }
}

export function getFilePresetShortLabel(preset?: string): string {
  switch (preset) {
    case 'images':
      return 'Gambar saja'
    case 'pdf':
      return 'PDF saja'
    case 'all':
      return 'Semua format'
    case 'images_and_pdf':
    default:
      return 'Gambar + PDF'
  }
}

export function getFileConstraintText(maxSizeMB?: number, maxFiles?: number): string {
  const size = maxSizeMB ?? 5
  const files = maxFiles ?? 1
  return `Maks ${size} MB • ${files} berkas`
}
