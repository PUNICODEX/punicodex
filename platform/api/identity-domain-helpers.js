/**
 * PuniCodex — Identity / Domain Helpers
 *
 * Determines whether a protected identity is legitimately present at a given
 * registrable domain, and discovers when an identity name appears in a
 * subdomain or label of an unrelated domain.
 */

const { getDb } = require('../db/connection');
const { findIdentities, buildIdentityMatch } = require('./identity-kernel');
const { decompose } = require('./name-decomposer');
const { CONFUSABLE_TO_ASCII } = require('./confusable-atlas');

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function normalizeDomain(domain) {
  return String(domain)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
}

function primaryLabel(registrableDomain) {
  const parts = normalizeDomain(registrableDomain).split('.');
  if (parts.length < 2) return parts[0] || '';
  parts.pop(); // remove public suffix
  return parts[0] || '';
}

/**
 * Return true if `registrableDomain` is an allowed/canonical domain for the
 * matched identity. Works for both lexicon entries (canonical_domains table)
 * and brand identities (identity_allowed_domains table).
 */
function hasExplicitAllowedDomains(identityMatch) {
  if (!identityMatch) return false;
  if (identityMatch.type !== 'lexicon') return true;
  try {
    const db = getDb();
    const row = db
      .prepare('SELECT 1 FROM canonical_domains WHERE entry_id = ? LIMIT 1')
      .get(identityMatch.id);
    return !!row;
  } catch (_e) {
    return false;
  }
}

function isIdentityAllowedForDomain(identityMatch, registrableDomain) {
  if (!identityMatch || !registrableDomain) return false;
  const raw = normalizeDomain(registrableDomain);

  // Lexicon entries without explicit owned/canonical domains are public names:
  // they may appear on any registrable domain without being considered a
  // lookalike. Lexicon entries with owned domains are still allowed when the
  // registrable domain's primary label exactly matches the identity, because
  // that is the natural home for the canonical name (e.g. zeus.com). Brand
  // identities must match an explicit allowed domain.
  if (identityMatch.type === 'lexicon') {
    if (!hasExplicitAllowedDomains(identityMatch)) return true;
    const label = primaryLabel(registrableDomain);
    const names = new Set(
      [identityMatch.id, identityMatch.ascii, identityMatch.unicode]
        .filter(Boolean)
        .map((n) => n.toLowerCase())
    );
    if (names.has(label)) return true;
  }

  try {
    const db = getDb();
    if (identityMatch.type === 'lexicon') {
      const row = db
        .prepare(
          `SELECT 1 FROM canonical_domains
            WHERE entry_id = ? AND (domain = ? OR punycode = ?)
            LIMIT 1`
        )
        .get(identityMatch.id, raw, raw);
      if (row) return true;
    } else {
      const row = db
        .prepare(
          `SELECT 1 FROM identity_allowed_domains
            WHERE identity_id = ? AND (domain = ? OR punycode = ?)
            LIMIT 1`
        )
        .get(identityMatch.id, raw, raw);
      if (row) return true;
      const identity = db
        .prepare('SELECT allowed_domains FROM identities WHERE id = ?')
        .get(identityMatch.id);
      const allowed = parseJson(identity?.allowed_domains) || [];
      if (allowed.includes(raw)) return true;
    }
  } catch (_e) {
    // Tables may not exist in some test environments.
  }
  return false;
}

/**
 * Search every decoded hostname label for exact/folded/visual identity matches.
 * Returns the first match whose identity is *not* allowed at the registrable
 * domain, i.e. a lookalike placed in a subdomain or unrelated label.
 */
function findSubdomainIdentityLookalike(domainInfo) {
  const registrableDomain = domainInfo?.registrableDomain || domainInfo?.domain;
  if (!domainInfo?.decodedLabels?.length || !registrableDomain) return null;
  const registrable = normalizeDomain(registrableDomain);

  for (const label of domainInfo.decodedLabels) {
    if (!label || label === 'www') continue;
    const candidates = new Set([label, ...label.split(/[-_]/)]);
    for (const candidate of candidates) {
      // Visual skeleton scans are expensive and rarely needed for plain-ASCII
      // labels; only run them when the label already carries deception signals.
      // Avoid the heavy decomposer for ASCII labels and just check confusables.
      let hasDeception = false;
      let nonAscii = false;
      for (const ch of candidate) {
        const cp = ch.codePointAt(0);
        if (cp > 127) {
          nonAscii = true;
          break;
        }
        if (CONFUSABLE_TO_ASCII.has(ch)) {
          hasDeception = true;
        }
      }
      if (nonAscii) {
        const decomposition = decompose(candidate);
        hasDeception = decomposition.hasConfusables || decomposition.hasMixedScripts;
      }
      const matches = findIdentities(candidate, {
        includeLexicon: true,
        matchTypes: hasDeception ? ['exact', 'folded', 'visual'] : ['exact', 'folded'],
        threshold: 0.9,
      });
      for (const match of matches) {
        const identityMatch = buildIdentityMatch(
          match.identity,
          match.matchType,
          match.matchedAlias
        );
        if (!isIdentityAllowedForDomain(identityMatch, registrable)) {
          return {
            label,
            identityMatch,
            matchType: match.matchType,
            registrableDomain: registrable,
          };
        }
      }
    }
  }
  return null;
}

module.exports = {
  isIdentityAllowedForDomain,
  findSubdomainIdentityLookalike,
  normalizeDomain,
};
