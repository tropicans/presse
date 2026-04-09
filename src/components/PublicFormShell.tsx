'use client'

import Image from 'next/image'
import Link from 'next/link'
import AttendanceForm from '@/components/AttendanceForm'
import type { PublicFormDefinition } from '@/lib/forms'

interface PublicFormShellProps {
  form: PublicFormDefinition
}

export default function PublicFormShell({ form }: PublicFormShellProps) {
  const workflowLabel = form.settings.workflow === 'WEBINAR' ? 'Alur Webinar' : 'Form Standar'

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

        <div className="public-ledger-topbar-meta">
          <span className="public-ledger-chip">{workflowLabel}</span>
          <span className="public-ledger-chip subtle">{form.fields.length} pertanyaan</span>
        </div>
      </header>

      <div className="form-card public-ledger-card">
        <div className="form-header public-ledger-header">
          <Image
            src="/garuda.png"
            alt="Garuda Pancasila"
            width={80}
            height={80}
            className="header-logo public-ledger-logo"
            priority
          />
          <p className="public-ledger-eyebrow">Form Publik</p>
          <h1 className="header-title">{form.title}</h1>
          <p className="header-subtitle">
            {form.description || 'Lengkapi form berikut dengan data yang benar sebelum dikirim.'}
          </p>
        </div>
        <div className="form-body public-ledger-body">
          <AttendanceForm form={form} />
        </div>
      </div>
    </div>
  )
}
