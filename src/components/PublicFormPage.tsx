'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import PublicFormShell from '@/components/PublicFormShell'
import type { PublicFormDefinition } from '@/lib/forms'

interface PublicFormPageProps {
  slug: string
}

export default function PublicFormPage({ slug }: PublicFormPageProps) {
  const [form, setForm] = useState<PublicFormDefinition | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  const loadForm = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)

    try {
      const response = await fetch(`/api/public/forms/${encodeURIComponent(slug)}`, {
        signal,
        headers: {
          Accept: 'application/json',
        },
      })

      const payload = await response.json()

      if (!response.ok) {
        setForm(null)
        setError(payload?.error || 'Form tidak ditemukan')
        return
      }

      setForm(payload.form)
    } catch (loadError) {
      if ((loadError as Error).name === 'AbortError') {
        return
      }

      setForm(null)
      setError('Gagal memuat form. Silakan coba lagi.')
    } finally {
      setLoading(false)
    }
  }, [slug])

  useEffect(() => {
    const controller = new AbortController()
    loadForm(controller.signal)

    return () => controller.abort()
  }, [loadForm])

  if (form) {
    return <PublicFormShell form={form} />
  }

  return (
    <div className="page-wrapper public-ledger-page">
      <header className="public-ledger-topbar">
        <Link href="/" className="public-ledger-brand">
          <div className="public-ledger-brand-mark" aria-hidden="true" />
          <div>
            <strong>Editorial Data Intelligence</strong>
            <span>Portal pengisian publik</span>
          </div>
        </Link>
      </header>

      <div className="form-card public-ledger-card public-ledger-card-narrow">
        <div className="form-header public-ledger-header public-ledger-header-centered">
          <p className="public-ledger-eyebrow">Status Formulir</p>
          <h1 className="header-title">{loading ? 'Memuat Form' : 'Form Tidak Dapat Dimuat'}</h1>
          <p className="header-subtitle">{error ?? 'Mohon tunggu, form sedang disiapkan.'}</p>
          {error && !loading && (
            <button
              type="button"
              className="public-retry-btn public-ledger-retry-btn"
              onClick={() => void loadForm()}
            >
              Coba Lagi
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
