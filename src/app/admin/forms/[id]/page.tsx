import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import AdminFormEditor from '@/components/AdminFormEditor'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AdminFormDetailPage({ params }: PageProps) {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const { id } = await params
  return <AdminFormEditor formId={id} />
}
