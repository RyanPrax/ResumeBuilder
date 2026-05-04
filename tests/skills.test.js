// Tests for GET/POST/PUT/DELETE /api/skills.
// Skills have an optional FK to skill_categories; a test category is created
// in before() and used to verify FK validation, then removed in after().

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import router from "../routes/skills.js";
import db from "../lib/db.js";

let server;
let strBaseUrl;
let intTestSkillId = null;
let intTestCategoryId = null;

before(async () => {
    // Create a real category so we can test both valid and invalid category_id paths.
    const result = db
        .prepare("INSERT INTO skill_categories (name) VALUES (@name)")
        .run({ name: "Test Category for Skills" });
    intTestCategoryId = result.lastInsertRowid;

    const app = express();
    app.use(express.json());
    app.use("/", router);
    server = createServer(app);
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    strBaseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
    await new Promise((resolve) => server.close(resolve));
    if (intTestSkillId !== null) {
        db.prepare("DELETE FROM skills WHERE id = @id").run({
            id: intTestSkillId,
        });
    }
    if (intTestCategoryId !== null) {
        db.prepare("DELETE FROM skill_categories WHERE id = @id").run({
            id: intTestCategoryId,
        });
    }
});

// GET

test("GET /api/skills — returns 200 and a JSON array", async () => {
    const res = await fetch(`${strBaseUrl}/`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody), "body must be a JSON array");
});

test("GET /api/skills/:id — returns 200 and empty array for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 0);
});

// POST — validation

test("POST /api/skills — returns 400 when name is missing", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: null }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /name/i);
});

test("POST /api/skills — returns 404 when category_id does not exist", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Skill", category_id: 999999 }),
    });
    assert.equal(res.status, 404);
    const objBody = await res.json();
    assert.match(objBody.message, /category/i);
});

// POST — success (no category)

test("POST /api/skills — returns 201 with valid body and null category_id", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Skill", category_id: null }),
    });
    assert.equal(res.status, 201);
    const objBody = await res.json();
    assert.ok(objBody.id);
    intTestSkillId = objBody.id;
});

// GET by id

test("GET /api/skills/:id — returns 200 and array with the created record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestSkillId}`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 1);
    assert.equal(arrBody[0].name, "Test Skill");
});

// PUT — validation

test("PUT /api/skills/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
    });
    assert.equal(res.status, 404);
});

test("PUT /api/skills/:id — returns 400 when name is missing", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestSkillId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category_id: null }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /name/i);
});

test("PUT /api/skills/:id — returns 404 when category_id does not exist", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestSkillId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Skill", category_id: 999999 }),
    });
    assert.equal(res.status, 404);
});

// PUT — success (assign to the real test category)

test("PUT /api/skills/:id — returns 200 when assigning a valid category_id", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestSkillId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Updated Skill",
            category_id: intTestCategoryId,
        }),
    });
    assert.equal(res.status, 200);
});

// DELETE

test("DELETE /api/skills/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, { method: "DELETE" });
    assert.equal(res.status, 404);
});

test("DELETE /api/skills/:id — removes orphaned resume_items rows", async () => {
    // Insert a fresh skill and a resume selection pointing at it
    const objSkill = db
        .prepare("INSERT INTO skills (name) VALUES (@name)")
        .run({ name: "Orphan Test Skill" });
    const intSkillId = objSkill.lastInsertRowid;
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
        section_type: "skills",
        item_id: intSkillId,
        sort_order: 0,
    });

    const res = await fetch(`${strBaseUrl}/${intSkillId}`, {
        method: "DELETE",
    });
    assert.equal(res.status, 200);

    const arrOrphans = db
        .prepare(
            "SELECT id FROM resume_items WHERE section_type = 'skills' AND item_id = @item_id",
        )
        .all({ item_id: intSkillId });
    assert.equal(
        arrOrphans.length,
        0,
        "resume_items row must be removed when skill is deleted",
    );

    db.prepare("DELETE FROM resumes WHERE id = @id").run({ id: intResumeId });
});

test("DELETE /api/skills/:id — returns 200 and removes the record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestSkillId}`, {
        method: "DELETE",
    });
    assert.equal(res.status, 200);
    intTestSkillId = null;
});
