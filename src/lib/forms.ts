import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const MAX_TEXT_LENGTH = 500
const MAX_SIGNATURE_LENGTH = 500000
const ATTENDANCE_FORM_SLUG = 'attendance-template'
const ATTENDANCE_FORM_ID = 'attendance-template-form'

type FieldType = 'SHORT_TEXT' | 'LONG_TEXT' | 'RADIO' | 'SELECT' | 'YES_NO' | 'SIGNATURE'

export type FormFieldType = 'text' | 'textarea' | 'radio' | 'signature'

interface BaseField {
  id: string
  name: string
  label: string
  type: FormFieldType
  required?: boolean
}

export interface TextField extends BaseField {
  type: 'text' | 'textarea'
  placeholder?: string | null
  maxLength?: number
  rows?: number
}

export interface RadioField extends BaseField {
  type: 'radio'
  options: string[]
}

export interface SignatureField extends BaseField {
  type: 'signature'
}

export type FormField = TextField | RadioField | SignatureField

export interface FormSettings {
  uniqueFields?: string[]
  legacyTarget?: 'attendance'
}

export interface PublicFormDefinition {
  id: string
  slug: string
  title: string
  description: string | null
  submitLabel: string
  fields: FormField[]
  settings: FormSettings
}

export interface AdminFormListItem {
  id: string
  slug: string
  title: string
  description: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  mode: 'STANDARD' | 'QUIZ'
  submissionCount: number
  updatedAt: string
}

export interface AdminEditableField {
  id: string
  name: string
  label: string
  type: FormFieldType
  required: boolean
  placeholder: string
  options: string[]
}

export interface AdminFormDetail {
  id: string
  slug: string
  title: string
  description: string | null
  successMessage: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  mode: 'STANDARD' | 'QUIZ'
  fields: AdminEditableField[]
}

export interface AdminFormSubmissionItem {
  id: string
  createdAt: string
  answers: Record<string, string>
}

export interface AdminFormSubmissionsResult {
  form: Pick<AdminFormDetail, 'id' | 'slug' | 'title' | 'status'>
  columns: Array<{
    id: string
    name: string
    label: string
    type: FormFieldType
  }>
  items: AdminFormSubmissionItem[]
}

interface FormRow {
  id: string
  slug: string
  title: string
  description: string | null
  successMessage: string | null
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  mode?: 'STANDARD' | 'QUIZ'
  updatedAt?: Date
  submissionCount?: number
}

interface FieldRow {
  id: string
  formId: string
  label: string
  type: FieldType
  order: number
  required: boolean
  placeholder: string | null
}

interface FieldOptionRow {
  fieldId: string
  label: string
  value: string
  order: number
}

interface SubmissionRow {
  id: string
  createdAt: Date
  fieldId: string
  valueText: string | null
}

interface SubmissionAnswerRow {
  fieldId: string
  valueText: string | null
}

const defaultAttendanceFields = [
  {
    id: 'attendance-field-1',
    name: 'namaLengkap',
    label: 'Nama Lengkap',
    type: 'SHORT_TEXT' as const,
    order: 1,
    required: true,
    placeholder: null,
    options: [] as string[],
  },
  {
    id: 'attendance-field-2',
    name: 'nipNrp',
    label: 'NIP/NRP',
    type: 'SHORT_TEXT' as const,
    order: 2,
    required: true,
    placeholder: null,
    options: [] as string[],
  },
  {
    id: 'attendance-field-3',
    name: 'jabatan',
    label: 'Jabatan',
    type: 'LONG_TEXT' as const,
    order: 3,
    required: true,
    placeholder: null,
    options: [] as string[],
  },
  {
    id: 'attendance-field-4',
    name: 'unitKerja',
    label: 'Unit Kerja',
    type: 'LONG_TEXT' as const,
    order: 4,
    required: true,
    placeholder: null,
    options: [] as string[],
  },
  {
    id: 'attendance-field-5',
    name: 'sebagai',
    label: 'Sebagai',
    type: 'RADIO' as const,
    order: 5,
    required: true,
    placeholder: null,
    options: ['Penguji', 'Coach', 'Mentor'],
  },
  {
    id: 'attendance-field-6',
    name: 'signature',
    label: 'Tanda Tangan',
    type: 'SIGNATURE' as const,
    order: 6,
    required: true,
    placeholder: null,
    options: [] as string[],
  },
]

