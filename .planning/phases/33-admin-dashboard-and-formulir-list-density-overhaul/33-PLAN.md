# Phase 33 Plan: Admin Dashboard & Formulir List Density Overhaul

## Purpose
Refactor the admin Formulir dashboard (`/admin/forms` and `AdminFormsList.tsx`), reducing excessive vertical whitespace, compacting the 4 KPI statistic cards, and optimizing the form list table rows for high scanning velocity and compact 72–96px target row height.

## Tasks

### Task 1: Compact KPI Statistic Cards & Hierarchy
- **File**: `src/app/globals.css`, `src/components/AdminFormsList.tsx`
- **Action**:
  - Restructure `.forms-dashboard-stats`:
    - Grid gap: `var(--space-3)` (12px).
    - `.forms-dashboard-stat-card`: padding `var(--space-3) var(--space-4)`, border `1px solid var(--border-default)`, radius `var(--radius-lg)`, background `var(--bg-surface)`.
    - Hierarchy:
      - Head label: uppercase 11px font, bold, color `var(--text-muted)`.
      - Value: 1.5rem–1.75rem (`--font-size-headline-md`) bold in `JetBrains Mono` / sans-serif, prominent but proportional.
      - Supporting text: 12px color `var(--text-muted)`.
  - Eliminate oversized card padding and ambient drop shadows.

### Task 2: Form List Table Panel & Filter Bar Compaction
- **File**: `src/app/globals.css`
- **Action**:
  - Compact `.forms-dashboard-table-panel`:
    - Panel header: gap `var(--space-3)`, padding `var(--space-3) var(--space-4)`.
    - Search input & status select: 36px height, compact padding, 6px radius.
    - Table header (`thead th`): height 36px, font-size 11.5px uppercase, padding `8px 12px`, subtle border-bottom `1px solid var(--border-default)`.

### Task 3: Table Row Density & Action Link Streamlining
- **File**: `src/app/globals.css`, `src/components/AdminFormsList.tsx`
- **Action**:
  - Target row height: 72–92px.
  - Table cells (`tbody td`): padding `10px 12px`.
  - Title & description:
    - Title: 14.5px font-weight 600, color `var(--text-primary)`.
    - Description: 12.5px, line-clamp 1 (truncate gracefully), color `var(--text-muted)`.
    - Meta pill: slug & path in 11px monospace, compact padding.
  - Status & Mode chips: 24px height, compact 8px padding.
  - Submissions count: 14px bold `JetBrains Mono`.
  - Row action links (`.forms-dashboard-action-link`):
    - Compact 30px height, 8px padding, 4px border-radius, clean hover state without card-like visual weight.

### Task 4: Automated Verification
- **Files**:
  - `src/app/globals.test.ts`
- **Action**:
  - Assert table row compaction and dashboard stat classes.
  - Run `npm test`, `npx tsc --noEmit`, and `npm run lint`.
