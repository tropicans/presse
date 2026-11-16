# Phase 49: Public Upload API & Client Upload Component - Context

**Gathered:** 2026-11-16
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 49 implements the public file upload pipeline:
1. `POST /api/public/files/upload` API route handling multipart file uploads, rate limiting, magic-byte MIME validation, and database spooling via `file-storage.ts`.
2. Interactive drag-and-drop file upload component inside `AttendanceForm.tsx`, replacing the inert Phase 47 placeholder with active progress indicator, preview (image thumbnail or PDF badge), and removal button.
3. Submission verification & linking inside `submitForm` / `POST /api/public/forms/[slug]/submit`, validating that uploaded files exist and are in `PENDING_UPLOAD` state before atomic transition to `QUEUED` linked to the submission.
4. MinIO availability resilience: uploads succeed and spool to Postgres even if MinIO is degraded/down.
</domain>

<decisions>
## Implementation Decisions

### API Contract (POST /api/public/files/upload)
- **D-01: Multipart Parsing & Magic Byte Sniffing**: Use `fileTypeFromBuffer` from `file-type` to detect true MIME type (`image/png`, `image/jpeg`, `application/pdf`). Rejects spoofed extensions with HTTP 400.
- **D-02: Size & Configuration Enforcement**: Validates file size against the form's `field.fileConfigs.maxSizeMB` (capped at 10 MB).
- **D-03: Rate Limiting**: Per-IP sliding-window rate limiting (requests per minute and volume limit e.g. 50 MB / 10 min) using `src/lib/rate-limit.ts`.
- **D-04: Storage Resilience**: Invokes `recordFileUpload` in `src/lib/file-storage.ts` to store bytes directly in `file_upload_jobs.payload` and metadata in `submission_files` with status `PENDING_UPLOAD`. MinIO connection failures do not block this endpoint.
- **D-05: Response Format**: Returns JSON `{ fileId: string, filename: string, size: number, mime: string }`.

### Public Form UI (AttendanceForm.tsx)
- **D-06: Interactive Upload Experience**:
  - Drag-and-drop zone and native file picker button matching the monochrome aesthetic.
  - Active upload progress state (loading spinner / progress bar).
  - Post-upload card displaying file icon/thumbnail, file name, formatted size, and a "Hapus" (Remove) button.
  - Form state updates `formData[field.id]` with `{ fileId, filename, size, mime }` (or `fileId`).
- **D-07: Error Handling in UI**: Displays inline user-friendly error banners if a file exceeds the allowed size, has an unaccepted format, or if upload fails.

### Submission Linking (src/lib/forms.ts)
- **D-08: Pre-Submission Verification**: In `validateFormSubmission`, for each `FILE` field, checks required constraint (must have at least one uploaded file if `required: true`).
- **D-09: Atomic Submission Linking**: In `submitForm`, calls `linkFilesToSubmission` within the submission transaction to link `fileId` to `submission.id` and advance status from `PENDING_UPLOAD` to `QUEUED`.
</decisions>

<canonical_refs>
## Canonical References
- `src/lib/file-storage.ts` — `recordFileUpload` and `linkFilesToSubmission`.
- `src/components/AttendanceForm.tsx` — Public form rendering and state handling.
- `src/lib/forms.ts` — Form validation (`validateFormSubmission`) and creation (`submitForm`).
- `src/lib/rate-limit.ts` — In-memory sliding-window rate limiter.
</canonical_refs>
