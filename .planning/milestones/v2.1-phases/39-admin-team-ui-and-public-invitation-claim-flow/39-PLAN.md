# Phase 39 Plan: Admin Team UI & Public Invitation Claim Flow

## Purpose
Build the visual interfaces for managing team members and invitations as a Superadmin (`/admin/users`) and claiming invitations as an invitee (`/admin/invite`).

## Tasks

### Task 1: Superadmin Team Management Dashboard Component & Page
- **Files**:
  - `src/app/admin/users/page.tsx`: Server component gating on `getAdminSession()` and `session.user.isSuperAdmin`.
  - `src/components/AdminUsersManagement.tsx`: Client component providing:
    - Top summary metrics (Total Admin, Undangan Tertunda, Superadmin Utama).
    - Invite creation section with email input, role dropdown, "Buat Tautan Undangan" button.
    - Generated invitation modal/dialog with 1-click "Salin Link Undangan" and direct share instructions.
    - Two tables / tabs: "Anggota Aktif" and "Undangan Tertunda (Pending)".
    - Actions to revoke invitations and deactivate users with confirmation prompts.
    - Toast feedback for operations (success / error).

### Task 2: Admin Sidebar Navigation Integration
- **Files**: `src/components/AdminFormsList.tsx`, `src/components/AdminTable.tsx`
- **Actions**:
  - Add "Pengguna / Tim" link in the sidebar navigation pointing to `/admin/users` (styled consistent with other sidebar links).

### Task 3: Public Invitation Claim Page
- **File**: `src/app/admin/invite/page.tsx`
- **Actions**:
  - Server-rendered page inspecting `searchParams.token`.
  - Checks token validity via domain helper.
  - If invalid / expired: renders clear, polite error card with back-to-login link.
  - If valid: renders invitation card showing invited email, role, remaining validity hours, and "Terima Undangan & Masuk dengan Google" button initiating NextAuth sign-in.

### Task 4: Unit Testing & Verification
- **Files**: `src/components/AdminUsersManagement.test.tsx` (or tests for claim flow)
- **Actions**:
  - Run full test suite, lint, and tsc to verify zero regressions.

## Verification Criteria
- [ ] `/admin/users` is accessible to Superadmin and redirects non-superadmins.
- [ ] Generating an invitation yields a working URL with 1-click copy.
- [ ] Active and pending tables render accurately with badges and revoke actions.
- [ ] `/admin/invite?token=...` displays invitation info and enables Google login.
- [ ] All automated tests pass with 0 lint/tsc errors.
