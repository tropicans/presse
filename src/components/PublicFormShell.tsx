'use client'

import Image from 'next/image'
import AttendanceForm from '@/components/AttendanceForm'
import type { PublicFormDefinition } from '@/lib/forms'

interface PublicFormShellProps {
  form: PublicFormDefinition
}

export default function PublicFormShell({ form }: PublicFormShellProps) {
  return (
    <div className="page-wrapper public-ledger-page">
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
