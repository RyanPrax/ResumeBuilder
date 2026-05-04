// Tests for GET /api/contact and PUT /api/contact.
// Contact is a singleton row (id = 1) seeded by schema.sql.
// The PUT tests save and restore the original row so they leave no lasting changes.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import router from "../routes/contact.js";
import db from "../lib/db.js";

let server;
let strBaseUrl;
let objOriginalContact;

before(async () => {
    // Save the existing contact row so PUT tests can restore it afterwards.
    objOriginalContact = db.prepare("SELECT * FROM contact WHERE id = 1").get();

    const app = express();
    app.use(express.json());
    app.use("/", router);
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    strBaseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
    // Restore original contact data so other tests and the app see a clean state.
    if (objOriginalContact) {
        db.prepare(
            "UPDATE contact SET full_name = @full_name, email = @email, phone = @phone, location = @location, links_json = @links_json WHERE id = 1"
        ).run(objOriginalContact);
    }
});

// GET

test("GET /api/contact — returns 200 and a JSON array", async () => {
    const res = await fetch(`${strBaseUrl}/`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody), "body must be a JSON array");
});

test("GET /api/contact — array contains exactly one element (singleton row)", async () => {
    const res = await fetch(`${strBaseUrl}/`);
    const arrBody = await res.json();
    assert.equal(arrBody.length, 1, "contact table should always have exactly one row");
});

test("GET /api/contact — links_json is returned as an array not a raw JSON string", async () => {
    const res = await fetch(`${strBaseUrl}/`);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody[0].links_json), "links_json should be parsed to an array before responding");
});

// PUT — validation errors

test("PUT /api/contact — returns 400 when links_json is not an array", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links_json: "not-an-array" }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /links_json/i);
});

test("PUT /api/contact — returns 400 when a link is missing url", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links_json: [{ label: "GitHub" }] }),
    });
    assert.equal(res.status, 400);
});

test("PUT /api/contact — returns 400 when a link is missing label", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links_json: [{ url: "https://example.com" }] }),
    });
    assert.equal(res.status, 400);
});

test("PUT /api/contact — returns 400 when a link has an empty label", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links_json: [{ label: "  ", url: "https://example.com" }] }),
    });
    assert.equal(res.status, 400);
});

// PUT — success

test("PUT /api/contact — returns 200 with valid body and populated links", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            full_name: "Test User",
            email: "test@example.com",
            phone: "555-0000",
            location: "Test City, TS",
            links_json: [{ label: "GitHub", url: "https://github.com/test" }],
        }),
    });
    assert.equal(res.status, 200);
});

test("PUT /api/contact — returns 200 with empty links_json array", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ links_json: [] }),
    });
    assert.equal(res.status, 200);
});
