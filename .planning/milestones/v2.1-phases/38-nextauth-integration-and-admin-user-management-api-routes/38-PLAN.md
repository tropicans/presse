# Phase 38 Plan: NextAuth Integration & Admin User Management API Routes

## Purpose
Integrate NextAuth with dynamic authorization and role enrichment, implement Superadmin-protected APIs for team management, and expose public token verification.

## Tasks

### Task 1: NextAuth Configuration Update & Types
- **Files**: `src/lib/auth.ts`, `src/types/next-auth.d.ts` (if needed)
- **Actions**:
  - Update `signIn` callback to check `getEffectiveAdminUser` or auto-claim active pending invites.
  - Update `session` callback to attach `role` and `isSuperAdmin`.
  - Provide typed extensions for `Session['user']`.

### Task 2: Protected Admin User Management API Routes
- **Files**:
  - `src/app/api/admin/users/route.ts` (GET team list)
  - `src/app/api/admin/users/invite/route.ts` (POST create invitation)
  - `src/app/api/admin/users/revoke/route.ts` (POST revoke invite or deactivate user)
- **Actions**:
  - Gate all endpoints with `getAdminSession()` and verify `session.user.isSuperAdmin === true`.
  - Validate request payload bodies with proper error statuses.
  - Return clean JSON payloads with appropriate HTTP status codes (200, 400, 401, 403, 500).

### Task 3: Public Invitation Verification Route
- **File**: `src/app/api/public/invite/verify/route.ts`
- **Actions**:
  - Accept `?token=...` query parameter.
  - Return validation status, masked/clear invited email, role, and expiration date.

### Task 4: Automated Testing & Verification
- **File**: `src/app/api/admin/users/users-api.test.ts` (or similar unit/integration tests)
- **Actions**:
  - Test authorization gates (superadmin vs regular admin).
  - Test input validation and lifecycle endpoints.
  - Run full test suite (`npm test`), lint, and tsc.

## Verification Criteria
- [ ] NextAuth properly grants access to superadmins and invited admins.
- [ ] Admin management APIs reject unauthorized callers with 403.
- [ ] Public verify endpoint correctly validates valid vs expired vs missing tokens.
- [ ] 100% test pass rate with 0 TypeScript/ESLint errors.
