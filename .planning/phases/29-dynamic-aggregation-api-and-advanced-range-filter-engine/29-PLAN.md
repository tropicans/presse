# Phase 29 Plan: Dynamic Aggregation API & Advanced Range Filter Engine

## Purpose
Implement the server-side aggregation engine and API endpoint (`GET /api/admin/forms/[id]/analytics`) to deliver pre-calculated KPIs, timeline groupings, and choice distributions on demand, replacing client-side raw data processing with an optimized backend service.

## Tasks

### Task 1: Domain Aggregation Helper in `src/lib/forms.ts`
- **File**: `src/lib/forms.ts`
- **Action**:
  - Implement `getFormAnalytics(id: string, options: { range?: string; participantType?: string; search?: string })`.
  - Fetch form details and submissions from DB.
  - Utilize `filterSubmissions`, `computeAnalyticsKPIs`, `computeDailyVolume`, and `computeQuestionDistributions` from `src/lib/form-analytics.ts`.
  - Return aggregated payload with `form`, `kpis`, `dailyVolume`, `questionDistributions`, and `totalItems`.

### Task 2: Admin Analytics Route Handler
- **File**: `src/app/api/admin/forms/[id]/analytics/route.ts`
- **Action**:
  - Implement `GET` route handler.
  - Gate with `getAdminSession()`, returning 401 if unauthenticated.
  - Parse query parameters: `range`, `participantType`, `search`.
  - Call `getFormAnalytics(id, { range, participantType, search })`.
  - Return 404 if form not found, or 200 with JSON payload `{ data }`.

### Task 3: Client Dashboard Integration
- **File**: `src/components/FormAnalyticsView.tsx`
- **Action**:
  - Update `fetchAnalyticsData` to call `/api/admin/forms/${formId}/analytics?range=${dateRange}&participantType=${participantType}&search=${encodeURIComponent(searchQuery)}`.
  - Consume pre-aggregated `kpis`, `dailyVolume`, and `questionDistributions` from server response.
  - Debounce search input or trigger fetch on filter change.

### Task 4: Automated Testing & Verification
- **Files**:
  - `src/lib/form-analytics.test.ts`
  - Integration/Unit tests verifying `getFormAnalytics` or server response formatting.
- **Action**:
  - Add test suites for parameter normalization and aggregation responses.
  - Run `npm test` and `npm run lint`.
