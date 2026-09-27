# Phase 25: Public Form & Confirmation Experience Editorial Overhaul — Context & Decisions

**Phase:** 25  
**Milestone:** v1.8 Editorial Minimalist Monochrome Transformation  
**Status:** Locked Decisions (Recommended)  
**Date:** 2026-09-27  

## Context & Intent
Merombak seluruh antarmuka publik formulir (`AttendanceForm.tsx`, `PublicFormShell.tsx`, `PublicFormPage.tsx`, `/f/[slug]`) dan layar konfirmasi pengiriman (`/success`) ke estetika **Editorial Minimalist Monochrome**. Halaman formulir harus menghadirkan pengalaman layaknya mengisi lembar kuesioner koran/arsitektur kelas atas: tipografi serif yang anggun, penomoran monospace terstruktur, batas garis arsitektural terukur, radio/checkbox kotak dengan inversi biner pekat, dan canvas tanda tangan bersiku tajam.

## Locked Decisions (Recommended Options Selected)

### 1. Form Header & Stepper Editorial Hierarchy
- **Header:** Judul form menggunakan font serif `Playfair Display` dengan bobot tegas (700) dan ukuran besar (2.25rem–2.75rem), dipisahkan dari konten menggunakan garis pembatas 4px (`--line-heavy`).
- **Stepper Progress:** Menggunakan penomoran monospace (`JetBrains Mono`, format `[ 01 / 04 ]` atau `LANGKAH 01 / 04`), bar progres berupa garis tebal 4px tanpa radius, dan judul langkah aktif berukuran besar dengan font serif.
- **Eyebrow / Overline:** Badge kategori dan indikator langkah menggunakan font monospace berhuruf kapital dengan tracking 0.05em.

### 2. Form Input Fields & Selection Controls
- **Inputs & Textareas:** Latar belakang putih/hitam murni dengan bingkai tegas 2px solid (`#000000` di light mode, `#FFFFFF` di dark mode), sudut siku 90 derajat (0px radius), fokus ring solid 2px tanpa blur.
- **Radio & Checkbox (Binary Inversion):** Mengganti lingkaran radio dengan indikator kotak siku tajam. Opsi yang dipilih mengalami inversi warna kontras tinggi (latar belakang menjadi hitam pekat dengan teks putih pada light mode).
- **Likert Grid:** Kotak angka skala Likert bersiku tajam dengan garis grid 1-2px dan transisi instan ketika opsi diklik.
- **Digital Signature:** Kanvas tanda tangan dikelilingi border 2px solid hitam/putih dengan tombol "Hapus / Bersihkan" monospace berbingkai tajam.

### 3. Navigation Controls & Micro-Interactions
- **Submit / Next Button:** Tombol aksi utama berwarna hitam pekat `#000000` dengan teks putih, sudut 0px, berbingkai 2px, bertransisi instan (<100ms) menjadi latar putih teks hitam saat hover (Binary Inversion).
- **Previous Button:** Tombol sekunder berbingkai 2px dengan latar transparan yang terinversi saat disentuh pointer.
- **Field Error Feedback:** Pesan kesalahan ditampilkan di bawah input dengan border kiri 3px solid hitam pekat atau merah desaturasi berlatar kontras, font monospace kecil, dan ikon segitiga/seru minimalis.

### 4. Editorial Success & Confirmation Screen (/success)
- **Title & Layout:** Header "Konfirmasi Pengiriman" menggunakan `Playfair Display`, dipadukan garis aksen arsitektural 4px.
- **Success Checkmark:** Ikon centang di dalam kotak bersiku tajam berlatar hitam pekat dengan centang putih murni.
- **Quiz Summary Card:** Kartu ringkasan kuis berbingkai arsitektural 2px solid dengan tabel skor monospace (`JetBrains Mono`) dan badge status LULUS / BELUM LULUS bergaris ganda.
- **Action Links:** Tombol "Isi Form Lagi" dengan gaya tombol editorial biner.

## Scope Boundaries
- **In Scope:**
  - `src/components/AttendanceForm.tsx` & stylesheet pendukung di `src/app/globals.css`.
  - `src/components/PublicFormShell.tsx` & `src/components/PublicFormPage.tsx`.
  - `src/app/success/page.tsx` & `/success` layout/styling.
  - Radio, checkbox, inputs, signature pad, likert grids pada form publik.
- **Out of Scope (Deferred to Phase 26):**
  - Admin login, admin forms list, admin form editor builder, dan tabel submissions.
