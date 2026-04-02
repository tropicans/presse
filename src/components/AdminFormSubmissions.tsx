'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

interface SubmissionColumn {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'radio' | 'signature'
}

interface SubmissionItem {
  id: string
  createdAt: string
  answers: Record<string, string>
}

interface SubmissionData {
  form: {
    id: string
    slug: string
    title: string
    status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  }
  columns: SubmissionColumn[]
  items: SubmissionItem[]
}

interface Props {
  formId: string
}

export default function AdminFormSubmissions({ formId }: Props) {
  const [data, setData] = useState<SubmissionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch(`/api/admin/forms/${formId}/submissions`)
      const json = await res.json()

      if (!res.ok) {
        setError(json.error || 'Gagal memuat submissions')
        return
      }

      setData(json.data)
    } catch {
      setError('Gagal memuat submissions')
    } finally {
      setLoading(false)
    }
  }, [formId])

  useEffect(() => {
    load()
  }, [load])

  const handleDelete = async (submissionId: string) => {
    setDeleting(true)
    try {
      const res = await fetch(
        `/api/admin/forms/${formId}/submissions?submissionId=${encodeURIComponent(submissionId)}`,
        { method: 'DELETE' }
      )
      const json = await res.json()

      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'Gagal menghapus submission' })
        return
      }

      setFeedback({ type: 'success', message: 'Submission berhasil dihapus' })
      setPendingDeleteId(null)
      await load()
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menghapus submission' })
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <div className="admin-wrapper"><div className="admin-empty"><p>Memuat submissions...</p></div></div>
  }

  if (!data) {
    return <div className="admin-wrapper"><div className="admin-empty"><p>{error || 'Data tidak ditemukan'}</p></div></div>
  }

  const visibleColumns = data.columns.filter((column) => column.type !== 'signature')

  return (
    <div className="admin-wrapper admin-builder-wrapper">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>Submissions Form</h1>
          <p>{data.form.title} · {data.form.slug}</p>
        </div>
        <div className="admin-header-right">
          <Link href="/admin/forms" className="admin-secondary-btn">Daftar Form</Link>
          <a href={`/api/admin/forms/${data.form.id}/export`} className="admin-secondary-btn">
            Export CSV
          </a>
          <Link href={`/admin/forms/${data.form.id}`} className="admin-export-btn">Edit Form</Link>
        </div>
      </div>

      {feedback && (
        <div className={`admin-builder-alert ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      <div className="admin-table-container">
        {data.items.length === 0 ? (
          <div className="admin-empty">
            <h3>Belum ada submission</h3>
            <p>Form ini belum menerima kiriman data.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Waktu</th>
                {visibleColumns.map((column) => (
                  <th key={column.id}>{column.label}</th>
                ))}
                <th>Tanda Tangan</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {data.items.map((item) => {
                const signatureColumn = data.columns.find((column) => column.type === 'signature')
                const signature = signatureColumn ? item.answers[signatureColumn.name] : ''

                return (
                  <tr key={item.id}>
                    <td>{new Date(item.createdAt).toLocaleString('id-ID')}</td>
                    {visibleColumns.map((column) => (
                      <td key={column.id}>{item.answers[column.name] || '-'}</td>
                    ))}
                    <td>
                      {signature ? (
                        <Image
                          src={signature}
                          alt="Signature"
                          width={80}
                          height={40}
                          unoptimized
                          className="signature-thumb"
                        />
                      ) : (
                        '-'
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(item.id)}
                        className="delete-btn"
                        title="Hapus submission"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {pendingDeleteId && (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-submission-title">
            <div className="admin-modal-head">
              <h3 id="delete-submission-title">Hapus Submission</h3>
              <p>Tindakan ini akan menghapus submission dari form builder. Untuk form attendance, data legacy terkait juga ikut dihapus.</p>
            </div>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => setPendingDeleteId(null)}
                disabled={deleting}
              >
                Batal
              </button>
              <button
                type="button"
                className="admin-delete-confirm-btn"
                onClick={() => handleDelete(pendingDeleteId)}
                disabled={deleting}
              >
                {deleting ? 'Menghapus...' : 'Ya, Hapus'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
