export type AdminFormStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type AdminFormMode = 'STANDARD' | 'QUIZ' | 'ATTENDANCE'

export function getAdminFormStatusLabel(status: AdminFormStatus) {
  switch (status) {
    case 'PUBLISHED':
      return 'Publik'
    case 'ARCHIVED':
      return 'Arsip'
    default:
      return 'Draft'
  }
}

export function getAdminFormModeLabel(mode: AdminFormMode) {
  switch (mode) {
    case 'QUIZ':
      return 'Quiz'
    case 'ATTENDANCE':
      return 'Kehadiran'
    default:
      return 'Standar'
  }
}
