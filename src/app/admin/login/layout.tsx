import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Login Admin | JOTT Editor Form',
  description: 'Masuk ke dashboard admin JOTT Editor Form dengan akun Google yang sudah diizinkan.',
}

export default function AdminLoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children
}
