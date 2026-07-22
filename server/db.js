import Database from "better-sqlite3";
import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = process.env.COMMUNITY_DB_PATH || path.join(DATA_DIR, "community.db");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export const db = new Database(DB_PATH);

// WAL mode per #77 — better concurrent read/write behavior than the default
// rollback journal, since multiple report submissions can land close together.
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

db.exec(`
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    image TEXT,
    lat REAL,
    lon REAL,
    votes INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT 'Pending',
    created_at TEXT NOT NULL,
    verified_at TEXT,
    moderation_notes TEXT
  );

  CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports (created_at);
  CREATE INDEX IF NOT EXISTS idx_reports_lat_lon ON reports (lat, lon);
`);

export default db;
