// Tests for GET/POST/PUT/DELETE /api/skill-categories.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import router from "../routes/skill-categories.js";
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
        db.prepare("DELETE FROM skill_categories WHERE id = @id").run({
            id: intTestId,
        });
    }
});

// GET

test("GET /api/skill-categories — returns 200 and a JSON array", async () => {
    const res = await fetch(`${strBaseUrl}/`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody), "body must be a JSON array");
});

test("GET /api/skill-categories/:id — returns 200 and empty array for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 0);
});

// POST — validation

test("POST /api/skill-categories — returns 400 when name is missing", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /name/i);
});

// POST — success

test("POST /api/skill-categories — returns 201 and new id with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Category" }),
    });
    assert.equal(res.status, 201);
    const objBody = await res.json();
    assert.ok(objBody.id);
    intTestId = objBody.id;
});

// GET by id

test("GET /api/skill-categories/:id — returns 200 and array with the created record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 1);
    assert.equal(arrBody[0].name, "Test Category");
});

// PUT — validation

test("PUT /api/skill-categories/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
    });
    assert.equal(res.status, 404);
});

test("PUT /api/skill-categories/:id — returns 400 when name is missing", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /name/i);
});

// PUT — success

test("PUT /api/skill-categories/:id — returns 200 with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Category" }),
    });
    assert.equal(res.status, 200);
});

// DELETE

test("DELETE /api/skill-categories/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, { method: "DELETE" });
    assert.equal(res.status, 404);
});

test("DELETE /api/skill-categories/:id — returns 200 and removes the record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, { method: "DELETE" });
    assert.equal(res.status, 200);
    intTestId = null;
});
