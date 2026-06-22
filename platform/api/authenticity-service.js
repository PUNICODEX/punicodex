/**
 * PÚNYCODEX — Name Authenticity Service
 *
 * The canonical engine behind the Authenticity Checker. Given any string,
 * domain, or URL, it returns a structured verdict describing whether the
 * input is a legitimate canonical name, a recognized variant, a harmless
 * styled form, or a deceptive spoof.
 *
 * Backward compatibility: this module re-exports the legacy trust-tier API
 * from `homograph-service.js` so existing consumers keep working.
 */

const { domainToUnicode, URL } = require('node:url');
const { getDb } = require('../db/connection');
const { analyzeConfusables } = require('./confusables');
const { skeletonSimilarity } = require('./confusable-atlas');
const { toSearchKey } = require('./query-normalize');
const { decompose, computeVisualDeviation } = require('./name-decomposer');
const {
  findIdentities,
  buildIdentityMatch,
  findIdentityByDomain,
  findIdentityByBlockedPattern,
} = require('./identity-kernel');
const { computeRiskFeatures } = require('./risk-features');
const { classifyRisk } = require('./authenticity-ensemble');
const { mapVerdict } = require('./verdict-mapper');
const {
  VERDICTS,
  SEVERITIES,
  SEVERITY_RANK,
  VERDICT_SEVERITY,
  worstSeverity,
  explainVerdict,
} = require('./authenticity-verdicts');

// Legacy trust-tier mapping for consumers expecting the old homograph API.
const LEGACY_TIERS = Object.freeze({
  [VERDICTS.CANONICAL]: 'canonical',
  [VERDICTS.RECOGNIZED_VARIANT]: 'canonical',
  [VERDICTS.STYLED]: 'styled',
  [VERDICTS.TRANSLITERATION_UNCERTAIN]: 'styled',
  [VERDICTS.HOMOGRAPH_SPOOF]: 'suspicious',
  [VERDICTS.MIXED_SCRIPT_SPOOF]: 'suspicious',
  [VERDICTS.LOOKALIKE_DOMAIN]: 'suspicious',
  [VERDICTS.UNSAFE]: 'unsafe',
  [VERDICTS.UNKNOWN]: 'unknown',
});

let canonicalCache = null;
let canonicalCacheBuiltAt = 0;
const CACHE_TTL_MS = 60_000;

function getCanonicalRows() {
  const now = Date.now();
  if (canonicalCache && now - canonicalCacheBuiltAt < CACHE_TTL_MS) {
    return canonicalCache;
  }

  const rows = getDb()
    .prepare(`SELECT id, ascii, unicode, search_key, pantheon, tier, variants FROM entries`)
    .all();

  canonicalCache = rows.map((row) => ({
    ...row,
    variants: parseJson(row.variants) || [],
  }));
  canonicalCacheBuiltAt = now;
  return canonicalCache;
}

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function exactMatch(a, b) {
  return String(a).toLowerCase() === String(b).toLowerCase();
}

function normalizeInput(input) {
  return String(input).trim();
}

