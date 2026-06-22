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
    original_script TEXT,
    pantheon TEXT NOT NULL,
    tier TEXT NOT NULL,
    tier_label TEXT,
    domain TEXT,
    meaning TEXT,
    sources TEXT,
    etymology TEXT,
    variants TEXT,
    has_flagship INTEGER DEFAULT 0,
    confidence_score REAL DEFAULT 0,
    search_key TEXT,
    verified_as TEXT DEFAULT 'canonical' CHECK (verified_as IN ('canonical', 'variant', 'loan', 'constructed')),
    canonical_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (canonical_id) REFERENCES entries(id)
  );

  CREATE TABLE canonical_domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    punycode TEXT NOT NULL,
    trust_tier TEXT DEFAULT 'canonical' CHECK (trust_tier IN ('canonical', 'styled', 'suspicious', 'unsafe')),
    source TEXT,
    verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES entries(id)
  );

  CREATE INDEX idx_entries_verified ON entries(verified_as);
  CREATE INDEX idx_entries_canonical_id ON entries(canonical_id);
  CREATE INDEX idx_canonical_domains_entry ON canonical_domains(entry_id);
  CREATE INDEX idx_canonical_domains_punycode ON canonical_domains(punycode);

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
    original_script,
    pantheon,
    domain,
    meaning,
    content='entries',
    content_rowid='rowid'
  );

  CREATE INDEX idx_pantheon ON entries(pantheon);
  CREATE INDEX idx_tier ON entries(tier);
  CREATE INDEX idx_flagship ON entries(has_flagship);
  CREATE INDEX idx_entries_search_key ON entries(search_key);
`);

// Read lexicon
const lexiconPath = path.join(__dirname, '..', '..', 'type', 'js', 'lexicon.js');
const content = fs.readFileSync(lexiconPath, 'utf8');
const wrapped = `${content}\nmodule.exports = LEXICON;`;
const tmpPath = path.join(__dirname, '_temp_lexicon.js');
fs.writeFileSync(tmpPath, wrapped);
const lexicon = require(tmpPath);
fs.unlinkSync(tmpPath);

const { getOriginalScript } = require(
  path.join(__dirname, '..', '..', 'type', 'js', 'original-scripts.js')
);
const { toSearchKey } = require(path.join(__dirname, '..', 'api', 'query-normalize.js'));

// Insert entries
const insertEntry = db.prepare(`
  INSERT INTO entries (id, ascii, unicode, greek, original_script, pantheon, tier, tier_label, domain, meaning, sources, etymology, variants, has_flagship, search_key, verified_as, canonical_id)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);

const insertBreakdown = db.prepare(`
  INSERT INTO breakdowns (entry_id, char, to_char, type, note)
  VALUES (?, ?, ?, ?, ?)
`);

const insertFts = db.prepare(`
  INSERT INTO entries_fts (id, ascii, unicode, greek, original_script, pantheon, domain, meaning)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?)
`);

// Flagship IDs
const flagshipIds = new Set([
  'ab',
  'aigyptos',
  'aither',
  'akh',
  'alfheimr',
  'anat',
  'anu',
  'aphrodite',
  'apollon',
  'apsu',
  'ares',
  'artemis',
  'asa',
  'asherah',
  'asia',
  'astart',
  'athena',
  'athenai',
  'atlas',
  'ba',
  'baal',
  'chaos',
  'delphoi',
  'demeter',
  'dionysos',
  'ea',
  'el',
  'enlil',
  'eros',
  'europe',
  'gaia',
  'ganesha',
  'hades',
  'heka',
  'hekate',
  'helheimr',
  'helios',
  'hephaistos',
  'hera',
  'hermes',
  'hestia',
  'hen',
  'horus',
  'ishtar',
  'jotunheimr',
  'ka',
  'kali',
  'ker',
  'kobe',
  'kronos',
  'kyoto',
  'libye',
  'maa',
  'maat',
  'medousa',
  'midgardr',
  'muspellheimr',
  'nike',
  'odinn',
  'okeanos',
  'olympos',
  'osaka',
  'persephone',
  'pontos',
  'poseidon',
  'prajapati',
  'prometheus',
  'ra',
  'ragnarok',
  'rta',
  'selene',
  'shiva',
  'shu',
  'sia',
  'sparte',
  'tartaros',
  'thor',
  'trengtreng',
  'typhon',
  'vac',
  'varuna',
  'vishnu',
  'zeus',
]);

const insertEntryTxn = db.transaction((entries) => {
  for (const entry of entries) {
    insertEntry.run(
      entry.id,
      entry.ascii,
      entry.unicode,
      entry.greek || null,
      getOriginalScript(entry) || null,
      entry.pantheon,
      entry.tier,
      entry.tierLabel || null,
      entry.domain || null,
      entry.meaning || null,
      entry.sources ? JSON.stringify(entry.sources) : null,
      entry.etymology ? JSON.stringify(entry.etymology) : null,
      entry.variants ? JSON.stringify(entry.variants) : null,
      flagshipIds.has(entry.id) ? 1 : 0,
      toSearchKey(entry.unicode),
      entry.verifiedAs || 'canonical',
      entry.canonicalId || null
    );

    insertFts.run(
      entry.id,
      entry.ascii,
      entry.unicode,
      entry.greek || '',
      getOriginalScript(entry) || '',
      entry.pantheon,
      entry.domain || '',
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

// Run API key migration after DB is initialized
try {
  const { execSync } = require('node:child_process');
  execSync(`node "${path.join(__dirname, 'migrate-api-keys.js')}"`, { stdio: 'inherit' });
} catch (err) {
  console.error('API key migration failed:', err.message);
  process.exit(1);
}

// Apply threat intelligence graph schema
try {
  const threatGraphSql = fs.readFileSync(path.join(__dirname, 'threat-graph.sql'), 'utf8');
  db.exec(threatGraphSql);
  console.log('Threat graph schema applied.');
} catch (err) {
  console.error('Threat graph schema failed:', err.message);
  process.exit(1);
}

db.close();
