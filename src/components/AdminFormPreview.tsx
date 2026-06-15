'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import SearchableSelect from './SearchableSelect'
import type { AdminPreviewField, AdminPreviewForm, AdminPreviewPage } from '@/lib/admin-form-preview'

interface PreviewStep {
  id: string
  fields: AdminPreviewField[]
}

const CONDITIONAL_ROUTE_SUBMIT = '__SUBMIT__'

interface Props {
  form: AdminPreviewForm
}

function sameChoice(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase()
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

function createInitialValues(fields: AdminPreviewField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.name] = ''
    return acc
  }, {})
}

function hasMeaningfulValue(value: string | undefined) {
  return typeof value === 'string' && value.trim().length > 0
}

function getDisplayLabel(field: AdminPreviewField, formData: Record<string, string>) {
  if (
    field.name === 'unitKerja'
    && sameChoice(formData.participantType ?? '', 'Eksternal')
  ) {
    return 'Instansi'
  }

  return field.label
}

function buildStandardSteps(form: AdminPreviewForm, formData: Record<string, string>) {
  if (form.pages.length === 0) {
    return [{
      id: 'single-step',
      fields: form.fields,
    }]
  }

  const fieldsByPageId = new Map<string, AdminPreviewField[]>()
  const pageIndexById = new Map(form.pages.map((page, index) => [page.id, index]))

  for (const page of form.pages) {
    fieldsByPageId.set(page.id, [])
  }

  for (const field of form.fields) {
    const pageId = pageIndexById.has(field.pageId) ? field.pageId : form.pages[0]?.id
    if (!pageId) {
      continue
    }

    fieldsByPageId.get(pageId)?.push(field)
  }

  const activeSteps: PreviewStep[] = []
  const visitedPageIds = new Set<string>()
  let currentPageId: string | undefined = form.pages[0]?.id

  while (currentPageId && !visitedPageIds.has(currentPageId)) {
    visitedPageIds.add(currentPageId)
    const currentPageKey: string = currentPageId

    const currentPageIndex: number = pageIndexById.get(currentPageKey) ?? -1
    const page: AdminPreviewPage | null = currentPageIndex >= 0 ? form.pages[currentPageIndex] : null

    if (!page) {
      break
    }

    const fields: AdminPreviewField[] = fieldsByPageId.get(page.id) ?? []

    if (fields.length > 0) {
      activeSteps.push({
        id: page.id,
        fields,
      })
    }

      let nextPageId: string | undefined = form.pages[currentPageIndex + 1]?.id

      for (const field of fields) {
        if (field.type !== 'radio' && field.type !== 'select') {
          continue
        }

      const selectedValue = formData[field.name] ?? ''
      if (!selectedValue) {
        continue
      }

        const option = field.options.find((item) => sameChoice(item.label, selectedValue))
        if (!option?.nextPageId) {
          continue
        }

        if (option.nextPageId === CONDITIONAL_ROUTE_SUBMIT) {
          nextPageId = undefined
          break
        }

      const conditionalNextPageIndex = pageIndexById.get(option.nextPageId) ?? -1
      if (conditionalNextPageIndex > currentPageIndex) {
        nextPageId = option.nextPageId
        break
      }
    }

    currentPageId = nextPageId
  }

  return activeSteps
}

function buildWebinarSteps(form: AdminPreviewForm, formData: Record<string, string>) {
  const participantField = form.fields.find((field) => field.name === 'participantType')
  const internalField = form.fields.find((field) => field.name === 'nipNrp')
  const sharedFields = form.fields.filter((field) => (
    field.name !== 'participantType' && field.name !== 'nipNrp'
  ))

  const steps: PreviewStep[] = []

  if (participantField) {
    steps.push({
      id: 'participant-type',
      fields: [participantField],
    })
  }

  if (
    internalField
    && sameChoice(formData.participantType ?? '', 'Internal')
  ) {
    steps.push({
      id: 'internal-identity',
      fields: [internalField],
    })
  }

  if (sharedFields.length > 0) {
    steps.push({
      id: 'shared-attendance',
      fields: sharedFields,
    })
  }

  return steps
}

function buildSteps(form: AdminPreviewForm, formData: Record<string, string>) {
  return form.workflow === 'WEBINAR'
    ? buildWebinarSteps(form, formData)
    : buildStandardSteps(form, formData)
}

