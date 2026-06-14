const Database = require('better-sqlite3');
const { getDbPath } = require('./db');

const db = new Database(getDbPath());
db.pragma('journal_mode = WAL');

const columns = [
  { name: 'ai_summary', def: 'TEXT' },
  { name: 'ai_symbols', def: 'TEXT' },
  { name: 'ai_pronunciation', def: 'TEXT' },
  { name: 'ai_etymology_narrative', def: 'TEXT' },
  { name: 'ai_relevance_today', def: 'TEXT' },
  { name: 'ai_enriched_at', def: 'TEXT' },
  { name: 'ai_review_status', def: "TEXT DEFAULT 'pending'" },
];

const existing = db
  .prepare('PRAGMA table_info(entries)')
  .all()
  .map((c) => c.name);

for (const col of columns) {
  if (!existing.includes(col.name)) {
    db.prepare(`ALTER TABLE entries ADD COLUMN ${col.name} ${col.def}`).run();
    console.log(`Added column ${col.name}`);
  } else {
    console.log(`Column ${col.name} already exists`);
  }
}

db.close();
console.log('Entries AI migration complete.');
