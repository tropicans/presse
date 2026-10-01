# Phase 38 Context: NextAuth Integration & Admin User Management API Routes

## Context & Objectives
Phase 38 builds the API layer and authentication integration for Milestone v2.1. It connects NextAuth callbacks with the database-backed admin domain, enriches session objects with role metadata (`SUPERADMIN` vs `ADMIN`), provides Superadmin-only management endpoints (`/api/admin/users`, `/invite`, `/revoke`), and exposes public invitation verification endpoints (`/api/public/invite/verify`).

## Requirements Covered
- **INVITE-02**: NextAuth Dynamic Authorization & Session Enrichment (dynamic `signIn`, `session.user.role`, `session.user.isSuperAdmin`).
- **INVITE-04**: Protected Admin Team & Invitation APIs (`GET /api/admin/users`, `POST /api/admin/users/invite`, `POST /api/admin/users/revoke`).
- **INVITE-05**: Public Invitation Token Verification (`GET /api/public/invite/verify`).

## Decisions & Design
1. **Dynamic `signIn` Callback**:
   - Allows login if user email is superadmin (`ADMIN_EMAILS`) or active admin in `admin_users`.
   - If user has a valid unexpired pending invite in `admin_invitations`, auto-claims the invitation and activates the admin user atomically upon Google Sign-In.
   - Denies sign-in (`return false`) for any unauthorized Google accounts.
2. **Session Role Enrichment**:
   - `session.user.role`: `'SUPERADMIN' | 'ADMIN'`.
   - `session.user.isSuperAdmin`: boolean.
3. **API Access Control**:
   - Team management APIs verify `session.user.isSuperAdmin === true` or return 403 Forbidden.
4. **Public Verification Endpoint**:
   - `/api/public/invite/verify?token=...` safely provides target email, role, and expiration timestamp for rendering the acceptance UI without exposing internal IDs.
