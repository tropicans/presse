# Coding Conventions

**Analysis Date:** 2026-07-16

## Naming Patterns

**Files:**
- `PascalCase.tsx` for React components (e.g., `AdminFormsList.tsx`).
- `kebab-case.ts` for helper/library files (e.g., `rate-limit.ts`).
- `*.test.ts` for tests collocated with the code (e.g., `forms.test.ts` collocated in `src/lib/`).
- App router files are named standard `page.tsx`, `layout.tsx`, `route.ts`.

**Functions:**
- `camelCase` for functions (e.g., `validateFormSubmission`, `isAdminEmail`).
- No specific prefix/suffix for async functions (they return `Promise<T>`).
- Component event handlers use `handle[Event]` naming convention (e.g., `handleSubmit`, `handleSignatureClear`).

**Variables:**
- `camelCase` for standard variables (e.g., `nextAuthSecret`, `safeBatchSize`).
- `UPPER_SNAKE_CASE` for global or module-level constants (e.g., `MAX_TEXT_LENGTH`, `ATTENDANCE_FORM_SLUG`).
- Avoid prefixing private attributes/methods (e.g., do not use `_myPrivateVariable`).

**Types:**
- `PascalCase` for Interfaces and Types (e.g., `FormSettings`, `PublicSubmissionResult`), with no Hungarian prefix (do not use `IFormSettings`).
- `PascalCase` for enum names, `UPPER_CASE` for values (e.g., `FormStatus.DRAFT`, `FormMode.QUIZ`).

## Code Style

**Formatting:**
- **Indentation:** 2 spaces.
- **Semicolons:** Omitted (do not write semicolons at the end of statements).
- **Quotes:** Single quotes for string literals (`'use client'`, `'next/cache'`), unless double quotes or backticks are syntactically required.
- **Trailing commas:** Used wherever possible for clean git diffs.

**Linting:**
- Configured using Flat Config in `eslint.config.mjs`.
- Rules extend Next.js core web vitals and typescript presets.
- Run typechecking and linting checks via `npm run lint` and `npx tsc --noEmit`.

## Import Organization

**Order:**
1. React core hooks and React-specific imports.
2. Next.js modules and frameworks.
3. External npm packages (e.g., `@prisma/client`, `exceljs`).
4. Path alias imports matching `@/*` (e.g., `@/lib/prisma`, `@/components/ThemeToggle`).
5. Relative imports (e.g., `./SignaturePad`).

**Grouping:**
- Keep clear separations with empty lines between groups.
- Sort imports alphabetically within each group.

## Error Handling

**Patterns:**
- Throw exceptions in library modules (like `FormSubmissionError` in `src/lib/forms.ts`) and catch them at the API/Route boundary to convert them to HTTP error status codes.
- Use explicit try/catch blocks for async actions and operations dealing with external APIs or DB queries.

**Error Types:**
- Extend the native JavaScript `Error` class to create domain-specific classes.

## Logging

**Framework:**
- Native `console.log` and `console.error` are utilized for outputting server/worker states.
- Log error contents along with trace details in catch statements (e.g., `console.error('[submission-worker]', error)`).

## Module Design

**Exports:**
- Named exports are preferred for utilities, classes, and helper libraries.
- Default exports are strictly reserved for Next.js router items (pages, layouts, templates) and components.

---

*Convention analysis: 2026-07-16*
*Update when patterns change*
