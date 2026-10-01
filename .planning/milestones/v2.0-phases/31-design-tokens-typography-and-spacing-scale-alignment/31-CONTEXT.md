# Phase 31 Context: Design Tokens, Typography & Spacing Scale Alignment

## Context & Objectives
Phase 31 is the foundational design token and typography refactor for Milestone v2.0 ("UI/UX Density & Information Hierarchy Refactor"). It establishes the core visual tokens, replaces oversized and exclusively-serif elements with an ergonomic hybrid typography stack, creates a disciplined 4px/8px-based spacing scale, introduces subtle architectural border radius, and refines the dark theme surface hierarchy.

## Key Requirements & Guidelines
- **DENS-01: Hybrid Typography Stack**:
  - Display / Brand / Major Page Title: `Playfair Display` (Serif, refined to ~32–36px instead of 56px).
  - Component Headings / Sections: ~18–24px.
  - UI Controls / Inputs / Buttons / Labels / Tables / Navigation / Body: `Inter` (Google Fonts sans-serif, ~14–15px body, ~12–13px helper, ~11–12px caption).
  - Metadata / Counts / Codes / Badges: `JetBrains Mono`.
- **DENS-02: Disciplined Spacing Scale**:
  - Consistent scale: 4 / 8 / 12 / 16 / 20 / 24 / 32 / 40 / 48px (`--space-1` to `--space-12`).
  - Elimination of arbitrary padding/margins.
- **DENS-03: Control & Component Sizing**:
  - Input & Select heights: Standard 36–40px, Compact 32px.
  - Button heights: Standard 36–40px, Compact 32px.
  - Badges / Status chips: 24–28px.
  - Sidebar width: ~220–240px (default 230px).
  - Header height: ~56–64px (default 56px).
- **DENS-04: Subtle Architectural Radius & Border De-escalation**:
  - Lift the universal `* { border-radius: 0px !important; }` restriction in favor of subtle modern tokens: `--radius-sm: 4px`, `--radius-md: 6px`, `--radius-lg: 8px`, `--radius-pill: 9999px`.
  - Reduce visual border weight by 40–60%; avoid wrapping every element in hard borders.
- **DENS-05: Dark Theme First with Tonal Surface Hierarchy**:
  - Primary default theme: Dark Mode.
  - Canvas / Background: `#0B0D0E`.
  - Surface (Cards, Panels): `#13161A`.
  - Elevated Surface (Modals, Dropdowns, Hover states): `#1C2026`.
  - Border Default: `#272C35` (subtle, non-jarring).
  - Border Focus: `#FFFFFF` / `#3B82F6` accent subtle.
  - Text Primary: `#F4F4F6`, Text Secondary: `#A1A1AA`, Text Muted: `#71717A`.
  - Dual-theme parity maintained with full Light Mode support.

## Discuss Phase Decisions (User Approved)

### Decision 1: Sans-Serif Font Integration for UI Elements
- **Selected**: Adopt `Inter` (Google Fonts) for all navigation, breadcrumbs, labels, metadata, table headers, buttons, inputs, badges, helper text, and UI controls. Preserve `Playfair Display` for page titles and brand display typography.
- **Rationale**: Solves the "editorial magazine / low density" problem where every button and label felt like a book chapter. Provides crisp, highly scannable, and modern admin UI readability while preserving ISIAN's editorial brand identity.

### Decision 2: Border Radius Strategy
- **Selected**: Apply subtle radius (`4px` small, `6px` medium, `8px` large, `9999px` pills) matching the visual reference screenshots in `new_design/`.
- **Rationale**: Softens the harsh 90-degree brutality of v1.8, creating a fluid, modern, and ergonomic interface aligned with the reference dashboard and form editor mocks.

### Decision 3: Dark Theme First & Tonal Surface Hierarchy
- **Selected**: Dark Mode as default theme with hierarchical tonal surfaces (Canvas `#0B0D0E`, Surface `#13161A`, Elevated `#1C2026`, Border `#272C35`), with full light mode parity maintained.
- **Rationale**: Eliminates the stark pure-black-and-pure-white line wireframe feeling in favor of a luxurious, deep, professional dark UI experience.

### Decision 4: Milestone v2.0 Phasing Plan
- **Selected**: 6 distinct phases:
  1. **Phase 31**: Design Tokens, Typography & Spacing Scale Alignment
  2. **Phase 32**: Shared Components & Global Container Density Refactor
  3. **Phase 33**: Admin Dashboard & Formulir List Density Overhaul
  4. **Phase 34**: Form Editor & Question Card Structure Refactor
  5. **Phase 35**: Responsive, Accessibility & Cross-Screen Refinements
  6. **Phase 36**: Multi-Tier Verification, Visual Regression & Docker Container Up
