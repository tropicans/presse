# Design System Specification: isian

## 1. Overview & Creative North Star

**Creative North Star: "The Monochrome Ledger"**
This design system embraces an ultra-clean, minimalist, and high-contrast Swiss/Tech aesthetic (reminiscent of modern tools like Linear, Vercel, and Apple). We move away from saturated teal and blue palettes in favor of a timeless monochromatic scale of obsidian, deep charcoal, calibrated grays, and pure crisp whites.

The system relies on **tonal contrast, precision hairline borders, and typographic hierarchy** to deliver an interface that feels quiet, confident, and exceptionally sharp.

---

## 2. Colors & Surface Philosophy

The palette is engineered for intense visual focus, eliminating decorative color noise while retaining restrained, high-clarity status cues for critical user actions.

### Monochromatic Tokens

*   **Obsidian / Pitch Black (Dark Surface / Light Ink):** `#09090b` / `#000000`
*   **Deep Charcoal (Dark Cards / Secondary Ink):** `#121214` / `#18181b`
*   **Muted Grays (Dividers / Borders / Subtle Text):**
    *   `gray-100`: `#f4f4f5`
    *   `gray-200`: `#e4e4e7`
    *   `gray-300`: `#d4d4d8`
    *   `gray-400`: `#a1a1aa`
    *   `gray-500`: `#71717a`
    *   `gray-600`: `#52525b`
    *   `gray-700`: `#3f3f46`
    *   `gray-800`: `#27272a`
    *   `gray-900`: `#18181b`
*   **Stark White (Light Surface / Dark Ink):** `#ffffff` / `#fafafa`

### Surface Stacking & Hairline Border Rule

Boundaries between components are defined through crisp, understated precision:
1.  **Hairline Borders (1px):**
    *   *Light Mode:* `1px solid rgba(0, 0, 0, 0.08)` or `#e4e4e7`
    *   *Dark Mode:* `1px solid rgba(255, 255, 255, 0.08)` or `#27272a`
2.  **Elevation & Depth:** Ambient drop shadows (`--shadow-sm` through `--shadow-xl`) combined with delicate borders provide floating depth without visual clutter.
3.  **Glassmorphism:** Floating elements (dropdowns, theme toggle, modals) utilize 85% background opacity with `backdrop-filter: blur(16px)`.

### Semantic Indicators (Restrained)
To guarantee form usability and accessibility, status indicators use desaturated, restrained tones:
*   **Success:** Muted Emerald text (`#16a34a` / `#4ade80` dark) on soft translucent background.
*   **Error:** Restrained Crimson text (`#dc2626` / `#f87171` dark) with instant field highlight.
*   **Neutral / Pill Badges:** Inverted black-on-white or white-on-black badges with subtle border.

---

## 3. Typography: The Editorial Scale

A dual-font strategy: **Manrope** provides a geometric, modern authority for large numbers and headlines, while **Inter** delivers crisp, neutral legibility for questions, inputs, and tabular data.

| Role | Token | Font | Size | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display** | `display-lg` | Manrope | 3.5rem | 700 | Large data hero stats & percentages |
| **Headline**| `headline-md` | Manrope | 1.75rem| 600 | Page titles & Section headers |
| **Title**   | `title-md` | Inter | 1.125rem| 600 | Form card titles & Step headings |
| **Body**    | `body-md` | Inter | 0.875rem| 400 | Form questions, metadata & Table rows |
| **Label**   | `label-sm` | Inter | 0.6875rem| 600 | Overlines & Category tags (all-caps, 0.05em tracking) |

---

## 4. Components

### Buttons
*   **Primary Action:**
    *   *Light Mode:* Solid Black (`#09090b`), White text (`#ffffff`), border: `1px solid #000000`. Hover: `#27272a`.
    *   *Dark Mode:* Solid White (`#fafafa`), Black text (`#09090b`), border: `1px solid #ffffff`. Hover: `#e4e4e7`.
*   **Secondary / Outline:** Ghost button with 1px hairline border, transparent background, and high-contrast text.
*   **Destructive:** Ghost button with muted crimson border/text on hover.

### Cards & Form Containers
*   Cards sit on clean surfaces with 1px hairline borders (`var(--border-default)`) and subtle ambient shadows.
*   Card headers feature clear typographic separation and compact action icon triggers.

### Inputs & Digital Signature Pad
*   Inputs feature clean 1px borders transitioning to high-contrast solid focus ring (`--border-focus`) without colored glow.
*   Signature pad uses a crisp canvas with dark ink on light mode (`#09090b`) and light ink on dark mode (`#ffffff`).

---

## 5. Do's and Don'ts

### Do
*   **Do** embrace stark black-and-white contrasts with subtle mid-gray transitions.
*   **Do** use 1px hairline borders to create clean modular framing.
*   **Do** keep status colors functional and restrained rather than loud.

### Don't
*   **Don't** reintroduce saturated primary colors (cyan, blue, teal, purple) into background surfaces or buttons.
*   **Don't** use heavy colored drop shadows.
*   **Don't** compromise contrast ratios for text readability.