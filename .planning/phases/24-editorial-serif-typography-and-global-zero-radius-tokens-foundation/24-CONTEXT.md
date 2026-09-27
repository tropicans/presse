# Phase 24: Editorial Serif Typography & Global Zero-Radius Tokens Foundation — Context & Decisions

**Phase:** 24  
**Milestone:** v1.8 Editorial Minimalist Monochrome Transformation  
**Status:** Locked Decisions (Recommended)  
**Date:** 2026-09-27  

## Context & Intent
Mentransformasikan seluruh visual sistem aplikasi isian dari monochrome utilitarian bergaya modern sans-serif menjadi **Editorial Minimalist Monochrome (Editorial Luxury & Architectural Precision)**: perpaduan tipografi serif sastra/editorial, monospaced tabular cues, ketajaman sudut 90 derajat siku (0px border-radius menyeluruh), peniadaan drop shadow ambient untuk digantikan hierarki garis arsitektural (1px, 2px, 4px, 8px), dan tekstur kertas cetak tipis.

## Locked Decisions (Recommended Options Selected)

### 1. Classical Editorial Serif & Monospace Typography Stack
- **Display / Headlines:** Mengadopsi `Playfair Display` (font serif dengan kontras goresan vertikal/horizontal dramatis) untuk judul halaman, nama formulir, nomor langkah hero, dan judul kartu utama.
- **Body & Form Questions:** Mengadopsi `Source Serif 4` untuk teks badan, deskripsi formulir, label pertanyaan input, dan panduan teks agar memberikan kenyamanan membaca panjang layaknya membaca publikasi editorial kuratorial.
- **Metadata, Badges & Numbers:** Mengadopsi `JetBrains Mono` untuk overlines, label status, penomoran urut (misal `01.`, `02.`), ID kiriman, dan cap waktu.
- **Google Fonts Import:** Memperbarui URL Google Fonts di `src/app/globals.css` dengan `Playfair+Display`, `Source+Serif+4`, dan `JetBrains+Mono`.

### 2. Pure Black & White Absolute Monochrome Palette
- **Canvas & Surfaces:**
  - Light mode: Kanvas `#FFFFFF`, kartu `#FFFFFF`, ink utama `#000000`.
  - Dark mode: Kanvas `#000000`, kartu `#000000` / `#0A0A0A`, ink utama `#FFFFFF`.
- **Secondary & Dividers:**
  - Light secondary text: `#525252`, hairline divider: `#E5E5E5` / `#000000`.
  - Dark secondary text: `#A3A3A3`, hairline divider: `#262626` / `#FFFFFF`.
- **Semantic Feedback:** Meniadakan warna cerah. Feedback sukses dan error disampaikan lewat tipografi monospace berbingkai hitam/putih tebal, ikon geometris tegas, atau warna hitam kontras biner.

### 3. Strict Zero-Radius Everywhere (0px Architecture)
- Mengubah token:
  - `--radius-sm: 0px`
  - `--radius-md: 0px`
  - `--radius-lg: 0px`
  - `--radius-xl: 0px`
- Menetapkan aturan zero-radius absolut untuk seluruh elemen UI: tombol, kartu, input teks, textarea, dropdown, modal dialog, pill badges, signature pad, dan theme toggle switch.

### 4. Zero Drop Shadows & Architectural Line Hierarchy
- Menghapus seluruh efek bayangan ambient:
  - `--shadow-sm: none`
  - `--shadow-md: none`
  - `--shadow-lg: none`
  - `--shadow-xl: none`
  - `--shadow-glow: none`
- Membangun kedalaman dan pemisahan spasial murni menggunakan ketebalan garis (Line Hierarchy):
  - Hairline: `1px solid`
  - Standard/Divider: `1px solid`
  - Accent/Focus: `2px solid`
  - Editorial Heavy Section: `4px solid`
  - Structural Masthead/Banner: `8px solid`

### 5. Subtle Layered Paper & Line Textures
- Mengimplementasikan background repeating horizontal lines (garis halus 1px berjarak interval) pada kanvas dasar aplikasi untuk memberikan sensasi kertas koran/monograf fisik mewah tanpa mengganggu keterbacaan teks.

### 6. Design Specification Synchronization
- Menyelaraskan [new_design/dashboard/DESIGN.md](file:///c:/Users/X1%20Carbon/Downloads/Projects/self-hosted-ai-starter-kit/Dev/presse/new_design/dashboard/DESIGN.md) untuk mendokumentasikan spesifikasi v1.8 Editorial Minimalist Monochrome.

## Scope Boundaries
- **In Scope:**
  - CSS tokens dan aturan dasar di `src/app/globals.css`.
  - Spesifikasi desain di `new_design/dashboard/DESIGN.md`.
  - Unit test tokens di `src/app/globals.test.ts`.
- **Out of Scope (Deferred to subsequent phases):**
  - Refactoring mendalam komponen form publik `AttendanceForm.tsx` & `/f/[slug]` (Phase 25).
  - Refactoring layar konfirmasi `/success` (Phase 25).
  - Refactoring form builder admin dan daftar submission (Phase 26).
  - Container build & visual regression verification (Phase 27).
