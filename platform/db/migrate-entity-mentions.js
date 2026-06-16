const Database = require('better-sqlite3');
const { getDbPath } = require('./db');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

const info = db.prepare('PRAGMA table_info(entity_mentions)').all();
const entryIdCol = info.find((c) => c.name === 'entry_id');

if (!entryIdCol) {
  console.log('entity_mentions table does not exist; skipping migration.');
  db.close();
  process.exit(0);
}

if (entryIdCol.type.toUpperCase() === 'TEXT') {
  console.log('entity_mentions.entry_id is already TEXT; no migration needed.');
  db.close();
  process.exit(0);
}

console.log(`Converting entity_mentions.entry_id from ${entryIdCol.type} to TEXT...`);

// SQLite does not support ALTER COLUMN; recreate the table while preserving data.
db.exec(`
  DROP TABLE IF EXISTS entity_mentions_new;

  CREATE TABLE entity_mentions_new (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    entry_id TEXT NOT NULL,
    mention_count INTEGER DEFAULT 1,
    contexts TEXT,
    pantheon TEXT,
    tier TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(site_id, entry_id),
    FOREIGN KEY (site_id) REFERENCES indexed_sites(id) ON DELETE CASCADE,
    FOREIGN KEY (entry_id) REFERENCES entries(id) ON DELETE CASCADE
  );

  INSERT INTO entity_mentions_new
    (id, site_id, entry_id, mention_count, contexts, pantheon, tier, created_at)
  SELECT id, site_id, CAST(entry_id AS TEXT), mention_count, contexts, pantheon, tier, created_at
  FROM entity_mentions;

  DROP TABLE entity_mentions;
  ALTER TABLE entity_mentions_new RENAME TO entity_mentions;

  CREATE INDEX idx_entity_site ON entity_mentions(site_id);
  CREATE INDEX idx_entity_entry ON entity_mentions(entry_id);
  CREATE INDEX idx_entity_pantheon ON entity_mentions(pantheon);
`);

console.log('entity_mentions.entry_id converted to TEXT.');
db.close();
