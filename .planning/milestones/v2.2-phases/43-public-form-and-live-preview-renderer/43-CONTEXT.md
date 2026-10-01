# Phase 43 Context: Public Form & Live Preview Renderer

**Phase:** 43  
**Goal:** Merender komponen visual checkbox persetujuan monokromatis berstandar aksesibilitas tinggi pada form publik (`AttendanceForm.tsx`) dan live preview admin (`AdminFormPreview.tsx`), lengkap dengan validasi langkah client-side dan auto-focus.  
**Requirements:** AGREE-04, AGREE-05  

## Locked Decisions & Technical Approach

1. **Accessible Monochrome Checkbox UI (AGREE-04):**
   - Struktur komponen kartu `.checkbox-agreement-card` yang membungkus input native `<input type="checkbox">` secara aksesibel (tersembunyi secara visual tanpa `display: none` agar tetap terdeteksi oleh screen readers dan keyboard `Tab`/`Space`).
   - Kotak centang kustom `.checkbox-agreement-box` dengan ikon SVG checkmark pekat kontras tinggi (inversi warna saat `:checked` sesuai tema Monokrom).
   - Seluruh area kartu dan teks pernyataan dapat diklik untuk melakukan toggle centang.
   - Dukungan subteks bantuan (placeholder) jika diisi oleh admin.
   - Sinkronisasi identik pada `AttendanceForm.tsx` (publik) dan `AdminFormPreview.tsx` (live preview admin).

2. **Client-Side Step Validation & Auto-Focus (AGREE-05):**
   - Di `validateFields` pada `AttendanceForm.tsx`:
     - Memeriksa `field.type === 'checkbox'`. Jika `field.required: true` dan belum dicentang, hasilkan pesan error: `"Pernyataan ini wajib disetujui untuk melanjutkan"`.
     - Saat validasi gagal pada langkah form, viewport melakukan auto-scroll halus dan auto-focus ke elemen checkbox pertama yang bermasalah.
   - Handler `handleCheckboxChange(name, checked)`:
     - Mengubah state form menjadi `'true'` (atau `''` jika tidak dicentang).
     - Menghapus error pada field tersebut secara instan (*instant error clearance*) saat pengguna mencentang kotak.

3. **Styling Tokens & Global CSS:**
   - Tambahkan rule set `.checkbox-agreement-*` di `src/app/globals.css` memanfaatkan CSS variable yang sudah ada (`--bg-surface-elevated`, `--text-primary`, `--border-line`, `--radius-md`).
