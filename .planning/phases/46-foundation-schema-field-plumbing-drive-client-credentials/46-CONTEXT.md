# Phase 46: Foundation — Schema, Field Plumbing, MinIO Client & Credentials - Context

**Gathered:** 2026-11-16
**Revised:** 2026-11-16 (Drive → MinIO; see `46-03-SUMMARY.md`)
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase ini membangun tulang punggung storage untuk seluruh milestone v2.3:

1. **Schema & migrasi** — tabel `submission_files` dan `file_upload_jobs` (dengan spool `bytea`) dibuat lewat Prisma migration folder, plus `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'FILE'`.
2. **Field plumbing** — tipe `FILE` dikenali end-to-end di `src/lib/forms.ts` (union TypeScript, mapper, model domain field) dan parity di `prisma/schema.prisma`.
3. **Klien object storage** — klien S3-compatible (`@aws-sdk/client-s3`) terhadap MinIO self-hosted di compose stack yang sama, dengan path-style addressing, bucket private, dan startup probe yang tidak pernah menumbangkan proses.
4. **Kredensial** — wiring env var `MINIO_*` + validasi boot.

**Bukan scope phase ini:** komponen UI upload, route upload publik, worker sinkronisasi, route serving file, panel admin, export. Semua itu phase 47-53.

**Revisi arsitektur (2026-11-16).** Rencana awal memakai Google Drive via service account ke Shared Drive. Terbukti mustahil: operator tidak punya tenant Google Workspace, service account tidak bisa membuat Shared Drive, dan kuota My Drive-nya `0` (`storageQuota.limit: "0"`) sehingga upload selalu 403. Plan 46-03 menutup blocker ini dengan bukti API langsung. Backend diganti MinIO; klien Drive, kredensial, probe, dan paketnya dicabut. Plan 46-04 menggantikannya.

</domain>

<decisions>
## Implementation Decisions

### Startup probe

- **D-01 (revised):** Tidak ada fail-fast untuk storage. MinIO hidup di stack yang sama, jadi "folder salah" bukan kelas kegagalan yang bisa dideteksi di boot; yang tersisa hanya kondisi yang harus ditolerir. Kredensial invalid atau bucket absen **tidak** menghentikan boot.
- **D-02:** Storage tidak terjangkau (timeout jaringan, HTTP 5xx, kredensial invalid) → app tetap boot dalam **mode degraded**; WARN di log; upload masuk spool. Alasannya: gangguan storage tidak boleh menumbangkan seluruh situs termasuk form publik.
- **D-03:** Degraded mode dipulihkan otomatis lewat **background re-probe setiap 60 detik**. Saat pulih, sistem keluar dari spool-only tanpa restart container.
- **D-04:** Status storage diekspos di `/api/health` sebagai satu sumber kebenaran untuk operator dan worker.
- **D-05:** Response `/api/health` saat sehat **tetap persis** `{"status":"ok"}` — kompatibel dengan Docker healthcheck dan k6 load test yang sudah mem-parse bentuk ini. Saat degraded: `{"status":"degraded","storage":{"state":"degraded","reason":"..."}}` dengan HTTP 200, bukan 503 — storage down bukan alasan menyatakan app down.

### Bentuk kredensial storage

- **D-06 (revised):** Env var terpisah per parameter S3, bukan file kredensial ter-mount:
  - `MINIO_ENDPOINT` (nama service compose `minio` di dalam Docker, `127.0.0.1` di host)
  - `MINIO_PORT`
  - `MINIO_USE_SSL` (`false` di dalam network compose)
  - `MINIO_ACCESS_KEY`
  - `MINIO_SECRET_KEY`
  - `MINIO_BUCKET`
- **D-07 (revised):** Kelima env wajib non-kosong divalidasi `getStorageConfig`; `MINIO_PORT` harus integer 1..65535 dan `MINIO_BUCKET` harus lolos pola nama bucket S3 (`^[a-z0-9][a-z0-9.-]{1,61}[a-z0-9]$`) karena nilainya dipakai menyusun URL. `MINIO_USE_SSL` opsional, truthy hanya untuk `'true'`/`'1'`. Validasi gagal melempar error saat config dibaca — probe menangkapnya dan masuk degraded, bukan crash.
- **D-08 (revised):** `docker-compose.yml` perlu perubahan: service `minio` baru (tanpa port mapping host — console tidak boleh publik), volume `minio_data` persisten, env `MINIO_*` di anchor `&app-env`, dan `depends_on: minio: service_healthy` untuk `app` dan `worker`.

