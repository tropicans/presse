'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import HimpunLogo from '@/components/HimpunLogo'

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
    : 'Masuk ke admin dengan Google'
  const subtitle = isAccessDenied
    ? 'Gunakan akun Google yang terdaftar sebagai admin.'
    : 'Anda akan diarahkan ke login Google.'
  const buttonLabel = isRedirectingToGoogle ? 'Mengarahkan ke Google...' : 'Masuk dengan akun Google lain'

  return (
    <main className="admin-login-layout">
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="admin-login-brand">
              <HimpunLogo size={28} />
              <span className="admin-login-brand-name">HIMPUN</span>
            </div>
            <span className="admin-login-badge">PORTAL ADMIN</span>
          </div>

          <div className="admin-login-body">
            <div className="admin-login-title-group">
              <h1 className="admin-login-title">{title}</h1>
              <p className="admin-login-subtitle">{subtitle}</p>
            </div>

            {isAccessDenied && (
              <div className="admin-login-alert" role="alert">
                <div className="admin-login-alert-icon" aria-hidden="true">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="12" />
                    <line x1="12" y1="16" x2="12.01" y2="16" />
                  </svg>
                </div>
                <div className="admin-login-alert-content">
                  <strong>Akses Tidak Diberikan</strong>
                  <p>
                    Email Google Anda belum tercantum dalam daftar admin (<code>ADMIN_EMAILS</code>). Pastikan Anda masuk dengan email yang tepat atau hubungi pengelola sistem.
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleSignIn}
              className="admin-login-google-btn"
              disabled={loading}
              aria-busy={loading}
            >
              {loading ? (
                <span className="admin-login-spinner" aria-hidden="true" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.76h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
              )}
              <span>{buttonLabel}</span>
            </button>

            <div className="admin-login-trust-chips" aria-label="Spesifikasi keamanan autentikasi">
              <span className="admin-login-chip">Google OAuth 2.0</span>
              <span className="admin-login-chip">Restriksi Allowlist</span>
              <span className="admin-login-chip">Sesi Terenkripsi</span>
            </div>

            <div className="admin-login-note-box">
              <p className="admin-login-note">
                {isAccessDenied
                  ? 'Jika Anda yakin akun ini berhak mengakses, perbarui konfigurasi ADMIN_EMAILS lalu muat ulang halaman ini.'
                  : 'Sistem menggunakan autentikasi tunggal via Google Workspace. Akses terbatas khusus personel terotorisasi.'}
              </p>
            </div>
          </div>

          <div className="admin-login-footer">
            <Link href="/" className="admin-login-backlink">
              ← Kembali ke Beranda
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
