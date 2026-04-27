# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) and Codex when working with code in this repository.

It also serves as the **AI rules file** required by the CSC3100 final assignment submission. See `docs/ai-usage.md` for a narrative summary of how AI was used during development.

## Project Overview

**ResumeBuilder** — local-only single-page application for the CSC3100 final. Helps students store a library of jobs/projects/skills/certs/awards, then assemble a tailored, printable resume for a target role. Gemini AI is used on-demand to review user-entered prose. See `implementation_plan.md` for the full design.

Stack (locked by assignment):
- Frontend: vanilla HTML/CSS/JS, **no React or other frameworks**. SPA — single `public/index.html`, History API routing (`pushState` + `popstate`), views show/hide via DOM swaps.
- Styling: Bootstrap utility classes only. Custom CSS limited to `public/css/print.css` (print layout) and explicitly flagged in `implementation_plan.md`.
- Backend: Node.js + Express **RESTful** APIs. **No MVC, no SSR.**
- Database: SQLite via `better-sqlite3`.
- AI: Google Gemini via `@google/generative-ai`.
- Libraries: all vendored under `public/vendor/` — **no CDNs**.

## Common Commands

```bash
# Install deps
npm install

# Run the app (Express + static SPA)
npm start                # http://localhost:3000

# Unit tests
npm test

# Lint
npm run lint

# Format
npm run fmt

# Reset local DB (delete + reapply schema on next boot)
rm db/resume.db && npm start
```

## Architecture

