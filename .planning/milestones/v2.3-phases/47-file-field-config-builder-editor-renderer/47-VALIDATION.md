---
phase: 47
slug: file-field-config-builder-editor-renderer
status: draft
nyquist_compliant: true
wave_0_complete: true
created: 2026-11-16
---

# Phase 47 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | vitest 4.1.5 (already in `devDependencies`) |
| **Config file** | `vitest.config.ts` (node env, `include: ['src/**/*.test.{ts,tsx}']`, alias `@ → ./src`, stub `DATABASE_URL`) |
| **Quick run command** | `npx vitest run src/lib/forms.test.ts src/app/file-field-renderer.test.ts` |
| **Full suite command** | `npm test` (`vitest run`) |
| **Estimated runtime** | ~3 seconds quick, ~10 seconds full |
| **Lint & Typecheck command** | `npm run lint && npx tsc --noEmit --pretty false` |

---

## Sampling Rate

- **After every task commit:** Run `npx vitest run src/lib/forms.test.ts` or `npx vitest run src/app/file-field-renderer.test.ts`
- **After every plan wave:** Run `npm test && npm run lint && npx tsc --noEmit --pretty false`
- **Before `/gsd-verify-work`:** Full test suite green + `npm run build` green + visual inspection of `/admin/forms/[id]` and `/f/[slug]` with file field
- **Max feedback latency:** ~5 seconds (unit/component tests)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 47-01-01 | 01 | 1 | FILE-06 | T-47-01, T-47-02 | FileField and AdminPreviewField carry maxSizeMB, allowedPreset, maxFiles; mapper round-trips without data loss | unit | `npx vitest run src/lib/forms.test.ts -t 'file'` | ✅ | ⬜ pending |
| 47-01-02 | 01 | 1 | FILE-06 | T-47-01 | AdminFormEditor exposes builder inputs for max size (capped at 10 MB), preset, max files, and renders outline/card summary | static/typecheck | `npx tsc --noEmit --pretty false && npm run lint -- src/components/AdminFormEditor.tsx` | ✅ | ⬜ pending |
| 47-01-03 | 01 | 1 | FILE-06 | T-47-01, T-47-02 | Serialization round-trips custom file configs, enforces default values, clamps oversize values to 10 MB and maxFiles to 5 | unit | `npx vitest run src/lib/forms.test.ts` | ✅ | ⬜ pending |
| 47-02-01 | 02 | 2 | FILE-07 | T-47-04 | Monochrome dropzone CSS classes (.public-file-dropzone) adhere to theme design tokens and responsive layout | static/unit | `npx vitest run src/app/globals.test.ts` | ✅ | ⬜ pending |
| 47-02-02 | 02 | 2 | FILE-07 | T-47-04, T-47-05 | AdminFormPreview and AttendanceForm render inert dropzone with SVG icon, format/size constraint text, and preview notice | static/typecheck | `npx tsc --noEmit --pretty false && npm run lint -- src/components/AdminFormPreview.tsx src/components/AttendanceForm.tsx` | ✅ | ⬜ pending |
| 47-02-03 | 02 | 2 | FILE-07 | T-47-04, T-47-05 | Automated assertions verify preset label mappings, constraint string generation, and presence of dropzone markup | unit/component | `npx vitest run src/app/file-field-renderer.test.ts` | ❌ (Wave 0 creates) | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky · ⛔ superseded*

---

## Wave 0 Requirements

- [x] Existing test harness `vitest` ready in `vitest.config.ts`
- [x] `src/lib/forms.test.ts` exists and runs fast (~1.2s)
- [ ] `src/app/file-field-renderer.test.ts` will be created in Plan 47-02 Task 3 to verify dropzone elements, SVG icon, and format preset text mapping

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| File field builder UI appearance | FILE-06 | Verifying visual layout, spacing, and dropdown interaction in browser | Open `/admin/forms/[id]`, click `+ Berkas`, verify builder controls appear, card displays summary badges, and outline panel lists `#index` with `Berkas` badge |
| Inert dropzone appearance in preview & public form | FILE-07 | Visual fidelity of dashed monochrome border, SVG icon, typography, and inert button | Open live preview tab and public form `/f/[slug]`, verify dropzone styling matches monochrome design tokens and inert button is not clickable |

---

## Validation Sign-Off

- [x] All tasks have `<automated>` verify or Wave 0 dependencies
- [x] Sampling continuity: no 3 consecutive tasks without automated verify
- [x] Wave 0 covers all MISSING references
- [x] No watch-mode flags
- [x] Feedback latency < 10s
- [x] `nyquist_compliant: true` set in frontmatter
