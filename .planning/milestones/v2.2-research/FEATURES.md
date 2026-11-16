# Features Research: Agreement & Checkbox Field Support

**Milestone:** v2.2 Agreement & Terms Checkbox Field Support  
**Domain:** Form Fields, User Consent & Legal Disclaimers  
**Confidence:** HIGH

---

## 1. Feature Analysis: Table Stakes vs Differentiators

### Table Stakes (Must Have for v2.2)
1. **Single Consent / Agreement Checkbox:**
   - A single checkbox accompanied by full disclaimer or terms text.
   - Example use case: *"Saya memahami bahwa pembentukan atau pelengkapan tim bergantung pada ketersediaan peserta dan tidak dijamin oleh panitia."*
2. **Mandatory Consent Enforcement (Required Validation):**
   - If `required: true`, the user cannot navigate to the next page or submit the form without checking the box.
   - Clear and friendly validation error copy: `"[Label/Klausul] wajib disetujui"`.
   - Auto-scroll and focus to the checkbox container when submission is attempted without checking.
3. **Form Editor Integration:**
   - Admin can add a `Persetujuan (Checkbox)` field from the field palette in `AdminFormEditor.tsx`.
   - Admin can edit the agreement statement in the question label/disclaimer area.
   - Admin can toggle `Wajib diisi` (Required).
   - Card collapsed summary shows badge `Persetujuan` and status `Wajib` / `Opsional`.
4. **Public Form & Live Preview Rendering:**
   - Crisp rendering in `AttendanceForm.tsx` and `AdminFormPreview.tsx`.
   - Clicking either the square checkbox or the disclaimer text toggles the checkbox state.
   - Reversible toggle (check / uncheck before submission).
5. **Submissions & Export Representation:**
   - Displayed in submissions detail and table as `"Disetujui"` / `"Ya"`.
   - Exported to Excel `.xlsx` cleanly without raw JSON booleans.

### Differentiators (High Value)
1. **Highlighted Disclaimer Card Layout:**
   - Styled inside an architectural bordered container with a subtle background surface (`var(--bg-surface-elevated)`), signaling that it is a formal declaration/disclaimer distinct from standard inputs.
2. **Instant Error Dismissal:**
   - When the user receives a "Wajib disetujui" validation error and clicks to check the box, the error message immediately disappears without requiring the user to press "Kirim" again.

### Defer to Future Milestones (v2.3+)
- **Multi-checkbox group (Multiple Choice with multiple selections):** Useful for survey tags or multi-select checklists, but fundamentally different from a single legal agreement checkbox.
- **Embedded Markdown links in checkbox labels (e.g. `[Syarat & Ketentuan](/terms)`):** Could be added later if external terms pages are needed.

---

## 2. Expected User Journey

1. **Admin Journey (Form Builder):**
   - Admin opens `/admin/forms/[id]/edit`.
   - In Step 1 (or final step before submit), admin clicks `+ Persetujuan (Checkbox)`.
   - Admin pastes the text: *"Saya memahami bahwa pembentukan atau pelengkapan tim bergantung pada ketersediaan peserta dan tidak dijamin oleh panitia."*
   - Admin switches `Wajib diisi` to ON.
   - Admin saves or clicks `Pratinjau` to test immediately.
2. **Public User Journey (Filling Form):**
   - User navigates through the form steps.
   - On the final step, user sees the prominent Agreement card with the disclaimer.
   - If user tries to click `Kirim Formulir` without checking:
     - Form does not submit.
     - Viewport scrolls smoothly to the agreement card.
     - Red validation message appears: *"Pernyataan ini wajib disetujui untuk melanjutkan."*
   - User clicks the checkbox: error instantly clears.
   - User submits successfully.
