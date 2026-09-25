import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import AdminFormsList from '@/components/AdminFormsList'

export default async function AdminFormsPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  return <AdminFormsList />
}
