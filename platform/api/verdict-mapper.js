/**
 * PÚNYCODEX — Verdict Mapper
 *
 * Maps ensemble probability + features into a human-readable authenticity
 * verdict, severity, and reason.
 */

const { VERDICTS, SEVERITIES } = require('./authenticity-verdicts');

function hasNonAscii(str) {
  for (const ch of String(str || '')) {
    if (ch.codePointAt(0) > 127) return true;
  }
  return false;
}

function hasDeceptionSignals(features) {
  return (
    features.confusableCount > 0 ||
    features.mixedScriptFlag ||
    features.invisibleCharFlag ||
    features.bidiOverrideFlag
  );
}

function mapVerdict(probability, features, identityMatch, canonicalMatch, options = {}) {
  const isDomain = options.isDomain || false;
  const input = options.input || '';

  if (features.hasBlockedPatternMatch) {
    return {
      verdict: VERDICTS.LOOKALIKE_DOMAIN,
      severity: SEVERITIES.HIGH,
      reason: `Domain/label matches a blocked pattern for ${canonicalMatch?.name || 'a protected identity'}`,
    };
  }

  if (features.hasCanonicalExact) {
    return {
      verdict: VERDICTS.CANONICAL,
      severity: SEVERITIES.NONE,
      reason: 'Exact canonical transliteration',
    };
  }

  if (features.hasAsciiFallbackExact) {
    return {
      verdict: VERDICTS.ASCII_FALLBACK,
      severity: SEVERITIES.NONE,
      reason: 'ASCII fallback form; the scholarly canonical form uses Unicode diacritics',
    };
  }

  if (features.variantRecognition) {
    return {
      verdict: VERDICTS.RECOGNIZED_VARIANT,
      severity: SEVERITIES.LOW,
      reason: `Recognized ${canonicalMatch?.variantType || 'variant'} form`,
    };
  }

  if (identityMatch && !hasDeceptionSignals(features)) {
    const isLexicon = identityMatch.type === 'lexicon';
    return {
      verdict: isLexicon ? VERDICTS.RECOGNIZED_VARIANT : VERDICTS.STYLED,
      severity: SEVERITIES.LOW,
      reason: isLexicon ? 'Recognized lexicon identity' : 'Recognized brand identity',
    };
  }

  if (probability >= 0.9 && features.mixedScriptFlag && features.skeletonSimilarityMax < 0.85) {
    return {
      verdict: VERDICTS.MIXED_SCRIPT_SPOOF,
      severity: SEVERITIES.HIGH,
      reason: 'Mixed-script label with no strong canonical target',
    };
  }

  if (probability >= 0.95 && features.confusableCount > 0) {
    const priority = features.identityPriority || 0;
    return {
      verdict: VERDICTS.HOMOGRAPH_SPOOF,
      severity: priority > 5 ? SEVERITIES.CRITICAL : SEVERITIES.HIGH,
      reason: 'Confusable visual spoof of a protected target',
    };
  }

  if (probability >= 0.9 && features.mixedScriptFlag) {
    return {
      verdict: VERDICTS.MIXED_SCRIPT_SPOOF,
      severity: SEVERITIES.HIGH,
      reason: 'Mixed-script visual spoof',
    };
  }

  if (probability >= 0.8) {
    if (isDomain) {
      return {
        verdict: VERDICTS.LOOKALIKE_DOMAIN,
        severity: SEVERITIES.HIGH,
        reason: 'Domain strongly resembles a protected target',
      };
    }
    return {
      verdict: VERDICTS.HOMOGRAPH_SPOOF,
      severity: SEVERITIES.HIGH,
      reason: 'High-probability lookalike term',
    };
  }

  if (probability >= 0.6) {
    return {
      verdict: VERDICTS.TRANSLITERATION_UNCERTAIN,
      severity: SEVERITIES.MEDIUM,
      reason: 'Input folds to a canonical term but is not a recognized variant',
    };
  }

  if (hasNonAscii(input)) {
    return {
      verdict: VERDICTS.STYLED,
      severity: SEVERITIES.LOW,
      reason: 'Non-ASCII styling with no canonical basis',
    };
  }

  return {
    verdict: VERDICTS.UNKNOWN,
    severity: SEVERITIES.NONE,
    reason: 'No canonical match',
  };
}

module.exports = {
  mapVerdict,
};
