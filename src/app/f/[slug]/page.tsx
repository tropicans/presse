import type { Metadata } from 'next'
import PublicFormPage from '@/components/PublicFormPage'
import { getPublicFormBySlug } from '@/lib/forms'

export const revalidate = 30

interface PublicFormPageProps {
  params: Promise<{
    slug: string
  }>
}

export async function generateMetadata({ params }: PublicFormPageProps): Promise<Metadata> {
  const { slug } = await params
  const form = await getPublicFormBySlug(slug)

  if (!form) {
    return {
      title: 'Form Tidak Ditemukan | HIMPUN',
      description: 'Form yang Anda cari tidak tersedia atau belum dipublikasikan.',
    }
  }

  return {
    title: `${form.title} | HIMPUN`,
    description: form.description || 'Isi formulir HIMPUN dengan data yang benar sebelum dikirim.',
  }
}

export default async function PublicFormRoute({ params }: PublicFormPageProps) {
  const { slug } = await params
  const form = await getPublicFormBySlug(slug)

  return <PublicFormPage form={form} />
}
