# isian - Form Builder & Administration

## What This Is
Platform pengelolaan formulir publik, kiriman (submissions), dan dashboard admin untuk kebutuhan survei, webinar, kuis, dan kehadiran instansi/pemerintah.

## Core Value
Memungkinkan pembuatan dan pengisian formulir publik secara dinamis, andal, cepat, dan aman dengan dukungan visual yang premium.

## Current Milestone: v1.1 admin-frontend-audit

**Goal:** Melakukan audit frontend menyeluruh pada modul admin untuk mengidentifikasi inkonsistensi UI/UX, masalah design system, responsivitas, aksesibilitas, dan merumuskan rekomendasi perbaikan.

**Target features:**
- Audit Design System (warna, tipografi, spacing, border radius, shadow, ikonografi).
- Audit Konsistensi Komponen (tombol, form, modal, tabel, kartu, navigasi).
- Audit User Experience (loading, empty, error, feedback states).
- Audit Responsive Design (mobile, tablet, desktop).
- Audit Aksesibilitas (kontras, navigasi keyboard, struktur semantik).
- Laporan Audit Komprehensif (Quick wins, High impact, design system, UI-SPEC).

## Requirements

### Validated
- ✓ Pembuatan dan pengeditan form dasar (teks, area teks, radio, dropdown, tanda tangan)
- ✓ Alur validasi server-side dan client-side dasar
- ✓ Pratinjau draf form admin
- ✓ Ekspor kiriman data ke Excel (XLSX) dengan pembagian file per 500 baris
- ✓ **LIKERT-01**: Dukungan custom jumlah opsi/tingkat pada field Likert di editor admin form
- ✓ **LIKERT-02**: Penyesuaian tata letak grid dan teks bantuan skala Likert di form publik secara dinamis
- ✓ **LIKERT-03**: Penyelarasan meta label ekstrem/tengah skala Likert untuk jumlah opsi ganjil (neutral) dan genap (non-neutral)
- ✓ **AUDIT-01**: Audit Design System (warna, tipografi, spacing, border radius, shadow, ikonografi) pada modul admin (Fase 4)
- ✓ **AUDIT-02**: Audit Konsistensi Komponen (tombol, form, modal, tabel, kartu, navigasi) pada modul admin (Fase 4)
- ✓ **AUDIT-03**: Audit User Experience (loading, empty, error, feedback states) pada modul admin (Fase 5)
- ✓ **AUDIT-04**: Audit Responsive Design (mobile, tablet, desktop) pada modul admin (Fase 5)
- ✓ **AUDIT-05**: Audit Aksesibilitas (rasio kontras, navigasi keyboard, struktur HTML semantik) pada modul admin (Fase 6)
- ✓ **AUDIT-06**: Penyusunan Laporan Audit Komprehensif (Quick wins, High impact, rekomendasi design system, dan UI-SPEC) (Fase 6)

### Active

### Out of Scope
- Kuis/soal skor pada field tipe Likert
- Logika percabangan alur (routing) berbasis pilihan Likert
- Melakukan modifikasi/perbaikan kode selama fase audit ini (Telah dilalui dan diselesaikan pada fase perbaikan)

## Context
- Tech Stack: Next.js (App Router), Prisma, PostgreSQL.
- Likert fields telah diselesaikan dan mendukung kustomisasi jumlah opsi/tingkat (1-N) dengan rendering dinamis di sisi publik.
- Audit frontend admin selesai dilaksanakan dan seluruh perbaikan krusial (A11y, Responsivitas, Visual Contrast, Loading State) telah diterapkan.

## Key Decisions
| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dukungan opsi dinamis | Memungkinkan skala Likert 4 opsi (force-choice tanpa netral) dan ukuran lainnya | ✓ Selesai |
| Audit Saja | Memetakan semua masalah frontend admin sebelum merusak alur kode yang sudah stabil | ✓ Selesai |
| Eksekusi Perbaikan Langsung | Menyelesaikan temuan audit (quick wins & high impact) demi memulihkan aksesibilitas dan responsivitas admin | ✓ Selesai |

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
*Last updated: 2026-06-17 after completing Admin Frontend Audit milestone*
