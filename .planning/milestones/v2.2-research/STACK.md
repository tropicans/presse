# Stack Research: Agreement & Checkbox Field Support

**Milestone:** v2.2 Agreement & Terms Checkbox Field Support  
**Domain:** Form Engine, Validation & UI Components  
**Confidence:** HIGH

---

## 1. Database & ORM Stack

### Existing Capabilities
- Database: PostgreSQL 16 (in Docker compose container `isian-postgres` & native adapter `pg`).
- ORM: Prisma 7.4 with `@prisma/adapter-pg`.
- Custom Form Engine: Tables `forms`, `form_pages`, `form_fields`, `form_field_options`, `submissions`, `submission_answers` managed via raw SQL transactions in `src/lib/forms.ts` and tracked in `prisma/schema.prisma`.
- Current DB enum `FieldType`: `'SHORT_TEXT', 'LONG_TEXT', 'RADIO', 'SELECT', 'YES_NO', 'SIGNATURE'`.

### Required Stack Additions
- **Enum Expansion:** Add `'CHECKBOX'` to the PostgreSQL enum `"FieldType"`.
  - Migration script: `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'CHECKBOX';`
  - Update `prisma/schema.prisma` enum `FieldType` to include `CHECKBOX`.
- **Zero Schema Bloat:** `submission_answers` uses `value TEXT NOT NULL`. A checkbox answer stores `"true"` or `"Setuju"`, so no table column migration is needed for answers.

---

## 2. Validation Engine Stack

### Existing Stack
- `src/lib/form-validation.ts`: Pure, zero-dependency validators (NIP, email, phone, name, signature).
- `validateFormSubmission` in `src/lib/forms.ts`: Server-side pipeline validating required fields, choice integrity, length limits, and scoring.

### Additions
- Export a pure validator `validateCheckboxAgreement(value: unknown, required?: boolean)`:
  - If required: value must strictly be `"true"`, `"1"`, or `"Setuju"`. Empty string, `"false"`, or undefined triggers validation error: `"[Label] wajib disetujui"`.
  - If optional: allows empty or truthy values.
- Shared between client-side pre-validation (`AttendanceForm.tsx`, `AdminFormPreview.tsx`) and server route handler (`/api/public/forms/[slug]/submit`).

---

## 3. UI Component & Design System Stack

### Existing Design Tokens
- Monochromatic Minimalist Editorial theme in `src/app/globals.css`.
- Google Font typography (`Inter`, `Playfair Display`, `JetBrains Mono`).
- Custom styling for `.radio-custom`, `.form-copy-checkbox`, input focus rings, and dark/light mode surface tokens (`--bg-surface`, `--text-primary`, `--border-line`).

### Additions
- Custom checkbox component styling:
  - `.checkbox-agreement-card` & `.checkbox-agreement-input`: High-contrast square box (18x18px or 20x20px) with custom SVG checkmark or binary inversion on `:checked`.
  - Accessible focus ring (`:focus-visible`) adhering to the established 2px monochrome outline.
  - Multi-line agreement label formatting allowing readable legal/disclaimer copy.
- Admin Form Editor:
  - New field type option in `fieldTypeOptions`: `'checkbox'` (Label: `Persetujuan (Checkbox)`).
  - Configurable disclaimer label, helper hint, and `required` toggle.

---

## 4. Export & Analytics Stack

### Existing Stack
- Excel export via `exceljs` ^4.4.0 in `src/app/api/admin/forms/[id]/export/route.ts` & `src/lib/forms.ts`.
- Submissions table in `AdminFormSubmissions.tsx`.
- Analytics aggregation engine `getFormAnalytics` in `src/lib/forms.ts` (`/admin/forms/[id]/analytics`).

### Additions
- Submissions Table: Display boolean checkbox answers as clean monochrome badges (e.g. `✓ Disetujui` vs `- Belum disetujui`).
- Excel Export: Output `"Disetujui"` / `"Tidak Disetujui"` for readability in spreadsheets.
- Analytics Dashboard: Aggregated count & percentage of agreement in choice distribution breakdown.
