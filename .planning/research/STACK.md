# Technology Stack Research

**Domain:** Modern Form Builder UI/UX (Admin Console)
**Researched:** 2026-09-25
**Confidence:** HIGH

## Stack Additions / Evaluation

### Core Recommendation: Zero New External Dependencies

For the requirements of Milestone v1.5 (Step Tabs, Collapsible Cards, Outline Panel, Duplicate & Quick Add Actions):
- **React 19 Hooks (`useState`, `useMemo`, `useCallback`, `useRef`):** Completely adequate for managing active step filtering, accordion expansion sets (`Set<string>`), and keyboard/click navigation.
- **Native Web Platform APIs:**
  - `Element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })` for instant quick-jump navigation from the Outline panel.
  - HTML `<details>`/`<summary>` or controlled state div with CSS grid animation for 60fps collapse/expand transitions without layout thrashing.
  - Browser `crypto.randomUUID()` for robust client-side field cloning and id generation.
- **Pure Vanilla CSS Design System:**
  - Leverage existing design tokens in `src/app/globals.css`.
  - Add modular CSS class scopes (`.builder-step-nav`, `.builder-outline-sidebar`, `.builder-card-collapsed`, `.builder-sticky-toolbar`) using existing CSS custom properties (`--color-surface`, `--color-border`, `--color-primary`, `--radius-md`).

### Evaluated Alternatives & Why Avoided

| Tool / Library | Purpose Considered | Why Avoided |
|----------------|-------------------|-------------|
| `@dnd-kit/core` / `react-beautiful-dnd` | Drag-and-drop field reordering | Adds 50-80KB JS runtime overhead, creates touch event conflicts with inner inputs/selects on canvas/tablets, and introduces unnecessary maintenance complexity compared to streamlined instant action buttons (Move to Step, Move Up/Down, Jump to Position). |
| `framer-motion` | Card accordion transitions | High bundle overhead (~35KB gzipped), incompatible with pure CSS styling conventions documented in `PROJECT.md` and `CONVENTIONS.md`. |
| `lucide-react` | Navigation icons | Project uses lightweight inline SVG icons consistent with existing admin components (`AdminFormEditor.tsx`, `AdminFormsList.tsx`). |

## Platform Compatibility

- Fully compatible with Next.js 16 standalone output mode (`next.config.ts`).
- Fully compatible with React 19 Client Component architecture (`'use client'`).
- Works seamlessly across desktop and tablet screen widths.

---

*Stack research: 2026-09-25*
