# Phase 46: Foundation — Schema, Field Plumbing, Drive Client & Credentials - Context

**Gathered:** 2026-11-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase ini membangun tulang punggung storage untuk seluruh milestone v2.3:

1. **Schema & migrasi** — tabel `submission_files` dan `file_upload_jobs` (dengan spool `bytea`) dibuat lewat Prisma migration folder, plus `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'FILE'`.
2. **Field plumbing** — tipe `FILE` dikenali end-to-end di `src/lib/forms.ts` (union TypeScript, mapper, model domain field) dan parity di `prisma/schema.prisma`.
3. **Klien Google Drive** — klien service account dengan scope `drive.file`, upload ke **Shared Drive** folder memakai `supportsAllDrives: true` + `driveId`, ditambah startup probe yang membedakan error permanen vs sementara.
4. **Kredensial** — wiring env var baru + validasi boot.

**Bukan scope phase ini:** komponen UI upload, route upload publik, worker sinkronisasi, route serving file, panel admin, export. Semua itu phase 47-53.

</domain>

<decisions>
## Implementation Decisions

### Startup probe

- **D-01:** Fail-fast **hanya** untuk error permanen — folder bukan Shared Drive, folder 404, `invalid_grant`, kredensial invalid. Pada kondisi ini app tidak boot dan log error menyebut folder ID bukan Shared Drive.
- **D-02:** Error sementara (timeout jaringan, HTTP 5xx, HTTP 429) → app tetap boot dalam **mode degraded**; WARN di log; upload masuk spool. Alasannya: gangguan sesaat dari Google tidak boleh menumbangkan seluruh situs termasuk form publik.
- **D-03:** Degraded mode dipulihkan otomatis lewat **background retry probe setiap 60 detik**. Saat pulih, sistem keluar dari spool-only tanpa restart container.
- **D-04:** Status Drive diekspos di `/api/health` sebagai satu sumber kebenaran untuk operator dan worker.
- **D-05:** Response `/api/health` saat sehat **tetap persis** `{"status":"ok"}` — kompatibel dengan Docker healthcheck dan k6 load test yang sudah mem-parse bentuk ini. Saat degraded: `{"status":"degraded","drive":{"state":"degraded","reason":"..."}}`.

### Bentuk kredensial service account

- **D-06:** Env var terpisah, bukan file JSON ter-mount:
  - `GOOGLE_SERVICE_ACCOUNT_EMAIL`
  - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (escape `\n` di-unescape saat load)
  - `GOOGLE_DRIVE_FOLDER_ID`
- **D-07:** Ketiga env **wajib** ada dan tidak kosong saat boot; validasi gagal diperlakukan sebagai error permanen (fail-fast). Private key harus memuat header `BEGIN PRIVATE KEY` setelah unescape.
- **D-08:** Tidak ada perubahan pada `docker-compose.yml` untuk secret mount; cukup `.env.example` + `Dockerfile` placeholder bila perlu.

### State machine & nama status

- **D-09:** Status file: `PENDING → SYNCED | FAILED | ORPHANED`. Tidak ada `PENDING_UPLOAD`/`QUEUED` terpisah. Penamaan ini **tidak** meniru enum `submission_jobs` (`PENDING/PROCESSING/DONE/FAILED`) karena tabel itu tidak dipakai ulang.
- **D-10:** Bytes disimpan saat upload — satu operasi menulis record `submission_files` (status `PENDING`) + job + payload `bytea` sekaligus. Worker hanya mendorong ke Drive; tidak ada sumber byte kedua.

### Cara migrasi diterapkan

- **D-11:** Prisma migration folder baru `prisma/migrations/<timestamp>_add_file_upload_tables/migration.sql`, dijalankan oleh `prisma migrate deploy` yang sudah ada di `start.sh`. Termasuk `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS 'FILE'`, mengikuti preseden migrasi CHECKBOX.
- **D-12:** Tidak ada script SQL ad-hoc terpisah — semua perubahan tercatat di `_prisma_migrations` agar tidak drift antar environment.

### the agent's Discretion

- Bentuk konkret payload `bytea` di `file_upload_jobs` (kolom tunggal vs kolom terpisah untuk checksum/attempt), selama D-10 dan D-09 terpenuhi.
- Detail implementasi cache klien Drive (singleton module-level) dan cara probe melakukan retry di background (interval vs timer rekursif), selama D-03 terpenuhi.
- Apakah `@googleapis/drive` perlu entri `serverExternalPackages` di `next.config.ts` — perlu dibuktikan saat implementasi.
- Nama file sanitization dan kolom checksum algorithm (SHA-256 diasumsikan).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Requirements & roadmap
- `.planning/REQUIREMENTS.md` §"Foundation & Storage Core" — FILE-01, FILE-02, FILE-03, FILE-04, FILE-05 (definition of done phase ini)
- `.planning/ROADMAP.md` §"Phase 46: Foundation - Schema, Field Plumbing, Drive Client & Credentials" — goal, success criteria, threat mapping
- `.planning/PROJECT.md` §"Current Milestone: v2.3" — core value dan constraint milestone

