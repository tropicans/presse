export interface AdminPreviewField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'radio' | 'select' | 'likert' | 'signature' | 'yes_no' | 'checkbox'
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
