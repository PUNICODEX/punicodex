/**
 * PÚNYCODEX — Risk Feature Vector
 *
 * Computes a compact, synchronous feature vector for the Ensemble Risk
 * Classifier. All features are deterministic and cache-friendly.
 */

const { decompose } = require('./name-decomposer');
const { skeletonSimilarity, getScriptRisk, levenshtein } = require('./confusable-atlas');
const { renderedSimilarity: glyphRenderedSimilarity } = require('./glyph-renderer');
const { findIdentities, findIdentityByBlockedPattern } = require('./identity-kernel');
const { getDb } = require('../db/connection');
const IDN_POLICIES = require('../db/idn-registry-policies.json');

function parseJson(value) {
  if (!value) return null;
  if (typeof value === 'object') return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

let canonicalRowsCache = null;

function loadCanonicalRows() {
  if (canonicalRowsCache) return canonicalRowsCache;
  const rows = getDb()
    .prepare(`SELECT id, ascii, unicode, search_key, pantheon, tier, variants FROM entries`)
    .all();
  canonicalRowsCache = rows.map((row) => ({
    ...row,
    variants: parseJson(row.variants) || [],
  }));
  return canonicalRowsCache;
}

function toSearchKey(str) {
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}']+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function computeScriptEntropy(scriptCounts, total) {
  if (total === 0) return 0;
  let entropy = 0;
  for (const count of scriptCounts.values()) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  return entropy;
}

function computeScriptPairRisk(scripts) {
  let risk = 0;
  for (let i = 0; i < scripts.length; i++) {
    for (let j = i + 1; j < scripts.length; j++) {
      risk = Math.max(risk, getScriptRisk(scripts[i], scripts[j]));
    }
  }
  return risk;
}

let canonicalIndexCache = null;

function buildCanonicalIndex(canonicalRows) {
  const idLower = new Set();
  const asciiLower = new Set();
  const unicodeLower = new Set();
  const variantLower = new Set();
  const searchKeySet = new Set();

  for (const row of canonicalRows) {
    if (row.id) idLower.add(String(row.id).toLowerCase());
    if (row.ascii) asciiLower.add(String(row.ascii).toLowerCase());
    if (row.unicode) unicodeLower.add(String(row.unicode).toLowerCase());
    if (row.search_key) searchKeySet.add(String(row.search_key));

    if (Array.isArray(row.variants)) {
      for (const variant of row.variants) {
        if (variant && typeof variant.unicode === 'string') {
          variantLower.add(variant.unicode.toLowerCase());
        }
      }
    }
  }

  return { idLower, asciiLower, unicodeLower, variantLower, searchKeySet };
}

function getCanonicalIndex(canonicalRows) {
  if (!canonicalIndexCache || canonicalIndexCache.rows !== canonicalRows) {
    canonicalIndexCache = { rows: canonicalRows, index: buildCanonicalIndex(canonicalRows) };
  }
  return canonicalIndexCache.index;
}

function isAsciiOnly(str) {
  return ![...String(str)].some((ch) => ch.codePointAt(0) > 127);
}

