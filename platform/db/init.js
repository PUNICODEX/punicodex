const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punycodex.db');

// Remove existing DB to rebuild
if (fs.existsSync(DB_PATH)) {
  fs.unlinkSync(DB_PATH);
}

const db = new Database(DB_PATH);

// Enable FTS5
// db.exec("PRAGMA foreign_keys = ON;");

// Create tables
db.exec(`
  CREATE TABLE entries (
    id TEXT PRIMARY KEY,
    ascii TEXT NOT NULL,
    unicode TEXT NOT NULL,
    greek TEXT,
    pantheon TEXT NOT NULL,
    tier TEXT NOT NULL,
    tier_label TEXT,
    domain TEXT,
    meaning TEXT,
    sources TEXT,
    etymology TEXT,
    variants TEXT,
    has_flagship INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE breakdowns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL,
    char TEXT,
    to_char TEXT,
    type TEXT,
    note TEXT,
    FOREIGN KEY (entry_id) REFERENCES entries(id)
  );

  CREATE VIRTUAL TABLE entries_fts USING fts5(
    id,
    ascii,
    unicode,
    greek,
    pantheon,
    meaning,
    content='entries',
    content_rowid='rowid'
  );

  CREATE INDEX idx_pantheon ON entries(pantheon);
  CREATE INDEX idx_tier ON entries(tier);
  CREATE INDEX idx_flagship ON entries(has_flagship);
`);

// Read lexicon
const lexiconPath = path.join(__dirname, '..', '..', 'type', 'js', 'lexicon.js');
const content = fs.readFileSync(lexiconPath, 'utf8');
const wrapped = `${content}\nmodule.exports = LEXICON;`;
const tmpPath = path.join(__dirname, '_temp_lexicon.js');
fs.writeFileSync(tmpPath, wrapped);
const lexicon = require(tmpPath);
fs.unlinkSync(tmpPath);

// Insert entries
const insertEntry = db.prepare(`
  INSERT INTO entries (id, ascii, unicode, greek, pantheon, tier, tier_label, domain, meaning, sources, etymology, variants, has_flagship)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertBreakdown = db.prepare(`
  INSERT INTO breakdowns (entry_id, char, to_char, type, note)
  VALUES (?, ?, ?, ?, ?)
`);

const insertFts = db.prepare(`
  INSERT INTO entries_fts (id, ascii, unicode, greek, pantheon, meaning)
  VALUES (?, ?, ?, ?, ?, ?)
`);

// Flagship IDs
const flagshipIds = new Set([
  'ab',
  'aigyptos',
  'akh',
  'alfheimr',
  'aphrodite',
  'apollon',
  'ares',
  'artemis',
  'asia',
  'athena',
  'athenai',
  'atlas',
  'delphoi',
  'demeter',
  'europe',
  'gaia',
  'hades',
  'hekate',
  'helheimr',
  'helios',
  'hephaistos',
  'hera',
  'hermes',
  'hestia',
  'jotunheimr',
  'ker',
  'kobe',
  'kyoto',
  'libye',
  'maa',
  'medousa',
  'midgardr',
  'muspellheimr',
  'nike',
  'odinn',
  'olympos',
  'osaka',
  'persephone',
  'pontos',
  'poseidon',
  'prometheus',
  'ra',
  'ragnarok',
  'selene',
  'shiva',
  'sparte',
  'thor',
  'zeus',
  'el',
  'baal',
  'anat',
  'asherah',
  'kronos',
  'enlil',
  'ishtar',
  'typhon',
  'chaos',
  'dionysos',
  'maat',
  'sia',
  'shu',
  'tartaros',
  'aether',
  'astart',
  'ba',
  'enki',
  'eros',
  'ganesha',
  'heka',
  'horus',
  'kali',
  'prajapati',
  'rta',
  'vishnu',
]);

const insertEntryTxn = db.transaction((entries) => {
  for (const entry of entries) {
    insertEntry.run(
      entry.id,
      entry.ascii,
      entry.unicode,
      entry.greek || null,
      entry.pantheon,
      entry.tier,
      entry.tierLabel || null,
      entry.domain || null,
      entry.meaning || null,
      entry.sources ? JSON.stringify(entry.sources) : null,
      entry.etymology ? JSON.stringify(entry.etymology) : null,
      entry.variants ? JSON.stringify(entry.variants) : null,
      flagshipIds.has(entry.id) ? 1 : 0
    );

    insertFts.run(
      entry.id,
      entry.ascii,
      entry.unicode,
      entry.greek || '',
      entry.pantheon,
      entry.meaning || ''
    );

    if (entry.breakdown) {
      for (const b of entry.breakdown) {
        insertBreakdown.run(entry.id, b.char || null, b.to || null, b.type || null, b.note || null);
      }
    }
  }
});

insertEntryTxn(lexicon);

// Create stats view
db.exec(`
  CREATE VIEW stats AS
  SELECT
    pantheon,
    COUNT(*) as total,
    SUM(CASE WHEN tier = 'dual' THEN 1 ELSE 0 END) as dual_tier,
    SUM(CASE WHEN tier = '1' THEN 1 ELSE 0 END) as tier_1,
    SUM(CASE WHEN tier = '2' THEN 1 ELSE 0 END) as tier_2,
    SUM(CASE WHEN has_flagship = 1 THEN 1 ELSE 0 END) as flagships
  FROM entries
  GROUP BY pantheon
  ORDER BY total DESC;
`);

console.log(`Database initialized at ${DB_PATH}`);
console.log(`Entries: ${db.prepare('SELECT COUNT(*) as c FROM entries').get().c}`);
console.log(`Breakdowns: ${db.prepare('SELECT COUNT(*) as c FROM breakdowns').get().c}`);
console.log(
  `Pantheons: ${db.prepare('SELECT COUNT(DISTINCT pantheon) as c FROM entries').get().c}`
);

const stats = db.prepare('SELECT * FROM stats').all();
console.log('\nPantheon breakdown:');
for (const s of stats) {
  console.log(`  ${s.pantheon}: ${s.total} entries (${s.flagships} flagships)`);
}

db.close();
