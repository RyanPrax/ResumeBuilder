// Tests for GET/POST/PUT/DELETE /api/resumes and PUT /api/resumes/:id/selections.
// A test resume is created during the POST test and cleaned up in after().
// The selections endpoint is tested with empty arrays (clears state) and invalid payloads.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import express from "express";
import router from "../routes/resumes.js";
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
    // Resume deletion cascades to resume_sections, resume_items, resume_bullets via FK schema.
    if (intTestId !== null) {
        db.prepare("DELETE FROM resumes WHERE id = @id").run({ id: intTestId });
    }
});

// GET

test("GET /api/resumes — returns 200 and a JSON array", async () => {
    const res = await fetch(`${strBaseUrl}/`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody), "body must be a JSON array");
});

test("GET /api/resumes/:id — returns 200 and empty array for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 0);
});

// POST — validation

test("POST /api/resumes — returns 400 when name is missing", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_role: "Engineer" }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /name/i);
});

// POST — success

test("POST /api/resumes — returns 201 and new id with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Test Resume", target_role: "Software Engineer" }),
    });
    assert.equal(res.status, 201);
    const objBody = await res.json();
    assert.ok(objBody.id);
    intTestId = objBody.id;
});

// GET by id

test("GET /api/resumes/:id — returns 200 and array with the created record", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`);
    assert.equal(res.status, 200);
    const arrBody = await res.json();
    assert.ok(Array.isArray(arrBody));
    assert.equal(arrBody.length, 1);
    assert.equal(arrBody[0].name, "Test Resume");
});

// PUT — validation

test("PUT /api/resumes/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated" }),
    });
    assert.equal(res.status, 404);
});

test("PUT /api/resumes/:id — returns 400 when name is missing", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target_role: "Manager" }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /name/i);
});

// PUT — success

test("PUT /api/resumes/:id — returns 200 with valid body", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Updated Resume", target_role: "Senior Engineer" }),
    });
    assert.equal(res.status, 200);
});

// Selections endpoint

test("PUT /api/resumes/:id/selections — returns 404 for unknown resume id", async () => {
    const res = await fetch(`${strBaseUrl}/999999/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: [], items: [], bullets: [] }),
    });
    assert.equal(res.status, 404);
});

test("PUT /api/resumes/:id/selections — returns 200 with empty arrays (clears all selections)", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: [], items: [], bullets: [] }),
    });
    assert.equal(res.status, 200);
});

