/**
 * PÚNYCODEX — Brand & Trademark Shield
 *
 * High-level brand protection layer built on top of the identity kernel.
 * Decides whether an input name or domain impersonates, legitimately represents,
 * or has no relation to a protected brand/trademark identity.
 */

const {
  findIdentities,
  findIdentityByDomain,
  findIdentityByBlockedPattern,
  buildIdentityMatch,
  loadIdentities,
} = require('./identity-kernel');
const { decompose } = require('./name-decomposer');
const { VERDICTS, SEVERITIES, VERDICT_SEVERITY } = require('./authenticity-verdicts');

const BRAND_TYPES = new Set(['brand', 'trademark', 'owned_domain']);

function isBrandIdentity(identity) {
  return BRAND_TYPES.has(identity?.type);
}

function normalizeInput(str) {
  return String(str || '').trim();
}

function normalizeDomain(domain) {
  const raw = String(domain)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');
  return raw;
}

function extractLabel(domain) {
  return domain.split('.')[0] || domain;
}

function hasDeceptionSignals(input) {
  const decomposition = decompose(input);
  return (
    decomposition.hasMixedScripts ||
    decomposition.chars.some((c) => c.isConfusable || c.isInvisible) ||
    decomposition.hasBidirectionalOverride
  );
}

/**
 * Find the best matching brand/trademark identity for a name or label.
 * If `domain` is provided, it is used to disambiguate between colliding brands
 * (e.g., Hermès luxury vs. Hermes courier).
 */
function lookupBrand(input, options = {}) {
  const raw = normalizeInput(input);
  if (!raw) return null;

  const domainHint = options.domain ? normalizeDomain(options.domain) : null;

  // Domain context wins when it matches an allowed domain exactly.
  if (domainHint) {
    const domainIdentity = findIdentityByDomain(domainHint);
    if (domainIdentity && isBrandIdentity(domainIdentity)) {
      return buildIdentityMatch(domainIdentity, 'domain', domainHint);
    }
  }

  const matches = findIdentities(raw, {
    includeLexicon: false,
    matchTypes: options.matchTypes || ['exact', 'folded', 'visual'],
    threshold: options.threshold ?? 0.85,
  });

  const brandMatches = matches.filter((m) => isBrandIdentity(m.identity));
  if (brandMatches.length === 0) return null;

  // Prefer exact/folded over visual, then highest priority.
  const typeRank = { exact: 0, folded: 1, visual: 2 };
  brandMatches.sort((a, b) => {
    if (typeRank[a.matchType] !== typeRank[b.matchType]) {
      return typeRank[a.matchType] - typeRank[b.matchType];
    }
    if (b.score !== a.score) return b.score - a.score;
    return (b.identity.priority || 0) - (a.identity.priority || 0);
  });

  const best = brandMatches[0];
  return buildIdentityMatch(best.identity, best.matchType, best.matchedAlias);
}

/**
 * Check whether a domain (or its registrable label) matches a brand's allowed
 * domain or blocked pattern.
 */
function checkDomainAgainstBrands(domain) {
  const raw = normalizeDomain(domain);
  const label = extractLabel(raw);

  const allowedIdentity = findIdentityByDomain(raw);
  if (allowedIdentity && isBrandIdentity(allowedIdentity)) {
    return {
      identity: buildIdentityMatch(allowedIdentity, 'exact', raw),
      matchType: 'allowed-domain',
      blockedPattern: null,
    };
  }

  const blocked = findIdentityByBlockedPattern(raw) || findIdentityByBlockedPattern(label);
  if (blocked && isBrandIdentity(blocked.identity)) {
    return {
      identity: buildIdentityMatch(blocked.identity, 'blocked', blocked.pattern),
      matchType: 'blocked-pattern',
      blockedPattern: blocked.pattern,
    };
  }

  return null;
}

/**
 * Combine identity-kernel matching with deception signals to render a verdict
 * about whether the input impersonates a protected brand.
 */
function classifyBrandSpoof(input, domain = null) {
  const raw = normalizeInput(input);
  const domainCheck = domain ? checkDomainAgainstBrands(domain) : null;

  // Allowed domain: legitimate brand presence.
  if (domainCheck?.matchType === 'allowed-domain') {
    const hasDeception = hasDeceptionSignals(raw) || hasDeceptionSignals(domain);
    return {
      verdict: hasDeception ? VERDICTS.STYLED : VERDICTS.CANONICAL,
      severity: VERDICT_SEVERITY[hasDeception ? VERDICTS.STYLED : VERDICTS.CANONICAL],
      reason: `Allowed domain for ${domainCheck.identity.name}`,
      canonicalMatch: domainCheck.identity,
      isBrandTarget: true,
      allowedDomainMatch: true,
      blockedPatternMatch: false,
    };
  }

  // Blocked pattern: known abusive structure.
  if (domainCheck?.matchType === 'blocked-pattern') {
    return {
      verdict: VERDICTS.LOOKALIKE_DOMAIN,
      severity: SEVERITIES.HIGH,
      reason: `Domain/label matches blocked pattern for ${domainCheck.identity.name}`,
      canonicalMatch: domainCheck.identity,
      isBrandTarget: true,
      allowedDomainMatch: false,
      blockedPatternMatch: true,
    };
  }

  const brandMatch = lookupBrand(raw, { domain });
  if (!brandMatch) {
    return {
      verdict: VERDICTS.UNKNOWN,
      severity: SEVERITIES.NONE,
      reason: 'No protected brand match',
      canonicalMatch: null,
      isBrandTarget: false,
      allowedDomainMatch: false,
      blockedPatternMatch: false,
    };
  }

  const deception = hasDeceptionSignals(raw);
  const exactOrFolded = brandMatch.matchType === 'exact' || brandMatch.matchType === 'folded';

  if (exactOrFolded && !deception) {
    return {
      verdict: VERDICTS.STYLED,
      severity: SEVERITIES.LOW,
      reason: `Recognized brand identity ${brandMatch.name}`,
      canonicalMatch: brandMatch,
      isBrandTarget: true,
      allowedDomainMatch: false,
      blockedPatternMatch: false,
    };
  }

  // Visual/folded match with deception signals is a spoof.
  const severity =
    brandMatch.matchType === 'visual' || deception ? SEVERITIES.HIGH : SEVERITIES.LOW;
  const verdict =
    brandMatch.matchType === 'visual' || deception ? VERDICTS.HOMOGRAPH_SPOOF : VERDICTS.STYLED;

  return {
    verdict,
    severity,
    reason:
      verdict === VERDICTS.HOMOGRAPH_SPOOF
        ? `Visual spoof of ${brandMatch.name}`
        : `Recognized brand identity ${brandMatch.name}`,
    canonicalMatch: brandMatch,
    isBrandTarget: true,
    allowedDomainMatch: false,
    blockedPatternMatch: false,
  };
}

/**
 * Return every registered brand/trademark identity.
 */
function listBrandIdentities() {
  return loadIdentities().filter((identity) => isBrandIdentity(identity));
}

module.exports = {
  lookupBrand,
  checkDomainAgainstBrands,
  classifyBrandSpoof,
  listBrandIdentities,
  isBrandIdentity,
};
