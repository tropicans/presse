# Phase 12: Sticky Table Headers & Skeleton Shimmer Loaders - Research

## Context & Objectives
Phase 12 focuses on UI polish and ergonomics for the Admin portal (`isian`):
1. **TABLE-01**: Sticky table headers on vertical scroll across Admin tables with adaptive solid background in light and dark mode.
2. **LOAD-01**: Skeleton shimmer cards/rows on `/admin/forms` (`AdminFormsList.tsx`) while loading forms data.
3. **LOAD-02**: Skeleton shimmer rows/cards on `/admin/forms/[id]/submissions` (`AdminFormSubmissions.tsx`) while loading submissions data.

## Research Findings

### 1. Sticky Table Headers (`TABLE-01`)
- **Current State**:
  - Tables use `.forms-dashboard-table` inside `.forms-dashboard-table-wrap`.
  - Table header `thead th` does not have `position: sticky; top: 0`.
- **Solution**:
  - Add `position: sticky; top: 0; z-index: 10;` to `.forms-dashboard-table thead th`.
  - Apply solid, theme-adaptive backgrounds:
    - Light mode: `background: var(--bg-surface, #ffffff)` with a subtle bottom shadow or border (`box-shadow: 0 1px 0 var(--border-default)`).
    - Dark mode: `background: var(--ledger-surface-card, #0f1a24)` with matching border.
  - Apply similar sticky header rules to `.forms-dashboard-table-compact` and any markdown rendered tables to maintain consistency.

### 2. Skeleton Shimmer on Form List (`LOAD-01`)
- **Current State**:
  - `AdminFormsList.tsx` displays a static text box:
    ```tsx
    {loading ? (
      <div className="forms-dashboard-empty-state">
        <h3>Memuat form</h3>
        <p>Dashboard sedang mengambil daftar form terbaru.</p>
      </div>
    ) : ...}
    ```
- **Solution**:
  - Replace the text box with a skeleton table layout rendering 5 placeholder rows with `.admin-skeleton-line` matching table columns (Title/Description, Status badge, Mode badge, Kiriman number, Diperbarui, Actions).
  - Also provide skeleton pulse for stat cards if rendered during loading.

### 3. Skeleton Shimmer on Submissions (`LOAD-02`)
- **Current State**:
  - `AdminFormSubmissions.tsx` currently renders a static empty-state when `loading && !data`.
  - In partial loading, it renders skeleton lines, but without full card shimmer coverage.
- **Solution**:
  - Update `AdminFormSubmissions.tsx` initial loading view to show skeleton shimmer topbar/stats and card list skeleton.
  - Enhance `.admin-skeleton-line` and `.admin-skeleton-card` in `src/app/globals.css` with 60fps CSS keyframe shimmer animations.

## Risk Analysis & Mitigations
- **Zero Runtime JS Overhead**: All animations remain pure CSS (`@keyframes admin-shimmer-loading`).
- **Dark Mode Contrast**: Verified color tokens for `--gray-100`/`--gray-200` (light) and `--gray-800`/`--gray-700` (dark).
