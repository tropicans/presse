# Phase 42 Plan: Admin Form Editor Integration

**Phase:** 42  
**Goal:** Mengintegrasikan opsi field `Persetujuan (Checkbox)` ke dalam builder `AdminFormEditor.tsx` sehingga admin dapat menambah dan mengonfigurasi klausul persetujuan secara visual.  
**Requirements:** AGREE-03  

## Tasks

### Task 1: Update fieldTypeOptions and Palette in AdminFormEditor.tsx (AGREE-03)
- **Files:** `src/components/AdminFormEditor.tsx`
- **Actions:**
  - Tambahkan `'checkbox'` ke array `fieldTypeOptions`.
  - Pastikan tombol `+ Persetujuan` muncul di toolbar dan dropdown tipe pertanyaan.

### Task 2: Enhance Checkbox Card Configuration UI (AGREE-03)
- **Files:** `src/components/AdminFormEditor.tsx`
- **Actions:**
  - Sesuaikan input label untuk `checkbox` agar menggunakan `<textarea>` multiline responsif untuk kenyamanan menulis teks pernyataan/klausul yang panjang.
  - Sediakan teks placeholder disclaimer yang representatif.
  - Sediakan teks label toggle wajib: *"Wajib disetujui untuk melanjutkan / mengirim formulir"*.
  - Sediakan teks deskripsi bantuan kontekstual untuk field persetujuan.

### Task 3: Verification & Test Suite
- **Files:** `src/components/AdminFormEditor.tsx`, tests
- **Actions:**
  - Jalankan `npx tsc --noEmit` dan `npm run lint`.
  - Jalankan `npm test` untuk memastikan semua test lulus tanpa regresi.

## Verification
- `npm test` lulus.
- `npx tsc --noEmit` bersih.
- `npm run lint` bersih.
