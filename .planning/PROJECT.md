# isian - Form Builder & Administration

## What This Is
Platform pengelolaan formulir publik, kiriman (submissions), dan dashboard admin untuk kebutuhan survei, webinar, kuis, dan kehadiran instansi/pemerintah.

## Core Value
Memungkinkan pembuatan dan pengisian formulir publik secara dinamis, andal, cepat, dan aman dengan dukungan visual yang premium.

## Current State
Milestone **v1.5 Admin Form Builder UX & Scalability Enhancement** has shipped (2026-09-25).
All 16 phases across milestones v1.1 - v1.5 are complete and verified.

## Next Milestone Goals
Milestone **v1.6** will be determined via `/gsd-new-milestone`. Potential areas:
- Form section templates & reusable block snippets
- Public form response analytics charts & visualizations
- Advanced conditional display logic preview within the builder

<details>
<summary>Archived Milestone v1.5: Admin Form Builder UX & Scalability Enhancement</summary>

**Goal:** Memodernisasi UI & UX Admin Form Editor agar pengelolaan formulir dengan puluhan field menjadi ringkas, terstruktur per langkah, cepat dinavigasi, dan nyaman disunting tanpa scroll vertikal tanpa akhir.

**Delivered features:**
- **Step Tabs Navigation:** Pengelompokan dan penyaringan field berdasarkan langkah aktif (Step Tabs) dengan opsi "Semua Langkah".
- **Collapsible Field Cards & Compact View:** Kartu field dapat dilipat/dibuka secara individual maupun massal (Expand All / Collapse All) dengan ringkasan header (tipe, status wajib, opsi).
- **Field Outline & Quick Jump Panel:** Panel samping navigasi hierarki untuk melompat langsung ke pertanyaan dan melakukan reorder cepat.
- **Fast Field Manipulation:** Aksi duplikasi field, penambahan field langsung ke langkah yang sedang aktif, dan pemindahan antar langkah.
- **Workspace Layout Polish:** Sticky action bar, visual density seimbang, status auto-save jelas, dan pengurangan visual clutter pada form panjang.

</details>

## Requirements

### Validated
- ✓ Pembuatan dan pengeditan form dasar (teks, area teks, radio, dropdown, tanda tangan)
- ✓ Alur validasi server-side dan client-side dasar
- ✓ Pratinjau draf form admin
- ✓ Ekspor kiriman data ke Excel (XLSX) dengan pembagian file per 500 baris
- ✓ **LIKERT-01**: Dukungan custom jumlah opsi/tingkat pada field Likert di editor admin form
- ✓ **LIKERT-02**: Penyesuaian tata letak grid dan teks bantuan skala Likert di form publik secara dinamis
- ✓ **LIKERT-03**: Penyelarasan meta label ekstrem/tengah skala Likert untuk jumlah opsi ganjil (neutral) dan genap (non-neutral)
- ✓ **AUDIT-01** - **AUDIT-06**: Audit Frontend Admin (v1.1)
- ✓ **UX-AUDIT-01** - **UX-AUDIT-09**: UX Audit & Perbaikan Phase 1-3 (v1.2 - Auto-save, Bulk actions Kehadiran & Submissions, Toggle Preview responsif mobile, Visual disabled button safety)
- ✓ **LLM-ANALYSIS-01** - **LLM-ANALYSIS-04**: OpenAI-compatible LLM connectivity configuration, Prisma schema updates, and endpoint handlers for ai-analysis (Validated in Phase 10)
- ✓ **LLM-ANALYSIS-05**: Tabbed UI panel, custom Markdown renderer, manual regenerate triggers, and sample metadata display (Validated in Phase 11)
- ✓ **TABLE-01**: Sticky column headers with light/dark adaptive solid background on `/admin/forms/[id]/submissions` (Validated in Phase 12)
- ✓ **LOAD-01**: Skeleton shimmer loading animation on `/admin/forms` (Validated in Phase 12)
- ✓ **LOAD-02**: Skeleton shimmer loading animation on `/admin/forms/[id]/submissions` (Validated in Phase 12)
- ✓ **EMPTY-01**: Minimalist SVG illustration & "Buat Formulir Baru" CTA button on `/admin/forms` (Validated in Phase 13)
- ✓ **EMPTY-02**: Minimalist SVG illustration & contextual guidance on `/admin/forms/[id]/submissions` (Validated in Phase 13)
- ✓ **BUILDER-01**: Step Tabs Navigation — Navigasi tab langkah (Langkah 1, 2, ..., n, dan "Semua Langkah") untuk menyaring tampilan field sesuai langkah aktif di editor form (Validated in Phase 14)
- ✓ **BUILDER-02**: Step Field Count & Empty Indicator — Bilah tab langkah menampilkan indikator jumlah field pada setiap tab dan indikasi visual jika suatu langkah masih kosong (Validated in Phase 14)
- ✓ **BUILDER-03**: Collapsible Field Cards — Kartu field dapat dilipat dan dibuka secara individual dengan isolasi event klik (Validated in Phase 15)
- ✓ **BUILDER-04**: Informative Collapsed Headers — Header kartu field yang tertutup menyajikan nomor urut, label pertanyaan, pill tipe field, badge wajib, dan jumlah opsi/poin kuis (Validated in Phase 15)
- ✓ **BUILDER-05**: Mass Accordion Controls — Tombol "Buka Semua" dan "Tutup Semua" untuk audit makro formulir (Validated in Phase 15)
- ✓ **BUILDER-06**: Outline Navigation Panel — Panel samping navigasi hierarki langkah dan daftar pertanyaan ("Peta Formulir") (Validated in Phase 16)
- ✓ **BUILDER-07**: Smooth Quick Jump with Auto-Expand — Lompat langsung ke field target, auto-switch tab, auto-buka kartu, dan animasi sorotan glowing (Validated in Phase 16)
- ✓ **BUILDER-08**: 1-Click Field Duplicate — Duplikasi field instan beserta konfigurasi dan opsi pada langkah yang sama (Validated in Phase 16)
- ✓ **BUILDER-09**: Active Step Field Insertion — Field baru otomatis ditambahkan ke langkah yang sedang aktif (Validated in Phase 14)
- ✓ **BUILDER-10**: Sticky Workspace Header & Toolbar — Sticky action header dan toolbar yang menjaga tombol kontrol tetap dalam jangkauan (Validated in Phase 16)

