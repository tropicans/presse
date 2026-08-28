# Testing Patterns

**Analysis Date:** 2026-08-28

## Test Framework

**Runner:**
- Vitest ^4.1.5
- Configuration: `vitest.config.ts` in project root

**Assertion Library:**
- Vitest built-in assertions (`expect`)
- Common matchers: `toBe`, `toEqual`, `toThrow`, `rejects.toThrow`, `toHaveBeenCalledWith`, `toBeTruthy`

**Run Commands:**
```bash
npm run test                          # Run all unit/integration tests with Vitest
npm run test:watch                    # Interactive watch mode
npx vitest run src/lib/forms.test.ts  # Run a specific test suite
npm run load:test:public              # Run public form journey k6 load test
```

## Test File Organization

**Location:**
- Collocated directly alongside the corresponding implementation files under `src/lib/` and `src/app/`.

**Naming:**
- Named with `*.test.ts` pattern.

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
Tests use BDD style `describe` and `it` blocks:
```typescript
import { describe, expect, it, vi } from 'vitest'

describe('forms domain logic', () => {
  describe('validateFormSubmission', () => {
    it('should validate required fields and return formatted answers', () => {
      const form = buildFormFixture()
      const rawAnswers = { nama: 'Budi Santoso' }
      
      const result = validateFormSubmission(form, rawAnswers)
      expect(result.isValid).toBe(true)
    })
  })
})
```

**Patterns:**
- Isolate external dependencies using `vi.mock()` at the top level of test files.
- Reset mock call counters and in-memory caches between test cases using `beforeEach`.

## Mocking

**Framework:**
- Vitest `vi` mock utilities.

**Common Mock Patterns:**
```typescript
// Mock Next.js cache revalidation
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}))

// Mock Prisma Client methods
vi.mock('@/lib/prisma', () => ({
  prisma: {
    $queryRaw: vi.fn().mockResolvedValue([]),
    $executeRaw: vi.fn().mockResolvedValue(1),
    formAiAnalysis: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}))
```

**What to Mock:**
- Next.js server runtime features (`next/cache`, `next/headers`).
- Database client and transaction handles (`@/lib/prisma`).
- External HTTP endpoints (e.g. LLM completion APIs).

**What NOT to Mock:**
- Pure domain business rules (e.g. form validation logic, score thresholds, answer formatting, branching decision graphs).

## Fixtures and Factories

**Test Data:**
Inline factory builder functions create reproducible test objects:
```typescript
function buildTestFormDefinition(overrides = {}): PublicFormDefinition {
  return {
    id: 'form_test_1',
    slug: 'kuis-kepegawaian',
    title: 'Kuis Evaluasi',
    mode: 'QUIZ',
    fields: [
      { id: 'f1', name: 'q1', label: 'Soal 1', type: 'radio', required: true }
    ],
    ...overrides,
  }
}
```

## Coverage & Test Types

**Unit & Integration Tests:**
- Validate helper logic, environment variable parsing, rate limiting, form validation, branching calculations, score evaluation, and AI data aggregation.
- Executed via `npm run test`.

**Performance & Load Tests:**
- k6 scripts located in `load-tests/`.
- Simulates realistic user journeys (form landing, fetching definitions, form submission with simulated latency).
- Run via: `npm run load:test:public` (configurable via `BASE_URL`, `FORM_SLUG`, `K6_VUS`, `K6_MAX_DURATION`).

---

*Testing analysis: 2026-08-28*
