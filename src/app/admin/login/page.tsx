'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useState } from 'react'

export default function AdminLoginPage() {
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)

    try {
      const callbackUrl = typeof window !== 'undefined'
        ? new URLSearchParams(window.location.search).get('callbackUrl') || '/admin/forms'
        : '/admin/forms'

      await signIn('google', { callbackUrl })
    } catch {
      setLoading(false)
    }
  }

  return (
    <div className="page-wrapper entry-suite-page">
      <header className="public-ledger-topbar public-ledger-topbar-static">
        <Link href="/" className="public-ledger-brand">
          <div className="public-ledger-brand-mark" aria-hidden="true" />
          <div>
            <strong>Editorial Data Intelligence</strong>
            <span>Masuk ke area admin</span>
          </div>
        </Link>
      </header>

      <section className="success-card entry-suite-card login-suite-card">
        <div className="login-icon entry-suite-icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>

        <p className="public-ledger-eyebrow entry-suite-eyebrow">Akses Terbatas</p>
        <h1 className="login-title entry-suite-title">Masuk ke Dashboard Admin</h1>
        <p className="login-subtitle entry-suite-subtitle">
          Gunakan akun Google yang sudah diizinkan untuk membuka formulir, melihat kiriman,
          dan mengelola data kehadiran.
        </p>

        <div className="entry-suite-points" aria-label="Fitur area admin">
          <span>Kelola formulir publik</span>
          <span>Tinjau kiriman</span>
          <span>Unduh data kehadiran</span>
        </div>

        <button
          onClick={handleSignIn}
          className="google-signin-btn entry-suite-primary-btn"
          disabled={loading}
          aria-busy={loading}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          {loading ? 'Memproses...' : 'Masuk dengan Google'}
        </button>

        <div className="entry-suite-actions">
          <Link href="/admin/forms" className="success-secondary-link entry-suite-secondary-link">
            Lihat Formulir
          </Link>
          <Link href="/" className="success-secondary-link entry-suite-secondary-link secondary">
            Kembali ke beranda
          </Link>
        </div>
      </section>
    </div>
  )
}
