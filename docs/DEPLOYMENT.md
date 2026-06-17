<!-- generated-by: gsd-doc-writer -->
# Deployment Guide

This document describes the deployment procedures, targets, configuration setup, and rollback instructions for Isian.

## Deployment targets

Isian is packaged to run in containerized environments. It is built as a Docker image and orchestrated using Docker Compose.

* **Target Environment**: Node 22 Alpine Linux container.
* **Dockerfile**: Located in the root directory, uses a multi-stage build (`output: "standalone"` Next.js configuration).
* **Orchestration**: Docker Compose config is defined in `docker-compose.yml` (development/general compose) and `docker-compose.prod.yml` (production-override). <!-- VERIFY: Docker Compose targets should run on production servers -->

## Build pipeline

The application is validated before deployment using the GitHub Actions CI pipeline (`.github/workflows/ci.yml`).

To compile a production bundle locally:
```bash
npm run build
```
This produces a standalone production server under the `.next/standalone` folder.

For production release, we construct the Docker containers using the following command sequence:
1. Ensure production environment variables are configured in `.env.production`.
2. Deploy the stack:
   ```bash
   # 1. Pull/Start the PostgreSQL database service
   docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build postgres

   # 2. Run Prisma migrations against the production database
   docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production run --rm app npx prisma migrate deploy

   # 3. Start the application server and background job worker
   docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build app worker
   ```

## Environment setup

Production deployments require all variables marked as **Required** in the [Configuration Guide](file:///c:/Users/yudhiar/Downloads/oprek/Dev\jott/docs/CONFIGURATION.md) to be defined in `.env.production` or injected via your orchestration platform.

* **NextAuth Security**: Ensure `NEXTAUTH_URL` is set to the public HTTPS domain.
* **Database Privacy**: PostgreSQL should not have its port published to the public internet. Ensure the database runs on a private overlay network.

## Rollback procedure

In the event of a deployment failure or critical regression:
1. Revert to the previously stable version tag in Git.
2. Re-run the deployment steps:
   ```bash
   docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d --build app worker
   ```
3. If database changes are backward-incompatible, you must restore the database from the last automated snapshot before the failed migration. <!-- VERIFY: Check cloud database backup configurations -->

## Monitoring

* **Health Endpoint**: The application exposes a health check route at `/api/health` which verifies that database queries can run successfully.
* **APM / Error Tracking**: No external application performance monitoring (APM) libraries (such as Sentry or Datadog) are currently configured in `package.json`. The platform relies on:
  * Docker Compose auto-restarts based on `/api/health` status.
  * Container stdout log collections (e.g. via `docker compose logs`).
