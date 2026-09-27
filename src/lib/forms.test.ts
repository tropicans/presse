import { describe, expect, it, vi } from 'vitest'
import {
  FormSubmissionError,
  normalizeAdminSubmissionPagination,
  shouldUseLegacyAttendanceSubmission,
  type PublicFormDefinition,
  validateFormSubmission,
  updateAdminForm,
  sanitizeNipNrp,
  validateNipNrp,
  isNipNrpField,
  sanitizeEmail,
  validateEmail,
  isEmailField,
  sanitizePhoneNumber,
  validatePhoneNumber,
  isPhoneField,
  sanitizeName,
  validateName,
  isNameField,
  validateSignatureValue,
} from './forms'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/prisma', () => {
  return {
    prisma: {
      $queryRaw: vi.fn().mockImplementation(async (strings: TemplateStringsArray) => {
        const sql = strings.join('?')
        if (sql.includes('FROM forms')) {
          return [{
            id: 'form_123',
            slug: 'test-form',
            title: 'Test Form',
            description: null,
            successMessage: null,
            status: 'DRAFT',
            mode: 'STANDARD',
            settingsJson: null,
            updatedAt: new Date(),
          }]
        }
        if (sql.includes('FROM form_fields')) {
          return [{
            id: 'field_likert',
            formId: 'form_123',
            label: 'Pertanyaan Likert',
            type: 'likert',
            order: 1,
            required: true,
            placeholder: '',
          }]
        }
        if (sql.includes('FROM field_options')) {
          return [
            { id: 'opt1', fieldId: 'field_likert', label: '1 - Sangat tidak setuju', isCorrect: false, points: 0, order: 1 },
            { id: 'opt2', fieldId: 'field_likert', label: '2 - Tidak setuju', isCorrect: false, points: 0, order: 2 },
            { id: 'opt3', fieldId: 'field_likert', label: '3 - Setuju', isCorrect: false, points: 0, order: 3 },
            { id: 'opt4', fieldId: 'field_likert', label: '4 - Sangat setuju', isCorrect: false, points: 0, order: 4 },
          ]
        }
        return []
      }),
      $executeRaw: vi.fn().mockResolvedValue(1),
      $transaction: vi.fn(async (callback) => {
        const mockTx = {
          $queryRaw: vi.fn().mockImplementation(async (strings: TemplateStringsArray) => {
            const sql = strings.join('?')
            if (sql.includes('COUNT(*)')) {
              return [{ count: BigInt(1) }]
            }
            if (sql.includes('MAX("order")')) {
              return [{ max_order: 1 }]
            }
            return []
          }),
          $executeRaw: vi.fn().mockResolvedValue(1),
        }
        return callback(mockTx)
      })
    }
  }
})

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

  it('allows explicit larger page size for bounded exports', () => {
    expect(normalizeAdminSubmissionPagination({ page: 1, pageSize: 500 }, 500)).toEqual({ page: 1, pageSize: 500 })
  })
})

describe('shouldUseLegacyAttendanceSubmission', () => {
  const legacyFields: PublicFormDefinition['fields'] = [
    { id: 'participantType', name: 'participantType', label: 'Tipe Peserta', type: 'radio', required: true, options: ['Internal', 'Eksternal'] },
    { id: 'namaLengkap', name: 'namaLengkap', label: 'Nama Lengkap', type: 'text', required: true },
    { id: 'nipNrp', name: 'nipNrp', label: 'NIP/NRP', type: 'text', required: true },
    { id: 'jabatan', name: 'jabatan', label: 'Jabatan', type: 'text', required: true },
    { id: 'unitKerja', name: 'unitKerja', label: 'Unit Kerja', type: 'text', required: true },
    { id: 'sebagai', name: 'sebagai', label: 'Sebagai', type: 'radio', required: true, options: ['Peserta'] },
    { id: 'signature', name: 'signature', label: 'Tanda Tangan', type: 'signature', required: true },
  ]

  it('keeps cloned webinar forms in the forms engine', () => {
    expect(shouldUseLegacyAttendanceSubmission({
      id: 'form_clone',
      slug: 'daftar-hadir-402571',
      title: 'Daftar Hadir',
      description: null,
      successMessage: null,
      submitLabel: 'Kirim',
      fields: legacyFields,
      settings: { workflow: 'WEBINAR' },
    })).toBe(false)
  })

  it('uses legacy attendance only for attendance template', () => {
    expect(shouldUseLegacyAttendanceSubmission({
      id: 'attendance-template-form',
      slug: 'attendance-template',
      title: 'Daftar Hadir',
      description: null,
      successMessage: null,
      submitLabel: 'Kirim',
      fields: legacyFields,
      settings: { workflow: 'WEBINAR', legacyTarget: 'attendance' },
    })).toBe(true)
  })
})

