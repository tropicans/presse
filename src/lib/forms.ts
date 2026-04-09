import { revalidatePath } from 'next/cache'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'

const MAX_TEXT_LENGTH = 500
const MAX_SIGNATURE_LENGTH = 500000
const DEFAULT_QUIZ_PASS_PERCENTAGE = 70
const ATTENDANCE_FORM_SLUG = 'attendance-template'
const ATTENDANCE_FORM_ID = 'attendance-template-form'
const ATTENDANCE_PARTICIPANT_TYPE_OPTIONS = ['Internal', 'Eksternal'] as const
const WEBINAR_CORE_FIELD_ID_PREFIX = 'webinar-core-'

type FieldType = 'SHORT_TEXT' | 'LONG_TEXT' | 'RADIO' | 'SELECT' | 'YES_NO' | 'SIGNATURE'
export type FormWorkflow = 'STANDARD' | 'WEBINAR'
export type FormMode = 'STANDARD' | 'QUIZ' | 'ATTENDANCE'

export type FormFieldType = 'text' | 'textarea' | 'radio' | 'select' | 'likert' | 'signature'

const CONDITIONAL_ROUTE_SUBMIT = '__SUBMIT__'

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
  type: 'radio' | 'likert'
  options: string[]
}

export interface SelectField extends BaseField {
  type: 'select'
  options: string[]
}

export interface SignatureField extends BaseField {
  type: 'signature'
}

export type FormField = TextField | RadioField | SelectField | SignatureField

export interface FormPageDefinition {
  id: string
  title: string
  description?: string | null
  fieldIds: string[]
}

interface FormConditionalRoute {
  fieldId: string
  optionLabel: string
  nextPageId: string
}

export interface FormSettings {
  workflow: FormWorkflow
  uniqueFields?: string[]
  legacyTarget?: 'attendance'
  branching?: FormBranchingConfig
  quiz?: QuizSettings
  pages?: FormPageDefinition[]
  conditionalRoutes?: FormConditionalRoute[]
}

export interface QuizSettings {
  passingPercentage: number
}

export interface FormStepDefinition {
  id: string
  title: string
  description?: string | null
  fieldNames: string[]
}

export interface FormBranchingConfig {
  participantTypeFieldName: string
  internalValue: string
  externalValue: string
  internalOnlyFieldNames: string[]
  steps: FormStepDefinition[]
}

export interface PublicFormDefinition {
  id: string
  slug: string
  title: string
  description: string | null
  successMessage: string | null
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
  mode: FormMode
  submissionCount: number
  quizSummary: {
    totalQuizSubmissions: number
    passedCount: number
    failedCount: number
    passRate: number | null
    averageScorePercentage: number | null
  } | null
  updatedAt: string
}

export interface AdminEditableFieldOption {
  label: string
  isCorrect: boolean
  points: number
  nextPageId?: string
}

export interface AdminEditableField {
  id: string
  name: string
  label: string
  type: FormFieldType
  required: boolean
  placeholder: string
  pageId: string
  options: AdminEditableFieldOption[]
}

export interface AdminFormPage {
  id: string
  title: string
  description: string
}

export interface AdminFormDetail {
  id: string
  slug: string
  title: string
  description: string | null
  successMessage: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  mode: FormMode
  workflow: FormWorkflow
  quizSettings: QuizSettings
  pages: AdminFormPage[]
  fields: AdminEditableField[]
}

export interface AdminFormSubmissionItem {
  id: string
  createdAt: string
  answers: Record<string, string>
  meta: {
    participantType: 'internal' | 'external' | null
    quiz: {
      score: number
      maxScore: number
      correctAnswers: number
      totalQuestions: number
      passingScore: number
      passed: boolean
    } | null
  }
}

export interface PublicSubmissionSummary {
  submissionId: string
  formTitle: string
  participantType: 'internal' | 'external' | null
  quiz: {
    score: number
    maxScore: number
    correctAnswers: number
    totalQuestions: number
    passingScore: number
    passed: boolean
  } | null
}

export interface PublicSubmissionResult {
  id: string
  message: string
}

interface SubmissionJobSnapshotField {
  id: string
  name: string
}

interface SubmissionJobPayload {
  values: Record<string, string>
  fields: SubmissionJobSnapshotField[]
}

interface SubmissionJobRow {
  id: string
  submissionId: string
  formId: string
  payloadJson: Prisma.JsonValue
  pathJson: Prisma.JsonValue | null
  attempts: number
}

export interface AdminFormSubmissionsResult {
  form: Pick<AdminFormDetail, 'id' | 'slug' | 'title' | 'status'>
  totalItems: number
  hasParticipantType: boolean
  hasQuiz: boolean
  columns: Array<{
    id: string
    name: string
    label: string
    type: FormFieldType
  }>
  items: AdminFormSubmissionItem[]
}

export interface AdminSubmissionFilters {
  participantType: 'all' | 'internal' | 'external'
  quizStatus: 'all' | 'passed' | 'failed' | 'ungraded'
  sortBy: 'newest' | 'oldest' | 'score-desc' | 'score-asc'
}

interface FormRow {
  id: string
  slug: string
  title: string
  description: string | null
  successMessage: string | null
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  mode?: FormMode
  settingsJson?: Prisma.JsonValue | null
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
  isCorrect: boolean
  points: number
}

interface SubmissionRow {
  id: string
  createdAt: Date
  fieldId: string
  valueText: string | null
  pathJson: Prisma.JsonValue | null
}

interface SubmissionAnswerRow {
  fieldId: string
  valueText: string | null
}

interface PublicFormRowsResult {
  form: FormRow
  fields: FieldRow[]
  options: FieldOptionRow[]
}

interface PublicFormCacheEntry {
  expiresAt: number
  value: PublicFormRowsResult | null
}

const PUBLIC_FORM_CACHE_TTL_MS = 30_000
const publicFormCache = new Map<string, PublicFormCacheEntry>()
const publicFormInflight = new Map<string, Promise<PublicFormRowsResult | null>>()
const submissionJobDelaySeconds = Number(process.env.SUBMISSION_JOB_DELAY_SECONDS ?? '5')

let attendanceTemplateReady = false
let attendanceTemplatePromise: Promise<void> | null = null

interface QuizSummaryRow {
  formId: string
  totalQuizSubmissions: number
  passedCount: number
  failedCount: number
  averageScorePercentage: number | null
}

const defaultAttendanceFields = [
  {
    id: 'attendance-field-0',
    name: 'participantType',
    label: 'Tipe Peserta',
    type: 'RADIO' as const,
    order: 1,
    required: true,
    placeholder: null,
    options: [...ATTENDANCE_PARTICIPANT_TYPE_OPTIONS],
  },
  {
    id: 'attendance-field-1',
    name: 'namaLengkap',
    label: 'Nama Lengkap',
    type: 'SHORT_TEXT' as const,
    order: 2,
    required: true,
    placeholder: null,
    options: [] as string[],
  },
  {
    id: 'attendance-field-2',
    name: 'nipNrp',
    label: 'NIP/NRP',
    type: 'SHORT_TEXT' as const,
    order: 3,
    required: true,
    placeholder: null,
    options: [] as string[],
  },
  {
    id: 'attendance-field-3',
    name: 'jabatan',
    label: 'Jabatan',
    type: 'LONG_TEXT' as const,
    order: 4,
    required: true,
    placeholder: null,
    options: [] as string[],
  },
  {
    id: 'attendance-field-4',
    name: 'unitKerja',
    label: 'Unit Kerja',
    type: 'LONG_TEXT' as const,
    order: 5,
    required: true,
    placeholder: null,
    options: [] as string[],
  },
  {
    id: 'attendance-field-5',
    name: 'sebagai',
    label: 'Sebagai',
    type: 'RADIO' as const,
    order: 6,
    required: true,
    placeholder: null,
    options: ['Penguji', 'Coach', 'Mentor'],
  },
  {
    id: 'attendance-field-6',
    name: 'signature',
    label: 'Tanda Tangan',
    type: 'SIGNATURE' as const,
    order: 7,
    required: true,
    placeholder: null,
    options: [] as string[],
  },
]

const fieldNameByLabel: Record<string, string> = {
  'tipe peserta': 'participantType',
  'nama lengkap': 'namaLengkap',
  'nip/nrp': 'nipNrp',
  jabatan: 'jabatan',
  'unit kerja': 'unitKerja',
  sebagai: 'sebagai',
  'tanda tangan': 'signature',
  signature: 'signature',
}

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
    case 'SELECT':
      return 'select'
    case 'SIGNATURE':
      return 'signature'
    default:
      return null
  }
}

function isLikertOptionSet<T extends { isCorrect: boolean }>(options: T[]) {
  return options.length === 5 && options.every((option) => option.isCorrect !== true)
}

