# Requirements: Form — File Upload & Google Drive Storage

**Defined:** 2026-11-16
**Milestone:** v2.3
**Core Value:** Memungkinkan pembuatan dan pengisian formulir publik secara dinamis, andal, cepat, dan aman dengan dukungan visual yang premium.

**Goal:** Peserta form publik dan admin dapat mengunggah file (gambar/PDF, maks 10 MB) yang tersimpan di Google Drive via service account, dengan antrian lokal + sinkronisasi otomatis ketika Drive gagal, dan akses file private melalui aplikasi.

## v1 Requirements

### Foundation & Storage Core

- [x] **FILE-01**: Tipe field `FILE` tersedia end-to-end pada enum PostgreSQL `FieldType`, union TypeScript di `src/lib/forms.ts`, dan model domain form field
- [x] **FILE-02**: Tabel `submission_files` menyimpan metadata file (id, submission_id nullable, field_id nullable, original filename, sanitized filename, mime, size, checksum, storage status, drive_file_id, timestamps) via migrasi SQL
- [x] **FILE-03**: Tabel `file_upload_jobs` menyimpan payload bytes (`bytea`) sebagai spool lokal dengan status antrian (PENDING/CLAIMED/DONE/FAILED), attempt counter, dan next_attempt_at — tanpa volume filesystem
- [x] **FILE-04**: Klien Google Drive berfungsi via service account dengan scope `drive.file`, upload ke **Shared Drive** folder memakai `supportsAllDrives: true` + `driveId`, dan probe startup yang gagal keras bila folder bukan Shared Drive
- [x] **FILE-05**: Konfigurasi env baru (`GOOGLE_DRIVE_FOLDER_ID`, `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`) terdaftar di `.env.example` dan divalidasi saat boot

### Form Builder

- [ ] **FILE-06**: Admin dapat menambahkan field `File Upload` di `AdminFormEditor` dengan konfigurasi: label, wajib/tidak, batas ukuran (maks 10 MB), preset tipe diizinkan (gambar + PDF), dan jumlah file maksimum
- [ ] **FILE-07**: Field `File Upload` tampil di live preview admin dan form publik sebagai dropzone/placeholder yang konsisten dengan design system monochrome

### Public Upload Flow

- [ ] **FILE-08**: Peserta dapat mengunggah file lewat drag-and-drop atau tombol pilih file di `/f/[slug]`, dengan progres upload, preview (gambar/PDF), dan hapus sebelum submit
- [ ] **FILE-09**: `POST /api/public/files/upload` memvalidasi MIME via magic-byte sniffing (bukan ekstensi), ukuran ≤ 10 MB, dan jumlah file per field; menolak spoofed/oversize dengan HTTP 400 dan pesan jelas
- [ ] **FILE-10**: Upload publik mengembalikan `{fileId}` dan tetap sukses (HTTP 200) ketika Google Drive sedang gagal — file masuk antrian lokal dan submission tidak terblokir
- [ ] **FILE-11**: Validasi submit server-side menolak submission yang field wajib file-nya kosong atau berisi `fileId` yang bukan milik sesi upload tersebut
- [ ] **FILE-12**: Upload publik dibatasi rate-limit per IP dan batas byte per jendela waktu, dengan penanganan `X-Forwarded-For` yang tidak bisa dipalsukan klien secara sembarang

### Sync Worker & Queue

- [ ] **FILE-13**: Proses sinkronisasi klaim job dengan `FOR UPDATE SKIP LOCKED`, mendorong file ke Drive secara idempoten (menyimpan `drive_file_id` sebelum menandai `SYNCED`), dan tidak menduplikasi file saat retry/pasca-crash
- [ ] **FILE-14**: Job yang gagal di-retry dengan exponential backoff hingga batas 5 attempt lalu ditandai `FAILED`, tanpa memblokir antrian lain
- [ ] **FILE-15**: Worker memproses file upload secara otomatis (mekanisme `scripts/submission-worker.mjs` yang diperluas, token `x-worker-token` yang sama, tanpa container baru)
- [ ] **FILE-16**: Payload `bytea` dihapus/di-null-kan setelah file berhasil tersinkron agar ukuran database tetap terbatas

### Private File Serving

- [ ] **FILE-17**: `GET /api/files/[id]` menyajikan file hanya untuk admin terautentikasi (`getAdminSession()`), memilih sumber Drive atau spool lokal sesuai status, dan menegakkan header `Content-Disposition: attachment` + `X-Content-Type-Options: nosniff`
- [ ] **FILE-18**: Route serving file menolak akses tanpa sesi, ID file yang tidak ada, dan percobaan path traversal, dengan nama file yang disanitasi
- [ ] **FILE-19**: Tidak ada file yang diekspos ke publik melalui Google Drive ("anyone with link"); file tetap private di Drive dan hanya dapat diakses melalui aplikasi

### Admin Surfaces

- [ ] **FILE-20**: Panel lampiran di detail submission admin menampilkan daftar file (nama, tipe, ukuran, badge status `Menunggu sinkronisasi`/`Tersinkron`), tombol unduh melalui `/api/files/[id]`, dan penanda asal file (peserta / admin)
- [ ] **FILE-21**: Admin dapat mengunggah lampiran tambahan pada detail submission melalui `POST /api/admin/files/upload` tanpa mengubah jawaban peserta
- [ ] **FILE-22**: Tabel submissions admin menampilkan jawaban field file sebagai nama file yang bisa diklik ke URL aplikasi (bukan URL Google Drive)

