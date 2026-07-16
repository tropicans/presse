# isian - Form Builder & Administration

## What This Is
Platform pengelolaan formulir publik, kiriman (submissions), dan dashboard admin untuk kebutuhan survei, webinar, kuis, dan kehadiran instansi/pemerintah.

## Core Value
Memungkinkan pembuatan dan pengisian formulir publik secara dinamis, andal, cepat, dan aman dengan dukungan visual yang premium.

## Current Milestone: v1.3 llm-submission-analysis

**Goal:** Mengintegrasikan LLM (OpenAI-compatible) untuk melakukan analisis mendalam secara kualitatif dan kuantitatif terhadap data kiriman (*submissions*) pengguna dari Admin Panel.

**Target features:**
- Integrasi koneksi API OpenAI-compatible (`https://sembilan.kelazz.my.id/v1`) via env variables.
- Skema penyimpanan model `FormAiAnalysis` di basis data untuk menyimpan histori analisis.
- API Route endpoint untuk memicu proses analisis secara manual dan mengambil hasilnya.
- UI tab/panel baru "Analisis AI" pada halaman kiriman formulir dengan dukungan render Markdown hasil analisis.

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

### Active
(Semua persyaratan aktif untuk milestone ini telah selesai diverifikasi)

### Out of Scope
- Analisis otomatis setiap kali submission baru masuk (pemicuan dibatasi secara manual demi efisiensi biaya API).
- Visualisasi grafik canggih di luar rendering teks Markdown yang rapi dan terformat di UI.

## Context
- Tech Stack: Next.js (App Router), Prisma, PostgreSQL.
- Koneksi OpenAI-compatible menggunakan base URL kustom: `https://sembilan.kelazz.my.id/v1` dengan autentikasi API Key.
- Data input LLM mencakup seluruh data isian dari `SubmissionAnswer` yang terhubung to `Submission` pada formulir terkait.
- Shipped v1.3 with ~1,250 source/test LOC added. Tech stack is stable with Prisma PostgreSQL and customized OpenAI client wrapper.

## Key Decisions
| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dukungan opsi dinamis | Memungkinkan skala Likert 4 opsi (force-choice tanpa netral) dan ukuran lainnya | ✓ Selesai |
| Audit Saja | Memetakan semua masalah frontend admin sebelum merusak alur kode yang sudah stabil | ✓ Selesai |
| Eksekusi Perbaikan Langsung (v1.1) | Menyelesaikan temuan audit (quick wins & high impact) demi memulihkan aksesibilitas dan responsivitas admin | ✓ Selesai |
| UX Audit Mendalam (v1.2) | Melakukan evaluasi pengalaman pengguna komprehensif tingkat enterprise untuk menentukan roadmap produk jangka panjang | ✓ Selesai |
| Tombol Hapus Nonaktif untuk Template | Mencegah admin berasumsi tombol aktif bisa digunakan untuk menghapus template default | ✓ Selesai |
| Analisis Manual Ter-cache | Menggunakan pemicu tombol manual dan menyimpan hasil analisis di DB untuk mengoptimalkan kuota dan biaya API | ✓ Selesai |
| Fail-fast Env Validation | Gated environment checks fail-fast on load to abort request processing immediately when keys are missing | ✓ Selesai |
| Qualitative Free-text Sampling | Gated qualitative free-text data to a static sample size of 50 to maintain performance inside standard token limits | ✓ Selesai |
| Custom Dependency-free Parser | Confirmed custom parser implementation without introducing heavy external markdown libraries | ✓ Selesai |

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
*Last updated: 2026-07-16 after completing v1.3 milestone*
