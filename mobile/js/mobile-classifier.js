/**
 * PuniCodex — Mobile Classifier
 *
 * Lightweight, zero-dependency name authenticity classifier for mobile,
 * wearable, and embedded integrations. Runs offline, has no database
 * dependency, and produces the same verdict taxonomy as the server-side
 * Authenticity Shield.
 */

const VERDICTS = {
  CANONICAL: 'canonical',
  STYLED: 'styled',
  RECOGNIZED_VARIANT: 'recognized-variant',
  TRANSLITERATION_UNCERTAIN: 'transliteration-uncertain',
  LOOKALIKE_DOMAIN: 'lookalike-domain',
  HOMOGRAPH_SPOOF: 'homograph-spoof',
  MIXED_SCRIPT_SPOOF: 'mixed-script-spoof',
  UNSAFE: 'unsafe',
  UNKNOWN: 'unknown',
};

const SEVERITIES = {
  NONE: 'none',
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
};

const LABELS = {
  [VERDICTS.STYLED]: 'Styled Brand Mention',
  [VERDICTS.RECOGNIZED_VARIANT]: 'Recognized Variant',
  [VERDICTS.HOMOGRAPH_SPOOF]: 'Homograph Spoof',
  [VERDICTS.MIXED_SCRIPT_SPOOF]: 'Mixed-Script Spoof',
  [VERDICTS.UNSAFE]: 'Unsafe',
  [VERDICTS.UNKNOWN]: 'Unknown',
};

const EXPLANATIONS = {
  [VERDICTS.STYLED]: 'Uses legitimate characters that match a protected identity.',
  [VERDICTS.RECOGNIZED_VARIANT]: 'A known legitimate variant of a protected identity.',
  [VERDICTS.HOMOGRAPH_SPOOF]: 'Visually mimics a trusted identity using confusable characters.',
  [VERDICTS.MIXED_SCRIPT_SPOOF]: 'Combines characters from multiple writing systems.',
  [VERDICTS.UNSAFE]: 'Contains blocked patterns, invisible characters, or bidirectional overrides.',
  [VERDICTS.UNKNOWN]: 'No protected identity or spoofing signals detected.',
};

const RECOMMENDATIONS = {
  [VERDICTS.HOMOGRAPH_SPOOF]: ['Do not trust this input', 'Visit the official site directly'],
  [VERDICTS.MIXED_SCRIPT_SPOOF]: ['Inspect every character carefully', 'Verify the source'],
  [VERDICTS.UNSAFE]: ['Block or delete this input', 'Report it to your security team'],
  [VERDICTS.UNKNOWN]: [],
  [VERDICTS.STYLED]: [],
  [VERDICTS.RECOGNIZED_VARIANT]: [],
};

// Confusable code points that impersonate Latin/ASCII glyphs.
const CONFUSABLES = new Map([
  ['\u0430', 'a'], // Cyrillic a (U+0430)
  ['\u0435', 'e'], // Cyrillic ie (U+0435)
  ['\u043E', 'o'], // Cyrillic o (U+043E)
  ['\u0440', 'p'], // Cyrillic er (U+0440)
  ['\u0441', 'c'], // Cyrillic es (U+0441)
  ['\u0445', 'x'], // Cyrillic ha (U+0445)
  ['\u0456', 'i'], // Cyrillic byelorussian-ukrainian i (U+0456)
  ['\u0458', 'j'], // Cyrillic je (U+0458)
  ['\u0432', 'b'], // Cyrillic ve (U+0432)
  ['\u043C', 'm'], // Cyrillic em (U+043C)
  ['\u043D', 'n'], // Cyrillic en (U+043D)
  ['\u0442', 't'], // Cyrillic te (U+0442)
  ['\u03B1', 'a'], // Greek alpha (U+03B1)
  ['\u03B5', 'e'], // Greek epsilon (U+03B5)
  ['\u03BF', 'o'], // Greek omicron (U+03BF)
  ['\u03C1', 'p'], // Greek rho (U+03C1)
  ['\u0585', 'o'], // Armenian oh (U+0585)
]);

const INVISIBLE_CODE_POINTS = new Set([
  0x200b, 0x200c, 0x200d, 0x2060, 0xfeff, 0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067,
  0x2068, 0x2069, 0x180e, 0x200e, 0x200f, 0x061c, 0x00ad,
]);

// Variation selectors 1-16.
for (let cp = 0xfe00; cp <= 0xfe0f; cp++) {
  INVISIBLE_CODE_POINTS.add(cp);
}

// Variation selectors 17-256.
for (let cp = 0xe0100; cp <= 0xe01ef; cp++) {
  INVISIBLE_CODE_POINTS.add(cp);
}

const BIDI_CODE_POINTS = new Set([
  0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069, 0x200e, 0x200f, 0x061c,
]);

