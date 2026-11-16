# Phase 47: File Field Config, Builder, Editor & Renderer - Context

**Gathered:** 2026-11-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 47 delivers the admin form builder configuration controls, serialization, and visual rendering for `File Upload` fields. Specifically:
- Admin can add and configure a `File Upload` field in `AdminFormEditor` (`label`, `required`, `maxSizeMB` capped at 10 MB, `allowedPreset` presets for images and PDF, `maxFiles` limit).
- The configured field renders in `AdminFormPreview` and `AttendanceForm` as a polished inert placeholder / dropzone styled to match the minimalist monochrome design system.
- Field cards and outline list in `AdminFormEditor` show clear summary badges (`Berkas`, format preset, max size, max file count).
- Field properties serialize and round-trip losslessly through `src/lib/forms.ts` and `src/lib/admin-form-preview.ts`.
- *Out of scope for Phase 47:* Actual byte streaming, client-side upload handling, and server upload endpoint (deferred to Phase 49).
</domain>

<decisions>
## Implementation Decisions

### Builder Configuration & Presets (FILE-06)
- **D-01: Max Size Configuration**: Admin can configure `maxSizeMB` between 1 MB and 10 MB with standard presets (2 MB, 5 MB, 10 MB) defaulting to 5 MB. Capped strictly at 10 MB to satisfy system constraints.
- **D-02: Allowed MIME Presets**: Provide intuitive preset options:
  - `images_and_pdf`: Gambar (PNG, JPG, WEBP) & Dokumen (PDF) — *(Recommended default)*
  - `images`: Gambar saja (PNG, JPG, WEBP)
  - `pdf`: Dokumen PDF saja
  - `all`: Semua format dokumen & gambar yang didukung (Maks 10 MB)
- **D-03: Max Files Limit**: Allow setting maximum file count between 1 and 5 files (default: 1 file).
- **D-04: Outline & Field Card Summary**: Outline panel displays `#index`, label, and `Berkas` badge; collapsed field card displays `Berkas` pill, required badge, allowed types hint (e.g. `Gambar + PDF`), and limit hint (e.g. `Maks 5 MB • 1 berkas`).

### Visual Presentation & Monochrome Design System (FILE-07)
- **D-05: Inert Dropzone Presentation**: Rendered in `AdminFormPreview` and `AttendanceForm` using monochrome variables (`var(--border)`, `var(--surface)`, `var(--foreground)`), featuring a dashed upload area, an upload/file SVG icon, label, format & size instruction, and an inert "Pilih Berkas" button.
- **D-06: Form Preview Context**: In preview and Phase 47 public form renderer, show an informational note that file uploading will be activated during live form submission.

### Domain Model & Serialization Parity
- **D-07: FileField Interface Extension**: Extend `FileField` in `src/lib/forms.ts` and `AdminPreviewField` in `src/lib/admin-form-preview.ts` with:
  - `maxSizeMB?: number` (default: 5)
  - `allowedPreset?: 'images' | 'pdf' | 'images_and_pdf' | 'all'` (default: 'images_and_pdf')
  - `maxFiles?: number` (default: 1)
- **D-08: Round-trip Parity**: Ensure mapper functions in `src/lib/forms.ts` (`fieldToAdminPreviewField`, form definition serializations, and DB mapping) preserve all file configuration attributes without data loss.

### The Agent's Discretion
- Exact styling details, CSS classes (`admin-builder-file-*`, `public-file-dropzone`), and icon SVG vectors follow existing monochrome patterns established in `AdminFormEditor.tsx` and `AttendanceForm.tsx`.
</decisions>

<canonical_refs>
## Canonical References

- `src/lib/forms.ts` — Domain form definitions, field types, validation, and JSON settings mapping.
- `src/lib/admin-form-preview.ts` — Editor-preview shared data types and draft sync.
- `src/components/AdminFormEditor.tsx` — Form builder UI, field settings controls, outline list.
- `src/components/AdminFormPreview.tsx` — Admin live form preview renderer.
- `src/components/AttendanceForm.tsx` — Public form renderer component.
</canonical_refs>
