import { describe, it, expect } from 'vitest'
import { getDeleteDisabledReason } from './form-delete-utils'

describe('getDeleteDisabledReason', () => {
  it('should prevent deletion of the attendance template form', () => {
    const form = {
      slug: 'attendance-template',
      status: 'ARCHIVED' as const,
      submissionCount: 0,
    }
    expect(getDeleteDisabledReason(form)).toBe('Form template attendance tidak bisa dihapus')
  })

  it('should prevent deletion of non-archived forms', () => {
    const form = {
      slug: 'my-custom-form',
      status: 'PUBLISHED' as const,
      submissionCount: 0,
    }
    expect(getDeleteDisabledReason(form)).toBe('Arsipkan form terlebih dahulu sebelum menghapus')
  })

  it('should prevent deletion of forms with submissions', () => {
    const form = {
      slug: 'my-custom-form',
      status: 'ARCHIVED' as const,
      submissionCount: 5,
    }
    expect(getDeleteDisabledReason(form)).toBe('Form yang sudah punya kiriman tidak bisa dihapus')
  })

  it('should allow deletion of archived forms with no submissions', () => {
    const form = {
      slug: 'my-custom-form',
      status: 'ARCHIVED' as const,
      submissionCount: 0,
    }
    expect(getDeleteDisabledReason(form)).toBeNull()
  })
})
