import Link from 'next/link'
import PublicFormShell from '@/components/PublicFormShell'
import type { PublicFormDefinition } from '@/lib/forms'

interface PublicFormPageProps {
  form: PublicFormDefinition | null
}

export default function PublicFormPage({ form }: PublicFormPageProps) {
  if (form) {
    return <PublicFormShell form={form} />
  }

  return (
    <div className="page-wrapper public-ledger-page">
      <header className="public-ledger-topbar">
        <Link href="/f/attendance-template" className="public-ledger-brand">
          <div className="public-ledger-brand-mark" aria-hidden="true" />
          <div>
            <strong>isian</strong>
            <span>Portal pengisian</span>
          </div>
        </Link>
      </header>

      <div className="form-card public-ledger-card public-ledger-card-narrow">
        <div className="form-header public-ledger-header public-ledger-header-centered">
          <p className="public-ledger-eyebrow">Status Formulir</p>
          <h1 className="header-title">Form Tidak Dapat Dimuat</h1>
          <p className="header-subtitle">
            Form yang Anda cari tidak tersedia atau belum dipublikasikan.
          </p>
          <Link
            href="/f/attendance-template"
            className="public-retry-btn public-ledger-retry-btn"
          >
            Buka Form
          </Link>
        </div>
      </div>
    </div>
  )
}
