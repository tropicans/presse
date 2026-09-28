'use client'

import Link from 'next/link'
import { useState } from 'react'
import { signIn } from 'next-auth/react'
import HimpunLogo from '@/components/HimpunLogo'

interface InviteInfo {
  valid: boolean
  email?: string
  role?: string
  expiresAt?: string
  isExpired?: boolean
  status?: string
  invitedBy?: {
    email: string
    name: string | null
  } | null
  error?: string
}

export default function AdminInviteClaim({
  inviteInfo,
}: {
  inviteInfo: InviteInfo
}) {
  const [loading, setLoading] = useState(false)

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signIn('google', { callbackUrl: '/admin/forms' })
    } catch {
      setLoading(false)
    }
  }

  const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'short',
  })

  return (
    <main className="admin-login-layout">
      <div className="admin-login-container">
        <div className="admin-login-card">
          {/* Header */}
          <div className="admin-login-header">
            <div className="admin-login-brand">
              <HimpunLogo size={28} />
              <span className="admin-login-brand-name">Form</span>
            </div>
            <span className="admin-login-badge">UNDANGAN ADMIN</span>
          </div>

          <div className="admin-login-body">
            {!inviteInfo.valid || inviteInfo.isExpired ? (
              <>
                <div className="admin-login-title-group">
                  <h1 className="admin-login-title">Tautan Tidak Berlaku</h1>
                  <p className="admin-login-subtitle">
                    {inviteInfo.error || 'Tautan undangan tidak ditemukan, telah kadaluwarsa, atau sudah pernah digunakan.'}
                  </p>
                </div>

                <div className="admin-login-alert" role="alert" style={{ marginTop: 'var(--space-4)' }}>
                  <div className="admin-login-alert-icon" aria-hidden="true">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  </div>
                  <div className="admin-login-alert-content">
                    <strong>Masa Berlaku Habis (48 Jam)</strong>
                    <p>
                      Setiap tautan undangan hanya berlaku selama 48 jam demi keamanan. Silakan hubungi Superadmin Anda untuk meminta tautan baru.
                    </p>
                  </div>
                </div>

                <div style={{ marginTop: 'var(--space-6)' }}>
                  <Link
                    href="/admin/login"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      height: '42px',
                      borderRadius: 'var(--radius-sm)',
                      background: 'var(--text-primary)',
                      color: 'var(--bg-surface)',
                      fontWeight: 600,
                      textDecoration: 'none',
                      fontSize: '0.875rem',
                    }}
                  >
                    Kembali ke Halaman Login
                  </Link>
                </div>
              </>
            ) : (
              <>
                <div className="admin-login-title-group">
                  <h1 className="admin-login-title">Undangan Tim Pengelola</h1>
                  <p className="admin-login-subtitle">
                    Anda telah diundang untuk menjadi administrator formulir pada platform Form.
                  </p>
                </div>

                {/* Details Box */}
                <div
                  style={{
                    margin: 'var(--space-4) 0',
                    padding: 'var(--space-4)',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-canvas)',
                  }}
                >
                  <div style={{ marginBottom: 'var(--space-3)' }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      Alamat Email Terdaftar
                    </span>
                    <p style={{ margin: '2px 0 0', fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                      {inviteInfo.email}
                    </p>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Peran</span>
                      <p style={{ margin: '2px 0 0', fontFamily: 'var(--font-family-mono)', fontSize: '0.8125rem', fontWeight: 600 }}>
                        {inviteInfo.role}
                      </p>
                    </div>

                    <div>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Batas Waktu</span>
                      <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {inviteInfo.expiresAt ? dateTimeFormatter.format(new Date(inviteInfo.expiresAt)) : '48 Jam'}
                      </p>
                    </div>
                  </div>

                  {inviteInfo.invitedBy && (
                    <div style={{ borderTop: '1px solid var(--border-default)', paddingTop: 'var(--space-2)' }}>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                        Diundang oleh: <strong>{inviteInfo.invitedBy.name || inviteInfo.invitedBy.email}</strong>
                      </span>
                    </div>
                  )}
                </div>

                {/* Claim CTA */}
                <button
                  type="button"
                  className="admin-login-button"
                  onClick={handleSignIn}
                  disabled={loading}
                >
                  <span className="admin-login-google-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="20" height="20">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                    </svg>
                  </span>
                  <span>{loading ? 'Menghubungkan ke Google...' : 'Terima Undangan & Masuk dengan Google'}</span>
                </button>

                <p style={{ margin: 'var(--space-3) 0 0', textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Penting: Pastikan Anda memilih akun Google dengan email <strong>{inviteInfo.email}</strong> saat login.
                </p>
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
