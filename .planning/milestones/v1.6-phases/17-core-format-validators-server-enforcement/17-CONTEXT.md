# Phase 17 Context: Core Format Validators & Server-Side Enforcement

## Overview
Phase 17 establishes pure, robust format validators and sanitizers in `src/lib/form-validation.ts` and enforces them on the server within `validateFormSubmission` in `src/lib/forms.ts`. This covers NIP/NRP, Email, Phone/WhatsApp, Full Name, and Signature, ensuring clean and verified records before any database writes.

## Requirements
- **VALID-01**: NIP/NRP Validation (18 digit ASN, 5-8 digit NRP, auto-sanitasi, numeric inputMode)
- **VALID-02**: Email Format Validation (RFC syntax check, auto-trim, descriptive error)
- **VALID-03**: Phone / WhatsApp Number Validation (format sanitization, numeric digits 10-15, tel inputMode)
- **VALID-04**: Full Name Validation (min 2 characters, clean extra whitespace, reject scripts)
- **VALID-05**: Signature Canvas & Typed Signature Validation (canvas stroke threshold, min text length, base64 PNG check)
- **VALID-10**: Unified Server-Side Validation Pipeline (`validateFormSubmission` format and length verification)

## Locked Implementation Decisions (Recommended)

1. **Pure Validation Module Extension (`src/lib/form-validation.ts`):**
   - Keep `src/lib/form-validation.ts` 100% free of Node/database imports (`pg`, `prisma`) so both Client Components and API routes can import freely.
   - Provide field detectors:
     - `isNipNrpField(field)`: checks `nipNrp` or label `'nip'`, `'nrp'`, `'nip/nrp'`.
     - `isEmailField(field)`: checks `field.name === 'email'` or label matching `/email|surel/i`.
     - `isPhoneField(field)`: checks `field.name` or label matching `/telepon|telp|whatsapp|no\s*hp|phone|kontak/i`.
     - `isNameField(field)`: checks `field.name === 'namaLengkap'` or label matching `/nama\s*lengkap|nama\s*peserta/i`.
   - Provide sanitizers & validators:
     - **Email:** `sanitizeEmail(value)` trims whitespace and lowercases; `validateEmail(value)` checks standard regex `/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/`.
     - **Phone/WhatsApp:** `sanitizePhoneNumber(value)` normalizes `+62` / `62` to `0` and strips spaces/hyphens; `validatePhoneNumber(value)` enforces 10–15 digits starting with `08` or general phone numbers `^0\d{8,14}$`.
     - **Full Name:** `sanitizeName(value)` collapses double spaces; `validateName(value)` checks length >= 2 and rejects HTML/script tags or symbols `< > { } [ ]`.
     - **Signature:** `validateSignatureValue(value)` ensures valid `data:image/png;base64,...` with minimal length or typed signature text with at least 2 characters.

2. **Server-Side Enforcement (`src/lib/forms.ts`):**
   - In `validateFormSubmission`, execute the appropriate validator and sanitizer based on field type and field identity.
   - Sanitize and store cleaned values into `values[field.name]` so the database always receives normalized data (lowercase emails, clean numeric phone numbers, clean NIP/NRP).
   - Throw `FormSubmissionError(message, 400)` with clear Indonesian error messages.

3. **Re-exporting for Backward Compatibility:**
   - `src/lib/forms.ts` re-exports all validation functions from `./form-validation` so existing server references remain unbroken.