const fieldNameByLabel: Record<string, string> = {
  'nama lengkap': 'namaLengkap',
  'nip/nrp': 'nipNrp',
  jabatan: 'jabatan',
  'unit kerja': 'unitKerja',
  sebagai: 'sebagai',
  'tanda tangan': 'signature',
  signature: 'signature',
}

const attendanceProtectedFieldNames = new Set([
  'namaLengkap',
  'nipNrp',
  'jabatan',
  'unitKerja',
  'sebagai',
  'signature',
])

const attendanceFieldNameById: Record<string, string> = defaultAttendanceFields.reduce((acc, field) => {
  acc[field.id] = field.name
  return acc
}, {} as Record<string, string>)

export class FormSubmissionError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'FormSubmissionError'
    this.status = status
  }
}

function normalizeLabel(label: string) {
  return label.trim().toLowerCase()
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 50)
}

function mapFieldType(type: FieldType): FormFieldType | null {
  switch (type) {
    case 'SHORT_TEXT':
      return 'text'
    case 'LONG_TEXT':
      return 'textarea'
    case 'RADIO':
      return 'radio'
    case 'SIGNATURE':
      return 'signature'
    default:
      return null
  }
}

function mapFieldName(field: Pick<FieldRow, 'id' | 'label' | 'order'>) {
  return attendanceFieldNameById[field.id]
    ?? fieldNameByLabel[normalizeLabel(field.label)]
    ?? `field_${field.order}`
}

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`
}

async function seedAttendanceTemplateIfNeeded() {
  const existingRows = await prisma.$queryRaw<FormRow[]>`
    SELECT id, slug, title, description, success_message AS "successMessage"
    FROM forms
    WHERE slug = ${ATTENDANCE_FORM_SLUG}
    LIMIT 1
  `

  let formId = existingRows[0]?.id

  if (!formId) {
    await prisma.$executeRaw`
      INSERT INTO forms (id, slug, title, description, status, mode, success_message, created_at, updated_at)
      VALUES (
        ${ATTENDANCE_FORM_ID},
        ${ATTENDANCE_FORM_SLUG},
        ${'Daftar Hadir'},
        ${'Seminar Evaluasi Rancangan Aktualisasi Pelatihan Dasar CPNS Golongan II Angkatan V dan Golongan III Angkatan X Kemensetneg Tahun 2026'},
        'PUBLISHED'::"FormStatus",
        'STANDARD'::"FormMode",
        ${'Kehadiran Anda telah berhasil dicatat.'},
        NOW(),
        NOW()
      )
      ON CONFLICT (slug) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        success_message = EXCLUDED.success_message,
        updated_at = NOW()
    `

    formId = ATTENDANCE_FORM_ID
  } else {
    await prisma.$executeRaw`
      UPDATE forms
      SET
        title = ${'Daftar Hadir'},
        description = ${'Seminar Evaluasi Rancangan Aktualisasi Pelatihan Dasar CPNS Golongan II Angkatan V dan Golongan III Angkatan X Kemensetneg Tahun 2026'},
        success_message = ${'Kehadiran Anda telah berhasil dicatat.'},
        updated_at = NOW()
      WHERE id = ${formId}
    `
  }

  const existingFields = await prisma.$queryRaw<FieldRow[]>`
    SELECT
      id,
      form_id AS "formId",
      label,
      type::text AS type,
      "order",
      required,
      placeholder
    FROM form_fields
    WHERE form_id = ${formId}
    ORDER BY "order" ASC
  `

  if (existingFields.length === 0) {
    for (const field of defaultAttendanceFields) {
      await prisma.$executeRaw`
        INSERT INTO form_fields (
          id,
          form_id,
          label,
          type,
          "order",
          required,
          placeholder,
          help_text,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          ${field.id},
          ${formId},
          ${field.label},
          ${field.type}::"FieldType",
          ${field.order},
          ${field.required},
          ${field.placeholder},
          ${null},
          ${true},
          NOW(),
          NOW()
        )
      `

      for (let index = 0; index < field.options.length; index += 1) {
        const option = field.options[index]
        await prisma.$executeRaw`
          INSERT INTO field_options (
            id,
            field_id,
            label,
            value,
            "order",
            is_correct,
            points,
            created_at
          ) VALUES (
            ${`${field.id}-option-${index + 1}`},
            ${field.id},
            ${option},
            ${option},
            ${index + 1},
            ${false},
            ${0},
            NOW()
          )
          ON CONFLICT (field_id, value) DO NOTHING
        `
      }
    }
  }
}

async function getPublicFormRows(slug: string) {
  if (slug === ATTENDANCE_FORM_SLUG) {
    await seedAttendanceTemplateIfNeeded()
  }

  const forms = await prisma.$queryRaw<FormRow[]>`
    SELECT id, slug, title, description, success_message AS "successMessage"
    FROM forms
    WHERE slug = ${slug} AND status = 'PUBLISHED'::"FormStatus"
    LIMIT 1
  `

  const form = forms[0]

  if (!form) {
    return null
  }

  const fields = await prisma.$queryRaw<FieldRow[]>`
    SELECT
      id,
      form_id AS "formId",
      label,
      type::text AS type,
      "order",
      required,
      placeholder
    FROM form_fields
    WHERE form_id = ${form.id} AND is_active = true
    ORDER BY "order" ASC
  `

  const options = await prisma.$queryRaw<FieldOptionRow[]>`
    SELECT field_id AS "fieldId", label, value, "order"
    FROM field_options
    WHERE field_id IN (
      SELECT id FROM form_fields WHERE form_id = ${form.id} AND is_active = true
    )
    ORDER BY "order" ASC
  `

  return { form, fields, options }
}

async function getFormRowsById(id: string) {
  const forms = await prisma.$queryRaw<FormRow[]>`
    SELECT
      id,
      slug,
      title,
      description,
      success_message AS "successMessage",
      status::text AS status,
      mode::text AS mode,
      updated_at AS "updatedAt"
    FROM forms
    WHERE id = ${id}
    LIMIT 1
  `

  const form = forms[0]

  if (!form) {
    return null
  }

  const fields = await prisma.$queryRaw<FieldRow[]>`
    SELECT
      id,
      form_id AS "formId",
      label,
      type::text AS type,
      "order",
      required,
      placeholder
    FROM form_fields
    WHERE form_id = ${form.id} AND is_active = true
    ORDER BY "order" ASC
  `

  const options = await prisma.$queryRaw<FieldOptionRow[]>`
    SELECT field_id AS "fieldId", label, value, "order"
    FROM field_options
    WHERE field_id IN (
      SELECT id FROM form_fields WHERE form_id = ${form.id} AND is_active = true
    )
    ORDER BY "order" ASC
  `

  return { form, fields, options }
}

export async function getPublicFormBySlug(slug: string): Promise<PublicFormDefinition | null> {
  const rows = await getPublicFormRows(slug)

  if (!rows) {
    return null
  }

  const optionsByField = rows.options.reduce<Record<string, string[]>>((acc, option) => {
    acc[option.fieldId] ??= []
    acc[option.fieldId].push(option.value || option.label)
    return acc
  }, {})

  const fields = rows.fields.flatMap<FormField>((field) => {
    const mappedType = mapFieldType(field.type)

    if (!mappedType) {
      return []
    }

    const name = mapFieldName(field)

    if (mappedType === 'radio') {
      return [{
        id: field.id,
        name,
        label: field.label,
        type: mappedType,
        required: field.required,
        options: optionsByField[field.id] ?? [],
      }]
    }

    if (mappedType === 'signature') {
      return [{
        id: field.id,
        name,
        label: field.label,
        type: mappedType,
        required: field.required,
      }]
    }

    return [{
      id: field.id,
      name,
      label: field.label,
      type: mappedType,
      required: field.required,
      placeholder: field.placeholder,
      maxLength: name === 'nipNrp' ? 50 : MAX_TEXT_LENGTH,
      rows: mappedType === 'textarea' ? 3 : undefined,
    }]
  })

  return {
    id: rows.form.id,
    slug: rows.form.slug,
    title: rows.form.title,
    description: rows.form.description,
    submitLabel: 'Submit',
    fields,
    settings: {
      uniqueFields: ['nipNrp'],
      legacyTarget: rows.form.slug === ATTENDANCE_FORM_SLUG ? 'attendance' : undefined,
    },
  }
}

function getStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateFormSubmission(form: PublicFormDefinition, payload: Record<string, unknown>) {
  const values: Record<string, string> = {}

  for (const field of form.fields) {
    const value = getStringValue(payload[field.name])

    if (field.required && !value) {
      throw new FormSubmissionError(`Field "${field.label}" wajib diisi`, 400)
    }

    if (!value) {
      values[field.name] = ''
      continue
    }

    if (field.type === 'radio') {
      if (!field.options.includes(value)) {
        throw new FormSubmissionError(`Pilihan untuk "${field.label}" tidak valid`, 400)
      }
      values[field.name] = value
      continue
    }

    if (field.type === 'signature') {
      if (!value.startsWith('data:image/png;base64,')) {
        throw new FormSubmissionError('Format tanda tangan tidak valid', 400)
      }
      if (value.length > MAX_SIGNATURE_LENGTH) {
        throw new FormSubmissionError('Ukuran tanda tangan terlalu besar', 400)
      }
      values[field.name] = value
      continue
    }

    const maxLength = field.maxLength ?? MAX_TEXT_LENGTH
    if (value.length > maxLength) {
      throw new FormSubmissionError(`Field "${field.label}" melebihi batas panjang`, 400)
    }

    values[field.name] = value
  }

  return values
}

async function findExistingAttendanceSubmission(formId: string, nipFieldId: string, nipNrp: string) {
  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT s.id
    FROM submissions s
    JOIN submission_answers sa ON sa.submission_id = s.id
    WHERE s.form_id = ${formId}
      AND sa.field_id = ${nipFieldId}
      AND sa.value_text = ${nipNrp}
    LIMIT 1
  `

  return rows[0] ?? null
}

