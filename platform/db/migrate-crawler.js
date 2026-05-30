const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, 'punycodex.db');
const db = new Database(DB_PATH);

// Drop old claims table (registrar model)
db.exec(`DROP TABLE IF EXISTS claims;`);

// Create indexed_sites table (crawler model)
db.exec(`
  CREATE TABLE IF NOT EXISTS indexed_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL UNIQUE,
    punycode TEXT NOT NULL,
    title TEXT,
    description TEXT,
    content_snippet TEXT,
    lexicon_entry_id TEXT,
    pantheon TEXT,
    tier TEXT,
    tier_label TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'unresolved', 'error', 'pending', 'spam')),
    is_flagship INTEGER DEFAULT 0,
    content_hash TEXT,
    last_crawled DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lexicon_entry_id) REFERENCES entries(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sites_entry ON indexed_sites(lexicon_entry_id);
  CREATE INDEX IF NOT EXISTS idx_sites_status ON indexed_sites(status);
  CREATE INDEX IF NOT EXISTS idx_sites_pantheon ON indexed_sites(pantheon);
  CREATE INDEX IF NOT EXISTS idx_sites_flagship ON indexed_sites(is_flagship);
`);

// Create availability tracking table
db.exec(`
  CREATE TABLE IF NOT EXISTS availability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    entry_id TEXT NOT NULL UNIQUE,
    domain TEXT NOT NULL,
    punycode TEXT NOT NULL,
    status TEXT DEFAULT 'available' CHECK (status IN ('available', 'registered', 'unknown')),
    registrar_links TEXT,
    last_checked DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (entry_id) REFERENCES entries(id)
  );
`);

console.log('Crawler migration complete:');
console.log('  - Dropped old claims table');
console.log('  - Created indexed_sites table');
console.log('  - Created availability table');

