---
quick_id: 261116-d2w
slug: ganti-dari-himpun-menjadi-form
date: 2026-11-16
status: complete
tasks_completed: 3
tasks_total: 3
commits:
  - 332675d
  - 9807d6a
---

# Quick Task 261116-d2w: Ganti dari Himpun menjadi Form — Summary

Menghapus seluruh sisa identitas `Himpun` di kode sumber runtime dan menggantinya ke `Form` — komponen logo, class CSS legacy, dan nama database default di konfigurasi test. Semua referensi `Himpun|himpun` di `src/**` dan `vitest.config.ts` kini nol.

## Tasks

### Task 1: Rename komponen logo + class CSS (`332675d`)

- `src/components/FormLogo.tsx` ditambahkan sebagai sumber kebenaran (versi bersih, tanpa class `himpun-*`).
- 12 konsumen import dipindah ke `@/components/FormLogo`:
  - `src/app/admin/login/page.tsx`
  - `src/app/success/page.tsx`
  - `src/components/AdminFormEditor.tsx`
  - `src/components/AdminFormPreview.tsx`
  - `src/components/AdminFormPreviewPage.tsx` (relative `'./HimpunLogo'` → alias)
  - `src/components/AdminFormSubmissions.tsx` (3 usage)
  - `src/components/AdminFormsList.tsx`
  - `src/components/AdminInviteClaim.tsx`
  - `src/components/AdminTable.tsx`
  - `src/components/AdminUsersManagement.tsx`
  - `src/components/PublicFormPage.tsx`
  - `src/components/PublicFormShell.tsx`
- `src/components/HimpunLogo.tsx` dihapus.
- Verifikasi: `rg -n "Himpun|himpun" src` → 0 hasil.

### Task 2: Bersihkan nama `himpun` di konfigurasi test (`9807d6a`)

- `vitest.config.ts`: `DATABASE_URL` default DB `himpun` → `form`.
- Verifikasi: `rg -n "himpun" vitest.config.ts` → 0 hasil.

### Task 3: Validasi + rebuild container

- `npm test` → 16 files / 135 tests passed.
- `npm run lint` → exit 0.
- `npx tsc --noEmit --pretty false` → exit 0.
- `npm run build` → exit 0.
- `docker compose --env-file .env.production build app worker` → image `isian-runtime:local` built.
- `docker compose --env-file .env.production up -d --no-deps app worker` → app healthy, worker started; postgres tidak disentuh.
- Health check `http://127.0.0.1:3456/api/health` → `{"status":"ok"}`.

## Deviations

Tidak ada. Plan dieksekusi sesuai rencana.

## Notes

- Pre-existing perubahan pada `AGENTS.md`, `README.md`, `package.json` adalah work-in-progress user; sengaja dibiarkan unstaged (tidak disentuh).
- Git mencatat rename `HimpunLogo.tsx` → `FormLogo.tsx` (79% similarity) karena isi file sebagian identik; isi final `FormLogo.tsx` sudah bersih (0 referensi `himpun`).
- File PLAN.md / SUMMARY.md / STATE.md tidak di-commit — orchestrator yang menangani.
