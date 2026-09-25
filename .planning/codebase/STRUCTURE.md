# Codebase Structure

**Analysis Date:** 2026-09-25

## Directory Layout

```
isian/
├── .agent/                    # GSD skill definitions and agent resources
├── .planning/                 # Project state, roadmap, milestones, and codebase docs
│   └── codebase/              # 7 canonical codebase intelligence documents
├── infra/                     # Infrastructure configurations
│   └── nginx/                 # Benchmark reverse proxy configuration
├── load-tests/                # k6 performance and load testing scripts
├── prisma/                    # Database definitions and migration files
│   ├── migrations/            # SQL migration history
│   └── schema.prisma          # Prisma schema definition
├── public/                    # Static public assets (icons, images)
├── scripts/                   # Operational and maintenance scripts
│   └── submission-worker.mjs  # Background worker for asynchronous job drainage
├── src/                       # Main application source code
│   ├── app/                   # Next.js App Router (pages and API routes)
│   │   ├── admin/             # Admin console routes (forms, editor, preview, submissions)
│   │   ├── api/               # API route handlers (admin, public, internal, auth)
│   │   ├── f/                 # Public form entry route (`[slug]`)
│   │   └── success/           # Submission success route
│   ├── components/            # Reusable React components (client and server)
│   └── lib/                   # Core business logic, database adapters, utilities
├── .env.example               # Environment variables specification
├── docker-compose.yml         # Container services topology definition
├── Dockerfile                 # Multi-stage standalone production container build
├── eslint.config.mjs          # ESLint 9 Flat Config
├── next.config.ts             # Next.js configuration
├── package.json               # NPM packages and project scripts
├── tsconfig.json              # TypeScript compilation settings
└── vitest.config.ts           # Unit and integration test runner configuration
```

## Directory Purposes

**`src/app/`:**
- Purpose: Application routing, server component layouts, and HTTP endpoint handlers.
- Contains: `page.tsx`, `layout.tsx`, `route.ts`, CSS modules, and `globals.css`.
- Key files:
  - `src/app/layout.tsx`: Root HTML layout with font imports and metadata.
  - `src/app/f/[slug]/page.tsx`: Public form renderer page.
  - `src/app/admin/forms/page.tsx`: Admin dashboard listing forms.
  - `src/app/admin/forms/[id]/page.tsx`: Admin form builder and editor.
  - `src/app/admin/forms/[id]/submissions/page.tsx`: Submissions viewer and filter table.
  - `src/app/api/public/forms/[slug]/submit/route.ts`: Public submission receiver.
  - `src/app/api/internal/submission-jobs/process/route.ts`: Background job processor endpoint.

**`src/components/`:**
- Purpose: Client and presentation UI components.
- Contains: PascalCase `.tsx` files.
- Key files:
  - `src/components/AttendanceForm.tsx`: Unified multi-step public form engine.
  - `src/components/AdminFormEditor.tsx`: Schema builder and branching rule manager.
  - `src/components/AdminFormsList.tsx`: Form management table with actions.
  - `src/components/AdminFormSubmissions.tsx`: Data grid for form responses with export options.
  - `src/components/SignaturePad.tsx`: Canvas signature capture component.
  - `src/components/SearchableSelect.tsx`: Accessible searchable dropdown.

**`src/lib/`:**
- Purpose: Domain business logic, database interaction, security, and utility functions.
- Contains: CamelCase / kebab-case `.ts` modules and collocated `.test.ts` files.
- Key files:
  - `src/lib/forms.ts`: Core form engine (CRUD, validation, branching, scoring, export, queue).
  - `src/lib/auth.ts`: Authentication session resolution and admin allowlist checking.
  - `src/lib/prisma.ts`: Database client instantiation with connection pooling.
  - `src/lib/rate-limit.ts`: In-memory IP-based sliding window rate limiter.
  - `src/lib/ai-analysis.ts`: AI prompt builder and LLM client for submission summarization.
  - `src/lib/env.ts`: Type-safe environment variable parsers.

**`prisma/`:**
- Purpose: Database schemas and migration tracking.
- Contains: `schema.prisma` and timestamped SQL migration folders in `migrations/`.

**`scripts/`:**
- Purpose: Operational Node.js scripts executed outside Next.js request lifecycle.
- Contains: `submission-worker.mjs` for draining the submission queue.

**`load-tests/`:**
- Purpose: Performance evaluation using k6.
- Contains: `public-form-journey.k6.js`.

## Key File Locations

**Entry Points:**
- `src/app/page.tsx`: Root route redirecting to `/admin/forms` or `/admin/login`.
- `src/app/f/[slug]/page.tsx`: Public participant form entry point.
- `scripts/submission-worker.mjs`: Background job runner entry point.

**Configuration:**
- `next.config.ts`: Next.js standalone and bundling settings.
- `tsconfig.json`: TypeScript compiler options and alias `@/*`.
- `eslint.config.mjs`: Linting standards.
- `vitest.config.ts`: Test environment settings.
- `.env.example`: Environment variable schema reference.

**Core Logic:**
- `src/lib/forms.ts`: Forms engine, SQL execution, validations, and exports.
- `src/lib/ai-analysis.ts`: AI submission analysis and prompt pipeline.

**Testing:**
- `src/**/*.test.ts`: Collocated unit and integration tests (e.g., `src/lib/forms.test.ts`, `src/lib/ai-analysis.test.ts`).

## Naming Conventions

**Files:**
- Components: PascalCase `.tsx` (e.g. `AdminFormEditor.tsx`, `SearchableSelect.tsx`).
- Library Utilities: kebab-case `.ts` (e.g. `rate-limit.ts`, `ai-analysis.ts`, `form-delete-utils.ts`).
- Tests: `*.test.ts` collocated next to the implementation file (e.g. `rate-limit.test.ts`).
- App Router Pages: `page.tsx`, `layout.tsx`, `route.ts`.

**Directories:**
- Route parameters: `[bracket]` notation (e.g. `src/app/f/[slug]/`, `src/app/admin/forms/[id]/`).
- Catch-all routes: `[...name]` (e.g. `src/app/api/auth/[...nextauth]/`).
- Feature folders: kebab-case or lowercase (e.g. `load-tests/`, `scripts/`).

## Where to Add New Code

**New Feature (e.g., new form field type or submission action):**
- Field Types & Domain Rules: Update `FormFieldType`, `FormField`, and validation in `src/lib/forms.ts`.
- Public Form UI: Add rendering logic in `src/components/AttendanceForm.tsx`.
- Admin Editor UI: Add input configurations in `src/components/AdminFormEditor.tsx`.
- Unit Tests: Add test cases to `src/lib/forms.test.ts`.

**New Component/Module:**
- Shared UI Component: Create `src/components/[ComponentName].tsx`.
- Admin-specific Page: Create `src/app/admin/[feature]/page.tsx`.

**Utilities & Service Helpers:**
- General Helpers: Create or add to `src/lib/[helper-name].ts`.
- Unit Tests: Collocate in `src/lib/[helper-name].test.ts`.

## Special Directories

**`.next/`:**
- Purpose: Next.js build output and caching.
- Generated: Yes.
- Committed: No (ignored in `.gitignore`).

**`prisma/migrations/`:**
- Purpose: Tracked SQL migration history.
- Generated: Yes (via `npx prisma migrate dev`).
- Committed: Yes.

**`.planning/`:**
- Purpose: GSD workflow planning, requirements, and codebase intelligence documentation.
- Generated: Yes.
- Committed: Yes.

---

*Structure analysis: 2026-09-25*
