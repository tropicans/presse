# Pitfalls Research

**Domain:** Admin Form Editor UX & State Modernization
**Researched:** 2026-09-25
**Confidence:** HIGH

## Common Mistakes & Warning Signs

### 1. Step Tab Filtering Breaking Field Reordering

- **The Mistake:** If a user filters by "Langkah 2" and clicks "Pindahkan ke Atas" (Move Up) on the first field of Langkah 2, swapping indices based on the filtered array rather than the global `form.fields` array can corrupt ordering or swap with fields from other steps unexpectedly.
- **Prevention:** Always calculate move operations (`moveField(id, 'up' | 'down')`) based on the target field's position relative to its siblings in the same step, or index within `form.fields`.
- **Phase to Address:** Phase covering Step Tabs & Reordering.

### 2. Collapsing Card While User is Typing in an Input

- **The Mistake:** Card toggle trigger wrapping the entire card body or input elements causing blur/focus loss or accidental collapse while typing.
- **Prevention:** Only the header row (`.admin-builder-card-head`) acts as the accordion toggle, with explicit clickable buttons (Reorder, Duplicate, Delete) calling `event.stopPropagation()`. Input fields inside the expanded card must never trigger accordion events.
- **Phase to Address:** Phase covering Collapsible Cards.

### 3. Step Tab Switching Hiding Active Fields

- **The Mistake:** When deleting a step (`removePage(pageId)`), fields are reassigned to a fallback step. If `activeStepId` was pointing to the deleted step, the view might become blank.
- **Prevention:** Add fallback logic: if `activeStepId !== 'all'` and that step no longer exists in `form.pages`, reset `activeStepId` to `'all'` or `form.pages[0].id`.
- **Phase to Address:** Phase covering Step Navigation.

### 4. Loss of Unsaved State on Jump/Switch

- **The Mistake:** Forcing form reload or component remounting during tab switching, resetting local input state.
- **Prevention:** The form data resides in parent `form` state. Tab filtering and card expanding are strictly presentational overlays; all edits remain preserved in memory and auto-saved as usual.
- **Phase to Address:** Phase covering Quick Navigation & Outline.

### 5. Excessive DOM Re-renders on 40+ Fields

- **The Mistake:** Typing in one field label re-rendering all other 39 field cards on every keystroke.
- **Prevention:** In collapsed state, cards render only a lightweight single-line summary (Label, Type tag, Badge). Only the actively expanded card renders detailed inputs and option lists.
- **Phase to Address:** Phase covering Performance & Card Polish.

---

*Pitfalls research: 2026-09-25*
