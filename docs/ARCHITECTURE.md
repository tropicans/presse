<!-- generated-by: gsd-doc-writer -->
# System Architecture

## System overview
Isian is a form-building and submission platform built on Next.js 16 (App Router) designed to facilitate public form submissions, webinar attendance tracking, quiz assessments with automated scoring, and administrative form configuration. It features a Next.js frontend, a PostgreSQL database managed via Prisma ORM, and a background processing worker that executes queued submission jobs asynchronously. Admin operations (such as form management, submissions browsing, and Excel exports) are protected via NextAuth Google OAuth with email allowlisting.

## Component diagram
```mermaid
graph TD
    User([Public User]) -->|Fills Form| PublicUI[Public Form Page /f/[slug]]
    Admin([Form Admin]) -->|Configures Forms| AdminUI[Admin Portal /admin]
    PublicUI -->|POST /api/public/forms/[slug]/submit| PublicAPI[Public Form API]
    AdminUI -->|POST/GET /api/admin/forms| AdminAPI[Admin Form API]
    PublicAPI -->|Enqueues Jobs| DB[(PostgreSQL Database)]
    AdminAPI -->|Reads/Writes Form Specs| DB
    Worker[Submission Background Worker] -->|POST /api/internal/submission-jobs/process| InternalAPI[Internal Processing API]
    InternalAPI -->|Processes Queue| DB
```

## Data flow
1. **Public Submission Flow**:
   - The user visits the public form page `/f/[slug]`.
   - The page fetches the form schema from `/api/public/forms/[slug]`.
   - The user fills and submits the form, calling `/api/public/forms/[slug]/submit` via a POST request.
   - The API route handler validates the submission using the `validateFormSubmission` helper from `src/lib/forms.ts`.
   - The submission is stored in the database. If background processing is needed, a job is inserted into the submission queue.
   - The user is redirected to the confirmation page `/success?slug=<slug>&submissionId=<id>`.

2. **Worker Processing Flow**:
   - A background daemon script (`scripts/submission-worker.mjs`) regularly triggers `src/app/api/internal/submission-jobs/process/route.ts` with a security token.
   - The handler calls `processQueuedSubmissionJobs` in `src/lib/forms.ts` to process pending submissions in batches, running scoring rules or webinar integrations.

3. **Admin Form Management Flow**:
   - An administrator authenticates via Google OAuth.
   - The admin UI communicates with `/api/admin/forms/...` endpoints to perform CRUD operations.
   - Real-time previews sync with the editor using a LocalStorage-backed React hook (`useSyncExternalStore`) to allow drafts without saving.

## Key abstractions
- **`FormSettings`** (`src/lib/forms.ts`): Holds the structural settings of a form, including workflow type, branching rules, page pagination, and quiz scoring requirements.
- **`FormField`** (`src/lib/forms.ts`): The union type defining short text, long text, select/radio options, Likert scale questions, and signature pad inputs.
- **`validateFormSubmission`** (`src/lib/forms.ts`): Form validation engine that checks types, required fields, custom constraints, and unique fields.
- **`createPublicFormSubmission`** (`src/lib/forms.ts`): The core database transaction helper executing submissions storage and queueing.
- **`getAdminSession`** (`src/lib/auth.ts`): Middleware helper gating admin APIs and pages against Google OAuth permissions.
- **`prisma`** (`src/lib/prisma.ts`): Global Prisma Client instance wrapper with connection pooling configuration.

## Directory structure rationale
- `src/app/`: Next.js App Router files containing pages, layouts, and route API handlers.
- `src/components/`: Reusable React components divided into Admin (for builder and dashboards) and Public (form rendering and signatures) layers.
- `src/lib/`: Core backend and domain helpers covering authentication, validation, forms CRUD, and rate-limiting.
- `prisma/`: Prisma Schema definition and raw SQL migration files for custom builder database tables.
- `scripts/`: Operational scripts including the submission background worker daemon.
- `load-tests/`: Performance benchmark script configuration using k6.
