# Phase 44: Submissions, Excel Export & Analytics Integration Plan

## Steps to Execute

### Step 1: Update `src/lib/form-analytics.ts`
- In `computeQuestionDistributions`:
  - When `col.type === 'checkbox'`, normalize the choice:
    - If choice is `'true'`, `'1'`, or case-insensitive `'setuju'`, label as `'Disetujui'`.
    - Otherwise keep choice as is.

### Step 2: Update `src/lib/forms.ts` (Excel Export)
- In `exportAdminFormSubmissionsWorkbook`:
  - For `exportableColumns.map(...)`:
    - If `column.type === 'checkbox'`:
      - If raw value is `'true'`, `'1'`, or case-insensitive `'setuju'`, format cell as `'Disetujui'`.
      - Otherwise format as `'-'`.

### Step 3: Update `src/components/AdminFormSubmissions.tsx` (Submissions View)
- In `getAnswerPreview(value, type)`:
  - If `type === 'checkbox'`:
    - If `isApproved` (value is `'true'`, `'1'`, or case-insensitive `'setuju'`), return styled badge `<span className="submissions-agreement-badge">✓ Disetujui</span>`.
    - Otherwise return `'-'`.

### Step 4: Verification
- Run `npx tsc --noEmit --pretty false`
- Run `npm run lint`
- Run `npm test`
- Update unit tests in `src/lib/form-analytics.test.ts` or `src/lib/forms.test.ts` if needed.
