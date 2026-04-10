import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Masuk Admin | JOTT Editor Form',
  description: 'Akses cepat ke dashboard admin JOTT Editor Form menggunakan akun Google yang sudah diizinkan.',
}

export default async function HomePage() {
  const session = await getAdminSession()

  if (session) {
    redirect('/admin/forms')
  }

  redirect('/admin/login')
}
