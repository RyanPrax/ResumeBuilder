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

export default db;
