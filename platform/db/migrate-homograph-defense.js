const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { domainToASCII } = require('node:url');
const { classifyDomain, TRUST_TIERS } = require(
  path.join(__dirname, '..', 'api', 'homograph-service')
);

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

// Seed canonical_domains from owned-domains.json.
const ownedDomains = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'owned-domains.json'), 'utf8')
);
const insertDomain = db.prepare(`
  INSERT OR IGNORE INTO canonical_domains (entry_id, domain, punycode, trust_tier, source)
  VALUES (?, ?, ?, ?, ?)
`);
let seeded = 0;
for (const domain of ownedDomains) {
  const punycode = domainToASCII(domain);
  const classification = classifyDomain(domain, { strictDomains: false });
  const entryId = classification.canonicalMatch?.id;
  if (!entryId) {
    console.warn(`  ! Could not map owned domain to canonical entry: ${domain}`);
    continue;
  }
  const trustTier = classification.tier === TRUST_TIERS.CANONICAL ? 'canonical' : 'styled';
  insertDomain.run(entryId, domain, punycode, trustTier, 'owned');
  seeded++;
}
console.log(`  + Seeded ${seeded} owned canonical domains`);

console.log('Homograph defense migration applied.');
