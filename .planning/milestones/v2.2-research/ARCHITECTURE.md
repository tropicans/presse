# Architecture Research: Agreement & Checkbox Field Integration

**Milestone:** v2.2 Agreement & Terms Checkbox Field Support  
**Domain:** Cross-Tier Architecture & Data Flow  
**Confidence:** HIGH

---

## 1. Architectural Component Map

```
┌─────────────────────────────────────────────────────────────┐
│                       PostgreSQL DB                         │
│  - FieldType enum updated with 'CHECKBOX'                   │
│  - form_fields: { type: 'CHECKBOX', required: true/false }  │
│  - submission_answers: { value: 'true' / 'Setuju' }         │
└──────────────────────────────▲──────────────────────────────┘
                               │
                Prisma Client & Raw SQL Engine
                               │
┌──────────────────────────────▼──────────────────────────────┐
│                    Domain Engine (forms.ts)                 │
│  - FormFieldType += 'checkbox'                              │
│  - CheckboxField interface definition                       │
│  - mapFieldType & mapFormFieldTypeToDb mapping              │
│  - validateFormSubmission enforcement                       │
│  - Excel export value mapping                               │
│  - Analytics distribution aggregation                       │
└─────────────────▲───────────────────────────▲───────────────┘
                  │                           │
                  │ Client State              │ Server Route
                  ▼                           ▼
┌─────────────────────────────────┐   ┌─────────────────────────────┐
│       Admin Form Editor         │   │   Public Form & Preview     │
│  - fieldTypeOptions += checkbox │   │  - AttendanceForm.tsx       │
│  - AdminFormEditor UI card      │   │  - AdminFormPreview.tsx     │
│  - Outline navigation           │   │  - Pure client validation   │
│  - Compact card header          │   │  - High-contrast checkbox UI│
└─────────────────────────────────┘   └─────────────────────────────┘
```

---

## 2. Component Integration Details

### A. Database Layer
1. **Migration:**
   - Add new migration file: `prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql`
   - SQL: `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'CHECKBOX';`
   - Update `prisma/schema.prisma` with `CHECKBOX` in `enum FieldType`.

### B. Core Domain Engine (`src/lib/forms.ts`)
1. **Type Definitions:**
   ```ts
   export type FormFieldType = 'text' | 'textarea' | 'radio' | 'select' | 'likert' | 'signature' | 'yes_no' | 'checkbox'

   export interface CheckboxField extends BaseField {
     type: 'checkbox'
   }

   export type FormField = TextField | RadioField | SelectField | SignatureField | YesNoField | CheckboxField
   ```
2. **Type Mapping:**
   - `mapFieldType(type: FieldType)`: handles `CHECKBOX` -> `'checkbox'`.
   - `mapFormFieldTypeToDb(type: FormFieldType)`: maps `'checkbox'` -> `'CHECKBOX'`.
   - `allowedTypes` Set in `updateForm`: includes `'checkbox'`.
3. **Submission Validation (`validateFormSubmission`):**
   - For `field.type === 'checkbox'`:
     - If `field.required`: require value to be `'true'` or `'1'` or `'Setuju'`. If missing or falsy, throw `FormSubmissionError(`"${field.label}" wajib disetujui`, 400)`.
     - Value is stored as normalized `'true'` or `'false'`.
4. **Excel Export (`exportFormSubmissions`):**
   - For `field.type === 'checkbox'`, map value `'true'` to `'Disetujui'` and `'false'`/empty to `'-'`.
5. **Analytics (`getFormAnalytics`):**
   - Count `'true'` (Disetujui) vs `'false'` (Belum Disetujui) in choice distributions.

### C. Client Validation Module (`src/lib/form-validation.ts`)
- Add helper `isCheckboxField(field: FormField)`.
- Client pre-submission checks: if `field.required` and `!formData[field.name] || formData[field.name] === 'false'`, set error `"${field.label} wajib disetujui"`.

### D. UI Components
1. **Admin Form Editor (`src/components/AdminFormEditor.tsx`):**
   - Add `'checkbox'` to `fieldTypeOptions` and `fieldTypeLabels['checkbox'] = 'Persetujuan (Checkbox)'`.
   - Field card renders specific configuration for agreement (clean disclaimer input, helper hint, required toggle).
2. **Public Form (`src/components/AttendanceForm.tsx`):**
   - Render `.checkbox-agreement-wrapper`:
     - Hidden native checkbox `<input type="checkbox">` for standard accessibility & keyboard navigation.
     - Custom styled square box with SVG checkmark.
     - Label containing the agreement text.
     - Auto-dismiss error on click.
3. **Admin Live Preview (`src/lib/admin-form-preview.ts` & `AdminFormPreview.tsx`):**
   - Synchronize with new field type for seamless previewing before save.
4. **Submissions Table (`src/components/AdminFormSubmissions.tsx`):**
   - Badge display for checkbox answers (`✓ Disetujui`).
