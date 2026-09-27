import { redirect } from 'next/navigation'
import { getAdminSession } from '@/lib/auth'
import FormAnalyticsView from '@/components/FormAnalyticsView'

interface PageProps {
  params: Promise<{
    id: string
  }>
}

export default async function AdminFormAnalyticsPage({ params }: PageProps) {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const { id } = await params
  return <FormAnalyticsView formId={id} />
}
