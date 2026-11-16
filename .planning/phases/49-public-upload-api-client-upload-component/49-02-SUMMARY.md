---
phase: 49-public-upload-api-client-upload-component
plan: 02
subsystem: forms-ui + submit-linking
tags:
  - public-form
  - drag-and-drop
  - file-upload
  - submission-linking
  - validation
dependency_graph:
  requires:
    - 49-01
  provides:
    - interactive-file-dropzone
    - file-field-validation
    - atomic-submission-file-linking
  affects:
    - src/components/AttendanceForm.tsx
    - src/lib/forms.ts
    - src/app/public-upload-flow.test.ts
    - src/app/file-field-renderer.test.ts
tech_stack:
  added: []
  patterns:
    - Interactive drag-and-drop & file picker integration
    - Inline loading, preview, and pre-submission removal
    - Atomic linkSubmissionFileFields inside submission transaction
    - FormSubmissionError handling for invalid or expired uploads
key_files:
  created:
    - src/app/public-upload-flow.test.ts
  modified:
    - src/components/AttendanceForm.tsx
    - src/lib/forms.ts
    - src/app/file-field-renderer.test.ts
decisions:
  - D-06: Interactive dropzone with active drag/drop, file picker, progress indicator, preview card, and Remove button
  - D-08: validateFormSubmission enforces required FILE fields
  - D-09: Atomic submission file linking in createFormsEngineSubmission and createWebinarSubmission
metrics:
  duration: 20m
  completed_date: "2026-11-16"
status: complete
actuals:
  tasks: 2
  commits: 1
---

# Phase 49 Plan 02: Interactive Client Upload UI, Submission Linking in forms.ts, and Verification Summary

## One-liner
Interactive drag-and-drop file upload component in `AttendanceForm.tsx`, required field validation in `validateFormSubmission`, and atomic submission file linking in `src/lib/forms.ts`.

## Key Accomplishments
1. **Interactive Client Upload UI**: Replaced the inert placeholder in `AttendanceForm.tsx` with active file drag-and-drop, native file input trigger, loading state during upload, uploaded file card (name, size, MIME type), and pre-submission "Hapus" button.
2. **Form Submission Validation**: Added required validation for `FILE` fields in `validateFormSubmission`, rejecting empty submissions when `required: true`.
3. **Atomic Submission Linking**: Added `linkSubmissionFileFields` to both `createFormsEngineSubmission` and `createWebinarSubmission`, atomically associating uploaded file IDs with the new submission and advancing file statuses from `PENDING_UPLOAD` to `QUEUED`.
4. **Integration Tests**: Added `src/app/public-upload-flow.test.ts` and updated `src/app/file-field-renderer.test.ts`, passing all 23 test suites and 219 tests.
5. **Container Rebuild & Health**: Rebuilt Docker runtime (`app` and `worker`), verified `/api/public/files/upload` is live and `/api/health` returns `status: ok`.
