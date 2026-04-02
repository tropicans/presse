'use client'

import { useMemo, useState } from 'react'

interface PreviewField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'radio' | 'likert' | 'signature'
  required: boolean
  placeholder: string
  pageId: string
  options: Array<{
    label: string
    isCorrect: boolean
    points: number
    nextPageId?: string
  }>
}

interface PreviewPage {
  id: string
  title: string
  description: string
}

interface PreviewForm {
  title: string
  description: string | null
  workflow: 'STANDARD' | 'WEBINAR'
  pages: PreviewPage[]
  fields: PreviewField[]
}

interface PreviewStep {
  id: string
  title: string
  description: string | null
  fields: PreviewField[]
}

interface Props {
  form: PreviewForm
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

function createInitialValues(fields: PreviewField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.name] = ''
    return acc
  }, {})
}

function getDisplayLabel(field: PreviewField, formData: Record<string, string>) {
  if (
    field.name === 'unitKerja'
    && sameChoice(formData.participantType ?? '', 'Eksternal')
  ) {
    return 'Instansi'
  }

  return field.label
}

function buildStandardSteps(form: PreviewForm, formData: Record<string, string>) {
  if (form.pages.length === 0) {
    return [{
      id: 'single-step',
      title: 'Form',
      description: form.description,
      fields: form.fields,
    }]
  }

  const fieldsByPageId = new Map<string, PreviewField[]>()
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
  let currentPageId = form.pages[0]?.id

  while (currentPageId && !visitedPageIds.has(currentPageId)) {
    visitedPageIds.add(currentPageId)

    const currentPageIndex = pageIndexById.get(currentPageId) ?? -1
    const page = currentPageIndex >= 0 ? form.pages[currentPageIndex] : null

    if (!page) {
      break
    }

    const fields = fieldsByPageId.get(page.id) ?? []

    if (fields.length > 0) {
      activeSteps.push({
        id: page.id,
        title: page.title || `Halaman ${currentPageIndex + 1}`,
        description: page.description || (currentPageIndex === 0 ? form.description : null),
        fields,
      })
    }

    let nextPageId = form.pages[currentPageIndex + 1]?.id

    for (const field of fields) {
      if (field.type !== 'radio') {
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

function buildWebinarSteps(form: PreviewForm, formData: Record<string, string>) {
  const participantField = form.fields.find((field) => field.name === 'participantType')
  const internalField = form.fields.find((field) => field.name === 'nipNrp')
  const sharedFields = form.fields.filter((field) => (
    field.name !== 'participantType' && field.name !== 'nipNrp'
  ))

  const steps: PreviewStep[] = []

  if (participantField) {
    steps.push({
      id: 'participant-type',
      title: 'Tipe Peserta',
      description: 'Pilih kategori peserta sebelum melanjutkan ke langkah berikutnya.',
      fields: [participantField],
    })
  }

  if (
    internalField
    && sameChoice(formData.participantType ?? '', 'Internal')
  ) {
    steps.push({
      id: 'internal-identity',
      title: 'Data Internal',
      description: 'Lengkapi identitas pegawai internal untuk melanjutkan presensi.',
      fields: [internalField],
    })
  }

  if (sharedFields.length > 0) {
    steps.push({
      id: 'shared-attendance',
      title: 'Data Presensi',
      description: 'Lengkapi data umum peserta, quiz, atau evaluasi.',
      fields: sharedFields,
    })
  }

  return steps
}

function buildSteps(form: PreviewForm, formData: Record<string, string>) {
  return form.workflow === 'WEBINAR'
    ? buildWebinarSteps(form, formData)
    : buildStandardSteps(form, formData)
}

function PreviewSession({ form }: Props) {
  const initialValues = useMemo(() => createInitialValues(form.fields), [form.fields])
  const [formData, setFormData] = useState<Record<string, string>>(initialValues)
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const steps = useMemo(() => buildSteps(form, formData), [form, formData])
  const safeCurrentStepIndex = Math.min(currentStepIndex, Math.max(steps.length - 1, 0))
  const currentStep = steps[safeCurrentStepIndex] ?? steps[0]
  const isMultiStep = steps.length > 1
  const isLastStep = safeCurrentStepIndex >= steps.length - 1
  const hasWebinarBranching = form.workflow === 'WEBINAR'

  const handleChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = event.target
    setFormData((current) => ({
      ...current,
      [name]: value,
    }))
  }

  return (
    <div className="admin-preview-shell">
      <div className="admin-preview-card">
        <div className="admin-preview-head">
          <h3>{form.title || 'Tanpa Judul'}</h3>
          <p>{form.description || 'Deskripsi form akan tampil di sini.'}</p>
        </div>

        <div className="admin-preview-body">
          <div className="admin-preview-note">
            <strong>Preview interaktif</strong>
            <p>Uji alur halaman dan branching langsung di sini. Data yang Anda isi tidak akan dikirim.</p>
          </div>

          {hasWebinarBranching && (
            <div className="admin-preview-workflow-note">
              <strong>Preview flow webinar</strong>
              <p>Langkah pembuka menentukan apakah peserta internal mengisi NIP/NRP sebelum lanjut ke data presensi umum.</p>
            </div>
          )}

          {isMultiStep && currentStep && (
            <div className="form-step-shell admin-preview-step-shell">
              <div className="form-step-progress" aria-label={`Langkah ${safeCurrentStepIndex + 1} dari ${steps.length}`}>
                <span className="form-step-badge">Langkah {safeCurrentStepIndex + 1} / {steps.length}</span>
                <div className="form-step-dots" aria-hidden="true">
                  {steps.map((step, index) => (
                    <span
                      key={step.id}
                      className={`form-step-dot ${index === safeCurrentStepIndex ? 'active' : ''} ${index < safeCurrentStepIndex ? 'complete' : ''}`}
                    />
                  ))}
                </div>
              </div>
              <div className="form-step-copy">
                <h4 className="form-step-title">{currentStep.title}</h4>
                {currentStep.description && (
                  <p className="form-step-description">{currentStep.description}</p>
                )}
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
                      <p className="field-help">Pilih satu jawaban pada skala Likert 1-5.</p>
                      <div className="likert-scale-meta" aria-hidden="true">
                        <span>Tidak setuju</span>
                        <span>Netral</span>
                        <span>Sangat setuju</span>
                      </div>
                    </>
                  )}
                  <div className={field.type === 'likert' ? 'radio-group likert-group' : 'radio-group'}>
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

          {isMultiStep ? (
            <div className="form-navigation">
              <button
                type="button"
                className="submit-btn submit-btn-secondary"
                onClick={() => setCurrentStepIndex((current) => Math.max(current - 1, 0))}
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
                  return
                }

                  setCurrentStepIndex((current) => Math.min(current + 1, steps.length - 1))
                }}
              >
                {isLastStep ? 'Ulangi Preview' : 'Lanjut'}
              </button>
            </div>
          ) : (
            <button type="button" className="admin-preview-submit" disabled>
              Submit
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
