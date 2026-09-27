---
phase: 24
plan: 1
title: "Editorial Serif Typography & Global Zero-Radius Tokens Foundation"
wave: 1
dependencies: []
requirements: [EDIT-01, EDIT-02, EDIT-03, EDIT-04, EDIT-05]
status: planned
---

# Plan 24.1: Editorial Serif Typography & Global Zero-Radius Tokens Foundation

## Objective
Mengonfigurasi fondasi sistem desain visual Editorial Minimalist Monochrome di `src/app/globals.css`, menyelaraskan font stack Google Fonts (`Playfair Display`, `Source Serif 4`, `JetBrains Mono`), menetapkan palet monokrom murni `#000000` dan `#FFFFFF`, memberlakukan zero border-radius (0px) secara absolut, meniadakan drop shadow, dan memperkenalkan hierarki garis arsitektural terukur serta tekstur horizontal garis halus.

## Tasks

### Task 1: Update Design Specification Document
- **Target File:** `new_design/dashboard/DESIGN.md`
- **Actions:**
  - Perbarui filosofi desain menjadi **"The Editorial Minimalist Monochrome Architecture"**.
  - Rinci penggunaan `Playfair Display` untuk display/headline, `Source Serif 4` untuk body/pertanyaan, dan `JetBrains Mono` untuk metadata dan label.
  - Dokumentasikan aturan Strict Zero-Radius (0px pada semua elemen), peniadaan drop shadows, dan hierarki garis struktural (1px, 2px, 4px, 8px).

### Task 2: Refactor Global CSS Tokens and Reset System
- **Target File:** `src/app/globals.css`
- **Actions:**
  - Perbarui `@import url(...)` Google Fonts untuk memuat `Playfair Display`, `Source Serif 4`, dan `JetBrains Mono`.
  - Konfigurasi `:root` dan `html[data-theme='dark']`:
    - Set `--font-family: 'Source Serif 4', Georgia, 'Times New Roman', serif;`
    - Set `--font-family-display: 'Playfair Display', Georgia, serif;`
    - Set `--font-family-mono: 'JetBrains Mono', 'Fira Code', Menlo, monospace;`
    - Set `--radius-sm: 0px`, `--radius-md: 0px`, `--radius-lg: 0px`, `--radius-xl: 0px`.
    - Set `--shadow-sm: none`, `--shadow-md: none`, `--shadow-lg: none`, `--shadow-xl: none`, `--shadow-glow: none`.
    - Set warna kanvas, teks, dan border ke monokrom murni (#000000, #ffffff, #525252, #e5e5e5).
    - Definisikan token garis arsitektural: `--line-hairline: 1px`, `--line-medium: 2px`, `--line-heavy: 4px`, `--line-ultra: 8px`.
  - Terapkan reset global border radius (`border-radius: 0px !important`) pada tombol, kartu, input, pill, dan modal.
  - Tambahkan background paper subtle texture / subtle repeating horizontal lines pada body.

### Task 3: Update Test Suite & Quality Verification
- **Target File:** `src/app/globals.test.ts`
- **Actions:**
  - Tambahkan assertion untuk memverifikasi `--radius-*: 0px`, font serif Playfair & Source Serif 4, tidak adanya box-shadow ambient, dan palet monokrom.
  - Jalankan `npm test` dan `npm run lint`.

## Verification Criteria
- [ ] `src/app/globals.css` memuat font serif Playfair Display & Source Serif 4 serta JetBrains Mono.
- [ ] Seluruh token border radius bernilai `0px`.
- [ ] Seluruh token shadow disetel ke `none`.
- [ ] `new_design/dashboard/DESIGN.md` mendokumentasikan spesifikasi Editorial Monochrome v1.8.
- [ ] Seluruh tes unit vitest lolos tanpa error.
