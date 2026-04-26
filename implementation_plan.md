# ResumeBuilder — Implementation Plan

## Context

CSC3100 final assignment: build a local SPA that helps students draft tailored resumes. Users persist a library of jobs/skills/certs/awards/etc., then pick which items go on a given resume targeted at a specific role. Gemini AI reviews user-entered prose. Output is a digital view + printable PDF. Stack is locked by the assignment doc (`CSC3100Final-ResumeBuilder.md`)

This plan covers the scaffolding, data model, API, SPA structure, AI integration, PDF export, PWA wrapper, and accessibility pass needed to satisfy the rubric.

---

PDF export **Phase 1: browser `window.print()` + `@media print` CSS.** Re-evaluate if fidelity insufficient.

AI review trigger: **On-demand "Review" button** per field/section.
Resume sections: Contact info **required**; Summary, Education, Jobs, Projects, Skills, Certifications, Awards all **optional and dynamic** per resume.

Saved resumes: **Named resume records** persisted in SQLite (history of generated resumes with selections).
Gemini key storage **`.env` only.** 

---

## Important things to note

- assignment requires UI for user-supplied Gemini key.
- accessability measured by Lighthouse a11y ≥ 93, manual UX pass, and consistent Bootstrap utility usage.
- **App name + iconography**: finalize before submission; placeholder used during dev.
- **"Special instructions"**: produced as part of README in final submission step.

---

## Tech constraints (from doc, non-negotiable)

- Frontend: HTML + CSS + vanilla JS. **No React/frameworks.** SPA — single `index.html`, show/hide DOM. Bootstrap utility classes. **No CDN** — all libs vendored locally.
- Backend: Node.js + Express **RESTful** APIs. **No MVC, no SSR.**
- DB: SQLite.
- Modular JS/CSS files (no monolithic `index.html`).
- AI: Generative AI for prose review (Gemini free tier).
- A11y: Lighthouse score ≥ 93. Documented with a screenshot.
- Submission: code, AI-use doc, GitHub repo link, sample PDF, install instructions, sharing-permission statement, candid/AI image of dev.

---

## Data model (SQLite)

Single-user local app — no auth.

```
contact            (id, full_name, email, phone, location, links_json, updated_at)
                   -- single-row table; pre-seed id=1
summary            (id, content, updated_at)
                   -- single-row table; optional content

educations         (id, institution, degree, field, start_date, end_date, gpa, details, sort_order)
jobs               (id, company, title, location, start_date, end_date, is_current, sort_order)
job_bullets        (id, job_id FK, text, sort_order)
projects           (id, name, link, description, start_date, end_date, sort_order)
project_bullets    (id, project_id FK, text, sort_order)
skill_categories   (id, name, sort_order)
skills             (id, category_id FK NULL, name, sort_order)
certifications     (id, name, issuer, issued_date, link, sort_order)
awards             (id, name, issuer, awarded_date, description, sort_order)

resumes            (id, name, target_role, created_at, updated_at)
resume_sections    (id, resume_id FK, section_type, included BOOL, sort_order)
                   -- section_type ∈ {contact,summary,education,jobs,projects,skills,certifications,awards}
resume_items       (id, resume_id FK, section_type, item_id, sort_order)
                   -- selected top-level items (job, project, etc.)
resume_bullets     (id, resume_id FK, parent_item_id, bullet_id, sort_order)
                   -- selected child bullets for jobs/projects
```

Use `better-sqlite3` (synchronous, fast for local single-user). Schema lives in `db/schema.sql`, applied on boot if DB missing.

---

## REST API surface

CRUD per resource (vanilla Express routers). Response = JSON.

```
GET    /api/contact                   PUT  /api/contact
GET    /api/summary                   PUT  /api/summary
GET    /api/educations                POST /api/educations
PUT    /api/educations/:id            DELETE /api/educations/:id
GET    /api/jobs                      POST /api/jobs
PUT    /api/jobs/:id                  DELETE /api/jobs/:id
GET    /api/jobs/:id/bullets          POST /api/jobs/:id/bullets
PUT    /api/job-bullets/:id           DELETE /api/job-bullets/:id
(... mirror for projects, project-bullets ...)
GET    /api/skill-categories          POST /api/skill-categories  (PUT/DELETE)
GET    /api/skills                    POST /api/skills            (PUT/DELETE)
GET    /api/certifications            POST /api/certifications    (PUT/DELETE)
GET    /api/awards                    POST /api/awards            (PUT/DELETE)

GET    /api/resumes                   POST /api/resumes
GET    /api/resumes/:id               PUT  /api/resumes/:id        DELETE /api/resumes/:id
PUT    /api/resumes/:id/selections    -- bulk upsert of sections/items/bullets

POST   /api/ai/review                 -- body: {sectionType, text}; returns {suggestions}
```

