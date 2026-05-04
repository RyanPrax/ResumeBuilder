// Deletes the generated local SQLite database so the app can recreate a fresh one.

import { rmSync } from "fs";
import { join } from "path";

const arrDatabaseFiles = [
    "resume.db",
    "resume.db-shm",
    "resume.db-wal",
];

for (const strFile of arrDatabaseFiles) {
    const strPath = join(process.cwd(), "db", strFile);
    rmSync(strPath, { force: true });
}

console.log("Deleted local database files. Restart the app to recreate an empty database.");
