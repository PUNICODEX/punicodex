/**
 * PUNYCODEX Homograph Defense Service
 *
 * Defines and enforces the canonical trust model for Unicode transliterations:
 *
 *   canonical  — exactly matches a lexicon-verified transliteration (id, ascii,
 *                unicode, or search_key). These are the "real terms" we stand
 *                behind.
 *   styled     — a legitimate Unicode presentation of a canonical term
 *                (diacritics, macrons, etc.) that maps back to a canonical
 *                entry but is not the canonical form itself. Allowed with a
 *                flag; downgraded to suspicious for unverified third-party
 *                domains unless explicitly whitelisted.
 *   suspicious — mixed scripts, confusable-script substitutions, or unregistered
 *                Unicode that visually spoofs a canonical term.
 *   unsafe     — confirmed blocklist / phishing / malware.
 *
 * The service is intentionally conservative: if a string cannot be proven
 * canonical, it is treated with suspicion.
 */

const Database = require('better-sqlite3');
const { domainToUnicode } = require('node:url');
const { getDbPath } = require('../db/db');
const { analyzeConfusables, foldedSimilarity } = require('./confusables');
const { toSearchKey } = require('./query-normalize');

let db;

function getDb() {
  if (!db) {
    db = new Database(getDbPath());
    db.pragma('journal_mode = WAL');
  }
  return db;
}

const TRUST_TIERS = Object.freeze({
  CANONICAL: 'canonical',
  STYLED: 'styled',
  SUSPICIOUS: 'suspicious',
  UNSAFE: 'unsafe',
  UNKNOWN: 'unknown',
});

// Hard blocklist for known-bad patterns. In production this should be loaded
// from a table or external threat feed.
const UNSAFE_PATTERNS = [
  // Hard-coded regexes are intentionally empty by default. Project-specific
  // unsafe patterns should be inserted into the `unsafe_patterns` table so
  // they can be updated without a code deploy.
];

function getScript(ch) {
  const cp = ch.codePointAt(0);
  // Punctuation, combining marks, and symbols are script-neutral.
  if (
    (cp >= 0x0000 && cp <= 0x0040) || // C0 controls + basic punctuation
    (cp >= 0x005b && cp <= 0x0060) || // more punctuation
    (cp >= 0x007b && cp <= 0x00bf) || // punctuation + Latin-1 symbols
    (cp >= 0x0300 && cp <= 0x036f) || // combining diacritics
    cp === 0x00d7 ||
    cp === 0x00f7
  ) {
    return 'Common';
  }
  if (cp >= 0x0041 && cp <= 0x007a) return 'Latin'; // A-Z, a-z
  if (cp >= 0x00c0 && cp <= 0x017f) return 'Latin'; // Latin-1 Supplement + Extended-A
  if (cp >= 0x0180 && cp <= 0x024f) return 'Latin'; // Latin Extended-B
  if (cp >= 0x1e00 && cp <= 0x1eff) return 'Latin'; // Latin Extended Additional
  if (cp >= 0x0370 && cp <= 0x03ff) return 'Greek';
  if (cp >= 0x0400 && cp <= 0x04ff) return 'Cyrillic';
  if (cp >= 0x0530 && cp <= 0x058f) return 'Armenian';
  if (cp >= 0x10a0 && cp <= 0x10ff) return 'Georgian';
  if (cp >= 0x2e80 && cp <= 0x9fff) return 'CJK';
  if (cp >= 0xac00 && cp <= 0xd7af) return 'Hangul';
  if (cp >= 0x0600 && cp <= 0x06ff) return 'Arabic';
  if (cp >= 0x0750 && cp <= 0x077f) return 'Arabic';
  if (cp >= 0x0900 && cp <= 0x097f) return 'Devanagari';
  if (cp >= 0x12000 && cp <= 0x123ff) return 'Cuneiform';
  if (cp >= 0x16a0 && cp <= 0x16ff) return 'Runic';
  return 'Other';
}

function hasMixedScripts(str) {
  const scripts = new Set();
  for (const ch of String(str)) {
    const script = getScript(ch);
    if (script !== 'Inherited' && script !== 'Common') {
      scripts.add(script);
    }
  }
  return scripts.size > 1;
}

function isUnsafePattern(str) {
  for (const pattern of UNSAFE_PATTERNS) {
    if (pattern.test(str)) return true;
  }

  // Project-specific unsafe patterns are stored in the database so they can be
  // updated without redeploying code.
  try {
    const db = getDb();
    const row = db.prepare('SELECT 1 FROM unsafe_patterns WHERE ? LIKE pattern LIMIT 1').get(str);
    if (row) return true;
  } catch (_e) {
    // Table may not exist yet; fall through.
  }

  return false;
}

