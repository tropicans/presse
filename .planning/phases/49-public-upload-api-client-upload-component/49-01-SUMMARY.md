---
phase: 49-public-upload-api-client-upload-component
plan: 01
subsystem: api + validation
tags:
  - public-upload
  - magic-bytes
  - rate-limiting
  - multipart
  - file-storage
dependency_graph:
  requires:
    - 48-02
  provides:
    - public-file-upload-endpoint
    - file-upload-validation
    - magic-byte-sniffing
    - filename-sanitization
  affects:
    - src/app/api/public/files/upload/route.ts
    - src/lib/file-upload-validation.ts
    - src/app/api/public/files/upload/upload-api.test.ts
tech_stack:
  added: []
  patterns:
    - file-type buffer magic-byte detection
    - Directory traversal filename sanitization
    - Rate-limiting sliding window per IP
    - Atomic PostgreSQL spooling via recordFileUpload
key_files:
  created:
    - src/app/api/public/files/upload/route.ts
    - src/lib/file-upload-validation.ts
    - src/app/api/public/files/upload/upload-api.test.ts
  modified: []
decisions:
  - D-01: True MIME sniffing via fileTypeFromBuffer protects against extension spoofing
  - D-02: Strict size enforcement against field fileConfigs (capped at 10 MB)
  - D-03: Per-IP sliding-window rate limiting on upload endpoint (30 req / 10 min)
  - D-04: Spooling file bytes into PostgreSQL ensures upload succeeds even during storage outages
metrics:
  duration: 15m
  completed_date: "2026-11-16"
status: complete
actuals:
  tasks: 2
  commits: 1
---

# Phase 49 Plan 01: Public Upload API Route, Magic-Byte MIME Validation, and Automated Tests Summary

## One-liner
Public multipart upload endpoint at `POST /api/public/files/upload` with magic-byte MIME sniffing, directory-traversal filename sanitization, rate-limiting, and resilient PostgreSQL spooling.

## Key Accomplishments
1. **Magic-Byte Sniffing & Validation**: Created `src/lib/file-upload-validation.ts` using `file-type` to detect true MIME types (JPEG, PNG, PDF), rejecting spoofed or disallowed formats and files exceeding `maxSizeMB`.
2. **Filename Sanitization & Checksum**: Stripped path traversal and control characters from client filenames and computed SHA-256 checksums.
3. **Public Upload Route**: Created `src/app/api/public/files/upload/route.ts` receiving multipart form data, validating form existence and field configurations, and saving spooled payloads through `recordFileUpload`.
4. **Resilient Architecture**: Ensured uploads return HTTP 200 with `{ fileId, originalFilename, sanitizedFilename, size, mime }` even if MinIO is degraded/down.
5. **Comprehensive Tests**: 10 unit and route tests created in `src/app/api/public/files/upload/upload-api.test.ts` passing 100%.