async function createFormsEngineSubmission(
  rows: NonNullable<Awaited<ReturnType<typeof getPublicFormRows>>>,
  values: Record<string, string>,
  tx: typeof prisma | Prisma.TransactionClient = prisma
) {
  const submissionId = randomId('submission')
  await tx.$executeRaw`
    INSERT INTO submissions (id, form_id, path_json, created_at, completed_at)
    VALUES (${submissionId}, ${rows.form.id}, ${null}, NOW(), NOW())
  `

  for (const field of rows.fields) {
    const fieldName = mapFieldName(field)
    const value = values[fieldName] ?? ''

    await tx.$executeRaw`
      INSERT INTO submission_answers (
        id,
        submission_id,
        field_id,
        value_text,
        value_json,
        created_at
      ) VALUES (
        ${randomId('answer')},
        ${submissionId},
        ${field.id},
        ${value},
        ${null},
        NOW()
      )
    `
  }

  return { id: submissionId }
}

export async function createAttendanceSubmission(payload: Record<string, unknown>) {
  const form = await getPublicFormBySlug(ATTENDANCE_FORM_SLUG)

  if (!form) {
    throw new FormSubmissionError('Form daftar hadir tidak ditemukan', 404)
  }

  const values = validateFormSubmission(form, payload)

  const rows = await getPublicFormRows(ATTENDANCE_FORM_SLUG)
  const nipField = rows?.fields.find((field) => mapFieldName(field) === 'nipNrp')

  if (rows && nipField) {
    const existingSubmission = await findExistingAttendanceSubmission(rows.form.id, nipField.id, values.nipNrp)
    if (existingSubmission) {
      throw new FormSubmissionError(
        'NIP/NRP sudah terdaftar. Anda sudah mengisi daftar hadir.',
        409
      )
    }
  }

  try {
    const attendance = await prisma.$transaction(async (tx) => {
      const createdAttendance = await tx.attendance.create({
        data: {
          namaLengkap: values.namaLengkap,
          nipNrp: values.nipNrp,
          jabatan: values.jabatan,
          unitKerja: values.unitKerja,
          sebagai: values.sebagai,
          signature: values.signature,
        },
      })

      if (!rows) {
        throw new FormSubmissionError('Form daftar hadir tidak ditemukan', 404)
      }

      await createFormsEngineSubmission(rows, values, tx)

      return createdAttendance
    })

    return {
      id: attendance.id,
      message: 'Daftar hadir berhasil disimpan',
    }
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      throw error
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new FormSubmissionError(
        'NIP/NRP sudah terdaftar. Anda sudah mengisi daftar hadir.',
        409
      )
    }

    throw error
  }
}

