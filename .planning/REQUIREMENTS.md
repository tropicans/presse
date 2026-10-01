# Requirements: Milestone v2.2 Agreement & Terms Checkbox Field Support

**Milestone:** v2.2  
**Status:** In Progress (2026-10-01)  
**Goal:** Menambahkan tipe field khusus Checkbox Persetujuan (Agreement / Terms & Conditions) end-to-end mulai dari skema database, form editor builder, public form & live preview renderer, validasi wajib centang, hingga ekspor & analitik respon.

## Requirements

### Database & Core Domain Engine
- [x] **AGREE-01: Database Enum & Core Domain Definitions** — Menambahkan nilai `'CHECKBOX'` pada enum PostgreSQL `"FieldType"` melalui migrasi Prisma, memperbarui `prisma/schema.prisma`, dan menambahkan tipe `CheckboxField` serta pemetaan tipe di `src/lib/forms.ts`.
- [x] **AGREE-02: Server-Side Consent Validation** — Menegakkan validasi persetujuan di `validateFormSubmission` (`src/lib/forms.ts`) sehingga jika field persetujuan berstatus `required: true`, submission wajib bernilai persetujuan yang valid (`'true'` / `'Setuju'`), serta menolak submission tanpa centang dengan error HTTP 400 `"[Label] wajib disetujui"`.

### Admin Form Editor & Authoring
- [x] **AGREE-03: Admin Form Editor Integration** — Menambahkan opsi tipe field `Persetujuan (Checkbox)` di `AdminFormEditor.tsx`, kartu konfigurasi pernyataan persetujuan/disclaimer, toggle wajib diisi, label ringkasan kartu terlipat, dan integrasi panel outline formulir.

### Public Form & Live Preview
- [x] **AGREE-04: Accessible Monochrome Checkbox UI** — Merender elemen kotak centang persetujuan interaktif dengan estetika monokrom arsitektural di `AttendanceForm.tsx` dan `AdminFormPreview.tsx`, mendukung navigasi keyboard (Tab & Space), transisi fokus `:focus-visible`, dan klik label untuk toggle centang.
- [x] **AGREE-05: Client-Side Step Validation & Auto-Focus** — Menerapkan validasi persetujuan di sisi klien saat tombol Lanjut atau Kirim ditekan, auto-scroll dan focus ke elemen kotak centang jika belum disetujui, serta auto-clear pesan kesalahan secara instan saat kotak centang diklik.

### Submissions, Export & Analytics
- [x] **AGREE-06: Submissions Table, Excel Export & Analytics Integration** — Memformat tampilan jawaban persetujuan di tabel kiriman admin (`AdminFormSubmissions.tsx`) dengan badge ergonomis `✓ Disetujui`, memformat nilai ekspor Excel `.xlsx` menjadi `"Disetujui"`, dan menyertakan distribusi persetujuan pada dashboard analitik.

### Quality Assurance & Infrastructure
- [ ] **AGREE-07: Multi-Tier QA, Automated Tests & Container Health** — Membangun unit test komprehensif di Vitest untuk validasi persetujuan, memastikan zero ESLint/TypeScript errors, memvalidasi build Next.js standalone, serta melakukan Smart Targeted Docker Container rebuild dan health check.

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| AGREE-01 | Phase 41 | Complete |
| AGREE-02 | Phase 41 | Complete |
| AGREE-03 | Phase 42 | Complete |
| AGREE-04 | Phase 43 | Complete |
| AGREE-05 | Phase 43 | Complete |
| AGREE-06 | Phase 44 | Complete |
| AGREE-07 | Phase 45 | Pending |

---

*Milestone started: 2026-10-01*
