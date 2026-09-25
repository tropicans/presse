# Coding Conventions

**Analysis Date:** 2026-09-25

## Naming Patterns

**Files:**
- React UI components: `PascalCase.tsx` (e.g. `src/components/AdminFormEditor.tsx`, `src/components/AttendanceForm.tsx`).
- Utility & domain library files: `kebab-case.ts` (e.g. `src/lib/rate-limit.ts`, `src/lib/ai-analysis.ts`, `src/lib/form-delete-utils.ts`).
- Tests: `*.test.ts` collocated with the implementation file (e.g. `src/lib/forms.test.ts`, `src/lib/ai-analysis.test.ts`).
- App Router special files: lowercase Next.js conventions (`page.tsx`, `layout.tsx`, `route.ts`).

**Functions:**
- Use `camelCase` for all standard functions and helpers: `validateFormSubmission`, `getAdminSession`, `isAdminEmail`, `preAggregateSubmissions`.
- React component event handlers: `handle[Event]` naming convention (e.g., `handleSubmit`, `handleSignatureClear`, `handleStatusChange`).
- Async functions do not use prefixes/suffixes; they return explicit `Promise<T>`.

**Variables:**
- Local and member variables: `camelCase` (e.g. `workerToken`, `batchSize`, `safeSettings`).
- Global and module-level constants: `UPPER_SNAKE_CASE` (e.g., `MAX_TEXT_LENGTH`, `ATTENDANCE_FORM_SLUG`, `DEFAULT_QUIZ_PASS_PERCENTAGE`).

**Types & Interfaces:**
- `PascalCase` for type aliases and interfaces: `PublicFormDefinition`, `FormSettings`, `SubmissionResult`.
- Avoid Hungarian notation or `I` prefix (do NOT use `IFormSettings` or `TSubmission`).
- Enums: `PascalCase` for enum identifiers, `UPPER_CASE` for member values (`FormStatus.DRAFT`, `FormMode.QUIZ`).

## Code Style

**Formatting:**
- Indentation: 2 spaces.
- Semicolons: Omitted (do not append semicolons to statements, matching existing project style).
- Quotes: Single quotes (`'use client'`, `'next/cache'`) except where double quotes are required syntactically (e.g. in JSON or JSX attributes).
- Trailing commas: Always include trailing commas in multiline objects and arrays for clean git diffs.

**Linting:**
- Tool: ESLint 9 using Flat Config (`eslint.config.mjs`).
- Configurations extended: `eslint-config-next/core-web-vitals`, `eslint-config-next/typescript`.
- Execution: `npm run lint` and `npx tsc --noEmit`.

## Import Organization

**Order:**
1. Node.js built-ins (`import process from 'node:process'`).
2. External npm packages (`import React, { useState } from 'react'`, `import type { NextConfig } from 'next'`).
3. Internal alias imports using `@/*` (`import { prisma } from '@/lib/prisma'`, `import { authOptions } from '@/lib/auth'`).
4. Relative imports (`import { isChoiceField } from './ai-analysis'`).
5. Type-only imports using `import type { ... }`.

**Path Aliases:**
- Configured in `tsconfig.json`:
  ```json
  "paths": {
    "@/*": ["./src/*"]
  }
  ```
- Always use `@/` alias when importing modules across directory boundaries rather than complex relative paths (`../../lib/...`).

## Error Handling

**Patterns:**
- Custom Domain Errors: Extend the native JavaScript `Error` class for domain-specific failures (e.g., `export class FormSubmissionError extends Error` in `src/lib/forms.ts`).
- Route Boundaries: API route handlers wrap operations in `try/catch` blocks and transform known domain errors into informative HTTP status codes (HTTP 400 for validation errors, HTTP 401/403 for authentication/authorization failures, HTTP 404 for missing entities, HTTP 429 for rate limit breaches):
  ```typescript
  try {
    const result = await submitPublicForm(slug, payload)
    return NextResponse.json(result)
  } catch (error) {
    if (error instanceof FormSubmissionError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error('Unhandled submission error:', error)
    return NextResponse.json({ error: 'Terjadi kesalahan sistem' }, { status: 500 })
  }
  ```

## Logging

**Framework:**
- Native `console.log` and `console.error`.

**Patterns:**
- Include a descriptive bracketed prefix to indicate the subsystem or worker context:
  ```typescript
  console.log('[submission-worker] Processed batch of', count, 'jobs')
  console.error('[ai-analysis] LLM request failed:', error)
  ```
- Always log the complete error object/trace in catch blocks for debugging.

## Comments

**When to Comment:**
- Use comments to explain non-obvious architecture rules, concurrency gotchas, or security boundaries (e.g. rate limiter multi-instance caveats in `src/lib/rate-limit.ts`).
- Avoid trivial comments that merely repeat the code.

**JSDoc/TSDoc:**
- Used on public utility interfaces and complex parameter schemas (e.g. `RateLimitConfig`, `PublicFormDefinition`).

## Function Design

**Parameters & Size:**
- Favor small, single-responsibility functions.
- When a function accepts more than 2-3 arguments, use an options object with explicit TypeScript typing (e.g., `listAdminFormSubmissions(formId, filters, pagination)`).

**Return Values:**
- Explicit return types are encouraged for domain services to guarantee strict contract enforcement across routes and components.

## Module Design

**Exports:**
- Named exports are preferred for all domain services, utilities, and helper functions (`export function validateFormSubmission(...)`, `export const prisma = ...`).
- Default exports are strictly reserved for Next.js App Router components (`page.tsx`, `layout.tsx`) and React client views.

**Barrel Files:**
- Not widely used; import directly from specific module paths (`@/lib/forms`, `@/lib/auth`, `@/lib/prisma`) to keep bundle sizes minimal and avoid circular dependencies.

---

*Convention analysis: 2026-09-25*
