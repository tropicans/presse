# Requirements: Milestone v2.1 Admin Invitation System & Google OAuth Access Delegation

**Milestone:** v2.1  
**Status:** In Progress (2026-09-28)  
**Goal:** Membangun sistem pendelegasian hak akses admin berbasis undangan link token 48 jam dengan Google OAuth tanpa password, di mana Super Admin (`tropicans@gmail.com` / `ADMIN_EMAILS`) memegang kontrol penuh untuk mengundang dan mencabut akses anggota tim pengelola formulir.

## Requirements

### Database & Authentication Domain
- [ ] **INVITE-01: Admin Users & Invitations Schema Migration** — Membuat tabel PostgreSQL (`admin_users` dan `admin_invitations`) untuk mencatat daftar admin aktif, peran (`SUPERADMIN` vs `ADMIN`), token undangan acak kriptografis (UUID/CUID/SHA-256), waktu kadaluwarsa (48 jam), status (`PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`), dan identitas pengundang.
- [ ] **INVITE-02: NextAuth Dynamic Authorization & Session Enrichment** — Memperbarui `src/lib/auth.ts` agar memeriksa email Superadmin dari `.env` (`ADMIN_EMAILS`) serta tabel `admin_users` yang berstatus aktif saat `signIn`, dan menyematkan atribut `role` (`SUPERADMIN` atau `ADMIN`) ke dalam objek NextAuth `session`.
- [ ] **INVITE-03: Invitation Token Lifecycle Engine** — Membangun modul domain di `src/lib/admin-invitations.ts` yang mengelola siklus hidup undangan: pembuatan token, validasi kadaluwarsa (48 jam), klaim/penerimaan undangan oleh akun Google terverifikasi, dan pencabutan akses (*revocation*).

### Admin API & Superadmin Access Control
- [ ] **INVITE-04: Protected Admin Team & Invitation APIs** — Mengimplementasikan route handler aman di `/api/admin/users` (list active admins & pending invitations), `/api/admin/users/invite` (generate token & invite link), dan `/api/admin/users/revoke` (cabut akses admin atau batalkan undangan), dengan otorisasi ketat khusus `SUPERADMIN`.
- [ ] **INVITE-05: Public Invitation Token Verification & Acceptance APIs** — Mengimplementasikan endpoint `/api/public/invite/verify` untuk mengecek status dan detail token sebelum login, serta integrasi alur klaim undangan saat proses sign-in Google selesai.

### User Interface & Experience
- [ ] **INVITE-06: Superadmin Team Management Dashboard (`/admin/users`)** — Menambahkan antarmuka manajemen tim editorial monokrom: kartu ringkasan tim, formulir undang pengguna baru dengan tombol *1-Click Copy Link*, tabel anggota aktif & undangan tertunda (*pending*), tombol cabut akses (*revoke*), serta tautan navigasi di header/sidebar yang hanya terlihat oleh Superadmin.
- [ ] **INVITE-07: Public Invitation Acceptance Landing Page (`/admin/invite`)** — Halaman sambutan undangan yang menampilkan email yang diundang, peran yang diberikan, countdown sisa waktu berlaku tautan, dan tombol *"Terima Undangan & Masuk dengan Google"* yang elegan dan responsif.

### Verification & Infrastructure
- [ ] **INVITE-08: Multi-Tier Quality Assurance, Security Audit & Docker Up** — Pengujian menyeluruh dengan Vitest (unit & integration tests domain undangan dan auth), zero TypeScript & ESLint errors, build Next.js standalone, dan Smart Container Rebuild (`docker compose build app worker && up -d`) dengan verifikasi health check.

## Traceability

| Requirement | Phase | Status |
|---|---|---|
| INVITE-01 | Phase 37 | Pending |
| INVITE-02 | Phase 37 | Pending |
| INVITE-03 | Phase 37 | Pending |
| INVITE-04 | Phase 38 | Pending |
| INVITE-05 | Phase 38 | Pending |
| INVITE-06 | Phase 39 | Pending |
| INVITE-07 | Phase 39 | Pending |
| INVITE-08 | Phase 40 | Pending |

---

*Milestone initiated: 2026-09-28*
