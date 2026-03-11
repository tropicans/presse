import Image from 'next/image'
import AttendanceForm from '@/components/AttendanceForm'

export default function HomePage() {
  return (
    <div className="page-wrapper">
      <div className="form-card">
        <div className="form-header">
          <Image
            src="/garuda.png"
            alt="Garuda Pancasila"
            width={80}
            height={80}
            className="header-logo"
            priority
          />
          <h1 className="header-title">Daftar Hadir</h1>
          <p className="header-subtitle">
            Seminar Evaluasi Rancangan Aktualisasi Pelatihan Dasar CPNS
            Golongan II Angkatan V dan Golongan III Angkatan X
            Kemensetneg Tahun 2026
          </p>
        </div>
        <div className="form-body">
          <AttendanceForm />
        </div>
      </div>
    </div>
  )
}
