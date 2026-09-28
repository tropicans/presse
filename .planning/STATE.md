---
gsd_state_version: 1.0
milestone: v2.1
milestone_name: Admin Invitation System & Google OAuth Access Delegation
status: completed
last_updated: "2026-09-28T11:15:00.000Z"
last_activity: 2026-09-28
progress:
  total_phases: 4
  completed_phases: 4
  total_plans: 4
  completed_plans: 4
  percent: 100
current_phase: 40
current_phase_name: Multi-Tier Verification, Security Audit & Docker Container Up
---

# Project State: Admin Invitation System & Google OAuth Access Delegation (Completed)

## Project Reference

See: [.planning/PROJECT.md](file:///c:/Users/yudhiar/Downloads/oprek/Dev/jott/.planning/PROJECT.md) (updated 2026-09-28)  
Archived Requirements: [.planning/milestones/v2.1-REQUIREMENTS.md](file:///c:/Users/yudhiar/Downloads/oprek/Dev/jott/.planning/milestones/v2.1-REQUIREMENTS.md)  
Roadmap: [.planning/ROADMAP.md](file:///c:/Users/yudhiar/Downloads/oprek/Dev/jott/.planning/ROADMAP.md)  

**Core value:** Memungkinkan pembuatan dan pengisian formulir publik secara dinamis, andal, cepat, dan aman dengan dukungan visual yang compact, modern, dan bernilai guna tinggi.  
**Milestone status:** Completed (Shipped 2026-09-28).

## Current Position

Milestone: v2.1 — Admin Invitation System & Google OAuth Access Delegation  
Status: Completed  
Phases:
- [x] Phase 37: Database Schema, Migration & Core Domain Helpers for Admin Invitations (Completed 2026-09-28)
- [x] Phase 38: NextAuth Integration & Admin User Management API Routes (Completed 2026-09-28)
- [x] Phase 39: Admin Team UI & Public Invitation Claim Flow (Completed 2026-09-28)
- [x] Phase 40: Multi-Tier Verification, Security Audit & Docker Container Up (Completed 2026-09-28)

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| Model Undangan Berbasis Token Link (48 Jam) | Opsi B dipilih: Admin men-generate tautan undangan ber-token acak kriptografis (TTL 48 jam) untuk disalin (*copy-to-clipboard*) dan dibagikan langsung tanpa memerlukan SMTP server pihak ketiga | Selesai & Terverifikasi |
| Autentikasi Tetap Google OAuth (Zero Password) | Pengguna yang diundang tetap masuk menggunakan akun Google resmi mereka; tidak ada penyimpanan password atau risiko kebocoran kredensial di server | Selesai & Terverifikasi |
| Dual-Tier Roles: SUPERADMIN & ADMIN | `SUPERADMIN` ter-bootstrap dari `ADMIN_EMAILS` di `.env` (misal `tropicans@gmail.com`) dan memiliki hak mengundang/mencabut admin. `ADMIN` biasa hanya dapat mengelola form, submissions, dan melihat analitik | Selesai & Terverifikasi |
| Two-Step Claim & Binding | Calon admin membuka tautan undangan `/admin/invite?token=...`, sistem memverifikasi validitas token, lalu mengarahkan ke Google Sign-In untuk mengikat email Google terverifikasi | Selesai & Terverifikasi |

## Next Steps

1. Milestone v2.1 telah selesai dan diarsip.
2. Siap untuk inisiasi milestone berikutnya melalui `/gsd-new-milestone`.

## Quick Tasks Completed

| Slug | Date | Description | Status |
|------|------|-------------|--------|
| `20260928-align-admin-login-global-design` | 2026-09-28 | Perombakan halaman login admin agar selaras dengan Global Editorial Minimalist Monochrome Design System | Complete ✓ |
| `20260928-rename-to-form-and-set-icon` | 2026-09-28 | Mengganti nama aplikasi menjadi Form dan memperbarui icon web app & favicon dengan icon baru | Complete ✓ |
| `20260928-fix-canonical-invite-url-origin` | 2026-09-28 | Perbaikan origin URL tautan undangan admin agar memprioritaskan domain kanonikal (NEXTAUTH_URL/form.ppkasn.id) dan menyaring host 0.0.0.0 | Complete ✓ |
| `20260928-form-field-copy-from-feature` | 2026-09-28 | Fitur salin nilai pertanyaan (Checkbox 'Sama dengan...') pada Form Builder, Public Form, dan Live Preview | Complete ✓ |

