# Development Workflow (Trunk-Based Development)

This repository uses Trunk-Based Development. `main` is the single long-lived branch and must always be runnable.

For setup and run instructions, see README.md.

---

## Branching Strategy

- Long-lived branch: `main` only.
- Short-lived branches: create from `main` for each change.
- Branch naming convention (lowercase with hyphens):
  - `feature/` — new features
  - `bugfix/` — bug fixes
  - `hotfix/` — critical fixes
  - `release/` — release prep / submission tags
  - `docs/` — documentation
- Keep branches small and short-lived (merge within hours/days).
- Merge into `main` only via Pull Requests.
- Delete local branches after they merge.

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):

```
<type>[optional scope]: <description>
```

Types: `feat`, `fix`, `build`, `chore`, `ci`, `docs`, `style`, `refactor`, `perf`, `test`

Breaking changes: append `!` after type/scope (e.g., `feat!: change resume schema`).

---

## PR Rules

- All PRs target `main`.
- Every PR must pass CI/CD before merge
- Small, focused changes (single responsibility).
- Incomplete behavior gated behind a feature flag or hidden view.

---

## Environments

This is a **local-only** application — there is no staging or production deployment.
SQLite file lives next to the app (`db/resume.db`, gitignored).

---

## PR Checklist

- [ ] Branch created from `main` with correct naming prefix.
- [ ] Commit messages follow Conventional Commits.
- [ ] Small, focused changes (single responsibility).
- [ ] Tests pass locally and in CI
- [ ] Lint passes
- [ ] No CDN-loaded libraries — all vendored under `public/vendor/`.
- [ ] No secrets committed (`.env`, API keys).
- [ ] AI-assisted code blocks have `// AI:` comments per the AI-usage policy.
- [ ] Lighthouse accessibility still ≥ 93 if UI changed (re-run for affected views).

---

## Working Locally

1. Create a short-lived branch from `main`:
   ```bash
   git checkout -b feature/short-descr main
   ```

2. Small commits and push:
   ```bash
   git add <files>
   git commit -m "feat: short, descriptive message"
   git push -u origin feature/short-descr
   ```

3. Open a PR to `main`. Wait for CI. Merge when green.

---

## Running and Testing Locally

Prerequisites:
- Node.js (LTS)
- npm

```bash
npm install

# Optional: copy and fill in your Gemini API key
cp .env.example .env

# Start the app (creates SQLite DB on first run)
npm start
# Visit http://localhost:3000
```

Local secrets (gitignored):
- `.env` — `GEMINI_API_KEY=...`

---

## CI / Status Checks

Workflow: `.github/workflows/ci.yaml` — runs on every push and PR.
- Lint (`npm run lint`)
- Unit tests (`npm test`)

Set branch protection on `main` to require the `ci` job before merging.

---

## Best Practices

- Keep PRs small and well-scoped.
- Bootstrap utility classes only.
- All libraries vendored under `public/vendor/` — no CDNs (assignment requirement).
- Run `npm test` and `npm run lint` before pushing.
- Use descriptive PR titles and link related issues.

For further details, see README.md.
