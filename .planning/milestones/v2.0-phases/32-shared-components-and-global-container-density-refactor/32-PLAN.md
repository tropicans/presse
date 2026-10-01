# Phase 32 Plan: Shared Components & Global Container Density Refactor

## Purpose
Refactor shared application containers, form controls, navigation headers, sidebars, buttons, and status badges in `src/app/globals.css` and shared components to achieve high information density, eliminating bloated vertical gaps and excessive nested borders.

## Tasks

### Task 1: Compact App Header & Sidebar Refactor
- **File**: `src/app/globals.css`
- **Action**:
  - Refactor `.forms-dashboard-header`, `.editorial-form-editor-topbar`:
    - Height: 56px (compact standard).
    - Padding: `0 var(--space-4)`.
    - Compact logo & brand title (15px bold, subtitle 12px muted).
    - Compact action buttons (36px standard).
  - Refactor `.forms-dashboard-sidebar`:
    - Width: `var(--sidebar-width)` (230px).
    - Navigation link height: 36px, padding `0 var(--space-3)`, gap `var(--space-2)`.
    - Active state: Subtle background tint (`rgba(255, 255, 255, 0.06)` or `--bg-surface-elevated`), bold text, left border indicator (3px) instead of heavy box outline.
    - Submenu links (`.sidebar-sub-nav`): compact 28px height, indented.

### Task 2: Form Controls (Input, Select, Textarea, Button) Density
- **File**: `src/app/globals.css`
- **Action**:
  - Standardize inputs & selects (`.admin-builder-input`, `.admin-builder-select`, `.forms-dashboard-search input`, `.forms-dashboard-select`):
    - Height: `var(--control-height-md)` (36px).
    - Padding: `0 var(--space-3)`.
    - Font: `var(--font-family)`, 13.5px.
    - Border: 1px solid `var(--border-default)`.
    - Border-radius: `var(--radius-md)` (6px).
  - Standardize buttons (`.admin-primary-btn`, `.admin-secondary-btn`, `.forms-dashboard-primary-button`, `.forms-dashboard-secondary-button`, `.editorial-form-editor-primary-btn`, `.editorial-form-editor-ghost-btn`):
    - Height: `var(--control-height-md)` (36px).
    - Padding: `0 var(--space-3)`.
    - Font: `var(--font-family)`, 13px weight 600.
    - Border-radius: `var(--radius-md)` (6px).
  - Compact badges / chips (`.forms-dashboard-status-chip`, `.forms-dashboard-mode-chip`, `.admin-builder-pill`, `.admin-count-badge`):
    - Height: 24–26px, padding `2px 8px`, font-size: 11.5px.
    - Border-radius: `var(--radius-sm)` (4px) or pill.

### Task 3: Container & Border De-escalation
- **File**: `src/app/globals.css`
- **Action**:
  - Remove excessive borders on nested cards:
    - Replace heavy 2px/4px borders with clean 1px hairline border (`var(--border-default)`).
    - Reduce card padding from 24-32px down to 16-20px (`var(--space-4)` - `var(--space-5)`).
    - Tighten breadcrumb vertical spacing (`margin-bottom: var(--space-3)`).

### Task 4: Automated Verification
- **Files**:
  - `src/app/globals.test.ts`
- **Action**:
  - Add assertions for shared component classes and sizing constraints.
  - Run `npm test`, `npx tsc --noEmit`, and `npm run lint`.
