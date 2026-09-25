# Phase 10: LLM API Integration & Schema Setup - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-07-16
**Phase:** 10-LLM API Integration & Schema Setup
**Areas discussed:** LLM Configuration & Fallbacks, Prompt Customization vs Static Prompts, Token Limits & Submission Sampling

---

## LLM Configuration & Fallbacks

| Option | Description | Selected |
|--------|-------------|----------|
| Strict Environment Variables | Require LLM_API_KEY, LLM_API_BASE, and LLM_MODEL in .env, erroring immediately if they are missing or invalid | ✓ |
| Flexible Defaults | Fallback to default base URL 'https://sembilan.kelazz.my.id/v1' and model 'gpt-4o' if not explicitly configured in env | |
| Database / Form Settings Override | Allow overriding base URL and model per-form in the admin settings panel, stored in the db | |
| You decide | Let the builder decide the best configuration approach | |

**User's choice:** Strict Environment Variables
**Notes:** Decided to require strict environment configurations to prevent silent config issues and keep integration clean.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Fail-Fast & Return Error | Do not save anything in the database, return a clear HTTP 500 error response to the client immediately so they can retry | ✓ |
| Save Failed State in DB | Create/update the FormAiAnalysis record with a special status or error log so the admin has persistent traceback of the failure | |
| You decide | Implement standard Next.js error propagation with console logging | |

**User's choice:** Fail-Fast & Return Error
**Notes:** Chosen to keep database tables clean of failed operational states and bubble errors directly to UI clients.

---

| Option | Description | Selected |
|--------|-------------|----------|
| No Dedicated Test Endpoint | Verify connection inline during analysis; keep API surface minimal. Errors will bubble up normally | ✓ |
| Dedicated GET /api/admin/forms/[id]/ai-analysis/test | Add a quick lightweight test route to probe LLM settings from the admin panel | |
| You decide | Minimal setup is fine | |

**User's choice:** No Dedicated Test Endpoint
**Notes:** Connectivity will be validated inline as part of the analysis process to avoid bloating the API surface.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Hardcoded Static temperature | Keep temperature: 0.3 inline in code; this is optimal for factual, consistent, and structured data analysis | ✓ |
| Environment Variable Parameter | Allow overriding parameters like temperature, top_p, etc., via optional env variables like LLM_TEMPERATURE | |
| You decide | Builder discretion on parameters | |

**User's choice:** Hardcoded Static temperature
**Notes:** Set a static low temperature (0.3) to maximize analytical consistency.

---

## Prompt Customization vs Static Prompts

| Option | Description | Selected |
|--------|-------------|----------|
| Static Prompt in Source Code | Use the defined prompt in buildPrompt() in src/lib/ai-analysis.ts, which is already optimized for Indonesian kepegawaian/UX analysis | ✓ |
| Configurable per Form | Allow admins to write a custom prompt or customize analytical focus in the form settings dashboard, stored in the db | |
| You decide | Keep it static for now, and implement optional system prompts later if requested | |

**User's choice:** Static Prompt in Source Code
**Notes:** Static source prompt ensures consistent thematic output structure.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Single General-Purpose Template | Use the existing comprehensive prompt that merges qualitative text and quantitative/quiz stats, adapting naturally based on whether quiz statistics exist | ✓ |
| Predefined Templates | Offer options for different analysis profiles like 'UX Feedback', 'Quiz Analytics', or 'Attendance Report' in the UI, selecting different hardcoded prompts | |
| You decide | Use the single adaptive template for now | |

**User's choice:** Single General-Purpose Template
**Notes:** Prompt adjusts itself adaptively depending on what data fields exist in the form.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Render As-Is | Display the raw Markdown returned by the LLM directly in a scrollable preview panel, ensuring flexibility and preventing parsing errors | ✓ |
| Section Parsing | Parse the output Markdown by headers to render them under separate tabs, e.g., 'Sentimen', 'Rekomendasi', 'Tematik' | |
| You decide | Render the raw Markdown on the client side using a standard Markdown library | |

**User's choice:** Render As-Is
**Notes:** The client renders Markdown exactly as returned by the model.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Strict Indonesian Response | Always instruct the LLM to write in professional Bahasa Indonesia, aligning with the Indonesian UI copy conventions of the app | ✓ |
| Bilingual / Option to choose | Allow selection between English and Bahasa Indonesia when triggering the analysis | |
| You decide | Strict Bahasa Indonesia is preferred | |

**User's choice:** Strict Indonesian Response
**Notes:** Output remains in formal Bahasa Indonesia to align with the application's overall language.

---

## Token Limits & Submission Sampling

| Option | Description | Selected |
|--------|-------------|----------|
| Hard Limit & Most Recent | Use the 1000 most recent submissions, which matches the current implementation of pageSize: 1000 in buildPrompt, ensuring fresh data while staying safely under standard token limits | ✓ |
| Random Sampling | Sample a random slice of up to 500-1000 submissions across the entire database history for a more uniform distribution | |
| Variable Window Size | Let the administrator select the sample size, e.g., 'Last 100', 'Last 500', or 'Last 1000' in the UI before generating | |
| You decide | Strict cap of 1000 is fine | |

**User's choice:** Hard Limit & Most Recent
**Notes:** Set sample window size limit to 1000 submissions.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Static Sample of 50 | Keep the current logic that slices the text answers list to 50 items. This is a solid representative size for finding themes while keeping prompt size and costs minimal | ✓ |
| Dynamic Scaling | Scale the text sample dynamically based on the total submissions, e.g., 10% of total submissions up to a max of 150 responses | |
| You decide | Stick with the static 50 responses limit | |

**User's choice:** Static Sample of 50
**Notes:** Static cap of 50 qualitative text response samples per field.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Allow any count > 0 | Even 1 submission can be analyzed. This is helpful for testing/early reviews, though the dashboard can display a warning for low sample sizes | ✓ |
| Minimum Threshold of 3 | Return an error if there are fewer than 3 submissions, as analyzing 1 or 2 submissions doesn't yield meaningful patterns | |
| You decide | Allow any count > 0 | |

**User's choice:** Allow any count > 0
**Notes:** Supported testing from the very first submission.

---

| Option | Description | Selected |
|--------|-------------|----------|
| Treat yes_no as Choice Fields | Include 'yes_no' in isChoiceField() so they are aggregated into frequency distributions, e.g., 'Yes: 80% (80 responses), No: 20% (20 responses)' | ✓ |
| Keep yes_no as Text Fields | Continue listing raw answers 'Yes' and 'No' individually in the prompt data | |
| You decide | Treat them as choice fields | |

**User's choice:** Treat yes_no as Choice Fields
**Notes:** Treat `yes_no` fields as choice selections rather than freeform text answers.

---

## the agent's Discretion
- Internal logging and route file structuring details left to developer discretion.

## Deferred Ideas
- None.