const BRANDS = [
  {
    id: 'apple',
    name: 'Apple',
    aliases: ['apple', 'apple.com', 'www.apple.com'],
    domains: ['apple.com', 'www.apple.com'],
    blockedPatterns: [/fake-apple/iu, /evil-apple/iu],
  },
  {
    id: 'hermes-brand',
    name: 'Hermès',
    aliases: ['hermès', 'hermes', 'hermes.com'],
    domains: ['hermes.com'],
    blockedPatterns: [/fake-hermes/iu],
  },
  {
    id: 'nike',
    name: 'Nike',
    aliases: ['nike', 'nike.com'],
    domains: ['nike.com'],
    blockedPatterns: [/fake-nike/iu],
  },
  {
    id: 'google',
    name: 'Google',
    aliases: ['google', 'google.com'],
    domains: ['google.com'],
    blockedPatterns: [/fake-google/iu],
  },
];

const DEFAULT_THRESHOLD = 0.85;

function normalize(input) {
  return String(input).trim();
}

function getScript(char) {
  const cp = char.codePointAt(0);
  if ((cp >= 0x41 && cp <= 0x5a) || (cp >= 0x61 && cp <= 0x7a)) return 'Latin';
  if (cp >= 0x00c0 && cp <= 0x024f) return 'Latin';
  if (cp >= 0x0400 && cp <= 0x04ff) return 'Cyrillic';
  if (cp >= 0x0370 && cp <= 0x03ff) return 'Greek';
  if (cp >= 0x0530 && cp <= 0x058f) return 'Armenian';
  if (cp >= 0x10a0 && cp <= 0x10ff) return 'Georgian';
  if (cp >= 0x0600 && cp <= 0x06ff) return 'Arabic';
  if (cp >= 0x0900 && cp <= 0x097f) return 'Devanagari';
  if (cp >= 0x4e00 && cp <= 0x9fff) return 'CJK';
  if (cp >= 0x3040 && cp <= 0x309f) return 'CJK';
  if (cp >= 0x30a0 && cp <= 0x30ff) return 'CJK';
  return 'Other';
}

function decompose(input) {
  const chars = [];
  const scripts = new Set();
  let hasConfusables = false;
  let hasInvisibleChars = false;
  let hasBidiOverride = false;

  for (const char of input) {
    const cp = char.codePointAt(0);
    const script = getScript(char);
    scripts.add(script);
    const isConfusable = CONFUSABLES.has(char);
    const isInvisible = INVISIBLE_CODE_POINTS.has(cp);
    const isBidi = BIDI_CODE_POINTS.has(cp);

    if (isConfusable) hasConfusables = true;
    if (isInvisible) hasInvisibleChars = true;
    if (isBidi) hasBidiOverride = true;

    chars.push({
      char,
      codePoint: cp,
      script,
      confusableTarget: isConfusable ? CONFUSABLES.get(char) : null,
      isInvisible,
      isBidiOverride: isBidi,
    });
  }

  const scriptList = Array.from(scripts);
  const meaningfulScripts = scriptList.filter((s) => s !== 'Other');
  const hasMixedScripts =
    meaningfulScripts.length > 1 ||
    (meaningfulScripts.includes('Latin') && meaningfulScripts.some((s) => s !== 'Latin'));

  return {
    chars,
    scripts: scriptList,
    hasConfusables,
    hasInvisibleChars,
    hasBidirectionalOverride: hasBidiOverride,
    hasMixedScripts,
  };
}

function foldSkeleton(input) {
  let result = '';
  for (const char of input) {
    result += CONFUSABLES.has(char) ? CONFUSABLES.get(char) : char;
  }
  result = result
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w')
    .replace(/cl/g, 'd')
    .replace(/nn/g, 'm')
    .replace(/lI/g, 'U');
  return result.toLowerCase();
}

function skeletonSimilarity(a, b) {
  const sa = foldSkeleton(a);
  const sb = foldSkeleton(b);
  if (sa === sb) return 1;
  if (sa.length === 0 || sb.length === 0) return 0;
  const longer = sa.length > sb.length ? sa : sb;
  const shorter = sa.length > sb.length ? sb : sa;
  let matches = 0;
  for (let i = 0; i < shorter.length; i++) {
    if (shorter[i] === longer[i]) matches++;
  }
  return matches / longer.length;
}

function extractHost(url) {
  try {
    const host = new URL(url).hostname;
    if (typeof require !== 'undefined') {
      const { domainToUnicode } = require('node:url');
      return domainToUnicode(host) || host;
    }
    return host;
  } catch {
    return null;
  }
}

function buildVerdict({
  input,
  verdict,
  severity,
  targetIdentity = null,
  matchedAlias = null,
  reasons = [],
  decomposition = null,
  scores = {},
}) {
  return {
    input,
    verdict,
    severity,
    label: LABELS[verdict] || verdict,
    explanation: EXPLANATIONS[verdict] || '',
    recommendations: RECOMMENDATIONS[verdict] || [],
    targetIdentity: targetIdentity
      ? {
          id: targetIdentity.id,
          name: targetIdentity.name,
          aliases: targetIdentity.aliases,
          matchedAlias,
        }
      : null,
    safeAlternatives: targetIdentity ? targetIdentity.domains.map((d) => `https://${d}`) : [],
    reasons,
    decomposition,
    scores,
  };
}

