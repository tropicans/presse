'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useSyncExternalStore } from 'react'
import AdminFormPreview from './AdminFormPreview'
import { getAdminPreviewStorageKey, type AdminPreviewForm, type AdminPreviewSnapshot } from '@/lib/admin-form-preview'

interface Props {
  formId: string
  initialForm: AdminPreviewForm
  initialDeviceMode?: 'desktop' | 'mobile'
}

const previewSnapshotCache = new Map<string, {
  raw: string | null
  parsed: AdminPreviewSnapshot | null
}>()

function subscribeToPreviewStorage(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)

  return () => window.removeEventListener('storage', onStoreChange)
}

function getPreviewSnapshot(formId: string): AdminPreviewSnapshot | null {
  try {
    const storageKey = getAdminPreviewStorageKey(formId)
    const snapshotValue = window.localStorage.getItem(storageKey)
    const cachedSnapshot = previewSnapshotCache.get(storageKey)

    if (cachedSnapshot && cachedSnapshot.raw === snapshotValue) {
      return cachedSnapshot.parsed
    }

    if (!snapshotValue) {
      previewSnapshotCache.set(storageKey, {
        raw: null,
        parsed: null,
      })
      return null
    }

    const snapshot = JSON.parse(snapshotValue) as Partial<AdminPreviewSnapshot>
    const parsedSnapshot = snapshot.formId === formId && snapshot.form
      ? snapshot as AdminPreviewSnapshot
      : null

    previewSnapshotCache.set(storageKey, {
      raw: snapshotValue,
      parsed: parsedSnapshot,
    })

    return parsedSnapshot
  } catch {
    return null
  }
}

