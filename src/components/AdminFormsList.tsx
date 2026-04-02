'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'

interface AdminFormListItem {
  id: string
  slug: string
  title: string
  description: string | null
  status: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  mode: 'STANDARD' | 'QUIZ'
  submissionCount: number
  updatedAt: string
}

export default function AdminFormsList() {
  const router = useRouter()
  const [forms, setForms] = useState<AdminFormListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newFormTitle, setNewFormTitle] = useState('Form Baru')
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/admin/forms')
        if (!res.ok) {
          setFeedback({ type: 'error', message: 'Gagal memuat daftar form' })
          return
        }

        const json = await res.json()
        setForms(json.data ?? [])
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [])

  const handleCreateForm = async () => {
    const title = newFormTitle.trim()

    if (!title) {
      setFeedback({ type: 'error', message: 'Judul form baru wajib diisi' })
      return
    }

    setCreating(true)

    try {
      const res = await fetch('/api/admin/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      const json = await res.json()

      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'Gagal membuat form' })
        return
      }

      setFeedback({ type: 'success', message: 'Form baru berhasil dibuat' })
      setShowCreateModal(false)
      router.push(`/admin/forms/${json.data.id}`)
    } catch {
      setFeedback({ type: 'error', message: 'Gagal membuat form' })
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>Form Builder</h1>
          <p>Kelola form publik yang dipakai aplikasi</p>
        </div>
        <div className="admin-header-right">
          <button
            onClick={() => {
              setNewFormTitle('Form Baru')
              setShowCreateModal(true)
              setFeedback(null)
            }}
            className="admin-export-btn"
            disabled={creating}
          >
            Buat Form
          </button>
          <Link href="/admin" className="admin-secondary-btn">Lihat Kehadiran</Link>
          <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="admin-logout-btn">
            Logout
          </button>
        </div>
      </div>

      {feedback && (
        <div className={`admin-builder-alert ${feedback.type}`}>
          {feedback.message}
        </div>
      )}

      <div className="admin-table-container">
        {loading ? (
          <div className="admin-empty"><p>Memuat form...</p></div>
        ) : forms.length === 0 ? (
          <div className="admin-empty">
            <h3>Belum ada form</h3>
            <p>Form yang bisa diedit akan muncul di sini.</p>
          </div>
        ) : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>Judul</th>
                <th>Slug</th>
                <th>Status</th>
                <th>Mode</th>
                <th>Submission</th>
                <th>Diperbarui</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr key={form.id}>
                  <td>
                    <div className="admin-form-title">{form.title}</div>
                    {form.description && <div className="admin-form-subtitle">{form.description}</div>}
                  </td>
                  <td><code>{form.slug}</code></td>
                  <td><span className={`admin-form-status ${form.status.toLowerCase()}`}>{form.status}</span></td>
                  <td>{form.mode}</td>
                  <td>{form.submissionCount}</td>
                  <td>{new Date(form.updatedAt).toLocaleString('id-ID')}</td>
                  <td>
                    <div className="admin-action-group">
                      <Link href={`/admin/forms/${form.id}`} className="admin-link-btn">
                        Edit Form
                      </Link>
                      <Link href={`/admin/forms/${form.id}/submissions`} className="admin-link-btn">
                        Lihat Data
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreateModal && (
        <div className="admin-modal-backdrop" role="presentation">
          <div className="admin-modal-card" role="dialog" aria-modal="true" aria-labelledby="create-form-title">
            <div className="admin-modal-head">
              <h3 id="create-form-title">Buat Form Baru</h3>
              <p>Tentukan judul awal. Anda bisa mengubah detail dan field setelah form dibuat.</p>
            </div>

            <label className="admin-builder-field">
              <span>Judul Form</span>
              <input
                value={newFormTitle}
                onChange={(e) => setNewFormTitle(e.target.value)}
                className="admin-builder-input"
                placeholder="Masukkan judul form"
                autoFocus
              />
            </label>

            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-link-btn"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Batal
              </button>
              <button type="button" className="admin-export-btn" onClick={handleCreateForm} disabled={creating}>
                {creating ? 'Membuat...' : 'Buat Sekarang'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
