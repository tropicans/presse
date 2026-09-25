# Architecture Research

**Domain:** Admin Form Editor Component Architecture
**Researched:** 2026-09-25
**Confidence:** HIGH

## Component Structure & State Architecture

### Current State
`src/components/AdminFormEditor.tsx` currently houses ~1,260 lines of code in a single client component, managing form metadata, steps, fields, options, auto-save timers, preview synchronization, and monolithic JSX layout.

### Target Architecture

Maintain clean cohesion by structuring editor state and introducing clean sub-components or internal sub-views:

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        AdminFormEditor (Shell)                         │
│  - Topbar: Brand, Backlink, Live Preview Toggle, Save / Discard Status │
├──────────────────────────┬─────────────────────────────────────────────┤
│   Left / Sidebar Column  │               Main Editor Column            │
│  ┌────────────────────┐  │  ┌───────────────────────────────────────┐  │
│  │ Form Info & Share  │  │  │ Step Tabs Bar (Langkah 1, 2, All)     │  │
│  │ (Title, Slug, Mode)│  │  ├───────────────────────────────────────┤  │
│  ├────────────────────┤  │  │ Step Toolbar (Add Field to Active)    │  │
│  │ Quick Jump Outline │  │  ├───────────────────────────────────────┤  │
│  │ (Field tree & jump)│  │  │ Card Actions (Expand/Collapse All)    │  │
│  └────────────────────┘  │  ├───────────────────────────────────────┤  │
│                          │  │ Filtered Field Cards List             │  │
│                          │  │  - Collapsed Summary Header           │  │
│                          │  │  - Expanded Detail Panel              │  │
│                          │  │  - Quick Actions (Duplicate, Reorder) │  │
│                          │  └───────────────────────────────────────┘  │
└──────────────────────────┴─────────────────────────────────────────────┘
```

### Key State Additions in Editor

```typescript
// Active step navigation filter: 'all' or specific page.id
const [activeStepId, setActiveStepId] = useState<string>('all')

// Set of field IDs currently expanded for editing
const [expandedFieldIds, setExpandedFieldIds] = useState<Set<string>>(new Set())

// Outline panel visibility toggle
const [showOutline, setShowOutline] = useState<boolean>(true)

// Outline search keyword
const [outlineSearch, setOutlineSearch] = useState<string>('')
```

### Field Filtering & Sorting Logic

```typescript
const visibleFields = useMemo(() => {
  if (!form) return []
  if (activeStepId === 'all') return form.fields
  return form.fields.filter((field) => field.pageId === activeStepId)
}, [form, activeStepId])
```

### Seamless DOM Scrolling
Each field card is given an element id `field-card-${field.id}`. Clicking an item in the outline executes:
```typescript
const handleJumpToField = (fieldId: string, pageId: string) => {
  // If filtering by step and target field is on another step, switch step tab
  if (activeStepId !== 'all' && activeStepId !== pageId) {
    setActiveStepId(pageId)
  }
  // Auto-expand target card
  setExpandedFieldIds((prev) => new Set(prev).add(fieldId))
  // Smooth scroll
  setTimeout(() => {
    const el = document.getElementById(`field-card-${fieldId}`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, 50)
}
```

---

*Architecture research: 2026-09-25*
