/**
 * PuniCodex — Unicode Domain Appraisal Engine
 *
 * An appraisal model built specifically for Unicode / IDN domain names,
 * calibrated to observed IDN aftermarket reality rather than to ASCII
 * domain prices. It estimates the plain-ASCII equivalent as a control value,
 * then values the Unicode form from IDN-market fundamentals with every
 * multiplier bounded, stated, and capped.
 *
 * Model design principles
 *   1. ASCII control first. The ASCII wholesale value anchors the appraisal
 *      and caps the Unicode form (an IDN is never worth more than its ASCII
 *      root).
 *   2. Unicode is a thin market. Real IDN sales are modest: random
 *      hand-registered Unicode domains trade at registration fee
 *      ($10–$60); strong single-word .com IDNs reach low-to-mid four
 *      figures. An explicit 50% liquidity discount is applied to every
 *      Unicode valuation.
 *   3. Quality is multiplicative but bounded. Semantic, tier, form,
 *      development, and brand signals multiply a small IDN base value;
 *      their product is capped (120×) and the final Unicode value is hard
 *      capped at $10,000 absent verifiable market comps.
 *   4. Safety overrides everything. Spoofs, homographs, and unsafe patterns
 *      are valued at registration fee only and marked "avoid".
 *   5. Original script is secondary. A non-Latin original-script form is
 *      worth 60% of the primary transliteration (form multipliers 1.2 vs
 *      2.0 encode this ratio).
 *   6. TLD reality matters. IDN-friendly TLDs (.com, .net, .org) get the
 *      full model; non-IDN TLDs get a steep liquidity penalty.
 */

'use strict';

const { domainToASCII } = require('node:url');
const { parseDomain } = require('./domain-parser');
const { classifyDomain } = require('./authenticity-service');
const { lookupBrand } = require('./brand-shield');
const namesService = require('./names-service');
const { getVersion } = require('./version-service');
const { getDb } = require('../db/connection');
const { ARCHETYPES } = require('../../js/archetypes-v2.js');
const { LEXICON } = require('../../type/js/lexicon.js');
const { getOriginalScript } = require('../../type/js/original-scripts.js');

const MODEL_VERSION = 'appraise-3.0.0';
const DATA_VERSION = getVersion().version || 'unknown';
const BASE_REFERENCE_VALUE = 50_000; // USD for a perfect ASCII .com one-word 4-5 letter name
const REGISTRATION_FEE_USD = 12;
const MAX_BATCH_SIZE = 100;

// Cap on the semantic multiplier for the ASCII control value. Dictionary /
// deity .com names trade above the random-letter baseline, but the premium
// is bounded: we allow at most 5× the base reference value from meaning.
const SEMANTIC_MULTIPLIER_CAP = 5.0;

// Unicode / IDN value model. Anchors (see docs/unicode-premium-algorithm-report.md):
//   - random IDN ≈ registration fee ($10–$60)
//   - strong single-word .com IDN ≈ low-to-mid four figures
//   - five-figure outcomes need extraordinary evidence and are capped
const IDN_BASE_VALUE_USD = {
  com: 30, // ≈ 2× registration fee; .com is the only broadly liquid IDN TLD
  net: 15,
  org: 15,
  idnDefault: 12, // other IDN-supporting TLDs ≈ registration fee
  nonIdn: 8, // IDN form on a TLD that does not support IDN registration
};
const IDN_VALUE_CEILING_USD = 10_000; // hard cap for any Unicode appraisal
const IDN_MULTIPLIER_STACK_CAP = 120; // max product of quality multipliers
const IDN_LIQUIDITY_DISCOUNT = 0.5; // thin resale market: halve raw quality value

// Industry demand: the pattern graph (platform/api/industry-patterns.json,
// generated from the canonical industry map) records which real-world
// industries each temple resonates with. Demand from meaning — never from
// third-party brands. A temple's industries raise its ceiling of likely
// end-users, so they raise its value. Bounded at IDN_INDUSTRY_DEMAND_CAP.
const IDN_INDUSTRY_PRIMARY_WEIGHT = 0.35; // per primary (weight-2) industry seat
const IDN_INDUSTRY_RESONANT_WEIGHT = 0.08; // per resonant (weight-1) seat
const IDN_INDUSTRY_DEMAND_CAP = 2.5; // max industry-demand multiplier

// Tier restoration quality: dual-tier names preserve stress AND length and
// are the strongest restorations; tier-1 preserves both features with a
// single valid spelling; tier-2 preserves one feature.
const TIER_IDN_MULTIPLIER = { dual: 2.5, 1: 2.0, 2: 1.3, none: 1.0 };

// Canonical form is the strongest value signal. An owned, operated form
// outsells an ideal scholarly restoration, which outsells an attested
// variant; unrecognized forms are near-worthless. The original-script form
// (1.2) is deliberately 60% of the ideal form (2.0) — see principle 5.
const FORM_IDN_MULTIPLIER = {
  owned: 3.0,
  ideal: 2.0,
  variant: 1.5,
  'original-script': 1.2,
  folded: 0.7,
  ascii: 1.0,
  unknown: 0.3,
};

// Aftermarket scarcity floors for clean ASCII .com names. These reflect the
// hard supply constraint of short domains and current wholesale/retail reality.
// 1L .com domains are effectively unavailable; 2L .com domains have a 300K–500K
// wholesale floor; 3L–6L follow the downward-sloping aftermarket curve.
const SCARCITY_FLOORS_USD = {
  com: {
    1: 10_000_000,
    2: 450_000,
    3: 35_000,
    4: 10_000,
    5: 3_000,
    6: 1_000,
  },
};

const TWO_L_VOWELS = new Set('aeiou');
const TWO_L_COMMON_ENDS = new Set('rstln');

// Premium bigrams: common acronyms, high-frequency abbreviations, and culturally
// significant short forms that trade above the generic 2L .com floor.
const PREMIUM_BIGRAMS = new Set([
  'ai',
  'ar',
  'as',
  'at',
  'be',
  'by',
  'cd',
  'co',
  'do',
  'ea',
  'et',
  'ev',
  'go',
  'he',
  'hr',
  'if',
  'in',
  'io',
  'is',
  'it',
  'iv',
  'me',
  'my',
  'no',
  'of',
  'om',
  'on',
  'or',
  'os',
  'ox',
  'pc',
  'pr',
  'ra',
  're',
  'so',
  'ta',
  'to',
  'tv',
  'up',
  'us',
  'vr',
  'we',
]);