export default function AdminFormPreviewPage({ formId, initialForm, initialDeviceMode = 'desktop' }: Props) {
  const [deviceMode, setDeviceMode] = useState<'desktop' | 'mobile'>(initialDeviceMode)
  const [previewMode, setPreviewMode] = useState<'draft' | 'saved'>('draft')
  const [copyMessage, setCopyMessage] = useState<string | null>(null)
  const previewSnapshot = useSyncExternalStore(
    subscribeToPreviewStorage,
    () => getPreviewSnapshot(formId),
    () => null
  )
  const hasDraftSnapshot = Boolean(previewSnapshot?.form)
  const usingDraftSnapshot = hasDraftSnapshot && previewMode === 'draft'
  const previewForm = usingDraftSnapshot ? previewSnapshot!.form : initialForm
  const lastSyncedAt = previewSnapshot?.updatedAt
    ? new Intl.DateTimeFormat('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }).format(new Date(previewSnapshot.updatedAt))
    : null
  const stepCount = previewForm.pages.length > 0 ? previewForm.pages.length : 1
  const fieldCount = previewForm.fields.length

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target
      const isTypingTarget = target instanceof HTMLElement && (
        target.tagName === 'INPUT'
        || target.tagName === 'TEXTAREA'
        || target.tagName === 'SELECT'
        || target.isContentEditable
      )

      if (isTypingTarget || event.altKey || event.ctrlKey || event.metaKey) {
        return
      }

      if (event.key === 'd') {
        event.preventDefault()
        setDeviceMode('desktop')
        return
      }

      if (event.key === 'm') {
        event.preventDefault()
        setDeviceMode('mobile')
        return
      }

      if (event.key === 'r') {
        event.preventDefault()
        window.location.reload()
        return
      }

      if (!hasDraftSnapshot) {
        return
      }

      if (event.key === 'v') {
        event.preventDefault()
        setPreviewMode('saved')
        return
      }

      if (event.key === 'e') {
        event.preventDefault()
        setPreviewMode('draft')
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [hasDraftSnapshot])

  const handleCopyPreviewLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopyMessage('Link preview tersalin')
      window.setTimeout(() => setCopyMessage(null), 1800)
    } catch {
      setCopyMessage('Gagal menyalin link')
      window.setTimeout(() => setCopyMessage(null), 1800)
    }
  }

  return (
    <div className="editorial-preview-page-shell">
      <header className="editorial-preview-page-topbar">
        <div>
          <p className="forms-dashboard-overline">Pratinjau Form</p>
          <h1>Pratinjau tab baru</h1>
          <div className="editorial-preview-page-status-row">
            <span className={`editorial-preview-status-badge ${usingDraftSnapshot ? 'draft' : 'saved'}`}>
              {usingDraftSnapshot ? 'Draft belum disimpan' : 'Versi tersimpan'}
            </span>
            {lastSyncedAt && usingDraftSnapshot && (
              <span className="editorial-preview-status-meta">Sinkron terakhir {lastSyncedAt}</span>
            )}
            <span className="editorial-preview-status-meta">{stepCount} langkah</span>
            <span className="editorial-preview-status-meta">{fieldCount} field</span>
          </div>
          <p className="editorial-preview-page-note">
            {usingDraftSnapshot
              ? 'Menampilkan perubahan terbaru dari editor, termasuk yang belum disimpan.'
              : 'Menampilkan versi form yang terakhir tersimpan.'}
          </p>
          {usingDraftSnapshot && (
            <div className="editorial-preview-page-warning" role="status" aria-live="polite">
              Preview ini sedang memakai draft editor. Simpan form jika perubahan ini harus menjadi versi publik terbaru.
            </div>
          )}
          {copyMessage && <p className="editorial-preview-page-sync">{copyMessage}</p>}
          <p className="editorial-preview-page-hints">
            Pintasan: <kbd>D</kbd> desktop, <kbd>M</kbd> mobile, <kbd>R</kbd> reload, <kbd>V</kbd> versi tersimpan, <kbd>E</kbd> draft editor
          </p>
        </div>
        <div className="editorial-preview-page-actions">
          <div className="editorial-preview-toolbar" role="group" aria-label="Aksi preview">
            <button
              type="button"
              className="editorial-preview-toolbar-btn"
              onClick={handleCopyPreviewLink}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="9" y="9" width="11" height="11" rx="2" />
                <path d="M5 15V6a2 2 0 0 1 2-2h9" />
              </svg>
              Salin link
            </button>
            <button
              type="button"
              className="editorial-preview-toolbar-btn"
              onClick={() => window.location.reload()}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-2.64-6.36" />
                <path d="M21 3v6h-6" />
              </svg>
              Reload
            </button>
            <button
              type="button"
              className="editorial-preview-toolbar-btn"
              onClick={() => setPreviewMode((current) => current === 'draft' ? 'saved' : 'draft')}
              disabled={!hasDraftSnapshot}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4 7h16" />
                <path d="M4 12h16" />
                <path d="M4 17h16" />
              </svg>
              {usingDraftSnapshot ? 'Versi tersimpan' : 'Draft editor'}
            </button>
          </div>
          <div className="editorial-preview-device-toggle" role="group" aria-label="Mode perangkat preview">
            <button
              type="button"
              className={`editorial-preview-device-btn ${deviceMode === 'desktop' ? 'active' : ''}`}
              onClick={() => setDeviceMode('desktop')}
            >
              Desktop
            </button>
            <button
              type="button"
              className={`editorial-preview-device-btn ${deviceMode === 'mobile' ? 'active' : ''}`}
              onClick={() => setDeviceMode('mobile')}
            >
              Mobile
            </button>
          </div>
          <Link href={`/admin/forms/${formId}`} className="editorial-form-editor-ghost-btn">
            Kembali ke editor
          </Link>
        </div>
      </header>

      <div className={`editorial-preview-device-stage ${deviceMode}`}>
        <div className={`editorial-preview-device-frame ${deviceMode}`}>
          <AdminFormPreview form={previewForm} />
        </div>
      </div>
    </div>
  )
}
