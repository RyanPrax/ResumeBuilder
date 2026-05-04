// Tests for lib/db.js — run via: npm test (node --test)
//
// Strategy: import db.js and let it run against the real db/resume.db.
// The schema uses CREATE TABLE IF NOT EXISTS and INSERT OR IGNORE throughout,
// so running it against an existing DB is completely safe — no data is lost.
//
// Parallelism note: node --test runs test files in parallel worker processes,
// and every route test file also imports lib/db.js and opens its own connection
// to the same db/resume.db. If this file unlinked the DB on cleanup, it would
// pull the file out from under workers that are still running — an open handle
// in another process keeps reading via its inode but the file may be recreated
// or left in an inconsistent state, producing nondeterministic failures.
// We therefore only close this worker's connection and leave the file in place.
// db/resume.db is gitignored, so leaving it does not pollute the working tree.

import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// __dirname equivalent for ES modules
const strDirname = dirname(fileURLToPath(import.meta.url));

// Absolute path to the SQLite file db.js will create
const strDbPath = resolve(strDirname, "../db/resume.db");

// ── Import ─────────────────────────────────────────────────────────────────
// Importing db.js is the "boot" step. The module should:
//   1. Check whether db/resume.db exists
//   2. Open a better-sqlite3 connection
//   3. If the file was missing, read db/schema.sql and call db.exec() to apply it
//   4. Export the open connection as the default export
const { default: dbDatabase } = await import("./db.js");

// ── Cleanup ────────────────────────────────────────────────────────────────
after(() => {
    // Close only this worker's connection. Do NOT delete the DB file — other
    // test workers may still have open handles to it (see parallelism note above).
    if (dbDatabase && typeof dbDatabase.close === "function") {
        dbDatabase.close();
    }
});

// ── 1. Export shape ────────────────────────────────────────────────────────
// db.js must export the live better-sqlite3 Database object directly.
// Routes (e.g. routes/contact.js) will do: import db from '../lib/db.js'
// and then immediately call db.prepare(...), so the export cannot be a
// promise, a factory function, or a wrapper object.
test("exports a better-sqlite3 Database instance", () => {
    assert.ok(
        dbDatabase,
        "default export is falsy — db.js must export the Database object",
    );
    assert.strictEqual(
        typeof dbDatabase.prepare,
        "function",
        "missing .prepare() — not a better-sqlite3 instance",
    );
    assert.strictEqual(
        typeof dbDatabase.exec,
        "function",
        "missing .exec()    — not a better-sqlite3 instance",
    );
    assert.strictEqual(
        typeof dbDatabase.close,
        "function",
        "missing .close()   — not a better-sqlite3 instance",
    );
});

// ── 2. File creation ───────────────────────────────────────────────────────
// The DB file must exist on disk after db.js runs. better-sqlite3 creates
// the file automatically when you open a connection, but this confirms
// nothing went wrong before the write (e.g. missing db/ directory).
test("creates db/resume.db on first boot", () => {
    assert.ok(
        existsSync(strDbPath),
        "db/resume.db not found — check that db/ directory exists and is writable",
    );
});

// ── 3. Basic connectivity ──────────────────────────────────────────────────
// A smoke test to confirm the connection is open and can actually run SQL.
// If this fails but the file exists, the connection was likely closed early.
test("connection can execute a simple query", () => {
    const objRow = dbDatabase.prepare("SELECT 1 AS intVal").get();
    assert.strictEqual(
        objRow.intVal,
        1,
        "unexpected result from SELECT 1 — connection may be closed or broken",
    );
});

// ── 4. Schema: tables ─────────────────────────────────────────────────────
// Every table declared in db/schema.sql must be present after the first boot.
// We query sqlite_master (the internal catalog) rather than querying each
// table directly, so a missing table produces a clear "table X not found"
// failure instead of a cryptic "no such table" SQLite error.
const arrExpectedTables = [
    "contact", // singleton — one row only (id = 1)
    "settings", // singleton — user-configurable settings, including Gemini API key
    "summaries", // profile library: summary variants
    "educations", // profile library: education entries
    "jobs", // profile library: work experience
    "job_bullets", // child rows of jobs
    "projects", // profile library: projects
    "project_bullets", // child rows of projects
    "skill_categories", // profile library: skill groupings
    "skills", // profile library: individual skills
    "certifications", // profile library: certs
    "awards", // profile library: awards/honours
    "resumes", // builder: saved resume records
    "resume_sections", // builder: which sections are toggled per resume
    "resume_items", // builder: which library items are selected per resume
    "resume_bullets", // builder: which bullets are included per resume
];

for (const strTable of arrExpectedTables) {
    test(`schema: table "${strTable}" exists`, () => {
        const objRow = dbDatabase
            .prepare(
                "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
            )
            .get(strTable);
        assert.ok(
            objRow,
            `table "${strTable}" not found — schema.sql may not have been applied, or the table was renamed`,
        );
    });
}

test("schema: resume_bullets unique constraint includes bullet_type", () => {
    const arrUniqueIndexes = dbDatabase
        .pragma("index_list('resume_bullets')")
        .filter((objIndex) => objIndex.unique);
    const boolHasExpectedUnique = arrUniqueIndexes.some((objIndex) => {
        const arrColumns = dbDatabase
            .pragma(`index_info('${objIndex.name.replaceAll("'", "''")}')`)
            .sort((a, b) => a.seqno - b.seqno)
            .map((objColumn) => objColumn.name);
        return arrColumns.join(",") === "resume_id,parent_item_id,bullet_type,bullet_id";
    });

    assert.ok(
        boolHasExpectedUnique,
        "resume_bullets unique constraint must include bullet_type so job and project bullets with overlapping ids can both be selected",
    );
});

// ── 5. Schema: seed data ───────────────────────────────────────────────────
// schema.sql does INSERT OR IGNORE INTO contact (id) VALUES (1) so that
// the singleton contact row exists before any route tries to UPDATE it.
// If this row is missing, GET /api/contact returns nothing and PUT /api/contact
// silently updates zero rows — both are silent bugs that are hard to trace.
test("schema: contact seed row id=1 is pre-inserted", () => {
    const arrRows = dbDatabase
        .prepare("SELECT id FROM contact WHERE id = 1")
        .all();
    assert.strictEqual(
        arrRows.length,
        1,
        "contact row id=1 missing — check the INSERT OR IGNORE seed statement in schema.sql",
    );
});

test("schema: settings seed row id=1 is pre-inserted", () => {
    const arrRows = dbDatabase
        .prepare("SELECT id FROM settings WHERE id = 1")
        .all();
    assert.strictEqual(
        arrRows.length,
        1,
        "settings row id=1 missing — check the INSERT OR IGNORE seed statement in schema.sql",
    );
});

// ── 6. Schema: triggers ───────────────────────────────────────────────────
// These AFTER UPDATE triggers keep the updated_at column current without
// requiring every route to manually set it. Verify they were created.
const arrExpectedTriggers = [
    "trg_contact_updated",
    "trg_summaries_updated",
    "trg_resumes_updated",
    "trg_settings_updated",
];

for (const strTrigger of arrExpectedTriggers) {
    test(`schema: trigger "${strTrigger}" exists`, () => {
        const objRow = dbDatabase
            .prepare(
                "SELECT name FROM sqlite_master WHERE type = 'trigger' AND name = ?",
            )
            .get(strTrigger);
        assert.ok(
            objRow,
            `trigger "${strTrigger}" not found — check the CREATE TRIGGER block in schema.sql`,
        );
    });
}
