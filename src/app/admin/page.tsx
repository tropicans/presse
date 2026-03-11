import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import AdminTable from '@/components/AdminTable'

export default async function AdminPage() {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  return <AdminTable />
}