function findCanonicalMatch(input) {
  const raw = normalizeInput(input);
  const lower = raw.toLowerCase();
  const searchKey = toSearchKey(raw);
  const confusable = analyzeConfusables(raw);

  let exact = null;
  let variantMatch = null;
  let bestLookalike = null;
  let bestLookalikeScore = 0;

  for (const row of getCanonicalRows()) {
    // 1. Exact canonical match (ID, ASCII, or Unicode form).
    if (
      exactMatch(lower, row.id) ||
      exactMatch(lower, row.ascii) ||
      exactMatch(lower, row.unicode)
    ) {
      exact = row;
      break;
    }

    // 2. Recognized variant match (macron-only, ideal, alt-stress, etc.).
    if (Array.isArray(row.variants)) {
      for (const variant of row.variants) {
        if (variant && typeof variant.unicode === 'string' && exactMatch(lower, variant.unicode)) {
          variantMatch = { row, variant };
          break;
        }
      }
      if (variantMatch) break;
    }

    // 3. Search-key fold match (e.g., "áres" → "ares"). Treat as canonical
    // because it is the same name under a different accent convention, but
    // only when no listed variant already covered it.
    if (searchKey === row.search_key) {
      exact = row;
      break;
    }

    // 4. Lookalike skeleton similarity for spoof detection.
    const candidates = [row.id, row.ascii, row.unicode].filter(Boolean);
    for (const candidate of candidates) {
      const score = skeletonSimilarity(raw, candidate);
      if (score > bestLookalikeScore) {
        bestLookalikeScore = score;
        bestLookalike = { row, score };
      }
    }

    // Also fold variants for lookalike detection
    if (Array.isArray(row.variants)) {
      for (const variant of row.variants) {
        if (variant && typeof variant.unicode === 'string') {
          const score = skeletonSimilarity(raw, variant.unicode);
          if (score > bestLookalikeScore) {
            bestLookalikeScore = score;
            bestLookalike = { row, score, variant };
          }
        }
      }
    }
  }

  // Fast path: if we already have an exact or variant lexicon match, only
  // check identities for exact/folded aliases (e.g., a known brand like Apple
  // that is not in the lexicon). Skip the expensive visual scan because there
  // are no deception signals to investigate.
  const hasDeceptionSignals = confusable.hasConfusables || decompose(raw).hasMixedScripts;

  const identityMatches = findIdentities(raw, {
    includeLexicon: true,
    matchTypes:
      exact || variantMatch || !hasDeceptionSignals
        ? ['exact', 'folded']
        : ['exact', 'folded', 'visual'],
    threshold: 0.85,
  });
  const identityMatch =
    identityMatches.find((m) => m.matchType === 'exact' || m.matchType === 'folded') || null;

  for (const im of identityMatches) {
    if (im.matchType === 'visual' && im.score > bestLookalikeScore) {
      bestLookalikeScore = im.score;
      bestLookalike = { identity: im.identity, score: im.score, isIdentity: true };
    }
  }

  return {
    exact,
    variantMatch,
    lookalike: bestLookalikeScore >= 0.85 ? bestLookalike : null,
    lookalikeScore: bestLookalikeScore,
    foldedInput: confusable.canonical,
    identityMatch,
  };
}

function buildMatchFromLookalike(lookalike) {
  if (!lookalike) return null;
  if (lookalike.isIdentity) {
    return buildIdentityMatch(lookalike.identity, 'visual', null);
  }
  return buildCanonicalMatch(lookalike.row, lookalike.variant);
}

function buildCanonicalMatch(row, variant = null) {
  return {
    id: row.id,
    ascii: row.ascii,
    unicode: row.unicode,
    pantheon: row.pantheon,
    tier: row.tier,
    variantType: variant?.type || null,
    variantNote: variant?.note || null,
  };
}

function isUnsafePattern(str) {
  try {
    const db = getDb();
    const row = db.prepare('SELECT 1 FROM unsafe_patterns WHERE ? LIKE pattern LIMIT 1').get(str);
    if (row) return true;
  } catch (_e) {
    // Table may not exist yet.
  }
  return false;
}

function buildAnalysis(input) {
  const decomposition = decompose(input);
  const confusable = analyzeConfusables(input);
  const visualDeviation = computeVisualDeviation(input);

  return {
    scripts: decomposition.scripts,
    mixedScripts: decomposition.hasMixedScripts,
    confusables: decomposition.chars
      .filter((c) => c.isConfusable || c.isInvisible)
      .map((c) => ({
        char: c.char,
        position: c.position,
        codePoint: c.codePoint,
        script: c.script,
        mappedTo: c.confusableMapping,
        isInvisible: c.isInvisible,
      })),
    confusableAnalysis: confusable,
    visualDeviation,
    invisibleChars: decomposition.invisibleChars,
    normalized: decomposition.normalized,
  };
}

