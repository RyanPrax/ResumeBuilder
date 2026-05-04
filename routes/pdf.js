// AI: Generated with Claude Code — server-side PDF export via Puppeteer.
// Navigates headless Chromium to /preview/:id, waits for resume content to render,
// then calls page.pdf() with letter-size format and returns the buffer.
// Uses puppeteer-core (no bundled Chrome) — browser is auto-detected from common
// install locations or overridden via CHROMIUM_PATH in .env.

import { existsSync } from "fs";
import { Router } from "express";
import puppeteer from "puppeteer-core";
import db from "../lib/db.js";

const router = Router();

// Read PORT at request time so it matches whatever the server bound to.
const getPort = () => process.env.PORT || 3000;

// Resolve the Chrome/Chromium executable to use for PDF generation.
// Priority: CHROMIUM_PATH env var → common install locations (checked in order).
// Throws a descriptive error if no browser is found so the 500 response is informative.
function findChromiumPath() {
    if (process.env.CHROMIUM_PATH) return process.env.CHROMIUM_PATH;

    // Common install locations across Linux distros, macOS, and native Windows.
    // WSL2/ARM64 users should set CHROMIUM_PATH=/usr/bin/chromium in .env instead.
    const arrCandidates = [
        "/usr/bin/google-chrome-stable",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
        "/snap/bin/chromium",
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "/Applications/Chromium.app/Contents/MacOS/Chromium",
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
        "C:/Program Files/Chromium/Application/chrome.exe",
        "C:/Program Files (x86)/Chromium/Application/chrome.exe",
    ];

    const strFound = arrCandidates.find((strPath) => existsSync(strPath));
    if (strFound) return strFound;

    throw new Error(
        "No Chrome/Chromium found. Install Chrome or Chromium, or set CHROMIUM_PATH in .env. " +
            "See docs/special-instructions.md for platform-specific instructions.",
    );
}

// GET /api/pdf/:id — generate and stream a PDF for the given resume.
router.get("/:id", async (req, res) => {
    const strId = req.params.id?.trim();
    const intId = parseInt(strId, 10);

    // Validate the id is a positive integer before touching the DB or launching Chrome.
    if (!strId || isNaN(intId) || intId <= 0 || String(intId) !== strId) {
        return res
            .status(400)
            .json({ message: "id must be a positive integer" });
    }

    try {
        // Confirm the resume exists — gives a clean 404 without launching Chrome.
        const arrResume = db
            .prepare("SELECT id, name FROM resumes WHERE id = @id")
            .all({ id: intId });

        if (arrResume.length === 0) {
            return res.status(404).json({ message: "Resume not found" });
        }

        const strResumeName = arrResume[0].name ?? "resume";

        // Launch headless Chromium.
        // --no-sandbox / --disable-setuid-sandbox are required in WSL2 and most
        // containerised environments because user namespaces are not available.
        // --disable-dev-shm-usage prevents /dev/shm (64 MB default) from being
        // exhausted on systems with a small shared-memory partition.
        const browser = await puppeteer.launch({
            headless: true,
            executablePath: findChromiumPath(),
            args: [
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
            ],
        });

        try {
            const page = await browser.newPage();

            // Emulate print media before navigation so @media print rules apply
            // from first render — this hides the footer (border-top), navbar, and
            // other screen-only chrome that would otherwise bleed into the PDF.
            await page.emulateMediaType("print");

            // Letter-size viewport at 96 dpi keeps font and spacing consistent
            // with the on-screen preview (8.5 * 96 × 11 * 96).
            await page.setViewport({ width: 816, height: 1056 });

            // Navigate to the SPA preview view — the Express catch-all serves index.html
            // which then fetches all resume data and renders the DOM.
            // Use 127.0.0.1 explicitly — Chrome inside WSL2 may fail to resolve "localhost".
            const strUrl = `http://127.0.0.1:${getPort()}/preview/${intId}`;
            await page.goto(strUrl, {
                waitUntil: "networkidle0",
                timeout: 30000,
            });

            // Wait for the resume article to appear — confirms the JS data-fetch finished.
            await page.waitForSelector(".resume-page", {
                visible: true,
                timeout: 15000,
            });

            // page.pdf() triggers @media print, which applies print.css rules.
            // Margins stay zero here so @page margin in print.css remains the
            // single source of truth for per-page PDF margins.
            const bufPdf = await page.pdf({
                format: "Letter",
                margin: { top: "0", right: "0", bottom: "0", left: "0" },
                printBackground: false,
            });

            // Sanitize the resume name for use as a filename.
            const strFilename =
                strResumeName
                    .replace(/[^a-zA-Z0-9 _-]/g, "")
                    .replace(/\s+/g, "_")
                    .trim() || "resume";

            res.setHeader("Content-Type", "application/pdf");
            res.setHeader(
                "Content-Disposition",
                `attachment; filename="${strFilename}.pdf"`,
            );
            res.setHeader("Content-Length", bufPdf.length);
            res.status(200).send(Buffer.from(bufPdf));
        } finally {
            // Always close the browser so the Chrome process doesn't linger.
            await browser.close();
        }
    } catch (err) {
        console.error("GET /api/pdf/:id error:", err);
        res.status(500).json({ message: "Failed to generate PDF" });
    }
});

export default router;
