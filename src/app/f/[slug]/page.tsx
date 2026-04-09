import PublicFormPageClient from '@/components/PublicFormPage'

export const revalidate = 30

interface PublicFormPageProps {
  params: Promise<{
    slug: string
  }>
}

export default async function PublicFormRoute({ params }: PublicFormPageProps) {
  const { slug } = await params
  return <PublicFormPageClient slug={slug} />
}