/**
 * Load canonical entries into memory. On Vercel this is cached per process.
 * For very large lexicons, switch to a prepared-statement cache or Redis.
 */
let canonicalCache = null;
let canonicalCacheBuiltAt = 0;
const CACHE_TTL_MS = 60_000;

function getCanonicalRows() {
  const now = Date.now();
  if (canonicalCache && now - canonicalCacheBuiltAt < CACHE_TTL_MS) {
    return canonicalCache;
  }
  const rows = getDb()
    .prepare(`SELECT id, ascii, unicode, search_key, pantheon, tier FROM entries`)
    .all();
  canonicalCache = rows;
  canonicalCacheBuiltAt = now;
  return rows;
}

function exactMatch(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function findCanonicalMatch(str) {
  const lower = String(str).toLowerCase();
  const searchKey = toSearchKey(str);

  let exact = null;
  let bestLookalike = null;
  let bestLookalikeScore = 0;

  for (const row of getCanonicalRows()) {
    if (
      exactMatch(lower, row.id) ||
      exactMatch(lower, row.ascii) ||
      exactMatch(lower, row.unicode) ||
      searchKey === row.search_key
    ) {
      exact = row;
      break;
    }

    const candidates = [row.id, row.ascii, row.unicode].filter(Boolean);
    for (const candidate of candidates) {
      const score = foldedSimilarity(str, candidate);
      if (score > bestLookalikeScore) {
        bestLookalikeScore = score;
        bestLookalike = { row, score };
      }
    }
  }

  return {
    exact,
    lookalike: bestLookalikeScore >= 0.85 ? bestLookalike : null,
    lookalikeScore: bestLookalikeScore,
  };
}

function computeVisualDeviation(str) {
  const s = String(str);
  if (s.length === 0) return 0;
  const confusable = analyzeConfusables(s);
  const mixed = hasMixedScripts(s) ? 0.5 : 0;
  return Math.min(1, confusable.risk + mixed);
}

/**
 * Classify any string (query, domain label, pathname) into a trust tier.
 */
function classifyTerm(str, options = {}) {
  const { strictDomains = false } = options;
  const s = String(str).trim();

  if (!s) {
    return {
      tier: TRUST_TIERS.UNKNOWN,
      canonicalMatch: null,
      reason: 'empty input',
      visualDeviation: 0,
      confusableAnalysis: analyzeConfusables(s),
    };
  }

  if (isUnsafePattern(s)) {
    return {
      tier: TRUST_TIERS.UNSAFE,
      canonicalMatch: null,
      reason: 'blocklist match',
      visualDeviation: 1,
      confusableAnalysis: analyzeConfusables(s),
    };
  }

  const confusable = analyzeConfusables(s);
  const mixedScripts = hasMixedScripts(s);
  const deviation = computeVisualDeviation(s);

  const { exact, lookalike, lookalikeScore } = findCanonicalMatch(s);

  // Exact canonical match
  if (exact) {
    return {
      tier: TRUST_TIERS.CANONICAL,
      canonicalMatch: {
        id: exact.id,
        ascii: exact.ascii,
        unicode: exact.unicode,
        pantheon: exact.pantheon,
        tier: exact.tier,
      },
      reason: 'exact canonical transliteration',
      visualDeviation: deviation,
      confusableAnalysis: confusable,
    };
  }

  // Mixed scripts or heavy confusable spoofing of a canonical term
  if ((mixedScripts || confusable.hasConfusables) && lookalike) {
    return {
      tier: TRUST_TIERS.SUSPICIOUS,
      canonicalMatch: {
        id: lookalike.row.id,
        ascii: lookalike.row.ascii,
        unicode: lookalike.row.unicode,
        pantheon: lookalike.row.pantheon,
        tier: lookalike.row.tier,
        similarity: lookalikeScore,
      },
      reason: mixedScripts
        ? 'mixed-script visual spoof of canonical term'
        : 'confusable-script visual spoof of canonical term',
      visualDeviation: deviation,
      confusableAnalysis: confusable,
    };
  }

  // Styled variant: non-ASCII but maps cleanly to canonical via search_key or NFD fold
  if (lookalike && !mixedScripts) {
    const tier = strictDomains ? TRUST_TIERS.SUSPICIOUS : TRUST_TIERS.STYLED;
    return {
      tier,
      canonicalMatch: {
        id: lookalike.row.id,
        ascii: lookalike.row.ascii,
        unicode: lookalike.row.unicode,
        pantheon: lookalike.row.pantheon,
        tier: lookalike.row.tier,
        similarity: lookalikeScore,
      },
      reason: strictDomains
        ? 'unverified styled variant of canonical term'
        : 'styled variant of canonical term',
      visualDeviation: deviation,
      confusableAnalysis: confusable,
    };
  }

  // Non-ASCII confusables or mixed scripts without a canonical mapping are
  // treated as suspicious because they are visually foreign to the Latin
  // canonical namespace. Pure-ASCII confusables (e.g. 1/l, 0/o) are only
  // suspicious when they produce a canonical lookalike; otherwise unknown.
  const hasNonAsciiConfusable = confusable.found.some((ch) => ch.charCodeAt(0) > 127);
  if (mixedScripts || hasNonAsciiConfusable || hasNonAsciiStyled(s)) {
    return {
      tier: TRUST_TIERS.SUSPICIOUS,
      canonicalMatch: null,
      reason: mixedScripts
        ? 'mixed-script label with no canonical basis'
        : 'non-ASCII characters with no canonical basis',
      visualDeviation: deviation,
      confusableAnalysis: confusable,
    };
  }

  return {
    tier: TRUST_TIERS.UNKNOWN,
    canonicalMatch: null,
    reason: 'no canonical match',
    visualDeviation: deviation,
    confusableAnalysis: confusable,
  };
}

function hasNonAsciiStyled(str) {
  for (const ch of String(str)) {
    if (ch.charCodeAt(0) > 127) return true;
  }
  return false;
}

/**
 * Classify a full domain/URL, stripping TLD and protocol.
 */
function classifyDomain(domain, options = {}) {
  const raw = String(domain)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');

  // punycode -> unicode display form for classification
  let display = raw;
  if (raw.includes('xn--')) {
    try {
      const decoded = raw
        .split('.')
        .map((label) => decodePuny(label) || label)
        .join('.');
      if (decoded) display = decoded;
    } catch {
      display = raw;
    }
  }

  // First check the canonical/verified domain registry.
  const registered = getDb()
    .prepare(
      `SELECT entry_id, trust_tier, source FROM canonical_domains WHERE domain = ? OR punycode = ?`
    )
    .get(raw, raw);

  if (registered) {
    const entry = getDb()
      .prepare(`SELECT id, ascii, unicode, pantheon, tier FROM entries WHERE id = ?`)
      .get(registered.entry_id);
    return {
      tier: registered.trust_tier,
      canonicalMatch: entry
        ? {
            id: entry.id,
            ascii: entry.ascii,
            unicode: entry.unicode,
            pantheon: entry.pantheon,
            tier: entry.tier,
          }
        : null,
      reason: `registered domain (${registered.source || 'canonical'})`,
      visualDeviation: 0,
      confusableAnalysis: analyzeConfusables(display),
      domain: raw,
      displayDomain: display,
    };
  }

  const label = display.split('.')[0];
  const result = classifyTerm(label, options);
  result.domain = raw;
  result.displayDomain = display;
  return result;
}

function decodePuny(label) {
  if (!label.startsWith('xn--')) return label;
  try {
    return domainToUnicode(label);
  } catch {
    return label;
  }
}

/**
 * Combine query and domain classifications into an overall verdict.
 */
function classifyQueryAndDomain(query, domain, options = {}) {
  const queryResult = query ? classifyTerm(query, options) : null;
  const domainResult = domain ? classifyDomain(domain, options) : null;

  const tiers = [queryResult?.tier, domainResult?.tier].filter(Boolean);
  const overall = tiers.includes(TRUST_TIERS.UNSAFE)
    ? TRUST_TIERS.UNSAFE
    : tiers.includes(TRUST_TIERS.SUSPICIOUS)
      ? TRUST_TIERS.SUSPICIOUS
      : tiers.includes(TRUST_TIERS.STYLED)
        ? TRUST_TIERS.STYLED
        : tiers.includes(TRUST_TIERS.CANONICAL)
          ? TRUST_TIERS.CANONICAL
          : TRUST_TIERS.UNKNOWN;

  return {
    overall,
    query: queryResult,
    domain: domainResult,
  };
}

module.exports = {
  TRUST_TIERS,
  classifyTerm,
  classifyDomain,
  classifyQueryAndDomain,
  computeVisualDeviation,
  hasMixedScripts,
};
