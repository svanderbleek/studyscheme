import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { seeds } from './seeds.js';
import { validateProof } from './proof.js';

export function openDatabase(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000;
    CREATE TABLE IF NOT EXISTS proofs (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
      content TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('draft','approved','rejected')),
      revision INTEGER NOT NULL DEFAULT 1, tested_revision INTEGER,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP, updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS generations (
      id TEXT PRIMARY KEY, day TEXT NOT NULL, model TEXT NOT NULL, status TEXT NOT NULL, usage TEXT
    );
    CREATE TABLE IF NOT EXISTS metadata (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  if (!db.prepare("SELECT 1 FROM metadata WHERE key='seeded'").get()) {
    db.exec('BEGIN');
    try {
      for (const seed of seeds) {
        validateProof(seed.content);
        db.prepare('INSERT INTO proofs (id,name,description,content,status,tested_revision) VALUES (?,?,?,?,?,1)')
          .run(seed.id, seed.name, 'Adapted from the supplied Proof Blocks example.', JSON.stringify(seed.content), 'approved');
      }
      db.prepare("INSERT INTO metadata VALUES ('seeded','1')").run(); db.exec('COMMIT');
    } catch (e) { db.exec('ROLLBACK'); throw e; }
  }
  return db;
}
