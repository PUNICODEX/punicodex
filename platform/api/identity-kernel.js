/**
 * PÚNYCODEX — Canonical Identity Kernel 2.0
 *
 * In-memory identity registry that powers the Name Authenticity Shield.
 * Bridges brand/trademark/lexicon identities with visual/folded matching.
 */

const { domainToUnicode } = require('node:url');
const { getDb } = require('../db/connection');
const { migrateIdentities } = require('../db/migrate-identities');
const { buildSkeleton, skeletonSimilarity } = require('./confusable-atlas');
const { toSearchKey } = require('./query-normalize');

let identityCache = null;
let identityCacheBuiltAt = 0;
const CACHE_TTL_MS = 60_000;

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function stringify(value) {
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value;
  return JSON.stringify(value);
}

function normalizeForMatch(str) {
  return String(str).normalize('NFKC').toLowerCase();
}

function normalizeInput(str) {
  return String(str).trim();
}

function normalizeDomain(domain) {
  const raw = String(domain)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');

  let display = raw;
  if (raw.includes('xn--')) {
    try {
      display = domainToUnicode(raw);
    } catch {
      display = raw;
    }
  }
  return { raw, display };
}

function ensureMigrated(db) {
  const table = db
    .prepare("SELECT 1 FROM sqlite_master WHERE type='table' AND name='identities'")
    .get();
  if (!table) {
    migrateIdentities({ db });
  }
}

function resetCache() {
  identityCache = null;
  identityCacheBuiltAt = 0;
}

function loadIdentities() {
  const now = Date.now();
  if (identityCache && now - identityCacheBuiltAt < CACHE_TTL_MS) {
    return identityCache;
  }

  const db = getDb();
  ensureMigrated(db);

  const rows = db.prepare('SELECT * FROM identities').all();
  const aliases = db.prepare('SELECT * FROM identity_aliases').all();
  const domains = db.prepare('SELECT * FROM identity_allowed_domains').all();

  const byId = new Map();
  for (const row of rows) {
    byId.set(row.id, {
      ...row,
      scripts: parseJson(row.scripts) || [],
      allowed_domains: parseJson(row.allowed_domains) || [],
      blocked_patterns: parseJson(row.blocked_patterns) || [],
      data: parseJson(row.data) || {},
      aliases: [],
      allowedDomains: [],
    });
  }

  for (const alias of aliases) {
    const identity = byId.get(alias.identity_id);
    if (identity) {
      identity.aliases.push(alias.alias);
    }
  }

  for (const domain of domains) {
    const identity = byId.get(domain.identity_id);
    if (identity) {
      identity.allowedDomains.push(domain);
    }
  }

  for (const identity of byId.values()) {
    const aliasSet = new Set([
      identity.name,
      identity.ascii,
      identity.unicode,
      ...identity.aliases,
    ]);
    identity._normalizedAliases = new Set(
      Array.from(aliasSet).filter(Boolean).map(normalizeForMatch)
    );
    identity._foldedAliases = new Set(
      Array.from(aliasSet).filter(Boolean).map(toSearchKey).filter(Boolean)
    );
  }

  identityCache = Array.from(byId.values());
  identityCacheBuiltAt = now;
  return identityCache;
}

/**
 * Find identities matching the input by exact NFKC match, folded search key,
 * or visual skeleton similarity.
 */
function findIdentities(input, options = {}) {
  const raw = normalizeInput(input);
  const norm = normalizeForMatch(raw);
  const folded = toSearchKey(raw);
  const matchTypes = options.matchTypes || ['exact', 'folded', 'visual'];
  const threshold = options.threshold ?? 0.85;
  const includeLexicon = options.includeLexicon !== false;

  const identities = loadIdentities();
  const matches = [];

  for (const identity of identities) {
    if (!includeLexicon && identity.type === 'lexicon') {
      continue;
    }

    let matchType = null;
    let score = 0;
    let matchedAlias = null;

    if (matchTypes.includes('exact')) {
      if (identity._normalizedAliases.has(norm)) {
        matchType = 'exact';
        score = 1;
        matchedAlias = norm;
      }
    }

    if (!matchType && matchTypes.includes('folded') && folded) {
      if (identity._foldedAliases.has(folded)) {
        matchType = 'folded';
        score = 1;
        matchedAlias = folded;
      }
    }

    if (!matchType && matchTypes.includes('visual')) {
      const candidates = [
        identity.name,
        identity.unicode,
        identity.ascii,
        ...identity.aliases,
      ].filter(Boolean);
      for (const candidate of candidates) {
        const sim = skeletonSimilarity(raw, candidate);
        if (sim > score) {
          score = sim;
          matchedAlias = candidate;
        }
      }
      if (score > 0) {
        matchType = 'visual';
      }
    }

    if (matchType && (matchType !== 'visual' || score >= threshold)) {
      matches.push({ identity, matchType, score, matchedAlias });
    }
  }

  const typeRank = { exact: 0, folded: 1, visual: 2 };
  matches.sort((a, b) => {
    if (typeRank[a.matchType] !== typeRank[b.matchType]) {
      return typeRank[a.matchType] - typeRank[b.matchType];
    }
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    return (b.identity.priority || 0) - (a.identity.priority || 0);
  });

  return matches;
}