// Tenant / ad-revenue assumptions. A flagship temple page can lease ad slots;
// the appraisal capitalizes a conservative projection of that income: list
// rates × a stated occupancy assumption × 12 months. Occupancy is deliberately
// low (10–15%) because the inventory is unproven; this is a business
// projection reported separately from the domain value, not intrinsic value.
const DEFAULT_FLAGSHIP_SLOT_MONTHLY_CENTS = 300_000; // ≈ seeded flagship slot inventory ($3,000/mo)
const TENANT_REVENUE_MONTHS = 12; // capitalize one year of bookings
const TENANT_OCCUPANCY_DEFAULT = 0.1;

// Verified aftermarket comparables for specific names. When a name has a
// marketplace comp, it overrides the formula-driven ASCII control value.
// Sources: domain broker reports, auction results, wholesale listings.
const MARKET_COMP_OVERRIDES = {
  om: { auction: 451_000, marketplace: 3_680_000, brokerage: 6_370_000 },
};

// TLD liquidity table. Supports IDN registration is a hard gate for Unicode value.
// maxValue caps the ASCII control estimate per TLD; weak-TLD caps are low
// because even strong words on those TLDs have thin aftermarket demand.
const TLD_LIQUIDITY = {
  com: { score: 1.0, supportsIdn: true, maxValue: 10_000_000 },
  net: { score: 0.28, supportsIdn: true, maxValue: 100_000 },
  org: { score: 0.22, supportsIdn: true, maxValue: 80_000 },
  info: { score: 0.12, supportsIdn: true, maxValue: 40_000 },
  biz: { score: 0.1, supportsIdn: true, maxValue: 35_000 },
  // Popular non-IDN generics and ccTLDs
  io: { score: 0.18, supportsIdn: false, maxValue: 60_000 },
  app: { score: 0.15, supportsIdn: false, maxValue: 50_000 },
  dev: { score: 0.12, supportsIdn: false, maxValue: 40_000 },
  ai: { score: 0.14, supportsIdn: false, maxValue: 45_000 },
  co: { score: 0.16, supportsIdn: false, maxValue: 50_000 },
  me: { score: 0.1, supportsIdn: false, maxValue: 30_000 },
  de: { score: 0.05, supportsIdn: false, maxValue: 5_000 },
  fr: { score: 0.05, supportsIdn: false, maxValue: 5_000 },
  jp: { score: 0.06, supportsIdn: false, maxValue: 5_000 },
  eu: { score: 0.04, supportsIdn: false, maxValue: 5_000 },
  uk: { score: 0.06, supportsIdn: false, maxValue: 5_000 },
  us: { score: 0.06, supportsIdn: false, maxValue: 5_000 },
  cn: { score: 0.08, supportsIdn: true, maxValue: 25_000 },
  ru: { score: 0.06, supportsIdn: true, maxValue: 18_000 },
  default: { score: 0.08, supportsIdn: false, maxValue: 2_000 },
};

const PANTHEON_WEIGHTS = {
  greek: 1.0,
  'greek-location': 0.85,
  norse: 0.95,
  egyptian: 0.9,
  sanskrit: 0.85,
  japanese: 0.8,
  chinese: 0.8,
  mesopotamian: 0.75,
  celtic: 0.65,
  slavic: 0.6,
  nahuatl: 0.55,
  polynesian: 0.55,
  yoruba: 0.55,
  zoroastrian: 0.6,
  incan: 0.5,
  buddhist: 0.7,
  taoist: 0.65,
  korean: 0.5,
  canaanite: 0.55,
  phoenician: 0.55,
  hittite: 0.55,
};

// Premium 2-letter .com pairs (dictionary word, deity, common acronym) trade
// at $1M+ — see docs/2letter-com-valuation-report.md.
const MEANINGFUL_2L_FLOOR_USD = 1_000_000;

// Build a lookup of owned/registrable domains per flagship archetype.
const ownedDomainsById = new Map(
  ARCHETYPES.map((a) => {
    const domains = [a.domainUnicode, a.domainPunycode, ...(a.domainAlt || [])].filter(Boolean);
    const registrable = new Set(domains.map((d) => parseDomain(d).domain).filter(Boolean));
    return [a.id, registrable];
  })
);

// Map real original scripts (Greek, Cuneiform, Runes, Devanagari, etc.) to lexicon ids
// so that a domain in the indigenous script can still be appraised correctly.
const originalScriptToId = new Map();
for (const entry of LEXICON) {
  const script = getOriginalScript(entry);
  if (script && script !== '—') {
    originalScriptToId.set(normalizeLabel(script), entry.id);
  }
}

function isAsciiOnly(str) {
  return ![...String(str)].some((ch) => ch.codePointAt(0) > 127);
}

function normalizeLabel(str) {
  return String(str || '')
    .normalize('NFC')
    .toLowerCase()
    .trim();
}

function getTldInfo(tld) {
  const key = String(tld || '').toLowerCase();
  return TLD_LIQUIDITY[key] || TLD_LIQUIDITY.default;
}

function computePunycodeLabel(label) {
  if (!label) return null;
  try {
    const ascii = domainToASCII(label.toLowerCase());
    return ascii !== label.toLowerCase() ? ascii : null;
  } catch (_e) {
    return null;
  }
}

function lengthFactor(length) {
  if (length <= 3) return 1.0;
  if (length <= 4) return 0.9;
  if (length <= 5) return 0.8;
  if (length <= 6) return 0.65;
  if (length <= 8) return 0.5;
  if (length <= 10) return 0.35;
  if (length <= 15) return 0.22;
  return 0.1;
}

