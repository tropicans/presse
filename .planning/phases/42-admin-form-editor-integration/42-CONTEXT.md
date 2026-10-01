# Phase 42 Context: Admin Form Editor Integration

**Phase:** 42  
**Goal:** Mengintegrasikan opsi field `Persetujuan (Checkbox)` ke dalam builder `AdminFormEditor.tsx` sehingga admin dapat menambah dan mengonfigurasi klausul persetujuan secara visual.  
**Requirements:** AGREE-03  

## Locked Decisions & Technical Approach

1. **Field Palette & Types (`AdminFormEditor.tsx`):**
   - Tambahkan `'checkbox'` ke dalam `fieldTypeOptions`.
   - Tetapkan label di `fieldTypeLabels['checkbox'] = 'Persetujuan'`.
   - Tombol penambahan di toolbar otomatis menampilkan `+ Persetujuan`.
   - Dropdown tipe field di kartu pertanyaan memungkinkan perubahan tipe ke/dari `Persetujuan`.

2. **Field Configuration Card Body:**
   - Untuk field bertipe `'checkbox'`:
     - Tampilkan label input sebagai multiline `<textarea>` dengan placeholder kontekstual klausul/disclaimer (misal: *"Saya memahami bahwa pembentukan atau pelengkapan tim bergantung pada ketersediaan peserta dan tidak dijamin oleh panitia"*).
     - Tidak merender daftar opsi (karena berupa single consent checkbox).
     - Checkbox wajib diisi menampilkan keterangan yang jelas: *"Wajib disetujui untuk melanjutkan / mengirim formulir"*.
     - Tampilkan hint bantuan yang mengonfirmasi bahwa kotak centang akan ditampilkan di form publik.

3. **Card Summary & Outline Integration:**
   - Collapsed card header menampilkan badge `Persetujuan` dan status `Wajib`.
   - Outline panel "Peta Formulir" di bilah samping menampilkan `#N [Label] (Persetujuan)`.
   - Aksi duplikasi (`duplicateField`), reorder (`moveField`), dan hapus (`removeField`) berfungsi penuh tanpa error.
