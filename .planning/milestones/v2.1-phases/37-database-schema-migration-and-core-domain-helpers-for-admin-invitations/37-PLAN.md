# Phase 37 Plan: Database Schema, Migration & Core Domain Helpers for Admin Invitations

## Purpose
Define and deploy the database schema for admin users and invitations, and implement the core lifecycle domain logic in `src/lib/admin-invitations.ts` with automated unit tests.

## Tasks

### Task 1: Prisma Schema & SQL Migration
- **Files**: `prisma/schema.prisma`, `prisma/migrations/20260928000000_add_admin_invitations/migration.sql`
- **Actions**:
  - Add enums `AdminRole` (`SUPERADMIN`, `ADMIN`) and `InvitationStatus` (`PENDING`, `ACCEPTED`, `REVOKED`, `EXPIRED`).
  - Add models `AdminUser` (mapped to `admin_users`) and `AdminInvitation` (mapped to `admin_invitations`).
  - Write SQL migration with foreign key relations, unique constraints, and indexes.
  - Apply migration via Prisma and update generated client.

### Task 2: Domain Helpers Implementation
- **File**: `src/lib/admin-invitations.ts`
- **Actions**:
  - `generateInvitationToken()`: 64-char crypto hex string.
  - `createAdminInvitation(params)`: Create invitation with 48-hour expiration.
  - `getAdminInvitationByToken(token)`: Fetch and evaluate active/expired status.
  - `acceptAdminInvitation(token, user)`: Claim token, verify email match, create/update `AdminUser`.
  - `listAdminUsers()` & `listAdminInvitations()`: Retrieve team members and pending/past invites.
  - `revokeAdminInvitation(id)`: Revoke a pending invite.
  - `revokeAdminUser(id, requesterEmail)`: Deactivate an admin user with superadmin protection.
  - `isSuperAdminEmail(email)`: Helper checking `ADMIN_EMAILS` environment variable.

### Task 3: Unit Testing & Verification
- **File**: `src/lib/admin-invitations.test.ts`
- **Actions**:
  - Write comprehensive tests covering token generation, expiration math, email normalization, acceptance logic, and revocation safeguards.
  - Run `npm test` and verify 100% pass rate.

## Verification Criteria
- [ ] Prisma compiles schema without errors (`npx prisma generate`).
- [ ] SQL migration creates `admin_users` and `admin_invitations` tables.
- [ ] All new unit tests pass in Vitest.
