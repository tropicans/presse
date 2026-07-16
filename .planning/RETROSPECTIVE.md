# Project Retrospective

*A living document updated after each milestone. Lessons feed forward into future planning.*

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

### Cumulative Quality

| Milestone | Tests | Coverage | Zero-Dep Additions |
|-----------|-------|----------|-------------------|
| v1.3 | 12 | 100% | Custom Markdown Renderer |

### Top Lessons (Verified Across Milestones)

1. Cache LLM outputs in database to control API costs.
2. Build lightweight Markdown parsers instead of installing heavy marked/react-markdown dependencies to avoid vendor bloat.
