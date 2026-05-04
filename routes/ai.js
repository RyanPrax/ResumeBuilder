// RESTful router for AI review endpoint.
//
// Routes:
//   POST /api/ai/review — validate body fields, scan for prompt injection, check GEMINI_API_KEY env var,
//                         call lib/gemini.js reviewSection(), return { suggestions: string[] }
//
// Fails fast with 400 if GEMINI_API_KEY is missing so the frontend can show a friendly message
// without ever attempting a network call to Gemini.

import { Router } from "express";
import { reviewSection, getActiveApiKey } from "../lib/gemini.js";

const router = Router();

// ---------------------------------------------------------------------------
// Layer 1: Deterministic prompt injection detection
// ---------------------------------------------------------------------------

// Maximum character length for user-supplied resume text.
// Resume prose is never legitimately this long; a hard cap prevents
// oversized payloads from exhausting tokens or hiding injections in bulk text.
const MAX_TEXT_LENGTH = 5000;

// Explicit instruction-override phrases that have no place in legitimate resume prose.
// Each pattern targets a well-known injection technique:
//   - "ignore/disregard/forget previous instructions" — direct override attempts
//   - "you are now [X] mode" — persona/mode switching (DAN, developer mode, etc.)
//   - "system prompt / system override" — attempts to reference or replace the system context
//   - "reveal … prompt/instructions" — exfiltration attempts
//   - "bypass safety/filter" — explicit guard bypass
//   - "jailbreak" — catch-all for this common keyword
//   - "new instructions:" — inline instruction injection marker
const INJECTION_PATTERNS = [
    /ignore\s+(all\s+)?(the\s+)?previous\s+instructions?/i,
    /disregard\s+(all\s+)?(the\s+)?previous\s+instructions?/i,
    /forget\s+(all\s+)?(the\s+)?previous\s+instructions?/i,
    /you\s+are\s+now\s+(?:in\s+)?(?:developer|jailbreak|dan|god)\s+mode/i,
    /system\s+(?:prompt|override)/i,
    /reveal\s+(?:your\s+)?(?:system\s+)?(?:prompt|instructions?)/i,
    /bypass\s+(?:safety|filter|restriction|guard)/i,
    /jailbreak/i,
    /new\s+instructions?\s*:/i,
];

// Zero-width and invisible Unicode characters (U+200B–U+200F, U+2028, U+2029, U+FEFF)
// are a common obfuscation technique used to split injection keywords across visible
// characters so they evade simple string matching (e.g. "ig" + U+200B + "nore").
// eslint-disable-next-line no-misleading-character-class
const ZERO_WIDTH_REGEX = /[\u200B\u200C\u200D\u200E\u200F\u2028\u2029\uFEFF]/;

/**
 * Scans text for prompt injection signals.
 * Returns a reason string if an issue is found, or null if the text is clean.
 * The reason is for server-side logging only — never sent to the client.
 */
function detectInjection(strText) {
    if (strText.length > MAX_TEXT_LENGTH) {
        return `text length ${strText.length} exceeds maximum ${MAX_TEXT_LENGTH}`;
    }
    if (ZERO_WIDTH_REGEX.test(strText)) {
        return "text contains zero-width/invisible Unicode characters";
    }
    for (const pattern of INJECTION_PATTERNS) {
        if (pattern.test(strText)) {
            return `matched injection pattern: ${pattern}`;
        }
    }
    return null;
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

// Allowed sectionType values — must stay in sync with the AiReviewInput enum
// in lib/swagger.js and the SECTION_FOCUS keys in lib/gemini.js. Any other
// value is rejected with 400 so the API never forwards unsupported sections
// to Gemini without section-specific guidance.
const ALLOWED_SECTION_TYPES = new Set([
    "contact",
    "summary",
    "education",
    "jobs",
    "projects",
    "skills",
    "certifications",
    "awards",
]);

router.post("/review", async (req, res) => {
    const sectionType =
        typeof req.body.sectionType === "string"
            ? req.body.sectionType.trim()
            : null;
    const text =
        typeof req.body.text === "string" ? req.body.text.trim() : null;

    if (!sectionType) {
        return res.status(400).json({ message: "sectionType is required" });
    }
    if (!ALLOWED_SECTION_TYPES.has(sectionType)) {
        return res
            .status(400)
            .json({ message: `Invalid sectionType: ${sectionType}` });
    }
    if (!text) {
        return res.status(400).json({ message: "text is required" });
    }

    // Run injection scan before touching the API key or calling Gemini.
    // Log the specific reason server-side; send only a generic message to the client
    // so as not to reveal which pattern was matched.
    const strInjectionReason = detectInjection(text);
    if (strInjectionReason) {
        console.warn(
            "POST /api/ai/review — injection attempt blocked:",
            strInjectionReason,
        );
        return res
            .status(400)
            .json({ message: "Input contains disallowed content" });
    }

    // Check DB-stored key first, then fall back to env — mirrors getActiveApiKey() priority logic
    if (!getActiveApiKey()) {
        return res.status(400).json({
            message:
                "AI review is not available — GEMINI_API_KEY is not configured",
        });
    }

    try {
        const arrSuggestions = await reviewSection(sectionType, text);
        res.status(200).json({ suggestions: arrSuggestions });
    } catch (err) {
        console.error("POST /api/ai/review error:", err);
        res.status(500).json({ message: "Failed to get AI review" });
    }
});

export default router;
