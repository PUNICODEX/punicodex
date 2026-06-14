/**
 * Hybrid Ranking Model for PUNYCODEX web search.
 *
 * Combines multiple signals into a single ranking score with A/B variant support.
 *
 * Signals:
 * - bm25: FTS5 BM25 score (normalized so higher = better)
 * - keywordMatch: query token overlap with indexed content
 * - entityGraph: entity_mentions co-occurrence
 * - clickBoost: historical click-through rate for this query/site
 * - tenantQuality: tenant presence, front URL, quality_score
 * - tierBonus: dual/1/2 tier preference
 * - flagshipBonus: flagship sites
 * - authority: authority_score
 * - quality: quality_score
 * - freshness: freshness_score
 * - punycodeBonus: xn-- domains
 * - semantic: vector similarity when available
 *
 * Variants let us A/B test different weight configurations.
 */

function tokenize(q) {
  return String(q)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

function normalizeBm25(bm25) {
  // bm25 is negative or positive depending on FTS5 implementation.
  // Lower magnitude is better, so we invert and squash to [0, 1].
  const raw = Number(bm25) || 0;
  return 1 / (1 + Math.abs(raw));
}

function keywordMatchScore(row, tokens) {
  if (!tokens.length) return 0;
  const haystack = [
    row.title,
    row.description,
    row.snippet,
    row.domain,
    row.punycode,
    row.lexiconEntryId,
    row.pantheon,
    row.tenant?.name,
    row.tenant?.category,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  const normalizedHaystack = haystack.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  let matches = 0;
  for (const t of tokens) {
    if (normalizedHaystack.includes(t)) matches++;
  }
  return matches / tokens.length;
}

function tenantQualityScore(row) {
  let score = 0;
  if (row.tenant?.name) score += 0.4;
  if (row.tenant?.frontUrl) score += 0.3;
  if (row.tenant?.category) score += 0.2;
  score += ((row.qualityScore || row.quality_score || 0) / 100) * 0.5;
  score += ((row.authorityScore || row.authority_score || 0) / 100) * 0.3;
  return Math.min(score, 1.5);
}

const VARIANTS = {
  default: {
    bm25: 1.0,
    keywordMatch: 0.4,
    entityGraph: 0.25,
    clickBoost: 0.35,
    tenantQuality: 0.5,
    tierBonus: 0.2,
    flagshipBonus: 0.35,
    authority: 0.2,
    quality: 0.15,
    freshness: 0.1,
    punycodeBonus: 0.15,
    semantic: 0.5,
  },
  authority: {
    bm25: 0.7,
    keywordMatch: 0.3,
    entityGraph: 0.2,
    clickBoost: 0.2,
    tenantQuality: 0.6,
    tierBonus: 0.15,
    flagshipBonus: 0.25,
    authority: 0.6,
    quality: 0.4,
    freshness: 0.05,
    punycodeBonus: 0.1,
    semantic: 0.3,
  },
  discovery: {
    bm25: 0.6,
    keywordMatch: 0.5,
    entityGraph: 0.5,
    clickBoost: 0.15,
    tenantQuality: 0.3,
    tierBonus: 0.3,
    flagshipBonus: 0.2,
    authority: 0.1,
    quality: 0.1,
    freshness: 0.3,
    punycodeBonus: 0.2,
    semantic: 0.6,
  },
  commercial: {
    bm25: 0.8,
    keywordMatch: 0.4,
    entityGraph: 0.15,
    clickBoost: 0.4,
    tenantQuality: 1.0,
    tierBonus: 0.1,
    flagshipBonus: 0.5,
    authority: 0.15,
    quality: 0.2,
    freshness: 0.1,
    punycodeBonus: 0.1,
    semantic: 0.3,
  },
};

function getVariant(name) {
  return VARIANTS[name] || VARIANTS.default;
}

function computeScore(row, query, options = {}) {
  const tokens = tokenize(query);
  const variant = getVariant(options.variant);
  const breakdown = {};

  // Raw signal values
  breakdown.bm25 = normalizeBm25(row.bm25Score || row.bm25_score || row.rankScore);
  breakdown.keywordMatch = keywordMatchScore(row, tokens);
  breakdown.entityGraph = Math.min(row.entityBonus || 0, 0.25);
  breakdown.clickBoost = Math.min(row.clickBoost || 0, 0.5);
  breakdown.tenantQuality = tenantQualityScore(row);
  breakdown.tierBonus =
    row.tier === 'dual' ? 0.5 : row.tier === '1' ? 0.3 : row.tier === '2' ? 0.1 : 0;
  breakdown.flagshipBonus = row.isFlagship || row.is_flagship ? 0.5 : 0;
  breakdown.authority = (row.authorityScore || row.authority_score || 0) / 100;
  breakdown.quality = (row.qualityScore || row.quality_score || 0) / 100;
  breakdown.freshness = (row.freshnessScore || row.freshness_score || 0.5) / 2; // normalize ~0-0.5
  breakdown.punycodeBonus = row.isPunycode || row.punycode?.startsWith('xn--') ? 0.5 : 0;
  breakdown.semantic = row.semanticScore || row.semantic_score || 0;

  // Weighted sum
  let score = 0;
  for (const key of Object.keys(variant)) {
    score += (breakdown[key] || 0) * variant[key];
  }

  // Fallback bonus/penalty
  if (row.isSemanticFallback) score *= 0.9;
  if (row.isFallback) score *= 0.75;
  if (row.isKeywordMatch) score = Math.max(score, 0.15);

  return {
    score: parseFloat(score.toFixed(4)),
    breakdown,
    variant: options.variant || 'default',
  };
}

function rankResults(results, query, options = {}) {
  if (!Array.isArray(results) || results.length === 0) return results;

  const ranked = results.map((r) => {
    const { score, breakdown, variant } = computeScore(r, query, options);
    return {
      ...r,
      rankScore: score,
      scoreBreakdown: breakdown,
      rankVariant: variant,
    };
  });

  ranked.sort((a, b) => b.rankScore - a.rankScore);
  return ranked;
}

function listVariants() {
  return Object.keys(VARIANTS);
}

module.exports = {
  rankResults,
  computeScore,
  listVariants,
  VARIANTS,
  normalizeBm25,
  keywordMatchScore,
  tenantQualityScore,
};
