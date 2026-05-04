# Resume Frog

A local single-page application for building tailored resumes. Store a library of jobs, projects, skills, certifications, and awards — then assemble a targeted resume for each role. Google Gemini AI reviews your prose on demand.

Built for the CSC3100 final project.

---

## Requirements

- Node.js `20.19.0` or newer
- npm
- Google Chrome or Chromium (required for PDF export only)
- Optional: a [Google Gemini API key](https://aistudio.google.com/app/apikey) for AI resume review

---

## Install

```bash
npm install
```

---

## Run

```bash
npm start
```

Open `http://localhost:3000` in your browser.

The SQLite database is created automatically at `db/resume.db` on first boot.

To run on a different port:

```bash
PORT=4000 npm start
```

---

## Optional Environment Variables

Create a `.env` file at the project root:

```text
GEMINI_API_KEY=your_api_key_here
CHROMIUM_PATH=/path/to/chrome-or-chromium
```

- `GEMINI_API_KEY` — enables "Review with AI". The rest of the app works without it. You can also store a key from the in-app Settings screen; the database key takes priority over the `.env` key.
- `CHROMIUM_PATH` — only needed if PDF export cannot find Chrome automatically. See [PDF Export](#pdf-export) below.

Do **not** commit `.env`. It is gitignored.

---

## Demo Data

Load sample resume data:

```bash
npm run seed
```

Delete the local database (recreated on next start):

```bash
npm run clean
```

---

## PDF Export

PDF export uses `puppeteer-core`, which does **not** bundle Chrome. Install Google Chrome or Chromium on the machine running the app.

The app auto-detects Chrome/Chromium at common locations. If export fails, set `CHROMIUM_PATH` in `.env`:

```text
# Linux / WSL2
CHROMIUM_PATH=/usr/bin/chromium

# macOS
CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Windows
CHROMIUM_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"
```

Auto-detected paths (checked in order):

- `/usr/bin/google-chrome-stable`
- `/usr/bin/google-chrome`
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/snap/bin/chromium`
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`
- `C:/Program Files/Google/Chrome/Application/chrome.exe`
- `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`

If PDF export returns a 500 error, verify Chrome is installed and set `CHROMIUM_PATH` if it is in a non-standard location.

---

## Development Commands

```bash
npm test       # run automated tests (node:test)
npm run lint   # ESLint
npm run fmt    # Prettier
```

All tests must pass before every commit.

---

## AI Usage

See [`docs/ai-usage.md`](docs/ai-usage.md) for a full summary of how AI was used during development, including the rules file, tools, and a list of significant AI-assisted contributions.

In-code AI contributions are marked with a leading comment:

```js
// AI: Generated with Claude Code — <description>
```

---

## Vendored Libraries

All third-party browser libraries are vendored under `public/vendor/` — no CDN references. Attribution is available via the **Credits** link in the app footer.

- [Bootstrap](https://getbootstrap.com/) — MIT License
- [@google/generative-ai](https://www.npmjs.com/package/@google/generative-ai) — Apache 2.0
- [better-sqlite3](https://github.com/WiseLibs/better-sqlite3) — MIT License
- [dotenv](https://github.com/motdotla/dotenv) — BSD-2-Clause
- [express](https://expressjs.com/) — MIT License
- [puppeteer-core](https://pptr.dev/) — Apache 2.0