function lexicalQualityFactor(name) {
  const lower = name.toLowerCase();
  let factor = 1.0;
  if (lower.startsWith('-') || lower.endsWith('-')) factor *= 0.35;
  else if (lower.includes('-')) factor *= 0.65;
  if (/^\d/.test(lower)) factor *= 0.55;
  if (/\d/.test(lower)) factor *= 0.85;
  if (/[^a-z0-9-]/.test(lower)) factor *= 0.75;
  return factor;
}

// Pronounceability: a .com is only an aftermarket asset if a buyer can say it.
// Random consonant piles (qxyjvkz) have no end-user market and are worth
// roughly the registration fee regardless of length, so the penalty can drive
// the value down toward REGISTRATION_FEE_USD. Runs of 4+ consonants (y counts
// as a consonant — 'y' alone cannot carry a pronounceable string) are the
// objective signal, backed by the absence of any vowel.
function pronounceabilityFactor(name) {
  // Fold diacritics (ý→y, à→a, …) so accented vowels still count as vowels;
  // non-letters are dropped. Acronyms (≤3 chars) are exempt — the scarcity
  // market prices letter pairs/initials, not pronounceability (qx.com, x.com).
  const cleaned = String(name || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (cleaned.length <= 3) return { factor: 1.0, note: null };
  if (!cleaned) return { factor: 1.0, note: null };
  const CONSONANTS = 'bcdfghjklmnpqrstvwxzy';
  if (!/[aeiou]/.test(cleaned)) return { factor: 0.05, note: 'no vowels — unpronounceable' };
  const run = cleaned.match(new RegExp(`[${CONSONANTS}]+`, 'g')) || [];
  const longest = run.reduce((max, r) => Math.max(max, r.length), 0);
  if (longest >= 5) return { factor: 0.1, note: `${longest}-consonant run — unpronounceable` };
  if (longest === 4) return { factor: 0.5, note: '4-consonant cluster — hard to pronounce' };
  return { factor: 1.0, note: null };
}

// Names that fail basic pronounceability AND have no lexical backing are
// registration-fee assets, capped here so the formula cannot inflate them.
const UNPRONOUNCEABLE_CAP_USD = 500;

function brandRiskFactor(name, options = {}) {
  const brand = lookupBrand(name, options);
  if (!brand) return { factor: 1.0, brand: null };
  const matchType = brand.matchType || brand.type || 'visual';
  if (matchType === 'exact' || matchType === 'folded' || matchType === 'domain') {
    return { factor: 0.12, brand };
  }
  return { factor: 0.45, brand };
}

// Quality scoring for two-letter .com pairs. 676 combinations exist; some
// letter patterns (vowels, common endings, repeated letters) trade at a premium.
function twoLetterQualityScore(name) {
  const [a, b] = [...String(name || '').toLowerCase()];
  if (!a || !b) return { score: 1.0, label: 'standard' };

  const hasVowel = TWO_L_VOWELS.has(a) || TWO_L_VOWELS.has(b);
  const commonEnd = TWO_L_COMMON_ENDS.has(b);
  const repeated = a === b;

  if (repeated) return { score: 1.5, label: 'repeated-letter' };
  if (hasVowel && commonEnd) return { score: 1.35, label: 'vowel+common-end' };
  if (hasVowel) return { score: 1.2, label: 'vowel-adjacent' };
  if (commonEnd) return { score: 1.1, label: 'common-end' };
  return { score: 0.9, label: 'consonant-pair' };
}

// Aftermarket scarcity floor for short ASCII .com names. The base formula
// undervalues truly scarce names (1-5 letter dictionary words, etc.), so this
// floor applies to *all* clean .com names of 1-6 characters, not just names
// already present in the PuniCodex lexicon.
function intrinsicAsciiFloor(name, tld, entry) {
  if (tld !== 'com') return 0;
  const len = [...String(name || '')].length;
  const base = SCARCITY_FLOORS_USD.com[len];
  if (!base) return 0;

  if (len === 2) {
    const quality = twoLetterQualityScore(name);
    let floor = base * quality.score;
    // Premium pairs (dictionary word, deity, common acronym) trade at $1M+.
    if (entry || PREMIUM_BIGRAMS.has(String(name || '').toLowerCase())) {
      floor = Math.max(floor, MEANINGFUL_2L_FLOOR_USD);
    }
    return Math.round(floor);
  }
  return base;
}

// Short .com names (1-3 characters) carry scarcity and acronym premiums that
// the base length factor alone does not capture. This multiplier is applied to
// the formula-driven ASCII value before the scarcity floor is enforced, so
// premium pairs like RA.com rise above the generic 2L floor.
function shortNamePremiumMultiplier(label, tld, entry) {
  if (tld !== 'com') return { multiplier: 1.0, note: null, pattern: null };
  const clean = String(label || '').toLowerCase();
  const len = [...clean].length;

  if (len === 1) {
    return { multiplier: 5.0, note: '1L .com extreme scarcity', pattern: '1L' };
  }

  if (len === 2) {
    const quality = twoLetterQualityScore(clean);
    const bigramBoost = PREMIUM_BIGRAMS.has(clean) ? 1.5 : 1.0;
    const meaningBoost = entry ? 1.3 : 1.0;
    const multiplier = Math.min(4.0, Math.max(0.8, quality.score * bigramBoost * meaningBoost));
    return {
      multiplier,
      note: `2L .com scarcity (${quality.label})`,
      pattern: '2L',
    };
  }

  if (len === 3) {
    return { multiplier: 1.2, note: '3L .com scarcity', pattern: '3L' };
  }

  return { multiplier: 1.0, note: null, pattern: null };
}

function isFlagshipLexiconEntry(entry) {
  return Boolean(entry && (entry.hasFlagship || entry.hasAdSite));
}

// Semantic premium for the ASCII control value. A curated, culturally
// significant name (dictionary word, deity) trades above the random-letter
// baseline, but the premium is bounded: tier, attestation, flagship status,
// lore, and pantheon reach add points onto a 1.0 base, capped at
// SEMANTIC_MULTIPLIER_CAP. This replaces the former open-ended
// significance × fame × developed stack, which double-counted the same
// signals and could multiply the base by ~25×.
function semanticMultiplier(entry) {
  if (!entry) return 1.0;

  const tierPoints =
    entry.tier === 'dual' ? 1.5 : entry.tier === '1' ? 1.0 : entry.tier === '2' ? 0.5 : 0;

  const sources = Array.isArray(entry.sources) ? entry.sources : [];
  const sourcePoints = Math.min(sources.length * 0.15, 0.5);

  const flagshipPoints = isFlagshipLexiconEntry(entry) ? 1.0 : 0;
  const lorePoints = entry.lore ? 0.5 : 0;

  const pantheonWeight = PANTHEON_WEIGHTS[entry.pantheon] || 0.5;
  const pantheonPoints = pantheonWeight * 0.5;

  return Math.min(
    1.0 + tierPoints + sourcePoints + flagshipPoints + lorePoints + pantheonPoints,
    SEMANTIC_MULTIPLIER_CAP
  );
}

// Long, unattested ASCII names are worth registration fee, not a fraction of
// the $50K one-word reference value. Without semantic content (no lexicon
// entry, no brand proximity), value decays sharply past 8 characters.
function obscurityDiscount(name, entry, brand) {
  if (entry || brand) return 1.0;
  const len = [...String(name || '')].length;
  if (len <= 6) return 1.0;
  if (len <= 8) return 0.4;
  if (len <= 10) return 0.1;
  if (len <= 12) return 0.03;
  return 0.01;
}

function getAsciiLiveBoost(domain) {
  try {
    const db = getDb();
    if (!db) return { multiplier: 1.0, row: null };
    const row = db
      .prepare(
        'SELECT status, authority_score FROM indexed_sites WHERE (domain = ? OR punycode = ?) LIMIT 1'
      )
      .get(domain, domain);
    if (row?.status !== 'active') return { multiplier: 1.0, row };
    const authority = Number(row.authority_score || 0);
    const multiplier = 1.0 + Math.min(0.5 + authority / 200, 0.75);
    return { multiplier, row };
  } catch (_e) {
    return { multiplier: 1.0, row: null };
  }
}

function estimateAsciiValue(name, tld, entry = null, domain = null) {
  const info = getTldInfo(tld);
  const cleanName = String(name || '').toLowerCase();
  const len = [...cleanName].length;

  const lenFactor = lengthFactor(len);
  const qualityFactor = lexicalQualityFactor(cleanName);
  const pronounce = pronounceabilityFactor(cleanName);
  const semantic = semanticMultiplier(entry);
  const { factor: brandFactor, brand } = brandRiskFactor(cleanName);
  const obscurity = obscurityDiscount(cleanName, entry, brand);
  const liveBoost = domain ? getAsciiLiveBoost(domain) : { multiplier: 1.0, row: null };
  const shortPremium = shortNamePremiumMultiplier(cleanName, tld, entry);

  let value =
    BASE_REFERENCE_VALUE *
    lenFactor *
    info.score *
    qualityFactor *
    pronounce.factor *
    semantic *
    brandFactor *
    obscurity *
    liveBoost.multiplier *
    shortPremium.multiplier;

  // True aftermarket scarcity for short ASCII .com names.
  const scarcityFloor = intrinsicAsciiFloor(cleanName, tld, entry);
  value = Math.max(value, scarcityFloor);

  // Verified market comparables override the formula for specific names.
  const marketComp = MARKET_COMP_OVERRIDES[cleanName];
  let appliedMarketComp = null;
  if (marketComp && tld === 'com') {
    value = marketComp.marketplace;
    appliedMarketComp = marketComp;
  }

  value = Math.max(value, REGISTRATION_FEE_USD);
  // Unpronounceable names with no lexical backing are registration-fee assets.
  if (!entry && pronounce.factor <= 0.1 && !appliedMarketComp) {
    value = Math.min(value, UNPRONOUNCEABLE_CAP_USD);
  }
  if (!appliedMarketComp) {
    value = Math.min(value, info.maxValue);
  }

  const factors = [
    { name: 'length', impact: lenFactor, note: `${len} chars` },
    {
      name: 'tldLiquidity',
      impact: info.score,
      note: `.${tld || 'unknown'} ${info.supportsIdn ? 'IDN' : 'non-IDN'}`,
    },
    {
      name: 'lexicalQuality',
      impact: qualityFactor,
      note: cleanName.includes('-') ? 'contains hyphen' : 'clean',
    },
    {
      name: 'pronounceability',
      impact: pronounce.factor,
      note: pronounce.note || 'pronounceable',
    },
    {
      name: 'semanticSignificance',
      impact: semantic,
      note: entry ? 'canonically significant name (capped at 5×)' : 'not in lexicon',
    },
    {
      name: 'brandRisk',
      impact: brandFactor,
      note: brand ? `brand proximity: ${brand.id || brand.name}` : 'none detected',
    },
  ];

  if (obscurity < 1.0) {
    factors.push({
      name: 'obscurityDiscount',
      impact: obscurity,
      note: 'unattested long name trades near registration fee',
    });
  }

  if (liveBoost.multiplier > 1.0) {
    factors.push({
      name: 'liveSite',
      impact: liveBoost.multiplier,
      note: 'active indexed site on the ASCII domain',
    });
  }

  if (shortPremium.multiplier !== 1.0) {
    factors.push({
      name: 'shortNameScarcity',
      impact: shortPremium.multiplier,
      note: shortPremium.note,
    });
  }

  if (appliedMarketComp) {
    factors.push({
      name: 'marketComp',
      impact: 1,
      note: `marketplace comparable: $${appliedMarketComp.marketplace.toLocaleString()}`,
    });
  } else if (scarcityFloor > 0) {
    factors.push({
      name: 'intrinsicScarcityFloor',
      impact: scarcityFloor / value,
      note: `short ASCII .com scarcity floor: $${scarcityFloor.toLocaleString()}`,
    });
  }

  return { value, brand, tldInfo: info, factors, marketComp: appliedMarketComp };
}

function loadEntry(id) {
  if (!id) return null;
  try {
    return namesService.getName(id) || null;
  } catch (_e) {
    return null;
  }
}

function classifyForm(label, entry, parsed) {
  if (!entry) return { form: 'unknown', variant: null };
  const lower = normalizeLabel(label);

  // Owned flagship domains take precedence over canonical-form classification.
  const ownedSet = ownedDomainsById.get(entry.id);
  if (ownedSet && parsed.domain && ownedSet.has(parsed.domain)) {
    return { form: 'owned', variant: null };
  }

  if (normalizeLabel(entry.unicode) === lower) {
    return { form: 'ideal', variant: null };
  }
  const variants = Array.isArray(entry.variants) ? entry.variants : [];
  const variant = variants.find(
    (v) => v && typeof v.unicode === 'string' && normalizeLabel(v.unicode) === lower
  );
  if (variant) {
    return { form: 'variant', variant };
  }
  if (normalizeLabel(entry.ascii) === lower) {
    return { form: 'ascii', variant: null };
  }

  // Original script match (non-Latin or Greek)
  const originalScript = entry.originalScript?.script;
  if (originalScript && originalScript !== '—' && normalizeLabel(originalScript) === lower) {
    return { form: 'original-script', variant: null };
  }

  return { form: 'unknown', variant: null };
}

function getNameProfile(domain) {
  const parsed = parseDomain(domain);
  const rawLabel = parsed.decodedLabels[0] || parsed.hostname || '';
  const punycodeLabel = parsed.labels[0] || parsed.hostname || '';
  const hasUnicode = !isAsciiOnly(rawLabel) || parsed.isPunycode;

  const classification = classifyDomain(domain);
  const match = classification?.canonicalMatch;
  let entryId = match && match.type === 'lexicon' ? match.id : null;

  // Fallback: the label may be the indigenous original script (Greek, Cuneiform,
  // Runes, etc.) which the authenticity classifier treats as mixed-script.
  if (!entryId && originalScriptToId.has(normalizeLabel(rawLabel))) {
    entryId = originalScriptToId.get(normalizeLabel(rawLabel));
  }

  let entry = entryId ? loadEntry(entryId) : null;

  // The authenticity classifier may return a brand match for exact brand domains
  // (e.g., nike.com). For appraisal we still want the underlying lexicon entry
  // because it drives form classification and tenant-revenue potential.
  if (!entry) {
    const fallbackId = isAsciiOnly(rawLabel) ? rawLabel.toLowerCase() : punycodeLabel.toLowerCase();
    entry = loadEntry(fallbackId) || null;
  }

  const { form, variant } = classifyForm(rawLabel, entry, parsed);
  const asciiRoot = entry ? entry.ascii : isAsciiOnly(rawLabel) ? rawLabel : punycodeLabel;

  return {
    domain,
    parsed,
    label: rawLabel,
    punycodeLabel,
    asciiRoot,
    tld: parsed.etld,
    hasUnicode,
    classification,
    entry,
    entryId,
    form,
    variant,
  };
}

function isFlagshipEntry(entry) {
  return Boolean(entry && ownedDomainsById.has(entry.id));
}

// ── Industry demand (pattern graph) ─────────────────────────────────────
// Loaded from the generated pattern graph (byEntry: temple id → industry
// seats with weights). The graph maps every flagship temple to the real-
// world industries its meaning resonates with — this is the demand side of
// the valuation, derived from what the name means and whom it serves.
let industryByEntry = null;
function getIndustrySeats(entryId) {
  if (!entryId) return [];
  if (industryByEntry === null) {
    try {
      industryByEntry = require('./industry-patterns.json').byEntry || {};
    } catch (_e) {
      industryByEntry = {};
    }
  }
  return industryByEntry[entryId] || [];
}

function industryDemandFactor(entryId) {
  const seats = getIndustrySeats(entryId);
  const primary = seats.filter((s) => s.weight === 2).length;
  const resonant = seats.filter((s) => s.weight !== 2).length;
  if (!primary && !resonant) return null;
  const raw = primary * IDN_INDUSTRY_PRIMARY_WEIGHT + resonant * IDN_INDUSTRY_RESONANT_WEIGHT;
  const multiplier = 1 + Math.min(raw, IDN_INDUSTRY_DEMAND_CAP);
  const top = seats
    .slice()
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 3)
    .map((s) => s.name);
  return { multiplier, primary, resonant, top };
}

