---
phase: 20
plan: 1
title: "Monochrome Design Tokens & Global Visual Foundation"
wave: 1
dependencies: []
requirements: [MONO-01, MONO-02, MONO-03]
status: planned
---

# Plan 20.1: Monochrome Design Tokens & Global Visual Foundation

## Objective
Merumuskan ulang sistem desain visual aplikasi menjadi Monochrome High-Contrast (Swiss/Tech Luxury) dengan memperbarui token CSS global di `src/app/globals.css` serta mendokumentasikan spesifikasi desain di `new_design/dashboard/DESIGN.md`.

## Tasks

### Task 1: Update Design Specification Document
- **Target File:** `new_design/dashboard/DESIGN.md`
- **Actions:**
  - Perbarui filosofi desain menjadi **"The Monochrome Ledger"** (Swiss Minimalist & High-Contrast Tech Style).
  - Tuliskan tabel token warna monokrom (Obsidian, Charcoal, Grays, Crisp White) dan aturan *Precision Hairline Borders (1px)*.
  - Perbarui pedoman tipografi dan elevasi.

### Task 2: Refactor Global CSS Tokens and Base Variables
- **Target File:** `src/app/globals.css`
- **Actions:**
  - Ubah `:root` (Light mode): Ganti palet `--primary-*` dan `--ledger-*` menjadi spektrum netral/grayscale (Light canvas `#f9fafb`/`#ffffff`, ink `#09090b`, muted `#71717a`, borders `#e4e4e7` / `rgba(0,0,0,0.08)`).
  - Ubah `html[data-theme='dark']` (Dark mode): Ganti latar menjadi pitch black `#000000`/`#09090b`, surface cards `#121214`/`#18181b`, ink `#fafafa`, muted `#a1a1aa`, hairline borders `rgba(255,255,255,0.08)` / `#27272a`.
  - Harmonisasikan styling body background, `.theme-toggle`, scrollbars, dan token semantik (`--bg-app`, `--bg-surface`, `--bg-input`, `--border-default`, `--border-focus`).

### Task 3: Foundation Verification & Lint Check
- **Actions:**
  - Jalankan `npm run lint` dan `npm run test` untuk memastikan tidak ada syntax error atau regresi pada modul aplikasi.

## Verification Criteria
- [ ] `new_design/dashboard/DESIGN.md` mencerminkan spesifikasi Monochrome Ledger.
- [ ] Seluruh token warna di `globals.css` konsisten monokrom tanpa artefak warna biru/teal lama di `:root` maupun `html[data-theme='dark']`.
- [ ] `npm run lint` dan `npm run test` lulus tanpa error.