function buildVerdict(input, options = {}) {
  const raw = normalizeInput(input);
  const analysis = buildAnalysis(raw);

  if (!raw) {
    return finalizeVerdict({
      verdict: VERDICTS.UNKNOWN,
      reason: 'empty input',
      canonicalMatch: null,
      analysis,
    });
  }

  if (isUnsafePattern(raw)) {
    return finalizeVerdict({
      verdict: VERDICTS.UNSAFE,
      reason: 'blocklist match',
      canonicalMatch: null,
      analysis,
    });
  }

  const matchInfo = findCanonicalMatch(raw);
  const {
    exact,
    variantMatch,
    lookalike,
    lookalikeScore,
    identityMatch: rawIdentityMatch,
  } = matchInfo;

  const canonicalRows = getCanonicalRows();
  const features = computeRiskFeatures(raw, {
    canonicalRows,
    checkBlockedPattern: false,
    isDomain: options.isDomain || false,
  });
  const risk = classifyRisk(raw, {
    features,
    canonicalRows,
    checkBlockedPattern: false,
    isDomain: options.isDomain || false,
  });

  let canonicalMatch = null;
  if (exact) {
    canonicalMatch = buildCanonicalMatch(exact);
  } else if (variantMatch) {
    canonicalMatch = buildCanonicalMatch(variantMatch.row, variantMatch.variant);
  } else if (lookalike) {
    canonicalMatch = buildMatchFromLookalike(lookalike);
  }

  const identityMatch = rawIdentityMatch
    ? buildIdentityMatch(
        rawIdentityMatch.identity,
        rawIdentityMatch.matchType,
        rawIdentityMatch.matchedAlias
      )
    : null;

  if (!canonicalMatch && identityMatch) {
    canonicalMatch = identityMatch;
  }

  const mapped = mapVerdict(risk.probability, features, identityMatch, canonicalMatch, {
    isDomain: options.isDomain || false,
    input: raw,
  });

  return finalizeVerdict({
    verdict: mapped.verdict,
    reason: mapped.reason,
    canonicalMatch,
    analysis,
    lookalikeScore,
    probability: risk.probability,
    confidence: risk.confidence,
    features,
    modelVersion: risk.modelVersion,
    ruleOverrides: risk.ruleOverrides,
  });
}

function finalizeVerdict({
  verdict,
  reason,
  canonicalMatch,
  analysis,
  lookalikeScore = 0,
  probability,
  confidence,
  features,
  modelVersion,
  ruleOverrides,
}) {
  const explanation = explainVerdict(verdict);
  return {
    verdict,
    severity: VERDICT_SEVERITY[verdict],
    label: explanation.label,
    explanation: explanation.explanation,
    recommendations: explanation.recommendations,
    reason,
    canonicalMatch,
    lookalikeScore,
    analysis,
    // Ensemble classifier outputs
    probability,
    confidence,
    features,
    modelVersion,
    ruleOverrides,
    // Backward-compatible fields
    tier: LEGACY_TIERS[verdict] || verdict,
  };
}

function classifyTerm(str) {
  return buildVerdict(str);
}

function classifyDomain(domain, _options = {}) {
  const raw = String(domain)
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/.*$/, '');

  let display = raw;
  if (raw.includes('xn--')) {
    try {
      display = raw
        .split('.')
        .map((label) => decodePuny(label) || label)
        .join('.');
    } catch {
      display = raw;
    }
  }

  // Registered canonical domain lookup
  try {
    const registered = getDb()
      .prepare(
        `SELECT entry_id, trust_tier, source FROM canonical_domains WHERE domain = ? OR punycode = ?`
      )
      .get(raw, raw);

    if (registered) {
      const entry = getDb()
        .prepare(`SELECT id, ascii, unicode, pantheon, tier FROM entries WHERE id = ?`)
        .get(registered.entry_id);

      const analysis = buildAnalysis(display);
      const verdict =
        registered.trust_tier === 'unsafe'
          ? VERDICTS.UNSAFE
          : registered.trust_tier === 'suspicious'
            ? VERDICTS.LOOKALIKE_DOMAIN
            : VERDICTS.CANONICAL;

      return finalizeVerdict({
        verdict,
        reason: `registered domain (${registered.source || 'canonical'})`,
        canonicalMatch: entry ? buildCanonicalMatch(entry) : null,
        analysis,
      });
    }
  } catch (_e) {
    // Table may not exist yet.
  }

  const label = display.split('.')[0];
  const analysis = buildAnalysis(display);

  // Identity-allowed domain lookup (brands and other protected properties).
  try {
    const identity = findIdentityByDomain(raw) || findIdentityByDomain(display);
    if (identity) {
      return finalizeVerdict({
        verdict: VERDICTS.CANONICAL,
        reason: `identity-allowed domain (${identity.type})`,
        canonicalMatch: buildIdentityMatch(identity, 'exact', raw),
        analysis,
      });
    }
  } catch (_e) {
    // Identity tables may not exist yet.
  }

  // Known brand blocked patterns signal a lookalike domain.
  try {
    const blocked = findIdentityByBlockedPattern(raw) || findIdentityByBlockedPattern(label);
    if (blocked) {
      return finalizeVerdict({
        verdict: VERDICTS.LOOKALIKE_DOMAIN,
        reason: `domain matches blocked pattern for ${blocked.identity.name}`,
        canonicalMatch: buildIdentityMatch(blocked.identity, 'blocked', null),
        analysis,
      });
    }
  } catch (_e) {
    // Identity tables may not exist yet.
  }

  const result = buildVerdict(label, { isDomain: true });
  result.input = { raw: domain, normalized: raw, displayDomain: display, label };
  return result;
}

