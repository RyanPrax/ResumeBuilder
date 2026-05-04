// AI: Generated with Claude Code — settings route for user-managed Gemini API key.
//
// Routes:
//   GET    /api/settings/api-key — returns [{ has_key: boolean }]; never exposes the raw key value
//   PUT    /api/settings/api-key — stores the key; body { api_key: string }
//   DELETE /api/settings/api-key — clears the stored key

import { Router } from "express";
import db from "../lib/db.js";

const router = Router();

// Gemini API keys can vary in length; 500 chars is a generous upper bound
const INT_MAX_KEY_LENGTH = 500;

// ---------------------------------------------------------------------------
// GET /api/settings/api-key
// Returns whether a key is stored — never the key itself.
// ---------------------------------------------------------------------------
router.get("/api-key", (req, res) => {
    try {
        // Always use .all() per project convention, even for singleton rows
        const arrRows = db
            .prepare("SELECT gemini_api_key FROM settings WHERE id = 1")
            .all();
        const strKey = (arrRows[0]?.gemini_api_key ?? "").trim();
        res.status(200).json([{ has_key: strKey.length > 0 }]);
    } catch (err) {
        console.error("GET /api/settings/api-key error:", err);
        res.status(500).json({ message: "Failed to retrieve API key status" });
    }
});

// ---------------------------------------------------------------------------
// PUT /api/settings/api-key
// Stores a new key. Validates presence and length before writing.
// ---------------------------------------------------------------------------
router.put("/api-key", (req, res) => {
    const strApiKey =
        typeof req.body.api_key === "string" ? req.body.api_key.trim() : null;

    if (!strApiKey) {
        return res.status(400).json({
            message: "api_key is required and must be a non-empty string",
        });
    }
    if (strApiKey.length > INT_MAX_KEY_LENGTH) {
        return res.status(400).json({
            message: `api_key must not exceed ${INT_MAX_KEY_LENGTH} characters`,
        });
    }

    try {
        db.prepare("UPDATE settings SET gemini_api_key = ? WHERE id = 1").run(
            strApiKey,
        );
        res.status(200).json([{ has_key: true }]);
    } catch (err) {
        console.error("PUT /api/settings/api-key error:", err);
        res.status(500).json({ message: "Failed to save API key" });
    }
});

// ---------------------------------------------------------------------------
// DELETE /api/settings/api-key
// Clears the stored key, falling back to .env on next AI review request.
// ---------------------------------------------------------------------------
router.delete("/api-key", (req, res) => {
    try {
        db.prepare(
            "UPDATE settings SET gemini_api_key = '' WHERE id = 1",
        ).run();
        res.status(200).json([{ has_key: false }]);
    } catch (err) {
        console.error("DELETE /api/settings/api-key error:", err);
        res.status(500).json({ message: "Failed to clear API key" });
    }
});

export default router;
