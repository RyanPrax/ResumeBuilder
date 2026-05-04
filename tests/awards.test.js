// Tests for GET/POST/PUT/DELETE /api/awards.
// A test award is created during the POST success test and cleaned up in after().

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import router from "../routes/awards.js";
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
    // Safety-net cleanup in case the DELETE test did not run or failed.
    if (intTestId !== null) {
        db.prepare("DELETE FROM awards WHERE id = @id").run({ id: intTestId });
    }
});

// GET

test("GET /api/awards — returns 200 and a JSON array", async () => {
    const res = await fetch(`${strBaseUrl}/`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody), "body must be a JSON array");
});

test("GET /api/awards/:id — returns 200 and empty array for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 0);
});

// POST — validation

test("POST /api/awards — returns 400 when name is missing", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuer: "Some Org" }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /name/i);
});

// POST — success (stores id for subsequent tests)

test("POST /api/awards — returns 201 and new id with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Test Award",
            issuer: "Test Org",
            issued_date: "2024-01",
            description: "A test award.",
        }),
    });
    assert.equal(res.status, 201);
    const objBody = await res.json();
    assert.ok(objBody.id, "response must include the new record id");
    intTestId = objBody.id;
});

// GET by id (uses record created above)

test("GET /api/awards/:id — returns 200 and array with the created record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 1);
    assert.equal(arrBody[0].name, "Test Award");
});

// PUT — validation

test("PUT /api/awards/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
    });
    assert.equal(res.status, 404);
});

test("PUT /api/awards/:id — returns 400 when name is missing", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ issuer: "Org" }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /name/i);
});

// PUT — success

test("PUT /api/awards/:id — returns 200 with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Updated Award",
            issuer: "Updated Org",
            issued_date: "2024-06",
            description: "Updated.",
        }),
    });
    assert.equal(res.status, 200);
});

// DELETE

test("DELETE /api/awards/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, { method: "DELETE" });
    assert.equal(res.status, 404);
});

test("DELETE /api/awards/:id — removes orphaned resume_items rows", async () => {
    // Insert a fresh award and a resume selection pointing at it
    const objAward = db
        .prepare("INSERT INTO awards (name) VALUES (@name)")
        .run({ name: "Orphan Test Award" });
    const intAwardId = objAward.lastInsertRowid;
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
        section_type: "awards",
        item_id: intAwardId,
        sort_order: 0,
    });

    const res = await fetch(`${strBaseUrl}/${intAwardId}`, {
        method: "DELETE",
    });
    assert.equal(res.status, 200);

    const arrOrphans = db
        .prepare(
            "SELECT id FROM resume_items WHERE section_type = 'awards' AND item_id = @item_id",
        )
        .all({ item_id: intAwardId });
    assert.equal(
        arrOrphans.length,
        0,
        "resume_items row must be removed when award is deleted",
    );

    db.prepare("DELETE FROM resumes WHERE id = @id").run({ id: intResumeId });
});

test("DELETE /api/awards/:id — returns 200 and removes the record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, { method: "DELETE" });
    assert.equal(res.status, 200);
    // Mark as cleaned up so after() safety-net skips it.
    intTestId = null;
});
