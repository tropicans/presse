# Coding Conventions

**Analysis Date:** 2026-08-28

## Naming Patterns

**Files:**
- `PascalCase.tsx` for React components (e.g. `AdminFormsList.tsx`, `AttendanceForm.tsx`).
- `kebab-case.ts` for helper/library files (e.g. `rate-limit.ts`, `admin-display.ts`).
- `*.test.ts` for unit/integration tests collocated alongside code (e.g. `forms.test.ts`).
- Next.js App Router files use standard convention: `page.tsx`, `layout.tsx`, `route.ts`.

**Functions:**
- `camelCase` for functions (e.g. `validateFormSubmission`, `isAdminEmail`, `getAdminSession`).
- Async functions return `Promise<T>` with standard async/await syntax.
- Component event handlers use `handle[Event]` prefix (e.g. `handleSubmit`, `handleSignatureClear`, `handleFieldChange`).

**Variables & Constants:**
- `camelCase` for local variables and parameters (e.g. `nextAuthSecret`, `safeBatchSize`, `activePage`).
- `UPPER_SNAKE_CASE` for module-level constants (e.g. `MAX_TEXT_LENGTH`, `MAX_SIGNATURE_LENGTH`, `DEFAULT_PAGE_SIZE`).
- No private variable underscore prefixes (avoid `_var`).

**Types & Interfaces:**
- `PascalCase` for Interfaces and Types (e.g. `FormSettings`, `PublicSubmissionResult`, `AggregatedData`). No Hungarian notation prefixes (`IFormSettings` is discouraged).
- `PascalCase` for enum types, `UPPER_SNAKE_CASE` for values (e.g. `FormStatus.DRAFT`, `FormMode.QUIZ`).

## Code Style

**Formatting:**
- **Indentation:** 2 spaces.
- **Semicolons:** Omitted (no trailing semicolons).
- **Quotes:** Single quotes for string literals (`'use client'`, `'next/cache'`), unless double quotes or template literals are syntactically needed.
- **Trailing Commas:** Multi-line objects and arrays use trailing commas.

**Linting & Typechecking:**
- ESLint Flat Config (`eslint.config.mjs`) extending Next.js core web vitals and TypeScript rules.
- Run typecheck and lint via:
  ```bash
  npm run lint
  npx tsc --noEmit --pretty false
  ```

## Import Organization

**Order & Grouping:**
1. React core hooks and imports (`import { useState, useEffect } from 'react'`)
2. Next.js modules (`import { NextResponse } from 'next/server'`, `'next/cache'`)
3. External npm packages (`@prisma/client`, `exceljs`, `next-auth`)
4. Internal path alias imports (`@/lib/prisma`, `@/components/ThemeToggle`)
5. Relative local imports (`./SignaturePad`)

Separate import groups with empty lines and keep imports sorted logically.

## Error Handling

**Patterns:**
- Throw domain errors in business logic modules (e.g. `FormSubmissionError` in `src/lib/forms.ts`).
- Catch errors at the route boundary (`src/app/api/**/route.ts`) and translate to clear HTTP status codes (400 for bad input, 401 for unauthorized, 429 for rate limited, 500 for internal errors).
- Use explicit try/catch blocks when handling database transactions, file operations, or external LLM API calls.

## Logging

**Framework:**
- Native `console.log` and `console.error` with clear module identifiers.
- Example: `console.error('[submission-worker]', error)`.

## Module Design

**Exports:**
- Named exports are standard for libraries, utilities, classes, and helper functions (`export function rateLimit(...)`).
- Default exports are strictly reserved for Next.js App Router entry points (pages, layouts, route handlers) and React components.

---

*Convention analysis: 2026-08-28*