/**
 * Return the identity whose allowed domain list exactly matches the registrable
 * domain, or null if none.
 */
function findIdentityByDomain(domain) {
  const { raw, display } = normalizeDomain(domain);
  const identities = loadIdentities();

  for (const identity of identities) {
    for (const row of identity.allowedDomains) {
      if (
        row.domain === raw ||
        row.domain === display ||
        row.punycode === raw ||
        row.punycode === display
      ) {
        return identity;
      }
    }

    for (const allowed of identity.allowed_domains) {
      if (allowed === raw || allowed === display) {
        return identity;
      }
    }
  }

  return null;
}

function patternToRegexp(pattern) {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*');
  return new RegExp(`^${escaped}$`, 'i');
}

/**
 * Return the first identity whose blocked pattern matches the given domain or
 * label, or null if none.
 */
function findIdentityByBlockedPattern(domainOrLabel) {
  const target = String(domainOrLabel).toLowerCase();
  const identities = loadIdentities();

  for (const identity of identities) {
    for (const pattern of identity.blocked_patterns) {
      const re = patternToRegexp(pattern);
      if (re.test(target)) {
        return { identity, pattern };
      }
    }
  }

  return null;
}

function buildIdentityMatch(identity, matchType, alias) {
  return {
    id: identity.id,
    ascii: identity.ascii || null,
    unicode: identity.unicode || identity.name,
    name: identity.name,
    type: identity.type,
    owner: identity.owner || null,
    scripts: identity.scripts || [],
    pantheon: identity.data?.pantheon || null,
    tier: identity.data?.tier || null,
    matchType,
    matchedAlias: alias || null,
  };
}

function inferAliasType(alias, identity) {
  if (alias === identity.id) return 'name';
  if (alias === identity.ascii) return 'ascii';
  if (alias === identity.unicode) return 'unicode';
  if (alias.includes('.') || alias.startsWith('xn--')) return 'domain';
  return 'name';
}

function registerIdentity(data) {
  const db = getDb();
  ensureMigrated(db);

  const scripts = stringify(data.scripts);
  const allowedDomains = stringify(data.allowed_domains);
  const blockedPatterns = stringify(data.blocked_patterns);
  const extra = stringify(data.data);

  db.prepare(
    `INSERT OR IGNORE INTO identities
      (id, type, name, ascii, unicode, scripts, owner, priority, allowed_domains, blocked_patterns, data)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    data.id,
    data.type,
    data.name,
    data.ascii || null,
    data.unicode || null,
    scripts,
    data.owner || null,
    data.priority ?? 0,
    allowedDomains,
    blockedPatterns,
    extra
  );

  const aliases = new Set([data.id, data.name, data.ascii, data.unicode, ...(data.aliases || [])]);
  const insertAlias = db.prepare(
    'INSERT OR IGNORE INTO identity_aliases (identity_id, alias, alias_type) VALUES (?, ?, ?)'
  );
  for (const alias of aliases) {
    if (!alias) continue;
    insertAlias.run(data.id, alias, inferAliasType(alias, data));
  }

  const insertAllowed = db.prepare(
    'INSERT OR IGNORE INTO identity_allowed_domains (identity_id, domain, punycode, verification_method) VALUES (?, ?, ?, ?)'
  );
  for (const domain of data.allowed_domains || []) {
    const punycode = domain.includes('xn--') ? domain : null;
    insertAllowed.run(data.id, domain, punycode, data.verification_method || null);
  }

  resetCache();
  return loadIdentities().find((i) => i.id === data.id);
}

module.exports = {
  loadIdentities,
  findIdentities,
  findIdentityByDomain,
  findIdentityByBlockedPattern,
  buildIdentityMatch,
  registerIdentity,
  buildSkeleton,
  resetCache,
};
