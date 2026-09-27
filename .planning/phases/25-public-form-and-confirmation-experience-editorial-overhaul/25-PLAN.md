---
phase: 25
plan: 1
title: "Public Form & Confirmation Experience Editorial Overhaul"
wave: 1
dependencies: [24]
requirements: [EDIT-06, EDIT-07]
status: planned
---

# Plan 25.1: Public Form & Confirmation Experience Editorial Overhaul

## Objective
Merombak seluruh antarmuka publik formulir (`AttendanceForm.tsx`, `PublicFormShell.tsx`, `PublicFormPage.tsx`, `/f/[slug]`) dan layar konfirmasi `/success` dengan tipografi serif klasik, baris/kolom arsitektural terukur, radio/checkbox kotak siku dengan inversi biner saat dipilih, dan signature canvas berbingkai tegas.

## Tasks

### Task 1: Public Form CSS Rules & Architectural Enhancements
- **Target File:** `src/app/globals.css`
- **Actions:**
  - Perbarui gaya `.public-ledger-page`, `.form-card`, `.public-ledger-card`:
    - Gunakan border solid 2px tebal (`#000000` / `#ffffff`) dan garis arsitektural 4px untuk pemisah header.
    - Judul `.header-title` menggunakan `var(--font-family-display)` (Playfair Display) dengan ukuran besar dan letter-spacing yang anggun.
    - Stepper `.form-step-shell`, `.form-step-badge`, dan `.form-step-bar`:
      - Bar progress tebal 4px tanpa radius.
      - Badge monospace (`JetBrains Mono`) dengan format uppercase bersih.
  - Perbarui styling input form `.form-input`, `.form-textarea`, `.form-select`:
    - Border 2px solid dengan sudut siku tajam (0px radius).
    - Fokus tegas: outline 2px solid hitam/putih murni.
  - Perbarui styling `.radio-label` & `.likert-option`:
    - Bentuk kotak bersiku tajam.
    - Status terpilih (`:has(.radio-input:checked)`) mengalami binary inversion (latar belakang hitam murni dengan teks putih pada light mode, atau sebaliknya pada dark mode).
  - Perbarui styling `.submit-btn` & `.submit-btn-secondary`:
    - Tombol hitam pekat dengan border 2px solid, teks putih, transisi instan terinversi saat hover.
  - Perbarui styling `.signature-container` dan `.signature-canvas`:
    - Border 2px solid, tombol bersihkan bergaya monospace berbingkai tajam.

### Task 2: Refactor Public Form Component Markup & Stepper Titles
- **Target Files:**
  - `src/components/PublicFormShell.tsx`
  - `src/components/AttendanceForm.tsx`
- **Actions:**
  - Tambahkan aksen garis arsitektural 4px pada pembatas header form.
  - Sempurnakan tampilan stepper progress dan judul langkah agar mencerminkan nomor urut editorial (misal `01. IDENTITAS PESERTA`).
  - Pastikan tombol navigasi ("Lanjut", "Kembali", "Kirim Formulir") memanfaatkan kelas tombol biner editorial.

### Task 3: Editorial Success & Confirmation Screen Refactoring
- **Target File:** `src/app/success/page.tsx`
- **Actions:**
  - Ubah layout `.success-card`:
    - Judul konfirmasi dengan font serif `Playfair Display`.
    - Ikon centang di dalam kotak bersiku tajam solid kontras tinggi.
    - Garis pembatas tebal 4px di bawah judul.
    - Kartu ringkasan kuis `.success-summary-card` dengan border 2px solid, font monospace untuk skor, dan badge status bersiku tajam.
    - Tombol "Isi Form Lagi" menggunakan styling tombol editorial biner.

### Task 4: Tests & Lint Verification
- **Target Files:** `src/app/globals.test.ts`, test suite
- **Actions:**
  - Tambahkan pengujian CSS/komponen untuk memverifikasi kelas dan gaya editorial form publik.
  - Jalankan `npm test` dan `npm run lint`.

## Verification Criteria
- [ ] Form publik menampilkan judul serif Playfair Display dan pembatas 4px.
- [ ] Input teks, textarea, dropdown, dan signature pad memiliki border tegas 2px tanpa radius.
- [ ] Pilihan radio dan likert memiliki transisi binary inversion saat dipilih.
- [ ] Halaman `/success` menampilkan judul serif, ikon kotak siku tegas, dan kartu ringkasan kuis bergaris arsitektural.
- [ ] Seluruh unit test dan linting lolos 100%.
