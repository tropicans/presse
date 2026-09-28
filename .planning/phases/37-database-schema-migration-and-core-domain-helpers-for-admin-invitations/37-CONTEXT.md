# Phase 37 Context: Database Schema, Migration & Core Domain Helpers for Admin Invitations

## Context & Objectives
Phase 37 is the foundational data and domain layer for Milestone v2.1 ("Admin Invitation System & Google OAuth Access Delegation"). It establishes PostgreSQL tables, Prisma models, cryptographic invitation token management with 48-hour TTL, and domain helpers for querying, creating, accepting, and revoking administrative access.

## Requirements Covered
- **INVITE-01**: Admin Users & Invitations Schema Migration (`admin_users`, `admin_invitations`, enums `AdminRole` & `InvitationStatus`).
- **INVITE-03**: Invitation Token Lifecycle Engine (`src/lib/admin-invitations.ts`) with expiration check, atomic state transitions, and safe privilege validation.

## Decisions Locked (Recommended from Discussion)
1. **Roles Hierarchy**:
   - `SUPERADMIN`: Derived from `ADMIN_EMAILS` env variable (e.g. `tropicans@gmail.com`). Has root privileges to invite, view team, and revoke access.
   - `ADMIN`: Regular admin invited via token. Has permission to manage forms, view/export submissions, and inspect analytics. Cannot manage users.
2. **Invitation Expiry (TTL)**:
   - 48 hours (2 days) from creation timestamp. Tokens accessed after `expiresAt` automatically transition to or evaluate as `EXPIRED`.
3. **Token Mechanics**:
   - Cryptographically secure 64-character hex token (`crypto.randomBytes(32).toString('hex')`).
   - Token is single-use: upon acceptance, status becomes `ACCEPTED` and `acceptedAt` is recorded.
4. **Email Binding Security**:
   - An invitation is designated for a specific target email (case-insensitive).
   - Only the Google account matching the target email can claim the token.
5. **Superadmin Protection**:
   - Superadmin accounts cannot be revoked or deleted via database helpers.
