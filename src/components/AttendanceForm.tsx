'use client'

import { FormEvent, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import SignaturePad from './SignaturePad'
import type { PublicFormDefinition, FormField } from '@/lib/forms'

interface AttendanceFormProps {
  form: PublicFormDefinition
}

function createInitialValues(fields: FormField[]) {
  return fields.reduce<Record<string, string>>((acc, field) => {
    acc[field.name] = ''
    return acc
  }, {})
}

export default function AttendanceForm({ form }: AttendanceFormProps) {
  const router = useRouter()
  const initialValues = useMemo(() => createInitialValues(form.fields), [form.fields])
  const [formData, setFormData] = useState<Record<string, string>>(initialValues)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setFormData(initialValues)
  }, [initialValues])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSignatureChange = (name: string, value: string | null) => {
    setFormData((prev) => ({ ...prev, [name]: value ?? '' }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
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

      router.push('/success')
    } catch {
      setError('Gagal mengirim data. Periksa koneksi internet Anda.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="attendance-form">
      {error && (
        <div className="form-error">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
          {error}
        </div>
      )}

      {form.fields.map((field) => {
        if (field.type === 'radio') {
          return (
            <div key={field.id} className="form-group">
              <label className="form-label">{field.label}</label>
              <div className="radio-group">
                {field.options.map((option) => (
                  <label key={option} className="radio-label">
                    <input
                      type="radio"
                      name={field.name}
                      value={option}
                      checked={formData[field.name] === option}
                      onChange={handleChange}
                      required={field.required}
                      className="radio-input"
                    />
                    <span className="radio-custom" />
                    <span className="radio-text">{option}</span>
                  </label>
                ))}
              </div>
            </div>
          )
        }

        if (field.type === 'signature') {
          return (
            <div key={field.id} className="form-group">
              <label className="form-label">{field.label}</label>
              <SignaturePad onSignatureChange={(value) => handleSignatureChange(field.name, value)} />
            </div>
          )
        }

        if (field.type === 'textarea') {
          return (
            <div key={field.id} className="form-group">
              <label className="form-label" htmlFor={field.name}>{field.label}</label>
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
              />
            </div>
          )
        }

        return (
          <div key={field.id} className="form-group">
            <label className="form-label" htmlFor={field.name}>{field.label}</label>
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
            />
          </div>
        )
      })}

      <button
        type="submit"
        disabled={isSubmitting}
        className="submit-btn"
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
    </form>
  )
}
