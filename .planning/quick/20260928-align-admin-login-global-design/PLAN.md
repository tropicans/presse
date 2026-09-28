# Quick Task: Align Admin Login with v2.0 Global Editorial Design System

## Goal
Overhaul the `/admin/login` page and its associated CSS to strictly conform to the HIMPUN v2.0 "Editorial Minimalist Monochrome (Architectural Luxury & Print Precision)" design system:
1. Replace legacy `entry-suite` teal/blue gradients and 34px bubbles with clean architectural card layout (`admin-login-shell`, `admin-login-card`).
2. Integrate proper typography hierarchy: Playfair Display for title (`Masuk ke Admin`), Inter for copy, JetBrains Mono for system badges/labels.
3. Implement a premium, high-contrast Google Sign-In button with proper layout, hover inversion, loading state, and dark/light mode support.
4. Provide structured editorial alert boxes for `AccessDenied` state.
5. Ensure 100% theme parity between dark mode (default) and light mode.
6. Run full pre-flight validation and rebuild Docker container according to protocol.

## Proposed Changes
- `src/app/admin/login/page.tsx`: Restructure markup with clean semantic classes.
- `src/app/globals.css`: Add comprehensive styling for `.admin-login-*` and `.google-signin-btn`.
- Pre-flight tests and container rebuild.