export async function createPublicFormSubmission(slug: string, payload: Record<string, unknown>) {
  const form = await getPublicFormBySlug(slug)

  if (!form) {
    throw new FormSubmissionError('Form tidak ditemukan', 404)
  }

  if (form.settings.legacyTarget === 'attendance') {
    return createAttendanceSubmission(payload)
  }

  const values = validateFormSubmission(form, payload)
  const rows = await getPublicFormRows(form.slug)

  if (!rows) {
    throw new FormSubmissionError('Form tidak ditemukan', 404)
  }

  const submission = await createFormsEngineSubmission(rows, values)

  return {
    id: submission.id,
    message: 'Form berhasil dikirim',
  }
}

export async function listAdminForms(): Promise<AdminFormListItem[]> {
  await seedAttendanceTemplateIfNeeded()

  const rows = await prisma.$queryRaw<FormRow[]>`
    SELECT
      f.id,
      f.slug,
      f.title,
      f.description,
      f.success_message AS "successMessage",
      f.status::text AS status,
      f.mode::text AS mode,
      f.updated_at AS "updatedAt",
      COUNT(s.id)::int AS "submissionCount"
    FROM forms f
    LEFT JOIN submissions s ON s.form_id = f.id
    GROUP BY f.id
    ORDER BY f.updated_at DESC, f.created_at DESC
  `

  return rows.map((row) => ({
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    status: row.status ?? 'DRAFT',
    mode: row.mode ?? 'STANDARD',
    submissionCount: row.submissionCount ?? 0,
    updatedAt: row.updatedAt?.toISOString() ?? new Date().toISOString(),
  }))
}

