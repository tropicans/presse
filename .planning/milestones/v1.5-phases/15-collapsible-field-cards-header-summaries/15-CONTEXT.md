# Phase 15 Context: Collapsible Field Cards & Header Summaries

## Overview
Phase 15 enhances the information density and ergonomic management of the Admin Form Builder by allowing field cards to be collapsed and expanded individually or en masse, while displaying informative summaries on each card header.

## Requirements
- **BUILDER-03**: User dapat melipat (collapse) dan membuka (expand) setiap kartu field secara individual dengan mengklik header kartu, dengan isolasi event agar tombol aksi tidak memicu toggle tak sengaja.
- **BUILDER-04**: Header kartu field yang tertutup (collapsed) menyajikan ringkasan padat dan informatif (nomor urut, label pertanyaan, pill tipe field, badge wajib diisi, dan jumlah opsi/poin kuis).
- **BUILDER-05**: User dapat melakukan aksi kontrol massal melalui tombol "Buka Semua" (Expand All) dan "Tutup Semua" (Collapse All) untuk mempermudah audit keseluruhan form.

## Locked Implementation Decisions (Recommended)

1. **Card Collapse/Expand State Management:**
   - Track collapsed state in local component state: `collapsedFieldIds: Set<string>` (or `Record<string, boolean>`).
   - By default on initial load, all fields are expanded so users can easily edit them, but users can collapse any card or click "Tutup Semua" for high-density overview.
   - When a new field is added, ensure it is expanded so the user can immediately configure its label and options.

2. **Card Header Summary Display (BUILDER-04):**
   - The card header acts as an interactive accordion toggle (`.admin-builder-card-head.clickable`).
   - Summary elements rendered in header:
     - Expand/collapse chevron icon (`▼` / `▶` or SVG)
     - Question index / number badge (e.g. `#1`)
     - Label / question text (styled prominently with clean overflow handling)
     - Type badge pill (`Teks Singkat`, `Pilihan`, `Likert`, etc.)
     - Required indicator (`Wajib`)
     - Option count / Quiz scoring badge (e.g. `4 Opsi`, `10 Poin` when quiz mode is on)
   - When collapsed, the card body (`.admin-builder-card-body`) is cleanly hidden.

3. **Event Isolation (BUILDER-03):**
   - Action buttons inside the header (Reorder ↑, ↓, Delete ✕, and future Duplicate) have their container set with `onClick={(e) => e.stopPropagation()}` or individual `e.stopPropagation()` to prevent accidental toggling when manipulating field order or deleting.

4. **Mass Controls (BUILDER-05):**
   - Provide "Buka Semua" and "Tutup Semua" action links/buttons adjacent to the field counter/toolbar.
   - "Buka Semua": Clears `collapsedFieldIds`.
   - "Tutup Semua": Populates `collapsedFieldIds` with all visible field IDs.

5. **Smooth Pure CSS & Accessibility:**
   - Accordion trigger includes `aria-expanded={!isCollapsed}`.
   - Pure CSS transitions for chevron rotation and card border highlight on hover.
