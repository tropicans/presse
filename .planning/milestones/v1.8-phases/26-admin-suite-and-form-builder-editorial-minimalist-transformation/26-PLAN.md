---
phase: 26
plan: 1
title: "Admin Suite & Form Builder Editorial Minimalist Transformation"
wave: 1
dependencies: [24, 25]
requirements: [EDIT-08]
status: planned
---

# Plan 26.1: Admin Suite & Form Builder Editorial Minimalist Transformation

## Objective
Menyelaraskan seluruh antarmuka admin suite (`/admin/login`, `/admin/forms`, `/admin/forms/[id]/edit`, dan `/admin/forms/[id]/submissions`) dan editor form builder (`AdminFormEditor.tsx`) ke gaya Editorial Minimalist Monochrome dengan tab langkah bersiku 90 derajat, kartu field bergaris arsitektural, toolbar mengambang berbingkai kontras tinggi, dan tabel kiriman editorial.

## Tasks

### Task 1: Refactor Admin Styles in globals.css
- **Target File:** `src/app/globals.css`
- **Actions:**
  - Perbarui `.admin-header`, `.admin-wrapper`, `.admin-table-container`, `.admin-count-badge`:
    - Border 2px solid hitam pekat/putih, border-radius 0px, tanpa shadow ambient.
    - Judul header serif `Playfair Display` dan badge jumlah monospace `JetBrains Mono`.
  - Perbarui styling Form Builder `.editorial-form-editor-*`:
    - Tab langkah `.step-tab`: border 2px solid, sudut siku 90 derajat, indikator aktif garis bawah 4px atau inversi biner.
    - Kartu pertanyaan `.field-card`: border 2px solid, header ringkasan dengan penomoran monospace 2-digit (`01.`, `02.`), tanpa radius.
    - Toolbar melayang `.floating-toolbar` / `.action-bar`: border 2px solid kontras tinggi, tombol biner instan.
    - Outline panel `.form-outline`: border hairline 1px, penanda aktif garis 4px.
  - Perbarui styling tabel submissions:
    - Sticky column header solid tanpa shadow dengan border bawah 2px.
    - Font monospace untuk ID kiriman, angka skor kuis, dan cap waktu.
  - Perbarui styling panel login admin `/admin/login`:
    - Border 2px solid, judul serif `Playfair Display`, tombol login Google biner bergaris tajam.

### Task 2: Component Alignment in Admin Suite
- **Target Files:**
  - `src/components/AdminHeader.tsx`
  - `src/components/AdminFormEditor.tsx`
  - `src/app/admin/forms/page.tsx`
  - `src/app/admin/forms/[id]/submissions/page.tsx`
- **Actions:**
  - Pastikan seluruh class name dan markup selaras dengan token editorial monochrome.
  - Verifikasi tidak ada sisa inline radius atau gradien warna lama.

### Task 3: Quality & Automated Test Verification
- **Target Files:** `src/app/globals.test.ts`, test suite
- **Actions:**
  - Tambahkan assertion pengujian untuk memverifikasi gaya editorial admin suite.
  - Jalankan `npm test` dan `npm run lint`.

## Verification Criteria
- [ ] Seluruh halaman admin (/admin/login, /admin/forms, builder editor, submissions) berbingkai arsitektural 2px solid tanpa radius.
- [ ] Tab langkah, kartu pertanyaan, outline hierarki, dan toolbar form builder berkarakter 90-degree siku tajam dengan tipografi serif/mono yang harmonis.
- [ ] Tabel submissions menggunakan header kolom monospace bergaris 2px dan perataan teks presisi.
- [ ] Seluruh tes unit vitest dan ESLint lolos tanpa peringatan.