function classify(input, options = {}) {
  const raw = normalize(input);
  if (raw.length === 0) {
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.UNKNOWN,
      severity: SEVERITIES.NONE,
      reasons: ['Empty input'],
    });
  }

  const decomposition = decompose(raw);
  const threshold = options.lookalikeThreshold ?? DEFAULT_THRESHOLD;

  let blockedIdentity = null;
  let blockedPattern = null;
  let exactIdentity = null;
  let bestLookalike = null;
  let bestScore = 0;

  for (const identity of BRANDS) {
    for (const pattern of identity.blockedPatterns) {
      if (pattern.test(raw)) {
        blockedIdentity = identity;
        blockedPattern = pattern.source;
        break;
      }
    }
    if (blockedIdentity) break;

    for (const alias of identity.aliases) {
      if (raw.toLowerCase() === alias.toLowerCase()) {
        exactIdentity = identity;
        break;
      }
      const score = skeletonSimilarity(raw, alias);
      if (score > bestScore) {
        bestScore = score;
        bestLookalike = { identity, alias, score };
      }
    }
    if (exactIdentity) break;
  }

  if (blockedIdentity) {
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.UNSAFE,
      severity: SEVERITIES.CRITICAL,
      targetIdentity: blockedIdentity,
      reasons: [`Matches blocked pattern “${blockedPattern}” for ${blockedIdentity.name}`],
      decomposition,
    });
  }

  const cleanExact =
    exactIdentity &&
    !decomposition.hasConfusables &&
    !decomposition.hasMixedScripts &&
    !decomposition.hasInvisibleChars &&
    !decomposition.hasBidirectionalOverride;

  if (cleanExact) {
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.STYLED,
      severity: SEVERITIES.LOW,
      targetIdentity: exactIdentity,
      reasons: [`Exact match for ${exactIdentity.name}`],
      decomposition,
    });
  }

  if (bestScore >= threshold && bestLookalike) {
    const { identity, alias, score } = bestLookalike;
    const spoofSignals =
      decomposition.hasConfusables ||
      decomposition.hasMixedScripts ||
      decomposition.hasInvisibleChars ||
      decomposition.hasBidirectionalOverride;

    if (spoofSignals) {
      return buildVerdict({
        input: raw,
        verdict: VERDICTS.HOMOGRAPH_SPOOF,
        severity: SEVERITIES.HIGH,
        targetIdentity: identity,
        matchedAlias: alias,
        reasons: [`Visually similar to ${identity.name} with spoofing signals`],
        decomposition,
        scores: { similarity: score },
      });
    }

    return buildVerdict({
      input: raw,
      verdict: VERDICTS.RECOGNIZED_VARIANT,
      severity: SEVERITIES.LOW,
      targetIdentity: identity,
      matchedAlias: alias,
      reasons: [`Recognized variant of ${identity.name}`],
      decomposition,
      scores: { similarity: score },
    });
  }

  if (decomposition.hasMixedScripts) {
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.MIXED_SCRIPT_SPOOF,
      severity: SEVERITIES.HIGH,
      reasons: ['Input mixes scripts from multiple writing systems'],
      decomposition,
    });
  }

  if (decomposition.hasInvisibleChars || decomposition.hasBidirectionalOverride) {
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.UNSAFE,
      severity: SEVERITIES.CRITICAL,
      reasons: ['Input contains invisible or bidirectional-override characters'],
      decomposition,
    });
  }

  if (decomposition.hasConfusables) {
    return buildVerdict({
      input: raw,
      verdict: VERDICTS.TRANSLITERATION_UNCERTAIN,
      severity: SEVERITIES.MEDIUM,
      reasons: ['Input contains confusable characters but no known brand lookalike'],
      decomposition,
    });
  }

  return buildVerdict({
    input: raw,
    verdict: VERDICTS.UNKNOWN,
    severity: SEVERITIES.NONE,
    reasons: ['No protected identity or spoofing signals detected'],
    decomposition,
  });
}

function classifyUrl(url, options = {}) {
  const host = extractHost(url);
  if (!host) {
    return classify(url, options);
  }
  const result = classify(host, options);
  result.input = url;
  result.reasons.unshift(`Analyzed host: ${host}`);
  return result;
}

const mobileClassifier = {
  VERDICTS,
  SEVERITIES,
  BRANDS,
  classify,
  classifyUrl,
  decompose,
  foldSkeleton,
  skeletonSimilarity,
};

if (typeof module === 'object' && module.exports) {
  module.exports = mobileClassifier;
} else if (typeof globalThis !== 'undefined') {
  globalThis.PUNICODEX_MOBILE_CLASSIFIER = mobileClassifier;
} else if (typeof self !== 'undefined') {
  self.PUNICODEX_MOBILE_CLASSIFIER = mobileClassifier;
} else {
  // eslint-disable-next-line no-invalid-this
  this.PUNICODEX_MOBILE_CLASSIFIER = mobileClassifier;
}
