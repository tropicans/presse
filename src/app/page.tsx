import Image from 'next/image'
import AttendanceForm from '@/components/AttendanceForm'
import { getPublicFormBySlug } from '@/lib/forms'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const form = await getPublicFormBySlug('attendance-template')

  if (!form) {
    throw new Error('Default attendance form is unavailable')
  }

  return (
    <div className="page-wrapper">
      <div className="form-card">
        <div className="form-header">
          <Image
            src="/garuda.png"
            alt="Garuda Pancasila"
            width={80}
            height={80}
            className="header-logo"
            priority
          />
          <h1 className="header-title">{form.title}</h1>
          <p className="header-subtitle">
            {form.description}
          </p>
        </div>
        <div className="form-body">
          <AttendanceForm form={form} />
        </div>
      </div>
    </div>
  )
}
