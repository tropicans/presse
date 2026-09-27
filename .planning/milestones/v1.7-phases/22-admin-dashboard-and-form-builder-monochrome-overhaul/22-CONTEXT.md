# Phase 22: Admin Dashboard & Form Builder Monochrome Overhaul — Context & Decisions

**Phase:** 22  
**Milestone:** v1.7 Monochrome Design System Overhaul  
**Status:** Locked Decisions (Recommended)  
**Date:** 2026-09-27  

## Context & Intent
Menyelaraskan seluruh antarmuka administrator—meliputi halaman login admin (`/admin/login`), dashboard daftar formulir (`/admin/forms`), editor form builder multi-langkah (`/admin/forms/[id]/edit`), serta tabel kiriman data (`/admin/forms/[id]/submissions`)—ke sistem desain **The Monochrome Ledger**.

## Locked Decisions (Recommended Options Selected)

### 1. Step Tabs & Active Step Bar
- **Tab Navigasi Langkah:**
  - Tab tidak aktif: background transparan/netral dengan hairline border `1px solid var(--border-default)`.
  - Tab aktif: solid `#09090b` dengan teks putih (Light mode) dan solid `#fafafa` dengan teks hitam pekat (Dark mode), menghilangkan background teal `#00483f` lama.
  - Badge jumlah field: kontras inverted yang serasi.

### 2. Collapsible Field Cards & Form Outline ("Peta Formulir")
- **Field Card:** Border 1px presisi `var(--border-default)`, header ringkas dengan badge tipe pertanyaan monokromatis (Teks, Nomor, Pilihan, Likert, TTD), dan accordion chevron kontras.
- **Peta Formulir:** Panel samping bersih dengan efek highlight target pertanyaan yang elegan saat diklik (luminous monochrome outline).
- **Floating Action Toolbar:** Backdrop blur 16px dengan border hairline dan tombol aksi "Simpan", "Pratinjau", "Tambah Pertanyaan" dalam format primary solid & secondary ghost.

### 3. Submissions Table & Sticky Column Headers
- **Sticky Column Headers:** Latar solid opaque yang serasi dengan kanvas (`var(--bg-surface)`), teks all-caps berjarak renggang (`label-sm`), dan border pemisah bawah 1px.
- **Baris Data & Zebra Striping:** Transisi kontras sangat lembut antara baris ganjil dan genap (`var(--ledger-surface-low)` / `var(--bg-surface)`).
- **Tombol Ekspor Excel:** Tombol ekspor menggunakan styling monokromatis solid/outline yang bersih.

### 4. Admin Login Suite
- Panel login terpusat dengan tipografi Manrope yang berwibawa, logo dan brand monokrom, serta tombol "Login dengan Google" yang tajam dan terpusat.

## Scope Boundaries
- **In Scope:**
  - CSS Admin di `src/app/globals.css` (termasuk `.admin-step-tab`, `.editorial-form-editor-*`, `.forms-dashboard-*`, `.submissions-dashboard-*`).
  - Halaman admin `/admin/forms/**` dan `/admin/login`.
- **Out of Scope:**
  - Form publik (sudah diselesaikan di Phase 21).
  - QA / full build regression (Phase 23).
