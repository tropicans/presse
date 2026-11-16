---
phase: 47-file-field-config-builder-editor-renderer
plan: 02
subsystem: forms-ui
tags:
  - file-upload
  - renderer
  - live-preview
  - public-form
  - dropzone
  - monochrome-ui
dependency_graph:
  requires:
    - 47-01
  provides:
    - monochrome-dropzone-styles
    - admin-preview-file-renderer
    - public-form-file-renderer
    - file-field-regression-tests
  affects:
    - AdminFormPreview
    - AttendanceForm
    - globals.css
tech_stack:
  added: []
  patterns:
    - Monochrome editorial minimalist design system
    - Inert dropzone placeholder with preset constraint formatting
    - Server/client decoupled display helpers
key_files:
  created:
    - src/app/file-field-renderer.test.ts
  modified:
    - src/app/globals.css
    - src/components/AdminFormPreview.tsx
    - src/components/AttendanceForm.tsx
decisions:
  - D-05: Rendered file upload fields as dashed monochrome dropzones matching the minimalist design system with SVG upload icon, label, format & size instruction, and inert 'Pilih Berkas' button.
  - D-06: Displayed informational notice ('Pengunggahan berkas aktif pada pengisian formulir') clarifying that file uploading activates during live submission.
  - Phase 47 Navigation Parity: Inert placeholder does not submit data or block form navigation / step validation in preview and public forms.
metrics:
  duration: 35m
  completed_date: "2026-11-16"
status: complete
actuals:
  tokens: 42000
  tasks: 3
  commits: 3
  plan_head_before: fc7caf6711728c30f78d910f545163ff2f96cfb4
  plan_head_after: a4b9763d596677f54460d6a2f3f9e98e7225dc6c
---

# Phase 47 Plan 02: Monochrome Inert Dropzone Renderer in Live Preview, Public Form, and Automated Tests Summary

## One-liner
Monochrome inert file dropzone renderer in `AdminFormPreview` and `AttendanceForm` with preset formatting, SVG icon, submission notice, and regression test suite.

## Objective
Implement the minimalist monochrome inert dropzone placeholder for `File Upload` fields across the live admin preview and public form components per FILE-07 and decisions D-05 and D-06.

## What Was Done

### Task 1: Add monochrome file dropzone design system styles in globals.css
- Defined `.public-file-dropzone`, `.public-file-dropzone-box`, `.public-file-dropzone-icon`, `.public-file-dropzone-label`, `.public-file-dropzone-constraints`, `.public-file-dropzone-btn`, and `.public-file-dropzone-notice` in `src/app/globals.css`.
- Styled the dropzone with a 1.5px dashed border (`var(--border-line)`), centered layout, subtle hover transitions, and rounded corners (`var(--radius-md)`).
- Included dark/light theme support using CSS design tokens (`var(--bg-surface-elevated)`, `var(--text-primary)`, `var(--text-muted)`).
- Commit: `2627222`

### Task 2: Implement inert dropzone renderer in AdminFormPreview and AttendanceForm
- Added file field rendering block `if (field.type === 'file')` in `src/components/AdminFormPreview.tsx` using `getFilePresetLabel` and `getFileConstraintText` from `@/lib/admin-form-preview`.
- Rendered field label with required asterisk (`*`), dashed dropzone box, feather-style SVG upload arrow/tray icon, formatted constraint subtitle, inert disabled button (`Pilih Berkas`), and D-06 informational footnote (`Pengunggahan berkas aktif pada pengisian formulir`).
- Added identical rendering block in `src/components/AttendanceForm.tsx` ensuring 100% visual and layout parity between preview and public form.
- Updated `validateFields` in `AttendanceForm.tsx` to exempt file fields from blocking submission in Phase 47.
- Updated required field counters in `AdminFormPreview.tsx` so inert file fields do not prevent reaching 100% completion in preview.
- Commit: `da32b1d`

### Task 3: Automated component and formatting tests for file field renderer
- Created `src/app/file-field-renderer.test.ts` covering:
  1. Preset description helper: verified all four presets (`images_and_pdf`, `images`, `pdf`, `all`) and fallbacks produce expected Indonesian labels.
  2. Short label helper: verified preset mappings for compact summary cards.
  3. Constraint text generator: verified combinations of `maxSizeMB` (2, 5, 10) and `maxFiles` (1..5) as well as default fallbacks.
  4. Structural source assertions: confirmed both `AdminFormPreview.tsx` and `AttendanceForm.tsx` contain the required classes, SVG vectors, asterisk logic, and D-06 notice text.
  5. Validation non-blocking assertions: confirmed `validateFields` handles `field.type === 'file'` with `continue`.
  6. CSS verification: confirmed `globals.css` defines all necessary monochrome dropzone classes and dark theme rules.
- Commit: `a4b9763`

## Deviations from Plan
None - plan executed exactly as written.

## Verification Results
- `npx vitest run src/app/file-field-renderer.test.ts`: 7 tests passing (100% green).
- `npx tsc --noEmit --pretty false`: Zero TypeScript errors.
- `npm run lint`: Zero ESLint errors on modified components.
- `npm test`: 20 test files passing (179 passed, 1 skipped).
- Smart Container Rebuild Protocol:
  - `docker compose --env-file .env.production build app worker`: Successfully built standalone Next.js image.
  - `docker compose --env-file .env.production up -d --no-deps app worker`: Successfully recreated and started `isian-app` and `isian-worker`.
  - Health check: `Invoke-RestMethod -Uri http://127.0.0.1:3456/api/health` responded with `status: ok`.

## Self-Check: PASSED
- [x] All key files exist: `src/app/globals.css`, `src/components/AdminFormPreview.tsx`, `src/components/AttendanceForm.tsx`, `src/app/file-field-renderer.test.ts`.
- [x] Commits `2627222`, `da32b1d`, and `a4b9763` exist in git history.
- [x] Zero regressions, container healthy.
