---
slug: 20260928-align-admin-login-global-design
status: complete
date: 2026-09-28
---

# Quick Task Summary: Align Admin Login with v2.0 Global Editorial Design System

## What Was Done
1. **Redesigned Admin Login UI (`src/app/admin/login/page.tsx`)**:
   - Replaced legacy `entry-suite` layout, gradients, and bloated 34px bubbles with a clean architectural card layout (`admin-login-layout`, `admin-login-card`).
   - Unified typography: `Playfair Display` for title, `Inter` for copy, `JetBrains Mono` for system badges (`[ PORTAL ADMIN ]`, `Google OAuth 2.0`, `Restriksi Allowlist`, `Sesi Terenkripsi`).
   - Added an architectural error alert container for `AccessDenied` with clear instructions regarding `ADMIN_EMAILS`.
   - Designed a high-contrast, fully-styled Google Sign-In button (`admin-login-google-btn`) with smooth hover inversion, active states, loading spinner, and dark/light mode support.
2. **Updated CSS in `src/app/globals.css`**:
   - Implemented `.admin-login-*` styles honoring the v2.0 tokens (`--bg-surface`, `--border-default`, `--text-primary`, `--radius-lg`, `--space-*`).
   - Provided full dark mode parity (`html[data-theme='dark'] .admin-login-*`).
   - Retained legacy alias classes for backwards compatibility.
3. **Aligned Production Configuration (`.env.production`)**:
   - Updated `NEXTAUTH_URL` from `http://localhost:3456` to `https://form.ppkasn.id` to fix the Google OAuth `redirect_uri_mismatch` error.
4. **Validation & Deployment**:
   - Added unit test in `src/app/globals.test.ts` (all 71 unit/integration tests passed).
   - ESLint and `tsc` passed with 0 errors.
   - Rebuilt Docker image `isian-runtime:local` and recreated `app` & `worker` containers.
   - Verified health endpoint (`/api/health` -> `status: ok`) and login route (`/admin/login` -> HTTP 200).
