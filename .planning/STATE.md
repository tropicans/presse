---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Admin Invitation System & Google OAuth Access Delegation
status: in_progress
last_updated: "2026-09-28T10:52:00.000Z"
last_activity: 2026-09-28
progress:
  total_phases: 4
  completed_phases: 0
  total_plans: 4
  completed_plans: 0
  percent: 0
current_phase: 37
current_phase_name: Database Schema, Migration & Core Domain Helpers for Admin Invitations
---

# Project State: Admin Invitation System & Google OAuth Access Delegation (In Progress)

## Project Reference

See: [.planning/PROJECT.md](file:///c:/Users/yudhiar/Downloads/oprek/Dev/jott/.planning/PROJECT.md) (updated 2026-09-28)  
Requirements: [.planning/REQUIREMENTS.md](file:///c:/Users/yudhiar/Downloads/oprek/Dev/jott/.planning/REQUIREMENTS.md)  
Roadmap: [.planning/ROADMAP.md](file:///c:/Users/yudhiar/Downloads/oprek/Dev/jott/.planning/ROADMAP.md)  

**Core value:** Memungkinkan pembuatan dan pengisian formulir publik secara dinamis, andal, cepat, dan aman dengan dukungan visual yang compact, modern, dan bernilai guna tinggi.  
**Current focus:** Phase 37 — Database Schema, Migration & Core Domain Helpers for Admin Invitations.

## Current Position

Milestone: v2.1 — Admin Invitation System & Google OAuth Access Delegation  
Status: In Progress  
Phases:
- Phase 37: Database Schema, Migration & Core Domain Helpers for Admin Invitations (Planned)
- Phase 38: NextAuth Integration & Admin User Management API Routes (Planned)
- Phase 39: Admin Team UI & Public Invitation Claim Flow (Planned)
- Phase 40: Multi-Tier Verification, Security Audit & Docker Container Up (Planned)

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| Model Undangan Berbasis Token Link (48 Jam) | Opsi B dipilih: Admin men-generate tautan undangan ber-token acak kriptografis (TTL 48 jam) untuk disalin (*copy-to-clipboard*) dan dibagikan langsung tanpa memerlukan SMTP server pihak ketiga | Disepakati |
| Autentikasi Tetap Google OAuth (Zero Password) | Pengguna yang diundang tetap masuk menggunakan akun Google resmi mereka; tidak ada penyimpanan password atau risiko kebocoran kredensial di server | Disepakati |
| Dual-Tier Roles: SUPERADMIN & ADMIN | `SUPERADMIN` ter-bootstrap dari `ADMIN_EMAILS` di `.env` (misal `tropicans@gmail.com`) dan memiliki hak mengundang/mencabut admin. `ADMIN` biasa hanya dapat mengelola form, submissions, dan melihat analitik | Disepakati |
| Two-Step Claim & Binding | Calon admin membuka tautan undangan `/admin/invite?token=...`, sistem memverifikasi validitas token, lalu mengarahkan ke Google Sign-In untuk mengikat email Google terverifikasi | Disepakati |

## Next Steps

1. Jalankan **/gsd-plan-phase 37** untuk merancang migrasi database SQL (`admin_users`, `admin_invitations`) dan domain helper di `src/lib/admin-invitations.ts`.
2. Lanjutkan ke Phase 38 untuk integrasi NextAuth dynamic allowlist check dan endpoint API admin user management.
3. Lanjutkan ke Phase 39 untuk antarmuka dashboard manajemen tim `/admin/users` dan halaman klaim undangan `/admin/invite`.
4. Selesaikan dengan Phase 40 untuk multi-tier verification (Vitest, lint, tsc, build standalone) dan Docker container up.

## Quick Tasks Completed

| Slug | Date | Description | Status |
|------|------|-------------|--------|
| `20260928-align-admin-login-global-design` | 2026-09-28 | Perombakan halaman login admin agar selaras dengan Global Editorial Minimalist Monochrome Design System | Complete ✓ |
| `20260928-rename-to-form-and-set-icon` | 2026-09-28 | Mengganti nama aplikasi menjadi Form dan memperbarui icon web app & favicon dengan icon baru | Complete ✓ |


