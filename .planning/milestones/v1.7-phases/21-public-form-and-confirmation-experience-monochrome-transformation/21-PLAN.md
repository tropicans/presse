---
phase: 21
plan: 1
title: "Public Form & Confirmation Experience Monochrome Transformation"
wave: 1
dependencies: [20]
requirements: [MONO-04, MONO-05, MONO-06]
status: planned
---

# Plan 21.1: Public Form & Confirmation Experience Monochrome Transformation

## Objective
Mentransformasi seluruh antarmuka formulir publik (`/f/[slug]`) dan halaman konfirmasi (`/success`) menjadi tampilan Monochrome High-Contrast yang elegan, bersih, dan nyaman digunakan di ponsel maupun desktop.

## Tasks

### Task 1: Refactor Public Form Styles in `globals.css`
- **Target File:** `src/app/globals.css`
- **Actions:**
  - Periksa dan ganti sisa background gradient teal/blue pada `.public-ledger-page`, `.public-ledger-card`, `.form-step-shell`, `.radio-label`, `.quiz-question-card`, `.signature-container`, dan `.form-navigation-shell`.
  - Berikan gaya monokrom pada radio pill active (`:has(.radio-input:checked)`), checkbox, dan Likert scale selector buttons.
  - Perbarui tombol navigasi publik (`.submit-btn-primary`, `.submit-btn-secondary`) dengan styling solid black/white dan outline ghost.

### Task 2: Adapt Digital Signature & Form UX in `AttendanceForm.tsx`
- **Target File:** `src/components/AttendanceForm.tsx`
- **Actions:**
  - Pastikan canvas signature pad menggunakan warna stroke tema yang adaptif (hitam pekat `#09090b` di mode terang dan putih `#fafafa` di mode gelap saat diinisialisasi atau saat tema berubah).
  - Pastikan styling stepper dan badge status form publik bersih dan konsisten dengan Monochrome tokens.

### Task 3: Monochrome Polish for Success Confirmation Page
- **Target File:** `src/app/success/page.tsx` & styling `.public-ledger-success-card` di `globals.css`
- **Actions:**
  - Tampilkan kartu sukses dalam nuansa monokromatik dengan ikon centang kontras tinggi.
  - Format box ID pengiriman dengan background netral subtle dan font monospace yang rapi.

### Task 4: Verification & Automated Test Pass
- **Actions:**
  - Jalankan `npm run lint` dan `npm run test` untuk memastikan tidak ada kesalahan TypeScript, React, atau CSS.

## Verification Criteria
- [ ] Form publik `/f/[slug]` tampil dalam gaya monokrom bersih di kedua mode (Light & Dark).
- [ ] Tombol opsi (radio/checkbox/Likert) dan signature pad berfungsi dengan kontras tinggi.
- [ ] Halaman `/success` menampilkan kartu konfirmasi monokrom.
- [ ] `npm run lint` dan `npm run test` lulus 100%.
