// Tests for GET/POST/PUT/DELETE /api/projects and nested /api/projects/:id/bullets.
// A test project and bullet are created during the POST tests.
// after() cleans up any survivors — project deletion cascades to its bullets via the FK schema.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import router from "../routes/projects.js";
import db from "../lib/db.js";

let server;
let strBaseUrl;
let intTestProjectId = null;
let intTestBulletId = null;

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
    if (intTestBulletId !== null) {
        db.prepare("DELETE FROM project_bullets WHERE id = @id").run({ id: intTestBulletId });
    }
    if (intTestProjectId !== null) {
        db.prepare("DELETE FROM projects WHERE id = @id").run({ id: intTestProjectId });
    }
});

// ── Project CRUD ──────────────────────────────────────────────────────────

test("GET /api/projects — returns 200 and a JSON array", async () => {
    const res = await fetch(`${strBaseUrl}/`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody), "body must be a JSON array");
});

test("GET /api/projects/:id — returns 200 and empty array for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 0);
});

test("POST /api/projects — returns 400 when name is missing", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "A project." }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /name/i);
});

test("POST /api/projects — returns 400 when is_current is not 0 or 1", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Project", is_current: 7 }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /is_current/i);
});

test("POST /api/projects — returns 201 and new id with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Test Project",
            link: "https://github.com/test/project",
            description: "A test project.",
            start_date: "2023-01",
            end_date: "2023-06",
            is_current: 0,
        }),
    });
    assert.equal(res.status, 201);
    const objBody = await res.json();
    assert.ok(objBody.id);
    intTestProjectId = objBody.id;
});

test("GET /api/projects/:id — returns 200 and array with the created record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 1);
    assert.equal(arrBody[0].name, "Test Project");
});

test("PUT /api/projects/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
    });
    assert.equal(res.status, 404);
});

test("PUT /api/projects/:id — returns 400 when name is missing", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: "Updated." }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /name/i);
});

test("PUT /api/projects/:id — returns 400 when is_current is not 0 or 1", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Project", is_current: 2 }),
    });
    assert.equal(res.status, 400);
});

test("PUT /api/projects/:id — returns 200 with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Project", is_current: 1 }),
    });
    assert.equal(res.status, 200);
});

// ── Bullet CRUD ───────────────────────────────────────────────────────────

test("GET /api/projects/:id/bullets — returns 200 and a JSON array", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}/bullets`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
});

test("POST /api/projects/:id/bullets — returns 404 for unknown project id", async () => {
    const res = await fetch(`${strBaseUrl}/999999/bullets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Some bullet." }),
    });
    assert.equal(res.status, 404);
});

test("POST /api/projects/:id/bullets — returns 201 and new id with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}/bullets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Built the core feature.", sort_order: 0 }),
    });
    assert.equal(res.status, 201);
    const objBody = await res.json();
    assert.ok(objBody.id);
    intTestBulletId = objBody.id;
});

test("PUT /api/projects/:id/bullets/:bid — returns 404 for unknown bullet id", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}/bullets/999999`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Updated." }),
    });
    assert.equal(res.status, 404);
});

test("PUT /api/projects/:id/bullets/:bid — returns 400 and preserves text when text is missing", async () => {
    const objBefore = db.prepare("SELECT text FROM project_bullets WHERE id = @id").get({ id: intTestBulletId });
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}/bullets/${intTestBulletId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: 3 }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /text/i);

    const objAfter = db.prepare("SELECT text FROM project_bullets WHERE id = @id").get({ id: intTestBulletId });
    assert.equal(objAfter.text, objBefore.text);
});

test("PUT /api/projects/:id/bullets/:bid — returns 400 when body is empty", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}/bullets/${intTestBulletId}`, { method: "PUT" });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /text/i);
});

test("PUT /api/projects/:id/bullets/:bid — returns 400 when text is blank", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}/bullets/${intTestBulletId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "   ", sort_order: 3 }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /text/i);
});

test("PUT /api/projects/:id/bullets/:bid — returns 200 with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}/bullets/${intTestBulletId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Updated bullet.", sort_order: 1 }),
    });
    assert.equal(res.status, 200);
});

test("DELETE /api/projects/:id/bullets/:bid — returns 404 for unknown bullet id", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}/bullets/999999`, { method: "DELETE" });
    assert.equal(res.status, 404);
});

test("DELETE /api/projects/:id/bullets/:bid — returns 200 and removes the bullet", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}/bullets/${intTestBulletId}`, { method: "DELETE" });
    assert.equal(res.status, 200);
    intTestBulletId = null;
});

