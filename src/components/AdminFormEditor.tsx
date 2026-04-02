'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import AdminFormPreview from './AdminFormPreview'

interface EditableField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'radio' | 'signature'
  required: boolean
  placeholder: string
  options: string[]
}

interface AdminFormDetail {
  id: string
  slug: string
  title: string
  description: string | null
  successMessage: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  mode: 'STANDARD' | 'QUIZ'
  fields: EditableField[]
}

interface Props {
  formId: string
}

const fieldTypeOptions: Array<EditableField['type']> = ['text', 'textarea', 'radio', 'signature']
const protectedAttendanceFieldNames = new Set([
  'namaLengkap',
  'nipNrp',
  'jabatan',
  'unitKerja',
  'sebagai',
  'signature',
])

function createField(type: EditableField['type']): EditableField {
  return {
    id: `new-${crypto.randomUUID()}`,
    name: 'field_baru',
    label: '',
    type,
    required: true,
    placeholder: '',
    options: type === 'radio' ? ['Opsi 1', 'Opsi 2'] : [],
  }
}

export default function AdminFormEditor({ formId }: Props) {
  const [form, setForm] = useState<AdminFormDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const res = await fetch(`/api/admin/forms/${formId}`)
        const json = await res.json()

        if (!res.ok) {
          setError(json.error || 'Gagal memuat form')
          return
        }

        setForm(json.data)
      } catch {
        setError('Gagal memuat form')
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [formId])

  const updateField = (fieldId: string, patch: Partial<EditableField>) => {
    setForm((current) => {
      if (!current) return current
      return {
        ...current,
        fields: current.fields.map((field) =>
          field.id === fieldId ? { ...field, ...patch } : field
        ),
      }
    })
  }

  const removeField = (fieldId: string) => {
    setForm((current) => {
      if (!current) return current
      if (current.fields.length <= 1) return current

      return {
        ...current,
        fields: current.fields.filter((field) => field.id !== fieldId),
      }
    })
  }

  const moveField = (fieldId: string, direction: 'up' | 'down') => {
    setForm((current) => {
      if (!current) return current

      const index = current.fields.findIndex((field) => field.id === fieldId)
      if (index === -1) return current

      const targetIndex = direction === 'up' ? index - 1 : index + 1
      if (targetIndex < 0 || targetIndex >= current.fields.length) {
        return current
      }

      const fields = [...current.fields]
      const [field] = fields.splice(index, 1)
      fields.splice(targetIndex, 0, field)

      return { ...current, fields }
    })
  }

  const addField = (type: EditableField['type']) => {
    setForm((current) => {
      if (!current) return current
      return {
        ...current,
        fields: [...current.fields, createField(type)],
      }
    })
  }

  const isProtectedAttendanceField = (field: EditableField) => {
    return form?.slug === 'attendance-template' && protectedAttendanceFieldNames.has(field.name)
  }

  const handleSave = async () => {
    if (!form) return

    setSaving(true)
    setMessage(null)
    setError(null)

    try {
      const res = await fetch(`/api/admin/forms/${formId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: form.title,
          description: form.description ?? '',
          successMessage: form.successMessage ?? '',
          status: form.status,
          fields: form.fields.map((field) => ({
            id: field.id,
            type: field.type,
            label: field.label,
            required: field.required,
            placeholder: field.placeholder,
            options: field.options,
          })),
        }),
      })

      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Gagal menyimpan perubahan')
        return
      }

      setForm(json.data)
      setMessage('Form berhasil diperbarui')
    } catch {
      setError('Gagal menyimpan perubahan')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="admin-wrapper"><div className="admin-empty"><p>Memuat editor...</p></div></div>
  }

  if (!form) {
    return <div className="admin-wrapper"><div className="admin-empty"><p>{error || 'Form tidak ditemukan'}</p></div></div>
  }

  return (
    <div className="admin-wrapper admin-builder-wrapper">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>Edit Form</h1>
          <p>{form.slug}</p>
        </div>
        <div className="admin-header-right">
          <Link href="/admin/forms" className="admin-secondary-btn">Kembali ke daftar</Link>
          <Link href={`/admin/forms/${form.id}/submissions`} className="admin-secondary-btn">Lihat Submissions</Link>
          <button onClick={handleSave} disabled={saving} className="admin-export-btn">
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </button>
        </div>
      </div>

      {(message || error) && (
        <div className={`admin-builder-alert ${error ? 'error' : 'success'}`}>
          {error || message}
        </div>
      )}

      <div className="admin-builder-grid">
        <section className="admin-builder-panel">
          <h2>Informasi Form</h2>
          <label className="admin-builder-field">
            <span>Judul</span>
            <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="admin-builder-input" />
          </label>
          <label className="admin-builder-field">
            <span>Deskripsi</span>
            <textarea
              value={form.description ?? ''}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="admin-builder-textarea"
              rows={4}
            />
          </label>
          <label className="admin-builder-field">
            <span>Pesan sukses</span>
            <textarea
              value={form.successMessage ?? ''}
              onChange={(e) => setForm({ ...form, successMessage: e.target.value })}
              className="admin-builder-textarea"
              rows={3}
            />
          </label>
          <label className="admin-builder-field">
            <span>Status</span>
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as AdminFormDetail['status'] })}
              className="admin-builder-select"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="PUBLISHED">PUBLISHED</option>
              <option value="ARCHIVED">ARCHIVED</option>
            </select>
          </label>
        </section>

        <section className="admin-builder-panel">
          <h2>Field Form</h2>
          <div className="admin-builder-toolbar">
            {fieldTypeOptions.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => addField(type)}
                className="admin-secondary-btn admin-builder-add-btn"
              >
                + {type}
              </button>
            ))}
          </div>
          <div className="admin-builder-fields">
            {form.fields.map((field, index) => (
              <div key={field.id} className="admin-builder-card">
                {isProtectedAttendanceField(field) && (
                  <div className="admin-builder-protected-note">
                    Field inti attendance: tipe, urutan, dan keberadaannya dikunci untuk menjaga dual-write tetap aman.
                  </div>
                )}
                <div className="admin-builder-card-head">
                  <strong>{field.name}</strong>
                  <div className="admin-builder-card-actions">
                    <span>{field.type}</span>
                    <button type="button" onClick={() => moveField(field.id, 'up')} className="admin-builder-icon-btn" disabled={index === 0 || isProtectedAttendanceField(field)}>↑</button>
                    <button type="button" onClick={() => moveField(field.id, 'down')} className="admin-builder-icon-btn" disabled={index === form.fields.length - 1 || isProtectedAttendanceField(field)}>↓</button>
                    <button type="button" onClick={() => removeField(field.id)} className="admin-builder-icon-btn danger" disabled={form.fields.length === 1 || isProtectedAttendanceField(field)}>✕</button>
                  </div>
                </div>

                <label className="admin-builder-field">
                  <span>Tipe</span>
                  <select
                    value={field.type}
                    onChange={(e) => updateField(field.id, {
                      type: e.target.value as EditableField['type'],
                      options: e.target.value === 'radio' ? (field.options.length ? field.options : ['Opsi 1', 'Opsi 2']) : [],
                      placeholder: e.target.value === 'signature' || e.target.value === 'radio' ? '' : field.placeholder,
                    })}
                    className="admin-builder-select"
                    disabled={isProtectedAttendanceField(field)}
                  >
                    {fieldTypeOptions.map((type) => (
                      <option key={type} value={type}>{type}</option>
                    ))}
                  </select>
                </label>

                <label className="admin-builder-field">
                  <span>Label</span>
                  <input
                    value={field.label}
                    onChange={(e) => updateField(field.id, { label: e.target.value })}
                    className="admin-builder-input"
                  />
                </label>

                {(field.type === 'text' || field.type === 'textarea') && (
                  <label className="admin-builder-field">
                    <span>Placeholder</span>
                    <input
                      value={field.placeholder}
                      onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                      className="admin-builder-input"
                    />
                  </label>
                )}

                {field.type === 'radio' && (
                  <label className="admin-builder-field">
                    <span>Opsi</span>
                    <textarea
                      value={field.options.join('\n')}
                      onChange={(e) => updateField(field.id, { options: e.target.value.split('\n') })}
                      className="admin-builder-textarea"
                      rows={4}
                    />
                    <small>Satu opsi per baris.</small>
                  </label>
                )}

                <label className="admin-builder-checkbox">
                  <input
                    type="checkbox"
                    checked={field.required}
                    onChange={(e) => updateField(field.id, { required: e.target.checked })}
                  />
                  Wajib diisi
                </label>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-builder-panel">
          <h2>Preview Live</h2>
          <AdminFormPreview
            form={{
              title: form.title,
              description: form.description,
              fields: form.fields,
            }}
          />
        </section>
      </div>
    </div>
  )
}
