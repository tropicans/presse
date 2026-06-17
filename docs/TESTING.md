<!-- generated-by: gsd-doc-writer -->
# Testing

This document details the testing framework, test execution procedures, coding standards for test files, and continuous integration testing setups.

## Test framework and setup

Isian uses **Vitest** as its primary test runner and runner framework.
* **Runner**: Vitest (configured in `vitest.config.ts`)
* **Environment**: `node`
* **Prerequisites**: Before running tests, ensure that you have run:
  ```bash
  npm ci
  npx prisma generate
  ```

## Running tests

### Unit Tests
To run the full suite of unit tests once:
```bash
npm run test
```

To run tests in watch mode, which monitors file changes and reruns relevant tests:
```bash
npm run test:watch
```

### Public Form Journey Load Testing
We use **k6** to benchmark and load test public form submissions. The load tests verify the response times and stability of form views, form schemas, and submission endpoints.
To execute the load tests:
```bash
npm run load:test:public
```
The load tests will target the endpoints:
* `/f/[slug]`
* `/api/public/forms/[slug]`
* `/api/public/forms/[slug]/submit` (optional submission verification)

## Writing new tests

### File Naming Convention
Test files must be located under the `src/` directory and match the glob pattern:
```text
src/**/*.test.ts
```

### Test Helpers and Mocking
We mock dependencies such as database adapters and framework caching mechanisms to keep tests fast and deterministic.
For database operations, mock `prisma` from `@/lib/prisma`. For example:
```typescript
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([]),
    $executeRaw: vi.fn().mockResolvedValue(1),
  },
}))
```

## Coverage requirements

* **Thresholds**: No formal code coverage thresholds are configured in `vitest.config.ts`.
* Run coverage: If you wish to inspect local coverage, you can install the Vitest coverage package and run `npx vitest run --coverage`.

## CI integration

Tests are executed automatically on every push or pull request to the `main` or `master` branch.
* **Workflow**: `.github/workflows/ci.yml`
* **Runner Environment**: `ubuntu-latest`
* **Trigger Job**: `test`
* **Sequence**:
  1. Installs Node.js 22 and retrieves npm cache.
  2. Installs dependencies using `npm ci`.
  3. Generates the Prisma client.
  4. Runs ESLint via `npm run lint`.
  5. Executes unit tests via `npm test`.
  6. Compiles the production application bundle via `npm run build`.
  7. Audits npm dependencies using `npm audit --audit-level=moderate`.
