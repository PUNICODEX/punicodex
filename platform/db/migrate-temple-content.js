/**
 * Migration: temple-content search corpus tables
 *
 * Creates the SQLite schema backing GET /api/search/temples/ — flagship lore,
 * blog, and industry-pattern content as one FTS5-searchable corpus. Handlers
 * run `runMigration()` lazily on cold start before their first read.
 */

const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = process.env.PUNICODEX_TEST_DB_PATH || path.join(__dirname, 'punicodex.db');

const TEMPLE_CONTENT_SCHEMA = `
  CREATE TABLE IF NOT EXISTS temple_content (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    temple_id TEXT NOT NULL,
    section TEXT NOT NULL CHECK(section IN ('lore','blog','patterns')),
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    url TEXT NOT NULL,
    UNIQUE(temple_id, section, title)
  );

  CREATE INDEX IF NOT EXISTS idx_temple_content_temple ON temple_content(temple_id);
  CREATE INDEX IF NOT EXISTS idx_temple_content_section ON temple_content(section);
`;

function migrate(db) {
  db.exec(TEMPLE_CONTENT_SCHEMA);

  // FTS5 external-content index over the corpus (same pattern as
  // indexed_sites_fts in migrate-crawler.js). The FTS triggers below keep the
  // index in sync with the DELETE + reinsert seeding strategy.
  db.exec(`
    CREATE VIRTUAL TABLE IF NOT EXISTS temple_content_fts USING fts5(
      temple_id,
      section,
      title,
      body,
      content='temple_content',
      content_rowid='id'
    );
  `);

  // Drop old triggers if they exist
  db.exec(`DROP TRIGGER IF EXISTS temple_content_fts_insert;`);
  db.exec(`DROP TRIGGER IF EXISTS temple_content_fts_update;`);
  db.exec(`DROP TRIGGER IF EXISTS temple_content_fts_delete;`);

  db.exec(`
    CREATE TRIGGER temple_content_fts_insert
    AFTER INSERT ON temple_content BEGIN
      INSERT INTO temple_content_fts (rowid, temple_id, section, title, body)
      VALUES (new.id, new.temple_id, new.section, new.title, new.body);
    END;

    CREATE TRIGGER temple_content_fts_update
    AFTER UPDATE ON temple_content BEGIN
      INSERT INTO temple_content_fts (temple_content_fts, rowid, temple_id, section, title, body)
      VALUES ('delete', old.id, old.temple_id, old.section, old.title, old.body);
      INSERT INTO temple_content_fts (rowid, temple_id, section, title, body)
      VALUES (new.id, new.temple_id, new.section, new.title, new.body);
    END;

    CREATE TRIGGER temple_content_fts_delete
    AFTER DELETE ON temple_content BEGIN
      INSERT INTO temple_content_fts (temple_content_fts, rowid, temple_id, section, title, body)
      VALUES ('delete', old.id, old.temple_id, old.section, old.title, old.body);
    END;
  `);

  // Rebuild the FTS index if rows already exist but the index is empty
  // (e.g. a database seeded before this migration first ran).
  const existingCount = db.prepare('SELECT COUNT(*) as c FROM temple_content').get().c;
  const ftsCount = db.prepare('SELECT COUNT(*) as c FROM temple_content_fts').get().c;
  if (existingCount > 0 && ftsCount === 0) {
    db.exec(`INSERT INTO temple_content_fts(temple_content_fts) VALUES('rebuild')`);
  }
}

function runMigration() {
  const { getDb } = require('./connection');
  migrate(getDb());
}

function runStandalone() {
  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');
  migrate(db);
  db.close();
  console.log('Temple content migration complete.');
}

if (require.main === module) {
  runStandalone();
}

module.exports = { migrate, runMigration, TEMPLE_CONTENT_SCHEMA };