### Identitas object & idempotensi

- **D-13:** `object_key` bersifat **deterministik** — `buildObjectKey(fileId)` = `files/<fileId>`. Tidak ada timestamp atau suffix acak. PUT S3 idempoten per key, jadi retry menimpa object yang sama dan tidak pernah menduplikasi. Rekonsiliasi "apakah retry menduplikasi file?" tidak diperlukan.
- **D-14:** Identitas object adalah pasangan `(bucket, object_key)`, bukan key saja; unique index `submission_files_bucket_object_key_key` mencerminkannya.

### State machine & nama status

- **D-09:** Status file: `PENDING → SYNCED | FAILED | ORPHANED`. Tidak ada `PENDING_UPLOAD`/`QUEUED` terpisah. Penamaan ini **tidak** meniru enum `submission_jobs` (`PENDING/PROCESSING/DONE/FAILED`) karena tabel itu tidak dipakai ulang.
- **D-10:** Bytes disimpan saat upload — satu operasi menulis record `submission_files` (status `PENDING`) + job + payload `bytea` sekaligus. Worker hanya mendorong ke storage; tidak ada sumber byte kedua.

### Cara migrasi diterapkan

- **D-11:** Prisma migration folder baru `prisma/migrations/<timestamp>_add_file_upload_tables/migration.sql`, dijalankan oleh `prisma migrate deploy` yang sudah ada di `start.sh`. Termasuk `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'FILE'`, mengikuti preseden migrasi CHECKBOX. Kolom Drive diganti lewat `20261116120000_swap_drive_columns_for_object_storage` dengan `RENAME COLUMN` in-place (bukan drop + add) agar data lama tetap punya identitas.
- **D-12:** Tidak ada script SQL ad-hoc terpisah — semua perubahan tercatat di `_prisma_migrations` agar tidak drift antar environment.

### the agent's Discretion

- Bentuk konkret payload `bytea` di `file_upload_jobs` (kolom tunggal vs kolom terpisah untuk checksum/attempt), selama D-10 dan D-09 terpenuhi.
- Detail implementasi cache klien S3 (singleton module-level) dan cara probe melakukan retry di background (interval vs timer rekursif), selama D-03 terpenuhi.
- Apakah `@aws-sdk/client-s3` perlu entri `serverExternalPackages` di `next.config.ts` — perlu dibuktikan saat implementasi.
- Nama file sanitization dan kolom checksum algorithm (SHA-256 diasumsikan).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §"Foundation & Storage Core" — FILE-01..FILE-05 (definition of done phase ini; FILE-04/FILE-05 sudah berbunyi MinIO)
- `.planning/ROADMAP.md` §"Phase 46" — goal, success criteria, dan paragraf "Architecture revision (2026-11-16)"
- `.planning/PROJECT.md` §"Current Milestone: v2.3" — core value dan constraint milestone

### Revision evidence
- `.planning/phases/46-.../46-03-SUMMARY.md` — bukti live API bahwa Drive mustahil: `canCreateDrives: false`, `drives.list: []`, folder tanpa `driveId` milik `kelehhadari@gmail.com`, `storageQuota.limit: "0"`, `files.get` @ `drive.file` → 404
- `.planning/phases/46-.../46-04-PLAN.md` — plan pengganti berbasis MinIO

### Research
- `.planning/research/SUMMARY.md` §"Architecture Decisions" AD-1..AD-6 — deferred upload, bytea spool, tabel terpisah, worker extension, private route, raw-SQL (semua tetap berlaku)
- `.planning/research/SUMMARY.md` §"Watch Out For" W10 — kebocoran kredensial storage
- `.planning/research/PITFALLS.md` — resep pencegahan pitfall yang relevan dengan fondasi
- `.planning/research/ARCHITECTURE.md` — sketsa komponen (bagian provider-specific sudah tidak berlaku)
- Bagian `@googleapis/drive`, `google-auth-library`, dan W1 di `SUMMARY.md`/`STACK.md` **tidak berlaku lagi**.

