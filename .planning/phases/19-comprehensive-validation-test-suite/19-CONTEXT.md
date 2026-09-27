# Phase 19 Context: Comprehensive Validation Test Suite & Regression Verification

## Overview

Phase 19 provides end-to-end automated testing, verification, and regression prevention for all form input validation rules implemented in Phase 17 and Phase 18, ensuring complete requirement coverage (`VALID-01` through `VALID-11`).

## Scope & Target Decisions

### 1. Test Layering (Recommended)
- **Unit Layer (`src/lib/form-validation.test.ts` or expanded in `src/lib/forms.test.ts`)**:
  - Test pure validators and sanitizers directly with diverse edge cases (punctuation, whitespace, boundary lengths, script injection).
  - Test helper utilities: `isNipField`, `isPhoneField`, `isEmailField`, `isNameField`, `getFieldFormatHint`, `getFieldInputMode`.
- **Integration Layer in `src/lib/forms.test.ts`**:
  - Test server-side submission validation pipeline (`validateFormSubmission`) with mocked form definitions covering:
    - Valid submission with mixed format fields (auto-sanitization asserted in returned data).
    - Rejections for invalid NIP/NRP (e.g. 10 digits).
    - Rejections for invalid Phone/WhatsApp (e.g. 8 digits or letters).
    - Rejections for invalid Email (e.g. `invalid@domain`).
    - Rejections for invalid Name (e.g. 1 char or `<script>`).
    - Rejections for invalid Signature (e.g. non-PNG data URLs).
- **Regression Verification**:
  - Run full vitest suite.
  - Run `npx tsc --noEmit --pretty false`.
  - Run `npm run lint`.
  - Run `npm run build` (standalone Next.js production build).

## Test Cases Matrix
1. **NIP / NRP**:
   - `198503152010011002` (18 digits) -> Valid
   - `12345` (5 digits, NRP) -> Valid
   - `12345678` (8 digits, NRP) -> Valid
   - `1985 0315 201001 1 002` -> Sanitized & Valid
   - `1234` (< 5 digits) -> Invalid
   - `123456789012` (12 digits, incomplete NIP) -> Invalid
   - `19850315201001100299` (> 18 digits) -> Invalid
2. **Email**:
   - `budi.santoso@instansi.go.id` -> Valid
   - `  user@example.com  ` -> Sanitized & Valid
   - `user@` -> Invalid
   - `@example.com` -> Invalid
   - `user@example` -> Invalid
3. **Phone / WhatsApp**:
   - `+62 812-3456-7890` -> Sanitized to `081234567890` & Valid
   - `6281234567890` -> Sanitized to `081234567890` & Valid
   - `08123456789` (11 digits) -> Valid
   - `08123` (< 10 digits) -> Invalid
   - `0812345678901234` (> 15 digits) -> Invalid
4. **Full Name**:
   - `Dr. Ir. Budi Santoso, M.Kom.` -> Valid
   - `A` (< 2 chars) -> Invalid
   - `<script>alert(1)</script>` -> Invalid
5. **Signature**:
   - `data:image/png;base64,iVBORw0KGgoAAAANSUhEUg...` -> Valid
   - `data:image/jpeg;base64,...` -> Invalid
   - `invalid-string` -> Invalid
