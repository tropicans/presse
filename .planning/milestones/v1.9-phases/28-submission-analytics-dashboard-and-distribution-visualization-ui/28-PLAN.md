# Phase 28 Plan: Submission Analytics Dashboard & Distribution Visualization UI

## Purpose
Build and integrate the interactive submission analytics dashboard (`/admin/forms/[id]/analytics`), featuring high-density KPI metric cards, an architectural daily volume chart, reactive filtering controls, and per-question choice distribution breakdowns.

## Tasks

### Task 1: Analytics Design System Tokens & Component Classes
- **File**: `src/app/globals.css`
- **Action**: Add styling classes:
  - `.analytics-shell`, `.analytics-header`, `.analytics-filterbar`, `.analytics-filter-group`, `.analytics-filter-select`
  - `.analytics-metric-grid`, `.analytics-metric-card`, `.analytics-metric-card-title`, `.analytics-metric-card-value`
  - `.analytics-volume-chart-container`, `.analytics-volume-chart`, `.analytics-volume-bar`, `.analytics-chart-axis`
  - `.analytics-question-card`, `.analytics-distribution-list`, `.analytics-distribution-item`, `.analytics-distribution-meter`
  - Ensure strict 0px border-radius, zero shadows, and dual-theme compatibility.

### Task 2: Build `FormAnalyticsView` Client Component
- **File**: `src/components/FormAnalyticsView.tsx`
- **Action**: Implement client component with:
  - Header with form metadata, title in Playfair Display, navigation buttons (`Kiriman Data`, `Sunting Form`).
  - Reactive filter suite: Date range (7 hari, 30 hari, Semua), participant type toggle (Semua, Internal, Eksternal), text search.
  - KPI summary metrics: Total Submissions, Completion Rate, Average Quiz Score, Latest Response.
  - Daily Volume Timeline Chart: Responsive SVG/CSS architectural bar chart showing submissions per day.
  - Question Distribution Breakdown: Iterate form questions, aggregate response choices, render horizontal percentage meter bars and quiz correct option indicators `[ BENAR ]`.

### Task 3: Create Route `/admin/forms/[id]/analytics` & Wire Navigation
- **Files**:
  - `src/app/admin/forms/[id]/analytics/page.tsx`
  - `src/app/admin/forms/[id]/submissions/page.tsx`
- **Action**:
  - Implement protected server page checking `getAdminSession()`.
  - Add navigation link to Analytics in submissions header.

### Task 4: Automated Testing & Verification
- **Files**:
  - `src/components/FormAnalyticsView.test.tsx`
  - `src/app/globals.test.ts`
- **Action**: Add tests verifying:
  - Filter state mutations and recalculation.
  - Distribution percentage aggregations.
  - CSS analytics classes presence.
  - Run `npm test` and `npm run lint`.
