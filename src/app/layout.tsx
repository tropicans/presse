import type { Metadata } from 'next'
import './globals.css'
import Providers from '@/components/Providers'

export const metadata: Metadata = {
  title: 'Daftar Hadir - Seminar Evaluasi CPNS',
  description: 'Daftar Hadir Seminar Evaluasi Rancangan Aktualisasi Pelatihan Dasar CPNS Kemensetneg Tahun 2026',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="id">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
