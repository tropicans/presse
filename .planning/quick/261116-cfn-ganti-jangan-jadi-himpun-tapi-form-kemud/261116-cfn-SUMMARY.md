---
quick_id: 261116-cfn
slug: ganti-jangan-jadi-himpun-tapi-form-kemud
date: 2026-11-16
status: complete
tasks_completed: 2
tasks_total: 2
---

# Quick Task 261116-cfn Summary: Rename to Form & Analisis Upload ke Google Drive

## Ringkasan Pekerjaan

1. **Perubahan Identitas `HIMPUN` → `Form`:**
   - `package.json`: Nama paket diubah dari `"himpun"` menjadi `"form"`.
   - `README.md`: Header utama diubah dari `# HIMPUN` menjadi `# Form`.
   - `AGENTS.md`: Project overview diperbarui menjadi `Form (formerly HIMPUN / isian)`.
   - `src/components/FormLogo.tsx` & 12 komponen pemanggil: Seluruh komponen runtime dan konfigurasi test (`vitest.config.ts`) bersih dari referensi `Himpun`/`himpun`.

2. **Analisis Arsitektur Upload File ke Google Drive:**
   - **Kelayakan:** **Sangat Bisa** diimplementasikan di atas stack Next.js 16 (App Router) + PostgreSQL + Background Worker saat ini.
   - **Kunci Penting Autentikasi Google Drive:**
     - **Opsi A — Google Workspace Shared Drive + Service Account (`drive.file`):** Ideal jika organisasi memiliki Google Workspace. Service Account **tidak memiliki kuota penyimpanan sendiri di My Drive biasa** (akan error `403 storageQuotaExceeded`), sehingga target folder wajib berada di dalam **Shared Drive** dengan opsi `supportsAllDrives: true`.
     - **Opsi B — OAuth 2.0 Refresh Token (Akun Google Personal / My Drive):** Jika hanya menggunakan akun Google reguler (Gmail biasa tanpa Shared Drive), gunakan `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, dan `GOOGLE_REFRESH_TOKEN` milik akun admin pemilik Drive agar kuota penyimpanan memakai kuota akun Google tersebut.
   - **Arsitektur Rekomendasi (Deferred Upload + Postgres Spool + Private Serving):**
     - Upload terpisah (`POST /api/public/files/upload`) dengan validasi *magic bytes* (`file-type`), batas ukuran (mis. 10 MB), dan *rate limit*.
     - Penyimpanan sementara (*spool*) di kolom `bytea` PostgreSQL (`file_upload_jobs`) agar submit form tetap cepat dan tahan gangguan jaringan ke Google Drive.
     - Sinkronisasi ke Google Drive di latar belakang melalui worker (`scripts/submission-worker.mjs`) dan pengunduhan aman terproteksi sesi admin lewat `GET /api/files/[id]`.