export async function getAdminFormDetail(id: string): Promise<AdminFormDetail | null> {
  const rows = await getFormRowsById(id)

  if (!rows) {
    return null
  }

  const optionsByField = rows.options.reduce<Record<string, string[]>>((acc, option) => {
    acc[option.fieldId] ??= []
    acc[option.fieldId].push(option.value || option.label)
    return acc
  }, {})

  return {
    id: rows.form.id,
    slug: rows.form.slug,
    title: rows.form.title,
    description: rows.form.description,
    successMessage: rows.form.successMessage,
    status: rows.form.status ?? 'DRAFT',
    mode: rows.form.mode ?? 'STANDARD',
    fields: rows.fields.flatMap((field) => {
      const type = mapFieldType(field.type)
      if (!type) {
        return []
      }

      return [{
        id: field.id,
        name: mapFieldName(field),
        label: field.label,
        type,
        required: field.required,
        placeholder: field.placeholder ?? '',
        options: optionsByField[field.id] ?? [],
      }]
    }),
  }
}

interface UpdateAdminFormPayload {
  title: string
  description: string
  successMessage: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  fields: Array<{
    id: string
    type: FormFieldType
    label: string
    required: boolean
    placeholder?: string
    options?: string[]
  }>
}

function mapFormFieldTypeToDb(type: FormFieldType): FieldType {
  switch (type) {
    case 'text':
      return 'SHORT_TEXT'
    case 'textarea':
      return 'LONG_TEXT'
    case 'radio':
      return 'RADIO'
    case 'signature':
      return 'SIGNATURE'
  }
}