---

## Frontend SPA structure

Single `public/index.html` with skeleton: skip-link, `<header>`, `<main id="view-root">`, `<footer>`, credits modal. Views are JS modules that render into `#view-root` via `innerHTML` + delegated event listeners.

**Views:**
1. **Dashboard** — list of saved resumes + "New resume" + "Edit profile data".
2. **Profile** — tabbed forms for each entity (contact, summary, education, jobs, projects, skills, certs, awards). Each tab has list + add/edit/delete + reorder.
3. **Builder** — given a resume id: name + target role inputs, then a checklist tree (sections → items → bullets). "Review with AI" buttons attached to long-form text areas.
4. **Preview** — digital render of the resume using selections. "Print / Save as PDF" button triggers `window.print()`.
5. **Credits modal** — list of vendored libraries (Bootstrap, better-sqlite3, dotenv, @google/generative-ai). attribution required.

**Routing:** History API with real URL paths (`/dashboard`, `/profile/jobs`, `/builder/:id`, `/preview/:id`). Single `app.js` intercepts `<a data-spa>` clicks, calls `history.pushState`, listens for `popstate`, and dispatches to view modules. Programmatic transitions after API calls use a `navigate(path)` helper exported from `app.js`. Express adds a catch-all that returns `public/index.html` for any non-`/api` path so refreshes and deep links resolve to the SPA shell. The link-click interceptor honors new-tab modifiers (`Ctrl`/`Cmd`/`Shift`/middle-click, `target="_blank"`) so users keep native browser behaviors.

**Module layout:**
```
public/js/
  app.js              router + bootstrap
  api.js              thin fetch helpers
  pwa.js              service worker register + install prompt
  views/
    dashboard.js
    profile.js
    builder.js
    preview.js
  components/
    form-helpers.js   form binding utilities
    ai-review.js      "Review" button + suggestion popover
```

---

## AI integration

- `routes/ai.js`: `POST /api/ai/review` → reads `process.env.GEMINI_API_KEY`, calls Gemini via `@google/generative-ai`. Prompt template per section type (e.g., "Review this resume bullet for impact, action verbs, quantified results: {text}. Return 2-3 concise suggestions.").
- Frontend: `ai-review.js` attaches a button next to each prose textarea. Click → POST → render suggestions in a popover. User accepts/dismisses; suggestions never auto-write the field.
- Error handling: missing key → 400 with friendly message shown in popover. Rate-limit/network error → message + retry button.

---

## PDF export (phase 1)

- `public/css/print.css` — **custom CSS, flagged**. Targets `@media print`: hides app chrome, sets letter-size page, single-page resume layout, ATS-friendly type sizes, page-break rules.
- `Preview` view applies a `body.print-preview` class for an on-screen approximation.
- "Save as PDF" button calls `window.print()`; user picks "Save as PDF" in the browser dialog.
- Fallback path (only if fidelity fails): vendored `html2pdf.js` or server-side Puppeteer. Re-evaluate after first end-to-end test.

---

## PWA

- `public/manifest.webmanifest` — name, short_name, icons (192, 512, maskable), theme_color, background_color, display: standalone, start_url `/`.
- `public/service-worker.js` — cache app shell (`index.html`, vendored CSS/JS, view modules, icons) on install; network-first for `/api/*`. Navigation requests (any non-`/api` path) fall back to cached `index.html` when offline so History API deep links (e.g. `/builder/5`) keep working without a network round-trip. Versioned cache name for upgrades.
- `pwa.js` registers SW, surfaces install prompt via `beforeinstallprompt`.
- Icons: vendored PNGs in `public/icons/` plus `favicon.ico` and `apple-touch-icon.png`.

---

## Accessibility (target Lighthouse ≥ 93)

- Semantic landmarks (`header`, `nav`, `main`, `footer`).
- Skip-link to `#view-root`.
- All form inputs labeled; required fields marked with `aria-required`.
- Modals trap focus; ESC closes.
- Color contrast checked against Bootstrap default tokens; override only if needed (flagged custom CSS).
- `prefers-reduced-motion` respected.
- Keyboard navigability for the builder checklist tree.
- Lighthouse run after each major view ships; screenshot at end.

---

## Project structure

