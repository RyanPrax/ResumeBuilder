// AI: Generated with Claude Code — unit tests for GET/PUT/DELETE /api/settings/api-key.
// Also tests getActiveApiKey() priority logic (DB key > env key).
// Uses a real SQLite DB — no mocking per project convention.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import router from "../routes/settings.js";
import { getActiveApiKey } from "../lib/gemini.js";
import db from "../lib/db.js";

let server;
let strBaseUrl;

before(async () => {
    const app = express();
    app.use(express.json());
    app.use("/", router);
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const { port } = server.address();
    strBaseUrl = `http://127.0.0.1:${port}`;

    // Ensure the settings row exists and starts clean for this test run
    db.prepare("UPDATE settings SET gemini_api_key = '' WHERE id = 1").run();
});

after(async () => {
    // Leave DB in clean state for other test files
    db.prepare("UPDATE settings SET gemini_api_key = '' WHERE id = 1").run();
    await new Promise((resolve) => server.close(resolve));
});

// ---------------------------------------------------------------------------
// GET /api-key — status checks
// ---------------------------------------------------------------------------

test("GET /api/settings/api-key — returns array with has_key false when no key stored", async () => {
    const res = await fetch(`${strBaseUrl}/api-key`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody), "response should be an array");
    assert.equal(arrBody[0].has_key, false);
});

test("GET /api/settings/api-key — returns has_key true after a key is stored", async () => {
    // Store a key directly so we can test GET independently
    db.prepare("UPDATE settings SET gemini_api_key = 'AIzaTestKey123' WHERE id = 1").run();

    const res = await fetch(`${strBaseUrl}/api-key`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.equal(arrBody[0].has_key, true);

    // Cleanup
    db.prepare("UPDATE settings SET gemini_api_key = '' WHERE id = 1").run();
});

// ---------------------------------------------------------------------------
// PUT /api-key — store key
// ---------------------------------------------------------------------------

test("PUT /api/settings/api-key — returns 200 and has_key true on success", async () => {
    const res = await fetch(`${strBaseUrl}/api-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: "AIzaTestKeyABC" }),
    });
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody[0].has_key, true);

    // Verify it was actually written to the DB
    const arrRows = db.prepare("SELECT gemini_api_key FROM settings WHERE id = 1").all();
    assert.equal(arrRows[0].gemini_api_key, "AIzaTestKeyABC");

    // Cleanup
    db.prepare("UPDATE settings SET gemini_api_key = '' WHERE id = 1").run();
});

test("PUT /api/settings/api-key — returns 400 when api_key is missing", async () => {
    const res = await fetch(`${strBaseUrl}/api-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /api_key/);
});

test("PUT /api/settings/api-key — returns 400 when api_key is empty string", async () => {
    const res = await fetch(`${strBaseUrl}/api-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: "   " }),
    });
    assert.equal(res.status, 400);
});

test("PUT /api/settings/api-key — returns 400 when api_key exceeds 500 characters", async () => {
    const res = await fetch(`${strBaseUrl}/api-key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: "A".repeat(501) }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /500/);
});

// ---------------------------------------------------------------------------
// DELETE /api-key — clear key
// ---------------------------------------------------------------------------

test("DELETE /api/settings/api-key — clears stored key and returns has_key false", async () => {
    // Pre-store a key to clear
    db.prepare("UPDATE settings SET gemini_api_key = 'AIzaKeyToDelete' WHERE id = 1").run();

    const res = await fetch(`${strBaseUrl}/api-key`, { method: "DELETE" });
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody[0].has_key, false);

    // Verify DB was cleared
    const arrRows = db.prepare("SELECT gemini_api_key FROM settings WHERE id = 1").all();
    assert.equal(arrRows[0].gemini_api_key, "");
});

// ---------------------------------------------------------------------------
// getActiveApiKey() — priority logic
// ---------------------------------------------------------------------------

test("getActiveApiKey — returns DB key when both DB and env are set", () => {
    const strSavedEnv = process.env.GEMINI_API_KEY;
    db.prepare("UPDATE settings SET gemini_api_key = 'DBKey' WHERE id = 1").run();
    process.env.GEMINI_API_KEY = "EnvKey";

    const strResult = getActiveApiKey();
    assert.equal(strResult, "DBKey");

    // Cleanup
    db.prepare("UPDATE settings SET gemini_api_key = '' WHERE id = 1").run();
    if (strSavedEnv !== undefined) {
        process.env.GEMINI_API_KEY = strSavedEnv;
    } else {
        delete process.env.GEMINI_API_KEY;
    }
});

test("getActiveApiKey — falls back to env key when DB key is empty", () => {
    const strSavedEnv = process.env.GEMINI_API_KEY;
    db.prepare("UPDATE settings SET gemini_api_key = '' WHERE id = 1").run();
    process.env.GEMINI_API_KEY = "EnvFallbackKey";

    const strResult = getActiveApiKey();
    assert.equal(strResult, "EnvFallbackKey");

    // Cleanup
    if (strSavedEnv !== undefined) {
        process.env.GEMINI_API_KEY = strSavedEnv;
    } else {
        delete process.env.GEMINI_API_KEY;
    }
});

test("getActiveApiKey — returns empty string when neither DB nor env has a key", () => {
    const strSavedEnv = process.env.GEMINI_API_KEY;
    db.prepare("UPDATE settings SET gemini_api_key = '' WHERE id = 1").run();
    delete process.env.GEMINI_API_KEY;

    const strResult = getActiveApiKey();
    assert.equal(strResult, "");

    // Cleanup
    if (strSavedEnv !== undefined) {
        process.env.GEMINI_API_KEY = strSavedEnv;
    }
});
