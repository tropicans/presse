# Requirements: Milestone v1.8 Editorial Minimalist Monochrome Transformation

**Milestone:** v1.8  
**Status:** In Progress (2026-09-27)  
**Goal:** Mentransformasikan seluruh visual aplikasi `isian` ke gaya **Minimalist Monochrome (Editorial Luxury & Architectural Precision)**: tipografi serif klasik (`Playfair Display`, `Source Serif 4`, `JetBrains Mono`), palet murni `#000000` dan `#FFFFFF`, radius 0px di seluruh elemen, zero drop shadows, garis arsitektural terukur (1px hingga 8px), tekstur kertas & garis halus, serta interaksi biner instan.

## Requirements

### Global Design Tokens & Architectural Foundation

- [ ] **EDIT-01**: **Serif & Mono Font Stack Integration** — Memuat `Playfair Display`, `Source Serif 4`, dan `JetBrains Mono` via Google Fonts dan mengonfigurasi variabel `--font-family-display`, `--font-family`, `--font-family-mono`, serta skala tipografi editorial di `src/app/globals.css`.
- [ ] **EDIT-02**: **Absolute Monochrome Palette & Contrast Tokens** — Menetapkan palet `#000000` (hitam murni) dan `#FFFFFF` (putih murni) tanpa warna aksen, dengan `#525252` untuk teks sekunder dan `#E5E5E5` untuk divider hairline di `src/app/globals.css`.
- [ ] **EDIT-03**: **Strict Zero-Radius Architecture (0px Everywhere)** — Menetapkan `--radius-sm: 0px`, `--radius-md: 0px`, `--radius-lg: 0px`, `--radius-xl: 0px`, dan meniadakan seluruh border-radius pada kartu, tombol, badge, input, dan panel modal.
- [ ] **EDIT-04**: **Zero Drop Shadows & Structural Line System** — Menghilangkan seluruh `--shadow-sm` hingga `--shadow-xl` (set ke `none`) dan menerapkan hierarki garis arsitektural (hairline 1px, thin 1px, medium 2px, thick 4px, ultra 8px solid black/white).
- [ ] **EDIT-05**: **Subtle Layered Paper & Line Textures** — Mengimplementasikan background repeating horizontal lines dan noise texture halus pada layout dasar untuk mencegah tampilan flat digital.

### Public Form & Confirmation Experience

- [ ] **EDIT-06**: **Public Form & Stepper Editorial Experience** — Merombak `/f/[slug]` dan `AttendanceForm.tsx` dengan judul langkah serif berukuran besar, field input bergaris bawah 2px tanpa radius, radio/checkbox kotak siku dengan inversi biner saat dipilih, dan signature canvas berbingkai hitam tegas.
- [ ] **EDIT-07**: **Editorial Success & Confirmation Screen** — Menata ulang `/success` dengan judul serif tebal, pembatas garis tebal 4px, badge monospace, dan tombol aksi berinversi instan.

### Admin Suite & Form Builder

- [ ] **EDIT-08**: **Admin Suite & Form Builder Editorial Transformation** — Menyelaraskan `/admin/login`, `/admin/forms`, `/admin/forms/[id]/edit`, dan `/admin/forms/[id]/submissions` dengan tab langkah bersiku 90 derajat, kartu field bergaris arsitektural, toolbar mengambang berbingkai kontras tinggi, dan tabel kiriman editorial.

### Dual-Theme Parity & Quality Verification

- [ ] **EDIT-09**: **Dual-Theme Inverted Contrast & Quality Assurance** — Sinkronisasi Dark Mode (kanvas murni #000000 dengan garis dan teks murni #FFFFFF) dan verifikasi menyeluruh melalui Vitest test suite, ESLint, TypeScript compiler, dan Next.js production build.

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| EDIT-01 | Phase 24 | Planned |
| EDIT-02 | Phase 24 | Planned |
| EDIT-03 | Phase 24 | Planned |
| EDIT-04 | Phase 24 | Planned |
| EDIT-05 | Phase 24 | Planned |
| EDIT-06 | Phase 25 | Planned |
| EDIT-07 | Phase 25 | Planned |
| EDIT-08 | Phase 26 | Planned |
| EDIT-09 | Phase 27 | Planned |

---

*Milestone initiated: 2026-09-27*