```
/
├── server.js                     express bootstrap, static + /api routes
├── package.json
├── .env.example                  GEMINI_API_KEY=
├── .env                          (gitignored)
├── .gitignore                    .env, node_modules, db/*.sqlite
├── README.md                     run/install + AI usage + sharing statement + Lighthouse
├── implementation_plan.md        this plan
├── docs/
│   ├── ai-usage.md               MCP, tools, comments index
│   ├── lighthouse.png            a11y ≥ 93 evidence
│   └── sample-resume.pdf         example of "good" resume
├── db/
│   ├── schema.sql
│   └── resume.db                 (gitignored)
├── lib/
│   ├── db.js                     better-sqlite3 connection + migration runner
│   └── gemini.js                 prompt templates + API wrapper
├── routes/
│   ├── contact.js  summary.js  educations.js  jobs.js  projects.js
│   ├── skills.js   certifications.js  awards.js  resumes.js  ai.js
└── public/
    ├── index.html                SPA shell
    ├── manifest.webmanifest
    ├── service-worker.js
    ├── favicon.ico
    ├── icons/
    ├── vendor/                   bootstrap CSS+JS (no CDN)
    ├── css/
    │   └── print.css             custom CSS, flagged
    └── js/
        ├── app.js  api.js  pwa.js
        ├── views/                dashboard.js  profile.js  builder.js  preview.js
        └── components/           form-helpers.js  ai-review.js
```

---

## Implementation phases

1. **Scaffold** — `npm init`, deps (`express`, `better-sqlite3`, `dotenv`, `@google/generative-ai`), `.gitignore`, `.env.example`, vendored Bootstrap, `server.js` (with non-`/api` catch-all → `index.html`), `index.html` shell with History API router.
2. **DB layer** — `schema.sql`, `lib/db.js`, migration on boot.
3. **CRUD APIs** — contact, summary, education, jobs (+bullets), projects (+bullets), skills (+categories), certs, awards.
4. **Profile view** — tabs for each entity, forms backed by APIs.
5. **Resumes API + Dashboard view** — list/create/rename/delete resumes.
6. **Builder view** — selection tree (sections → items → bullets), persist via `/api/resumes/:id/selections`.
7. **Preview view** — digital render from saved selections.
8. **Print stylesheet** — `print.css` for `window.print()` PDF export. *Custom CSS — flagged.*
9. **AI integration** — `/api/ai/review`, `ai-review.js` button + popover.
10. **PWA** — manifest, service worker, icons, install prompt.
11. **A11y pass** — semantic markup audit, focus management, Lighthouse run, screenshot.
12. **Branding** — final name + favicon + icons, replace placeholder.
13. **Credits modal** — attribution required
14. **Submission package** — README, AI usage doc, sample PDF, Lighthouse screenshot, sharing statement, dev image.

---

## Critical files to create

- `server.js` — Express app, static `public/`, mount routers under `/api`, plus a catch-all (`app.get(/^(?!\/api).*/, ...)`) that returns `public/index.html` for History API deep links.
- `db/schema.sql` — schema above.
- `lib/db.js`, `lib/gemini.js`.
- `routes/*.js` — one router per resource.
- `public/index.html` — SPA shell, vendored CSS/JS links, manifest link, SW registration.
- `public/js/app.js` — History API router (`pushState` + `popstate` + `<a data-spa>` click interceptor) + view dispatch + exported `navigate(path)` helper.
- `public/js/views/*.js` — four views.
- `public/css/print.css` — print rules (flagged custom CSS).
- `public/manifest.webmanifest`, `public/service-worker.js`.

---

## Verification

End-to-end manual tests:
1. `npm start` → `http://localhost:3000` loads dashboard. Direct hit on `http://localhost:3000/builder/1` (after creating a resume) loads the builder view via the catch-all → SPA route resolution. Refresh on any view stays on that view. Browser back/forward cycles through visited views.
2. Profile tab → add a job + 3 bullets → reload → data persists (proves SQLite + API).
3. New resume → name + target role → builder lets you toggle sections, pick a job, pick 2 of its 3 bullets → save.
4. Preview view shows the resume with only selected items.
5. `Ctrl+P` or "Save as PDF" → print preview matches expected layout (single page if content fits).
6. Click "Review with AI" on a job bullet (with valid `GEMINI_API_KEY` in `.env`) → suggestions appear.
7. Without `.env` key → graceful error, app still works.
8. Lighthouse desktop run → accessibility ≥ 93. Screenshot to `docs/lighthouse.png`.
9. PWA: Chrome DevTools → Application → manifest valid, SW registered. Install prompt fires. Offline reload of app shell works (API calls fail gracefully).
10. `git status` confirms `.env` and `db/resume.db` not tracked.
11. Browser-print sample resume saved as `docs/sample-resume.pdf` for submission.

---

## Constraints / assumptions stated in doc

- Single user, runs locally — no auth, no multi-tenancy.
- Public GitHub repo required.
- All libraries vendored, no CDN.
- No React/frameworks; no MVC; no SSR.
- AI usage documented; comments mark AI-assisted code.
- Submission deliverables
