'use client'

interface PreviewField {
  id: string
  name: string
  label: string
  type: 'text' | 'textarea' | 'radio' | 'signature'
  required: boolean
  placeholder: string
  options: string[]
}

interface PreviewForm {
  title: string
  description: string | null
  fields: PreviewField[]
}

interface Props {
  form: PreviewForm
}

export default function AdminFormPreview({ form }: Props) {
  return (
    <div className="admin-preview-shell">
      <div className="admin-preview-card">
        <div className="admin-preview-head">
          <h3>{form.title || 'Tanpa Judul'}</h3>
          <p>{form.description || 'Deskripsi form akan tampil di sini.'}</p>
        </div>

        <div className="admin-preview-body">
          {form.fields.map((field) => {
            if (field.type === 'radio') {
              return (
                <div key={field.id} className="admin-preview-group">
                  <label className="admin-preview-label">
                    {field.label || field.name}
                    {field.required ? ' *' : ''}
                  </label>
                  <div className="admin-preview-radio-group">
                    {field.options.filter(Boolean).map((option) => (
                      <label key={option} className="admin-preview-radio">
                        <input type="radio" disabled name={field.name} />
                        <span>{option}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )
            }

            if (field.type === 'signature') {
              return (
                <div key={field.id} className="admin-preview-group">
                  <label className="admin-preview-label">
                    {field.label || field.name}
                    {field.required ? ' *' : ''}
                  </label>
                  <div className="admin-preview-signature">
                    <div className="admin-preview-signature-pad">Area tanda tangan</div>
                    <button type="button" disabled className="admin-preview-clear-btn">
                      Hapus Tanda Tangan
                    </button>
                  </div>
                </div>
              )
            }

            if (field.type === 'textarea') {
              return (
                <div key={field.id} className="admin-preview-group">
                  <label className="admin-preview-label">
                    {field.label || field.name}
                    {field.required ? ' *' : ''}
                  </label>
                  <textarea
                    disabled
                    rows={3}
                    placeholder={field.placeholder || undefined}
                    className="admin-preview-textarea"
                  />
                </div>
              )
            }

            return (
              <div key={field.id} className="admin-preview-group">
                <label className="admin-preview-label">
                  {field.label || field.name}
                  {field.required ? ' *' : ''}
                </label>
                <input
                  type="text"
                  disabled
                  placeholder={field.placeholder || undefined}
                  className="admin-preview-input"
                />
              </div>
            )
          })}

          <button type="button" disabled className="admin-preview-submit">
            Submit
          </button>
        </div>
      </div>
    </div>
  )
}
