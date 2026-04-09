# Design System Specification: Editorial Data Intelligence

## 1. Overview & Creative North Star

**Creative North Star: "The Architectural Ledger"**
This design system moves beyond the standard SaaS dashboard by treating data as high-end editorial content. We reject the "box-within-a-box" clutter of traditional enterprise software in favor of an architectural approach to layout. The system relies on **tonal depth, intentional asymmetry, and typographic authority** to guide the user.

By utilizing "The Architectural Ledger" philosophy, we transform a form builder and data suite into a premium experience. We use generous whitespace as a functional tool rather than a luxury, ensuring that complex data sets breathe. The visual identity is defined by a sophisticated interplay between the grounded, trustworthy `secondary` (Dark Blue) and the precise, energetic `primary` (Vibrant Teal).

---

## 2. Colors & Surface Philosophy

The palette is engineered for professional focus, using a high-contrast relationship between deep blues and clinical teals.

### Color Tokens
*   **Primary (Action):** `#00483f` (The Foundation) | `primary_fixed`: `#13A18E` (The Interaction)
*   **Secondary (Brand):** `#346289` (Deep Blue Authority)
*   **Background:** `#f7f9fb` (The Light Gray Canvas)
*   **Surface Containers:** Ranging from `surface_container_lowest` (#ffffff) to `surface_container_highest` (#e0e3e5).

### The "No-Line" Rule
To achieve a high-end feel, **1px solid borders are prohibited for sectioning.** Boundaries must be defined solely through:
1.  **Tonal Shifts:** Placing a `surface_container_lowest` card on a `surface_container_low` background.
2.  **Strategic Shadows:** Using ambient depth rather than structural lines.
3.  **Whitespace:** Using the spacing scale to create mental groupings.

### The "Glass & Gradient" Rule
Standard flat colors can feel "template-like." To add visual soul:
*   **Floating Elements:** Use `surface_container_lowest` with a 85% opacity and a `12px` backdrop-blur for modals and dropdowns.
*   **Signature Gradients:** Main Action buttons and Hero headers should utilize a subtle linear gradient from `primary` (#00483f) to `primary_container` (#006256) at 135 degrees.

---

## 3. Typography: The Editorial Scale

We use a dual-font strategy to balance character with readability. **Manrope** provides a geometric, modern edge for high-level data points, while **Inter** ensures maximum legibility for functional content.

| Role | Token | Font | Size | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Manrope | 3.5rem | 700 | Large data hero stats |
| **Headline**| `headline-md` | Manrope | 1.75rem| 600 | Page titles & Section headers |
| **Title**   | `title-md` | Inter | 1.125rem| 600 | Card titles |
| **Body**    | `body-md` | Inter | 0.875rem| 400 | General metadata & Table rows |
| **Label**   | `label-sm` | Inter | 0.6875rem| 500 | Micro-data & Overlines |

**Editorial Note:** Always use `label-sm` in all-caps with a 0.05em letter-spacing for category headers to create a "premium ledger" feel.

---

## 4. Elevation & Depth

We eschew "Standard Material" shadows for **Tonal Layering**.

*   **The Layering Principle:** Stack surfaces to create depth.
    *   *Level 0 (Base):* `surface` (#f7f9fb)
    *   *Level 1 (Sections):* `surface_container_low` (#f2f4f6)
    *   *Level 2 (Cards):* `surface_container_lowest` (#ffffff)
*   **Ambient Shadows:** For elements that truly float (e.g., active dropdowns), use a shadow color derived from `on_surface` at 5% opacity, with a 20px blur and 10px Y-offset.
*   **The "Ghost Border":** If a container requires further definition (e.g., in high-density data views), use a 1px stroke of `outline_variant` (#c2c7cf) at **15% opacity**.

---

## 5. Components

### Buttons
*   **Primary:** Gradient from `primary` to `primary_container`. White text. Border-radius: `md` (0.375rem).
*   **Secondary:** Ghost style. Transparent fill with `secondary` (#346289) text and a `15% outline_variant` ghost border.
*   **Tertiary:** Text-only. `secondary` color, bold weight, no background.

### Cards & Data Lists
*   **Rule:** Forbid divider lines between list items.
*   **Implementation:** Use `surface_container_low` for the list container. Each item sits on `surface_container_lowest`. Separate items with `0.5rem` of vertical whitespace to allow the background to "peak through," creating a natural divider.

### Input Fields
*   **Styling:** Fields should not be boxes, but surfaces. Use `surface_container_high` as the background with a `0.25rem` radius. On focus, transition to `surface_container_lowest` with a 2px `primary` bottom-border only.

### Status Chips
*   **Draft:** `tertiary_container` background with `on_tertiary_fixed_variant` text.
*   **Published:** `primary_fixed` background with `on_primary_fixed_variant` text.
*   **Shape:** Pill-shape (Rounded: `full`).

---

## 6. Do's and Don'ts

### Do
*   **Do** use asymmetrical layouts (e.g., a wide 8-column data chart next to a narrow 4-column summary) to break the "grid fatigue."
*   **Do** use the `display-lg` Manrope font for singular, high-impact numbers (e.g., "Total Forms: 12").
*   **Do** lean into the teal `primary_fixed` color for small UI accents (toggles, radio pips) to create a thread of energy throughout the gray/blue interface.

### Don't
*   **Don't** use 100% black text. Always use `on_surface` (#191c1e) to maintain a softer, high-end editorial tone.
*   **Don't** use heavy "drop shadows." If the surface doesn't feel distinct, adjust the background color of the parent container instead.
*   **Don't** use dividers in tables. Use alternating row colors (Zebra striping) with `surface_container_low` and `surface_container_lowest` at a very subtle contrast ratio.

---

## 7. Signature Layout Patterns

**The Floating Summary Bar:**
In the "Form Builder" context, the top stats bar (Total Form, Total Submission, etc.) should not be a single connected row. Treat them as individual "floating tiles" of `surface_container_lowest` with `xl` (0.75rem) corner radius, sitting on the `surface` background. This creates a sense of modularity and lightness.