test("DELETE /api/projects/:id/bullets/:bid — removes orphaned resume_bullets rows", async () => {
    // Insert a fresh bullet on the test project and a resume selection pointing at it
    const objBullet = db.prepare("INSERT INTO project_bullets (project_id, text, sort_order) VALUES (@project_id, @text, @sort_order)").run({ project_id: intTestProjectId, text: "Orphan test bullet", sort_order: 99 });
    const intBulletId = objBullet.lastInsertRowid;
    const objResume = db.prepare("INSERT INTO resumes (name, target_role) VALUES (@name, @target_role)").run({ name: "Orphan Test Resume", target_role: "" });
    const intResumeId = objResume.lastInsertRowid;
    db.prepare("INSERT INTO resume_bullets (resume_id, parent_item_id, bullet_type, bullet_id, sort_order) VALUES (@resume_id, @parent_item_id, @bullet_type, @bullet_id, @sort_order)").run({ resume_id: intResumeId, parent_item_id: intTestProjectId, bullet_type: "project", bullet_id: intBulletId, sort_order: 0 });

    const res = await fetch(`${strBaseUrl}/${intTestProjectId}/bullets/${intBulletId}`, { method: "DELETE" });
    assert.equal(res.status, 200);

    const arrOrphans = db.prepare("SELECT id FROM resume_bullets WHERE bullet_type = 'project' AND bullet_id = @bullet_id").all({ bullet_id: intBulletId });
    assert.equal(arrOrphans.length, 0, "resume_bullets row must be removed when project bullet is deleted");

    db.prepare("DELETE FROM resumes WHERE id = @id").run({ id: intResumeId });
});

test("DELETE /api/projects/:id/bullets/:bid — preserves resume_bullets rows when project id does not match bullet", async (t) => {
    const objOtherProject = db.prepare("INSERT INTO projects (name, description) VALUES (@name, @description)").run({ name: "Other Test Project", description: "Wrong parent project" });
    const intOtherProjectId = objOtherProject.lastInsertRowid;
    const objBullet = db.prepare("INSERT INTO project_bullets (project_id, text, sort_order) VALUES (@project_id, @text, @sort_order)").run({ project_id: intOtherProjectId, text: "Wrong parent test bullet", sort_order: 0 });
    const intBulletId = objBullet.lastInsertRowid;
    const objResume = db.prepare("INSERT INTO resumes (name, target_role) VALUES (@name, @target_role)").run({ name: "Wrong Parent Test Resume", target_role: "" });
    const intResumeId = objResume.lastInsertRowid;
    db.prepare("INSERT INTO resume_bullets (resume_id, parent_item_id, bullet_type, bullet_id, sort_order) VALUES (@resume_id, @parent_item_id, @bullet_type, @bullet_id, @sort_order)").run({ resume_id: intResumeId, parent_item_id: intOtherProjectId, bullet_type: "project", bullet_id: intBulletId, sort_order: 0 });

    t.after(() => {
        db.prepare("DELETE FROM resumes WHERE id = @id").run({ id: intResumeId });
        db.prepare("DELETE FROM project_bullets WHERE id = @id").run({ id: intBulletId });
        db.prepare("DELETE FROM projects WHERE id = @id").run({ id: intOtherProjectId });
    });

    const res = await fetch(`${strBaseUrl}/${intTestProjectId}/bullets/${intBulletId}`, { method: "DELETE" });
    assert.equal(res.status, 404);

    const objBulletAfter = db.prepare("SELECT id FROM project_bullets WHERE id = @id AND project_id = @project_id").get({ id: intBulletId, project_id: intOtherProjectId });
    assert.ok(objBulletAfter, "project bullet must not be removed when the project id does not match");
    const objSelectionAfter = db.prepare("SELECT id FROM resume_bullets WHERE bullet_type = 'project' AND bullet_id = @bullet_id").get({ bullet_id: intBulletId });
    assert.ok(objSelectionAfter, "resume_bullets row must not be removed when the project id does not match");
});

// ── Project DELETE ────────────────────────────────────────────────────────

test("DELETE /api/projects/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, { method: "DELETE" });
    assert.equal(res.status, 404);
});

test("DELETE /api/projects/:id — returns 200 and removes the project", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestProjectId}`, { method: "DELETE" });
    assert.equal(res.status, 200);
    intTestProjectId = null;
});
