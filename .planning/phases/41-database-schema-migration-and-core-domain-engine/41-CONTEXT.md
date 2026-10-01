# Phase 41 Context: Database Schema Migration & Core Domain Engine

**Phase:** 41  
**Goal:** Menambahkan tipe field `CHECKBOX` ke enum PostgreSQL `"FieldType"`, memperbarui Prisma schema, mendefinisikan interface `CheckboxField` di domain model `src/lib/forms.ts`, serta menegakkan validasi server-side wajib centang di `validateFormSubmission`.  
**Requirements:** AGREE-01, AGREE-02  

## Locked Decisions & Technical Approach

1. **Database Schema & Migration (AGREE-01):**
   - Tambahkan nilai `CHECKBOX` pada enum `FieldType` di `prisma/schema.prisma`.
   - Buat file migrasi SQL: `prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql`.
   - Isi SQL:
     ```sql
     ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'CHECKBOX';
     ```
   - Jalankan `npx prisma generate` untuk memperbarui Prisma client.

2. **Core Domain Model & Type Mapping (AGREE-01):**
   - Di `src/lib/forms.ts`:
     - Tambahkan `'checkbox'` ke `FormFieldType`.
     - Buat interface `CheckboxField extends BaseField { type: 'checkbox' }`.
     - Tambahkan `CheckboxField` ke union type `FormField`.
     - Update `mapFieldType(type: FieldType)`: tangani `case 'CHECKBOX': return 'checkbox'`.
     - Update `mapFormFieldTypeToDb(type: FormFieldType)`: tangani `case 'checkbox': return 'CHECKBOX'`.
     - Tambahkan `'checkbox'` ke set `allowedTypes` di `updateForm`.
     - Tambahkan mapping di `buildFormPayloadFromSettings` atau helper builder terkait.

3. **Server-Side Consent Validation (AGREE-02):**
   - Di `validateFormSubmission` (`src/lib/forms.ts`):
     - Saat memvalidasi field dengan `field.type === 'checkbox'`:
       - Nilai dianggap setuju (*checked*) jika `value === 'true' || value === '1' || value === 'Setuju'`.
       - Jika `field.required`: apabila nilai tidak setuju (*unchecked* / falsy / `""` / `'false'`), lemparkan `FormSubmissionError(`"${field.label}" wajib disetujui`, 400)`.
       - Nilai tersimpan dinormalisasi menjadi `'true'` jika dicentang, atau `''` jika tidak dicentang (pada field non-wajib).

4. **Automated Unit Tests:**
   - Tambahkan test cases di `src/lib/forms.test.ts` untuk memverifikasi mapping `CHECKBOX` dan validasi server-side (wajib disetujui vs berhasil submit saat dicentang).
