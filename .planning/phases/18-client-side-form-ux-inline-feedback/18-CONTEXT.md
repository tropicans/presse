# Phase 18 Context: Client-Side Form UX & Inline Error Feedback

## Overview
Phase 18 enhances the client-side user experience across public forms (`AttendanceForm.tsx`) and admin preview (`AdminFormPreview.tsx`). It provides immediate, helpful contextual guidance, appropriate mobile keyboard layouts (`numeric`, `email`, `tel`), hybrid error clearing when users start correcting invalid fields, and smooth auto-scroll/focus targeting the first invalid field.

## Requirements
- **VALID-06**: Hybrid Error Clearance & Inline Feedback (error on step-next/submit, instant clear on input edit)
- **VALID-07**: Smooth Focus & Auto-Scroll to First Error (scrollIntoView to first invalid field)
- **VALID-08**: Consistent Field Hints & Mobile Input Modes (format hints, appropriate inputModes)
- **VALID-09**: Admin Form Preview Alignment (identical hints, sanitization, and inputModes in preview)

## Locked Implementation Decisions (Recommended)

1. **Inline Field Guidance & Mobile Keyboards:**
   - Detect field types using `isNipNrpField`, `isEmailField`, `isPhoneField`, and `isNameField` from `@/lib/form-validation`.
   - **NIP/NRP:** `inputMode="numeric"`, hint: *"18 digit angka untuk NIP ASN atau 5–8 digit untuk NRP TNI/Polri (tanpa spasi)."*, placeholder: `Contoh: 198501012010011001`.
   - **Email:** `type="email"`, `inputMode="email"`, hint: *"Masukkan alamat email aktif (contoh: nama@domain.com)."*, placeholder: `nama@instansi.go.id`.
   - **Phone/WhatsApp:** `type="text"`, `inputMode="tel"`, hint: *"Nomor WhatsApp/telepon aktif (10-15 digit angka)."*, placeholder: `Contoh: 081234567890`.
   - **Nama Lengkap:** placeholder: `Nama lengkap sesuai identitas`.

2. **Validation & Hybrid Error Clearance:**
   - In `validateFields`, run all format validators (Email, Phone, Name, NIP, Signature) in addition to required checks.
   - When user interacts with a field (`handleChange`), automatically remove any existing error on that field so they have an unhindered typing experience.
   - When user clicks "Langkah Selanjutnya" or "Kirim", validate active visible fields; if invalid, trigger smooth scroll & focus to the first invalid field.

3. **Admin Form Preview Alignment (`AdminFormPreview.tsx`):**
   - Provide the exact same field hints, input modes, placeholders, and sanitizers so administrators testing in the editor experience the exact same flow as public participants.