function tenantRevenueValue(profile, tldInfo) {
  const entry = profile.entry;
  if (!entry || !isFlagshipEntry(entry)) {
    return { value: 0, monthlyUsd: 0, occupancy: 0, note: 'not a flagship' };
  }

  const siteSlug = entry.id;
  let monthlyCents = DEFAULT_FLAGSHIP_SLOT_MONTHLY_CENTS;

  try {
    const db = getDb();
    const row = db
      .prepare(
        'SELECT SUM(price_cents) as total FROM ad_slots WHERE site_slug = ? AND (is_bundle = 0 OR is_bundle IS NULL)'
      )
      .get(siteSlug);
    if (row && row.total > 0) {
      monthlyCents = Number(row.total);
    } else {
      monthlyCents = DEFAULT_FLAGSHIP_SLOT_MONTHLY_CENTS;
    }
  } catch (_e) {
    // Database or table may not be available; use default inventory.
  }

  const monthlyUsd = monthlyCents / 100;
  const occupancy = TENANT_OCCUPANCY_DEFAULT;
  const tldMultiplier = tldInfo?.supportsIdn ? 1.0 : (tldInfo?.score ?? 0.08);
  const value = Math.round(monthlyUsd * TENANT_REVENUE_MONTHS * occupancy * tldMultiplier);

  return {
    value,
    monthlyUsd,
    occupancy,
    note: 'flagship ad inventory, 12-month conservative capitalization',
  };
}

