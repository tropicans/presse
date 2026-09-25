# Feature Research

**Domain:** Admin Form Builder & Editor Scalability
**Researched:** 2026-09-25
**Confidence:** HIGH

## Feature Landscape

### Table Stakes (Users Expect These)

Features expected when managing complex multi-question forms:

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Step-based Filtering (Step Tabs)** | Users cannot manage 20-40 fields stacked in one vertical list. Grouping fields by active step/page makes each step focused. | MEDIUM | Tab bar with Step 1, Step 2, ..., and "Semua Langkah" filter option. Shows field count badge per step. |
| **Collapsible / Accordion Field Cards** | Once configured, fields should not take up 400px each. Collapsed cards show compact summary line (Title, Type badge, Required badge, Option count). | MEDIUM | Controlled expansion state (`expandedIds: Set<string>`). Click header to toggle. Include "Buka Semua" / "Tutup Semua" buttons. |
| **Field Duplication (1-Click)** | Survey/quiz creators frequently create similar questions (e.g. Likert scale ratings or multiple-choice questions with identical options). | LOW | Clones field with new UUID, appends directly after source field in the same step, appends "(Salinan)" to label. |
| **Active-Step Field Insertion** | Clicking "+ Teks" or "+ Pilihan" should add the field into the currently active step, not at the bottom of the entire 30-field form. | LOW | Uses `activeStepId` context when `addField(type)` is triggered. |
| **Sticky Header & Action Bar** | When scrolling inside long lists, Save, Discard, and Step navigation remain readily accessible. | LOW | CSS `position: sticky; top: 0` with backdrop blur and high z-index. |

### Differentiators (Competitive Advantage)

Features that provide an exceptional, high-productivity editing experience:

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Quick Jump Outline Sidebar** | Visual tree showing all steps and fields with status indicators. Clicking any item scrolls directly to the field card and auto-expands it. | MEDIUM | Left/right docked collapsible panel showing numbered list of questions. |
| **Field Reassignment Across Steps** | Dropdown inside the field card or outline allowing direct reassignment from "Langkah 1" to "Langkah 3" without repeated move clicks. | LOW | Select input mapped to `updateField(field.id, { pageId })`. |
| **Search / Filter in Outline** | Quick filter input in outline to locate a specific question by label keyword in massive forms. | LOW | Instant client-side text filtering over field labels. |

### Anti-Features (Avoid in this milestone)

| Feature | Why Requested | Why Problematic | Better Approach |
|---------|---------------|-----------------|-----------------|
| Complex Drag-and-Drop canvas library | Looks flashy in demos | Breaks mobile/tablet touch gestures, causes accidental moves while scrolling on touch devices, causes focus loss in nested inputs. | Provide explicit Move Up/Down, Move to Step dropdown, and instant outline ordering buttons. |
| Infinite nested sub-steps | Some users request sub-steps | Complicates branching logic and database schema validation drastically. | Keep clean flat steps with conditional branching routes (`FormConditionalRoute`). |

## Feature Dependencies

```
[Step Tabs Navigation] 
    └──enables──> [Active-Step Field Insertion]
    └──enables──> [Step-Specific Card Counts]

[Collapsible Field Cards]
    └──enhanced by──> [Expand All / Collapse All Controls]
    └──enhanced by──> [Quick Jump from Outline]

[Quick Jump Outline]
    └──requires──> [Target Field DOM Refs or Element IDs]
```

---

*Feature research: 2026-09-25*
