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
const { buildSkeleton, levenshtein, CONFUSABLE_TO_ASCII } = require('./confusable-atlas');
const { toSearchKey } = require('./query-normalize');
const { decompose, computeVisualDeviation } = require('./name-decomposer');
const { decomposeUrl } = require('./url-decomposer');
const { classifyUrlParts } = require('./url-classifier');
const { findIdentities, buildIdentityMatch } = require('./identity-kernel');
const { lookupBrand, checkDomainAgainstBrands } = require('./brand-shield');
const { findSubdomainIdentityLookalike } = require('./identity-domain-helpers');
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
  [VERDICTS.ASCII_FALLBACK]: 'ascii-fallback',
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
let lookalikeCandidateCache = null;
let lookalikeCandidateCacheBuiltAt = 0;
let registeredDomainCache = null;
let registeredDomainCacheBuiltAt = 0;
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

function getLookalikeCandidates() {
  const now = Date.now();
  if (lookalikeCandidateCache && now - lookalikeCandidateCacheBuiltAt < CACHE_TTL_MS) {
    return lookalikeCandidateCache;
  }

  const rows = getCanonicalRows();
  const candidates = [];
  for (const row of rows) {
    for (const candidate of [row.id, row.ascii, row.unicode].filter(Boolean)) {
      const skeleton = buildSkeleton(candidate);
      candidates.push({ row, candidate, skeleton, length: skeleton.length });
    }
    if (Array.isArray(row.variants)) {
      for (const variant of row.variants) {
        if (variant && typeof variant.unicode === 'string') {
          const skeleton = buildSkeleton(variant.unicode);
          candidates.push({
            row,
            candidate: variant.unicode,
            skeleton,
            length: skeleton.length,
            variant,
          });
        }
      }
    }
  }

  lookalikeCandidateCache = candidates;
  lookalikeCandidateCacheBuiltAt = now;
  return candidates;
}

