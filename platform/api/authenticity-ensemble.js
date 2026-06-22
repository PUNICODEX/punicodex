/**
 * PÚNYCODEX — Authenticity Ensemble Risk Classifier
 *
 * Weighted logistic-style scorer + deterministic guardrails. Returns a
 * calibrated deceptive probability plus rule overrides.
 */

const { computeRiskFeatures } = require('./risk-features');
const { version: modelVersion } = require('../models/authenticity/model-version.json');

function sigmoid(x) {
  return 1 / (1 + Math.exp(-x));
}

function hasDeceptionSignals(features) {
  return (
    features.confusableCount > 0 ||
    features.mixedScriptFlag ||
    features.invisibleCharFlag ||
    features.bidiOverrideFlag ||
    features.normalizationDistance > 0.2
  );
}

function classifyRisk(input, options = {}) {
  const raw = String(input || '');
  const features = options.features || computeRiskFeatures(raw, options);
  const ruleOverrides = [];

  if (!raw) {
    return {
      probability: 0,
      confidence: 1,
      features,
      modelVersion,
      ruleOverrides: ['empty_input'],
    };
  }

  let logOdds = -4.0;
  const confusablePresent = features.confusableCount > 0;

  if (confusablePresent) {
    logOdds += features.skeletonSimilarityMax * 6.0;
    logOdds += features.glyphSimilarityMax * 4.0;
  }
  logOdds += features.confusableDensity * 5.0;
  logOdds += features.mixedScriptFlag ? 3.0 : 0;
  logOdds += features.scriptPairRisk * 2.0;
  logOdds += features.invisibleCharFlag ? 2.5 : 0;
  logOdds += features.bidiOverrideFlag ? 4.0 : 0;
  logOdds += features.normalizationDistance * 1.0;
  logOdds += features.hasBlockedPatternMatch ? 3.0 : 0;
  logOdds += features.domainEtldRisk * 2.0;
  logOdds += features.pathQueryRisk * 1.5;
  logOdds += features.variantRecognition ? -4.0 : 0;
  logOdds += features.hasCanonicalExact ? -6.0 : 0;

  let probability = sigmoid(logOdds);

  if (
    (features.hasCanonicalExact || features.variantRecognition) &&
    !hasDeceptionSignals(features)
  ) {
    probability = Math.min(probability, 0.05);
    ruleOverrides.push('canonical_safe_clamp');
  }

  const targetExists =
    features.identityPriority > 0 ||
    features.skeletonSimilarityMax >= 0.85 ||
    features.glyphSimilarityMax >= 0.85;

  if (features.bidiOverrideFlag && targetExists) {
    probability = Math.max(probability, 0.95);
    ruleOverrides.push('bidi_override_with_target');
  }

  if (features.mixedScriptFlag && targetExists) {
    probability = Math.max(probability, 0.9);
    ruleOverrides.push('mixed_script_with_target');
  }

  if (features.confusableDensity > 0 && features.skeletonSimilarityMax >= 0.95 && targetExists) {
    probability = Math.max(probability, 0.95);
    ruleOverrides.push('high_confusable_similarity');
  }

  const confidence = Math.min(1, 0.6 + 0.4 * (1 - 2 * Math.abs(probability - 0.5)));

  return {
    probability,
    confidence,
    features,
    modelVersion,
    ruleOverrides,
  };
}

module.exports = {
  classifyRisk,
};