describe('updateAdminForm', () => {
  it('allows saving Likert fields with custom option lengths (e.g. 4 options)', async () => {
    await expect(
      updateAdminForm('form_123', {
        title: 'Test Form',
        description: '',
        successMessage: '',
        status: 'DRAFT',
        mode: 'STANDARD',
        quizSettings: { passingPercentage: 0 },
        pages: [{ id: 'page-1' }],
        fields: [
          {
            id: 'field_likert',
            label: 'Pertanyaan Likert',
            type: 'likert',
            required: true,
            placeholder: '',
            pageId: 'page-1',
            options: [
              { label: '1 - Sangat tidak setuju', isCorrect: false, points: 0, nextPageId: '' },
              { label: '2 - Tidak setuju', isCorrect: false, points: 0, nextPageId: '' },
              { label: '3 - Setuju', isCorrect: false, points: 0, nextPageId: '' },
              { label: '4 - Sangat setuju', isCorrect: false, points: 0, nextPageId: '' },
            ],
          },
        ],
      })
    ).resolves.not.toThrow()
  })
})

describe('NIP/NRP validation and sanitization', () => {
  it('identifies NIP/NRP fields correctly', () => {
    expect(isNipNrpField({ name: 'nipNrp' })).toBe(true)
    expect(isNipNrpField({ name: 'field_123', label: 'NIP' })).toBe(true)
    expect(isNipNrpField({ name: 'field_123', label: 'NRP' })).toBe(true)
    expect(isNipNrpField({ name: 'field_123', label: 'NIP/NRP' })).toBe(true)
    expect(isNipNrpField({ name: 'nama', label: 'Nama Lengkap' })).toBe(false)
  })

  it('sanitizes spaces, dots, and hyphens', () => {
    expect(sanitizeNipNrp(' 19850101 201001 1 001 ')).toBe('198501012010011001')
    expect(sanitizeNipNrp('19850101-201001-1-001')).toBe('198501012010011001')
    expect(sanitizeNipNrp('19850101.201001.1.001')).toBe('198501012010011001')
  })

  it('validates correct NIP (18 digits) and NRP (5-8 digits)', () => {
    expect(validateNipNrp('198501012010011001')).toBeNull()
    expect(validateNipNrp(' 19850101 201001 1 001 ')).toBeNull()
    expect(validateNipNrp('12345678')).toBeNull() // NRP Polri 8 digits
    expect(validateNipNrp('12345')).toBeNull() // NRP TNI 5 digits
    expect(validateNipNrp('123456')).toBeNull() // NRP TNI 6 digits
  })

  it('rejects invalid format, too short, too long, or incomplete NIP', () => {
    expect(validateNipNrp('1234')).toBe('NIP/NRP terlalu pendek (minimal 5 digit)')
    expect(validateNipNrp('19850101201001')).toBe('NIP harus 18 digit angka, atau NRP 5-8 digit angka')
    expect(validateNipNrp('19850101201001100100')).toBe('NIP/NRP maksimal 18 digit angka')
    expect(validateNipNrp('19850101ABCD011001')).toBe('NIP/NRP hanya boleh berisi angka')
  })

  it('validates and auto-sanitizes NIP/NRP in validateFormSubmission', () => {
    const formDef: PublicFormDefinition = {
      id: 'form-nip',
      slug: 'form-nip-test',
      title: 'Form NIP',
      description: null,
      successMessage: null,
      submitLabel: 'Kirim',
      fields: [
        { id: 'nipField', name: 'nipNrp', label: 'NIP/NRP', type: 'text', required: true },
      ],
      settings: { workflow: 'STANDARD' },
    }

    // Valid submission with formatted NIP is sanitized to 18 clean digits
    const result = validateFormSubmission(formDef, {
      nipNrp: '19850101 201001 1 001',
    })
    expect(result.nipNrp).toBe('198501012010011001')

    // Invalid length throws FormSubmissionError
    expect(() => {
      validateFormSubmission(formDef, {
        nipNrp: '198501012010',
      })
    }).toThrow(FormSubmissionError)
  })
})

