'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { signOut } from 'next-auth/react'
import HimpunLogo from '@/components/HimpunLogo'

interface SuperadminItem {
  id: string
  email: string
  role: 'SUPERADMIN'
  isRoot: boolean
  isActive: boolean
}

interface AdminUserItem {
  id: string
  email: string
  name: string | null
  role: 'SUPERADMIN' | 'ADMIN'
  isActive: boolean
  createdAt: string
}

interface AdminInvitationItem {
  id: string
  email: string
  role: 'SUPERADMIN' | 'ADMIN'
  token: string
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | 'EXPIRED'
  expiresAt: string
  createdAt: string
  isExpired?: boolean
  invitedBy?: {
    email: string
    name: string | null
  } | null
}

interface TeamData {
  superadmins: SuperadminItem[]
  users: AdminUserItem[]
  invitations: AdminInvitationItem[]
  baseUrl?: string
}

const dateTimeFormatter = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export default function AdminUsersManagement({ currentUserEmail }: { currentUserEmail: string }) {
  const [data, setData] = useState<TeamData | null>(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // Form State
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'SUPERADMIN'>('ADMIN')
  const [inviting, setInviting] = useState(false)
  const [latestInviteUrl, setLatestInviteUrl] = useState<string | null>(null)
  const [copiedToken, setCopiedToken] = useState<string | null>(null)

  // Revoke Modal State
  const [pendingRevoke, setPendingRevoke] = useState<{
    type: 'invitation' | 'user'
    id: string
    name: string
  } | null>(null)
  const [revoking, setRevoking] = useState(false)

  const loadTeamData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/users')
      const json = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'Gagal memuat daftar tim' })
        return
      }
      setData(json.data)
    } catch {
      setFeedback({ type: 'error', message: 'Gagal terhubung ke server' })
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadTeamData()
  }, [loadTeamData])

  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return

    setInviting(true)
    setFeedback(null)
    setLatestInviteUrl(null)

    try {
      const res = await fetch('/api/admin/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
      })

      const json = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'Gagal membuat undangan' })
        return
      }

      const effectiveBaseUrl = data?.baseUrl || 'https://form.ppkasn.id'
      const cleanUrl = json.inviteUrl?.includes('0.0.0.0')
        ? json.inviteUrl.replace(/https?:\/\/0\.0\.0\.0:\d+/, effectiveBaseUrl)
        : json.inviteUrl

      setLatestInviteUrl(cleanUrl)
      setInviteEmail('')
      setFeedback({ type: 'success', message: 'Tautan undangan 48 jam berhasil dibuat!' })
      await loadTeamData()
    } catch {
      setFeedback({ type: 'error', message: 'Terjadi kesalahan sistem' })
    } finally {
      setInviting(false)
    }
  }

  const handleCopyLink = async (url: string, keyId: string) => {
    try {
      await navigator.clipboard.writeText(url)
      setCopiedToken(keyId)
      setTimeout(() => setCopiedToken(null), 2500)
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menyalin tautan ke clipboard' })
    }
  }

  const executeRevoke = async () => {
    if (!pendingRevoke) return
    setRevoking(true)
    try {
      const res = await fetch('/api/admin/users/revoke', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: pendingRevoke.type, id: pendingRevoke.id }),
      })
      const json = await res.json()
      if (!res.ok) {
        setFeedback({ type: 'error', message: json.error || 'Gagal mencabut akses' })
        return
      }
      setFeedback({ type: 'success', message: json.message || 'Berhasil diproses' })
      setPendingRevoke(null)
      await loadTeamData()
    } catch {
      setFeedback({ type: 'error', message: 'Gagal memproses pencabutan' })
    } finally {
      setRevoking(false)
    }
  }

  // Combined Active Admins
  const allActiveAdmins = [
    ...(data?.superadmins ?? []).map((sa) => ({
      id: sa.id,
      email: sa.email,
      name: 'Super Admin (Env)',
      role: sa.role,
      isRoot: true,
      isActive: true,
      createdAt: null,
    })),
    ...(data?.users ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      isRoot: false,
      isActive: u.isActive,
      createdAt: u.createdAt,
    })),
  ]

  const pendingInvitations = data?.invitations ?? []

  return (
    <div className="forms-dashboard-shell">
      {/* Topbar */}
      <header className="forms-dashboard-topbar">
        <div className="forms-dashboard-brand">
          <HimpunLogo size="sm" />
          <div>
            <strong>Form</strong>
            <span>Manajemen Akses & Tim</span>
          </div>
        </div>

        <div className="forms-dashboard-topbar-actions">
          <button
            type="button"
            className="forms-dashboard-topbar-icon"
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            aria-label="Logout"
            title="Keluar dari akun admin"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Layout */}
      <div className="forms-dashboard-layout">
        {/* Sidebar */}
        <aside className="forms-dashboard-sidebar" aria-label="Sidebar tim">
          <div className="forms-dashboard-sidebar-head">
            <h2>Pengaturan</h2>
            <p>Akses & Pengguna</p>
          </div>

          <nav className="forms-dashboard-sidebar-nav">
            <Link href="/admin/forms">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>Formulir</span>
            </Link>

            <Link href="/admin">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16" />
                <path d="M4 12h16" />
                <path d="M4 19h16" />
              </svg>
              <span>Kehadiran</span>
            </Link>

            <Link href="/admin/users" className="active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>Pengguna / Tim</span>
            </Link>
          </nav>

          <div className="forms-dashboard-sidebar-foot">
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              Login sebagai: <strong>{currentUserEmail}</strong>
            </span>
          </div>
        </aside>

        {/* Content Area */}
        <main className="forms-dashboard-main">
          {/* Header Title */}
          <div className="forms-dashboard-head" style={{ marginBottom: 'var(--space-6)' }}>
            <div>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Hak Akses & Otorisasi
              </p>
              <h1 style={{ margin: 'var(--space-1) 0 0', fontFamily: 'var(--font-family-display)', fontSize: 'var(--font-size-display-lg)', fontWeight: 700 }}>
                Pengguna & Tim Pengelola
              </h1>
              <p style={{ margin: 'var(--space-1) 0 0', color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                Undang anggota tim baru menggunakan tautan Google OAuth dan kelola status hak akses secara fleksibel.
              </p>
            </div>
          </div>

          {/* Feedback Alert */}
          {feedback && (
            <div
              style={{
                padding: 'var(--space-3) var(--space-4)',
                marginBottom: 'var(--space-6)',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.875rem',
                border: feedback.type === 'error' ? '1px solid #ef4444' : '1px solid #22c55e',
                background: feedback.type === 'error' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(34, 197, 94, 0.1)',
                color: feedback.type === 'error' ? '#ef4444' : '#22c55e',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span>{feedback.message}</span>
              <button
                type="button"
                onClick={() => setFeedback(null)}
                style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: '1rem' }}
              >
                ×
              </button>
            </div>
          )}

          {/* Summary Metric Cards */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 'var(--space-4)',
              marginBottom: 'var(--space-6)',
            }}
          >
            <div
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Total Pengguna Aktif</span>
              <p style={{ margin: 'var(--space-1) 0 0', fontFamily: 'var(--font-family-mono)', fontSize: '1.75rem', fontWeight: 700 }}>
                {loading ? '...' : allActiveAdmins.filter((a) => a.isActive).length}
              </p>
            </div>

            <div
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Undangan Tertunda (Pending)</span>
              <p style={{ margin: 'var(--space-1) 0 0', fontFamily: 'var(--font-family-mono)', fontSize: '1.75rem', fontWeight: 700 }}>
                {loading ? '...' : pendingInvitations.length}
              </p>
            </div>

            <div
              style={{
                padding: 'var(--space-4)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
              }}
            >
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Superadmin Utama</span>
              <p style={{ margin: 'var(--space-1) 0 0', fontFamily: 'var(--font-family-mono)', fontSize: '1.75rem', fontWeight: 700 }}>
                {loading ? '...' : (data?.superadmins ?? []).length}
              </p>
            </div>
          </div>

          {/* Card: Undang Pengguna Baru */}
          <section
            style={{
              padding: 'var(--space-5)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              marginBottom: 'var(--space-8)',
            }}
          >
            <h2 style={{ margin: '0 0 var(--space-2)', fontSize: '1.125rem', fontWeight: 600 }}>
              Undang Pengguna Baru
            </h2>
            <p style={{ margin: '0 0 var(--space-4)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              Masukkan alamat email Google calon pengguna. Sistem akan membuat tautan undangan ber-token yang berlaku selama 48 jam.
            </p>

            <form onSubmit={handleCreateInvite} style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-3)', alignItems: 'center' }}>
              <input
                type="email"
                required
                placeholder="nama@email.com (Akun Google)"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                style={{
                  flex: '1 1 280px',
                  height: '38px',
                  padding: '0 var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              />

              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'ADMIN' | 'SUPERADMIN')}
                style={{
                  height: '38px',
                  padding: '0 var(--space-3)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-canvas)',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                }}
              >
                <option value="ADMIN">ADMIN (Kelola Form & Data)</option>
                <option value="SUPERADMIN">SUPERADMIN (Hak Penuh & Tim)</option>
              </select>

              <button
                type="submit"
                disabled={inviting || !inviteEmail.trim()}
                style={{
                  height: '38px',
                  padding: '0 var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--text-primary)',
                  color: 'var(--bg-surface)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  border: 'none',
                  cursor: inviting ? 'not-allowed' : 'pointer',
                  opacity: inviting ? 0.7 : 1,
                }}
              >
                {inviting ? 'Membuat Tautan...' : 'Buat Tautan Undangan'}
              </button>
            </form>

            {/* Generated Invite Box */}
            {latestInviteUrl && (
              <div
                style={{
                  marginTop: 'var(--space-4)',
                  padding: 'var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-elevated)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                  <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                    Tautan Undangan Siap Dibagikan (Berlaku 48 Jam):
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontFamily: 'var(--font-family-mono)' }}>
                    Masa Berlaku: 48 Jam
                  </span>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                  <input
                    type="text"
                    readOnly
                    value={latestInviteUrl}
                    style={{
                      flex: 1,
                      height: '36px',
                      padding: '0 var(--space-3)',
                      fontFamily: 'var(--font-family-mono)',
                      fontSize: '0.8125rem',
                      borderRadius: 'var(--radius-sm)',
                      border: '1px solid var(--border-default)',
                      background: 'var(--bg-canvas)',
                      color: 'var(--text-primary)',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => handleCopyLink(latestInviteUrl, 'latest')}
                    style={{
                      height: '36px',
                      padding: '0 var(--space-4)',
                      borderRadius: 'var(--radius-sm)',
                      background: copiedToken === 'latest' ? '#22c55e' : 'var(--text-primary)',
                      color: copiedToken === 'latest' ? '#ffffff' : 'var(--bg-surface)',
                      border: 'none',
                      fontWeight: 600,
                      fontSize: '0.8125rem',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {copiedToken === 'latest' ? '✓ Tersalin!' : 'Salin Tautan'}
                  </button>
                </div>
                <p style={{ margin: 'var(--space-2) 0 0', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Kirim tautan ini via WhatsApp, Telegram, atau Email kepada calon admin. Pengguna akan mengonfirmasi dengan akun Google mereka.
                </p>
              </div>
            )}
          </section>

          {/* Section: Daftar Undangan Tertunda */}
          {pendingInvitations.length > 0 && (
            <section
              style={{
                padding: 'var(--space-5)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--bg-surface)',
                border: '1px solid var(--border-default)',
                marginBottom: 'var(--space-8)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Undangan Tertunda (Menunggu Klaim)</h2>
                  <p style={{ margin: 'var(--space-1) 0 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                    Tautan yang telah dibagikan dan belum diklaim oleh pengguna yang diundang.
                  </p>
                </div>
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: 'var(--radius-pill)',
                    fontSize: '0.75rem',
                    fontFamily: 'var(--font-family-mono)',
                    border: '1px solid var(--border-default)',
                    background: 'var(--bg-canvas)',
                  }}
                >
                  {pendingInvitations.length} Pending
                </span>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                      <th style={{ padding: 'var(--space-2) var(--space-3)' }}>Email Diundang</th>
                      <th style={{ padding: 'var(--space-2) var(--space-3)' }}>Peran</th>
                      <th style={{ padding: 'var(--space-2) var(--space-3)' }}>Dibuat</th>
                      <th style={{ padding: 'var(--space-2) var(--space-3)' }}>Batas Waktu</th>
                      <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pendingInvitations.map((inv) => {
                      const windowOrigin = typeof window !== 'undefined' ? window.location.origin : ''
                      const origin = data?.baseUrl || (!windowOrigin.includes('0.0.0.0') ? windowOrigin : 'https://form.ppkasn.id')
                      const url = `${origin}/admin/invite?token=${inv.token}`
                      return (
                        <tr key={inv.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                          <td style={{ padding: 'var(--space-3)', fontWeight: 500 }}>
                            {inv.email}
                          </td>
                          <td style={{ padding: 'var(--space-3)' }}>
                            <span
                              style={{
                                padding: '2px 8px',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '0.75rem',
                                fontFamily: 'var(--font-family-mono)',
                                border: '1px solid var(--border-default)',
                                background: 'var(--bg-canvas)',
                              }}
                            >
                              {inv.role}
                            </span>
                          </td>
                          <td style={{ padding: 'var(--space-3)', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                            {dateTimeFormatter.format(new Date(inv.createdAt))}
                          </td>
                          <td style={{ padding: 'var(--space-3)', fontSize: '0.8125rem' }}>
                            <span style={{ color: inv.isExpired ? '#ef4444' : 'var(--text-secondary)' }}>
                              {inv.isExpired ? 'Kadaluwarsa' : dateTimeFormatter.format(new Date(inv.expiresAt))}
                            </span>
                          </td>
                          <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                            <div style={{ display: 'inline-flex', gap: 'var(--space-2)' }}>
                              <button
                                type="button"
                                onClick={() => handleCopyLink(url, inv.id)}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid var(--border-default)',
                                  background: copiedToken === inv.id ? '#22c55e' : 'var(--bg-canvas)',
                                  color: copiedToken === inv.id ? '#ffffff' : 'var(--text-primary)',
                                  cursor: 'pointer',
                                }}
                              >
                                {copiedToken === inv.id ? '✓ Tersalin' : 'Salin Link'}
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingRevoke({ type: 'invitation', id: inv.id, name: inv.email })}
                                style={{
                                  padding: '4px 10px',
                                  fontSize: '0.75rem',
                                  borderRadius: 'var(--radius-sm)',
                                  border: '1px solid rgba(239, 68, 68, 0.4)',
                                  background: 'transparent',
                                  color: '#ef4444',
                                  cursor: 'pointer',
                                }}
                              >
                                Batalkan
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Section: Daftar Anggota Tim Aktif */}
          <section
            style={{
              padding: 'var(--space-5)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 600 }}>Daftar Anggota Tim</h2>
                <p style={{ margin: 'var(--space-1) 0 0', color: 'var(--text-secondary)', fontSize: '0.8125rem' }}>
                  Seluruh pengguna yang memiliki akses untuk masuk ke dashboard admin.
                </p>
              </div>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 'var(--radius-pill)',
                  fontSize: '0.75rem',
                  fontFamily: 'var(--font-family-mono)',
                  border: '1px solid var(--border-default)',
                  background: 'var(--bg-canvas)',
                }}
              >
                {allActiveAdmins.length} Pengguna
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-default)', textAlign: 'left', color: 'var(--text-muted)', fontSize: '0.75rem', textTransform: 'uppercase' }}>
                    <th style={{ padding: 'var(--space-2) var(--space-3)' }}>Pengguna</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)' }}>Hak Akses</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)' }}>Tipe Akun</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)' }}>Status</th>
                    <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right' }}>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {allActiveAdmins.map((user) => {
                    const isSelf = user.email.toLowerCase() === currentUserEmail.toLowerCase()
                    return (
                      <tr key={user.id} style={{ borderBottom: '1px solid var(--border-default)' }}>
                        <td style={{ padding: 'var(--space-3)' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{user.email}</div>
                          {user.name && (
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{user.name}</div>
                          )}
                        </td>
                        <td style={{ padding: 'var(--space-3)' }}>
                          <span
                            style={{
                              padding: '2px 8px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              fontFamily: 'var(--font-family-mono)',
                              border: user.role === 'SUPERADMIN' ? '1px solid var(--text-primary)' : '1px solid var(--border-default)',
                              background: user.role === 'SUPERADMIN' ? 'var(--text-primary)' : 'var(--bg-canvas)',
                              color: user.role === 'SUPERADMIN' ? 'var(--bg-surface)' : 'var(--text-primary)',
                              fontWeight: 600,
                            }}
                          >
                            {user.role}
                          </span>
                        </td>
                        <td style={{ padding: 'var(--space-3)', fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                          {user.isRoot ? 'Superadmin Utama (.env)' : 'Admin Undangan (DB)'}
                        </td>
                        <td style={{ padding: 'var(--space-3)' }}>
                          <span
                            style={{
                              padding: '2px 6px',
                              borderRadius: 'var(--radius-sm)',
                              fontSize: '0.75rem',
                              color: user.isActive ? '#22c55e' : '#ef4444',
                              background: user.isActive ? 'rgba(34, 197, 94, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                            }}
                          >
                            {user.isActive ? 'Aktif' : 'Nonaktif'}
                          </span>
                        </td>
                        <td style={{ padding: 'var(--space-3)', textAlign: 'right' }}>
                          {user.isRoot || isSelf ? (
                            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                              {isSelf ? '(Akun Anda)' : '(Terkunci)'}
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setPendingRevoke({ type: 'user', id: user.id, name: user.email })}
                              style={{
                                padding: '4px 10px',
                                fontSize: '0.75rem',
                                borderRadius: 'var(--radius-sm)',
                                border: '1px solid rgba(239, 68, 68, 0.4)',
                                background: 'transparent',
                                color: '#ef4444',
                                cursor: 'pointer',
                              }}
                            >
                              Cabut Akses
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        </main>
      </div>

      {/* Revocation Confirmation Dialog Modal */}
      {pendingRevoke && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--space-4)',
          }}
        >
          <div
            style={{
              maxWidth: '440px',
              width: '100%',
              borderRadius: 'var(--radius-md)',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-default)',
              padding: 'var(--space-6)',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
            }}
          >
            <h3 style={{ margin: '0 0 var(--space-2)', fontSize: '1.125rem', fontWeight: 700 }}>
              {pendingRevoke.type === 'invitation' ? 'Batalkan Undangan?' : 'Cabut Akses Pengguna?'}
            </h3>
            <p style={{ margin: '0 0 var(--space-6)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {pendingRevoke.type === 'invitation' ? (
                <>
                  Apakah Anda yakin ingin membatalkan tautan undangan untuk <strong>{pendingRevoke.name}</strong>? Tautan tersebut tidak akan dapat digunakan lagi.
                </>
              ) : (
                <>
                  Pengguna <strong>{pendingRevoke.name}</strong> tidak akan dapat lagi masuk ke panel admin formulir.
                </>
              )}
            </p>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
              <button
                type="button"
                onClick={() => setPendingRevoke(null)}
                disabled={revoking}
                style={{
                  height: '36px',
                  padding: '0 var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border-default)',
                  background: 'transparent',
                  color: 'var(--text-primary)',
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                }}
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeRevoke}
                disabled={revoking}
                style={{
                  height: '36px',
                  padding: '0 var(--space-4)',
                  borderRadius: 'var(--radius-sm)',
                  background: '#ef4444',
                  color: '#ffffff',
                  border: 'none',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  cursor: revoking ? 'not-allowed' : 'pointer',
                }}
              >
                {revoking ? 'Memproses...' : 'Ya, Cabut Akses'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