function resolveFormFieldType<T extends { isCorrect: boolean }>(
  type: FieldType,
  options: T[]
): FormFieldType | null {
  const mappedType = mapFieldType(type)

  if (mappedType === 'radio' && isLikertOptionSet(options)) {
    return 'likert'
  }

  return mappedType
}

function mapFieldName(field: Pick<FieldRow, 'id' | 'label' | 'order'>) {
  if (field.id.startsWith(WEBINAR_CORE_FIELD_ID_PREFIX)) {
    const encodedName = field.id.slice(WEBINAR_CORE_FIELD_ID_PREFIX.length).split('-')[0]
    if (encodedName) {
      return encodedName
    }
  }

  return attendanceFieldNameById[field.id]
    ?? fieldNameByLabel[normalizeLabel(field.label)]
    ?? `field_${field.order}`
}

function randomId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replace(/-/g, '')}`
}

function sameChoice(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function createConditionalRouteKey(fieldId: string, optionLabel: string) {
  return `${fieldId}::${normalizeLabel(optionLabel)}`
}

function normalizePassingPercentage(value: unknown) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_QUIZ_PASS_PERCENTAGE
  }

  return Math.min(100, Math.max(1, Math.round(value)))
}

function readFormWorkflow(
  slug: string,
  settingsJson: Prisma.JsonValue | null
): FormWorkflow {
  if (slug === ATTENDANCE_FORM_SLUG) {
    return 'WEBINAR'
  }

  if (!settingsJson || typeof settingsJson !== 'object' || Array.isArray(settingsJson)) {
    return 'STANDARD'
  }

  const workflow = (settingsJson as Record<string, unknown>).workflow
  return workflow === 'WEBINAR' ? 'WEBINAR' : 'STANDARD'
}

function readQuizSettings(settingsJson: Prisma.JsonValue | null): QuizSettings {
  if (!settingsJson || typeof settingsJson !== 'object' || Array.isArray(settingsJson)) {
    return {
      passingPercentage: DEFAULT_QUIZ_PASS_PERCENTAGE,
    }
  }

  const settings = settingsJson as Record<string, unknown>
  const quiz = settings.quiz

  if (!quiz || typeof quiz !== 'object' || Array.isArray(quiz)) {
    return {
      passingPercentage: DEFAULT_QUIZ_PASS_PERCENTAGE,
    }
  }

  return {
    passingPercentage: normalizePassingPercentage((quiz as Record<string, unknown>).passingPercentage),
  }
}

function createDefaultFormPages(fieldIds: string[]): FormPageDefinition[] {
  return [{
    id: 'page-1',
    title: '',
    description: null,
    fieldIds,
  }]
}

function readFormPages(
  settingsJson: Prisma.JsonValue | null,
  fieldIds: string[]
): FormPageDefinition[] {
  if (!settingsJson || typeof settingsJson !== 'object' || Array.isArray(settingsJson)) {
    return createDefaultFormPages(fieldIds)
  }

  const settings = settingsJson as Record<string, unknown>
  const rawPages = settings.pages

  if (!Array.isArray(rawPages) || rawPages.length === 0) {
    return createDefaultFormPages(fieldIds)
  }

  const availableIds = new Set(fieldIds)
  const seenFieldIds = new Set<string>()
  const pages = rawPages.flatMap<FormPageDefinition>((rawPage, index) => {
    if (!rawPage || typeof rawPage !== 'object' || Array.isArray(rawPage)) {
      return []
    }

    const page = rawPage as Record<string, unknown>
    const id = typeof page.id === 'string' && page.id.trim()
      ? page.id.trim()
      : `page-${index + 1}`
    const title = typeof page.title === 'string'
      ? page.title.trim()
      : ''
    const description = typeof page.description === 'string' && page.description.trim()
      ? page.description.trim()
      : null
    const fieldIdsForPage = Array.isArray(page.fieldIds)
      ? page.fieldIds
        .filter((fieldId): fieldId is string => typeof fieldId === 'string' && availableIds.has(fieldId))
        .filter((fieldId) => {
          if (seenFieldIds.has(fieldId)) {
            return false
          }

          seenFieldIds.add(fieldId)
          return true
        })
      : []

    return [{
      id,
      title,
      description,
      fieldIds: fieldIdsForPage,
    }]
  })

  const unassignedFieldIds = fieldIds.filter((fieldId) => !seenFieldIds.has(fieldId))

  if (pages.length === 0) {
    return createDefaultFormPages(fieldIds)
  }

  if (unassignedFieldIds.length > 0) {
    pages[0] = {
      ...pages[0],
      fieldIds: [...pages[0].fieldIds, ...unassignedFieldIds],
    }
  }

  return pages
}

function readFormConditionalRoutes(
  settingsJson: Prisma.JsonValue | null,
  fieldIds: string[],
  pageIds: string[]
): FormConditionalRoute[] {
  if (!settingsJson || typeof settingsJson !== 'object' || Array.isArray(settingsJson)) {
    return []
  }

  const settings = settingsJson as Record<string, unknown>
  const rawRoutes = settings.conditionalRoutes

  if (!Array.isArray(rawRoutes) || rawRoutes.length === 0) {
    return []
  }

  const availableFieldIds = new Set(fieldIds)
  const availableTargets = new Set([...pageIds, CONDITIONAL_ROUTE_SUBMIT])
  const seenKeys = new Set<string>()

  return rawRoutes.flatMap<FormConditionalRoute>((rawRoute) => {
    if (!rawRoute || typeof rawRoute !== 'object' || Array.isArray(rawRoute)) {
      return []
    }

    const route = rawRoute as Record<string, unknown>
    const fieldId = typeof route.fieldId === 'string' ? route.fieldId.trim() : ''
    const optionLabel = typeof route.optionLabel === 'string' ? route.optionLabel.trim() : ''
    const nextPageId = typeof route.nextPageId === 'string' ? route.nextPageId.trim() : ''

    if (!fieldId || !optionLabel || !nextPageId) {
      return []
    }

    if (!availableFieldIds.has(fieldId) || !availableTargets.has(nextPageId)) {
      return []
    }

    const key = createConditionalRouteKey(fieldId, optionLabel)
    if (seenKeys.has(key)) {
      return []
    }

    seenKeys.add(key)
    return [{
      fieldId,
      optionLabel,
      nextPageId,
    }]
  })
}

function serializeFormSettings(
  workflow: FormWorkflow,
  quizSettings: QuizSettings,
  pages?: FormPageDefinition[],
  conditionalRoutes?: FormConditionalRoute[]
) {
  return JSON.stringify({
    workflow,
    quiz: {
      passingPercentage: normalizePassingPercentage(quizSettings.passingPercentage),
    },
    pages: pages?.map((page) => ({
      id: page.id,
      title: page.title,
      description: page.description ?? null,
      fieldIds: page.fieldIds,
    })),
    conditionalRoutes: conditionalRoutes?.map((route) => ({
      fieldId: route.fieldId,
      optionLabel: route.optionLabel,
      nextPageId: route.nextPageId,
    })),
  })
}

function buildAttendanceBranching(fields: FormField[]): FormBranchingConfig | undefined {
  const fieldNames = new Set(fields.map((field) => field.name))

  if (!fieldNames.has('participantType')) {
    return undefined
  }

  const sharedFieldNames = fields
    .map((field) => field.name)
    .filter((name) => name !== 'participantType' && name !== 'nipNrp')

  const steps: FormStepDefinition[] = [
    {
      id: 'participant-type',
      title: 'Tipe Peserta',
      description: 'Pilih kategori peserta webinar sebelum melanjutkan presensi.',
      fieldNames: ['participantType'],
    },
  ]

  if (fieldNames.has('nipNrp')) {
    steps.push({
      id: 'internal-identity',
      title: 'Data Internal',
      description: 'Lengkapi identitas pegawai internal untuk presensi webinar.',
      fieldNames: ['nipNrp'],
    })
  }

  if (sharedFieldNames.length > 0) {
    steps.push({
      id: 'shared-attendance',
      title: 'Data Presensi',
      description: 'Lengkapi data presensi dan identitas umum peserta webinar.',
      fieldNames: sharedFieldNames,
    })
  }

  return {
    participantTypeFieldName: 'participantType',
    internalValue: ATTENDANCE_PARTICIPANT_TYPE_OPTIONS[0],
    externalValue: ATTENDANCE_PARTICIPANT_TYPE_OPTIONS[1],
    internalOnlyFieldNames: ['nipNrp'],
    steps,
  }
}

function hasLegacyAttendanceShape(form: PublicFormDefinition) {
  const fieldNames = new Set(form.fields.map((field) => field.name))

  return [
    'participantType',
    'namaLengkap',
    'nipNrp',
    'jabatan',
    'unitKerja',
    'sebagai',
    'signature',
  ].every((fieldName) => fieldNames.has(fieldName))
}

function getVisibleFieldNames(form: PublicFormDefinition, payload: Record<string, unknown>) {
  const visible = new Set(form.fields.map((field) => field.name))
  const branching = form.settings.branching

  if (!branching) {
    return visible
  }

  const participantType = getStringValue(payload[branching.participantTypeFieldName])

  if (sameChoice(participantType, branching.externalValue)) {
    for (const fieldName of branching.internalOnlyFieldNames) {
      visible.delete(fieldName)
    }
  }

  return visible
}

function buildSubmissionPath(form: PublicFormDefinition, values: Record<string, string>) {
  const branching = form.settings.branching

  if (!branching) {
    return null
  }

  const participantType = values[branching.participantTypeFieldName] ?? ''
  if (!participantType) {
    return null
  }

  const completedStepIds = ['participant-type']

  if (sameChoice(participantType, branching.internalValue)) {
    completedStepIds.push('internal-identity')
  }

  if (branching.steps.some((step) => step.id === 'shared-attendance')) {
    completedStepIds.push('shared-attendance')
  }

  return {
    workflow: 'attendance-webinar',
    participantType: sameChoice(participantType, branching.internalValue) ? 'internal' : 'external',
    completedStepIds,
  }
}

function buildPublicOptionsByField(options: FieldOptionRow[]) {
  return options.reduce<Record<string, string[]>>((acc, option) => {
    acc[option.fieldId] ??= []
    acc[option.fieldId].push(option.value || option.label)
    return acc
  }, {})
}

function buildAdminOptionsByField(options: FieldOptionRow[]) {
  return options.reduce<Record<string, AdminEditableFieldOption[]>>((acc, option) => {
    acc[option.fieldId] ??= []
    acc[option.fieldId].push({
      label: option.value || option.label,
      isCorrect: option.isCorrect,
      points: option.points,
    })
    return acc
  }, {})
}

function buildFormSettings(form: Pick<FormRow, 'slug' | 'settingsJson'>, fields: FormField[]): FormSettings {
  const workflow = readFormWorkflow(form.slug, form.settingsJson ?? null)
  const pages = workflow === 'STANDARD'
    ? readFormPages(form.settingsJson ?? null, fields.map((field) => field.id))
    : undefined

  return {
    workflow,
    uniqueFields: workflow === 'WEBINAR' ? ['nipNrp'] : undefined,
    legacyTarget: form.slug === ATTENDANCE_FORM_SLUG ? 'attendance' : undefined,
    branching: workflow === 'WEBINAR' ? buildAttendanceBranching(fields) : undefined,
    quiz: readQuizSettings(form.settingsJson ?? null),
    pages,
    conditionalRoutes: workflow === 'STANDARD' && pages
      ? readFormConditionalRoutes(
          form.settingsJson ?? null,
          fields.map((field) => field.id),
          pages.map((page) => page.id)
        )
      : undefined,
  }
}

function evaluateQuizSubmission(
  form: PublicFormDefinition,
  rows: NonNullable<Awaited<ReturnType<typeof getPublicFormRows>>>,
  values: Record<string, string>
) {
  const optionsByField = rows.options.reduce<Record<string, FieldOptionRow[]>>((acc, option) => {
    acc[option.fieldId] ??= []
    acc[option.fieldId].push(option)
    return acc
  }, {})

  let totalQuestions = 0
  let correctAnswers = 0
  let score = 0
  let maxScore = 0

  for (const field of rows.fields) {
    const options = optionsByField[field.id] ?? []
    const correctOptions = options.filter((option) => option.isCorrect)

    if (correctOptions.length === 0) {
      continue
    }

    totalQuestions += 1

    const bestPoints = Math.max(
      ...correctOptions.map((option) => (option.points > 0 ? option.points : 1)),
      1
    )
    maxScore += bestPoints

    const selectedValue = values[mapFieldName(field)] ?? ''
    const matchedOption = correctOptions.find((option) => sameChoice(option.value || option.label, selectedValue))

    if (matchedOption) {
      correctAnswers += 1
      score += matchedOption.points > 0 ? matchedOption.points : 1
    }
  }

  if (totalQuestions === 0) {
    return null
  }

  const passingPercentage = normalizePassingPercentage(form.settings.quiz?.passingPercentage)
  const passingScore = Math.max(1, Math.ceil((maxScore * passingPercentage) / 100))

  return {
    score,
    maxScore,
    correctAnswers,
    totalQuestions,
    passingPercentage,
    passingScore,
    passed: score >= passingScore,
  }
}

function buildSubmissionMeta(
  form: PublicFormDefinition,
  rows: NonNullable<Awaited<ReturnType<typeof getPublicFormRows>>>,
  values: Record<string, string>
) {
  const path = buildSubmissionPath(form, values) ?? {}
  const quiz = evaluateQuizSubmission(form, rows, values)

  return {
    ...path,
    quiz,
  }
}

function readSubmissionMeta(pathJson: Prisma.JsonValue | null): AdminFormSubmissionItem['meta'] {
  if (!pathJson || typeof pathJson !== 'object' || Array.isArray(pathJson)) {
    return {
      participantType: null,
      quiz: null,
    }
  }

  const record = pathJson as Record<string, unknown>
  const participantType = record.participantType
  const rawQuiz = record.quiz

  const normalizedParticipantType =
    participantType === 'internal' || participantType === 'external' ? participantType : null

  if (!rawQuiz || typeof rawQuiz !== 'object' || Array.isArray(rawQuiz)) {
    return {
      participantType: normalizedParticipantType,
      quiz: null,
    }
  }

  const quiz = rawQuiz as Record<string, unknown>

  return {
    participantType: normalizedParticipantType,
    quiz: {
      score: typeof quiz.score === 'number' ? quiz.score : 0,
      maxScore: typeof quiz.maxScore === 'number' ? quiz.maxScore : 0,
      correctAnswers: typeof quiz.correctAnswers === 'number' ? quiz.correctAnswers : 0,
      totalQuestions: typeof quiz.totalQuestions === 'number' ? quiz.totalQuestions : 0,
      passingScore: typeof quiz.passingScore === 'number' ? quiz.passingScore : 0,
      passed: quiz.passed === true,
    },
  }
}

function getDefaultAdminSubmissionFilters(): AdminSubmissionFilters {
  return {
    participantType: 'all',
    quizStatus: 'all',
    sortBy: 'newest',
  }
}

export function normalizeAdminSubmissionFilters(
  filters?: Partial<AdminSubmissionFilters>
): AdminSubmissionFilters {
  const defaults = getDefaultAdminSubmissionFilters()

  return {
    participantType:
      filters?.participantType === 'internal' || filters?.participantType === 'external'
        ? filters.participantType
        : defaults.participantType,
    quizStatus:
      filters?.quizStatus === 'passed'
      || filters?.quizStatus === 'failed'
      || filters?.quizStatus === 'ungraded'
        ? filters.quizStatus
        : defaults.quizStatus,
    sortBy:
      filters?.sortBy === 'oldest'
      || filters?.sortBy === 'score-desc'
      || filters?.sortBy === 'score-asc'
        ? filters.sortBy
        : defaults.sortBy,
  }
}

function getQuizScoreRatio(item: AdminFormSubmissionItem) {
  const quiz = item.meta.quiz

  if (!quiz || quiz.maxScore <= 0) {
    return null
  }

  return quiz.score / quiz.maxScore
}

function applyAdminSubmissionFilters(
  items: AdminFormSubmissionItem[],
  filters?: Partial<AdminSubmissionFilters>
) {
  const normalizedFilters = normalizeAdminSubmissionFilters(filters)

  return [...items]
    .filter((item) => {
      if (
        normalizedFilters.participantType !== 'all'
        && item.meta.participantType !== normalizedFilters.participantType
      ) {
        return false
      }

      if (normalizedFilters.quizStatus === 'passed' && item.meta.quiz?.passed !== true) {
        return false
      }

      if (normalizedFilters.quizStatus === 'failed' && (!item.meta.quiz || item.meta.quiz.passed !== false)) {
        return false
      }

      if (normalizedFilters.quizStatus === 'ungraded' && item.meta.quiz) {
        return false
      }

      return true
    })
    .sort((left, right) => {
      if (normalizedFilters.sortBy === 'oldest') {
        return new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime()
      }

      if (normalizedFilters.sortBy === 'score-desc') {
        return (getQuizScoreRatio(right) ?? -1) - (getQuizScoreRatio(left) ?? -1)
      }

      if (normalizedFilters.sortBy === 'score-asc') {
        return (getQuizScoreRatio(left) ?? Number.MAX_SAFE_INTEGER)
          - (getQuizScoreRatio(right) ?? Number.MAX_SAFE_INTEGER)
      }

      return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    })
}

async function seedAttendanceTemplateIfNeeded() {
  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(4243, hashtext(${ATTENDANCE_FORM_SLUG}))
    `

    const existingRows = await tx.$queryRaw<FormRow[]>`
      SELECT
        id,
        slug,
        title,
        description,
        success_message AS "successMessage",
        settings_json AS "settingsJson"
      FROM forms
      WHERE slug = ${ATTENDANCE_FORM_SLUG}
      LIMIT 1
    `

    let formId = existingRows[0]?.id
    const quizSettings = readQuizSettings(existingRows[0]?.settingsJson ?? null)

    if (!formId) {
      await tx.$executeRaw`
        INSERT INTO forms (id, slug, title, description, status, mode, success_message, settings_json, created_at, updated_at)
        VALUES (
          ${ATTENDANCE_FORM_ID},
          ${ATTENDANCE_FORM_SLUG},
          ${'Daftar Hadir'},
          ${'Seminar Evaluasi Rancangan Aktualisasi Pelatihan Dasar CPNS Golongan II Angkatan V dan Golongan III Angkatan X Kemensetneg Tahun 2026'},
          'PUBLISHED'::"FormStatus",
          'STANDARD'::"FormMode",
          ${'Kehadiran Anda telah berhasil dicatat.'},
          ${serializeFormSettings('WEBINAR', quizSettings)}::jsonb,
          NOW(),
          NOW()
        )
        ON CONFLICT (slug) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          success_message = EXCLUDED.success_message,
          settings_json = COALESCE(forms.settings_json, EXCLUDED.settings_json),
          updated_at = NOW()
      `

      formId = ATTENDANCE_FORM_ID
    } else {
      await tx.$executeRaw`
        UPDATE forms
        SET
          title = ${'Daftar Hadir'},
          description = ${'Seminar Evaluasi Rancangan Aktualisasi Pelatihan Dasar CPNS Golongan II Angkatan V dan Golongan III Angkatan X Kemensetneg Tahun 2026'},
          success_message = ${'Kehadiran Anda telah berhasil dicatat.'},
          settings_json = ${serializeFormSettings('WEBINAR', quizSettings)}::jsonb,
          updated_at = NOW()
        WHERE id = ${formId}
      `
    }

    const existingFields = await tx.$queryRaw<FieldRow[]>`
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

    const existingFieldsById = new Map(existingFields.map((field) => [field.id, field]))
    const existingFieldsByName = new Map(existingFields.map((field) => [mapFieldName(field), field]))
    const needsBranchingShift = !existingFieldsById.has('attendance-field-0')
    const attendanceFieldIds = new Set(defaultAttendanceFields.map((field) => field.id))

    if (existingFields.length > 0) {
      await tx.$executeRaw`
        UPDATE form_fields
        SET "order" = "order" + 1000, updated_at = NOW()
        WHERE form_id = ${formId}
      `
    }

    for (const field of existingFields) {
      if (attendanceFieldIds.has(field.id)) {
        continue
      }

      await tx.$executeRaw`
        UPDATE form_fields
        SET "order" = ${needsBranchingShift ? field.order + 1 : field.order}, updated_at = NOW()
        WHERE id = ${field.id}
      `
    }

    for (const field of defaultAttendanceFields) {
      const existingField = existingFieldsById.get(field.id) ?? existingFieldsByName.get(field.name)

      if (existingField) {
        await tx.$executeRaw`
          UPDATE form_fields
          SET
            type = ${field.type}::"FieldType",
            "order" = ${field.order},
            required = ${field.required},
            placeholder = ${existingField.placeholder ?? field.placeholder},
            is_active = ${true},
            updated_at = NOW()
          WHERE id = ${field.id}
        `
      } else {
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
      }

      const shouldRefreshOptions = field.type === 'RADIO' && (field.id === 'attendance-field-0' || !existingField)

      if (shouldRefreshOptions) {
        await tx.$executeRaw`DELETE FROM field_options WHERE field_id = ${field.id}`

        for (let index = 0; index < field.options.length; index += 1) {
          const option = field.options[index]
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
              ${`${field.id}-option-${index + 1}`},
              ${field.id},
              ${option},
              ${option},
              ${index + 1},
              ${false},
              ${0},
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              field_id = EXCLUDED.field_id,
              label = EXCLUDED.label,
              value = EXCLUDED.value,
              "order" = EXCLUDED."order",
              is_correct = EXCLUDED.is_correct,
              points = EXCLUDED.points
          `
        }
      }
    }
  })
}

