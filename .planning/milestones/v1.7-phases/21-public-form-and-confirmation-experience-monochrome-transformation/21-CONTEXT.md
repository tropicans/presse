# Phase 21: Public Form & Confirmation Experience Monochrome Transformation — Context & Decisions

**Phase:** 21  
**Milestone:** v1.7 Monochrome Design System Overhaul  
**Status:** Locked Decisions (Recommended)  
**Date:** 2026-09-27  

## Context & Intent
Menyelaraskan seluruh antarmuka pengisian formulir publik (`/f/[slug]`) dan halaman konfirmasi (`/success`) ke estetika **The Monochrome Ledger**, memastikan pengguna merasakan pengalaman pengisian formulir yang fokus, bersih, elegan, dan kontras tinggi.

## Locked Decisions (Recommended Options Selected)

### 1. Stepper Navigation & Form Cards
- **Stepper Dots:** Lingkaran bernomor dengan hairline border tipis `1px solid var(--border-default)` untuk langkah belum aktif, dan solid inverted (`#09090b` di Light / `#fafafa` di Dark) untuk langkah aktif/selesai.
- **Card Containers:** Kartu form menggunakan `var(--bg-surface)` dengan hairline border `1px solid var(--border-default)`, tanpa border tebal atau latar berwarna biru.

### 2. Form Inputs, Radio Pills & Checkboxes
- **Inputs & Textareas:** Border 1px `var(--border-default)` bertransisi halus ke ring fokus kontras tinggi tanpa glow warna-warni.
- **Radio & Checkbox Options:** Card options menggunakan latar netral dan border tipis. Ketika dipilih (*checked*), border menjadi solid hitam/putih dengan latar sedikit terangkat (`var(--primary-100)` atau aksen monokrom), menggantikan background teal lama.
- **Skala Likert:** Nomor skala disajikan dalam pill monokromatis yang tegas dengan kontras jelas saat dipilih.

### 3. Digital Signature Pad Canvas
- **Stroke Color:** Tinta tanda tangan disesuaikan secara dinamis: `#09090b` pada Light mode dan `#ffffff` pada Dark mode (menggunakan observer/ref sinkronisasi tema).
- **Surface:** Kanvas bersih dengan border hairline presisi dan tombol "Hapus Tanda Tangan" bergaya ghost button.

### 4. Public Success Confirmation (`/success`)
- **Success Badge:** Ikon centang monokromatis tegas (lingkaran solid hitam/putih dengan ikon kontras tinggi) disertai teks konfirmasi jelas dan ringkasan ID pengiriman dalam monospace box monokrom.
- **Aksi Lanjutan:** Tombol "Isi Lagi" atau "Kembali" menggunakan gaya primary solid dan secondary outline monokrom.

## Scope Boundaries
- **In Scope:**
  - `src/components/AttendanceForm.tsx` & CSS terkait public form di `src/app/globals.css`.
  - `src/app/success/page.tsx` & styling kartu sukses.
  - Skala Likert dan kanvas SignaturePad publik.
- **Out of Scope:**
  - Admin dashboard, form builder editor & admin submissions -> Phase 22.