test("PUT /api/resumes/:id/selections — saves job and project bullets with overlapping ids", async (t) => {
    const intSharedItemId = -910001;
    const intSharedBulletId = -910002;

    const cleanup = () => {
        db.prepare("DELETE FROM resume_bullets WHERE resume_id = @resume_id").run({ resume_id: intTestId });
        db.prepare("DELETE FROM jobs WHERE id = @id").run({ id: intSharedItemId });
        db.prepare("DELETE FROM projects WHERE id = @id").run({ id: intSharedItemId });
    };
    cleanup();

    db.prepare("INSERT INTO jobs (id, company, title) VALUES (@id, @company, @title)").run({
        id: intSharedItemId,
        company: "Overlap Job Co",
        title: "Engineer",
    });
    db.prepare("INSERT INTO projects (id, name, description) VALUES (@id, @name, @description)").run({
        id: intSharedItemId,
        name: "Overlap Project",
        description: "Project with overlapping ids.",
    });
    db.prepare("INSERT INTO job_bullets (id, job_id, text, sort_order) VALUES (@id, @job_id, @text, @sort_order)").run({
        id: intSharedBulletId,
        job_id: intSharedItemId,
        text: "Job bullet with shared numeric ids.",
        sort_order: 0,
    });
    db.prepare("INSERT INTO project_bullets (id, project_id, text, sort_order) VALUES (@id, @project_id, @text, @sort_order)").run({
        id: intSharedBulletId,
        project_id: intSharedItemId,
        text: "Project bullet with shared numeric ids.",
        sort_order: 0,
    });

    t.after(() => {
        cleanup();
    });

    const res = await fetch(`${strBaseUrl}/${intTestId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sections: [],
            // parent items must be present in the items selection payload —
            // bullets cannot reference jobs/projects that were not included.
            items: [
                { section_type: "jobs", item_id: intSharedItemId, sort_order: 0 },
                { section_type: "projects", item_id: intSharedItemId, sort_order: 0 },
            ],
            bullets: [
                {
                    parent_item_id: intSharedItemId,
                    bullet_type: "job",
                    bullet_id: intSharedBulletId,
                    sort_order: 0,
                },
                {
                    parent_item_id: intSharedItemId,
                    bullet_type: "project",
                    bullet_id: intSharedBulletId,
                    sort_order: 1,
                },
            ],
        }),
    });
    assert.equal(res.status, 200);

    const arrSelections = db
        .prepare("SELECT bullet_type FROM resume_bullets WHERE resume_id = @resume_id AND parent_item_id = @parent_item_id AND bullet_id = @bullet_id ORDER BY bullet_type")
        .all({ resume_id: intTestId, parent_item_id: intSharedItemId, bullet_id: intSharedBulletId });
    assert.deepEqual(
        arrSelections.map((objSelection) => objSelection.bullet_type),
        ["job", "project"],
    );
});

test("PUT /api/resumes/:id/selections — returns 400 for invalid section_type in items", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sections: [],
            items: [{ section_type: "invalid_type", item_id: 1 }],
            bullets: [],
        }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /section_type/i);
});

test("PUT /api/resumes/:id/selections — returns 400 for invalid section_type in sections", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sections: [{ section_type: "invalid_type", included: 1 }],
            items: [],
            bullets: [],
        }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /section_type/i);
});

test("PUT /api/resumes/:id/selections — returns 400 when a section entry is not an object", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sections: [null],
            items: [],
            bullets: [],
        }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /section/i);
});

test("PUT /api/resumes/:id/selections — returns 400 when an item entry is not an object", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sections: [],
            items: [null],
            bullets: [],
        }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /item/i);
});

test("PUT /api/resumes/:id/selections — returns 400 when a bullet entry is not an object", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sections: [],
            items: [],
            bullets: [null],
        }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /bullet/i);
});

test("PUT /api/resumes/:id/selections — returns 400 for invalid included value in sections", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sections: [{ section_type: "contact", included: 2 }],
            items: [],
            bullets: [],
        }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /included/i);
});

test("PUT /api/resumes/:id/selections — returns 400 when bullet's parent_item_id is not in items selection", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sections: [],
            items: [],
            bullets: [{ bullet_type: "job", bullet_id: 1, parent_item_id: 999999 }],
        }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /parent_item_id|items selection/i);
});

test("PUT /api/resumes/:id/selections — returns 400 for invalid bullet_type in bullets", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            sections: [],
            items: [],
            bullets: [{ bullet_type: "invalid", bullet_id: 1, parent_item_id: 1 }],
        }),
    });
    assert.equal(res.status, 400);
    const objBody = await res.json();
    assert.match(objBody.message, /bullet_type/i);
});

test("PUT /api/resumes/:id/selections — returns 400 when sections is not an array", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}/selections`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections: "not-an-array", items: [], bullets: [] }),
    });
    assert.equal(res.status, 400);
});

// DELETE

test("DELETE /api/resumes/:id — returns 404 for unknown id", async () => {
    const res = await fetch(`${strBaseUrl}/999999`, { method: "DELETE" });
    assert.equal(res.status, 404);
});

test("DELETE /api/resumes/:id — returns 200 and removes the resume", async () => {
    const res = await fetch(`${strBaseUrl}/${intTestId}`, { method: "DELETE" });
    assert.equal(res.status, 200);
    intTestId = null;
});
