# Phase 46: Foundation — Schema, Field Plumbing, Drive Client & Credentials - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-11-16
**Phase:** 46 — Foundation — Schema, Field Plumbing, Drive Client & Credentials
**Areas discussed:** Startup probe, Bentuk kredensial service account, State machine & nama status, Cara migrasi diterapkan

---

## Startup probe

| Option | Description | Selected |
|--------|-------------|----------|
| Fail-fast, app tidak boot | App menolak boot; log error jelas sebut folder ID tidak Shared Drive. Container restart loop. Paling aman: mencegah diam-diam masuk spool selamanya. | ✓ |
| Boot tapi health degraded | App boot, endpoint /api/health melaporkan degraded, tapi /f/[slug] tetap menerima upload (selalu masuk spool) | |
| Opt-in lewat env flag | App boot normal; probe hanya jalan kalau env DRIVE_STRICT=1. Default longgar. | |

**User's choice:** Fail-fast, app tidak boot
**Notes:** Dilanjutkan dengan pertanyaan pembeda error.

| Option | Description | Selected |
|--------|-------------|----------|
| Ya, hanya fail keras untuk error permanen | Bedakan error permanen (bukan Shared Drive / 404 / invalid_grant → fail-fast) vs error sementara (timeout, 5xx, 429 → boot dengan WARN, spool jalan, retry probe berkala) | ✓ |
| Tidak, semua error fail-fast | Semua error termasuk timeout jaringan = app tidak boot. Sederhana tapi rapuh. | |

**User's choice:** Ya, hanya fail keras untuk error permanen
**Notes:** Rasional eksplisit: gangguan jaringan sesaat tidak boleh mematikan form publik.

| Option | Description | Selected |
|--------|-------------|----------|
| Background retry tiap 60 detik | Probe ulang tiap 60 detik di background; saat pulih, sistem keluar dari mode spool-only. Tetap tanpa memblokir request user. | ✓ |
| Tanpa retry, admin restart manual | Cukup health endpoint melaporkan degraded; admin restart container manual setelah memperbaiki konfigurasi | |

**User's choice:** Background retry tiap 60 detik

| Option | Description | Selected |
|--------|-------------|----------|
| Ekspos di /api/health | Satu sumber kebenaran untuk operator dan worker: field `drive` di response health | ✓ |
| Cukup di log | Hanya di log server; health tetap `{"status":"ok"}` agar monitoring existing tidak false-alarm | |

**User's choice:** Ekspos di /api/health

| Option | Description | Selected |
|--------|-------------|----------|
| status tetap ok saat sehat | `{"status":"ok"}` tetap saat sehat — monitoring existing & healthcheck Docker tidak berubah. Saat degraded: `{"status":"degraded","drive":{"state":"degraded","reason":"..."}}` | ✓ |
| Selalu sertakan field drive | Selalu ada field drive, tapi status healthcheck Docker tetap hanya melihat status utama | |

**User's choice:** status tetap ok saat sehat
**Notes:** Constraint teknis: docker healthcheck & load test existing mem-parse `{"status":"ok"}`.

---

## Bentuk kredensial service account

| Option | Description | Selected |
|--------|-------------|----------|
| Env var terpisah | `GOOGLE_SERVICE_ACCOUNT_EMAIL` + `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (dengan `\n` di-unescape). File JSON service account tidak perlu ikut ke image. Paling sesuai `.env.example` existing. | ✓ |
| Base64 JSON blob | Satu env var `GOOGLE_SERVICE_ACCOUNT_JSON` berisi JSON base64. Satu variabel, tapi lebih sulit dibaca dan lebih mudah salah quoting. | |
| File JSON ter-mount | File JSON di-mount ke container (secret mount), path lewat `GOOGLE_APPLICATION_CREDENTIALS`. Paling standar Google, tapi butuh perubahan docker-compose & prosedur deploy baru. | |

**User's choice:** Env var terpisah

| Option | Description | Selected |
|--------|-------------|----------|
| Wajib saat boot, fail-fast | Validasi saat boot: ketiga env wajib ada & tidak kosong. Kalau kosong → fail-fast. Private key harus punya header `BEGIN PRIVATE KEY` setelah unescape. | ✓ |
| Opsional, fallback spool | Boot sukses dengan Drive nonaktif; file selalu masuk spool sampai env diisi | |

**User's choice:** Wajib saat boot, fail-fast

---

## State machine & nama status

| Option | Description | Selected |
|--------|-------------|----------|
| PENDING → SYNCED/FAILED/ORPHANED | PENDING (ada di spool, belum dicoba) → SYNCED (ada drive_file_id, payload di-null) \| FAILED (5 attempt) \| ORPHANED (tidak pernah di-link ke submission). Nama ini sama dengan success criteria ROADMAP Phase 48. | ✓ |
| Tambah PENDING_UPLOAD & QUEUED | Tambah status PENDING_UPLOAD dan QUEUED terpisah untuk membedakan 'baru diterima' vs 'sudah diantrikan ke worker' | |
| Ikuti enum submission_jobs | Pakai status DB uppercase mengikuti enum PostgreSQL existing (submission_jobs pakai PENDING/PROCESSING/DONE/FAILED) | |

**User's choice:** PENDING → SYNCED/FAILED/ORPHANED

| Option | Description | Selected |
|--------|-------------|----------|
| Bytes disimpan saat upload | Saat upload: tulis record file + job + payload bytea sekaligus. `submission_files.status='PENDING'`. Worker yang mendorong ke Drive. | ✓ |
| Bytes saat enqueue | Upload hanya membuat record metadata; bytes baru diambil saat sync (tidak mungkin tanpa sumber lain) | |

**User's choice:** Bytes disimpan saat upload

---

## Cara migrasi diterapkan

| Option | Description | Selected |
|--------|-------------|----------|
| Prisma migration folder | Folder baru `prisma/migrations/<timestamp>_add_file_upload_tables/migration.sql`, dijalankan oleh `prisma migrate deploy` di `start.sh` yang sudah ada. Termasuk `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'FILE'`. Konsisten dengan migrasi CHECKBOX. | ✓ |
| Script SQL ad-hoc | Script SQL terpisah dijalankan manual/oleh script baru — tidak tercatat di `_prisma_migrations`, rawan drift antar environment | |

**User's choice:** Prisma migration folder

---

## the agent's Discretion

- Bentuk konkret kolom payload `bytea` di `file_upload_jobs`.
- Implementasi cache klien Drive dan mekanisme retry background (interval vs timer rekursif).
- Perlu tidaknya entri `serverExternalPackages` untuk paket Google di `next.config.ts`.
- Algoritma checksum (SHA-256 diasumsikan) dan aturan sanitization nama file.

## Deferred Ideas

- Rotasi kredensial service account — operasi manual, belum diotomasi.
- Multi-provider storage abstraction, shared limiter, kompresi/thumbnail/resumable upload — semuanya v2 (`FILEX-01..03`, `FILEX-09`, `FILEX-10`).