- **server.js** — Express bootstrap. Serves `public/` as static, mounts JSON routers under `/api/*`, applies migrations on boot via `lib/db.js`. Catch-all handler returns `public/index.html` for any non-`/api` path so deep links and refreshes (e.g. `/builder/5`) resolve to the SPA shell.
- **lib/db.js** — `better-sqlite3` connection + schema migration runner. Reads `db/schema.sql` and applies it if `db/resume.db` is missing.
- **lib/gemini.js** — Gemini API wrapper. Loads `process.env.GEMINI_API_KEY`, exposes `reviewSection(sectionType, text)`. Prompt templates per section type. Returns suggestions; never auto-writes user content.
- **routes/** — One Express router per resource: `contact.js`, `summary.js`, `educations.js`, `jobs.js` (+ `job_bullets`), `projects.js` (+ `project_bullets`), `skills.js`, `skill_categories.js`, `certifications.js`, `awards.js`, `resumes.js`, `ai.js`. All return JSON.
- **db/schema.sql** — Single source of truth for tables. Single-user app, no auth. See `implementation_plan.md` § Data model for the full schema.
- **public/index.html** — SPA shell: skip-link, `<header>`, `<main id="view-root">`, `<footer>`, credits modal. Loads vendored Bootstrap + JS modules.
- **public/js/app.js** — History API router. Intercepts `<a data-spa>` clicks, calls `history.pushState`, listens for `popstate`, and dispatches to view modules. Exposes a `navigate(path)` helper for programmatic navigation after API calls.
- **public/js/views/** — `dashboard.js`, `profile.js`, `builder.js`, `preview.js`. Each renders into `#view-root` and wires delegated event listeners.
- **public/js/components/** — `form-helpers.js` (form binding utilities), `ai-review.js` ("Review with AI" button + suggestion popover).
- **public/js/api.js** — Thin `fetch` helpers for the `/api/*` surface.
- **public/js/pwa.js** — Service worker registration + install-prompt handling.
- **public/css/print.css** — `@media print` rules for the resume layout. **Custom CSS — flagged.** Hides app chrome, sets letter-size page, ATS-friendly type, page-break rules.
- **public/vendor/** — Vendored Bootstrap CSS+JS and any other third-party libraries. No CDN references anywhere in `index.html`.
- **public/manifest.webmanifest**, **public/service-worker.js** — PWA shell. Caches app shell on install; network-first for `/api/*`. Navigation requests (any non-`/api` path) fall back to cached `index.html` when offline so deep links keep working without a network round-trip.
- **docs/ai-usage.md** — Narrative AI-usage summary (required for submission).
- **docs/lighthouse.png** — Lighthouse accessibility ≥ 93 evidence (required for submission).
- **docs/sample-resume.pdf** — Example printed resume (required for submission).

## Routing & Views

Routes are real URL paths driven by the History API. The Express catch-all returns `index.html` for any non-`/api` path so refreshes and direct hits resolve correctly.

- `/` — redirects (via `history.replaceState`) to `/dashboard` on first load.
- `/dashboard` — saved resumes list + "New resume" + "Edit profile data".
- `/profile/:tab` — tabbed forms per entity (`contact`, `summary`, `education`, `jobs`, `projects`, `skills`, `certs`, `awards`).
- `/builder/:id` — resume metadata + checklist tree (sections → items → bullets).
- `/preview/:id` — digital render; "Print / Save as PDF" triggers `window.print()`.

In-app links use `<a href="/path" data-spa>`; the router intercepts `data-spa` clicks (skipping new-tab modifiers) and calls `history.pushState`. Programmatic transitions after API calls use `navigate('/builder/' + id)` exported from `app.js`. Back/forward fires `popstate`, which re-runs the dispatcher.

PDF export is **Phase 1: `window.print()` + `@media print` CSS**. If fidelity fails, fall back to vendored `html2pdf.js` or server-side Puppeteer (see `implementation_plan.md`).

## AI Integration

- Endpoint: `POST /api/ai/review` — body `{sectionType, text}`, returns `{suggestions: string[]}`.
- Trigger: per-field "Review with AI" button (no auto-review on input).
- Frontend never auto-applies suggestions — user accepts/dismisses in a popover.
- Missing `GEMINI_API_KEY` → 400 with friendly message in popover. App still works without AI.

The assignment also requires a UI for users to supply their own Gemini key. Current implementation reads from `.env` only; the deviation is documented in `README.md` and `docs/ai-usage.md`.

## AI-Assisted Code

Per assignment policy, any code generated or substantially shaped by AI must be marked. Use a leading comment on the block:

```js
// AI: Generated with Claude Code — print stylesheet @media query for letter-size layout.
```

Keep the comment short. If a whole file was AI-generated, mark it once at the top.

`docs/ai-usage.md` indexes the AI workflow: tools used (Claude Code), rules file (this file), MCP servers (if any), and a list of significant AI contributions.

## Environment Configuration

- **Stages**: dev only (local). No staging/prod — see `DEV-WORKFLOW.md`.
- **Secrets**: `.env` file at repo root, gitignored. Keys: `GEMINI_API_KEY`.
- **Database**: `db/resume.db` (gitignored). Created on first boot from `db/schema.sql`.
- **Port**: `3000` by default. Override with `PORT=4000 npm start`.

`.env.example` is committed and shows the expected keys with empty values.

## Development Workflow

Trunk-based development (see `DEV-WORKFLOW.md`):
- `main` is always runnable; use short-lived `feature/`, `bugfix/`, `docs/` branches.
- All PRs must pass CI (lint + test) before merge.
- Feature flags / hidden views for incomplete work.

### Before Every Commit

```bash
npm run lint && npm test
```

Both must pass. Fix failures before staging files.

If UI changed, re-run Lighthouse on the affected view and confirm accessibility score is still ≥ 93. Update `docs/lighthouse.png` for the final submission.

## Git Conventions

### Branch Naming

Lowercase with hyphens, prefixed by type:

- `feature/` — new features (e.g., `feature/builder-checklist`)
- `bugfix/` — bug fixes (e.g., `bugfix/print-page-break`)
- `hotfix/` — critical fixes
- `release/` — release / submission tags
- `docs/` — documentation (e.g., `docs/ai-usage`)

Always delete local branches after they merge to `main`.

### Commit Messages ([Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/))

Format: `<type>[optional scope]: <description>`

Types: `feat`, `fix`, `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`

Breaking changes: append `!` after type/scope (e.g., `feat!: change resume schema`).

## Frontend / Templates

Always let the user review changes to `public/index.html` and any HTML fragments before committing. After editing, summarize what changed and wait for explicit approval before running `git commit`.

## Code Style

- **Bootstrap utilities only.** Do not add custom CSS rules. The single permitted exception is `public/css/print.css` (print layout). If a custom rule is unavoidable elsewhere, raise it explicitly — it must be added to the flagged-CSS list in `implementation_plan.md`.
- Vanilla JS, ES modules. **No React, Vue, jQuery, or other frameworks.**
- 4-space indentation, semicolons, double quotes (enforced by Prettier via `npm run fmt`).
- Express routes return JSON. No server-side rendering, no MVC layering.
- Keep `index.html` thin — JS and CSS live in modular files under `public/js/` and `public/css/`.
- Accessibility is non-negotiable: semantic landmarks, labeled inputs, keyboard navigability, focus management in modals, `prefers-reduced-motion` respected. Target Lighthouse a11y ≥ 93.

## Dependencies

- Package manager: `npm`.
- Production deps: `express`, `better-sqlite3`, `dotenv`, `@google/generative-ai`.
- Dev deps: `eslint`, `prettier`, a test runner (e.g., `node --test` or `vitest`).
- Always keep `package.json` and `package-lock.json` in sync (`npm install` regenerates the lock).
- **Always check for CVEs and security advisories** before installing or updating any package or GitHub Action (`npm audit`, GitHub Advisory Database).
- All third-party browser libraries (Bootstrap, etc.) must be **vendored** under `public/vendor/` — no `<script src="https://cdn..."></script>` references in `index.html`.

## Coding Conventions

- **Hungarian Notation**: Use Hungarian notation for variable naming. For example, a string variable like "String" will be named strFoo, a decimal/float like 0.75 will be named decBar, an sqlite connection will be named dbDatabase. **Exception**: variables that map directly to database columns (e.g. in route handlers binding request body fields to SQL columns) should match the column name exactly (e.g. `full_name`, `links_json`) to avoid cognitive overhead and keep DB mappings transparent.
- **camelCase**: Use camelCase when naming all variables
- **Async Javascript**: Prefer to use async await rather than .then() when performing asynchronous javascript functions
- **No Build Tools**: Avoid build tools such as Babel, Webpack, or Vite, unless it is explicitly required. Code must run either directly in the browser or via nodeJS
- **Dependencies**: Do not add external libraries such as jQuery without approval. Prefer native Web APIs
- **ECMAScript Version**: Target ES6+ features including arrow functions and template literals as well as promises
- **External Libraries Local**: All external libraries that are included must NOT use a CDN, but rather be included in project source files
- **Bootstrap Utility Classes**: Use only standard Bootstrap 5+ utility classes for layout, spacing, and colors. Avoid creating CSS classes or inline styles unless the design cannot be achieved without them
- **Comments**: Provide verbose comments to explain the flow of the code and anything that would be difficult for a beginner developer to understand

## Accessibility

- **Standards**: All user interfaces MUST meet WCAG 2.1+ accessibility standards
- **Alt tags**: All images must have an alt tag attribute that describes the image
- **Priority**: Prioritize accessibility over design
- **Aria Labels**: Include aria labels on all HTML form controls

## Project Structure

- **Entry Point**: All nodeJS applications must use server.js for entry point
- **API Routes**: All api routes must be included in the /api/ routing

## API Requirements

- **RESTful**: All api routes should be RESTful in design
- **UPDATE**: All UPDATE routes should use PUT rather than PATCH
- **DELETE**: DELETE routes should use URL parameters for primary key indicators
- **SELECT**: All user inputs for SELECT should be passed via URL query strings
- **CREATE**: All user inputs for CREATES should be passed as JSON body data
- **Input validation**: All user-passed inputs should be validated
- **SELECT RETURN**: All SELECT should return JSON arrays
- **Status Codes**: Every route must return appropriate HTTP status codes for both success and error

## DO NOT

- Do not hardcode credentials
- Do not intermix user inputs in queries, require prepared statements
- Do not skip input validation
- Do not leak error information to the end user, instead log it to the server's console

## Decision Guidelines

- Prefer simpler, less complex, and maintainable code
- Ask for clarification if uncertain
- **Keep everything in sync**: whenever a design decision changes, update all affected code, routes, schema, and docs (`CLAUDE.md`, `implementation_plan.md`, etc.) in the same commit. Never leave any file — code or doc — describing a design that no longer matches reality.

## Testing

- Ensure ALL GET API routes return JSON arrays
- Handle any missing input data with proper error messaging
- POST and PUT routes should validate all required fields
