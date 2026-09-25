<!-- generated-by: gsd-doc-writer -->
# Core Libraries & Helpers Reference

This document covers the core business logic, utility, and infrastructure modules located under `src/lib/`.

## Overview

The backend processing, database abstraction, validation engine, and administrative authentication rules of Isian are consolidated in `src/lib/`. These modules are written as pure TypeScript and Node/Prisma handlers, decoupled from specific React rendering layouts.

## Module listing

| Module | File Path | Description |
|---|---|---|
| `forms` | `src/lib/forms.ts` | The core domain engine of Isian. Manages form schemas, custom raw SQL tables, validation rules, scoring, and Excel workbook compilation. |
| `auth` | `src/lib/auth.ts` | Configures the NextAuth provider options using Google Client ID, email whitelist checks, and session extraction. |
| `prisma` | `src/lib/prisma.ts` | Instantiates the Prisma client with robust connection pooling limits for concurrent production requests. |
| `rate-limit` | `src/lib/rate-limit.ts` | Sliding-window in-memory rate limiter protecting public routes from spam submissions. |
| `env` | `src/lib/env.ts` | Helpers to safely extract and parse required environment variables and list formats. |
| `admin-form-preview` | `src/lib/admin-form-preview.ts` | Synchronization bridge coordinating unsaved builder states with preview browser tabs. |
| `admin-display` | `src/lib/admin-display.ts` | Small helper utilities formatting date objects and UI strings in administrative tables. |
| `health` | `src/lib/health.ts` | Small helper checking database connectivity for health status audits. |

## Key interfaces or APIs

### 1. `validateFormSubmission(form, payload)`
Validates that client answers match the form field rules, character lengths, and types:
```typescript
export function validateFormSubmission(
  form: PublicFormDefinition,
  payload: Record<string, unknown>
): Record<string, string> // Returns field-to-error map, empty if valid
```

### 2. `createPublicFormSubmission(slug, payload)`
Processes and stores submissions. Automatically computes quiz scores if in quiz mode, enqueues deferred background jobs, and returns references:
```typescript
export async function createPublicFormSubmission(
  slug: string,
  payload: Record<string, unknown>
): Promise<PublicSubmissionResult>
```

### 3. `getAdminSession()`
Authenticates and authorization-gates admin pages and endpoints:
```typescript
export async function getAdminSession(): Promise<Session | null>
```

## Usage examples

### Programmatic Submission and Validation
Typical API route handler utilizing form helpers:
```typescript
import { validateFormSubmission, createPublicFormSubmission, FormSubmissionError } from '@/lib/forms'

export async function POST(request: Request, { params }: { params: { slug: string } }) {
  const form = await getPublicFormBySlug(params.slug)
  const body = await request.json()

  // 1. Validate inputs
  const errors = validateFormSubmission(form, body)
  if (Object.keys(errors).length > 0) {
    return Response.json({ errors }, { status: 400 })
  }

  // 2. Submit
  try {
    const result = await createPublicFormSubmission(params.slug, body)
    return Response.json(result, { status: 201 })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
```
