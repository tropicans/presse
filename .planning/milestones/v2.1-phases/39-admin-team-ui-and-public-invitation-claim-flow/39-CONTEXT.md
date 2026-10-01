# Phase 39 Context: Admin Team UI & Public Invitation Claim Flow

## Context & Objectives
Phase 39 develops the complete front-end user experience for Milestone v2.1. It introduces the Superadmin Team Management Dashboard at `/admin/users` (with invite modal/panel, 1-click copyable invite links, active team members table, and access revocation) and the public invitation landing experience at `/admin/invite?token=...` allowing invited users to claim their access via Google OAuth.

## Requirements Covered
- **INVITE-06**: Superadmin Team Management Dashboard (`/admin/users`) with team metrics, invite form with copy-to-clipboard, active members list, pending invitations list, revoke triggers, and sidebar navigation link for Superadmins.
- **INVITE-07**: Public Invitation Acceptance Landing Page (`/admin/invite`) with token validation, target email presentation, remaining expiry countdown, and "Terima Undangan & Masuk dengan Google" CTA.

## Design Aesthetic Alignment
- Follows the established **Editorial Minimalist Monochrome & Architectural Density** standards:
  - Google Fonts: `Inter` for controls, labels, buttons, tables; `Playfair Display` for primary display headers; `JetBrains Mono` for tokens, dates, and badges.
  - Sizing & Spacing: 36px/40px inputs and buttons, 4px/6px border-radius, hairline borders (`#272C35` in dark mode, `#E5E7EB` in light mode).
  - High-contrast visual feedback: instant toast notification upon copying invite link, clear confirmation modal for revocation.