async function ensureAttendanceTemplateReady() {
  if (attendanceTemplateReady) {
    return
  }

  if (!attendanceTemplatePromise) {
    attendanceTemplatePromise = seedAttendanceTemplateIfNeeded()
      .then(() => {
        attendanceTemplateReady = true
      })
      .catch((error) => {
        attendanceTemplatePromise = null
        throw error
      })
  }

  await attendanceTemplatePromise
}

function invalidatePublicFormCache(slug?: string) {
  if (slug) {
    publicFormCache.delete(slug)
    publicFormInflight.delete(slug)
    return
  }

  publicFormCache.clear()
  publicFormInflight.clear()
}

function getCachedPublicFormRows(slug: string) {
  const entry = publicFormCache.get(slug)

  if (!entry) {
    return undefined
  }

  if (entry.expiresAt <= Date.now()) {
    publicFormCache.delete(slug)
    return undefined
  }

  return entry.value
}

function setCachedPublicFormRows(slug: string, value: PublicFormRowsResult | null) {
  publicFormCache.set(slug, {
    value,
    expiresAt: Date.now() + PUBLIC_FORM_CACHE_TTL_MS,
  })
}

async function fetchPublicFormRows(slug: string): Promise<PublicFormRowsResult | null> {
  const forms = await prisma.$queryRaw<FormRow[]>`
    SELECT
      id,
      slug,
      title,
      description,
      success_message AS "successMessage",
      settings_json AS "settingsJson"
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
    SELECT
      field_id AS "fieldId",
      label,
      value,
      "order",
      is_correct AS "isCorrect",
      points
    FROM field_options
    WHERE field_id IN (
      SELECT id FROM form_fields WHERE form_id = ${form.id} AND is_active = true
    )
    ORDER BY "order" ASC
  `

  return { form, fields, options }
}

