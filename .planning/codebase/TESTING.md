# Testing Patterns

**Analysis Date:** 2026-09-25

## Test Framework

**Runner:**
- Vitest 4.1.5
- Configuration: `vitest.config.ts` (configured with `environment: 'node'` and `@/*` alias)

**Assertion Library:**
- Vitest standard assertions (`expect`, `describe`, `it`, `beforeEach`, `vi`)

**Run Commands:**
```bash
npm test                 # Run all unit/integration tests with Vitest once
npm run test:watch       # Run Vitest in interactive watch mode
npm run load:test:public # Run k6 load test for public form submission journey
```

## Test File Organization

**Location:**
- Co-located directly alongside source code files under `src/lib/` and `src/app/`.

**Naming:**
- Named with `.test.ts` extension matching the module name:
  - `src/lib/forms.test.ts` tests `src/lib/forms.ts`
  - `src/lib/ai-analysis.test.ts` tests `src/lib/ai-analysis.ts`
  - `src/lib/env.test.ts` tests `src/lib/env.ts`
  - `src/lib/rate-limit.test.ts` tests `src/lib/rate-limit.ts`
  - `src/lib/form-delete-utils.test.ts` tests `src/lib/form-delete-utils.ts`
  - `src/app/globals.test.ts` tests CSS / token sanity

**Structure:**
```
src/
├── app/
│   └── globals.test.ts
└── lib/
    ├── ai-analysis.test.ts
    ├── env.test.ts
    ├── form-delete-utils.test.ts
    ├── forms.test.ts
    └── rate-limit.test.ts
```

## Test Structure

**Suite Organization:**
```typescript
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { validateFormSubmission, FormSubmissionError } from './forms'

describe('forms domain', () => {
  describe('validateFormSubmission', () => {
    it('throws error when a required field is missing', () => {
      const mockForm = {
        id: 'form-1',
        fields: [{ id: 'f1', label: 'Nama', type: 'text', required: true }],
      }

      expect(() => validateFormSubmission(mockForm as any, {}))
        .toThrow(FormSubmissionError)
    })
  })
})
```

**Patterns:**
- Use nested `describe` blocks to group by function/feature.
- Use explicit AAA pattern (Arrange, Act, Assert).
- Reset state in `beforeEach` when testing modules with stateful stores (e.g. rate limiter).

## Mocking

**Framework:**
- Vitest built-in `vi` mocking tools (`vi.mock`, `vi.fn`, `vi.spyOn`).

**Patterns:**
- Mocking Next.js cache APIs:
  ```typescript
  vi.mock('next/cache', () => ({
    revalidatePath: vi.fn(),
  }))
  ```
- Mocking Prisma Client and raw SQL methods:
  ```typescript
  vi.mock('@/lib/prisma', () => ({
    prisma: {
      $queryRaw: vi.fn().mockImplementation(async (strings: TemplateStringsArray) => {
        const sql = strings.join('?')
        if (sql.includes('FROM forms')) {
          return [{ id: 'form_123', slug: 'test-form', status: 'DRAFT' }]
        }
        return []
      }),
      $executeRaw: vi.fn().mockResolvedValue(1),
    },
  }))
  ```
- Mocking Global `fetch` for external APIs (e.g. LLM endpoints):
  ```typescript
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      choices: [{ message: { content: 'Hasil analisis...' } }],
    }),
  } as Response)
  ```

**What to Mock:**
- Next.js internal server functions (`next/cache`, `next/navigation`).
- External HTTP endpoints (Google OAuth token validation, OpenAI LLM endpoints).
- Database calls when running fast unit tests.

**What NOT to Mock:**
- Pure domain algorithms (scoring formulas, branching route logic, data pre-aggregation).
- Validation and schema parsing functions.

## Fixtures and Factories

**Test Data:**
- Collocated inline factories for lightweight test mock objects:
  ```typescript
  function createMockForm(overrides = {}): PublicFormDefinition {
    return {
      id: 'mock-form-1',
      slug: 'mock-slug',
      title: 'Mock Form Title',
      mode: 'STANDARD',
      workflow: 'STANDARD',
      fields: [],
      pages: [],
      conditionalRoutes: [],
      ...overrides,
    }
  }
  ```

## Coverage

**Requirements:**
- No strict threshold is enforced in CI yet; aim for high test coverage on critical form validation, branching, scoring, and authentication gating.

**View Coverage:**
```bash
npx vitest run --coverage
```

## Test Types

**Unit Tests:**
- Test isolated business logic in `src/lib/`:
  - Form field submission validation and sanitization.
  - Likert scale and quiz score calculations.
  - Environment variable schema verification.
  - In-memory rate limiting counter math and reset windows.

**Integration Tests:**
- Test end-to-end flows with mocked DB clients:
  - Form update and revalidation pipelines.
  - AI analysis report generation and persistence logic.

**Load & Performance Tests:**
- Written in k6 (`load-tests/public-form-journey.k6.js`).
- Tests public form fetch, page loading, and submission throughput under load.
- Configurable via environment variables (`BASE_URL`, `K6_VUS`, `SUBMIT_FORM`, `UNIQUE_IPS`).

---

*Testing analysis: 2026-09-25*
