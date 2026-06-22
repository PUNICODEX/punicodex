const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { domainToASCII } = require('node:url');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);

function addColumn(table, col, type) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${col} ${type}`);
    console.log(`  + Added ${table}.${col}`);
  } catch (_e) {
    /* already exists */
  }
}

addColumn(
  'entries',
  'verified_as',
  "TEXT DEFAULT 'canonical' CHECK (verified_as IN ('canonical', 'variant', 'loan', 'constructed'))"
);
addColumn('entries', 'canonical_id', 'TEXT REFERENCES entries(id)');

addColumn(
  'indexed_sites',
  'trust_tier',
  "TEXT CHECK (trust_tier IN ('canonical', 'styled', 'suspicious', 'unsafe', 'unknown'))"
);

db.exec(`
  CREATE INDEX IF NOT EXISTS idx_entries_verified ON entries(verified_as);
  CREATE INDEX IF NOT EXISTS idx_entries_canonical_id ON entries(canonical_id);

  CREATE TABLE IF NOT EXISTS canonical_domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL,
    domain TEXT NOT NULL UNIQUE,
    punycode TEXT NOT NULL,
    trust_tier TEXT DEFAULT 'canonical'
      CHECK (trust_tier IN ('canonical', 'styled', 'suspicious', 'unsafe')),
    source TEXT,
    verified_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES entries(id)
  );

  CREATE INDEX IF NOT EXISTS idx_canonical_domains_entry ON canonical_domains(entry_id);
  CREATE INDEX IF NOT EXISTS idx_canonical_domains_punycode ON canonical_domains(punycode);
`);

// Backfill indexed_sites.trust_tier based on canonical domain ownership.
// Sites without a canonical domain record are left NULL and will be classified
// on-demand by the homograph service.
db.exec(`
  UPDATE indexed_sites
  SET trust_tier = COALESCE(
    (SELECT trust_tier FROM canonical_domains WHERE canonical_domains.domain = indexed_sites.domain),
    CASE
      WHEN is_flagship = 1 THEN 'canonical'
      ELSE NULL
    END
  )
`);

// Map an owned domain to its canonical entries row. The classifier may return a
// brand identity for names like hermês/níkē, but the database FK requires a
// real lexicon entry id, so we look it up directly from entries.
function findEntryIdForDomain(domain) {
  const base = String(domain).replace(/\.[^.]+$/, '');
  const row = db
    .prepare(`
    SELECT id FROM entries
    WHERE ascii = ? COLLATE NOCASE
       OR id = ? COLLATE NOCASE
       OR search_key = ?
       OR unicode = ? COLLATE NOCASE
    LIMIT 1
  `)
    .get(base, base, base, base);
  if (row) return row.id;

  const folded = base
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
  const foldedRow = db
    .prepare(`
    SELECT id FROM entries
    WHERE ascii = ? COLLATE NOCASE
       OR id = ? COLLATE NOCASE
       OR search_key = ?
    LIMIT 1
  `)
    .get(folded, folded, folded);
  return foldedRow?.id;
}

// Seed canonical_domains from owned-domains.json.
const ownedDomains = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'owned-domains.json'), 'utf8')
);
const insertDomain = db.prepare(`
  INSERT OR IGNORE INTO canonical_domains (entry_id, domain, punycode, trust_tier, source)
  VALUES (?, ?, ?, ?, ?)
`);
let seeded = 0;
let skipped = 0;
for (const domain of ownedDomains) {
  const punycode = domainToASCII(domain);
  const entryId = findEntryIdForDomain(domain);
  if (!entryId) {
    console.warn(`  ! Could not map owned domain to canonical entry: ${domain}`);
    skipped++;
    continue;
  }
  insertDomain.run(entryId, domain, punycode, 'canonical', 'owned');
  seeded++;
}
console.log(
  `  + Seeded ${seeded} owned canonical domains` + (skipped > 0 ? ` (${skipped} skipped)` : '')
);

console.log('Homograph defense migration applied.');