### Research
- `.planning/research/SUMMARY.md` §"Stack Additions" — paket yang dipakai (`@googleapis/drive@27.1.0`, `google-auth-library@11.3.4`, `file-type@22.3.0`) dan paket yang **tidak** dipakai
- `.planning/research/SUMMARY.md` §"Architecture Decisions" AD-1..AD-6 — deferred upload, bytea spool, tabel terpisah, worker extension, private route, raw-SQL
- `.planning/research/SUMMARY.md` §"Watch Out For" W1 — **non-negotiable**: service account tidak punya quota My Drive, wajib Shared Drive + `supportsAllDrives`/`driveId`
- `.planning/research/SUMMARY.md` §"Watch Out For" W10 — kebocoran kredensial SA
- `.planning/research/SUMMARY.md` §"Suggested Phase Structure" F1 — struktur yang dipetakan ke phase ini
- `.planning/research/PITFALLS.md` — resep pencegahan pitfall yang relevan dengan fondasi
- `.planning/research/ARCHITECTURE.md` — sketsa komponen; perhatikan W1: sketsa ini mengasumsikan folder biasa
- `.planning/research/STACK.md` — versi paket dan alasan pemilihan

### Preseden kode di repo
- `prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql` — preseden `ALTER TYPE "FieldType" ADD VALUE IF NOT EXISTS`
- `prisma/migrations/20260406160000_add_submission_jobs/migration.sql` — preseden tabel antrian SQL (jangan di-reuse untuk file)
- `start.sh` — `prisma migrate deploy` sebelum `node server.js`
- `src/lib/forms.ts` — sumber kebenaran raw-SQL form builder; tempat `FILE` harus masuk union/mapper
- `src/lib/prisma.ts` — PrismaPg adapter; pola akses `$queryRaw`/`$executeRaw`
- `AGENTS.md` §"Code Conventions & Patterns" — migrasi SQL dan raw SQL `src/lib/forms.ts` harus sinkron

### Konfigurasi & runtime
- `.env.example` — tempat env Drive baru didaftarkan
- `docker-compose.yml` — layanan `app`, `worker`, profil `bench`, healthcheck
- `Dockerfile` — Node 22 Alpine, `output: "standalone"`
- `next.config.ts` — `serverExternalPackages` untuk `@prisma/client`, `@prisma/adapter-pg`, `pg`

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `src/lib/prisma.ts`: klien Prisma dengan PrismaPg adapter — dipakai untuk `$queryRaw`/`$executeRaw` pada tabel file baru, sama seperti `src/lib/forms.ts`.
- `prisma/migrations/20261001000000_add_checkbox_field_type/migration.sql`: template persis untuk menambah nilai enum `FieldType`.
- `scripts/submission-worker.mjs`: pola pemanggilan internal dengan `x-worker-token` — akan diperluas di phase 50, tapi bentuk auth-nya sudah ada.

### Established Patterns
- Form-builder tables dikelola lewat SQL migration dan diakses via `prisma.$queryRaw/$executeRaw`, **bukan** Prisma Client models — parity di `prisma/schema.prisma` tetap dijaga.
- Route handler tipis di `src/app/**` yang memanggil helper domain di `src/lib/**`.
- Next.js 16 App Router: `params`/`searchParams` bertipe `Promise<...>` dan di-`await`.
- In-memory rate limiting (`src/lib/rate-limit.ts`) per proses — bukan proteksi multi-instance; penting untuk profil `bench`.

### Integration Points
- `src/lib/forms.ts`: union type, mapper baris SQL → field, dan validasi akan menerima `FILE` (phase ini hanya plumbing tipe; validasi nilai file di phase 49).
- `/api/health` route: menerima tambahan status Drive sesuai D-04/D-05.
- `next.config.ts` `serverExternalPackages`: kemungkinan perlu entri untuk paket Google.
- `start.sh`: migrasi baru otomatis jalan — tidak perlu perubahan script.

</code_context>

<specifics>
## Specific Ideas

- Smoke test di phase ini **wajib membuktikan file nyata muncul di Shared Drive** — bukan sekadar unit test dengan mock. Ini penutup risiko W1.
- Response `/api/health` saat sehat harus tetap exact-match `{"status":"ok"}`; healthcheck Docker dan k6 load test bergantung padanya.
- Degraded mode harus bisa pulih sendiri; operator tidak perlu restart container setelah memperbaiki konfigurasi Drive.

</specifics>

<deferred>
## Deferred Ideas

- Rotasi kredensial service account — belum dibutuhkan, dicatat sebagai operasi manual.
- Multi-provider storage abstraction (S3/R2) — v2 (`FILEX-09`).
- Shared limiter Redis/Postgres — v2 (`FILEX-10`).
- Kompresi gambar, thumbnail, resumable upload — v2 (`FILEX-01..03`).

</deferred>

---

*Phase: 46-Foundation — Schema, Field Plumbing, Drive Client & Credentials*
*Context gathered: 2026-11-16*
