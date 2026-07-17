/**
 * PuniCodex — Evidence Builder v2
 *
 * Constructs a defensible evidence object for every Name Authenticity Shield
 * verdict. The evidence object is suitable for SOC review, legal submission,
 * and public-page visual diffs.
 */

const { decompose } = require('./name-decomposer');
const { analyzeConfusables, CONFUSABLE_TO_ASCII } = require('./confusables');
const { buildSkeleton, renderedSimilarity } = require('./confusable-atlas');
const { findIdentities } = require('./identity-kernel');
const { getDb } = require('../db/connection');
const { migrateAuthenticityThreatFeed } = require('../db/migrate-authenticity-threat-feed');

const FONT_FAMILY = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function formatCodePoint(cp) {
  return `U+${cp.toString(16).toUpperCase().padStart(4, '0')}`;
}

function buildCharacterMap(raw) {
  const decomposition = decompose(raw);
  return decomposition.chars.map((c) => ({
    char: c.char,
    codePoint: formatCodePoint(c.codePoint),
    decimalCodePoint: c.codePoint,
    position: c.position,
    script: c.script,
    isAscii: c.isAscii,
    isInvisible: c.isInvisible,
    isBidirectionalOverride: c.isBidirectionalOverride,
    isCombiningDiacritic: c.isCombiningDiacritic,
    confusableMapping: c.confusableMapping,
    isConfusable: c.isConfusable,
    deviationScore: Number(c.deviationScore.toFixed(4)),
  }));
}

function buildIdentityMatches(input, canonicalMatch) {
  const matches = [];
  const identities = findIdentities(input, {
    includeLexicon: true,
    matchTypes: ['exact', 'folded', 'visual'],
    threshold: 0.85,
  });
  for (const m of identities.slice(0, 8)) {
    const identity = m.identity;
    matches.push({
      id: identity.id,
      type: identity.type,
      name: identity.name,
      ascii: identity.ascii,
      unicode: identity.unicode,
      matchType: m.matchType,
      score: Number(m.score.toFixed(4)),
      matchedAlias: m.matchedAlias,
      priority: identity.priority || 0,
      allowedDomains: identity.allowedDomains || [],
    });
  }
  if (canonicalMatch && !matches.find((m) => m.id === canonicalMatch.id)) {
    matches.unshift({
      id: canonicalMatch.id,
      type: canonicalMatch.type || 'lexicon',
      name: canonicalMatch.unicode || canonicalMatch.ascii || canonicalMatch.id,
      ascii: canonicalMatch.ascii,
      unicode: canonicalMatch.unicode,
      matchType: 'canonical',
      score: 1,
      matchedAlias: canonicalMatch.unicode || canonicalMatch.ascii || canonicalMatch.id,
      priority: canonicalMatch.priority || 0,
      allowedDomains: canonicalMatch.allowedDomains || [],
    });
  }
  return matches;
}

function buildRenderedComparison(input, canonicalMatch) {
  const baseline = canonicalMatch
    ? canonicalMatch.unicode || canonicalMatch.ascii || canonicalMatch.id || ''
    : '';
  const inputChars = [...input];
  const baselineChars = [...baseline];
  const maxLen = Math.max(inputChars.length, baselineChars.length);
  const diffHeatmap = new Array(maxLen).fill(0);
  for (let i = 0; i < maxLen; i++) {
    const a = inputChars[i] || '';
    const b = baselineChars[i] || '';
    if (a === b) {
      diffHeatmap[i] = 0;
    } else if (a && b && renderedSimilarity(a, b) >= 0.85) {
      diffHeatmap[i] = 0.5;
    } else {
      diffHeatmap[i] = 1;
    }
  }
  return {
    baseline,
    input,
    diffHeatmap,
    fontFamily: FONT_FAMILY,
    skeletonInput: buildSkeleton(input),
    skeletonBaseline: buildSkeleton(baseline),
  };
}

function buildDomainMetadata(result) {
  const info = result.domainInfo || result.analysis?.domainInfo;
  if (!info) return null;
  return {
    hostname: info.hostname,
    registrableDomain: info.domain,
    etld: info.etld,
    subdomain: info.subdomain,
    isPunycode: info.isPunycode,
    isIp: info.isIp,
    decodedLabels: info.decodedLabels,
    idnaErrors: result.idna?.errors || result.analysis?.idnaErrors || [],
  };
}

function findThreatFeedHits(input) {
  try {
    const db = getDb();
    migrateAuthenticityThreatFeed(db);
    const like = `%${input}%`;
    const rows = db
      .prepare(
        `SELECT id, input, input_type, punycode, verdict, severity, canonical_entry_id,
                discovery_source, confidence, first_seen, last_seen, report_count
         FROM discovered_spoofs
         WHERE input = ? OR punycode = ? OR input LIKE ? OR punycode LIKE ?
         ORDER BY last_seen DESC
         LIMIT 10`
      )
      .all(input, input, like, like);
    return rows.map((r) => ({
      id: r.id,
      input: r.input,
      inputType: r.input_type,
      punycode: r.punycode,
      verdict: r.verdict,
      severity: r.severity,
      canonicalEntryId: r.canonical_entry_id,
      discoverySource: r.discovery_source,
      confidence: r.confidence,
      firstSeen: r.first_seen,
      lastSeen: r.last_seen,
      reportCount: r.report_count,
    }));
  } catch {
    return [];
  }
}

function buildEvidence(input, result) {
  const raw = String(input || '');
  const decomposition = decompose(raw);
  const confusable = analyzeConfusables(raw);
  const canonicalMatch = result.canonicalMatch || null;

  return {
    verdict: result.verdict,
    confidence: result.confidence ?? result.probability ?? null,
    modelVersion: result.modelVersion || 'unknown',
    generatedAt: new Date().toISOString(),
    features: result.features || null,
    characterMap: buildCharacterMap(raw),
    renderedComparison: buildRenderedComparison(raw, canonicalMatch),
    identityMatches: buildIdentityMatches(raw, canonicalMatch),
    domainMetadata: buildDomainMetadata(result),
    threatFeedHits: findThreatFeedHits(raw),
    recommendations: result.recommendations || [],
    analysis: {
      scripts: decomposition.scripts,
      mixedScripts: decomposition.hasMixedScripts,
      invisibleChars: decomposition.invisibleChars,
      bidiOverrides: decomposition.bidiOverrides,
      confusables: confusable.found.map((ch) => ({
        char: ch,
        codePoint: formatCodePoint(ch.codePointAt(0)),
        mappedTo: CONFUSABLE_TO_ASCII.get(ch),
      })),
      normalized: decomposition.normalized,
    },
  };
}

module.exports = {
  buildEvidence,
  buildCharacterMap,
  buildRenderedComparison,
  buildIdentityMatches,
};
