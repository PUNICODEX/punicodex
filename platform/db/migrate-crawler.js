const Database = require('better-sqlite3');
const path = require('node:path');

const DB_PATH = path.join(__dirname, 'punicodex.db');
const db = new Database(DB_PATH);

// Drop old FTS if exists (for rebuild)
db.exec(`DROP TABLE IF EXISTS indexed_sites_fts;`);

// Create indexed_sites table with all columns
db.exec(`
  CREATE TABLE IF NOT EXISTS indexed_sites (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL UNIQUE,
    punycode TEXT NOT NULL,
    title TEXT,
    description TEXT,
    h1 TEXT,
    first_p TEXT,
    content_snippet TEXT,
    lexicon_entry_id TEXT,
    pantheon TEXT,
    tier TEXT,
    tier_label TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('active', 'unresolved', 'error', 'pending', 'spam')),
    is_flagship INTEGER DEFAULT 0,
    tenant_name TEXT,
    tenant_category TEXT,
    tenant_front_url TEXT,
    archetype_score REAL DEFAULT 0.0,
    archetype_signals TEXT,
    archetype_version TEXT,
    lease_status TEXT DEFAULT 'available' CHECK (lease_status IN ('available', 'leased', 'reserved', 'flagship')),
    trust_tier TEXT CHECK (trust_tier IN ('canonical', 'styled', 'suspicious', 'unsafe', 'unknown')),
    -- Open Graph
    og_title TEXT,
    og_description TEXT,
    og_image TEXT,
    og_type TEXT,
    og_site_name TEXT,
    og_url TEXT,
    og_locale TEXT,
    -- Twitter Cards
    twitter_title TEXT,
    twitter_description TEXT,
    twitter_image TEXT,
    twitter_card TEXT,
    twitter_site TEXT,
    -- Structured Data
    json_ld TEXT,
    -- Favicon & Visual
    favicon_url TEXT,
    favicon_path TEXT,
    og_image_path TEXT,
    -- Language
    lang TEXT,
    -- Headings
    h1_count INTEGER DEFAULT 0,
    h2_count INTEGER DEFAULT 0,
    h3_count INTEGER DEFAULT 0,
    h4_count INTEGER DEFAULT 0,
    h5_count INTEGER DEFAULT 0,
    h6_count INTEGER DEFAULT 0,
    headings_h2 TEXT,
    -- Links
    internal_links INTEGER DEFAULT 0,
    external_links INTEGER DEFAULT 0,
    -- Content Quality
    word_count INTEGER DEFAULT 0,
    content_ratio REAL DEFAULT 0.0,
    -- SEO Meta
    meta_robots TEXT,
    canonical_url TEXT,
    meta_keywords TEXT,
    meta_author TEXT,
    -- Technical
    response_time_ms INTEGER,
    content_length INTEGER,
    redirect_count INTEGER DEFAULT 0,
    -- Date
    published_date TEXT,
    -- Quality / Spam
    spam_score REAL DEFAULT 0.0,
    quality_score REAL DEFAULT 0.0,
    content_hash TEXT,
    last_crawled DATETIME,
    next_crawl_after DATETIME,
    crawl_interval_days INTEGER DEFAULT 7,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lexicon_entry_id) REFERENCES entries(id)
  );

`);

// Create indexes (after column upgrades to ensure columns exist)
const createIndexes = () => {
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_sites_entry ON indexed_sites(lexicon_entry_id);
    CREATE INDEX IF NOT EXISTS idx_sites_status ON indexed_sites(status);
    CREATE INDEX IF NOT EXISTS idx_sites_pantheon ON indexed_sites(pantheon);
    CREATE INDEX IF NOT EXISTS idx_sites_flagship ON indexed_sites(is_flagship);
    CREATE INDEX IF NOT EXISTS idx_sites_spam ON indexed_sites(spam_score);
    CREATE INDEX IF NOT EXISTS idx_sites_last_crawled ON indexed_sites(last_crawled);
    CREATE INDEX IF NOT EXISTS idx_sites_next_crawl_after ON indexed_sites(next_crawl_after);
  `);
};

// Add columns if upgrading from older schema
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
  ['spam_score', 'REAL DEFAULT 0.0'],
  ['quality_score', 'REAL DEFAULT 0.0'],
  ['anchor_texts', 'TEXT'],
  ['sitemap_url', 'TEXT'],
  ['sitemap_entries', 'INTEGER DEFAULT 0'],
  ['og_video', 'TEXT'],
  ['og_video_type', 'TEXT'],
  ['rating_value', 'REAL'],
  ['rating_count', 'INTEGER'],
  ['flesch_reading_ease', 'REAL'],
  ['flesch_kincaid_grade', 'REAL'],
  ['freshness_score', 'REAL'],
  ['readability_score', 'REAL'],
  ['simhash', 'TEXT'],
  ['next_crawl_after', 'DATETIME'],
  ['crawl_interval_days', 'INTEGER DEFAULT 7'],
  [
    'trust_tier',
    "TEXT CHECK (trust_tier IN ('canonical', 'styled', 'suspicious', 'unsafe', 'unknown'))",
  ],
];
for (const [col, type] of upgradeCols) {
  try {
    db.exec(`ALTER TABLE indexed_sites ADD COLUMN ${col} ${type}`);
    console.log(`  + Added ${col} column`);
  } catch (_e) {
    /* already exists */
  }
}

// Now safe to create indexes that reference upgraded columns
createIndexes();

// Create crawl_queue table for domain discovery
db.exec(`
  CREATE TABLE IF NOT EXISTS crawl_queue (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL UNIQUE,
    punycode TEXT NOT NULL,
    source TEXT DEFAULT 'manual',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'crawling', 'crawled', 'error', 'spam', 'skipped')),
    priority INTEGER DEFAULT 0,
    discovery_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    crawl_date DATETIME,
    error_message TEXT,
    spam_score REAL DEFAULT 0.0,
    quality_score REAL DEFAULT 0.0
  );
  CREATE INDEX IF NOT EXISTS idx_queue_status ON crawl_queue(status);
  CREATE INDEX IF NOT EXISTS idx_queue_priority ON crawl_queue(priority);
