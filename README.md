# Isian

Aplikasi Next.js untuk form publik, absensi webinar, admin form builder, ekspor Excel, dan worker pemrosesan submission berbasis PostgreSQL.

## Requirements

- Node.js 22 untuk production/CI.
- npm.
- PostgreSQL 16+.
- Docker dan Docker Compose opsional untuk runtime lokal/container.

## Environment variables

Salin `.env.example` ke `.env` untuk local development. Salin `.env.production.example` ke `.env.production` di server production. Jangan commit `.env` atau `.env.production`.

Required:

| Name | Secret | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | yes | Koneksi PostgreSQL Prisma |
| `NEXTAUTH_URL` | no | Base URL aplikasi; production harus HTTPS domain publik |
| `NEXTAUTH_SECRET` | yes | Secret session NextAuth |
| `GOOGLE_CLIENT_ID` | no | Google OAuth client id |
| `GOOGLE_CLIENT_SECRET` | yes | Google OAuth client secret |
| `ADMIN_EMAILS` | no | Comma-separated allowlist email admin |
| `INTERNAL_WORKER_TOKEN` | yes | Token route internal worker |

Optional:

| Name | Default | Purpose |
| --- | --- | --- |
| `POSTGRES_DB` | `isian_attendance` | Nama database Docker Compose |
| `POSTGRES_USER` | `isian_user` | User database Docker Compose |
| `POSTGRES_PASSWORD` | none | Password database Docker Compose |
| `DB_POOL_MAX` | `20` | Max koneksi pool Prisma |
| `DB_POOL_MIN` | `4` | Min koneksi pool Prisma |
| `DB_POOL_CONNECTION_TIMEOUT_MS` | `10000` | Timeout koneksi DB |
| `DB_POOL_IDLE_TIMEOUT_MS` | `30000` | Timeout idle DB |
| `SUBMISSION_JOB_DELAY_SECONDS` | `5` | Delay proses job submission |
| `WORKER_BASE_URL` | `http://localhost:3456` | Base URL worker |
| `WORKER_BATCH_SIZE` | `25` | Batch worker |
| `WORKER_IDLE_MS` | `250` | Sleep saat idle |
| `WORKER_ERROR_MS` | `1000` | Sleep setelah error |
| `RATE_LIMIT_SINGLE_INSTANCE_OK` | `false` | Guard untuk rate limiter in-memory di production single-instance |

## Local development

```bash
npm ci
npx prisma generate
npm run dev
```

App berjalan di:

```text
http://localhost:3456
```

## Database migrations

Development:

```bash
npx prisma migrate dev
```

Production:

```bash
npx prisma migrate deploy
```

Generate Prisma Client:

```bash
npx prisma generate
```

## Worker

Worker memanggil route internal `/api/internal/submission-jobs/process` memakai `INTERNAL_WORKER_TOKEN`.

```bash
npm run worker:submission
```

## Docker Compose

Set env wajib lebih dulu. Contoh local:

```bash
POSTGRES_PASSWORD=change-me-long-random-password \
DATABASE_URL='postgresql://isian_user:change-me-long-random-password@postgres:5432/isian_attendance?schema=public' \
NEXTAUTH_URL='http://localhost:3456' \
NEXTAUTH_SECRET='generate-with-openssl-rand-base64-32' \
GOOGLE_CLIENT_ID='your-google-client-id.apps.googleusercontent.com' \
GOOGLE_CLIENT_SECRET='your-google-client-secret' \
ADMIN_EMAILS='admin@example.com' \
INTERNAL_WORKER_TOKEN='generate-long-random-token' \
RATE_LIMIT_SINGLE_INSTANCE_OK='true' \
docker compose up --build
```

Production note:

- Jangan publish PostgreSQL port ke internet.
- Inject secret lewat secret manager/environment platform.
- Jangan pakai `.env.production` committed.
- Set `NEXTAUTH_URL` ke domain HTTPS production.

Production single-instance dengan override aman:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build postgres
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production run --rm app npx prisma migrate deploy
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build app worker
```

`docker-compose.prod.yml` menghapus publish port PostgreSQL dan bind aplikasi ke `127.0.0.1:${APP_BIND_PORT:-3456}` untuk reverse proxy lokal.

## Health check

Endpoint:

```text
GET /api/health
```

Endpoint menguji aplikasi dan query ringan database (`SELECT 1`). Docker healthcheck memakai endpoint ini.

## Security notes

- Rotate semua secret yang pernah masuk file lokal/repo.
- `.env*` di-ignore dan tidak boleh committed.
- `INTERNAL_WORKER_TOKEN` harus random panjang dan hanya tersedia untuk app + worker.
- Admin OAuth dibatasi oleh `ADMIN_EMAILS`.
- Rate limiter default masih in-memory. Untuk multi-instance production, ganti ke shared store seperti Redis; jangan set `RATE_LIMIT_SINGLE_INSTANCE_OK=true` kecuali benar-benar single-instance di belakang proxy terpercaya.
- Database harus private network.

## Quality gates

Jalankan sebelum merge/deploy:

```bash
npm run lint
npm test
npm run build
npm audit --audit-level=moderate
```

CI menjalankan gate yang sama di `.github/workflows/ci.yml`.

## Production deployment checklist

- [ ] Secret lama sudah di-rotate.
- [ ] Tidak ada secret nyata di committed files.
- [ ] `NEXTAUTH_URL` memakai HTTPS domain production.
- [ ] Google OAuth redirect URI cocok dengan domain production.
- [ ] Database private, backup aktif, restore pernah diuji.
- [ ] `npx prisma migrate deploy` sukses.
- [ ] `npm run lint` sukses.
- [ ] `npm test` sukses.
- [ ] `npm run build` sukses.
- [ ] `npm audit --audit-level=moderate` sukses.
- [ ] `/api/health` sukses dari runtime production.
- [ ] Worker berjalan dan route internal menolak token salah.

## Installation

To install the project dependencies, run:
```bash
npm ci
```

## Quick start

1. Copy the example environment variables:
   ```bash
   cp .env.example .env
   ```
2. Generate the Prisma client:
   ```bash
   npx prisma generate
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```
4. Access the application in your browser at `http://localhost:3456`.

## Usage examples

### Running the Background Submission Worker
To start processing submission queue jobs:
```bash
npm run worker:submission
```

### Running Public Load Tests
To execute performance testing on public form journeys using k6:
```bash
npm run load:test:public
```

## License

This project is private and proprietary. All rights reserved.
