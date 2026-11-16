# Pitfalls Research: Agreement & Checkbox Field Integration

**Milestone:** v2.2 Agreement & Terms Checkbox Field Support  
**Domain:** Edge Cases, Accessibility, Validation & State Management  
**Confidence:** HIGH

---

## 1. Critical Pitfalls & Mitigation Strategies

### Pitfall 1: Unchecked Checkbox Representation in HTML & React State
- **Problem:** Native HTML forms do NOT submit anything when a checkbox is unchecked. In React state, unchecked might be `false`, `""`, or `undefined`. If server expects `"false"` but gets missing key, it might mistake it for an omitted optional field vs explicit non-consent.
- **Mitigation:**
  - Standardize form representation: checked is strictly `"true"`, unchecked is `""` or `"false"`.
  - In `validateFields` (client) and `validateFormSubmission` (server), check `Boolean(value === 'true' || value === '1' || value === 'Setuju')`.
  - When `field.required === true`, reject any value that is not truthy with message `"[Label] wajib disetujui"`.

### Pitfall 2: PostgreSQL Enum ALTER in Transaction vs Safe Migration
- **Problem:** In PostgreSQL versions prior to 12 or inside certain complex transaction blocks, `ALTER TYPE ... ADD VALUE` cannot run inside multi-statement transactions with newly added values used in the same transaction.
- **Mitigation:**
  - In Prisma migrations, run `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'CHECKBOX';` as a standalone migration.
  - Test migration execution cleanly with `npx prisma migrate status` / `npx prisma migrate dev`.

### Pitfall 3: Keyboard Accessibility & Screen Readers
- **Problem:** Custom-styled checkboxes often hide `<input type="checkbox">` via `display: none`, making them unreachable via Tab keyboard navigation or unusable with spacebar keypress.
- **Mitigation:**
  - Visually hide the native input using standard `opacity: 0; position: absolute;` (or visually-hidden utility) so it retains focusability and keyboard interactivity (`Space` to toggle).
  - Use `<label htmlFor="...">` properly linking input ID, or wrap input inside the `<label>` element.
  - Implement `:focus-visible` ring on the custom square box matching our architectural design system.

### Pitfall 4: Submissions Export and Analytics Inconsistency
- **Problem:** Exporting raw `"true"` / `"false"` strings to Excel `.xlsx` looks untidy for human reviewers, while in submissions table it can cause unclear column widths.
- **Mitigation:**
  - In Excel export, format truthy values to `"Disetujui"` and empty/falsy to `"-"` (or `"Tidak Disetujui"`).
  - In the submissions dashboard (`AdminFormSubmissions.tsx`), render an ergonomic monochrome badge (`✓ Disetujui`).
  - In Analytics (`getFormAnalytics`), aggregate the counts cleanly under the question distribution.

### Pitfall 5: Step Tabs & Multi-Step Validation Gap
- **Problem:** If an agreement checkbox is on Step 1 of a multi-step form, and the user clicks "Lanjut" (Next Step), the form must validate that Step 1's agreement is checked before advancing to Step 2.
- **Mitigation:**
  - Ensure `validateFields(currentStep.fields)` checks `field.type === 'checkbox'` during step navigation, preventing transition if invalid, and auto-scrolling to the agreement card.