`);

// Create crawl_history table for auditability
db.exec(`
  CREATE TABLE IF NOT EXISTS crawl_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('active', 'error', 'unchanged', 'spam', 'skipped')),
    error TEXT,
    content_hash TEXT,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    finished_at DATETIME,
    FOREIGN KEY (site_id) REFERENCES indexed_sites(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_crawl_history_site ON crawl_history(site_id);
  CREATE INDEX IF NOT EXISTS idx_crawl_history_started ON crawl_history(started_at);
`);

// Create discovered_domains tracking
db.exec(`
  CREATE TABLE IF NOT EXISTS discovered_domains (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    domain TEXT NOT NULL UNIQUE,
    punycode TEXT NOT NULL,
    source TEXT DEFAULT 'ct-log',
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    last_seen DATETIME DEFAULT CURRENT_TIMESTAMP,
    ct_log_id TEXT,
    cert_issuer TEXT,
    cert_not_before DATETIME,
    cert_not_after DATETIME
  );
`);

// Create entity_mentions table for knowledge layer
db.exec(`
  CREATE TABLE IF NOT EXISTS entity_mentions (
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
  CREATE INDEX IF NOT EXISTS idx_entity_site ON entity_mentions(site_id);
  CREATE INDEX IF NOT EXISTS idx_entity_entry ON entity_mentions(entry_id);
  CREATE INDEX IF NOT EXISTS idx_entity_pantheon ON entity_mentions(pantheon);
`);

// Create site_pages table for deep crawl sub-pages
db.exec(`
  CREATE TABLE IF NOT EXISTS site_pages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    title TEXT,
    description TEXT,
    h1 TEXT,
    content_snippet TEXT,
    word_count INTEGER DEFAULT 0,
    content_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES indexed_sites(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_site_pages_site ON site_pages(site_id);
`);

// Create FTS5 virtual table for web search
db.exec(`
  CREATE VIRTUAL TABLE IF NOT EXISTS indexed_sites_fts USING fts5(
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

// Rebuild FTS index from existing data
const existingCount = db.prepare('SELECT COUNT(*) as c FROM indexed_sites').get().c;
if (existingCount > 0) {
  db.exec(`INSERT INTO indexed_sites_fts(indexed_sites_fts) VALUES('rebuild')`);
}

// Create links table for link graph / PageRank
// Stores directed edges between indexed sites
db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    from_site_id INTEGER NOT NULL,
    to_site_id INTEGER NOT NULL,
    from_url TEXT,
    to_url TEXT NOT NULL,
    anchor_text TEXT,
    nofollow INTEGER DEFAULT 0,
    discovered_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(from_site_id, to_site_id, to_url),
    FOREIGN KEY (from_site_id) REFERENCES indexed_sites(id) ON DELETE CASCADE,
    FOREIGN KEY (to_site_id) REFERENCES indexed_sites(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_links_from ON links(from_site_id);
  CREATE INDEX IF NOT EXISTS idx_links_to ON links(to_site_id);
  CREATE INDEX IF NOT EXISTS idx_links_nofollow ON links(nofollow);
`);

// Create embeddings table for vector semantic search
db.exec(`
  CREATE TABLE IF NOT EXISTS embeddings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    site_id INTEGER NOT NULL UNIQUE,
    embedding BLOB NOT NULL,
    model_version TEXT DEFAULT 'Xenova/all-MiniLM-L6-v2',
    content_hash TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (site_id) REFERENCES indexed_sites(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_embeddings_site ON embeddings(site_id);
`);

// Add link graph columns to indexed_sites
const linkGraphCols = [
  ['pagerank', 'REAL DEFAULT 0.0'],
  ['authority_score', 'REAL DEFAULT 0.0'],
  ['incoming_links', 'INTEGER DEFAULT 0'],
];
for (const [col, type] of linkGraphCols) {
  try {
    db.exec(`ALTER TABLE indexed_sites ADD COLUMN ${col} ${type}`);
    console.log(`  + Added ${col} column`);
  } catch (_e) {
    /* already exists */
  }
}

// Create search analytics tables for click feedback loop
db.exec(`
  CREATE TABLE IF NOT EXISTS search_queries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query TEXT NOT NULL,
    result_count INTEGER DEFAULT 0,
    mode TEXT DEFAULT 'web',
    user_agent_hash TEXT,
    ip_hash TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_queries_query ON search_queries(query);
  CREATE INDEX IF NOT EXISTS idx_queries_time ON search_queries(timestamp);
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS search_clicks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_id INTEGER NOT NULL,
    site_id INTEGER NOT NULL,
    position INTEGER DEFAULT 0,
    clicked_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    dwell_time_ms INTEGER,
    FOREIGN KEY (query_id) REFERENCES search_queries(id) ON DELETE CASCADE,
    FOREIGN KEY (site_id) REFERENCES indexed_sites(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_clicks_query ON search_clicks(query_id);
  CREATE INDEX IF NOT EXISTS idx_clicks_site ON search_clicks(site_id);
  CREATE INDEX IF NOT EXISTS idx_clicks_time ON search_clicks(clicked_at);
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
console.log(
  '  - Created/updated indexed_sites table (with spam_score, quality_score, pagerank, authority_score)'
);
console.log('  - Created crawl_queue table');
console.log('  - Created discovered_domains table');
console.log('  - Created links table (link graph for PageRank)');
console.log('  - Created indexed_sites_fts (FTS5) with OG + Twitter content');
console.log('  - Created sync triggers');
console.log('  - Rebuilt FTS index from', existingCount, 'existing sites');

// Clear stale flagship rows before re-seeding so casing/variant changes take effect
db.exec('DELETE FROM indexed_sites WHERE is_flagship = 1');

// Seed with flagships — derive from built archetypes so the crawler stays in sync
// with the canonical source of truth (js/archetypes-v2.js).
const { ARCHETYPES } = require(path.join(__dirname, '..', '..', 'js', 'archetypes-v2.js'));
const flagships = ARCHETYPES.filter((a) => a.built).map((a) => ({
  id: a.id,
  domain: a.domainUnicode,
  punycode: a.domainPunycode,
  pantheon: a.pantheon,
  tier: a.tier === 'dual-tier' ? 'dual' : a.tier === 'tier-1' ? '1' : '2',
  tier_label: a.tier === 'dual-tier' ? 'Dual-Tier' : a.tier === 'tier-1' ? 'Tier-1' : 'Tier-2',
}));

const insertSite = db.prepare(`
  INSERT OR REPLACE INTO indexed_sites
  (domain, punycode, lexicon_entry_id, pantheon, tier, tier_label, status, is_flagship,
   title, description, h1, first_p, content_snippet,
   og_title, og_description, og_type, og_site_name,
   lang, h1_count, word_count, content_length,
   response_time_ms, meta_robots, canonical_url,
   next_crawl_after, crawl_interval_days)
  VALUES (?, ?, ?, ?, ?, ?, 'active', 1,
    ?, ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?, ?,
    ?, ?, ?,
    datetime('now','+7 days'), 7)
`);

for (const f of flagships) {
  if (!f.domain) continue; // Domain-less flagships have no live site to index.
  const title = `PUNICODEX Temple: ${f.domain}`;
  const desc = `Scholarly restoration of ${f.id} with full Unicode orthography.`;
  insertSite.run(
    f.domain,
    f.punycode || f.domain,
    f.id,
    f.pantheon,
    f.tier,
    f.tier_label,
    title,
    desc,
    title,
    desc,
    desc,
    title,
    desc,
    'website',
    'PUNICODEX',
    'en',
    1,
    desc.split(/\s+/).length,
    desc.length,
    0,
    'index,follow',
    `https://${f.punycode || f.domain}`
  );
}

// Populate availability table with all lexicon entries that have no site
const entries = db
  .prepare(`
  SELECT e.id, e.ascii, e.unicode, e.pantheon, e.tier
  FROM entries e
  LEFT JOIN indexed_sites s ON e.id = s.lexicon_entry_id
  WHERE s.id IS NULL
`)
  .all();

const insertAvail = db.prepare(`
  INSERT OR REPLACE INTO availability (entry_id, domain, punycode, status)
  VALUES (?, ?, ?, 'available')
`);

const { domainToASCII } = require('node:url');

for (const e of entries) {
  const unicodeDomain = `${e.unicode}.com`;
  const punycode = domainToASCII(unicodeDomain);
  insertAvail.run(e.id, unicodeDomain, punycode);
}

console.log(`\nSeeded ${flagships.length} flagship sites`);
console.log(`Marked ${entries.length} entries as available`);
console.log(
  `Total indexed sites: ${db.prepare('SELECT COUNT(*) as c FROM indexed_sites').get().c}`
);
console.log(`Total available: ${db.prepare('SELECT COUNT(*) as c FROM availability').get().c}`);
console.log(
  `FTS indexed sites: ${db.prepare('SELECT COUNT(*) as c FROM indexed_sites_fts').get().c}`
);

db.close();
