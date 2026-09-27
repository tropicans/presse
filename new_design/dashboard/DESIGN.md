# Design System Specification: isian (Milestone v1.8)

## 1. Overview & Creative North Star

**Creative North Star: "Editorial Minimalist Monochrome (Architectural Luxury & Print Precision)"**
This design system transforms the `isian` platform into an ultra-curated, editorial-grade experience reminiscent of high-end architectural monographs, printed literary reviews, and minimalist museum catalogues. We transcend utilitarian interface conventions by combining:
1. **Classical Serif & Monospace Typography:** Dramatic headlines, luxurious reading typography, and monospaced structural cues.
2. **Absolute Monochrome Palette:** Pure, unyielding `#000000` (deep ink) and `#FFFFFF` (crisp paper) without distracting accent hues.
3. **Strict Zero Border-Radius (0px Everywhere):** 90-degree sharp corners across every container, button, input, badge, modal, and signature canvas.
4. **Structural Line Hierarchy & Zero Shadows:** Removal of all soft ambient drop shadows, replaced by intentional line weights (1px hairline, 2px focus/accent, 4px structural section, 8px masthead anchor).
5. **Layered Paper & Line Textures:** Subtle repeating horizontal hairline stripes and grain textures that ground the canvas in tactile physical reality.

---

## 2. Typography: The Editorial Triad

| Role | Token | Font | Target Sizes | Weight | Intent |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Display / Masthead** | `var(--font-family-display)` | `Playfair Display`, serif | 2.5rem – 4rem | 700 / 900 | Hero headers, form titles, celebratory confirmation screens |
| **Body & Questions** | `var(--font-family)` | `Source Serif 4`, Georgia, serif | 0.875rem – 1.25rem | 400 / 600 | Question prompts, explanatory copy, form descriptions |
| **Metadata & Badges** | `var(--font-family-mono)` | `JetBrains Mono`, monospace | 0.6875rem – 0.875rem | 500 / 600 | Step counts (`01/04`), timestamps, table headers, submission IDs |

---

## 3. Colors & Dual-Theme Inversion Parity

The system strictly adheres to high-contrast binary elegance:

### Light Mode (The Printed Sheet)
- **Canvas:** `#FFFFFF`
- **Surface / Card:** `#FFFFFF`
- **Primary Ink:** `#000000`
- **Secondary Ink:** `#525252`
- **Dividers & Borders:** `#000000` (accent/structural) / `#E5E5E5` (hairline)
- **Inputs & Controls:** `#FFFFFF` background with `2px solid #000000` bottom or bounding box

### Dark Mode (The Photographic Darkroom)
- **Canvas:** `#000000`
- **Surface / Card:** `#0A0A0A` / `#000000`
- **Primary Ink:** `#FFFFFF`
- **Secondary Ink:** `#A3A3A3`
- **Dividers & Borders:** `#FFFFFF` (accent/structural) / `#262626` (hairline)
- **Inputs & Controls:** `#000000` background with `2px solid #FFFFFF` bottom or bounding box

---

## 4. Geometry & Elevation Rules

1. **Zero Border Radius (0px):**
   - No rounded pills, no soft corners. All inputs, cards, action buttons, modals, dropdowns, and tags feature precise 90-degree right angles.
2. **Zero Drop Shadows:**
   - Soft blurry shadows (`--shadow-sm` through `--shadow-xl`) are abolished (`none`). Elevation is conveyed through high-contrast boundary lines and color inversion.
3. **Line System:**
   - **Hairline (1px):** Grid dividers, subtle cell separators, secondary borders.
   - **Medium (2px):** Card outlines, input fields, interactive borders.
   - **Heavy (4px):** Header dividers, active step indicators, card accents.
   - **Ultra (8px):** Main masthead bars, top layout accents, key milestones.
4. **Binary Inversion Transitions:**
   - Interactive hover states invert foreground and background colors instantaneously or in <100ms (e.g., black button with white text flips to white button with black text).