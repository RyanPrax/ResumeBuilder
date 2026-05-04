# Special Instructions

Resume Frog is designed to run locally. It uses Node.js, Express, SQLite, and a browser-based single page application.

## Requirements

- Node.js `20.19.0` or newer
- npm
- Google Chrome or Chromium if you want to use PDF export
- Optional: a Google Gemini API key if you want AI resume review suggestions

## Install

From the project root:

```bash
npm install
```

## Run

Start the local server:

```bash
npm start
```

Then open:

```text
http://localhost:3000
```

The SQLite database is created automatically at `db/resume.db` the first time the app starts.

To use a different port:

```bash
PORT=4000 npm start
```

## Optional Environment Variables

Create a `.env` file in the project root if needed:

```text
GEMINI_API_KEY=your_api_key_here
CHROMIUM_PATH=/path/to/chrome-or-chromium
```

`GEMINI_API_KEY` enables the "Review with AI" feature. The rest of the app still works without it.

`CHROMIUM_PATH` is only needed when PDF export cannot automatically find Chrome or Chromium. See the PDF Export section below for platform-specific examples.

Do not commit `.env`; it is intended for local secrets only.

## Demo Data

To load sample resume data:

```bash
npm run seed
```

To delete the local database:

```bash
npm run clean
```

The database will be recreated on the next `npm start`.

## PDF Export

The "Download PDF" feature uses `puppeteer-core`, which does not bundle Chrome. Install Google Chrome or Chromium on the machine running the app.

The app automatically checks common Chrome/Chromium locations on Linux, macOS, and native Windows. If PDF export does not work, set `CHROMIUM_PATH` in `.env` to the browser path for your OS:

```text
# Linux / WSL2
CHROMIUM_PATH=/usr/bin/chromium

# macOS
CHROMIUM_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

# Windows
CHROMIUM_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"
```

On WSL2 ARM64, install Linux Chromium inside WSL2 and use the Linux/WSL2 path above.

The app checks these browser paths automatically before requiring `CHROMIUM_PATH`:

- `/usr/bin/google-chrome-stable`
- `/usr/bin/google-chrome`
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`
- `/snap/bin/chromium`
- `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`
- `/Applications/Chromium.app/Contents/MacOS/Chromium`
- `C:/Program Files/Google/Chrome/Application/chrome.exe`
- `C:/Program Files (x86)/Google/Chrome/Application/chrome.exe`
- `C:/Program Files/Chromium/Application/chrome.exe`
- `C:/Program Files (x86)/Chromium/Application/chrome.exe`

If PDF export returns `500 Failed to generate PDF`, check that Chrome or Chromium is installed and set `CHROMIUM_PATH` if the browser is installed somewhere custom.

## Verification Commands

Run automated tests:

```bash
npm test
```

Run lint checks:

```bash
npm run lint
```
