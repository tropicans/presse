<!-- generated-by: gsd-doc-writer -->
# Configuration

This document lists and explains all configuration settings and environment variables used by the Isian application and its background worker.

## Environment variables

The application is configured using environment variables. For local development, copy the `.env.example` file to `.env` and adjust the values. For production, set these variables in your hosting provider's environment settings or in a secure `.env.production` file.

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | **Yes** | None | PostgreSQL connection URL used by Prisma. |
| `NEXTAUTH_URL` | **Yes** | `http://localhost:3456` | The base URL of the application. In production, this must be set to the public HTTPS domain. <!-- VERIFY: NEXTAUTH_URL must match the production HTTPS domain --> |
| `NEXTAUTH_SECRET` | **Yes** | None | A random string used to hash tokens and secure sessions. |
| `GOOGLE_CLIENT_ID` | **Yes** | None | Google Cloud Console OAuth 2.0 Client ID. <!-- VERIFY: Google OAuth credentials must be generated in the Google Cloud Console --> |
| `GOOGLE_CLIENT_SECRET` | **Yes** | None | Google Cloud Console OAuth 2.0 Client Secret. |
| `ADMIN_EMAILS` | **Yes** | None | Comma-separated list of Google email addresses permitted to access the `/admin` area. <!-- VERIFY: ADMIN_EMAILS must contain actual admin email addresses in production --> |
| `INTERNAL_WORKER_TOKEN` | **Yes** | None | Secret token used to authenticate calls from the background worker. <!-- VERIFY: INTERNAL_WORKER_TOKEN must be a long, secure random string --> |
| `DB_POOL_MAX` | No | `20` | Maximum number of connections in the Prisma connection pool. |
| `DB_POOL_MIN` | No | `4` | Minimum number of connections in the Prisma connection pool. |
| `DB_POOL_CONNECTION_TIMEOUT_MS` | No | `10000` | Timeout in milliseconds before a database connection attempt fails. |
| `DB_POOL_IDLE_TIMEOUT_MS` | No | `30000` | Idle timeout in milliseconds for database connections. |
| `SUBMISSION_JOB_DELAY_SECONDS` | No | `5` | Delay in seconds between checking the submission queue for new jobs. |
| `WORKER_BASE_URL` | No | `http://localhost:3456` | The base URL the background worker uses to contact the API. |
| `WORKER_BATCH_SIZE` | No | `25` | Number of submissions the worker processes in a single batch. |
| `WORKER_IDLE_MS` | No | `250` | Sleep time in milliseconds when the worker has no jobs to process. |
| `WORKER_ERROR_MS` | No | `1000` | Sleep time in milliseconds when the worker encounters an error. |
| `RATE_LIMIT_SINGLE_INSTANCE_OK` | No | `false` | Set to `true` to allow running the in-memory rate limiter in production (only safe for single-instance deployments). |

## Config file format

No custom YAML, JSON, or TOML files are used for runtime configuration. All options are controlled strictly through environment variables. The TypeScript configuration is governed by `tsconfig.json`, and Next.js compiler behaviors are managed in `next.config.ts`.

## Required vs optional settings

The application will throw an error and fail to start or function if any of the following variables are missing:
* **`DATABASE_URL`**: Required at runtime and build time for Prisma database initialization.
* **`NEXTAUTH_SECRET`**: Required by NextAuth for session verification.
* **`GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`**: Required for initiating Google OAuth administrative login.
* **`ADMIN_EMAILS`**: Required to check permissions during admin logins.
* **`INTERNAL_WORKER_TOKEN`**: Required to process background submission jobs.

## Defaults

Defaults are set directly in the code:
* Prisma connection pooling options default to `20` max connections and `4` min connections (`src/lib/prisma.ts`).
* Background worker defaults to fetching `25` jobs per batch and idling for `250ms` (`scripts/submission-worker.mjs`).
* The database schema defaults to the `public` schema.

## Per-environment overrides

* **Local Development**: Configured using a `.env` file at the project root.
* **Testing**: Environment variables for Vitest are defined in `.env` or overridden inside specific test files.
* **Production**: Docker Compose deployments load environment overrides from `.env.production` (using `docker-compose.prod.yml`). For cloud platforms, variables are set directly via their dashboard environment panels.
