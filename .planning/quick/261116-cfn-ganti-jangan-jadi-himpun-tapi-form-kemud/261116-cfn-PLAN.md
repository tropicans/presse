---
quick_id: 261116-cfn
slug: ganti-jangan-jadi-himpun-tapi-form-kemud
date: 2026-11-16
status: complete
---

# Quick Task 261116-cfn Plan: Rename Project Metadata to Form & Analyze Google Drive Upload Feasibility

## Goal
1. Menyelesaikan pembersihan identitas `HIMPUN` menjadi `Form` pada metadata proyek, dokumentasi root (`AGENTS.md`, `README.md`, `package.json`), dan memastikan kode runtime (`src/**`, `vitest.config.ts`) bersih dari sisa penamaan `Himpun`.
2. Menyusun analisis arsitektur lengkap untuk fitur unggah berkas (file upload) pengguna yang disimpan ke Google Drive pada aplikasi `Form`.

## Tasks

### Task 1: Finalize Project Rename (`HIMPUN` -> `Form`)
- **Files:** `AGENTS.md`, `README.md`, `package.json`, `src/components/FormLogo.tsx`, `vitest.config.ts`
- **Action:**
  1. Ubah judul/overview proyek di `AGENTS.md` dan `README.md` dari `HIMPUN` menjadi `Form`.
  2. Ubah field `"name"` di `package.json` dari `"himpun"` menjadi `"form"`.
  3. Pastikan seluruh referensi `HimpunLogo` di `src/**` telah beralih ke `FormLogo` dan `vitest.config.ts` memakai nama DB default `form`.
- **Verify:** `rg -i "himpun" src vitest.config.ts package.json README.md` hanya menyisakan catatan historis `(formerly HIMPUN / isian)` di `AGENTS.md`.

### Task 2: Architectural & Feasibility Analysis for Google Drive File Upload
- **Files:** `.planning/quick/261116-cfn-ganti-jangan-jadi-himpun-tapi-form-kemud/261116-cfn-SUMMARY.md`
- **Action:**
  1. Dokumentasikan hasil analisis kelayakan penyimpanan Google Drive untuk upload pengguna publik maupun admin.
  2. Rangkum perbandingan metode autentikasi Google Drive (Service Account + Shared Drive vs OAuth2 User Refresh Token untuk akun Google personal), alur upload (`Deferred Upload` + `Postgres bytea spool` + background worker), keamanan (`magic-byte` validation, private serving route `/api/files/[id]`), serta estimasi perubahan skema database dan dependensi.
- **Verify:** Dokumen summary dan analisis tersedia lengkap.
