// better-sqlite3 singleton connection and schema migration runner; importing this module initializes the database.
/*
lib/db.js:
  1. Resolves db/resume.db and db/schema.sql paths relative to this file (not CWD)
  2. Opens a better-sqlite3 connection — creates the file if it doesn't exist
  3. Enables WAL mode and foreign key enforcement
  4. Executes schema SQL on import — CREATE TABLE IF NOT EXISTS + indexes + triggers + INSERT OR IGNORE INTO contact
     seed. All idempotent and safe to re-run.
  5. Exports the singleton db instance for routes to import.
*/

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

export default db;
