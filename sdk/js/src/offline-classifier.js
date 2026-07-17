/**
 * PuniCodex — Offline Name Authenticity Classifier
 *
 * Browser-safe, zero-dependency classifier for terms. Uses only pure-JS
 * platform modules (confusable atlas, name decomposer, glyph renderer) and a
 * lightweight brand identity list. Does not touch a database.
 */

const {
  skeletonSimilarity,
  perceptualSimilarity,
} = require('../../../platform/api/confusable-atlas.js');
const { decompose, computeVisualDeviation } = require('../../../platform/api/name-decomposer.js');
const { renderedSimilarity } = require('../../../platform/api/glyph-renderer.js');
const {
  VERDICTS,
  SEVERITIES,
  VERDICT_LABEL,
  VERDICT_EXPLANATION,
  VERDICT_RECOMMENDATIONS,
} = require('../../../platform/api/authenticity-verdicts.js');
const identities = require('../data/brand-identities.json');

const LOOKALIKE_THRESHOLD = 0.85;
const HIGH_DEVIATION_THRESHOLD = 0.5;

function normalize(input) {
  return String(input).trim();
}

function lower(input) {
  return normalize(input).toLowerCase();
}

function identitySafeAlternatives(identity) {
  if (Array.isArray(identity.safe_alternatives) && identity.safe_alternatives.length > 0) {
    return identity.safe_alternatives;
  }
  if (Array.isArray(identity.domains) && identity.domains.length > 0) {
    return identity.domains.map((d) => `https://${d}`);
  }
  return [];
}

function isBlockedPatternMatch(raw, identity) {
  for (const pattern of identity.blocked_patterns || []) {
    const re = new RegExp(pattern, 'iu');
    if (re.test(raw)) {
      return pattern;
    }
  }
  return null;
}

function matchIdentity(input) {
  const raw = normalize(input);
  const inputLower = lower(input);
  const decomposition = decompose(raw);
  const visualDeviation = computeVisualDeviation(raw);

  let blockedIdentity = null;
  let blockedPattern = null;
  let exactIdentity = null;
  let bestLookalike = null;
  let bestScore = 0;

  for (const identity of identities) {
    const pattern = isBlockedPatternMatch(raw, identity);
    if (pattern) {
      blockedIdentity = identity;
      blockedPattern = pattern;
      break;
    }

    for (const alias of identity.aliases || []) {
      if (inputLower === alias.toLowerCase()) {
        exactIdentity = identity;
        break;
      }

      const skeletonScore = skeletonSimilarity(raw, alias);
      const renderedScore = renderedSimilarity(raw, alias);
      const score = Math.max(skeletonScore, renderedScore);

      if (score > bestScore) {
        bestScore = score;
        bestLookalike = { identity, alias, skeletonScore, renderedScore, score };
      }
    }

    if (exactIdentity) break;
  }

  return {
    raw,
    inputLower,
    decomposition,
    visualDeviation,
    blockedIdentity,
    blockedPattern,
    exactIdentity,
    lookalike: bestScore >= LOOKALIKE_THRESHOLD ? bestLookalike : null,
    lookalikeScore: bestScore,
  };
}