### Preseden kode di repo
- `prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql` — preseden `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS`
- `prisma/migrations/20260406160000_add_submission_jobs/migration.sql` — preseden tabel antrian SQL (jangan di-reuse untuk file)
- `start.sh` — `prisma migrate deploy` sebelum `node server.js`
- `src/lib/forms.ts` — sumber kebenaran raw-SQL form builder; tempat `FILE` harus masuk union/mapper
- `src/lib/prisma.ts` — PrismaPg adapter dan pola singleton `globalThis`; klien S3 meniru pola ini
- `AGENTS.md` §"Code Conventions & Patterns" — migrasi SQL dan raw SQL `src/lib/forms.ts` harus sinkron

### Konfigurasi & runtime
- `.env.example` — tempat env `MINIO_*` didaftarkan
- `docker-compose.yml` — service `minio`, `minio_data` volume, anchor `&app-env`, `x-worker` yang mewarisinya
- `Dockerfile` — Node 22 Alpine, `output: "standalone"`, placeholder build-time
- `next.config.ts` — `serverExternalPackages` untuk `@prisma/client`, `@prisma/adapter-pg`, `pg`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/prisma.ts`: klien Prisma dengan PrismaPg adapter — dipakai untuk `$queryRaw`/`$executeRaw` pada tabel file baru, sama seperti `src/lib/forms.ts`.
- `prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql`: template persis untuk menambah nilai enum `FieldType`.
- `scripts/submission-worker.mjs`: pola pemanggilan internal dengan `x-worker-token` — akan diperluas di phase 50, tapi bentuk auth-nya sudah ada.
- `src/lib/storage.ts` (baru): klien S3 singleton, `putObject`/`getObjectBytes`/`deleteObject`/`headBucket`, `buildObjectKey`.
- `src/lib/storage-probe.ts` (baru): `probeStorage`, `startStorageProbe`, `getStorageState`, `describeStorageError`.

### Established Patterns
- Form-builder tables dikelola lewat SQL migration dan diakses via `prisma.$queryRaw/$executeRaw`, **bukan** Prisma Client models — parity di `prisma/schema.prisma` tetap dijaga.
- Route handler tipis di `src/app/**` yang memanggil helper domain di `src/lib/**`.
- Next.js 16 App Router: `params`/`searchParams` bertipe `Promise<...>` dan di-`await`.
- In-memory rate limiting (`src/lib/rate-limit.ts`) per proses — bukan proteksi multi-instance; penting untuk profil `bench`.
- Modul yang di-`import 'server-only'` perlu `vi.mock('server-only', () => ({}))` di test vitest-nya.

### Integration Points
- `src/lib/forms.ts`: union type, mapper baris SQL → field, dan validasi akan menerima `FILE` (phase ini hanya plumbing tipe; validasi nilai file di phase 49).
- `/api/health` route: menerima tambahan status storage sesuai D-04/D-05.
- `next.config.ts` `serverExternalPackages`: kemungkinan perlu entri untuk `@aws-sdk/client-s3`.
- `start.sh`: migrasi baru otomatis jalan — tidak perlu perubahan script.

</code_context>

<specifics>
## Specific Ideas

- Smoke test di phase ini **wajib membuktikan round-trip byte-identik pada MinIO nyata** dan **penolakan akses anonim** — bukan sekadar unit test dengan mock. Ini pengganti bukti W1.
- Response `/api/health` saat sehat harus tetap exact-match `{"status":"ok"}`; healthcheck Docker dan k6 load test bergantung padanya.
- Degraded mode harus bisa pulih sendiri; operator tidak perlu restart container setelah memperbaiki konfigurasi storage.
- Bucket dan API MinIO tidak boleh terjangkau dari internet: service `minio` tanpa `ports:` mapping.

</specifics>

<deferred>
## Deferred Ideas

- User MinIO ber-scope policy per service (least privilege) — saat ini memakai root user karena single-tenant; dicatat sebagai hardening phase 53.
- Rotasi kredensial storage — belum dibutuhkan, dicatat sebagai operasi manual.
- Multi-provider storage abstraction penuh (S3 native, R2, B2) dengan config runtime per provider — v2 (`FILEX-09`).
- Shared limiter Redis/Postgres — v2 (`FILEX-10`).
- Kompresi gambar, thumbnail, resumable upload — v2 (`FILEX-01..03`).

</deferred>

---

*Phase: 46-Foundation — Schema, Field Plumbing, MinIO Client & Credentials*
*Context gathered: 2026-11-16, revised after Drive infeasibility*
