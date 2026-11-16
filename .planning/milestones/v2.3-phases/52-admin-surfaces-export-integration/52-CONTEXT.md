# Phase 52 Context: Admin Surfaces & Export Integration

## Requirements & Scope
- **FILE-20**: Admin can view all attached files per submission in an attachments section on the submission detail card/drawer.
- **FILE-21**: Admin can download each file individually via private route (`/api/files/[id]`).
- **FILE-22**: Admin can upload extra attachments to existing submissions via `POST /api/admin/files/upload` without mutating participant answers.
- **FILE-23**: Exporting submissions to Excel displays file fields as filename + private download route (`/api/files/[id]`), never raw MinIO URLs.
- **FILE-24**: Exported file values escape formula characters (`=`, `+`, `-`, `@`) to prevent CSV/Excel injection.
- **Cleanup**: Deleting submissions purges `submission_files`, `file_upload_jobs`, and deletes MinIO objects.

## Architectural Decisions
1. **Origin Identification**:
   - `field_id !== null`: Uploaded by participant through form question (`origin: 'participant'`).
   - `field_id === null`: Extra attachment added by admin on existing submission (`origin: 'admin'`).
2. **Formula Injection Sanitization**:
   - `escapeExcelFormula(val)`: If `val` begins with `=`, `+`, `-`, `@`, prepend `'` single quote.
3. **Safe Deletion Protocol**:
   - Query `submission_files` for the submission; delete MinIO objects via `deleteObject(key)`; delete `file_upload_jobs` and `submission_files` rows.
4. **Interactive UI**:
   - Submission cards render file answers as direct download links.
   - Attachments section lists files with origin badge (`Peserta` / `Admin`), sync status (`Menunggu sinkronisasi` / `Tersinkron`), file size, and download button.
   - Admin upload file input triggers `POST /api/admin/files/upload` with progress feedback.