function classifyTermOffline(input) {
  const raw = normalize(input);
  if (raw.length === 0) {
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.UNKNOWN,
      severity: SEVERITIES.NONE,
      reasons: ['Empty input'],
    });
  }

  const match = matchIdentity(raw);
  const reasons = [];
  const decomposition = match.decomposition;

  if (match.blockedIdentity) {
    reasons.push(
      `Matches known blocked pattern “${match.blockedPattern}” for ${match.blockedIdentity.name}`
    );
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.UNSAFE,
      severity: SEVERITIES.CRITICAL,
      targetIdentity: match.blockedIdentity,
      safeAlternatives: identitySafeAlternatives(match.blockedIdentity),
      reasons,
      decomposition,
      scores: { visualDeviation: match.visualDeviation },
    });
  }

  const hasConfusables = decomposition.confusableAnalysis.hasConfusables;
  const hasMixedScripts = decomposition.hasMixedScripts;
  const hasInvisibleChars = decomposition.hasInvisibleChars;
  const hasBidiOverride = decomposition.hasBidirectionalOverride;

  if (
    match.exactIdentity &&
    !hasConfusables &&
    !hasMixedScripts &&
    !hasInvisibleChars &&
    !hasBidiOverride
  ) {
    reasons.push(`Exact match for protected identity ${match.exactIdentity.name}`);
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.STYLED,
      severity: SEVERITIES.LOW,
      targetIdentity: match.exactIdentity,
      safeAlternatives: identitySafeAlternatives(match.exactIdentity),
      reasons,
      decomposition,
      scores: { visualDeviation: match.visualDeviation },
    });
  }

  if (match.lookalike) {
    const { identity, alias, score } = match.lookalike;
    const rawCharScore = perceptualSimilarity(raw, alias, {
      weightSkeleton: 0,
      weightRendered: 0,
      weightRaw: 1,
    });

    const isSpoof =
      hasConfusables ||
      hasMixedScripts ||
      hasInvisibleChars ||
      hasBidiOverride ||
      rawCharScore < 0.99 ||
      match.visualDeviation >= HIGH_DEVIATION_THRESHOLD;

    if (isSpoof) {
      reasons.push(`Visually similar to ${identity.name} (“${alias}”) with spoofing signals`);
      return buildVerdict({
        input: raw,
        verdict: VERDICTS.HOMOGRAPH_SPOOF,
        severity: SEVERITIES.HIGH,
        targetIdentity: identity,
        matchedAlias: alias,
        safeAlternatives: identitySafeAlternatives(identity),
        reasons,
        decomposition,
        scores: {
          similarity: score,
          rawSimilarity: rawCharScore,
          visualDeviation: match.visualDeviation,
        },
      });
    }

    reasons.push(`Near-identical to ${identity.name} (“${alias}”) but uses legitimate characters`);
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.RECOGNIZED_VARIANT,
      severity: SEVERITIES.LOW,
      targetIdentity: identity,
      matchedAlias: alias,
      safeAlternatives: identitySafeAlternatives(identity),
      reasons,
      decomposition,
      scores: {
        similarity: score,
        rawSimilarity: rawCharScore,
        visualDeviation: match.visualDeviation,
      },
    });
  }

  if (hasMixedScripts) {
    reasons.push('Input mixes scripts from multiple writing systems');
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.MIXED_SCRIPT_SPOOF,
      severity: SEVERITIES.HIGH,
      reasons,
      decomposition,
      scores: { visualDeviation: match.visualDeviation },
    });
  }

  if (hasInvisibleChars || hasBidiOverride) {
    reasons.push('Input contains invisible or bidirectional-override characters');
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.UNSAFE,
      severity: SEVERITIES.CRITICAL,
      reasons,
      decomposition,
      scores: { visualDeviation: match.visualDeviation },
    });
  }

  if (hasConfusables) {
    reasons.push('Input contains confusable characters but no known brand lookalike');
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.TRANSLITERATION_UNCERTAIN,
      severity: SEVERITIES.MEDIUM,
      reasons,
      decomposition,
      scores: { visualDeviation: match.visualDeviation },
    });
  }

  reasons.push('No protected identity match or spoofing signals');
  return buildVerdict({
    input: raw,
    verdict: VERDICTS.UNKNOWN,
    severity: SEVERITIES.NONE,
    reasons,
    decomposition,
    scores: { visualDeviation: match.visualDeviation },
  });
}

function buildVerdict({
  input,
  verdict,
  severity,
  targetIdentity = null,
  matchedAlias = null,
  safeAlternatives = [],
  reasons = [],
  decomposition = null,
  scores = {},
}) {
  return {
    input,
    verdict,
    severity,
    label: VERDICT_LABEL[verdict] || verdict,
    explanation: VERDICT_EXPLANATION[verdict] || 'No explanation available.',
    recommendations: VERDICT_RECOMMENDATIONS[verdict] || [],
    targetIdentity: targetIdentity
      ? {
          id: targetIdentity.id,
          name: targetIdentity.name,
          aliases: targetIdentity.aliases,
          matchedAlias,
        }
      : null,
    safeAlternatives,
    reasons,
    decomposition,
    scores,
  };
}

module.exports = { classifyTermOffline, LOOKALIKE_THRESHOLD };
