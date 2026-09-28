---
slug: 20260928-form-field-copy-from-feature
status: complete
date: 2026-09-28
---

# Quick Task Summary: Form Field Copy from Another Question (Opsi A)

## What Was Done
1. **Schema & Domain Models (`src/lib/forms.ts` & `src/lib/admin-form-preview.ts`)**:
   - Added `FormFieldCopyRule` interface (`targetFieldId`, `sourceFieldId`, `checkboxLabel`).
   - Extended `FormSettings` with optional `copyRules?: FormFieldCopyRule[]`.
   - Extended `BaseField`, `AdminEditableField`, and `AdminPreviewField` with `copyFromFieldId?: string` and `copyFromLabel?: string`.
   - Implemented `readFormCopyRules(settingsJson, fieldIds)` helper.
   - Updated `serializeFormSettings` to preserve `copyRules` in `forms.settings_json`.
   - Updated `buildFormSettings`, `mapPublicFormRowsToDefinition`, and `getAdminFormDetail` to load and attach copy configuration to fields.
   - Enhanced `updateAdminForm` to pre-generate concrete IDs for newly added fields so `copyRules`, pages, and conditional routes maintain proper reference integrity, and persisted `copyRules` into `settings_json`.

2. **Admin Form Builder UI (`src/components/AdminFormEditor.tsx`)**:
   - Added "Salin dari Pertanyaan Lain (Opsional)" in field settings.
   - Added dropdown to select any source question from the form.
   - Added custom checkbox label input with default placeholder (`Sama dengan {Label Sumber}`).
   - Ensured `handleSave` sends `copyFromFieldId` and `copyFromLabel` in the PATCH payload.

3. **Public Form Experience (`src/components/AttendanceForm.tsx`)**:
   - Added `copiedFields` state and `handleCopyToggle` handler.
   - Rendered sleek checkbox toggle (`[✓] Sama dengan {Label Sumber}`) above target fields.
   - Checking the box copies the source question value into the target field and locks it with `readOnly` and `.is-copied` styling.
   - Changes to the source field automatically propagate to any active copied fields in real-time.
   - Unchecking the box releases the field back to editable mode while retaining current value.

4. **Live Admin Preview (`src/components/AdminFormPreview.tsx`)**:
   - Replicated identical interactive copy checkbox behavior in the editor's live preview so admins can immediately test the copy interaction.

5. **Design System & Styling (`src/app/globals.css`)**:
   - Added `.form-label-with-action` for clean header alignment.
   - Added `.form-copy-checkbox-label` and `.form-copy-checkbox` aligned with Editorial Minimalist Monochrome design.
   - Added `.form-input.is-copied` and `.form-textarea.is-copied` styling with subtle dashed border and readonly cursor.

6. **Validation & Verification**:
   - Added unit test in `src/lib/forms.test.ts` verifying `copyRules` and submission flow.
   - All 100 tests passed in Vitest.
   - `npm run lint` and `npx tsc --noEmit` passed with 0 errors.
   - Rebuilt Docker containers (`app` and `worker`) according to protocol.
   - Verified `/api/health` returns `status: ok`.
