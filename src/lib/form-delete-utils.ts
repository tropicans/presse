export interface DeletableFormListItem {
  slug: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  submissionCount: number
}

export function getDeleteDisabledReason(form: DeletableFormListItem): string | null {
  if (form.slug === 'attendance-template') {
    return 'Form template attendance tidak bisa dihapus'
  }

  if (form.status !== 'ARCHIVED') {
    return 'Arsipkan form terlebih dahulu sebelum menghapus'
  }

  if (form.submissionCount > 0) {
    return 'Form yang sudah punya kiriman tidak bisa dihapus'
  }

  return null
}
