import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login Admin | HIMPUN',
  description: 'Masuk ke dashboard admin HIMPUN dengan akun Google yang sudah diizinkan.',
}

export default function AdminLoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