### Out of Scope
- Perubahan arsitektur basis data atau skema SQL publik (struktur `pages` dan `fields` JSON sudah mendukung multi-step).
- Pustaka drag-and-drop eksternal yang berat (menggunakan navigasi keyboard/tombol aksi instan dan HTML5 reorder ringan atau action-based move).

## Context
- Tech Stack: Next.js 16 (App Router), React 19, Vanilla CSS Design System (`globals.css`), Prisma, PostgreSQL.
- Form editor utama berada di `src/components/AdminFormEditor.tsx`.
- Styling mengacu pada token tema institusional di `src/app/globals.css`.

## Key Decisions
| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dukungan opsi dinamis | Memungkinkan skala Likert 4 opsi (force-choice tanpa netral) dan ukuran lainnya | ✓ Selesai |
| Audit Saja | Memetakan semua masalah frontend admin sebelum merusak alur kode yang sudah stabil | ✓ Selesai |
| Eksekusi Perbaikan Langsung (v1.1) | Menyelesaikan temuan audit (quick wins & high impact) demi memulihkan aksesibilitas dan responsivitas admin | ✓ Selesai |
| UX Audit Mendalam (v1.2) | Melakukan evaluasi pengalaman pengguna komprehensif tingkat enterprise untuk menentukan roadmap produk jangka panjang | ✓ Selesai |
| Tombol Hapus Nonaktif untuk Template | Mencegah admin berasumsi tombol aktif bisa digunakan untuk menghapus template default | ✓ Selesai |
| Analisis Manual Ter-cache | Menggunakan pemicu tombol manual dan menyimpan hasil analisis di DB untuk mengoptimalkan kuota dan biaya API | ✓ Selesai |
| Pure CSS Animations | Menjaga performa render 60fps tanpa membebani bundle JS runtime | ✓ Selesai |
| Sticky Table Headers & Skeleton Loaders | Meningkatkan kenyamanan visual dan persepsi performa saat navigasi data besar | ✓ Selesai |
| Actionable SVG Empty States | Memberikan instruksi onboarding yang jelas dan langsung dapat ditindaklanjuti saat data kosong | ✓ Selesai |
| Step-Centric Builder Architecture (v1.5) | Memecah tumpukan kartu field menjadi per langkah dan mode ringkas agar form besar tetap ringan dan mudah dikelola | ✓ Selesai |
| Zero External DND/Animation Libs | Menghindari beban bundle JS dan konflik sentuh di tablet/mobile dengan mengandalkan tombol aksi instan & native CSS | ✓ Selesai |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-09-25 for Milestone v1.5*
