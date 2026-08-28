# isian - Form Builder & Administration

## What This Is
Platform pengelolaan formulir publik, kiriman (submissions), dan dashboard admin untuk kebutuhan survei, webinar, kuis, dan kehadiran instansi/pemerintah.

## Core Value
Memungkinkan pembuatan dan pengisian formulir publik secara dinamis, andal, cepat, dan aman dengan dukungan visual yang premium.

## Current State
Milestone **v1.4 UI Polish & Admin Experience Enhancement** has shipped (2026-08-28).

**Accomplishments in v1.4:**
- **Sticky Table Headers:** Baris `<thead>` pada tabel kiriman (`/admin/forms/[id]/submissions`) mengambang di atas saat scrolling dengan background solid adaptif di mode terang dan gelap (`TABLE-01`).
- **Skeleton Shimmer Loaders:** Spinner statis digantikan dengan skeleton shimmer animation di `/admin/forms` (`LOAD-01`) dan `/admin/forms/[id]/submissions` (`LOAD-02`).
- **Enhanced Empty States & Visual CTAs:** Visual ilustrasi SVG bertema dengan tombol Call-to-Action (CTA) kontekstual dan aksi pencarian reset di `/admin/forms` (`EMPTY-01`) dan `/admin/forms/[id]/submissions` (`EMPTY-02`).

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

### Active
*(None — milestone v1.4 complete. Define next milestone with `/gsd-new-milestone`)*

### Out of Scope
- Perubahan arsitektur basis data atau modifikasi skema Prisma (untuk v1.4).
- Penambahan pustaka animasi JavaScript pihak ketiga (tetap menggunakan Vanilla CSS murni dan keyframe animations).

## Context
- Tech Stack: Next.js (App Router), React 19, Vanilla CSS Design System (`globals.css`), Prisma, PostgreSQL.
- Semua styling mengacu pada token warna institusional di `globals.css` (Ocean Teal, Slate, Ledger theme).
- Milestone v1.4 selesai dengan peningkatan visual UI/UX & micro-interactions.

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
*Last updated: 2026-08-28 after completing v1.4 milestone*
