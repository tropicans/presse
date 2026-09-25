import { redirect } from 'next/navigation'
import AdminFormPreviewPage from '@/components/AdminFormPreviewPage'
import { getAdminSession } from '@/lib/auth'
import { getAdminFormDetail } from '@/lib/forms'
import { type AdminPreviewForm } from '@/lib/admin-form-preview'

interface PageProps {
  params: Promise<{
    id: string
  }>
  searchParams: Promise<{
    device?: string
  }>
}

function createPreviewForm(form: Awaited<ReturnType<typeof getAdminFormDetail>>): AdminPreviewForm | null {
  if (!form) {
    return null
  }

  return {
    title: form.title,
    description: form.description,
    workflow: form.workflow,
    pages: form.pages,
    fields: form.fields,
  }
}

export default async function AdminFormPreviewRoute({ params, searchParams }: PageProps) {
  const session = await getAdminSession()

  if (!session) {
    redirect('/admin/login')
  }

  const { id } = await params
  const { device } = await searchParams
  const form = createPreviewForm(await getAdminFormDetail(id))
  const initialDeviceMode = device === 'mobile' ? 'mobile' : 'desktop'

  if (!form) {
    redirect('/admin/forms')
  }

  return <AdminFormPreviewPage formId={id} initialForm={form} initialDeviceMode={initialDeviceMode} />
}
