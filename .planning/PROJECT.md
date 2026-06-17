# isian - Form Builder & Administration

## What This Is
Platform pengelolaan formulir publik, kiriman (submissions), dan dashboard admin untuk kebutuhan survei, webinar, kuis, dan kehadiran instansi/pemerintah.

## Core Value
Memungkinkan pembuatan dan pengisian formulir publik secara dinamis, andal, cepat, dan aman dengan dukungan visual yang premium.

## Current Milestone: v1.2 admin-ux-audit

**Goal:** Melakukan UX Audit mendalam terhadap Admin Panel yang sudah ada untuk mengidentifikasi isu usability, workflow friction, dan IA inefficiencies, serta merumuskan rekomendasi dan peta jalan perbaikan.

**Target features:**
- Audit Information Architecture & Navigasi (IA)
- Evaluasi User Workflow & Friction Points
- Analisis Usability Heuristics (Nielsen)
- Audit Data Management & Form Experience
- Evaluasi Dashboard & KPI Experience
- Evaluasi Mobile Layout, Accessibility, & Performance Perception
- Penyusunan Laporan Audit Komprehensif (UX Score, Temuan Kritis, Peta Jalan Prioritas)

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

### Active
- **UX-AUDIT-01**: Analisis Information Architecture & Navigasi
- **UX-AUDIT-02**: Evaluasi Alur Kerja Pengguna (User Workflow) & Friction Points
- **UX-AUDIT-03**: Evaluasi Heuristik Nielsen (Usability Heuristics)
- **UX-AUDIT-04**: Analisis Data Management Experience (Tabel, Filter, Search, Pagination, Bulk Actions)
- **UX-AUDIT-05**: Analisis Form Experience (Input, Validation, Error Handling, Save/Draft Flow)
- **UX-AUDIT-06**: Analisis Dashboard Experience (KPI Visibility, Hierarchy, Action Prioritization)
- **UX-AUDIT-07**: Evaluasi Mobile & Responsive Layout
- **UX-AUDIT-08**: Evaluasi Aksesibilitas (A11y) & Persepsi Performa (Performance Perception)
- **UX-AUDIT-09**: Penyusunan Laporan Hasil Audit komprehensif dengan UX Score, Temuan Kritis, dan Prioritized Roadmap (Phase 1, 2, 3)

### Out of Scope
- Implementasi perbaikan kode visual/logic pada modul admin (fokus penuh pada audit mendalam dan roadmap).
- Modifikasi/perbaikan basis data SQL.

## Context
- Tech Stack: Next.js (App Router), Prisma, PostgreSQL.
- Milestone v1.1 telah berhasil memperbaiki masalah visual frontend paling krusial seperti rasio kontras, navigasi keyboard di select, kegagalan tata letak responsif tabel, dan loading state flashing.
- Modul admin memiliki 4 tampilan utama: Daftar Formulir (Dashboard), Form Editor, Hasil/Kiriman Formulir, dan Kehadiran Peserta (Presensi).

## Key Decisions
| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Dukungan opsi dinamis | Memungkinkan skala Likert 4 opsi (force-choice tanpa netral) dan ukuran lainnya | ✓ Selesai |
| Audit Saja | Memetakan semua masalah frontend admin sebelum merusak alur kode yang sudah stabil | ✓ Selesai |
| Eksekusi Perbaikan Langsung (v1.1) | Menyelesaikan temuan audit (quick wins & high impact) demi memulihkan aksesibilitas dan responsivitas admin | ✓ Selesai |
| UX Audit Mendalam (v1.2) | Melakukan evaluasi pengalaman pengguna komprehensif tingkat enterprise untuk menentukan roadmap produk jangka panjang | Aktif |

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
*Last updated: 2026-06-17 after initializing Admin UX Audit milestone*
