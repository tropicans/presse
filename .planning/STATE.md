---
gsd_state_version: "1.0"
milestone: v2.3
current_phase: 53
current_phase_name: Hardening, GC Tuning & QA
status: complete
stopped_at: Completed Phase 53
last_updated: "2026-11-16T17:25:00.000Z"
last_activity: 2026-11-16
last_activity_desc: Phase 53 complete - Hardening, EXIF stripping, payload bounds, and QA verified
state_head: HEAD
progress:
  total_phases: 8
  completed_phases: 8
  total_plans: 14
  completed_plans: 14
  percent: 100
milestone_name: File Upload & MinIO Object Storage
---

# Project State: Form — File Upload & MinIO Object Storage

## Project Reference

See: [.planning/PROJECT.md](file:///c:/Users/yudhiar/Downloads/oprek/Dev/jott/.planning/PROJECT.md) (updated 2026-11-16)  
Archived Requirements: [.planning/milestones/v2.2-REQUIREMENTS.md](file:///c:/Users/yudhiar/Downloads/oprek/Dev/jott/.planning/milestones/v2.2-REQUIREMENTS.md)  
Roadmap: [.planning/ROADMAP.md](file:///c:/Users/yudhiar/Downloads/oprek/Dev/jott/.planning/ROADMAP.md)  

**Core value:** Memungkinkan pembuatan dan pengisian formulir publik secara dinamis, andal, cepat, dan aman dengan dukungan visual yang compact, modern, dan bernilai guna tinggi.  
**Milestone status:** In progress (v2.3). v2.2 shipped 2026-10-01.

## Current Position

Phase: 53 — Hardening, GC Tuning & QA
Plan: 53-01 complete
Status: complete
Last activity: 2026-11-16 — Phase 53 verified: image EXIF/metadata stripping, 12MB body bounding, 246 unit tests passed, container rebuild & health check ok

## Phases Summary

- [x] Phase 41: Database Schema Migration & Core Domain Engine (AGREE-01, AGREE-02) (Completed 2026-10-01)
- [x] Phase 42: Admin Form Editor Integration (AGREE-03) (Completed 2026-10-01)
- [x] Phase 43: Public Form & Live Preview Renderer (AGREE-04, AGREE-05) (Completed 2026-10-01)
- [x] Phase 44: Submissions, Excel Export & Analytics Integration (AGREE-06) (Completed 2026-10-01)
- [x] Phase 45: Multi-Tier Verification, Automated Testing & Container Health (AGREE-07) (Completed 2026-10-01)
- [x] Phase 46: Foundation — Schema, Field Plumbing, MinIO Client & Credentials (FILE-01..FILE-05) (Completed 2026-11-16)
- [x] Phase 47: File Field Config, Builder, Editor & Renderer (FILE-06, FILE-07) (Completed 2026-11-16)
- [x] Phase 48: Storage Abstraction & Postgres bytea Spool Layer (Completed 2026-11-16)
- [x] Phase 49: Public Upload API & Client Upload Component (FILE-08..FILE-12) (Completed 2026-11-16)
- [x] Phase 50: Sync Worker, Queue Processing, Retry & Orphan GC (FILE-13..FILE-16, FILE-25) (Completed 2026-11-16)
- [x] Phase 51: Private File Serving Route (FILE-17, FILE-18, FILE-19) (Completed 2026-11-16)
- [x] Phase 52: Admin Surfaces & Export Integration (FILE-20..FILE-24) (Completed 2026-11-16)
- [x] Phase 53: Hardening, GC Tuning & QA (FILE-26..FILE-29) (Completed 2026-11-16)

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| First-Class `CHECKBOX` Field Type | Menambahkan nilai `'CHECKBOX'` pada enum PostgreSQL `FieldType` dan `FormFieldType` agar tipe field persetujuan/checkbox menjadi first-class citizen tanpa merusak field yang sudah ada | Diterapkan (Phase 41) |
| Normalized Boolean Consent Value | Menyimpan nilai jawaban sebagai `'true'` / `'Setuju'`, dan mewajibkan nilai truthy saat `required: true` | Diterapkan (Phase 41) |
| Accessible Single-Checkbox Pattern | Menggunakan hidden native input `<input type="checkbox">` dengan custom box visual dan label klik penuh untuk mematuhi standar aksesibilitas WCAG dan keyboard navigation (Tab/Space) | Diterapkan (Phase 43) |
| Single-Folder Migration (D-11) | Satu folder `20261116000000_add_file_upload_tables` berisi `ALTER TYPE FieldType ADD VALUE 'FILE'` + 2 `CREATE TABLE IF NOT EXISTS`; `prisma migrate deploy` menerima keduanya dalam satu transaksi | Risiko OQ-3 tidak terjadi, contingency split-folder tidak dipakai (Phase 46-01) |
| BYTEA Read Normalized to Buffer | `@prisma/adapter-pg` mengembalikan BYTEA sebagai `Uint8Array`, bukan `Buffer`; `readFileUploadPayload` menormalkan via `Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength)` di batas helper | Diterapkan (Phase 46-01) |
| **Drive → MinIO (revisi arsitektur)** | Google Drive terbukti mustahil: tidak ada tenant Workspace, `canCreateDrives: false`, `drives.list: []`, folder My Drive dengan `storageQuota.limit: "0"`, `files.get` @ `drive.file` → 404. Klien/kredensial/probe/paket Drive dicabut; MinIO self-hosted di compose stack yang sama | Diterapkan (Phase 46-04) |
| Degraded-Only Storage Probe (D-01 revisi) | MinIO hidup di stack yang sama, jadi tidak ada kelas kegagalan boot yang layak membuat proses crash. Kredensial invalid atau bucket absen → degraded + re-probe 60 detik; spool `file_upload_jobs` menyerap submission | Diterapkan (Phase 46-04) |
| Deterministic Object Key (D-13) | `buildObjectKey(fileId)` = `files/<fileId>`, tanpa timestamp atau suffix acak; PUT S3 idempoten per key, retry menimpa objek yang sama sehingga rekonsiliasi duplikat tidak pernah diperlukan | Diterapkan (Phase 46-04) |
| Object Identity = `(bucket, object_key)` (D-14) | Unique index parsial `submission_files_bucket_object_key_key` mencerminkan identitas objek sebenarnya, bukan key saja | Diterapkan (Phase 46-04) |
| Monochrome Inert File Dropzone (D-05, D-06) | Render file field as dashed monochrome dropzone with SVG upload icon, label, format & size instruction, inert 'Pilih Berkas' button, and footnote notice | Diterapkan (Phase 47-02) |
| MinIO Tanpa Port Host | Console dan API tidak boleh publik; service `minio` tidak punya `ports:` mapping dan hanya terjangkau di network compose | Diterapkan (Phase 46-04) |
| FileField Lossless Settings (D-01..D-08) | `fileConfigs` disimpan di `settings_json` dengan batas `maxSizeMB` 10 MB, 4 preset format, dan mapping preview parity | Diterapkan (Phase 47-01) |
| Decoupled Preset Helper Exports | `getFilePresetLabel`, `getFilePresetShortLabel`, dan `getFileConstraintText` ditempatkan di `admin-form-preview.ts` dan dire-export di `forms.ts` untuk mencegah bundel browser mengimpor dependensi server Node.js | Diterapkan (Phase 47-01) |

## Quick Tasks Completed

| Slug | Date | Description | Status |
|------|------|-------------|--------|
| `20260928-align-admin-login-global-design` | 2026-09-28 | Perombakan halaman login admin agar selaras dengan Global Editorial Minimalist Monochrome Design System | Complete ✓ |
| `20260928-rename-to-form-and-set-icon` | 2026-09-28 | Mengganti nama aplikasi menjadi Form dan memperbarui icon web app & favicon dengan icon baru | Complete ✓ |
| `20260928-fix-canonical-invite-url-origin` | 2026-09-28 | Perbaikan origin URL tautan undangan admin agar memprioritaskan domain kanonikal (NEXTAUTH_URL/form.ppkasn.id) dan menyaring host 0.0.0.0 | Complete ✓ |
| `20260928-form-field-copy-from-feature` | 2026-09-28 | Fitur salin nilai pertanyaan (Checkbox 'Sama dengan...') pada Form Builder, Public Form, dan Live Preview | Complete ✓ |
| `261116-d2w-ganti-dari-himpun-menjadi-form` | 2026-11-16 | Hapus sisa identitas Himpun di kode runtime: rename `HimpunLogo` → `FormLogo` di 12 konsumen, buang class `himpun-logo-*`, bersihkan nama DB default `himpun` di `vitest.config.ts` | Complete ✓ |
| `261116-cfn-ganti-jangan-jadi-himpun-tapi-form-kemud` | 2026-11-16 | Finalisasi perubahan nama `HIMPUN` → `Form` di `package.json`, `README.md`, `AGENTS.md` serta analisis arsitektur fitur upload file | Complete ✓ |

## Performance Metrics

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 46 P01 | 1h 10m | 3 tasks | 8 files |
| Phase 46 P02 (superseded) | 65min | 6 tasks | 13 files |
| Phase 46 P04 | ~2h 30m | 6 tasks | 21 files |
| Phase 47 P01 | 45m | 3 tasks | 4 files |
| Phase 48 P01 | 15m | 2 tasks | 5 files |

## Decisions

- [Phase 46]: OQ-4 NO: no serverExternalPackages entry needed; standalone boot proved it
- [Phase 46]: A3 proven: instrumentation fires under output:standalone
- [Phase 46]: `@prisma/adapter-pg` returns BYTEA as `Uint8Array` — normalise at the helper boundary
- [Phase 46]: `vitest.config.ts` pins a stub `DATABASE_URL`; live-DB tests must use `LIVE_DB=1` + `LIVE_DATABASE_URL`
- [Phase 46]: `server-only` throws under vitest — `vi.mock('server-only', () => ({}))` first
- [Phase 46]: MinIO image pinned by digest `sha256:14cea493d9a34af32f524e538b8346cf79f3321eff8e708c1e2960462bd8936e`
- [Phase 46]: host port 9000 is owned by another MinIO (`titan-minio`); smoke runs inside `jott_default` network
- [Phase 46]: `file-type@22.3.0` is ESM-only — `import` only
- [Phase 47]: Decouple preset formatting helpers to `admin-form-preview.ts` so client components do not pull server modules into browser bundle
- [Phase 48]: Nullable bytea payload in `file_upload_jobs` allows zero-bloat spool release upon sync
- [Phase 48]: `submission_files` default status set to `PENDING_UPLOAD` with strict forward transitions (`QUEUED`, `SYNCED`, `FAILED`, `ORPHANED`)
- [Phase 48]: Atomic raw-SQL transaction links `submission_files` to `submission_id` and advances status to `QUEUED`
- [Phase 48]: `src/lib/file-jobs.ts` acts as a backward-compatible wrapper delegating to `src/lib/file-storage.ts`

## Session

**Last session:** 2026-11-16T15:29:00.000Z
**Stopped at:** Completed 48-01-PLAN.md
**Resume file:** .planning/phases/48-storage-abstraction-postgres-bytea-spool-layer/48-02-PLAN.md
