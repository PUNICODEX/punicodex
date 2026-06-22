/**
 * PÚNYCODEX Homograph Defense Service (Legacy Compatibility Shim)
 *
 * The canonical trust-model logic now lives in `authenticity-service.js`.
 * This file re-exports the original API surface so existing callers
 * (search, names-service, tests) continue to work unchanged.
 */

const {
  classifyTerm: _classifyTerm,
  classifyDomain: _classifyDomain,
  classifyQueryAndDomain: _classifyQueryAndDomain,
  computeVisualDeviation: _computeVisualDeviation,
} = require('./authenticity-service');
const { hasMixedScripts } = require('./name-decomposer');

// Backward-compatible trust tiers.
const TRUST_TIERS = Object.freeze({
  CANONICAL: 'canonical',
  STYLED: 'styled',
  SUSPICIOUS: 'suspicious',
  UNSAFE: 'unsafe',
  UNKNOWN: 'unknown',
});

/**
 * Classify any string (query, domain label, pathname) into a trust tier.
 * Returns the legacy shape expected by existing consumers.
 */
function classifyTerm(str, options = {}) {
  const result = _classifyTerm(str, options);
  return toLegacy(result);
}

/**
 * Classify a full domain/URL, stripping TLD and protocol.
 */
function classifyDomain(domain, options = {}) {
  const result = _classifyDomain(domain, options);
  return toLegacy(result);
}

/**
 * Combine query and domain classifications into an overall verdict.
 */
function classifyQueryAndDomain(query, domain, options = {}) {
  const result = _classifyQueryAndDomain(query, domain, options);
  return {
    overall: legacyTierFromVerdict(result.overall),
    query: result.query ? toLegacy(result.query) : null,
    domain: result.domain ? toLegacy(result.domain) : null,
  };
}

function computeVisualDeviation(str) {
  return _computeVisualDeviation(str);
}

function toLegacy(result) {
  return {
    tier: result.tier,
    canonicalMatch: result.canonicalMatch,
    reason: result.reason,
    visualDeviation: result.analysis?.visualDeviation ?? 0,
    confusableAnalysis: result.analysis?.confusableAnalysis || null,
    // Preserve domain-related fields if present
    domain: result.input?.raw || result.domain,
    displayDomain: result.input?.displayDomain || null,
  };
}

function legacyTierFromVerdict(verdict) {
  const map = {
    canonical: TRUST_TIERS.CANONICAL,
    'recognized-variant': TRUST_TIERS.CANONICAL,
    styled: TRUST_TIERS.STYLED,
    'transliteration-uncertain': TRUST_TIERS.STYLED,
    'homograph-spoof': TRUST_TIERS.SUSPICIOUS,
    'mixed-script-spoof': TRUST_TIERS.SUSPICIOUS,
    'lookalike-domain': TRUST_TIERS.SUSPICIOUS,
    unsafe: TRUST_TIERS.UNSAFE,
    unknown: TRUST_TIERS.UNKNOWN,
  };
  return map[verdict] || TRUST_TIERS.UNKNOWN;
}

module.exports = {
  TRUST_TIERS,
  classifyTerm,
  classifyDomain,
  classifyQueryAndDomain,
  computeVisualDeviation,
  hasMixedScripts,
};
