# Phase 26: Admin Suite & Form Builder Editorial Minimalist Transformation — Context & Decisions

**Phase:** 26  
**Milestone:** v1.8 Editorial Minimalist Monochrome Transformation  
**Status:** Locked Decisions (Recommended)  
**Date:** 2026-09-27  

## Context & Intent
Mentransformasikan seluruh antarmuka admin suite (`/admin/login`, `/admin/forms`, `/admin/forms/[id]/edit`, `/admin/forms/[id]/submissions`, `AdminFormEditor.tsx`, dan `AdminHeader.tsx`) menjadi **Editorial Minimalist Monochrome (Architectural Luxury & Print Precision)**. Seluruh dashboard admin, tab langkah editor, kartu pertanyaan, outline hierarki form, toolbar melayang, dan tabel rekaman submissions harus bersenyawa dalam arsitektur garis terukur tanpa radius, tipografi serif bermartabat, dan kontras monokrom biner mutlak.

## Locked Decisions (Recommended Options Selected)

### 1. Admin Header & Masthead Architecture
- **Masthead:** `.admin-header` dan navbar atas menggunakan latar belakang hitam pekat `#000000` (atau putih bersih di light mode dengan border 2px solid hitam), pembatas bawah 4px solid (`--line-heavy`), dan judul masthead serif (`Playfair Display`).
- **Counts & Metadata:** Badge jumlah kiriman (`.admin-count-badge`), ID form, dan waktu menggunakan font monospace `JetBrains Mono` berbingkai 1px solid tanpa sudut lengkung.
- **Action Buttons:** Tombol ekspor, buat form baru, dan aksi toolbar menggunakan gaya biner editorial (hitam pekat dengan teks putih, 0px radius, terinversi instan saat hover).

### 2. Admin Form Builder (`AdminFormEditor.tsx`)
- **Step Tabs:** Tab navigasi langkah (Langkah 1, 2, ..., n) menggunakan sudut siku 90 derajat sempurna (0px radius). Tab aktif memiliki border bawah 4px tebal hitam/putih pekat atau terinversi biner penuh.
- **Field Cards (Accordion):** Kartu pertanyaan memiliki border 2px solid, tanpa shadow, dengan header ringkasan yang jelas: nomor urut monospace tebal (`01.`, `02.`), judul serif/mono yang rapi, dan indikator wajib/opsional bergaris arsitektural.
- **Sticky Action Toolbar:** Toolbar tindakan sticky menggunakan border 2px solid kontras tinggi, background semi-transparan ber-blur atau solid opaq tanpa shadow, dan tombol-tombol aksi bersiku siku.
- **Form Outline Panel:** Panel navigasi peta form samping berbingkai 1px hairline dengan penanda seleksi aktif garis vertikal 4px.

### 3. Submissions Table & Data View (`/admin/forms/[id]/submissions`)
- **Table Container:** Menggunakan border 2px solid mengelilingi seluruh tabel dengan border-radius 0px.
- **Headers & Rows:**
  - Header kolom tebal bergaris 2px bawah, tipografi monospace huruf kapital (`JetBrains Mono`).
  - Baris sel bergantian latar atau dipisahkan oleh 1px hairline border presisi tanpa drop shadow.
  - Sticky header tetap solid dan sejajar saat data di-scroll.
- **Detail Submissions Modal / Card:** Kartu ringkasan kiriman dengan tipografi editorial dan penampil JSON/tanda tangan berbingkai tajam.

### 4. Admin Login Suite (`/admin/login`)
- Panel login berbingkai arsitektural 2px solid hitam/putih murni, judul serif tebal `Playfair Display`, teks instruksi `Source Serif 4`, dan tombol login Google biner bergaris tegas.

## Scope Boundaries
- **In Scope:**
  - Styling admin di `src/app/globals.css`.
  - Halaman `/admin/login`, `/admin/forms`, `/admin/forms/[id]/edit`, dan `/admin/forms/[id]/submissions`.
  - Komponen `AdminFormEditor.tsx` dan `AdminHeader.tsx`.
- **Out of Scope (Deferred to Phase 27):**
  - End-to-end integration check, Docker build verification, dan final milestone audit.
