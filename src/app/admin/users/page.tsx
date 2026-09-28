import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import AdminUsersManagement from '@/components/AdminUsersManagement'

export default async function AdminUsersPage() {
  const session = await getAdminSession()

  if (!session?.user?.email) {
    redirect('/admin/login')
  }

  if (!session.user.isSuperAdmin) {
    redirect('/admin/forms')
  }

  return <AdminUsersManagement currentUserEmail={session.user.email} />
}