describe('Email, Phone, Name, and Signature format validators', () => {
  it('identifies email, phone, and name fields correctly', () => {
    expect(isEmailField({ name: 'email', label: 'Alamat Email' })).toBe(true)
    expect(isEmailField({ name: 'userSurel', label: 'Surel' })).toBe(true)
    expect(isEmailField({ name: 'nama', label: 'Nama Lengkap' })).toBe(false)

    expect(isPhoneField({ name: 'noTelepon', label: 'Nomor Telepon' })).toBe(true)
    expect(isPhoneField({ name: 'wa', label: 'WhatsApp' })).toBe(true)
    expect(isPhoneField({ name: 'hp', label: 'No. HP' })).toBe(true)
    expect(isPhoneField({ name: 'alamat', label: 'Alamat' })).toBe(false)

    expect(isNameField({ name: 'namaLengkap', label: 'Nama Lengkap' })).toBe(true)
    expect(isNameField({ name: 'name', label: 'Nama Peserta' })).toBe(true)
    expect(isNameField({ name: 'instansi', label: 'Unit Kerja' })).toBe(false)
  })

  it('sanitizes and validates emails', () => {
    expect(sanitizeEmail('  User@Example.COM  ')).toBe('user@example.com')
    expect(validateEmail('user@example.com')).toBeNull()
    expect(validateEmail('invalid-email')).toBe('Format email tidak valid (contoh: nama@domain.com)')
    expect(validateEmail('user@domain')).toBe('Format email tidak valid (contoh: nama@domain.com)')
  })

  it('sanitizes and validates phone numbers', () => {
    expect(sanitizePhoneNumber('+62 812-3456-7890')).toBe('081234567890')
    expect(sanitizePhoneNumber('6281234567890')).toBe('081234567890')
    expect(sanitizePhoneNumber('0812 3456 7890')).toBe('081234567890')

    expect(validatePhoneNumber('081234567890')).toBeNull()
    expect(validatePhoneNumber('+62 812 3456 7890')).toBeNull()
    expect(validatePhoneNumber('0812345')).toBe('Nomor telepon/WhatsApp terlalu pendek (minimal 10 digit)')
    expect(validatePhoneNumber('08123456789012345')).toBe('Nomor telepon/WhatsApp maksimal 15 digit')
    expect(validatePhoneNumber('08123456abc')).toBe('Nomor telepon/WhatsApp hanya boleh berisi angka')
  })

  it('sanitizes and validates full names', () => {
    expect(sanitizeName('   Budi    Santoso   ')).toBe('Budi Santoso')
    expect(validateName('Budi Santoso')).toBeNull()
    expect(validateName('A')).toBe('Nama lengkap minimal 2 karakter')
    expect(validateName('Budi <script>')).toBe('Nama lengkap mengandung karakter yang tidak diizinkan')
  })

  it('validates signature format', () => {
    // Valid canvas base64 image (PNG)
    const validCanvas = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACWAQMAAABf6N'
    expect(validateSignatureValue(validCanvas)).toBeNull()

    // Non-PNG format rejected
    expect(validateSignatureValue('data:image/jpeg;base64,abc')).toBe('Format tanda tangan tidak valid')
    expect(validateSignatureValue('Budi Santoso')).toBe('Format tanda tangan tidak valid')

    // Empty canvas content
    expect(validateSignatureValue('data:image/png;base64,')).toBe('Tanda tangan tidak boleh kosong')
  })

  it('enforces validation and sanitization in validateFormSubmission for Email, Phone, Name, Signature', () => {
    const validSig = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAASwAAACWAQMAAABf6N'
    const formDef: PublicFormDefinition = {
      id: 'form-comprehensive',
      slug: 'form-comprehensive-test',
      title: 'Form Pendaftaran',
      description: null,
      successMessage: null,
      submitLabel: 'Kirim',
      fields: [
        { id: 'f1', name: 'namaLengkap', label: 'Nama Lengkap', type: 'text', required: true },
        { id: 'f2', name: 'email', label: 'Alamat Email', type: 'text', required: true },
        { id: 'f3', name: 'noTelepon', label: 'Nomor WhatsApp', type: 'text', required: true },
        { id: 'f4', name: 'tandaTangan', label: 'Tanda Tangan', type: 'signature', required: true },
      ],
      settings: { workflow: 'STANDARD' },
    }

    // Valid payload: values are sanitized
    const validResult = validateFormSubmission(formDef, {
      namaLengkap: '  Ahmad   Dahlan  ',
      email: '  Ahmad@Example.COM ',
      noTelepon: '+62 812-9988-7766',
      tandaTangan: validSig,
    })

    expect(validResult.namaLengkap).toBe('Ahmad Dahlan')
    expect(validResult.email).toBe('ahmad@example.com')
    expect(validResult.noTelepon).toBe('081299887766')
    expect(validResult.tandaTangan).toBe(validSig)

    // Invalid email triggers error
    expect(() => {
      validateFormSubmission(formDef, {
        namaLengkap: 'Ahmad Dahlan',
        email: 'invalid-email',
        noTelepon: '081299887766',
        tandaTangan: validSig,
      })
    }).toThrow('Format email tidak valid')

    // Invalid phone triggers error
    expect(() => {
      validateFormSubmission(formDef, {
        namaLengkap: 'Ahmad Dahlan',
        email: 'ahmad@example.com',
        noTelepon: '123',
        tandaTangan: validSig,
      })
    }).toThrow('Nomor telepon/WhatsApp')
  })
})
