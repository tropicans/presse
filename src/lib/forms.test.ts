import { describe, expect, it } from 'vitest'
import {
  FormSubmissionError,
  normalizeAdminSubmissionPagination,
  type PublicFormDefinition,
  validateFormSubmission,
} from './forms'

function buildForm(): PublicFormDefinition {
  return {
    id: 'form_1',
    slug: 'test-form',
    title: 'Test Form',
    description: null,
    successMessage: null,
    submitLabel: 'Kirim',
    settings: { workflow: 'STANDARD' },
    fields: [
      {
        id: 'name',
        name: 'name',
        label: 'Nama',
        type: 'text',
        required: true,
        maxLength: 10,
      },
      {
        id: 'role',
        name: 'role',
        label: 'Role',
        type: 'radio',
        required: true,
        options: ['Admin', 'User'],
      },
      {
        id: 'signature',
        name: 'signature',
        label: 'Tanda Tangan',
        type: 'signature',
        required: true,
      },
    ],
  }
}

describe('validateFormSubmission', () => {
  it('rejects missing required fields', () => {
    expect(() => validateFormSubmission(buildForm(), {})).toThrow(FormSubmissionError)
    expect(() => validateFormSubmission(buildForm(), {})).toThrow('Field "Nama" wajib diisi')
  })

  it('rejects option values outside field options', () => {
    expect(() => validateFormSubmission(buildForm(), {
      name: 'Yudhi',
      role: 'Owner',
      signature: 'data:image/png;base64,abc',
    })).toThrow('Pilihan untuk "Role" tidak valid')
  })

  it('rejects text longer than max length', () => {
    expect(() => validateFormSubmission(buildForm(), {
      name: 'Nama terlalu panjang',
      role: 'Admin',
      signature: 'data:image/png;base64,abc',
    })).toThrow('Field "Nama" melebihi batas panjang')
  })

  it('rejects non-png data url signatures', () => {
    expect(() => validateFormSubmission(buildForm(), {
      name: 'Yudhi',
      role: 'Admin',
      signature: 'data:image/jpeg;base64,abc',
    })).toThrow('Format tanda tangan tidak valid')
  })

  it('rejects oversized signatures', () => {
    expect(() => validateFormSubmission(buildForm(), {
      name: 'Yudhi',
      role: 'Admin',
      signature: `data:image/png;base64,${'a'.repeat(500_001)}`,
    })).toThrow('Ukuran tanda tangan terlalu besar')
  })

  it('returns trimmed validated values', () => {
    expect(validateFormSubmission(buildForm(), {
      name: ' Yudhi ',
      role: 'Admin',
      signature: 'data:image/png;base64,abc',
    })).toEqual({
      name: 'Yudhi',
      role: 'Admin',
      signature: 'data:image/png;base64,abc',
    })
  })
})

describe('normalizeAdminSubmissionPagination', () => {
  it('defaults submissions pagination to first page with bounded page size', () => {
    expect(normalizeAdminSubmissionPagination()).toEqual({ page: 1, pageSize: 20 })
  })

  it('normalizes invalid submissions pagination input', () => {
    expect(normalizeAdminSubmissionPagination({ page: 0, pageSize: 0 })).toEqual({ page: 1, pageSize: 20 })
    expect(normalizeAdminSubmissionPagination({ page: Number.NaN, pageSize: Number.POSITIVE_INFINITY })).toEqual({ page: 1, pageSize: 20 })
  })

  it('caps submissions pagination page size', () => {
    expect(normalizeAdminSubmissionPagination({ page: 3, pageSize: 500 })).toEqual({ page: 3, pageSize: 100 })
  })
})
