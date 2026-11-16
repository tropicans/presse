# Phase 51 Context: Private File Serving Route

## Focus & Decisions

### 1. Route Pattern & Signature
- Endpoint: `GET /api/files/[id]` (Next.js 16 Route Handler with `context: { params: Promise<{ id: string }> }`).
- Gate: `getAdminSession()` from `@/lib/auth`. Unauthenticated requests immediately return HTTP 401.

### 2. Dual-Source Streaming
- Seamless dual-source serving:
  - If `file.payload` is present in DB (spool layer, pending sync): stream bytes directly from memory/buffer.
  - If `file.status === 'SYNCED'` and `file.objectKey` is set: fetch bytes via `getObjectBytes(objectKey)` from `@/lib/storage.ts`.
  - If neither (e.g. `FAILED` or `ORPHANED` with cleared payload): return HTTP 404 / 410.

### 3. Security Headers & Defense
- `Content-Disposition: attachment; filename="<sanitized>"; filename*=UTF-8''<encoded>` — strictly force download, preventing inline HTML/SVG/script execution under admin origin.
- `X-Content-Type-Options: nosniff` — prevents MIME confusion attacks.
- `Content-Type: <file.mime>` — explicit validated MIME.
- `Cache-Control: private, no-cache, no-store, must-revalidate` — prevent caching of sensitive form documents.
- Traversal & Injection Defense: Strictly validate `id` parameter against alphanumeric/UUID pattern; reject traversal strings (`../`, `\`, `/`).

### 4. Zero Storage URL Exposure
- No client or admin ever sees raw MinIO URLs or S3 endpoints. All access is mediated through `/api/files/[id]`.
