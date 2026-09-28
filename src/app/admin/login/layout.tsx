import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login Admin',
  description: 'Masuk ke dashboard admin Form dengan akun Google yang sudah diizinkan.',
}

export default function AdminLoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
