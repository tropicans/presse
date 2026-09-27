# Phase 35: Responsive, Accessibility & Cross-Screen Refinements Plan

**Phase**: 35
**Goal**: Verify and refine responsive behaviors across mobile, tablet, and desktop breakpoints; eliminate remaining hardcoded radii in media queries; enforce WCAG-compliant focus-visible indicators; and ensure touch target accessibility without sacrificing high visual density.

## Key Changes

1. **Responsive Media Query Normalization**:
   - Replaced hardcoded `22px` and `24px` border radius overrides in responsive queries (`@media (max-width: 960px)` and `@media (max-width: 780px)`) with architectural design tokens (`var(--radius-lg)` and `var(--radius-md)`).
   - Enforced 1-column layout for `.editorial-form-editor-grid` under 960px, making settings panel non-sticky on tablet and mobile for natural document flow.

2. **Touch Targets & Compact Controls Ergonomics**:
   - Ensured interactive elements (buttons, inputs, tabs, and action links) maintain at least 28–36px height with adequate hit padding and hover feedback.
   - Refactored floating `.theme-toggle` button to a refined pill shape (`var(--radius-pill)`) with compact 36px height.

3. **Accessibility & Keyboard Navigation**:
   - Implemented universal `:focus-visible` outline styles with `var(--border-focus, #3b82f6)` and 2px offset.
   - Retained readable contrast across dark surfaces (`--text-primary`, `--text-secondary`, `--text-muted`).

## Verification
- Unit & CSS tests: `npm test`
- Typecheck: `npx tsc --noEmit`
- Linter: `npm run lint`