function classifyUrl(urlString, _options = {}) {
  const raw = String(urlString).trim();
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    // Not a parseable URL; fall back to domain classification.
    return classifyDomain(raw);
  }

  const hostname = parsed.hostname;
  const labels = hostname.split('.').filter(Boolean);
  const decodedLabels = labels.map((label) =>
    label.startsWith('xn--') ? decodePuny(label) : label
  );

  const labelResults = decodedLabels.map((label, index) => ({
    part: 'hostname-label',
    raw: labels[index],
    decoded: label,
    result: buildVerdict(label),
  }));

  const pathSegments = parsed.pathname.split('/').filter(Boolean);
  const pathResults = pathSegments.map((segment) => ({
    part: 'path-segment',
    raw: segment,
    result: buildVerdict(segment),
  }));

  const queryResults = [];
  parsed.searchParams.forEach((value, key) => {
    queryResults.push({ part: 'query-key', raw: key, result: buildVerdict(key) });
    if (value) {
      queryResults.push({ part: 'query-value', raw: value, result: buildVerdict(value) });
    }
  });

  const allParts = [...labelResults, ...pathResults, ...queryResults];
  const worstPart = allParts.reduce(
    (worst, current) => {
      return SEVERITY_RANK[current.result.severity] > SEVERITY_RANK[worst.result.severity]
        ? current
        : worst;
    },
    allParts[0] || { result: buildVerdict('') }
  );

  const result = {
    ...finalizeVerdict({
      verdict: worstPart.result.verdict,
      reason: `URL analysis: ${worstPart.part} triggered ${worstPart.result.reason}`,
      canonicalMatch: worstPart.result.canonicalMatch,
      analysis: buildAnalysis(raw),
    }),
    input: {
      raw,
      hostname,
      decodedHostname: decodedLabels.join('.'),
      pathname: parsed.pathname,
      search: parsed.search,
    },
    parts: allParts.map((p) => ({
      part: p.part,
      raw: p.raw,
      verdict: p.result.verdict,
      severity: p.result.severity,
      canonicalMatch: p.result.canonicalMatch,
    })),
  };

  return result;
}

function classifyQueryAndDomain(query, domain, _options = {}) {
  const queryResult = query ? classifyTerm(query) : null;
  const domainResult = domain ? classifyDomain(domain) : null;

  const severities = [queryResult?.severity, domainResult?.severity].filter(Boolean);
  const overallSeverity = severities.reduce((acc, s) => worstSeverity(acc, s), SEVERITIES.NONE);

  const overallVerdict =
    overallSeverity === SEVERITIES.CRITICAL
      ? VERDICTS.UNSAFE
      : overallSeverity === SEVERITIES.HIGH
        ? VERDICTS.HOMOGRAPH_SPOOF
        : overallSeverity === SEVERITIES.MEDIUM
          ? VERDICTS.TRANSLITERATION_UNCERTAIN
          : overallSeverity === SEVERITIES.LOW
            ? VERDICTS.STYLED
            : queryResult?.verdict || domainResult?.verdict || VERDICTS.UNKNOWN;

  return {
    overall: overallVerdict,
    overallSeverity,
    query: queryResult,
    domain: domainResult,
  };
}

function decodePuny(label) {
  if (!label.startsWith('xn--')) return label;
  try {
    return domainToUnicode(label);
  } catch {
    return label;
  }
}

function resetCache() {
  canonicalCache = null;
  canonicalCacheBuiltAt = 0;
  const { resetCache: resetIdentityCache } = require('./identity-kernel');
  resetIdentityCache();
}

module.exports = {
  VERDICTS,
  SEVERITIES,
  VERDICT_SEVERITY,
  classifyAuthenticity: buildVerdict,
  classifyTerm,
  classifyDomain,
  classifyUrl,
  classifyQueryAndDomain,
  findCanonicalMatch,
  buildAnalysis,
  buildCanonicalMatch,
  resetCache,
  // Legacy trust-tier compatibility
  TRUST_TIERS: LEGACY_TIERS,
  computeVisualDeviation,
};
