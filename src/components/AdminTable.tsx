'use client'

import { useEffect, useState, useCallback } from 'react'
import { signOut } from 'next-auth/react'

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

export default function AdminTable() {
  const [data, setData] = useState<Attendance[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        ...(search && { search }),
      })
      const res = await fetch(`/api/attendance?${params}`)
      if (!res.ok) {
        console.error('API error:', res.status)
        return
      }
      const json: ApiResponse = await res.json()
      setData(json.data ?? [])
      setTotal(json.total ?? 0)
      setTotalPages(json.totalPages ?? 1)
    } catch (err) {
      console.error('Error fetching:', err)
    } finally {
      setLoading(false)
    }
  }, [page, search])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    const interval = setInterval(fetchData, 15000)
    return () => clearInterval(interval)
  }, [fetchData])

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(1)
  }

  const getSebagaiBadge = (sebagai: string) => {
    const cls = sebagai.toLowerCase()
    return <span className={`sebagai-badge ${cls}`}>{sebagai}</span>
  }

  const handleDelete = async (id: number, nama: string) => {
    if (!confirm(`Hapus data "${nama}"? Tindakan ini tidak bisa dibatalkan.`)) {
      return
    }
    try {
      const res = await fetch(`/api/attendance?id=${id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        alert(data.error || 'Gagal menghapus')
        return
      }
      fetchData()
    } catch {
      alert('Gagal menghapus data')
    }
  }

  return (
    <div className="admin-wrapper">
      <div className="admin-header">
        <div className="admin-header-left">
          <h1>📋 Daftar Hadir</h1>
          <p>Seminar Evaluasi CPNS Kemensetneg 2026</p>
        </div>
        <div className="admin-header-right">
          <div className="admin-count-badge">
            <span>Telah hadir:</span>
            <span className="count-number">{total}</span>
            <span>/ 700</span>
          </div>
          <a href="/api/attendance/export" className="admin-export-btn">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Export Excel
          </a>
          <button onClick={() => signOut({ callbackUrl: '/admin/login' })} className="admin-logout-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="admin-search-bar">
        <input
          type="text"
          placeholder="Cari nama, NIP, atau unit kerja..."
          value={search}
          onChange={handleSearch}
          className="admin-search-input"
        />
      </div>

      <div className="admin-table-container">
        {loading && data.length === 0 ? (
          <div className="admin-empty">
            <p>Memuat data...</p>
          </div>
        ) : data.length === 0 ? (
          <div className="admin-empty">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
            </svg>
            <h3>Belum ada data</h3>
            <p>Belum ada peserta yang mengisi daftar hadir</p>
          </div>
        ) : (
          <>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>No</th>
                  <th>Nama Lengkap</th>
                  <th>NIP/NRP</th>
                  <th>Jabatan</th>
                  <th>Unit Kerja</th>
                  <th>Sebagai</th>
                  <th>Tanda Tangan</th>
                  <th>Waktu</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr key={item.id}>
                    <td>{(page - 1) * 20 + index + 1}</td>
                    <td style={{ fontWeight: 600 }}>{item.namaLengkap}</td>
                    <td>{item.nipNrp}</td>
                    <td>{item.jabatan}</td>
                    <td>{item.unitKerja}</td>
                    <td>{getSebagaiBadge(item.sebagai)}</td>
                    <td>
                      {item.signature && (
                        <img
                          src={item.signature}
                          alt="Signature"
                          className="signature-thumb"
                        />
                      )}
                    </td>
                    <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                      {new Date(item.createdAt).toLocaleString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDelete(item.id, item.namaLengkap)}
                        className="delete-btn"
                        title="Hapus"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="admin-pagination">
              <span className="admin-pagination-info">
                Menampilkan {(page - 1) * 20 + 1}-{Math.min(page * 20, total)} dari {total} data
              </span>
              <div className="admin-pagination-buttons">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="admin-pagination-btn"
                >
                  ← Sebelumnya
                </button>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="admin-pagination-btn"
                >
                  Selanjutnya →
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
