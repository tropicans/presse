# Phase 43 Plan: Public Form & Live Preview Renderer

**Phase:** 43  
**Goal:** Merender komponen visual checkbox persetujuan monokromatis berstandar aksesibilitas tinggi pada form publik (`AttendanceForm.tsx`) dan live preview admin (`AdminFormPreview.tsx`), lengkap dengan validasi langkah client-side dan auto-focus.  
**Requirements:** AGREE-04, AGREE-05  

## Tasks

### Task 1: Checkbox Styling in globals.css (AGREE-04)
- **Files:** `src/app/globals.css`
- **Actions:**
  - Tambahkan kelas `.checkbox-agreement-group`, `.checkbox-agreement-card`, `.checkbox-agreement-control`, `.checkbox-agreement-box`, `.checkbox-agreement-check`, `.checkbox-agreement-text` di `globals.css`.
  - Pastikan styling mendukung tema gelap (default) dan tema terang dengan kontras tinggi dan efek hover/focus.

### Task 2: Implement Checkbox in AttendanceForm.tsx with Instant Error Clear & Validation (AGREE-04, AGREE-05)
- **Files:** `src/components/AttendanceForm.tsx`
- **Actions:**
  - Tambahkan fungsi handler `handleCheckboxChange` yang memperbarui state form dan auto-clears error.
  - Perbarui `validateFields` agar mengecek `field.type === 'checkbox'` dan menghasilkan pesan error jika `required` dan belum disetujui.
  - Render elemen kartu checkbox di perulangan field `AttendanceForm.tsx`.
  - Pastikan auto-scroll dan focus bekerja saat validasi gagal.

### Task 3: Implement Checkbox in AdminFormPreview.tsx (AGREE-04)
- **Files:** `src/components/AdminFormPreview.tsx`
- **Actions:**
  - Render elemen kartu checkbox di `AdminFormPreview.tsx` agar admin dapat menguji interaksi centang pada tab preview.
  - Tambahkan handler `handleCheckboxChange` pada preview component.

### Task 4: Automated Verification
- **Files:** Unit tests, lint, tsc
- **Actions:**
  - Jalankan `npm test`, `npx tsc --noEmit`, dan `npm run lint`.
