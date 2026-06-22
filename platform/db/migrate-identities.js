/**
 * PÚNYCODEX — Canonical Identity Kernel 2.0 Migration
 *
 * Idempotent migration that creates the identity tables, upgrades the legacy
 * canonical_domains table, and seeds protected identities (brands + lexicon).
 */

const Database = require('better-sqlite3');
const fs = require('node:fs');
const path = require('node:path');
const { domainToASCII } = require('node:url');
const { getDbPath } = require('./db.js');

const SEED_PATH = path.join(__dirname, 'seeds', 'brand-identities.json');

function stringify(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function addColumn(db, table, column, type) {
  try {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`);
  } catch (_e) {
    // Column likely already exists; migration is idempotent.
  }
}

function loadLexicon() {
  const lexiconPath = path.join(__dirname, '..', '..', 'type', 'js', 'lexicon.js');
  const content = fs.readFileSync(lexiconPath, 'utf8');
  const wrapped = `${content}\nmodule.exports = LEXICON;`;
  const tmpPath = path.join(__dirname, '_temp_lexicon.js');
  fs.writeFileSync(tmpPath, wrapped);
  const lexicon = require(tmpPath);
  fs.unlinkSync(tmpPath);
  return lexicon;
}

function inferAliasType(alias, identity) {
  if (alias === identity.id) return 'name';
  if (alias === identity.ascii) return 'ascii';
  if (alias === identity.unicode) return 'unicode';
  if (alias.includes('.') || alias.startsWith('xn--')) return 'domain';
  return 'name';
}

function migrateIdentities(options = {}) {
  const db = options.db || new Database(getDbPath());
  const shouldClose = !options.db;

  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = OFF');

  db.exec(`
    CREATE TABLE IF NOT EXISTS identities (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('lexicon','brand','trademark','owned_domain')),
      name TEXT NOT NULL,
      ascii TEXT,
      unicode TEXT,
      scripts TEXT,
      owner TEXT,
      priority INTEGER DEFAULT 0,
      allowed_domains TEXT,
      blocked_patterns TEXT,
      data TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS identity_aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identity_id TEXT NOT NULL,
      alias TEXT NOT NULL,
      alias_type TEXT DEFAULT 'name',
      FOREIGN KEY(identity_id) REFERENCES identities(id)
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_identity_alias_unique
      ON identity_aliases(alias, identity_id);

    CREATE TABLE IF NOT EXISTS identity_allowed_domains (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      identity_id TEXT NOT NULL,
      domain TEXT NOT NULL,
      punycode TEXT,
      verification_method TEXT,
      FOREIGN KEY(identity_id) REFERENCES identities(id)
    );

    CREATE INDEX IF NOT EXISTS idx_identity_allowed_domain
      ON identity_allowed_domains(domain);
    CREATE INDEX IF NOT EXISTS idx_identity_allowed_punycode
      ON identity_allowed_domains(punycode);
  `);

  addColumn(db, 'canonical_domains', 'identity_id', 'TEXT');
  addColumn(db, 'canonical_domains', 'registrar', 'TEXT');
  addColumn(db, 'canonical_domains', 'registration_date', 'DATETIME');
  addColumn(db, 'canonical_domains', 'renewal_date', 'DATETIME');
  addColumn(db, 'canonical_domains', 'verification_method', 'TEXT');
  addColumn(
    db,
    'canonical_domains',
    'status',
    "TEXT DEFAULT 'active' CHECK(status IN ('active','expired','disputed','revoked'))"
  );

  const insertIdentity = db.prepare(`
    INSERT OR IGNORE INTO identities
      (id, type, name, ascii, unicode, scripts, owner, priority, allowed_domains, blocked_patterns, data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAlias = db.prepare(`
    INSERT OR IGNORE INTO identity_aliases (identity_id, alias, alias_type)
    VALUES (?, ?, ?)
  `);

  const insertAllowedDomain = db.prepare(`
    INSERT OR IGNORE INTO identity_allowed_domains (identity_id, domain, punycode, verification_method)
    VALUES (?, ?, ?, ?)
  `);

  // Seed brand identities.
  const brandSeeds = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  for (const identity of brandSeeds) {
    insertIdentity.run(
      identity.id,
      identity.type,
      identity.name,
      identity.ascii || null,
      identity.unicode || null,
      stringify(identity.scripts),
      identity.owner || null,
      identity.priority ?? 0,
      stringify(identity.allowed_domains),
      stringify(identity.blocked_patterns),
      stringify(identity.data)
    );

    const aliases = new Set([
      identity.id,
      identity.name,
      identity.ascii,
      identity.unicode,
      ...(identity.aliases || []),
    ]);
    for (const alias of aliases) {
      if (!alias) continue;
      insertAlias.run(identity.id, alias, inferAliasType(alias, identity));
    }

    for (const domain of identity.allowed_domains || []) {
      const punycode = domain.includes('xn--') ? domain : domainToASCII(domain);
      insertAllowedDomain.run(identity.id, domain, punycode, identity.verification_method || null);
    }
  }

  // Seed lexicon identities.
  const lexicon = loadLexicon();
  const selectDomains = db.prepare(
    'SELECT domain, punycode FROM canonical_domains WHERE entry_id = ?'
  );

  const seedLexicon = db.transaction((entries) => {
    for (const entry of entries) {
      const scripts = entry.pantheon === 'greek' ? ['Greek', 'Latin'] : ['Latin'];
      const variants = entry.variants || [];
      const aliasValues = [
        entry.id,
        entry.ascii,
        entry.unicode,
        ...variants.filter((v) => v && typeof v.unicode === 'string').map((v) => v.unicode),
      ];

      const data = {
        pantheon: entry.pantheon,
        tier: entry.tier,
        hasFlagship: entry.hasFlagship || false,
      };

      insertIdentity.run(
        entry.id,
        'lexicon',
        entry.unicode,
        entry.ascii || null,
        entry.unicode || null,
        stringify(scripts),
        null,
        0,
        null,
        null,
        stringify(data)
      );

      const seenAliases = new Set();
      for (const alias of aliasValues) {
        if (!alias || seenAliases.has(alias)) continue;
        seenAliases.add(alias);
        insertAlias.run(entry.id, alias, inferAliasType(alias, entry));
      }

      const domains = selectDomains.all(entry.id);
      for (const row of domains) {
        insertAllowedDomain.run(entry.id, row.domain, row.punycode, 'canonical-domain-seed');
      }
    }
  });

  seedLexicon(lexicon);

  db.pragma('foreign_keys = ON');

  if (shouldClose) {
    db.close();
  }

  return { brands: brandSeeds.length, lexiconEntries: lexicon.length };
}

if (require.main === module) {
  const result = migrateIdentities();
  console.log(
    `Identity migration applied: ${result.brands} brands, ${result.lexiconEntries} lexicon entries.`
  );
}

module.exports = { migrateIdentities };
