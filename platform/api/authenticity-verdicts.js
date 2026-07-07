/**
 * PÚNYCODEX — Authenticity Verdict Taxonomy
 *
 * A name or domain pasted into the Authenticity Checker receives exactly one
 * of these verdicts. The taxonomy is intentionally conservative: any visual
 * deception against a canonical name is escalated, while legitimate scholarly
 * variants are protected.
 */

const VERDICTS = Object.freeze({
  CANONICAL: 'canonical',
  RECOGNIZED_VARIANT: 'recognized-variant',
  ASCII_FALLBACK: 'ascii-fallback',
  STYLED: 'styled',
  TRANSLITERATION_UNCERTAIN: 'transliteration-uncertain',
  HOMOGRAPH_SPOOF: 'homograph-spoof',
  MIXED_SCRIPT_SPOOF: 'mixed-script-spoof',
  LOOKALIKE_DOMAIN: 'lookalike-domain',
  UNSAFE: 'unsafe',
  UNKNOWN: 'unknown',
});

const SEVERITIES = Object.freeze({
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
});

const VERDICT_SEVERITY = Object.freeze({
  [VERDICTS.CANONICAL]: SEVERITIES.NONE,
  [VERDICTS.RECOGNIZED_VARIANT]: SEVERITIES.LOW,
  [VERDICTS.ASCII_FALLBACK]: SEVERITIES.NONE,
  [VERDICTS.STYLED]: SEVERITIES.LOW,
  [VERDICTS.TRANSLITERATION_UNCERTAIN]: SEVERITIES.MEDIUM,
  [VERDICTS.HOMOGRAPH_SPOOF]: SEVERITIES.HIGH,
  [VERDICTS.MIXED_SCRIPT_SPOOF]: SEVERITIES.HIGH,
  [VERDICTS.LOOKALIKE_DOMAIN]: SEVERITIES.HIGH,
  [VERDICTS.UNSAFE]: SEVERITIES.CRITICAL,
  [VERDICTS.UNKNOWN]: SEVERITIES.NONE,
});

const SEVERITY_RANK = Object.freeze({
  [SEVERITIES.NONE]: 0,
  [SEVERITIES.LOW]: 1,
  [SEVERITIES.MEDIUM]: 2,
  [SEVERITIES.HIGH]: 3,
  [SEVERITIES.CRITICAL]: 4,
});

const VERDICT_LABEL = Object.freeze({
  [VERDICTS.CANONICAL]: 'Authentic Canonical',
  [VERDICTS.RECOGNIZED_VARIANT]: 'Recognized Variant',
  [VERDICTS.ASCII_FALLBACK]: 'ASCII Fallback',
  [VERDICTS.STYLED]: 'Styled Presentation',
  [VERDICTS.TRANSLITERATION_UNCERTAIN]: 'Uncertain Transliteration',
  [VERDICTS.HOMOGRAPH_SPOOF]: 'Homograph Spoof',
  [VERDICTS.MIXED_SCRIPT_SPOOF]: 'Mixed-Script Spoof',
  [VERDICTS.LOOKALIKE_DOMAIN]: 'Lookalike Domain',
  [VERDICTS.UNSAFE]: 'Blocked Threat',
  [VERDICTS.UNKNOWN]: 'Unknown',
});

