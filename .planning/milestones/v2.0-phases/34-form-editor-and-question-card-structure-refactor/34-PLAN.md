# Phase 34: Form Editor & Question Card Structure Refactor Plan

**Phase**: 34
**Goal**: Overhaul the Form Editor and Question Cards to eliminate excessive nested containers, heavy borders, and large padding, transforming the builder into a high-density, professional workspace while maintaining dual-theme integrity and all builder logic.

## Key Changes

1. **Two-Column Container De-escalation**:
   - Refactor `.editorial-form-editor-panel` to use subtle 1px border (`var(--border-default)`), `var(--radius-lg)` or `var(--radius-md)`, and disciplined padding (`var(--space-4)` / 16px instead of 24–32px).
   - Ensure sticky headers and toolbars align smoothly with the 56px topbar.

2. **Step Tabs & Outline Panel Compactness**:
   - Refactor `.admin-step-tab` from bulky `2px solid` blocks with `0px !important` to clean, modern compact tabs (`padding: 6px 12px`, `height: 32px`, `var(--radius-sm)`).
   - Refactor `.admin-outline-panel` and `.admin-outline-item` for fast scanning with minimal height (28px item height).

3. **Question Card Header & Structure**:
   - Refactor `.admin-builder-card`:
     - Reduce border from `2px solid` to `1px solid var(--border-default)`.
     - Standardize border-radius to `var(--radius-md)`.
     - Reduce card padding from `22px` to `14px 16px` (collapsed: `10px 14px`).
   - Question Card Header:
     - Single row alignment: `[▼] [#1] [Label] [Type Badge] [Wajib Badge] ... [Actions: ↑ ↓ duplicate delete]`.
     - Action icon buttons: 28px height, subtle hover states.
   - Question Card Body:
     - Compact grid for Label (span 2), Type (span 1), Step (span 1).
     - Standard 36px inputs and selects.
     - Options list: compact row layout with streamlined branching selector.
     - Inline checkbox for `Wajib diisi` with clean spacing.

4. **Preservation**:
   - Zero changes to question CRUD, branching, duplicate, quiz scoring, or bulk options logic.
   - Preserve all data attributes and testing identifiers.

## Verification
- Unit & CSS tests: `npm test`
- Typecheck: `npx tsc --noEmit`
- Linter: `npm run lint`
