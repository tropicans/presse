'use client'

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import SignaturePad from './SignaturePad'
import type { PublicFormDefinition, FormField, FormStepDefinition } from '@/lib/forms'

interface AttendanceFormProps {
  form: PublicFormDefinition
}

function createInitialValues(fields: FormField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.name] = ''
    return acc
  }, {})
}

interface RenderStep extends FormStepDefinition {
  fields: FormField[]
}

function sameChoice(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
}

function createConditionalRouteKey(fieldId: string, optionLabel: string) {
  return `${fieldId}::${optionLabel.trim().toLowerCase()}`
}

const CONDITIONAL_ROUTE_SUBMIT = '__SUBMIT__'

function parseLikertOption(option: string) {
  const match = option.match(/^(\d+)\s*-\s*(.+)$/)

  if (!match) {
    return {
      score: null,
      label: option,
    }
  }

  return {
    score: match[1],
    label: match[2],
  }
}

function getDisplayLabel(
  field: FormField,
  formData: Record<string, string>,
  form: PublicFormDefinition
) {
  const branching = form.settings.branching

  if (
    branching
    && sameChoice(formData[branching.participantTypeFieldName] ?? '', branching.externalValue)
    && field.name === 'unitKerja'
  ) {
    return 'Instansi'
  }

  return field.label
}

function buildSteps(form: PublicFormDefinition, formData: Record<string, string>): RenderStep[] {
  const branching = form.settings.branching

  if (!branching) {
    const pages = form.settings.pages
    const conditionalRoutes = form.settings.conditionalRoutes ?? []

    if (!pages || pages.length === 0) {
      return [{
        id: 'single-step',
        fieldNames: form.fields.map((field) => field.name),
        fields: form.fields,
      }]
    }

    const fieldsById = new Map(form.fields.map((field) => [field.id, field]))
    const pageIndexById = new Map(pages.map((page, index) => [page.id, index]))
    const nextPageIdByRouteKey = new Map(
      conditionalRoutes.map((route) => [
        createConditionalRouteKey(route.fieldId, route.optionLabel),
        route.nextPageId,
      ])
    )

    const activeSteps: RenderStep[] = []
    const visitedPageIds = new Set<string>()
    let currentPageId: string | null = pages[0]?.id ?? null

    while (currentPageId !== null) {
      if (visitedPageIds.has(currentPageId)) {
        break
      }

      visitedPageIds.add(currentPageId)

      const currentPageIndex = pageIndexById.get(currentPageId)
      if (currentPageIndex === undefined) {
        break
      }

      const page = pages[currentPageIndex]

      const fields = page.fieldIds
        .map((fieldId) => fieldsById.get(fieldId))
        .filter((field): field is FormField => Boolean(field))

      if (fields.length > 0) {
        activeSteps.push({
          id: page.id,
          fieldNames: fields.map((field) => field.name),
          fields,
        })
      }

      let nextPageId: string | null = pages[currentPageIndex + 1]?.id ?? null

      for (const field of fields) {
        if (field.type !== 'radio' && field.type !== 'select') {
          continue
        }

        const selectedValue = formData[field.name] ?? ''
        if (!selectedValue) {
          continue
        }

        const conditionalNextPageId = nextPageIdByRouteKey.get(
          createConditionalRouteKey(field.id, selectedValue)
        )

        if (!conditionalNextPageId) {
          continue
        }

        if (conditionalNextPageId === CONDITIONAL_ROUTE_SUBMIT) {
          nextPageId = null
          break
        }

        const conditionalNextPageIndex = pageIndexById.get(conditionalNextPageId) ?? -1
        if (conditionalNextPageIndex > currentPageIndex) {
          nextPageId = conditionalNextPageId
          break
        }
      }

      currentPageId = nextPageId
    }

    return activeSteps
  }

  const stepsById = new Map(branching.steps.map((step) => [step.id, step]))
  const fieldsByName = new Map(form.fields.map((field) => [field.name, field]))
  const participantType = formData[branching.participantTypeFieldName] ?? ''

  const activeStepIds = ['participant-type']

  if (sameChoice(participantType, branching.internalValue) && stepsById.has('internal-identity')) {
    activeStepIds.push('internal-identity')
  }

  if (stepsById.has('shared-attendance')) {
    activeStepIds.push('shared-attendance')
  }

  return activeStepIds.flatMap((stepId) => {
    const step = stepsById.get(stepId)

    if (!step) {
      return []
    }

    const fields = step.fieldNames
      .map((fieldName) => fieldsByName.get(fieldName))
      .filter((field): field is FormField => Boolean(field))

    if (fields.length === 0) {
      return []
    }

    return [{ ...step, fields }]
  })
}

