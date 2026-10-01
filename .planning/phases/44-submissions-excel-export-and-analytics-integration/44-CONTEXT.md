# Phase 44: Submissions, Excel Export & Analytics Integration Context

## Domain & Requirements
- Requirement: **AGREE-06** (Submissions Table, Excel Export & Analytics Integration).
- Objective:
  1. **Admin Submissions Dashboard UI (`AdminFormSubmissions.tsx`)**:
     Format checkbox answers with an ergonomic badge `✓ Disetujui` when agreed, or `—` when not answered/false.
  2. **Excel Export (`forms.ts` -> `exportAdminFormSubmissionsWorkbook`)**:
     Format truthy checkbox answers as `"Disetujui"` and empty/unanswered as `"-"`.
  3. **Analytics Question Distribution (`form-analytics.ts` -> `computeQuestionDistributions`)**:
     Format checkbox answers in question distribution charts/lists to show `"Disetujui"` instead of raw boolean strings (`"true"`).

## Architectural Guidelines
- Preserve monochrome editorial visual aesthetic in badges.
- Keep Excel cell formatting clean and concise.
- Ensure all existing analytics tests and Vitest suites continue passing.
