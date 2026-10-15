// Idempotent schema statements. Run at build time against Neon
// (scripts/migrate.ts) and lazily against the local PGlite database.
export const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS visits (
     id SERIAL PRIMARY KEY,
     ts BIGINT NOT NULL,
     bot_id TEXT NOT NULL,
     status TEXT NOT NULL,
     path TEXT NOT NULL,
     user_agent TEXT NOT NULL
   )`,
  // Visits used to store an IP hash nothing read; it's not kept anymore.
  `ALTER TABLE visits DROP COLUMN IF EXISTS ip_hash`,
  `CREATE INDEX IF NOT EXISTS visits_ts ON visits (ts)`,
  `CREATE INDEX IF NOT EXISTS visits_bot ON visits (bot_id, ts)`,
  `CREATE INDEX IF NOT EXISTS visits_path ON visits (path)`,
  `CREATE TABLE IF NOT EXISTS other_visits (
     day TEXT PRIMARY KEY,
     count INTEGER NOT NULL
   )`,
  `CREATE TABLE IF NOT EXISTS posts (
     id SERIAL PRIMARY KEY,
     ts BIGINT NOT NULL,
     message TEXT NOT NULL,
     name TEXT,
     bot_id TEXT,
     status TEXT,
     parent_id INTEGER REFERENCES posts (id),
     ip_hash TEXT
   )`,
  // The top-level post of a reply's thread; NULL for top-level posts.
  `ALTER TABLE posts ADD COLUMN IF NOT EXISTS root_id INTEGER REFERENCES posts (id)`,
  `CREATE INDEX IF NOT EXISTS posts_ts ON posts (ts)`,
  `CREATE INDEX IF NOT EXISTS posts_thread ON posts ((COALESCE(root_id, id)))`,
  `CREATE INDEX IF NOT EXISTS posts_ip ON posts (ip_hash, ts)`,
  `CREATE INDEX IF NOT EXISTS posts_bot ON posts (bot_id, ts)`,
];
