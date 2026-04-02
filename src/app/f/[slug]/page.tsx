import { notFound } from 'next/navigation'
import PublicFormShell from '@/components/PublicFormShell'
import { getPublicFormBySlug } from '@/lib/forms'

export const dynamic = 'force-dynamic'

interface PublicFormPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function PublicFormPage({ params }: PublicFormPageProps) {
  const { slug } = await params
  const form = await getPublicFormBySlug(slug)

  if (!form) {
    notFound()
  }

  return <PublicFormShell form={form} />
}
