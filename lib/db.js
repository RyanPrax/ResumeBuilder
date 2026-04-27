// better-sqlite3 singleton connection and schema migration runner; call initDb() on boot.
/*
lib/db.js needs to:
  4. Execute schema SQL — CREATE TABLE IF NOT EXISTS + indexes + triggers + INSERT OR IGNORE INTO contact seed. All
  idempotent, safe to re-run
  5. Export singleton db instance for routes to import
*/

import Database from "better-sqlite3";
import { readFileSync } from 'fs';

const strDatabasePath = "./db/resume.db";
const db = new Database(strDatabasePath);
// Enable Write-Ahead Logging for better concurrency and performance
db.pragma("journal_mode = WAL");
// Explicitly enable foreign key enforcement
db.pragma("foreign_keys = ON");

// Builds database from the file
const strSchema = readFileSync('./db/schema.sql', 'utf8');
db.exec(strSchema);

export default db;