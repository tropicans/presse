'use client'

import Image from 'next/image'
import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useCallback, useEffect, useState } from 'react'

interface Attendance {
  id: number
  namaLengkap: string
  nipNrp: string
  jabatan: string
  unitKerja: string
  sebagai: string
  signature: string
  createdAt: string
}

interface ApiResponse {
  data: Attendance[]
  total: number
  page: number
  totalPages: number
}

const numberFormatter = new Intl.NumberFormat('id-ID')

export default function AdminTable() {
  const [data, setData] = useState<Attendance[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      })

      const res = await fetch(`/api/attendance?${params}`)

      if (!res.ok) {
        setError('Gagal memuat data kehadiran. Silakan coba lagi.')
        return
      }

      const json: ApiResponse = await res.json()
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
      setTotalPages(json.totalPages ?? 1)
    } catch (err) {
      console.error('Error fetching attendance:', err)
      setError('Gagal memuat data kehadiran. Periksa koneksi atau refresh halaman.')
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    void fetchData()
  }, [fetchData])

  useEffect(() => {
    const interval = setInterval(() => {
      void fetchData()
    }, 15000)

    return () => clearInterval(interval)
  }, [fetchData])

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(event.target.value)
    setPage(1)
  }

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus data "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) {
      return
    }

    setDeletingId(id)

    try {
      const res = await fetch(`/api/attendance?id=${id}`, { method: 'DELETE' })

      if (!res.ok) {
        const json = await res.json()
        setFeedback({ type: 'error', message: json.error || 'Gagal menghapus data' })
        return
      }

      setFeedback({ type: 'success', message: `Data ${nama} berhasil dihapus` })
      await fetchData()
    } catch {
      setFeedback({ type: 'error', message: 'Gagal menghapus data' })
    } finally {
      setDeletingId(null)
    }
  }

  const coachCount = data.filter((item) => item.sebagai.toLowerCase() === 'coach').length
  const mentorCount = data.filter((item) => item.sebagai.toLowerCase() === 'mentor').length
  const pengujiCount = data.filter((item) => item.sebagai.toLowerCase() === 'penguji').length
  const uniqueUnitKerja = new Set(data.map((item) => item.unitKerja.trim()).filter(Boolean)).size
  const latestAttendance = data[0] ?? null

  return (
    <div className="forms-dashboard-shell attendance-dashboard-shell">
      <header className="forms-dashboard-topbar">
        <div className="forms-dashboard-brand">
          <div className="forms-dashboard-brand-mark" aria-hidden="true" />
          <div>
            <strong>Editorial Data Intelligence</strong>
            <span>Pusat kendali kehadiran</span>
          </div>
        </div>

        <nav className="forms-dashboard-topnav" aria-label="Navigasi admin">
          <Link href="/admin" className="active">Kehadiran</Link>
          <Link href="/admin/forms">Formulir</Link>
        </nav>

        <div className="forms-dashboard-topbar-actions">
          <Link href="/admin/forms" className="forms-dashboard-topbar-link">
            Editor Form
          </Link>
          <button
            type="button"
            className="forms-dashboard-topbar-icon"
            onClick={() => signOut({ callbackUrl: '/admin/login' })}
            aria-label="Logout"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <path d="M16 17l5-5-5-5" />
              <path d="M21 12H9" />
            </svg>
          </button>
        </div>
      </header>

      <div className="forms-dashboard-layout">
        <aside className="forms-dashboard-sidebar" aria-label="Sidebar attendance">
          <div className="forms-dashboard-sidebar-head">
            <h2>Arsip Kehadiran</h2>
            <p>Seminar Evaluasi CPNS</p>
          </div>

          <nav className="forms-dashboard-sidebar-nav">
            <Link href="/admin" className="active">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 5h16" />
                <path d="M4 12h16" />
                <path d="M4 19h16" />
              </svg>
              <span>Kehadiran</span>
            </Link>
            <a href="#attendance-dashboard-table">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                <path d="M14 3v6h6" />
              </svg>
              <span>Tabel Peserta</span>
            </a>
            <Link href="/admin/forms">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="7" height="7" rx="1.5" />
                <rect x="14" y="3" width="7" height="7" rx="1.5" />
                <rect x="3" y="14" width="7" height="7" rx="1.5" />
                <rect x="14" y="14" width="7" height="7" rx="1.5" />
              </svg>
              <span>Editor Form</span>
            </Link>
          </nav>

          <a href="/api/attendance/export" className="forms-dashboard-sidebar-cta">
            <span>↓</span>
            <span>Unduh Excel</span>
          </a>

          <div className="forms-dashboard-sidebar-foot">
            <Link href="/">Kembali ke beranda</Link>
          </div>
        </aside>

        <main className="forms-dashboard-main">
          <nav className="admin-breadcrumbs" aria-label="Breadcrumb">
            <Link href="/admin" className="admin-breadcrumb-link">Admin</Link>
            <span className="admin-breadcrumb-separator">/</span>
            <span className="admin-breadcrumb-current">Kehadiran</span>
          </nav>

          <section className="forms-dashboard-hero">
            <div className="forms-dashboard-hero-copy">
              <p className="forms-dashboard-overline">Dashboard Kehadiran</p>
              <h1>Daftar Hadir</h1>
              <p>
                Pantau peserta yang sudah mengisi presensi, cek komposisi peran aktif, dan hapus entri yang tidak valid dari satu tampilan yang rapi.
              </p>
            </div>

            <div className="forms-dashboard-hero-actions">
              <button
                type="button"
                className="forms-dashboard-secondary-button"
                onClick={() => {
                  setFeedback(null)
                  void fetchData()
                }}
                disabled={loading}
              >
                {loading ? 'Memuat...' : 'Muat Ulang Data'}
              </button>
              <Link href="/admin/forms" className="forms-dashboard-primary-button">
                <span>+</span>
                <span>Buka Formulir</span>
              </Link>
            </div>
          </section>

          {(feedback || error) && (
            <div className={`admin-builder-alert ${error ? 'error' : feedback?.type === 'error' ? 'error' : 'success'}`}>
              {error || feedback?.message}
            </div>
          )}

          <section className="forms-dashboard-stats" aria-label="Ringkasan kehadiran">
            <article className="forms-dashboard-stat-card">
              <div className="forms-dashboard-stat-head">
                <span>Total Tercatat</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
                  <path d="M14 3v6h6" />
                </svg>
              </div>
              <strong>{numberFormatter.format(total)}</strong>
              <small>Total hasil pencarian attendance yang saat ini aktif.</small>
            </article>

            <article className="forms-dashboard-stat-card">
              <div className="forms-dashboard-stat-head">
                <span>Halaman Aktif</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 3v18" />
                  <path d="M3 12h18" />
                </svg>
              </div>
              <strong>{numberFormatter.format(data.length)}</strong>
              <small>
                Halaman {page} dari {Math.max(totalPages, 1)} dengan maksimal 20 baris per halaman.
              </small>
            </article>

            <article className="forms-dashboard-stat-card">
              <div className="forms-dashboard-stat-head">
                <span>Peran Aktif</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
                  <path d="M6 20a6 6 0 0 1 12 0" />
                </svg>
              </div>
              <strong>{numberFormatter.format(coachCount + mentorCount + pengujiCount)}</strong>
              <small>{coachCount} coach, {mentorCount} mentor, {pengujiCount} penguji pada halaman ini.</small>
            </article>

            <article className="forms-dashboard-stat-card">
              <div className="forms-dashboard-stat-head">
                <span>Unit Kerja</span>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 21h18" />
                  <path d="M5 21V7l7-4 7 4v14" />
                  <path d="M9 9h.01" />
                  <path d="M9 13h.01" />
                  <path d="M15 9h.01" />
                  <path d="M15 13h.01" />
                </svg>
              </div>
              <strong>{numberFormatter.format(uniqueUnitKerja)}</strong>
              <small>Jumlah unit kerja unik pada daftar kehadiran di halaman aktif.</small>
            </article>
          </section>

          <section className="forms-dashboard-panel forms-dashboard-table-panel" id="attendance-dashboard-table">
            <div className="forms-dashboard-panel-header">
              <div>
                <p className="forms-dashboard-overline">Tabel Kehadiran</p>
                <h2>Peserta Tercatat</h2>
                <p>Gunakan pencarian untuk mempersempit nama, NIP/NRP, jabatan, atau unit kerja peserta.</p>
              </div>

              <div className="forms-dashboard-panel-controls">
                <label className="forms-dashboard-search" aria-label="Cari peserta">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Cari nama, NIP, jabatan, atau unit kerja..."
                    value={search}
                    onChange={handleSearch}
                  />
                </label>
              </div>
            </div>

            <div className="forms-dashboard-table-wrap">
              {loading && data.length === 0 ? (
                <div className="forms-dashboard-empty-state">
                  <h3>Memuat data</h3>
                  <p>Dashboard sedang mengambil daftar peserta terbaru.</p>
                </div>
              ) : data.length === 0 ? (
                <div className="forms-dashboard-empty-state">
                  <h3>Belum ada data</h3>
                  <p>Belum ada peserta yang mengisi daftar hadir untuk filter saat ini.</p>
                </div>
              ) : (
                <table className="forms-dashboard-table attendance-dashboard-table">
                  <thead>
                    <tr>
                      <th scope="col">No</th>
                      <th scope="col">Identitas Peserta</th>
                      <th scope="col">Unit Kerja</th>
                      <th scope="col">Peran</th>
                      <th scope="col">Tanda Tangan</th>
                      <th scope="col">Waktu</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.map((item, index) => (
                      <tr key={item.id}>
                        <td data-label="No" className="attendance-dashboard-order">
                          {numberFormatter.format((page - 1) * 20 + index + 1)}
                        </td>
                        <td data-label="Identitas Peserta">
                          <div className="attendance-dashboard-identity">
                            <strong>{item.namaLengkap}</strong>
                            <span>{item.nipNrp}</span>
                            <p>{item.jabatan}</p>
                          </div>
                        </td>
                        <td data-label="Unit Kerja">{item.unitKerja}</td>
                        <td data-label="Peran">
                          <span className={`attendance-dashboard-role-chip ${item.sebagai.toLowerCase()}`}>
                            {item.sebagai}
                          </span>
                        </td>
                        <td data-label="Tanda Tangan">
                          {item.signature ? (
                            <Image
                              src={item.signature}
                              alt={`Tanda tangan ${item.namaLengkap}`}
                              width={92}
                              height={46}
                              unoptimized
                              className="signature-thumb attendance-dashboard-signature"
                            />
                          ) : (
                            '-'
                          )}
                        </td>
                        <td data-label="Waktu">
                          {new Date(item.createdAt).toLocaleString('id-ID', {
                            timeZone: 'Asia/Jakarta',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td data-label="Aksi">
                          <div className="forms-dashboard-row-actions">
                            <button
                              type="button"
                              onClick={() => handleDelete(item.id, item.namaLengkap)}
                              className="forms-dashboard-action-link danger"
                              title="Hapus data ini"
                              aria-label={`Hapus data ${item.namaLengkap}`}
                              disabled={deletingId === item.id}
                            >
                              {deletingId === item.id ? 'Menghapus...' : 'Hapus'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {data.length > 0 && (
              <div className="attendance-dashboard-pagination">
                <span className="attendance-dashboard-pagination-info">
                  Menampilkan {numberFormatter.format((page - 1) * 20 + 1)}-
                  {numberFormatter.format(Math.min(page * 20, total))} dari {numberFormatter.format(total)} data
                </span>
                <div className="attendance-dashboard-pagination-buttons">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page <= 1}
                    className="forms-dashboard-action-link"
                  >
                    ← Sebelumnya
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page >= totalPages}
                    className="forms-dashboard-action-link"
                  >
                    Selanjutnya →
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="forms-dashboard-insights attendance-dashboard-insights">
            <article className="forms-dashboard-panel submissions-dashboard-breakdown-panel">
              <div className="forms-dashboard-panel-header compact">
                <div>
                  <p className="forms-dashboard-overline">Ringkasan Peran</p>
                  <h2>Komposisi Peran</h2>
                  <p>Distribusi role pada halaman aktif membantu membaca pola kehadiran lebih cepat.</p>
                </div>
              </div>

              <div className="submissions-dashboard-breakdown-list">
                <div className="submissions-dashboard-breakdown-item">
                  <div>
                    <strong>Coach</strong>
                    <span>{numberFormatter.format(coachCount)} peserta</span>
                  </div>
                  <div className="submissions-dashboard-breakdown-meter" aria-hidden="true">
                    <span style={{ width: `${data.length > 0 ? Math.max(10, Math.round((coachCount / data.length) * 100)) : 0}%` }} />
                  </div>
                </div>
                <div className="submissions-dashboard-breakdown-item">
                  <div>
                    <strong>Mentor</strong>
                    <span>{numberFormatter.format(mentorCount)} peserta</span>
                  </div>
                  <div className="submissions-dashboard-breakdown-meter muted" aria-hidden="true">
                    <span style={{ width: `${data.length > 0 ? Math.max(10, Math.round((mentorCount / data.length) * 100)) : 0}%` }} />
                  </div>
                </div>
                <div className="submissions-dashboard-breakdown-item">
                  <div>
                    <strong>Penguji</strong>
                    <span>{numberFormatter.format(pengujiCount)} peserta</span>
                  </div>
                  <div className="submissions-dashboard-breakdown-meter accent" aria-hidden="true">
                    <span style={{ width: `${data.length > 0 ? Math.max(10, Math.round((pengujiCount / data.length) * 100)) : 0}%` }} />
                  </div>
                </div>
              </div>
            </article>

            <article className="forms-dashboard-highlight-card">
              <div className="forms-dashboard-highlight-copy">
                <p className="forms-dashboard-overline dark">Insight Terkini</p>
                <strong>{latestAttendance ? numberFormatter.format(total) : '0'}</strong>
                <h3>{latestAttendance?.namaLengkap ?? 'Belum ada peserta'}</h3>
                <p>
                  {latestAttendance
                    ? `Peserta terbaru tercatat pada ${new Date(latestAttendance.createdAt).toLocaleString('id-ID')} dari unit ${latestAttendance.unitKerja}.`
                    : 'Data kehadiran terbaru akan tampil di panel ini.'}
                </p>
              </div>

              <dl className="forms-dashboard-highlight-list">
                <div>
                  <dt>Total</dt>
                  <dd>{numberFormatter.format(total)}</dd>
                </div>
                <div>
                  <dt>Halaman</dt>
                  <dd>{page}/{Math.max(totalPages, 1)}</dd>
                </div>
                <div>
                  <dt>Unit</dt>
                  <dd>{numberFormatter.format(uniqueUnitKerja)}</dd>
                </div>
                <div>
                  <dt>Pencarian</dt>
                  <dd>{search.trim() || 'Semua data'}</dd>
                </div>
              </dl>
            </article>
          </section>
        </main>
      </div>
    </div>
  )
}
