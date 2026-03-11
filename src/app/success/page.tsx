import Link from 'next/link'

export default function SuccessPage() {
  return (
    <div className="success-wrapper">
      <div className="success-card">
        <div className="success-icon">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h1 className="success-title">Terima Kasih!</h1>
        <p className="success-message">
          Kehadiran Anda telah berhasil dicatat.<br />
          Selamat mengikuti Seminar Evaluasi Rancangan Aktualisasi
          Pelatihan Dasar CPNS Kemensetneg Tahun 2026.
        </p>
        <Link href="/" className="success-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Kembali ke Form
        </Link>
      </div>
    </div>
  )
}
