import { describe, it, expect } from 'vitest'

process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db'

import { isNipNrpField, validateNipNrp, filterNipInput } from '@/lib/form-validation'
import { validateFormSubmission, PublicFormDefinition } from '@/lib/forms'

describe('NIP input detection and letter prevention reproduction', () => {
  it('detects NIP field with complex label such as "NIP pendaftar/ketua tim *"', () => {
    const field1 = { name: 'nip_pendaftar', label: 'NIP pendaftar/ketua tim *', type: 'text' }
    const field2 = { name: 'f_custom_123', label: 'NIP pendaftar/ketua tim', type: 'text' }
    const field3 = { name: 'nipKetuaTim', label: 'Nomor Identitas', type: 'text' }
    const field4 = { name: 'custom', label: 'Nomor Induk Pegawai (NIP)', type: 'text' }

    expect(isNipNrpField(field1)).toBe(true)
    expect(isNipNrpField(field2)).toBe(true)
    expect(isNipNrpField(field3)).toBe(true)
    expect(isNipNrpField(field4)).toBe(true)
  })

  it('rejects letters like sfgsdfsdfsdf in validateNipNrp', () => {
    expect(validateNipNrp('sfgsdfsdfsdf')).toBe('NIP/NRP hanya boleh berisi angka')
  })

  it('filters out letters in real-time so letters cannot be entered in NIP field', () => {
    expect(filterNipInput('sfgsdfsdfsdf')).toBe('')
    expect(filterNipInput('19850101abcd201001')).toBe('19850101201001')
    expect(filterNipInput(' 19850101-201001 ')).toBe('19850101201001')
  })

  it('validates and rejects non-digit input during form submission for NIP pendaftar/ketua tim', () => {
    const formDef: PublicFormDefinition = {
      id: 'test-nip-form',
      slug: 'test-nip-form',
      title: 'Form NIP Test',
      description: null,
      successMessage: null,
      submitLabel: 'Kirim',
      fields: [
        {
          id: 'field_nip',
          name: 'nip_ketua',
          label: 'NIP pendaftar/ketua tim *',
          type: 'text',
          required: true,
        },
      ],
      settings: { workflow: 'STANDARD' },
    }

    expect(() => {
      validateFormSubmission(formDef, { nip_ketua: 'sfgsdfsdfsdf' })
    }).toThrow('NIP/NRP hanya boleh berisi angka')
  })
})
