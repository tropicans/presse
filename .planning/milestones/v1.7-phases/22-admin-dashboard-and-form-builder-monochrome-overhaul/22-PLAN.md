---
phase: 22
plan: 1
title: "Admin Dashboard & Form Builder Monochrome Overhaul"
wave: 1
dependencies: [20, 21]
requirements: [MONO-07, MONO-08]
status: planned
---

# Plan 22.1: Admin Dashboard & Form Builder Monochrome Overhaul

## Objective
Merombak seluruh styling antarmuka admin, dashboard formulir, builder editor multi-langkah, dan tabel pengiriman data ke sistem desain Monochrome High-Contrast (Swiss/Tech Luxury) tanpa menyisakan nuansa warna teal atau biru lama.

## Tasks

### Task 1: Modernize Admin Step Tabs & Builder Styles in `globals.css`
- **Target File:** `src/app/globals.css`
- **Actions:**
  - Ganti warna teal `#00483f` / `rgba(0, 72, 63, ...)` pada `.admin-step-tab.active`, hover, dan `.admin-step-tab-badge` dengan solid black/white dan hairline border monokrom.
  - Perbarui outline navigation peta form (`.admin-outline-*`), collapsible field cards, summary header, dan sticky toolbar editor ke estetika monokromatis.

### Task 2: Modernize Dashboard, Submissions Table & Export Actions
- **Target File:** `src/app/globals.css`
- **Actions:**
  - Selaraskan `.forms-dashboard-sidebar`, `.forms-dashboard-stat-card`, dan panel form dengan hairline borders dan tipografi kontras.
  - Selaraskan tabel kiriman (`.forms-dashboard-table`), sticky header, chip status (draft, published, archived), dan tombol ekspor Excel.

### Task 3: Modernize Admin Login Suite
- **Target File:** `src/app/globals.css`
- **Actions:**
  - Pastikan `.login-suite-panel`, form input, dan tombol login Google tampil bersih dan presisi dalam tema monokrom.

### Task 4: Verification & Automated Test Pass
- **Actions:**
  - Jalankan `npm run lint` dan `npm run test` untuk memastikan kepatuhan kode dan kelulusan seluruh test.

## Verification Criteria
- [ ] Tab langkah builder editor aktif menampilkan warna solid monokrom hitam/putih.
- [ ] Seluruh sisa fallback warna teal/blue di kelas-kelas admin tergantikan.
- [ ] Tabel submissions dan header sticky tampil tajam dan mudah dibaca di kedua mode.
- [ ] `npm run lint` dan `npm run test` lulus 100%.