async function getPublicFormRows(slug: string): Promise<PublicFormRowsResult | null> {
  const cached = getCachedPublicFormRows(slug)
  if (cached !== undefined) {
    return cached
  }

  const inflight = publicFormInflight.get(slug)
  if (inflight) {
    return inflight
  }

  const loadPromise = (async () => {
    if (slug === ATTENDANCE_FORM_SLUG) {
      await ensureAttendanceTemplateReady()
    }

    const rows = await fetchPublicFormRows(slug)
    setCachedPublicFormRows(slug, rows)
    return rows
  })().finally(() => {
    publicFormInflight.delete(slug)
  })

  publicFormInflight.set(slug, loadPromise)
  return loadPromise
}

async function getFormRowsById(id: string) {
  if (id === ATTENDANCE_FORM_ID) {
    await ensureAttendanceTemplateReady()
  }

  const forms = await prisma.$queryRaw<FormRow[]>`
    SELECT
      id,
      slug,
      title,
      description,
      success_message AS "successMessage",
      status::text AS status,
      mode::text AS mode,
      settings_json AS "settingsJson",
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
    SELECT
      field_id AS "fieldId",
      label,
      value,
      "order",
      is_correct AS "isCorrect",
      points
    FROM field_options
    WHERE field_id IN (
      SELECT id FROM form_fields WHERE form_id = ${form.id} AND is_active = true
    )
    ORDER BY "order" ASC
  `

  return { form, fields, options }
}