function isProtectedAttendanceField(field: Pick<AdminEditableField, 'id' | 'name'>) {
  return attendanceProtectedFieldNames.has(field.name) || defaultAttendanceFields.some((item) => item.id === field.id)
}

export async function updateAdminForm(id: string, payload: UpdateAdminFormPayload) {
  const current = await getAdminFormDetail(id)

  if (!current) {
    throw new FormSubmissionError('Form tidak ditemukan', 404)
  }

  const title = payload.title.trim()
  if (!title) {
    throw new FormSubmissionError('Judul form wajib diisi', 400)
  }

  const allowedStatuses = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED'])
  if (!allowedStatuses.has(payload.status)) {
    throw new FormSubmissionError('Status form tidak valid', 400)
  }

  if (current.slug === ATTENDANCE_FORM_SLUG) {
    const protectedFields = current.fields.filter(isProtectedAttendanceField)

    if (protectedFields.length !== attendanceProtectedFieldNames.size) {
      throw new FormSubmissionError('Field inti attendance tidak lengkap. Periksa template attendance.', 400)
    }

    const payloadById = new Map(payload.fields.map((field) => [field.id, field]))
    for (const field of protectedFields) {
      const incoming = payloadById.get(field.id)

      if (!incoming) {
        throw new FormSubmissionError('Field inti attendance tidak boleh dihapus', 400)
      }

      if (incoming.type !== field.type) {
        throw new FormSubmissionError('Tipe field inti attendance tidak boleh diubah', 400)
      }
    }

    const currentOrder = protectedFields.map((field) => field.id)
    const incomingOrder = payload.fields
      .filter((field) => currentOrder.includes(field.id))
      .map((field) => field.id)

    if (incomingOrder.join('|') !== currentOrder.join('|')) {
      throw new FormSubmissionError('Urutan field inti attendance tidak boleh diubah', 400)
    }
  }

  const editableFieldIds = new Set(current.fields.map((field) => field.id))
  const allowedTypes = new Set<FormFieldType>(['text', 'textarea', 'radio', 'signature'])

  if (payload.fields.length === 0) {
    throw new FormSubmissionError('Form harus memiliki minimal satu field', 400)
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      UPDATE forms
      SET
        title = ${title},
        description = ${payload.description.trim() || null},
        success_message = ${payload.successMessage.trim() || null},
        status = ${payload.status}::"FormStatus",
        updated_at = NOW()
      WHERE id = ${id}
    `

    const seenIds = new Set<string>()

    for (let index = 0; index < payload.fields.length; index += 1) {
      const field = payload.fields[index]
      const label = field.label.trim()
      if (!label) {
        throw new FormSubmissionError('Label field wajib diisi', 400)
      }

      if (!allowedTypes.has(field.type)) {
        throw new FormSubmissionError('Tipe field tidak valid', 400)
      }

      const placeholder = field.placeholder?.trim() || null
      const dbType = mapFormFieldTypeToDb(field.type)
      const options = (field.options ?? [])
        .map((option) => option.trim())
        .filter(Boolean)

      if (field.type === 'radio' && options.length === 0) {
        throw new FormSubmissionError('Field pilihan harus punya minimal satu opsi', 400)
      }

      if (editableFieldIds.has(field.id)) {
        seenIds.add(field.id)

        await tx.$executeRaw`
          UPDATE form_fields
          SET
            label = ${label},
            type = ${dbType}::"FieldType",
            required = ${field.required},
            placeholder = ${placeholder},
            "order" = ${index + 1},
            is_active = ${true},
            updated_at = NOW()
          WHERE id = ${field.id}
        `
      } else {
        const newFieldId = randomId('field')
        seenIds.add(newFieldId)

        await tx.$executeRaw`
          INSERT INTO form_fields (
            id,
            form_id,
            label,
            type,
            "order",
            required,
            placeholder,
            help_text,
            is_active,
            created_at,
            updated_at
          ) VALUES (
            ${newFieldId},
            ${id},
            ${label},
            ${dbType}::"FieldType",
            ${index + 1},
            ${field.required},
            ${placeholder},
            ${null},
            ${true},
            NOW(),
            NOW()
          )
        `

        field.id = newFieldId
      }

      if (field.type === 'radio') {
        await tx.$executeRaw`DELETE FROM field_options WHERE field_id = ${field.id}`

        for (let index = 0; index < options.length; index += 1) {
          const option = options[index]
          await tx.$executeRaw`
            INSERT INTO field_options (
              id,
              field_id,
              label,
              value,
              "order",
              is_correct,
              points,
              created_at
            ) VALUES (
              ${randomId('option')},
              ${field.id},
              ${option},
              ${option},
              ${index + 1},
              ${false},
              ${0},
              NOW()
            )
          `
        }
      } else {
        await tx.$executeRaw`DELETE FROM field_options WHERE field_id = ${field.id}`
      }
    }

    for (const existingField of current.fields) {
      if (!payload.fields.some((field) => field.id === existingField.id)) {
        await tx.$executeRaw`
          UPDATE form_fields
          SET is_active = ${false}, updated_at = NOW()
          WHERE id = ${existingField.id}
        `
        await tx.$executeRaw`DELETE FROM field_options WHERE field_id = ${existingField.id}`
      }
    }
  })

  return await getAdminFormDetail(id)
}

export async function createAdminForm(title: string) {
  const normalizedTitle = title.trim()

  if (!normalizedTitle) {
    throw new FormSubmissionError('Judul form wajib diisi', 400)
  }

  const baseSlug = slugify(normalizedTitle) || 'form-baru'
  const candidateSlug = `${baseSlug}-${Date.now().toString().slice(-6)}`
  const formId = randomId('form')

  const starterFields = [
    { label: 'Nama Lengkap', type: 'SHORT_TEXT' as const, placeholder: 'Masukkan nama lengkap' },
    { label: 'Email', type: 'SHORT_TEXT' as const, placeholder: 'Masukkan email' },
    { label: 'Catatan', type: 'LONG_TEXT' as const, placeholder: 'Tambahkan catatan bila perlu' },
  ]

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO forms (id, slug, title, description, status, mode, success_message, created_at, updated_at)
      VALUES (
        ${formId},
        ${candidateSlug},
        ${normalizedTitle},
        ${'Deskripsi form baru'},
        'DRAFT'::"FormStatus",
        'STANDARD'::"FormMode",
        ${'Terima kasih, data Anda berhasil dikirim.'},
        NOW(),
        NOW()
      )
    `

    for (let index = 0; index < starterFields.length; index += 1) {
      const field = starterFields[index]
      await tx.$executeRaw`
        INSERT INTO form_fields (
          id,
          form_id,
          label,
          type,
          "order",
          required,
          placeholder,
          help_text,
          is_active,
          created_at,
          updated_at
        ) VALUES (
          ${randomId('field')},
          ${formId},
          ${field.label},
          ${field.type}::"FieldType",
          ${index + 1},
          ${true},
          ${field.placeholder},
          ${null},
          ${true},
          NOW(),
          NOW()
        )
      `
    }
  })

  return await getAdminFormDetail(formId)
}

