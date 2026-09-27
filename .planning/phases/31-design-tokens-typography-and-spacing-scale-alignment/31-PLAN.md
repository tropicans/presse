# Phase 31 Plan: Design Tokens, Typography & Spacing Scale Alignment

## Purpose
Establish the foundational design token system in `src/app/globals.css`, introducing the hybrid typography stack (Inter + Playfair Display + JetBrains Mono), disciplined 4px/8px-based spacing scale, subtle architectural radius tokens, and multi-tier dark surface hierarchy.

## Tasks

### Task 1: Hybrid Typography Stack Integration
- **File**: `src/app/globals.css`
- **Action**:
  - Update Google Fonts `@import` to load `Inter` (weights 400, 500, 600, 700).
  - Assign `--font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;` for base body, UI controls, buttons, tables, and inputs.
  - Preserve `--font-family-display: 'Playfair Display', Georgia, serif;` for major page titles and brand display.
  - Preserve `--font-family-mono: 'JetBrains Mono', monospace;` for codes, badges, and counters.
  - Re-tune typography scale tokens:
    - `--font-size-display-lg`: 2.125rem (~34px, reduced from 3.5rem / 56px)
    - `--font-size-headline-md`: 1.5rem (~24px)
    - `--font-size-title-md`: 1.125rem (~18px)
    - `--font-size-body-md`: 0.9375rem (~15px)
    - `--font-size-small`: 0.8125rem (~13px)
    - `--font-size-caption`: 0.75rem (~12px)

### Task 2: Standardized Spacing Scale & Component Sizing Tokens
- **File**: `src/app/globals.css`
- **Action**:
  - Define spacing scale CSS variables in `:root`:
    - `--space-1`: 4px
    - `--space-2`: 8px
    - `--space-3`: 12px
    - `--space-4`: 16px
    - `--space-5`: 20px
    - `--space-6`: 24px
    - `--space-8`: 32px
    - `--space-10`: 40px
    - `--space-12`: 48px
  - Define layout & control tokens:
    - `--control-height-sm`: 32px
    - `--control-height-md`: 36px
    - `--control-height-lg`: 40px
    - `--sidebar-width`: 230px
    - `--header-height`: 56px

### Task 3: Subtle Architectural Radius & Tonal Surface Hierarchy
- **File**: `src/app/globals.css`
- **Action**:
  - Remove strict universal `* { border-radius: 0px !important; }`.
  - Introduce radius tokens:
    - `--radius-sm`: 4px
    - `--radius-md`: 6px
    - `--radius-lg`: 8px
    - `--radius-pill`: 9999px
  - Update Dark Mode default tokens and surface hierarchy:
    - Canvas / Background: `#0B0D0E`
    - Card / Panel Surface: `#13161A`
    - Elevated Surface (Modals, Dropdowns, Hover): `#1C2026`
    - Default Border: `#272C35` (replacing harsh white/black lines)
    - Focus Border: `#3B82F6` / `#FFFFFF`
    - Text Primary: `#F4F4F6`, Text Secondary: `#A1A1AA`, Text Muted: `#71717A`
  - Update Light Mode surface & border variables for crisp dual-theme parity.

### Task 4: Automated Verification & Unit Tests
- **Files**:
  - `src/app/globals.test.ts`
- **Action**:
  - Update CSS design token assertions to verify `Inter`, new typography scale, spacing variables, radius tokens, and tonal dark mode tokens.
  - Run `npm test` and `npm run lint` to guarantee zero test or lint regressions.
