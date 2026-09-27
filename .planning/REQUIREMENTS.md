# Requirements: Milestone v1.6 Form Input Validation & Submission Integrity

**Milestone:** v1.6  
**Status:** In Progress (2026-09-27)  
**Goal:** Mengaudit, memperketat, dan menyelaraskan seluruh validasi isian form (Nama Lengkap, NIP/NRP, Nomor WhatsApp/Telepon, Email, Teks Bebas, Pilihan, dan Tanda Tangan) pada form publik dan endpoint pengiriman server-side dengan feedback pengguna yang ramah dan konsisten.

## Requirements

### Field-Specific Format Validations & Sanitization

- [ ] **VALID-01**: **NIP/NRP Validation** — Validasi 18 digit untuk NIP ASN/PPPK, 5–8 digit untuk NRP TNI/Polri, auto-sanitasi tanda baca/spasi, error jika < 5 atau 9–17 digit, dan numeric input mode.
- [ ] **VALID-02**: **Email Format Validation** — Deteksi field email (nama/label mengandung 'email'); validasi sintaks email RFC standar, auto-trim spasi, dan pesan error jelas bila format tidak valid.
- [ ] **VALID-03**: **Phone / WhatsApp Number Validation** — Deteksi field telepon/WhatsApp (nama/label 'telepon', 'whatsapp', 'no hp', 'phone'); sanitasi format (konversi awalan `+62`/`62` ke format standar, hapus spasi/strip), memastikan hanya angka dengan panjang wajar (10–15 digit), serta mengaktifkan keypad tel/numeric.
- [ ] **VALID-04**: **Full Name Validation** — Field nama lengkap (`namaLengkap` atau label mengandung 'nama') wajib minimal 2 karakter, pembersihan spasi ganda, dan penolakan karakter simbol liar/skrip.
- [ ] **VALID-05**: **Signature Canvas & Typed Signature Validation** — Validasi tanda tangan publik: jika menggunakan canvas wajib memiliki goresan minimal (mencegah canvas kosong/hanya tap 1 pixel), jika tanda tangan teks minimal 2 karakter, dan server memverifikasi data format base64 PNG yang valid.

### Client-Side Form UX & Inline Feedback

- [ ] **VALID-06**: **Hybrid Error Clearance & Inline Feedback** — Pesan error validasi muncul saat pengguna menekan tombol langkah berikutnya ("Langkah Selanjutnya") atau tombol kirim ("Kirim Formulir"), dan otomatis hilang (clear) secara instan begitu pengguna mulai memperbaiki isian pada field tersebut.
- [ ] **VALID-07**: **Smooth Focus & Auto-Scroll to First Error** — Jika terdapat field yang tidak valid pada langkah aktif atau saat submit, form secara otomatis mengarahkan fokus kursor dan menggulirkan viewport (`scrollIntoView`) ke field pertama yang bermasalah.
- [ ] **VALID-08**: **Consistent Field Hints & Mobile Input Modes** — Setiap field dengan aturan format khusus menyajikan teks bantuan (hint) yang ringkas di bawah label serta atribut `inputMode` yang tepat (`numeric`, `email`, `tel`) untuk kenyamanan pengisian di ponsel.
- [ ] **VALID-09**: **Admin Form Preview Alignment** — Pratinjau form di panel admin (`AdminFormPreview`) diselaraskan secara identik dengan aturan sanitasi, input mode, dan hint yang berlaku di form publik.

### Server-Side Integrity & Verification

- [ ] **VALID-10**: **Unified Server-Side Validation Pipeline** — Endpoint submit server (`validateFormSubmission`) menjalankan seluruh aturan sanitasi dan validasi format (Email, Telepon, NIP/NRP, Nama, Signature, Min/Max Length) sebelum menyimpan data ke database untuk mencegah bypass client.
- [ ] **VALID-11**: **Automated Test Suite for All Field Validations** — Pengujian otomatis komprehensif di `forms.test.ts` untuk seluruh skenario validasi field (skenario valid, invalid, sanitasi spasi/strip, dan error handling).

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| VALID-01 | Phase 17 | Pending |
| VALID-02 | Phase 17 | Pending |
| VALID-03 | Phase 17 | Pending |
| VALID-04 | Phase 17 | Pending |
| VALID-05 | Phase 17 | Pending |
| VALID-06 | Phase 18 | Pending |
| VALID-07 | Phase 18 | Pending |
| VALID-08 | Phase 18 | Pending |
| VALID-09 | Phase 18 | Pending |
| VALID-10 | Phase 17 | Pending |
| VALID-11 | Phase 19 | Pending |

---

*Milestone initialized: 2026-09-27*
