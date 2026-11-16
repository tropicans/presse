import { describe, expect, it, vi, beforeEach } from 'vitest'
import { validateFormSubmission, FormSubmissionError } from '@/lib/forms'
import type { PublicFormDefinition } from '@/lib/forms'

const linkFilesToSubmissionMock = vi.fn()
vi.mock('@/lib/file-storage', () => ({
  linkFilesToSubmission: (...args: unknown[]) => linkFilesToSubmissionMock(...args),
  InvalidFileStatusTransitionError: class InvalidFileStatusTransitionError extends Error {},
}))

describe('Public Upload & Submission Validation Flow (Phase 49)', () => {
  const mockForm: PublicFormDefinition = {
    id: 'form-test-1',
    slug: 'test-form',
    title: 'Test Form File Upload',
    description: null,
    successMessage: null,
    submitLabel: 'Kirim',
    settings: {
      workflow: 'STANDARD',
    },
    fields: [
      {
        id: 'field-file-1',
        name: 'dokumenKtp',
        label: 'Foto KTP',
        type: 'file',
        required: true,
      },
      {
        id: 'field-file-2',
        name: 'dokumenOpsional',
        label: 'Dokumen Pendukung',
        type: 'file',
        required: false,
      },
    ],
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects submission when required file field is missing or empty', () => {
    expect(() => {
      validateFormSubmission(mockForm, {
        dokumenKtp: '',
      })
    }).toThrow(FormSubmissionError)

    try {
      validateFormSubmission(mockForm, { dokumenKtp: '' })
    } catch (e) {
      expect((e as FormSubmissionError).message).toContain('Foto KTP')
      expect((e as FormSubmissionError).message).toContain('wajib diunggah')
      expect((e as FormSubmissionError).status).toBe(400)
    }
  })

  it('accepts submission when required file has valid fileId', () => {
    const values = validateFormSubmission(mockForm, {
      dokumenKtp: 'file_id_valid_123',
    })

    expect(values.dokumenKtp).toBe('file_id_valid_123')
    expect(values.dokumenOpsional).toBe('')
  })
})