// IDN baseline value by TLD: what a random, unattested Unicode domain on
// this TLD is worth — roughly registration fee, with a modest premium on
// .com, the only broadly liquid IDN TLD.
function idnBaseValue(tld) {
  const info = getTldInfo(tld);
  if (tld === 'com') return IDN_BASE_VALUE_USD.com;
  if (!info.supportsIdn) return IDN_BASE_VALUE_USD.nonIdn;
  return IDN_BASE_VALUE_USD[tld] ?? IDN_BASE_VALUE_USD.idnDefault;
}

// TLD liquidity for the Unicode form itself. .com captures the full quality
// value; other IDN-supporting TLDs a fraction; TLDs without IDN registration
// support make the Unicode form nearly worthless.
function idnTldMultiplier(tld) {
  const info = getTldInfo(tld);
  if (tld === 'com') return 1.0;
  if (!info.supportsIdn) return 0.1;
  return Math.min(0.6, Math.max(0.3, info.score * 1.5));
}

function computeUnicodePremium(profile) {
  const factors = [];

  if (!profile.hasUnicode) {
    factors.push({
      name: 'asciiOnly',
      impact: 1.0,
      note: 'No Unicode characters; ASCII control value stands.',
    });
    return { asciiOnly: true, value: null, factors };
  }

  const safety = profile.classification || {};
  const recognizedForm = ['owned', 'ideal', 'variant', 'original-script'].includes(profile.form);
  const unsafeVerdicts = new Set([
    'homograph-spoof',
    'mixed-script-spoof',
    'lookalike-domain',
    'unsafe',
  ]);
  if (unsafeVerdicts.has(safety.verdict)) {
    // Listed canonical variants are legitimate, even if the authenticity service
    // flags them as lookalikes because the registrable domain is not in the
    // identity allow-list. Blocklist matches and true homographs still tank value.
    const overridable =
      recognizedForm &&
      (safety.verdict === 'lookalike-domain' || safety.verdict === 'mixed-script-spoof');
    if (!overridable) {
      factors.push({
        name: 'safetyPenalty',
        impact: 0,
        note: `${safety.verdict}: ${safety.reason}`,
      });
      return { value: 0, unsafe: true, factors };
    }
  }

  // ── Quality multiplier stack ──────────────────────────────────────────
  // Each factor is bounded and stated. The product is capped at
  // IDN_MULTIPLIER_STACK_CAP so compounding cannot produce absurd values.
  const { entry } = profile;
  const stack = [];

  if (entry) {
    stack.push({ name: 'lexiconAttestation', multiplier: 3.0, note: 'attested lexicon name' });

    const tier = entry.tier || 'none';
    const tierMultiplier = TIER_IDN_MULTIPLIER[tier] ?? TIER_IDN_MULTIPLIER.none;
    if (tierMultiplier !== 1.0) {
      stack.push({ name: 'tier', multiplier: tierMultiplier, note: entry.tierLabel || tier });
    }

    if (isFlagshipLexiconEntry(entry)) {
      stack.push({ name: 'flagshipDevelopment', multiplier: 2.0, note: 'owned & operated temple' });
    }

    const sources = Array.isArray(entry.sources) ? entry.sources : [];
    const attestationDepth = 1 + Math.min(sources.length * 0.15, 0.5);
    if (attestationDepth > 1.0) {
      stack.push({
        name: 'attestationDepth',
        multiplier: attestationDepth,
        note: `${sources.length} scholarly sources`,
      });
    }

    const pantheonWeight = PANTHEON_WEIGHTS[entry.pantheon] || 0.5;
    stack.push({
      name: 'pantheonReach',
      multiplier: 0.7 + pantheonWeight * 0.5,
      note: entry.pantheon,
    });

    // Industry demand from the pattern graph: the industries the name's
    // meaning aligns with are its end-user market. Demand from meaning —
    // never from third-party brands.
    const industry = industryDemandFactor(entry.id);
    if (industry) {
      stack.push({
        name: 'industryDemand',
        multiplier: industry.multiplier,
        note: `${industry.primary} primary · ${industry.resonant} resonant industries`,
      });
    }

    if (entry.availability?.status === 'available') {
      stack.push({ name: 'availability', multiplier: 1.1, note: 'unregistered — acquirable' });
    }
  }

  // Canonical form is the strongest signal, for lexicon and non-lexicon names.
  const formMultiplier = FORM_IDN_MULTIPLIER[profile.form] ?? FORM_IDN_MULTIPLIER.unknown;
  stack.push({ name: 'canonicalForm', multiplier: formMultiplier, note: profile.form });

  if (!entry) {
    // Unattested names: length and noise penalties keep random IDNs at
    // registration-fee level. Length is measured on the decoded Unicode
    // label, never on the (longer) punycode form.
    const name = profile.asciiRoot;
    const len = [...String(profile.label || '')].length;
    if (len > 15) {
      stack.push({ name: 'length', multiplier: 0.25, note: `${len} chars` });
    } else if (len > 8) {
      stack.push({ name: 'length', multiplier: 0.5, note: `${len} chars` });
    }
    if (lexicalQualityFactor(name) < 1.0) {
      stack.push({ name: 'lexicalNoise', multiplier: 0.5, note: 'digits/hyphens/noise' });
    }
  }

  let stackProduct = 1.0;
  for (const item of stack) stackProduct *= item.multiplier;
  const stackCapped = stackProduct > IDN_MULTIPLIER_STACK_CAP;
  const stackFinal = Math.min(stackProduct, IDN_MULTIPLIER_STACK_CAP);

  const baseValue = idnBaseValue(profile.tld);
  factors.push({
    name: 'idnBaseValue',
    impact: baseValue,
    kind: 'currency',
    note: `.${profile.tld || 'unknown'} IDN baseline`,
  });
  for (const item of stack) {
    factors.push({ name: item.name, impact: item.multiplier, kind: 'multiplier', note: item.note });
  }
  if (stackCapped) {
    factors.push({
      name: 'multiplierStackCap',
      impact: IDN_MULTIPLIER_STACK_CAP,
      kind: 'multiplier',
      note: `stack capped (raw ×${stackProduct.toFixed(1)})`,
    });
  }

  // The multiplier stack is the whole valuation: attestation, restoration
  // quality, development, industry demand. No factor may reference a
  // third-party brand — value derives from meaning and measured demand.
  const tldMultiplier = idnTldMultiplier(profile.tld);
  if (tldMultiplier < 1.0) {
    factors.push({
      name: 'tldIdnPenalty',
      impact: tldMultiplier,
      kind: 'multiplier',
      note: getTldInfo(profile.tld).supportsIdn
        ? `.${profile.tld} IDN liquidity`
        : 'TLD does not support IDN registrations',
    });
  }

  factors.push({
    name: 'liquidityDiscount',
    impact: IDN_LIQUIDITY_DISCOUNT,
    kind: 'multiplier',
    note: 'thin IDN resale market',
  });

  const value = baseValue * stackFinal * tldMultiplier * IDN_LIQUIDITY_DISCOUNT;

  return {
    baseValue,
    stack: Number(stackFinal.toFixed(2)),
    stackCapped,
    tldMultiplier,
    liquidityDiscount: IDN_LIQUIDITY_DISCOUNT,
    value,
    factors,
  };
}

