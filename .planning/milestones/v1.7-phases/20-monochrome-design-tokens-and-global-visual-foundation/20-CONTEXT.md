# Phase 20: Monochrome Design Tokens & Global Visual Foundation — Context & Decisions

**Phase:** 20  
**Milestone:** v1.7 Monochrome Design System Overhaul  
**Status:** Locked Decisions (Recommended)  
**Date:** 2026-09-27  

## Context & Intent
Merombak seluruh token warna dan fondasi visual global aplikasi isian dari palet lama (*Teal & Deep Blue Architectural Ledger*) menjadi **The Monochrome Ledger System** (estetika minimalis, presisi, dan high-contrast ala Swiss / Tech Luxury).

## Locked Decisions (Recommended Options Selected)

### 1. Monochromatic Token Architecture
- **Palette:** Mengganti spektrum warna `--primary-*` dan `--ledger-*` di `src/app/globals.css` dengan skala warna monokromatis terkalibrasi:
  - Canvas Light: `#ffffff` / `#fafafa`
  - Canvas Dark: `#000000` / `#09090b`
  - Surface Cards Light: `#ffffff` dengan hairline border `rgba(0, 0, 0, 0.08)`
  - Surface Cards Dark: `#121214` / `#18181b` dengan hairline border `rgba(255, 255, 255, 0.08)`
  - Primary Action / Text: Obsidian pekat `#09090b` (Light) dan Crisp White `#fafafa` (Dark)
  - Secondary / Muted: Neutral Zinc `#71717a` (Light) dan `#a1a1aa` (Dark)
- **Token Mapping:** Seluruh variabel `--ledger-primary-*`, `--ledger-secondary`, `--ledger-bg`, dan `--ledger-ink` dipetakan langsung ke token monokrom sehingga seluruh komponen yang telah memakai kelas tersebut langsung berubah tema secara harmonis tanpa breaking changes.

### 2. Hairline Border & Elevation System
- Menggantikan aturan "No-Line" kaku dengan **Precision Hairline Borders (1px)**:
  - Light mode: `1px solid rgba(0, 0, 0, 0.08)` atau `#e4e4e7`
  - Dark mode: `1px solid rgba(255, 255, 255, 0.08)` atau `#27272a`
- Memadukan hairline border dengan *ambient soft shadows* dan efek transparan halus (*backdrop-filter blur*) pada elemen floating (header, dropdown, ThemeToggle).

### 3. Restrained Semantic Status
- Untuk pesan error input form dan banner konfirmasi, gunakan warna fungsional desaturasi (*muted emerald* dan *muted crimson*) atau badge high-contrast monokrom dengan titik indikator kecil, agar UX dan aksesibilitas tetap 100% jelas bagi pengguna.

### 4. Specification Synchronization
- Menyesuaikan file [new_design/dashboard/DESIGN.md](file:///c:/Users/X1%20Carbon/Downloads/Projects/self-hosted-ai-starter-kit/Dev/presse/new_design/dashboard/DESIGN.md) menjadi spesifikasi **"Monochrome Ledger: Design System Specification"**.

## Scope Boundaries
- **In Scope:**
  - Token CSS di `src/app/globals.css` (`:root`, `html[data-theme='dark']`, `.theme-toggle`, body backgrounds).
  - Spesifikasi desain di `new_design/dashboard/DESIGN.md`.
  - Global styles (scrollbar, font weights, global inputs).
- **Out of Scope (Deferred to subsequent phases):**
  - Komponen spesifik form publik (`AttendanceForm.tsx`, stepper, signature pad) -> Phase 21.
  - Komponen admin dashboard, form builder, and submissions table -> Phase 22.
