---
phase: 49
slug: public-upload-api-client-upload-component
status: ready
nyquist_compliant: true
wave_0_complete: true
created: 2026-11-16
---

# Phase 49 — Validation Strategy

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 |
| **Quick run command** | `npx vitest run src/app/api/public/files/upload/upload-api.test.ts` |
| **Full suite command** | `npm test` |
| **Lint & Typecheck command** | `npm run lint && npx tsc --noEmit --pretty false` |

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Secure Behavior | Test Type | Automated Command | Status |
|---------|------|------|-------------|-----------------|-----------|-------------------|--------|
| 49-01-01 | 01 | 1 | FILE-09 | Magic bytes MIME validation & filename sanitization | unit | `npx vitest run src/app/api/public/files/upload/upload-api.test.ts` | ⬜ pending |
| 49-01-02 | 01 | 1 | FILE-09, FILE-10, FILE-12 | Route handler with rate limiting & spooling | integration | `npx vitest run src/app/api/public/files/upload/upload-api.test.ts` | ⬜ pending |
| 49-02-01 | 02 | 2 | FILE-08 | Client upload drag/drop/progress/preview UI in AttendanceForm | component/unit | `npx vitest run src/app/file-field-renderer.test.ts` | ⬜ pending |
| 49-02-02 | 02 | 2 | FILE-10, FILE-11 | Submission validation & atomic file linking | unit + integration | `npm test && npm run lint && npx tsc --noEmit --pretty false` | ⬜ pending |
