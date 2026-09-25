# Phase 16 Context: Outline Navigation Panel, 1-Click Duplicate & Sticky Toolbar Polish

## Overview
Phase 16 completes Milestone v1.5 by introducing an interactive Outline Navigation Panel for fast jumping across multi-step forms, a 1-click Field Duplicate button with full configuration cloning, and sticky toolbar polish for uninterrupted authoring ergonomics.

## Requirements
- **BUILDER-06**: User dapat mengakses panel samping Outline (peta navigasi formulir) yang menampilkan struktur hierarki langkah dan daftar seluruh pertanyaan secara ringkas.
- **BUILDER-07**: Mengklik salah satu pertanyaan pada panel Outline secara mulus menggulirkan viewport (`scrollIntoView`), mengalihkan tab langkah aktif bila perlu, dan membuka (auto-expand) kartu field target.
- **BUILDER-08**: User dapat menduplikasi field yang ada dalam 1 klik melalui tombol aksi "Duplikasi" pada kartu field, menghasilkan salinan field beserta seluruh konfigurasi dan opsinya pada langkah yang sama.
- **BUILDER-10**: Editor menyediakan sticky action header & toolbar yang menjaga status penyimpanan auto-save, tombol Simpan/Batalkan, dan tombol navigasi tetap berada di jangkauan pengguna saat scrolling.

## Locked Implementation Decisions (Recommended)

1. **Outline Navigation Panel (BUILDER-06 & BUILDER-07):**
   - Render a collapsable Outline sidebar / drawer within the structure column or as a floating quick-navigator.
   - Organizes fields by Step (`Langkah 1`, `Langkah 2`, etc.) with compact clickable question rows.
   - Clicking a question in Outline:
     - Switches `activeStepTab` to that step if it is not currently active.
     - Automatically expands the target card if collapsed (`collapsedFieldIds.delete(fieldId)`).
     - Calls `scrollIntoView({ behavior: 'smooth', block: 'center' })` on `#field-card-${field.id}`.
     - Temporarily activates `.admin-builder-card-highlight` with a subtle pure CSS glow.

2. **1-Click Duplicate (BUILDER-08):**
   - Add a duplicate button in each field card's action group (`.admin-builder-icon-btn` with duplicate/copy SVG or icon and `title="Duplikasi pertanyaan"`).
   - Generates a new field with unique ID (`new-${crypto.randomUUID()}`), label `${field.label} (Salinan)` (or `field.label` if empty), same `type`, `pageId`, `required`, and cloned `options`.
   - Inserts the cloned field immediately after the source field in `form.fields`.
   - Ensures the cloned field is expanded and auto-focused.

3. **Sticky Action Header & Toolbar Polish (BUILDER-10):**
   - Polish `.editorial-form-editor-topbar` and make `.admin-builder-toolbar` sticky with `position: sticky`, `top: 76px`, solid theme-adaptive background (`background: rgba(255, 255, 255, 0.94)` / dark `rgba(15, 26, 36, 0.94)`), blur filter, and border shadow so adding fields is always within one click without scrolling back up.
   - Status bar displays auto-save state clearly.