function mapPublicFormRowsToDefinition(rows: PublicFormRowsResult): PublicFormDefinition {
  const optionsByField = buildPublicOptionsByField(rows.options)

  const fields = rows.fields.flatMap<FormField>((field) => {
    const fieldOptions = rows.options.filter((option) => option.fieldId === field.id)
    const mappedType = resolveFormFieldType(field.type, fieldOptions)

    if (!mappedType) {
      return []
    }

    const name = mapFieldName(field)

    if (mappedType === 'radio' || mappedType === 'likert') {
      return [{
        id: field.id,
        name,
        label: field.label,
        type: mappedType,
        required: field.required,
        options: optionsByField[field.id] ?? [],
      }]
    }

    if (mappedType === 'select') {
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
    successMessage: rows.form.successMessage,
    submitLabel: 'Submit',
    fields,
    settings: buildFormSettings(rows.form, fields),
  }
}

export async function getPublicFormBySlug(slug: string): Promise<PublicFormDefinition | null> {
  const rows = await getPublicFormRows(slug)

  if (!rows) {
    return null
  }

  return mapPublicFormRowsToDefinition(rows)
}

function getStringValue(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function validateFormSubmission(form: PublicFormDefinition, payload: Record<string, unknown>) {
  const values: Record<string, string> = {}
  const visibleFieldNames = getVisibleFieldNames(form, payload)

  for (const field of form.fields) {
    const value = getStringValue(payload[field.name])
    const isVisible = visibleFieldNames.has(field.name)

    if (!isVisible) {
      values[field.name] = ''
      continue
    }

    if (field.required && !value) {
      throw new FormSubmissionError(`Field "${field.label}" wajib diisi`, 400)
    }

    if (!value) {
      values[field.name] = ''
      continue
    }

    if (field.type === 'radio' || field.type === 'select' || field.type === 'likert') {
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

    if (field.type === 'text' || field.type === 'textarea') {
      const maxLength = field.maxLength ?? MAX_TEXT_LENGTH
      if (value.length > maxLength) {
        throw new FormSubmissionError(`Field "${field.label}" melebihi batas panjang`, 400)
      }

      values[field.name] = value
      continue
    }
  }

  return values
}

function buildSubmissionAnswerValueRows(rows: PublicFormRowsResult, values: Record<string, string>) {
  return rows.fields.map((field) => {
    const fieldName = mapFieldName(field)
    const value = values[fieldName] ?? ''

    return Prisma.sql`(
      ${randomId('answer')},
      ${field.id},
      ${value}
    )`
  })
}

function buildSubmissionFieldSnapshot(rows: PublicFormRowsResult): SubmissionJobSnapshotField[] {
  return rows.fields.map((field) => ({
    id: field.id,
    name: mapFieldName(field),
  }))
}

function buildSubmissionAnswerValueRowsFromSnapshot(
  fields: SubmissionJobSnapshotField[],
  values: Record<string, string>
) {
  return fields.map((field) => Prisma.sql`(
    ${randomId('answer')},
    ${field.id},
    ${values[field.name] ?? ''}
  )`)
}

function buildFormSubmissionMutation(
  rows: PublicFormRowsResult,
  values: Record<string, string>,
  submissionId: string,
  path: Record<string, unknown> | null = null
) {
  const pathJson = path ? JSON.stringify(path) : null
  const answerRows = buildSubmissionAnswerValueRows(rows, values)

  if (answerRows.length === 0) {
    return Prisma.sql`
      INSERT INTO submissions (id, form_id, path_json, created_at, completed_at)
      VALUES (${submissionId}, ${rows.form.id}, ${pathJson}::jsonb, NOW(), NOW())
    `
  }

  return Prisma.sql`
    WITH submission_insert AS (
      INSERT INTO submissions (id, form_id, path_json, created_at, completed_at)
      VALUES (${submissionId}, ${rows.form.id}, ${pathJson}::jsonb, NOW(), NOW())
      RETURNING id
    )
    INSERT INTO submission_answers (
      id,
      submission_id,
      field_id,
      value_text,
      value_json,
      created_at
    )
    SELECT
      answers.id,
      submission_insert.id,
      answers.field_id,
      answers.value_text,
      NULL::jsonb,
      NOW()
    FROM submission_insert
    CROSS JOIN (
      VALUES ${Prisma.join(answerRows)}
    ) AS answers(id, field_id, value_text)
  `
}

function buildFormSubmissionMutationFromSnapshot(
  formId: string,
  fields: SubmissionJobSnapshotField[],
  values: Record<string, string>,
  submissionId: string,
  pathJson: Prisma.JsonValue | null
) {
  const serializedPath = pathJson ? JSON.stringify(pathJson) : null
  const answerRows = buildSubmissionAnswerValueRowsFromSnapshot(fields, values)

  if (answerRows.length === 0) {
    return Prisma.sql`
      INSERT INTO submissions (id, form_id, path_json, created_at, completed_at)
      VALUES (${submissionId}, ${formId}, ${serializedPath}::jsonb, NOW(), NOW())
    `
  }

  return Prisma.sql`
    WITH submission_insert AS (
      INSERT INTO submissions (id, form_id, path_json, created_at, completed_at)
      VALUES (${submissionId}, ${formId}, ${serializedPath}::jsonb, NOW(), NOW())
      RETURNING id
    )
    INSERT INTO submission_answers (
      id,
      submission_id,
      field_id,
      value_text,
      value_json,
      created_at
    )
    SELECT
      answers.id,
      submission_insert.id,
      answers.field_id,
      answers.value_text,
      NULL::jsonb,
      NOW()
    FROM submission_insert
    CROSS JOIN (
      VALUES ${Prisma.join(answerRows)}
    ) AS answers(id, field_id, value_text)
  `
}

async function enqueueSubmissionJob(
  rows: PublicFormRowsResult,
  values: Record<string, string>,
  submissionId: string,
  path: Prisma.JsonValue | null,
  dedupeFieldName?: string,
  dedupeValue?: string
) {
  const payload = JSON.stringify({
    values,
    fields: buildSubmissionFieldSnapshot(rows),
  } satisfies SubmissionJobPayload)

  await prisma.$executeRaw`
    INSERT INTO submission_jobs (
      id,
      submission_id,
      form_id,
      payload_json,
      path_json,
      dedupe_field_name,
      dedupe_value_text,
      status,
      attempts,
      available_at,
      created_at,
      updated_at
    ) VALUES (
      ${randomId('job')},
      ${submissionId},
      ${rows.form.id},
      ${payload}::jsonb,
      ${path ? JSON.stringify(path) : null}::jsonb,
      ${dedupeFieldName ?? null},
      ${dedupeValue?.trim() || null},
      ${'PENDING'},
      ${0},
      NOW() + (${Math.max(0, submissionJobDelaySeconds)} * INTERVAL '1 second'),
      NOW(),
      NOW()
    )
  `
}

function buildAttendanceAndSubmissionJobMutation(
  rows: PublicFormRowsResult,
  values: Record<string, string>,
  submissionId: string,
  path: Prisma.JsonValue | null,
  dedupeFieldName: string,
  dedupeValue: string
) {
  const payload = JSON.stringify({
    values,
    fields: buildSubmissionFieldSnapshot(rows),
  } satisfies SubmissionJobPayload)

  return Prisma.sql`
    WITH attendance_insert AS (
      INSERT INTO attendances (
        nama_lengkap,
        nip_nrp,
        jabatan,
        unit_kerja,
        sebagai,
        signature,
        created_at
      ) VALUES (
        ${values.namaLengkap},
        ${values.nipNrp},
        ${values.jabatan},
        ${values.unitKerja},
        ${values.sebagai},
        ${values.signature},
        NOW()
      )
      RETURNING 1
    )
    INSERT INTO submission_jobs (
      id,
      submission_id,
      form_id,
      payload_json,
      path_json,
      dedupe_field_name,
      dedupe_value_text,
      status,
      attempts,
      available_at,
      created_at,
      updated_at
    )
    SELECT
      ${randomId('job')},
      ${submissionId},
      ${rows.form.id},
      ${payload}::jsonb,
      ${path ? JSON.stringify(path) : null}::jsonb,
      ${dedupeFieldName},
      ${dedupeValue.trim()},
      ${'PENDING'},
      ${0},
      NOW() + (${Math.max(0, submissionJobDelaySeconds)} * INTERVAL '1 second'),
      NOW(),
      NOW()
    FROM attendance_insert
  `
}

function isDuplicateAttendanceError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false
  }

  if (error.code === 'P2002') {
    return true
  }

  if (error.code !== 'P2010') {
    return false
  }

  const meta = error.meta as Record<string, unknown> | undefined
  const code = String(meta?.code ?? '')
  const message = String(meta?.message ?? '')

  return code === '23505'
    || message.includes('duplicate key value')
    || message.includes('attendances_nip_nrp_key')
    || message.includes('submission_jobs_dedupe_key')
}

function isRetryableRawDbError(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== 'P2010') {
    return false
  }

  const meta = error.meta as Record<string, unknown> | undefined
  const code = String(meta?.code ?? '')
  const message = String(meta?.message ?? '')

  return code === '40P01'
    || code === '40001'
    || message.includes('deadlock detected')
    || message.includes('could not serialize access')
}

function wait(ms: number) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}

async function executeRawWithRetry(statement: Prisma.Sql, maxAttempts = 4) {
  let attempt = 0

  while (true) {
    try {
      await prisma.$executeRaw(statement)
      return
    } catch (error) {
      attempt += 1

      if (!isRetryableRawDbError(error) || attempt >= maxAttempts) {
        throw error
      }

      await wait(50 * attempt)
    }
  }
}