// Seed with flagships
const flagships = [
  { id: 'zeus', domain: 'zeús.com', punycode: 'xn--zes-9na.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'athena', domain: 'athēnē.com', punycode: 'xn--athn-dvab.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'poseidon', domain: 'poseidôn.com', punycode: 'xn--poseidn-y0a.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'apollon', domain: 'apollōn.com', punycode: 'xn--apolln-fgb.com', pantheon: 'greek', tier: 'dual', tier_label: 'Dual-Tier' },
  { id: 'ares', domain: 'árēs.com', punycode: 'xn--rs-lia5r.com', pantheon: 'greek', tier: '2', tier_label: 'Tier-2' },
  { id: 'artemis', domain: 'ártemis.com', punycode: 'xn--rtemis-ota.com', pantheon: 'greek', tier: '2', tier_label: 'Tier-2' },
  { id: 'aphrodite', domain: 'aphrodītē.com', punycode: 'xn--aphrodt-27a8s.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'demeter', domain: 'dēmētēr.com', punycode: 'xn--dmtr-bvabb.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'hermes', domain: 'hermês.com', punycode: 'xn--herms-ksa.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'hera', domain: 'hēra.com', punycode: 'xn--hra-3qa.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'hephaistos', domain: 'hēphaistos.com', punycode: 'xn--hphaistos-bhb.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'hestia', domain: 'hestía.com', punycode: 'xn--hesta-2sa.com', pantheon: 'greek', tier: '2', tier_label: 'Tier-2' },
  { id: 'hades', domain: 'hádēs.com', punycode: 'xn--hds-ela5w.com', pantheon: 'greek', tier: '2', tier_label: 'Tier-2' },
  { id: 'hekate', domain: 'hekátē.com', punycode: 'xn--hekt-7na51a.com', pantheon: 'greek', tier: '2', tier_label: 'Tier-2' },
  { id: 'persephone', domain: 'persephonē.com', punycode: 'xn--persephon-jhb.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'prometheus', domain: 'promētheus.com', punycode: 'xn--promtheus-ehb.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'atlas', domain: 'átlas.com', punycode: 'xn--tlas-4na.com', pantheon: 'greek', tier: '2', tier_label: 'Tier-2' },
  { id: 'medousa', domain: 'médousa.com', punycode: 'xn--mdousa-bva.com', pantheon: 'greek', tier: '2', tier_label: 'Tier-2' },
  { id: 'nike', domain: 'níkē.com', punycode: 'xn--nk-nja7m.com', pantheon: 'greek', tier: '2', tier_label: 'Tier-2' },
  { id: 'ker', domain: 'kēr.com', punycode: 'xn--kr-wma.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'selene', domain: 'selēnē.com', punycode: 'xn--seln-dvab.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'dionysos', domain: 'diónysos.com', punycode: 'xn--dinysos-m0a.com', pantheon: 'greek', tier: '2', tier_label: 'Tier-2' },
  { id: 'gaia', domain: 'gaîa.com', punycode: 'xn--gaa-wma.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'chaos', domain: 'cháos.com', punycode: 'xn--chos-6na.com', pantheon: 'greek', tier: '2', tier_label: 'Tier-2' },
  { id: 'tartaros', domain: 'tártaros.com', punycode: 'xn--trtaros-hwa.com', pantheon: 'greek', tier: '2', tier_label: 'Tier-2' },
  { id: 'pontos', domain: 'póntos.com', punycode: 'xn--pntos-0ta.com', pantheon: 'greek', tier: '2', tier_label: 'Tier-2' },
  { id: 'delphoi', domain: 'delphoí.com', punycode: 'xn--delpho-8va.com', pantheon: 'greek-location', tier: '2', tier_label: 'Tier-2' },
  { id: 'olympos', domain: 'ólympos.com', punycode: 'xn--lympos-9wa.com', pantheon: 'greek-location', tier: '1', tier_label: 'Tier-1' },
  { id: 'sparte', domain: 'spártē.com', punycode: 'xn--sprt-6na61a.com', pantheon: 'greek-location', tier: '1', tier_label: 'Tier-1' },
  { id: 'helios', domain: 'hēlios.com', punycode: 'xn--hlios-iza.com', pantheon: 'greek', tier: '1', tier_label: 'Tier-1' },
  { id: 'alfheimr', domain: 'álfheimr.com', punycode: 'xn--lfheimr-gwa.com', pantheon: 'norse', tier: '2', tier_label: 'Tier-2' },
  { id: 'jotunheimr', domain: 'jötunheimr.com', punycode: 'xn--jtunheimr-07a.com', pantheon: 'norse', tier: '2', tier_label: 'Tier-2' },
  { id: 'midgardr', domain: 'miðgarðr.com', punycode: 'xn--migarr-qwad.com', pantheon: 'norse', tier: '2', tier_label: 'Tier-2' },
  { id: 'helheimr', domain: 'helheimr.com', punycode: 'helheimr.com', pantheon: 'norse', tier: '2', tier_label: 'Tier-2' },
  { id: 'ragnarok', domain: 'ragnarǫk.com', punycode: 'xn--ragnark-fnc.com', pantheon: 'norse', tier: '2', tier_label: 'Tier-2' },
  { id: 'odinn', domain: 'óðinn.com', punycode: 'xn--inn-2mao.com', pantheon: 'norse', tier: '2', tier_label: 'Tier-2' },
  { id: 'thor', domain: 'þórr.com', punycode: 'xn--rr-4ja7b.com', pantheon: 'norse', tier: '2', tier_label: 'Tier-2' },
  { id: 'ra', domain: 'rꜥ.com', punycode: 'xn--r-2w3e.com', pantheon: 'egyptian', tier: '1', tier_label: 'Tier-1' },
  { id: 'shiva', domain: 'śiva.com', punycode: 'xn--iva-bza.com', pantheon: 'sanskrit', tier: '1', tier_label: 'Tier-1' },
  { id: 'kyoto', domain: 'kyōto.com', punycode: 'xn--kyto-m3a.com', pantheon: 'japanese', tier: '1', tier_label: 'Tier-1' },
  { id: 'osaka', domain: 'ōsaka.com', punycode: 'xn--saka-k3a.com', pantheon: 'japanese', tier: '1', tier_label: 'Tier-1' },
  { id: 'kobe', domain: 'kōbe.com', punycode: 'xn--kbe-qxa.com', pantheon: 'japanese', tier: '1', tier_label: 'Tier-1' },
  { id: 'athenai', domain: 'athēnai.com', punycode: 'xn--athnai-r3a.com', pantheon: 'greek-location', tier: '1', tier_label: 'Tier-1' },
];

const insertSite = db.prepare(`
  INSERT OR REPLACE INTO indexed_sites 
  (domain, punycode, lexicon_entry_id, pantheon, tier, tier_label, status, is_flagship, title, description)
  VALUES (?, ?, ?, ?, ?, ?, 'active', 1, ?, ?)
`);

for (const f of flagships) {
  insertSite.run(
    f.domain,
    f.punycode,
    f.id,
    f.pantheon,
    f.tier,
    f.tier_label,
    `PUNYCODEX Temple: ${f.domain}`,
    `Scholarly restoration of ${f.id} with full Unicode orthography.`
  );
}

// Populate availability table with all lexicon entries that have no site
const entries = db.prepare(`
  SELECT e.id, e.ascii, e.unicode, e.pantheon, e.tier
  FROM entries e
  LEFT JOIN indexed_sites s ON e.id = s.lexicon_entry_id
  WHERE s.id IS NULL
`).all();

const insertAvail = db.prepare(`
  INSERT OR REPLACE INTO availability (entry_id, domain, punycode, status)
  VALUES (?, ?, ?, 'available')
`);

for (const e of entries) {
  // Generate likely punycode domain
  const punycode = require('url').domainToASCII(`${e.ascii}.com`);
  insertAvail.run(e.id, `${e.unicode}.com`, punycode);
}

console.log(`\nSeeded ${flagships.length} flagship sites`);
console.log(`Marked ${entries.length} entries as available`);
console.log(`Total indexed sites: ${db.prepare('SELECT COUNT(*) as c FROM indexed_sites').get().c}`);
console.log(`Total available: ${db.prepare('SELECT COUNT(*) as c FROM availability').get().c}`);

db.close();