### Export & Lifecycle

- [ ] **FILE-23**: Ekspor `.xlsx` menulis jawaban file sebagai nama file + URL aplikasi, dengan nama file disanitasi terhadap formula injection (prefix `'` untuk nilai yang diawali `=`, `+`, `-`, `@`), dan pemecahan 500 baris tetap utuh
- [ ] **FILE-24**: Menghapus submission (dan form) menghapus record file, payload spool, dan file di Google Drive
- [ ] **FILE-25**: File orphan dari upload yang tidak pernah di-submit dibersihkan otomatis setelah TTL tertentu oleh sweep/reconciler periodik

### Hardening & QA

- [ ] **FILE-26**: Unggahan besar tidak memicu OOM: body size dibatasi eksplisit di route handler dan konfigurasi Nginx, dengan verifikasi memori di bawah beban paralel
- [ ] **FILE-27**: Metadata EXIF/GPS dihapus dari gambar sebelum disimpan/diunggah
- [ ] **FILE-28**: Unit test mencakup PNG/PDF valid, ekstensi dipalsukan, oversize, Drive-down → spool → sync, retry tanpa duplikasi, dan GC TTL; `npm test`, `npm run lint`, `npx tsc --noEmit`, `npm run build` semuanya lulus
- [ ] **FILE-29**: Container `app` dan `worker` dapat dibangun ulang sesuai protokol AGENTS.md dan `/api/health` mengembalikan `status: ok` setelah fitur aktif

## v2 Requirements

Deferred — tidak masuk roadmap v2.3.

### Upload Enhancements

- **FILEX-01**: Kompresi gambar di sisi klien sebelum upload
- **FILEX-02**: Thumbnail/preview gambar via `sharp` (butuh dependensi `vips` di alpine)
- **FILEX-03**: Upload resumable untuk file besar / jaringan tidak stabil
- **FILEX-04**: Tombol retry manual per file di panel admin
- **FILEX-05**: Analitik jumlah lampiran per form pada dashboard analytics
- **FILEX-06**: Unduh semua lampiran satu submission sebagai ZIP
- **FILEX-07**: Rendering dokumen inline (PDF viewer) di aplikasi

### Security & Storage

- **FILEX-08**: Pemindaian virus/malware pada file yang diunggah
- **FILEX-09**: Abstraksi multi-provider storage (S3, R2, lokal) di samping Drive
- **FILEX-10**: Shared limiter (Redis/Postgres) agar rate-limit benar di profil multi-instance `bench`
- **FILEX-11**: Kebijakan retensi berbasis PII (hapus otomatis file identitas setelah N bulan)

## Out of Scope

| Feature | Reason |
|---------|--------|
| OAuth Drive per-user (file masuk Drive admin) | Butuh scope OAuth tambahan, re-consent, dan memperumit alur admin; service account ditetapkan sebagai target |
| Login Google untuk peserta form publik | Form publik harus tetap anonim; cukup rate-limit + validasi server-side |
| Menyimpan file di volume filesystem container | Container `app` berjalan multi-instance di profil `bench` dan recreate pada deploy; volume tidak dibagi/dipertahankan. Postgres `bytea` dipakai sebagai spool |
| Reuse tabel `submission_jobs` untuk sinkronisasi file | `UNIQUE(submission_id)` bentrok dengan banyak file per submission dan retry-nya tidak idempoten untuk Drive |
| Link Google Drive "anyone with link" sebagai cara akses | Melanggar privacy requirement; semua akses lewat aplikasi |
| Upload langsung browser → Google Drive | Membocorkan kredensial ke klien dan melewati validasi server |
| Tipe file selain gambar & PDF (Office, arsip, video) | Memperbesar permukaan serangan; tetap di v2 |
| Ukuran file di atas 10 MB | Spool Postgres dibatasi; ditunda hingga kebutuhan nyata muncul |
| Global state library / React Query untuk upload | Melanggar konvensi codebase (React hooks + native fetch) |
| Library drag-and-drop eksternal | API native cukup; menghindari dependensi tambahan |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| FILE-01 | TBD | Complete |
| FILE-02 | TBD | Complete |
| FILE-03 | TBD | Complete |
| FILE-04 | TBD | Complete |
| FILE-05 | TBD | Complete |
| FILE-06 | TBD | Pending |
| FILE-07 | TBD | Pending |
| FILE-08 | TBD | Pending |
| FILE-09 | TBD | Pending |
| FILE-10 | TBD | Pending |
| FILE-11 | TBD | Pending |
| FILE-12 | TBD | Pending |
| FILE-13 | TBD | Pending |
| FILE-14 | TBD | Pending |
| FILE-15 | TBD | Pending |
| FILE-16 | TBD | Pending |
| FILE-17 | TBD | Pending |
| FILE-18 | TBD | Pending |
| FILE-19 | TBD | Pending |
| FILE-20 | TBD | Pending |
| FILE-21 | TBD | Pending |
| FILE-22 | TBD | Pending |
| FILE-23 | TBD | Pending |
| FILE-24 | TBD | Pending |
| FILE-25 | TBD | Pending |
| FILE-26 | TBD | Pending |
| FILE-27 | TBD | Pending |
| FILE-28 | TBD | Pending |
| FILE-29 | TBD | Pending |

**Coverage:**

- v1 requirements: 29 total
- Mapped to phases: 0 (diisi saat roadmap dibuat)
- Unmapped: 29

---
*Requirements defined: 2026-11-16*
*Last updated: 2026-11-16 after initial definition*
