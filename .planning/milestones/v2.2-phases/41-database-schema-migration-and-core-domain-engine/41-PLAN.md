# Phase 41 Plan: Database Schema Migration & Core Domain Engine

**Phase:** 41  
**Goal:** Menambahkan tipe field `CHECKBOX` ke enum PostgreSQL `"FieldType"`, memperbarui Prisma schema, mendefinisikan interface `CheckboxField` di domain model `src/lib/forms.ts`, serta menegakkan validasi server-side wajib centang di `validateFormSubmission`.  
**Requirements:** AGREE-01, AGREE-02  

## Tasks

### Task 1: Database Migration & Prisma Schema Update (AGREE-01)
- **Files:** `prisma/schema.prisma`, `prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql`
- **Actions:**
  - Tambahkan `CHECKBOX` ke enum `FieldType` di `prisma/schema.prisma`.
  - Buat file SQL migration `prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql` dengan query `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'CHECKBOX';`.
  - Jalankan `npx prisma generate`.

### Task 2: Core Domain Model & Mapping Integration in forms.ts (AGREE-01)
- **Files:** `src/lib/forms.ts`
- **Actions:**
  - Update `FormFieldType` union: sertakan `'checkbox'`.
  - Definisikan `interface CheckboxField extends BaseField { type: 'checkbox' }`.
  - Sertakan `CheckboxField` ke union `FormField`.
  - Perbarui fungsi `mapFieldType`, `mapFormFieldTypeToDb`, dan `allowedTypes` di `src/lib/forms.ts`.
  - Pastikan field builder/mapper (`rows.fields.flatMap`, dsb) menghasilkan objek `CheckboxField` saat tipe adalah `CHECKBOX`.

### Task 3: Server-Side Submission Validation Enforcement (AGREE-02)
- **Files:** `src/lib/forms.ts`
- **Actions:**
  - Pada `validateFormSubmission`, tambahkan handler khusus `field.type === 'checkbox'`:
    - Evaluasi boolean status `isConsent = value === 'true' || value === '1' || value === 'Setuju'`.
    - Jika `field.required && !isConsent`: lempar `FormSubmissionError(`"${field.label}" wajib disetujui`, 400)`.
    - Simpan nilai ternormalisasi `'true'` atau `''`.

### Task 4: Automated Testing & Verification
- **Files:** `src/lib/forms.test.ts`
- **Actions:**
  - Tambahkan unit test untuk `mapFormFieldTypeToDb` dan `mapFieldType` untuk `'checkbox'`.
  - Tambahkan unit test untuk validasi submission checkbox (skenario lolos dengan `'true'`, skenario gagal 400 saat required tetapi belum dicentang).
  - Jalankan `npm test` untuk memastikan semua test lulus.

## Verification
- Unit test Vitest di `src/lib/forms.test.ts` lulus.
- `npx tsc --noEmit` bersih.
