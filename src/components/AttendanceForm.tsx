'use client'

import { useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import SignaturePad from './SignaturePad'

const SEBAGAI_OPTIONS = ['Penguji', 'Coach', 'Mentor'] as const

export default function AttendanceForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    namaLengkap: '',
    nipNrp: '',
    jabatan: '',
    unitKerja: '',
    sebagai: '',
  })
  const [signature, setSignature] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!signature) {
      setError('Tanda tangan wajib diisi')
      return
    }

    setIsSubmitting(true)

    try {
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, signature }),
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

      <div className="form-group">
        <label className="form-label" htmlFor="namaLengkap">Nama Lengkap</label>
        <input
          type="text"
          id="namaLengkap"
          name="namaLengkap"
          value={formData.namaLengkap}
          onChange={handleChange}
          required
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="nipNrp">NIP/NRP</label>
        <input
          type="text"
          id="nipNrp"
          name="nipNrp"
          value={formData.nipNrp}
          onChange={handleChange}
          required
          className="form-input"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="jabatan">Jabatan</label>
        <textarea
          id="jabatan"
          name="jabatan"
          value={formData.jabatan}
          onChange={handleChange}
          required
          rows={3}
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <label className="form-label" htmlFor="unitKerja">Unit Kerja</label>
        <textarea
          id="unitKerja"
          name="unitKerja"
          value={formData.unitKerja}
          onChange={handleChange}
          required
          rows={3}
          className="form-textarea"
        />
      </div>

      <div className="form-group">
        <label className="form-label">Sebagai</label>
        <div className="radio-group">
          {SEBAGAI_OPTIONS.map((option) => (
            <label key={option} className="radio-label">
              <input
                type="radio"
                name="sebagai"
                value={option}
                checked={formData.sebagai === option}
                onChange={handleChange}
                required
                className="radio-input"
              />
              <span className="radio-custom" />
              <span className="radio-text">{option}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">Signature</label>
        <SignaturePad onSignatureChange={setSignature} />
      </div>

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
          'Submit'
        )}
      </button>
    </form>
  )
}
