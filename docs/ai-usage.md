# AI Usage

This document summarizes how generative AI was used while building Resume Frog for the CSC3100 final project. AI was used as a development assistant and as an application feature, but all generated or AI-shaped work was reviewed before being kept in the project.

## Development AI Tools

- Claude Code was used for project scaffolding, route/view implementation, test generation, documentation drafts, and code review passes.
- Codex was used for later documentation cleanup and consistency checks.
- Sonnet 4.6 helped generate the first version of `db/schema.sql`; GPT-5.5 helped correct it; I manually reviewed the final schema.
- AI assistance was also used for commit-message and PR-description drafting.

## In-App AI Feature

Resume Frog uses Google Gemini through `@google/generative-ai` for the "Review with AI" feature. Users can request suggestions for resume prose from supported sections such as summaries, job bullets, projects, education, skills, certifications, and awards.

The AI feature is on-demand only. The app never automatically rewrites user content or applies suggestions without the user deciding what to keep.

Gemini key handling:

- A user-managed key can be stored from the Settings screen.
- The stored database key takes priority over `GEMINI_API_KEY` from `.env`.
- If no key is configured, the rest of the application still works and the AI review endpoint returns a friendly error.
- `.env` is gitignored so local API keys are not committed.

## Rules And Configuration

- `CLAUDE.md` is the project rules file used by Claude Code and Codex.
- `CLAUDE.md` documents the project architecture, required stack, code style, AI-comment policy, testing commands, and security expectations.
- AI-assisted files or substantial AI-shaped blocks are marked with leading comments such as `// AI: Generated with Claude Code - ...` or equivalent file-level comments.
- No project MCP server configuration is committed, and no MCP server is required to install, run, test, or use this application.

## Significant AI-Assisted Contributions

### Database

- `db/schema.sql` was initially generated with AI, corrected with another AI review pass, then manually checked.
- `lib/db.js` was hand coded and verified against AI-assisted tests in `lib/db.test.js`.

### Backend

- Express route files in `routes/` were substantially AI-assisted, including CRUD endpoints for contact, summary, education, jobs, projects, skills, certifications, awards, resumes, settings, PDF export, and AI review.
- `lib/gemini.js` was AI-assisted and manually reviewed. It contains the Gemini wrapper, section-specific review prompts, active API key resolution, JSON response validation, and output leakage checks.
- `routes/ai.js` was AI-assisted and manually reviewed. It validates request bodies, restricts supported section types, blocks obvious prompt-injection attempts, and returns structured suggestions.
- `routes/settings.js` was AI-assisted and manually reviewed. It lets users store, check, and clear their Gemini API key without exposing the raw key in API responses.
- `lib/swagger.js` was AI-assisted to document the REST API surface.

### Frontend

- `public/index.html` was AI-assisted for the SPA shell, navigation, credits modal, and accessibility structure.
- View modules under `public/js/views/` were AI-assisted for the dashboard, profile data forms, resume builder, settings, and preview screens.
- `public/js/components/ai-review.js` was AI-assisted for the "Review with AI" button and suggestion popover.
- `public/js/components/form-helpers.js` and `public/js/api.js` were AI-assisted utility modules for form handling and fetch wrappers.
- `public/css/app.css` and `public/css/print.css` were AI-assisted for the visual theme, responsive behavior, and print/PDF layout.

### Tests And Scripts

- Automated tests in `tests/` were AI-assisted, then run with `npm test`.
- `scripts/seed.js` was AI-assisted to create idempotent demo data.
- `scripts/clean-db.js` supports resetting the local SQLite database during development.

### Documentation

- `implementation_plan.md`, `DEV-WORKFLOW.md`, `docs/special-instructions.md`, and this AI usage document were AI-assisted and manually edited for the final submission.
