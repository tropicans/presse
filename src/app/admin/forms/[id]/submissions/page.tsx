import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import AdminFormSubmissions from '@/components/AdminFormSubmissions'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AdminFormSubmissionsPage({ params }: PageProps) {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const { id } = await params
  return <AdminFormSubmissions formId={id} />
}
