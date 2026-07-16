import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login Admin | isian',
  description: 'Masuk ke dashboard admin isian dengan akun Google yang sudah diizinkan.',
}

export default function AdminLoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