function findLexiconMatchState(input, canonicalRows) {
  const raw = String(input).trim();
  const lower = raw.toLowerCase();
  const index = getCanonicalIndex(canonicalRows);

  // Exact canonical match: Unicode form only. The ID and ASCII fields are
  // machine/search forms; when they differ from the Unicode restoration they
  // are ASCII fallbacks, not scholarly canonical forms.
  if (index.unicodeLower.has(lower)) {
    return { hasCanonicalExact: true, hasAsciiFallbackExact: false, variantRecognition: false };
  }

  if (index.idLower.has(lower)) {
    const row = canonicalRows.find((r) => String(r.id || '').toLowerCase() === lower);
    const unicodeLower = row ? String(row.unicode || '').toLowerCase() : '';
    if (unicodeLower && unicodeLower !== lower) {
      return { hasCanonicalExact: false, hasAsciiFallbackExact: true, variantRecognition: false };
    }
    // ID and Unicode are identical; treat as canonical.
    return { hasCanonicalExact: true, hasAsciiFallbackExact: false, variantRecognition: false };
  }

  if (index.asciiLower.has(lower)) {
    const row = canonicalRows.find((r) => String(r.ascii || '').toLowerCase() === lower);
    const unicodeLower = row ? String(row.unicode || '').toLowerCase() : '';
    if (unicodeLower && unicodeLower !== lower) {
      return { hasCanonicalExact: false, hasAsciiFallbackExact: true, variantRecognition: false };
    }
    // ASCII and Unicode are identical; the Unicode branch already covered it.
    return { hasCanonicalExact: true, hasAsciiFallbackExact: false, variantRecognition: false };
  }

  if (index.variantLower.has(lower)) {
    return { hasCanonicalExact: false, hasAsciiFallbackExact: false, variantRecognition: true };
  }

  if (index.searchKeySet.has(toSearchKey(raw))) {
    // A pure-ASCII input that folds to the same search key is the ASCII fallback
    // form, not the canonical restoration. A non-ASCII fold (e.g., different
    // accent convention) is treated as canonical.
    if (isAsciiOnly(raw)) {
      return { hasCanonicalExact: false, hasAsciiFallbackExact: true, variantRecognition: false };
    }
    return { hasCanonicalExact: true, hasAsciiFallbackExact: false, variantRecognition: false };
  }

  return { hasCanonicalExact: false, hasAsciiFallbackExact: false, variantRecognition: false };
}

function collectCandidates(canonicalRows) {
  const candidates = [];
  for (const row of canonicalRows) {
    for (const field of [row.id, row.ascii, row.unicode]) {
      if (field) candidates.push(String(field));
    }
    if (Array.isArray(row.variants)) {
      for (const variant of row.variants) {
        if (variant && typeof variant.unicode === 'string') {
          candidates.push(variant.unicode);
        }
      }
    }
  }
  return candidates;
}

function computeSimilarityMax(raw, canonicalRows, identityMatches) {
  const candidates = collectCandidates(canonicalRows);

  for (const match of identityMatches) {
    const identity = match.identity;
    const aliases = new Set([
      identity.id,
      identity.name,
      identity.ascii,
      identity.unicode,
      ...(identity.aliases || []),
    ]);
    for (const alias of aliases) {
      if (alias) candidates.push(String(alias));
    }
  }

  let skeletonMax = 0;
  const topCandidates = [];

  for (const candidate of candidates) {
    const score = skeletonSimilarity(raw, candidate);
    if (score > skeletonMax) skeletonMax = score;
    if (score >= 0.6) {
      topCandidates.push({ text: candidate, score });
    }
  }

  topCandidates.sort((a, b) => b.score - a.score);
  const renderedSet = topCandidates.slice(0, 8);

  let glyphMax = 0;
  for (const candidate of renderedSet) {
    const score = glyphRenderedSimilarity(raw, candidate.text);
    if (score > glyphMax) glyphMax = score;
  }

  return { skeletonMax, glyphMax };
}

function computeDomainEtldRisk(options = {}) {
  const domainInfo = options.domainInfo || null;
  const idnaErrors = options.idnaErrors || [];

  if (!domainInfo) return 0;
  if (domainInfo.isIp) return 0;

  const hardErrors = idnaErrors.filter((e) => !e.startsWith('warning:'));
  if (hardErrors.length > 0) return 0.8;

  const warnings = idnaErrors.filter((e) => e.startsWith('warning:'));
  if (warnings.length > 0) return 0.3;

  const etld = domainInfo.etld;
  if (!etld) return 0.2;
  if (!Object.hasOwn(IDN_POLICIES, etld)) return 0.1;

  return 0;
}

