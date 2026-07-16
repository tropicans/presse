# Testing Patterns

**Analysis Date:** 2026-07-16

## Test Framework

**Runner:**
- Vitest ^4.1.5
- Configuration: `vitest.config.ts` in the project root.

**Assertion Library:**
- Vitest built-in assertions (`expect`).
- Matchers: `toBe`, `toEqual`, `toThrow`, `rejects.toThrow`, `toHaveBeenCalledWith`.

**Run Commands:**
```bash
npm run test                          # Run all tests (executes 'vitest run')
npm run test:watch                    # Watch mode for interactive testing
npx vitest run src/lib/forms.test.ts  # Run a specific test file
```

## Test File Organization

**Location:**
- Collocated directly alongside source files in the codebase (e.g., in `src/lib/`).

**Naming:**
- Named with `*.test.ts` pattern.

**Structure:**
```
src/
  lib/
    forms.ts
    forms.test.ts
    rate-limit.ts
    rate-limit.test.ts
```

## Test Structure

**Suite Organization:**
Tests use the standard BDD style with `describe` and `it` blocks:
```typescript
import { describe, expect, it, vi } from 'vitest'

describe('ModuleName', () => {
  describe('functionUnderTest', () => {
    it('should behave correctly under specific condition', () => {
      // arrange
      const input = ...
      
      // act
      const result = functionUnderTest(input)
      
      // assert
      expect(result).toBe(expected)
    })
  })
})
```

**Patterns:**
- Mock modules at the top of the test file using `vi.mock()`.
- Colocate helper factory functions directly in the test file where they are needed.

## Mocking

**Framework:**
- Vitest built-in `vi` utility.

**Patterns:**
Mocks are often used to stub next/cache or database layers:
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
  }
}))
```

**What to Mock:**
- Caching (`revalidatePath`).
- Database client and transaction pools.
- External API calls (like OpenAI completions).
- Current timestamp if date/time calculations are tested.

**What NOT to Mock:**
- Pure validation routines.
- In-memory algorithms.

## Fixtures and Factories

**Test Data:**
Inline factory builders are declared directly within test files to return standardized mock data with customizable overrides:
```typescript
function buildForm(): PublicFormDefinition {
  return {
    id: 'form_1',
    slug: 'test-form',
    title: 'Test Form',
    fields: [
      { id: 'name', name: 'name', label: 'Nama', type: 'text', required: true }
    ],
    settings: { workflow: 'STANDARD' }
  }
}
```

## Coverage

**Requirements:**
- No strict coverage gates. Coverage is run ad-hoc to ensure business pathways are covered.

## Test Types

**Unit/Integration Tests:**
- Validate library helper logic, validation patterns, error handling, rate limiting, and quiz calculations.
- Executed instantly using Vitest in memory.

**Load Tests:**
- Located in `load-tests/`.
- Written in JavaScript and executed via `k6` to test `/f/[slug]` endpoints and submission scaling.
- Configured via environment variables (`BASE_URL`, `FORM_SLUG`, etc.) and run via: `npm run load:test:public`.

---

*Testing analysis: 2026-07-16*
*Update when test patterns change*
