# Repository Guidelines

## Project Structure & Module Organization
- `src/app/`: Next.js App Router pages, layouts, and API routes.
- `src/app/admin/`: Admin UI for form management and submissions.
- `src/app/api/`: Server routes for auth, admin form CRUD, exports, and public submissions.
- `src/components/`: Reusable React UI for editors, tables, previews, and signature capture.
- `src/lib/`: Shared helpers (`auth`, `prisma`, validation, rate limiting).
- `prisma/`: Database schema and migrations. Treat schema and migration files as one change set.
- `public/`: Static assets and icons.

## Build, Test, and Development Commands
- `npm install`: Install dependencies. This repo uses `package-lock.json`, so use npm.
- `npm run dev`: Start development on `http://localhost:3456`.
- `npm run lint`: Run ESLint across the project.
- `npm run build`: Build the app and catch integration issues.
- `npm run start`: Serve the production build locally.
- `npx prisma migrate dev`: Create/apply local schema changes during development.
- `npx prisma generate`: Regenerate Prisma client after schema edits.

## Coding Style & Naming Conventions
- Use TypeScript throughout; keep strict typing intact and avoid `any` unless unavoidable.
- Use PascalCase for components, camelCase for helpers, and route folders that match URL shape.
- Keep API handlers close to their route in `src/app/api/**/route.ts`.
- Use 2-space indentation and preserve import order in touched files.
- Let `eslint.config.mjs` define style rules; run lint before opening a PR.

## Testing Guidelines
- No automated test suite is checked in yet; treat `npm run lint` and `npm run build` as the minimum gate.
- For changes to forms, auth, admin flows, or exports, manually verify the page and route locally.
- If you add tests, colocate them near the feature or under `src/` with names like `ComponentName.test.tsx`.

## Commit & Pull Request Guidelines
- Follow the commit style in history: Conventional Commits such as `feat(forms): add admin form builder` or `fix(auth): handle expired session`.
- Keep commits scoped to one concern and include Prisma schema+migration changes together.
- PRs should include purpose, affected routes/pages, setup or migration notes, and screenshots for UI changes.
- Link the relevant issue or task, and note any required env changes or seed data.

## Security & Configuration Tips
- Copy `.env.example` when setting up local config; never commit secrets from `.env` or production values.
- Review auth-sensitive changes in `src/lib/auth.ts` and `src/app/api/auth/`.
- For database changes, verify export and submission flows against a migrated database before merge.
