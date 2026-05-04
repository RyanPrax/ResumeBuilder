// Tests for GET /api/pdf/:id.
// Validation and 404 paths are covered without launching Chromium.
// The success path (200 PDF) requires a live server + Chromium and is intentionally
// excluded from this unit-test suite — verify it manually via the browser.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import router from "../routes/pdf.js";

let server;
let strBaseUrl;

before(async () => {
    const app = express();
    app.use(express.json());
    app.use("/", router);
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    strBaseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
});

// Validation — these reject before touching Puppeteer or the DB.

test("GET /api/pdf/:id — returns 400 for non-numeric id", async () => {
    const res = await fetch(`${strBaseUrl}/abc`);
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /positive integer/i);
});

test("GET /api/pdf/:id — returns 400 for id=0", async () => {
    const res = await fetch(`${strBaseUrl}/0`);
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /positive integer/i);
});

test("GET /api/pdf/:id — returns 400 for negative id", async () => {
    const res = await fetch(`${strBaseUrl}/-1`);
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /positive integer/i);
});

// 404 — valid format, no such resume in DB, Puppeteer never launches.

test("GET /api/pdf/:id — returns 404 for unknown resume id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`);
    assert.equal(res.status, 404);
    const objBody = await res.json();
    assert.match(objBody.message, /not found/i);
});