function parseSubmissionJobPayload(payloadJson: Prisma.JsonValue): SubmissionJobPayload {
  const payload = payloadJson as unknown

  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    throw new Error('Invalid submission job payload')
  }

  const record = payload as Record<string, unknown>
  const values = record.values
  const fields = record.fields

  if (!values || typeof values !== 'object' || Array.isArray(values)) {
    throw new Error('Invalid submission job values')
  }

  if (!Array.isArray(fields)) {
    throw new Error('Invalid submission job fields')
  }

  return {
    values: Object.fromEntries(
      Object.entries(values as Record<string, unknown>).map(([key, value]) => [key, String(value ?? '')])
    ),
    fields: fields.map((field) => {
      if (!field || typeof field !== 'object' || Array.isArray(field)) {
        throw new Error('Invalid submission job field snapshot')
      }

      const snapshot = field as Record<string, unknown>
      return {
        id: String(snapshot.id ?? ''),
        name: String(snapshot.name ?? ''),
      }
    }),
  }
}

async function createFormsEngineSubmission(
  rows: PublicFormRowsResult,
  values: Record<string, string>,
  path: Record<string, unknown> | null = null
): Promise<PublicSubmissionResult> {
  const submissionId = randomId('submission')

  await executeRawWithRetry(buildFormSubmissionMutation(rows, values, submissionId, path))

  return {
    id: submissionId,
    message: 'Form berhasil dikirim',
  }
}

async function createWebinarSubmission(
  form: PublicFormDefinition,
  rows: NonNullable<Awaited<ReturnType<typeof getPublicFormRows>>>,
  values: Record<string, string>
): Promise<PublicSubmissionResult> {
  const participantType = values.participantType ?? ''
  const isInternalParticipant = !form.settings.branching
    || sameChoice(participantType, form.settings.branching.internalValue)

  try {
    const submissionId = randomId('submission')
    const submissionMeta = buildSubmissionMeta(form, rows, values)

    if (isInternalParticipant) {
      await executeRawWithRetry(
        buildAttendanceAndSubmissionJobMutation(
          rows,
          values,
          submissionId,
          submissionMeta,
          'nipNrp',
          values.nipNrp
        )
      )
    } else {
      await enqueueSubmissionJob(rows, values, submissionId, submissionMeta)
    }

    return {
      id: submissionId,
      message: 'Daftar hadir berhasil disimpan',
    }
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      throw error
    }

    if (isDuplicateAttendanceError(error)) {
      throw new FormSubmissionError(
        'NIP/NRP sudah terdaftar. Anda sudah mengisi daftar hadir.',
        409
      )
    }

    throw error
  }
}

export async function createAttendanceSubmission(payload: Record<string, unknown>) {
  const rows = await getPublicFormRows(ATTENDANCE_FORM_SLUG)

  if (!rows) {
    throw new FormSubmissionError('Form daftar hadir tidak ditemukan', 404)
  }

  const form = mapPublicFormRowsToDefinition(rows)
  const values = validateFormSubmission(form, payload)

  if (!hasLegacyAttendanceShape(form)) {
    return createFormsEngineSubmission(rows, values, buildSubmissionMeta(form, rows, values))
  }

  return createWebinarSubmission(form, rows, values)
}

export async function createPublicFormSubmission(
  slug: string,
  payload: Record<string, unknown>
): Promise<PublicSubmissionResult> {
  const rows = await getPublicFormRows(slug)

  if (!rows) {
    throw new FormSubmissionError('Form tidak ditemukan', 404)
  }

  const form = mapPublicFormRowsToDefinition(rows)
  const values = validateFormSubmission(form, payload)

  if (form.settings.legacyTarget === 'attendance' && hasLegacyAttendanceShape(form)) {
    return createWebinarSubmission(form, rows, values)
  }

  if (form.settings.workflow === 'WEBINAR' && hasLegacyAttendanceShape(form)) {
    return createWebinarSubmission(form, rows, values)
  }

  return createFormsEngineSubmission(rows, values, buildSubmissionMeta(form, rows, values))
}

export async function processQueuedSubmissionJobs(batchSize = 25) {
  const safeBatchSize = Math.max(1, Math.min(100, Math.trunc(batchSize)))
  const jobs = await prisma.$queryRaw<SubmissionJobRow[]>`
    WITH next_jobs AS (
      SELECT id
      FROM submission_jobs
      WHERE status = ${'PENDING'} AND available_at <= NOW()
      ORDER BY available_at ASC, created_at ASC
      LIMIT ${safeBatchSize}
      FOR UPDATE SKIP LOCKED
    )
    UPDATE submission_jobs jobs
    SET status = ${'PROCESSING'},
        attempts = attempts + 1,
        updated_at = NOW()
    FROM next_jobs
    WHERE jobs.id = next_jobs.id
    RETURNING
      jobs.id,
      jobs.submission_id AS "submissionId",
      jobs.form_id AS "formId",
      jobs.payload_json AS "payloadJson",
      jobs.path_json AS "pathJson",
      jobs.attempts
  `

  let processed = 0
  let failed = 0

  for (const job of jobs) {
    try {
      const payload = parseSubmissionJobPayload(job.payloadJson)

      await executeRawWithRetry(
        buildFormSubmissionMutationFromSnapshot(
          job.formId,
          payload.fields,
          payload.values,
          job.submissionId,
          job.pathJson
        )
      )

      await prisma.$executeRaw`
        UPDATE submission_jobs
        SET status = ${'COMPLETED'},
            processed_at = NOW(),
            updated_at = NOW(),
            last_error = ${null}
        WHERE id = ${job.id}
      `

      processed += 1
    } catch (error) {
      failed += 1

      const nextStatus = job.attempts >= 5 ? 'FAILED' : 'PENDING'
      const delaySeconds = Math.min(30, job.attempts * 2)

      await prisma.$executeRaw`
        UPDATE submission_jobs
        SET status = ${nextStatus},
            last_error = ${String(error instanceof Error ? error.message : error)},
            available_at = NOW() + (${delaySeconds} * INTERVAL '1 second'),
            updated_at = NOW()
        WHERE id = ${job.id}
      `
    }
  }

  return {
    claimed: jobs.length,
    processed,
    failed,
  }
}

