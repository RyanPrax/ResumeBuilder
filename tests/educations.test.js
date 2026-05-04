// Tests for GET/POST/PUT/DELETE /api/educations.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import router from "../routes/educations.js";
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
        db.prepare("DELETE FROM educations WHERE id = @id").run({ id: intTestId });
    }
});

// GET

test("GET /api/educations — returns 200 and a JSON array", async () => {
    const res = await fetch(`${strBaseUrl}/`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody), "body must be a JSON array");
});

test("GET /api/educations/:id — returns 200 and empty array for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 0);
});

// POST — validation

test("POST /api/educations — returns 400 when institution is missing", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ degree: "B.S.", field: "Computer Science" }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /institution/i);
});

// POST — success

test("POST /api/educations — returns 201 and new id with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            institution: "Test University",
            degree: "B.S.",
            field: "Computer Science",
            start_date: "2020-09",
            end_date: "2024-05",
            gpa: "3.8",
            details: "Test education entry.",
        }),
    });
    assert.equal(res.status, 201);
    const objBody = await res.json();
    assert.ok(objBody.id);
    intTestId = objBody.id;
});

// GET by id

test("GET /api/educations/:id — returns 200 and array with the created record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 1);
    assert.equal(arrBody[0].institution, "Test University");
});

// PUT — validation

test("PUT /api/educations/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institution: "Updated" }),
    });
    assert.equal(res.status, 404);
});

test("PUT /api/educations/:id — returns 400 when institution is missing", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ degree: "M.S." }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /institution/i);
});

// PUT — success

test("PUT /api/educations/:id — returns 200 with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ institution: "Updated University", degree: "M.S.", field: "CS" }),
    });
    assert.equal(res.status, 200);
});

// DELETE

test("DELETE /api/educations/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, { method: "DELETE" });
    assert.equal(res.status, 404);
});

test("DELETE /api/educations/:id — removes orphaned resume_items rows", async () => {
    // Insert a fresh education and a resume selection pointing at it
    const objEd = db.prepare("INSERT INTO educations (institution) VALUES (@institution)").run({ institution: "Orphan Test University" });
    const intEdId = objEd.lastInsertRowid;
    const objResume = db.prepare("INSERT INTO resumes (name, target_role) VALUES (@name, @target_role)").run({ name: "Orphan Test Resume", target_role: "" });
    const intResumeId = objResume.lastInsertRowid;
    db.prepare("INSERT INTO resume_items (resume_id, section_type, item_id, sort_order) VALUES (@resume_id, @section_type, @item_id, @sort_order)").run({ resume_id: intResumeId, section_type: "education", item_id: intEdId, sort_order: 0 });

    const res = await fetch(`${strBaseUrl}/${intEdId}`, { method: "DELETE" });
    assert.equal(res.status, 200);

    const arrOrphans = db.prepare("SELECT id FROM resume_items WHERE section_type = 'education' AND item_id = @item_id").all({ item_id: intEdId });
    assert.equal(arrOrphans.length, 0, "resume_items row must be removed when education is deleted");

    db.prepare("DELETE FROM resumes WHERE id = @id").run({ id: intResumeId });
});

test("DELETE /api/educations/:id — returns 200 and removes the record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, { method: "DELETE" });
    assert.equal(res.status, 200);
    intTestId = null;
});