function computeRiskFeatures(input, options = {}) {
  const raw = String(input || '');
  const decomposition = decompose(raw);
  const canonicalRows = options.canonicalRows || loadCanonicalRows();
  const matchInfo = options.matchInfo || null;

  const confusableCount = decomposition.chars.filter((c) => c.isConfusable).length;
  const confusableDensity = raw.length > 0 ? confusableCount / raw.length : 0;

  const scriptCounts = new Map();
  for (const c of decomposition.chars) {
    scriptCounts.set(c.script, (scriptCounts.get(c.script) || 0) + 1);
  }
  const scriptEntropy = computeScriptEntropy(scriptCounts, decomposition.length);
  const realScripts = [...scriptCounts.keys()].filter(
    (script) => script !== 'Common' && script !== 'Inherited'
  );
  const mixedScriptFlag = realScripts.length > 1;
  const scriptPairRisk = computeScriptPairRisk(realScripts);

  const invisibleCharFlag = decomposition.hasInvisibleChars;
  const bidiOverrideFlag = decomposition.hasBidirectionalOverride;

  const nfkc = raw.normalize('NFKC');
  const normalizationDistance = levenshtein(raw, nfkc) / Math.max(raw.length, nfkc.length, 1);

  const hasDeception =
    confusableCount > 0 || mixedScriptFlag || invisibleCharFlag || bidiOverrideFlag;

  const lexiconState = findLexiconMatchState(raw, canonicalRows);

  let skeletonMax = 0;
  let glyphMax = 0;
  let identityPriority = 0;

  if (
    lexiconState.hasCanonicalExact ||
    lexiconState.hasAsciiFallbackExact ||
    lexiconState.variantRecognition
  ) {
    skeletonMax = 1;
    glyphMax = 1;
  } else if (matchInfo) {
    // Reuse identity matches and lookalike score already computed by the
    // canonical matcher. This removes a redundant O(n) scan per classification.
    const identityMatches = matchInfo.identityMatches || [];
    if (identityMatches.length > 0) {
      identityPriority = identityMatches[0].identity.priority || 0;
    }
    const hasIdentityExactFolded = identityMatches.some((m) => m.matchType !== 'visual');
    if (hasIdentityExactFolded && !hasDeception) {
      skeletonMax = 1;
      glyphMax = 1;
    } else if (hasDeception) {
      skeletonMax = matchInfo.lookalikeScore || 0;
      // Compute glyph similarity only against the top candidates to keep cost low.
      const topCandidates = [];
      for (const match of identityMatches.slice(0, 8)) {
        const candidate =
          match.matchedAlias ||
          match.identity.unicode ||
          match.identity.ascii ||
          match.identity.name;
        if (candidate) topCandidates.push(candidate);
      }
      let glyphMaxLocal = 0;
      for (const candidate of topCandidates) {
        const score = glyphRenderedSimilarity(raw, candidate);
        if (score > glyphMaxLocal) glyphMaxLocal = score;
      }
      glyphMax = glyphMaxLocal;
    }
  } else {
    const identityMatches = findIdentities(raw, {
      includeLexicon: true,
      matchTypes: hasDeception ? ['exact', 'folded', 'visual'] : ['exact', 'folded'],
      threshold: 0.85,
    });

    if (identityMatches.length > 0) {
      identityPriority = identityMatches[0].identity.priority || 0;
    }

    const hasIdentityExactFolded = identityMatches.some((m) => m.matchType !== 'visual');

    if (hasIdentityExactFolded && !hasDeception) {
      skeletonMax = 1;
      glyphMax = 1;
    } else if (hasDeception) {
      const sim = computeSimilarityMax(raw, canonicalRows, identityMatches);
      skeletonMax = sim.skeletonMax;
      glyphMax = sim.glyphMax;
    }
  }

  let hasBlockedPatternMatch = false;
  if (options.checkBlockedPattern || options.domainOrLabel) {
    const label = raw.includes('.') ? raw.split('.')[0] : raw;
    hasBlockedPatternMatch =
      !!findIdentityByBlockedPattern(raw) || !!findIdentityByBlockedPattern(label);
  }

  return {
    glyphSimilarityMax: glyphMax,
    skeletonSimilarityMax: skeletonMax,
    confusableCount,
    confusableDensity,
    scriptEntropy,
    mixedScriptFlag,
    scriptPairRisk,
    invisibleCharFlag,
    bidiOverrideFlag,
    normalizationDistance,
    domainEtldRisk: computeDomainEtldRisk(options),
    pathQueryRisk: 0,
    reputationScore: 0,
    identityPriority,
    variantRecognition: lexiconState.variantRecognition,
    hasCanonicalExact: lexiconState.hasCanonicalExact,
    hasAsciiFallbackExact: lexiconState.hasAsciiFallbackExact,
    hasBlockedPatternMatch,
  };
}

module.exports = {
  computeRiskFeatures,
};
