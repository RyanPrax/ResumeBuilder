// Tests for GET/POST/PUT/DELETE /api/summary.
// Note: label and content are both optional — POST always succeeds if the body is valid JSON.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import router from "../routes/summary.js";
import db from "../lib/db.js";

let server;
let strBaseUrl;
let intTestId = null;

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
    if (intTestId !== null) {
        db.prepare("DELETE FROM summaries WHERE id = @id").run({
            id: intTestId,
        });
    }
});

// GET

test("GET /api/summary — returns 200 and a JSON array", async () => {
    const res = await fetch(`${strBaseUrl}/`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody), "body must be a JSON array");
});

test("GET /api/summary/:id — returns 200 and empty array for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 0);
});

// POST — success (no required fields, both label and content default to empty string)

test("POST /api/summary — returns 201 with empty body", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });
    assert.equal(res.status, 201);
    const objBody = await res.json();
    assert.ok(objBody.id);
    intTestId = objBody.id;
});

// GET by id

test("GET /api/summary/:id — returns 200 and array with the created record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 1);
});

// POST — with content

test("POST /api/summary — returns 201 with label and content populated", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            label: "SWE Role",
            content: "Experienced software engineer.",
        }),
    });
    assert.equal(res.status, 201);
    const objBody = await res.json();
    // Clean up this extra record immediately via the API
    await fetch(`${strBaseUrl}/${objBody.id}`, { method: "DELETE" });
});

// PUT — validation

test("PUT /api/summary/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: "Updated" }),
    });
    assert.equal(res.status, 404);
});

// PUT — success

test("PUT /api/summary/:id — returns 200 with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            label: "Updated Label",
            content: "Updated content.",
        }),
    });
    assert.equal(res.status, 200);
});

// DELETE

test("DELETE /api/summary/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, { method: "DELETE" });
    assert.equal(res.status, 404);
});

test("DELETE /api/summary/:id — removes orphaned resume_items rows", async () => {
    // Insert a fresh summary and a resume selection pointing at it
    const objSummary = db
        .prepare(
            "INSERT INTO summaries (label, content) VALUES (@label, @content)",
        )
        .run({ label: "Orphan Test Summary", content: "" });
    const intSummaryId = objSummary.lastInsertRowid;
    const objResume = db
        .prepare(
            "INSERT INTO resumes (name, target_role) VALUES (@name, @target_role)",
        )
        .run({ name: "Orphan Test Resume", target_role: "" });
    const intResumeId = objResume.lastInsertRowid;
    db.prepare(
        "INSERT INTO resume_items (resume_id, section_type, item_id, sort_order) VALUES (@resume_id, @section_type, @item_id, @sort_order)",
    ).run({
        resume_id: intResumeId,
        section_type: "summary",
        item_id: intSummaryId,
        sort_order: 0,
    });

    const res = await fetch(`${strBaseUrl}/${intSummaryId}`, {
        method: "DELETE",
    });
    assert.equal(res.status, 200);

    const arrOrphans = db
        .prepare(
            "SELECT id FROM resume_items WHERE section_type = 'summary' AND item_id = @item_id",
        )
        .all({ item_id: intSummaryId });
    assert.equal(
        arrOrphans.length,
        0,
        "resume_items row must be removed when summary is deleted",
    );

    // Clean up test resume (summary already deleted by the API call above)
    db.prepare("DELETE FROM resumes WHERE id = @id").run({ id: intResumeId });
});

test("DELETE /api/summary/:id — returns 200 and removes the record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, { method: "DELETE" });
    assert.equal(res.status, 200);
    intTestId = null;
});
