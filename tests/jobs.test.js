// Tests for GET/POST/PUT/DELETE /api/jobs and nested /api/jobs/:id/bullets.
// A test job and bullet are created during the POST tests.
// after() cleans up any survivors — job deletion cascades to its bullets via the FK schema.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import router from "../routes/jobs.js";
import db from "../lib/db.js";

let server;
let strBaseUrl;
let intTestJobId = null;
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
    // Delete bullet first (FK); then delete job. Both are no-ops if already deleted by tests.
    if (intTestBulletId !== null) {
        db.prepare("DELETE FROM job_bullets WHERE id = @id").run({ id: intTestBulletId });
    }
    if (intTestJobId !== null) {
        db.prepare("DELETE FROM jobs WHERE id = @id").run({ id: intTestJobId });
    }
});

// ── Job CRUD ──────────────────────────────────────────────────────────────

test("GET /api/jobs — returns 200 and a JSON array", async () => {
    const res = await fetch(`${strBaseUrl}/`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody), "body must be a JSON array");
});

test("GET /api/jobs/:id — returns 200 and empty array for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 0);
});

test("POST /api/jobs — returns 400 when company is missing", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Engineer" }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /company/i);
});

test("POST /api/jobs — returns 400 when is_current is not 0 or 1", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: "Test Co", is_current: 5 }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /is_current/i);
});

test("POST /api/jobs — returns 201 and new id with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            company: "Test Co",
            title: "Software Engineer",
            location: "Remote",
            start_date: "2022-01",
            end_date: "",
            is_current: 1,
        }),
    });
    assert.equal(res.status, 201);
    const objBody = await res.json();
    assert.ok(objBody.id);
    intTestJobId = objBody.id;
});

test("GET /api/jobs/:id — returns 200 and array with the created record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 1);
    assert.equal(arrBody[0].company, "Test Co");
});

test("PUT /api/jobs/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: "Updated" }),
    });
    assert.equal(res.status, 404);
});

test("PUT /api/jobs/:id — returns 400 when company is missing", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Manager" }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /company/i);
});

test("PUT /api/jobs/:id — returns 400 when is_current is not 0 or 1", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: "Test Co", is_current: 99 }),
    });
    assert.equal(res.status, 400);
});

test("PUT /api/jobs/:id — returns 200 with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ company: "Updated Co", title: "Senior Engineer", is_current: 0 }),
    });
    assert.equal(res.status, 200);
});

// ── Bullet CRUD ───────────────────────────────────────────────────────────

test("GET /api/jobs/:id/bullets — returns 200 and a JSON array", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}/bullets`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
});

test("POST /api/jobs/:id/bullets — returns 404 for unknown job id", async () => {
    const res = await fetch(`${strBaseUrl}/999999/bullets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Some bullet." }),
    });
    assert.equal(res.status, 404);
});

test("POST /api/jobs/:id/bullets — returns 201 and new id with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}/bullets`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Delivered a key feature on time.", sort_order: 0 }),
    });
    assert.equal(res.status, 201);
    const objBody = await res.json();
    assert.ok(objBody.id);
    intTestBulletId = objBody.id;
});

test("PUT /api/jobs/:id/bullets/:bid — returns 404 for unknown bullet id", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}/bullets/999999`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Updated." }),
    });
    assert.equal(res.status, 404);
});

test("PUT /api/jobs/:id/bullets/:bid — returns 400 and preserves text when text is missing", async () => {
    const objBefore = db.prepare("SELECT text FROM job_bullets WHERE id = @id").get({ id: intTestBulletId });
    const res = await fetch(`${strBaseUrl}/${intTestJobId}/bullets/${intTestBulletId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sort_order: 3 }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /text/i);

    const objAfter = db.prepare("SELECT text FROM job_bullets WHERE id = @id").get({ id: intTestBulletId });
    assert.equal(objAfter.text, objBefore.text);
});

test("PUT /api/jobs/:id/bullets/:bid — returns 400 when body is empty", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}/bullets/${intTestBulletId}`, { method: "PUT" });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /text/i);
});

test("PUT /api/jobs/:id/bullets/:bid — returns 400 when text is blank", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}/bullets/${intTestBulletId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "   ", sort_order: 3 }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /text/i);
});

test("PUT /api/jobs/:id/bullets/:bid — returns 200 with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}/bullets/${intTestBulletId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Updated bullet text.", sort_order: 1 }),
    });
    assert.equal(res.status, 200);
});

test("DELETE /api/jobs/:id/bullets/:bid — returns 404 for unknown bullet id", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}/bullets/999999`, { method: "DELETE" });
    assert.equal(res.status, 404);
});