function PreviewSession({ form }: Props) {
  const previewRef = useRef<HTMLDivElement | null>(null)
  const initialValues = useMemo(() => createInitialValues(form.fields), [form.fields])
  const [formData, setFormData] = useState<Record<string, string>>(initialValues)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [showScrollTop, setShowScrollTop] = useState(false)
  const steps = useMemo(() => buildSteps(form, formData), [form, formData])
  const safeCurrentStepIndex = Math.min(currentStepIndex, Math.max(steps.length - 1, 0))
  const currentStep = steps[safeCurrentStepIndex] ?? steps[0]
  const activeFields = currentStep?.fields ?? form.fields
  const isMultiStep = steps.length > 1
  const isLastStep = safeCurrentStepIndex >= steps.length - 1
  const hasWebinarBranching = form.workflow === 'WEBINAR'
  const requiredFieldCount = activeFields.filter((field) => field.required).length
  const completedRequiredFieldCount = activeFields
    .filter((field) => field.required)
    .filter((field) => hasMeaningfulValue(formData[field.name]))
    .length
  const answeredFieldCount = activeFields.filter((field) => hasMeaningfulValue(formData[field.name])).length

  const scrollToPreviewTop = () => {
    previewRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  useEffect(() => {
    const onScroll = () => {
      setShowScrollTop(window.scrollY > 640)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  return (
    <div ref={previewRef} className="admin-preview-shell">
      <div className="editorial-preview-windowbar" aria-hidden="true">
        <div className="editorial-preview-windowdots">
          <span />
          <span />
          <span />
        </div>
        <div className="editorial-preview-windowtag">Pratinjau langsung</div>
        <div className="editorial-preview-windowicon">↗</div>
      </div>
      <div className="admin-preview-card">
        <div className="admin-preview-head">
          <h3>{form.title || 'Tanpa Judul'}</h3>
          <p>{form.description || 'Deskripsi form akan tampil di sini.'}</p>
        </div>

        <div className="admin-preview-body">
          <div className="admin-preview-note">
            <strong>Pratinjau interaktif</strong>
            <p>Uji alur langkah dan percabangan langsung di sini. Data yang Anda isi tidak akan dikirim.</p>
          </div>

          {hasWebinarBranching && (
            <div className="admin-preview-workflow-note">
              <strong>Pratinjau alur webinar</strong>
              <p>Langkah pembuka menentukan apakah peserta internal mengisi NIP/NRP sebelum lanjut ke data presensi umum.</p>
            </div>
          )}

          {isMultiStep && currentStep && (
            <div className="form-step-shell admin-preview-step-shell">
              <div className="form-step-progress" aria-label={`Langkah ${safeCurrentStepIndex + 1} dari ${steps.length}`}>
                <span className="form-step-badge">Langkah {safeCurrentStepIndex + 1} dari {steps.length}</span>
                <div className="form-step-dots" aria-hidden="true">
                  {steps.map((step, index) => (
                    <span
                      key={step.id}
                      className={`form-step-dot ${index === safeCurrentStepIndex ? 'active' : ''} ${index < safeCurrentStepIndex ? 'complete' : ''}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}

          {!isMultiStep && (
            <div className="form-step-shell form-step-shell-compact admin-preview-step-shell">
              <div className="form-step-progress-summary" aria-label="Ringkasan progres preview form">
                <span className="form-step-badge">{answeredFieldCount}/{activeFields.length} terisi</span>
                <span className="form-step-summary-copy">
                  {requiredFieldCount > 0
                    ? `${requiredFieldCount - completedRequiredFieldCount} pertanyaan wajib tersisa`
                    : 'Semua field bersifat opsional'}
                </span>
              </div>
            </div>
          )}

          {(currentStep?.fields ?? form.fields).map((field) => {
            const label = getDisplayLabel(field, formData)

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
                      <p className="field-help">Pilih satu jawaban pada skala Likert 1-{field.options.length}.</p>
                      <div
                        className="likert-scale-meta"
                        aria-hidden="true"
                        style={{
                          gridTemplateColumns: `repeat(${field.options.length}, minmax(0, 1fr))`,
                          gap: '10px',
                        }}
                      >
                        <span style={{ textAlign: 'left' }}>Tidak setuju</span>
                        {Array.from({ length: field.options.length - 2 }).map((_, i) => {
                          const isMiddle = field.options.length % 2 !== 0 && i === Math.floor((field.options.length - 2) / 2)
                          return (
                            <span key={i} style={{ textAlign: 'center' }}>
                              {isMiddle ? 'Netral' : ''}
                            </span>
                          )
                        })}
                        <span style={{ textAlign: 'right' }}>Sangat setuju</span>
                      </div>
                    </>
                  )}
                  <div
                    className={field.type === 'likert' ? 'radio-group likert-group' : 'radio-group'}
                    style={
                      field.type === 'likert'
                        ? ({ '--likert-cols': field.options.length } as React.CSSProperties)
                        : field.options.length <= 4
                          ? ({
                              '--radio-cols': field.options.length,
                              '--radio-min-width': '0px',
                            } as React.CSSProperties)
                          : undefined
                    }
                  >
                    {field.options.map((option) => {
                      const parsedOption = field.type === 'likert' ? parseLikertOption(option.label) : null

                      return (
                        <label
                          key={option.label}
                          className={field.type === 'likert' ? 'radio-label likert-option' : 'radio-label'}
                        >
                          <input
                            type="radio"
                            name={field.name}
                            value={option.label}
                            checked={formData[field.name] === option.label}
                            onChange={handleChange}
                            className="radio-input"
                          />
                          {field.type === 'likert' ? (
                            <span className="likert-option-body">
                              <span className="likert-score">{parsedOption?.score ?? ''}</span>
                              <span className="likert-text">{parsedOption?.label ?? option.label}</span>
                            </span>
                          ) : (
                            <>
                              <span className="radio-custom" />
                              <span className="radio-text">{option.label}</span>
                            </>
                          )}
                        </label>
                      )
                    })}
                  </div>
                </fieldset>
              )
            }

            if (field.type === 'select') {
              return (
                <div key={field.id} className="form-group">
                  <label className="form-label" htmlFor={field.name}>
                    {label}
                    {field.required ? ' *' : ''}
                  </label>
                  <SearchableSelect
                    id={field.name}
                    name={field.name}
                    value={formData[field.name] ?? ''}
                    onChange={(val) => {
                      setFormData((current) => ({
                        ...current,
                        [field.name]: val,
                      }))
                    }}
                    options={field.options}
                    required={field.required}
                    className="form-select"
                  />
                </div>
              )
            }

            if (field.type === 'signature') {
              return (
                <div key={field.id} className="admin-preview-group">
                  <label className="admin-preview-label">
                    {label}
                    {field.required ? ' *' : ''}
                  </label>
                  <div className="admin-preview-signature">
                    <div className="admin-preview-signature-pad">
                      {formData[field.name]
                        ? 'Tanda tangan contoh tersimpan'
                        : 'Area tanda tangan'}
                    </div>
                    <button
                      type="button"
                      className="admin-preview-clear-btn"
                      onClick={() => setFormData((current) => ({
                        ...current,
                        [field.name]: current[field.name] ? '' : 'preview-signature',
                      }))}
                    >
                      {formData[field.name] ? 'Hapus Tanda Tangan' : 'Simulasikan Tanda Tangan'}
                    </button>
                  </div>
                </div>
              )
            }

            if (field.type === 'textarea') {
              return (
                <div key={field.id} className="form-group">
                  <label className="form-label" htmlFor={field.name}>
                    {label}
                    {field.required ? ' *' : ''}
                  </label>
                  <textarea
                    id={field.name}
                    name={field.name}
                    value={formData[field.name] ?? ''}
                    onChange={handleChange}
                    rows={3}
                    placeholder={field.placeholder || undefined}
                    className="form-textarea"
                  />
                </div>
              )
            }

            if (field.type === 'text') {
              return (
                <div key={field.id} className="form-group">
                  <label className="form-label" htmlFor={field.name}>
                    {label}
                    {field.required ? ' *' : ''}
                  </label>
                  <input
                    type="text"
                    id={field.name}
                    name={field.name}
                    value={formData[field.name] ?? ''}
                    onChange={handleChange}
                    placeholder={field.placeholder || undefined}
                    className="form-input"
                  />
                </div>
              )
            }

            return null
          })}

          <div className="form-navigation-shell">
            <div className="form-navigation-meta" aria-live="polite">
              <p className="form-navigation-title">
                {isMultiStep
                  ? `Langkah ${safeCurrentStepIndex + 1} dari ${steps.length}`
                  : 'Pratinjau siap diuji'}
              </p>
              <p className="form-navigation-caption">
                {requiredFieldCount > 0
                  ? `${completedRequiredFieldCount} dari ${requiredFieldCount} pertanyaan wajib sudah terisi`
                  : `${answeredFieldCount} field sudah terisi`}
              </p>
            </div>

            {isMultiStep ? (
              <div className="form-navigation">
                <button
                  type="button"
                  className="submit-btn submit-btn-secondary"
                  onClick={() => {
                    setCurrentStepIndex((current) => Math.max(current - 1, 0))
                    scrollToPreviewTop()
                  }}
                  disabled={safeCurrentStepIndex === 0}
                >
                  Kembali
                </button>
                <button
                  type="button"
                  className="submit-btn"
                  onClick={() => {
                    if (isLastStep) {
                      setCurrentStepIndex(0)
                      scrollToPreviewTop()
                      return
                    }

                    setCurrentStepIndex((current) => Math.min(current + 1, steps.length - 1))
                    scrollToPreviewTop()
                  }}
                >
                  {isLastStep ? 'Ulangi pratinjau' : 'Lanjut'}
                </button>
              </div>
            ) : (
              <div className="form-navigation">
                <button type="button" className="admin-preview-submit" disabled>
                  Kirim
                </button>
              </div>
            )}
          </div>

          {showScrollTop && (
            <button
              type="button"
              className="scroll-top-btn"
              onClick={scrollToPreviewTop}
            >
              Ke Atas
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AdminFormPreview({ form }: Props) {
  const previewStateKey = useMemo(() => (
    JSON.stringify({
      workflow: form.workflow,
      pages: form.pages,
      fields: form.fields,
    })
  ), [form])

  return <PreviewSession key={previewStateKey} form={form} />
}
