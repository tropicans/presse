---
phase: 47-file-field-config-builder-editor-renderer
plan: 01
subsystem: forms-admin
tags:
  - file-upload
  - builder
  - admin
  - domain-model
  - serialization
dependency_graph:
  requires: []
  provides:
    - file-field-domain-model
    - file-builder-controls
    - preview-parity
  affects:
    - AdminFormEditor
    - AdminFormPreview
    - AttendanceForm
tech_stack:
  added: []
  patterns:
    - JSON settings persistence with whitelist validation
    - Decoupled client/server helper exports
key_files:
  created: []
  modified:
    - src/lib/forms.ts
    - src/lib/admin-form-preview.ts
    - src/components/AdminFormEditor.tsx
    - src/lib/forms.test.ts
decisions:
  - D-01: maxSizeMB configured between 1 MB and 10 MB (default 5 MB), clamped strictly at 10 MB.
  - D-02: allowedPreset provides 4 presets ('images_and_pdf', 'images', 'pdf', 'all') with whitelist fallback.
  - D-03: maxFiles limit configured between 1 and 5 files (default 1 file).
  - D-04: Card summary pills and outline badges show index, label, 'Berkas', type preset hint, and size/count limit.
  - D-07: FileField and AdminPreviewField carry maxSizeMB, allowedPreset, and maxFiles.
  - D-08: Lossless serialization round-trip and fieldToAdminPreviewField mapping parity.
metrics:
  duration: 45m
  completed_date: "2026-11-16"
status: complete
actuals:
  tokens: 45000
  tasks: 3
  commits: 4
  plan_head_before: 198a2bd14902efffb31b0956a8e074ad22673aae
  plan_head_after: bcd122e065b61a6ea8429906714f98767d719dbc
---

# Phase 47 Plan 01: File Field Domain Model, Serialization Parity, and AdminFormEditor Controls Summary

## One-liner
Lossless domain model, settings serialization, boundary clamping, and admin form builder controls for File Upload (`Berkas`) fields.

## Objective
Deliver the domain model, preview interfaces, settings serialization, and form builder editing controls for the `File Upload` (Berkas) field in accordance with FILE-06 and decisions D-01 through D-08.

## What Was Done

### Task 1: FileField domain model, preview interface, and serialization round-trip
- Extended `FileField` and `AdminEditableField` in `src/lib/forms.ts` and `AdminPreviewField` in `src/lib/admin-form-preview.ts` with `maxSizeMB?: number`, `allowedPreset?: FileFieldPreset`, and `maxFiles?: number`.
- Implemented `readFormFileConfigs` parsing `fileConfigs` from `settings_json` with secure defaults (5 MB, `images_and_pdf`, 1 file), preset whitelist filtering (T-47-02), and field ID scoping (T-47-03).
- Updated `serializeFormSettings` to accept and serialize `fileConfigs` into `settings_json`.
- Updated `getAdminFormDetail` and `mapPublicFormRowsToDefinition` to read and populate file configurations on `file` fields.
- Implemented boundary validation and clamping in `updateAdminForm` (clamping `maxSizeMB` to 1..10 MB and `maxFiles` to 1..5).
- Created and exported `getFilePresetLabel`, `getFilePresetShortLabel`, `getFileConstraintText`, and `fieldToAdminPreviewField` helpers.

### Task 2: AdminFormEditor builder controls, card badges, and outline summary
- Registered `'file'` in `fieldTypeOptions` and updated `createField` with default values (5 MB, `images_and_pdf`, 1 file, `required: true`).
- Added configuration controls in expanded field cards when `field.type === 'file'`: format preset selector, max size selector (1, 2, 5, 10 MB), max files selector (1..5), and contextual storage helper text.
- Added summary pills in collapsed field cards: format preset hint pill (`Gambar + PDF`, `PDF saja`, etc.) and limit pill (`Maks 5 MB • 1 berkas`).
- Integrated outline badges: displaying `#index`, label, and `Berkas` badge.
- Ensured file field configuration properties are preserved across duplicate field actions and during `PATCH` save payloads.

### Task 3: Automated tests for file field serialization and validation boundaries
- Added unit tests in `src/lib/forms.test.ts` verifying:
  1. Lossless round-trip of custom `fileConfigs` through `serializeFormSettings` and `readFormFileConfigs`.
  2. Application of defaults (5 MB, `images_and_pdf`, 1 file) when configuration properties are missing.
  3. Preset whitelist enforcement, falling back to `images_and_pdf` for invalid/unwhitelisted values.
  4. Scope bounding to valid field IDs only (DoS prevention).
  5. Boundary clamping for `maxSizeMB` ([1..10]) and `maxFiles` ([1..5]).
  6. `fieldToAdminPreviewField` conversion parity preserving all file configuration attributes.
  7. Consistent label and constraint text formatting.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 / Rule 2 - Bug / Correctness] Decoupled client and server exports for preset formatting helpers**
- **Found during:** Smart container build validation (`npm run build` in Turbopack)
- **Issue:** When `AdminFormEditor.tsx` (a client component) imported helpers directly from `src/lib/forms.ts`, Turbopack pulled server-only modules (`@prisma/client`, `pg`, `dns`, `net`, `tls`) into the browser bundle, causing build failure.
- **Fix:** Moved pure display helper functions (`getFilePresetLabel`, `getFilePresetShortLabel`, `getFileConstraintText`) to `src/lib/admin-form-preview.ts` which has no server dependencies, and re-exported them from `src/lib/forms.ts` for backward compatibility.
- **Files modified:** `src/lib/admin-form-preview.ts`, `src/lib/forms.ts`, `src/components/AdminFormEditor.tsx`
- **Commit:** `bcd122e`

## Verification Results
- `npx vitest run src/lib/forms.test.ts`: 46 tests passing (100% green).
- `npx tsc --noEmit --pretty false`: Zero TypeScript errors.
- `npm run lint -- src/components/AdminFormEditor.tsx src/lib/forms.ts src/lib/admin-form-preview.ts`: Zero ESLint errors.
- `npm run build`: Production standalone build passed in 8.0s.
- `npm test`: All 19 test files (172 passed, 1 skipped) passing.
- Docker rebuild and health check: `isian-app` and `isian-worker` running healthy, `http://127.0.0.1:3456/api/health` responded with `status: ok`.

## Self-Check: PASSED
- [x] All 4 modified files exist and are verified.
- [x] Commits `af3e901`, `1bcf994`, `a59bc48`, and `bcd122e` exist in git history.
- [x] Zero regressions, container healthy.
