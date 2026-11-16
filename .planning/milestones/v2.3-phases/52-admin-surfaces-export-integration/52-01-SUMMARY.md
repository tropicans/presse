# Plan 52-01 Summary: Admin Surfaces, Attachment Upload & Export Integration

## What Was Done
1. **Core Domain & Submissions Loading (`src/lib/forms.ts`)**:
   - Extended `AdminFormSubmissionItem` with `files?: AdminSubmissionFileItem[]`.
   - Updated `listAdminFormSubmissions` to load all `submission_files` for the paginated items on the page, computing origin (`participant` vs `admin`) and status.
   - Updated `deleteAdminFormSubmission` with cascading cleanup calling `deleteSubmissionFiles(submissionId)`, which deletes MinIO objects via `deleteObject(key)` and deletes corresponding records from `file_upload_jobs` and `submission_files`.
2. **Excel Export Integration & Formula Escaping (`src/lib/forms.ts`)**:
   - Added and exported `escapeExcelFormula(value)` which prefixes characters `=`, `+`, `-`, and `@` with `'` to defuse CSV/Excel formula injection (FILE-24).
   - Updated `exportAdminFormSubmissionsWorkbook` to format file answers as `${escapeExcelFormula(fileName)} (URL: /api/files/${fileId})` and configure native cell hyperlinks pointing to `/api/files/${fileId}` (FILE-23). Direct MinIO/storage URLs are never exposed.
3. **Admin Supplementary Upload Endpoint (`POST /api/admin/files/upload`)**:
   - Implemented in `src/app/api/admin/files/upload/route.ts`.
   - Requires admin session via `getAdminSession()`.
   - Validates existence of target `submissionId`.
   - Validates file using `validateUploadFile` (magic bytes, size up to 10MB).
   - Spools in `file_upload_jobs` and links to `submission_files` with `field_id = NULL` (marking origin as `admin`), without altering participant answers (FILE-22).
4. **Admin Submissions UI (`src/components/AdminFormSubmissions.tsx`)**:
   - Rendered file answers in the submissions grid/card as direct download links.
   - Added **Lampiran Berkas (Attachments)** section to each submission card (FILE-20, FILE-21):
     - Displays file name and formatted size.
     - Displays origin badge (`Peserta` / `Admin`).
     - Displays sync status badge (`Tersinkron` / `Menunggu sinkronisasi`).
     - Displays direct download button pointing to `/api/files/[id]`.
     - Displays an inline file upload button allowing admins to upload supplementary attachments directly to the submission without a full page reload.
5. **Testing & Verification**:
   - Created `src/app/api/admin/files/upload/admin-upload.test.ts` (5 tests).
   - Created `src/lib/file-admin-export.test.ts` (4 tests).
   - Total 241 tests passed across 27 test files.
   - Rebuilt `app` and `worker` containers, verified healthy (`{ "status": "ok" }`).
