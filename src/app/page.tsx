import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="page-wrapper entry-suite-page home-suite-page">
      <header className="public-ledger-topbar public-ledger-topbar-static">
        <div className="public-ledger-brand">
          <div className="public-ledger-brand-mark" aria-hidden="true" />
          <div>
            <strong>Editorial Data Intelligence</strong>
            <span>Portal formulir dan dashboard admin</span>
          </div>
        </div>

        <div className="public-ledger-topbar-meta">
          <span className="public-ledger-chip">Formulir Publik</span>
          <span className="public-ledger-chip subtle">Dashboard Admin</span>
        </div>
      </header>

      <section className="success-card entry-suite-card home-suite-card">
        <Image
          src="/garuda.png"
          alt="Garuda Pancasila"
          width={88}
          height={88}
          className="header-logo entry-suite-logo"
          priority
        />

        <p className="public-ledger-eyebrow entry-suite-eyebrow">JOTT Editor Form</p>
        <h1 className="success-title entry-suite-title">Satu Pintu untuk Form Publik dan Area Admin</h1>
        <p className="success-message entry-suite-subtitle">
          Buka formulir publik, masuk ke dashboard admin, atau langsung kelola formulir, kiriman,
          dan data kehadiran dari satu tempat.
        </p>

        <div className="entry-suite-points" aria-label="Ringkasan fitur">
          <span>Formulir publik siap dibagikan</span>
          <span>Ringkasan kiriman dan quiz</span>
          <span>Ekspor kehadiran dan CSV</span>
        </div>

        <div className="entry-suite-actions">
          <Link href="/admin/login" className="google-signin-btn entry-suite-primary-btn entry-suite-link-btn">
            Login Admin
          </Link>
          <Link href="/admin/forms" className="success-secondary-link entry-suite-secondary-link">
            Kelola Formulir
          </Link>
        </div>
      </section>
    </main>
  )
}
