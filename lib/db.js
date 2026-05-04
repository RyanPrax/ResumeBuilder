// better-sqlite3 singleton connection and schema migration runner; importing this module initializes the database.

import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import path from "path";

// __dirname equivalent for ES modules
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const strDatabasePath = path.join(__dirname, "../db/resume.db");
const db = new Database(strDatabasePath);
// Enable Write-Ahead Logging for better concurrency and performance
db.pragma("journal_mode = WAL");
// Explicitly enable foreign key enforcement
db.pragma("foreign_keys = ON");

// Builds database from the schema file, resolved relative to this module
const strSchema = readFileSync(
    path.join(__dirname, "../db/schema.sql"),
    "utf8",
);
db.exec(strSchema);

function quotePragmaString(strValue) {
    return `'${String(strValue).replaceAll("'", "''")}'`;
}

function getIndexColumns(strIndexName) {
    return db
        .pragma(`index_info(${quotePragmaString(strIndexName)})`)
        .sort((a, b) => a.seqno - b.seqno)
        .map((objColumn) => objColumn.name);
}

function migrateResumeBulletsUniqueConstraint() {
    const arrUniqueIndexes = db
        .pragma("index_list('resume_bullets')")
        .filter((objIndex) => objIndex.unique);
    const boolHasBulletTypeUnique = arrUniqueIndexes.some((objIndex) => {
        const arrColumns = getIndexColumns(objIndex.name);
        return (
            arrColumns.join(",") ===
            "resume_id,parent_item_id,bullet_type,bullet_id"
        );
    });

    if (boolHasBulletTypeUnique) {
        return;
    }

    const boolHasOldUnique = arrUniqueIndexes.some((objIndex) => {
        const arrColumns = getIndexColumns(objIndex.name);
        return arrColumns.join(",") === "resume_id,parent_item_id,bullet_id";
    });

    if (!boolHasOldUnique) {
        return;
    }

    db.transaction(() => {
        db.exec(`
            CREATE TABLE resume_bullets_new (
              id             INTEGER PRIMARY KEY AUTOINCREMENT,
              resume_id      INTEGER NOT NULL REFERENCES resumes(id) ON DELETE CASCADE,
              parent_item_id INTEGER NOT NULL,
              bullet_type    TEXT    NOT NULL CHECK (bullet_type IN ('job', 'project')),
              bullet_id      INTEGER NOT NULL,
              sort_order     INTEGER NOT NULL DEFAULT 0,
              UNIQUE (resume_id, parent_item_id, bullet_type, bullet_id)
            );

            INSERT INTO resume_bullets_new (id, resume_id, parent_item_id, bullet_type, bullet_id, sort_order)
            SELECT id, resume_id, parent_item_id, bullet_type, bullet_id, sort_order
            FROM resume_bullets;

            DROP TABLE resume_bullets;
            ALTER TABLE resume_bullets_new RENAME TO resume_bullets;
            CREATE INDEX IF NOT EXISTS idx_resume_bullets_resume ON resume_bullets(resume_id);
        `);
    })();
}

migrateResumeBulletsUniqueConstraint();

export default db;
