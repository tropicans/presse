import Image from 'next/image'
import Link from 'next/link'

export default function HomePage() {
  return (
    <main className="success-wrapper">
      <section className="success-card landing-card">
        <Image
          src="/garuda.png"
          alt="Garuda Pancasila"
          width={88}
          height={88}
          className="header-logo landing-logo"
          priority
        />

        <p className="landing-eyebrow">JOTT Form Builder</p>
        <h1 className="success-title">Portal Form dan Dashboard Admin</h1>
        <p className="success-message">
          Gunakan halaman ini sebagai pintu masuk ke form kehadiran publik atau ke area admin untuk
          mengelola form, submission, export CSV, dan ringkasan webinar.
        </p>

        <div className="landing-actions">
          <Link href="/admin/login" className="landing-btn-secondary">
            Login Admin
          </Link>
          <Link href="/admin/forms" className="landing-btn-secondary">
            Daftar Form
          </Link>
        </div>
      </section>
    </main>
  )
}
