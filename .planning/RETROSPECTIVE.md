# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

## Milestone: v1.4 — UI Polish & Admin Experience Enhancement

**Shipped:** 2026-08-28
**Phases:** 2 | **Plans:** 2 | **Sessions:** 2

### What Was Built
- Sticky column headers (`position: sticky; top: 0; z-index: 10;`) with adaptive solid backgrounds on `/admin/forms/[id]/submissions` (`TABLE-01`).
- 60fps CSS skeleton shimmer animations for dashboard forms list (`LOAD-01`) and submission cards/table rows (`LOAD-02`).
- Minimalist SVG illustrations, onboarding copy, and primary action CTAs for empty dashboard forms (`EMPTY-01`).
- Context-aware empty state guidance for submissions based on form publish status (`EMPTY-02`).
- Dedicated zero-result search/filter states with instant reset buttons.

### What Worked
- Pure Vanilla CSS approach leveraging CSS variables for seamless light/dark mode transitions with zero runtime JS animation overhead.
- Context-aware empty state actions providing direct value (e.g. 1-click URL copy on published forms, modal opener on forms dashboard).
- High-coverage automated verification (TypeScript, ESLint, Next standalone build) keeping regressions to 0.

### What Was Inefficient
- Initial ESLint scan checked `.agent/**` scripts; resolving by adding proper `.agent/**` and `.opencode/**` ignores in `eslint.config.mjs` fixed the issue permanently.

### Patterns Established
- **Adaptive Sticky Table Headers**: Use solid semantic backgrounds (`var(--surface)`, `var(--card-bg)`) rather than transparent backgrounds on sticky table heads.
- **Skeleton Shimmer Placeholders**: Align skeleton structure 1-to-1 with actual rendered table column counts and card shapes.
- **Actionable Empty States**: Always pair an empty visual cue with a primary next action (CTA) and clear contextual copy.

### Key Lessons
1. Native CSS keyframe animations provide smooth 60fps shimmer loaders without requiring third-party animation libraries.
2. Contextual status guidance on empty states turns what would be dead ends into productive onboarding moments.

---

## Milestone: v1.3 — LLM Submission Analysis

**Shipped:** 2026-07-16
**Phases:** 2 | **Plans:** 2 | **Sessions:** 3

### What Was Built
- OpenAI-compatible LLM connectivity configurations, API keys, and model parameters in env.
- `FormAiAnalysis` PostgreSQL DB schema setup and Prisma database model migrations.
- Backend GET and POST API routes for manual trigger generation and retrieval of cached analyses, secured with NextAuth admin session checks.
- Quantitative and qualitative submission data pre-aggregation and formatting logic.
- "Analisis AI" tab in Admin submissions panel with loading spinner and sample metadata details.
- Custom React-based Markdown parser to render structural headers, lists, and tables without external dependencies.

### What Worked
- Reusing existing NextAuth session configurations for endpoint gating.
- Establishing custom Markdown parser logic that does not pull heavy marked or react-markdown npm packages, maintaining a light bundle size.
- Unit tests in `src/lib/ai-analysis.test.ts` running with mocked responses, verifying correct prompt formats.

### What Was Inefficient
- Codebase mapping for pre-written frontend portions took some research steps before implementing verification.

### Patterns Established
- **Custom Markdown Renderer**: Simple tagless Markdown parser using React elements.
- **Prompt Pre-aggregation**: preAggregateSubmissions groups choices and text fields for prompt consumption.

### Key Lessons
1. Mocking the OpenAI SDK response makes unit testing for AI prompt builders predictable and fast.
2. Caching analysis results in the database prevents wasteful token consumption on repeated admin dashboard visits.

### Cost Observations
- Model mix: 100% Gemini (Flash / Pro)
- Sessions: 3
- Notable: Manual generation button and database caching keep API usage efficient.

---

## Cross-Milestone Trends

### Process Evolution

| Milestone | Sessions | Phases | Key Change |
|-----------|----------|--------|------------|
| v1.3 | 3 | 2 | Manual trigger and cached AI reports |
| v1.4 | 2 | 2 | Pure CSS UI polish, shimmer skeletons, and actionable empty states |

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.3 | 12 | 100% | Custom Markdown Renderer |
| v1.4 | 37 | 100% | Pure CSS Skeleton Shimmer & SVG Empty States |

### Top Lessons (Verified Across Milestones)

1. Cache LLM outputs in database to control API costs.
2. Build lightweight Markdown parsers instead of installing heavy marked/react-markdown dependencies to avoid vendor bloat.
3. Use pure Vanilla CSS animations with theme variables for 60fps micro-interactions without JS runtime payload.
4. Transform empty states into active onboarding workflows with clear CTAs.
