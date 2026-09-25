# Phase 14 Context: Step Tabs Navigation & Active-Step Insertion

## Overview
Phase 14 introduces step-centric tab navigation to the Admin Form Builder, enabling administrators to focus on one step at a time or view all steps, view field count badges and empty-step warnings on each tab, and automatically insert newly created fields into the currently active step.

## Requirements
- **BUILDER-01**: User dapat memfilter tampilan daftar field berdasarkan Langkah tertentu melalui bilah tab (Step Tabs: Langkah 1, 2, ..., n) atau menampilkan "Semua Langkah" dalam satu klik.
- **BUILDER-02**: Bilah tab langkah menampilkan indikator jumlah field (badge count) pada setiap tab dan memberikan indikasi visual jika suatu langkah masih kosong.
- **BUILDER-09**: Menambahkan field baru melalui tombol toolbar tipe field secara otomatis menempatkan field baru ke dalam langkah yang sedang aktif saat ini.

## Locked Implementation Decisions (Recommended)

1. **Step Tab Navigation Component & Placement:**
   - Place the step tab bar directly above the field toolbar and fields list in `src/components/AdminFormEditor.tsx`.
   - Tabs include:
     - `Semua Langkah` (shows total field count across the form)
     - `Langkah 1`, `Langkah 2`, ... `Langkah N` for each page in `form.pages` (with per-step field count badges).
   - Default active tab: first step (`form.pages[0]?.id`) if pages exist, fallback to `'all'`.
   - If a step is deleted, reset active tab to `'all'` or the first step.

2. **Visual Indicators for Step Badges & Empty Steps:**
   - Each tab displays a count pill: e.g. `3` or `0`.
   - When a step has `0` fields:
     - The tab count pill shows an amber/warning treatment (`admin-step-tab-empty` / warning badge).
     - Selecting an empty step renders an informative in-place empty card: *"Langkah ini masih kosong. Klik tipe field pada toolbar di bawah untuk menambahkan pertanyaan langsung ke langkah ini."*

3. **Active-Step Insertion Logic (BUILDER-09):**
   - When user clicks a field type button (`+ Teks Singkat`, etc.):
     - If `activeStepTab !== 'all'` and matches an existing `page.id`, the new field is assigned `pageId: activeStepTab`.
     - If `activeStepTab === 'all'`, fallback to the last step (`form.pages[form.pages.length - 1]?.id`).
   - Insertion position in array: appended after the last field belonging to that target step (or end of array).

4. **Integration with Existing Step Management:**
   - Existing "Langkah Form" panel remains functional and synchronized. Adding a new step can optionally switch active tab to the new step so the user can immediately populate it.
   - Deleting a step reassigns orphan fields to remaining pages as before, maintaining database and preview integrity.

5. **Pure CSS & Responsive Design:**
   - Horizontal scroll with hidden scrollbar for tabs on smaller screens.
   - Design matches the existing editorial theme tokens (ledger borders, subtle shadows, crisp typography).
