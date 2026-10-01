# Phase 28 Context: Submission Analytics Dashboard & Distribution Visualization UI

## Context & Objectives
Phase 28 implements the core user interface and visualization components for Milestone v1.9 ("Interactive Analytics & Submission Data Visualization"). It delivers a dedicated analytics experience for administrators, enabling intuitive inspection of response volume, question choice distributions, and participant trends under the Editorial Minimalist Monochrome aesthetic.

## Requirements
- **ANLY-01**: Editorial Analytics Dashboard Shell & Metrics Overview (`/admin/forms/[id]/analytics`, KPI cards in Playfair Display & JetBrains Mono, 0px radius, 4px heavy rule divider).
- **ANLY-02**: Monochrome Daily Volume Timeline Chart (Pure SVG/CSS architectural bar chart, hairline axes, monospace counts, instant hover tooltips).
- **ANLY-03**: Question Response Distribution Breakdown (Frequency & percentage meters for multiple-choice, Likert scales, and quiz questions with `[ BENAR ]` badges).
- **ANLY-04**: Advanced Interactive Filter Suite (Reactive date range filter, participant type toggle, text search).

## Discuss Phase Decisions (Recommended Options Selected)

### Decision 1: Architecture & Page Route
- **Selected (Recommended)**: Create dedicated page route `src/app/admin/forms/[id]/analytics/page.tsx` backed by client view component `src/components/FormAnalyticsView.tsx`. Add navigation buttons between `/admin/forms/[id]/submissions`, `/admin/forms/[id]/edit`, and `/admin/forms/[id]/analytics`.
- **Rationale**: Keeps responsibilities modular and allows bookmarkable deep links to analytics without overloading the submissions table view.

### Decision 2: Charting Technology
- **Selected (Recommended)**: Pure SVG and CSS architectural bar meters with 0 external npm charting dependencies.
- **Rationale**: Eliminates charting library bloat (Chart.js / Recharts add 150KB+), eliminates canvas blurriness, and guarantees 100% adherence to the strict 0px zero-radius and monochrome line tokens.

### Decision 3: Reactive Filtering Engine (Client-Side First)
- **Selected (Recommended)**: Compute filtered metrics, daily volume timeline, and choice distributions reactively on the client side based on loaded submission records, preparing clean contract interfaces for Phase 29 server-side aggregation.
- **Rationale**: Enables immediate instantaneous UI filtering (<50ms feedback) while keeping the component decoupled.

### Decision 4: Design System Consistency
- **Selected (Recommended)**: Reuse CSS variables defined in v1.8 (`--font-family-display`, `--font-family-mono`, `--border-default`, `--line-heavy`, `--text-primary`, `--bg-surface`, `--bg-primary`).
- **Rationale**: Ensures seamless light/dark mode parity without introducing new color tokens or residual styling bugs.