function getRegisteredDomain(normalized, punycode) {
  const now = Date.now();
  if (!registeredDomainCache || now - registeredDomainCacheBuiltAt >= CACHE_TTL_MS) {
    registeredDomainCache = new Map();
    registeredDomainCacheBuiltAt = now;
  }

  const key = normalized || punycode;
  if (registeredDomainCache.has(key)) {
    return registeredDomainCache.get(key);
  }

  try {
    const row = getDb()
      .prepare(
        `SELECT entry_id, trust_tier, source FROM canonical_domains WHERE domain = ? OR punycode = ?`
      )
      .get(normalized || '', punycode || '');
    registeredDomainCache.set(key, row || null);
    return row || null;
  } catch (_e) {
    return null;
  }
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

function isAsciiOnly(str) {
  return ![...String(str)].some((ch) => ch.codePointAt(0) > 127);
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
  let asciiFallback = null;
  let variantMatch = null;
  let bestLookalike = null;
  let bestLookalikeScore = 0;

  for (const row of getCanonicalRows()) {
    // 1. Exact canonical match: Unicode form only.
    if (exactMatch(lower, row.unicode)) {
      exact = row;
      break;
    }

    // 2. ID match: the entry slug is a machine identifier and search key. When
    // it differs from the Unicode restoration it is an ASCII fallback, not the
    // scholarly canonical form.
    if (exactMatch(lower, row.id)) {
      const unicodeLower = String(row.unicode || '').toLowerCase();
      if (unicodeLower !== lower) {
        asciiFallback = row;
        break;
      }
      // ID and Unicode are identical; treat as canonical.
      exact = row;
      break;
    }

    // 3. ASCII fallback match: exact match on entry.ascii, but only when the
    // ASCII form differs from the Unicode restoration. If they are identical,
    // the Unicode match above already covered it.
    if (exactMatch(lower, row.ascii)) {
      const unicodeLower = String(row.unicode || '').toLowerCase();
      if (unicodeLower !== lower) {
        asciiFallback = row;
        break;
      }
      // ASCII and Unicode are identical; treat as canonical since the canonical form is plain ASCII.
      exact = row;
      break;
    }

    // 4. Recognized variant match (macron-only, ideal, alt-stress, etc.).
    if (Array.isArray(row.variants)) {
      for (const variant of row.variants) {
        if (variant && typeof variant.unicode === 'string' && exactMatch(lower, variant.unicode)) {
          variantMatch = { row, variant };
          break;
        }
      }
      if (variantMatch) break;
    }

    // 5. Search-key fold match (e.g., "áres" → "ares"). A non-ASCII input that
    // folds to the same base is treated as canonical (same name, different
    // accent convention). A pure-ASCII input that folds to the same key is the
    // ASCII fallback form and must not be called canonical.
    if (searchKey === row.search_key) {
      if (isAsciiOnly(raw)) {
        asciiFallback = row;
      } else {
        exact = row;
      }
      break;
    }
  }

  // 4. Lookalike skeleton similarity for spoof detection, using a precomputed
  // candidate list with cached skeletons and a single input skeleton computation.
  const candidates = getLookalikeCandidates();
  const rawSkeleton = buildSkeleton(raw);
  const rawSkeletonLen = rawSkeleton.length;
  for (const entry of candidates) {
    const maxLen = Math.max(rawSkeletonLen, entry.length);
    if (maxLen > 0 && Math.abs(rawSkeletonLen - entry.length) > maxLen * (1 - 0.85)) {
      continue;
    }
    const score =
      entry.skeleton === rawSkeleton ? 1 : 1 - levenshtein(rawSkeleton, entry.skeleton) / maxLen;
    if (score > bestLookalikeScore) {
      bestLookalikeScore = score;
      bestLookalike = { row: entry.row, score, variant: entry.variant || null };
    }
  }

  // Fast path: if we already have an exact, variant, or ASCII-fallback lexicon
  // match, only check identities for exact/folded aliases (e.g., a known brand
  // like Apple that is not in the lexicon). Skip the expensive visual scan
  // because there are no deception signals to investigate.
  const hasDeceptionSignals = confusable.hasConfusables || decompose(raw).hasMixedScripts;

  const identityMatches = findIdentities(raw, {
    includeLexicon: true,
    matchTypes:
      exact || asciiFallback || variantMatch || !hasDeceptionSignals
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
    asciiFallback,
    variantMatch,
    lookalike: bestLookalikeScore >= 0.85 ? bestLookalike : null,
    lookalikeScore: bestLookalikeScore,
    foldedInput: confusable.canonical,
    identityMatch,
    identityMatches,
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
    type: 'lexicon',
    variantType: variant?.type || null,
    variantNote: variant?.note || null,
  };
}

// Characters that collapse to ASCII under NFKC and are commonly used in
// homograph normalization attacks (fullwidth forms, mathematical alphanumerics,
// enclosed alphanumerics).
const NORMALIZATION_SPOOF_RE =
  /[\uFF00-\uFFEF\uD835\uD800-\uDFFF\u24B6-\u24E9\u2460-\u2473\u249C-\u24B5]/;

function looksLikeNormalizationSpoof(raw) {
  const s = String(raw);
  if (NORMALIZATION_SPOOF_RE.test(s)) {
    const nfkc = s.normalize('NFKC');
    return nfkc !== s && /^[a-zA-Z0-9\s\-._]+$/.test(nfkc);
  }
  // Overlong combining diacritic stacks are another normalization attack vector.
  if (/[\u0300-\u036f]/.test(s)) {
    const nfc = s.normalize('NFC');
    return nfc !== s && /[a-zA-Z0-9]{2,}/.test(nfc);
  }
  return false;
}

function hasCombiningDiacriticStack(raw) {
  const s = String(raw);
  if (!/[\u0300-\u036f]/.test(s)) return false;
  let run = 0;
  for (const ch of s) {
    const cp = ch.codePointAt(0);
    if (cp >= 0x0300 && cp <= 0x036f) {
      run++;
      if (run >= 2) return true;
    } else {
      run = 0;
    }
  }
  return false;
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

function applySpoofOverrides(
  mapped,
  { analysis, exact, variantMatch, identityMatch, brandMatch, canonicalMatch, raw, isDomain }
) {
  const hasProtectedMatch = !!(
    exact ||
    variantMatch ||
    identityMatch ||
    brandMatch ||
    canonicalMatch
  );

  // Invisible characters are never legitimate in names/labels. If they also
  // fold to a protected identity, this is a clear spoof; otherwise it is still
  // a high-risk injection.
  if (analysis.invisibleChars.length > 0) {
    return {
      verdict: VERDICTS.HOMOGRAPH_SPOOF,
      severity: hasProtectedMatch ? SEVERITIES.HIGH : SEVERITIES.MEDIUM,
      reason: hasProtectedMatch
        ? 'Invisible-character injection spoofing a protected name'
        : 'Invisible-character injection',
    };
  }

  // Normalization-based homographs (fullwidth, math alphanumeric, combining
  // diacritic stacks, NFD decomposition, etc.) that target a protected identity.
  if (
    hasProtectedMatch &&
    !isDomain &&
    (looksLikeNormalizationSpoof(raw) ||
      (/[\u0300-\u036f]/.test(raw) && raw.normalize('NFC') !== raw) ||
      hasCombiningDiacriticStack(raw))
  ) {
    return {
      verdict: VERDICTS.HOMOGRAPH_SPOOF,
      severity: SEVERITIES.HIGH,
      reason: 'Normalization-based homograph spoof',
    };
  }

  // Non-composing combining diacritics on a protected identity are a
  // normalization homograph even when NFC does not collapse them to a distinct
  // precomposed form (e.g., x + combining-acute looks identical to "xd").
  if (!isDomain && hasProtectedMatch && /[\u0300-\u036f]/.test(raw)) {
    const isRealExact =
      !!exact &&
      (raw.toLowerCase() === String(exact.id).toLowerCase() ||
        raw.toLowerCase() === String(exact.ascii).toLowerCase() ||
        raw.toLowerCase() === String(exact.unicode).toLowerCase());
    const isListedVariant = !!variantMatch;

    if (!isRealExact && !isListedVariant) {
      return {
        verdict: VERDICTS.HOMOGRAPH_SPOOF,
        severity: SEVERITIES.HIGH,
        reason: 'Combining-diacritic normalization spoof',
      };
    }
  }

  // Confusable or folded spoofs of protected identities: if the input carries
  // visual-deception signals (confusable glyphs or mixed scripts) and matches a
  // protected identity without being a real exact/variant form, it is a spoof.
  // This catches brand homographs (đropbox, 𝖷ᴝ), math-alphanumeric lexicon
  // spoofs (𝔋ymir), and search-key-fold homographs (𝔋el).
  if (
    !isDomain &&
    hasProtectedMatch &&
    (analysis.confusables.length > 0 || analysis.mixedScripts)
  ) {
    const isRealExact =
      !!exact &&
      (raw.toLowerCase() === String(exact.id).toLowerCase() ||
        raw.toLowerCase() === String(exact.ascii).toLowerCase() ||
        raw.toLowerCase() === String(exact.unicode).toLowerCase());
    const isListedVariant = !!variantMatch;
    const isBrandVisualMatch =
      canonicalMatch && canonicalMatch.type === 'brand' && canonicalMatch.matchType === 'visual';

    if (!isRealExact && !isListedVariant) {
      return {
        verdict: VERDICTS.HOMOGRAPH_SPOOF,
        severity: SEVERITIES.HIGH,
        reason: isBrandVisualMatch
          ? 'Visual spoof of a protected brand'
          : 'Confusable or folded spoof of a protected identity',
      };
    }
  }

  return mapped;
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

function collectAsciiConfusables(str) {
  const found = [];
  for (const ch of String(str)) {
    if (CONFUSABLE_TO_ASCII.has(ch)) found.push(ch);
  }
  return found;
}

function foldAsciiDigitConfusables(str) {
  return String(str).replace(/0/g, 'o').replace(/1/g, 'l');
}

function buildVerdict(input, options = {}) {
  const raw = normalizeInput(input);

  // Ultra-fast path: plain-ASCII inputs with no confusable characters and no
  // exact/folded protected-identity match cannot be deceptive. Inputs whose
  // only confusables are ASCII digits 0/1 are folded to their letter forms
  // and checked the same way. This avoids the expensive decompose +
  // risk-classifier pipeline for the bulk of legitimate ASCII names and
  // domains, which keeps large-scale FPR tests fast.
  if (raw && isAsciiOnly(raw) && !isUnsafePattern(raw)) {
    const asciiConfusables = collectAsciiConfusables(raw);
    const hasOnlyDigitConfusables =
      asciiConfusables.length > 0 && asciiConfusables.every((c) => c === '0' || c === '1');

    // For ASCII-only inputs whose only confusables are digit substitutions,
    // try the canonical fold (0→o, 1→l) and the alternate uppercase fold
    // (1→i). If either folded form exactly matches a protected identity and
    // the raw input is not itself an exact alias, this is a digit-substitution
    // spoof. This catches 0m→om, 1bm→ibm, and paypa1→paypal while leaving
    // unrelated alphanumeric strings like susan1 alone.
    if (hasOnlyDigitConfusables) {
      const checkInput = foldAsciiDigitConfusables(raw);
      const altInput = raw.replace(/1/g, 'i').replace(/0/g, 'o');
      const candidates = [...new Set([checkInput, altInput])];
      for (const candidate of candidates) {
        const matches = findIdentities(candidate, {
          includeLexicon: true,
          matchTypes: ['exact', 'folded'],
          threshold: 1,
        });
        const exactFolded = matches.find(
          (m) => m.matchType === 'exact' || m.matchType === 'folded'
        );
        if (!exactFolded || raw.toLowerCase() === candidate.toLowerCase()) {
          continue;
        }

        const identity = exactFolded.identity;
        const hasOwnedPresence =
          Array.isArray(identity.allowedDomains) && identity.allowedDomains.length > 0;
        const isHighValue =
          identity.type !== 'lexicon' || (identity.priority || 0) > 0 || hasOwnedPresence;
        // Short names (≤4 chars) are dense enough that a single digit replacement
        // is almost certainly a deliberate homograph (0m→om, 0ya→oya), while
        // longer coincidental folds like susan0→susano are common legitimate
        // usernames and should not be flagged.
        const isShortDense = candidate.length <= 4;

        if (isHighValue || isShortDense) {
          return finalizeVerdict({
            verdict: VERDICTS.HOMOGRAPH_SPOOF,
            reason: 'ASCII digit substitution spoof of a protected identity',
            canonicalMatch: buildIdentityMatch(identity, 'visual', exactFolded.matchedAlias),
            analysis: {
              scripts: ['Latin'],
              mixedScripts: false,
              confusables: [],
              confusableAnalysis: {
                hasConfusables: asciiConfusables.length > 0,
                confusableCount: asciiConfusables.length,
                canonical: candidate,
                found: asciiConfusables,
                risk: asciiConfusables.length / Math.max(raw.length, 1),
              },
              visualDeviation: 0,
              invisibleChars: [],
              normalized: candidate.toLowerCase(),
            },
          });
        }
      }
    }

    if (asciiConfusables.length === 0) {
      const quickMatch = findIdentities(raw, {
        includeLexicon: true,
        matchTypes: ['exact', 'folded'],
        threshold: 1,
      });
      if (quickMatch.length === 0) {
        return finalizeVerdict({
          verdict: VERDICTS.UNKNOWN,
          reason: 'ASCII-only input with no protected exact match or confusable signals',
          canonicalMatch: null,
          analysis: {
            scripts: ['Latin'],
            mixedScripts: false,
            confusables: [],
            confusableAnalysis: {
              hasConfusables: false,
              confusableCount: 0,
              canonical: raw,
              found: [],
              risk: 0,
            },
            visualDeviation: 0,
            invisibleChars: [],
            normalized: raw.toLowerCase(),
          },
        });
      }
    }
  }

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

  // Fast path: pure-ASCII inputs with no confusable, invisible, or mixed-script
  // signals and no exact/folded protected identity match are almost always
  // unknown. This keeps the FPR budget test and large-scale red-team runs fast
  // without weakening spoof detection for inputs that carry visual deception.
  if (isAsciiOnly(raw)) {
    const confusable = analyzeConfusables(raw);
    if (
      confusable.confusableCount === 0 &&
      !analysis.mixedScripts &&
      analysis.invisibleChars.length === 0
    ) {
      const quickMatch = findIdentities(raw, {
        includeLexicon: true,
        matchTypes: ['exact', 'folded'],
        threshold: 1,
      });
      if (quickMatch.length === 0) {
        return finalizeVerdict({
          verdict: VERDICTS.UNKNOWN,
          reason: 'ASCII-only input with no protected exact match or confusable signals',
          canonicalMatch: null,
          analysis,
        });
      }
    }
  }

  const matchInfo = findCanonicalMatch(raw);
  const {
    exact,
    asciiFallback,
    variantMatch,
    lookalike,
    lookalikeScore,
    identityMatch: rawIdentityMatch,
    identityMatches,
  } = matchInfo;

  // Brand Shield fallback when the input is not a lexicon match.
  const brandMatch = !exact && !variantMatch && !asciiFallback ? lookupBrand(raw) : null;

  const canonicalRows = getCanonicalRows();
  const features = computeRiskFeatures(raw, {
    canonicalRows,
    checkBlockedPattern: false,
    isDomain: options.isDomain || false,
    domainInfo: options.domainInfo || null,
    idnaErrors: options.idnaErrors || [],
    matchInfo,
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
  } else if (asciiFallback) {
    canonicalMatch = buildCanonicalMatch(asciiFallback);
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

  let mapped = mapVerdict(risk.probability, features, identityMatch || brandMatch, canonicalMatch, {
    isDomain: options.isDomain || false,
    input: raw,
  });

  mapped = applySpoofOverrides(mapped, {
    analysis,
    exact,
    variantMatch,
    identityMatch,
    brandMatch,
    canonicalMatch,
    raw,
    isDomain: options.isDomain || false,
  });

  // Conservative guard: ASCII-only inputs that do not strongly resemble a
  // protected identity should not be escalated to deceptive verdicts purely
  // because of digit/symbol confusable heuristics.
  const hasStrongMatch = !!(exact || asciiFallback || variantMatch || identityMatch || brandMatch);
  if (
    !hasStrongMatch &&
    isAsciiOnly(raw) &&
    lookalikeScore < 0.9 &&
    (mapped.verdict === VERDICTS.HOMOGRAPH_SPOOF || mapped.verdict === VERDICTS.LOOKALIKE_DOMAIN)
  ) {
    mapped = {
      verdict: VERDICTS.UNKNOWN,
      severity: SEVERITIES.NONE,
      reason: 'No strong protected target match for ASCII-only input',
    };
  }

  // Extra-conservative guard for ASCII-only inputs whose only deception signal
  // is a digit (0/1) that folds to a long, low-priority lexicon identity. Short
  // dense names (≤4 chars) and high-value identities (brands, owned domains,
  // or flagged priority) are still caught above; this stops common random
  // usernames like susan0.de from being flagged as spoofs of susano.
  const asciiConfusablesMain = collectAsciiConfusables(raw);
  const onlyDigitConfusablesMain =
    asciiConfusablesMain.length > 0 && asciiConfusablesMain.every((c) => c === '0' || c === '1');
  if (
    onlyDigitConfusablesMain &&
    isAsciiOnly(raw) &&
    (mapped.verdict === VERDICTS.HOMOGRAPH_SPOOF || mapped.verdict === VERDICTS.LOOKALIKE_DOMAIN) &&
    canonicalMatch &&
    canonicalMatch.type === 'lexicon'
  ) {
    const matchedIdentity =
      (identityMatches || []).find((m) => m.identity.id === canonicalMatch.id)?.identity || null;
    const targetName = String(canonicalMatch.ascii || canonicalMatch.id || '');
    const isLowValueLexicon =
      !matchedIdentity ||
      ((matchedIdentity.priority || 0) === 0 &&
        (!Array.isArray(matchedIdentity.allowedDomains) ||
          matchedIdentity.allowedDomains.length === 0));
    if (isLowValueLexicon && targetName.length > 4) {
      mapped = {
        verdict: VERDICTS.UNKNOWN,
        severity: SEVERITIES.NONE,
        reason: 'ASCII digit-only fold to a common lexicon name',
      };
    }
  }

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
    const registered = getRegisteredDomain(raw, raw);

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
  } else {
    const subdomainLookalike = findSubdomainIdentityLookalike(domainInfo);
    if (subdomainLookalike) {
      result.verdict = VERDICTS.LOOKALIKE_DOMAIN;
      result.severity = SEVERITIES.HIGH;
      result.canonicalMatch = subdomainLookalike.identityMatch;
      applyVerdictOverride(
        result,
        `identity ${subdomainLookalike.identityMatch.name || subdomainLookalike.identityMatch.id} appears in label '${subdomainLookalike.label}' but registrable domain ${subdomainLookalike.registrableDomain} is not allowed`
      );
    } else if (
      !idnaResult.valid &&
      SEVERITY_RANK[result.severity] < SEVERITY_RANK[SEVERITIES.HIGH]
    ) {
      result.verdict = VERDICTS.LOOKALIKE_DOMAIN;
      result.severity = SEVERITIES.HIGH;
      const hardErrors = idnaErrors.filter((e) => !e.startsWith('warning:')).join(', ');
      applyVerdictOverride(result, `IDNA validation failed: ${hardErrors}`);
    }
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
  registeredDomainCache = null;
  registeredDomainCacheBuiltAt = 0;
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