test("DELETE /api/jobs/:id/bullets/:bid — returns 200 and removes the bullet", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}/bullets/${intTestBulletId}`, { method: "DELETE" });
    assert.equal(res.status, 200);
    intTestBulletId = null;
});

test("DELETE /api/jobs/:id/bullets/:bid — removes orphaned resume_bullets rows", async () => {
    // Insert a fresh bullet on the test job and a resume selection pointing at it
    const objBullet = db.prepare("INSERT INTO job_bullets (job_id, text, sort_order) VALUES (@job_id, @text, @sort_order)").run({ job_id: intTestJobId, text: "Orphan test bullet", sort_order: 99 });
    const intBulletId = objBullet.lastInsertRowid;
    const objResume = db.prepare("INSERT INTO resumes (name, target_role) VALUES (@name, @target_role)").run({ name: "Orphan Test Resume", target_role: "" });
    const intResumeId = objResume.lastInsertRowid;
    db.prepare("INSERT INTO resume_bullets (resume_id, parent_item_id, bullet_type, bullet_id, sort_order) VALUES (@resume_id, @parent_item_id, @bullet_type, @bullet_id, @sort_order)").run({ resume_id: intResumeId, parent_item_id: intTestJobId, bullet_type: "job", bullet_id: intBulletId, sort_order: 0 });

    const res = await fetch(`${strBaseUrl}/${intTestJobId}/bullets/${intBulletId}`, { method: "DELETE" });
    assert.equal(res.status, 200);

    const arrOrphans = db.prepare("SELECT id FROM resume_bullets WHERE bullet_type = 'job' AND bullet_id = @bullet_id").all({ bullet_id: intBulletId });
    assert.equal(arrOrphans.length, 0, "resume_bullets row must be removed when job bullet is deleted");

    db.prepare("DELETE FROM resumes WHERE id = @id").run({ id: intResumeId });
});

test("DELETE /api/jobs/:id/bullets/:bid — preserves resume_bullets rows when job id does not match bullet", async (t) => {
    const objOtherJob = db.prepare("INSERT INTO jobs (company, title) VALUES (@company, @title)").run({ company: "Other Test Co", title: "Engineer" });
    const intOtherJobId = objOtherJob.lastInsertRowid;
    const objBullet = db.prepare("INSERT INTO job_bullets (job_id, text, sort_order) VALUES (@job_id, @text, @sort_order)").run({ job_id: intOtherJobId, text: "Wrong parent test bullet", sort_order: 0 });
    const intBulletId = objBullet.lastInsertRowid;
    const objResume = db.prepare("INSERT INTO resumes (name, target_role) VALUES (@name, @target_role)").run({ name: "Wrong Parent Test Resume", target_role: "" });
    const intResumeId = objResume.lastInsertRowid;
    db.prepare("INSERT INTO resume_bullets (resume_id, parent_item_id, bullet_type, bullet_id, sort_order) VALUES (@resume_id, @parent_item_id, @bullet_type, @bullet_id, @sort_order)").run({ resume_id: intResumeId, parent_item_id: intOtherJobId, bullet_type: "job", bullet_id: intBulletId, sort_order: 0 });

    t.after(() => {
        db.prepare("DELETE FROM resumes WHERE id = @id").run({ id: intResumeId });
        db.prepare("DELETE FROM job_bullets WHERE id = @id").run({ id: intBulletId });
        db.prepare("DELETE FROM jobs WHERE id = @id").run({ id: intOtherJobId });
    });

    const res = await fetch(`${strBaseUrl}/${intTestJobId}/bullets/${intBulletId}`, { method: "DELETE" });
    assert.equal(res.status, 404);

    const objBulletAfter = db.prepare("SELECT id FROM job_bullets WHERE id = @id AND job_id = @job_id").get({ id: intBulletId, job_id: intOtherJobId });
    assert.ok(objBulletAfter, "job bullet must not be removed when the job id does not match");
    const objSelectionAfter = db.prepare("SELECT id FROM resume_bullets WHERE bullet_type = 'job' AND bullet_id = @bullet_id").get({ bullet_id: intBulletId });
    assert.ok(objSelectionAfter, "resume_bullets row must not be removed when the job id does not match");
});

// ── Job DELETE ────────────────────────────────────────────────────────────

test("DELETE /api/jobs/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, { method: "DELETE" });
    assert.equal(res.status, 404);
});

test("DELETE /api/jobs/:id — returns 200 and removes the job", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestJobId}`, { method: "DELETE" });
    assert.equal(res.status, 200);
    intTestJobId = null;
});