export async function listAdminFormSubmissions(id: string): Promise<AdminFormSubmissionsResult | null> {
  const detail = await getAdminFormDetail(id)

  if (!detail) {
    return null
  }

  const rows = await prisma.$queryRaw<SubmissionRow[]>`
    SELECT
      s.id,
      s.created_at AS "createdAt",
      sa.field_id AS "fieldId",
      sa.value_text AS "valueText"
    FROM submissions s
    LEFT JOIN submission_answers sa ON sa.submission_id = s.id
    WHERE s.form_id = ${id}
    ORDER BY s.created_at DESC, sa.created_at ASC
  `

  const itemsById = new Map<string, AdminFormSubmissionItem>()

  for (const row of rows) {
    const item = itemsById.get(row.id) ?? {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      answers: {},
    }

    const field = detail.fields.find((candidate) => candidate.id === row.fieldId)
    if (field) {
      item.answers[field.name] = row.valueText ?? ''
    }

    itemsById.set(row.id, item)
  }

  return {
    form: {
      id: detail.id,
      slug: detail.slug,
      title: detail.title,
      status: detail.status,
    },
    columns: detail.fields.map((field) => ({
      id: field.id,
      name: field.name,
      label: field.label,
      type: field.type,
    })),
    items: Array.from(itemsById.values()),
  }
}

