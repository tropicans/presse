<!-- generated-by: gsd-doc-writer -->
# Frontend Components Reference

This document covers the frontend UI components located under `src/components/`, describing their purpose, layout hierarchy, props, and dependencies.

## Overview

The user interface of Isian is built on React 19 and Next.js 16. The UI components are split into two logical layers:
1. **Admin Components**: Form builder dashboard, drag-and-drop form editor, submissions explorer, and custom layouts.
2. **Public Components**: Responsive forms, multipage workflows, signature capture pads, and quiz presentation pages.

## Module/component listing

| Component | File Path | Description |
|---|---|---|
| `AdminFormEditor` | `src/components/AdminFormEditor.tsx` | Drag-and-drop builder for defining form steps, fields, Likert options, branching, and quiz scoring. |
| `AdminFormPreview` | `src/components/AdminFormPreview.tsx` | Simulates the public form presentation using LocalStorage drafts before publish. |
| `AdminFormPreviewPage`| `src/components/AdminFormPreviewPage.tsx` | Root preview route page wrapper syncing draft state. |
| `AdminFormSubmissions`| `src/components/AdminFormSubmissions.tsx` | Administrative table displaying form submissions with filter toggles and Excel exports. |
| `AdminFormsList` | `src/components/AdminFormsList.tsx` | Grid displaying created forms, drafts, and administrative CRUD operations. |
| `AdminTable` | `src/components/AdminTable.tsx` | Reusable paginated table container featuring sortable column headers. |
| `AttendanceForm` | `src/components/AttendanceForm.tsx` | Core public form engine that renders standard, quiz, webinar, and attendance layouts. |
| `Providers` | `src/components/Providers.tsx` | NextAuth session provider wrapper enclosing layout trees. |
| `PublicFormPage` | `src/components/PublicFormPage.tsx` | Public route page wrapper fetching form schema. |
| `PublicFormShell` | `src/components/PublicFormShell.tsx` | Standard shell layout formatting public forms with title banners. |
| `SearchableSelect` | `src/components/SearchableSelect.tsx` | Select dropdown list featuring fuzzy input filtering. |
| `SignaturePad` | `src/components/SignaturePad.tsx` | Canvas-based signature capture drawing pad using the `signature_pad` package. |
| `ThemeToggle` | `src/components/ThemeToggle.tsx` | Client-side light/dark mode theme switch. |

## Key interfaces or APIs

### 1. `AttendanceForm` Props
The core public form renderer takes a parsed public form definition:
```typescript
interface AttendanceFormProps {
  form: PublicFormDefinition
}
```

### 2. `SignaturePad` Props
The signature input uses HTML5 canvas and updates the form value with base64 data:
```typescript
interface SignaturePadProps {
  value: string
  onChange: (base64Value: string) => void
  disabled?: boolean
}
```

### 3. `SearchableSelect` Props
A custom searchable dropdown component:
```typescript
interface SearchableSelectProps {
  options: string[]
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
  disabled?: boolean
}
```

## Usage examples

### Rendering a Public Form
Standard inclusion of public-facing form renderer inside a page:
```tsx
import { AttendanceForm } from '@/components/AttendanceForm'
import { getPublicFormBySlug } from '@/lib/forms'

export default async function Page() {
  const form = await getPublicFormBySlug('my-form')
  if (!form) return <div>Not Found</div>

  return <AttendanceForm form={form} />
}
```