function trademarkFactor(profile) {
  // Attested lexicon restorations (owned/ideal/variant/original-script) are
  // legitimate scholarly forms and are never suppressed or inflated by brand
  // proximity: neutral factor, no premium either way. Only unknown or
  // deceptive brand-lookalike forms are suppressed — that protects buyers.
  const recognizedForm = ['owned', 'ideal', 'variant', 'original-script', 'ascii'].includes(
    profile.form
  );
  if (recognizedForm && profile.entry) {
    return { factor: 1.0, brand: null, premium: false };
  }

  const rawLabel = profile.label;
  const asciiRoot = profile.asciiRoot;
  const brandRaw = lookupBrand(rawLabel, { domain: profile.domain });
  if (brandRaw) {
    const matchType = brandRaw.matchType || 'visual';
    if (matchType === 'exact' || matchType === 'folded' || matchType === 'domain')
      return { factor: 0.15, brand: brandRaw };
    return { factor: 0.5, brand: brandRaw };
  }
  const brandAscii = lookupBrand(asciiRoot, { domain: profile.domain });
  if (brandAscii) {
    const matchType = brandAscii.matchType || 'visual';
    if (matchType === 'exact' || matchType === 'folded' || matchType === 'domain')
      return { factor: 0.15, brand: brandAscii };
    return { factor: 0.5, brand: brandAscii };
  }
  return { factor: 1.0, brand: null, premium: false };
}

