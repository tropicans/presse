'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
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
        title: 'Form',
        description: form.description,
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
    let currentPageId = pages[0]?.id

    while (currentPageId && !visitedPageIds.has(currentPageId)) {
      visitedPageIds.add(currentPageId)

      const currentPageIndex = pageIndexById.get(currentPageId) ?? -1
      const page = currentPageIndex >= 0 ? pages[currentPageIndex] : null

      if (!page) {
        break
      }

      const fields = page.fieldIds
        .map((fieldId) => fieldsById.get(fieldId))
        .filter((field): field is FormField => Boolean(field))

      if (fields.length > 0) {
        activeSteps.push({
          id: page.id,
          title: page.title || `Halaman ${currentPageIndex + 1}`,
          description: page.description ?? (currentPageIndex === 0 ? form.description : null),
          fieldNames: fields.map((field) => field.name),
          fields,
        })
      }

      let nextPageId = pages[currentPageIndex + 1]?.id

      for (const field of fields) {
        if (field.type !== 'radio') {
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
  const initialValues = useMemo(() => createInitialValues(form.fields), [form.fields])
  const [formData, setFormData] = useState<Record<string, string>>(initialValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const steps = useMemo(() => buildSteps(form, formData), [form, formData])
  const currentStep = steps[currentStepIndex] ?? steps[0]
  const isMultiStep = steps.length > 1
  const isLastStep = currentStepIndex >= steps.length - 1

  useEffect(() => {
    setFormData(initialValues)
    setFieldErrors({})
    setCurrentStepIndex(0)
  }, [initialValues])

  useEffect(() => {
    setCurrentStepIndex((current) => Math.min(current, Math.max(steps.length - 1, 0)))
  }, [steps.length])

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
      return
    }

    setCurrentStepIndex((current) => Math.min(current + 1, steps.length - 1))
  }

  const handlePreviousStep = () => {
    setError(null)
    setCurrentStepIndex((current) => Math.max(current - 1, 0))
  }

  return (
    <form onSubmit={handleSubmit} className="attendance-form" noValidate>
      {isMultiStep && currentStep && (
        <div className="form-step-shell">
          <div className="form-step-progress" aria-label={`Langkah ${currentStepIndex + 1} dari ${steps.length}`}>
            <span className="form-step-badge">Langkah {currentStepIndex + 1} / {steps.length}</span>
            <div className="form-step-dots" aria-hidden="true">
              {steps.map((step, index) => (
                <span
                  key={step.id}
                  className={`form-step-dot ${index === currentStepIndex ? 'active' : ''} ${index < currentStepIndex ? 'complete' : ''}`}
                />
              ))}
            </div>
          </div>
          <div className="form-step-copy">
            <h2 className="form-step-title">{currentStep.title}</h2>
            {currentStep.description && (
              <p className="form-step-description">{currentStep.description}</p>
            )}
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

      {(currentStep?.fields ?? form.fields).map((field) => {
        const errorId = `${field.name}-error`
        const hintId = `${field.name}-hint`
        const describedBy = fieldErrors[field.name] ? errorId : undefined
        const label = getDisplayLabel(field, formData, form)

        if (field.type === 'radio' || field.type === 'likert') {
          return (
            <fieldset
              key={field.id}
              className={`form-group form-fieldset ${field.type === 'likert' ? 'likert-fieldset' : ''}`}
            >
              <legend className="form-label">
                {label}
                {field.required ? ' *' : ''}
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
              <div
                className={field.type === 'likert' ? 'radio-group likert-group' : 'radio-group'}
                aria-describedby={describedBy}
                aria-invalid={fieldErrors[field.name] ? 'true' : 'false'}
              >
                {field.options.map((option) => {
                  const parsedOption = field.type === 'likert' ? parseLikertOption(option) : null

                  return (
                  <label
                    key={option}
                    className={field.type === 'likert' ? 'radio-label likert-option' : 'radio-label'}
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
    </form>
  )
}
