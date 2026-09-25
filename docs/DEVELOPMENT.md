<!-- generated-by: gsd-doc-writer -->
# Development

This document outlines local development workflows, package script configurations, coding guidelines, and submission conventions for Isian.

## Local setup

To set up your environment for active development:
1. Follow the [Getting Started Guide](file:///c:/Users/yudhiar/Downloads/oprek/Dev/jott/docs/GETTING-STARTED.md) to set up your `.env` and database.
2. Generate Prisma types locally using:
   ```bash
   npx prisma generate
   ```
3. Run the development server:
   ```bash
   npm run dev
   ```

## Build commands

The following commands are defined in `package.json` to manage development, compilation, and maintenance tasks:

| Command | Description |
|---|---|
| `npm run dev` | Runs the Next.js App Router server locally in development mode on port `3456`. |
| `npm run build` | Compiles the application into a production-optimized standalone build. |
| `npm run start` | Runs the compiled Next.js standalone server in production mode. |
| `npm run lint` | Runs ESLint rules to identify syntax and style issues in the codebase. |
| `npm run test` | Runs the unit test suite once using Vitest. |
| `npm run test:watch` | Starts the Vitest test runner in watch mode to automatically rerun tests when code changes. |
| `npm run worker:submission` | Starts the background submission queue processing worker script. |
| `npm run load:test:public` | Executes public form submission journey benchmarks using the k6 load testing utility. |

## Code style

We maintain code quality and style consistency using the following tools:
* **ESLint**: Configured via the `eslint.config.mjs` flat configuration file. It enforces Next.js core web vitals patterns and strict TypeScript rules.
* Run code linting check:
  ```bash
  npm run lint
  ```
* Targeted lint check for a single component:
  ```bash
  npm run lint -- src/components/AttendanceForm.tsx
  ```

## Branch conventions

When creating a branch, follow lowercase-kebab naming style starting with the type of work being done:
* **Features**: `feat/your-feature-name`
* **Bug Fixes**: `fix/bug-description`
* **Documentation**: `docs/documentation-update`
* **Chores / Refactoring**: `chore/maintenance-task`

## PR process

1. Before pushing or requesting code review, verify that all quality gates pass:
   ```bash
   npm run lint
   npx tsc --noEmit --pretty false
   npm run build
   ```
2. Open a Pull Request pointing to the main repository branch.
3. Verify that the automated CI pipeline passes successfully.
4. When committing or merging, ensure model attribution is included:
   ```text
   Co-Authored-By: Antigravity <noreply@example.com>
   ```