export async function getPublicSubmissionSummary(
  slug: string,
  submissionId: string
): Promise<PublicSubmissionSummary | null> {
  const rows = await prisma.$queryRaw<Array<{
    id: string
    title: string
    pathJson: Prisma.JsonValue | null
  }>>`
    SELECT
      s.id,
      f.title,
      s.path_json AS "pathJson"
    FROM submissions s
    JOIN forms f ON f.id = s.form_id
    WHERE s.id = ${submissionId} AND f.slug = ${slug}
    LIMIT 1
  `

  const row = rows[0]

  if (!row) {
    return null
  }

  const meta = readSubmissionMeta(row.pathJson)

  return {
    submissionId: row.id,
    formTitle: row.title,
    participantType: meta.participantType,
    quiz: meta.quiz,
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

  const quizRows = await prisma.$queryRaw<QuizSummaryRow[]>`
    SELECT
      s.form_id AS "formId",
      COUNT(*) FILTER (
        WHERE jsonb_typeof(s.path_json -> 'quiz') = 'object'
      )::int AS "totalQuizSubmissions",
      COUNT(*) FILTER (
        WHERE jsonb_typeof(s.path_json -> 'quiz') = 'object'
          AND COALESCE(s.path_json -> 'quiz' ->> 'passed', 'false') = 'true'
      )::int AS "passedCount",
      COUNT(*) FILTER (
        WHERE jsonb_typeof(s.path_json -> 'quiz') = 'object'
          AND COALESCE(s.path_json -> 'quiz' ->> 'passed', 'false') <> 'true'
      )::int AS "failedCount",
      ROUND(
        AVG(
          CASE
            WHEN jsonb_typeof(s.path_json -> 'quiz') = 'object'
              AND COALESCE(s.path_json -> 'quiz' ->> 'maxScore', '') <> ''
              AND (s.path_json -> 'quiz' ->> 'maxScore')::numeric > 0
            THEN (
              ((s.path_json -> 'quiz' ->> 'score')::numeric
                / (s.path_json -> 'quiz' ->> 'maxScore')::numeric) * 100
            )
            ELSE NULL
          END
        ),
        1
      )::float8 AS "averageScorePercentage"
    FROM submissions s
    GROUP BY s.form_id
  `

  const quizSummaryByFormId = new Map(quizRows.map((row) => [row.formId, row]))

  return rows.map((row) => ({
    quizSummary: row.mode === 'QUIZ' || row.mode === 'ATTENDANCE'
      ? (() => {
          const quizRow = quizSummaryByFormId.get(row.id)
          const totalQuizSubmissions = quizRow?.totalQuizSubmissions ?? 0
          const passedCount = quizRow?.passedCount ?? 0
          const failedCount = quizRow?.failedCount ?? 0

          return {
            totalQuizSubmissions,
            passedCount,
            failedCount,
            passRate: totalQuizSubmissions > 0
              ? Math.round((passedCount / totalQuizSubmissions) * 100)
              : null,
            averageScorePercentage: quizRow?.averageScorePercentage ?? null,
          }
        })()
      : null,
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

  const optionsByField = buildAdminOptionsByField(rows.options)
  const fieldIds = rows.fields.map((field) => field.id)
  const pages = readFormPages(rows.form.settingsJson ?? null, fieldIds)
  const conditionalRoutes = readFormConditionalRoutes(
    rows.form.settingsJson ?? null,
    fieldIds,
    pages.map((page) => page.id)
  )
  const pageIdByFieldId = new Map<string, string>()
  const nextPageIdByOptionKey = new Map<string, string>()

  for (const page of pages) {
    for (const fieldId of page.fieldIds) {
      pageIdByFieldId.set(fieldId, page.id)
    }
  }

  for (const route of conditionalRoutes) {
    nextPageIdByOptionKey.set(
      createConditionalRouteKey(route.fieldId, route.optionLabel),
      route.nextPageId
    )
  }

  return {
    id: rows.form.id,
    slug: rows.form.slug,
    title: rows.form.title,
    description: rows.form.description,
    successMessage: rows.form.successMessage,
    status: rows.form.status ?? 'DRAFT',
    mode: rows.form.mode ?? 'STANDARD',
    workflow: readFormWorkflow(rows.form.slug, rows.form.settingsJson ?? null),
    quizSettings: readQuizSettings(rows.form.settingsJson ?? null),
    pages: pages.map((page) => ({
      id: page.id,
      title: page.title,
      description: page.description ?? '',
    })),
    fields: rows.fields.flatMap((field) => {
      const type = resolveFormFieldType(field.type, optionsByField[field.id] ?? [])
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
        pageId: pageIdByFieldId.get(field.id) ?? pages[0]?.id ?? 'page-1',
        options: (optionsByField[field.id] ?? []).map((option) => ({
          ...option,
          nextPageId: nextPageIdByOptionKey.get(
            createConditionalRouteKey(field.id, option.label)
          ),
        })),
      }]
    }),
  }
}

interface UpdateAdminFormPayload {
  title: string
  description: string
  successMessage: string
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  mode: FormMode
  quizSettings: QuizSettings
  pages: AdminFormPage[]
  fields: Array<{
    id: string
    type: FormFieldType
    label: string
    required: boolean
    placeholder?: string
    pageId: string
    options?: AdminEditableFieldOption[]
  }>
}

function mapFormFieldTypeToDb(type: FormFieldType): FieldType {
  switch (type) {
    case 'text':
      return 'SHORT_TEXT'
    case 'textarea':
      return 'LONG_TEXT'
    case 'radio':
    case 'likert':
      return 'RADIO'
    case 'select':
      return 'SELECT'
    case 'signature':
      return 'SIGNATURE'
  }
}

function normalizeAdminFormPages(
  pages: AdminFormPage[] | undefined,
  fields: Array<{ id: string; pageId?: string }>
) {
  const uniqueFieldIds = Array.from(new Set(fields.map((field) => field.id)))
  const fallbackPages = createDefaultFormPages(uniqueFieldIds).map((page) => ({
    id: page.id,
    title: page.title,
    description: page.description ?? '',
  }))
  const inputPages = pages && pages.length > 0 ? pages : fallbackPages

  const normalizedPages = inputPages.map((page, index) => ({
    id: page.id?.trim() || `page-${index + 1}`,
    title: page.title?.trim() || '',
    description: page.description?.trim() || '',
  }))

  const pageIds = new Set(normalizedPages.map((page) => page.id))
  const firstPageId = normalizedPages[0]?.id ?? 'page-1'
  const fieldsByPageId = new Map<string, string[]>()

  for (const page of normalizedPages) {
    fieldsByPageId.set(page.id, [])
  }

  for (const field of fields) {
    const pageId = field.pageId && pageIds.has(field.pageId) ? field.pageId : firstPageId
    fieldsByPageId.get(pageId)?.push(field.id)
  }

  return normalizedPages
    .map<FormPageDefinition>((page) => ({
      id: page.id,
      title: page.title,
      description: page.description || null,
      fieldIds: fieldsByPageId.get(page.id) ?? [],
    }))
}

function normalizeAdminConditionalRoutes(
  fields: Array<{
    id: string
    type: FormFieldType
    options?: AdminEditableFieldOption[]
  }>,
  pages: FormPageDefinition[]
) {
  const pageIndexById = new Map(pages.map((page, index) => [page.id, index]))
  const pageIdByFieldId = new Map<string, string>()
  const seenKeys = new Set<string>()
  const routes: FormConditionalRoute[] = []

  for (const page of pages) {
    for (const fieldId of page.fieldIds) {
      pageIdByFieldId.set(fieldId, page.id)
    }
  }

  for (const field of fields) {
    if (field.type !== 'radio' && field.type !== 'select') {
      continue
    }

    const currentPageId = pageIdByFieldId.get(field.id)
    const currentPageIndex = currentPageId ? pageIndexById.get(currentPageId) ?? -1 : -1

    if (currentPageIndex < 0) {
      continue
    }

    const allowedPageIds = new Set(
      pages.slice(currentPageIndex + 1).map((page) => page.id)
    )

    for (const option of field.options ?? []) {
      const optionLabel = option.label.trim()
      const nextPageId = option.nextPageId?.trim()

      if (!optionLabel || !nextPageId) {
        continue
      }

      if (nextPageId !== CONDITIONAL_ROUTE_SUBMIT && !allowedPageIds.has(nextPageId)) {
        continue
      }

      const key = createConditionalRouteKey(field.id, optionLabel)
      if (seenKeys.has(key)) {
        continue
      }

      seenKeys.add(key)
      routes.push({
        fieldId: field.id,
        optionLabel,
        nextPageId,
      })
    }
  }

  return routes
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

  const allowedModes = new Set<FormMode>(['STANDARD', 'QUIZ', 'ATTENDANCE'])
  if (!allowedModes.has(payload.mode)) {
    throw new FormSubmissionError('Mode form tidak valid', 400)
  }

  const workflow = current.slug === ATTENDANCE_FORM_SLUG ? 'WEBINAR' : 'STANDARD'
  const quizSettings = {
    passingPercentage: normalizePassingPercentage(payload.quizSettings?.passingPercentage),
  }
  const normalizedPayloadFields = payload.fields
  const formPages = normalizeAdminFormPages(payload.pages, normalizedPayloadFields)
  const conditionalRoutes = normalizeAdminConditionalRoutes(normalizedPayloadFields, formPages)

  const editableFieldIds = new Set(current.fields.map((field) => field.id))
  const allowedTypes = new Set<FormFieldType>(['text', 'textarea', 'radio', 'select', 'likert', 'signature'])

  if (normalizedPayloadFields.length === 0) {
    throw new FormSubmissionError('Form harus memiliki minimal satu field', 400)
  }

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(4242, hashtext(${id}))
    `

    const fieldCountRows = await tx.$queryRaw<Array<{ count: bigint }>>`
      SELECT COUNT(*)::bigint AS count
      FROM form_fields
      WHERE form_id = ${id}
    `

    const fieldCount = Number(fieldCountRows[0]?.count ?? BigInt(0))
    const tempOrderBase = 2_000_000_000

    await tx.$executeRaw`
      UPDATE forms
      SET
        title = ${title},
        description = ${payload.description.trim() || null},
        success_message = ${payload.successMessage.trim() || null},
        status = ${payload.status}::"FormStatus",
        mode = ${payload.mode}::"FormMode",
        settings_json = ${serializeFormSettings(
          workflow,
          quizSettings,
          formPages,
          conditionalRoutes
        )}::jsonb,
        updated_at = NOW()
      WHERE id = ${id}
    `

    await tx.$executeRaw`
      WITH ordered_fields AS (
        SELECT id, ROW_NUMBER() OVER (ORDER BY "order" ASC, id ASC) AS row_num
        FROM form_fields
        WHERE form_id = ${id}
      )
      UPDATE form_fields AS fields
      SET "order" = ${tempOrderBase} + ordered_fields.row_num,
          updated_at = NOW()
      FROM ordered_fields
      WHERE fields.id = ordered_fields.id
    `

    const seenIds = new Set<string>()

    for (let index = 0; index < normalizedPayloadFields.length; index += 1) {
      const field = normalizedPayloadFields[index]
      const label = field.label.trim()
      if (!label) {
        throw new FormSubmissionError('Label pertanyaan wajib diisi', 400)
      }

      if (!allowedTypes.has(field.type)) {
        throw new FormSubmissionError('Tipe field tidak valid', 400)
      }

      const placeholder = field.placeholder?.trim() || null
      const dbType = mapFormFieldTypeToDb(field.type)
      const options = (field.options ?? [])
        .map((option) => ({
          label: option.label.trim(),
          isCorrect: field.type === 'likert' ? false : option.isCorrect,
          points: field.type === 'likert'
            ? 0
            : Number.isFinite(option.points)
              ? Math.max(0, Math.trunc(option.points))
              : 0,
        }))
        .filter((option) => option.label)

      if ((field.type === 'radio' || field.type === 'select' || field.type === 'likert') && options.length === 0) {
        throw new FormSubmissionError('Field pilihan harus punya minimal satu opsi', 400)
      }

      if (field.type === 'likert' && options.length !== 5) {
        throw new FormSubmissionError('Field Likert harus memiliki tepat 5 opsi', 400)
      }

      if (field.type === 'radio' || field.type === 'likert') {
        const correctCount = options.filter((option) => option.isCorrect).length
        if (correctCount > 1) {
          throw new FormSubmissionError('Setiap field quiz hanya boleh punya satu jawaban benar', 400)
        }
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
            is_active = ${true},
            updated_at = NOW()
          WHERE id = ${field.id}
        `
      } else {
        const newFieldId = field.id.startsWith('new-') ? randomId('field') : field.id
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
              ${tempOrderBase + fieldCount + index + 1},
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

      if (field.type === 'radio' || field.type === 'select' || field.type === 'likert') {
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
              ${option.label},
              ${option.label},
              ${index + 1},
              ${option.isCorrect},
              ${option.points},
              NOW()
            )
          `
        }
      } else {
        await tx.$executeRaw`DELETE FROM field_options WHERE field_id = ${field.id}`
      }
    }

    if (normalizedPayloadFields.length > 0) {
      for (let index = 0; index < normalizedPayloadFields.length; index += 1) {
        const field = normalizedPayloadFields[index]

        await tx.$executeRaw`
          UPDATE form_fields
          SET "order" = ${index + 1},
              updated_at = NOW()
          WHERE id = ${field.id}
        `
      }
    }

    for (const existingField of current.fields) {
      if (!normalizedPayloadFields.some((field) => field.id === existingField.id)) {
        await tx.$executeRaw`
          UPDATE form_fields
          SET is_active = ${false}, updated_at = NOW()
          WHERE id = ${existingField.id}
        `
        await tx.$executeRaw`DELETE FROM field_options WHERE field_id = ${existingField.id}`
      }
    }
  })

  invalidatePublicFormCache(current.slug)
  revalidatePath(`/f/${current.slug}`)

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
  const starterFieldIds = [randomId('field'), randomId('field'), randomId('field')]

  const starterFields = [
    { id: starterFieldIds[0], label: 'Nama Lengkap', type: 'SHORT_TEXT' as const, placeholder: 'Masukkan nama lengkap' },
    { id: starterFieldIds[1], label: 'Email', type: 'SHORT_TEXT' as const, placeholder: 'Masukkan email' },
    { id: starterFieldIds[2], label: 'Catatan', type: 'LONG_TEXT' as const, placeholder: 'Tambahkan catatan bila perlu' },
  ]

  await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      INSERT INTO forms (id, slug, title, description, status, mode, success_message, settings_json, created_at, updated_at)
      VALUES (
        ${formId},
        ${candidateSlug},
        ${normalizedTitle},
        ${'Deskripsi form baru'},
        'DRAFT'::"FormStatus",
        'STANDARD'::"FormMode",
        ${'Terima kasih, data Anda berhasil dikirim.'},
        ${serializeFormSettings(
          'STANDARD',
          { passingPercentage: DEFAULT_QUIZ_PASS_PERCENTAGE },
          createDefaultFormPages(starterFieldIds)
        )}::jsonb,
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
          ${field.id},
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

  invalidatePublicFormCache(candidateSlug)
  revalidatePath(`/f/${candidateSlug}`)

  return await getAdminFormDetail(formId)
}

export async function deleteAdminForm(id: string) {
  const deleted = await prisma.$transaction(async (tx) => {
    await tx.$executeRaw`
      SELECT pg_advisory_xact_lock(4242, hashtext(${id}))
    `

    const forms = await tx.$queryRaw<Array<{
      id: string
      slug: string
      status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
    }>>`
      SELECT id, slug, status::text AS status
      FROM forms
      WHERE id = ${id}
      LIMIT 1
    `

    const form = forms[0]

    if (!form) {
      throw new FormSubmissionError('Form tidak ditemukan', 404)
    }

    if (form.id === ATTENDANCE_FORM_ID || form.slug === ATTENDANCE_FORM_SLUG) {
      throw new FormSubmissionError('Form template attendance tidak boleh dihapus', 403)
    }

    if (form.status !== 'ARCHIVED') {
      throw new FormSubmissionError('Arsipkan form terlebih dahulu sebelum menghapus', 409)
    }

    const [submissionCountRows, jobCountRows] = await Promise.all([
      tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM submissions
        WHERE form_id = ${id}
      `,
      tx.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(*)::bigint AS count
        FROM submission_jobs
        WHERE form_id = ${id}
      `,
    ])

    const submissionCount = Number(submissionCountRows[0]?.count ?? BigInt(0))
    const jobCount = Number(jobCountRows[0]?.count ?? BigInt(0))

    if (submissionCount > 0 || jobCount > 0) {
      throw new FormSubmissionError('Form yang sudah punya data tidak bisa dihapus', 409)
    }

    await tx.$executeRaw`
      DELETE FROM submission_jobs
      WHERE form_id = ${id}
    `

    await tx.$executeRaw`
      DELETE FROM forms
      WHERE id = ${id}
    `

    return form
  })

  invalidatePublicFormCache(deleted.slug)
  revalidatePath(`/f/${deleted.slug}`)

  return deleted
}

export async function listAdminFormSubmissions(
  id: string,
  filters?: Partial<AdminSubmissionFilters>
): Promise<AdminFormSubmissionsResult | null> {
  const detail = await getAdminFormDetail(id)

  if (!detail) {
    return null
  }

  const rows = await prisma.$queryRaw<SubmissionRow[]>`
    SELECT
      s.id,
      s.created_at AS "createdAt",
      s.path_json AS "pathJson",
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
      meta: readSubmissionMeta(row.pathJson),
    }

    const field = detail.fields.find((candidate) => candidate.id === row.fieldId)
    if (field) {
      item.answers[field.name] = row.valueText ?? ''
    }

    itemsById.set(row.id, item)
  }

  const allItems = Array.from(itemsById.values())

  return {
    form: {
      id: detail.id,
      slug: detail.slug,
      title: detail.title,
      status: detail.status,
    },
    totalItems: allItems.length,
    hasParticipantType: allItems.some((item) => item.meta.participantType !== null),
    hasQuiz: allItems.some((item) => item.meta.quiz !== null),
    columns: detail.fields.map((field) => ({
      id: field.id,
      name: field.name,
      label: field.label,
      type: field.type,
    })),
    items: applyAdminSubmissionFilters(allItems, filters),
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
      DELETE FROM submission_jobs
      WHERE submission_id = ${submissionId}
    `

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

export async function exportAdminFormSubmissionsCsv(
  id: string,
  filters?: Partial<AdminSubmissionFilters>
) {
  const data = await listAdminFormSubmissions(id, filters)

  if (!data) {
    throw new FormSubmissionError('Form tidak ditemukan', 404)
  }

  const exportableColumns = data.columns.filter((column) => column.name !== 'participantType')
  const hasParticipantType = data.hasParticipantType
  const hasQuiz = data.hasQuiz
  const metaHeaders = [
    ...(hasParticipantType ? ['Tipe Peserta'] : []),
    ...(hasQuiz ? ['Skor Quiz', 'Jawaban Benar', 'Total Soal', 'Status Quiz'] : []),
  ]
  const headersWithMeta = ['Waktu Submit', ...metaHeaders, ...exportableColumns.map((column) => column.label)]
  const lines = [headersWithMeta.map(escapeCsvValue).join(',')]

  for (const item of data.items) {
    const row = [
      new Date(item.createdAt).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' }),
      ...(hasParticipantType ? [item.meta.participantType ?? '-'] : []),
      ...(hasQuiz
        ? [
            item.meta.quiz ? `${item.meta.quiz.score}/${item.meta.quiz.maxScore}` : '-',
            item.meta.quiz ? String(item.meta.quiz.correctAnswers) : '-',
            item.meta.quiz ? String(item.meta.quiz.totalQuestions) : '-',
            item.meta.quiz ? (item.meta.quiz.passed ? 'Lulus' : 'Belum lulus') : '-',
          ]
        : []),
      ...exportableColumns.map((column) => item.answers[column.name] ?? ''),
    ]
    lines.push(row.map(escapeCsvValue).join(','))
  }

  const fileSlug = slugify(data.form.slug || data.form.title) || 'form-submissions'

  return {
    filename: `${fileSlug}-${new Date().toISOString().slice(0, 10)}.csv`,
    content: `\uFEFF${lines.join('\n')}`,
  }
}
