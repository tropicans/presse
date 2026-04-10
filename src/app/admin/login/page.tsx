'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'

export default function AdminLoginPage() {
  const router = useRouter()
  const { status } = useSession()
  const attemptedAutoSignInRef = useRef(false)
  const [loading, setLoading] = useState(false)

  const authQuery = useMemo(() => {
    if (typeof window === 'undefined') {
      return {
        callbackUrl: '/admin/forms',
        error: '',
      }
    }

    const params = new URLSearchParams(window.location.search)

    return {
      callbackUrl: params.get('callbackUrl') || '/admin/forms',
      error: params.get('error') || '',
    }
  }, [])

  useEffect(() => {
    if (status === 'authenticated') {
      router.replace('/admin/forms')
    }
  }, [router, status])

  useEffect(() => {
    if (status !== 'unauthenticated' || authQuery.error || attemptedAutoSignInRef.current) {
      return
    }

    attemptedAutoSignInRef.current = true
    void signIn('google', { callbackUrl: authQuery.callbackUrl })
  }, [authQuery.callbackUrl, authQuery.error, status])

  const handleSignIn = async () => {
    setLoading(true)

    try {
      await signIn('google', { callbackUrl: authQuery.callbackUrl })
    } catch {
      setLoading(false)
    }
  }

  const isAccessDenied = authQuery.error === 'AccessDenied'
  const isRedirectingToGoogle = loading || (status === 'unauthenticated' && !authQuery.error)
  const title = isAccessDenied
    ? 'Akses admin ditolak untuk akun ini'
    : 'Menghubungkan Anda ke login Google admin'
  const subtitle = isAccessDenied
    ? 'Gunakan akun Google yang sudah didaftarkan sebagai admin, lalu coba lagi.'
    : 'Anda tidak perlu melewati dua layar lagi. Halaman ini langsung mengarahkan Anda ke login Google.'
  const buttonLabel = isRedirectingToGoogle ? 'Mengarahkan ke Google...' : 'Masuk dengan akun Google lain'

  return (
    <main className="page-wrapper entry-suite-page login-suite-page">
      <section className="entry-suite-card login-suite-card login-suite-shell login-suite-shell-minimal">
        <div className="login-suite-panel login-suite-panel-minimal">
          <Link href="/" className="login-suite-backlink">
            Kembali ke akses admin
          </Link>

          <div className="login-icon entry-suite-icon login-suite-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>

          <div className="login-suite-panel-copy">
            <p className="home-suite-panel-label">Masuk</p>
            <h1 className="login-title entry-suite-title login-suite-title login-suite-title-minimal">{title}</h1>
            <p className="login-subtitle entry-suite-subtitle login-suite-subtitle login-suite-subtitle-minimal">
              {subtitle}
            </p>
            <h2 className="login-suite-panel-title">
              {isAccessDenied
                ? 'Akun ini belum masuk daftar admin'
                : 'Anda akan langsung dibawa ke halaman login Google'}
            </h2>
          </div>

          <button
            onClick={handleSignIn}
            className="google-signin-btn google-signin-btn-prominent login-suite-signin-btn"
            disabled={loading}
            aria-busy={loading}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {buttonLabel}
          </button>

          <div className="entry-suite-points login-suite-points login-suite-points-minimal" aria-label="Akses area admin">
            <span>Redirect otomatis</span>
            <span>Google sign-in</span>
            <span>Admin terproteksi</span>
          </div>

          <p className="login-suite-note">
            {isAccessDenied
              ? 'Jika Anda merasa akun ini seharusnya bisa masuk, tambahkan email tersebut ke daftar admin lalu coba lagi.'
              : 'Jika browser tidak otomatis berpindah ke Google, gunakan tombol di atas.'}
          </p>
        </div>
      </section>
    </main>
  )
}
