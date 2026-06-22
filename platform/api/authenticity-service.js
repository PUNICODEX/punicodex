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

const { getDb } = require('../db/connection');
const { parseDomain } = require('./domain-parser');
const { validateIdna } = require('./idna-validator');
const { analyzeConfusables } = require('./confusables');
const { skeletonSimilarity } = require('./confusable-atlas');
const { toSearchKey } = require('./query-normalize');
const { decompose, computeVisualDeviation } = require('./name-decomposer');
const { decomposeUrl } = require('./url-decomposer');
const { classifyUrlParts } = require('./url-classifier');
const { findIdentities, buildIdentityMatch } = require('./identity-kernel');
const { lookupBrand, checkDomainAgainstBrands } = require('./brand-shield');
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

  // Brand Shield fallback when the input is not a lexicon match.
  const brandMatch = !exact && !variantMatch ? lookupBrand(raw) : null;

  const canonicalRows = getCanonicalRows();
  const features = computeRiskFeatures(raw, {
    canonicalRows,
    checkBlockedPattern: false,
    isDomain: options.isDomain || false,
    domainInfo: options.domainInfo || null,
    idnaErrors: options.idnaErrors || [],
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

  if (!canonicalMatch && brandMatch) {
    canonicalMatch = brandMatch;
  }

  const mapped = mapVerdict(
    risk.probability,
    features,
    identityMatch || brandMatch,
    canonicalMatch,
    {
      isDomain: options.isDomain || false,
      input: raw,
    }
  );

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

  const domainInfo = parseDomain(raw);
  const display = domainInfo.decodedLabels.join('.') || raw;
  const idnaResult = validateIdna(raw, { etld: domainInfo.etld });
  const idnaErrors = idnaResult.errors;

  function attachDomainMetadata(analysis) {
    analysis.idnaErrors = idnaErrors;
    analysis.domainInfo = domainInfo;
    return analysis;
  }

  function applyVerdictOverride(result, reason) {
    result.reason = reason;
    const explanation = explainVerdict(result.verdict);
    result.label = explanation.label;
    result.explanation = explanation.explanation;
    result.recommendations = explanation.recommendations;
    return result;
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

      const analysis = attachDomainMetadata(buildAnalysis(display));
      const verdict =
        registered.trust_tier === 'unsafe'
          ? VERDICTS.UNSAFE
          : registered.trust_tier === 'suspicious'
            ? VERDICTS.LOOKALIKE_DOMAIN
            : VERDICTS.CANONICAL;

      const result = finalizeVerdict({
        verdict,
        reason: `registered domain (${registered.source || 'canonical'})`,
        canonicalMatch: entry ? buildCanonicalMatch(entry) : null,
        analysis,
      });
      result.input = {
        raw: domain,
        normalized: raw,
        displayDomain: display,
        label: domainInfo.decodedLabels[0] || raw,
      };
      result.domainInfo = domainInfo;
      result.idna = idnaResult;
      return result;
    }
  } catch (_e) {
    // Table may not exist yet.
  }

  const label = display.split('.')[0] || raw;

  // Brand & Trademark Shield: allowed-domain or blocked-pattern checks.
  try {
    const brandCheck = checkDomainAgainstBrands(domain) || checkDomainAgainstBrands(display);
    if (brandCheck) {
      const analysis = attachDomainMetadata(buildAnalysis(display));
      if (brandCheck.matchType === 'allowed-domain') {
        const result = finalizeVerdict({
          verdict: VERDICTS.CANONICAL,
          reason: `identity-allowed domain (${brandCheck.identity.type})`,
          canonicalMatch: brandCheck.identity,
          analysis,
        });
        result.input = { raw: domain, normalized: raw, displayDomain: display, label };
        result.domainInfo = domainInfo;
        result.idna = idnaResult;
        return result;
      }
      if (brandCheck.matchType === 'blocked-pattern') {
        const result = finalizeVerdict({
          verdict: VERDICTS.LOOKALIKE_DOMAIN,
          severity: SEVERITIES.HIGH,
          reason: `domain matches blocked pattern for ${brandCheck.identity.name}`,
          canonicalMatch: brandCheck.identity,
          analysis,
        });
        result.input = { raw: domain, normalized: raw, displayDomain: display, label };
        result.domainInfo = domainInfo;
        result.idna = idnaResult;
        return result;
      }
    }
  } catch (_e) {
    // Identity tables may not exist yet.
  }

  // Punycode homograph of a canonical/brand identity at registrable-domain level.
  let domainHomographMatch = null;
  if (domainInfo.isPunycode && domainInfo.domain) {
    try {
      const domainLabelCount = domainInfo.domain.split('.').length;
      const decodedRegistrable = domainInfo.decodedLabels.slice(-domainLabelCount).join('.');
      const identityMatches = findIdentities(decodedRegistrable, {
        includeLexicon: true,
        matchTypes: ['exact', 'folded', 'visual'],
        threshold: 0.9,
      });
      domainHomographMatch = identityMatches.find((m) => m.matchType === 'visual') || null;
    } catch (_e) {
      // Identity tables may not exist yet.
    }
  }

  const result = buildVerdict(label, { isDomain: true, domainInfo, idnaErrors });
  result.analysis.idnaErrors = idnaErrors;
  result.analysis.domainInfo = domainInfo;

  if (domainHomographMatch) {
    result.verdict = VERDICTS.HOMOGRAPH_SPOOF;
    result.severity = SEVERITIES.CRITICAL;
    result.canonicalMatch = buildIdentityMatch(
      domainHomographMatch.identity,
      'visual',
      domainHomographMatch.matchedAlias
    );
    applyVerdictOverride(result, `punycode homograph of ${domainHomographMatch.identity.name}`);
  } else if (!idnaResult.valid && SEVERITY_RANK[result.severity] < SEVERITY_RANK[SEVERITIES.HIGH]) {
    result.verdict = VERDICTS.LOOKALIKE_DOMAIN;
    result.severity = SEVERITIES.HIGH;
    const hardErrors = idnaErrors.filter((e) => !e.startsWith('warning:')).join(', ');
    applyVerdictOverride(result, `IDNA validation failed: ${hardErrors}`);
  }

  result.input = { raw: domain, normalized: raw, displayDomain: display, label };
  result.domainInfo = domainInfo;
  result.idna = idnaResult;
  return result;
}

function classifyUrl(urlString, _options = {}) {
  const raw = String(urlString).trim();
  const decomposition = decomposeUrl(raw);

  if (!decomposition.valid) {
    // Not a parseable URL; fall back to domain classification.
    return classifyDomain(raw);
  }

  const classification = classifyUrlParts(raw, { classifyTerm: buildVerdict });
  const worstPart = classification.parts.find((p) => p.part === classification.worstPart) ||
    classification.parts[0] || {
      part: 'url',
      verdict: classification.overallVerdict,
      severity: classification.overallSeverity,
      canonicalMatch: null,
    };

  const result = {
    ...finalizeVerdict({
      verdict: classification.overallVerdict,
      reason: `URL analysis: ${classification.worstPart} triggered ${worstPart.verdict}`,
      canonicalMatch: worstPart.canonicalMatch || null,
      analysis: buildAnalysis(raw),
    }),
    input: {
      raw,
      hostname: decomposition.hostname.value,
      decodedHostname: decomposition.hostname.decodedLabels.join('.'),
      pathname: decomposition.pathname,
      search: decomposition.search,
    },
    parts: classification.parts,
    urlDecomposition: decomposition,
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