function liquidityRating(profile, finalValue) {
  const info = getTldInfo(profile.tld);
  if (!info.supportsIdn || !profile.hasUnicode) {
    return finalValue > 1000 ? 'medium' : 'low';
  }
  if (info.score >= 0.9 && (profile.form === 'owned' || profile.form === 'ideal')) return 'high';
  if (info.score >= 0.9 && profile.form === 'variant') return 'medium';
  return 'low';
}

function recommendation(profile, finalValue, unsafe) {
  if (unsafe) return 'avoid';
  if (finalValue <= REGISTRATION_FEE_USD * 2) return 'registration-fee-only';
  const status = profile.entry?.availability?.status;
  if (status === 'available') return 'acquire';
  if (profile.entry?.site) return 'watch';
  if (status === 'registered' || status === 'live') return 'watch';
  return 'watch';
}

function confidenceScore(profile) {
  if (!profile.entry) return 0.3;
  let score = 0.5;
  if (profile.entry.availability?.status) score += 0.1;
  if (profile.entry.tierExplanation) score += 0.1;
  if (profile.entry.hasFlagship) score += 0.1;
  if (profile.form !== 'unknown') score += 0.1;
  // Never claim >90% confidence: IDN comps are sparse and the market is thin.
  return Math.min(score, 0.9);
}

// A registrable domain label: letters (any script), combining marks, digits,
// and interior hyphens. This rejects emoji, punctuation, and other junk that
// cannot be registered, instead of appraising it.
const VALID_LABEL_RE = /^[\p{L}\p{M}\p{N}][\p{L}\p{M}\p{N}-]*$/u;

function isAppraisableDomain(parsed) {
  if (!parsed || parsed.isIp) return false;
  if (!parsed.domain || !parsed.etld) return false;
  const labels = parsed.decodedLabels.filter((label) => label && label.length > 0);
  if (labels.length < 2) return false;
  return labels.every((label) => VALID_LABEL_RE.test(label));
}

// Round to `digits` significant figures so ranges read as estimates,
// not false-precision quotes.
function roundToSignificant(n, digits = 2) {
  if (!Number.isFinite(n) || n <= 0) return 0;
  const magnitude = 10 ** Math.floor(Math.log10(n));
  const step = magnitude / 10 ** (digits - 1);
  return Math.round(n / step) * step;
}

// Estimated value range. Spread widens as confidence falls: ±20% at high
// confidence, ±60% at the floor. Both endpoints are bounded below by the
// registration fee.
function valueRange(value, confidence) {
  const spread = Math.min(0.6, Math.max(0.2, 0.75 - 0.5 * confidence));
  const low = Math.max(REGISTRATION_FEE_USD, roundToSignificant(value * (1 - spread)));
  const high = Math.max(low, roundToSignificant(value * (1 + spread)));
  return { low, high, spread: Number(spread.toFixed(2)) };
}