export async function deleteAdminFormSubmission(formId: string, submissionId: string) {
  const detail = await getAdminFormDetail(formId)

  if (!detail) {
    throw new FormSubmissionError('Form tidak ditemukan', 404)
  }

  const submissionRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM submissions
    WHERE id = ${submissionId} AND form_id = ${formId}
    LIMIT 1
  `

  if (submissionRows.length === 0) {
    throw new FormSubmissionError('Submission tidak ditemukan', 404)
  }

  const answers = await prisma.$queryRaw<SubmissionAnswerRow[]>`
    SELECT
      field_id AS "fieldId",
      value_text AS "valueText"
    FROM submission_answers
    WHERE submission_id = ${submissionId}
  `

  const nipField = detail.fields.find((field) => field.name === 'nipNrp')
  const nipValue = nipField
    ? answers.find((answer) => answer.fieldId === nipField.id)?.valueText?.trim() ?? ''
    : ''

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      DELETE FROM submissions
      WHERE id = ${submissionId} AND form_id = ${formId}
    `

    if (detail.slug === ATTENDANCE_FORM_SLUG && nipValue) {
      await tx.attendance.deleteMany({
        where: { nipNrp: nipValue },
      })
    }
  })

  return { success: true }
}

function escapeCsvValue(value: string) {
  const normalized = value.replace(/\r?\n/g, ' ').trim()
  const escaped = normalized.replace(/"/g, '""')
  return `"${escaped}"`
}

export async function exportAdminFormSubmissionsCsv(id: string) {
  const data = await listAdminFormSubmissions(id)

  if (!data) {
    throw new FormSubmissionError('Form tidak ditemukan', 404)
  }

  const headers = ['Waktu Submit', ...data.columns.map((column) => column.label)]
  const lines = [headers.map(escapeCsvValue).join(',')]

  for (const item of data.items) {
    const row = [
      new Date(item.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      ...data.columns.map((column) => item.answers[column.name] ?? ''),
    ]
    lines.push(row.map(escapeCsvValue).join(','))
  }

  const fileSlug = slugify(data.form.slug || data.form.title) || 'form-submissions'

  return {
    filename: `${fileSlug}-${new Date().toISOString().slice(0, 10)}.csv`,
    content: `\uFEFF${lines.join('\n')}`,
  }
}
