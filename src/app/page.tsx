import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'

export default async function HomePage() {
  const session = await getAdminSession()

  if (session) {
    redirect('/admin/forms')
  }

  return (
    <main className="page-wrapper entry-suite-page home-suite-page">
      <section className="entry-suite-card home-suite-card home-suite-hero">
        <div className="home-suite-copy">
          <span className="home-suite-kicker">JOTT Editor Form</span>
          <h1 className="success-title entry-suite-title home-suite-title">
            Masuk ke dashboard admin dengan cepat dan lanjut kerja tanpa distraksi.
          </h1>
          <p className="success-message entry-suite-subtitle home-suite-subtitle">
            Halaman ini sekarang difokuskan untuk akses admin. Login Google membawa Anda langsung ke
            area pengelolaan formulir dan data masuk.
          </p>

          <div className="entry-suite-points home-suite-points" aria-label="Ringkasan fitur">
            <span>Akses satu klik</span>
            <span>Google sign-in</span>
            <span>Admin terproteksi</span>
          </div>

          <div className="entry-suite-actions home-suite-actions">
            <Link href="/admin/login" className="google-signin-btn google-signin-btn-prominent entry-suite-link-btn">
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Login dengan Google
            </Link>
          </div>
        </div>

        <div className="home-suite-panel" aria-label="Ringkasan akses cepat">
          <div className="home-suite-brand-row">
            <Image
              src="/garuda.png"
              alt="Garuda Pancasila"
              width={72}
              height={72}
              className="header-logo entry-suite-logo home-suite-logo"
              priority
            />
            <div>
              <p className="home-suite-panel-label">Admin access</p>
              <h2 className="home-suite-panel-title">Hanya email yang terdaftar yang bisa masuk</h2>
            </div>
          </div>

          <div className="home-suite-shortcuts compact">
            <div className="home-suite-shortcut-card muted static">
              <strong>Yang didapat setelah login</strong>
              <span>Kelola form builder, pantau submission, dan ekspor data dari dashboard admin.</span>
            </div>
          </div>

          <div className="home-suite-mini-grid compact">
            <div className="home-suite-mini-card">
              <strong>Auth</strong>
              <span>Google OAuth + whitelist `ADMIN_EMAILS`.</span>
            </div>
            <div className="home-suite-mini-card">
              <strong>Next step</strong>
              <span>Setelah login, langsung masuk ke alur admin.</span>
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