const VERDICT_EXPLANATION = Object.freeze({
  [VERDICTS.CANONICAL]:
    'This input exactly matches a PUNYCODEX canonical Unicode transliteration. It preserves stress, length, and other philological features that the plain ASCII form cannot represent.',
  [VERDICTS.RECOGNIZED_VARIANT]:
    'This is a scholarly variant recorded in the lexicon (e.g., macron-only, alternate stress, or ideal stacked form). It is a legitimate restoration.',
  [VERDICTS.ASCII_FALLBACK]:
    "This is the plain-ASCII search/routing form of a canonical name. It is safe and useful for compatibility, but it is not the scholarly canonical form: it has lost the stress marks, length marks, or other diacritics that carry the name's philological meaning.",
  [VERDICTS.STYLED]:
    'This uses Unicode stylistically but does not impersonate another name. It is not in the canonical lexicon and should be treated as decorative.',
  [VERDICTS.TRANSLITERATION_UNCERTAIN]:
    'This folds to a canonical name after stripping confusables or diacritics, but it is not a listed variant. It may be a dialect, loan, or unverified stylization.',
  [VERDICTS.HOMOGRAPH_SPOOF]:
    'This visually impersonates a canonical name by substituting one or more characters with confusable lookalikes (e.g., Cyrillic а for Latin a).',
  [VERDICTS.MIXED_SCRIPT_SPOOF]:
    'This combines characters from multiple writing systems in a single label, a common homograph attack pattern.',
  [VERDICTS.LOOKALIKE_DOMAIN]:
    'This domain or URL is structured to look like a canonical name or trusted property through punycode, label tricks, or path spoofing.',
  [VERDICTS.UNSAFE]:
    'This matches a known threat pattern, blocklist entry, or has been confirmed by reviewers as a deceptive name.',
  [VERDICTS.UNKNOWN]:
    'This input is not in the PUNYCODEX corpus and shows no clear signs of impersonation.',
});

const VERDICT_RECOMMENDATIONS = Object.freeze({
  [VERDICTS.CANONICAL]: [
    'Use this form with confidence.',
    'See the canonical entry for full provenance.',
  ],
  [VERDICTS.RECOGNIZED_VARIANT]: [
    'This variant is documented; verify it matches the source you intend.',
    'Compare with the canonical entry to understand the difference.',
  ],
  [VERDICTS.ASCII_FALLBACK]: [
    'This form is safe for routing and search, but prefer the canonical Unicode form for scholarly or display use.',
    'See the canonical entry for the diacritic-bearing restoration.',
  ],
  [VERDICTS.STYLED]: [
    'Styled text is usually harmless but may not render correctly everywhere.',
    'For maximum compatibility, prefer the canonical ASCII or Unicode form.',
  ],
  [VERDICTS.TRANSLITERATION_UNCERTAIN]: [
    'Double-check the source before trusting this form.',
    'If you control this name, consider registering the canonical form.',
  ],
  [VERDICTS.HOMOGRAPH_SPOOF]: [
    'Do not trust this input. It is designed to look like a canonical name.',
    'Report it and use the safe canonical alternative shown below.',
  ],
  [VERDICTS.MIXED_SCRIPT_SPOOF]: [
    'Mixed scripts in a single label are a strong spoofing signal.',
    'Inspect each character and prefer the canonical form.',
  ],
  [VERDICTS.LOOKALIKE_DOMAIN]: [
    'Verify the registrable domain carefully before entering credentials.',
    'Hover links and compare against the canonical domain.',
  ],
  [VERDICTS.UNSAFE]: [
    'This input is blocked. Do not visit, register, or share it.',
    'If you believe this is a mistake, contact the PUNYCODEX operators.',
  ],
  [VERDICTS.UNKNOWN]: [
    'No canonical match was found.',
    'If this is a legitimate name, it may be added to the lexicon in the future.',
  ],
});

function isWorseSeverity(a, b) {
  return SEVERITY_RANK[a] > SEVERITY_RANK[b];
}

function worstSeverity(a, b) {
  return isWorseSeverity(a, b) ? a : b;
}

function explainVerdict(verdict) {
  return {
    verdict,
    label: VERDICT_LABEL[verdict] || verdict,
    explanation: VERDICT_EXPLANATION[verdict] || 'No explanation available.',
    recommendations: VERDICT_RECOMMENDATIONS[verdict] || [],
  };
}

module.exports = {
  VERDICTS,
  SEVERITIES,
  VERDICT_SEVERITY,
  SEVERITY_RANK,
  VERDICT_LABEL,
  VERDICT_EXPLANATION,
  VERDICT_RECOMMENDATIONS,
  isWorseSeverity,
  worstSeverity,
  explainVerdict,
};
