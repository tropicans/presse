# Phase 29 Context: Dynamic Aggregation API & Advanced Range Filter Engine

## Context & Objectives
Phase 29 builds the server-side aggregation engine for submission analytics. Instead of shipping thousands of raw submission records to the browser, the backend aggregates metrics, timeline groupings, and choice distributions on demand with high performance.

## Requirements
- **ANLY-05**: Server-Side Submission Aggregation API (`GET /api/admin/forms/[id]/analytics` returning pre-aggregated KPIs, daily time-series, and question choice counts).

## Discuss Phase Decisions (Recommended Options Selected)

### Decision 1: Domain Helper & Separation of Concerns
- **Selected (Recommended)**: Implement `getFormAnalytics(formId, options)` in `src/lib/forms.ts` and expose it via Next.js route handler `src/app/api/admin/forms/[id]/analytics/route.ts`.
- **Rationale**: Follows the existing codebase convention where route handlers stay thin and call domain helpers in `src/lib/forms.ts`.

### Decision 2: Query Parameters & Filtering Semantics
- **Selected (Recommended)**: Support query params:
  - `range`: `7d`, `30d`, `month`, `all` (default: `30d`)
  - `participantType`: `all`, `internal`, `external` (default: `all`)
  - `search`: string keyword
- **Rationale**: Aligns directly with the filter controls in `FormAnalyticsView.tsx`.

### Decision 3: Frontend Client Integration
- **Selected (Recommended)**: Update `FormAnalyticsView.tsx` to fetch from `/api/admin/forms/${formId}/analytics` with query parameters.
- **Rationale**: Reduces payload size by over 90% for large forms and speeds up dashboard load time.
