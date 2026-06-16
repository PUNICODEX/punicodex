/**
 * Upgrade existing punycodex.db to add indexed_sites FTS5 support + rich metadata columns.
 * Safe to run multiple times (idempotent).
 */
const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);

console.log('Upgrading database at', DB_PATH);

// Add columns if missing
const upgradeCols = [
  ['h1', 'TEXT'],
  ['first_p', 'TEXT'],
  ['tenant_name', 'TEXT'],
  ['tenant_category', 'TEXT'],
  ['tenant_front_url', 'TEXT'],
  ['archetype_score', 'REAL DEFAULT 0.0'],
  ['archetype_signals', 'TEXT'],
  ['archetype_version', 'TEXT'],
  ['lease_status', "TEXT DEFAULT 'available'"],
  ['og_title', 'TEXT'],
  ['og_description', 'TEXT'],
  ['og_image', 'TEXT'],
  ['og_type', 'TEXT'],
  ['og_site_name', 'TEXT'],
  ['og_url', 'TEXT'],
  ['og_locale', 'TEXT'],
  ['twitter_title', 'TEXT'],
  ['twitter_description', 'TEXT'],
  ['twitter_image', 'TEXT'],
  ['twitter_card', 'TEXT'],
  ['twitter_site', 'TEXT'],
  ['json_ld', 'TEXT'],
  ['favicon_url', 'TEXT'],
  ['favicon_path', 'TEXT'],
  ['og_image_path', 'TEXT'],
  ['lang', 'TEXT'],
  ['h1_count', 'INTEGER DEFAULT 0'],
  ['h2_count', 'INTEGER DEFAULT 0'],
  ['h3_count', 'INTEGER DEFAULT 0'],
  ['h4_count', 'INTEGER DEFAULT 0'],
  ['h5_count', 'INTEGER DEFAULT 0'],
  ['h6_count', 'INTEGER DEFAULT 0'],
  ['headings_h2', 'TEXT'],
  ['internal_links', 'INTEGER DEFAULT 0'],
  ['external_links', 'INTEGER DEFAULT 0'],
  ['word_count', 'INTEGER DEFAULT 0'],
  ['content_ratio', 'REAL DEFAULT 0.0'],
  ['meta_robots', 'TEXT'],
  ['canonical_url', 'TEXT'],
  ['meta_keywords', 'TEXT'],
  ['meta_author', 'TEXT'],
  ['response_time_ms', 'INTEGER'],
  ['content_length', 'INTEGER'],
  ['redirect_count', 'INTEGER DEFAULT 0'],
  ['published_date', 'TEXT'],
];
for (const [col, type] of upgradeCols) {
  try {
    db.exec(`ALTER TABLE indexed_sites ADD COLUMN ${col} ${type}`);
    console.log(`  + Added ${col} column`);
  } catch (_e) {
    console.log(`  ✓ ${col} column already exists`);
  }
}

// Drop and recreate FTS5 table with OG + Twitter columns
db.exec(`DROP TABLE IF EXISTS indexed_sites_fts;`);

db.exec(`
  CREATE VIRTUAL TABLE indexed_sites_fts USING fts5(
    domain,
    punycode,
    title,
    description,
    h1,
    first_p,
    content_snippet,
    og_title,
    og_description,
    twitter_title,
    twitter_description,
    content='indexed_sites',
    content_rowid='id'
  );
`);
console.log('  + Created indexed_sites_fts with OG + Twitter content');

// Drop old triggers if they exist
db.exec(`DROP TRIGGER IF EXISTS indexed_sites_fts_insert;`);
db.exec(`DROP TRIGGER IF EXISTS indexed_sites_fts_update;`);
db.exec(`DROP TRIGGER IF EXISTS indexed_sites_fts_delete;`);

// Recreate triggers with all FTS-indexed columns
db.exec(`
  CREATE TRIGGER indexed_sites_fts_insert
  AFTER INSERT ON indexed_sites BEGIN
    INSERT INTO indexed_sites_fts (rowid, domain, punycode, title, description, h1, first_p, content_snippet, og_title, og_description, twitter_title, twitter_description)
    VALUES (new.id, new.domain, new.punycode, new.title, new.description, new.h1, new.first_p, new.content_snippet, new.og_title, new.og_description, new.twitter_title, new.twitter_description);
  END;

  CREATE TRIGGER indexed_sites_fts_update
  AFTER UPDATE ON indexed_sites BEGIN
    INSERT INTO indexed_sites_fts (indexed_sites_fts, rowid, domain, punycode, title, description, h1, first_p, content_snippet, og_title, og_description, twitter_title, twitter_description)
    VALUES ('delete', old.id, old.domain, old.punycode, old.title, old.description, old.h1, old.first_p, old.content_snippet, old.og_title, old.og_description, old.twitter_title, old.twitter_description);
    INSERT INTO indexed_sites_fts (rowid, domain, punycode, title, description, h1, first_p, content_snippet, og_title, og_description, twitter_title, twitter_description)
    VALUES (new.id, new.domain, new.punycode, new.title, new.description, new.h1, new.first_p, new.content_snippet, new.og_title, new.og_description, new.twitter_title, new.twitter_description);
  END;

  CREATE TRIGGER indexed_sites_fts_delete
  AFTER DELETE ON indexed_sites BEGIN
    INSERT INTO indexed_sites_fts (indexed_sites_fts, rowid, domain, punycode, title, description, h1, first_p, content_snippet, og_title, og_description, twitter_title, twitter_description)
    VALUES ('delete', old.id, old.domain, old.punycode, old.title, old.description, old.h1, old.first_p, old.content_snippet, old.og_title, old.og_description, old.twitter_title, old.twitter_description);
  END;
`);
console.log('  + Created sync triggers');

// Rebuild FTS index from existing data
const count = db.prepare('SELECT COUNT(*) as c FROM indexed_sites').get().c;
if (count > 0) {
  db.exec(`INSERT INTO indexed_sites_fts(indexed_sites_fts) VALUES('rebuild')`);
  console.log(`  + Rebuilt FTS index from ${count} sites`);
}

console.log('\nUpgrade complete.');
console.log(`  indexed_sites: ${count}`);
console.log(
  `  indexed_sites_fts: ${db.prepare('SELECT COUNT(*) as c FROM indexed_sites_fts').get().c}`
);

db.close();