function appraise(domain, options = {}) {
  const rawDomain = String(domain || '').trim();
  if (!rawDomain) {
    return {
      domain: rawDomain,
      error: 'DOMAIN_REQUIRED',
      message: 'A domain name is required.',
    };
  }

  const profile = getNameProfile(rawDomain);
  if (!isAppraisableDomain(profile.parsed)) {
    return {
      domain: rawDomain,
      error: 'INVALID_DOMAIN',
      message: 'Input is not a valid, registrable domain name.',
    };
  }

  const info = getTldInfo(profile.tld);

  const tm = trademarkFactor(profile);

  // Tenant revenue only attaches to legitimate, safe forms. A false/unknown
  // Unicode form flagged as a lookalike should not inherit the income value
  // of the canonical landing page.
  const recognizedForm = ['owned', 'ideal', 'variant', 'original-script', 'ascii'].includes(
    profile.form
  );

  // ASCII estimates are produced ONLY for ASCII domains, where the estimate
  // is the appraisal itself — never as a comparison twin for Unicode names.
  // A Unicode name is valued from its own factors alone; no ASCII control,
  // folded-twin value, or share-of-control ratio is computed for it, so the
  // output can never be read as pricing by brand or ASCII adjacency.
  const ascii = profile.hasUnicode
    ? { value: null, factors: null }
    : estimateAsciiValue(profile.asciiRoot, profile.tld, profile.entry, rawDomain);
  const asciiControlValue = profile.hasUnicode ? null : Math.round(ascii.value);

  const premium = computeUnicodePremium(profile);
  const unsafe = premium.unsafe === true;
  const tenant =
    !unsafe && recognizedForm
      ? tenantRevenueValue(profile, info)
      : { value: 0, monthlyUsd: 0, occupancy: 0, note: 'not eligible' };

  // Pure domain value. Unicode forms are valued from meaning and demand
  // fundamentals (small TLD base × bounded multiplier stack of attestation,
  // restoration quality, development and industry demand × TLD and liquidity
  // discounts), hard-capped only by the absolute IDN ceiling. ASCII forms
  // stand at their estimated value. Deceptive brand-lookalike forms are
  // suppressed; legitimate lexicon restorations are never brand-adjusted.
  let domainValue = profile.hasUnicode ? premium.value * tm.factor : asciiControlValue * tm.factor;
  if (profile.hasUnicode) {
    domainValue = Math.min(domainValue, IDN_VALUE_CEILING_USD);
  } else {
    domainValue = Math.min(domainValue, asciiControlValue);
  }
  domainValue = Math.round(Math.max(domainValue, REGISTRATION_FEE_USD));

  // Total value adds separately reported tenant/ad revenue: a conservative
  // 12-month business projection tied to the page, not intrinsic domain value.
  const totalValue = Math.round(Math.max(domainValue + tenant.value, REGISTRATION_FEE_USD));

  // The public-facing Unicode appraisal is the pure domain value.
  const unicodeValue = domainValue;
  const shareOfControl =
    !profile.hasUnicode && asciiControlValue > 0 ? unicodeValue / asciiControlValue : null;

  const confidence = confidenceScore(profile);
  const range = valueRange(unicodeValue, confidence);
  const rec = recommendation(profile, unicodeValue, unsafe);
  const rating = liquidityRating(profile, unicodeValue);

  const industry = profile.entry ? industryDemandFactor(profile.entry.id) : null;

  const result = {
    domain: rawDomain,
    displayDomain: profile.parsed.decodedLabels.join('.') || rawDomain,
    punycode: computePunycodeLabel(profile.label),
    tld: profile.tld,
    label: profile.label,
    asciiRoot: profile.asciiRoot,
    hasUnicode: profile.hasUnicode,
    lexiconMatch: profile.entry
      ? {
          id: profile.entry.id,
          ascii: profile.entry.ascii,
          unicode: profile.entry.unicode,
          pantheon: profile.entry.pantheon,
          tier: profile.entry.tier,
          tierLabel: profile.entry.tierLabel,
          form: profile.form,
          variantType: profile.variant?.type || null,
        }
      : null,
    safety: {
      verdict: profile.classification?.verdict || 'unknown',
      tier: profile.classification?.tier || 'unknown',
      reason: profile.classification?.reason || null,
    },
    appraisal: {
      currency: 'USD',
      asciiControlValue,
      unicodeValue,
      totalValue,
      range,
      premiumMultiplier: shareOfControl === null ? null : Number(shareOfControl.toFixed(4)),
      discount: shareOfControl === null ? null : Number((1 - shareOfControl).toFixed(4)),
      tenantRevenueValue: tenant.value,
      liquidityRating: rating,
      recommendation: rec,
      confidence: Number(confidence.toFixed(2)),
    },
    // Demand context is public (it is market data, not formula): which
    // industry seats the name's meaning aligns with. The numeric factor
    // breakdown — the algorithm itself — ships only under ?explain=1.
    industryAlignment: industry
      ? {
          primary: industry.primary,
          resonant: industry.resonant,
          top: industry.top,
        }
      : null,
    model: {
      version: MODEL_VERSION,
      dataVersion: DATA_VERSION,
    },
  };

  if (options.explain === true) {
    result.factors = {
      ascii: ascii.factors,
      unicode: premium.factors,
      unicodeSummary: profile.hasUnicode
        ? {
            baseValue: premium.baseValue ?? 0,
            multiplierStack: premium.stack ?? 0,
            stackCapped: premium.stackCapped === true,
            tldMultiplier: premium.tldMultiplier ?? 1,
            liquidityDiscount: premium.liquidityDiscount ?? IDN_LIQUIDITY_DISCOUNT,
          }
        : null,
      industryDemand: industry
        ? {
            multiplier: industry.multiplier,
            primary: industry.primary,
            resonant: industry.resonant,
            top: industry.top,
            note: `${industry.primary} primary · ${industry.resonant} resonant industry seats`,
          }
        : null,
      trademark: tm.brand
        ? {
            factor: tm.factor,
            name: tm.brand.name || tm.brand.id,
            matchType: tm.brand.matchType,
            premium: false,
          }
        : null,
      tenantRevenue:
        tenant.value > 0
          ? {
              value: tenant.value,
              monthlyUsd: tenant.monthlyUsd,
              occupancy: tenant.occupancy,
              note: tenant.note,
            }
          : null,
    };
    result.model = {
      ...result.model,
      unicodeCeilingUsd: IDN_VALUE_CEILING_USD,
      multiplierStackCap: IDN_MULTIPLIER_STACK_CAP,
      liquidityDiscount: IDN_LIQUIDITY_DISCOUNT,
    };
  }

  return result;
}

function appraiseBatch(domains) {
  const inputs = Array.isArray(domains) ? domains : [domains];
  const limited = inputs.slice(0, MAX_BATCH_SIZE);
  const results = limited.map((d) => appraise(d));
  return {
    count: results.length,
    requested: inputs.length,
    items: results,
  };
}

module.exports = {
  appraise,
  appraiseBatch,
  estimateAsciiValue,
  computeUnicodePremium,
  getTldInfo,
  MODEL_VERSION,
  MAX_BATCH_SIZE,
  REGISTRATION_FEE_USD,
  IDN_VALUE_CEILING_USD,
  IDN_MULTIPLIER_STACK_CAP,
  IDN_LIQUIDITY_DISCOUNT,
};