export default function AttendanceForm({ form }: AttendanceFormProps) {
  const router = useRouter()
  const formRef = useRef<HTMLFormElement | null>(null)
  const initialValues = useMemo(() => createInitialValues(form.fields), [form.fields])
  const [formData, setFormData] = useState<Record<string, string>>(initialValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const steps = useMemo(() => buildSteps(form, formData), [form, formData])
  const currentStep = steps[currentStepIndex] ?? steps[0]
  const isMultiStep = steps.length > 1
  const isLastStep = currentStepIndex >= steps.length - 1
  const progressPercentage = isMultiStep
    ? ((currentStepIndex + 1) / steps.length) * 100
    : 100
  const isQuizExperience = Boolean(form.settings.quiz)
  const visibleQuizQuestionNumbers = useMemo(() => {
    const entries = steps
      .flatMap((step) => step.fields)
      .filter((field) => field.type === 'radio' || field.type === 'select' || field.type === 'likert')
      .map((field, index) => [field.id, index + 1] as const)

    return new Map(entries)
  }, [steps])

  const scrollToFormTop = () => {
    formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const scrollToField = (fieldName: string) => {
    const escapedName = typeof CSS !== 'undefined' && typeof CSS.escape === 'function'
      ? CSS.escape(fieldName)
      : fieldName
    const target = document.getElementById(fieldName)
      ?? document.getElementById(`${fieldName}-typed-signature`)
      ?? document.querySelector(`[name="${escapedName}"]`)

    if (!(target instanceof HTMLElement)) {
      return
    }

    target.scrollIntoView({ behavior: 'smooth', block: 'center' })
    target.focus({ preventScroll: true })
  }

  useEffect(() => {
    setFormData(initialValues)
    setFieldErrors({})
    setCurrentStepIndex(0)
  }, [initialValues])

  useEffect(() => {
    setCurrentStepIndex((current) => Math.min(current, Math.max(steps.length - 1, 0)))
  }, [steps.length])

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 640)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const validateFields = (fieldsToValidate: FormField[]) => {
    const nextErrors: Record<string, string> = {}

    for (const field of fieldsToValidate) {
      const value = (formData[field.name] ?? '').trim()

      if (field.required && !value) {
        nextErrors[field.name] = `${getDisplayLabel(field, formData, form)} wajib diisi`
      }
    }

    return nextErrors
  }

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    setFieldErrors((prev) => {
      if (!prev[name]) {
        return prev
      }

      const nextErrors = { ...prev }
      delete nextErrors[name]
      return nextErrors
    })
  }

  const handleSignatureChange = (name: string, value: string | null) => {
    setFormData((prev) => ({ ...prev, [name]: value ?? '' }))
    setFieldErrors((prev) => {
      if (!prev[name]) {
        return prev
      }

      const nextErrors = { ...prev }
      delete nextErrors[name]
      return nextErrors
    })
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const allVisibleFields = steps.flatMap((step) => step.fields)
    const nextErrors = validateFields(allVisibleFields)

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors(nextErrors)
      setError('Periksa kembali field yang wajib diisi.')
      const firstInvalidField = allVisibleFields.find((field) => nextErrors[field.name])
      if (firstInvalidField) {
        scrollToField(firstInvalidField.name)
      }
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/public/forms/${form.slug}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Terjadi kesalahan')
        return
      }

      router.push(
        `/success?slug=${encodeURIComponent(form.slug)}&submissionId=${encodeURIComponent(data.id)}`
      )
    } catch {
      setError('Gagal mengirim data. Periksa koneksi internet Anda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleNextStep = () => {
    if (!currentStep) {
      return
    }

    setError(null)
    const nextErrors = validateFields(currentStep.fields)

    if (Object.keys(nextErrors).length > 0) {
      setFieldErrors((current) => ({ ...current, ...nextErrors }))
      setError('Periksa kembali field pada langkah ini.')
      const firstInvalidField = currentStep.fields.find((field) => nextErrors[field.name])
      if (firstInvalidField) {
        scrollToField(firstInvalidField.name)
      }
      return
    }

    setCurrentStepIndex((current) => Math.min(current + 1, steps.length - 1))
    scrollToFormTop()
  }

  const handlePreviousStep = () => {
    setError(null)
    setCurrentStepIndex((current) => Math.max(current - 1, 0))
    scrollToFormTop()
  }

  const handleFormKeyDown = (event: KeyboardEvent<HTMLFormElement>) => {
    const nativeEvent = event.nativeEvent as { isComposing?: boolean }

    if (isSubmitting || event.defaultPrevented || nativeEvent.isComposing) {
      return
    }

    const target = event.target as HTMLElement | null
    const tagName = target?.tagName.toLowerCase() ?? ''
    const targetRole = target?.getAttribute('role') ?? ''
    const isTextarea = tagName === 'textarea'
    const isButtonLike = tagName === 'button' || tagName === 'summary'
    const isAnchor = tagName === 'a'
    const isNativeSelect = tagName === 'select'
    const isMenuLike = targetRole === 'button' || targetRole === 'menuitem'

    if (event.key === 'Escape' && error) {
      event.preventDefault()
      setError(null)
      return
    }

    if (event.key !== 'Enter' || isTextarea || isButtonLike || isAnchor || isMenuLike || isNativeSelect) {
      return
    }

    if (event.shiftKey) {
      if (!isMultiStep || currentStepIndex === 0) {
        return
      }

      event.preventDefault()
      handlePreviousStep()
      return
    }

    event.preventDefault()

    if (isMultiStep && !isLastStep) {
      handleNextStep()
      return
    }

    formRef.current?.requestSubmit()
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      onKeyDown={handleFormKeyDown}
      className="attendance-form"
      noValidate
    >
      {isMultiStep && currentStep && (
        <div className="form-step-shell">
          <div className="form-step-progress" aria-label={`Langkah ${currentStepIndex + 1} dari ${steps.length}`}>
            <span className="form-step-badge">Langkah {currentStepIndex + 1} dari {steps.length}</span>
            <div className="form-step-bar" aria-hidden="true">
              <span
                className="form-step-bar-fill"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="form-error" role="alert" aria-live="assertive">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      {(currentStep?.fields ?? form.fields).map((field, fieldIndex) => {
        const errorId = `${field.name}-error`
        const hintId = `${field.name}-hint`
        const describedBy = fieldErrors[field.name] ? errorId : undefined
        const label = getDisplayLabel(field, formData, form)
        const isQuizQuestion = isQuizExperience
          && (field.type === 'radio' || field.type === 'select' || field.type === 'likert')
        const questionNumber = visibleQuizQuestionNumbers.get(field.id) ?? fieldIndex + 1
        const questionLabel = `Soal ${questionNumber}`

        if (field.type === 'radio' || field.type === 'likert') {
          return (
            <fieldset
              key={field.id}
              className={`form-group form-fieldset ${field.type === 'likert' ? 'likert-fieldset' : ''} ${isQuizQuestion ? 'quiz-question-card' : ''}`}
            >
              <legend className={`form-label ${isQuizQuestion ? 'quiz-question-legend' : ''}`}>
                {isQuizQuestion && <span className="quiz-question-badge">{questionLabel}</span>}
                <span>
                  {label}
                  {field.required ? ' *' : ''}
                </span>
              </legend>
              {field.type === 'likert' && (
                <>
                  <p className="field-help">Pilih satu jawaban pada skala Likert 1-5.</p>
                  <div className="likert-scale-meta" aria-hidden="true">
                    <span>Tidak setuju</span>
                    <span>Netral</span>
                    <span>Sangat setuju</span>
                  </div>
                </>
              )}
              {isQuizQuestion && field.type !== 'likert' && (
                <p className="field-help">Pilih satu jawaban yang menurut Anda paling tepat.</p>
              )}
              <div
                className={field.type === 'likert'
                  ? 'radio-group likert-group'
                  : isQuizQuestion
                    ? 'radio-group quiz-choice-group'
                    : 'radio-group'}
                aria-describedby={describedBy}
                aria-invalid={fieldErrors[field.name] ? 'true' : 'false'}
              >
                {field.options.map((option) => {
                  const parsedOption = field.type === 'likert' ? parseLikertOption(option) : null

                  return (
                  <label
                    key={option}
                    className={field.type === 'likert'
                      ? 'radio-label likert-option'
                      : isQuizQuestion
                        ? 'radio-label quiz-choice-label'
                        : 'radio-label'}
                  >
                    <input
                      type="radio"
                      name={field.name}
                      value={option}
                      checked={formData[field.name] === option}
                      onChange={handleChange}
                      required={field.required}
                      className="radio-input"
                      aria-describedby={describedBy}
                    />
                    {field.type === 'likert' ? (
                      <span className="likert-option-body">
                        <span className="likert-score">{parsedOption?.score ?? ''}</span>
                        <span className="likert-text">{parsedOption?.label ?? option}</span>
                      </span>
                    ) : (
                      <>
                        <span className="radio-custom" />
                        <span className="radio-text">{option}</span>
                      </>
                    )}
                  </label>
                )})}
              </div>
              {fieldErrors[field.name] && (
                <p id={errorId} className="field-error">
                  {fieldErrors[field.name]}
                </p>
              )}
            </fieldset>
          )
        }

        if (field.type === 'signature') {
          return (
            <div key={field.id} className="form-group">
              <label className="form-label" htmlFor={`${field.name}-typed-signature`}>
                {label}
                {field.required ? ' *' : ''}
              </label>
              <SignaturePad
                inputId={`${field.name}-typed-signature`}
                onSignatureChange={(value) => handleSignatureChange(field.name, value)}
                ariaDescribedBy={describedBy ? `${hintId} ${describedBy}` : hintId}
              />
              {fieldErrors[field.name] ? (
                <p id={errorId} className="field-error">
                  {fieldErrors[field.name]}
                </p>
              ) : (
                <p id={hintId} className="field-help">
                  Gambar tanda tangan langsung, atau ketik nama lalu gunakan tanda tangan teks.
                </p>
              )}
            </div>
          )
        }

        if (field.type === 'select') {
          return (
            <div key={field.id} className={`form-group ${isQuizQuestion ? 'quiz-question-card' : ''}`}>
              {isQuizQuestion && <span className="quiz-question-badge">{questionLabel}</span>}
              <label className="form-label" htmlFor={field.name}>
                {label}
                {field.required ? ' *' : ''}
              </label>
              {isQuizQuestion && (
                <p className="field-help">Pilih satu jawaban yang menurut Anda paling tepat.</p>
              )}
              <select
                id={field.name}
                name={field.name}
                value={formData[field.name] ?? ''}
                onChange={handleChange}
                required={field.required}
                className="form-select"
                aria-invalid={fieldErrors[field.name] ? 'true' : 'false'}
                aria-describedby={describedBy}
              >
                <option value="">Pilih salah satu</option>
                {field.options.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              {fieldErrors[field.name] && (
                <p id={errorId} className="field-error">
                  {fieldErrors[field.name]}
                </p>
              )}
            </div>
          )
        }

        if (field.type === 'textarea') {
          return (
            <div key={field.id} className="form-group">
              <label className="form-label" htmlFor={field.name}>{label}</label>
              <textarea
                id={field.name}
                name={field.name}
                value={formData[field.name] ?? ''}
                onChange={handleChange}
                required={field.required}
                rows={field.rows ?? 3}
                maxLength={field.maxLength}
                placeholder={field.placeholder ?? undefined}
                className="form-textarea"
                aria-invalid={fieldErrors[field.name] ? 'true' : 'false'}
                aria-describedby={describedBy}
              />
              {fieldErrors[field.name] && (
                <p id={errorId} className="field-error">
                  {fieldErrors[field.name]}
                </p>
              )}
            </div>
          )
        }

        if (field.type === 'text') {
          return (
            <div key={field.id} className="form-group">
              <label className="form-label" htmlFor={field.name}>{label}</label>
              <input
                type="text"
                id={field.name}
                name={field.name}
                value={formData[field.name] ?? ''}
                onChange={handleChange}
                required={field.required}
                maxLength={field.maxLength}
                placeholder={field.placeholder ?? undefined}
                className="form-input"
                aria-invalid={fieldErrors[field.name] ? 'true' : 'false'}
                aria-describedby={describedBy}
              />
              {fieldErrors[field.name] && (
                <p id={errorId} className="field-error">
                  {fieldErrors[field.name]}
                </p>
              )}
            </div>
          )
        }

        return null
      })}

      <div className="form-navigation-shell">
        <div className="form-navigation">
          {isMultiStep && currentStepIndex > 0 && (
            <button
              type="button"
              className="submit-btn submit-btn-secondary"
              onClick={handlePreviousStep}
              disabled={isSubmitting}
            >
              Kembali
            </button>
          )}

          {isMultiStep && !isLastStep ? (
            <button
              type="button"
              disabled={isSubmitting}
              className="submit-btn"
              onClick={handleNextStep}
            >
              Lanjut
            </button>
          ) : (
            <button
              type="submit"
              disabled={isSubmitting}
              className="submit-btn"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <span className="spinner" />
                  Mengirim...
                </>
              ) : (
                form.submitLabel
              )}
            </button>
          )}
        </div>
      </div>

      {showScrollTop && (
        <button
          type="button"
          className="scroll-top-btn"
          onClick={scrollToFormTop}
        >
          Ke Atas
        </button>
      )}
    </form>
  )
}
