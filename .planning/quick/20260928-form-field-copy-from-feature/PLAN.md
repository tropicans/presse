# Quick Task: Form Field "Copy from Previous Question" (Checkbox "Sama dengan...")

## Goal
Implement Option A: Allow form administrators to configure a field to be copyable from another question (e.g. "Alamat Domisili" copyable from "Alamat KTP", or identical fields). On the public form and preview, a checkbox "[✓] Sama dengan {Pertanyaan}" is rendered. When checked, the value is automatically copied, kept in sync with the source field, and the target field becomes read-only until unchecked.

## Planned Changes
1. **Schema & Models (`src/lib/forms.ts`, `src/lib/admin-form-preview.ts`):**
   - Add `FormFieldCopyRule` interface and `copyRules?: FormFieldCopyRule[]` to `FormSettings`.
   - Add `copyFromFieldId?: string` and `copyFromLabel?: string` to `BaseField`, `AdminEditableField`, and `AdminPreviewField`.
   - Add `readFormCopyRules` and update `serializeFormSettings`, `buildFormSettings`, `mapPublicFormRowsToDefinition`, and `getAdminFormDetail`.
   - In `updateAdminForm`, assign concrete IDs to newly created fields upfront so `copyRules` reference valid IDs, and persist `copyRules` into `settings_json`.

2. **Admin Form Editor (`src/components/AdminFormEditor.tsx`):**
   - Add "Salin dari Pertanyaan Lain" configuration section in the field settings panel.
   - Dropdown of available source fields in the form.
   - Optional custom checkbox label input (with default placeholder `Sama dengan {Label Sumber}`).

3. **Public Form UI (`src/components/AttendanceForm.tsx`):**
   - Implement `copiedFields` state.
   - Render copy checkbox above or beside target field.
   - When checked: auto-populate value from source field and set `readOnly`.
   - Synchronize value if source field changes while checkbox is checked.
   - Re-enable editing when unchecked.

4. **Admin Preview UI (`src/components/AdminFormPreview.tsx`):**
   - Implement the same interactive copy checkbox behavior in preview mode.

5. **Design & Styles (`src/app/globals.css`):**
   - Style checkbox toggle and read-only copied input in line with Editorial Minimalist Monochrome design.

6. **Testing & Verification:**
   - Add unit tests in `src/lib/forms.test.ts`.
   - Run `npm test`, `npm run lint`, `npx tsc --noEmit`.
   - Smart container rebuild and health check.
